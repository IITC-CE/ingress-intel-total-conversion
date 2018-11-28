// ==UserScript==
// @id             iitc-plugin-canvas-render@jonatkins
// @name           IITC plugin: Use Canvas rendering
// @category       Tweaks
// @version        0.2.0.@@DATETIMEVERSION@@
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      @@UPDATEURL@@
// @downloadURL    @@DOWNLOADURL@@
// @description    [@@BUILDNAME@@-@@BUILDDATE@@] EXPERIMENTAL: use canvas-based rendering. Can be faster when viewing dense areas. Limited testing of the feature so far
// @include        https://intel.ingress.com/*
// @match          https://intel.ingress.com/intel*
// @grant          unsafeWindow
// ==/UserScript==


@@PLUGINSTART@@

// PLUGIN START ////////////////////////////////////////////////////////

// we need this global variable set before leaflet initialises
window.L_PREFER_CANVAS = true;

// use own namespace for plugin
window.plugin.canvasRendering = function() {};

window.plugin.canvasRendering.setup  = function() {
  function testCanvasRendering() {
   
    // nothing we can do here - other than check that canvas rendering was enabled
    if (!L.Path.CANVAS) {
    if (!window.map.options.preferCanvas) {
      console.error("window.L_PREFER_CANVAS was not passed through in main." );
    }
    
    if (!isCanvasRenderingEnabled()) {
      dialog({
        title:'Canvas Render Warning',
        text:'The Canvas Rendering plugin failed to enable canvas rendering in leaflet. This will occur if it initialises too late.\n'
            +'Try re-ordering userscripts so Canvas Rendering is before the main IITC script.'
        text:'The Canvas Rendering is not available.'
      });
    }
};

var setup =  window.plugin.canvasRendering.setup;
}

function isCanvasRenderingEnabled() {

  var testLayer = L.layerGroup();
  window.map.addLayer(testLayer);
  var renderer = window.map.getRenderer(testLayer);
  
  var result = (renderer instanceof L.Canvas);
  
  window.map.removeLayer(testLayer);
  delete testLayer;
  
  return result;
}

var setup =  testCanvasRendering;
// PLUGIN END //////////////////////////////////////////////////////////

@@PLUGINEND@@
