import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

before(async () => {
  globalThis.window.layerChooser = { addOverlay() {} };
  globalThis.IITC.statusbar = { map: { update() {} } };

  await import('../core/code/data_cache.js');
  await import('../core/code/map_data_render.js');
  await import('../core/code/map_data_debug.js');
  await import('../core/code/map_data_request.js');
});

describe('IITC.map.Request', () => {
  it('wires up cache, renderer and debug tiles on construction', () => {
    const req = new IITC.map.Request();
    expect(req.cache).to.be.instanceOf(IITC.map.Cache);
    expect(req.render).to.be.instanceOf(IITC.map.Renderer);
    expect(req.debugTiles).to.be.instanceOf(IITC.map.DebugTiles);
  });

  it('sets an initial startup status', () => {
    const req = new IITC.map.Request();
    expect(req.getStatus().short).to.equal('startup');
  });

  it('setStatus / getStatus round-trip', () => {
    const req = new IITC.map.Request();
    req.setStatus('loading', 'Tiles: 1 loaded', 0.5);
    expect(req.getStatus()).to.deep.equal({ short: 'loading', long: 'Tiles: 1 loaded', progress: 0.5 });
  });

  it('setStatus notifies the status bar', () => {
    const req = new IITC.map.Request();
    IITC.statusbar.map.update = sinon.spy(); // reset after the constructor's own setStatus call
    req.setStatus('loading');
    expect(IITC.statusbar.map.update.calledOnce).to.be.true;
  });
});

describe('IITC.map map-class legacy aliases', () => {
  it('keeps window.MapDataRequest and window.Render pointing at the classes', () => {
    expect(window.MapDataRequest).to.equal(IITC.map.Request);
    expect(window.Render).to.equal(IITC.map.Renderer);
    expect(window.RenderDebugTiles).to.equal(IITC.map.DebugTiles);
  });
});
