/* global IITC, log -- eslint */

/**
 * Contains functions for calculating map data request parameters and converting between lat/lng and map tiles.
 * Ingress Intel splits up requests for map data (portals, links, fields) into tiles.
 * To get data for the current viewport (i.e. what is currently visible) it first calculates which tiles intersect.
 * For all those tiles, it then calculates the lat/lng bounds of that tile and a quadkey.
 * Both the bounds and the quadkey are “somewhat” required to get complete data.
 * Conversion functions courtesy of
 * [wiki.openstreetmap.org/wiki/Slippy_map_tilenames](http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames)
 *
 * @memberof IITC.map
 * @namespace tiles
 */
IITC.map.tiles = {};

IITC.map.tiles.params = {};

/**
 * Sets up the data tile parameters used for map data requests. This function initializes the params
 * object with default values or values detected from the stock Intel map.
 *
 * @memberof IITC.map.tiles
 */
IITC.map.tiles.setupParams = function () {
  // default values - used to fall back to if we can't detect those used in stock intel
  var DEFAULT_ZOOM_TO_TILES_PER_EDGE = [1, 1, 1, 40, 40, 80, 80, 320, 1000, 2000, 2000, 4000, 8000, 16000, 16000, 32000];
  var DEFAULT_ZOOM_TO_LEVEL = [8, 8, 8, 8, 7, 7, 7, 6, 6, 5, 4, 4, 3, 2, 2, 1, 1];

  // stock intel doesn't have this array (they use a switch statement instead), but this is far neater
  var DEFAULT_ZOOM_TO_LINK_LENGTH = [200000, 200000, 200000, 200000, 200000, 60000, 60000, 10000, 5000, 2500, 2500, 800, 300, 0, 0];

  IITC.map.tiles.params = {};

  // not in stock to detect - we'll have to assume the above values...
  IITC.map.tiles.params.ZOOM_TO_LINK_LENGTH = DEFAULT_ZOOM_TO_LINK_LENGTH;

  if (window.niantic_params.ZOOM_TO_LEVEL && window.niantic_params.TILES_PER_EDGE) {
    IITC.map.tiles.params.ZOOM_TO_LEVEL = window.niantic_params.ZOOM_TO_LEVEL;
    IITC.map.tiles.params.TILES_PER_EDGE = window.niantic_params.TILES_PER_EDGE;

    // lazy numerical array comparison
    if (JSON.stringify(window.niantic_params.ZOOM_TO_LEVEL) !== JSON.stringify(DEFAULT_ZOOM_TO_LEVEL)) {
      log.warn('Tile parameter ZOOM_TO_LEVEL have changed in stock intel. Detected correct values, but code should be updated');
    }
    if (JSON.stringify(window.niantic_params.TILES_PER_EDGE) !== JSON.stringify(DEFAULT_ZOOM_TO_TILES_PER_EDGE)) {
      log.warn('Tile parameter TILES_PER_EDGE have changed in stock intel. Detected correct values, but code should be updated');
    }
  } else {
    window.dialog({
      title: 'IITC Warning',
      html:
        '<p>IITC failed to detect the ZOOM_TO_LEVEL and/or TILES_PER_EDGE settings from the stock intel site.</p>' +
        "<p>IITC is now using fallback default values. However, if detection has failed it's likely the values have changed." +
        ' IITC may not load the map if these default values are wrong.</p>',
    });

    IITC.map.tiles.params.ZOOM_TO_LEVEL = DEFAULT_ZOOM_TO_LEVEL;
    IITC.map.tiles.params.TILES_PER_EDGE = DEFAULT_ZOOM_TO_TILES_PER_EDGE;
  }

  // 2015-07-01: niantic added code to the stock site that overrides the min zoom level for unclaimed portals to 15 and above
  // instead of updating the zoom-to-level array. makes no sense really....
  // we'll just chop off the array at that point, so the code defaults to level 0 (unclaimed) everywhere...
  IITC.map.tiles.params.ZOOM_TO_LEVEL = IITC.map.tiles.params.ZOOM_TO_LEVEL.slice(0, 15); // deprecated
};

/**
 * Gets the map zoom tile parameters for a specific zoom level. It calculates the tile level, number of tiles per edge,
 * minimum link length, and whether portals are available at the specified zoom level.
 *
 * @memberof IITC.map.tiles
 * @param {number} zoom - The map zoom level.
 * @returns {Object} An object containing tile parameters for the given zoom level.
 */
IITC.map.tiles.getMapZoomParameters = function (zoom) {
  var maxTilesPerEdge = IITC.map.tiles.params.TILES_PER_EDGE[IITC.map.tiles.params.TILES_PER_EDGE.length - 1];

  return {
    level: IITC.map.tiles.params.ZOOM_TO_LEVEL[zoom] || 0, // deprecated
    tilesPerEdge: IITC.map.tiles.params.TILES_PER_EDGE[zoom] || maxTilesPerEdge,
    minLinkLength: IITC.map.tiles.params.ZOOM_TO_LINK_LENGTH[zoom] || 0,
    hasPortals: zoom >= IITC.map.tiles.params.ZOOM_TO_LINK_LENGTH.length, // no portals returned at all when link length limits things
    zoom: zoom, // include the zoom level, for reference
  };
};

IITC.map.tiles.getDataZoomParameters = function (zoom) {
  zoom = arguments.length ? zoom : window.map.getZoom();
  var dataZoom = IITC.map.tiles.getDataZoomForMapZoom(zoom);
  return IITC.map.tiles.getMapZoomParameters(dataZoom);
};

/**
 * Determines the data zoom level for a given map zoom level. This function adjusts the zoom level for
 * data requests based on various factors to optimize caching performance and server load.
 *
 * @memberof IITC.map.tiles
 * @param {number} zoom - The current map zoom level.
 * @returns {number} The adjusted zoom level for data requests.
 */
IITC.map.tiles.getDataZoomForMapZoom = function (zoom) {
  // we can fetch data at a zoom level different to the map zoom.

  // NOTE: the specifics of this are tightly coupled with the above ZOOM_TO_LEVEL and TILES_PER_EDGE arrays

  // firstly, some of IITCs zoom levels, depending on base map layer, can be higher than stock. limit zoom level
  // (stock site max zoom may vary depending on google maps detail in the area - 20 or 21 max is common)
  if (zoom > 21) {
    zoom = 21;
  }

  // to improve the cacheing performance, we try and limit the number of zoom levels we retrieve data for
  // to avoid impacting server load, we keep ourselves restricted to a zoom level with the sane number
  // of tilesPerEdge and portal levels visible

  var origTileParams = IITC.map.tiles.getMapZoomParameters(zoom);

  while (zoom > window.MIN_ZOOM) {
    var newTileParams = IITC.map.tiles.getMapZoomParameters(zoom - 1);

    if (
      newTileParams.tilesPerEdge !== origTileParams.tilesPerEdge ||
      newTileParams.hasPortals !== origTileParams.hasPortals ||
      newTileParams.level * newTileParams.hasPortals !== origTileParams.level * origTileParams.hasPortals // multiply by 'hasPortals' bool - so comparison does not matter when no portals available
    ) {
      // switching to zoom-1 would result in a different detail level - so we abort changing things
      break;
    } else {
      // changing to zoom = zoom-1 results in identical tile parameters - so we can safely step back
      // with no increase in either server load or number of requests
      zoom = zoom - 1;
    }
  }

  return zoom;
};

IITC.map.tiles.lngToTile = function (lng, params) {
  return Math.floor(((lng + 180) / 360) * params.tilesPerEdge);
};

IITC.map.tiles.latToTile = function (lat, params) {
  return Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * params.tilesPerEdge);
};

IITC.map.tiles.tileToLng = function (x, params) {
  return (x / params.tilesPerEdge) * 360 - 180;
};

IITC.map.tiles.tileToLat = function (y, params) {
  var n = Math.PI - (2 * Math.PI * y) / params.tilesPerEdge;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

IITC.map.tiles.pointToTileId = function (params, x, y) {
  // change to quadkey construction
  // as of 2014-05-06: zoom_x_y_minlvl_maxlvl_maxhealth

  return params.zoom + '_' + x + '_' + y + '_' + params.level + '_8_100';
};

IITC.registerLegacyAliases(IITC.map.tiles, {
  setupDataTileParams: 'setupParams',
  TILE_PARAMS: 'params',
  getMapZoomTileParameters: 'getMapZoomParameters',
  getDataZoomTileParameters: 'getDataZoomParameters',
  getDataZoomForMapZoom: 'getDataZoomForMapZoom',
  lngToTile: 'lngToTile',
  latToTile: 'latToTile',
  tileToLng: 'tileToLng',
  tileToLat: 'tileToLat',
  pointToTileId: 'pointToTileId',
});
