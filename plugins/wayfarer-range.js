// @author         morph
// @name           Wayfarer portal submission range
// @category       Layer
// @version        0.1.0
// @description    Add a 20m range around portals, to aid Wayfarer portals submissions

/* exported setup, changelog --eslint */
/* global L -- eslint */

var changelog = [
  {
    version: '0.1.0',
    changes: ['Initial release (code heavily based on zaprange)'],
  },
];

// use own namespace for plugin
window.plugin.wayfarerrange = function () {};
window.plugin.wayfarerrange.wayfarerLayers = {};
window.plugin.wayfarerrange.MIN_MAP_ZOOM = 16;

window.plugin.wayfarerrange.portalAdded = function (data) {
  data.portal.on('add', function () {
    window.plugin.wayfarerrange.draw(this.options.guid, this.options.team);
  });

  data.portal.on('remove', function () {
    window.plugin.wayfarerrange.remove(this.options.guid, this.options.team);
  });
};

window.plugin.wayfarerrange.remove = function (guid) {
  var previousLayer = window.plugin.wayfarerrange.wayfarerLayers[guid];
  if (previousLayer) {
    window.plugin.wayfarerrange.wayfarerCircleHolderGroup.removeLayer(previousLayer);
    delete window.plugin.wayfarerrange.wayfarerLayers[guid];
  }
};

window.plugin.wayfarerrange.draw = function (guid) {
  var d = window.portals[guid];

  var coo = d._latlng;
  var latlng = new L.LatLng(coo.lat, coo.lng);
  // https://leafletjs.com/reference.html#circle
  var optCircle = { color: 'orange', opacity: 0.7, fillColor: 'orange', fillOpacity: 0.4, weight: 1, interactive: false, dashArray: [10, 6] };
  // submitting a portal closer than 20m to another one, wont make it appear on the map
  var range = 20;

  var circle = new L.Circle(latlng, range, optCircle);

  circle.addTo(window.plugin.wayfarerrange.wayfarerCircleHolderGroup);
  window.plugin.wayfarerrange.wayfarerLayers[guid] = circle;
};

window.plugin.wayfarerrange.showOrHide = function () {
  if (window.map.getZoom() >= window.plugin.wayfarerrange.MIN_MAP_ZOOM) {
    // show the layer
    if (!window.plugin.wayfarerrange.wayfarerLayerHolderGroup.hasLayer(window.plugin.wayfarerrange.wayfarerCircleHolderGroup)) {
      window.plugin.wayfarerrange.wayfarerLayerHolderGroup.addLayer(window.plugin.wayfarerrange.wayfarerCircleHolderGroup);
      $('.leaflet-control-layers-list span:contains("Wayfarer Range")').parent('label').removeClass('disabled').attr('title', '');
    }
  } else {
    // hide the layer
    if (window.plugin.wayfarerrange.wayfarerLayerHolderGroup.hasLayer(window.plugin.wayfarerrange.wayfarerCircleHolderGroup)) {
      window.plugin.wayfarerrange.wayfarerLayerHolderGroup.removeLayer(window.plugin.wayfarerrange.wayfarerCircleHolderGroup);
      $('.leaflet-control-layers-list span:contains("Wayfarer Range")').parent('label').addClass('disabled').attr('title', 'Zoom in to show those.');
    }
  }
};

var setup = function () {
  // this layer is added to the layer chooser, to be toggled on/off
  window.plugin.wayfarerrange.wayfarerLayerHolderGroup = new L.LayerGroup();

  // this layer is added into the above layer, and removed from it when we zoom out too far
  window.plugin.wayfarerrange.wayfarerCircleHolderGroup = new L.LayerGroup();

  window.plugin.wayfarerrange.wayfarerLayerHolderGroup.addLayer(window.plugin.wayfarerrange.wayfarerCircleHolderGroup);

  window.layerChooser.addOverlay(window.plugin.wayfarerrange.wayfarerLayerHolderGroup, 'Wayfarer range');

  window.addHook('portalAdded', window.plugin.wayfarerrange.portalAdded);

  window.map.on('zoomend', window.plugin.wayfarerrange.showOrHide);

  window.plugin.wayfarerrange.showOrHide();
};
