// @author         morph
// @name           Wayfarer portal submission range
// @category       Layer
// @version        0.2.0
// @description    Add a 20m range around portals and drawn markers, to aid Wayfarer portals submissions

/* exported setup, changelog --eslint */
/* global L, $ -- eslint */

var changelog = [
  {
    version: '0.2.0',
    changes: ['Hook into draw-tools to show ranges for drawn markers'],
  },
  {
    version: '0.1.0',
    changes: ['Initial release (code heavily based on zaprange)'],
  },
];

// use own namespace for plugin
window.plugin.wayfarerrange = function() {
};
window.plugin.wayfarerrange.wayfarerLayers = {};
window.plugin.wayfarerrange.MIN_MAP_ZOOM = 16;

window.plugin.wayfarerrange.CIRCLE_OPTIONS = {
  color      : 'orange',
  opacity    : 0.7,
  fillColor  : 'orange',
  fillOpacity: 0.4,
  weight     : 1,
  interactive: false,
  dashArray  : [10, 6],
};
window.plugin.wayfarerrange.RANGE_METERS = 20; // submitting a portal closer than 20m to another one, wont make it appear on the map

window.plugin.wayfarerrange.portalAdded = function(data) {
  data.portal.on('add', function() {
    window.plugin.wayfarerrange.draw(this.options.guid, this.options.team);
  });

  data.portal.on('remove', function() {
    window.plugin.wayfarerrange.remove(this.options.guid, this.options.team);
  });
};

// guid can be a portal guid or a marker's internal leaflet layer ID
window.plugin.wayfarerrange.remove = function(guid) {
  var previousLayer = window.plugin.wayfarerrange.wayfarerLayers[ guid ];
  if(previousLayer) {
    window.plugin.wayfarerrange.wayfarerCircleHolderGroup.removeLayer(previousLayer);
    delete window.plugin.wayfarerrange.wayfarerLayers[ guid ];
  }
};

window.plugin.wayfarerrange.draw = function(guid) {
  var d = window.portals[ guid ];
  var coo = d.getLatLng();
  var latlng = new L.LatLng(coo.lat, coo.lng); // L.LatLng is deprecated, but used by portal.getLatLng()

  var circle = new L.Circle(latlng, window.plugin.wayfarerrange.RANGE_METERS, window.plugin.wayfarerrange.CIRCLE_OPTIONS);

  circle.addTo(window.plugin.wayfarerrange.wayfarerCircleHolderGroup);
  window.plugin.wayfarerrange.wayfarerLayers[ guid ] = circle;
};

// This function replaces the old 'drawMarker'
window.plugin.wayfarerrange.drawMarker = function(layerId) {
  // Use the marker's internal Leaflet ID to retrieve it
  var marker = window.plugin.drawTools.drawnItems.getLayer(layerId);
  if(!marker) {
    return;
  }

  var latlng = marker.getLatLng(); // Use the public getLatLng() method

  var circle = new L.Circle(latlng, window.plugin.wayfarerrange.RANGE_METERS, window.plugin.wayfarerrange.CIRCLE_OPTIONS);


  circle.addTo(window.plugin.wayfarerrange.wayfarerCircleHolderGroup);
  window.plugin.wayfarerrange.wayfarerLayers[ layerId ] = circle;
};

// This is a new helper function to avoid duplicating code
window.plugin.wayfarerrange.setupWayfarerForMarker = function(marker) {
  var layerId = L.stamp(marker); // L.stamp gets the unique Leaflet ID for a layer
  window.plugin.wayfarerrange.drawMarker(layerId);

  // Set up a listener to remove the circle when the marker is deleted
  marker.on('remove', function() {
    window.plugin.wayfarerrange.remove(layerId);
  });
};

window.plugin.wayfarerrange.showOrHide = function() {
  if(window.map.getZoom() >= window.plugin.wayfarerrange.MIN_MAP_ZOOM) {
    // show the layer
    if(!window.plugin.wayfarerrange.wayfarerLayerHolderGroup.hasLayer(window.plugin.wayfarerrange.wayfarerCircleHolderGroup)) {
      window.plugin.wayfarerrange.wayfarerLayerHolderGroup.addLayer(window.plugin.wayfarerrange.wayfarerCircleHolderGroup);
      $('.leaflet-control-layers-list span:contains("Wayfarer range")').parent('label').removeClass('disabled').attr('title', '');
    }
  } else {
    // hide the layer
    if(window.plugin.wayfarerrange.wayfarerLayerHolderGroup.hasLayer(window.plugin.wayfarerrange.wayfarerCircleHolderGroup)) {
      window.plugin.wayfarerrange.wayfarerLayerHolderGroup.removeLayer(window.plugin.wayfarerrange.wayfarerCircleHolderGroup);
      $('.leaflet-control-layers-list span:contains("Wayfarer range")').parent('label').addClass('disabled').attr('title', 'Zoom in to show those.');
    }
  }
};

var setup = function() {
  // this layer is added to the layer chooser, to be toggled on/off
  window.plugin.wayfarerrange.wayfarerLayerHolderGroup = new L.LayerGroup();
  window.layerChooser.addOverlay(window.plugin.wayfarerrange.wayfarerLayerHolderGroup, 'Wayfarer range');

  // this layer is added into the above layer, and removed from it when we zoom out too far
  window.plugin.wayfarerrange.wayfarerCircleHolderGroup = new L.LayerGroup();
  window.plugin.wayfarerrange.wayfarerLayerHolderGroup.addLayer(window.plugin.wayfarerrange.wayfarerCircleHolderGroup);

  // --- Event Hooks ---

  // Hook for when portals are added to the map
  window.addHook('portalAdded', window.plugin.wayfarerrange.portalAdded);

  // Hook for zoom level changes to show/hide the layer
  window.map.on('zoomend', window.plugin.wayfarerrange.showOrHide);

  // Hook for draw-tools plugin events
  if(window.plugin.drawTools) {
    // This function will redraw circles for all markers currently on the map.
    // It's used for initial load and for events that change multiple markers.
    var syncAllDrawnMarkers = function() {
      // 1. Remove all existing circles that belong to markers
      for(var guid in window.plugin.wayfarerrange.wayfarerLayers) {
        // Portal GUIDs are 32-char hex strings. Leaflet layer IDs are numbers.
        // A simple check is to see if it's NOT a known portal.
        if(!window.portals[ guid ]) {
          window.plugin.wayfarerrange.remove(guid);
        }
      }

      // 2. Add circles for all current markers
      window.plugin.drawTools.drawnItems.eachLayer(function(layer) {
        if(layer instanceof L.Marker) {
          window.plugin.wayfarerrange.setupWayfarerForMarker(layer);
        }
      });
    };

    window.addHook('pluginDrawTools', function(e) {
      switch(e.event) {
        case 'layerCreated':
          // A new marker was drawn, add a circle just for it.
          if(e.layer instanceof L.Marker) {
            window.plugin.wayfarerrange.setupWayfarerForMarker(e.layer);
          }
          break;
        case 'import':
        case 'layersEdited':
        case 'layersDeleted':
        case 'clear':
          // For any other event, it's safest to just resync everything.
          syncAllDrawnMarkers();
          break;
      }
    });

    // Initial sync for any markers that were loaded before this plugin.
    syncAllDrawnMarkers();
  }

  // --- Initial State ---
  // Set the initial visibility of the layer based on the current zoom.
  window.plugin.wayfarerrange.showOrHide();
};
