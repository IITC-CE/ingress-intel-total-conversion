// ==UserScript==
// @id             iitc-plugin-bing-maps
// @name           IITC plugin: Bing maps
// @category       Map Tiles
// @version        0.3.0.@@DATETIMEVERSION@@
// @description    [@@BUILDNAME@@-@@BUILDDATE@@] Add the maps.bing.com map layers.
@@METAINFO@@
// ==/UserScript==

@@PLUGINSTART@@

// PLUGIN START ////////////////////////////////////////////////////////

window.plugin.mapBing = function() {};

window.plugin.mapBing.setupBingLeaflet = function() {
@@INCLUDERAW:external/Bing.js@@
}

window.plugin.mapBing.setup = function() {
  window.plugin.mapBing.setupBingLeaflet();

  //set this to your API key
  var bingApiKey = 'ArR2hTa2C9cRQZT-RmgrDkfvh3PwEVRl0gB34OO4wJI7vQNElg3DDWvbo5lfUs3p';

  var bingTypes = {
    'Road': "Road",
    'Aerial': "Aerial",
    'AerialWithLabels': "Aerial with labels",
  };

  for (var type in bingTypes) {
    layerChooser.addBaseLayer(new L.BingLayer(bingApiKey, {
      type: type,
      maxNativeZoom: 19,
      maxZoom: 21
    }), 'Bing ' + bingTypes[type]);
  }
};

var setup = window.plugin.mapBing.setup;

// PLUGIN END //////////////////////////////////////////////////////////


@@PLUGINEND@@
