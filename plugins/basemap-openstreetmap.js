// @author         jonatkins
// @name           OpenStreetMap.org map
// @category       Map Tiles
// @version        0.1.2
// @description    Add the native OpenStreetMap.org map tiles as an optional layer.

/* exported setup, changelog --eslint */
/* global L, layerChooser */

// use own namespace for plugin
var mapOpenStreetMap = {};

var changelog = [
  {
    version: '0.1.3',
    changes: ['Update OSM tile provider', 'Add CyclOSM tiles'],
  },
];

mapOpenStreetMap.addLayer = function () {
  // OpenStreetMap tiles - we shouldn't use these by default - https://wiki.openstreetmap.org/wiki/Tile_usage_policy
  // "Heavy use (e.g. distributing an app that uses tiles from openstreetmap.org) is forbidden without prior permission from the System Administrators"

  var osmOpt = {
    attribution: 'Map data © OpenStreetMap contributors',
    maxNativeZoom: 18,
    maxZoom: 21,
  };

  var layers = {
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png': 'OpenStreetMap',
    'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png': 'Humanitarian',
    'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png': 'CyclOSM',
  };

  for (var url in layers) {
    var layer = new L.TileLayer(url, osmOpt);
    layerChooser.addBaseLayer(layer, layers[url]);
  }
};

function setup() {
  mapOpenStreetMap.addLayer();
}
