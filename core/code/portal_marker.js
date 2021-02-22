// PORTAL MARKER //////////////////////////////////////////////
// code to create and update a portal marker
var portalBaseStyle = {
  stroke: true,
  opacity: 1,
  fill: true,
  fillOpacity: 0.5,
  interactive: true
};

// portal hooks
function handler_portal_click (e) {
  window.selectPortal(e.target.options.guid, e.type);
  window.renderPortalDetails(e.target.options.guid)
}
function handler_portal_dblclick (e) {
  window.selectPortal(e.target.options.guid, e.type);
  window.renderPortalDetails(e.target.options.guid)
  window.map.setView(e.target.getLatLng(), DEFAULT_ZOOM);
}
function handler_portal_contextmenu (e) {
  window.selectPortal(e.target.options.guid, e.type);
  window.renderPortalDetails(e.target.options.guid)
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
    this._selected = data.guid === selectedPortal;
    this.updateDetails(data);

    this.on('click', handler_portal_click);
    this.on('dblclick', handler_portal_dblclick);
    this.on('contextmenu', handler_portal_contextmenu);
  },
  willUpdate: function (details) {
    // portal location edit
    if (this._details.latE6 !== details.latE6 || this._details.lngE6 !== details.lngE6)
      return true;
    // placeholder
    if (details.level === undefined) {
      // if team differs and corresponding link/field is more recent
      if (this._details.timestamp < details.timestamp && this._details.team !== details.team)
        return true;
      // in any other case
      return false;
    }
    // new data
    if (this._details.timestamp < details.timestamp)
      return true;
    // current marker is a placeholder, and details is real data
    if (this.isPlaceholder() && this._details.team === details.team)
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
    if (this._details) {
      // portal has been moved
      if (this._details.latE6 !== details.latE6 || this._details.lngE6 !== details.lngE6)
        this.setLatLng(L.latLng(details.latE6/1E6, details.lngE6/1E6));

      // core data from a placeholder
      if (details.level === undefined) {
        // if team has changed
        if (this._details.timestamp < details.timestamp && this._details.team !== details.team) {
          // keep history, title, image
          details.title = this._details.title;
          details.image = this._details.image;
          details.history = this._details.history;
          this._details = details;
        }
      } else if (this._details.timestamp == details.timestamp) {
        // we got more details
        var localThis = this;
        ["mods", "resonators", "owner", "artifactDetail"].forEach(function (prop) {
          if (details[prop]) localThis._details[prop] = details[prop];
        });
        // smarter update for history (cause it's missing sometimes)
        if (details.history) {
          if (!this._details.history) this._details.history = details.history;
          else {
            if (this._details.history._raw & details.history._raw != this._details.history._raw)
              log.warn("new portal data has lost some history");
            this._details.history._raw |= details.history._raw;
            ['visited', 'captured', 'scoutControlled'].forEach(function (prop) {
              localThis._details.history[prop] ||= details.history[prop];
            });
          }
        }
        // LEGACY - TO BE REMOVED AT SOME POINT! use .guid, .timestamp and .data instead
        this._details.ent = details.ent;
      } else {
        // permanent data (history only)
        if (!details.history) details.history = this._details.history;

        this._details = details;
      }
    } else this._details = details;

    this._level = parseInt(this._details.level)||0;
    this._team = teamStringToId(this._details.team);

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

    if (this._selected) {
      this.renderDetails();
    }

    this.setSelected();
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
  isPlaceholder: function () {
    return this._details.level === undefined;
  },
  hasFullDetails: function () {
    return !!this._details.mods
  },
  setStyle: function (style) { // stub for highlighters
    L.Util.setOptions(this, style);
    return this;
  },
  setMarkerStyle: function (style) {
    var styleOptions = L.Util.extend(this._style(), style);
    L.Util.setOptions(this, styleOptions);

    L.Util.setOptions(this, highlightPortal(this));

    var selected = L.extend(
      { radius: this.options.radius },
      this._selected && { color: COLOR_SELECTED_PORTAL }
    );
    return L.CircleMarker.prototype.setStyle.call(this, selected);
  },
  setSelected: function (selected) {
    if (selected === false)
      this._selected = false;
    else
      this._selected = this._selected || selected;

    this.setMarkerStyle();

    if (this._selected && window.map.hasLayer(this))
      this.bringToFront();
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
  marker.setSelected(selected);
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

