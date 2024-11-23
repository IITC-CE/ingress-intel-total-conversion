// @author         fragger
// @name           Pan control
// @category       Controls
// @version        0.2.5
// @description    Show a panning control on the map.

/* exported setup, changelog --eslint */
/* global L -- eslint */

var changelog = [
  {
    version: '0.2.5',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.2.4',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.2.3',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var panControl = {};
window.plugin.panControl = panControl;

panControl.options = {
  // position: 'topleft',
  // panOffset: 350
};

function setup() {
  loadLeafletPancontrol();

  var map = window.map;
  panControl.control = L.control.pan(panControl.options).addTo(map);

  if (!panControl.options.position) {
    // default: 'topleft'
    // to be above all controls
    $('.leaflet-top.leaflet-left').first().append(panControl.control.getContainer());
  }
}
setup.priority = 'low';

function loadLeafletPancontrol() {
  try {
    // https://github.com/kartena/Leaflet.Pancontrol
    // eslint-disable-next-line
    '@include_raw:external/L.Control.Pan.js@';
    $('<style>').html('@include_css:external/L.Control.Pan.css@').appendTo('head');
    $('<style>').html('@include_css:pan-control.css@').appendTo('head');
  } catch (e) {
    console.error('L.Control.Pan.js loading failed');
    throw e;
  }
}
