import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

await import('../core/code/utils.js');
await import('../core/code/panes.js');

describe('window.show', () => {
  before(() => {
    IITC.chat = IITC.chat || {};
    IITC.chat.getChannelDesc = IITC.chat.getChannelDesc || (() => null);
    IITC.chat.show = IITC.chat.show || (() => {});
    IITC.statusbar = IITC.statusbar || {};
    IITC.statusbar.show = IITC.statusbar.show || (() => {});
    IITC.statusbar.hide = IITC.statusbar.hide || (() => {});
    IITC.portal = IITC.portal || {};
    IITC.portal.display = IITC.portal.display || {};
    IITC.portal.display.resetScroll = IITC.portal.display.resetScroll || (() => {});
  });

  beforeEach(() => {
    document.body.innerHTML = [
      '<div id="chatcontrols"><a data-channel="map">map</a><a data-channel="info">info</a><a data-channel="all">all</a></div>',
      '<div id="map"></div>',
      '<div id="chat"></div><div id="chatinput"></div><div id="sidebartoggle"></div>',
      '<div id="scrollwrapper"></div>',
      '<div id="portal_highlight_select"></div><div id="farm_level_select"></div>',
    ].join('');
    window.currentPane = '';
    window.runHooks = sinon.spy();
    // the stock channels, so anything else falls through to the pane branches
    sinon.stub(IITC.chat, 'getChannelDesc').callsFake((id) => (id === 'all' ? { id: 'all' } : null));
    sinon.stub(IITC.chat, 'show');
  });

  afterEach(() => sinon.restore());

  describe('switching panes', () => {
    it('hides everything and fires the hook when the pane changes', () => {
      const hideall = sinon.spy(window, 'hideall');

      window.show('map');

      expect(hideall.calledOnce).to.be.true;
      expect(window.runHooks.calledWithExactly('paneChanged', 'map')).to.be.true;
      expect(window.currentPane).to.equal('map');
    });

    it('reveals the map pane and marks its tab', () => {
      const statusbarShow = sinon.spy(IITC.statusbar, 'show');

      window.show('map');

      const map = document.getElementById('map');
      expect(map.style.visibility).to.equal('visible');
      expect(map.style.opacity).to.equal('1');
      expect(statusbarShow.called).to.be.true;
      expect(document.querySelector('#chatcontrols .active').dataset.channel).to.equal('map');
    });

    it('reveals the info pane and moves the marker off the pane left behind', () => {
      const resetScroll = sinon.spy(IITC.portal.display, 'resetScroll');

      window.show('map');
      window.show('info');

      expect(resetScroll.calledOnce).to.be.true;
      expect(document.querySelectorAll('#chatcontrols .active')).to.have.length(1);
      expect(document.querySelector('#chatcontrols .active').dataset.channel).to.equal('info');
    });

    it('hands a comm channel over to IITC.chat, which marks its own tab', () => {
      window.show('all');

      expect(IITC.chat.show.calledOnceWithExactly('all')).to.be.true;
      expect(document.querySelectorAll('#chatcontrols .active')).to.have.length(0);
    });

    // the app switches to plugin panes by id, and those match neither a channel nor a built-in pane
    it('clears the view and announces a pane it has nothing to render for', () => {
      const hideall = sinon.spy(window, 'hideall');

      window.show('plugin-a');

      expect(hideall.calledOnce).to.be.true;
      expect(window.runHooks.calledWithExactly('paneChanged', 'plugin-a')).to.be.true;
      expect(window.currentPane).to.equal('plugin-a');
      expect(IITC.chat.show.called).to.be.false;
      expect(document.querySelectorAll('#chatcontrols .active')).to.have.length(0);
    });
  });

  describe('re-showing the current pane', () => {
    it('re-applies the pane without hiding anything or firing the hook again', () => {
      window.show('map');
      window.runHooks.resetHistory();
      const hideall = sinon.spy(window, 'hideall');
      const map = document.getElementById('map');
      map.style.visibility = 'hidden';
      map.style.opacity = '0';
      document.querySelector('#chatcontrols .active').classList.remove('active');

      window.show('map');

      expect(hideall.called).to.be.false;
      expect(window.runHooks.called).to.be.false;
      expect(map.style.visibility).to.equal('visible');
      expect(map.style.opacity).to.equal('1');
      expect(document.querySelector('#chatcontrols .active').dataset.channel).to.equal('map');
    });
  });
});
