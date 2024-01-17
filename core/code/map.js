/* global log, L, IITC, PLAYER -- eslint */

/**
 * @file This file provides functions for working with maps.
 * @module map
 */

function setupCRS () {

  // use the earth radius value from s2 geometry library
  // https://github.com/google/s2-geometry-library-java/blob/c28f287b996c0cedc5516a0426fbd49f6c9611ec/src/com/google/common/geometry/S2LatLng.java#L31
  var EARTH_RADIUS_METERS = 6367000.0;
  // distance calculations with that constant are a little closer to values observable in Ingress client.
  // difference is:
  // - ~0.06% when using LatLng.distanceTo() (R is 6371 vs 6367)
  // - ~0.17% when using Map.distance() / CRS.destance() (R is 6378.137 vs 6367)
  // (Yes, Leaflet is not consistent here, e.g. see https://github.com/Leaflet/Leaflet/pull/6928)

  // this affects LatLng.distanceTo(), which is currently used in most iitc plugins
  L.CRS.Earth.R = EARTH_RADIUS_METERS;

  // this affects Map.distance(), which is known to be used in draw-tools
  var SphericalMercator = L.Projection.SphericalMercator;
  SphericalMercator.S2 = L.extend({}, SphericalMercator, {
    R: EARTH_RADIUS_METERS,
    bounds: (function () {
      var d = EARTH_RADIUS_METERS * Math.PI;
      return L.bounds([-d, -d], [d, d]);
    })()
  });

  L.CRS.S2 = L.extend({}, L.CRS.Earth, {
    code: 'Ingress',
    projection: SphericalMercator.S2,
    transformation: (function () {
      var scale = 0.5 / (Math.PI * SphericalMercator.S2.R);
      return L.transformation(scale, 0.5, -scale, 0.5);
    }())
  });
}

/**
 * Normalizes latitude, longitude, and zoom values. Ensures that the values are valid numbers, providing
 * defaults if necessary.
 *
 * @function normLL
 * @param {number|string} lat - Latitude value or string that can be converted to a number.
 * @param {number|string} lng - Longitude value or string that can be converted to a number.
 * @param {number|string} zoom - Zoom level value or string that can be converted to a number.
 * @returns {Object} An object containing normalized center (latitude and longitude) and zoom level.
 */
function normLL (lat, lng, zoom) {
  return {
    center: [
      parseFloat(lat) || 0,
      parseFloat(lng) || 0
    ],
    zoom: parseInt(zoom) || window.DEFAULT_ZOOM
  };
}

/**
 * Retrieves the last known map position from the URL parameters or cookies.
 * Prioritizes URL parameters over cookies. Extracts and normalizes the latitude, longitude, and zoom level.
 *
 * @function getPosition
 * @returns {Object} An object containing the map's position and zoom level, or undefined if not found.
 */
function getPosition () {
  var url = window.getURLParam;

  var zoom = url('z');
  var latE6 = url('latE6');
  var lngE6 = url('lngE6');
  if (latE6 && lngE6) {
    log.log('mappos: reading email URL params');
    return normLL(parseInt(latE6)/1E6, parseInt(lngE6)/1E6, zoom);
  }

  var ll = url('ll') || url('pll');
  if (ll) {
    log.log('mappos: reading stock Intel URL params');
    ll = ll.split(',');
    return normLL(ll[0], ll[1], zoom);
  }

  var lat = window.readCookie('ingress.intelmap.lat');
  var lng = window.readCookie('ingress.intelmap.lng');
  if (lat && lng) {
    log.log('mappos: reading cookies');
    return normLL(lat, lng, window.readCookie('ingress.intelmap.zoom'));
  }
}

/**
 * Initializes and returns a collection of default basemap layers. The function creates a set of base layers
 * including CartoDB (both dark and light themes), and various Google Maps layers (Default Ingress Map, Roads,
 * Roads with Traffic, Satellite, Hybrid, and Terrain).
 *
 * @returns {Object.<String, Object>} An object containing different basemap layers ready to be added to a map. Each property of the
 *                   object is a named map layer, with its value being the corresponding Leaflet tile layer object.
 */
function createDefaultBaseMapLayers () {
  var baseLayers = {};

  /*
  // OpenStreetMap attribution - required by several of the layers
  osmAttribution = 'Map data © OpenStreetMap contributors';

  // MapQuest - http://developer.mapquest.com/web/products/open/map
  // now requires an API key
  var mqSubdomains = [ 'otile1', 'otile2', 'otile3', 'otile4' ];
  var mqTileUrlPrefix = window.location.protocol !== 'https:' ? 'http://{s}.mqcdn.com' : 'https://{s}-s.mqcdn.com';
  var mqMapOpt = {attribution: osmAttribution+', Tiles Courtesy of MapQuest', maxNativeZoom: 18, maxZoom: 21, subdomains: mqSubdomains};
  baseLayers['MapQuest OSM'] = new L.TileLayer(mqTileUrlPrefix+'/tiles/1.0.0/map/{z}/{x}/{y}.jpg', mqMapOpt);
  */

  // cartodb has some nice tiles too - both dark and light subtle maps - http://cartodb.com/basemaps/
  // (not available over https though - not on the right domain name anyway)
  var cartoAttr = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>';
  var cartoUrl = 'https://{s}.basemaps.cartocdn.com/{theme}/{z}/{x}/{y}.png';
  baseLayers['CartoDB Dark Matter'] = L.tileLayer(cartoUrl, {attribution: cartoAttr, theme: 'dark_all'});
  baseLayers['CartoDB Positron'] = L.tileLayer(cartoUrl, {attribution: cartoAttr, theme: 'light_all'});

  // Google Maps - including ingress default (using the stock-intel API-key)
  baseLayers['Google Default Ingress Map'] = L.gridLayer.googleMutant(
    { type: 'roadmap',
      backgroundColor: '#0e3d4e',
      styles: [
        { featureType: 'all', elementType: 'all',
          stylers: [{visibility: 'on'}, {hue: '#131c1c'}, {saturation: '-50'}, {invert_lightness: true}] },
        { featureType: 'water', elementType: 'all',
          stylers: [{visibility: 'on'}, {hue: '#005eff'}, {invert_lightness: true}] },
        { featureType: 'poi', stylers: [{visibility: 'off'}] },
        { featureType: 'transit', elementType: 'all', stylers: [{visibility: 'off'}] },
        { featureType: 'road', elementType: 'labels.icon', stylers: [{invert_lightness: !0}] }
      ],
    });
  baseLayers['Google Roads'] = L.gridLayer.googleMutant({type: 'roadmap'});
  var trafficMutant = L.gridLayer.googleMutant({type: 'roadmap'});
  trafficMutant.addGoogleLayer('TrafficLayer');
  baseLayers['Google Roads + Traffic'] = trafficMutant;
  var transitMutant = L.gridLayer.googleMutant({ type: 'roadmap' });
  transitMutant.addGoogleLayer('TransitLayer');
  baseLayers['Google Roads + Transit'] = transitMutant;
  baseLayers['Google Satellite'] = L.gridLayer.googleMutant({type: 'satellite'});
  baseLayers['Google Hybrid'] = L.gridLayer.googleMutant({type: 'hybrid'});
  baseLayers['Google Terrain'] = L.gridLayer.googleMutant({type: 'terrain'});

  return baseLayers;
}

/**
 * Creates and returns the default overlay layers for the map.
 * Sets up various overlay layers including portals, links, fields, and faction-specific layers.
 *
 * @function createDefaultOverlays
 * @returns {Object.<String, L.LayerGroup>} An object containing overlay layers for portals, links, fields, and factions
 */
function createDefaultOverlays() {
  /* eslint-disable dot-notation  */

  var addLayers = {};

  var l0Layer = new IITC.filters.FilterLayer({
    name: 'Unclaimed/Placeholder Portals',
    filter: [
      { portal: true, data: { team: 'N' } },
      { portal: true, data: { level: undefined } },
    ],
  });
  addLayers[l0Layer.options.name] = l0Layer;
  for (var i = 1; i <= 8; i++) {
    var t = 'Level ' + i + ' Portals';
    var portalsLayer = new IITC.filters.FilterLayer({
      name: t,
      filter: [
        { portal: true, data: { level: i, team: 'R' } },
        { portal: true, data: { level: i, team: 'E' } },
      ],
    });
    addLayers[t] = portalsLayer;
  }

  var fieldsLayer = new IITC.filters.FilterLayer({
    name: 'Fields',
    filter: { field: true },
  });
  addLayers[fieldsLayer.options.name] = fieldsLayer;

  var linksLayer = new IITC.filters.FilterLayer({
    name: 'Links',
    filter: { link: true },
  });
  addLayers[linksLayer.options.name] = linksLayer;

  // faction-specific layers
  var resistanceLayer = new IITC.filters.FilterLayer({
    name: window.TEAM_NAME_RES,
    filter: { portal: true, link: true, field: true, data: { team: 'R' } },
  });
  var enlightenedLayer = new IITC.filters.FilterLayer({
    name: window.TEAM_NAME_ENL,
    filter: { portal: true, link: true, field: true, data: { team: 'E' } },
  });
  var machinaLayer = new IITC.filters.FilterLayer({
    name: window.TEAM_NAME_MAC,
    filter: { portal: true, link: true, field: true, data: { team: 'M' } },
  });

  // to avoid any favouritism, we'll put the player's own faction layer first
  if (PLAYER.team === 'RESISTANCE') {
    addLayers[resistanceLayer.options.name] = resistanceLayer;
    addLayers[enlightenedLayer.options.name] = enlightenedLayer;
  } else {
    addLayers[enlightenedLayer.options.name] = enlightenedLayer;
    addLayers[resistanceLayer.options.name] = resistanceLayer;
  }

  // and just put __MACHINA__ faction last
  addLayers[window.TEAM_NAME_MAC] = machinaLayer;

  return addLayers;
  /* eslint-enable dot-notation  */
}

// to be extended in app.js (or by plugins: `setup.priority = 'boot';`)
window.mapOptions = {
  preferCanvas: 'PREFER_CANVAS' in window
    ? window.PREFER_CANVAS
    : true // default
};

/**
 * Initializes the Leaflet map and configures various map layers and event listeners.
 * This function is responsible for setting up the base map,
 * including the default basemap tiles (CartoDB, Default Ingress Map, Google Maps),
 * and configuring the map's properties such as center, zoom, bounds, and renderer options.
 * It also clears the 'Loading, please wait' message from the map container.
 *
 * Important functionalities:
 * - Adds dummy divs to Leaflet control areas to accommodate IITC UI elements.
 * - Creates and adds base layers and overlays to the map.
 * - Configures event listeners for map movements, including aborting pending requests and refreshing map data.
 * - Manages cookies for map position and zoom level.
 * - Handles the 'iitcLoaded' hook to set the initial map view and evaluate URL parameters for portal selection.
 *
 * @function setupMap
 */
window.setupMap = function () {
  setupCRS();

  $('#map').text(''); // clear 'Loading, please wait'

  var map = L.map('map', L.extend({
    // proper initial position is now delayed until all plugins are loaded and the base layer is set
    center: [0, 0],
    zoom: 1,
    crs: L.CRS.S2,
    minZoom: window.MIN_ZOOM,
    // zoomAnimation: false,
    markerZoomAnimation: false,
    bounceAtZoomLimits: false,
    maxBoundsViscosity: 0.7,
    worldCopyJump: true,
  }, window.mapOptions));
  var max_lat = map.options.crs.projection.MAX_LATITUDE;
  map.setMaxBounds([[max_lat, 360], [-max_lat, -360]]);

  L.Renderer.mergeOptions({
    padding: window.RENDERER_PADDING || 0.5
  });

  // add empty div to leaflet control areas - to force other leaflet controls to move around IITC UI elements
  // TODO? move the actual IITC DOM into the leaflet control areas, so dummy <div>s aren't needed
  if (!isSmartphone()) {
    // chat window area
    $('<div>').addClass('leaflet-control')
      .width(708).height(108)
      .css({
        'pointer-events': 'none',
        'margin': '0'
      }).appendTo(map._controlCorners.bottomleft);
  }
  var baseLayers = createDefaultBaseMapLayers();
  var overlays = createDefaultOverlays();

  var layerChooser = window.layerChooser = new window.LayerChooser(baseLayers, overlays, {map: map})
    .addTo(map);

  $.each(overlays, function (_, layer) {
    if (map.hasLayer(layer)) { return true; } // continue

    // as users often become confused if they accidentally switch a standard layer off, display a warning in this case
    $('#portaldetails')
      .html('<div class="layer_off_warning">'
         + '<p><b>Warning</b>: some of the standard layers are turned off. Some portals/links/fields will not be visible.</p>'
         + '<a id="enable_standard_layers">Enable standard layers</a>'
         + '</div>');
    $('#enable_standard_layers').on('click', function () {
      $.each(overlays, function (ind, overlay) {
        if (!map.hasLayer(overlay)) {
          map.addLayer(overlay);
        }
      });
      $('#portaldetails').html('');
    });
    return false; // break
  });

  map.attributionControl.setPrefix('');

  window.map = map;

  map.on('moveend', function () {
    var center = this.getCenter().wrap();
    window.writeCookie('ingress.intelmap.lat', center.lat);
    window.writeCookie('ingress.intelmap.lng', center.lng);
    window.writeCookie('ingress.intelmap.zoom', this.getZoom());
  });

  // map update status handling & update map hooks
  // ensures order of calls
  map.on('movestart', function () {
    window.requests.abort();
    window.startRefreshTimeout(-1);
  });
  map.on('moveend', function () {
    window.startRefreshTimeout(window.ON_MOVE_REFRESH * 1000);
  });

  // set a 'moveend' handler for the map to clear idle state. e.g. after mobile 'my location' is used.
  // possibly some cases when resizing desktop browser too
  map.on('moveend', window.idleReset);

  window.addResumeFunction(function () {
    window.startRefreshTimeout(window.ON_MOVE_REFRESH*1000);
  });

  // create the map data requester
  window.mapDataRequest = new window.MapDataRequest();
  window.mapDataRequest.start();

  // start the refresh process with a small timeout, so the first data request happens quickly
  // (the code originally called the request function directly, and triggered a normal delay for the next refresh.
  //  however, the moveend/zoomend gets triggered on map load, causing a duplicate refresh. this helps prevent that
  window.startRefreshTimeout(window.ON_MOVE_REFRESH*1000);

  // adds a base layer to the map. done separately from the above,
  // so that plugins that add base layers can be the default
  window.addHook('iitcLoaded', function () {
    var stored = layerChooser.getLayer(layerChooser.lastBaseLayerName);
    map.addLayer(stored || baseLayers['CartoDB Dark Matter']);

    // (setting an initial position, before a base layer is added, causes issues with leaflet) // todo check
    var pos = getPosition();
    if (!pos) {
      pos = {center: [0, 0], zoom: 1};
      map.locate({setView: true});
    }
    map.setView(pos.center, pos.zoom, {reset: true});

    // read here ONCE, so the URL is only evaluated one time after the
    // necessary data has been loaded.
    var pll = window.getURLParam('pll');
    if (pll) {
      pll = pll.split(',');
      window.urlPortalLL = normLL(pll[0], pll[1]).center;
    }
    window.urlPortal = window.getURLParam('pguid');

    // todo check
    // leaflet no longer ensures the base layer zoom is suitable for the map (a bug? feature change?), so do so here
    map.on('baselayerchange', function () {
      map.setZoom(map.getZoom());
    });
  });

  /* !!This block is commented out as it's unlikely that we still need this workaround in leaflet 1+
  // on zoomend, check to see the zoom level is an int, and reset the view if not
  // (there's a bug on mobile where zoom levels sometimes end up as fractional levels. this causes the base map to be invisible)
  map.on('zoomend', function() {
    var z = map.getZoom();
    if (z != parseInt(z))
    {
      log.warn('Non-integer zoom level at zoomend: '+z+' - trying to fix...');
      map.setZoom(parseInt(z), {animate:false});
    }
  });
  */

  /* !!This block is commented out as it's unlikely that we still need this workaround in leaflet 1+
  // Fix Leaflet: handle touchcancel events in Draggable
  L.Draggable.prototype._onDownOrig = L.Draggable.prototype._onDown;
  L.Draggable.prototype._onDown = function(e) {
    L.Draggable.prototype._onDownOrig.apply(this, arguments);

    if(e.type === "touchstart") {
      L.DomEvent.on(document, "touchcancel", this._onUp, this);
    }
  };
  */
};
