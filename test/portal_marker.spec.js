import { describe, it, before, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC, L */
/* eslint-disable no-unused-expressions */

before(async () => {
  await import('../core/code/portal.js');
  await import('../core/code/portal_marker.js');
  await import('../core/code/portal_highlighter.js');
  await import('../core/code/options.js');
  await import('../core/code/options_general.js');
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

  it('lets plugins override the breakpoints via scaleSteps', () => {
    L.Browser.mobile = false;
    const original = IITC.portal.marker.scaleSteps.desktop;
    IITC.portal.marker.scaleSteps.desktop = [
      [14, 3],
      [0, 0.1],
    ];
    window.map.getZoom = () => 14;
    expect(IITC.portal.marker.scale()).to.equal(3);
    window.map.getZoom = () => 5;
    expect(IITC.portal.marker.scale()).to.equal(0.1);
    IITC.portal.marker.scaleSteps.desktop = original;
  });
});

describe('IITC.portal.marker.getStyleOptions', () => {
  before(() => {
    L.Browser.mobile = false;
    window.map.getZoom = () => 14; // scale = 1
  });

  afterEach(() => {
    IITC.options.reset('iitc.machinaAtLevel1');
    sinon.restore();
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

  it('draws Machina portals at the size of level 1 while the option is on, and restyles the portals on change', () => {
    const resetAll = sinon.stub(IITC.portal.highlighter, 'resetAll');
    const machina = { team: window.TEAM_MAC, level: 8 };
    expect(IITC.portal.marker.getStyleOptions(machina)).to.include({ radius: 11, weight: 4 });

    IITC.options.set('iitc.machinaAtLevel1', true);
    expect(resetAll.calledOnce).to.be.true;
    expect(IITC.portal.marker.getStyleOptions(machina)).to.include({ radius: 7, weight: 2 }); // level 1
    expect(IITC.portal.marker.getStyleOptions({ team: window.TEAM_ENL, level: 8 })).to.include({ radius: 11, weight: 4 });
    expect(IITC.portal.marker.getStyleOptions({ team: window.TEAM_MAC, level: 0 })).to.include({ weight: 1, dashArray: '1,2' });
  });
});

describe('IITC.portal.marker.setStyle', () => {
  it('delegates to the marker selection state', () => {
    const marker = { setSelected: sinon.spy() };
    IITC.portal.marker.setStyle(marker, true);
    expect(marker.setSelected.calledOnceWithExactly(true)).to.be.true;
  });
});
