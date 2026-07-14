import { describe, it, before, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC, L */
/* eslint-disable no-unused-expressions */

// Builds a resonator array of the given per-slot levels (energy defaults to the level cap)
function resonators(levels, owner = 'me') {
  return levels.map((level) => (level === null ? null : { level, energy: window.RESO_NRG[level], owner }));
}

before(async () => {
  await import('../core/code/utils.js');
  await import('../core/code/portal.js');
  await import('../core/code/portal_details.js');
  await import('../core/code/portal_display.js');
  await import('../core/code/portal_display_tools.js');

  globalThis.document.location = { pathname: '/intel' };
});

afterEach(() => sinon.restore());

describe('IITC.portal.display namespace', () => {
  it('keeps every legacy window.* global working as an alias', () => {
    const aliases = {
      resetScrollOnNewPortal: 'resetScroll',
      renderPortalUrl: 'renderUrl',
      renderPortalDetails: 'renderDetails',
      renderPortalToSideBar: 'renderToSidebar',
      getPortalMiscDetails: 'getMiscDetails',
      setPortalIndicators: 'setIndicators',
      selectPortal: 'select',
      rangeLinkClick: 'rangeLinkClick',
      makePrimeLink: 'makePrimeLink',
      makePermalink: 'makePermalink',
    };
    Object.entries(aliases).forEach(([oldName, newName]) => {
      expect(window[oldName], oldName).to.be.a('function');
      expect(window[oldName], oldName).to.equal(IITC.portal.display[newName]);
    });
  });
});

describe('IITC.portal.display.makePermalink', () => {
  before(() => {
    // set here rather than in the root hook so other specs sharing window.map cannot clobber it
    globalThis.window.map.getCenter = () => ({ lat: 10, lng: 20 });
    globalThis.window.map.getZoom = () => 15;
  });

  it('builds a portal-only permalink from lat/lng', () => {
    expect(IITC.portal.display.makePermalink([1.5, 2.5])).to.equal('/intel?pll=1.5,2.5');
  });

  it('includes the current map view when requested', () => {
    expect(IITC.portal.display.makePermalink([1, 2], { includeMapView: true })).to.equal('/intel?ll=10,20&z=15&pll=1,2');
  });

  it('creates a map-view-only permalink when no latlng is given', () => {
    expect(IITC.portal.display.makePermalink()).to.equal('/intel?ll=10,20&z=15');
  });

  it('accepts an L.LatLng-like object', () => {
    expect(IITC.portal.display.makePermalink({ lat: 3, lng: 4 })).to.equal('/intel?pll=3,4');
  });
});

describe('IITC.portal.display.makePrimeLink', () => {
  it('builds an Ingress Prime deep link for the portal', () => {
    const link = IITC.portal.display.makePrimeLink('GUID123', 1, 2);
    expect(link)
      .to.be.a('string')
      .and.to.match(/^https:\/\/link\.ingress\.com\//);
    // portal guid is carried in the intel link parameter
    expect(link).to.include('GUID123');
    // fallback link carries the portal coordinates
    expect(decodeURIComponent(link)).to.include('pll=1,2');
    // full expected deep link
    expect(link).to.equal(
      'https://link.ingress.com/?link=https%3A%2F%2Fintel.ingress.com%2Fportal%2FGUID123&apn=com.nianticproject.ingress&isi=576505181&ibi=com.google.ingress&ifl=https%3A%2F%2Fapps.apple.com%2Fapp%2Fingress%2Fid576505181&ofl=https%3A%2F%2Fintel.ingress.com%2Fintel%3Fpll%3D1%2C2'
    );
  });
});

describe('IITC.portal.display.getMiscDetails', () => {
  before(() => {
    // no links/fields for the tested portal, so counts render as 0 regardless of other specs
    window.links = {};
    window.fields = {};
    window.portals = {};
  });

  it('returns undefined when there is no detail data', () => {
    expect(IITC.portal.display.getMiscDetails('G1', undefined)).to.be.undefined;
  });

  it('renders the full random-details table for a fully-deployed portal', () => {
    const d = {
      team: 'ENLIGHTENED',
      level: 8,
      resCount: 8,
      resonators: resonators([8, 8, 8, 8, 8, 8, 8, 8]),
      mods: [],
      owner: 'me',
      latE6: 1000000,
      lngE6: 2000000,
      title: 'X',
    };
    // digits() separates thousands with a thin space (U+2009)
    const rangeTitle = 'Base range:\t655\u2009360m\nLink amp boost:\t×1\nRange:\t655\u2009360m';
    const linksTitle = 'at most 8 outgoing links\n0 links out\n0 links in\n(0 total)';
    const shieldTitle = 'Total shielding:\t0\n- active:\t0\n- excess:\t0\nFrom\n- shields:\t0\n- links:\t0 (1x)';
    const energyTitle = '48000 / 48000';
    const apTitle = 'Friendly AP:\t0\n  Deploy 0, Upgrade 0\n\nEnemy AP:\t2350\n  Destroy AP:\t600\n  Capture AP:\t1750\n';
    const hackTitle = 'Hacks available every 4 hours\nHack count:\t4\nCooldown time:\t3m\nBurnout time:\t9m';

    expect(IITC.portal.display.getMiscDetails('G1', d)).to.equal(
      '<table id="randdetails">' +
        `<tr><td><span class="nickname">me</span></td><th>owner</th>` +
        `<th title="${rangeTitle}">range</th><td title="${rangeTitle}"><a onclick="window.rangeLinkClick()">655km</a></td></tr>` +
        `<tr><td title="${linksTitle}">0 out / 0 in</td><th title="${linksTitle}">links</th><th>fields</th><td>0</td></tr>` +
        `<tr><td title="${shieldTitle}">0</td><th title="${shieldTitle}">shielding</th><th title="${energyTitle}">energy</th><td title="${energyTitle}">48k / 48k</td></tr>` +
        `<tr><td title="${apTitle}">0</td><th title="${apTitle}">AP Gain</th><th title="${hackTitle}">hacks</th><td title="${hackTitle}">4 @ 3m</td></tr>` +
        '</table>'
    );
  });
});

describe('IITC.portal.display.select', () => {
  it('restyles portals, sets indicators, fires the hook and reports a fresh selection', () => {
    window.portals = { a: { setSelected: sinon.spy() }, b: { setSelected: sinon.spy() } };
    window.selectedPortal = 'a';
    const setIndicators = sinon.stub(IITC.portal.display, 'setIndicators');
    const runHooks = (window.runHooks = sinon.spy());

    const update = IITC.portal.display.select('b', 'renderPortalDetails');

    expect(update).to.be.false;
    expect(window.portals.a.setSelected.calledWith(false)).to.be.true;
    expect(window.portals.b.setSelected.calledWith(true)).to.be.true;
    expect(window.selectedPortal).to.equal('b');
    expect(setIndicators.calledOnceWithExactly(window.portals.b)).to.be.true;
    expect(runHooks.calledOnce).to.be.true;
    expect(runHooks.firstCall.args[0]).to.equal('portalSelected');
    expect(runHooks.firstCall.args[1]).to.deep.equal({ selectedPortalGuid: 'b', unselectedPortalGuid: 'a', event: 'renderPortalDetails' });
  });

  it('returns true and keeps the old portal styled when re-selecting the same portal', () => {
    window.portals = { a: { setSelected: sinon.spy() } };
    window.selectedPortal = 'a';
    sinon.stub(IITC.portal.display, 'setIndicators');
    window.runHooks = sinon.spy();

    const update = IITC.portal.display.select('a', 'evt');

    expect(update).to.be.true;
    // no de-selection happens on a re-select; the portal is simply re-styled as selected
    expect(window.portals.a.setSelected.calledOnceWithExactly(true)).to.be.true;
  });
});

describe('IITC.portal.display.setIndicators', () => {
  it('adds a geodesic range circle and an access circle for a linkable portal', () => {
    const geodesic = sinon.stub(L, 'geodesicCircle').returns({ addTo: () => 'GEO' });
    const circle = sinon.stub(L, 'circle').returns({ addTo: () => 'ACC' });
    sinon.stub(IITC.portal.details, 'get').returns({ team: 'ENLIGHTENED', level: 8, resCount: 8, resonators: resonators([8, 8, 8, 8, 8, 8, 8, 8]), mods: [] });

    const p = { getLatLng: () => ({ lat: 1, lng: 2 }), options: { guid: 'g' } };
    IITC.portal.display.setIndicators(p);

    expect(geodesic.calledOnce, 'geodesic range circle').to.be.true;
    expect(circle.calledOnce, 'access circle').to.be.true;
    expect(circle.firstCall.args[1], 'access circle uses HACK_RANGE').to.equal(window.HACK_RANGE);
    expect(window.portalRangeIndicator).to.equal('GEO');
    expect(window.portalAccessIndicator).to.equal('ACC');
  });

  it('removes existing indicators when called with no portal', () => {
    const removeLayer = sinon.stub(window.map, 'removeLayer');
    window.portalRangeIndicator = 'range';
    window.portalAccessIndicator = 'access';

    IITC.portal.display.setIndicators(null);

    expect(removeLayer.calledTwice).to.be.true;
    expect(window.portalRangeIndicator).to.equal(null);
    expect(window.portalAccessIndicator).to.equal(null);
  });
});

describe('IITC.portal.display.rangeLinkClick', () => {
  it('fits the map to the range indicator bounds', () => {
    const bounds = { _bounds: true };
    window.portalRangeIndicator = { getBounds: () => bounds };
    const fitBounds = sinon.stub(window.map, 'fitBounds');

    IITC.portal.display.rangeLinkClick();

    expect(fitBounds.calledOnceWithExactly(bounds)).to.be.true;
    window.portalRangeIndicator = null;
  });

  it('does nothing without a range indicator', () => {
    window.portalRangeIndicator = null;
    const fitBounds = sinon.stub(window.map, 'fitBounds');
    IITC.portal.display.rangeLinkClick();
    expect(fitBounds.called).to.be.false;
  });
});
