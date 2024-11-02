/* global L -- eslint */

/**
 * Handles search-related hooks for the IITC.search module, adding various search result types.
 *
 * These functions supply default search results to the IITC search system by responding to `search` hooks with
 * data for portals, geographic coordinates, OpenStreetMap locations, and portal GUIDs.
 *
 * @namespace hooks
 * @memberof IITC.search
 */

/**
 * Searches for portals by matching the query term against portal titles and adds matched results.
 *
 * @param {Object} query - The search query object.
 * @fires hook#search
 */
window.addHook('search', function (query) {
  var term = query.term.toLowerCase();

  $.each(window.portals, function (guid, portal) {
    var data = portal.options.data;
    if (!data.title) return;

    if (data.title.toLowerCase().indexOf(term) !== -1) {
      window.search.addSearchResult(query, data, guid);
    }
  });
});

/**
 * Searches for geographical coordinates formatted as latitude, longitude and adds the results.
 * TODO: recognize 50°31'03.8"N 7°59'05.3"E and similar formats
 *
 * @param {Object} query - The search query object.
 * @fires hook#search
 */
window.addHook('search', function (query) {
  var locations = query.term.replaceAll(/%2C/gi, ',').match(/[+-]?\d+\.\d+, ?[+-]?\d+\.\d+/g);
  var added = {};
  if (!locations) return;
  locations.forEach(function (location) {
    var pair = location.split(',').map(function (s) {
      return parseFloat(s.trim()).toFixed(6);
    });
    var ll = pair.join(',');
    var latlng = L.latLng(
      pair.map(function (s) {
        return parseFloat(s);
      })
    );
    if (added[ll]) return;
    added[ll] = true;

    query.addResult({
      title: ll,
      description: 'geo coordinates',
      position: latlng,
      onSelected: function (result) {
        for (var guid in window.portals) {
          var p = window.portals[guid].getLatLng();
          if (p.lat.toFixed(6) + ',' + p.lng.toFixed(6) === ll) {
            window.renderPortalDetails(guid);
            return;
          }
        }

        window.urlPortalLL = [result.position.lat, result.position.lng];
      },
    });
  });
});

/**
 * Searches for results on OpenStreetMap based on the query term, considering map view boundaries.
 *
 * @param {Object} query - The search query object.
 * @fires hook#search
 */
window.addHook('search', function (query) {
  if (!query.confirmed) return;

  // Viewbox search orders results so they're closer to the viewbox
  var mapBounds = window.map.getBounds();
  var viewbox =
    '&viewbox=' + mapBounds.getSouthWest().lng + ',' + mapBounds.getSouthWest().lat + ',' + mapBounds.getNorthEast().lng + ',' + mapBounds.getNorthEast().lat;

  var resultCount = 0;
  var resultMap = {};
  function onQueryResult(isViewboxResult, data) {
    resultCount += data.length;
    if (isViewboxResult) {
      // Search for things outside the viewbox
      $.getJSON(window.NOMINATIM + encodeURIComponent(query.term) + viewbox, onQueryResult.bind(null, false));
      if (resultCount === 0) {
        return;
      }
    } else {
      if (resultCount === 0) {
        query.addResult({
          title: 'No results on OpenStreetMap',
          icon: '//www.openstreetmap.org/favicon.ico',
          onSelected: function () {
            return true;
          },
        });
        return;
      }
    }

    data.forEach(function (item) {
      if (resultMap[item.place_id]) {
        return;
      } // duplicate
      resultMap[item.place_id] = true;

      var result = {
        title: item.display_name,
        description: 'Type: ' + item.type,
        position: L.latLng(parseFloat(item.lat), parseFloat(item.lon)),
        icon: item.icon,
      };

      if (item.geojson) {
        result.layer = L.geoJson(item.geojson, {
          interactive: false,
          color: 'red',
          opacity: 0.7,
          weight: 2,
          fill: false,
          pointToLayer: function (featureData, latLng) {
            return L.marker(latLng, {
              icon: L.divIcon.coloredSvg('red'),
              title: item.display_name,
            });
          },
        });
      }

      var b = item.boundingbox;
      if (b) {
        var southWest = new L.LatLng(b[0], b[2]),
          northEast = new L.LatLng(b[1], b[3]);
        result.bounds = new L.LatLngBounds(southWest, northEast);
      }

      query.addResult(result);
    });
  }

  // Bounded search allows amenity-only searches (e.g. "amenity=toilet") via special phrases
  // http://wiki.openstreetmap.org/wiki/Nominatim/Special_Phrases/EN
  var bounded = '&bounded=1';

  $.getJSON(window.NOMINATIM + encodeURIComponent(query.term) + viewbox + bounded, onQueryResult.bind(null, true));
});

/**
 * Searches by GUID in the query term.
 *
 * @param {Object} query - The search query object.
 * @fires hook#search
 */
window.addHook('search', function (query) {
  const guid_re = /[0-9a-f]{32}\.[0-9a-f]{2}/;
  const res = query.term.match(guid_re);
  if (res) {
    const guid = res[0];
    const data = window.portalDetail.get(guid);
    if (data) window.search.addSearchResult(query, data, guid);
    else {
      window.portalDetail.request(guid).then(function (data) {
        window.search.addSearchResult(query, data, guid);
      });
    }
  }
});
