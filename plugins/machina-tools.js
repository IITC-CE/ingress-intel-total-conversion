// @name           Machina Tools
// @author         Perringaiden
// @category       Misc
// @version        0.7.0
// @description    Machina investigation tools

/* exported setup --eslint */
/* global L, map, dialog, getPortalLinks, portalDetail */
// use own namespace for plugin
window.plugin.wolfMachina = function () {};
var wm = window.plugin.wolfMachina;

window.plugin.wolfMachina.portalRanges = {
  1: 0,
  2: 500,
  3: 750,
  4: 1000,
  5: 1500,
  6: 2000,
  7: 3000,
  8: 5000
};

// Provides a circle object storage array for adding and
// removing specific circles from layers.  Keyed by GUID.
window.plugin.wolfMachina.portalCircles = {}; // usual circles
// window.plugin.wolfMachina.conflictZones = {}; // LGeo circles
window.plugin.wolfMachina.optConflictZone = {
  color: 'red',
  opacity: 0.7,
  fillColor: 'red',
  fillOpacity: 0.1,
  weight: 3,
  interactive: false,
  clickable: false,
  parts: 144,
};
window.plugin.wolfMachina.optCircle = {
  color: 'gray',
  opacity: 0.7,
  fillColor: 'red',
  fillOpacity: 0.1,
  weight: 1,
  clickable: false,
  interactive: false,
};

//    window.plugin.wolfMachina.confArea = {};

window.plugin.wolfMachina.findParent = function (portalGuid) {
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

window.plugin.wolfMachina.goToParent = function (portalGuid) {
  var parent;

  parent = window.plugin.wolfMachina.findParent(portalGuid);

  if (parent !== undefined) {
    window.zoomToAndShowPortal(parent.guid, [parent.lat, parent.lng]);
  } else {
    dialog({
      html: $('<div id="no-machina-parent">No Parent found.</div>'),
      title: 'Machina Tools',
      id: 'no-machina-parent'
    });
  }
};

window.plugin.wolfMachina.findSeed = function (portalGuid) {
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

      newParent = window.plugin.wolfMachina.findParent(portalGuid);

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

window.plugin.wolfMachina.goToSeed = function (portalGuid) {
  var seed;

  seed = window.plugin.wolfMachina.findSeed(portalGuid);

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

window.plugin.wolfMachina.getOLatLng = function (link) {
  return L.latLng(link.oLatE6 / 1e6, link.oLngE6 / 1e6);
};

window.plugin.wolfMachina.getDLatLng = function (link) {
  return L.latLng(link.dLatE6 / 1e6, link.dLngE6 / 1e6);
};

window.plugin.wolfMachina.getLinkLength = function (link) {
  return wm.getOLatLng(link).distanceTo([link.dLatE6 / 1e6, link.dLngE6 / 1e6]);
}

window.plugin.wolfMachina.gatherMachinaPortalDetail = function (portalGuid, depth) {
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
      length: wm.getLinkLength(ld),
    });
  });

  rc.children.sort(function (a, b) {return a.linkTime - b.linkTime });

  return rc;
};

window.plugin.wolfMachina.gatherCluster = function (portalGuid) {
  var rc = {};
  var processingQueue = [];
  var seed = wm.findSeed(portalGuid);
  var curPortal = undefined;

  if (seed !== undefined) {
    // Remember the seed.
    rc.portals = {};

    // Add the seed GUID to the queue.
    processingQueue.push(
      {guid: seed.guid,
       depth: 0
      }
    );
  }

  curPortal = processingQueue.shift();

  while (curPortal !== undefined) {
    rc.portals[curPortal.guid] = wm.gatherMachinaPortalDetail(curPortal.guid, curPortal.depth);

    rc.portals[curPortal.guid].children.forEach((element) => {
      processingQueue.push({
        guid: element.childGuid,
        depth: curPortal.depth + 1
      });
    });

    // Move on to the next portal on the list.
    curPortal = processingQueue.shift();
  }

  return rc;
};

window.plugin.wolfMachina.clusterDisplayString = function (clusterData) {
  var rc = '';
  rc += '<div>';
  for (var guid in clusterData.portals) {
    var portal = clusterData.portals[guid];
    rc += 'Portal: <a onclick="window.zoomToAndShowPortal(\'' + guid + '\', [' + portal.latlng + ']);" title="' + portal.name + '">';
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

          if (window.plugin.wolfMachina.portalRanges[portal.level] < child.length) {
            lengthDescription += ' (EXCEEDS EXPECTED MAX)';
          }
          rc += '<li>' + new Date(child.linkTime).toUTCString() + ' link to <a onclick="window.zoomToAndShowPortal(\'';
          rc += child.childGuid + '\', [' + childPortal.latlng + ']);" title="' + childPortal.name + '">' + childPortal.name;
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

window.plugin.wolfMachina.displayCluster = function (portalGuid) {
  var clusterData = wm.gatherCluster(portalGuid);

  if (clusterData !== undefined) {
    var html = '';

    html += '<div id="machina-cluster">';
    html += wm.clusterDisplayString(clusterData);
    html += '<br/><pre>' + JSON.stringify(clusterData, null, 4) + '</pre>';
    html += '</div>';


    dialog({
      html: html,
      title: 'Machina Cluster',
      id: 'machina-cluster',
      width: 'auto'
    });
  } else {
    dialog({
      html: $('<div id="no-machina-cluster">No Cluster found.</div>'),
      title: 'Machina Tools',
      id: 'no-machina-cluster'
    });
  }
};

window.plugin.wolfMachina.onPortalDetailsUpdated = function () {
  var portalData;

  // If the portal was cleared then exit.
  if (window.selectedPortal === null) return;

  portalData = portalDetail.get(window.selectedPortal);

  if (portalData.team === 'M') {

    // Add the 'find Parent' button.
    $('.linkdetails').append('<aside><a onclick="window.plugin.wolfMachina.goToParent(\'' + window.selectedPortal + '\')" title=" Find Machina Parent ">Find Parent</a></aside>');
    $('.linkdetails').append('<aside><a onclick="window.plugin.wolfMachina.goToSeed(\'' + window.selectedPortal + '\')" title="Find Machina Seed">Find Seed</a></aside>');
    $('.linkdetails').append('<aside><a onclick="window.plugin.wolfMachina.displayCluster(\'' + window.selectedPortal + '\')" title="Display Machina Cluster">Cluster Details</a></aside>');
    // Add the 'trace children' button.

    // Add this portal's conflict zone to the conflict area
    window.plugin.wolfMachina.drawPortalExclusion(window.selectedPortal);
  }
};

/**
 * Indicates whether portals are displayed at the current level.  Simply using zoom level
 * does not factor in other tools that adjust display capabilities.
 */
window.plugin.wolfMachina.zoomLevelHasPortals = function () {
  return window.getMapZoomTileParameters(window.getDataZoomForMapZoom(window.map.getZoom())).hasPortals;
};


window.plugin.wolfMachina.updateConflictArea = function () {
  if (window.plugin.wolfMachina.conflictAreaLast) {
    window.plugin.wolfMachina.conflictAreaLayer.removeLayer(window.plugin.wolfMachina.conflictAreaLast);
  }
  window.plugin.wolfMachina.conflictAreaLast = L.geoJson(window.plugin.wolfMachina.conflictArea);
  window.plugin.wolfMachina.conflictAreaLayer.addLayer(window.plugin.wolfMachina.conflictAreaLast);
  window.plugin.wolfMachina.conflictAreaLast.setStyle(window.plugin.wolfMachina.optConflictZone);
};

window.plugin.wolfMachina.addPortalCircle = function (guid, circle) {
  window.plugin.wolfMachina.removePortalExclusion(guid);
  circle.addTo(window.plugin.wolfMachina.circleDisplayLayer);
  // Store a reference to the circle to allow removal.
  window.plugin.wolfMachina.portalCircles[guid] = circle;
}

window.plugin.wolfMachina.drawExclusion = function (guid, level, latlng, placeholder) {
  var range = window.plugin.wolfMachina.portalRanges[Math.min(level + 1, 8)];

  // add circles only when handling real portals
  if (!placeholder) {
    window.plugin.wolfMachina.addPortalCircle(guid, new L.Circle(latlng, range, wm.optCircle));
  }

  let zone = new L.geodesicCircle(latlng, range, window.plugin.wolfMachina.optConflictZone);
  wm.addConflictZone(guid, zone);
  wm.updateConflictArea();
};

window.plugin.wolfMachina.addConflictZone = function (guid, zone) {
  // window.plugin.wolfMachina.conflictZones[guid] = zone;
  if (!window.plugin.wolfMachina.conflictArea) {
    window.plugin.wolfMachina.conflictArea = zone.toGeoJSON();
  } else {
    window.plugin.wolfMachina.conflictArea = turf.union(window.plugin.wolfMachina.conflictArea, zone.toGeoJSON());
  }
};

/**
 * Draw the level-up link radius for a specific portal.
 */
window.plugin.wolfMachina.drawPortalExclusion = function (guid) {
  // Gather the location of the portal, and generate a 20m
  // radius red circle centered on the lat/lng of the portal.
  var d = window.portals[guid];
  wm.drawExclusion(guid, d.options.level, d.getLatLng());
};

/**
 * Removes the level-up link radius for a specific portal.
 */
window.plugin.wolfMachina.removePortalExclusion = function (guid) {
  var previousLayer = window.plugin.wolfMachina.portalCircles[guid];
  if (previousLayer) {
    // Remove the circle from the layer.
    window.plugin.wolfMachina.circleDisplayLayer.removeLayer(previousLayer);

    // Delete the circle from storage, so we don't build up
    // a big cache, and we don't have complex checking on adds.
    delete window.plugin.wolfMachina.portalCircles[guid];
  }
};

window.plugin.wolfMachina.removeConflictZone = function(guid) {
  delete window.plugin.wolfMachina.conflictZones[guid];
};
/**
 * Reacts to a portal being added or removed.
 */
window.plugin.wolfMachina.portalAdded = function (data) {
  // Draw the circle if the team of the portal is Machina.
  data.portal.on('add', function () {
//debugger;
  // if (TEAM_NAMES[this.options.team] != undefined) {
    if (TEAM_NAMES[this.options.team] === TEAM_NAME_MAC) {
      window.plugin.wolfMachina.drawPortalExclusion(this.options.guid);
    }
  // }
  });

  // Remove all circles if they exist, since the team may have changed.
  data.portal.on('remove', function () {
    window.plugin.wolfMachina.removePortalExclusion(this.options.guid);
    // window.plugin.wolfMachina.removeConflictZone(this.options.guid);
  });
};

/**
 * Hides or shows the circle display layer as requested.
 */
window.plugin.wolfMachina.showOrHideMachinaLevelUpRadius = function () {
  if (window.plugin.wolfMachina.zoomLevelHasPortals()) {
    // Add the circle layer back to the display layer if necessary, and remove the disabled mark.
    if (!window.plugin.wolfMachina.displayLayer.hasLayer(window.plugin.wolfMachina.circleDisplayLayer)) {
      window.plugin.wolfMachina.displayLayer.addLayer(window.plugin.wolfMachina.circleDisplayLayer);
      $('.leaflet-control-layers-list span:contains("Machina Level Up Link Radius")').parent('label').removeClass('disabled').attr('title', '');
    }
  } else {
    // Remove the circle layer from the display layer if necessary, and add the disabled mark.
    if (window.plugin.wolfMachina.displayLayer.hasLayer(window.plugin.wolfMachina.circleDisplayLayer)) {
      window.plugin.wolfMachina.displayLayer.removeLayer(window.plugin.wolfMachina.circleDisplayLayer);
      $('.leaflet-control-layers-list span:contains("Machina Level Up Link Radius")').parent('label').addClass('disabled').attr('title', 'Zoom in to show those.');
    }
  }
};

window.plugin.wolfMachina.showOrHideMachinaConflictArea = function () {
  if (!window.plugin.wolfMachina.conflictLayer.hasLayer(window.plugin.wolfMachina.conflictAreaLayer)) {
    window.plugin.wolfMachina.conflictLayer.addLayer(window.plugin.wolfMachina.conflictAreaLayer);
    console.log('conflictAreaLayer activated');
    $('.leaflet-control-layers-list span:contains("Machina Conflict Area)').parent('label').removeClass('disabled').attr('title', '');
  } else {
    window.plugin.wolfMachina.conflictLayer.removeLayer(window.plugin.wolfMachina.conflictAreaLayer);
    console.log('conflictAreaLayer disabled');
    $('.leaflet-control-layers-list span:contains("Machina Conflict Area")').parent('label').addClass('disabled').attr('title', 'Zoom in to show those.');
  }
};

window.plugin.wolfMachina.guessLevelByRange = function (linkLength) {
  for (const level in wm.portalRanges) {
    if (wm.portalRanges[level] >= linkLength) {
      return Number(level);
    }
  }
  return 0;
};

window.plugin.wolfMachina.linkAdded = function (data) {
  data.link.on('add', function () {
    // if (TEAM_NAMES[this.options.team] != undefined) {
    if (window.TEAM_NAMES[this.options.team] === window.TEAM_NAME_MAC) {
      var link = data.link.options.data;

      // add destination portal - 1 level
      wm.drawExclusion(link.dGuid, 1, wm.getDLatLng(link), true);

      // add origin portal - level based on link length
      var linkLength = wm.getLinkLength(link);
      var level = wm.guessLevelByRange(linkLength);
      wm.drawExclusion(link.oGuid, level, wm.getOLatLng(link), true);
    }
    // }
  });
};

var setup = function () {
  loadExternals(); // initialize leaflet-geodesy and turf-union

  window.addHook('portalDetailsUpdated', window.plugin.wolfMachina.onPortalDetailsUpdated);

  // This layer is added to the layer chooser, to be toggled on/off, regardless of zoom.
  window.plugin.wolfMachina.displayLayer = new L.LayerGroup();
  window.plugin.wolfMachina.conflictLayer = new L.LayerGroup();

  // This layer is added into the above layer, and removed from it when we zoom out too far.
  window.plugin.wolfMachina.circleDisplayLayer = new L.LayerGroup();
  window.plugin.wolfMachina.conflictAreaLayer = new L.LayerGroup();

  // Initially add the circle display layer into base display layer.  We will trigger an assessment below.
  window.plugin.wolfMachina.displayLayer.addLayer(window.plugin.wolfMachina.circleDisplayLayer);
  window.plugin.wolfMachina.conflictLayer.addLayer(window.plugin.wolfMachina.conflictAreaLayer);

  // Add the base layer to the main window.
  window.addLayerGroup('Machina Level Up Link Radius', window.plugin.wolfMachina.displayLayer, false);
  window.addLayerGroup('Machina Conflict Area', window.plugin.wolfMachina.conflictLayer, false);

  // Hook the portalAdded event so that we can adjust circles.
  window.addHook('portalAdded', window.plugin.wolfMachina.portalAdded);
  window.addHook('linkAdded', window.plugin.wolfMachina.linkAdded);
  window.addHook('mapDataRefreshEnd', window.plugin.wolfMachina.updateConflictArea);

  // Add a hook to trigger the showOrHide method when the map finishes zooming or reloads.
  map.on('zoomend', window.plugin.wolfMachina.showOrHideMachinaLevelUpRadius);
  map.on('loading', window.plugin.wolfMachina.showOrHideMachinaLevelUpRadius);
  map.on('load', window.plugin.wolfMachina.showOrHideMachinaLevelUpRadius);

  // Trigger an initial assessment of displaying the circleDisplayLayer.
  window.plugin.wolfMachina.showOrHideMachinaLevelUpRadius();
};
/* eslint-disable */
function loadExternals () {
  try {
   '@include_raw:external/turf-union.js@';
  } catch (e) {
    console.error('turf-union.js loading failed');
    throw e;
  }
};
/* eslint-enable */
