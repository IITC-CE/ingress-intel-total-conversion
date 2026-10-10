import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

await import('../core/code/settings.js');
await import('../core/code/settings_general.js');

const settings = IITC.settings;

// the file runs again as on the next start of IITC, with its move of the legacy keys
let boots = 0;
const boot = () => import(`../core/code/settings_general.js?boot=${++boots}`);

describe('IITC settings page', () => {
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
      const set = sinon.spy(settings, 'set');

      await boot();

      expect(set.args).to.deep.equal([
        ['iitc.passcodeFormat', 'short', { source: 'legacy' }],
        ['iitc.intelUrlWarning', false, { source: 'legacy' }],
      ]);
      expect(settings.get('iitc.passcodeFormat')).to.equal('short');
      expect(settings.get('iitc.intelUrlWarning')).to.be.false;
      expect(localStorage.getItem('iitc-passcode-format')).to.be.null;
      expect(localStorage.getItem('pass-checking-intel-url')).to.be.null;

      settings.reset('iitc.passcodeFormat');
      await boot();
      expect(set.calledTwice).to.be.true;
      expect(settings.get('iitc.passcodeFormat')).to.equal('long');
    });

    it('keeps the warning when the legacy key does not record it as dismissed', async () => {
      localStorage.setItem('pass-checking-intel-url', 'false');

      await boot();

      expect(settings.get('iitc.intelUrlWarning')).to.be.true;
      expect(localStorage.getItem('pass-checking-intel-url')).to.be.null;
    });

    it('drops a format that is no longer offered, with a warning', async () => {
      const warn = sinon.stub(globalThis.log, 'warn');
      localStorage.setItem('iitc-passcode-format', 'tiny');

      await boot();

      expect(warn.calledOnce).to.be.true;
      expect(settings.get('iitc.passcodeFormat')).to.equal('long');
      expect(localStorage.getItem('iitc-passcode-format')).to.be.null;
    });
  });

  describe('Intel domain warning', () => {
    it('stays on this device', () => {
      settings.set('iitc.intelUrlWarning', false);
      expect(settings.export({ sync: true })).to.not.have.property('iitc.intelUrlWarning');
      expect(settings.set('iitc.intelUrlWarning', true, { source: 'remote' })).to.be.false;
    });
  });
});
