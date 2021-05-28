// @author         jacob1123
// @name           Gray Google map
// @category       Map Tiles
// @version        0.1.3
// @description    Add a simplified gray Version of Google map tiles as an optional layer.

// use own namespace for plugin
var grayGMaps = {};
// window.plugin.grayGMaps = grayGMaps;

grayGMaps.addLayer = function() {
  var grayGMapsOptions = {
    maxZoom: 21,
    styles: [
      {featureType:"landscape.natural",stylers:[{visibility:"simplified"},{saturation:-100},{lightness:-80},{gamma:2.44}]},
      {featureType:"road",stylers:[{visibility:"simplified"},{color:"#bebebe"},{weight:.6}]},
      {featureType:"poi",stylers:[{saturation:-100},{visibility:"on"},{gamma:.34}]},
      {featureType:"water",stylers:[{color:"#32324f"}]},
      {featureType:"transit",stylers:[{visibility:"off"}]},
      {featureType:"road",elementType:"labels",stylers:[{visibility:"off"}]},
      {featureType:"poi",elementType:"labels",stylers:[{visibility:"off"}]},
      {featureType:"poi"},
      {featureType:"landscape.man_made",stylers:[{saturation:-100},{gamma:.13}]},
      {featureType:"water",elementType:"labels",stylers:[{visibility:"off"}]}
    ]
  };

  var grayGMaps = L.gridLayer.googleMutant(grayGMapsOptions);

  layerChooser.addBaseLayer(grayGMaps, "Google Gray");
};

function setup () {
  grayGMaps.addLayer();
}