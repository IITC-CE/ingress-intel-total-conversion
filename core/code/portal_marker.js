/* global IITC, L, log -- eslint */

/**
 * Namespace for creating, updating and styling portal markers on the map.
 *
 * @memberof IITC.portal
 * @namespace marker
 */

const PREFETCH_TIME = 200; // if the mouse stays these miliseconds on the marker prefetch portal details

// portal hooks
function handler_portal_click(e) {
  IITC.portal.display.select(e.target.options.guid, e.type);
  IITC.portal.display.renderDetails(e.target.options.guid);
}

function handler_portal_dblclick(e) {
  IITC.portal.display.select(e.target.options.guid, e.type);
  IITC.portal.display.renderDetails(e.target.options.guid);
  window.map.setView(e.target.getLatLng(), window.DEFAULT_ZOOM);
}

function handler_portal_contextmenu(e) {
  IITC.portal.display.select(e.target.options.guid, e.type);
  IITC.portal.display.renderDetails(e.target.options.guid);
  if (window.isSmartphone()) {
    window.show('info');
  } else {
    const scrollwrapper = document.getElementById('scrollwrapper');
    // equivalent of jQuery ':visible'
    const visible = scrollwrapper && (scrollwrapper.offsetWidth > 0 || scrollwrapper.offsetHeight > 0 || scrollwrapper.getClientRects().length > 0);
    if (!visible) {
      document.getElementById('sidebartoggle')?.click();
    }
  }
}

function handler_portal_mouse_enter(e) {
  window.clearTimeout(e.target.options.prefetchTimer);
  e.target.options.prefetchTimer = window.setTimeout(() => do_prefetch(e), PREFETCH_TIME);
}

function handler_portal_mouse_leave(e) {
  window.clearTimeout(e.target.options.prefetchTimer);
}

function do_prefetch(e) {
  const guid = e.target.options.guid;
  if (guid && !IITC.portal.details.isFresh(guid)) {
    log.debug(`prefetch portal details ${guid}`);
    IITC.portal.details.request(guid, true);
  }
}

L.PortalMarker = L.CircleMarker.extend({
  options: {},

  statics: {
    // base style
    portalBaseStyle: {
      stroke: true,
      opacity: 1,
      fill: true,
      fillOpacity: 0.5,
      interactive: true,
    },
    // placeholder style
    placeholderStyle: {
      dashArray: '1,2',
      weight: 1,
    },
    // portal level   0  1  2  3  4  5  6  7  8
    LEVEL_TO_WEIGHT: [2, 2, 2, 2, 2, 3, 3, 4, 4],
    LEVEL_TO_RADIUS: [7, 7, 7, 7, 8, 8, 9, 10, 11],
  },

  initialize: function (latlng, data) {
    L.CircleMarker.prototype.initialize.call(this, latlng);
    this._selected = data.guid === window.selectedPortal;
    this.updateDetails(data);

    this.on('click', handler_portal_click);
    this.on('dblclick', handler_portal_dblclick);
    this.on('contextmenu', handler_portal_contextmenu);
    this.on('mouseover', handler_portal_mouse_enter);
    this.on('mouseout', handler_portal_mouse_leave);
  },

  willUpdate: function (details) {
    // details are from a placeholder
    if (details.level === undefined) {
      // if team differs and corresponding link is more recent (ignore field)
      return this._details.timestamp < details.timestamp && this._details.team !== details.team;
    }
    // more recent timestamp, this occurs when the data has changed because of:
    //  - resonator deploy/upgrade
    //  - mod deploy
    //  - recharge/damage/decay
    //  - portal edit (title, location, portal main picture)
    if (this._details.timestamp < details.timestamp) {
      return true;
    }
    // current marker is a placeholder, and details is real data
    if (this.isPlaceholder() && this._details.team === details.team) {
      return true;
    }
    // even if we get history that was missing ? is it even possible ?
    if (this._details.timestamp > details.timestamp) {
      return false;
    }

    // this._details.timestamp === details.timestamp

    // get new history
    if (details.history) {
      if (!this._details.history) {
        return true;
      }
      if (this._details.history._raw !== details.history._raw) {
        return true;
      }
    }

    // get details portal data
    if (!this._details.mods && details.mods) {
      return true;
    }

    return false;
  },

  updateDetails: function (details) {
    if (this._details) {
      // portal has been moved
      if (this._details.latE6 !== details.latE6 || this._details.lngE6 !== details.lngE6) {
        this.setLatLng(new L.LatLng(details.latE6 / 1e6, details.lngE6 / 1e6));
      }

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
      } else if (this._details.timestamp === details.timestamp) {
        // we got more details (core/summary -> summary/detailed/extended)
        [
          'level',
          'health',
          'resCount',
          'image',
          'title',
          'ornaments',
          'mission',
          'mission50plus',
          'artifactBrief',
          'mods',
          'resonators',
          'owner',
          'artifactDetail',
        ].forEach((prop) => {
          if (details[prop]) this._details[prop] = details[prop];
        });
        // smarter update for history (cause it's missing sometimes)
        if (details.history) {
          if (!this._details.history) {
            this._details.history = details.history;
          } else {
            if (this._details.history._raw && details.history._raw !== this._details.history._raw) {
              log.warn('new portal data has lost some history');
            }
            this._details.history._raw |= details.history._raw;
            ['visited', 'captured', 'scoutControlled'].forEach((prop) => {
              this._details.history[prop] ||= details.history[prop];
            });
          }
        }
        // LEGACY - TO BE REMOVED AT SOME POINT! use .guid, .timestamp and .data instead
        this._details.ent = details.ent;
      } else {
        // permanent data (history only)
        if (!details.history) {
          details.history = this._details.history;
        }

        this._details = details;
      }
    } else {
      this._details = details;
    }

    this._level = parseInt(this._details.level) || 0;
    this._team = IITC.utils.getTeamId(this._details.team);

    // the data returns unclaimed portals as level 1 - but IITC wants them treated as level 0
    if (this._team === window.TEAM_NONE) {
      this._level = 0;
    }

    // compatibility
    const dataOptions = {
      guid: this._details.guid,
      level: this._level,
      team: this._team,
      ent: this._details.ent, // LEGACY - TO BE REMOVED AT SOME POINT! use .guid, .timestamp and .data instead
      timestamp: this._details.timestamp,
      data: this._details,
    };
    L.setOptions(this, dataOptions);

    this.setSelected();
    if (this.hasFullDetails()) {
      IITC.portal.details.store(this.options.guid, this._details);
    }
  },

  getDetails: function () {
    return this._details;
  },

  isPlaceholder: function () {
    return this._details.level === undefined;
  },

  hasFullDetails: function () {
    return !!this._details.mods;
  },

  setStyle: function (style) {
    // stub for highlighters
    L.Util.setOptions(this, style);
    return this;
  },

  setMarkerStyle: function (style) {
    const styleOptions = L.Util.extend(this._style(), style);
    L.Util.setOptions(this, styleOptions);

    L.Util.setOptions(this, IITC.portal.highlighter.highlight(this));

    const selected = L.extend({ radius: this.options.radius }, this._selected && { color: window.COLOR_SELECTED_PORTAL });
    return L.CircleMarker.prototype.setStyle.call(this, selected);
  },

  setSelected: function (selected) {
    if (selected === false) {
      this._selected = false;
    } else {
      this._selected = this._selected || selected;
    }

    this.setMarkerStyle();

    if (this._selected && window.map.hasLayer(this)) {
      this.bringToFront();
    }
  },

  _style: function () {
    let dashArray = null;
    // dashed outline for placeholder portals
    if (this.isPlaceholder()) {
      dashArray = L.PortalMarker.placeholderStyle.dashArray;
    }

    return L.extend(this._scale(), L.PortalMarker.portalBaseStyle, {
      color: window.COLORS[this._team],
      fillColor: window.COLORS[this._team],
      dashArray: dashArray,
    });
  },

  _scale: function () {
    const scale = IITC.portal.marker.scale();

    const level = Math.floor(this._level || 0);

    let lvlWeight = L.PortalMarker.LEVEL_TO_WEIGHT[level] * Math.sqrt(scale);
    const lvlRadius = L.PortalMarker.LEVEL_TO_RADIUS[level] * scale;

    // thinner outline for placeholder portals
    if (this.isPlaceholder()) {
      lvlWeight = L.PortalMarker.placeholderStyle.weight;
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
 * @memberof IITC.portal.marker
 * @returns {number} The scale factor for portal markers.
 */
const scale = function () {
  const zoom = window.map.getZoom();
  if (L.Browser.mobile) return zoom >= 16 ? 1.5 : zoom >= 14 ? 1.2 : zoom >= 11 ? 1.0 : zoom >= 8 ? 0.65 : 0.5;
  else return zoom >= 14 ? 1 : zoom >= 11 ? 0.8 : zoom >= 8 ? 0.65 : 0.5;
};

/**
 * Creates a new portal marker on the map.
 *
 * @memberof IITC.portal.marker
 * @param {L.LatLng} latlng - The latitude and longitude where the marker will be placed.
 * @param {Object} data - The IITC-specific entity data to be stored in the marker options.
 * @returns {L.PortalMarker} A Leaflet circle marker representing the portal.
 */
const create = function (latlng, data) {
  return new L.PortalMarker(latlng, data);
};

/**
 * Sets the style of a portal marker, including options for when the portal is selected.
 *
 * @memberof IITC.portal.marker
 * @param {L.PortalMarker} marker - The portal marker whose style will be set.
 * @param {boolean} selected - Indicates if the portal is selected.
 */
const setStyle = function (marker, selected) {
  marker.setSelected(selected);
};

/**
 * Determines the style options for a portal marker based on its details.
 *
 * @memberof IITC.portal.marker
 * @param {Object} details - Details of the portal, including team and level.
 * @returns {Object} Style options for the portal marker.
 */
const getStyleOptions = function (details) {
  const scale = IITC.portal.marker.scale();

  const level = Math.floor(details.level || 0);

  let lvlWeight = L.PortalMarker.LEVEL_TO_WEIGHT[level] * Math.sqrt(scale);
  const lvlRadius = L.PortalMarker.LEVEL_TO_RADIUS[level] * scale;

  let dashArray = null;
  // thinner and dashed outline for placeholder portals
  if (details.team !== window.TEAM_NONE && level === 0) {
    lvlWeight = L.PortalMarker.placeholderStyle.weight;
    dashArray = L.PortalMarker.placeholderStyle.dashArray;
  }

  const options = L.extend(
    {
      radius: lvlRadius,
      weight: lvlWeight,
    },
    L.PortalMarker.portalBaseStyle,
    {
      color: window.COLORS[details.team],
      fillColor: window.COLORS[details.team],
      dashArray: dashArray,
    }
  );

  return options;
};

IITC.portal.marker = {
  scale,
  create,
  setStyle,
  getStyleOptions,
};

// Map of legacy global names to their new names within IITC.portal.marker
const legacyMarkerMappings = {
  portalMarkerScale: 'scale',
  createMarker: 'create',
  setMarkerStyle: 'setStyle',
  getMarkerStyleOptions: 'getStyleOptions',
};

IITC.registerLegacyAliases(IITC.portal.marker, legacyMarkerMappings);
