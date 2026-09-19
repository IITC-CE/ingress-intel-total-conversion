import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC, L */
/* eslint-disable no-unused-expressions */

before(async () => {
  await import('../core/code/map.js');
  await import('../core/code/map_renderer.js');
});

describe('IITC.map.Renderer world anchor', () => {
  const map = globalThis.window.map;
  let centerLng;
  let onMove;
  let renderer;
  let placed;

  // drive the map centre the way leaflet does, one 'move' event per step
  const moveTo = (lng) => {
    centerLng = lng;
    onMove();
  };

  const createRenderer = (lng) => {
    centerLng = lng;
    renderer = new IITC.map.Renderer();
    placed = sinon.stub(renderer, 'placeOnWorldCopy');
  };

  beforeEach(() => {
    onMove = undefined;

    sinon.stub(map, 'getCenter').callsFake(() => ({ lat: 0, lng: centerLng }));
    sinon.stub(map, 'on').callsFake((event, handler) => {
      if (event === 'move') onMove = handler;
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('starts anchored at the map centre', () => {
    createRenderer(170);

    expect(renderer.worldAnchorLng).to.equal(170);
  });

  it('leaves the entities alone while the view stays within the margin', () => {
    createRenderer(0);
    moveTo(30);
    moveTo(-45);

    expect(placed.called).to.be.false;
    expect(renderer.worldAnchorLng).to.equal(0);
  });

  it('places the entities again when a drag wraps the map past the antimeridian', () => {
    createRenderer(170);
    moveTo(179.9);
    // the wrap lands between two move events, so the centre moves a whole world minus that frame
    moveTo(-179.8);

    expect(placed.calledOnce).to.be.true;
    expect(renderer.worldAnchorLng).to.equal(-179.8);
  });

  it('places the entities again after a jump far across the map', () => {
    createRenderer(-12.39);
    moveTo(151.21);

    expect(placed.calledOnce).to.be.true;
    expect(renderer.worldAnchorLng).to.equal(151.21);
  });

  it('follows a long pan in steps rather than on every move', () => {
    createRenderer(0);
    for (let lng = 1; lng <= 100; lng++) moveTo(lng);

    expect(placed.callCount).to.equal(2);
    expect(renderer.worldAnchorLng).to.equal(92);
  });
});

describe('IITC.map.Renderer.placeOnWorldCopy', () => {
  const map = globalThis.window.map;
  let renderer;

  const portal = (lngE6, lng) => {
    const pos = { lat: 0, lng };
    return { options: { data: { lngE6 } }, getLatLng: () => pos, setLatLng: sinon.spy() };
  };

  const shape = (data, lngs) => {
    let latlngs = lngs.map((lng) => ({ lat: 0, lng }));
    return {
      options: { data },
      getLatLngs: () => latlngs,
      setLatLngs: sinon.spy((value) => (latlngs = value)),
      lngs: () => latlngs.map((pos) => pos.lng),
    };
  };

  const placeAround = (anchorLng) => {
    renderer.worldAnchorLng = anchorLng;
    renderer.placeOnWorldCopy();
  };

  beforeEach(() => {
    sinon.replace(
      L,
      'LatLng',
      class {
        constructor(lat, lng) {
          this.lat = lat;
          this.lng = lng;
        }
      }
    );
    sinon.stub(map, 'on');
    renderer = new IITC.map.Renderer();
    globalThis.window.portals = {};
    globalThis.window.links = {};
    globalThis.window.fields = {};
  });

  afterEach(() => {
    sinon.restore();
    delete globalThis.window.portals;
    delete globalThis.window.links;
    delete globalThis.window.fields;
  });

  it('moves a portal beyond the antimeridian to the copy next to the anchor', () => {
    const p = portal(-179500000, -179.5);
    window.portals.p = p;

    placeAround(179);

    expect(p.getLatLng().lng).to.equal(180.5);
    expect(p.setLatLng.calledOnceWithExactly(p.getLatLng())).to.be.true;
  });

  it('derives the copy from the true longitude, whatever copy the portal is drawn on', () => {
    const p = portal(-179500000, 540.5);
    window.portals.p = p;

    placeAround(-170);

    expect(p.getLatLng().lng).to.equal(-179.5);
  });

  it('leaves a portal already on the right copy untouched', () => {
    const p = portal(10000000, 10);
    window.portals.p = p;

    placeAround(40);

    expect(p.setLatLng.called).to.be.false;
  });

  it('keeps a link across the antimeridian continuous on the copy next to the anchor', () => {
    const data = { oLatE6: 0, oLngE6: 179500000, dLatE6: 0, dLngE6: -179000000 };
    const l = shape(data, [179.5, 181]);
    window.links.l = l;

    placeAround(-175);

    expect(l.lngs()).to.deep.equal([-180.5, -179]);
  });

  it('keeps a field across the antimeridian continuous on the copy next to the anchor', () => {
    const points = [
      { latE6: 0, lngE6: 179000000 },
      { latE6: 1000000, lngE6: -179000000 },
      { latE6: 2000000, lngE6: 178000000 },
    ];
    const f = shape({ points }, [179, -179, 178]);
    window.fields.f = f;

    placeAround(-178);

    expect(f.lngs()).to.deep.equal([-181, -179, -182]);
  });

  it('leaves a shape already on the right copy untouched', () => {
    const data = { oLatE6: 0, oLngE6: 179500000, dLatE6: 0, dLngE6: -179000000 };
    const l = shape(data, [179.5, 181]);
    window.links.l = l;

    placeAround(170);

    expect(l.setLatLngs.called).to.be.false;
  });
});
