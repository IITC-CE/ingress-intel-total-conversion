// @author         fragger
// @name           Zoom slider
// @category       Controls
// @version        0.2.3
// @description    Show a zoom slider on the map instead of the zoom buttons.

/* exported setup, changelog --eslint */

var changelog = [
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
  //stepHeight: 8,

  // Height of the knob div in px (including border)
  //knobHeight: 6,

  //styleNS: 'leaflet-control-zoomslider'
};

function setup () {
  loadLeafletZoomslider();

  var map = window.map;
  if (map.zoomControl && map.zoomControl._map) {
    map.zoomControl.remove();
  }
  zoomSlider.control = L.control.zoomslider(zoomSlider.options).addTo(map);

  // L.Control.Zoomslider.css defines non-standard border for `.leaflet-control-zoomslider`
  // which makes zoomslider not aligning with other leaflet controls
  // Here we are trying to unset it (make the same as general `.leaflet-control`)
  // (adapted from https://github.com/kartena/Leaflet.zoomslider/pull/74)
  $('<style>')
    .html('.leaflet-touch .leaflet-control-zoomslider { border: 2px solid rgba(0,0,0,0.2) }')
    .appendTo('head');
}

function loadLeafletZoomslider () {
  try {
    // https://github.com/kartena/Leaflet.zoomslider
    '@include_raw:external/L.Control.Zoomslider.js@';
    $('<style>').html('@include_string:external/L.Control.Zoomslider.css@').appendTo('head');

  } catch (e) {
    console.error('L.Control.Zoomslider.js loading failed');
    throw e;
  }
}
