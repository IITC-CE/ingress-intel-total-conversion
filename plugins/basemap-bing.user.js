// ==UserScript==
// @id             iitc-plugin-bing-maps
// @name           IITC plugin: Bing maps
// @category       Map Tiles
// @version        0.3.0.@@DATETIMEVERSION@@
// @description    [@@BUILDNAME@@-@@BUILDDATE@@] Add the bing.com map layers.
@@METAINFO@@
// ==/UserScript==

@@PLUGINSTART@@

// PLUGIN START ////////////////////////////////////////////////////////

var mapBing = {};
window.plugin.mapBing = mapBing;

mapBing.sets = {
  Road: {
    type: 'RoadOnDemand'
  },
  Dark: {
    type: 'CanvasDark'
  },
  Aerial: {
    maxNativeZoom: 19,
    type: 'Aerial'
  },
  Hybrid: {
    maxNativeZoom: 19,
    type: 'AerialWithLabelsOnDemand'
  }
};

mapBing.options = {
  minZoom: 1,
  maxZoom: 21,
  //set this to your API key
  key: 'ArR2hTa2C9cRQZT-RmgrDkfvh3PwEVRl0gB34OO4wJI7vQNElg3DDWvbo5lfUs3p'
}

function setup () {
  setupBingLeaflet();

  for (var name in mapBing.sets) {
    var options = L.extend({}, mapBing.options, mapBing.sets[name]);
    layerChooser.addBaseLayer(L.bingLayer(options.key, options), 'Bing ' + name);
  }
};

function setupBingLeaflet () {
  try {
    // https://github.com/shramov/leaflet-plugins/blob/master/layer/tile/Bing.js
    @@INCLUDERAW:external/Bing.js@@

    } catch (e) {
      console.error('Bing.js loading failed');
      throw e;
    }
}

// PLUGIN END //////////////////////////////////////////////////////////

@@PLUGINEND@@
