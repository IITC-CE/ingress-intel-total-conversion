import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

await import('../core/code/utils.js');
await import('../core/code/smartphone.js');

function buildDom() {
  document.body.innerHTML = [
    '<div id="chatcontrols"></div>',
    '<div id="map"></div>',
    '<div id="sidebar"></div>',
    '<div id="scrollwrapper"></div>',
    '<div id="portaldetails"></div>',
  ].join('');
  document.body.classList.remove('show-controls');
}

describe('smartphone boot hooks', () => {
  before(() => {
    IITC.statusbar = IITC.statusbar || {};
    IITC.statusbar.show = IITC.statusbar.show || (() => {});
    IITC.portal = IITC.portal || {};
    IITC.portal.display = IITC.portal.display || {};
    IITC.portal.display.resetScroll = IITC.portal.display.resetScroll || (() => {});
  });

  beforeEach(() => {
    buildDom();
    sinon.stub(IITC.utils, 'isSmartphone').returns(true);
  });

  afterEach(() => {
    sinon.restore();
    document.body.innerHTML = '';
    document.body.classList.remove('show-controls');
  });

  it('publishes no API of its own', () => {
    sinon.stub(window, 'show');
    IITC.smartphone._runBeforeBoot();

    expect(Object.keys(IITC.smartphone)).to.deep.equal(['_runBeforeBoot', '_runAfterBoot']);
    expect(window.runOnSmartphonesBeforeBoot).to.be.undefined;
    expect(window.runOnSmartphonesAfterBoot).to.be.undefined;
    expect(window.smartphone.mapButton).to.be.ok;
  });

  it('leaves everything alone on a desktop browser', () => {
    IITC.utils.isSmartphone.returns(false);
    const show = sinon.stub(window, 'show');

    IITC.smartphone._runBeforeBoot();
    IITC.smartphone._runAfterBoot();

    expect(document.querySelectorAll('#chatcontrols a')).to.have.length(0);
    expect(document.body.classList.contains('show-controls')).to.be.false;
    expect(show.called).to.be.false;
  });

  it('exposes the pane buttons on window.smartphone as clickable elements', () => {
    sinon.stub(window, 'show');
    IITC.smartphone._runBeforeBoot();

    expect(window.smartphone).to.be.ok;
    expect(window.smartphone.mapButton).to.be.ok;
    expect(window.smartphone.sideButton).to.be.ok;
    expect(() => window.smartphone.mapButton.click()).to.not.throw();
    expect(() => window.smartphone.sideButton.click()).to.not.throw();
  });

  describe('_runBeforeBoot', () => {
    it('injects the smartphone stylesheet', () => {
      const before = document.head.querySelectorAll('style').length;

      IITC.smartphone._runBeforeBoot();

      const styles = document.head.querySelectorAll('style');
      expect(styles).to.have.length(before + 1);
      expect(styles[styles.length - 1].textContent).to.not.be.empty;
    });

    it('adds the map and info pane buttons to the chat controls', () => {
      IITC.smartphone._runBeforeBoot();

      const tabs = Array.from(document.querySelectorAll('#chatcontrols a'));
      expect(tabs.map((tab) => tab.textContent)).to.deep.equal(['map', 'info']);
    });

    it('shows the control bar only when the app provides no panes of its own', () => {
      IITC.smartphone._runBeforeBoot();
      expect(document.body.classList.contains('show-controls')).to.be.true;

      buildDom();
      sinon.stub(window, 'useAppPanes').returns(true);
      IITC.smartphone._runBeforeBoot();
      expect(document.body.classList.contains('show-controls')).to.be.false;
    });
  });

  describe('pane buttons', () => {
    it('identifies the tabs by data-channel, the way the chat channels are', () => {
      IITC.smartphone._runBeforeBoot();

      expect(document.querySelector("#chatcontrols a[data-channel='map']")).to.be.ok;
      expect(document.querySelector("#chatcontrols a[data-channel='info']")).to.be.ok;
    });

    it('opens the matching pane when clicked', () => {
      const show = sinon.stub(window, 'show');
      IITC.smartphone._runBeforeBoot();

      window.smartphone.mapButton.click();
      expect(show.calledWithExactly('map')).to.be.true;

      window.smartphone.sideButton.click();
      expect(show.calledWithExactly('info')).to.be.true;
    });
  });

  it('opens the map pane after boot', () => {
    const show = sinon.stub(window, 'show');

    IITC.smartphone._runAfterBoot();

    expect(show.calledWith('map')).to.be.true;
  });
});
