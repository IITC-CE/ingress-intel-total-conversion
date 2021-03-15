// @author         breunigs
// @name           Scale bar
// @category       Controls
// @version        0.1.0
// @description    Show scale bar on the map.


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
    $corner.find(".leaflet-control-attribution").appendTo($corner); // make sure that attribution control is on very bottom
  }
}

function setup () {
  window.addHook('iitcLoaded', function () { // wait other controls to initialize (should be initialized last)
    var options = L.extend({}, window.isSmartphone() ? scaleBar.mobileOptions : scaleBar.desktopOptions, scaleBar.options);
    scaleBar.control = L.control.scale(options).addTo(window.map);
    setTimeout(function () { moveToEdge(scaleBar.control); });
  });
}
