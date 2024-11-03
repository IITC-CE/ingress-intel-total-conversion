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
 * TODO: recognize 50°31'03.8"N 7°59'05.3"E and similar formats
 *
 * @param {Object} query - The search query object.
 * @fires hook#search
 */
window.addHook('search', (query) => {
  const locations = query.term.replace(/%2C/gi, ',').match(/[+-]?\d+\.\d+, ?[+-]?\d+\.\d+/g);
  const added = new Set();

  if (!locations) return;

  locations.forEach((location) => {
    const pair = location.split(',').map((s) => parseFloat(s.trim()).toFixed(6));
    const ll = pair.join(',');
    const latlng = L.latLng(pair.map(parseFloat));

    if (added.has(ll)) return;
    added.add(ll);

    query.addResult({
      title: ll,
      description: 'geo coordinates',
      position: latlng,
      onSelected: (result) => {
        for (const [guid, portal] of Object.entries(window.portals)) {
          const p = portal.getLatLng();
          if (`${p.lat.toFixed(6)},${p.lng.toFixed(6)}` === ll) {
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
            pointToLayer: (featureData, latLng) =>
              L.marker(latLng, {
                icon: L.divIcon.coloredSvg('red'),
                title: item.display_name,
              }),
          });
        }

        if (item.boundingbox) {
          const [south, north, west, east] = item.boundingbox;
          result.bounds = new L.LatLngBounds(L.latLng(parseFloat(south), parseFloat(west)), L.latLng(parseFloat(north), parseFloat(east)));
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
