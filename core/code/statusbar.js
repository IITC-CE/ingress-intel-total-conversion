/* global IITC */

/**
 * @file This file handles the rendering and updating of the status bar in IITC.
 * @module status_bar
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
 * Backward compatibility
 */
window.renderUpdateStatus = function () {
  return IITC.statusbar.map.update();
};
