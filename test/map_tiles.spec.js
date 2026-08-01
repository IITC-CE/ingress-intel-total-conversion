import { describe, it, before, beforeEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

before(async () => {
  await import('../core/code/map_data_calc_tools.js');
});

describe('IITC.map.tiles coordinate conversions', () => {
  it('lngToTile maps longitude to a tile column', () => {
    expect(IITC.map.tiles.lngToTile(0, { tilesPerEdge: 4 })).to.equal(2);
    expect(IITC.map.tiles.lngToTile(-180, { tilesPerEdge: 4 })).to.equal(0);
    expect(IITC.map.tiles.lngToTile(-90, { tilesPerEdge: 4 })).to.equal(1);
  });

  it('latToTile puts the equator in the middle and decreases going north', () => {
    const p = { tilesPerEdge: 1000 };
    expect(IITC.map.tiles.latToTile(0, p)).to.equal(500);
    // Mercator: higher latitude -> smaller row index, lower latitude -> larger
    expect(IITC.map.tiles.latToTile(60, p)).to.be.lessThan(500);
    expect(IITC.map.tiles.latToTile(-60, p)).to.be.greaterThan(500);
  });

  it('round-trips real coordinates through the Mercator forward+inverse math', () => {
    const p = { tilesPerEdge: 1e6 };
    for (const lat of [51.5, -33.87, 0]) {
      expect(IITC.map.tiles.tileToLat(IITC.map.tiles.latToTile(lat, p), p)).to.be.closeTo(lat, 0.01);
    }
    for (const lng of [-122.4, 13.4, 0]) {
      expect(IITC.map.tiles.tileToLng(IITC.map.tiles.lngToTile(lng, p), p)).to.be.closeTo(lng, 0.01);
    }
  });

  it('pointToTileId builds the zoom_x_y_level tile id', () => {
    expect(IITC.map.tiles.pointToTileId({ zoom: 5, level: 3 }, 10, 20)).to.equal('5_10_20_3_8_100');
  });
});

describe('IITC.map.tiles zoom parameters', () => {
  beforeEach(() => {
    // deterministic, fully distinct-per-zoom params so getDataZoomForMapZoom never steps down
    IITC.map.tiles.params = {
      TILES_PER_EDGE: Array.from({ length: 30 }, (_, i) => i + 1),
      ZOOM_TO_LEVEL: Array.from({ length: 30 }, (_, i) => 8 - Math.min(i, 7)),
      ZOOM_TO_LINK_LENGTH: Array.from({ length: 30 }, (_, i) => i * 100),
    };
    globalThis.window.MIN_ZOOM = 3;
  });

  it('getMapZoomParameters returns the tile parameters for a zoom level', () => {
    const p = IITC.map.tiles.getMapZoomParameters(10);
    expect(p.tilesPerEdge).to.equal(11);
    expect(p.hasPortals).to.be.false;
    expect(p.zoom).to.equal(10);
  });

  it('getMapZoomParameters falls back to the max tilesPerEdge beyond the array', () => {
    expect(IITC.map.tiles.getMapZoomParameters(40).tilesPerEdge).to.equal(30);
  });

  it('getDataZoomForMapZoom keeps the zoom when neighbouring zooms differ', () => {
    expect(IITC.map.tiles.getDataZoomForMapZoom(10)).to.equal(10);
  });

  it('getDataZoomForMapZoom steps down while neighbouring zooms share identical tile params', () => {
    // zooms 8, 9, 10 collapse to the same tile parameters -> request the lowest equivalent zoom
    IITC.map.tiles.params = {
      TILES_PER_EDGE: Object.assign(
        Array.from({ length: 30 }, (_, i) => i + 1),
        { 8: 2000, 9: 2000, 10: 2000 }
      ),
      ZOOM_TO_LEVEL: Array.from({ length: 30 }, (_, i) => 8 - Math.min(i, 7)),
      ZOOM_TO_LINK_LENGTH: Array.from({ length: 15 }, (_, i) => i * 100),
    };
    expect(IITC.map.tiles.getDataZoomForMapZoom(10)).to.equal(8);
  });

  it('getDataZoomForMapZoom clamps zoom above 21', () => {
    expect(IITC.map.tiles.getDataZoomForMapZoom(25)).to.equal(21);
  });

  it('getDataZoomParameters resolves via getDataZoomForMapZoom for an explicit zoom', () => {
    const zoom = 10;
    const expected = IITC.map.tiles.getMapZoomParameters(IITC.map.tiles.getDataZoomForMapZoom(zoom));
    expect(IITC.map.tiles.getDataZoomParameters(zoom)).to.deep.equal(expected);
  });
});

describe('IITC.map.tiles.setupParams', () => {
  it('populates params from niantic_params and trims ZOOM_TO_LEVEL to 15 entries', () => {
    globalThis.window.niantic_params = {
      ZOOM_TO_LEVEL: [8, 8, 8, 8, 7, 7, 7, 6, 6, 5, 4, 4, 3, 2, 2, 1, 1],
      TILES_PER_EDGE: [1, 1, 1, 40, 40, 80, 80, 320, 1000, 2000, 2000, 4000, 8000, 16000, 16000, 32000],
    };

    IITC.map.tiles.setupParams();

    expect(IITC.map.tiles.params.ZOOM_TO_LEVEL).to.have.lengthOf(15);
    expect(IITC.map.tiles.params.TILES_PER_EDGE).to.have.lengthOf(16);
    expect(IITC.map.tiles.params.ZOOM_TO_LINK_LENGTH).to.be.an('array');
  });

  it('warns via a dialog and uses fallback defaults when stock params are missing', () => {
    globalThis.window.niantic_params = {};
    const dialog = sinon.stub(window, 'dialog');

    try {
      IITC.map.tiles.setupParams();

      expect(dialog.calledOnce).to.be.true;
      expect(IITC.map.tiles.params.TILES_PER_EDGE).to.be.an('array').that.is.not.empty;
      expect(IITC.map.tiles.params.ZOOM_TO_LEVEL).to.have.lengthOf(15);
    } finally {
      dialog.restore();
    }
  });
});

describe('IITC.map.tiles legacy aliases', () => {
  it('keeps the old window.* globals working', () => {
    expect(window.getDataZoomForMapZoom).to.equal(IITC.map.tiles.getDataZoomForMapZoom);
    expect(window.lngToTile).to.equal(IITC.map.tiles.lngToTile);
    expect(window.pointToTileId).to.equal(IITC.map.tiles.pointToTileId);
    // data alias, not just functions
    expect(window.TILE_PARAMS).to.equal(IITC.map.tiles.params);
  });
});
