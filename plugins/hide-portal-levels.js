// @author         johnd0e
// @name           Hide portal levels
// @category       Layer
// @version        0.1.1
// @description    Replace all levels with single layerChooser's entry; reverting on longclick

/* exported setup, changelog --eslint */

// use own namespace for plugin
var hideLevels = {};
window.plugin.hideLevels = hideLevels;

hideLevels.layerFilterRegexp = new RegExp(/Level \d* Portals/);
hideLevels.initCollapsed = true;

var changelog = [
  {
    version: '0.1.1',
    changes: ['FIX: Hide only portal layers'],
  },
  {
    version: '0.1.0',
    changes: ['Initial version'],
  },
];

function setup () {
  var ctrl = window.layerChooser;

  hideLevels.portals = L.layerGroup();

  var levels = ctrl._layers.filter(function (data) {
    return data.overlay && (data.name === 'Unclaimed/Placeholder Portals' || data.name.match(hideLevels.layerFilterRegexp));
  });
  hideLevels.collapse = function (set) {
    var allDisabled = true;
    levels.forEach(function (data) {
      allDisabled = allDisabled && !data.layer._map;
      ctrl.removeLayer(data.layer, {keepOnMap: true});
      hideLevels.portals.addLayer(data.layer);
    });
    ctrl.addOverlay(hideLevels.portals, 'Portals', L.extend({
      sortPriority: -1000,
    }, set && {
      enable: !allDisabled
    }));

    var onMap = window.map.hasLayer(hideLevels.portals);
    levels.forEach(function (data) {
      if (onMap) {
        data.layer.addTo(window.map);
      } else {
        data.layer.remove();
      }
    });
  };

  hideLevels.expand = function () {
    var enable = !!hideLevels.portals._map;
    levels.forEach(function (data) {
      ctrl.addOverlay(data.layer, data.name, {enable: enable});
    });
    hideLevels.portals._layers = {};
    ctrl.removeLayer(hideLevels.portals);
  };

  levels.forEach(function (data) {
    data.layer.on('longclick', function (e) { // collapse
      e.preventDefault();
      hideLevels.collapse('set');
    });
  });

  hideLevels.portals.on('longclick', function (e) { // expand
    e.preventDefault();
    hideLevels.expand();
  });

  if (hideLevels.initCollapsed) {
    hideLevels.collapse();
  }
}

/* exported setup */
