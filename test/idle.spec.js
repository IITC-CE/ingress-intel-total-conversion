import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* eslint-disable no-unused-expressions */

await import('../core/code/idle.js');

// jsdom serves document.hidden from a prototype getter, so shadow it with an own property
const setVisibility = (state) => {
  Object.defineProperty(document, 'hidden', { value: state === 'hidden', configurable: true });
  document.dispatchEvent(new document.defaultView.Event('visibilitychange'));
};

describe('idle handling', () => {
  before(() => {
    window.setupIdle();
  });

  beforeEach(() => {
    window.idleTime = 0;
    window._idleTimeLimit = window.MAX_IDLE_TIME;
    window._onResumeFunctions = [];
  });

  // idle.js replaces the isIdle mock for the whole run, so leave the page awake for the other specs
  afterEach(() => {
    delete document.hidden;
    window.idleTime = 0;
    window._idleTimeLimit = window.MAX_IDLE_TIME;
    window._onResumeFunctions = [];
  });

  describe('visibilitychange', () => {
    it('leaves idle mode once the page is visible again', () => {
      const resume = sinon.spy();
      window.addResumeFunction(resume);
      window.idleSet();
      expect(window.isIdle()).to.be.true;

      setVisibility('visible');

      expect(window.isIdle()).to.be.false;
      expect(window.idleTime).to.equal(0);
      expect(window._idleTimeLimit).to.equal(window.MAX_IDLE_TIME);
      expect(resume.calledOnce).to.be.true;
    });

    it('restores the full idle time limit lowered while the page was hidden', () => {
      window._idleTimeLimit = window.REFRESH;
      window.idleTime = window.REFRESH;

      setVisibility('visible');

      expect(window._idleTimeLimit).to.equal(window.MAX_IDLE_TIME);
    });

    it('keeps the page idle while it is still hidden', () => {
      const resume = sinon.spy();
      window.addResumeFunction(resume);
      window.idleSet();

      setVisibility('hidden');

      expect(window.isIdle()).to.be.true;
      expect(resume.called).to.be.false;
    });

    it('does not run the resume functions when the page was never idle', () => {
      const resume = sinon.spy();
      window.addResumeFunction(resume);

      setVisibility('visible');

      expect(resume.called).to.be.false;
    });
  });
});
