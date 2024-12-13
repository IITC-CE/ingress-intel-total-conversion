/* global L, log -- eslint */

/**
 * Class for managing map data requests from the Ingress servers, caching the data, and passing it to the renderer.
 * @class MapDataRequest
 */
window.MapDataRequest = function () {
  this.cache = new window.DataCache();
  this.render = new window.Render();
  this.debugTiles = new window.RenderDebugTiles();

  this.activeRequestCount = 0;
  this.requestedTiles = {};

  this.renderQueue = [];
  this.renderQueueTimer = undefined;
  this.renderQueuePaused = false;

  this.idle = false;

  // no more than this many requests in parallel. stock site seems to rely on browser limits (6, usually), sending
  // many requests at once.
  // using our own queue limit ensures that other requests (e.g. chat, portal details) don't get delayed
  this.MAX_REQUESTS = 5;

  // this many tiles in one request
  this.NUM_TILES_PER_REQUEST = 25;

  // number of times to retry a tile after an error (including "error: TIMEOUT" now - as stock intel does)
  // TODO? different retry counters for TIMEOUT vs other errors..?
  this.MAX_TILE_RETRIES = 5;

  // refresh timers
  this.MOVE_REFRESH = 3; // time, after a map move (pan/zoom) before starting the refresh processing
  this.STARTUP_REFRESH = 3; // refresh time used on first load of IITC
  this.IDLE_RESUME_REFRESH = 5; // refresh time used after resuming from idle

  // after one of the above, there's an additional delay between preparing the refresh (clearing out of bounds,
  // processing cache, etc) and actually sending the first network requests
  this.DOWNLOAD_DELAY = 1; // delay after preparing the data download before tile requests are sent

  // a short delay between one request finishing and the queue being run for the next request.
  this.RUN_QUEUE_DELAY = 0;

  // delay before processing the queue after failed requests
  this.BAD_REQUEST_RUN_QUEUE_DELAY = 5; // longer delay before doing anything after errors (other than TIMEOUT)

  // delay before processing the queue after empty responses
  this.EMPTY_RESPONSE_RUN_QUEUE_DELAY = 5; // also long delay - empty responses are likely due to some server issues

  // delay before processing the queue after error==TIMEOUT requests. this is 'expected', so minimal extra delay over the regular RUN_QUEUE_DELAY
  this.TIMEOUT_REQUEST_RUN_QUEUE_DELAY = 0;

  // render queue
  // number of items to process in each render pass. there are pros and cons to smaller and larger values
  // (however, if using leaflet canvas rendering, it makes sense to push as much as possible through every time)
  this.RENDER_BATCH_SIZE = window.map.options.preferCanvas ? 1e9 : 1500;

  // delay before repeating the render loop. this gives a better chance for user interaction
  this.RENDER_PAUSE = window.isApp ? 0.2 : 0.1; // 200ms mobile, 100ms desktop

  this.REFRESH_CLOSE = 300; // refresh time to use for close views z>12 when not idle and not moving
  this.REFRESH_FAR = 900; // refresh time for far views z <= 12
  this.FETCH_TO_REFRESH_FACTOR = 2; // minimum refresh time is based on the time to complete a data fetch, times this value

  // ensure we have some initial map status
  this.setStatus('startup', undefined, -1);
};

/**
 * Starts the data request process, setting up hooks and callbacks.
 *
 * @function
 * @memberof MapDataRequest
 */
window.MapDataRequest.prototype.start = function () {
  var savedContext = this;

  // setup idle resume function
  window.addResumeFunction(function () {
    savedContext.idleResume();
  });

  // and map move start/end callbacks
  window.map.on('movestart', this.mapMoveStart, this);
  window.map.on('moveend', this.mapMoveEnd, this);

  // then set a timeout to start the first refresh
  this.refreshOnTimeout(this.STARTUP_REFRESH);
  this.setStatus('refreshing', undefined, -1);

  this.cache?.startExpireInterval(15);
};

/**
 * Callback for map movement start. Pauses the rendering and data requests.
 *
 * @function
 * @memberof MapDataRequest
 */
window.MapDataRequest.prototype.mapMoveStart = function () {
  log.log('refresh map movestart');

  this.setStatus('paused');
  this.clearTimeout();
  this.pauseRenderQueue(true);
};

/**
 * Handles map movement end. Determines whether new data needs to be fetched based on map bounds and zoom level.
 *
 * @function
 * @memberof MapDataRequest
 */
window.MapDataRequest.prototype.mapMoveEnd = function () {
  var bounds = window.clampLatLngBounds(window.map.getBounds());

  if (this.fetchedDataParams) {
    // we have fetched (or are fetching) data...
    if (this.fetchedDataParams.mapZoom === window.map.getZoom() && this.fetchedDataParams.bounds.contains(bounds)) {
      // ... and the zoom level is the same and the current bounds is inside the fetched bounds
      // so, no need to fetch data. if there's time left, restore the original timeout

      var remainingTime = (this.timerExpectedTimeoutTime - new Date().getTime()) / 1000;

      if (remainingTime > this.MOVE_REFRESH) {
        this.setStatus('done', 'Map moved, but no data updates needed');
        this.refreshOnTimeout(remainingTime);
        this.pauseRenderQueue(false);
        return;
      }
    }
  }

  this.setStatus('refreshing', undefined, -1);
  this.refreshOnTimeout(this.MOVE_REFRESH);
};

/**
 * Resumes data fetching and rendering after being idle.
 *
 * @function
 * @memberof MapDataRequest
 */
window.MapDataRequest.prototype.idleResume = function () {
  // if we have no timer set and there are no active requests, refresh has gone idle and the timer needs restarting

  if (this.idle) {
    log.log('refresh map idle resume');
    this.idle = false;
    this.setStatus('idle restart', undefined, -1);
    this.refreshOnTimeout(this.IDLE_RESUME_REFRESH);
  }
};

/**
 * Clears the current data refresh timeout.
 *
 * @function
 * @memberof MapDataRequest
 */
window.MapDataRequest.prototype.clearTimeout = function () {
  if (this.timer) {
    log.log('cancelling existing map refresh timer');
    clearTimeout(this.timer);
    this.timer = undefined;
  }
};

/**
 * Sets a timeout to refresh the map data.
 *
 * @function
 * @memberof MapDataRequest
 * @param {number} seconds - Time in seconds to wait before refreshing the map data.
 */
window.MapDataRequest.prototype.refreshOnTimeout = function (seconds) {
  this.clearTimeout();

  log.log('starting map refresh in ' + seconds + ' seconds');

  // 'this' won't be right inside the callback, so save it
  // also, double setTimeout used to ensure the delay occurs after any browser-related rendering/updating/etc
  var _this = this;
  this.timer = setTimeout(function () {
    _this.timer = setTimeout(function () {
      _this.timer = undefined;
      _this.refresh();
    }, seconds * 1000);
  }, 0);
  this.timerExpectedTimeoutTime = new Date().getTime() + seconds * 1000;
};

/**
 * Sets the current status of the map data request, including a short description, long description, and progress.
 *
 * @function
 * @memberof MapDataRequest
 * @param {string} short - Short description of the current status.
 * @param {string} [long] - Long description of the current status.
 * @param {number} [progress] - Progress indicator, typically represented as a percentage.
 */
window.MapDataRequest.prototype.setStatus = function (short, long, progress) {
  this.status = { short: short, long: long, progress: progress };
  window.renderUpdateStatus();
};

/**
 * Gets the current status of the map data request, including short description, long description, and progress.
 *
 * @function
 * @memberof MapDataRequest
 * @returns {Object} An object containing the current status of the map data request.
 */
window.MapDataRequest.prototype.getStatus = function () {
  return this.status;
};

/**
 * Initiates the map data refresh process. This includes resetting necessary properties,
 * preparing requests for map data, and handling cached data.
 *
 * @function
 * @memberof MapDataRequest
 */
window.MapDataRequest.prototype.refresh = function () {
  // if we're idle, don't refresh
  if (window.isIdle()) {
    log.log('suspending map refresh - is idle');
    this.setStatus('idle');
    this.idle = true;
    return;
  }

  // time the refresh cycle
  this.refreshStartTime = new Date().getTime();

  this.debugTiles.reset();
  this.resetRenderQueue();

  // a 'set' to keep track of hard failures for tiles
  this.tileErrorCount = {};

  // the 'set' of requested tile QKs
  // NOTE: javascript does not guarantee any order to properties of an object. however, in all major implementations
  // properties retain the order they are added in. IITC uses this to control the tile fetch order. if browsers change
  // then fetch order isn't optimal, but it won't break things.
  this.queuedTiles = {};

  var bounds = window.clampLatLngBounds(window.map.getBounds());
  var mapZoom = window.map.getZoom();

  var dataZoom = window.getDataZoomForMapZoom(mapZoom);

  var tileParams = window.getMapZoomTileParameters(dataZoom);

  // DEBUG: resize the bounds so we only retrieve some data
  // bounds = bounds.pad(-0.4);

  // var debugrect = L.rectangle(bounds,{color: 'red', fill: false, weight: 4, opacity: 0.8}).addTo(map);
  // setTimeout (function(){ map.removeLayer(debugrect); }, 10*1000);

  var x1 = window.lngToTile(bounds.getWest(), tileParams);
  var x2 = window.lngToTile(bounds.getEast(), tileParams);
  var y1 = window.latToTile(bounds.getNorth(), tileParams);
  var y2 = window.latToTile(bounds.getSouth(), tileParams);

  // calculate the full bounds for the data - including the part of the tiles off the screen edge
  var dataBounds = L.latLngBounds([
    [window.tileToLat(y2 + 1, tileParams), window.tileToLng(x1, tileParams)],
    [window.tileToLat(y1, tileParams), window.tileToLng(x2 + 1, tileParams)],
  ]);
  // var debugrect2 = L.rectangle(dataBounds,{color: 'magenta', fill: false, weight: 4, opacity: 0.8}).addTo(map);
  // setTimeout (function(){ map.removeLayer(debugrect2); }, 10*1000);

  // store the parameters used for fetching the data. used to prevent unneeded refreshes after move/zoom
  this.fetchedDataParams = { bounds: dataBounds, mapZoom: mapZoom, dataZoom: dataZoom };

  window.runHooks('mapDataRefreshStart', { bounds: bounds, mapZoom: mapZoom, dataZoom: dataZoom, minPortalLevel: tileParams.level, tileBounds: dataBounds });

  this.render.startRenderPass(dataBounds);

  window.runHooks('mapDataEntityInject', { callback: this.render.processGameEntities.bind(this.render) });

  var logMessage = 'requesting data tiles at zoom ' + dataZoom;
  logMessage += ' (L' + tileParams.level + '+ portals';
  logMessage += ', ' + tileParams.tilesPerEdge + ' tiles per global edge), map zoom is ' + mapZoom;

  log.log(logMessage);

  this.cachedTileCount = 0;
  this.requestedTileCount = 0;
  this.successTileCount = 0;
  this.failedTileCount = 0;
  this.staleTileCount = 0;

  var tilesToFetchDistance = {};

  // map center point - for fetching center tiles first
  var mapCenterPoint = window.map.project(window.map.getCenter(), mapZoom);

  // y goes from left to right
  for (var y = y1; y <= y2; y++) {
    // x goes from bottom to top(?)
    for (var x = x1; x <= x2; x++) {
      var tile_id = window.pointToTileId(tileParams, x, y);
      var latNorth = window.tileToLat(y, tileParams);
      var latSouth = window.tileToLat(y + 1, tileParams);
      var lngWest = window.tileToLng(x, tileParams);
      var lngEast = window.tileToLng(x + 1, tileParams);

      this.debugTiles.create(tile_id, [
        [latSouth, lngWest],
        [latNorth, lngEast],
      ]);

      if (this.cache && this.cache.isFresh(tile_id)) {
        // data is fresh in the cache - just render it
        this.pushRenderQueue(tile_id, this.cache.get(tile_id), 'cache-fresh');
        this.cachedTileCount += 1;
      } else {
        // no fresh data

        // tile needed. calculate the distance from the centre of the screen, to optimise the load order

        var latCenter = (latNorth + latSouth) / 2;
        var lngCenter = (lngEast + lngWest) / 2;
        var tileLatLng = L.latLng(latCenter, lngCenter);

        var tilePoint = window.map.project(tileLatLng, mapZoom);

        var delta = mapCenterPoint.subtract(tilePoint);
        var distanceSquared = delta.x * delta.x + delta.y * delta.y;

        tilesToFetchDistance[tile_id] = distanceSquared;
        this.requestedTileCount += 1;
      }
    }
  }

  // re-order the tile list by distance from the centre of the screen. this should load more relevant data first
  var tilesToFetch = Object.keys(tilesToFetchDistance);
  tilesToFetch.sort(function (a, b) {
    return tilesToFetchDistance[a] - tilesToFetchDistance[b];
  });

  for (var i in tilesToFetch) {
    var qk = tilesToFetch[i];

    this.queuedTiles[qk] = qk;
  }

  this.setStatus('loading', undefined, -1);

  // technically a request hasn't actually finished - however, displayed portal data has been refreshed
  // so as far as plugins are concerned, it should be treated as a finished request
  window.runHooks('requestFinished', { success: true });

  log.log('done request preparation (cleared out-of-bounds and invalid for zoom, and rendered cached data)');

  if (Object.keys(this.queuedTiles).length > 0) {
    // queued requests - don't start processing the download queue immediately - start it after a short delay
    this.delayProcessRequestQueue(this.DOWNLOAD_DELAY);
  } else {
    // all data was from the cache, nothing queued - run the queue 'immediately' so it handles the end request processing
    this.delayProcessRequestQueue(0);
  }
};

/**
 * Delays the processing of the request queue for fetching map data tiles. The delay is specified in seconds.
 *
 * @function
 * @memberof MapDataRequest
 * @param {number} seconds - The delay in seconds before starting to process the request queue.
 */
window.MapDataRequest.prototype.delayProcessRequestQueue = function (seconds) {
  if (this.timer === undefined) {
    var _this = this;
    this.timer = setTimeout(function () {
      _this.timer = setTimeout(function () {
        _this.timer = undefined;
        _this.processRequestQueue();
      }, seconds * 1000);
    }, 0);
  }
};

/**
 * Processes the request queue for fetching map data tiles. Manages the number of simultaneous tile requests,
 * tile error handling, and updates the request status.
 *
 * @function
 * @memberof MapDataRequest
 */
window.MapDataRequest.prototype.processRequestQueue = function () {
  // if nothing left in the queue, finish
  if (Object.keys(this.queuedTiles).length === 0) {
    // we leave the renderQueue code to handle ending the render pass now
    // (but we need to make sure it's not left without it's timer running!)
    if (!this.renderQueuePaused) {
      this.startQueueTimer(this.RENDER_PAUSE);
    }

    return;
  }

  // create a list of tiles that aren't requested over the network
  var pendingTiles = [];
  for (const id in this.queuedTiles) {
    if (!(id in this.requestedTiles)) {
      pendingTiles.push(id);
    }
  }

  // log.log('- request state: '+Object.keys(this.requestedTiles).length+' tiles in '+this.activeRequestCount+' active requests, '+pendingTiles.length+' tiles queued');

  var requestBuckets = this.MAX_REQUESTS - this.activeRequestCount;
  if (pendingTiles.length > 0 && requestBuckets > 0) {
    var requestBucketSize = Math.min(this.NUM_TILES_PER_REQUEST, Math.max(5, Math.ceil(pendingTiles.length / requestBuckets)));
    for (var bucket = 0; bucket < requestBuckets; bucket++) {
      // if the tiles for this request have had several retries, use smaller requests
      // maybe some of the tiles caused all the others to error? no harm anyway, and it may help...
      var numTilesThisRequest = Math.min(requestBucketSize, pendingTiles.length);

      let id = pendingTiles[0];
      var retryTotal = this.tileErrorCount[id] || 0;
      for (var i = 1; i < numTilesThisRequest; i++) {
        id = pendingTiles[i];
        retryTotal += this.tileErrorCount[id] || 0;
        if (retryTotal > this.MAX_TILE_RETRIES) {
          numTilesThisRequest = i;
          break;
        }
      }

      var tiles = pendingTiles.splice(0, numTilesThisRequest);
      if (tiles.length > 0) {
        this.sendTileRequest(tiles);
      }
    }
  }

  // update status
  var pendingTileCount = this.requestedTileCount - (this.successTileCount + this.failedTileCount + this.staleTileCount);
  var longText =
    `Tiles: ${this.cachedTileCount} cached, ` +
    `${this.successTileCount} loaded, ` +
    (this.staleTileCount ? this.staleTileCount + ' stale, ' : '') +
    (this.failedTileCount ? this.failedTileCount + ' failed, ' : '') +
    `${pendingTileCount} remaining`;

  const progress = this.requestedTileCount > 0 ? (this.requestedTileCount - pendingTileCount) / this.requestedTileCount : undefined;
  this.setStatus('loading', longText, progress);
};

/**
 * Sends requests for a group of tiles to the server.
 * Updates the debugTiles state and manages the count of active requests.
 *
 * @function
 * @memberof MapDataRequest
 * @param {Array} tiles - An array of tile identifiers to request.
 */
window.MapDataRequest.prototype.sendTileRequest = function (tiles) {
  var tilesList = [];

  for (var i in tiles) {
    var id = tiles[i];

    this.debugTiles.setState(id, 'requested');

    this.requestedTiles[id] = true;

    if (id in this.queuedTiles) {
      tilesList.push(id);
    } else {
      log.warn('no queue entry for tile id ' + id);
    }
  }

  var data = { tileKeys: tilesList };

  this.activeRequestCount += 1;

  var savedThis = this;

  // NOTE: don't add the request with window.request.add, as we don't want the abort handling to apply to map data any more
  window.postAjax(
    'getEntities',
    data,
    function (data) {
      savedThis.handleResponse(data, tiles, true);
    }, // request successful callback
    function () {
      savedThis.handleResponse(undefined, tiles, false);
    } // request failed callback
  );
};

/**
 * Re-queues a tile for data fetching in case of an error or timeouts.
 * Handles retry limits and uses stale data if available.
 *
 * @function
 * @memberof MapDataRequest
 * @param {string} id - The tile identifier.
 * @param {boolean} error - Flag indicating whether the tile fetch encountered an error.
 */
window.MapDataRequest.prototype.requeueTile = function (id, error) {
  if (id in this.queuedTiles) {
    // tile is currently wanted...

    // first, see if the error can be ignored due to retry counts
    if (error) {
      this.tileErrorCount[id] = (this.tileErrorCount[id] || 0) + 1;
      if (this.tileErrorCount[id] <= this.MAX_TILE_RETRIES) {
        // retry limit low enough - clear the error flag
        error = false;
      }
    }

    if (error) {
      // if error is still true, retry limit hit. use stale data from cache if available
      var data = this.cache ? this.cache.get(id) : undefined;
      if (data) {
        // we have cached data - use it, even though it's stale
        this.pushRenderQueue(id, data, 'cache-stale');
        this.staleTileCount += 1;
      } else {
        // no cached data
        this.debugTiles.setState(id, 'error');
        this.failedTileCount += 1;
      }
      // and delete from the pending requests...
      delete this.queuedTiles[id];
    } else {
      // if false, was a 'timeout' or we're retrying, so unlimited retries (as the stock site does)
      this.debugTiles.setState(id, 'retrying');

      // FIXME? it's nice to move retried tiles to the end of the request queue. however, we don't actually have a
      // proper queue, just an object with guid as properties. Javascript standards don't guarantee the order of properties
      // within an object. however, all current browsers do keep property order, and new properties are added at the end.
      // therefore, delete and re-add the requeued tile and it will be added to the end of the queue
      delete this.queuedTiles[id];
      this.queuedTiles[id] = id;
    }
  } // else the tile wasn't currently wanted (an old non-cancelled request) - ignore
};

/**
 * Handles the response from the server for tile data requests.
 * Processes success and error cases, manages retries for failed tiles, and updates the render queue with new data.
 *
 * @function
 * @memberof MapDataRequest
 * @param {Object} data - The response data from the server.
 * @param {Array} tiles - The array of requested tile identifiers.
 * @param {boolean} success - Flag indicating if the request was successful.
 */
window.MapDataRequest.prototype.handleResponse = function (data, tiles, success) {
  this.activeRequestCount -= 1;

  var successTiles = [];
  var errorTiles = [];
  var retryTiles = [];
  var timeoutTiles = [];
  var unaccountedTiles = tiles.slice(0); // Clone

  if (!success || !data || !data.result) {
    log.warn('Request.handleResponse: request failed - requeuing...' + (data && data.error ? ' error: ' + data.error : ''));

    // request failed - requeue all the tiles(?)

    if (data && data.error && data.error === 'RETRY') {
      // the server can sometimes ask us to retry a request. this is botguard related, I believe

      for (const i in tiles) {
        const id = tiles[i];
        retryTiles.push(id);
        this.debugTiles.setState(id, 'retrying');
      }

      window.runHooks('requestFinished', { success: false });
    } else {
      for (const i in tiles) {
        const id = tiles[i];
        errorTiles.push(id);
        this.debugTiles.setState(id, 'request-fail');
      }

      window.runHooks('requestFinished', { success: false });
    }
    unaccountedTiles = [];
  } else {
    // TODO: use result.minLevelOfDetail ??? stock site doesn't use it yet...

    var m = data.result.map;

    for (var id in m) {
      var val = m[id];
      unaccountedTiles.splice(unaccountedTiles.indexOf(id), 1);
      if ('error' in val) {
        // server returned an error for this individual data tile

        if (val.error === 'TIMEOUT') {
          // TIMEOUT errors for individual tiles are quite common. used to be unlimited retries, but not any more
          timeoutTiles.push(id);
        } else {
          log.warn('map data tile ' + id + ' failed: error==' + val.error);
          errorTiles.push(id);
          this.debugTiles.setState(id, 'tile-fail');
        }
      } else {
        // no error for this data tile - process it
        successTiles.push(id);

        // store the result in the cache
        this.cache?.store(id, val);

        // if this tile was in the render list, render it
        // (requests aren't aborted when new requests are started, so it's entirely possible we don't want to render it!)
        if (id in this.queuedTiles) {
          this.pushRenderQueue(id, val, 'ok');

          delete this.queuedTiles[id];
          this.successTileCount += 1;
        } // else we don't want this tile (from an old non-cancelled request) - ignore
      }
    }

    window.runHooks('requestFinished', { success: true });
  }

  // set the queue delay based on any errors or timeouts
  // NOTE: retryTimes are retried at the regular delay - no longer wait as for error/timeout cases
  let nextQueueDelay;
  if (errorTiles.length > 0) {
    nextQueueDelay = this.BAD_REQUEST_RUN_QUEUE_DELAY;
  } else if (unaccountedTiles.length > 0) {
    nextQueueDelay = this.EMPTY_RESPONSE_RUN_QUEUE_DELAY;
  } else if (timeoutTiles.length > 0) {
    nextQueueDelay = this.TIMEOUT_REQUEST_RUN_QUEUE_DELAY;
  } else {
    nextQueueDelay = this.RUN_QUEUE_DELAY;
  }
  var statusMsg = 'getEntities status: ' + tiles.length + ' tiles: ';
  statusMsg += successTiles.length + ' successful';
  if (retryTiles.length) statusMsg += ', ' + retryTiles.length + ' retried';
  if (timeoutTiles.length) statusMsg += ', ' + timeoutTiles.length + ' timed out';
  if (errorTiles.length) statusMsg += ', ' + errorTiles.length + ' failed';
  if (unaccountedTiles.length) statusMsg += ', ' + unaccountedTiles.length + ' unaccounted';
  statusMsg += '. delay ' + nextQueueDelay + ' seconds';
  log.log(statusMsg);

  // requeue any 'timeout' tiles immediately
  if (timeoutTiles.length > 0) {
    for (const i in timeoutTiles) {
      const id = timeoutTiles[i];
      delete this.requestedTiles[id];

      this.requeueTile(id, true);
    }
  }

  if (retryTiles.length > 0) {
    for (const i in retryTiles) {
      const id = retryTiles[i];
      delete this.requestedTiles[id];

      this.requeueTile(id, false); // tiles from a error==RETRY request are requeued without counting it as an error
    }
  }

  if (errorTiles.length > 0) {
    for (const i in errorTiles) {
      const id = errorTiles[i];
      delete this.requestedTiles[id];
      this.requeueTile(id, true);
    }
  }

  if (unaccountedTiles.length > 0) {
    for (const i in unaccountedTiles) {
      const id = unaccountedTiles[i];
      delete this.requestedTiles[id];
      this.requeueTile(id, true);
    }
  }

  for (const i in successTiles) {
    const id = successTiles[i];
    delete this.requestedTiles[id];
  }

  this.delayProcessRequestQueue(nextQueueDelay);
};

/**
 * Resets the render queue, clearing existing queued render tasks and stopping any active timer.
 *
 * @function
 * @memberof MapDataRequest
 */
window.MapDataRequest.prototype.resetRenderQueue = function () {
  this.renderQueue = [];

  if (this.renderQueueTimer) {
    clearTimeout(this.renderQueueTimer);
    this.renderQueueTimer = undefined;
  }
  this.renderQueuePaused = false;
};

/**
 * Pushes a tile to the render queue for processing. The queue is processed to render entities on the map.
 *
 * @function
 * @memberof MapDataRequest
 * @param {string} id - The identifier of the tile.
 * @param {Object} data - Data associated with the tile, including game entity GUIDs and entities.
 * @param {string} status - The status of the tile, such as 'render-queue'.
 */
window.MapDataRequest.prototype.pushRenderQueue = function (id, data, status) {
  this.debugTiles.setState(id, 'render-queue');
  this.renderQueue.push({
    id: id,
    // the data in the render queue is modified as we go, so we need to copy the values of the arrays. just storing the reference would modify the data in the cache!
    deleted: (data.deletedGameEntityGuids || []).slice(0),
    entities: (data.gameEntities || []).slice(0),
    status: status,
  });

  if (!this.renderQueuePaused) {
    this.startQueueTimer(this.RENDER_PAUSE);
  }
};

/**
 * Starts a timer to process the render queue after a specified delay.
 *
 * @function
 * @memberof MapDataRequest
 * @param {number} delay - The delay in seconds before processing the render queue.
 */
window.MapDataRequest.prototype.startQueueTimer = function (delay) {
  if (this.renderQueueTimer === undefined) {
    var _this = this;
    this.renderQueueTimer = setTimeout(function () {
      _this.renderQueueTimer = setTimeout(
        function () {
          _this.renderQueueTimer = undefined;
          _this.processRenderQueue();
        },
        (delay || 0) * 1000
      );
    }, 0);
  }
};

/**
 * Pauses or resumes the render queue processing. When paused, the queue timer is cleared.
 *
 * @function
 * @memberof MapDataRequest
 * @param {boolean} pause - Flag indicating whether to pause (true) or resume (false) the render queue processing.
 */
window.MapDataRequest.prototype.pauseRenderQueue = function (pause) {
  this.renderQueuePaused = pause;
  if (pause) {
    if (this.renderQueueTimer) {
      clearTimeout(this.renderQueueTimer);
      this.renderQueueTimer = undefined;
    }
  } else {
    if (this.renderQueue.length > 0) {
      this.startQueueTimer(this.RENDER_PAUSE);
    }
  }
};

/**
 * Processes the render queue, rendering entities on the map.
 * This function handles both the rendering of new entities and the deletion of old ones.
 * It ensures that the quantity of entities processed per cycle does not exceed a set limit.
 *
 * @function
 * @memberof MapDataRequest
 */
window.MapDataRequest.prototype.processRenderQueue = function () {
  var drawEntityLimit = this.RENDER_BATCH_SIZE;

  // TODO: we don't take account of how many of the entities are actually new/removed - they
  //  could already be drawn and not changed. will see how it works like this...
  while (drawEntityLimit > 0 && this.renderQueue.length > 0) {
    var current = this.renderQueue[0];

    if (current.deleted.length > 0) {
      var deleteThisPass = current.deleted.splice(0, drawEntityLimit);
      drawEntityLimit -= deleteThisPass.length;
      this.render.processDeletedGameEntityGuids(deleteThisPass);
    }

    if (drawEntityLimit > 0 && current.entities.length > 0) {
      var drawThisPass = current.entities.splice(0, drawEntityLimit);
      drawEntityLimit -= drawThisPass.length;
      this.render.processGameEntities(drawThisPass, 'extended');
    }

    if (current.deleted.length === 0 && current.entities.length === 0) {
      this.renderQueue.splice(0, 1);
      this.debugTiles.setState(current.id, current.status);
    }
  }

  if (this.renderQueue.length > 0) {
    this.startQueueTimer(this.RENDER_PAUSE);
  } else if (Object.keys(this.queuedTiles).length === 0) {
    this.render.endRenderPass();

    var endTime = new Date().getTime();
    var duration = (endTime - this.refreshStartTime) / 1000;

    log.log('finished requesting data! (took ' + duration + ' seconds to complete)');

    window.runHooks('mapDataRefreshEnd', {});

    var longStatus =
      `Tiles: ${this.cachedTileCount} cached, ` +
      `${this.successTileCount} loaded, ` +
      (this.staleTileCount ? this.staleTileCount + ' stale, ' : '') +
      (this.failedTileCount ? this.failedTileCount + ' failed, ' : '') +
      `in ${duration} seconds`;

    // refresh timer based on time to run this pass, with a minimum of REFRESH seconds
    var minRefresh = window.map.getZoom() > 12 ? this.REFRESH_CLOSE : this.REFRESH_FAR;
    var refreshTimer = Math.max(minRefresh, duration * this.FETCH_TO_REFRESH_FACTOR);
    this.refreshOnTimeout(refreshTimer);
    this.setStatus(this.failedTileCount ? 'errors' : this.staleTileCount ? 'out of date' : 'done', longStatus);
  }
};
