// @author         johnd0e
// @name           Yandex maps
// @category       Map Tiles
// @version        0.3.5
// @description    Add Yandex.com (Russian/Русский) map layers

/* exported setup, changelog --eslint */
/* global IITC, L -- eslint */

var changelog = [
  {
    version: '0.3.5',
    changes: ['Report the layer as light or dark for theme switching'],
  },
  {
    version: '0.3.4',
    changes: ['Refactoring: fix eslint'],
  },
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
    type: 'map',
    isDark: false,
  },
  satellite: {
    type: 'satellite',
    isDark: true,
  },
  hybrid: {
    type: 'hybrid',
    isDark: true,
  },
};

function setup() {
  IITC.options.extend('api-keys', 'basemap-yandex', {
    title: 'Yandex Maps',
    namespace: 'api-keys',
    blocks: [
      {
        type: 'string',
        key: 'yandex',
        title: 'API key',
        description:
          'For the Yandex layers, a key of the JavaScript API. The layers load without it, though the terms of Yandex ask for one. A new key applies after IITC reloads',
      },
      { type: 'link', title: 'Get a key', url: 'https://developer.tech.yandex.ru/services' },
    ],
  });
  setupYandexLeaflet();

  // the API script loads once, with the parameters of the first layer: the key of the user when there is one,
  // as the API loads without a key too
  const apikey = IITC.options.get('api-keys.yandex').trim();
  const apiParams = apikey ? { apikey } : {};
  for (var name in mapYandex.types) {
    var options = L.extend({ apiParams }, mapYandex.types[name]);
    window.layerChooser.addBaseLayer(L.yandex(options), 'Yandex ' + name, { isDark: options.isDark });
  }
}

function setupYandexLeaflet() {
  try {
    // https://github.com/shramov/leaflet-plugins/blob/master/layer/tile/Yandex.js
    '@include_raw:external/Yandex.js@'; // eslint-disable-line

    '@include_raw:external/Yandex.addon.LoadApi.js@'; // eslint-disable-line

  } catch (e) {
    console.error('Yandex.js loading failed');
    throw e;
  }
}
