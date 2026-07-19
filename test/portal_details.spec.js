import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

// Records the most recently constructed cache so tests can inspect it
let lastCache;

class MockDataCache {
  constructor() {
    lastCache = this;
    this.data = {};
    this.expireInterval = null;
  }
  startExpireInterval(seconds) {
    this.expireInterval = seconds;
  }
  get(guid) {
    return this.data[guid];
  }
  store(guid, dict) {
    this.data[guid] = dict;
    return true;
  }
  isFresh(guid) {
    return Object.hasOwn(this.data, guid);
  }
  remove(guid) {
    delete this.data[guid];
    return true;
  }
}

before(async () => {
  // IITC.portal must exist for the module to attach .details and register aliases
  await import('../core/code/portal.js');

  Object.assign(globalThis.window, {
    DataCache: MockDataCache,
    decodeArray: { portal: () => ({ mods: [1] }) },
    mapDataRequest: { render: { createPortalEntity: () => ({ options: { data: { guid: 'OK', image: null } } }) } },
  });
  globalThis.Image = class {};

  await import('../core/code/portal_details.js');

  IITC.portal.details.setup();
});

describe('IITC.portal.details namespace', () => {
  it('keeps the legacy window.portalDetail namespace as an alias', () => {
    expect(window.portalDetail).to.equal(IITC.portal.details);
    expect(window.portalDetail.request).to.equal(IITC.portal.details.request);
  });
});

describe('IITC.portal.details cache', () => {
  it('setup initializes an expiring cache', () => {
    IITC.portal.details.setup();
    expect(lastCache).to.be.instanceOf(MockDataCache);
    expect(lastCache.expireInterval).to.equal(20);
  });

  it('store/get/isFresh/remove delegate to the cache', () => {
    IITC.portal.details.setup();
    expect(IITC.portal.details.isFresh('g')).to.be.false;

    IITC.portal.details.store('g', { value: 1 });
    expect(IITC.portal.details.get('g')).to.deep.equal({ value: 1 });
    expect(IITC.portal.details.isFresh('g')).to.be.true;

    IITC.portal.details.remove('g');
    expect(IITC.portal.details.isFresh('g')).to.be.false;
  });
});

describe('IITC.portal.details.request', () => {
  it('de-duplicates concurrent requests for the same portal', () => {
    window.postAjax = sinon.stub(); // never invokes callbacks -> request stays pending

    const first = IITC.portal.details.request('DUP');
    const second = IITC.portal.details.request('DUP');

    expect(window.postAjax.calledOnce).to.be.true;
    expect(first).to.equal(second);
  });

  it('stores details and fires portalDetailLoaded on success', () => {
    IITC.portal.details.setup();
    window.runHooks = sinon.spy();
    window.postAjax = (action, params, success) => success({ result: new Array(14).fill(0) });

    IITC.portal.details.request('OK');

    expect(IITC.portal.details.get('OK')).to.deep.equal({ mods: [1] });
    expect(window.runHooks.calledWith('portalDetailLoaded', sinon.match({ success: true }))).to.be.true;
  });

  it('fires portalDetailLoaded with success=false on failure', () => {
    window.runHooks = sinon.spy();
    window.postAjax = (action, params, success, error) => error();

    IITC.portal.details.request('FAIL');

    expect(window.runHooks.calledWith('portalDetailLoaded', sinon.match({ success: false }))).to.be.true;
  });

  it('resolves a native promise and keeps jQuery-style .done() for compatibility', async () => {
    IITC.portal.details.setup();
    window.runHooks = sinon.spy();
    window.postAjax = (action, params, success) => success({ result: new Array(14).fill(0) });

    const promise = IITC.portal.details.request('DONE');

    const doneData = await new Promise((resolve) => {
      const returned = promise.done((data) => resolve(data));
      expect(returned).to.equal(promise); // .done returns the same promise for chaining
    });
    expect(doneData).to.deep.equal({ guid: 'OK', image: null });

    // the same value is available via a native await
    expect(await promise).to.deep.equal({ guid: 'OK', image: null });
  });

  it('rejects and keeps jQuery-style .fail() for compatibility', async () => {
    IITC.portal.details.setup();
    window.runHooks = sinon.spy();
    window.postAjax = (action, params, success, error) => error();

    const promise = IITC.portal.details.request('FAILP');

    const failed = await new Promise((resolve) => {
      promise.fail(() => resolve(true));
    });
    expect(failed).to.be.true;
  });

  it('clears the queue after settling so a later call re-fetches', async () => {
    IITC.portal.details.setup();
    window.runHooks = sinon.spy();
    const postAjax = sinon.stub().callsFake((action, params, success) => success({ result: new Array(14).fill(0) }));
    window.postAjax = postAjax;

    await IITC.portal.details.request('REFETCH');
    await IITC.portal.details.request('REFETCH');

    expect(postAjax.calledTwice).to.be.true;
  });
});
