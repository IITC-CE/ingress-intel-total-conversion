// @author         johnd0e
// @name           Yandex maps
// @category       Map Tiles
// @version        0.3.3
// @description    Add Yandex.com (Russian/Русский) map layers

/* exported setup, changelog --eslint */
/* global L, layerChooser */

var changelog = [
  {
    version: '0.3.3',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.3.2',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var mapYandex = {};

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
  // set this to your API key
  apiParams: '<your API-key>'
};

function setup() {
  setupYandexLeaflet();

  for (var name in mapYandex.types) {
    var options = L.extend({}, mapYandex.options, mapYandex.types[name]);
    layerChooser.addBaseLayer(L.yandex(options), 'Yandex ' + name);
  }
}

function setupYandexLeaflet () {

  try {
    // https://github.com/shramov/leaflet-plugins/blob/master/layer/tile/Yandex.js
    '@include_raw:external/Yandex.js@'; // eslint-disable-line

    '@include_raw:external/Yandex.addon.LoadApi.js@'; // eslint-disable-line

  } catch (e) {
    console.error('Yandex.js loading failed');
    throw e;
  }
}
