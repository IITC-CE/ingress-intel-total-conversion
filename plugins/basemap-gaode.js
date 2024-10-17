// @author         johnd0e
// @name           Gaode (高德地图) / AutoNavi map
// @category       Map Tiles
// @version        0.1.3
// @description    Map layers from AutoNavi / Gaode (高德地图)

/* exported setup, changelog --eslint */
/* global L, layerChooser */

var changelog = [
  {
    version: '0.1.3',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.1.2',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var mapGaode = {};

mapGaode.setup = function () {
  // sample tile: https://webrd01.is.autonavi.com/appmaptile?style=8&x=13720&y=6693&z=14&lang=zh_cn

  var baseUrl = [
    'https://wprd0{s}.is.autonavi.com/appmaptile?style={style}&x={x}&y={y}&z={z}',
    'https://webrd0{s}.is.autonavi.com/appmaptile?style={style}&x={x}&y={y}&z={z}&size=1&scale=1',
    'https://webst0{s}.is.autonavi.com/appmaptile?style={style}&x={x}&y={y}&z={z}', // same as wprd0
  ];

  var GaodeLayer = L.TileLayer.extend({
    options: {
      subdomains: '1234',
      minZoom: 3,
      maxZoom: 20,
      maxNativeZoom: 18,
      // detectRetina: true,
      type: 'roads',
      attribution: '© AutoNavi',
      needFixChinaOffset: true // depends on fix-china-map-offset plugin
    },
    initialize: function (options) {
      function expand (field) {
        return options[field]
          ? '&' + field + '=' + options[field]
          : '';
      }
      var extra = expand('lang');
      extra += expand('scl');
      var url = baseUrl[options.site || 0] + extra;
      L.TileLayer.prototype.initialize.call(this, url, options);
    }
  });

  var trafficUrl = 'https://tm.amap.com/trafficengine/mapabc/traffictile?v=1.0&;t=1&z={z}&y={y}&x={x}&t={time}';
  var AmapTraffic = GaodeLayer.extend({
    getTileUrl: function (coords) {
      this.options.time = new Date().getTime();
      return L.TileLayer.prototype.getTileUrl.call(this, coords);
    },
    initialize: function (options) {
      L.TileLayer.prototype.initialize.call(this, trafficUrl, options);
    },
    minZoom: 6,
    maxNativeZoom: 17
  });

  function add (name, layer) {
    layerChooser.addBaseLayer(layer, name);
    return layer;
  }

  var Roads = // en, zh_en
    add('Gaode Roads [zh]',  new GaodeLayer({ style: 7, maxNativeZoom: 20, lang: 'zh_cn' }));

  // add('Gaode Roads',       new GaodeLayer({ style: 7, maxNativeZoom: 20 }));
  // add('Gaode Roads 7',     new GaodeLayer({ style: 7, site: 1 }));
  // add('Gaode Roads 8',     new GaodeLayer({ style: 8, site: 1 }));
  // add('Gaode Roads 8 [zh]',new GaodeLayer({ style: 8, site: 1, lang: 'zh_cn' }));

  add('Gaode Roads + Traffic', L.layerGroup([
    Roads,
    new AmapTraffic({ opacity: 0.75 })
  ]));

  var Satellite =
    add('Gaode Satellite', new GaodeLayer({ style: 6, type: 'satellite' }));

  // new GaodeLayer({ style: 8, type: 'roadnet', opacity: 0.75, lang: 'zh_cn', scl: 2 }), // (512*512 tile, w/o labels)
  // new GaodeLayer({ style: 8, type: 'labels', opacity: 0.75, lang: 'zh_cn', ltype: 4 }) // (feature mask) here: 2: roads, 4: labels)
  add('Gaode Hybrid', L.layerGroup([
    Satellite,
    new GaodeLayer({ style: 8, type: 'roadnet', opacity: 0.75 })
  ]));
};

function setup() {
  mapGaode.setup();
}
