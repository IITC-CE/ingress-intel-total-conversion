/* global IITC */

/**
 * Status bar module for IITC that displays both map and portal status information.
 * Provides a template-based rendering system that can be customized by plugins.
 *
 * @memberof IITC
 * @namespace statusbar
 */

// Compass directions in clockwise order, starting from North
const COMPASS_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

// Mapping from game octant to compass direction
// Game uses East=0 as starting point, going counter-clockwise
const GAME_OCTANTS = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'];

// Fast lookup map for direction to index conversion (performance optimization)
const DIRECTION_TO_INDEX = new Map(COMPASS_DIRECTIONS.map((dir, i) => [dir, i]));

IITC.statusbar = {};

/**
 * Renders a template string by replacing placeholders with actual values.
 *
 * @function IITC.statusbar.renderTemplate
 * @param {string} template - Template string with placeholders in format {{ name }}
 * @param {Object} replacements - Key-value pairs where keys match placeholder names
 * @returns {string} Rendered HTML with placeholders replaced by values
 * @example
 * // Returns: "<span>Hello World</span>"
 * IITC.statusbar.renderTemplate("<span>{{ greeting }}</span>", { greeting: "Hello World" });
 */
IITC.statusbar.renderTemplate = (template, replacements) => {
  let result = template;
  for (const key in replacements) {
    if (Object.hasOwn(replacements, key)) {
      const value = replacements[key];
      const replacement = value !== undefined && value !== null ? value : '';
      result = result.replace(`{{ ${key} }}`, replacement);
    }
  }
  return result;
};

/**
 * Templates for map status HTML elements
 * @type {Object.<string, string>}
 */
IITC.statusbar.mapTemplates = {
  // Main container
  main: '{{ portalLevels }} {{ mapStatus }}{{ requestsStatus }}',

  // Portal levels information
  portalLevels: '<span class="help portallevel" title="Indicates portal levels/link lengths displayed. Zoom in to display more;">{{ content }}</span>',

  // Map status information
  mapStatus: '<span class="map"><b>map</b>: {{ content }}</span>',

  // Links prefix text
  linksPrefix: '<b>links</b>: ',

  // Help container with tooltip
  helpContainer: '<span class="help" title="{{ tooltip }}">{{ content }}</span>',

  // Progress indicator
  progressInfo: ' {{ progress }}%',

  // Requests information
  requestsInfo: ' {{ count }} requests',

  // Failed requests information
  failedRequests: ' <span class="failed-request">{{ count }} failed</span>',
};

/**
 * Templates for portal status HTML elements
 * @type {Object.<string, string>}
 */
IITC.statusbar.portalTemplates = {
  // Default message
  defaultMessage: '<div style="text-align: center"><b>tap here for info screen</b></div>',

  // Main portal information template
  mainInfo: '{{ levelBadge }} {{ health }}% {{ title }} {{ resonators }}',

  // Portal level badge
  levelBadge: '<span class="portallevel" style="{{ style }}">L{{ level }}</span>',

  // Resonator template
  resonator:
    '<div class="resonator {{ className }}" data-slot="{{ slot }}" style="--resonator-color: {{ borderColor }};">' +
    '<div class="filllevel" style="width:{{ percentage }}%;"></div>' +
    '</div>',

  // Empty resonator slot template
  emptyResonator: '<div class="resonator empty" data-slot="{{ slot }}"></div>',
};

/**
 * Initializes the statusbar system
 * Called after IITC boot process is complete
 */
IITC.statusbar.init = function () {
  // Determine display modes for portal and map status
  const usePortalApi = window.isApp && window.app.setPortalStatus;
  const useMapApi = window.isApp && window.app.setMapStatus;

  // Set display flags based on API availability
  this.showHtmlPortalInfo = window.isSmartphone() && !usePortalApi;
  this.showHtmlMapInfo = !useMapApi;

  // Create HTML elements only if needed
  if (this.showHtmlPortalInfo) {
    document.getElementById('updatestatus').insertAdjacentHTML('afterbegin', '<div id="mobileinfo" onclick="show(\'info\')"></div>');
  }

  // Hide map status if using API for map
  if (!this.showHtmlMapInfo) {
    const innerstatus = document.getElementById('innerstatus');
    if (innerstatus) {
      innerstatus.style.display = 'none';
    }
  }

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

  // Initial update if needed
  if (this.showHtmlPortalInfo) {
    IITC.statusbar.portal.update();
  }
};

/**
 * Map status module - handles map status information
 * @namespace IITC.statusbar.map
 */
IITC.statusbar.map = {
  _timer: null,
  _innerstatusElement: null,

  /**
   * Gets current map status data including portal levels, map loading progress, and active requests.
   *
   * @function IITC.statusbar.map.getData
   * @returns {Object} Structured object containing:
   *   - portalLevels: Information about visible portal levels and link lengths
   *   - mapStatus: Current map loading status and progress
   *   - requests: Active and failed request counts
   */
  getData() {
    const tileParams = window.getDataZoomTileParameters();
    const mapStatus = window.mapDataRequest ? window.mapDataRequest.getStatus() : null;
    const minLinkLength = tileParams.minLinkLength;

    // Build comprehensive status data object
    return {
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
  },

  /**
   * Renders HTML for map status based on the provided data.
   *
   * @function IITC.statusbar.map.render
   * @param {Object} data - Map status data from getData()
   * @returns {string} HTML string representing the current map status
   */
  render(data) {
    const templates = IITC.statusbar.mapTemplates;
    const renderTemplate = IITC.statusbar.renderTemplate;

    // Create portal levels / links section
    let portalLevelsContent = '';
    if (data.portalLevels.hasPortals) {
      portalLevelsContent = 'portals';
    } else {
      // Space is valuable on mobile
      let prefix = !window.isSmartphone() ? templates.linksPrefix : '';

      let content = 'all links';
      if (data.portalLevels.minLinkLength > 0) {
        content = `&gt;${data.portalLevels.formattedLength}`;
      }

      portalLevelsContent = prefix + content;
    }

    const portalLevels = renderTemplate(templates.portalLevels, {
      content: portalLevelsContent,
    });

    // Create map status section
    let mapStatusContent = '';
    if (data.mapStatus.long) {
      mapStatusContent = renderTemplate(templates.helpContainer, {
        tooltip: data.mapStatus.long,
        content: data.mapStatus.short,
      });
    } else {
      mapStatusContent = data.mapStatus.short;
    }

    // Add progress information if available
    if (data.mapStatus.progressPercent !== null) {
      mapStatusContent += renderTemplate(templates.progressInfo, {
        progress: data.mapStatus.progressPercent,
      });
    }

    const mapStatus = renderTemplate(templates.mapStatus, {
      content: mapStatusContent,
    });

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

    // Combine all elements
    return renderTemplate(templates.main, {
      portalLevels,
      mapStatus,
      requestsStatus,
    });
  },

  /**
   * Updates map status information in the UI and mobile app (if applicable).
   * Throttles updates to the next event loop for better performance.
   *
   * @function IITC.statusbar.map.update
   * @fires app.setMapStatus - When in app mode
   * @fires app.setProgress - When in app mode
   */
  update() {
    // Early exit if we don't need map status updates
    if (!IITC.statusbar.showHtmlMapInfo && !(window.isApp && (window.app.setMapStatus || window.app.setProgress))) {
      return;
    }

    if (this._timer) clearTimeout(this._timer);

    this._timer = setTimeout(() => {
      this._timer = undefined;

      const data = this.getData();

      if (window.isApp) {
        if (window.app.setMapStatus) {
          window.app.setMapStatus(data.portalLevels, data.mapStatus, data.requests);
        }

        if (window.app.setProgress) {
          window.app.setProgress(data.mapStatus.progress);
        }
      }

      if (IITC.statusbar.showHtmlMapInfo) {
        if (!this._innerstatusElement) {
          this._innerstatusElement = document.getElementById('innerstatus');
        }

        if (this._innerstatusElement) {
          this._innerstatusElement.innerHTML = this.render(data);
        }
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
  _lastSentData: null, // Keep last sent data to avoid sending empty info
  _mobileinfoElement: null,
  _timer: null,

  /**
   * Gets detailed data about a specific portal.
   *
   * @function IITC.statusbar.portal.getData
   * @param {string} guid - The portal's globally unique identifier
   * @returns {Object|null} Structured portal data including team, level, health, resonators, and loading state,
   *                        or null if the portal is not found
   */
  getData(guid) {
    if (!guid) {
      this._lastSentData = null;
      return null;
    }

    // If portal doesn't exist or has no basic data, return previous data with loading state
    if (!window.portals[guid]) {
      return this._lastSentData ? { ...this._lastSentData, isLoading: true } : null;
    }

    const portal = window.portals[guid];
    const data = portal.options.data;

    // If we don't have basic data, return previous data with loading state
    if (typeof data.title === 'undefined') {
      return this._lastSentData ? { ...this._lastSentData, isLoading: true } : null;
    }

    // Get portal details object if available
    const details = window.portalDetail.get(guid);
    let healthPct = data.health;

    // Calculate health percentage if we have detailed energy data
    if (details) {
      const totalEnergy = window.getTotalPortalEnergy(details);
      if (totalEnergy > 0) {
        healthPct = Math.floor((window.getCurrentPortalEnergy(details) / totalEnergy) * 100);
      }
    }

    // Determine if portal is neutral
    const isNeutral = data.team === 'N' || data.team === 'NEUTRAL';

    // Determine if we have complete portal details
    // For neutral portals, having details object is enough (they don't have resonators)
    // For occupied portals, we need details with resonators
    const hasCompleteDetails = details && (isNeutral || (details.resonators && details.resonators.length > 0));

    // Build structured result data
    const result = {
      guid,
      team: data.team,
      level: data.level,
      isNeutral,
      title: data.title,
      health: healthPct,
      resonators: null,
      levelColor: !isNeutral ? window.COLORS_LVL[data.level] : null,
      isLoading: !hasCompleteDetails, // True until we have complete portal details
    };

    // Process resonators if available (only for non-neutral portals)
    if (hasCompleteDetails && !isNeutral && details.resonators && details.resonators.length > 0) {
      // Create sparse array - only populate slots that have resonators
      result.resonators = new Array(8).fill(null);

      // Process each resonator
      for (let i = 0; i < details.resonators.length; i++) {
        const reso = details.resonators[i];
        if (!reso || parseInt(reso.energy) <= 0) continue;

        const level = parseInt(reso.level);
        const energy = parseInt(reso.energy);
        const maxEnergy = window.RESO_NRG[level] || 0;
        const healthPct = maxEnergy > 0 ? (energy / maxEnergy) * 100 : 0;

        let octant, direction, displayOrder;

        if (details.resonators.length === 8) {
          // For full deployments (8 resonators), the array index is the octant
          octant = i;
        } else {
          // For partial deployments, we assume sequential from East (octant 0)
          octant = i % 8;
        }

        // Convert octant to compass direction
        direction = GAME_OCTANTS[octant];

        // Get display position from compass direction
        displayOrder = DIRECTION_TO_INDEX.get(direction);

        // Update resonator at the correct position
        if (displayOrder !== undefined) {
          result.resonators[displayOrder] = {
            direction,
            level,
            energy,
            maxEnergy,
            healthPct,
            levelColor: window.COLORS_LVL[level],
          };
        }
      }
    }

    this._lastSentData = result;
    return result;
  },

  /**
   * Renders HTML representation of portal status.
   *
   * @function IITC.statusbar.portal.render
   * @param {Object} data - Portal data from getData()
   * @returns {string} HTML string representing the portal status including level badge, health,
   *                   title, and resonator visualization
   */
  render(data) {
    const templates = IITC.statusbar.portalTemplates;
    const renderTemplate = IITC.statusbar.renderTemplate;

    // Default message when no portal is selected
    if (!data) return templates.defaultMessage;

    // Create level badge with appropriate team color
    const levelBadge = renderTemplate(templates.levelBadge, {
      style: data.levelColor ? `background: ${data.levelColor};` : '',
      level: data.isNeutral ? '0' : data.level,
    });

    const teamCss = window.TEAM_TO_CSS[IITC.utils.getTeamId(data.team)] || '';

    // Create resonator visualizations
    let resonators = '';
    if (data.resonators) {
      data.resonators.forEach((reso, index) => {
        if (reso && reso.energy > 0) {
          // Render filled resonator
          resonators += renderTemplate(templates.resonator, {
            className: `${teamCss}${reso.direction === 'N' ? ' north' : ''}`,
            slot: index,
            percentage: reso.healthPct,
            borderColor: reso.levelColor,
          });
        } else {
          // Render empty slot
          resonators += renderTemplate(templates.emptyResonator, {
            slot: index,
          });
        }
      });
    }

    // Combine all elements
    return renderTemplate(templates.mainInfo, {
      levelBadge,
      health: data.health,
      title: data.title,
      resonators,
    });
  },

  /**
   * Updates portal information in the UI and mobile app (if applicable).
   *
   * @function IITC.statusbar.portal.update
   * @param {Object} [selectedPortalData] - Object containing the selectedPortalGuid
   * @fires app.setPortalStatus - When in app mode
   */
  update(selectedPortalData) {
    // Early exit if we don't need portal status (not in app and not smartphone)
    if (!IITC.statusbar.showHtmlPortalInfo && !(window.isApp && window.app.setPortalStatus)) {
      return;
    }

    if (this._timer) clearTimeout(this._timer);

    this._timer = setTimeout(() => {
      this._timer = undefined;

      const guid = selectedPortalData ? selectedPortalData.selectedPortalGuid : undefined;
      const data = this.getData(guid);

      if (window.isApp && window.app.setPortalStatus) {
        if (data) {
          window.app.setPortalStatus(data.guid, data.team, data.level, data.title, data.health, data.resonators, data.levelColor, data.isLoading);
        } else {
          window.app.setPortalStatus(null, null, null, null, null, null, null, false);
        }
      }

      if (IITC.statusbar.showHtmlPortalInfo) {
        if (!this._mobileinfoElement) {
          this._mobileinfoElement = document.getElementById('mobileinfo');
        }

        if (this._mobileinfoElement) {
          this._mobileinfoElement.innerHTML = this.render(data);
          if (data && data.isLoading) {
            this._mobileinfoElement.classList.add('loading');
          } else {
            this._mobileinfoElement.classList.remove('loading');
          }
        }
      }
    }, 0);
  },
};
