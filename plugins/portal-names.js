// @author         ZasoGD
// @name           Portal Names
// @category       Layer
// @version        0.2.4
// @description    Show portal names on the map.

/* exported setup, changelog --eslint */
/* global L -- eslint */

var changelog = [
  {
    version: '0.2.4',
    changes: ['Refactoring: fix eslint'],
  },
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
window.plugin.portalNames = function () {};

window.plugin.portalNames.NAME_WIDTH = 80;
window.plugin.portalNames.NAME_HEIGHT = 23;

window.plugin.portalNames.labelLayers = {};
window.plugin.portalNames.labelLayerGroup = null;

window.plugin.portalNames.setupCSS = function () {
  $('<style>')
    .prop('type', 'text/css')
    .html(
      '' +
        '.plugin-portal-names{' +
        'color:#FFFFBB;' +
        'font-size:11px;line-height:12px;' +
        'text-align:center;padding: 2px;' + // padding needed so shadow doesn't clip
        'overflow:hidden;' +
        // could try this if one-line names are used
        //    +'white-space: nowrap;text-overflow:ellipsis;'

        // webkit-only multiline ellipsis
        'display: -webkit-box;' +
        '-webkit-line-clamp: 2;' +
        '-webkit-box-orient: vertical;' +
        'text-shadow: 0 0 1px black, 0 0 1em black, 0 0 0.2em black;' +
        'pointer-events:none;' +
        '}'
    )
    .appendTo('head');
};

window.plugin.portalNames.removeLabel = function (guid) {
  var previousLayer = window.plugin.portalNames.labelLayers[guid];
  if (previousLayer) {
    window.plugin.portalNames.labelLayerGroup.removeLayer(previousLayer);
    delete window.plugin.portalNames.labelLayers[guid];
  }
};

window.plugin.portalNames.addLabel = function (guid, latLng) {
  var previousLayer = window.plugin.portalNames.labelLayers[guid];
  if (!previousLayer) {
    var d = window.portals[guid].options.data;
    var portalName = d.title;

    var label = L.marker(latLng, {
      icon: new L.DivIcon({
        className: 'plugin-portal-names',
        iconAnchor: [window.plugin.portalNames.NAME_WIDTH / 2, 0],
        iconSize: [window.plugin.portalNames.NAME_WIDTH, window.plugin.portalNames.NAME_HEIGHT],
        html: portalName,
      }),
      guid: guid,
      interactive: false,
    });
    window.plugin.portalNames.labelLayers[guid] = label;
    label.addTo(window.plugin.portalNames.labelLayerGroup);
  }
};

window.plugin.portalNames.clearAllPortalLabels = function () {
  for (var guid in window.plugin.portalNames.labelLayers) {
    window.plugin.portalNames.removeLabel(guid);
  }
};

window.plugin.portalNames.updatePortalLabels = function () {
  // as this is called every time layers are toggled, there's no point in doing it when the leyer is off
  if (!window.map.hasLayer(window.plugin.portalNames.labelLayerGroup)) {
    return;
  }

  var portalPoints = {};

  for (const guid in window.portals) {
    var p = window.portals[guid];
    if (p._map && p.options.data.title) {
      // only consider portals added to the map and with a title
      const point = window.map.project(p.getLatLng());
      portalPoints[guid] = point;
    }
  }

  // for efficient testing of intersection, group portals into buckets based on the label size
  var buckets = {};
  for (const guid in portalPoints) {
    const point = portalPoints[guid];

    var bucketId = new L.Point([Math.floor(point.x / (window.plugin.portalNames.NAME_WIDTH * 2)), Math.floor(point.y / window.plugin.portalNames.NAME_HEIGHT)]);
    // the guid is added to four buckets. this way, when testing for overlap we don't need to test
    // all 8 buckets surrounding the one around the particular portal, only the bucket it is in itself
    var bucketIds = [bucketId, bucketId.add([1, 0]), bucketId.add([0, 1]), bucketId.add([1, 1])];
    for (var i in bucketIds) {
      var b = bucketIds[i].toString();
      if (!buckets[b]) buckets[b] = {};
      buckets[b][guid] = true;
    }
  }

  var coveredPortals = {};

  for (const bucket in buckets) {
    var bucketGuids = buckets[bucket];
    for (const guid in bucketGuids) {
      var point = portalPoints[guid];
      // the bounds used for testing are twice as wide as the portal name marker. this is so that there's no left/right
      // overlap between two different portals text
      var largeBounds = new L.Bounds(
        point.subtract([window.plugin.portalNames.NAME_WIDTH, 0]),
        point.add([window.plugin.portalNames.NAME_WIDTH, window.plugin.portalNames.NAME_HEIGHT])
      );

      for (var otherGuid in bucketGuids) {
        if (guid !== otherGuid) {
          var otherPoint = portalPoints[otherGuid];

          if (largeBounds.contains(otherPoint)) {
            // another portal is within the rectangle for this one's name - so no name for this one
            coveredPortals[guid] = true;
            break;
          }
        }
      }
    }
  }

  for (const guid in coveredPortals) {
    delete portalPoints[guid];
  }

  // remove any not wanted
  for (const guid in window.plugin.portalNames.labelLayers) {
    if (!(guid in portalPoints)) {
      window.plugin.portalNames.removeLabel(guid);
    }
  }

  // and add those we do
  for (const guid in portalPoints) {
    window.plugin.portalNames.addLabel(guid, window.portals[guid].getLatLng());
  }
};

// ass calculating portal marker visibility can take some time when there's lots of portals shown, we'll do it on
// a short timer. this way it doesn't get repeated so much
window.plugin.portalNames.delayedUpdatePortalLabels = function (wait) {
  if (window.plugin.portalNames.timer === undefined) {
    window.plugin.portalNames.timer = setTimeout(function () {
      window.plugin.portalNames.timer = undefined;
      window.plugin.portalNames.updatePortalLabels();
    }, wait * 1000);
  }
};

var setup = function () {
  window.plugin.portalNames.setupCSS();

  window.plugin.portalNames.labelLayerGroup = new L.LayerGroup();
  window.layerChooser.addOverlay(window.plugin.portalNames.labelLayerGroup, 'Portal Names');

  window.addHook('requestFinished', function () {
    setTimeout(function () {
      window.plugin.portalNames.delayedUpdatePortalLabels(3.0);
    }, 1);
  });
  window.addHook('mapDataRefreshEnd', function () {
    window.plugin.portalNames.delayedUpdatePortalLabels(0.5);
  });
  window.map.on('overlayadd overlayremove', function () {
    setTimeout(function () {
      window.plugin.portalNames.delayedUpdatePortalLabels(1.0);
    }, 1);
  });
  window.map.on('zoomend', window.plugin.portalNames.clearAllPortalLabels);
};
