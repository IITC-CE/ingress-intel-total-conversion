import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';

/* global IITC, L */
/* eslint-disable no-unused-expressions */
import('../core/code/search_query.js');

describe('IITC.search.Query', () => {
  let query;

  beforeEach(() => {
    query = new IITC.search.Query('test', true);
  });

  afterEach(() => {
    sinon.restore();
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

    const spy = sinon.spy(query, 'renderResults');

    query.addResult(mockResult);
    expect(spy.calledOnce).to.be.true;
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

    const spy = sinon.spy(window.map, 'addLayer');

    query.onResultHoverStart(mockResult);

    expect(spy.calledOnce).to.be.true;
  });

  it('should handle Space key press for selecting a result', () => {
    const mockEvent = { key: ' ', preventDefault: () => {} };
    const result = { title: 'Test Result' };

    const spy = sinon.spy(query, 'onResultSelected');

    query.handleKeyPress(mockEvent, result);
    expect(spy.calledOnce).to.be.true;
  });

  it('should remove hover interaction layer from map', () => {
    const mockResult = { layer: window.map };

    const spy = sinon.spy(window.map, 'removeLayer');

    query.hoverResult = mockResult;
    query.removeHoverResult();

    expect(spy.calledOnce).to.be.true;
  });

  // Test for selecting a result
  it('should select a result and adjust the map view', () => {
    const mockResult = {
      title: 'Selected Result',
      position: new L.LatLng(0, 0),
      onSelected: () => false,
    };

    const spy = sinon.spy(window.map, 'setView');

    query.onResultSelected(mockResult, { type: 'click' });

    expect(spy.calledOnce).to.be.true;
    expect(query.selectedResult).to.equal(mockResult);
  });

  it('should prevent map repositioning if onSelected returns true', () => {
    const mockResult = { title: 'Selected Result', onSelected: () => true };

    const spy = sinon.spy(window.map, 'setView');
    query.onResultSelected(mockResult, { type: 'click' });

    expect(spy.called).to.be.false;
  });
});
