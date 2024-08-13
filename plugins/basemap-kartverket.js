// @author         johnd0e
// @name           Kartverket.no maps (Norway)
// @category       Map Tiles
// @version        0.3.0
// @description    Add Kartverket.no map layers.

/* exported setup, changelog --eslint */
/* global L, layerChooser */

var changelog = [
  {
    version: '0.3.0',
    changes: ['Migrated to new WMTS server due to deprecation of Statkart opencache'],
  },
  {
    version: '0.2.3',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var mapKartverket = {};

mapKartverket.setup = function () {

  L.TileLayer.Kartverket = L.TileLayer.extend({

    baseUrl: 'https://cache.kartverket.no/v1/wmts/1.0.0/' + '{layer}/default/webmercator/{z}/{y}/{x}.png',

    options: {
      maxNativeZoom: 18,
      attribution: '&copy; <a href="http://kartverket.no">Kartverket</a>',
    },

    mappings: {
      bakgrunnskart_forenklet: 'topograatone',
      egk: 'topo', // *1
      europa: 'topo', // *1
      havbunn_grunnkart: 'topo', // *1
      kartdata2: 'topo',
      matrikkel_bakgrunn: 'topo',
      matrikkel_bakgrunn2: 'topo',
      norges_grunnkart: 'topo',
      norges_grunnkart_graatone: 'topograatone',
      norgeskart_bakgrunn: 'topo',
      sjo_hovedkart2: 'topo', // *1
      sjokartraster: 'topo', // *1
      terreng_norgeskart: 'topo',
      toporaster3: 'toporaster',
      topo2: 'topo',
      topo4: 'topo',
      topo2graatone: 'topograatone',
      topo4graatone: 'topograatone',
      // *1 = This layer is not provided on cache.kartverket.no.
    },

    layers: {
      topo: 'Kartverket Topo (farger)',
      topograatone: 'Kartverket Topo (gråtone)',
      toporaster: 'Kartverket Topo (raster)',
    },

    initialize: function (layer, options) {
      if (typeof this.layers[layer] === 'undefined') {
        if (this.mappings[layer]) {
          layer = this.mappings[layer];
        } else {
          throw new Error('Unknown layer "' + layer + '"');
        }
      }

      L.TileLayer.prototype.initialize.call(this, this.baseUrl, options);
      this.options.layer = layer;
      this._name = this.layers[layer] || layer;
    }

  });

  L.tileLayer.kartverket = function (layer, options) {
    return new L.TileLayer.Kartverket(layer, options);
  };

  L.tileLayer.kartverket.getLayers = function () {
    return L.extend({},L.TileLayer.Kartverket.prototype.layers);
  };

  var l, layer;
  for (layer in L.tileLayer.kartverket.getLayers()) {
    l = L.tileLayer.kartverket(layer);
    layerChooser.addBaseLayer(l, l._name);
  }
};

function setup() {
  mapKartverket.setup();
}
