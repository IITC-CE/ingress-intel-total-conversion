// @author         danielatkins
// @name           Overlay KML / GPX / GeoJSON
// @category       Layer
// @version        0.3.3
// @description    Allow users to overlay their own KML / GPX / GeoJSON files on top of IITC.

/* exported setup, changelog --eslint */
/* global L -- eslint */

var changelog = [
  {
    version: '0.3.32',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.3.2',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.3.1',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var overlayKML = {};
window.plugin.overlayKML = overlayKML;

// https://github.com/mapbox/simplestyle-spec
// https://github.com/mapbox/mapbox.js/blob/publisher-production/src/simplestyle.js
// edit: http://geojson.io/

// https://github.com/mapbox/simplestyle-spec/tree/master/1.1.0
overlayKML.simpleStyle = (function () {
  function style(feature) {
    var s = {};
    var Props = feature.properties || {};
    var map = style[feature.geometry.type] || style.map;
    for (var prop in map) {
      s[map[prop]] = prop in Props ? Props[prop] : style.defaults[prop] || '';
    }
    return s;
  }

  style.defaults = {
    'marker-size': 'medium',
    'marker-color': '#7e7e7e',
    stroke: '#555555',
    'stroke-opacity': 1.0,
    'stroke-width': 2,
    fill: '#555555',
    'fill-opacity': 0.5,
  };

  style.Point = {
    'marker-color': 'color',
    // 'marker-size'
    // 'marker-symbol'
  };

  style.map = {
    // 'title'
    // 'description'
    stroke: 'color',
    'stroke-opacity': 'opacity',
    'stroke-width': 'weight',
    fill: 'fillColor',
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
  iconSize: [16, 24],
  iconAnchor: [8, 24],
  popupAnchor: [1, -20],
  tooltipAnchor: [1, -16],
  shadowSize: [24, 24],
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
  style: overlayKML.simpleStyle,
};

// https://github.com/makinacorpus/Leaflet.FileLayer#usage
overlayKML.options = {
  fileSizeLimit: 4096,
  fitBounds: true,
  addToMap: true,
  layerOptions: overlayKML.layerOptions,
};

// predefined handlers
overlayKML.events = {

  'data:error': {
    alert: function (e) {
      console.warn(e);
      window.dialog({ title: 'Error', text: e.error.message });
    },
  },

  'data:loaded': {
    singleLayer: function (e) {
      // ensure that previous layer removed on new load
      // (it stays available in layer chooser)
      // see issue when loadin several files at once: https://github.com/makinacorpus/Leaflet.FileLayer/issues/68
      if (overlayKML.lastLayer) {
        overlayKML.lastLayer.remove();
      }
      overlayKML.lastLayer = e.layer;
    },
    layerChooser: function (e) {
      // to add loaded file to layer chooser
      // todo do not store layers to localStorage
      window.layerChooser.addOverlay(e.layer, e.filename);
    },
  },
};

function setupWebIcon() {
  L.Icon.Web = L.Icon.extend({
    options: {
      className: 'leaflet-marker-web-icon',
      iconHeight: overlayKML.iconSizes.iconSize[1],
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
          o.iconSize = [el.width * (o.iconHeight / el.height), o.iconHeight];
          el.style.width = o.iconSize[1] + 'px';
          el.style.height = o.iconSize[0] + 'px';
          o.iconAnchor = [o.iconSize[0] / 2, o.iconSize[1] / 2];
          el.style.marginLeft = -o.iconAnchor[0] + 'px';
          el.style.marginTop = -o.iconAnchor[1] + 'px';
        };
      }
      return L.Icon.prototype._createImg.call(this, src, el);
    },
  });

  L.icon.web = function (url, options) {
    return new L.Icon.Web(url, options);
  };
}

// icon from http://hawcons.com (Hawcons.zip/Hawcons/SVG/Documents/Grey/Filled/icon-98-folder-upload.svg)
overlayKML.label =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="1 0 32 32" width="20" height="100%">' +
  '<path d="M16,27 L3.99328744,27 C2.89971268,27 2,26.1085295 2,25.008845 L2,14 L31,14 L31,25.0049107 C31,26.1073772 30.1075748,27 29.0067126,27 L17,27 L17,18 L20.25,21.25 L21,20.5 L16.5,16 L12,20.5 L12.75,21.25 L16,18 L16,27 L16,27 Z M2,13 L2,6.991155 C2,5.88967395 2.89666625,5 4.00276013,5 L15,5 L17,9 L28.9941413,9 C30.1029399,9 31,9.8932319 31,10.9950893 L31,13 L2,13 L2,13 L2,13 Z" />' +
  '</svg>';

function setup() {
  loadLeafletFileLayer();
  setupWebIcon();

  L.Control.FileLayerLoad.LABEL = overlayKML.label;
  var control = L.Control.fileLayerLoad(overlayKML.options).addTo(window.map);
  overlayKML.control = control;

  var event, tasks, handler;
  for (event in overlayKML.events) {
    tasks = overlayKML.events[event];
    for (handler in tasks) {
      control.loader.on(event, tasks[handler]);
    }
  }

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

    // add new handler
    overlayKML.control.on('data:loaded', function (e) { // single layer in chooser
      e.layer.on('remove', function (ev) { layerChooser.removeLayer(ev.target); });
    });

    // remove some predefined handlers
    overlayKML.control.off('data:loaded', overlayKML.events['data:loaded'].singleLayer);

  }
  setup.priority = 'low';
  */
}

function loadLeafletFileLayer() {
  try {
    // https://github.com/mapbox/togeojson/
    // eslint-disable-next-line
    '@include_raw:external/togeojson.js@';
  } catch (e) {
    console.error('togeojson.js loading failed');
    throw e;
  }

  // eslint-disable-next-line
  window.toGeoJSON = toGeoJSON;

  try {
    // https://github.com/makinacorpus/Leaflet.FileLayer/
    // eslint-disable-next-line
    '@include_raw:external/leaflet.filelayer.js@';
  } catch (e) {
    console.error('leaflet.filelayer.js loading failed');
    throw e;
  }
}
