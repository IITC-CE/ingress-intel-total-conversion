import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

window.plugin = window.plugin || {};
await import('../../core/code/settings.js');
await import('../../plugins/link-show-direction.js');

const linkShowDirection = window.plugin.linkShowDirection;
const settings = IITC.settings;

describe('link-show-direction settings', () => {
  let page;

  before(() => {
    linkShowDirection.registerSettings();
    page = IITC.settings._pages['link-show-direction'];
  });

  beforeEach(() => {
    localStorage.clear();
    linkShowDirection.mode = 'Static near origin';
    linkShowDirection.drawtools = false;
    linkShowDirection.moving = false;
    linkShowDirection.restylePending = false;
    sinon.stub(linkShowDirection, 'animateLinks');
    sinon.stub(linkShowDirection, 'removeDrawToolsStyle');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('legacy keys', () => {
    it('moves the style and the DrawTools flag once, and removes the keys', () => {
      localStorage.setItem('plugin-linkshowdirection-mode', 'Animate full link');
      localStorage.setItem('plugin-linkshowdirection-drawtools', 'true');
      const set = sinon.spy(settings, 'set');

      linkShowDirection.migrateSettings();

      expect(set.args).to.deep.equal([
        ['link-show-direction.mode', 'Animate full link', { source: 'legacy' }],
        ['link-show-direction.drawtools', true, { source: 'legacy' }],
      ]);
      expect(settings.get('link-show-direction.mode')).to.equal('Animate full link');
      expect(settings.get('link-show-direction.drawtools')).to.be.true;
      expect(localStorage.getItem('plugin-linkshowdirection-mode')).to.be.null;
      expect(localStorage.getItem('plugin-linkshowdirection-drawtools')).to.be.null;

      settings.reset('link-show-direction.mode');
      linkShowDirection.migrateSettings();
      expect(set.calledTwice).to.be.true;
      expect(settings.get('link-show-direction.mode')).to.equal('Static near origin');
    });

    it('moves a DrawTools flag that is off', () => {
      settings.set('link-show-direction.drawtools', true);
      localStorage.setItem('plugin-linkshowdirection-drawtools', 'false');

      linkShowDirection.migrateSettings();

      expect(settings.get('link-show-direction.drawtools')).to.be.false;
      expect(localStorage.getItem('plugin-linkshowdirection-drawtools')).to.be.null;
    });

    it('drops a style that no longer exists, with a warning', () => {
      const warn = sinon.stub(globalThis.log, 'warn');
      localStorage.setItem('plugin-linkshowdirection-mode', 'Removed style');

      linkShowDirection.migrateSettings();

      expect(warn.calledOnce).to.be.true;
      expect(settings.get('link-show-direction.mode')).to.equal('Static near origin');
      expect(localStorage.getItem('plugin-linkshowdirection-mode')).to.be.null;
    });
  });

  describe('mode', () => {
    it('animates the links with the new style', () => {
      settings.set('link-show-direction.mode', 'Disabled');

      expect(linkShowDirection.mode).to.equal('Disabled');
      expect(linkShowDirection.animateLinks.calledOnce).to.be.true;
    });

    it('offers every style, with the style name as the stored value', () => {
      const options = page.blocks.find((block) => block.key === 'mode').options();
      expect(options).to.deep.equal(Object.keys(linkShowDirection.styles));
    });
  });

  describe('settings page', () => {
    it('offers Apply to DrawTools only with Draw Tools installed', () => {
      const visible = page.blocks.find((block) => block.key === 'drawtools').visible;
      const drawTools = window.plugin.drawTools;
      try {
        delete window.plugin.drawTools;
        expect(visible()).to.be.false;
        window.plugin.drawTools = {};
        expect(visible()).to.be.true;
      } finally {
        window.plugin.drawTools = drawTools;
        if (drawTools === undefined) delete window.plugin.drawTools;
      }
    });
  });

  describe('while the map moves', () => {
    it('restyles the links once the map stops', () => {
      linkShowDirection.moving = true;

      settings.set('link-show-direction.mode', 'Disabled', { source: 'remote' });
      expect(linkShowDirection.animateLinks.called).to.be.false;

      linkShowDirection.onMoveEnd();
      expect(linkShowDirection.moving).to.be.false;
      expect(linkShowDirection.animateLinks.calledOnce).to.be.true;
    });

    it('does not restyle after a move when nothing changed', () => {
      linkShowDirection.moving = true;
      linkShowDirection.onMoveEnd();
      expect(linkShowDirection.animateLinks.called).to.be.false;
    });
  });

  describe('drawtools', () => {
    it('restyles DrawTools', () => {
      settings.set('link-show-direction.drawtools', true);
      expect(linkShowDirection.drawtools).to.be.true;
      expect(linkShowDirection.animateLinks.calledOnce).to.be.true;

      settings.set('link-show-direction.drawtools', false);
      expect(linkShowDirection.removeDrawToolsStyle.calledOnce).to.be.true;
    });
  });
});
