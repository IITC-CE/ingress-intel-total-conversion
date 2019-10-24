// @author         jonatkins
// @name           OpenCycleMap.org map tiles
// @category       Map Tiles
// @version        0.2.0
// @description    Add the OpenCycleMap.org map tiles as an optional layer.


// use own namespace for plugin
window.plugin.mapTileOpenCycleMap = {
  addLayer: function() {
    //the Thunderforest (OpenCycleMap) tiles are free to use - http://www.thunderforest.com/terms/

    var ocmOpt = {
      attribution: 'Tiles © OpenCycleMap, Map data © OpenStreetMap',
      maxNativeZoom: 18,
      maxZoom: 21,
    };

    var layers = {
      'cycle': 'OpenCycleMap',
      'transport': 'Transport',
      'transport-dark': 'Transport Dark',
      'outdoors': 'Outdoors',
      'landscape': 'Landscape',
    };

    for(var i in layers) {
      var layer = new L.TileLayer('https://{s}.tile.thunderforest.com/' + i + '/{z}/{x}/{y}.png', ocmOpt);
      layerChooser.addBaseLayer(layer, 'Thunderforest ' + layers[i]);
    }
  },
};

var setup =  window.plugin.mapTileOpenCycleMap.addLayer;
