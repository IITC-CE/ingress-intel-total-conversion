/* global L -- eslint */

/**
 * @file This file contains the code related to creating and updating portal markers on the map.
 * @module portal_marker
 */

var portalBaseStyle = {
  stroke: true,
  opacity: 1,
  fill: true,
  fillOpacity: 0.5,
  interactive: true,
};

// portal hooks
function handler_portal_click (e) {
  e.target.select(true);
}
function handler_portal_dblclick (e) {
  e.target.select(true);
  window.map.setView(e.target.getLatLng(), DEFAULT_ZOOM);
}
function handler_portal_contextmenu (e) {
  e.target.select(true);
  if (window.isSmartphone()) {
    window.show('info');
  } else if (!$('#scrollwrapper').is(':visible')) {
    $('#sidebartoggle').click();
  }
}

L.PortalMarker = L.CircleMarker.extend({
  options: {},

  initialize: function(latlng, data) {
    L.CircleMarker.prototype.initialize.call(this, latlng);
    this.updateDetails(data);

    this.on('click', handler_portal_click);
    this.on('dblclick', handler_portal_dblclick);
    this.on('contextmenu', handler_portal_contextmenu);
  },
  willUpdate: function (details) {
    // portal location edit
    if (this._details.latE6 !== details.latE6 || this._details.lngE6 !== details.lngE6)
      return true;
    // new data
    if (this._details.timestamp < details.timestamp)
      return true;
    // even if we get history that was missing ? is it even possible ?
    if (this._details.timestamp > details.timestamp)
      return false;

    // get new history
    if (details.history) {
      if (!this._details.history)
        return true;
      if (this._details.history._raw !== details.history._raw)
        return true;
    }

    // get details portal data
    if (!this._details.mods && details.mods)
      return true;

    // does portal picture/name/location modfication update the timestamp ?
    return false;
  },
  updateDetails: function(details) {
    // portal has been moved
    if (this._details) {
      if (this._details.latE6 !== details.latE6 || this._details.lngE6 !== details.lngE6)
        this.setLatLng(L.latLng(details.latE6/1E6, details.lngE6/1E6));

      // we got more details
      if (this._details.timestamp == details.timestamp) {
        var localThis = this;
        ["mods", "resonators", "owner", "artifactDetail", "history"].forEach(function (prop) {
          if (details[prop]) localThis._details[prop] = details[prop];
        });
        // LEGACY - TO BE REMOVED AT SOME POINT! use .guid, .timestamp and .data instead
        this._details.ent = details.ent;
      } else {
        // permanent data (history only)
        if (!details.history) details.history = this._details.history;

        this._details = details;
      }
    } else this._details = details;

    this._level = parseInt(details.level) || 0;
    this._team = window.teamStringToId(details.team);

    // the data returns unclaimed portals as level 1 - but IITC wants them treated as level 0
    if (this._team === TEAM_NONE) this._level = 0;

    // compatibility
    var dataOptions = {
      guid: this._details.guid,
      level: this._level,
      team: this._team,
      ent: this._details.ent, // LEGACY - TO BE REMOVED AT SOME POINT! use .guid, .timestamp and .data instead
      timestamp: this._details.timestamp,
      data: this._details
    };
    L.setOptions(this, dataOptions);

    if (this._selected) {
      this.renderDetails();
    }

    this.reset();
  },
  renderDetails() {
    if (!this._rendering) {
      this._rendering = true;
      renderPortalDetails(this._details.guid);
      this._rendering = false;
    }
  },
  getDetails: function () {
    return this._details;
  },
  hasFullDetails: function () {
    return !!this._details.mods
  },
  select: function (selected) {
    if (selected) {
      this.renderDetails();
    }
    return this.reset(selected);
  },
  reset: function (selected) {
    var styleOptions = this._style();
    this.setStyle(styleOptions);

    highlightPortal(this);

    if (selected === false)
      this._selected = false;
    else
      this._selected = this._selected || selected;

    if (this._selected)
      this.setStyle ({color: COLOR_SELECTED_PORTAL});
  },
  _style: function () {
    var dashArray = null;
    // dashed outline for placeholder portals
    if (this._team !== TEAM_NONE && this._level === 0) dashArray = '1,2';

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

    var level = Math.floor(this._level || 0);

    var lvlWeight = LEVEL_TO_WEIGHT[level] * Math.sqrt(scale);
    var lvlRadius = LEVEL_TO_RADIUS[level] * scale;

    // thinner outline for placeholder portals
    if (this._team !== TEAM_NONE && level === 0) {
      lvlWeight = 1;
    }

    return {
      radius: lvlRadius,
      weight: lvlWeight,
    };
  },
});

/**
 * Calculates the scale of portal markers based on the current zoom level of the map.
 *
 * @function portalMarkerScale
 * @returns {number} The scale factor for portal markers.
 */
window.portalMarkerScale = function () {
  var zoom = window.map.getZoom();
  if (L.Browser.mobile) return zoom >= 16 ? 1.5 : zoom >= 14 ? 1.2 : zoom >= 11 ? 1.0 : zoom >= 8 ? 0.65 : 0.5;
  else return zoom >= 14 ? 1 : zoom >= 11 ? 0.8 : zoom >= 8 ? 0.65 : 0.5;
};

/**
 * Creates a new portal marker on the map.
 *
 * @function createMarker
 * @param {L.LatLng} latlng - The latitude and longitude where the marker will be placed.
 * @param {Object} data - The IITC-specific entity data to be stored in the marker options.
 * @returns {L.circleMarker} A Leaflet circle marker representing the portal.
 */
window.createMarker = function(latlng, data) {
  return new L.PortalMarker(latlng, data);
}

/**
 * Sets the style of a portal marker, including options for when the portal is selected.
 *
 * @function setMarkerStyle
 * @param {L.circleMarker} marker - The portal marker whose style will be set.
 * @param {boolean} selected - Indicates if the portal is selected.
 */
window.setMarkerStyle = function(marker, selected) {
  marker.select(selected);
}

/**
 * Determines the style options for a portal marker based on its details.
 *
 * @function getMarkerStyleOptions
 * @param {Object} details - Details of the portal, including team and level.
 * @returns {Object} Style options for the portal marker.
 */
window.getMarkerStyleOptions = function (details) {
  var scale = window.portalMarkerScale();

  //   portal level      0  1  2  3  4  5  6  7  8
  var LEVEL_TO_WEIGHT = [2, 2, 2, 2, 2, 3, 3, 4, 4];
  var LEVEL_TO_RADIUS = [7, 7, 7, 7, 8, 8, 9, 10, 11];

  var level = Math.floor(details.level || 0);

  var lvlWeight = LEVEL_TO_WEIGHT[level] * Math.sqrt(scale);
  var lvlRadius = LEVEL_TO_RADIUS[level] * scale;

  var dashArray = null;
  // thinner and dashed outline for placeholder portals
  if (details.team !== window.TEAM_NONE && level === 0) {
    lvlWeight = 1;
    dashArray = '1,2';
  }

  var options = {
    radius: lvlRadius,
    stroke: true,
    color: window.COLORS[details.team],
    weight: lvlWeight,
    opacity: 1,
    fill: true,
    fillColor: window.COLORS[details.team],
    fillOpacity: 0.5,
    dashArray: dashArray,
  };

  return options;
};
