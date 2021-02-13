/// PORTAL DETAIL //////////////////////////////////////
// code to retrieve the new portal detail data from the servers

// NOTE: the API for portal detailed information is NOT FINAL
// this is a temporary measure to get things working again after a major change to the intel map
// API. expect things to change here


var cache;
var requestQueue = {};

window.portalDetail = function() {};

window.portalDetail.setup = function() {
  cache = new DataCache();

  cache.startExpireInterval(20);
}

window.portalDetail.get = function(guid) {
  return cache.get(guid);
}

window.portalDetail.isFresh = function(guid) {
  return cache.isFresh(guid);
}


var handleResponse = function(deferred, guid, data, success) {
  if (!data || data.error || !data.result) {
    success = false;
  }

  if (success) {
    // entity format, as used in map data
    var ent = [guid,data.result[13],data.result];
    var portal = window.mapDataRequest.render.createPortalEntity(ent, 'detailed');

    cache.store(guid,portal.options.data);

    deferred.resolve(portal.options.data);
    window.runHooks ('portalDetailLoaded', {guid:guid, success:success, details:portal.options.data, ent:ent});

  } else {
    if (data && data.error == "RETRY") {
      // server asked us to try again
      doRequest(deferred, guid);
    } else {
      deferred.reject();
      window.runHooks ('portalDetailLoaded', {guid:guid, success:success});
    }
  }

}

var doRequest = function(deferred, guid) {
  window.postAjax('getPortalDetails', {guid:guid},
    function(data,textStatus,jqXHR) { handleResponse(deferred, guid, data, true); },
    function() { handleResponse(deferred, guid, undefined, false); }
  );
}

window.portalDetail.request = function(guid) {
  if (!requestQueue[guid]) {
    var deferred = $.Deferred();
    requestQueue[guid] = deferred.promise();
    deferred.always(function() { delete requestQueue[guid]; });

    doRequest(deferred, guid);
  }

  return requestQueue[guid];
}
