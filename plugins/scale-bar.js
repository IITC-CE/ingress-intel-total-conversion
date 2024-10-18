// @author         breunigs
// @name           Scale bar
// @category       Controls
// @version        0.1.3
// @description    Show scale bar on the map.

/* exported setup, changelog --eslint */

var changelog = [
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
scaleBar.options = { imperial: false };

scaleBar.mobileOptions = { position: 'bottomright', maxWidth: 100 };

scaleBar.desktopOptions = { position: 'topleft', maxWidth: 200 };

function moveToEdge (ctrl) {
  var $el = $(ctrl.getContainer());
  var $corner = $el.parent();
  var pos = ctrl.getPosition();
  if (pos.indexOf('top') !== -1) {
    $corner.prepend($el);
  } else if (pos.indexOf('bottom') !== -1) {
    $corner.append($el);
    $corner.find('.leaflet-control-attribution').appendTo($corner); // make sure that attribution control is on very bottom
  }
}

function setup () {
  var options = L.extend({}, window.isSmartphone() ? scaleBar.mobileOptions : scaleBar.desktopOptions, scaleBar.options);
  scaleBar.control = L.control.scale(options).addTo(window.map);
  // wait other controls to initialize (should be initialized last)
  setTimeout(function () { moveToEdge(scaleBar.control); });
}
setup.priority = 'low';