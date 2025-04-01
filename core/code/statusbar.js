/* global IITC */

/**
 * @file Status bar for IITC that provides status information
 * for both map status and portal status, with API for mobile app integration.
 * @module IITC.statusbar
 */

IITC.statusbar = {};

/**
 * Helper function to render a template with replacements
 * @param {string} template - Template string with placeholders in format {{ name }}
 * @param {Object} replacements - Object with key-value pairs for replacing placeholders
 * @returns {string} Rendered template with substituted values
 */
IITC.statusbar.renderTemplate = (template, replacements) => {
  let result = template;
  Object.entries(replacements).forEach(([key, value]) => {
    const replacement = value !== undefined && value !== null ? value : '';
    result = result.replace(new RegExp(`{{ ${key} }}`, 'g'), replacement);
  });
  return result;
};

/**
 * Templates for map status HTML elements
 * @type {Object.<string, string>}
 */
IITC.statusbar.mapTemplates = {
  main:
    '<span class="help portallevel" title="Indicates portal levels/link lengths displayed. Zoom in to display more;">{{ portalLevels }}</span>' +
    ' <span class="map"><b>map</b>: {{ mapStatus }}</span>' +
    '{{ requestsStatus }}',

  portalLevelInfo: '<span id="loadlevel">{{ content }}</span>',

  mapStatusInfo: '<span class="help" title="{{ tooltip }}">{{ content }}</span>',

  progressInfo: ' {{ progress }}%',

  requestsInfo: ' {{ count }} requests',

  failedRequests: ' <span style="color:#f66">{{ count }} failed</span>',
};

/**
 * Templates for portal status HTML elements
 * @type {Object.<string, string>}
 */
IITC.statusbar.portalTemplates = {
  defaultMessage: '<div style="text-align: center"><b>tap here for info screen</b></div>',

  mainInfo: '{{ levelBadge }} {{ health }}% {{ title }}{{ resonators }}',

  levelBadge: '<span class="portallevel" style="{{ style }}">L{{ level }}</span>',

  resonator:
    '<div class="resonator {{ className }}" style="border-top-color: {{ borderColor }};left: {{ position }}%;">' +
    '<div class="filllevel" style="width:{{ percentage }}%;"></div>' +
    '</div>',
};

/**
 * Initializes the statusbar system
 * Called after IITC boot process is complete
 */
IITC.statusbar.init = function () {
  // Set up portal selection hook - initial update with basic data
  window.addHook('portalSelected', (data) => {
    IITC.statusbar.portal.update(data);
  });

  // Add hook for portal detail loaded - update with full details when available
  window.addHook('portalDetailLoaded', (data) => {
    if (data.success && data.guid === window.selectedPortal) {
      IITC.statusbar.portal.update({ selectedPortalGuid: data.guid });
    }
  });

  // Create mobile info element only in smartphone mode
  if (window.isSmartphone()) {
    document.getElementById('updatestatus').insertAdjacentHTML('afterbegin', '<div id="mobileinfo" onclick="show(\'info\')"></div>');
    // Set initial message
    IITC.statusbar.portal.update();
  }
};

/**
 * Map status module - handles map status information
 * @namespace IITC.statusbar.map
 */
IITC.statusbar.map = {
  _data: null,
  _timer: null,

  /**
   * Gets current map status data
   * @returns {Object} Structured data about map status
   */
  getData() {
    const tileParams = window.getDataZoomTileParameters();
    const mapStatus = window.mapDataRequest ? window.mapDataRequest.getStatus() : null;
    const minLinkLength = tileParams.minLinkLength;

    // Build comprehensive status data object
    this._data = {
      portalLevels: {
        hasPortals: tileParams.hasPortals,
        minLinkLength,
        // Pre-format link length for display
        formattedLength: minLinkLength > 1000 ? `${minLinkLength / 1000}km` : `${minLinkLength}m`,
      },
      mapStatus: {
        short: mapStatus?.short || '...unknown...',
        long: mapStatus?.long || null,
        progress: mapStatus?.progress !== undefined ? mapStatus.progress : 1,
        // Pre-calculate percentage for display
        progressPercent: mapStatus?.progress !== undefined && mapStatus.progress !== -1 ? Math.floor(mapStatus.progress * 100) : null,
      },
      requests: {
        active: window.activeRequests.length,
        failed: window.failedRequestCount,
        // Pre-calculate boolean flags for conditional rendering
        hasActive: window.activeRequests.length > 0,
        hasFailed: window.failedRequestCount > 0,
      },
    };

    return this._data;
  },

  /**
   * Renders HTML for map status
   * @param {Object} data - Status data to render
   * @returns {string} HTML representation of map status
   */
  render(data) {
    console.log('IITC.statusbar.map render', data);
    const templates = IITC.statusbar.mapTemplates;
    const renderTemplate = IITC.statusbar.renderTemplate;

    // Create portal levels / links section
    let portalLevelsContent = '';
    if (data.portalLevels.hasPortals) {
      portalLevelsContent = renderTemplate(templates.portalLevelInfo, { content: 'portals' });
    } else {
      // Space is valuable on mobile - conditionally add "links:" prefix
      let prefix = !window.isSmartphone() ? '<b>links</b>: ' : '';

      let content = 'all links';
      if (data.portalLevels.minLinkLength > 0) {
        content = `&gt;${data.portalLevels.formattedLength}`;
      }

      portalLevelsContent = prefix + renderTemplate(templates.portalLevelInfo, { content });
    }

    // Create map status section
    let mapStatusContent = '';
    if (data.mapStatus.long) {
      mapStatusContent = renderTemplate(templates.mapStatusInfo, {
        tooltip: data.mapStatus.long,
        content: data.mapStatus.short,
      });
    } else {
      mapStatusContent = data.mapStatus.short;
    }

    // Add progress percentage if available
    if (data.mapStatus.progressPercent !== null) {
      mapStatusContent += renderTemplate(templates.progressInfo, {
        progress: data.mapStatus.progressPercent,
      });
    }

    // Create requests status section
    let requestsStatus = '';
    if (data.requests.hasActive) {
      requestsStatus += renderTemplate(templates.requestsInfo, {
        count: data.requests.active,
      });
    }
    if (data.requests.hasFailed) {
      requestsStatus += renderTemplate(templates.failedRequests, {
        count: data.requests.failed,
      });
    }

    // Combine all sections
    return renderTemplate(templates.main, {
      portalLevels: portalLevelsContent,
      mapStatus: mapStatusContent,
      requestsStatus: requestsStatus,
    });
  },

  /**
   * Updates the map status - core function that should be called when map data changes
   * This function handles both updating the DOM and calling the mobile app API
   */
  update() {
    const data = this.getData();

    if (window.isApp) {
      if (window.app.setMapStatus) {
        window.app.setMapStatus(data);
      }

      if (window.app.setProgress) {
        window.app.setProgress(data.mapStatus.progress);
      }
    }

    // Delay status update to the next event loop for better performance
    if (this._timer) clearTimeout(this._timer);

    this._timer = setTimeout(() => {
      this._timer = undefined;
      const innerstatus = document.getElementById('innerstatus');
      if (innerstatus) {
        innerstatus.innerHTML = this.render(data);
      }
    }, 0);
  },
};

/**
 * Selected portal status module - handles information about the currently selected portal
 * Provides data for both mobile display and app integration
 * @namespace IITC.statusbar.portal
 */
IITC.statusbar.portal = {
  _data: null,

  /**
   * Gets data about a specific portal
   * @param {string} guid - The portal's globally unique identifier
   * @returns {Object|null} Structured data about the portal or null if unavailable
   */
  getData(guid) {
    if (!guid || !window.portals[guid]) return null;

    const portal = window.portals[guid];
    const data = portal.options.data;

    // Early return if we don't have the basic data
    if (typeof data.title === 'undefined') return null;

    // Get portal details object if available
    const details = window.portalDetail.get(guid);
    let percentage = data.health;

    // Calculate health percentage if we have detailed energy data
    if (details) {
      const totalEnergy = window.getTotalPortalEnergy(details);
      if (totalEnergy > 0) {
        percentage = Math.floor((window.getCurrentPortalEnergy(details) / totalEnergy) * 100);
      }
    }

    // Determine if portal is neutral
    const isNeutral = data.team === 'N' || data.team === 'NEUTRAL';

    // Pre-calculate colors for UI rendering
    const levelColor = !isNeutral ? window.COLORS_LVL[data.level] : null;
    const teamCss = window.TEAM_TO_CSS[IITC.utils.getTeamId(data.team)] || '';

    // Convert from east-anticlockwise to north-clockwise arrangement
    const eastAnticlockwiseToNorthClockwise = [2, 1, 0, 7, 6, 5, 4, 3];

    // Build structured result data with UI-ready values
    const result = {
      guid,
      team: data.team,
      teamCss,
      level: data.level,
      levelColor,
      isNeutral,
      title: data.title,
      health: percentage,
      resonators: [],
    };

    // Process resonators if available
    if (details && details.resonators && details.resonators.length > 0) {
      // Map resonators to UI-friendly format
      result.resonators = Array.from({ length: 8 }).map((_, index) => {
        let slot = null;
        let reso = null;

        // Handle full resonator deployment vs partial
        if (details.resonators.length === 8) {
          slot = eastAnticlockwiseToNorthClockwise[index];
          reso = details.resonators[slot];
        } else {
          reso = index < details.resonators.length ? details.resonators[index] : null;
        }

        const level = reso ? parseInt(reso.level) : 0;
        const energy = reso ? parseInt(reso.energy) : 0;
        const maxEnergy = window.RESO_NRG[level] || 0;

        return {
          level,
          energy,
          maxEnergy,
          percentage: maxEnergy > 0 ? (energy / maxEnergy) * 100 : 0,
          isNorth: slot !== null && window.OCTANTS[slot] === 'N',
          position: (100 * index) / 8.0, // Position for CSS left property
          color: window.COLORS_LVL[level], // Pre-calculate color for UI
        };
      });
    }

    this._data = result;
    return result;
  },

  /**
   * Renders HTML for portal status
   * @param {Object} data - Portal data to render
   * @returns {string} HTML representation of portal status
   */
  render(data) {
    console.log('IITC.statusbar.portal render', data);
    const templates = IITC.statusbar.portalTemplates;
    const renderTemplate = IITC.statusbar.renderTemplate;

    // Default message when no portal is selected
    if (!data) return templates.defaultMessage;

    // Create level badge with appropriate team color
    const levelBadge = renderTemplate(templates.levelBadge, {
      style: data.levelColor ? `background: ${data.levelColor};` : '',
      level: data.isNeutral ? '0' : data.level,
    });

    // Create resonator visualizations
    let resonatorsHtml = '';
    if (data.resonators && data.resonators.length > 0) {
      data.resonators.forEach((reso) => {
        // Only render resonators that exist (have energy)
        if (reso.energy > 0) {
          resonatorsHtml += renderTemplate(templates.resonator, {
            className: `${data.teamCss}${reso.isNorth ? ' north' : ''}`,
            borderColor: reso.color,
            position: reso.position,
            percentage: reso.percentage,
          });
        }
      });
    }

    // Combine all components
    return renderTemplate(templates.mainInfo, {
      levelBadge,
      health: data.health,
      title: data.title,
      resonators: resonatorsHtml,
    });
  },

  /**
   * Updates information about the currently selected portal
   * @param {Object} [selectedPortalData] - The object containing details about the selected portal.
   */
  update(selectedPortalData) {
    // Early exit if we don't need portal status (not in app and not smartphone)
    if (!window.isSmartphone() && !(window.isApp && window.app.setPortalStatus)) {
      return;
    }

    const guid = selectedPortalData ? selectedPortalData.selectedPortalGuid : undefined;
    const data = this.getData(guid);

    if (window.isApp && window.app.setPortalStatus) {
      window.app.setPortalStatus(data);
    }

    // Update UI in smartphone mode
    const mobileinfo = document.getElementById('mobileinfo');
    if (window.isSmartphone() && mobileinfo) {
      mobileinfo.innerHTML = this.render(data);
    }
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
