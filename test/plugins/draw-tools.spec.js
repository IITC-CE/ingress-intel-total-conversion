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
  before(() => {
    drawTools.registerSettings();
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
    it('toggles from the dialog and keeps merge.status its opposite', () => {
      drawTools.merge.toggle();
      expect(settings.get('draw-tools.resetBeforeImport')).to.be.true;
      expect(drawTools.merge.status).to.be.false;

      drawTools.merge.toggle();
      expect(settings.get('draw-tools.resetBeforeImport')).to.be.false;
      expect(drawTools.merge.status).to.be.true;
    });
  });

  describe('dialog checkboxes', () => {
    it('store the state they show, even after a change from elsewhere', () => {
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
    it('toggles from the dialog and redraws the polygons once', () => {
      drawTools.edfStatusToggle();

      expect(settings.get('draw-tools.fill')).to.be.false;
      expect(drawTools.EDFstatus).to.be.true;
      expect(drawTools.toggleOpacityOpt.calledOnce).to.be.true;
      expect(drawTools.clearAndDraw.calledOnce).to.be.true;
    });
  });
});
