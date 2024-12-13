// @author         fragger
// @name           Zoom slider
// @category       Controls
// @version        0.2.4
// @description    Show a zoom slider on the map instead of the zoom buttons.

/* exported setup, changelog --eslint */
/* global L -- eslint */

var changelog = [
  {
    version: '0.2.4',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.2.3',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.2.2',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var zoomSlider = {};
window.plugin.zoomSlider = zoomSlider;

zoomSlider.options = {
  // Height of zoom-slider.png in px
  // stepHeight: 8,
  // Height of the knob div in px (including border)
  // knobHeight: 6,
  // styleNS: 'leaflet-control-zoomslider'
};

function setup() {
  loadLeafletZoomslider();

  var map = window.map;
  if (map.zoomControl && map.zoomControl._map) {
    map.zoomControl.remove();
  }
  zoomSlider.control = L.control.zoomslider(zoomSlider.options).addTo(map);
}

function loadLeafletZoomslider() {
  try {
    // https://github.com/kartena/Leaflet.zoomslider
    // eslint-disable-next-line
    '@include_raw:external/L.Control.Zoomslider.js@';
    $('<style>').html('@include_string:external/L.Control.Zoomslider.css@').appendTo('head');
    $('<style>').html('@include_string:zoom-slider.css@').appendTo('head');
  } catch (e) {
    console.error('L.Control.Zoomslider.js loading failed');
    throw e;
  }
}
