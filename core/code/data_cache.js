// MAP DATA CACHE ///////////////////////////////////
// cache for map data tiles. 

window.DataCache = function() {
  this.REQUEST_CACHE_FRESH_AGE = 3*60;  // if younger than this, use data in the cache rather than fetching from the server

  this.REQUEST_CACHE_MAX_AGE = 5*60;  // maximum cache age. entries are deleted from the cache after this time

  //NOTE: characters are 16 bits (ECMAScript standard), so divide byte size by two for correct limit
  if (L.Browser.mobile) {
    // on mobile devices, smaller cache size
    this.REQUEST_CACHE_MAX_ITEMS = 300;  // if more than this many entries, expire early
    this.REQUEST_CACHE_MAX_CHARS = 5000000/2; // or more than this total size
  } else {
    // but on desktop, allow more
    this.REQUEST_CACHE_MAX_ITEMS = 1000;  // if more than this many entries, expire early
    this.REQUEST_CACHE_MAX_CHARS = 20000000/2; // or more than this total size
  }

  this._cache = {};
  this._cacheCharSize = 0;

  this._interval = undefined;

}

window.DataCache.prototype.store = function (qk, data) {
  this.remove(qk);

  var time = new Date().getTime();
  var expire = time + this.REQUEST_CACHE_FRESH_AGE * 1000;

  var dataStr = JSON.stringify(data);

  this._cacheCharSize += dataStr.length;
  this._cache[qk] = { time: time, expire: expire, dataStr: dataStr };
}

window.DataCache.prototype.remove = function(qk) {
  if (qk in this._cache) {
    this._cacheCharSize -= this._cache[qk].dataStr.length;
    delete this._cache[qk];
  }
}


window.DataCache.prototype.get = function(qk) {
  if (qk in this._cache) return JSON.parse(this._cache[qk].dataStr);
  else return undefined;
}

window.DataCache.prototype.getTime = function(qk) {
  if (qk in this._cache) return this._cache[qk].time;
  else return 0;
}

window.DataCache.prototype.isFresh = function(qk) {
  if (qk in this._cache) {
    var d = new Date();
    var t = d.getTime();
    if (this._cache[qk].expire >= t) return true;
    else return false;
  }

  return undefined;
}

window.DataCache.prototype.startExpireInterval = function(period) {
  if (this._interval === undefined) {
    var savedContext = this;
    this._interval = setInterval (function() { savedContext.runExpire(); }, period*1000);
  }
}

window.DataCache.prototype.stopExpireInterval = function() {
  if (this._interval !== undefined) {
    clearInterval(this._interval);
    this._interval = undefined;
  }
}



window.DataCache.prototype.runExpire = function() {
  var d = new Date();
  var t = d.getTime()-this.REQUEST_CACHE_MAX_AGE*1000;

  var cacheSize = Object.keys(this._cache).length;

  for (var qk in this._cache) {
    if (cacheSize > this.REQUEST_CACHE_MAX_ITEMS || this._cacheCharSize > this.REQUEST_CACHE_MAX_CHARS || this._cache[qk].time < t) {
      this._cacheCharSize -= this._cache[qk].dataStr.length;
      delete this._cache[qk];
      cacheSize--;
    }
  }
}
