// @author         jonatkins
// @name           Blank map
// @category       Map Tiles
// @version        0.1.2
// @description    Add a blank map layer - no roads or other features.


// use own namespace for plugin
window.plugin.mapTileBlank = function() {};

window.plugin.mapTileBlank.addLayer = function() {

  var blankOpt = { attribution: '', maxNativeZoom: 18, maxZoom: 21 };
  var blankWhite = new L.TileLayer(IITCTool.importImage('images/basemap-blank-tile-white.png'), blankOpt);
  var blankBlack = new L.TileLayer(IITCTool.importImage('images/basemap-blank-tile-black.png'), blankOpt);

  layerChooser.addBaseLayer(blankWhite, "Blank Map (White)");
  layerChooser.addBaseLayer(blankBlack, "Blank Map (Black)");
};

var setup =  window.plugin.mapTileBlank.addLayer;
