import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';

/* global IITC, L */
/* eslint-disable no-unused-expressions */

if (!globalThis.window) globalThis.window = {};
if (!globalThis.L) globalThis.L = {};
if (!globalThis.IITC) globalThis.IITC = {};
if (!globalThis.IITC.search) globalThis.IITC.search = {};
globalThis.IITC.search.Query = {};
import('../core/code/search_query.js');

describe('IITC.search.Query', () => {
  let query;
  let fakeMap;

  beforeEach(() => {
    // Mock objects and methods
    fakeMap = {
      addTo: () => {},
      addLayer: () => {},
    };

    globalThis.window = {
      ...globalThis.window,
      ...{
        map: fakeMap,
        runHooks: () => {},
        isSmartphone: () => false,
        TEAM_SHORTNAMES: { NEUTRAL: 'NEU', ENLIGHTENED: 'ENL' },
        COLORS: { NEUTRAL: '#CCC', ENLIGHTENED: '#008000' },
        teamStringToId: (team) => (team === 'ENLIGHTENED' ? 'ENLIGHTENED' : 'NEUTRAL'),
      },
    };

    globalThis.L = {
      ...globalThis.L,
      ...{
        LatLng: class {},
        latLng: (lat, lng) => new L.LatLng(lat, lng),
        layerGroup: () => fakeMap,
        marker: () => fakeMap,
        divIcon: {
          coloredSvg: () => {},
        },
      },
    };

    globalThis.IITC.search.QueryResultsView = class {
      constructor(term, confirmed) {
        this.term = term;
        this.confirmed = confirmed;
      }
      renderResults() {}
    };

    query = new IITC.search.Query('test', true);
  });

  // Test for initialization
  it('should initialize with an empty results array', () => {
    expect(query.results).to.be.an('array').that.is.empty;
  });

  // Test for the addResult method
  it('should add a result to the results array with addResult', () => {
    const mockResult = { title: 'Test Result', position: new L.LatLng(0, 0) };

    query.addResult(mockResult);

    expect(query.results).to.have.lengthOf(1);
    expect(query.results[0]).to.deep.equal(mockResult);

    let renderCalled = false;
    query.renderResults = () => {
      renderCalled = true;
    };
    query.addResult(mockResult);
    expect(renderCalled).to.be.true;
  });

  // Test for the addPortalResult method
  it('should add a portal result to the results array with addPortalResult', () => {
    const portalData = {
      title: 'Test Portal',
      team: 'ENLIGHTENED',
      level: 8,
      health: 100,
      resCount: 8,
      latE6: 50000000,
      lngE6: 100000000,
    };

    query.addPortalResult(portalData, 'abc123');

    expect(query.results).to.have.lengthOf(1);
    const addedResult = query.results[0];

    expect(addedResult.title).to.equal('Test Portal');
    expect(addedResult.description).to.contain('ENL');
    expect(addedResult.description).to.contain('L8');
    expect(addedResult.description).to.contain('100%');
    expect(addedResult.description).to.contain('8 Resonators');
    expect(addedResult.icon).to.be.a('string').that.contains('data:image/svg+xml;base64');
  });

  // Test for hover interaction handling
  it('should start hover interaction and add layer to map', () => {
    const mockResult = { title: 'Hover Result', layer: null, position: new L.LatLng(0, 0) };
    let layerAdded = false;

    fakeMap.addLayer = () => {
      layerAdded = true;
    };
    query.onResultHoverStart(mockResult);

    expect(layerAdded).to.be.true;
  });

  it('should handle Space key press for selecting a result', () => {
    let eventHandled = false;
    const mockEvent = { key: ' ', preventDefault: () => {} };
    const result = { title: 'Test Result' };

    query.onResultSelected = () => {
      eventHandled = true;
    };

    query.handleKeyPress(mockEvent, result);
    expect(eventHandled).to.be.true;
  });

  it('should remove hover interaction layer from map', () => {
    const mockResult = { layer: fakeMap };
    let layerRemoved = false;

    query.hoverResult = mockResult;
    fakeMap.removeLayer = () => {
      layerRemoved = true;
    };

    query.removeHoverResult();
    expect(layerRemoved).to.be.true;
  });

  // Test for selecting a result
  it('should select a result and adjust the map view', () => {
    const mockResult = {
      title: 'Selected Result',
      position: new L.LatLng(0, 0),
      onSelected: () => false,
    };
    let viewSet = false;

    fakeMap.setView = () => {
      viewSet = true;
    };
    query.onResultSelected(mockResult, { type: 'click' });

    expect(viewSet).to.be.true;
    expect(query.selectedResult).to.equal(mockResult);
  });

  it('should prevent map repositioning if onSelected returns true', () => {
    const mockResult = { title: 'Selected Result', onSelected: () => true };
    let viewSet = false;

    fakeMap.setView = () => {
      viewSet = true;
    };
    query.onResultSelected(mockResult, { type: 'click' });

    expect(viewSet).to.be.false;
  });
});
