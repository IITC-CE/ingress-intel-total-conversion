// @author         Fly33
// @name           Fly Links
// @category       Draw
// @version        0.4.0
// @description    Calculate how to link the portals to create the largest tidy set of nested fields. Enable from the layer chooser.


// use own namespace for plugin
window.plugin.flyLinks = function() {};

// const values
window.plugin.flyLinks.MAX_PORTALS_TO_OBSERVE = 1000;
window.plugin.flyLinks.MAX_PORTALS_TO_LINK = 100;
// zoom level used for projecting points between latLng and pixel coordinates. may affect precision of triangulation
window.plugin.flyLinks.PROJECT_ZOOM = 16;


window.plugin.flyLinks.linksLayerGroup = null;
window.plugin.flyLinks.fieldsLayerGroup = null;

window.plugin.flyLinks.updateLayer = function() {
  if (!window.map.hasLayer(window.plugin.flyLinks.linksLayerGroup) &&
      !window.map.hasLayer(window.plugin.flyLinks.fieldsLayerGroup))
    return;

  window.plugin.flyLinks.linksLayerGroup.clearLayers();
  window.plugin.flyLinks.fieldsLayerGroup.clearLayers();
  var ctrl = [$('.leaflet-control-layers-selector + span:contains("Fly links")').parent(),
              $('.leaflet-control-layers-selector + span:contains("Fly fields")').parent()];

  var distance = function(a, b) {
    return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
  };

  var drawLink = function(a, b, style) {
    var alatlng = map.unproject(a, window.plugin.flyLinks.PROJECT_ZOOM);
    var blatlng = map.unproject(b, window.plugin.flyLinks.PROJECT_ZOOM);

    var poly = L.polyline([alatlng, blatlng], style);
    poly.addTo(window.plugin.flyLinks.linksLayerGroup);
  }
  
  var drawField = function(a, b, c, style) {
    var alatlng = map.unproject(a, window.plugin.flyLinks.PROJECT_ZOOM);
    var blatlng = map.unproject(b, window.plugin.flyLinks.PROJECT_ZOOM);
    var clatlng = map.unproject(c, window.plugin.flyLinks.PROJECT_ZOOM);
    
    var poly = L.polygon([alatlng, blatlng, clatlng], style);
    poly.addTo(window.plugin.flyLinks.fieldsLayerGroup);
  }
  
  var EPS = 1e-9;
  var det = function(a, b, c) {
    return a.x * b.y - a.y * b.x + b.x * c.y - b.y * c.x + c.x * a.y - c.y * a.x;
  }
  
  var convexHull = function(points) {
    if (points.length < 3)
      return [];
    var result = [];
    var func = function _func(ai, bi, index) {
      var maxd = 0;
      var maxdi = -1;
      var a = points[ai];
      var b = points[bi];
      var _index = [];
      for (var i = 0; i < index.length; ++i) {
        var c = points[index[i]];
        var d = -det(a, b, c);
        if (d > EPS) {
            _index.push(index[i]);
        }
        if (maxd < d - EPS) {
          maxd = d;
          maxdi = index[i];
        }
      }
      if (maxdi != -1) {
        _func(ai, maxdi, _index);
        _func(maxdi, bi, _index);
      } else {
        result.push(ai);
      }
    }
    var minxi = 0;
    var maxxi = 0;
    var index = [];
    for (var i = 0; i < points.length; ++i) {
      index.push(i);
      if (points[minxi].x > points[i].x)
        minxi = i;
      if (points[maxxi].x < points[i].x)
        maxxi = i;
    }
    func(minxi, maxxi, index);
    func(maxxi, minxi, index);
    return result;
  }
  
  var triangulate2 = function(index, line_indexes, line_edge_indexes, locations) {
    if (index.length == 0)
      return {edges: [], triangles: []};
    var data = [];
    var subtriangulate = function _subtriangulate(ai, bi, ci, index) {
      var _i = [ai, bi, ci].sort(function(a,b){return a-b;});
      if (data[_i[0]] === undefined)
        data[_i[0]] = [];
      if (data[_i[0]][_i[1]-_i[0]] === undefined)
        data[_i[0]][_i[1]-_i[0]] = [];
      if (data[_i[0]][_i[1]-_i[0]][_i[2]-_i[1]] === undefined) {
        var _index = [];
        for (var i = 0; i < index.length; ++i) {
          var detc = det(locations[ai], locations[bi], locations[index[i]]);
          var deta = det(locations[bi], locations[ci], locations[index[i]]);
          var detb = det(locations[ci], locations[ai], locations[index[i]]);
          if (deta > EPS && detb > EPS && detc > EPS) {
            _index.push(index[i]);
          }
        }
        var besth = 0;
        var besthi = -1;
        var i
        for (i = 0; i < line_indexes.length; ++i) {
          var f0 = _index.indexOf(line_indexes[i][0]) != -1
          var f1 = _index.indexOf(line_indexes[i][1]) != -1
          if (f0 && !f1 && _i.indexOf(line_indexes[i][1]) == -1)
            break
          if (f1 && !f0 && _i.indexOf(line_indexes[i][0]) == -1)
            break
        }
        if (i < line_indexes.length) {
          besth = 0;
          besthi = -1;
        } else if (_index.length == 0) {
          var a = locations[ai];
          var b = locations[bi];
          var c = locations[ci];
          var s = Math.abs(det(a, b, c));
          var ch = s / distance(a, b);
          var ah = s / distance(b, c);
          var bh = s / distance(c, a);
          besth = Math.min(ah, bh, ch);
          besthi = -1;
        } else {
          var besths = 0;
          for (var i = 0; i < _index.length; ++i) {
            var ch = _subtriangulate(ai, bi, _index[i], _index);
            var ah = _subtriangulate(bi, ci, _index[i], _index);
            var bh = _subtriangulate(ci, ai, _index[i], _index);
            var _besth = Math.min(ah, bh, ch);
            var _besths = ah + bh + ch;
            if (besth < _besth || Math.abs(besth - _besth) <= EPS && besths < _besths) {
              besth = _besth;
              besths = _besths;
              besthi = _index[i];
            }
          }
        }
        data[_i[0]][_i[1]-_i[0]][_i[2]-_i[1]] = {height: besth, index: besthi};
      }
      return data[_i[0]][_i[1]-_i[0]][_i[2]-_i[1]].height;
    }
    var subindex = [];
    for (var i = 0; i < locations.length; ++i) {
      subindex.push(i);
    }
    var best = [];
    best[1] = []
    for (var k = 0; k < index.length - 1; ++k) {
      best[1][k] = {height: Infinity, length: -1};
    }
    for (var len = 2; len <= index.length - 1; ++len) {
      best[len] = [];
      for (var k = 0; k < index.length - len; ++k) {
        var t = 0;
        var tlen = -1;
        var i
        for (i = 0; i < line_edge_indexes.length; ++i) {
          var [i0, i1] = line_edge_indexes[i]
          if (k < i0 && i0 < k+len && (i1 < k || k+len < i1) ||
              k < i1 && i1 < k+len && (i0 < k || k+len < i0))
            break
        }
        if (i >= line_edge_indexes.length) {
          for (var _len = 1; _len <= len - 1; ++_len) {
            var _t = Math.min(best[_len][k].height, best[len-_len][k+_len].height, subtriangulate(index[k], index[k+_len], index[k+len], subindex))
            if (t < _t) {
              t = _t;
              tlen = _len;
            }
          }
        }
        best[len][k] = {height: t, length: tlen};
      }
    }
    
    var edges = [];
    var triangles = [];
    var makesubtriangulation = function _makesubtriangulation(ai, bi, ci, depth) {
      var _i = [ai, bi, ci].sort(function(a,b){return a-b;});
      if (data[_i[0]][_i[1]-_i[0]][_i[2]-_i[1]].index == -1) {
        triangles.push(new window.plugin.flyLinks.Triangle(locations[ai], locations[bi], locations[ci], depth));
      } else {
        _makesubtriangulation(ai, bi, data[_i[0]][_i[1]-_i[0]][_i[2]-_i[1]].index, depth+1);
        _makesubtriangulation(bi, ci, data[_i[0]][_i[1]-_i[0]][_i[2]-_i[1]].index, depth+1);
        _makesubtriangulation(ci, ai, data[_i[0]][_i[1]-_i[0]][_i[2]-_i[1]].index, depth+1);
        edges.push(new window.plugin.flyLinks.Edge(locations[ai], locations[data[_i[0]][_i[1]-_i[0]][_i[2]-_i[1]].index], depth));
        edges.push(new window.plugin.flyLinks.Edge(locations[bi], locations[data[_i[0]][_i[1]-_i[0]][_i[2]-_i[1]].index], depth));
        edges.push(new window.plugin.flyLinks.Edge(locations[ci], locations[data[_i[0]][_i[1]-_i[0]][_i[2]-_i[1]].index], depth));
      }
    }
    var maketriangulation = function _maketriangulation(len, a) {
      edges.push(new window.plugin.flyLinks.Edge(locations[index[a]], locations[index[a+len]], 0));
      if (best[len][a].length == -1)
        return;
      makesubtriangulation(index[a], index[a+best[len][a].length], index[a+len], 1);
      _maketriangulation(best[len][a].length, a);
      _maketriangulation(len - best[len][a].length, a + best[len][a].length);
    }
    if (best[index.length - 1][0].height > 0)
      maketriangulation(index.length - 1, 0)
    else
      console.log("Fly links: no triangulation")
    return {edges: edges, triangles: triangles};
  }
  
  var triangulate = function(locations, lines) {
    var index = convexHull(locations);
    var line_indexes = filterLines(locations, lines)
    var line_edge_indexes = []
    for (var i = 0; i < line_indexes.length; ++i) {
      var i0 = index.indexOf(line_indexes[i][0])
      var i1 = index.indexOf(line_indexes[i][1])
      if (i0 == -1 || i1 == -1)
        continue
      line_edge_indexes.push([i0, i1])
    }
    return triangulate2(index, line_indexes, line_edge_indexes, locations);
  }
  
  var locations = [];
  
  var bounds = map.getBounds();
  $.each(window.portals, function(guid, portal) {
    var ll = portal.getLatLng();
    var p = map.project(ll, window.plugin.flyLinks.PROJECT_ZOOM);
    locations.push(p);
  });
  
  var edges = [];
  var triangles = [];

  var markers = [];
  var lines = [];
  for (var i in plugin.drawTools.drawnItems._layers) {
    var layer = plugin.drawTools.drawnItems._layers[i];
    if (layer instanceof L.Marker) {
      var ll = layer.getLatLng();
      var p = map.project(ll, window.plugin.flyLinks.PROJECT_ZOOM);
      markers.push(p);
    } else if (layer instanceof L.GeodesicPolyline) {
      var p = []
      var ll = layer.getLatLngs();
      for (var j = 0; j < ll.length; ++j) {
        p.push(map.project(ll[j], window.plugin.flyLinks.PROJECT_ZOOM))
      }
      for (var j = 1; j < p.length; ++j) {
        lines.push([p[j-1], p[j]])
      }
    }
  }
  
  var filterMarkers = function(points, except) {
    var result = [];
    for (var i = 0; i < points.length; ++i) {
      for (var j = 0; j < except.length; ++j) {
        if (points[i].x === except[j].x && points[i].y === except[j].y)
          break;
      }
      if (j < except.length)
        continue;
      result.push(points[i]);
    }
    return result;
  };

  var filterLines = function(points, lines) {
    var result = [];
    var findPoint = function(points, point) {
      for (var i = 0; i < points.length; ++i) {
        if (points[i].x === point.x && points[i].y === point.y)
          return i
      }
      return -1
    }
    for (var i = 0; i < lines.length; ++i) {
      var a = findPoint(points, lines[i][0])
      if (a == -1)
        continue
      var b = findPoint(points, lines[i][1])
      if (b == -1)
        continue
      result.push([a, b])
    }
    return result
  }

  var filterPolygon = function(points, polygon) {
    var result = [];
    for (var p = 0; p < points.length; ++p) {
      var asum = 0;
      for (var i = 0, j = polygon.length-1; i < polygon.length; j = i, ++i) {
        var ax = polygon[i].x-points[p].x;
        var ay = polygon[i].y-points[p].y;
        var bx = polygon[j].x-points[p].x;
        var by = polygon[j].y-points[p].y;
        var la = Math.sqrt(ax*ax+ay*ay);
        var lb = Math.sqrt(bx*bx+by*by);
        if (Math.abs(la) <= EPS || Math.abs(lb) <= EPS) // the point is a vertex of the polygon
          break;
        var cos = (ax*bx+ay*by)/la/lb;
        if (cos < -1)
          cos = -1;
        if (cos > 1)
          cos = 1;
        var alpha = Math.acos(cos);
        var det = ax*by-ay*bx;
        if (Math.abs(det) <= EPS && Math.abs(alpha - Math.PI) <= EPS) // the point is on a rib of the polygon
          break;
        if (det >= 0)
          asum += alpha;
        else
          asum -= alpha;
      }
      if (i == polygon.length && Math.round(asum / Math.PI / 2) % 2 == 0)
        continue;
      result.push(points[p]);
    }
    return result;
  };
  
  locations = filterMarkers(locations, markers);
  
  for (var i in plugin.drawTools.drawnItems._layers) {
    var layer = plugin.drawTools.drawnItems._layers[i];
    if (layer instanceof L.GeodesicPolygon) {
      var ll = layer.getLatLngs();
      var polygon = [];
      for (var i = 0; i < ll.length; ++i) {
        var p = map.project(ll[i], window.plugin.flyLinks.PROJECT_ZOOM);
        polygon.push(p);
      }
      var points = filterPolygon(locations, polygon);
      if (points.length >= window.plugin.flyLinks.MAX_PORTALS_TO_LINK) {
        //alert("Some polygon contains more than 100 portals.");
        continue;
      }
      var triangulation = triangulate(points, lines);
      edges = edges.concat(triangulation.edges);
      triangles = triangles.concat(triangulation.triangles);
    }
  }

  $.each(edges, function(idx, edge) {
    drawLink(edge.a, edge.b, {
      color: '#FF0000',
      opacity: 1,
      weight: 1.5,
      interactive: false,
      smoothFactor: 10,
      dashArray: [6, 4],
    });
  });
  
  $.each(triangles, function(idx, triangle) {
    drawField(triangle.a, triangle.b, triangle.c, {
      stroke: false,
      fill: true,
      fillColor: '#FF0000',
      fillOpacity: 1 - Math.pow(0.85, triangle.depth),
      interactive: false,
    });
  });
}

window.plugin.flyLinks.Edge = function(a, b, depth) {
  this.a = a;
  this.b = b;
  this.depth = depth;
}

window.plugin.flyLinks.Triangle = function(a, b, c, depth) {
  this.a = a;
  this.b = b;
  this.c = c;
  this.depth = depth;
}

window.plugin.flyLinks.setup = function() {
  window.plugin.flyLinks.linksLayerGroup = new L.LayerGroup();
  window.plugin.flyLinks.fieldsLayerGroup = new L.LayerGroup();
  
  window.addHook('mapDataRefreshEnd', function(e) {
    window.plugin.flyLinks.updateLayer();
  });

  window.map.on('moveend', function() {
    window.plugin.flyLinks.updateLayer();
  });

  window.addLayerGroup('Fly links', window.plugin.flyLinks.linksLayerGroup, false);
  window.addLayerGroup('Fly fields', window.plugin.flyLinks.fieldsLayerGroup, false);
}
var setup = window.plugin.flyLinks.setup;
