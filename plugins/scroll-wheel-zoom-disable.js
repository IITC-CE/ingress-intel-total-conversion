// @author         jonatkins
// @name           Disable mouse wheel zoom
// @category       Tweaks
// @version        0.1.0
// @description    Disable the use of mouse wheel to zoom. The map zoom controls or keyboard are still available.


// use own namespace for plugin
// var scrollWheelZoomDisable = {};
// window.plugin.scrollWheelZoomDisable = scrollWheelZoomDisable;

var setup = function() {

  window.map.scrollWheelZoom.disable();

};

