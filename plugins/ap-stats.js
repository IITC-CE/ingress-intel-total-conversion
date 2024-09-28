// @author         Hollow011
// @name           Available AP statistics
// @category       Info
// @version        0.4.5
// @description    Displays the per-team AP gains available in the current view.

/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '0.4.5',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.4.4',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.4.3',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
window.plugin.compAPStats = function () {};

window.plugin.compAPStats.setupCallback = function () {
  // add a new div to the bottom of the sidebar and style it
  $('#sidebar').append('<div id="available_ap_display"></div>');
  $('#available_ap_display').css({ color: '#ffce00', 'font-size': '90%', padding: '4px 2px' });

  // do an initial calc for sidebar sizing purposes
  window.plugin.compAPStats.update(false);

  // make the value update when the map data updates
  window.addHook('mapDataRefreshEnd', window.plugin.compAPStats.mapDataRefreshEnd);
  window.addHook('requestFinished', window.plugin.compAPStats.requestFinished);
};

window.plugin.compAPStats.mapDataRefreshEnd = function () {
  if (window.plugin.compAPStats.timer) {
    clearTimeout(window.plugin.compAPStats.timer);
    window.plugin.compAPStats.timer = undefined;
  }

  window.plugin.compAPStats.update(true);
};

window.plugin.compAPStats.requestFinished = function () {
  // process on a short delay, so if multiple requests finish in a short time we only calculate once
  if (window.plugin.compAPStats.timer === undefined) {
    window.plugin.compAPStats.timer = setTimeout(function () {
      window.plugin.compAPStats.timer = undefined;
      window.plugin.compAPStats.update(false);
    }, 0.75 * 1000);
  }
};

window.plugin.compAPStats.updateNoPortals = function () {
  $('#available_ap_display').html('Available AP in this area: <div style="color:red">Zoom closer to get all portals loaded.<div>');
};

window.plugin.compAPStats.update = function (hasFinished) {
  if (!window.getDataZoomTileParameters().hasPortals) {
    window.plugin.compAPStats.updateNoPortals(hasFinished);
    return;
  }

  var result = window.plugin.compAPStats.compAPStats();
  var loading = hasFinished ? '' : 'Loading...';

  var formatRow = function (team, data) {
    var title =
      `Destroy and capture ${data.destroyPortals} portals\n` +
      `Destroy ${data.destroyLinks} links and ${data.destroyFields} fields\n` +
      `Capture ${data.capturePortals} neutral portals, complete ${data.finishPortals} portals\n` +
      `(unknown additional AP for links/fields)`;
    return `<tr><td>${team}</td><td style="text-align:right" title="${title}">${window.digits(data.AP)}</td></tr>`;
  };

  $('#available_ap_display').html(
    `Available AP in this area: ${loading}<table>${formatRow('Enlightened', result.enl)}${formatRow('Resistance', result.res)}</table>`
  );
};

window.plugin.compAPStats.compAPStats = function () {
  var result = {
    res: { AP: 0, destroyPortals: 0, capturePortals: 0, finishPortals: 0, destroyLinks: 0, destroyFields: 0 },
    enl: { AP: 0, destroyPortals: 0, capturePortals: 0, finishPortals: 0, destroyLinks: 0, destroyFields: 0 },
  };

  var displayBounds = window.map.getBounds();

  // AP to fully deploy a neutral portal
  var PORTAL_FULL_DEPLOY_AP = window.CAPTURE_PORTAL + 8 * window.DEPLOY_RESONATOR + window.COMPLETION_BONUS;

  // Grab every portal in the viewable area and compute individual AP stats
  // (fields and links are counted separately below)
  $.each(window.portals, function (ind, portal) {
    var data = portal.options.data;

    // eliminate offscreen portals
    if (!displayBounds.contains(portal.getLatLng())) return true; // $.each 'continue'

    // AP to complete a portal - assuming it's already captured (so no CAPTURE_PORTAL)
    var completePortalAp = 0;
    if ('resCount' in data && data.resCount < 8) {
      completePortalAp = (8 - data.resCount) * window.DEPLOY_RESONATOR + window.COMPLETION_BONUS;
    }

    // AP to destroy this portal
    var destroyAp = (data.resCount || 0) * window.DESTROY_RESONATOR;

    if (portal.options.team === window.TEAM_ENL) {
      result.res.AP += destroyAp + PORTAL_FULL_DEPLOY_AP;
      result.res.destroyPortals++;
      if (completePortalAp) {
        result.enl.AP += completePortalAp;
        result.enl.finishPortals++;
      }
    } else if (portal.options.team === window.TEAM_RES) {
      result.enl.AP += destroyAp + PORTAL_FULL_DEPLOY_AP;
      result.enl.destroyPortals++;
      if (completePortalAp) {
        result.res.AP += completePortalAp;
        result.res.finishPortals++;
      }
    } else {
      // it's a neutral portal, potential for both teams.  by definition no fields or edges
      result.enl.AP += PORTAL_FULL_DEPLOY_AP;
      result.enl.capturePortals++;
      result.res.AP += PORTAL_FULL_DEPLOY_AP;
      result.res.capturePortals++;
    }
  });

  // now every link that starts/ends at a point on screen
  $.each(window.links, function (guid, link) {
    // only consider links that start/end on-screen
    var points = link.getLatLngs();
    if (displayBounds.contains(points[0]) || displayBounds.contains(points[1])) {
      if (link.options.team === window.TEAM_ENL) {
        result.res.AP += window.DESTROY_LINK;
        result.res.destroyLinks++;
      } else if (link.options.team === window.TEAM_RES) {
        result.enl.AP += window.DESTROY_LINK;
        result.enl.destroyLinks++;
      }
    }
  });

  // and now all fields that have a vertex on screen
  $.each(window.fields, function (guid, field) {
    // only consider fields with at least one vertex on screen
    var points = field.getLatLngs();
    if (displayBounds.contains(points[0]) || displayBounds.contains(points[1]) || displayBounds.contains(points[2])) {
      if (field.options.team === window.TEAM_ENL) {
        result.res.AP += window.DESTROY_FIELD;
        result.res.destroyFields++;
      } else if (field.options.team === window.TEAM_RES) {
        result.enl.AP += window.DESTROY_FIELD;
        result.enl.destroyFields++;
      }
    }
  });

  return result;
};

var setup = function () {
  window.plugin.compAPStats.setupCallback();
};
