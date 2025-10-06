// @author         xelio
// @name           Keys on map
// @category       Layer
// @version        0.3.4
// @description    Show the manually entered key counts from the 'keys' plugin on the map.

/* exported setup, changelog --eslint */
/* global L -- eslint */

var changelog = [
  {
    version: '0.3.4',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.3.3',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.3.2',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
window.plugin.keysOnMap = function () {};

window.plugin.keysOnMap.keyLayers = {};

// Use portal add and remove event to control render of keys
window.plugin.keysOnMap.portalAdded = function (data) {
  // Disable if Plugin Keys is not there
  if (!window.plugin.keys) {
    window.plugin.keysOnMap.disableMessage();
    return;
  }

  data.portal.on('add', function () {
    window.plugin.keysOnMap.renderKey(this.options.guid, this.getLatLng());
  });

  data.portal.on('remove', function () {
    window.plugin.keysOnMap.removeKey(this.options.guid);
  });
};

window.plugin.keysOnMap.keyUpdate = function (data) {
  // Disable if Plugin Keys is not there
  if (!window.plugin.keys) {
    window.plugin.keysOnMap.disableMessage();
    return;
  }
  var portal = window.portals[data.guid];
  if (!portal) return;
  var latLng = portal.getLatLng();

  window.plugin.keysOnMap.renderKey(data.guid, latLng);
};

window.plugin.keysOnMap.refreshAllKeys = function () {
  window.plugin.keysOnMap.keyLayerGroup.clearLayers();
  $.each(window.plugin.keys.keys, function (key) {
    window.plugin.keysOnMap.keyUpdate({ guid: key });
  });
};

window.plugin.keysOnMap.renderKey = function (guid, latLng) {
  window.plugin.keysOnMap.removeKey(guid);

  var keyCount = window.plugin.keys.keys[guid];
  if (keyCount > 0) {
    var key = L.marker(latLng, {
      icon: new L.DivIcon({
        className: 'plugin-keys-on-map-key',
        iconAnchor: [6, 7],
        iconSize: [12, 10],
        html: keyCount,
      }),
      guid: guid,
      interactive: false,
    });

    window.plugin.keysOnMap.keyLayers[guid] = key;
    key.addTo(window.plugin.keysOnMap.keyLayerGroup);
  }
};

window.plugin.keysOnMap.removeKey = function (guid) {
  var previousLayer = window.plugin.keysOnMap.keyLayers[guid];
  if (previousLayer) {
    window.plugin.keysOnMap.keyLayerGroup.removeLayer(previousLayer);
    delete window.plugin.keysOnMap.keyLayers[guid];
  }
};

window.plugin.keysOnMap.disableMessage = function () {
  if (!window.plugin.keysOnMap.messageShown) {
    alert('Plugin "Keys On Map" need plugin "Keys" to run!');
    window.plugin.keysOnMap.messageShown = true;
  }
};

window.plugin.keysOnMap.setupCSS = function () {
  $('<style>')
    .prop('type', 'text/css')
    .html(
      '.plugin-keys-on-map-key {\
            font-size: 10px;\
            color: #FFFFBB;\
            font-family: monospace;\
            text-align: center;\
            text-shadow: 0 0 1px black, 0 0 1em black, 0 0 0.2em black;\
            pointer-events: none;\
            -webkit-text-size-adjust:none;\
          }'
    )
    .appendTo('head');
};

window.plugin.keysOnMap.setupLayer = function () {
  window.plugin.keysOnMap.keyLayerGroup = new L.LayerGroup();
  window.layerChooser.addOverlay(window.plugin.keysOnMap.keyLayerGroup, 'Keys', { default: false });
};

var setup = function () {
  window.plugin.keysOnMap.setupCSS();
  window.plugin.keysOnMap.setupLayer();

  window.addHook('portalAdded', window.plugin.keysOnMap.portalAdded);
  window.addHook('pluginKeysUpdateKey', window.plugin.keysOnMap.keyUpdate);
  window.addHook('pluginKeysRefreshAll', window.plugin.keysOnMap.refreshAllKeys);
};
