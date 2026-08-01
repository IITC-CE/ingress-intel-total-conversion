import { describe, it, before, beforeEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

before(async () => {
  await import('../core/code/data_cache.js');
});

describe('IITC.map.Cache', () => {
  let cache;

  beforeEach(() => {
    cache = new IITC.map.Cache();
  });

  it('store/get round-trips a deep copy of the data', () => {
    cache.store('qk', { a: 1, nested: { b: 2 } });
    const got = cache.get('qk');
    expect(got).to.deep.equal({ a: 1, nested: { b: 2 } });
    // get returns a fresh parse, not the same reference
    expect(got).to.not.equal(cache.get('qk'));
  });

  it('get returns undefined for unknown keys', () => {
    expect(cache.get('missing')).to.be.undefined;
  });

  it('isFresh is undefined when absent, true when fresh, false when expired', () => {
    expect(cache.isFresh('qk')).to.be.undefined;

    cache.store('qk', { a: 1 });
    expect(cache.isFresh('qk')).to.be.true;

    // force the entry past its freshness window
    cache._cache['qk'].expire = Date.now() - 1000;
    expect(cache.isFresh('qk')).to.be.false;
  });

  it('getTime returns the stored timestamp, 0 when missing', () => {
    expect(cache.getTime('qk')).to.equal(0);
    cache.store('qk', { a: 1 });
    expect(cache.getTime('qk')).to.be.a('number').that.is.greaterThan(0);
  });

  it('remove deletes an entry', () => {
    cache.store('qk', { a: 1 });
    cache.remove('qk');
    expect(cache.get('qk')).to.be.undefined;
    expect(cache.isFresh('qk')).to.be.undefined;
  });

  it('runExpire drops entries older than the max age', () => {
    cache.store('old', { a: 1 });
    cache._cache['old'].time = Date.now() - (cache.REQUEST_CACHE_MAX_AGE * 1000 + 1000);
    cache.store('new', { b: 2 });

    cache.runExpire();

    expect(cache.get('old')).to.be.undefined;
    expect(cache.get('new')).to.deep.equal({ b: 2 });
  });

  it('startExpireInterval fires runExpire on the given period; stop halts it', () => {
    const clock = sinon.useFakeTimers();
    try {
      const c = new IITC.map.Cache();
      const spy = sinon.spy(c, 'runExpire');

      c.startExpireInterval(1); // seconds
      clock.tick(1000);
      expect(spy.calledOnce).to.be.true;

      c.startExpireInterval(1); // idempotent: does not add a second interval
      c.stopExpireInterval();
      clock.tick(5000);
      expect(spy.calledOnce).to.be.true;
    } finally {
      clock.restore();
    }
  });
});

describe('IITC.map.Cache legacy alias', () => {
  it('keeps window.DataCache pointing at the class', () => {
    expect(window.DataCache).to.equal(IITC.map.Cache);
  });
});
