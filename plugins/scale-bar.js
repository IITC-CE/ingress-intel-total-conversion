// @author         breunigs
// @name           Scale bar
// @category       Controls
// @version        0.1.4
// @description    Show scale bar on the map.

/* exported setup, changelog --eslint */
/* global L -- eslint */

var changelog = [
  {
    version: '0.1.4',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.1.3',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.1.2',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var scaleBar = {};
window.plugin.scaleBar = scaleBar;

// Before you ask: yes, I explicitely turned off imperial units. Imperial units
// are worse than Internet Explorer 6 whirring fans combined. Upgrade to the metric
// system already.
scaleBar.options = {
  imperial: false,
  position: 'bottomright',
};

function setup() {
  var options = L.extend(
    {},
    {
      maxWidth: window.isSmartphone() ? 100 : 200,
    },
    scaleBar.options
  );

  scaleBar.control = L.control.scale(options).addTo(window.map);
}
setup.priority = 'low';
