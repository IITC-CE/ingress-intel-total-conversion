/**
 * @file Contain misc functions to get portal info
 * @module portal_data
 */

/**
 * Search through the links data for all that link from and to a portal. Returns an object with separate lists of in
 * and out links. May or may not be as accurate as the portal details, depending on how much data the API returns.
 *
 * @function getPortalLinks
 * @param {string} guid - The GUID of the portal to search for links.
 * @returns {Object} An object containing arrays of incoming ('in') and outgoing ('out') link GUIDs.
 */
window.getPortalLinks = function (guid) {
  var links = { in: [], out: [] };

  $.each(window.links, function (g, l) {
    var d = l.options.data;

    if (d.oGuid === guid) {
      links.out.push(g);
    }
    if (d.dGuid === guid) {
      links.in.push(g);
    }
  });

  return links;
};

/**
 * Counts the total number of links (both incoming and outgoing) for a specified portal.
 *
 * @function getPortalLinksCount
 * @param {string} guid - The GUID of the portal.
 * @returns {number} The total number of links for the portal.
 */
window.getPortalLinksCount = function (guid) {
  var links = window.getPortalLinks(guid);
  return links.in.length + links.out.length;
};

/**
 * Searches through the fields for all fields that reference a specified portal.
 *
 * @function getPortalFields
 * @param {string} guid - The GUID of the portal to search for fields.
 * @returns {Array} An array containing the GUIDs of fields associated with the portal.
 */
window.getPortalFields = function (guid) {
  var fields = [];

  $.each(window.fields, function (g, f) {
    var d = f.options.data;

    if (d.points[0].guid === guid || d.points[1].guid === guid || d.points[2].guid === guid) {
      fields.push(g);
    }
  });

  return fields;
};

/**
 * Counts the total number of fields associated with a specified portal.
 *
 * @function getPortalFieldsCount
 * @param {string} guid - The GUID of the portal.
 * @returns {number} The total number of fields associated with the portal.
 */
window.getPortalFieldsCount = function (guid) {
  var fields = window.getPortalFields(guid);
  return fields.length;
};

(function () {
  var cache = {};
  var cache_level = 0;
  var GC_LIMIT = 15000; // run garbage collector when cache has more that 5000 items
  var GC_KEEP = 10000; // keep the 4000 most recent items

  /**
   * Finds a portal GUID by its position. Searches through currently rendered portals, fields, and links.
   * If the portal is not found in the current render, it checks a cache of recently seen portals.
   *
   * @function
   * @name findPortalGuidByPositionE6
   * @param {number} latE6 - The latitude in E6 format.
   * @param {number} lngE6 - The longitude in E6 format.
   * @returns {string|null} The GUID of the portal at the specified location, or null if not found.
   */
  window.findPortalGuidByPositionE6 = function (latE6, lngE6) {
    var item = cache[latE6 + ',' + lngE6];
    if (item) return item[0];

    // now try searching through currently rendered portals
    for (var guid in window.portals) {
      var data = window.portals[guid].options.data;
      if (data.latE6 === latE6 && data.lngE6 === lngE6) return guid;
    }

    // now try searching through fields
    for (var fguid in window.fields) {
      var points = window.fields[fguid].options.data.points;

      for (var i in points) {
        var point = points[i];
        if (point.latE6 === latE6 && point.lngE6 === lngE6) return point.guid;
      }
    }

    // and finally search through links
    for (var lguid in window.links) {
      var l = window.links[lguid].options.data;
      if (l.oLatE6 === latE6 && l.oLngE6 === lngE6) return l.oGuid;
      if (l.dLatE6 === latE6 && l.dLngE6 === lngE6) return l.dGuid;
    }

    return null;
  };

  /**
   * Pushes a portal GUID and its position into a cache.
   *
   * @function
   * @name pushPortalGuidPositionCache
   * @param {string} guid - The GUID of the portal.
   * @param {number} latE6 - The latitude in E6 format.
   * @param {number} lngE6 - The longitude in E6 format.
   */
  window.pushPortalGuidPositionCache = function (guid, latE6, lngE6) {
    cache[latE6 + ',' + lngE6] = [guid, Date.now()];
    cache_level += 1;

    if (cache_level > GC_LIMIT) {
      Object.keys(cache) // get all latlngs
        .map(function (latlng) {
          return [latlng, cache[latlng][1]];
        }) // map them to [latlng, timestamp]
        .sort(function (a, b) {
          return b[1] - a[1];
        }) // sort them
        .slice(GC_KEEP) // drop the MRU
        .forEach(function (item) {
          delete cache[item[0]];
        }); // delete the rest
      cache_level = Object.keys(cache).length;
    }
  };
})();
