import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC, L */
/* eslint-disable no-unused-expressions */

before(async () => {
  await import('../core/code/portal.js');
  await import('../core/code/portal_marker.js');
});

describe('IITC.portal.marker namespace', () => {
  it('keeps every legacy window.* global working as an alias', () => {
    const aliases = {
      portalMarkerScale: 'scale',
      createMarker: 'create',
      setMarkerStyle: 'setStyle',
      getMarkerStyleOptions: 'getStyleOptions',
    };
    Object.entries(aliases).forEach(([oldName, newName]) => {
      expect(window[oldName], oldName).to.be.a('function');
      expect(window[oldName], oldName).to.equal(IITC.portal.marker[newName]);
    });
  });
});

describe('IITC.portal.marker.scale', () => {
  it('scales by zoom on desktop', () => {
    L.Browser.mobile = false;
    const cases = [
      [14, 1],
      [12, 0.8],
      [9, 0.65],
      [5, 0.5],
    ];
    cases.forEach(([zoom, expected]) => {
      window.map.getZoom = () => zoom;
      expect(IITC.portal.marker.scale(), `zoom ${zoom}`).to.equal(expected);
    });
  });

  it('uses larger scales on mobile', () => {
    L.Browser.mobile = true;
    window.map.getZoom = () => 16;
    expect(IITC.portal.marker.scale()).to.equal(1.5);
    L.Browser.mobile = false;
  });
});

describe('IITC.portal.marker.getStyleOptions', () => {
  before(() => {
    L.Browser.mobile = false;
    window.map.getZoom = () => 14; // scale = 1
  });

  it('computes radius/weight/color for a full portal', () => {
    const options = IITC.portal.marker.getStyleOptions({ team: window.TEAM_ENL, level: 8 });
    expect(options.radius).to.equal(11); // LEVEL_TO_RADIUS[8]
    expect(options.weight).to.equal(4); // LEVEL_TO_WEIGHT[8]
    expect(options.color).to.equal(window.COLORS[window.TEAM_ENL]);
    expect(options.dashArray).to.equal(null);
  });

  it('uses a dashed placeholder outline for level-0 claimed portals', () => {
    const options = IITC.portal.marker.getStyleOptions({ team: window.TEAM_ENL, level: 0 });
    expect(options.weight).to.equal(1); // placeholderStyle.weight
    expect(options.dashArray).to.equal('1,2'); // placeholderStyle.dashArray
  });
});

describe('IITC.portal.marker.setStyle', () => {
  it('delegates to the marker selection state', () => {
    const marker = { setSelected: sinon.spy() };
    IITC.portal.marker.setStyle(marker, true);
    expect(marker.setSelected.calledOnceWithExactly(true)).to.be.true;
  });
});
