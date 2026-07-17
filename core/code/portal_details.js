/* global IITC -- eslint */

/**
 * Namespace providing portal detail retrieval with caching and request de-duplication.
 *
 * @memberof IITC.portal
 * @namespace details
 */

let cache;
const requestQueue = {};

/**
 * Sets up the portal detail handler, initializing the cache.
 *
 * @memberof IITC.portal.details
 */
const setup = function () {
  cache = new window.DataCache();

  cache.startExpireInterval(20);
};

/**
 * Retrieves portal details from cache by GUID.
 *
 * @memberof IITC.portal.details
 * @param {string} guid - The Global Unique Identifier of the portal.
 * @returns Cached portal details if available.
 */
const get = function (guid) {
  return cache.get(guid);
};

/**
 * Stores portal details in the cache.
 *
 * @memberof IITC.portal.details
 * @param {string} guid - The Global Unique Identifier of the portal.
 * @param {object} dict - The portal detail data.
 * @returns Result of cache storage operation.
 */
const store = function (guid, dict) {
  return cache.store(guid, dict);
};

/**
 * Checks if portal details are fresh in the cache.
 *
 * @memberof IITC.portal.details
 * @param {string} guid - The Global Unique Identifier of the portal.
 * @returns {boolean} True if details are fresh, false otherwise.
 */
const isFresh = function (guid) {
  return cache.isFresh(guid);
};

const remove = function (guid) {
  return cache.remove(guid);
};

const handleResponseSuccess = function (deferred, guid, data, prefetch) {
  if (!data || data.error || !data.result) {
    handleResponseFailure(deferred, guid, data);
    return;
  }

  // Parse portal details
  const dict = window.decodeArray.portal(data.result, 'detailed');
  cache.store(guid, dict);

  // entity format, as used in map data
  const ent = [guid, data.result[13], data.result];
  const portal = window.mapDataRequest.render.createPortalEntity(ent, 'detailed');

  deferred.resolve(portal.options.data);
  window.runHooks('portalDetailLoaded', { guid: guid, success: true, details: portal.options.data, ent: ent, portal: portal });

  // prefetch portal image
  if (prefetch && portal.options.data.image) {
    new Image().src = portal.options.data.image;
  }
};

const handleResponseFailure = function (deferred, guid, data) {
  if (data && data.error === 'RETRY') {
    // server asked us to try again
    doRequest(deferred, guid);
  } else {
    deferred.reject();
    window.runHooks('portalDetailLoaded', { guid: guid, success: false });
  }
};

const doRequest = function (deferred, guid, prefetch) {
  window.postAjax(
    'getPortalDetails',
    { guid: guid },
    function (data) {
      handleResponseSuccess(deferred, guid, data, prefetch);
    },
    function () {
      handleResponseFailure(deferred, guid);
    }
  );
};

/**
 * Requests detailed information for a specific portal. If the information is not already being requested,
 * it initiates a new request. Returns a promise that resolves with the portal details.
 *
 * @memberof IITC.portal.details
 * @param {string} guid - The Global Unique Identifier of the portal.
 * @returns {Promise} A promise that resolves with the portal details upon successful retrieval or rejection on failure.
 */
const request = function (guid, prefetch = false) {
  if (!requestQueue[guid]) {
    const deferred = $.Deferred();
    requestQueue[guid] = deferred.promise();
    deferred.always(function () {
      delete requestQueue[guid];
    });

    doRequest(deferred, guid, prefetch);
  }

  return requestQueue[guid];
};

IITC.portal.details = {
  setup,
  get,
  store,
  isFresh,
  remove,
  request,
};

IITC.registerLegacyAliases(IITC.portal, { portalDetail: 'details' });
