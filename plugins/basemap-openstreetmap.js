// @author         jonatkins
// @name           OpenStreetMap.org map
// @category       Map Tiles
// @version        0.1.2
// @description    Add the native OpenStreetMap.org map tiles as an optional layer.

/* exported setup, changelog --eslint */
/* global L, layerChooser */

// use own namespace for plugin
var mapOpenStreetMap = {};
window.plugin.mapOpenStreetMap = mapOpenStreetMap;

var changelog = [
  {
    version: '0.1.3',
    changes: ['Update OSM tile provider', 'Add CyclOSM tiles', 'Expose config'],
  },
];

// https://wiki.openstreetmap.org/wiki/Raster_tile_providers

// Common options
var osmOpt = {
  attribution: 'Map data © OpenStreetMap contributors',
  maxNativeZoom: 18,
  maxZoom: 21,
};

mapOpenStreetMap.LAYERS = [
  {
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: Object.assign({}, osmOpt),
  },
  {
    name: 'Humanitarian',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    options: Object.assign({}, osmOpt),
  },
  {
    name: 'CyclOSM',
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    options: Object.assign({}, osmOpt),
  },
];

function setup() {
  // OpenStreetMap tiles - we shouldn't use these by default - https://wiki.openstreetmap.org/wiki/Tile_usage_policy
  // "Heavy use (e.g. distributing an app that uses tiles from openstreetmap.org) is forbidden without prior permission from the System Administrators"

  for (var entry of mapOpenStreetMap.LAYERS) {
    var layer = new L.TileLayer(entry.url, entry.options);
    layerChooser.addBaseLayer(layer, entry.name);
  }
}
