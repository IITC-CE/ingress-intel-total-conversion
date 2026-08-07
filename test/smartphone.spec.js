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

  it('leaves everything alone on a desktop browser', () => {
    IITC.utils.isSmartphone.returns(false);
    const show = sinon.stub(window, 'show');

    window.runOnSmartphonesBeforeBoot();
    window.runOnSmartphonesAfterBoot();

    expect(document.querySelectorAll('#chatcontrols a')).to.have.length(0);
    expect(document.body.classList.contains('show-controls')).to.be.false;
    expect(show.called).to.be.false;
  });

  it('exposes the pane buttons on window.smartphone as clickable elements', () => {
    sinon.stub(window, 'show');
    window.runOnSmartphonesBeforeBoot();

    expect(window.smartphone).to.be.ok;
    expect(window.smartphone.mapButton).to.be.ok;
    expect(window.smartphone.sideButton).to.be.ok;
    expect(() => window.smartphone.mapButton.click()).to.not.throw();
    expect(() => window.smartphone.sideButton.click()).to.not.throw();
  });

  describe('runOnSmartphonesBeforeBoot', () => {
    it('injects the smartphone stylesheet', () => {
      const before = document.head.querySelectorAll('style').length;

      window.runOnSmartphonesBeforeBoot();

      const styles = document.head.querySelectorAll('style');
      expect(styles).to.have.length(before + 1);
      expect(styles[styles.length - 1].textContent).to.not.be.empty;
    });

    it('adds the map and info pane buttons to the chat controls', () => {
      window.runOnSmartphonesBeforeBoot();

      const tabs = Array.from(document.querySelectorAll('#chatcontrols a'));
      expect(tabs.map((tab) => tab.textContent)).to.deep.equal(['map', 'info']);
    });

    it('shows the control bar only when the app provides no panes of its own', () => {
      window.runOnSmartphonesBeforeBoot();
      expect(document.body.classList.contains('show-controls')).to.be.true;

      buildDom();
      sinon.stub(window, 'useAppPanes').returns(true);
      window.runOnSmartphonesBeforeBoot();
      expect(document.body.classList.contains('show-controls')).to.be.false;
    });
  });

  describe('pane buttons', () => {
    it('reveals the map even when show() does nothing', () => {
      const statusbarShow = sinon.spy(IITC.statusbar, 'show');
      const show = sinon.stub(window, 'show');

      window.runOnSmartphonesBeforeBoot();
      window.smartphone.mapButton.click();

      const map = document.getElementById('map');
      expect(show.calledWith('map')).to.be.true;
      expect(map.style.visibility).to.equal('visible');
      expect(map.style.opacity).to.equal('1');
      expect(statusbarShow.calledOnce).to.be.true;
    });

    it('reveals the sidebar and resets its scroll', () => {
      const resetScroll = sinon.spy(IITC.portal.display, 'resetScroll');
      const show = sinon.stub(window, 'show');

      window.runOnSmartphonesBeforeBoot();
      window.smartphone.sideButton.click();

      expect(show.calledWith('info')).to.be.true;
      expect(resetScroll.calledOnce).to.be.true;
    });

    it('identifies the tabs by data-channel, the way the chat channels are', () => {
      window.runOnSmartphonesBeforeBoot();

      expect(document.querySelector("#chatcontrols a[data-channel='map']")).to.be.ok;
      expect(document.querySelector("#chatcontrols a[data-channel='info']")).to.be.ok;
    });

    it('moves the active marker to the clicked tab, leaving only one active', () => {
      sinon.stub(window, 'show');
      window.runOnSmartphonesBeforeBoot();

      window.smartphone.mapButton.click();
      expect(document.querySelector('#chatcontrols .active').dataset.channel).to.equal('map');

      window.smartphone.sideButton.click();
      expect(document.querySelectorAll('#chatcontrols .active')).to.have.length(1);
      expect(document.querySelector('#chatcontrols .active').dataset.channel).to.equal('info');
    });

    it('clears the active marker of a chat channel when a pane is opened', () => {
      sinon.stub(window, 'show');
      window.runOnSmartphonesBeforeBoot();
      document.getElementById('chatcontrols').insertAdjacentHTML('afterbegin', '<a class="active" data-channel="all">all</a>');

      window.smartphone.mapButton.click();

      expect(document.querySelectorAll('#chatcontrols .active')).to.have.length(1);
      expect(document.querySelector('#chatcontrols .active').dataset.channel).to.equal('map');
    });
  });

  it('opens the map pane after boot', () => {
    const show = sinon.stub(window, 'show');

    window.runOnSmartphonesAfterBoot();

    expect(show.calledWith('map')).to.be.true;
  });
});
