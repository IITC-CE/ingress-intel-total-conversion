import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

window.plugin = window.plugin || {};
await import('../../core/code/settings.js');
await import('../../plugins/draw-tools.js');

const drawTools = window.plugin.drawTools;
const settings = IITC.settings;

describe('draw-tools settings', () => {
  let page;

  before(() => {
    drawTools.registerSettings();
    page = IITC.settings._pages['draw-tools'];
  });

  beforeEach(() => {
    localStorage.clear();
    drawTools.currentColor = '#a24ac3';
    drawTools.merge.status = true;
    drawTools.EDFstatus = false;
    drawTools.editing = false;
    drawTools.fillPending = false;
    sinon.stub(drawTools, 'setDrawColor');
    sinon.stub(drawTools, 'toggleOpacityOpt');
    sinon.stub(drawTools, 'clearAndDraw');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('defaults to the colors and modes drawing started with', () => {
    expect(settings.get('draw-tools.color')).to.equal('#a24ac3');
    expect(settings.get('draw-tools.resetBeforeImport')).to.be.false;
    expect(settings.get('draw-tools.fill')).to.be.true;
  });

  describe('color', () => {
    it('remembers the color and applies it to new drawings', () => {
      settings.set('draw-tools.color', '#51c34a');

      expect(JSON.parse(localStorage.getItem('iitc-setting:draw-tools.color'))).to.equal('#51c34a');
      expect(drawTools.currentColor).to.equal('#51c34a');
      expect(drawTools.setDrawColor.calledOnceWithExactly('#51c34a')).to.be.true;
    });

    it('rejects a value that is not a color', () => {
      expect(settings.set('draw-tools.color', 'purple')).to.be.false;
      expect(drawTools.setDrawColor.called).to.be.false;
    });
  });

  describe('reset before paste or import', () => {
    it('toggles through merge.toggle and keeps merge.status its opposite', () => {
      drawTools.merge.toggle();
      expect(settings.get('draw-tools.resetBeforeImport')).to.be.true;
      expect(drawTools.merge.status).to.be.false;

      drawTools.merge.toggle();
      expect(settings.get('draw-tools.resetBeforeImport')).to.be.false;
      expect(drawTools.merge.status).to.be.true;
    });
  });

  describe('toggles given a state', () => {
    it('store the state given, even after a change from elsewhere', () => {
      settings.set('draw-tools.resetBeforeImport', true, { source: 'remote' });
      drawTools.merge.toggle(true);
      expect(settings.get('draw-tools.resetBeforeImport')).to.be.true;

      settings.set('draw-tools.fill', false, { source: 'remote' });
      drawTools.edfStatusToggle(false);
      expect(settings.get('draw-tools.fill')).to.be.false;
    });
  });

  describe('fill while editing', () => {
    it('applies a fill change from elsewhere once deleting stops', () => {
      drawTools.onDeleteStart();
      drawTools.clearAndDraw.resetHistory();

      settings.set('draw-tools.fill', false, { source: 'remote' });
      expect(drawTools.clearAndDraw.called).to.be.false;
      expect(drawTools.EDFstatus).to.be.false;

      drawTools.onDeleteStop();
      expect(drawTools.EDFstatus).to.be.true;
      expect(drawTools.clearAndDraw.calledOnce).to.be.true;
    });

    it('applies a fill change from elsewhere once editing stops', () => {
      drawTools.onEditStart();

      settings.set('draw-tools.fill', false, { source: 'remote' });
      expect(drawTools.clearAndDraw.called).to.be.false;

      drawTools.onEditStop();
      expect(drawTools.EDFstatus).to.be.true;
      expect(drawTools.clearAndDraw.calledOnce).to.be.true;
    });

    it('restores the stored fill after deleting', () => {
      settings.set('draw-tools.fill', false);
      expect(drawTools.EDFstatus).to.be.true;

      drawTools.onDeleteStart();
      expect(drawTools.EDFstatus).to.be.false;

      drawTools.onDeleteStop();
      expect(drawTools.EDFstatus).to.be.true;
    });

    it('does not redraw when editing stops with nothing pending', () => {
      drawTools.onEditStart();
      drawTools.onEditStop();
      expect(drawTools.clearAndDraw.called).to.be.false;
    });
  });

  describe('fill', () => {
    it('toggles through edfStatusToggle and redraws the polygons once', () => {
      drawTools.edfStatusToggle();

      expect(settings.get('draw-tools.fill')).to.be.false;
      expect(drawTools.EDFstatus).to.be.true;
      expect(drawTools.toggleOpacityOpt.calledOnce).to.be.true;
      expect(drawTools.clearAndDraw.calledOnce).to.be.true;
    });
  });

  describe('settings page', () => {
    const block = (title) => page.blocks.find((candidate) => candidate.title === title);
    const importBlock = () => page.blocks.find((candidate) => candidate.type === 'import');
    const KEY = 'plugin-draw-tools-layer';
    let replaced;

    beforeEach(() => {
      replaced = { utils: IITC.utils, confirm: globalThis.confirm, runHooks: window.runHooks };
      window.runHooks = () => {};
      drawTools.KEY_STORAGE = KEY;
      drawTools.drawnItems = { clearLayers: sinon.spy() };
      sinon.stub(drawTools, 'import');
      sinon.stub(drawTools, 'save');
    });

    afterEach(() => {
      globalThis.confirm = replaced.confirm;
      window.runHooks = replaced.runHooks;
      IITC.utils = replaced.utils;
    });

    it('exports what is stored, and refuses while nothing is drawn', () => {
      expect(() => block('Drawn items').data()).to.throw('Nothing is drawn yet');

      localStorage.setItem(KEY, '[{"type":"marker"}]');

      expect(block('Drawn items').data()).to.equal('[{"type":"marker"}]');
      expect(block('Drawn items')).to.include({ filename: 'IITC-drawn-items.json' });
    });

    it('refuses the other exports and optExport while nothing is drawn', () => {
      expect(() => block('Polygons as lines').data()).to.throw('Nothing is drawn yet');
      expect(() => block('Link for the standard Intel map').data()).to.throw('Nothing is drawn yet');
      expect(() => drawTools.optExport()).to.throw('Nothing is drawn yet');
    });

    it('imports pasted items and tells so', () => {
      expect(importBlock().onData('[{"type":"marker"}]')).to.equal('Imported drawn items');
      expect(drawTools.import.calledOnce).to.be.true;
      expect(drawTools.save.calledOnce).to.be.true;
    });

    it('refuses pasted text that is no drawn items', () => {
      sinon.stub(console, 'warn');
      expect(() => importBlock().onData('hello')).to.throw('Neither drawn items nor a link with drawn lines');
      expect(drawTools.save.called).to.be.false;
    });

    it('imports files, clearing the drawn items once when reset is on, and names the files without drawn items', async () => {
      sinon.stub(console, 'warn');
      sinon.stub(console, 'log');
      drawTools.merge.status = false;

      const report = await importBlock().onFiles([
        { name: 'a.json', text: '[]' },
        { name: 'b.json', text: 'oops' },
        { name: 'c.json', text: '[]' },
      ]);

      expect(report).to.equal('Imported drawn items; no drawn items in b.json');
      expect(drawTools.drawnItems.clearLayers.calledOnce).to.be.true;
      expect(drawTools.import.calledTwice).to.be.true;
    });

    it('fails when no file holds drawn items, and does nothing when none is picked', async () => {
      sinon.stub(console, 'warn');
      expect(() => importBlock().onFiles([{ name: 'b.json', text: 'oops' }])).to.throw('No drawn items in b.json');

      IITC.utils = { importFile: sinon.stub().resolves([]) };
      expect(await drawTools.optImport()).to.be.undefined;
    });

    it('deletes all drawn items only when confirmed', () => {
      sinon.stub(console, 'log');
      sinon.stub(drawTools, 'load');
      globalThis.confirm = () => false;
      expect(block('Delete all drawn items').action()).to.be.undefined;
      expect(drawTools.drawnItems.clearLayers.called).to.be.false;

      globalThis.confirm = () => true;
      expect(block('Delete all drawn items').action()).to.equal('Deleted all drawn items');
      expect(drawTools.drawnItems.clearLayers.calledOnce).to.be.true;
    });

    it('shows the warnings of the Intel link for what is drawn', () => {
      localStorage.setItem(KEY, '[{"type":"circle"}]');
      sinon.stub(drawTools, 'stockLink').returns({ url: 'https://intel.ingress.com/?pls=', warnings: ['Warning: Circles cannot be exported to stock intel'] });

      expect(block('Link for the standard Intel map').description()).to.equal('For players without IITC. Warning: Circles cannot be exported to stock intel');
    });

    it('draws the page again when the drawn items are saved or loaded', () => {
      const refresh = sinon.stub();
      const replacedRefresh = settings.refresh;
      settings.refresh = refresh;
      sinon.stub(console, 'log');
      drawTools.save.restore();
      drawTools.drawnItems.eachLayer = () => {};
      drawTools.itemMap = {};
      try {
        drawTools.save();
        drawTools.load();
      } finally {
        settings.refresh = replacedRefresh;
      }
      expect(refresh.callCount).to.equal(2);
      expect(refresh.alwaysCalledWith('draw-tools')).to.be.true;
    });
  });
});
