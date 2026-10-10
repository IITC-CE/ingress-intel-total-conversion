import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

await import('../core/code/options.js');
await import('../core/code/options_general.js');

const options = IITC.options;

// the file runs again as on the next start of IITC, with its move of the legacy keys
let boots = 0;
const boot = () => import(`../core/code/options_general.js?boot=${++boots}`);

describe('IITC options page', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('legacy keys', () => {
    it('moves the passcode format and the dismissed Intel domain warning once, and removes the keys', async () => {
      localStorage.setItem('iitc-passcode-format', 'short');
      localStorage.setItem('pass-checking-intel-url', 'true');
      const set = sinon.spy(options, 'set');

      await boot();

      expect(set.args).to.deep.equal([
        ['iitc.passcodeFormat', 'short', { source: 'legacy' }],
        ['iitc.intelUrlWarning', false, { source: 'legacy' }],
      ]);
      expect(options.get('iitc.passcodeFormat')).to.equal('short');
      expect(options.get('iitc.intelUrlWarning')).to.be.false;
      expect(localStorage.getItem('iitc-passcode-format')).to.be.null;
      expect(localStorage.getItem('pass-checking-intel-url')).to.be.null;

      options.reset('iitc.passcodeFormat');
      await boot();
      expect(set.calledTwice).to.be.true;
      expect(options.get('iitc.passcodeFormat')).to.equal('long');
    });

    it('keeps the warning when the legacy key does not record it as dismissed', async () => {
      localStorage.setItem('pass-checking-intel-url', 'false');

      await boot();

      expect(options.get('iitc.intelUrlWarning')).to.be.true;
      expect(localStorage.getItem('pass-checking-intel-url')).to.be.null;
    });

    it('drops a format that is no longer offered, with a warning', async () => {
      const warn = sinon.stub(globalThis.log, 'warn');
      localStorage.setItem('iitc-passcode-format', 'tiny');

      await boot();

      expect(warn.calledOnce).to.be.true;
      expect(options.get('iitc.passcodeFormat')).to.equal('long');
      expect(localStorage.getItem('iitc-passcode-format')).to.be.null;
    });
  });

  describe('Intel domain warning', () => {
    it('is on until dismissed, and stays in this browser, out of backups', () => {
      expect(options.get('iitc.intelUrlWarning', true)).to.be.true;
      options.set('iitc.intelUrlWarning', false);
      expect(options.get('iitc.intelUrlWarning', true)).to.be.false;
      expect(options.exportValues()).to.not.have.property('iitc.intelUrlWarning');
      expect(options.set('iitc.intelUrlWarning', true, { source: 'remote' })).to.be.false;
    });
  });
});
