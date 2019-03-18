// ==UserScript==
// @id             iitc-plugin-pan-control@fragger
// @name           IITC plugin: Pan control
// @category       Controls
// @version        0.2.0.@@DATETIMEVERSION@@
// @description    [@@BUILDNAME@@-@@BUILDDATE@@] Show a panning control on the map.
@@METAINFO@@
// ==/UserScript==

@@PLUGINSTART@@

// PLUGIN START ////////////////////////////////////////////////////////

// use own namespace for plugin
var panControl = {};
window.plugin.panControl = panControl;

panControl.options = {
  //position: 'topleft',
  //panOffset: 350
};

function setup () {
  loadLeafletPancontrol();

  var map = window.map;
  panControl.control = L.control.pan(panControl.options).addTo(map);

  if (map.zoomControl._map) {
    map.zoomControl.setPosition(panControl.options.position || 'topleft'); // Move above the zoom control
  }

  // L.Control.Pan.css tries to align zoom control with the pan control, but the result sucks
  // so here is our attempt to make it better
  // (adapted from https://github.com/kartena/Leaflet.Pancontrol/pull/20)
  $('<style>').html('\
    .leaflet-left.has-leaflet-pan-control .leaflet-control-zoom,\
    .leaflet-left.has-leaflet-pan-control .leaflet-control-zoomslider { left: unset; }\
    .leaflet-left.has-leaflet-pan-control .leaflet-control-scale { left: -24.5px; }\
    .leaflet-left.has-leaflet-pan-control { left: 24.5px; }\
    .leaflet-left .leaflet-control-pan { left: -24.5px; }\
    .leaflet-control-pan { width: 75px; height: 75px; }\
    .leaflet-touch .leaflet-left.has-leaflet-pan-control { left: 26px; }\
    .leaflet-touch .leaflet-left .leaflet-control-pan { left: -26px; }\
    .leaflet-touch .leaflet-control-pan { width: 86px; height: 114px; }\
    .leaflet-touch .leaflet-left .leaflet-control-pan { margin-left: 10px; }\
  ').appendTo('head');
}

function loadLeafletPancontrol () {
  try {
    // https://github.com/kartena/Leaflet.Pancontrol
    @@INCLUDERAW:external/L.Control.Pan.js@@
    $('<style>').html('@@INCLUDECSS:external/L.Control.Pan.css@@').appendTo('head');

  } catch (e) {
    console.error('L.Control.Pan.js loading failed');
    throw e;
  }
}
// PLUGIN END //////////////////////////////////////////////////////////

@@PLUGINEND@@
