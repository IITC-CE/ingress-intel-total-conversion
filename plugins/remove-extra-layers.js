// @author         johnd0e
// @name           Remove extra layers
// @category       Layer
// @version        0.1.2
// @description    Remove 'Artifacts', 'Beacons' and 'Frackers' from layerChooser (still keeping them on map)

/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '0.1.2',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.1.1',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var removeExtraLayers = {};
window.plugin.remove = removeExtraLayers;

removeExtraLayers.names = ['Artifacts', 'Beacons', 'Frackers'];

function setup () {
  removeExtraLayers.names.forEach(function (name) {
    window.layerChooser.removeLayer(name, {keepOnMap: true});
  });
}

/* exported setup */
