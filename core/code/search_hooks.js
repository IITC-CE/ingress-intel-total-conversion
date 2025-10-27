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
window.addHook('search', (query) => {
  const term = query.term.toLowerCase();

  for (const [guid, portal] of Object.entries(window.portals)) {
    const data = portal.options.data;
    if (!data.title) continue;

    if (data.title.toLowerCase().includes(term)) {
      window.search.addSearchResult(query, data, guid);
    }
  }
});

/**
 * Searches for geographical coordinates formatted as latitude, longitude and adds the results.
 * Supports both decimal format (e.g., 51.5074, -0.1278) and DMS format (e.g., 50°31'03.8"N 7°59'05.3"E).
 *
 * @param {Object} query - The search query object.
 * @fires hook#search
 */
window.addHook('search', (query) => {
  const added = new Set();

  // Regular expression for decimal coordinates
  const decimalRegex = /[+-]?\d+\.\d+, ?[+-]?\d+\.\d+/g;
  // Regular expression for DMS coordinates
  const dmsRegex = /(\d{1,3})°(\d{1,2})'(\d{1,2}(?:\.\d+)?)?"\s*([NS]),?\s*(\d{1,3})°(\d{1,2})'(\d{1,2}(?:\.\d+)?)?"\s*([EW])/g;

  // Convert DMS to decimal format
  const parseDMS = (deg, min, sec, dir) => {
    const decimal = parseFloat(deg) + parseFloat(min) / 60 + parseFloat(sec) / 3600;
    return dir === 'S' || dir === 'W' ? -decimal : decimal;
  };

  // Universal function for adding search result
  const addResult = (lat, lng) => {
    const latLngString = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    if (added.has(latLngString)) return;
    added.add(latLngString);

    query.addResult({
      title: latLngString,
      description: 'geo coordinates',
      position: new L.LatLng(lat, lng),
      onSelected: (result) => {
        for (const [guid, portal] of Object.entries(window.portals)) {
          const { lat: pLat, lng: pLng } = portal.getLatLng();
          if (`${pLat.toFixed(6)},${pLng.toFixed(6)}` === latLngString) {
            window.renderPortalDetails(guid);
            return;
          }
        }
        window.urlPortalLL = [result.position.lat, result.position.lng];
      },
    });
  };

  // Search and process decimal coordinates
  const decimalMatches = query.term.replace(/%2C/gi, ',').match(decimalRegex);
  if (decimalMatches) {
    decimalMatches.forEach((location) => {
      const [lat, lng] = location.split(',').map(Number);
      addResult(lat, lng);
    });
  }

  // Search and process DMS coordinates
  const dmsMatches = Array.from(query.term.matchAll(dmsRegex));
  dmsMatches.forEach((match) => {
    const lat = parseDMS(match[1], match[2], match[3], match[4]);
    const lng = parseDMS(match[5], match[6], match[7], match[8]);
    addResult(lat, lng);
  });
});

/**
 * Searches for results on OpenStreetMap based on the query term, considering map view boundaries.
 *
 * @param {Object} query - The search query object.
 * @fires hook#search
 */
window.addHook('search', async (query) => {
  if (!query.confirmed) return;

  const mapBounds = window.map.getBounds();
  const viewbox = `&viewbox=${mapBounds.getSouthWest().lng},${mapBounds.getSouthWest().lat},${mapBounds.getNorthEast().lng},${mapBounds.getNorthEast().lat}`;
  // Bounded search allows amenity-only searches (e.g. "amenity=toilet") via special phrases
  // https://wiki.openstreetmap.org/wiki/Nominatim/Special_Phrases/EN
  const bounded = '&bounded=1';

  const resultMap = new Set();
  let resultCount = 0;

  async function fetchResults(isViewboxResult) {
    try {
      const response = await fetch(`${window.NOMINATIM}${encodeURIComponent(query.term)}${isViewboxResult ? viewbox + bounded : viewbox}`);
      const data = await response.json();

      if (isViewboxResult && data.length === 0) {
        // If no results found within the viewbox, try a broader search
        await fetchResults(false);
        return;
      } else if (!isViewboxResult && resultCount === 0 && data.length === 0) {
        // If no results at all
        query.addResult({
          title: 'No results on OpenStreetMap',
          icon: '//www.openstreetmap.org/favicon.ico',
          onSelected: () => true,
        });
        return;
      }

      resultCount += data.length;

      data.forEach((item) => {
        if (resultMap.has(item.place_id)) return; // duplicate
        resultMap.add(item.place_id);

        const result = {
          title: item.display_name,
          description: `Type: ${item.type}`,
          position: new L.LatLng(parseFloat(item.lat), parseFloat(item.lon)),
          icon: item.icon,
        };

        if (item.geojson) {
          result.layer = L.geoJson(item.geojson, {
            interactive: false,
            color: 'red',
            opacity: 0.7,
            weight: 2,
            fill: false,
            pointToLayer: (featureData, latLng) =>
              new L.Marker(latLng, {
                icon: new L.DivIcon.ColoredSvg('red'),
                title: item.display_name,
              }),
          });
        }

        if (item.boundingbox) {
          const [south, north, west, east] = item.boundingbox;
          result.bounds = new L.LatLngBounds(new L.LatLng(parseFloat(south), parseFloat(west)), new L.LatLng(parseFloat(north), parseFloat(east)));
        }

        query.addResult(result);
      });
    } catch (error) {
      console.error('Error fetching OSM data:', error);
    }
  }

  // Start with viewbox-bounded search
  await fetchResults(true);
});

/**
 * Searches by GUID in the query term.
 *
 * @param {Object} query - The search query object.
 * @fires hook#search
 */
window.addHook('search', async (query) => {
  const guidRegex = /[0-9a-f]{32}\.[0-9a-f]{2}/;
  const match = query.term.match(guidRegex);

  if (match) {
    const guid = match[0];
    const data = window.portalDetail.get(guid);

    if (data) {
      window.search.addSearchResult(query, data, guid);
    } else {
      try {
        const fetchedData = await window.portalDetail.request(guid);
        window.search.addSearchResult(query, fetchedData, guid);
      } catch (error) {
        console.error('Error fetching portal details:', error);
      }
    }
  }
});
