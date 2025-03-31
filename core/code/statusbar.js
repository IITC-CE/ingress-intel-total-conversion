/* global IITC */

/**
 * @file Status bar for IITC that provides status information
 * for both map status and portal status, with API for mobile app integration.
 * @module IITC.statusbar
 */

window.IITC.statusbar = {};

/**
 * Map status module - handles map status information
 * @namespace IITC.statusbar.map
 */
window.IITC.statusbar.map = {
  _data: null,
  _timer: null,

  /**
   * Gets current map status data
   * @returns {Object} Structured data about map status
   */
  getData: function () {
    var tileParams = window.getDataZoomTileParameters();

    // Build comprehensive status data object
    this._data = {
      portalLevels: {
        hasPortals: tileParams.hasPortals,
        minLinkLength: tileParams.minLinkLength,
      },
      mapStatus: window.mapDataRequest ? window.mapDataRequest.getStatus() : null,
      requests: {
        active: window.activeRequests.length,
        failed: window.failedRequestCount,
      },
      progress: 1,
    };

    // Calculate progress for progress indicator
    if (this._data.mapStatus && this._data.mapStatus.progress !== undefined) {
      this._data.progress = this._data.mapStatus.progress;
    } else if (this._data.requests.active > 0) {
      // Show indeterminate progress when requests are active but no specific progress value
      this._data.progress = -1;
    }

    return this._data;
  },

  /**
   * Renders HTML for map status
   * @param {Object} data - Status data to render
   * @returns {string} HTML representation of map status
   */
  render: function (data) {
    var t = '<span class="help portallevel" title="Indicates portal levels/link lengths displayed. Zoom in to display more.">';

    // Portal levels / links section
    if (data.portalLevels.hasPortals) {
      t += '<span id="loadlevel">portals</span>';
    } else {
      if (!window.isSmartphone()) {
        // Space is valuable on mobile
        t += '<b>links</b>: ';
      }

      if (data.portalLevels.minLinkLength > 0) {
        t +=
          '<span id="loadlevel">&gt;' +
          (data.portalLevels.minLinkLength > 1000 ? data.portalLevels.minLinkLength / 1000 + 'km' : data.portalLevels.minLinkLength + 'm') +
          '</span>';
      } else {
        t += '<span id="loadlevel">all links</span>';
      }
    }

    t += '</span>';

    // Map status display section
    t += ' <span class="map"><b>map</b>: ';

    if (data.mapStatus) {
      // If we have detailed status info
      if (data.mapStatus.long) {
        t += '<span class="help" title="' + data.mapStatus.long + '">' + data.mapStatus.short + '</span>';
      } else {
        t += '<span>' + data.mapStatus.short + '</span>';
      }

      // Show percentage if available and not indeterminate
      if (data.mapStatus.progress !== undefined && data.mapStatus.progress !== -1) {
        t += ' ' + Math.floor(data.mapStatus.progress * 100) + '%';
      }
    } else {
      t += '...unknown...';
    }

    t += '</span>';

    // Request status section
    if (data.requests.active > 0) {
      t += ' ' + data.requests.active + ' requests';
    }
    if (data.requests.failed > 0) {
      t += ' <span style="color:#f66">' + data.requests.failed + ' failed</span>';
    }

    return t;
  },

  /**
   * Updates the map status - core function that should be called when map data changes
   * This function handles both updating the DOM and calling the mobile app API
   */
  update: function () {
    var data = this.getData();

    if (window.isApp) {
      if (window.app.setMapStatus) {
        window.app.setMapStatus(data);
      }

      if (window.app.setProgress) {
        window.app.setProgress(data.progress);
      }
    }

    // Delay status update to the next event loop for better performance
    if (this._timer) clearTimeout(this._timer);

    var self = this;
    this._timer = setTimeout(function () {
      self._timer = undefined;
      $('#innerstatus').html(self.render(data));
    }, 0);
  },
};

/**
 * Selected portal status module - handles information about the currently selected portal
 * Provides data for both mobile display and app integration
 * @namespace IITC.statusbar.portal
 */
window.IITC.statusbar.portal = {
  _data: null,

  /**
   * Gets data about a specific portal
   * @param {string} guid - The portal's globally unique identifier
   * @returns {Object|null} Structured data about the portal or null if unavailable
   */
  getData: function (guid) {
    if (!guid || !window.portals[guid]) return null;

    var portal = window.portals[guid];
    var data = portal.options.data;

    // Early return if we don't have the basic data
    if (typeof data.title === 'undefined') return null;

    // Get portal details object if available
    var details = window.portalDetail.get(guid);
    var percentage = data.health;

    // Calculate health percentage if we have detailed energy data
    if (details) {
      var totalEnergy = window.getTotalPortalEnergy(details);
      if (totalEnergy > 0) {
        percentage = Math.floor((window.getCurrentPortalEnergy(details) / totalEnergy) * 100);
      }
    }

    // Build structured result data
    var result = {
      guid: guid,
      team: data.team,
      level: data.level,
      title: data.title,
      health: percentage,
      resonators: details ? details.resonators : [],
    };

    this._data = result;
    return result;
  },

  /**
   * Renders HTML for portal status
   * @param {Object} data - Portal data to render
   * @returns {string} HTML representation of portal status
   */
  render: function (data) {
    // Default message when no portal is selected
    if (!data) return '<div style="text-align: center"><b>tap here for info screen</b></div>';

    var t = '';

    // Portal level badge with appropriate team color
    if (data.team === 'N' || data.team === 'NEUTRAL') {
      t = '<span class="portallevel">L0</span>';
    } else {
      t = '<span class="portallevel" style="background: ' + window.COLORS_LVL[data.level] + ';">L' + data.level + '</span>';
    }

    // Portal health and title
    t += ' ' + data.health + '% ';
    t += data.title;

    // Resonator visualization - only if we have resonator data
    if (data.resonators && data.resonators.length > 0) {
      // Convert from east-anticlockwise to north-clockwise arrangement
      var eastAnticlockwiseToNorthClockwise = [2, 1, 0, 7, 6, 5, 4, 3];

      for (var ind = 0; ind < 8; ind++) {
        var slot, reso;
        // Handle full resonator deployment vs partial
        if (data.resonators.length === 8) {
          slot = eastAnticlockwiseToNorthClockwise[ind];
          reso = data.resonators[slot];
        } else {
          slot = null;
          reso = ind < data.resonators.length ? data.resonators[ind] : null;
        }

        // Apply CSS class with team and direction information
        var className = window.TEAM_TO_CSS[window.getTeam(data)];
        if (slot !== null && window.OCTANTS[slot] === 'N') className += ' north';

        // Calculate resonator energy level
        var l = 0,
          v = 0,
          max = 0,
          perc = 0;
        if (reso) {
          l = parseInt(reso.level);
          v = parseInt(reso.energy);
          max = window.RESO_NRG[l];
          perc = (v / max) * 100;
        }

        // Render resonator with energy fill
        t += '<div class="resonator ' + className + '" style="border-top-color: ' + window.COLORS_LVL[l] + ';left: ' + (100 * ind) / 8.0 + '%;">';
        t += '<div class="filllevel" style="width:' + perc + '%;"></div>';
        t += '</div>';
      }
    }

    return t;
  },

  /**
   * Updates information about the currently selected portal
   * @param {Object} [selectedPortalData] - The object containing details about the selected portal.
   */
  update: function (selectedPortalData) {
    console.log('IITC.statusbar.portal.update', selectedPortalData);
    var guid = selectedPortalData ? selectedPortalData.selectedPortalGuid : undefined;
    var data = this.getData(guid);

    if (window.isApp && window.app.setPortalStatus) {
      window.app.setPortalStatus(data);
    }

    $('#mobileinfo').html(this.render(data));
  },
};

/**
 * Backward compatibility
 */
window.renderUpdateStatus = function () {
  return IITC.statusbar.map.update();
};

window.smartphoneInfo = function (data) {
  return IITC.statusbar.portal.update(data);
};
