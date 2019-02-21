// PORTAL MARKER //////////////////////////////////////////////
// code to create and update a portal marker

L.PortalMarker = L.CircleMarker.extend({

  options: {
    interactive: true
  },

  initialize: function (latlng, data) {
    var options = getMarkerStyleOptions(data);
    // 'data' contain the IITC-specific entity data to be stored in the object options
    options = L.extend(options,data);
    // this.data = data;
    L.CircleMarker.initialize.call(this,latlng,options);
    highlightPortal(this);
  },

  setStyle: function (style) { // stub for highlighters
    L.Util.setOptions(this, style);
    return this;
  },

  setMarkerStyle: function (style) {
    style = L.extend(getMarkerStyleOptions(this.options), style);
    L.Util.setOptions(this,style);
    highlightPortal(this);
    var selected = this._selected && { color: COLOR_SELECTED_PORTAL };
    return L.Path.prototype.setStyle.call(this,selected);
  },

  setSelected: function (action) {
    var same = this._selected === action;
    this._selected = action;
    if (!same || this._selected) { this.setMarkerStyle(); }
    if (this._selected) {
      if (map.hasLayer(this)) { this.bringToFront(); }
    }
  }

});

L.portalMarker = function (latlng, data) {
  return new L.PortalMarker(latlng,data);
};

window.portalMarkerScale = function () {
  var zoom = map.getZoom();
  if (L.Browser.mobile)
    return zoom >= 16 ? 1.5 : zoom >= 14 ? 1.2 : zoom >= 11 ? 1.0 : zoom >= 8 ? 0.65 : 0.5;
  else
    return zoom >= 14 ? 1 : zoom >= 11 ? 0.8 : zoom >= 8 ? 0.65 : 0.5;
};

window.getMarkerStyleOptions = function (details) {
  var scale = window.portalMarkerScale();

  //   portal level      0  1  2  3  4  5  6  7  8
  var LEVEL_TO_WEIGHT = [2, 2, 2, 2, 2, 3, 3, 4, 4];
  var LEVEL_TO_RADIUS = [7, 7, 7, 7, 8, 8, 9,10,11];

  var level = Math.floor(details.level||0);

  var lvlWeight = LEVEL_TO_WEIGHT[level] * Math.sqrt(scale);
  var lvlRadius = LEVEL_TO_RADIUS[level] * scale;

  var dashArray = null;
  // thinner and dashed outline for placeholder portals
  if (details.team !== TEAM_NONE && level===0) {
    lvlWeight = 1;
    dashArray = '1,2';
  }

  var options = {
    stroke: true,
    opacity: 1,
    fill: true,
    fillColor: null, // same as color by default
    fillOpacity: 0.5,

    radius: lvlRadius,
    color: COLORS[details.team],
    weight: lvlWeight,
    dashArray: dashArray
  };

  return options;
};

// deprecated functions (subject to remove):

// create a new marker. 'data' contain the IITC-specific entity data to be stored in the object options
window.createMarker = L.portalMarker;

// eslint-disable-next-line no-unused-vars
window.setMarkerStyle = function (marker, selected) {
  marker.setMarkerStyle()
};
