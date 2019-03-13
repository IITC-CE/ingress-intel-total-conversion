// ==UserScript==
// @id             overlay-kml@danielatkins
// @name           IITC plugin: Overlay KML
// @category       Layer
// @version        0.3.0.@@DATETIMEVERSION@@
// @description    [@@BUILDNAME@@-@@BUILDDATE@@] Allow users to overlay their own KML / GPX files on top of IITC.
@@METAINFO@@
// ==/UserScript==

@@PLUGINSTART@@

// PLUGIN START ////////////////////////////////////////////////////////

// use own namespace for plugin
window.plugin.overlayKML = function() {};

window.plugin.overlayKML.loadExternals = function() {
  try { console.log('Loading togeojson JS now'); } catch(e) {}
  @@INCLUDERAW:external/togeojson.js@@
  try { console.log('done loading togeojson JS'); } catch(e) {}

  window.toGeoJSON = toGeoJSON;

  try { console.log('Loading leaflet.filelayer JS now'); } catch(e) {}
  @@INCLUDERAW:external/leaflet.filelayer.js@@
  try { console.log('done loading leaflet.filelayer JS'); } catch(e) {}

  try { console.log('Loading KML JS now'); } catch(e) {}
  @@INCLUDERAW:external/KML.js@@
  try { console.log('done loading KML JS'); } catch(e) {}
}

window.plugin.overlayKML.load = function() {
  // Provide popup window allow user to select KML to overlay

  var KMLIcon = L.icon(L.extend({},L.Icon.Default.prototype.options,{
    iconSize:     [16, 24],
    iconAnchor:   [8, 24],
    popupAnchor:  [-3, 16],
    shadowSize:   [24, 24]
  }));

  L.Control.FileLayerLoad.LABEL = '<img src="@@INCLUDEIMAGE:images/open-folder-icon_sml.png@@" alt="Open" />';
  var _fileLayerLoad = L.Control.fileLayerLoad({
    fitBounds: true,
    layerOptions: {
      style: function (feature) {
        return feature.properties.style; // https://github.com/iitc-project/ingress-intel-total-conversion/pull/727
      },
      pointToLayer: function (data, latlng) {
        return L.marker(latlng, {icon: KMLIcon});
      }
    },
  });
  _fileLayerLoad.addTo(map);

  if (window.requestFile) { // IITCm (android webview): use custom file selector. See #244
    $(_fileLayerLoad.getContainer()).find('a').click(function() {
      window.requestFile(function(name, data) {
        _fileLayerLoad.loader.loadData(data, name);
      });
    });
  }

  _fileLayerLoad.loader.on('data:error', function (e) {
    console.warn(e);
    dialog({ title: 'Error', text: e.error.message });
  });
}

var setup =  function() {
  window.plugin.overlayKML.loadExternals();
  window.plugin.overlayKML.load();
}

// PLUGIN END //////////////////////////////////////////////////////////

@@PLUGINEND@@
