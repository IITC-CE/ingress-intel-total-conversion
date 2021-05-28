// @author         johnd0e
// @name           Yandex maps
// @category       Map Tiles
// @version        0.3.0
// @description    Add Yandex.com (Russian/Русский) map layers


// use own namespace for plugin
var mapYandex = {};
// window.plugin.mapYandex = mapYandex;

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
    '@include_raw:external/Yandex.js@';

    '@include_raw:external/Yandex.addon.LoadApi.js@';
    
    } catch (e) {
      console.error('Yandex.js loading failed');
      throw e;
    }
}
