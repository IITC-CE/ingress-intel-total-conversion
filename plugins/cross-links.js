// @author         mcben
// @name           Cross links
// @category       Draw
// @version        1.3.4
// @description    Checks for existing links that cross planned links. Requires draw-tools plugin.

/* exported setup, changelog --eslint */
/* global L -- eslint */

var changelog = [
  {
    version: '1.3.4',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '1.3.3',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '1.3.2',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

window.plugin.crossLinks = function () {};

/**
 * greatCircleArcIntersect
 */
window.plugin.crossLinks.greatCircleArcIntersect = function (a0, a1, b0, b1) {
  // 0) quick checks
  // zero length line
  if (a0.equals(a1)) return false;
  if (b0.equals(b1)) return false;

  // lines have a common point
  if (a0.equals(b0) || a0.equals(b1)) return false;
  if (a1.equals(b0) || a1.equals(b1)) return false;

  // check for 'horizontal' overlap in longitude
  if (Math.min(a0.lng, a1.lng) > Math.max(b0.lng, b1.lng)) return false;
  if (Math.max(a0.lng, a1.lng) < Math.min(b0.lng, b1.lng)) return false;

  // a) convert into 3D coordinates on a unit sphere
  var ca0 = toCartesian(a0.lat, a0.lng);
  var ca1 = toCartesian(a1.lat, a1.lng);
  var cb0 = toCartesian(b0.lat, b0.lng);
  var cb1 = toCartesian(b1.lat, b1.lng);

  // b) two planes: ca0,ca1,0/0/0 and cb0,cb1,0/0/0
  // find the intersetion line

  // b1) build plane normals for
  var da = cross(ca0, ca1);
  var db = cross(cb0, cb1);

  // prepare for d) build 90° rotated vectors
  var da0 = cross(da, ca0);
  var da1 = cross(da, ca1);
  var db0 = cross(db, cb0);
  var db1 = cross(db, cb1);

  // b2) intersetion line
  var p = cross(da, db);

  // c) special case when both planes are equal
  // = both lines are on the same greatarc. test if they overlap
  var len2 = p[0] * p[0] + p[1] * p[1] + p[2] * p[2];
  if (len2 < 1e-30) {
    // === 0
    // b0 inside a0-a1 ?
    var s1 = dot(cb0, da0);
    var d1 = dot(cb0, da1);
    if ((s1 < 0 && d1 > 0) || (s1 > 0 && d1 < 0)) return true;
    // b1 inside a0-a1 ?
    var s2 = dot(cb1, da0);
    var d2 = dot(cb1, da1);
    if ((s2 < 0 && d2 > 0) || (s2 > 0 && d2 < 0)) return true;
    // a inside b0-b1 ?
    var s3 = dot(ca0, db0);
    var d3 = dot(ca0, db1);
    if ((s3 < 0 && d3 > 0) || (s3 > 0 && d3 < 0)) return true;
    return false;
  }

  // normalize P
  var n = 1 / Math.sqrt(len2);
  p[0] *= n;
  p[1] *= n;
  p[2] *= n;

  // d) at this point we have two possible collision points
  //    p or -p  (in 3D space)

  // e) angel to point
  //    since da,db is rotated: dot<0 => left, dot>0 => right of P
  var s = dot(p, da0);
  var d = dot(p, da1);
  var l = dot(p, db0);
  var f = dot(p, db1);

  // is on side a (P)
  if (s > 0 && 0 > d && l > 0 && 0 > f) {
    return true;
  }

  // is on side b (-P)
  if (0 > s && d > 0 && 0 > l && f > 0) {
    return true;
  }

  return false;
};

var d2r = Math.PI / 180;

function toCartesian(lat, lng) {
  lat *= d2r;
  lng *= d2r;
  var o = Math.cos(lat);
  return [o * Math.cos(lng), o * Math.sin(lng), Math.sin(lat)];
}

function cross(t, n) {
  return [t[1] * n[2] - t[2] * n[1], t[2] * n[0] - t[0] * n[2], t[0] * n[1] - t[1] * n[0]];
}

function dot(t, n) {
  return t[0] * n[0] + t[1] * n[1] + t[2] * n[2];
}

window.plugin.crossLinks.testPolyLine = function (polyline, link, closed) {
  var a = link.getLatLngs();
  var b = polyline.getLatLngs();

  for (var i = 0; i < b.length - 1; ++i) {
    if (window.plugin.crossLinks.greatCircleArcIntersect(a[0], a[1], b[i], b[i + 1])) return true;
  }

  if (closed) {
    if (window.plugin.crossLinks.greatCircleArcIntersect(a[0], a[1], b[b.length - 1], b[0])) return true;
  }

  return false;
};

window.plugin.crossLinks.onLinkAdded = function (data) {
  if (window.plugin.crossLinks.disabled) return;

  window.plugin.crossLinks.testLink(data.link);
};

window.plugin.crossLinks.checkAllLinks = function () {
  if (window.plugin.crossLinks.disabled) return;

  console.debug('Cross-Links: checking all links');
  window.plugin.crossLinks.linkLayer.clearLayers();
  window.plugin.crossLinks.linkLayerGuids = {};

  $.each(window.links, function (guid, link) {
    window.plugin.crossLinks.testLink(link);
  });
};

window.plugin.crossLinks.testLink = function (link) {
  if (window.plugin.crossLinks.linkLayerGuids[link.options.guid]) return;

  for (var i in window.plugin.drawTools.drawnItems._layers) {
    // leaflet don't support breaking out of the loop
    var layer = window.plugin.drawTools.drawnItems._layers[i];
    if (layer instanceof L.GeodesicPolygon) {
      if (window.plugin.crossLinks.testPolyLine(layer, link, true)) {
        window.plugin.crossLinks.showLink(link);
        break;
      }
    } else if (layer instanceof L.GeodesicPolyline) {
      if (window.plugin.crossLinks.testPolyLine(layer, link)) {
        window.plugin.crossLinks.showLink(link);
        break;
      }
    }
  }
};

window.plugin.crossLinks.showLink = function (link) {
  var poly = L.geodesicPolyline(link.getLatLngs(), {
    color: '#d22',
    opacity: 0.7,
    weight: 5,
    interactive: false,
    dashArray: '8,8',

    guid: link.options.guid,
  });

  poly.addTo(window.plugin.crossLinks.linkLayer);
  window.plugin.crossLinks.linkLayerGuids[link.options.guid] = poly;
};

window.plugin.crossLinks.onMapDataRefreshEnd = function () {
  if (window.plugin.crossLinks.disabled) return;

  window.plugin.crossLinks.linkLayer.bringToFront();

  window.plugin.crossLinks.testForDeletedLinks();
};

window.plugin.crossLinks.testAllLinksAgainstLayer = function (layer) {
  if (window.plugin.crossLinks.disabled) return;

  $.each(window.links, function (guid, link) {
    if (!window.plugin.crossLinks.linkLayerGuids[link.options.guid]) {
      if (layer instanceof L.GeodesicPolygon) {
        if (window.plugin.crossLinks.testPolyLine(layer, link, true)) {
          window.plugin.crossLinks.showLink(link);
        }
      } else if (layer instanceof L.GeodesicPolyline) {
        if (window.plugin.crossLinks.testPolyLine(layer, link)) {
          window.plugin.crossLinks.showLink(link);
        }
      }
    }
  });
};

window.plugin.crossLinks.testForDeletedLinks = function () {
  window.plugin.crossLinks.linkLayer.eachLayer(function (layer) {
    var guid = layer.options.guid;
    if (!window.links[guid]) {
      console.log('link removed');
      window.plugin.crossLinks.linkLayer.removeLayer(layer);
      delete window.plugin.crossLinks.linkLayerGuids[guid];
    }
  });
};

window.plugin.crossLinks.createLayer = function () {
  window.plugin.crossLinks.linkLayer = new L.FeatureGroup();
  window.plugin.crossLinks.linkLayerGuids = {};
  window.layerChooser.addOverlay(window.plugin.crossLinks.linkLayer, 'Cross Links');

  window.map.on('layeradd', function (obj) {
    if (obj.layer === window.plugin.crossLinks.linkLayer) {
      delete window.plugin.crossLinks.disabled;
      window.plugin.crossLinks.checkAllLinks();
    }
  });
  window.map.on('layerremove', function (obj) {
    if (obj.layer === window.plugin.crossLinks.linkLayer) {
      window.plugin.crossLinks.disabled = true;
      window.plugin.crossLinks.linkLayer.clearLayers();
      window.plugin.crossLinks.linkLayerGuids = {};
    }
  });

  // ensure 'disabled' flag is initialised
  if (!window.map.hasLayer(window.plugin.crossLinks.linkLayer)) {
    window.plugin.crossLinks.disabled = true;
  }
};

var setup = function () {
  if (window.plugin.drawTools === undefined) {
    alert("'Cross-Links' requires 'draw-tools'");
    return;
  }

  window.plugin.crossLinks.createLayer();

  // events
  window.addHook('pluginDrawTools', function (e) {
    if (e.event === 'layerCreated') {
      // we can just test the new layer in this case
      window.plugin.crossLinks.testAllLinksAgainstLayer(e.layer);
    } else {
      // all other event types - assume anything could have been modified and re-check all links
      window.plugin.crossLinks.checkAllLinks();
    }
  });

  window.addHook('linkAdded', window.plugin.crossLinks.onLinkAdded);
  window.addHook('mapDataRefreshEnd', window.plugin.crossLinks.onMapDataRefreshEnd);
};
