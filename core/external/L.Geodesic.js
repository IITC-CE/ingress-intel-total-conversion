(function () {
  // constants
  var d2r = Math.PI/180.0;
  var r2d = 180.0/Math.PI;
  var earthR = 6367000.0; // earth radius in meters (doesn't have to be exact)

  // alternative geodesic line intermediate points function
  // as north/south lines have very little curvature in the projection, we can use longitude (east/west) seperation
  // to calculate intermediate points. hopefully this will avoid the rounding issues seen in the full intermediate
  // points code that have been seen
  function geodesicConvertLine (start, end, convertedPoints) { // push intermediate points into convertedPoints

    var lng1 = start.lng * d2r;
    var lng2 = end.lng * d2r;
    var dLng = lng1-lng2;

    var segments = Math.floor(Math.abs(dLng * earthR / this.options.segmentsCoeff));
    if (segments < 2) { return; }

    // maths based on https://edwilliams.org/avform.htm#Int

    // pre-calculate some constant values for the loop
    var lat1 = start.lat * d2r;
    var lat2 = end.lat * d2r;
    var sinLat1 = Math.sin(lat1);
    var sinLat2 = Math.sin(lat2);
    var cosLat1 = Math.cos(lat1);
    var cosLat2 = Math.cos(lat2);
    var sinLat1CosLat2 = sinLat1*cosLat2;
    var sinLat2CosLat1 = sinLat2*cosLat1;
    var cosLat1CosLat2SinDLng = cosLat1*cosLat2*Math.sin(dLng);

    for (var i=1; i < segments; i++) {
      var iLng = lng1-dLng*(i/segments);
      var iLat = Math.atan(
        (sinLat1CosLat2 * Math.sin(iLng-lng2) - sinLat2CosLat1 * Math.sin(iLng-lng1))
          / cosLat1CosLat2SinDLng
      );
      convertedPoints.push(new L.LatLng(iLat * r2d, iLng * r2d));
    }
  }


  // iterate pairs of connected vertices with fn(), adding new intermediate vertices (if returned)
  function processPoly (latlngs, fn) {
    var result = [];

    // var isPolygon = this.options.fill; // !wrong: L.Draw use options.fill with polylines
    var isPolygon = this instanceof L.Polygon;
    if (isPolygon) {
      latlngs.push(latlngs[0]);
    } else {
      result.push(latlngs[0]);
    }
    for (var i = 0, len = latlngs.length - 1; i < len; i++) {
      fn.call(this, latlngs[i], latlngs[i+1], result);
      result.push(latlngs[i+1]);
    }
    return result;
  }

  function geodesicConvertLines (latlngs) {
    if (latlngs.length === 0) {
      return [];
    }

    // geodesic calculations have issues when crossing the anti-meridian. so offset the points
    // so this isn't an issue, then add back the offset afterwards
    // a center longitude would be ideal - but the start point longitude will be 'good enough'
    var lngOffset = latlngs[0].lng;

    // points are wrapped after being offset relative to the first point coordinate, so they're
    // within +-180 degrees
    latlngs = latlngs.map(function (a) { return new L.LatLng(a.lat, a.lng - lngOffset).wrap(); });

    var geodesiclatlngs = this._processPoly(latlngs,this._geodesicConvertLine);

    // now add back the offset subtracted above. no wrapping here - the drawing code handles
    // things better when there's no sudden jumps in coordinates. yes, lines will extend
    // beyond +-180 degrees - but they won't be 'broken'
    geodesiclatlngs = geodesiclatlngs.map(function (a) { return new L.LatLng(a.lat, a.lng + lngOffset); });

    return geodesiclatlngs;
  }

  var polyOptions = {
    segmentsCoeff: 5000
  };

  var PolyMixin = {
    _geodesicConvertLine: geodesicConvertLine,

    _processPoly: processPoly,

    _geodesicConvertLines: geodesicConvertLines,

    _geodesicConvert: function () {
      this._latlngs = this._geodesicConvertLines(this._latlngsinit);
      this._convertLatLngs(this._latlngs); // update bounds
    },

    options: polyOptions,

    initialize: function (latlngs, options) {
      L.Polyline.prototype.initialize.call(this, latlngs, options);
      this._geodesicConvert();
    },

    getLatLngs: function () {
      return this._latlngsinit;
    },

    _setLatLngs: function (latlngs) {
      this._bounds = new L.LatLngBounds();
      this._latlngsinit = this._convertLatLngs(latlngs);
    },

    _defaultShape: function () {
      var latlngs = this._latlngsinit;
      return L.LineUtil.isFlat(latlngs) ? latlngs : latlngs[0];
    },

    redraw: function () {
      this._geodesicConvert();
      return L.Path.prototype.redraw.call(this);
    }
  };

  L.GeodesicPolyline = L.Polyline.extend(PolyMixin);

  PolyMixin.options = polyOptions; // workaround for https://github.com/Leaflet/Leaflet/pull/6766/
  L.GeodesicPolygon = L.Polygon.extend(PolyMixin);

  L.GeodesicCircle = L.Polygon.extend({
    options: {
      segmentsCoeff: 1000,
      segmentsMin: 48
    },

    initialize: function (latlng, options, legacyOptions) {
      if (typeof options === 'number') {
        // Backwards compatibility with 0.7.x factory (latlng, radius, options?)
        options = L.extend({}, legacyOptions, {radius: options});
      }
      this._latlng = latlng.clone();
      this._radius = options.radius; // note: https://github.com/Leaflet/Leaflet/issues/6656
      var points = this._calcPoints();
      L.Polygon.prototype.initialize.call(this, points, options);
    },

    setLatLng: function (latlng) {
      this._latlng = latlng.clone();
      var points = this._calcPoints();
      this.setLatLngs(points);
    },

    setRadius: function (radius) {
      this._radius = radius;
      var points = this._calcPoints();
      this.setLatLngs(points);
    },

    getLatLng: function () {
      return this._latlng;
    },

    getRadius: function () {
      return this._radius;
    },

    _calcPoints: function () {

      // circle radius as an angle from the centre of the earth
      var radRadius = this._radius / earthR;

      // pre-calculate various values used for every point on the circle
      var centreLat = this._latlng.lat * d2r;
      var centreLng = this._latlng.lng * d2r;

      var cosCentreLat = Math.cos(centreLat);
      var sinCentreLat = Math.sin(centreLat);

      var cosRadRadius = Math.cos(radRadius);
      var sinRadRadius = Math.sin(radRadius);

      var calcLatLngAtAngle = function (angle) {
        var lat = Math.asin(sinCentreLat*cosRadRadius + cosCentreLat*sinRadRadius*Math.cos(angle));
        var lng = centreLng + Math.atan2(Math.sin(angle)*sinRadRadius*cosCentreLat, cosRadRadius-sinCentreLat*Math.sin(lat));

        return new L.LatLng(lat * r2d, lng * r2d);
      };

      var o = this.options;
      var segments = Math.max(o.segmentsMin,Math.floor(this._radius/o.segmentsCoeff));
      var points = [];
      for (var i=0; i<segments; i++) {
        var angle = Math.PI*2/segments*i;

        var point = calcLatLngAtAngle(angle);
        points.push(point);
      }

      return points;
    }

  });


  L.geodesicPolyline = function (latlngs, options) {
    return new L.GeodesicPolyline(latlngs, options);
  };

  L.geodesicPolygon = function (latlngs, options) {
    return new L.GeodesicPolygon(latlngs, options);
  };

  L.geodesicCircle = function (latlng, radius, options) {
    return new L.GeodesicCircle(latlng, radius, options);
  };

}());
