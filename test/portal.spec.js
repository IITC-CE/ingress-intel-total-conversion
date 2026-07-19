import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC, L */
/* eslint-disable no-unused-expressions */

// game constants live in the shared mock (test/_mocks.js), preloaded via `mocha -r` before this module
const RESO_NRG = globalThis.window.RESO_NRG;

// Builds a resonator array of the given per-slot levels (energy defaults to the level cap)
function resonators(levels, owner = 'player') {
  return levels.map((level) => (level === null ? null : { level, energy: RESO_NRG[level], owner }));
}

before(async () => {
  Object.assign(globalThis.window, { links: {}, fields: {}, portals: {} });

  await import('../core/code/portal.js');
  await import('../core/code/portal_display.js');
});

describe('IITC.portal namespace', () => {
  it('keeps every legacy window.* global working as an alias', () => {
    const aliases = {
      getPortalLinks: 'getLinks',
      getPortalLinksCount: 'getLinksCount',
      getPortalFields: 'getFields',
      getPortalFieldsCount: 'getFieldsCount',
      findPortalGuidByPositionE6: 'findGuidByPositionE6',
      getPortalLevel: 'getLevel',
      getTotalPortalEnergy: 'getTotalEnergy',
      getPortalEnergy: 'getTotalEnergy', // legacy alias of getTotalPortalEnergy
      getCurrentPortalEnergy: 'getCurrentEnergy',
      getPortalHealth: 'getHealth',
      getPortalRange: 'getRange',
      getLinkAmpRangeBoost: 'getLinkAmpRangeBoost',
      getAttackApGain: 'getAttackApGain',
      fixPortalImageUrl: 'fixImageUrl',
      getPortalModsByType: 'getModsByType',
      getPortalShieldMitigation: 'getShieldMitigation',
      getPortalLinkDefenseBoost: 'getLinkDefenseBoost',
      getPortalLinksMitigation: 'getLinksMitigation',
      getPortalMitigationDetails: 'getMitigationDetails',
      getMaxOutgoingLinks: 'getMaxOutgoingLinks',
      getPortalHackDetails: 'getHackDetails',
      getPortalSummaryData: 'getSummaryData',
      getPortalAttackValues: 'getAttackValues',
      zoomToAndShowPortal: 'zoomToAndShow',
      selectPortalByLatLng: 'selectByLatLng',
      selectPortalWhenLoadedByLatLng: 'selectWhenLoadedByLatLng',
      selectPortalWhenLoadedByGuid: 'selectWhenLoadedByGuid',
    };
    Object.entries(aliases).forEach(([oldName, newName]) => {
      expect(window[oldName], oldName).to.be.a('function');
      expect(window[oldName], oldName).to.equal(IITC.portal[newName]);
    });
  });

  it('syncs a legacy global with the namespace in both directions', () => {
    const original = IITC.portal.getLevel;

    // window -> namespace
    const viaWindow = () => 42;
    window.getPortalLevel = viaWindow;
    expect(IITC.portal.getLevel).to.equal(viaWindow);
    expect(window.getPortalLevel(null)).to.equal(42);

    // namespace -> window
    const viaNamespace = () => 7;
    IITC.portal.getLevel = viaNamespace;
    expect(window.getPortalLevel).to.equal(viaNamespace);

    IITC.portal.getLevel = original; // restore
  });
});

describe('IITC.portal.getLevel', () => {
  it('returns 0 when there are no resonators', () => {
    expect(IITC.portal.getLevel({})).to.equal(0);
  });

  it('returns the average resonator level', () => {
    expect(IITC.portal.getLevel({ resonators: resonators([8, 8, 8, 8, 8, 8, 8, 8]) })).to.equal(8);
    expect(IITC.portal.getLevel({ resonators: resonators([8, 8, 8, 8, 0, 0, 0, 0]) })).to.equal(4);
  });

  it('counts missing slots as level 0', () => {
    expect(IITC.portal.getLevel({ resonators: resonators([8, 8, null, null, null, null, null, null]) })).to.equal(2);
  });
});

describe('IITC.portal energy helpers', () => {
  it('getTotalEnergy sums the resonator caps', () => {
    const d = { resonators: resonators([8, 8, 8, 8, 8, 8, 8, 8]) };
    expect(IITC.portal.getTotalEnergy(d)).to.equal(8 * RESO_NRG[8]);
  });

  it('getCurrentEnergy sums the resonator energies', () => {
    const partial = { resonators: resonators([8, 8, 8, 8, 8, 8, 8, 8]) };
    partial.resonators[0].energy = 0;
    expect(IITC.portal.getCurrentEnergy(partial)).to.equal(7 * RESO_NRG[8]);
  });

  it('getHealth returns the percentage of current vs total energy', () => {
    const half = { resonators: resonators([8, 8, 8, 8, 8, 8, 8, 8]) };
    half.resonators.forEach((r) => (r.energy = RESO_NRG[8] / 2));
    expect(IITC.portal.getHealth(half)).to.equal(50);
  });

  it('getHealth returns 0 for a portal with no energy', () => {
    expect(IITC.portal.getHealth({ resonators: [] })).to.equal(0);
  });
});

describe('IITC.portal.getModsByType', () => {
  const d = {
    mods: [{ name: 'a', stats: { MITIGATION: 10 } }, null, { name: 'b', stats: { MITIGATION: 30 } }, { name: 'c', stats: { LINK_RANGE_MULTIPLIER: 2000 } }],
  };

  it('filters mods by their stat and sorts descending', () => {
    const shields = IITC.portal.getModsByType(d, 'RES_SHIELD');
    expect(shields.map((m) => m.name)).to.deep.equal(['b', 'a']);
  });

  it('returns an empty array when no mods match', () => {
    expect(IITC.portal.getModsByType({ mods: [] }, 'RES_SHIELD')).to.deep.equal([]);
  });
});

describe('IITC.portal mitigation helpers', () => {
  it('getShieldMitigation sums shield mitigation', () => {
    const d = { mods: [{ stats: { MITIGATION: 10 } }, { stats: { MITIGATION: 20 } }] };
    expect(IITC.portal.getShieldMitigation(d)).to.equal(30);
  });

  it('getLinkDefenseBoost multiplies ultra link amp boosts', () => {
    // ultra link amps carry OUTGOING_LINKS_BONUS (identifies the type) plus LINK_DEFENSE_BOOST
    const d = { mods: [{ stats: { OUTGOING_LINKS_BONUS: 8, LINK_DEFENSE_BOOST: 1500 } }] };
    expect(IITC.portal.getLinkDefenseBoost(d)).to.equal(1.5);
  });

  it('getMitigationDetails caps total mitigation at 95', () => {
    const d = { mods: [{ stats: { MITIGATION: 200 } }] };
    const details = IITC.portal.getMitigationDetails(d, 0);
    expect(details.shields).to.equal(200);
    expect(details.total).to.equal(95);
    expect(details.excess).to.be.closeTo(105, 0.01);
  });
});

describe('IITC.portal.getMaxOutgoingLinks', () => {
  it('starts at 8 and adds ultra link amp bonuses', () => {
    const d = { mods: [{ stats: { OUTGOING_LINKS_BONUS: 8 } }] };
    expect(IITC.portal.getMaxOutgoingLinks(d)).to.equal(16);
  });
});

describe('IITC.portal.getRange', () => {
  it('computes range from level with no link amps', () => {
    const d = { team: 'ENLIGHTENED', level: 8, resCount: 8, resonators: resonators([8, 8, 8, 8, 8, 8, 8, 8]), mods: [] };
    const range = IITC.portal.getRange(d);
    expect(range.base).to.equal(160 * Math.pow(8, 4));
    expect(range.boost).to.equal(1);
    expect(range.range).to.equal(range.base);
    expect(range.isLinkable).to.be.true;
  });

  it('marks a portal with missing resonators as not linkable', () => {
    const d = { team: 'ENLIGHTENED', level: 4, resCount: 4, resonators: resonators([8, 8, 8, 8]), mods: [] };
    expect(IITC.portal.getRange(d).isLinkable).to.be.false;
  });
});

describe('IITC.portal.getHackDetails', () => {
  it('returns default hack count and cooldown for an enemy portal', () => {
    const d = { team: 'RESISTANCE', mods: [] };
    const details = IITC.portal.getHackDetails(d);
    expect(details.hacks).to.equal(4);
    expect(details.cooldown).to.equal(300);
    expect(details.burnout).to.equal(300 * 3);
  });

  it('uses the faction cooldown for a friendly portal', () => {
    const d = { team: 'ENLIGHTENED', mods: [] };
    expect(IITC.portal.getHackDetails(d).cooldown).to.equal(180);
  });
});

describe('IITC.portal.getSummaryData', () => {
  it('reports neutral portals as level 1', () => {
    const d = { title: 'x', team: 'NEUTRAL', latE6: 1, lngE6: 2, resonators: [] };
    const summary = IITC.portal.getSummaryData(d);
    expect(summary.level).to.equal(1);
    expect(summary.type).to.equal('portal');
    expect(summary.resCount).to.equal(0);
  });
});

describe('IITC.portal.fixImageUrl', () => {
  it('strips the protocol from http image urls on https', () => {
    expect(IITC.portal.fixImageUrl('http://example.com/a.png')).to.equal('//example.com/a.png');
  });

  it('returns the default image when url is missing', () => {
    expect(IITC.portal.fixImageUrl(undefined)).to.equal('default.png');
  });
});

describe('IITC.portal link/field lookups', () => {
  before(() => {
    window.links = {
      l1: { options: { data: { oGuid: 'A', dGuid: 'B' } } },
      l2: { options: { data: { oGuid: 'C', dGuid: 'A' } } },
    };
    window.fields = {
      f1: { options: { data: { points: [{ guid: 'A' }, { guid: 'B' }, { guid: 'C' }] } } },
    };
  });

  it('getLinks separates incoming and outgoing links', () => {
    const links = IITC.portal.getLinks('A');
    expect(links.out).to.deep.equal(['l1']);
    expect(links.in).to.deep.equal(['l2']);
  });

  it('getLinksCount totals incoming and outgoing', () => {
    expect(IITC.portal.getLinksCount('A')).to.equal(2);
  });

  it('getFields finds fields referencing the portal', () => {
    expect(IITC.portal.getFields('A')).to.deep.equal(['f1']);
    expect(IITC.portal.getFieldsCount('B')).to.equal(1);
  });
});

describe('IITC.portal.findGuidByPositionE6', () => {
  before(() => {
    window.portals = {
      G1: { options: { data: { guid: 'G1', latE6: 1000, lngE6: 2000 } } },
    };
  });

  it('returns the guid at a matching position', () => {
    expect(IITC.portal.findGuidByPositionE6(1000, 2000)).to.equal('G1');
  });

  it('returns null when nothing matches', () => {
    expect(IITC.portal.findGuidByPositionE6(0, 0)).to.equal(null);
  });
});

describe('IITC.portal navigation', () => {
  beforeEach(() => {
    window.DEFAULT_ZOOM = 17;
    window.portals = {};
    window.selectedPortal = undefined;
    window.renderPortalDetails = sinon.spy();
    sinon.stub(window.map, 'setView');
  });

  afterEach(() => sinon.restore());

  it('zoomToAndShow renders immediately when the portal is already loaded', () => {
    window.portals = { g: {} };
    IITC.portal.zoomToAndShow('g', [1, 2]);
    expect(window.map.setView.calledOnceWithExactly([1, 2], 17)).to.be.true;
    expect(window.renderPortalDetails.calledOnceWithExactly('g')).to.be.true;
  });

  it('zoomToAndShow defers to selectWhenLoadedByGuid when the portal is not loaded', () => {
    const defer = sinon.stub(IITC.portal, 'selectWhenLoadedByGuid');
    IITC.portal.zoomToAndShow('missing', [1, 2]);
    expect(window.map.setView.calledOnce).to.be.true;
    expect(defer.calledOnceWithExactly('missing')).to.be.true;
  });

  it('selectByLatLng renders a portal that is currently visible', () => {
    window.portals = { g: { getLatLng: () => ({ lat: 1, lng: 2 }) } };
    IITC.portal.selectByLatLng(1, 2);
    expect(window.renderPortalDetails.calledOnceWithExactly('g')).to.be.true;
    expect(window.map.setView.called).to.be.false;
  });

  it('selectByLatLng unpacks an array and defers when the portal is off-screen', () => {
    const defer = sinon.stub(IITC.portal, 'selectWhenLoadedByLatLng');
    IITC.portal.selectByLatLng([3, 4]);
    expect(defer.calledOnce).to.be.true;
    expect(defer.firstCall.args[0]).to.be.instanceOf(L.LatLng);
    expect(window.map.setView.calledOnce).to.be.true;
    expect(window.renderPortalDetails.called).to.be.false;
  });

  it('selectWhenLoadedByGuid selects the portal once it is added to the map', () => {
    const hooks = {};
    window.addHook = (name, cb) => (hooks[name] = hooks[name] || []).push(cb);
    window.removeHook = (name, cb) => (hooks[name] = hooks[name].filter((h) => h !== cb));

    IITC.portal.selectWhenLoadedByGuid('wanted');
    expect(window.urlPortal).to.equal('wanted');
    expect(hooks.portalAdded).to.have.length(1);

    hooks.portalAdded[0]({ portal: { options: { guid: 'other' } } });
    expect(window.renderPortalDetails.called).to.be.false;

    hooks.portalAdded[0]({ portal: { options: { guid: 'wanted' } } });
    expect(window.selectedPortal).to.equal('wanted');
    expect(window.renderPortalDetails.calledOnceWithExactly('wanted', true)).to.be.true;
    expect(hooks.portalAdded).to.have.length(0);
  });

  it('selectWhenLoadedByLatLng selects the portal whose location matches', () => {
    const hooks = {};
    window.addHook = (name, cb) => (hooks[name] = hooks[name] || []).push(cb);
    window.removeHook = (name, cb) => (hooks[name] = hooks[name].filter((h) => h !== cb));

    const target = {};
    IITC.portal.selectWhenLoadedByLatLng(target);
    expect(window.urlPortalLL).to.equal(target);

    hooks.portalAdded[0]({ portal: { getLatLng: () => ({ equals: () => false }), options: { guid: 'x' } } });
    expect(window.renderPortalDetails.called).to.be.false;

    hooks.portalAdded[0]({ portal: { getLatLng: () => ({ equals: (o) => o === target }), options: { guid: 'hit' } } });
    expect(window.selectedPortal).to.equal('hit');
    expect(window.renderPortalDetails.calledOnceWithExactly('hit', true)).to.be.true;
  });
});
