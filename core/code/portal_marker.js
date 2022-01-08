// PORTAL MARKER //////////////////////////////////////////////
// code to create and update a portal marker
var portalBaseStyle = {
  stroke: true,
  opacity: 1,
  fill: true,
  fillOpacity: 0.5,
  interactive: true
};

L.PortalMarker = L.CircleMarker.extend({
  options: {},

  initialize: function(latlng, data) {
    L.CircleMarker.prototype.initialize.call(this, latlng);
    this.updateDetails(data);
  },
  updateDetails: function(details) {
    // xxx: handle permanent data
    this._details = details;

    this._level = parseInt(details.level)||0;
    this._team = teamStringToId(details.team);

    // the data returns unclaimed portals as level 1 - but IITC wants them treated as level 0
    if (this._team == TEAM_NONE) this._level = 0;

    // compatibility
    var dataOptions = {
      guid: this._details.guid,
      level: this._level,
      team: this._team,
      ent: this._details.ent,  // LEGACY - TO BE REMOVED AT SOME POINT! use .guid, .timestamp and .data instead
      timestamp: this._details.timestamp,
      data: this._details
    };
    L.setOptions(this, dataOptions);

    this.reset();
  },
  getDetails: function () {
    return this._details;
  },
  hasFullDetails: function () {
    return !!this._details.mods
  },
  reset: function (selected) {
    var styleOptions = this._style();
    this.setStyle(styleOptions);

    highlightPortal(this);

    if (selected) {
      this.setStyle ({color: COLOR_SELECTED_PORTAL});
    }
  },
  _style: function () {
    var dashArray = null;
    // dashed outline for placeholder portals
    if (this._team != TEAM_NONE && this._level==0) dashArray = '1,2';

    return L.extend(this._scale(), portalBaseStyle, {
      color: COLORS[this._team],
      fillColor: COLORS[this._team],
      dashArray: dashArray
    });
  },
  _scale: function () {
    var scale = window.portalMarkerScale();

    //   portal level      0  1  2  3  4  5  6  7  8
    var LEVEL_TO_WEIGHT = [2, 2, 2, 2, 2, 3, 3, 4, 4];
    var LEVEL_TO_RADIUS = [7, 7, 7, 7, 8, 8, 9,10,11];

    var level = Math.floor(this._level||0);

    var lvlWeight = LEVEL_TO_WEIGHT[level] * Math.sqrt(scale);
    var lvlRadius = LEVEL_TO_RADIUS[level] * scale;

    // thinner outline for placeholder portals
    if (this._team != TEAM_NONE && level==0) {
      lvlWeight = 1;
    }

    return {
      radius: lvlRadius,
      weight: lvlWeight,
    };
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

