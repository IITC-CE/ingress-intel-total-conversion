// PORTAL MARKER //////////////////////////////////////////////
// code to create and update a portal marker

L.PortalMarker = L.CircleMarker.extend({
  options: {},

  initialize: function(latlng, data) {
    var styleOptions = window.getMarkerStyleOptions(data);
    var options = L.extend({}, data, styleOptions, { interactive: true });

    L.CircleMarker.prototype.initialize.call(this, latlng, options);

    highlightPortal(this);
  },
  updateData: function(data) {
    var styleOptions = window.getMarkerStyleOptions(data);
    var options = L.extend({}, data, styleOptions, { interactive: true });
    L.setOptions(this, options);

    this.setStyle(styleOptions);
    thighlightPortal(this);
  },
  reset: function (selected) {
    var styleOptions = window.getMarkerStyleOptions(this.options);
    this.setStyle(styleOptions);

    highlightPortal(this);

    if (selected) {
      this.setStyle ({color: COLOR_SELECTED_PORTAL});
    }
  },
});

window.portalMarkerScale = function() {
  var zoom = map.getZoom();
  if (L.Browser.mobile)
    return zoom >= 16 ? 1.5 : zoom >= 14 ? 1.2 : zoom >= 11 ? 1.0 : zoom >= 8 ? 0.65 : 0.5;
  else
    return zoom >= 14 ? 1 : zoom >= 11 ? 0.8 : zoom >= 8 ? 0.65 : 0.5;
}

// create a new marker. 'data' contain the IITC-specific entity data to be stored in the object options
window.createMarker = function(latlng, data) {
  return new L.PortalMarker(latlng, data);
}


window.setMarkerStyle = function(marker, selected) {
  marker.reset(selected);
}


window.getMarkerStyleOptions = function(details) {
  var scale = window.portalMarkerScale();

  //   portal level      0  1  2  3  4  5  6  7  8
  var LEVEL_TO_WEIGHT = [2, 2, 2, 2, 2, 3, 3, 4, 4];
  var LEVEL_TO_RADIUS = [7, 7, 7, 7, 8, 8, 9,10,11];

  var level = Math.floor(details.level||0);

  var lvlWeight = LEVEL_TO_WEIGHT[level] * Math.sqrt(scale);
  var lvlRadius = LEVEL_TO_RADIUS[level] * scale;

  var dashArray = null;
  // thinner and dashed outline for placeholder portals
  if (details.team != TEAM_NONE && level==0) {
    lvlWeight = 1;
    dashArray = '1,2';
  }

  var options = {
    radius: lvlRadius,
    stroke: true,
    color: COLORS[details.team],
    weight: lvlWeight,
    opacity: 1,
    fill: true,
    fillColor: COLORS[details.team],
    fillOpacity: 0.5,
    dashArray: dashArray
  };

  return options;
}

