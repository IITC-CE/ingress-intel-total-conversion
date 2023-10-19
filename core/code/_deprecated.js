/**
 * functions that are not use by IITC itself
 * and won't most likely not receive any updated
 */
/* global L,PLAYER -- eslint */

/**
 * @deprecated
 *  given counts of resonators, links and fields, calculate the available AP
 *  doesn't take account AP for resonator upgrades or AP for adding mods
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
 * @deprecated
 * get the AP gains from a portal, based only on the brief summary data from portals, links and fields
 * not entirely accurate - but available for all portals on the screen
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
 * @deprecated
 * This function will return the potential level a player can upgrade it to
 */
window.potentialPortalLevel = function (d) {
  var current_level = window.getPortalLevel(d);
  var potential_level = current_level;

  if (PLAYER.team === d.team) {
    var resonators_on_portal = d.resonators;
    var resonator_levels = new Array();

    // figure out how many of each of these resonators can be placed by the player
    var player_resontators = new Array();
    for (var i = 1; i <= window.MAX_PORTAL_LEVEL; i++) {
      player_resontators[i] = i > PLAYER.level ? 0 : window.MAX_RESO_PER_PLAYER[i];
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
 * @deprecated
 * find the lat/lon for a portal, using any and all available data
 * (we have the list of portals, the cached portal details, plus links and fields as sources of portal locations)
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
