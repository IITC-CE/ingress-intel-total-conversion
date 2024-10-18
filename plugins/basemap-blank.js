// @author         jonatkins
// @name           Blank map
// @category       Map Tiles
// @version        0.1.5
// @description    Add a blank map layer - no roads or other features.

/* exported setup, changelog --eslint */
/* global L, layerChooser */

var changelog = [
  {
    version: '0.1.5',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.1.4',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var mapTileBlank = {};

mapTileBlank.addLayer = function () {

  var blankOpt = {attribution: '', maxNativeZoom: 18, maxZoom: 21};
  var blankWhite = new L.TileLayer('@include_img:images/basemap-blank-tile-white.png@', blankOpt);
  var blankBlack = new L.TileLayer('@include_img:images/basemap-blank-tile-black.png@', blankOpt);

  layerChooser.addBaseLayer(blankWhite, 'Blank Map (White)');
  layerChooser.addBaseLayer(blankBlack, 'Blank Map (Black)');
};

function setup() {
  mapTileBlank.addLayer();
}
