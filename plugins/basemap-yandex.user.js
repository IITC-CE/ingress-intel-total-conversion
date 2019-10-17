// ==UserScript==
// @id             iitc-plugin-basemap-yandex@jonatkins
// @name           IITC plugin: Yandex maps
// @category       Map Tiles
// @version        0.3.0.@@DATETIMEVERSION@@
// @description    [@@BUILDNAME@@-@@BUILDDATE@@] Add Yandex.com (Russian/Русский) map layers
@@METAINFO@@
// ==/UserScript==

@@PLUGINSTART@@

// PLUGIN START ////////////////////////////////////////////////////////


// use own namespace for plugin
var mapYandex = {};
window.plugin.mapYandex = mapYandex;

mapYandex.types = {
  map: {
    type: 'map'
  },
  satellite: {
    type: 'satellite'
  },
  hybrid: {
    type: 'hybrid'
  },
};

mapYandex.options = {
  //set this to your API key
  apiParams: '<your API-key>'
};

function setup () {
  setupYandexLeaflet();

  for (var name in mapYandex.types) {
    var options = L.extend({}, mapYandex.options, mapYandex.types[name]);
    layerChooser.addBaseLayer(L.yandex(options), 'Yandex ' + name);
  }
};

function setupYandexLeaflet () {

  try {
    // https://github.com/shramov/leaflet-plugins/blob/master/layer/tile/Yandex.js
    @@INCLUDERAW:external/Yandex.js@@

    @@INCLUDERAW:external/Yandex.addon.LoadApi.js@@
    
    } catch (e) {
      console.error('Yandex.js loading failed');
      throw e;
    }
}

// PLUGIN END //////////////////////////////////////////////////////////

@@PLUGINEND@@
