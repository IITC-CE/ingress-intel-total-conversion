// ==UserScript==
// @id             iitc-plugin-minimap@breunigs
// @name           IITC plugin: Mini map
// @category       Controls
// @version        0.4.0.@@DATETIMEVERSION@@
// @description    [@@BUILDNAME@@-@@BUILDDATE@@] Show a mini map on the corner of the map.
@@METAINFO@@
// ==/UserScript==

@@PLUGINSTART@@

// PLUGIN START ////////////////////////////////////////////////////////

// use own namespace for plugin
var miniMap = {};
window.plugin.miniMap = miniMap;

miniMap.options = {
  toggleDisplay: true,
  mapOptions: {}
  // more: https://github.com/Norkart/Leaflet-MiniMap#available-options
};

// by default minimap follows main map baselayer changes
miniMap.clonebasemap = true;

// it's possible to set special mappings for particular layers
// 'map':'minimap'
miniMap.layers = {
  // 'CartoDB Dark Matter': 'Google Default Ingress Map',
  // 'Google Default Ingress Map': 'Google Default Ingress Map',

  // 'CartoDB Positron': '', // any false value means reference to 'default'

  default: 'Google Roads' // used also as fallback when some basemap layer is unknown or unsupported

};
// it's also possible to directly set any L.Layer instance:
// plugin.miniMap.layers.default = L.gridLayer.googleMutant({type:'roadmap', maxZoom: 21});

function clone (layer) {
  // N.B.: vector layers (CircleMarker, Polyline etc) may contain nested objects in options (such as Renderer)
  //       so we may need to add options cloning in order to support them
  var options = layer.options;
  if (L.BingLayer && layer instanceof L.BingLayer) {
    options.minZoom = options.minZoom || 1;
    return L.bingLayer(layer._key, options);
  } else if (L.Yandex && layer instanceof L.Yandex) {
    return new L.Yandex(layer._type, options);
  } else if (layer instanceof L.TileLayer) {
    return L.tileLayer(layer._url, options);
  } else if (L.GridLayer.GoogleMutant && layer instanceof L.GridLayer.GoogleMutant) {
    var gm = L.gridLayer.googleMutant(options);
    layer._GAPIPromise.then(function () {
      for (var name in layer._subLayers) { gm.addGoogleLayer(name); }
    });
    return gm;
  } else if (layer instanceof L.LayerGroup) {
    var layers = layer.getLayers();
    if (layers.length === 0) { return; }
    if (layers.length === 1) { return clone(layers[0]); } // unwrap layerGroup if it contains only 1 layer (e.g. Bing)
    var group = L.layerGroup();
    for (var l in layers) {
      var cloned = clone(layers[l]);
      if (!cloned) { return; }
      group.addLayer(cloned);
    }
    return group;
  }
}

var map, layerChooser;

function find (arr, callback) { // ES5 doesn't include Array.prototype.find()
  for (var i=0; i<arr.length; i++) {
    if (callback(arr[i], i, arr)) { return arr[i]; }
  }
}

function getMapping (name) {
  if (name in miniMap.layers) {
    return miniMap.layers[name] || miniMap.layers.default;
  }
}

var cache = {};
function getLayer (e) {
  var mapped = getMapping(e.name) ||
      !miniMap.clonebasemap && miniMap.layers.default;
  if (mapped) {
    if (mapped instanceof L.Layer) { return mapped; } // no need to cache
    e = { name: mapped };
  }
  var layer = cache[e.name];
  if (!layer) {
    if (mapped) {
      e = find(layerChooser._layers, function (el) {
        return el.name === mapped;
      });
      if (!e) { return; }
    }
    layer = clone(e.layer);
    cache[e.name] = layer;
  }
  return layer;
}

function getLayerSafe (e) {
  return getLayer(e) || getLayer({ name: 'default' }) || getLayer(layerChooser._layers[0]);
}

function setup () {
  loadLeafletMiniMap();

  map = window.map; layerChooser = window.layerChooser;

  // mobile mode  - bottom-right (default)
  // desktop mode - bottom-left, so it doesn't clash with the sidebar
  if (!window.isSmartphone()) {
    miniMap.options.position = miniMap.options.position || 'bottomleft';
  }

  miniMap.layers.default = miniMap.layers.default || 'unset';

  var baseLayer = find(layerChooser._layers, function (el) {
    return !el.overlay && map.hasLayer(el.layer);
  });
  var current = baseLayer ? getLayerSafe(baseLayer) : L.layerGroup();
  miniMap.control = L.control.minimap(current, miniMap.options).addTo(map);

  map.on('baselayerchange', function (e) {
    if (!map.hasLayer(e.layer)) { return; } // event may come not from main map (todo: debug)
    var layer = getLayerSafe(e);
    if (layer && layer !== current) {
      miniMap.control.changeLayer(layer);
      current = layer;
    }
  });

  if (!miniMap.options.mapOptions.attributionControl) { // hide attribution
    $('<style>').html(
      'div.gm-style .gmnoprint, div.gm-style img,'      // google
    + 'ymaps[class$="-copyrights-pane"], ymaps iframe'  // yandex
    + '  { display: none }'
    ).appendTo('head');
  }
}

function loadLeafletMiniMap () {
  try {
    // https://github.com/Norkart/Leaflet-MiniMap
    @@INCLUDERAW:external/Control.MiniMap.js@@
    $('<style>').html('@@INCLUDECSS:external/Control.MiniMap.css@@').appendTo('head');

  } catch (e) {
    console.error('Control.MiniMap.js loading failed');
    throw e;
  }
}

// PLUGIN END //////////////////////////////////////////////////////////

@@PLUGINEND@@
