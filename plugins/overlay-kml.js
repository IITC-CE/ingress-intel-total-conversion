// @author         danielatkins
// @name           Overlay KML / GPX / GeoJSON
// @category       Layer
// @version        0.4.0
// @description    Allow users to overlay their own KML / GPX / GeoJSON files on top of IITC.


// use own namespace for plugin
var overlayKML = {};
window.plugin.overlayKML = overlayKML;

// https://github.com/mapbox/simplestyle-spec
// https://github.com/mapbox/mapbox.js/blob/publisher-production/src/simplestyle.js
// edit: http://geojson.io/

// https://github.com/mapbox/simplestyle-spec/tree/master/1.1.0
overlayKML.simpleStyle = (function () {
  function style (feature) {
    var s = {};
    var Props = feature.properties || {};
    var map = style[feature.geometry.type] || style.map;
    for (var prop in map) {
      s[map[prop]] = prop in Props
        ? Props[prop]
        : style.defaults[prop] || '';
    }
    return s;
  }

  style.defaults = {
    'marker-size': 'medium',
    'marker-color': '#7e7e7e',
    'stroke': '#555555',
    'stroke-opacity': 1.0,
    'stroke-width': 2,
    'fill': '#555555',
    'fill-opacity': 0.5
  };

  style.Point = {
    'marker-color': 'color'
    // 'marker-size'
    // 'marker-symbol'
  };

  style.map = {
    // 'title'
    // 'description'
    'stroke': 'color',
    'stroke-opacity': 'opacity',
    'stroke-width': 'weight',
    'fill': 'fillColor',
    'fill-opacity': 'fillOpacity',
  };

  return style;
})();
// Note: marker styling is not implemented to avoid mapbox API dependency
// Ref: https://docs.mapbox.com/mapbox.js/api/v3.2.0/l-mapbox-marker-style/
// API source: https://github.com/mapbox/mapbox.js/blob/publisher-production/src/marker.js
// Sample implementation: http://bl.ocks.org/tmcw/3861338

// See also:
//   - geojsonCSS: https://wiki.openstreetmap.org/wiki/Geojson_CSS
//     Sample implementation: https://github.com/albburtsev/Leaflet.geojsonCSS

overlayKML.iconSizes = {
  iconSize:     [16, 24],
  iconAnchor:   [ 8, 24],
  popupAnchor:  [ 1,-20],
  tooltipAnchor:[ 1,-16],
  shadowSize:   [24, 24]
};

overlayKML.layerOptions = {

  // https://leafletjs.com/reference.html#geojson-pointtolayer
  pointToLayer: function (feature, latlng) {
    var icon;
    if (feature.properties.icon) {
      icon = L.icon.web(feature.properties.icon);
    } else {
      var color = feature.properties.color;
      if (!color) {
        var style = overlayKML.layerOptions.style;
        color = style && style.defaults && style.defaults['marker-color'];
      }
      icon = L.divIcon.coloredSvg(color, overlayKML.iconSizes);
    }
    // old icon: new L.Icon.Default(overlayKML.iconSizes);
    return L.marker(latlng, { icon: icon });
  },

  // https://leafletjs.com/reference.html#geojson-oneachfeature
  onEachFeature: function (feature, layer) {
    var properties = feature.properties;
    if (properties.name) {
      // https://leafletjs.com/reference.html#geojson-bindtooltip
      layer.bindTooltip(properties.name, this.tooltipOptions);
    }
    if (properties.description) {
      // https://leafletjs.com/reference.html#geojson-bindpopup
      layer.bindPopup(properties.description, this.popupOptions);
    }
  },

  // https://leafletjs.com/reference.html#geojson-style
  style: overlayKML.simpleStyle
};

overlayKML.options = {
  fileSizeLimit: 4096,
};

overlayKML.loadGeoJSON = function (geojson, name) {
  var layer = L.geoJson(geojson, overlayKML.layerOptions);
  if (layer.getLayers().length === 0) {
    throw new Error(name + ' has no valid layers');
  }
  layer.name = name;
  overlayKML.layer.addLayer(layer);
  layerChooser.addOverlay(layer, name, { persistent: false });
};

overlayKML.ext = ['geojson', 'json', 'kml', 'gpx'];

overlayKML.events = { // predefined handlers
  'init': {
    sizeLimit: function (e) {
      var sizeKB = e.file.size / 1024;
      if (sizeKB > overlayKML.options.fileSizeLimit) {
        throw new Error('File size exceeds limit (' + sizeKB.toFixed(2) + ' > ' + this.options.fileSizeLimit + 'KB)');
      }
    },
    typeLimit: function (e) {
      e.file.ext = e.file.name.split('.').pop();
      if (overlayKML.ext.indexOf(e.file.ext) === -1) {
        throw new Error('Unsupported file type (' + e.file.ext + ')');
      }
    }
  },

  'init:error': {
    alert: function (e) {
      console.warn(e);
      window.dialog({ title: 'Error', text: e.error.message });
    }
  },

  'error': {
    alert: function (e) {
      console.warn(e);
      window.dialog({ title: 'Error', text: e.error.message });
    }
  },

  'load': {
    geoJSON: function (e) {
      if (['geojson', 'json'].indexOf(e.file.ext) !== -1) {
        try {
          var geojson = JSON.parse(e.reader.result);
          overlayKML.loadGeoJSON(geojson, e.file.name);
        } catch (err) {
          this.fire('error', { error:err });
        }
      }
    },
    toGeoJSON: function (e) {
      if (['kml', 'gpx'].indexOf(e.file.ext) !== -1) {
        try {
          var xml = (new window.DOMParser()).parseFromString(e.reader.result, 'text/xml');
          var geojson = overlayKML.toGeoJSON[e.file.ext](xml);
          overlayKML.loadGeoJSON(geojson, e.file.name);
        } catch (err) {
          this.fire('error', { error:err });
        }
      }
    },
  },

  'loaded': {
    checkResult: function () {
      var layers = overlayKML.layer.getLayers();
      if (layers.length) {
        this.fire('loaded:success');
        overlayKML.layer.addTo(map);
      } else {
        overlayKML.layer = overlayKML.lastLayer;
      }
    },
  },

  'loaded:success': {
    singleLayer: function () { // ensure that previous layer removed on new load
                               // (it stays available in layer chooser)
      if (overlayKML.lastLayer) { overlayKML.lastLayer.remove(); }
    },
    fitBounds: function () {
      map.fitBounds(overlayKML.layer.getBounds());
    },
  }
};

function setupWebIcon () {

  L.Icon.Web = L.Icon.extend({
    options: {
      className: 'leaflet-marker-web-icon',
      iconHeight: overlayKML.iconSizes.iconSize[1]
    },
    initialize: function (url, options) {
      L.Icon.prototype.initialize.call(this, options);
      this.options.iconUrl = this.options.iconUrl || url;
    },
    _createImg: function (src, el) {
      el = el || document.createElement('img');
      var o = this.options;
      if (!o.iconSize) {
        el.onload = function () {
          o.iconSize = [el.width * (o.iconHeight/el.height), o.iconHeight];
          el.style.width = o.iconSize[1] + 'px';
          el.style.height = o.iconSize[0] + 'px';
          o.iconAnchor = [o.iconSize[0]/2, o.iconSize[1]/2];
          el.style.marginLeft = -o.iconAnchor[0] + 'px';
          el.style.marginTop  = -o.iconAnchor[1] + 'px';
        };
      }
      return L.Icon.prototype._createImg.call(this, src, el);
    }
  });

  L.icon.web = function (url, options) {
    return new L.Icon.Web(url, options);
  };
}

// icon from http://hawcons.com (Hawcons.zip/Hawcons/SVG/Documents/Grey/Filled/icon-98-folder-upload.svg)
overlayKML.label = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="1 0 32 32" width="20" height="100%">'
  // eslint-disable-next-line max-len
  + '<path d="M16,27 L3.99328744,27 C2.89971268,27 2,26.1085295 2,25.008845 L2,14 L31,14 L31,25.0049107 C31,26.1073772 30.1075748,27 29.0067126,27 L17,27 L17,18 L20.25,21.25 L21,20.5 L16.5,16 L12,20.5 L12.75,21.25 L16,18 L16,27 L16,27 Z M2,13 L2,6.991155 C2,5.88967395 2.89666625,5 4.00276013,5 L15,5 L17,9 L28.9941413,9 C30.1029399,9 31,9.8932319 31,10.9950893 L31,13 L2,13 L2,13 L2,13 Z" />'
  + '</svg>';

function setup () {
  overlayKML.toGeoJSON = loadToGeoJSON();
  setupWebIcon();

  var control = new L.Control.Button({
    label: overlayKML.label,
    title: 'Load local file (KML, GeoJSON, GPX)',
  }).addTo(map);
  overlayKML.control = control;
  control.on('click', function () {
    var loader = L.FileListLoader.loadFiles({ multiple: true });
    var event, tasks, handler;
    for (event in overlayKML.events) {
      tasks = overlayKML.events[event];
      for (handler in tasks) {
        loader.on(event, tasks[handler]);
      }
    }
    overlayKML.lastLayer = overlayKML.layer;
    overlayKML.layer = L.featureGroup();
  });

  /* customization sample: alternative markers based on CircleMarker
  // (much faster with large amounts of markers 'cause of using Canvas renderer)
  overlayKML.layerOptions.pointToLayer = function (feature, latlng) {
    return L.circleMarker(latlng, { radius: 4 });
  };
  */

  /* customization sample: permanents labels for features
  // N.B. for KML with a lot of features labels also need some special styling
  //      to reduce cluttering and overlapping.
  overlayKML.layerOptions.tooltipOptions = { permanent: true };
  */

  // customization sample: do not bind toolip/popup
  // delete overlayKML.layerOptions.onEachFeature;

  /* customization sample: override simplestyle defaults
  L.extend(overlayKML.simpleStyle.defaults, {
    'marker-color': '#a24ac3',
    'stroke': '#a24ac3'
  });
  */

  // customization sample: use default styles
  // delete overlayKML.layerOptions.style;

  /* customization sample: former styling function
  // (https://github.com/iitc-project/ingress-intel-total-conversion/pull/727)
  // N.B.: this way of styling is nonstandard and thus not recommended
  // see alternatives higher in the text
  overlayKML.layerOptions.style = function (feature) {
    return feature.properties.style;
  };
  */

  /* more customization samples:
  function setup () {
    var overlayKML = window.plugin.overlayKML;
    if (!overlayKML) { return; }

    // add new handler
    overlayKML.control.on('loaded:success', function () { // single entry in layerChooser
      if (overlayKML.lastLayer) {
        layerChooser.removeLayer(overlayKML.lastLayer);
      }
    });

    // remove some predefined handlers
    overlayKML.control.off('loaded:success', overlayKML.events['loaded:success'].singleLayer);

  }
  setup.priority = 'low';
  */
}

/* exported setup */

function loadToGeoJSON () {
  try {
    // https://github.com/mapbox/togeojson/
    '@include_raw:external/togeojson.js@';
    return toGeoJSON; // eslint-disable-line no-undef

  } catch (e) {
    console.error('togeojson.js loading failed');
    throw e;
  }
}
