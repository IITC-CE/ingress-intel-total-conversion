/* global IITC, L, log -- eslint */

/**
 * Namespace for the Leaflet map: setup, map options and the live map data request instance.
 *
 * @memberof IITC
 * @namespace map
 */
IITC.map = {};

/**
 * Warning shown in the portal details panel when some standard layers are turned off
 * @type {String}
 * @memberof IITC.map
 */
IITC.map.layerOffWarningTemplate =
  '<div class="layer_off_warning">' +
  '<p><b>Warning</b>: some of the standard layers are turned off. Some portals/links/fields will not be visible.</p>' +
  '<a id="enable_standard_layers">Enable standard layers</a>' +
  '</div>';

/**
 * Attribution string for the OpenStreetMap/CartoDB base layers
 * @type {String}
 * @memberof IITC.map
 */
IITC.map.osmAttributionTemplate =
  '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>';

function setupCRS() {
  // use the earth radius value from s2 geometry library
  // https://github.com/google/s2-geometry-library-java/blob/c28f287b996c0cedc5516a0426fbd49f6c9611ec/src/com/google/common/geometry/S2LatLng.java#L31
  const EARTH_RADIUS_METERS = 6367000.0;
  // distance calculations with that constant are a little closer to values observable in Ingress client.
  // difference is:
  // - ~0.06% when using LatLng.distanceTo() (R is 6371 vs 6367)
  // - ~0.17% when using Map.distance() / CRS.destance() (R is 6378.137 vs 6367)
  // (Yes, Leaflet is not consistent here, e.g. see https://github.com/Leaflet/Leaflet/pull/6928)

  // this affects LatLng.distanceTo(), which is currently used in most iitc plugins
  L.CRS.Earth.R = EARTH_RADIUS_METERS;

  // this affects Map.distance(), which is known to be used in draw-tools
  const SphericalMercator = L.Projection.SphericalMercator;
  SphericalMercator.S2 = L.extend({}, SphericalMercator, {
    R: EARTH_RADIUS_METERS,
    bounds: (function () {
      const d = EARTH_RADIUS_METERS * Math.PI;
      return L.bounds([-d, -d], [d, d]);
    })(),
  });

  L.CRS.S2 = L.extend({}, L.CRS.Earth, {
    code: 'Ingress',
    projection: SphericalMercator.S2,
    transformation: (function () {
      const scale = 0.5 / (Math.PI * SphericalMercator.S2.R);
      return L.transformation(scale, 0.5, -scale, 0.5);
    })(),
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
function normLL(lat, lng, zoom) {
  return {
    center: [parseFloat(lat) || 0, parseFloat(lng) || 0],
    zoom: parseInt(zoom) || window.DEFAULT_ZOOM,
  };
}

/**
 * Retrieves the last known map position from the URL parameters or cookies.
 * Prioritizes URL parameters over cookies. Extracts and normalizes the latitude, longitude, and zoom level.
 *
 * @function getPosition
 * @returns {Object} An object containing the map's position and zoom level, or undefined if not found.
 */
function getPosition() {
  const url = window.getURLParam;

  const zoom = url('z');
  const latE6 = url('latE6');
  const lngE6 = url('lngE6');
  if (latE6 && lngE6) {
    log.log('mappos: reading email URL params');
    return normLL(parseInt(latE6) / 1e6, parseInt(lngE6) / 1e6, zoom);
  }

  let ll = url('ll') || url('pll');
  if (ll) {
    log.log('mappos: reading stock Intel URL params');
    ll = ll.split(',');
    return normLL(ll[0], ll[1], zoom);
  }

  const lat = window.readCookie('ingress.intelmap.lat');
  const lng = window.readCookie('ingress.intelmap.lng');
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
function createDefaultBaseMapLayers() {
  const baseLayers = {};

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
  const cartoAttr = IITC.map.osmAttributionTemplate;
  const cartoUrl = 'https://{s}.basemaps.cartocdn.com/{theme}/{z}/{x}/{y}.png';
  baseLayers['CartoDB Dark Matter'] = L.tileLayer(cartoUrl, { attribution: cartoAttr, theme: 'dark_all', isDark: true });
  baseLayers['CartoDB Positron'] = L.tileLayer(cartoUrl, { attribution: cartoAttr, theme: 'light_all', isDark: false });

  // Google Maps - including ingress default (using the stock-intel API-key)
  baseLayers['Google Default Ingress Map'] = new L.GridLayer.GoogleMutant({
    type: 'roadmap',
    isDark: true,
    backgroundColor: '#0e3d4e',
    styles: [
      { featureType: 'all', elementType: 'all', stylers: [{ visibility: 'on' }, { hue: '#131c1c' }, { saturation: '-50' }, { invert_lightness: true }] },
      { featureType: 'water', elementType: 'all', stylers: [{ visibility: 'on' }, { hue: '#005eff' }, { invert_lightness: true }] },
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', elementType: 'all', stylers: [{ visibility: 'off' }] },
      { featureType: 'road', elementType: 'labels.icon', stylers: [{ invert_lightness: !0 }] },
    ],
  });
  baseLayers['Google Roads'] = new L.GridLayer.GoogleMutant({ type: 'roadmap', isDark: false });
  const trafficMutant = new L.GridLayer.GoogleMutant({ type: 'roadmap', isDark: false });
  trafficMutant.addGoogleLayer('TrafficLayer');
  baseLayers['Google Roads + Traffic'] = trafficMutant;
  const transitMutant = new L.GridLayer.GoogleMutant({ type: 'roadmap', isDark: false });
  transitMutant.addGoogleLayer('TransitLayer');
  baseLayers['Google Roads + Transit'] = transitMutant;
  baseLayers['Google Satellite'] = new L.GridLayer.GoogleMutant({ type: 'satellite', isDark: true });
  baseLayers['Google Hybrid'] = new L.GridLayer.GoogleMutant({ type: 'hybrid', isDark: true });
  baseLayers['Google Terrain'] = new L.GridLayer.GoogleMutant({ type: 'terrain', isDark: false });

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
  const addLayers = {};

  const l0Layer = new IITC.filters.FilterLayer({
    name: 'Unclaimed/Placeholder Portals',
    filter: [
      { portal: true, data: { team: 'N' } },
      { portal: true, data: { level: undefined } },
    ],
  });
  addLayers[l0Layer.options.name] = l0Layer;
  for (let i = 1; i <= 8; i++) {
    const t = `Level ${i} Portals`;
    const portalsLayer = new IITC.filters.FilterLayer({
      name: t,
      filter: [
        { portal: true, data: { level: i, team: 'R' } },
        { portal: true, data: { level: i, team: 'E' } },
        { portal: true, data: { level: i, team: 'M' } },
      ],
    });
    addLayers[t] = portalsLayer;
  }

  const fieldsLayer = new IITC.filters.FilterLayer({
    name: 'Fields',
    filter: { field: true },
  });
  addLayers[fieldsLayer.options.name] = fieldsLayer;

  const linksLayer = new IITC.filters.FilterLayer({
    name: 'Links',
    filter: { link: true },
  });
  addLayers[linksLayer.options.name] = linksLayer;

  // faction-specific layers
  const resistanceLayer = new IITC.filters.FilterLayer({
    name: window.TEAM_NAME_RES,
    filter: { portal: true, link: true, field: true, data: { team: 'R' } },
  });
  const enlightenedLayer = new IITC.filters.FilterLayer({
    name: window.TEAM_NAME_ENL,
    filter: { portal: true, link: true, field: true, data: { team: 'E' } },
  });
  const machinaLayer = new IITC.filters.FilterLayer({
    name: window.TEAM_NAME_MAC,
    filter: { portal: true, link: true, field: true, data: { team: 'M' } },
  });

  // to avoid any favouritism, we'll put the player's own faction layer first
  if (window.PLAYER.team === 'RESISTANCE') {
    addLayers[resistanceLayer.options.name] = resistanceLayer;
    addLayers[enlightenedLayer.options.name] = enlightenedLayer;
  } else {
    addLayers[enlightenedLayer.options.name] = enlightenedLayer;
    addLayers[resistanceLayer.options.name] = resistanceLayer;
  }

  // and just put __MACHINA__ faction last
  addLayers[window.TEAM_NAME_MAC] = machinaLayer;

  return addLayers;
}

// to be extended in app.js (or by plugins: `setup.priority = 'boot';`)
IITC.map.options = {
  preferCanvas: 'PREFER_CANVAS' in window ? window.PREFER_CANVAS : true, // default is TRUE
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
 * @memberof IITC.map
 */
IITC.map.setup = function () {
  setupCRS();

  document.getElementById('map').textContent = ''; // clear 'Loading, please wait'

  const map = L.map(
    'map',
    L.extend(
      {
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
      },
      IITC.map.options
    )
  );
  const max_lat = map.options.crs.projection.MAX_LATITUDE;
  map.setMaxBounds([
    [max_lat, 360],
    [-max_lat, -360],
  ]);

  L.Renderer.mergeOptions({
    padding: window.RENDERER_PADDING || 0.5,
  });

  // add empty div to leaflet control areas - to force other leaflet controls to move around IITC UI elements
  // TODO? move the actual IITC DOM into the leaflet control areas, so dummy <div>s aren't needed
  if (!window.isSmartphone()) {
    // chat window area
    const chatControlArea = document.createElement('div');
    chatControlArea.className = 'leaflet-control';
    chatControlArea.style.width = '708px';
    chatControlArea.style.height = '108px';
    chatControlArea.style.pointerEvents = 'none';
    chatControlArea.style.margin = '0';
    map._controlCorners.bottomleft.appendChild(chatControlArea);
  }
  const baseLayers = createDefaultBaseMapLayers();
  const overlays = createDefaultOverlays();

  const layerChooser = (window.layerChooser = new window.LayerChooser(baseLayers, overlays, { map: map }).addTo(map));

  // as users often become confused if they accidentally switch a standard layer off, display a warning in this case
  const someStandardLayerOff = Object.values(overlays).some((layer) => !map.hasLayer(layer));
  if (someStandardLayerOff) {
    const portalDetails = document.getElementById('portaldetails');
    portalDetails.innerHTML = IITC.map.layerOffWarningTemplate;
    document.getElementById('enable_standard_layers').addEventListener('click', function () {
      Object.values(overlays).forEach((overlay) => {
        if (!map.hasLayer(overlay)) {
          map.addLayer(overlay);
        }
      });
      portalDetails.innerHTML = '';
    });
  }

  map.attributionControl.setPrefix('');

  /**
   * Override default Google Maps attribution to use Leaflet's native attribution control
   * instead of creating separate DOM elements. Extracts text content from Google's
   * attribution container and adds it to Leaflet's control.
   */
  L.GridLayer.GoogleMutant.prototype._setupAttribution = function (ev) {
    if (!this._map?.attributionControl) {
      return;
    }
    // eslint-disable-next-line
    const pos = google.maps.ControlPosition;
    const container = ev.positions.get(pos.BOTTOM_RIGHT);
    const attribution = container?.querySelector('span')?.textContent;
    if (attribution) {
      this._attributionText = attribution; // Сохраняем текст атрибуции
      this._map.attributionControl.addAttribution(attribution);
    }
  };
  const originalGoogleMutantOnRemove = L.GridLayer.GoogleMutant.prototype.onRemove;
  L.GridLayer.GoogleMutant.prototype.onRemove = function (map) {
    originalGoogleMutantOnRemove.call(this, map);
    if (this._attributionText && map.attributionControl) {
      map.attributionControl.removeAttribution(this._attributionText);
    }
  };

  window.map = map;

  map.on('moveend', function () {
    const center = this.getCenter().wrap();
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
    window.startRefreshTimeout(window.ON_MOVE_REFRESH * 1000);
  });

  // create the map data requester
  IITC.map.request = new IITC.map.Request();

  // start the refresh process with a small timeout, so the first data request happens quickly
  // (the code originally called the request function directly, and triggered a normal delay for the next refresh.
  //  however, the moveend/zoomend gets triggered on map load, causing a duplicate refresh. this helps prevent that
  window.startRefreshTimeout(window.ON_MOVE_REFRESH * 1000);

  // adds a base layer to the map. done separately from the above,
  // so that plugins that add base layers can be the default
  window.addHook('iitcLoaded', function () {
    const stored = layerChooser.getLayer(layerChooser.lastBaseLayerName);
    map.addLayer(stored || baseLayers['CartoDB Dark Matter']);

    // (setting an initial position, before a base layer is added, causes issues with leaflet) // todo check
    let pos = getPosition();
    if (!pos) {
      pos = { center: [0, 0], zoom: 1 };
      map.locate({ setView: true });
    }
    map.setView(pos.center, pos.zoom, { reset: true });

    parseURLParameters();

    // todo check
    // leaflet no longer ensures the base layer zoom is suitable for the map (a bug? feature change?), so do so here
    map.on('baselayerchange', function () {
      map.setZoom(map.getZoom());
      layerChooser.notifyBaseLayerChange();
    });

    // also fire for the initial base layer
    layerChooser.notifyBaseLayerChange();

    // Start map refresh (after Map location is set)
    IITC.map.request.start();
  });
};

const parseURLParameters = () => {
  // read here ONCE, so the URL is only evaluated one time after the
  // necessary data has been loaded.
  let pll = window.getURLParam('pll');
  if (pll) {
    pll = pll.split(',');
    const center = normLL(pll[0], pll[1]).center;
    const latLng = new L.LatLng(center[0], center[1]);
    IITC.portal.selectWhenLoadedByLatLng(latLng);
  }

  const urlPGuid = window.getURLParam('pguid');
  if (urlPGuid) {
    IITC.portal.selectWhenLoadedByGuid(urlPGuid);
  }
};

IITC.registerLegacyAliases(IITC.map, {
  setupMap: 'setup',
  mapOptions: 'options',
  mapDataRequest: 'request',
});
