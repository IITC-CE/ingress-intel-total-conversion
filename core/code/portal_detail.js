/**
 * @file Provides functionality to handle portal details, including caching and server requests.
 * @namespace window.portalDetail
 */

var cache;
var requestQueue = {};

window.portalDetail = function () {};

/**
 * Sets up the portal detail handler, initializing the cache.
 *
 * @function window.portalDetail.setup
 */
window.portalDetail.setup = function () {
  cache = new window.DataCache();

  cache.startExpireInterval(20);
};

/**
 * Retrieves portal details from cache by GUID.
 *
 * @function window.portalDetail.get
 * @param {string} guid - The Global Unique Identifier of the portal.
 * @returns Cached portal details if available.
 */
window.portalDetail.get = function (guid) {
  return cache.get(guid);
};

/**
 * Stores portal details in the cache.
 *
 * @function window.portalDetail.store
 * @param {string} guid - The Global Unique Identifier of the portal.
 * @param {object} dict - The portal detail data.
 * @param {number} freshtime - Optional freshness time for cache.
 * @returns Result of cache storage operation.
 */
window.portalDetail.store = function (guid, dict, freshtime) {
  return cache.store(guid, dict, freshtime);
};

/**
 * Checks if portal details are fresh in the cache.
 *
 * @function window.portalDetail.isFresh
 * @param {string} guid - The Global Unique Identifier of the portal.
 * @returns {boolean} True if details are fresh, false otherwise.
 */
window.portalDetail.isFresh = function (guid) {
  return cache.isFresh(guid);
};

var handleResponse = function (deferred, guid, data, success) {
  if (!data || data.error || !data.result) {
    success = false;
  }

  if (success) {
    var dict = window.decodeArray.portal(data.result, 'detailed');

    // entity format, as used in map data
    var ent = [guid, dict.timestamp, data.result];

    cache.store(guid, dict);

    deferred.resolve(dict);
    window.runHooks('portalDetailLoaded', { guid: guid, success: success, details: dict, ent: ent });

    // FIXME..? better way of handling sidebar refreshing...

    if (guid === window.selectedPortal) {
      window.renderPortalDetails(guid);
    }

  } else {
    if (data && data.error === 'RETRY') {
      // server asked us to try again
      doRequest(deferred, guid);
    } else {
      deferred.reject();
      window.runHooks('portalDetailLoaded', { guid: guid, success: success });
    }
  }
};

var doRequest = function (deferred, guid) {
  window.postAjax(
    'getPortalDetails',
    { guid: guid },
    function (data) {
      handleResponse(deferred, guid, data, true);
    },
    function () {
      handleResponse(deferred, guid, undefined, false);
    }
  );
};

/**
 * Requests detailed information for a specific portal. If the information is not already being requested,
 * it initiates a new request. Returns a promise that resolves with the portal details.
 *
 * @function window.portalDetail.request
 * @param {string} guid - The Global Unique Identifier of the portal.
 * @returns {Promise} A promise that resolves with the portal details upon successful retrieval or rejection on failure.
 */
window.portalDetail.request = function (guid) {
  if (!requestQueue[guid]) {
    var deferred = $.Deferred();
    requestQueue[guid] = deferred.promise();
    deferred.always(function () {
      delete requestQueue[guid];
    });

    doRequest(deferred, guid);
  }

  return requestQueue[guid];
};
