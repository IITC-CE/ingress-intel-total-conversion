// @name           Machina Tools
// @author         Perringaiden
// @category       Misc
// @version        0.7.0
// @description    Machina investigation tools

/* exported setup --eslint */
/* global , digits, L, map, dialog, getPortalLinks, portalDetail, turf */

// use own namespace for plugin
var machinaTools = {};
window.plugin.machinaTools = machinaTools;

// Provides a circle object storage array for adding and
// removing specific circles from layers.  Keyed by GUID.
machinaTools.portalCircles = {}; // usual circles
// machinaTools.conflictZones = {}; // LGeo circles
machinaTools.optConflictZone = {
  color: 'red',
  opacity: 0.7,
  fillColor: 'red',
  fillOpacity: 0.1,
  weight: 3,
  interactive: false,
  clickable: false,
  parts: 144,
};
machinaTools.optCircle = {
  color: 'gray',
  opacity: 0.7,
  fillColor: 'red',
  fillOpacity: 0.1,
  weight: 1,
  clickable: false,
  interactive: false,
};

//    machinaTools.confArea = {};

machinaTools.findParent = function (portalGuid) {
  // Get the portal's data.
  var parent = undefined;

  if (portalGuid !== 'undefined') {
    var linkGuids = getPortalLinks(portalGuid);
    $.each(linkGuids.in, function (i, lguid) {
      var l = window.links[lguid];
      var ld = l.options.data;

      if (ld.dGuid === portalGuid) {
        parent = {};
        parent.guid = ld.oGuid;
        parent.lat = ld.oLatE6 / 1e6;
        parent.lng = ld.oLngE6 / 1e6;

        return false;
      }
    });
  }

  return parent;
};

machinaTools.goToParent = function (portalGuid) {
  var parent;

  parent = machinaTools.findParent(portalGuid);

  if (parent !== undefined) {
    window.zoomToAndShowPortal(parent.guid, [parent.lat, parent.lng]);
  } else {
    dialog({
      html: $('<div id="no-machina-parent">No Parent found.</div>'),
      title: 'Machina Tools',
      id: 'no-machina-parent',
    });
  }
};

machinaTools.findSeed = function (portalGuid) {
  var parent = undefined;
  var portal = window.portals[portalGuid];

  if (portal !== undefined) {
    // Since we could be the seed, if there's no
    // parent, then we have to return the portal.
    parent = {};
    parent.guid = portalGuid;
    parent.lat = portal.options.data.latE6 / 1e6;
    parent.lng = portal.options.data.lngE6 / 1e6;

    while (portalGuid !== undefined) {
      var newParent;

      newParent = machinaTools.findParent(portalGuid);

      if (newParent !== undefined) {
        parent = newParent;
        portalGuid = newParent.guid;
      } else {
        portalGuid = undefined;
      }
    }
  }

  return parent;
};

machinaTools.goToSeed = function (portalGuid) {
  var seed;

  seed = machinaTools.findSeed(portalGuid);

  if (seed !== undefined) {
    window.zoomToAndShowPortal(seed.guid, [seed.lat, seed.lng]);
  }
};

/*

    {
        [xyz] = {
            [level] = x
            [guid] = xyz
            [latlng] = [lat,lng]
            [children] = {
                [childGuid, linkTime],
                [childGuid, linkTime]
            }
        }
    }



*/

machinaTools.getOLatLng = function (link) {
  return L.latLng(link.oLatE6 / 1e6, link.oLngE6 / 1e6);
};

machinaTools.getDLatLng = function (link) {
  return L.latLng(link.dLatE6 / 1e6, link.dLngE6 / 1e6);
};

machinaTools.getLinkLength = function (link) {
  return machinaTools.getOLatLng(link).distanceTo([link.dLatE6 / 1e6, link.dLngE6 / 1e6]);
};

machinaTools.gatherMachinaPortalDetail = function (portalGuid, depth) {
  var rc = {};
  var portal = window.portals[portalGuid];

  rc.children = [];
  rc.guid = portalGuid;
  rc.depth = depth;
  rc.latlng = [portal.options.data.latE6 / 1e6, portal.options.data.lngE6 / 1e6];
  rc.level = portal.options.data.level;
  rc.name = portal.options.data.title;

  /*
  Since Machina portal levels are defined by their resonator
  levels not the sum total of their resonators, find the
  highest level resonator.
  */
  for (var resonator in portal.options.data.resonators) {
    if (rc.level < portal.options.data.resonators[resonator].level) {
      rc.level = portal.options.data.resonators[resonator].level;
    }
  }

  var linkGuids = getPortalLinks(portalGuid);

  $.each(linkGuids.out, function (i, lguid) {
    var l = window.links[lguid];
    var ld = l.options.data;

    rc.children.push({
      childGuid: ld.dGuid,
      linkTime: l.options.timestamp,
      length: machinaTools.getLinkLength(ld),
    });
  });

  rc.children.sort(function (a, b) {
    return a.linkTime - b.linkTime;
  });

  return rc;
};

machinaTools.gatherCluster = function (portalGuid) {
  var rc = {};
  var processingQueue = [];
  var seed = machinaTools.findSeed(portalGuid);
  var curPortal = undefined;

  if (seed !== undefined) {
    // Remember the seed.
    rc.portals = {};

    // Add the seed GUID to the queue.
    processingQueue.push({ guid: seed.guid, depth: 0 });
  }

  curPortal = processingQueue.shift();

  while (curPortal !== undefined) {
    rc.portals[curPortal.guid] = machinaTools.gatherMachinaPortalDetail(curPortal.guid, curPortal.depth);

    rc.portals[curPortal.guid].children.forEach((element) => {
      processingQueue.push({
        guid: element.childGuid,
        depth: curPortal.depth + 1,
      });
    });

    // Move on to the next portal on the list.
    curPortal = processingQueue.shift();
  }

  return rc;
};

machinaTools.clusterDisplayString = function (clusterData) {
  var rc = '';
  rc += '<div>';
  for (var guid in clusterData.portals) {
    var portal = clusterData.portals[guid];
    rc += 'Portal: <a onclick="window.zoomToAndShowPortal(\'' + guid + "', [" + portal.latlng + ']);" title="' + portal.name + '">';
    rc += portal.name + '</a>(' + portal.level + ') [Depth: ' + portal.depth + ']<br/>';
    if (portal.children.length > 0) {
      rc += '<ul>';
      portal.children.forEach((child) => {
        var childPortal = clusterData.portals[child.childGuid];
        if (childPortal !== undefined) {
          var lengthDescription;
          if (child.length < 100000) {
            lengthDescription = digits(Math.round(child.length)) + 'm';
          } else {
            lengthDescription = digits(Math.round(child.length / 1000)) + 'km';
          }

          if (window.LINK_RANGE_MAC[portal.level] < child.length) {
            lengthDescription += ' (EXCEEDS EXPECTED MAX)';
          }
          rc += '<li>' + new Date(child.linkTime).toUTCString() + ' link to <a onclick="window.zoomToAndShowPortal(\'';
          rc += child.childGuid + "', [" + childPortal.latlng + ']);" title="' + childPortal.name + '">' + childPortal.name;
          rc += '</a>(' + childPortal.level + ') - ' + lengthDescription + '</li>';
        } else {
          rc += '<li>' + new Date(child.linkTime).toUTCString() + ' link to UNKNOWN</li>';
        }
      });

      rc += '</ul>';
    } else {
      rc += '<br/>';
    }
  }

  rc += '</div>';

  return rc;
};

machinaTools.displayCluster = function (portalGuid) {
  var clusterData = machinaTools.gatherCluster(portalGuid);

  if (clusterData !== undefined) {
    var html = '';

    html += '<div id="machina-cluster">';
    html += machinaTools.clusterDisplayString(clusterData);
    html += '<br/><pre>' + JSON.stringify(clusterData, null, 4) + '</pre>';
    html += '</div>';

    dialog({
      html: html,
      title: 'Machina Cluster',
      id: 'machina-cluster',
      width: 'auto',
    });
  } else {
    dialog({
      html: $('<div id="no-machina-cluster">No Cluster found.</div>'),
      title: 'Machina Tools',
      id: 'no-machina-cluster',
    });
  }
};

machinaTools.onPortalDetailsUpdated = function () {
  var portalData;

  // If the portal was cleared then exit.
  if (window.selectedPortal === null) return;

  portalData = portalDetail.get(window.selectedPortal);

  if (portalData.team === 'M') {
    // Add the 'find Parent' button.
    $('.linkdetails').append(
      '<aside><a onclick="window.plugin.machinaTools.goToParent(\'' + window.selectedPortal + '\')" title=" Find Machina Parent ">Find Parent</a></aside>'
    );
    $('.linkdetails').append(
      '<aside><a onclick="window.plugin.machinaTools.goToSeed(\'' + window.selectedPortal + '\')" title="Find Machina Seed">Find Seed</a></aside>'
    );
    $('.linkdetails').append(
      '<aside><a onclick="window.plugin.machinaTools.displayCluster(\'' +
        window.selectedPortal +
        '\')" title="Display Machina Cluster">Cluster Details</a></aside>'
    );
    // Add the 'trace children' button.

    // Add this portal's conflict zone to the conflict area
    machinaTools.drawPortalExclusion(window.selectedPortal);
  }
};

/**
 * Indicates whether portals are displayed at the current level.  Simply using zoom level
 * does not factor in other tools that adjust display capabilities.
 */
machinaTools.zoomLevelHasPortals = function () {
  return window.getMapZoomTileParameters(window.getDataZoomForMapZoom(window.map.getZoom())).hasPortals;
};

machinaTools.updateConflictArea = function () {
  if (machinaTools.conflictAreaLast) {
    machinaTools.conflictAreaLayer.removeLayer(machinaTools.conflictAreaLast);
  }
  machinaTools.conflictAreaLast = L.geoJson(machinaTools.conflictArea);
  machinaTools.conflictAreaLayer.addLayer(machinaTools.conflictAreaLast);
  machinaTools.conflictAreaLast.setStyle(machinaTools.optConflictZone);
};

machinaTools.addPortalCircle = function (guid, circle) {
  machinaTools.removePortalExclusion(guid);
  circle.addTo(machinaTools.circleDisplayLayer);
  // Store a reference to the circle to allow removal.
  machinaTools.portalCircles[guid] = circle;
};

machinaTools.drawExclusion = function (guid, level, latlng, placeholder) {
  var range = window.LINK_RANGE_MAC[level + 1];

  // add circles only when handling real portals
  if (!placeholder) {
    machinaTools.addPortalCircle(guid, new L.Circle(latlng, range, machinaTools.optCircle));
  }

  let zone = new L.geodesicCircle(latlng, range, machinaTools.optConflictZone);
  machinaTools.addConflictZone(guid, zone);
  machinaTools.updateConflictArea();
};

machinaTools.addConflictZone = function (guid, zone) {
  // machinaTools.conflictZones[guid] = zone;
  if (!machinaTools.conflictArea) {
    machinaTools.conflictArea = zone.toGeoJSON();
  } else {
    machinaTools.conflictArea = turf.union(machinaTools.conflictArea, zone.toGeoJSON());
  }
};

/**
 * Draw the level-up link radius for a specific portal.
 */
machinaTools.drawPortalExclusion = function (guid) {
  // Gather the location of the portal, and generate a 20m
  // radius red circle centered on the lat/lng of the portal.
  var d = window.portals[guid];
  machinaTools.drawExclusion(guid, d.options.level, d.getLatLng());
};

/**
 * Removes the level-up link radius for a specific portal.
 */
machinaTools.removePortalExclusion = function (guid) {
  var previousLayer = machinaTools.portalCircles[guid];
  if (previousLayer) {
    // Remove the circle from the layer.
    machinaTools.circleDisplayLayer.removeLayer(previousLayer);

    // Delete the circle from storage, so we don't build up
    // a big cache, and we don't have complex checking on adds.
    delete machinaTools.portalCircles[guid];
  }
};

machinaTools.removeConflictZone = function (guid) {
  delete machinaTools.conflictZones[guid];
};
/**
 * Reacts to a portal being added or removed.
 */
machinaTools.portalAdded = function (data) {
  // Draw the circle if the team of the portal is Machina.
  data.portal.on('add', function () {
    // debugger;
    // if (TEAM_NAMES[this.options.team] != undefined) {
    if (window.TEAM_NAMES[this.options.team] === window.TEAM_NAME_MAC) {
      machinaTools.drawPortalExclusion(this.options.guid);
    }
    // }
  });

  // Remove all circles if they exist, since the team may have changed.
  data.portal.on('remove', function () {
    machinaTools.removePortalExclusion(this.options.guid);
    // machinaTools.removeConflictZone(this.options.guid);
  });
};

/**
 * Hides or shows the circle display layer as requested.
 */
machinaTools.showOrHideMachinaLevelUpRadius = function () {
  if (machinaTools.zoomLevelHasPortals()) {
    // Add the circle layer back to the display layer if necessary, and remove the disabled mark.
    if (!machinaTools.displayLayer.hasLayer(machinaTools.circleDisplayLayer)) {
      machinaTools.displayLayer.addLayer(machinaTools.circleDisplayLayer);
      $('.leaflet-control-layers-list span:contains("Machina Level Up Link Radius")').parent('label').removeClass('disabled').attr('title', '');
    }
  } else {
    // Remove the circle layer from the display layer if necessary, and add the disabled mark.
    if (machinaTools.displayLayer.hasLayer(machinaTools.circleDisplayLayer)) {
      machinaTools.displayLayer.removeLayer(machinaTools.circleDisplayLayer);
      $('.leaflet-control-layers-list span:contains("Machina Level Up Link Radius")')
        .parent('label')
        .addClass('disabled')
        .attr('title', 'Zoom in to show those.');
    }
  }
};

machinaTools.showOrHideMachinaConflictArea = function () {
  if (!machinaTools.conflictLayer.hasLayer(machinaTools.conflictAreaLayer)) {
    machinaTools.conflictLayer.addLayer(machinaTools.conflictAreaLayer);
    console.log('conflictAreaLayer activated');
    $('.leaflet-control-layers-list span:contains("Machina Conflict Area)').parent('label').removeClass('disabled').attr('title', '');
  } else {
    machinaTools.conflictLayer.removeLayer(machinaTools.conflictAreaLayer);
    console.log('conflictAreaLayer disabled');
    $('.leaflet-control-layers-list span:contains("Machina Conflict Area")').parent('label').addClass('disabled').attr('title', 'Zoom in to show those.');
  }
};

machinaTools.guessLevelByRange = function (linkLength) {
  for (var level = 0; level <= 8; ++level) {
    if (window.LINK_RANGE_MAC[level] >= linkLength) {
      return level;
    }
  }
  return 0;
};

machinaTools.linkAdded = function (data) {
  data.link.on('add', function () {
    // if (TEAM_NAMES[this.options.team] != undefined) {
    if (window.TEAM_NAMES[this.options.team] === window.TEAM_NAME_MAC) {
      var link = data.link.options.data;

      // add destination portal - 1 level
      machinaTools.drawExclusion(link.dGuid, 1, machinaTools.getDLatLng(link), true);

      // add origin portal - level based on link length
      var linkLength = machinaTools.getLinkLength(link);
      var level = machinaTools.guessLevelByRange(linkLength);
      machinaTools.drawExclusion(link.oGuid, level, machinaTools.getOLatLng(link), true);
    }
    // }
  });
};

var setup = function () {
  loadExternals(); // initialize leaflet-geodesy and turf-union

  window.addHook('portalDetailsUpdated', machinaTools.onPortalDetailsUpdated);

  // This layer is added to the layer chooser, to be toggled on/off, regardless of zoom.
  machinaTools.displayLayer = new L.LayerGroup();
  machinaTools.conflictLayer = new L.LayerGroup();

  // This layer is added into the above layer, and removed from it when we zoom out too far.
  machinaTools.circleDisplayLayer = new L.LayerGroup();
  machinaTools.conflictAreaLayer = new L.LayerGroup();

  // Initially add the circle display layer into base display layer.  We will trigger an assessment below.
  machinaTools.displayLayer.addLayer(machinaTools.circleDisplayLayer);
  machinaTools.conflictLayer.addLayer(machinaTools.conflictAreaLayer);

  // Add the base layer to the main window.
  window.addLayerGroup('Machina Level Up Link Radius', machinaTools.displayLayer, false);
  window.addLayerGroup('Machina Conflict Area', machinaTools.conflictLayer, false);

  // Hook the portalAdded event so that we can adjust circles.
  window.addHook('portalAdded', machinaTools.portalAdded);
  window.addHook('linkAdded', machinaTools.linkAdded);
  window.addHook('mapDataRefreshEnd', machinaTools.updateConflictArea);

  // Add a hook to trigger the showOrHide method when the map finishes zooming or reloads.
  map.on('zoomend', machinaTools.showOrHideMachinaLevelUpRadius);
  map.on('loading', machinaTools.showOrHideMachinaLevelUpRadius);
  map.on('load', machinaTools.showOrHideMachinaLevelUpRadius);

  // Trigger an initial assessment of displaying the circleDisplayLayer.
  machinaTools.showOrHideMachinaLevelUpRadius();
};
/* eslint-disable */
function loadExternals () {
  try {
   '@include_raw:external/turf-union.js@';
  } catch (e) {
    console.error('turf-union.js loading failed');
    throw e;
  }
}
/* eslint-enable */
