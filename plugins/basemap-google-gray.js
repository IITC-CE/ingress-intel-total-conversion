// @author         jacob1123
// @name           Gray Google map
// @category       Map Tiles
// @version        0.1.7
// @description    Add a simplified gray Version of Google map tiles as an optional layer.

/* exported setup, changelog --eslint */
/* global L -- eslint */

var changelog = [
  {
    version: '0.1.7',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.1.6',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.1.5',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var grayGMaps = {};

grayGMaps.addLayer = function () {
  var grayGMapsOptions = {
    maxZoom: 21,
    styles: [
      { featureType: 'landscape.natural', stylers: [{ visibility: 'simplified' }, { saturation: -100 }, { lightness: -80 }, { gamma: 2.44 }] },
      { featureType: 'road', stylers: [{ visibility: 'simplified' }, { color: '#bebebe' }, { weight: 0.6 }] },
      { featureType: 'poi', stylers: [{ saturation: -100 }, { visibility: 'on' }, { gamma: 0.34 }] },
      { featureType: 'water', stylers: [{ color: '#32324f' }] },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      { featureType: 'poi' },
      { featureType: 'landscape.man_made', stylers: [{ saturation: -100 }, { gamma: 0.13 }] },
      { featureType: 'water', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    ],
  };

  var grayGMaps = new L.GridLayer.GoogleMutant(grayGMapsOptions);

  window.layerChooser.addBaseLayer(grayGMaps, 'Google Gray');
};

function setup() {
  grayGMaps.addLayer();
}
