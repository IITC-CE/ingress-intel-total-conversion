// @name           Machina Tools
// @author         Perringaiden
// @category       Misc
// @version        0.8.1
// @description    Machina investigation tools - 2 new layers to see possible Machina spread and portal detail links to display Machina cluster information and to navigate to parent or seed Machina portal

/* exported setup, changelog --eslint */
/* global , digits, L, map, dialog, getPortalLinks, portalDetail, turf */

var changelog = [
  {
    version: '0.8.1',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var machinaTools = {};
window.plugin.machinaTools = machinaTools;

// Provides a circle object storage array for adding and
// removing specific circles from layers.  Keyed by GUID.
machinaTools.portalCircles = {}; // usual circles
machinaTools._clusterDialogs = {}; // cluster dialogs
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

function toLatLng(latE6, lngE6) {
  return L.latLng(latE6 / 1e6, lngE6 / 1e6);
}

machinaTools.getOLatLng = function (link) {
  return toLatLng(link.oLatE6, link.oLngE6);
};

machinaTools.getDLatLng = function (link) {
  return toLatLng(link.dLatE6, link.dLngE6);
};

machinaTools.getLinkLength = function (link) {
  return machinaTools.getOLatLng(link).distanceTo(toLatLng(link.dLatE6, link.dLngE6));
};

machinaTools.gatherMachinaPortalDetail = function (portalGuid, depth) {
  var portal = window.portals[portalGuid];
  if (portal) {
    return {
      guid: portalGuid,
      depth: depth,
      latlng: toLatLng(portal.options.data.latE6, portal.options.data.lngE6),
      level: Math.max(portal.options.level, ...(portal.options.data.resonators || []).map((r) => r.level)),
      name: portal.options.data.title,
      children: getPortalLinks(portalGuid)
        .out.map((lGuid) => {
          var l = window.links[lGuid];
          return {
            childGuid: l.options.data.dGuid,
            linkTime: l.options.timestamp,
            length: machinaTools.getLinkLength(l.options.data),
          };
        })
        .sort((a, b) => a.linkTime - b.linkTime),
    };
  }
};

/**
 * <pre>
 *   {
 *     [xyz] = {
 *       [level] = x
 *       [guid] = xyz
 *       [latlng] = [lat,lng]
 *       [children] = {
 *         [childGuid, linkTime],
 *         [childGuid, linkTime]
 *       }
 *     }
 *   }
 * </pre>
 */
machinaTools.gatherCluster = function (seed) {
  var rcPortals = undefined;
  if (seed !== undefined) {
    rcPortals = {};
    // Remember the seed.
    var curPortal = { guid: seed.guid, depth: 0 };

    var processingQueue = [];
    while (curPortal) {
      var machinaPortalDetail = machinaTools.gatherMachinaPortalDetail(curPortal.guid, curPortal.depth);
      if (machinaPortalDetail) {
        rcPortals[curPortal.guid] = machinaPortalDetail;
        machinaPortalDetail.children.forEach((element) => {
          processingQueue.push({
            guid: element.childGuid,
            depth: curPortal.depth + 1,
          });
        });
      }

      // Move on to the next portal on the list.
      curPortal = processingQueue.shift();
    }
  }

  return rcPortals;
};

function getDisplayPortalName(portal) {
  return portal.name || '[Click to load...]';
}

function appendPortalLine(rc, portal) {
  rc.append('Portal: ');
  var portalName = getDisplayPortalName(portal);
  var portalLink = $('<a>', {
    title: portalName,
    html: portalName,
    click: (e) => {
      window.renderPortalDetails(portal.guid);
      e.stopPropagation();
    },
  });
  rc.append(portalLink);
  rc.append(`(${portal.level}) [Depth: ${portal.depth}]`);
  rc.append('<br/>');
}

function createChildListItem(parent, childData, childPortal) {
  var childListItem = $('<li>');
  childListItem.append(new Date(childData.linkTime).toUTCString());
  childListItem.append(' link to ');
  var childName = getDisplayPortalName(childPortal);
  var childLink = $('<a>', {
    title: childName,
    html: childName,
    click: (e) => {
      window.renderPortalDetails(childData.childGuid);
      e.stopPropagation();
    },
  });
  childListItem.append(childLink);

  var lengthDescription;
  if (childData.length < 100000) {
    lengthDescription = digits(Math.round(childData.length)) + 'm';
  } else {
    lengthDescription = digits(Math.round(childData.length / 1000)) + 'km';
  }

  if (window.LINK_RANGE_MAC[parent.level] < childData.length) {
    lengthDescription += ' (EXCEEDS EXPECTED MAX)';
  }
  childListItem.append(`(${childPortal.level}) - ${lengthDescription}`);
  return childListItem;
}

machinaTools.clusterDisplayNode = function (clusterPortals) {
  var rc = $('<div>');
  for (var guid in clusterPortals) {
    var portal = clusterPortals[guid];
    appendPortalLine(rc, portal);
    if (portal.children.length > 0) {
      var childList = $('<ul>');
      rc.append(childList);
      portal.children.forEach((childData) => {
        var childPortal = clusterPortals[childData.childGuid];
        if (childPortal !== undefined) {
          var childListItem = createChildListItem(portal, childData, childPortal);
          childList.append(childListItem);
        } else {
          childList.append($('<li>', { html: `${new Date(childData.linkTime).toUTCString()} link to UNKNOWN` }));
        }
      });
    } else {
      rc.append('<br/>');
    }
  }

  return rc;
};

function doDisplayClusterInfo(seed) {
  var guid = undefined;
  var html = $('<div>', { id: 'machina-cluster' });
  if (seed) {
    guid = seed.guid;
    var cluster = machinaTools.gatherCluster(seed);
    html.append(machinaTools.clusterDisplayNode(cluster));
    html.append('<br/><pre>' + JSON.stringify(cluster, null, 4) + '</pre>');
  } else {
    html.append('No Cluster found.');
  }

  guid = String(guid);
  if (machinaTools._clusterDialogs[guid]) {
    machinaTools._clusterDialogs[guid].html(html);
  } else {
    machinaTools._clusterDialogs[guid] = dialog({
      html: html,
      title: 'Machina Cluster',
      id: 'machina-cluster-' + guid.replaceAll('.', '_'),
      width: 'auto',
      closeCallback: () => delete machinaTools._clusterDialogs[guid],
    });
  }
}

machinaTools.displayCluster = function (portalGuid) {
  var seed = machinaTools.findSeed(portalGuid);
  doDisplayClusterInfo(seed);
};

function createInfoLink(text, title, clickCallback) {
  var aside = $('<aside>');
  $('<a>', { title: title, click: clickCallback, html: text }).appendTo(aside);
  return aside;
}

machinaTools.onPortalDetailsUpdated = function () {
  var portalData;

  // If the portal was cleared then exit.
  if (window.selectedPortal === null) return;

  portalData = portalDetail.get(window.selectedPortal);

  if (portalData.team === window.TEAM_CODE_MAC) {
    var linkdetails = $('.linkdetails');
    linkdetails.append(createInfoLink('Find Parent', 'Find Machina Parent', () => machinaTools.goToParent(window.selectedPortal)));
    linkdetails.append(createInfoLink('Find Seed', 'Find Machina Seed', () => machinaTools.goToSeed(window.selectedPortal)));
    linkdetails.append(createInfoLink('Cluster Details', 'Display Machina Cluster', () => machinaTools.displayCluster(window.selectedPortal)));

    // Add this portal's conflict zone to the conflict area
    machinaTools.drawPortalExclusion(window.portals[window.selectedPortal]);
    refreshDialogs(window.selectedPortal);
  }
};

/**
 * Indicates whether portals are displayed at the current level.  Simply using zoom level
 * does not factor in other tools that adjust display capabilities.
 */
machinaTools.zoomLevelHasPortals = function () {
  return window.getDataZoomTileParameters().hasPortals;
};

machinaTools.updateConflictArea = function () {
  machinaTools.conflictLayer.clearLayers();
  machinaTools.conflictAreaLast = L.geoJson(machinaTools.conflictArea);
  machinaTools.conflictLayer.addLayer(machinaTools.conflictAreaLast);
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
  if (isDisplayLayerEnabled() && !placeholder) {
    machinaTools.addPortalCircle(guid, new L.Circle(latlng, range, machinaTools.optCircle));
  }

  if (isConflictLayerEnabled()) {
    var zone = new L.geodesicCircle(latlng, range, machinaTools.optConflictZone);
    machinaTools.addConflictZone(guid, zone);
    machinaTools.updateConflictArea();
  }
};

machinaTools.addConflictZone = function (guid, zone) {
  if (!machinaTools.conflictArea) {
    machinaTools.conflictArea = zone.toGeoJSON();
  } else {
    machinaTools.conflictArea = turf.union(machinaTools.conflictArea, zone.toGeoJSON());
  }
};

/**
 * Draw the level-up link radius for a specific portal.
 */
machinaTools.drawPortalExclusion = function (portal) {
  // Gather the location of the portal, and generate a 20m
  // radius red circle centered on the lat/lng of the portal.
  if (portal.options.team === window.TEAM_MAC) {
    machinaTools.drawExclusion(portal.options.guid, portal.options.level, portal.getLatLng());
  }
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

/**
 * Reacts to a portal being added or removed.
 */
machinaTools.portalAdded = function (data) {
  // Draw the circle if the team of the portal is Machina.
  machinaTools.drawPortalExclusion(data.portal);
};

/**
 * Reacts to a portal being removed.
 */
machinaTools.portalRemoved = function (data) {
  // Remove all circles if they exist, since the team may have changed.
  machinaTools.removePortalExclusion(data.portal.options.guid);
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

machinaTools.guessLevelByRange = function (linkLength) {
  for (var level = 0; level <= 8; ++level) {
    if (window.LINK_RANGE_MAC[level] >= linkLength) {
      return level;
    }
  }
  return 0;
};

machinaTools.drawLinkExclusion = function (link) {
  if (link.options.team === window.TEAM_MAC) {
    var linkData = link.options.data;
    // add destination portal - 1 level
    machinaTools.drawExclusion(linkData.dGuid, 1, machinaTools.getDLatLng(linkData), true);

    // add origin portal - level based on link length
    var linkLength = machinaTools.getLinkLength(linkData);
    var level = machinaTools.guessLevelByRange(linkLength);
    machinaTools.drawExclusion(linkData.oGuid, level, machinaTools.getOLatLng(linkData), true);
  }
};

machinaTools.linkAdded = function (data) {
  machinaTools.drawLinkExclusion(data.link);
};

function humanFileSize(size) {
  var i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kiB', 'MiB', 'GiB', 'TiB'][i];
}

var typeSizes = {
  undefined: () => 0,
  boolean: () => 4,
  number: () => 8,
  string: (item) => 2 * item.length,
  object: (item) => (!item ? 0 : Object.keys(item).reduce((total, key) => (Array.isArray(item) ? 0 : sizeOf(key)) + sizeOf(item[key]) + total, 0)),
};

function sizeOf(value) {
  return typeSizes[typeof value](value);
}

function createAreaInfoDialogContent() {
  var html = $('<div>');
  if (machinaTools.conflictAreaLast && machinaTools.conflictAreaLast.getLayers().length > 0) {
    var ul = $('<ul>');
    ul.appendTo(html);

    var conflictAreaLayers = machinaTools.conflictAreaLast.getLayers();
    let conflictLayer = conflictAreaLayers[0];
    ul.append($('<li>', { html: `Cluster area size: ${humanFileSize(sizeOf(conflictLayer.feature))}` }));

    var unitedAreas = 0;
    var totalPoints = 0;

    var conflictLayerGeometry = conflictLayer.feature.geometry;
    if (conflictLayerGeometry.type === 'Polygon') {
      unitedAreas = 1;
      totalPoints = conflictLayerGeometry.coordinates[0].length;
    } else if (conflictLayerGeometry.type === 'MultiPolygon') {
      unitedAreas = conflictLayerGeometry.coordinates.length;
      totalPoints = conflictLayerGeometry.coordinates.flatMap((v) => v).flatMap((v) => v).length;
    }
    ul.append($('<li>', { html: `Continuous areas: ${unitedAreas}` }));
    ul.append($('<li>', { html: `Total area points: ${totalPoints}` }));
  } else {
    html.append('No machina clusters found');
  }
  return html;
}

function refreshDialogs(guid) {
  if (guid && window.portals[guid] && window.portals[guid].options.team === window.TEAM_MAC) {
    var seed = machinaTools.findSeed(guid);
    if (seed && machinaTools._clusterDialogs[seed.guid]) {
      doDisplayClusterInfo(seed);
    }
  }

  if (machinaTools._conflictAreaInfoDialog) {
    machinaTools._conflictAreaInfoDialog.html(createAreaInfoDialogContent());
  }

  if (machinaTools._clustersInfoDialog) {
    machinaTools._clustersInfoDialog.html(createClustersInfoDialog());
  }
}

machinaTools.showConflictAreaInfoDialog = function () {
  machinaTools._conflictAreaInfoDialog = dialog({
    html: createAreaInfoDialogContent(),
    title: 'Machina Conflict Area Info',
    id: 'machina-conflict-area-info',
    width: 'auto',
    closeCallback: () => {
      delete machinaTools._conflictAreaInfoDialog;
    },
    buttons: {
      'Reset Conflict Area': machinaTools.resetConflictArea,
    },
  });
};

function isDisplayLayerEnabled() {
  return map.hasLayer(machinaTools.displayLayer);
}

function isConflictLayerEnabled() {
  return map.hasLayer(machinaTools.conflictLayer);
}

machinaTools.loadConflictAreas = function () {
  if (isConflictLayerEnabled() || isDisplayLayerEnabled()) {
    Object.values(window.portals).forEach(machinaTools.drawPortalExclusion);
    Object.values(window.links).forEach(machinaTools.drawLinkExclusion);

    machinaTools.updateConflictArea();
  }
};

machinaTools.clearConflictArea = function () {
  delete machinaTools.conflictArea;
};

machinaTools.resetConflictArea = function () {
  machinaTools.clearConflictArea();
  machinaTools.loadConflictAreas();
};

machinaTools.mapDataRefreshEnd = function () {
  if (!machinaTools.recordZones) {
    machinaTools.resetConflictArea();
  }
  refreshDialogs();
};

function appendChildrenList(appendTo, leaf, clusterPortals) {
  var childList = $('<div>', { class: 'childrenList' });
  appendTo.addClass('collapsible');
  appendTo.on('click', (e) => {
    childList.slideToggle('slow');
    appendTo.toggleClass('collapsed');
    e.stopPropagation();
  });
  if (!leaf.children.length) {
    appendTo.addClass('empty');
  } else {
    leaf.children.forEach((childData) => {
      appendTo.append(childList);
      var childPortal = clusterPortals[childData.childGuid];
      if (childPortal !== undefined) {
        var childListItem = createChildListItem(leaf, childData, childPortal);
        childListItem.css('border-left-color', `hsl(${Math.trunc((childData.linkTime / (60 * 60 * 1000)) % 360)},100%,50%)`);
        childListItem.addClass('striped');
        appendChildrenList(childListItem, childPortal, clusterPortals);
        childList.append(childListItem);
      } else {
        childList.append($('<li>', { html: `${new Date(childData.linkTime).toUTCString()} link to UNKNOWN` }));
      }
    });
  }
}

function createClustersInfoDialog() {
  var html = $('<div>');
  var seeds = [];
  Object.values(window.portals)
    .filter((p) => p.options.team === window.TEAM_MAC && map.getBounds().contains(p.getLatLng()))
    .forEach((p) => {
      var seedData = machinaTools.findSeed(p.options.guid);
      if (!seeds.find((s) => s.guid === seedData.guid)) {
        seeds.push(seedData);
        var clusterPortals = machinaTools.gatherCluster(seedData);
        var seed = clusterPortals[seedData.guid];
        if (seed) {
          var portalSection = $('<div>');
          portalSection.appendTo(html);
          appendPortalLine(portalSection, seed);
          appendChildrenList(portalSection, seed, clusterPortals);
        }
      }
    });

  if (!html.children().length) {
    html.append('No Clusters found.');
  }
  return html;
}

machinaTools.showClustersDialog = function () {
  machinaTools._clustersInfoDialog = dialog({
    html: createClustersInfoDialog(),
    title: 'Visible Machina Clusters',
    dialogClass: 'machina-tools',
    id: 'visible-machina-clusters',
    width: 'max-content',
    closeCallback: () => {
      delete machinaTools._clustersInfoDialog;
    },
  });
};

function setupLayers() {
  // This layer is added to the layer chooser, to be toggled on/off
  machinaTools.displayLayer = new L.LayerGroup([], { minZoom: 15 });
  machinaTools.conflictLayer = new L.LayerGroup();

  // This layer is added into the above layer, and removed from it when we zoom out too far.
  machinaTools.circleDisplayLayer = new L.LayerGroup();
  machinaTools.circleDisplayLayer.on('add', () => machinaTools.loadConflictAreas());
  machinaTools.circleDisplayLayer.on('remove', () => machinaTools.circleDisplayLayer.clearLayers());
  // Initially add the circle display layer into base display layer.  We will trigger an assessment below.
  machinaTools.displayLayer.addLayer(machinaTools.circleDisplayLayer);

  machinaTools.conflictLayer.on('add', () => {
    if (machinaTools.recordButton) {
      machinaTools.recordButton.addTo(window.map);
    }
    machinaTools.loadConflictAreas();
  });

  machinaTools.conflictLayer.on('remove', () => {
    machinaTools.recordButton.remove();
    machinaTools.clearConflictArea();
  });

  // Add the base layer to the main window.
  window.layerChooser.addOverlay(machinaTools.displayLayer, 'Machina Level Up Link Radius', { default: false });
  window.layerChooser.addOverlay(machinaTools.conflictLayer, 'Machina Conflict Area', { default: false });
}

function setupHooks() {
  window.addHook('portalDetailsUpdated', machinaTools.onPortalDetailsUpdated);
  // Hook the portalAdded event so that we can adjust circles.
  window.addHook('portalAdded', machinaTools.portalAdded);
  window.addHook('portalRemoved', machinaTools.portalRemoved);
  window.addHook('linkAdded', machinaTools.linkAdded);
  window.addHook('mapDataRefreshEnd', machinaTools.mapDataRefreshEnd);

  // Add a hook to trigger the showOrHide method when the map finishes zooming or reloads.
  map.on('zoomend', machinaTools.showOrHideMachinaLevelUpRadius);
}

function setupToolBoxLinks() {
  let toolbox = $('#toolbox');
  $('<a>', {
    title: 'Conflict Area Info',
    click: machinaTools.showConflictAreaInfoDialog,
    html: 'Conflict Area Info',
  }).appendTo(toolbox);

  $('<a>', {
    title: 'Display Visible Machina Clusters Info',
    click: machinaTools.showClustersDialog,
    html: 'Machina Clusters',
  }).appendTo(toolbox);
}

function setupControlButtons() {
  machinaTools.recordZones = localStorage['machina-tools_record-zones'] === 'true';

  var RecordSwitch = L.Control.extend({
    options: {
      position: 'topleft',
    },
    onAdd: function () {
      var button = document.createElement('a');
      button.innerHTML = '<svg class="rec-button"><circle></circle></svg>';
      button.className = 'leaflet-bar-part';
      if (machinaTools.recordZones) {
        button.classList.add('recording');
      }
      button.addEventListener(
        'click',
        () => {
          machinaTools.recordZones = !machinaTools.recordZones;
          localStorage['machina-tools_record-zones'] = machinaTools.recordZones;
          if (machinaTools.recordZones) {
            if (!machinaTools.conflictArea) {
              machinaTools.loadConflictAreas();
            }
            button.classList.add('recording');
          } else {
            button.classList.remove('recording');
          }
        },
        false
      );
      button.title = 'Record Machina Conflict Zones';

      var container = document.createElement('div');
      container.className = 'leaflet-control-machina-record leaflet-bar';
      container.appendChild(button);
      return container;
    },
  });
  machinaTools.recordButton = new RecordSwitch();
  if (isConflictLayerEnabled()) {
    machinaTools.recordButton.addTo(window.map);
  }
}

function setupCSS() {
  $('<style>').prop('type', 'text/css').html('@include_string:machina-tools.css@').appendTo('head');
}

function setupUI() {
  setupCSS();
  setupToolBoxLinks();
  setupControlButtons();
}

var setup = function () {
  loadExternals(); // initialize turf-union and others
  setupLayers();
  setupHooks();
  setupUI();
};

/* eslint-disable */
function loadExternals () {
  try {
   '@include_raw:external/turf-union.js@';
  } catch (e) {
    console.error('loading externals failed');
    throw e;
  }
}
/* eslint-enable */
