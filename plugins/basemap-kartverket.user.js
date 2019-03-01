// ==UserScript==
// @id             iitc-plugin-basemap-kartverket@sollie
// @name           IITC plugin: Kartverket.no map tiles
// @category       Map Tiles
// @version        0.2.0.@@DATETIMEVERSION@@
// @description    [@@BUILDNAME@@-@@BUILDDATE@@] Add map layers provided by Kartverket, the Norwegian Mapping Authority.
@@METAINFO@@
// ==/UserScript==

@@PLUGINSTART@@

// PLUGIN START ////////////////////////////////////////////////////////

// use own namespace for plugin
  window.plugin.mapTileKartverketMap = {
  addLayer: function() {
    let kartverketOpt = {
      attribution  : 'Map data © Kartverket', // Map data from Kartverket (http://statkart.no/en/)
      maxNativeZoom: 18,
      maxZoom      : 21,
      subdomains   : [ 'opencache', 'opencache2', 'opencache3' ]
    };
    
    let layers = {
      'topo4'         : 'Norway Topo',
      'topo4graatone' : 'Norway Topo Grayscale',
      'toporaster3'   : 'Norway Topo Raster',
      'sjokartraster' : 'Norway Nautical Raster',
      'europa'        : 'Norway Europa',
    };
    
    for(let i in layers) {
      let layer = new L.TileLayer('https://{s}.statkart.no/gatekeeper/gk/gk.open_gmaps?layers=' + i + '&zoom={z}&x={x}&y={y}', kartverketOpt);
      layerChooser.addBaseLayer(layer, 'Kartverket ' + layers[ i ]);
    }
  },
};

let setup = window.plugin.mapTileKartverketMap.addLayer;

// PLUGIN END //////////////////////////////////////////////////////////

@@PLUGINEND@@
