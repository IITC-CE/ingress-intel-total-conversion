// ==UserScript==
// @id             iitc-plugin-minimap@breunigs
// @name           IITC plugin: Mini map
// @category       Controls
// @version        0.3.0.@@DATETIMEVERSION@@
// @description    [@@BUILDNAME@@-@@BUILDDATE@@] Show a mini map on the corner of the map.
@@METAINFO@@
// ==/UserScript==

@@PLUGINSTART@@

// PLUGIN START ////////////////////////////////////////////////////////

// use own namespace for plugin
var miniMap = {};
window.plugin.miniMap = miniMap;

miniMap.options = {
  // desktop mode - bottom-left, so it doesn't clash with the sidebar
  // mobile mode - bottom-right - so it floats above the map copyright text
  position: window.isSmartphone() ? 'bottomright' : 'bottomleft',
  toggleDisplay: true

  // more: https://github.com/Norkart/Leaflet-MiniMap#available-options
};

// miniMap.baselayer = ... // could be customized

function setup () {
  loadLeafletMiniMap();

  // hide attribution
  $('<style>').html('div.gm-style .gmnoprint, div.gm-style img { display: none; }').appendTo('head');

  window.addHook('iitcLoaded', function () { // delay minimap initialization in order to let customization by other plugins

    // we can't use the same TileLayer as the main map uses - it causes issues.
    // stick with the Google tiles for now
    miniMap.baselayer = miniMap.baselayer || L.gridLayer.googleMutant({ type: 'roadmap', maxZoom: 21 });
    miniMap.control = new L.Control.MiniMap(miniMap.baselayer, miniMap.options).addTo(window.map);
  });
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
