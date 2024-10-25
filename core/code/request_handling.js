/**
 * @file This file contains functions and variables related to request handling in IITC.
 * Note: only meant for portal/links/fields request, everything else does not count towards “loading”
 * @module request_handling
 */

window.activeRequests = [];
window.failedRequestCount = 0;
window.statusTotalMapTiles = 0;
window.statusCachedMapTiles = 0;
window.statusSuccessMapTiles = 0;
window.statusStaleMapTiles = 0;
window.statusErrorMapTiles = 0;

/**
 * Manages and tracks active requests within the application.
 * @namespace window.requests
 */
window.requests = function () {};

// time of last refresh
window.requests._lastRefreshTime = 0;

/**
 * Adds an AJAX request to the activeRequests array and updates the status.
 *
 * @function window.requests.add
 * @param {jqXHR} ajax - The jQuery wrapped XMLHttpRequest object.
 */
window.requests.add = function (ajax) {
  window.activeRequests.push(ajax);
  window.renderUpdateStatus();
};

/**
 * Removes an AJAX request from the activeRequests array and updates the status.
 *
 * @function window.requests.remove
 * @param {jqXHR} ajax - The jQuery wrapped XMLHttpRequest object.
 */
window.requests.remove = function (ajax) {
  window.activeRequests.splice(window.activeRequests.indexOf(ajax), 1);
  window.renderUpdateStatus();
};

/**
 * Aborts all active AJAX requests and resets related variables and status.
 *
 * @function window.requests.abort
 */
window.requests.abort = function () {
  $.each(window.activeRequests, function (ind, actReq) {
    if (actReq) actReq.abort();
  });

  window.activeRequests = [];
  window.failedRequestCount = 0;

  window.renderUpdateStatus();
};

/**
 * Sets a timeout for the next automatic refresh of data. Ensures only one timeout is queued.
 * Can use an override time in milliseconds.
 * Especially useful if a little delay is required, for example when zooming.
 *
 * @function startRefreshTimeout
 * @param {number} [override] - Optional override time in milliseconds for the next refresh.
 */
window.startRefreshTimeout = function (override) {
  // may be required to remove 'paused during interaction' message in
  // status bar
  window.renderUpdateStatus();
  if (window.refreshTimeout) clearTimeout(window.refreshTimeout);
  if (override === -1) return; // don't set a new timeout

  var t = 0;
  if (override) {
    t = override;
    // ensure override can't cause too fast a refresh if repeatedly used (e.g. lots of scrolling/zooming)
    let timeSinceLastRefresh = new Date().getTime() - window.requests._lastRefreshTime;
    if (timeSinceLastRefresh < 0) timeSinceLastRefresh = 0; // in case of clock adjustments
    if (timeSinceLastRefresh < window.MINIMUM_OVERRIDE_REFRESH * 1000) {
      t = window.MINIMUM_OVERRIDE_REFRESH * 1000 - timeSinceLastRefresh;
    }
  } else {
    t = window.REFRESH * 1000;

    var adj = window.ZOOM_LEVEL_ADJ * (18 - window.map.getZoom());
    if (adj > 0) t += adj * 1000;
  }

  window.refreshTimeout = setTimeout(window.requests._callOnRefreshFunctions, t);
  window.renderUpdateStatus();
};

window.requests._onRefreshFunctions = [];

/**
 * Calls each function in the _onRefreshFunctions array, handling the automatic refresh process.
 *
 * @private
 * @function window.requests._callOnRefreshFunctions
 */
window.requests._callOnRefreshFunctions = function () {
  window.startRefreshTimeout();

  if (window.isIdle()) {
    window.renderUpdateStatus();
    return;
  }

  window.requests._lastRefreshTime = new Date().getTime();

  $.each(window.requests._onRefreshFunctions, function (ind, f) {
    f();
  });
};

/**
 * Adds a function to the list of functions to be called on each automatic refresh.
 *
 * @function window.requests.addRefreshFunction
 * @param {Function} f - The function to add to the refresh process.
 */
window.requests.addRefreshFunction = function (f) {
  window.requests._onRefreshFunctions.push(f);
};
