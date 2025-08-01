/* global IITC, L -- eslint */

/**
 * @file This file contains functions that are not use by IITC itself
 * and won't most likely not receive any updated
 * @module _deprecated
 */

/**
 * Calculates the potential AP gain for capturing or destroying a portal, based on the number of resonators,
 * links, and fields. It does not account for AP gained from resonator upgrades or mod deployment.
 *
 * @deprecated
 * @function portalApGainMaths
 * @param {number} resCount - The number of resonators on the portal.
 * @param {number} linkCount - The number of links connected to the portal.
 * @param {number} fieldCount - The number of fields using the portal as a vertex.
 * @returns {Object} An object containing detailed AP gain values for various actions such as deploying resonators,
 *                   destroying resonators, creating fields, destroying links, capturing the portal, and total
 *                   AP for destroying and capturing.
 */
window.portalApGainMaths = function (resCount, linkCount, fieldCount) {
  var deployAp = (8 - resCount) * window.DEPLOY_RESONATOR;
  if (resCount === 0) deployAp += window.CAPTURE_PORTAL;
  if (resCount !== 8) deployAp += window.COMPLETION_BONUS;
  // there could also be AP for upgrading existing resonators, and for deploying mods - but we don't have data for that
  var friendlyAp = deployAp;

  var destroyResoAp = resCount * window.DESTROY_RESONATOR;
  var destroyLinkAp = linkCount * window.DESTROY_LINK;
  var destroyFieldAp = fieldCount * window.DESTROY_FIELD;
  var captureAp = window.CAPTURE_PORTAL + 8 * window.DEPLOY_RESONATOR + window.COMPLETION_BONUS;
  var destroyAp = destroyResoAp + destroyLinkAp + destroyFieldAp;
  var enemyAp = destroyAp + captureAp;

  return {
    friendlyAp: friendlyAp,
    enemyAp: enemyAp,
    destroyAp: destroyAp,
    destroyResoAp: destroyResoAp,
    captureAp: captureAp,
  };
};

/**
 * Estimates the AP gain from a portal, based only on summary data from portals, links, and fields.
 * Not entirely accurate - but available for all portals on the screen
 *
 * @deprecated
 * @function getPortalApGain
 * @param {string} guid - The GUID of the portal.
 * @returns {Object|undefined} An object containing various AP gain values, or undefined if the portal is not found.
 */
window.getPortalApGain = function (guid) {
  var p = window.portals[guid];
  if (p) {
    var data = p.options.data;

    var linkCount = window.getPortalLinksCount(guid);
    var fieldCount = window.getPortalFieldsCount(guid);

    var result = window.portalApGainMaths(data.resCount, linkCount, fieldCount);
    return result;
  }

  return undefined;
};

/**
 * Calculates the potential level a player can upgrade a portal to.
 *
 * @deprecated
 * @function potentialPortalLevel
 * @param {Object} d - The portal detail object containing resonator and ownership information.
 * @returns {number} The potential level to which the player can upgrade the portal.
 */
window.potentialPortalLevel = function (d) {
  var current_level = window.getPortalLevel(d);
  var potential_level = current_level;

  if (window.PLAYER.team === d.team) {
    var resonators_on_portal = d.resonators;
    var resonator_levels = new Array();

    // figure out how many of each of these resonators can be placed by the player
    var player_resontators = new Array();
    for (var i = 1; i <= window.MAX_PORTAL_LEVEL; i++) {
      player_resontators[i] = i > window.PLAYER.level ? 0 : window.MAX_RESO_PER_PLAYER[i];
    }
    $.each(resonators_on_portal, function (ind, reso) {
      if (reso !== null && reso.owner === window.PLAYER.nickname) {
        player_resontators[reso.level]--;
      }
      resonator_levels.push(reso === null ? 0 : reso.level);
    });

    resonator_levels.sort(function (a, b) {
      return a - b;
    });

    // Max out portal
    var install_index = 0;
    for (var j = window.MAX_PORTAL_LEVEL; j >= 1; j--) {
      for (var install = player_resontators[j]; install > 0; install--) {
        if (resonator_levels[install_index] < j) {
          resonator_levels[install_index] = j;
          install_index++;
        }
      }
    }

    potential_level =
      resonator_levels.reduce(function (a, b) {
        return a + b;
      }) / 8;
  }
  return potential_level;
};

/**
 * Finds the latitude and longitude for a portal using all available data sources.
 * This includes the list of portals, cached portal details, and information from links and fields.
 *
 * @deprecated
 * @function findPortalLatLng
 * @param {string} guid - The GUID of the portal.
 * @returns {L.LatLng|undefined} The LatLng location of the portal, or undefined if not found.
 */
window.findPortalLatLng = function (guid) {
  if (window.portals[guid]) {
    return window.portals[guid].getLatLng();
  }

  // not found in portals - try the cached (and possibly stale) details - good enough for location
  var details = window.portalDetail.get(guid);
  if (details) {
    return L.latLng(details.latE6 / 1e6, details.lngE6 / 1e6);
  }

  // now try searching through fields
  for (var fguid in window.fields) {
    var f = window.fields[fguid].options.data;

    for (var i in f.points) {
      if (f.points[i].guid === guid) {
        return L.latLng(f.points[i].latE6 / 1e6, f.points[i].lngE6 / 1e6);
      }
    }
  }

  // and finally search through links
  for (var lguid in window.links) {
    var l = window.links[lguid].options.data;
    if (l.oGuid === guid) {
      return L.latLng(l.oLatE6 / 1e6, l.oLngE6 / 1e6);
    }
    if (l.dGuid === guid) {
      return L.latLng(l.dLatE6 / 1e6, l.dLngE6 / 1e6);
    }
  }

  // no luck finding portal lat/lng
  return undefined;
};

// to be ovewritten in app.js
/**
 * Finds the latitude and longitude for a portal using all available data sources.
 * This includes the list of portals, cached portal details, and information from links and fields.
 *
 * @deprecated
 * @function androidCopy
 */
window.androidCopy = function () {
  return true; // i.e. execute other actions
};

/**
 * Given the entity detail data, returns the team the entity belongs to.
 * Uses TEAM_* enum values.
 *
 * @deprecated
 * @function getTeam
 * @param {Object} details - The details hash of an entity.
 * @returns {number} The team ID the entity belongs to.
 */
window.getTeam = function (details) {
  return IITC.utils.getTeamId(details.team);
};

/**
 * Renders the status bar. This function updates the status bar with information about the current
 * zoom level (portal levels and link lengths), map data loading progress, and any pending requests or failed requests.
 * It schedules the update to the next event loop to improve performance and ensure smoother rendering.
 *
 * @deprecated
 * @function renderUpdateStatus
 */
window.renderUpdateStatus = function () {
  return IITC.statusbar.map.update();
};

/**
 * Updates the mobile information bar with portal details when a portal is selected.
 * This function is hooked to the 'portalSelected' event and is specific to the smartphone layout.
 *
 * @deprecated
 * @function smartphoneInfo
 * @param {Object} selectedPortalData - The object containing details about the selected portal.
 */
window.smartphoneInfo = function (selectedPortalData) {
  return IITC.statusbar.portal.update(selectedPortalData);
};
