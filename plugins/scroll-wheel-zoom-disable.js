// @author         jonatkins
// @name           Disable mouse wheel zoom
// @category       Tweaks
// @version        0.1.1
// @description    Disable the use of mouse wheel to zoom. The map zoom controls or keyboard are still available.

/* exported setup --eslint */
// use own namespace for plugin

function setup () {
  window.map.scrollWheelZoom.disable();
}

