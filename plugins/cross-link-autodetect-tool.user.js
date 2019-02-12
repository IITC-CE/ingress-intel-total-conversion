// ==UserScript==
// @id             iitc-plugin-cross-link-autodetect-tool@GMOogway
// @name           IITC plugin: Cross Link AutoDetect Tool By GMOogway
// @category       Layer
// @version        0.1.0.@@DATETIMEVERSION@@
// @description    [@@BUILDNAME@@-@@BUILDDATE@@] Cross Link AutoDetect Tool.
@@METAINFO@@
// ==/UserScript==

@@PLUGINSTART@@

// PLUGIN START ////////////////////////////////////////////////////////

// use own namespace for plugin
window.plugin.CLADT = function() {};

window.plugin.CLADT.IS_DEBUG = true;
window.plugin.CLADT.DELAY = 2000;
window.plugin.CLADT.MAP_READY = false;
window.plugin.CLADT.STATUS = 'stop';
window.plugin.CLADT.ZOOM = 13;
window.plugin.CLADT.COUNT = 0;
window.plugin.CLADT.EARTH_RADIUS = 6367000;

window.plugin.CLADT.getDateTime = function() {
  var date = new Date();
  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  var day = date.getDate();
  var hour = "00" + date.getHours();
  hour = hour.substr(hour.length - 2);
  var minute = "00" + date.getMinutes();
  minute = minute.substr(minute.length - 2);
  var second = "00" + date.getSeconds();
  second = second.substr(second.length - 2);
  var week = date.getDay();
  switch (week) {
  case 1:
    week = "Monday ";
    break;
  case 2:
    week = "Tuesday ";
    break;
  case 3:
    week = "Wednesday ";
    break;
  case 4:
    week = "Thursday ";
    break;
  case 5:
    week = "Friday ";
    break;
  case 6:
    week = "Saturday ";
    break;
  case 0:
    week = "Sunday ";
    break;
  default:
    week = "";
    break;
  }
  return (year + "/" + month + "/" + day + "/" + " " + week + " " + hour + ":" + minute + ":" + second);
}

window.plugin.CLADT.debug = function(msg) {
  if (window.plugin.CLADT.IS_DEBUG) {
    console.log(' ');
    console.log('**********  ' + window.plugin.CLADT.getDateTime() + '  **********');
    console.log(msg);
    console.log('*************************************************************************');
    console.log(' ');

  }
}

window.plugin.CLADT.manualOpt = function() {
  dialog({
    html: plugin.CLADT.htmlSetbox,
    dialogClass: 'ui-dialog',
    id: 'plugin-CLADT-options',
    title: 'Cross Link AutoDetect Tool Options'
  });
  window.plugin.CLADT.optSetStatus(window.plugin.CLADT.STATUS);
}

window.plugin.CLADT.optAlert = function(message) {
  $('.ui-dialog .ui-dialog-buttonset').prepend('<p class="alert" style="float:left;margin-top:4px;">' + message + '</p>');
  $('.alert').delay(3000).fadeOut();
}

window.plugin.CLADT.optClear = function() {
  window.plugin.CLADT.markerItems.clearLayers();
  window.plugin.CLADT.linkLayerGuids = {};
}

window.plugin.CLADT.setupContent = function() {
  plugin.CLADT.htmlCallSetBox = '<a onclick="window.plugin.CLADT.manualOpt();return false;">CLADT Options</a>';
  var actions = '';
  actions += '<a id="cladt_status" onclick="window.plugin.CLADT.optStatus();return false;">Start</a>';
  actions += '<a onclick="window.plugin.CLADT.optClear();return false;">Clear</a>';
  //actions +='<input type="checkbox" id="crossedAntimeridian" name="crossedAntimeridian"><label for="crossedAntimeridian">Crossed Antimeridian?</label>';
  plugin.CLADT.htmlSetbox = '<div id="adcltSetbox">' + actions + '</div>';
}

window.plugin.CLADT.setupCSS = function() {
  $('<style>').prop('type', 'text/css').html('\
  #adcltSetbox a{\
	display:block;\
	color:#ffce00;\
	border:1px solid #ffce00;\
	padding:3px 0;\
	margin:10px auto;\
	width:80%;\
	text-align:center;\
	background:rgba(8,48,78,.9);\
  }\
  #adcltSetbox a.disabled,\
  #adcltSetbox a.disabled:hover{\
	color:#666;\
	border-color:#666;\
	text-decoration:none;\
  }\
').appendTo('head');
}

window.plugin.CLADT.optSetStatus = function(status) {
  if (status === undefined) {
    if (window.plugin.CLADT.STATUS == 'stop') {
      status = 'start';
    }
    if (window.plugin.CLADT.STATUS == 'start') {
      status = 'stop';
    }
  }
  switch (status) {
  case 'start':
    {
      window.plugin.CLADT.STATUS = 'start';
      $('#cladt_status').text('stop');
      window.plugin.drawTools.drawnItems.on('click', window.plugin.CLADT.onLayerClick);
      window.plugin.CLADT.optAlert('Select a line to start.');
      break;
    }
  case 'stop':
    {
      window.plugin.CLADT.STATUS = 'stop';
      $('#cladt_status').text('start');
      window.plugin.drawTools.drawnItems.off('click', window.plugin.CLADT.onLayerClick);
      break;
    }
  case 'working':
    {
      $('#cladt_status').text('working');
      window.plugin.CLADT.STATUS = 'working';
      window.plugin.drawTools.drawnItems.off('click', window.plugin.CLADT.onLayerClick);
      //window.plugin.CLADT.optAlert('Don\'t click click clik when I\'m working.');
      break;
    }
  }
}

window.plugin.CLADT.optStatus = function() {
  window.plugin.CLADT.optSetStatus();
}

window.plugin.CLADT.getMarkerIconOptions = function() {
  var color = '#ff0000';
  var markerTemplate = '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg"\n	version="1.1" baseProfile="full"\n	width="25px" height="41px" viewBox="0 0 25 41">\n\n	<path d="M1.36241844765,18.67488124675 A12.5,12.5 0 1,1 23.63758155235,18.67488124675 L12.5,40.5336158073 Z" style="stroke:none; fill: %COLOR%;" />\n	<path d="M1.80792170975,18.44788599685 A12,12 0 1,1 23.19207829025,18.44788599685 L12.5,39.432271175 Z" style="stroke:#000000; stroke-width:1px; stroke-opacity: 0.15; fill: none;" />\n	<path d="M2.921679865,17.8803978722 A10.75,10.75 0 1,1 22.078320135,17.8803978722 L12.5,36.6789095943 Z" style="stroke:#ffffff; stroke-width:1.5px; stroke-opacity: 0.35; fill: none;" />\n\n	<path d="M19.86121593215,17.25 L12.5,21.5 L5.13878406785,17.25 L5.13878406785,8.75 L12.5,4.5 L19.86121593215,8.75 Z M7.7368602792,10.25 L17.2631397208,10.25 L12.5,18.5 Z M12.5,13 L7.7368602792,10.25 M12.5,13 L17.2631397208,10.25 M12.5,13 L12.5,18.5 M19.86121593215,17.25 L16.39711431705,15.25 M5.13878406785,17.25 L8.60288568295,15.25 M12.5,4.5 L12.5,8.5" style="stroke:#ffffff; stroke-width:1.25px; stroke-opacity: 1; fill: none;" />\n\n</svg>';
  var svgIcon = markerTemplate.replace(/%COLOR%/g, color);
  var icon = L.divIcon({
    iconSize: new L.Point(25, 41),
    iconAnchor: new L.Point(12, 41),
    html: svgIcon,
    className: 'leaflet-iitc-custom-icon',
    color: color
  });

  return {
    icon: icon,
    zIndexOffset: 2000
  };
}

/************** thanks geodesy project ***********************************************/
if (Number.prototype.toRadians === undefined) {
  Number.prototype.toRadians = function() {
    return this * Math.PI / 180;
  };
}
if (Number.prototype.toDegrees === undefined) {
  Number.prototype.toDegrees = function() {
    return this * 180 / Math.PI;
  };
}
if (Math.sign === undefined) {
  Math.sign = function(x) {
    x = +x; // convert to a number
    if (x === 0 || isNaN(x)) return x;
    return x > 0 ? 1 : -1;
  };
}
window.plugin.CLADT.LatLon = function(lat, lon) {
  // allow instantiation without 'new'
  if (! (this instanceof window.plugin.CLADT.LatLon)) return new window.plugin.CLADT.LatLon(lat, lon);

  this.lat = Number(lat);
  this.lng = Number(lon);
}
window.plugin.CLADT.LatLon.prototype.equals = function(point, fixed) {
  if (! (point instanceof window.plugin.CLADT.LatLon)) throw new TypeError('point is not LatLon object');

  if (fixed === undefined) {
    if (this.lat != point.lat) return false;
    if (this.lon != point.lon) return false;
  } else {
    if ((this.lat).toFixed(fixed) != (point.lat).toFixed(fixed)) return false;
    if ((this.lng).toFixed(fixed) != (point.lng).toFixed(fixed)) return false;
  }
  return true;
};
window.plugin.CLADT.LatLon.prototype.toVector = function() {
  varφ = this.lat.toRadians();
  varλ = this.lng.toRadians();

  // right-handed vector: x -> 0°E,0°N; y -> 90°E,0°N, z -> 90°N
  var x = Math.cos(φ) * Math.cos(λ);
  var y = Math.cos(φ) * Math.sin(λ);
  var z = Math.sin(φ);

  return new window.plugin.CLADT.Vector3d(x, y, z);
};
window.plugin.CLADT.LatLon.prototype.bearingTo = function(point) {
  if (! (point instanceof window.plugin.CLADT.LatLon)) throw new TypeError('point is not LatLon object');

  var p1 = this.toVector();
  var p2 = point.toVector();

  var N = new window.plugin.CLADT.Vector3d(0, 0, 1); // n-vector representing north pole
  var c1 = p1.cross(p2); // great circle through p1 & p2
  var c2 = p1.cross(N); // great circle through p1 & north pole
  varθ = c1.angleTo(c2, p1); // bearing is (signed) angle between c1 & c2
  return (θ.toDegrees() + 360) % 360; // normalise to 0..360
};
window.plugin.CLADT.LatLon.prototype.distanceTo = function(point, radius) {
  if (! (point instanceof window.plugin.CLADT.LatLon)) throw new TypeError('point is not LatLon object');
  radius = (radius === undefined) ? window.EARTH_RADIUS: Number(radius);

  var p1 = this.toVector();
  var p2 = point.toVector();

  varδ = p1.angleTo(p2); // δ = atan2(|p?×p?|, p?·p?)
  var d = δ * radius;

  return d;
};
window.plugin.CLADT.LatLon.prototype.isBetween = function(point1, point2) {
  var n0 = this.toVector(),
  n1 = point1.toVector(),
  n2 = point2.toVector(); // n-vectors
  // get vectors representing p0->p1, p0->p2, p1->p2, p2->p1
  varδ10 = n0.minus(n1),
  δ12 = n2.minus(n1);
  varδ20 = n0.minus(n2),
  δ21 = n1.minus(n2);

  // dot product δ10?δ12 tells us if p0 is on p2 side of p1, similarly for δ20?δ21
  var extent1 = δ10.dot(δ12);
  var extent2 = δ20.dot(δ21);

  var isBetween = extent1 >= 0 && extent2 >= 0;
  var isSameHemisphere = n0.dot(n1) >= 0 && n0.dot(n2) >= 0;

  return isBetween && isSameHemisphere;
};
window.plugin.CLADT.Vector3d = function(x, y, z) {
  // allow instantiation without 'new'
  if (! (this instanceof window.plugin.CLADT.Vector3d)) return new window.plugin.CLADT.Vector3d(x, y, z);

  this.x = Number(x);
  this.y = Number(y);
  this.z = Number(z);
};
window.plugin.CLADT.Vector3d.prototype.length = function() {
  return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
};
window.plugin.CLADT.Vector3d.prototype.unit = function() {
  var norm = this.length();
  if (norm == 1) return this;
  if (norm == 0) return this;

  var x = this.x / norm;
  var y = this.y / norm;
  var z = this.z / norm;

  return new window.plugin.CLADT.Vector3d(x, y, z);
};
window.plugin.CLADT.Vector3d.prototype.times = function(x) {
  x = Number(x);

  return new window.plugin.CLADT.Vector3d(this.x * x, this.y * x, this.z * x);
};
window.plugin.CLADT.Vector3d.prototype.angleTo = function(v, n) {
  if (! (v instanceof window.plugin.CLADT.Vector3d)) throw new TypeError('v is not Vector3d object');
  if (! (n instanceof window.plugin.CLADT.Vector3d || n == undefined)) throw new TypeError('n is not Vector3d object');

  var sign = n == undefined ? 1 : Math.sign(this.cross(v).dot(n));
  var sinθ = this.cross(v).length() * sign;
  var cosθ = this.dot(v);

  return Math.atan2(sinθ, cosθ);
};
window.plugin.CLADT.Vector3d.prototype.toLatLonS = function() {
  varφ = Math.atan2(this.z, Math.sqrt(this.x * this.x + this.y * this.y));
  varλ = Math.atan2(this.y, this.x);

  return new window.plugin.CLADT.LatLon(φ.toDegrees(), λ.toDegrees());
};
window.plugin.CLADT.Vector3d.prototype.cross = function(v) {

  if (! (v instanceof window.plugin.CLADT.Vector3d)) throw new TypeError('v is not Vector3d object');

  var x = this.y * v.z - this.z * v.y;
  var y = this.z * v.x - this.x * v.z;
  var z = this.x * v.y - this.y * v.x;

  return new window.plugin.CLADT.Vector3d(x, y, z);
};
window.plugin.CLADT.Vector3d.prototype.dot = function(v) {
  if (! (v instanceof window.plugin.CLADT.Vector3d)) throw new TypeError('v is not Vector3d object');

  return this.x * v.x + this.y * v.y + this.z * v.z;
};
window.plugin.CLADT.Vector3d.prototype.plus = function(v) {
  if (! (v instanceof window.plugin.CLADT.Vector3d)) throw new TypeError('v is not Vector3d object');

  return new window.plugin.CLADT.Vector3d(this.x + v.x, this.y + v.y, this.z + v.z);
};
window.plugin.CLADT.Vector3d.prototype.minus = function(v) {
  if (! (v instanceof window.plugin.CLADT.Vector3d)) throw new TypeError('v is not Vector3d object');

  return new window.plugin.CLADT.Vector3d(this.x - v.x, this.y - v.y, this.z - v.z);
};
window.plugin.CLADT.LatLon.intersection = function(path1start, path1brngEnd, path2start, path2brngEnd) {
  if (! (path1start instanceof window.plugin.CLADT.LatLon)) throw new TypeError('path1start is not LatLon object');
  if (! (path2start instanceof window.plugin.CLADT.LatLon)) throw new TypeError('path2start is not LatLon object');
  if (! (path1brngEnd instanceof window.plugin.CLADT.LatLon) && isNaN(path1brngEnd)) throw new TypeError('path1brngEnd is not LatLon object or bearing');
  if (! (path2brngEnd instanceof window.plugin.CLADT.LatLon) && isNaN(path2brngEnd)) throw new TypeError('path2brngEnd is not LatLon object or bearing');

  // if c1 & c2 are great circles through start and end points (or defined by start point + bearing),
  // then candidate intersections are simply c1 × c2 & c2 × c1; most of the work is deciding correct
  // intersection point to select! if bearing is given, that determines which intersection, if both
  // paths are defined by start/end points, take closer intersection
  var p1 = path1start.toVector();
  var p2 = path2start.toVector();

  var c1, c2, path1def, path2def;
  // c1 & c2 are vectors defining great circles through start & end points; p × c gives initial bearing vector
  if (path1brngEnd instanceof window.plugin.CLADT.LatLon) { // path 1 defined by endpoint
    c1 = p1.cross(path1brngEnd.toVector());
    path1def = 'endpoint';
  } else { // path 1 defined by initial bearing
    c1 = path1start.greatCircle(Number(path1brngEnd));
    path1def = 'bearing';
  }
  if (path2brngEnd instanceof window.plugin.CLADT.LatLon) { // path 2 defined by endpoint
    c2 = p2.cross(path2brngEnd.toVector());
    path2def = 'endpoint';
  } else { // path 2 defined by initial bearing
    c2 = path2start.greatCircle(Number(path2brngEnd));
    path2def = 'bearing';
  }

  // there are two (antipodal) candidate intersection points; we have to choose which to return
  var i1 = c1.cross(c2);
  var i2 = c2.cross(c1);

  // am I making heavy weather of this? is there a simpler way to do it?
  // selection of intersection point depends on how paths are defined (bearings or endpoints)
  var intersection = null,
  dir1 = null,
  dir2 = null;
  switch (path1def + '+' + path2def) {
  case 'bearing+bearing':
    // if c×p?i1 is +ve, the initial bearing is towards i1, otherwise towards antipodal i2
    dir1 = Math.sign(c1.cross(p1).dot(i1)); // c1×p1?i1 +ve means p1 bearing points to i1
    dir2 = Math.sign(c2.cross(p2).dot(i1)); // c2×p2?i1 +ve means p2 bearing points to i1
    switch (dir1 + dir2) {
    case 2:
      // dir1, dir2 both +ve, 1 & 2 both pointing to i1
      intersection = i1;
      break;
    case - 2 : // dir1, dir2 both -ve, 1 & 2 both pointing to i2
      intersection = i2;
      break;
    case 0:
      // dir1, dir2 opposite; intersection is at further-away intersection point
      // take opposite intersection from mid-point of p1 & p2 [is this always true?]
      intersection = p1.plus(p2).dot(i1) > 0 ? i2: i1;
      break;
    }
    break;
  case 'bearing+endpoint':
    // use bearing c1 × p1
    dir1 = Math.sign(c1.cross(p1).dot(i1)); // c1×p1?i1 +ve means p1 bearing points to i1
    intersection = dir1 > 0 ? i1: i2;
    break;
  case 'endpoint+bearing':
    // use bearing c2 × p2
    dir2 = Math.sign(c2.cross(p2).dot(i1)); // c2×p2?i1 +ve means p2 bearing points to i1
    intersection = dir2 > 0 ? i1: i2;
    break;
  case 'endpoint+endpoint':
    // select nearest intersection to mid-point of all points
    var mid = p1.plus(p2).plus(path1brngEnd.toVector()).plus(path2brngEnd.toVector());
    intersection = mid.dot(i1) > 0 ? i1: i2;
    break;
  }

  return intersection.toLatLonS();
};
window.plugin.CLADT.LatLon.prototype.destinationPoint = function(distance, bearing, radius) {
  radius = (radius === undefined) ? window.EARTH_RADIUS: Number(radius);

  var n1 = this.toVector();
  varδ = Number(distance) / radius; // angular distance in radians
  varθ = Number(bearing).toRadians();

  var N = new window.plugin.CLADT.Vector3d(0, 0, 1); // north pole
  var de = N.cross(n1).unit(); // east direction vector @ n1
  var dn = n1.cross(de); // north direction vector @ n1
  var deSinθ = de.times(Math.sin(θ));
  var dnCosθ = dn.times(Math.cos(θ));

  var d = dnCosθ.plus(deSinθ); // direction vector @ n1 (≡ C×n1; C = great circle)
  var x = n1.times(Math.cos(δ)); // component of n2 parallel to n1
  var y = d.times(Math.sin(δ)); // component of n2 perpendicular to n1
  var n2 = x.plus(y);

  return n2.toLatLonS();
};
window.plugin.CLADT.LatLon.prototype.enclosedBy = function(polygon) {
  var closed = polygon[0].equals(polygon[polygon.length - 1]);
  if (!closed) polygon.push(polygon[0]);

  var nVertices = polygon.length - 1;

  var p = this.toVector();

  // get vectors from p to each vertex
  var vectorToVertex = [];
  var v;
  for (v = 0; v < nVertices; v++) vectorToVertex[v] = p.minus(polygon[v].toVector());
  vectorToVertex.push(vectorToVertex[0]);

  // sum subtended angles of each edge (using vector p to determine sign)
  varΣθ = 0;
  for (v = 0; v < nVertices; v++) {Σθ += vectorToVertex[v].angleTo(vectorToVertex[v + 1], p);
  }

  var enclosed = Math.abs(Σθ) > Math.PI;

  if (!closed) polygon.pop(); // restore polygon to pristine condition
  return enclosed;
};
/***********************************************************************************************/

//thanks to @ick
window.plugin.CLADT.optSleep = function(ms) {
  return new Promise(function(resolve) {
    const timeId = setInterval(() = >{
      if (window.plugin.CLADT.MAP_READY) {
        clearInterval(timeId);
        resolve();
      } else {}
    },
    ms)
  });
}

window.plugin.CLADT.onMapDataRefreshEnd = function() {
  window.plugin.CLADT.MAP_READY = true;
}

window.plugin.CLADT.onLayerClick = function(e) {
  if (e.layer instanceof L.Polyline) {
    var layer = e.layer;
    var LatLngs = layer.getLatLngs();
    if (LatLngs.length > 2) {
      window.plugin.CLADT.optAlert('Not supported.');
    } else {
      window.plugin.CLADT.optSetStatus('working');
      window.plugin.CLADT.check(LatLngs);
    }
  }
}

window.plugin.CLADT.checkAllLinks = function(linelatlngs) {
  $.each(window.links,
  function(guid, link) {
    if (!window.plugin.CLADT.linkLayerGuids[link.options.guid]) {
      var a = link.getLatLngs();
      var b = linelatlngs;
      var p = window.plugin.CLADT.LatLon.intersection(new window.plugin.CLADT.LatLon(a[0].lat, a[0].lng), new window.plugin.CLADT.LatLon(a[1].lat, a[1].lng), new window.plugin.CLADT.LatLon(b[0].lat, b[0].lng), new window.plugin.CLADT.LatLon(b[1].lat, b[1].lng));
      if (!p.equals(new window.plugin.CLADT.LatLon(b[0].lat, b[0].lng), 6) && !p.equals(new window.plugin.CLADT.LatLon(b[1].lat, b[1].lng), 6) && p.isBetween(new window.plugin.CLADT.LatLon(a[0].lat, a[0].lng), new window.plugin.CLADT.LatLon(a[1].lat, a[1].lng)) && p.isBetween(new window.plugin.CLADT.LatLon(b[0].lat, b[0].lng), new window.plugin.CLADT.LatLon(b[1].lat, b[1].lng))) {
        window.plugin.CLADT.COUNT++;
        //window.plugin.CLADT.debug(link);
        //window.plugin.CLADT.debug(p);
        var marker = L.marker({
          lat: p.lat,
          lng: p.lng
        },
        L.extend({},
        window.plugin.CLADT.getMarkerIconOptions(), {})).bindPopup(window.plugin.CLADT.COUNT.toString()).openPopup();
        window.plugin.CLADT.markerItems.addLayer(marker);
        var poly = L.geodesicPolyline(link.getLatLngs(), {
          color: '#f00',
          opacity: 0.7,
          weight: 5,
          interactive: false,
          dashArray: '8,8',
          guid: link.options.guid
        });
        window.plugin.CLADT.markerItems.addLayer(poly);
        window.plugin.CLADT.linkLayerGuids[link.options.guid] = 1;
      }
    } else {

}
  });

}

window.plugin.CLADT.precheck = function(latlngs) {
  var p1 = new window.plugin.CLADT.LatLon(latlngs[0].lat, latlngs[0].lng);
  var p2 = new window.plugin.CLADT.LatLon(latlngs[1].lat, latlngs[1].lng);
  if (p1.lng > p2.lng) { [p1, p2] = [p2, p1];
  }
  window.plugin.CLADT.debug(p1);
  window.plugin.CLADT.debug(p2);
  if ($('#crossedAntimeridian').is(':checked') && p1.lng < 0 && p2.lng > 0) {
    var b = (new window.plugin.CLADT.LatLon(p2.lat, p2.lng - 180)).bearingTo(new window.plugin.CLADT.LatLon(p1.lat, p1.lng + 180));
    var p = window.plugin.CLADT.LatLon.intersection(p2, b, new window.plugin.CLADT.LatLon( - 90, 180), 0);
    window.plugin.CLADT.debug(p);
  }
  window.plugin.CLADT.optSetStatus('stop');
}

window.plugin.CLADT.check = async
function(latlngs) {
  window.plugin.CLADT.COUNT = 0;
  var p1 = new window.plugin.CLADT.LatLon(latlngs[0].lat, latlngs[0].lng);
  var p2 = new window.plugin.CLADT.LatLon(latlngs[1].lat, latlngs[1].lng);
  if (p1.lng > p2.lng) { [p1, p2] = [p2, p1];
  }
  var b = p1.bearingTo(p2);
  var d = p1.distanceTo(p2);
  window.map.setView(L.latLng(31, 125), 13);
  window.map.setView(p1, window.plugin.CLADT.ZOOM);
  window.plugin.CLADT.MAP_READY = false;
  await window.plugin.CLADT.optSleep(window.plugin.CLADT.DELAY);
  var bounds = window.map.getBounds();
  //var x = bounds['_northEast'].lng - p1.lng;
  //var y = bounds['_northEast'].lat - p1.lat;
  var step;
  if (b >= 45 && b <= 135) {
    step = (p1.distanceTo(new window.plugin.CLADT.LatLon(p1.lat, bounds['_northEast'].lng))) / (Math.cos((Math.abs(b - 90)).toRadians())) * 2;
  } else {
    step = (p1.distanceTo(new window.plugin.CLADT.LatLon(bounds['_northEast'].lat, p1.lng))) / (Math.abs(Math.cos(b.toRadians()))) * 2;
  }
  var t = p1;
  window.plugin.CLADT.checkAllLinks(latlngs);
  var count = 1;
  while (!p2.enclosedBy([new window.plugin.CLADT.LatLon(bounds['_southWest'].lat, bounds['_southWest'].lng), new window.plugin.CLADT.LatLon(bounds['_southWest'].lat, bounds['_northEast'].lng), new window.plugin.CLADT.LatLon(bounds['_northEast'].lat, bounds['_northEast'].lng), new window.plugin.CLADT.LatLon(bounds['_northEast'].lat, bounds['_southWest'].lng)])) {
    t = p1.destinationPoint(step * count, b);
    window.map.setView(t, window.plugin.CLADT.ZOOM);
    window.plugin.CLADT.MAP_READY = false;
    await window.plugin.CLADT.optSleep(window.plugin.CLADT.DELAY);
    bounds = window.map.getBounds();
    window.plugin.CLADT.checkAllLinks(latlngs);
    count++;
  }
  window.plugin.CLADT.optSetStatus('stop');
  alert('done! found ' + window.plugin.CLADT.COUNT.toString() + ' intersections!');
}

var setup = function() {
  if (window.plugin.drawTools === undefined) {
    alert("CLADT requires draw-tools!");
    return;
  }
  window.plugin.CLADT.setupCSS();
  window.plugin.CLADT.setupContent();
  $('#toolbox').append(window.plugin.CLADT.htmlCallSetBox);
  window.plugin.CLADT.markerItems = new L.FeatureGroup();
  window.plugin.CLADT.linkLayerGuids = {};
  window.addLayerGroup('CLADT Items', window.plugin.CLADT.markerItems, true);
  window.addHook('mapDataRefreshEnd', window.plugin.CLADT.onMapDataRefreshEnd);
}

// PLUGIN END //////////////////////////////////////////////////////////

@@PLUGINEND@@
