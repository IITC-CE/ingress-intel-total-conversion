/* global L -- eslint */

/**
 * DataCache constructor.
 * Manages a cache for map data tiles. The cache has a maximum age and size limit,
 * and these limits can vary for mobile and desktop environments.
 * @class DataCache
 */
window.DataCache = function () {
  this.REQUEST_CACHE_FRESH_AGE = 3 * 60; // if younger than this, use data in the cache rather than fetching from the server

  this.REQUEST_CACHE_MAX_AGE = 5 * 60; // maximum cache age. entries are deleted from the cache after this time

  // NOTE: characters are 16 bits (ECMAScript standard), so divide byte size by two for correct limit
  if (L.Browser.mobile) {
    // on mobile devices, smaller cache size
    this.REQUEST_CACHE_MAX_ITEMS = 300; // if more than this many entries, expire early
    this.REQUEST_CACHE_MAX_CHARS = 5000000 / 2; // or more than this total size
  } else {
    // but on desktop, allow more
    this.REQUEST_CACHE_MAX_ITEMS = 1000; // if more than this many entries, expire early
    this.REQUEST_CACHE_MAX_CHARS = 20000000 / 2; // or more than this total size
  }

  this._cache = {};
  this._cacheCharSize = 0;

  this._interval = undefined;
};

/**
 * Stores data in the cache.
 * If an entry for the given key already exists, it's removed before the new data is stored.
 * The data is stored along with its timestamp and expiration time.
 *
 * @function
 * @memberof DataCache
 * @param {string} qk - The key under which to store the data.
 * @param {object} data - The data to be stored in the cache.
 */
window.DataCache.prototype.store = function (qk, data) {
  this.remove(qk);

  var time = new Date().getTime();
  var expire = time + this.REQUEST_CACHE_FRESH_AGE * 1000;

  var dataStr = JSON.stringify(data);

  this._cacheCharSize += dataStr.length;
  this._cache[qk] = { time: time, expire: expire, dataStr: dataStr };
};

/**
 * Removes a specific entry from the cache based on its key.
 *
 * @function
 * @memberof DataCache
 * @param {string} qk - The key of the data to remove from the cache.
 */
window.DataCache.prototype.remove = function (qk) {
  if (qk in this._cache) {
    this._cacheCharSize -= this._cache[qk].dataStr.length;
    delete this._cache[qk];
  }
};

/**
 * Retrieves the data for a given key from the cache.
 *
 * @function
 * @memberof DataCache
 * @param {string} qk - The key of the data to retrieve.
 * @returns {object|undefined} The cached data if it exists, otherwise undefined.
 */
window.DataCache.prototype.get = function (qk) {
  if (qk in this._cache) return JSON.parse(this._cache[qk].dataStr);
  else return undefined;
};

/**
 * Retrieves the timestamp for the given key from the cache.
 *
 * @function
 * @memberof DataCache
 * @param {string} qk - The key of the data to check.
 * @returns {number} The timestamp of the data if it exists, otherwise 0.
 */
window.DataCache.prototype.getTime = function (qk) {
  if (qk in this._cache) return this._cache[qk].time;
  else return 0;
};

/**
 * Checks if the data for the given key is fresh.
 *
 * @function
 * @memberof DataCache
 * @param {string} qk - The key of the data to check.
 * @returns {boolean|undefined} True if the data is fresh, false if it's stale, undefined if data doesn't exist.
 */
window.DataCache.prototype.isFresh = function (qk) {
  if (qk in this._cache) {
    var d = new Date();
    var t = d.getTime();
    if (this._cache[qk].expire >= t) return true;
    else return false;
  }

  return undefined;
};

/**
 * Starts the interval to periodically run the cache expiration.
 *
 * @function
 * @memberof DataCache
 * @param {number} period - The period in seconds between each expiration run.
 */
window.DataCache.prototype.startExpireInterval = function (period) {
  if (this._interval === undefined) {
    var savedContext = this;
    this._interval = setInterval(function () {
      savedContext.runExpire();
    }, period * 1000);
  }
};

/**
 * Stops the interval that checks for cache expiration.
 * This function clears the interval set for running the cache expiration check,
 * effectively stopping automatic cache cleanup.
 *
 * @function
 * @memberof DataCache.prototype
 */
window.DataCache.prototype.stopExpireInterval = function () {
  if (this._interval !== undefined) {
    clearInterval(this._interval);
    this._interval = undefined;
  }
};

/**
 * Runs the cache expiration process.
 * This function checks and removes expired cache entries based on the maximum age, item count,
 * and character size limits.
 *
 * @function
 * @memberof DataCache.prototype
 */
window.DataCache.prototype.runExpire = function () {
  var d = new Date();
  var t = d.getTime() - this.REQUEST_CACHE_MAX_AGE * 1000;

  var cacheSize = Object.keys(this._cache).length;

  for (var qk in this._cache) {
    if (cacheSize > this.REQUEST_CACHE_MAX_ITEMS || this._cacheCharSize > this.REQUEST_CACHE_MAX_CHARS || this._cache[qk].time < t) {
      this._cacheCharSize -= this._cache[qk].dataStr.length;
      delete this._cache[qk];
      cacheSize--;
    }
  }
};
