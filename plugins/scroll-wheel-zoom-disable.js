// @author         jonatkins
// @name           Disable mouse wheel zoom
// @category       Tweaks
// @version        0.1.1
// @description    Disable the use of mouse wheel to zoom. The map zoom controls or keyboard are still available.

/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '0.1.1',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
window.plugin.scrollWheelZoomDisable = function() {};

window.plugin.scrollWheelZoomDisable.setup = function() {

  window.map.scrollWheelZoom.disable();

};

var setup =  window.plugin.scrollWheelZoomDisable.setup;
