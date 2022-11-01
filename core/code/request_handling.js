/* global REFRESH MINIMUM_OVERRIDE_REFRESH */

// REQUEST HANDLING //////////////////////////////////////////////////
// note: only meant for portal/links/fields request, everything else
// does not count towards “loading”

window.activeRequests = [];
window.failedRequestCount = 0;
window.statusTotalMapTiles = 0;
window.statusCachedMapTiles = 0;
window.statusSuccessMapTiles = 0;
window.statusStaleMapTiles = 0;
window.statusErrorMapTiles = 0;

window.requests = function () {};

// time of last refresh
window.requests._lastRefreshTime = 0;

window.requests.add = function (ajax) {
  window.activeRequests.push(ajax);
  renderUpdateStatus();
}

window.requests.remove = function (ajax) {
  window.activeRequests.splice(window.activeRequests.indexOf(ajax), 1);
  renderUpdateStatus();
}

window.requests.abort = function () {
  $.each(window.activeRequests, function (ind, actReq) {
    if (actReq) actReq.abort();
  });

  window.activeRequests = [];
  window.failedRequestCount = 0;
  window.chat._requestPublicRunning = false;
  window.chat._requestFactionRunning = false;

  renderUpdateStatus();
}



// sets the timer for the next auto refresh. Ensures only one timeout
// is queued. May be given 'override' in milliseconds if time should
// not be guessed automatically. Especially useful if a little delay
// is required, for example when zooming.
window.startRefreshTimeout = function (override) {
  // may be required to remove 'paused during interaction' message in
  // status bar
  window.renderUpdateStatus();
  if (window.refreshTimeout) clearTimeout(window.refreshTimeout);
  if (override === -1) return; // don't set a new timeout

  var t = 0;
  if (override) {
    t = override;
    //ensure override can't cause too fast a refresh if repeatedly used (e.g. lots of scrolling/zooming)
    let timeSinceLastRefresh = new Date().getTime() - window.requests._lastRefreshTime;
    if (timeSinceLastRefresh < 0) timeSinceLastRefresh = 0; // in case of clock adjustments
    if (timeSinceLastRefresh < MINIMUM_OVERRIDE_REFRESH * 1000) {
      t = MINIMUM_OVERRIDE_REFRESH * 1000 - timeSinceLastRefresh;
    }
  } else {
    t = REFRESH * 1000;

    var adj = ZOOM_LEVEL_ADJ * (18 - map.getZoom());
    if (adj > 0) t += adj * 1000;
  }

  window.refreshTimeout = setTimeout(window.requests._callOnRefreshFunctions, t);
  renderUpdateStatus();
}

window.requests._onRefreshFunctions = [];
window.requests._callOnRefreshFunctions = function() {
//  log.log('running refresh at ' + new Date().toLocaleTimeString());
  startRefreshTimeout();

  if (window.isIdle()) {
//    log.log('user has been idle for ' + idleTime + ' seconds, or window hidden. Skipping refresh.');
    renderUpdateStatus();
    return;
  }

//  log.log('refreshing');

  //store the timestamp of this refresh
  window.requests._lastRefreshTime = new Date().getTime();

  $.each(window.requests._onRefreshFunctions, function (ind, f) {
    f();
  });
}


// add method here to be notified of auto-refreshes
window.requests.addRefreshFunction = function (f) {
  window.requests._onRefreshFunctions.push(f);
}

window.requests.isLastRequest = function(action) {
  var result = true;
  $.each(window.activeRequests, function(ind, req) {
    if(req.action === action) {
      result = false;
      return false;
    }
  });
  return result;
}
