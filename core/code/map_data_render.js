/* global IITC, L, log -- eslint */

/**
 * Manages rendering of map data (portals, links, fields) into Leaflet.
 * @class Render
 */
window.Render = function () {
  this.portalMarkerScale = undefined;
};

/**
 * Initiates a render pass. It's called at the start of making a batch of data requests to the servers.
 *
 * @function
 * @memberof Render
 * @param {L.LatLngBounds} bounds - The bounds within which the render pass will occur.
 */
window.Render.prototype.startRenderPass = function (bounds) {
  this.deletedGuid = {}; // object - represents the set of all deleted game entity GUIDs seen in a render pass

  this.seenPortalsGuid = {};
  this.seenLinksGuid = {};
  this.seenFieldsGuid = {};

  // we pad the bounds used for clearing a litle bit, as entities are sometimes returned outside of their specified tile boundaries
  // this will just avoid a few entity removals at start of render when they'll just be added again
  var paddedBounds = bounds.pad(0.1);

  this.clearPortalsOutsideBounds(paddedBounds);

  this.clearLinksOutsideBounds(paddedBounds);
  this.clearFieldsOutsideBounds(paddedBounds);

  this.rescalePortalMarkers();
};

/**
 * Clears portals outside the specified bounds.
 *
 * @function
 * @memberof Render
 * @param {L.LatLngBounds} bounds - The bounds to check against.
 */
window.Render.prototype.clearPortalsOutsideBounds = function (bounds) {
  for (var guid in window.portals) {
    var p = window.portals[guid];
    // clear portals outside visible bounds - unless it's the selected portal, or it's relevant to artifacts
    if (!bounds.contains(p.getLatLng()) && guid !== window.selectedPortal && !window.artifact.isInterestingPortal(guid)) {
      this.deletePortalEntity(guid);
    }
  }
};

/**
 * Clears links that are outside the specified bounds.
 *
 * @function
 * @memberof Render
 * @param {L.LatLngBounds} bounds - The bounds to check against for link removal.
 */
window.Render.prototype.clearLinksOutsideBounds = function (bounds) {
  for (var guid in window.links) {
    var l = window.links[guid];

    // NOTE: our geodesic lines can have lots of intermediate points. the bounds calculation hasn't been optimised for this
    // so can be particularly slow. a simple bounds check based on start+end point will be good enough for this check
    var lls = l.getLatLngs();
    var linkBounds = L.latLngBounds(lls);

    if (!bounds.intersects(linkBounds)) {
      this.deleteLinkEntity(guid);
    }
  }
};

/**
 * Clears fields that are outside the specified bounds.
 *
 * @function
 * @memberof Render
 * @param {L.LatLngBounds} bounds - The bounds to check against for field removal.
 */
window.Render.prototype.clearFieldsOutsideBounds = function (bounds) {
  for (var guid in window.fields) {
    var f = window.fields[guid];

    // NOTE: our geodesic polys can have lots of intermediate points. the bounds calculation hasn't been optimised for this
    // so can be particularly slow. a simple bounds check based on corner points will be good enough for this check
    var lls = f.getLatLngs();
    var fieldBounds = L.latLngBounds([lls[0], lls[1]]).extend(lls[2]);

    if (!bounds.intersects(fieldBounds)) {
      this.deleteFieldEntity(guid);
    }
  }
};

/**
 * Processes tile data including deleted entity GUIDs and game entities.
 *
 * @function
 * @memberof Render
 * @param {Object} tiledata - Data for a specific map tile.
 */
window.Render.prototype.processTileData = function (tiledata) {
  this.processDeletedGameEntityGuids(tiledata.deletedGameEntityGuids || []);
  this.processGameEntities(tiledata.gameEntities || []);
};

/**
 * Processes deleted game entity GUIDs and removes them from the map.
 *
 * @function
 * @memberof Render
 * @param {Array} deleted - Array of deleted game entity GUIDs.
 */
window.Render.prototype.processDeletedGameEntityGuids = function (deleted) {
  for (var i in deleted) {
    var guid = deleted[i];

    if (!(guid in this.deletedGuid)) {
      this.deletedGuid[guid] = true; // flag this guid as having being processed

      if (guid === window.selectedPortal) {
        // the rare case of the selected portal being deleted. clear the details tab and deselect it
        window.renderPortalDetails(null);
      }

      this.deleteEntity(guid);
    }
  }
};

/**
 * Processes game entities (fields, links, portals) and creates them on the map.
 *
 * @function
 * @memberof Render
 * @param {Array} entities - Array of game entities.
 * @param {string} details - Details for the {@link window.decodeArray.portal} function.
 */
window.Render.prototype.processGameEntities = function (entities, details) {
  // details expected in decodeArray.portal

  // we loop through the entities three times - for fields, links and portals separately
  // this is a reasonably efficient work-around for leafletjs limitations on svg render order

  for (const i in entities) {
    const ent = entities[i];
    if (ent[2][0] === 'r' && !(ent[0] in this.deletedGuid)) {
      this.createFieldEntity(ent);
    }
  }

  for (const i in entities) {
    const ent = entities[i];

    if (ent[2][0] === 'e' && !(ent[0] in this.deletedGuid)) {
      this.createLinkEntity(ent);
    }
  }

  for (const i in entities) {
    const ent = entities[i];

    if (ent[2][0] === 'p' && !(ent[0] in this.deletedGuid)) {
      this.createPortalEntity(ent, details);
    }
  }
};

/**
 * Ends a render pass. This includes cleanup and processing of any remaining data.
 * Called when the render is considered complete.
 *
 * @function
 * @memberof Render
 */
window.Render.prototype.endRenderPass = function () {
  var countp = 0,
    countl = 0,
    countf = 0;

  // check to see if there are any entities we haven't seen. if so, delete them
  for (const guid in window.portals) {
    // special case for selected portal - it's kept even if not seen
    // artifact (e.g. jarvis shard) portals are also kept - but they're always 'seen'
    if (!(guid in this.seenPortalsGuid) && guid !== window.selectedPortal) {
      this.deletePortalEntity(guid);
      countp++;
    }
  }
  for (const guid in window.links) {
    if (!(guid in this.seenLinksGuid)) {
      this.deleteLinkEntity(guid);
      countl++;
    }
  }
  for (const guid in window.fields) {
    if (!(guid in this.seenFieldsGuid)) {
      this.deleteFieldEntity(guid);
      countf++;
    }
  }

  log.log('Render: end cleanup: removed ' + countp + ' portals, ' + countl + ' links, ' + countf + ' fields');

  // reorder portals to be after links/fields
  this.bringPortalsToFront();

  this.isRendering = false;
};

/**
 * Brings portal markers to the front of the map view, ensuring they are rendered above links and fields.
 *
 * @function
 * @memberof Render
 */
window.Render.prototype.bringPortalsToFront = function () {
  for (var guid in window.portals) {
    window.portals[guid].bringToFront();
  }

  // artifact portals are always brought to the front, above all others
  $.each(window.artifact.getInterestingPortals(), function (i, guid) {
    if (window.portals[guid] && window.portals[guid]._map) {
      window.portals[guid].bringToFront();
    }
  });
};

/**
 * Deletes an entity (portal, link, or field) from the map based on its GUID.
 *
 * @function
 * @memberof Render
 * @param {string} guid - The globally unique identifier of the entity to delete.
 */
window.Render.prototype.deleteEntity = function (guid) {
  this.deletePortalEntity(guid);
  this.deleteLinkEntity(guid);
  this.deleteFieldEntity(guid);
};

/**
 * Deletes a portal entity from the map based on its GUID.
 *
 * @function
 * @memberof Render
 * @param {string} guid - The globally unique identifier of the portal to delete.
 */
window.Render.prototype.deletePortalEntity = function (guid) {
  if (guid in window.portals) {
    var p = window.portals[guid];
    window.ornaments.removePortal(p);
    this.removePortalFromMapLayer(p);
    delete window.portals[guid];
    window.runHooks('portalRemoved', { portal: p, data: p.options.data });
  }
};

/**
 * Deletes a link entity from the map based on its GUID.
 *
 * @function
 * @memberof Render
 * @param {string} guid - The globally unique identifier of the link to delete.
 */
window.Render.prototype.deleteLinkEntity = function (guid) {
  if (guid in window.links) {
    var l = window.links[guid];
    l.remove();
    delete window.links[guid];
    window.runHooks('linkRemoved', { link: l, data: l.options.data });
  }
};

/**
 * Deletes a field entity from the map based on its GUID.
 *
 * @function
 * @memberof Render
 * @param {string} guid - The globally unique identifier of the field to delete.
 */
window.Render.prototype.deleteFieldEntity = function (guid) {
  if (guid in window.fields) {
    var f = window.fields[guid];
    f.remove();
    delete window.fields[guid];
    window.runHooks('fieldRemoved', { field: f, data: f.options.data });
  }
};

/**
 * Creates a placeholder portal entity. This is used when the portal is not fully loaded,
 * but its existence is known from links/fields.
 *
 * @function
 * @memberof Render
 * @param {string} guid - The globally unique identifier of the portal.
 * @param {number} latE6 - The latitude of the portal in E6 format.
 * @param {number} lngE6 - The longitude of the portal in E6 format.
 * @param {string} team - The team faction of the portal.
 * @param {number} [timestamp=0] - Timestamp of the portal data. Defaults to 0 to allow newer data sources to override
 * @param {number} [timestamp] - The timestamp of the portal data.
 */
window.Render.prototype.createPlaceholderPortalEntity = function (guid, latE6, lngE6, team, timestamp) {
  // intel no longer returns portals at anything but the closest zoom
  // stock intel creates 'placeholder' portals from the data in links/fields - IITC needs to do the same
  // we only have the portal guid, lat/lng coords, and the faction - no other data
  // having the guid, at least, allows the portal details to be loaded once it's selected. however,
  // no highlighters, portal level numbers, portal names, useful counts of portals, etc are possible

  // zero will mean any other source of portal data will have a higher timestamp
  timestamp = timestamp || 0;

  var ent = [
    guid, // ent[0] = guid
    timestamp, // ent[1] = timestamp
    // ent[2] = an array with the entity data
    [
      'p', // 0 - a portal
      team, // 1 - team
      latE6, // 2 - lat
      lngE6, // 3 - lng
    ],
  ];

  this.createPortalEntity(ent, 'core'); // placeholder
}

/**
 * Creates a portal entity from the provided game entity data.
 * If the portal already exists and the new data is more recent, it replaces the existing data.
 *
 * @function
 * @memberof Render
 * @param {Array} ent - An array representing the game entity.
 * @param {string} details - Detail level expected in {@link window.decodeArray.portal} (e.g., 'core', 'summary').
 */
window.Render.prototype.createPortalEntity = function (ent, details) {
  this.seenPortalsGuid[ent[0]] = true; // flag we've seen it

  var previousData = undefined;

  var data = window.decodeArray.portal(ent[2], details);
  var guid = ent[0];

  // add missing fields
  data.guid = guid;
  if (!data.timestamp)
    data.timestamp = ent[1];

  // LEGACY - TO BE REMOVED AT SOME POINT! use .guid, .timestamp and .data instead
  data.ent = ent;

  // check if entity already exists
  const oldPortal = guid in window.portals;

  if (oldPortal) {
    // yes. now check to see if the entity data we have is newer than that in place
    var p = window.portals[guid];

    if (!p.willUpdate(data)) {
      // this data doesn't bring new detail - abort processing
      return p;
    }

    // the data we have is newer. many data changes require re-rendering of the portal
    // (e.g. level changed, so size is different, or stats changed so highlighter is different)

    // remember the old details, for the callback
    previousData = $.extend(true, {}, p.getDetails());
  }

  var latlng = L.latLng(data.latE6 / 1e6, data.lngE6 / 1e6);

  window.pushPortalGuidPositionCache(data.guid, data.latE6, data.lngE6);

  // check for URL links to portal, and select it if this is the one
  if (window.urlPortalLL && window.urlPortalLL[0] === latlng.lat && window.urlPortalLL[1] === latlng.lng) {
    // URL-passed portal found via pll parameter - set the guid-based parameter
    log.log('urlPortalLL ' + window.urlPortalLL[0] + ',' + urlPortalLL[1] + ' matches portal GUID ' + data.guid);

    window.urlPortal = data.guid;
    window.urlPortalLL = undefined; // clear the URL parameter so it's not matched again
  }
  if (window.urlPortal === data.guid) {
    // URL-passed portal found via guid parameter - set it as the selected portal
    log.log('urlPortal GUID ' + urlPortal + ' found - selecting...');
    window.selectedPortal = data.guid;
    window.urlPortal = undefined; // clear the URL parameter so it's not matched again
  }

  let marker = undefined;
  if (oldPortal) {
    // update marker style/highlight and layer
    marker = window.portals[data.guid];
    // remove portal from its faction/level specific layer
    this.removePortalFromMapLayer(marker);

    marker.updateDetails(data);

    window.runHooks('portalAdded', {portal: marker, previousData: previousData});
  } else {
    marker = createMarker(latlng, data);

    // in case of incomplete data while having fresh details in cache, update the portal with those details
    if (portalDetail.isFresh(guid)) {
      var oldDetails = portalDetail.get(guid);
      if (data.timestamp > oldDetails.timestamp) {
        // data is more recent than the cached details so we remove them from the cache
        portalDetail.remove(guid);
      } else if (marker.willUpdate(oldDetails))
        marker.updateDetails(oldDetails);
    }

    window.runHooks('portalAdded', { portal: marker });

    window.portals[data.guid] = marker;

    if (selectedPortal === data.guid)
      marker.renderDetails();
  }

  window.ornaments.addPortal(marker);

  // TODO? postpone adding to the map layer
  this.addPortalToMapLayer(marker);

  return marker;
};

/**
 * Creates a field entity from the provided game entity data.
 *
 * @function
 * @memberof Render
 * @param {Array} ent - An array representing the game entity.
 */
window.Render.prototype.createFieldEntity = function (ent) {
  this.seenFieldsGuid[ent[0]] = true; // flag we've seen it

  var data = {
    // type: ent[2][0],
    timestamp: ent[1],
    team: ent[2][1],
    points: ent[2][2].map(function (arr) {
      return { guid: arr[0], latE6: arr[1], lngE6: arr[2] };
    }),
  };

  // create placeholder portals for field corners. we already do links, but there are the odd case where this is useful
  for (var i = 0; i < 3; i++) {
    var p = data.points[i];
    this.createPlaceholderPortalEntity(p.guid, p.latE6, p.lngE6, data.team, data.timestamp);
  }

  // check if entity already exists
  if (ent[0] in window.fields) {
    // yes. in theory, we should never get updated data for an existing field. they're created, and they're destroyed - never changed
    // but theory and practice may not be the same thing...
    var f = window.fields[ent[0]];

    if (f.options.timestamp >= ent[1]) return; // this data is identical (or order) than that rendered - abort processing

    // the data we have is newer - two options
    // 1. just update the data, assume the field render appearance is unmodified
    // 2. delete the entity, then re-create with the new data
    this.deleteFieldEntity(ent[0]); // option 2, for now
  }

  var team = window.teamStringToId(ent[2][1]);
  var latlngs = [
    L.latLng(data.points[0].latE6 / 1e6, data.points[0].lngE6 / 1e6),
    L.latLng(data.points[1].latE6 / 1e6, data.points[1].lngE6 / 1e6),
    L.latLng(data.points[2].latE6 / 1e6, data.points[2].lngE6 / 1e6),
  ];

  var poly = L.geodesicPolygon(latlngs, {
    fillColor: window.COLORS[team],
    fillOpacity: 0.25,
    stroke: false,
    interactive: false,

    team: team,
    ent: ent, // LEGACY - TO BE REMOVED AT SOME POINT! use .guid, .timestamp and .data instead
    guid: ent[0],
    timestamp: data.timestamp,
    data: data,
  });

  window.runHooks('fieldAdded', { field: poly });

  window.fields[ent[0]] = poly;

  // TODO? postpone adding to the layer??
  if (!IITC.filters.filterField(poly)) poly.addTo(window.map);
};

/**
 * Creates a link entity from the provided game entity data.
 *
 * @function
 * @memberof Render
 * @param {Array} ent - An array representing the game entity.
 */
window.Render.prototype.createLinkEntity = function (ent) {
  // Niantic have been faking link entities, based on data from fields
  // these faked links are sent along with the real portal links, causing duplicates
  // the faked ones all have longer GUIDs, based on the field GUID (with _ab, _ac, _bc appended)
  var fakedLink = new RegExp('^[0-9a-f]{32}.b_[ab][bc]$'); // field GUIDs always end with ".b" - faked links append the edge identifier
  if (fakedLink.test(ent[0])) return;

  this.seenLinksGuid[ent[0]] = true; // flag we've seen it

  var data = {
    // TODO add other properties and check correction direction
    //    type:   ent[2][0],
    timestamp: ent[1],
    team: ent[2][1],
    oGuid: ent[2][2],
    oLatE6: ent[2][3],
    oLngE6: ent[2][4],
    dGuid: ent[2][5],
    dLatE6: ent[2][6],
    dLngE6: ent[2][7],
  };

  // create placeholder entities for link start and end points (before checking if the link itself already exists
  this.createPlaceholderPortalEntity(data.oGuid, data.oLatE6, data.oLngE6, data.team, data.timestamp);
  this.createPlaceholderPortalEntity(data.dGuid, data.dLatE6, data.dLngE6, data.team, data.timestamp);

  // check if entity already exists
  if (ent[0] in window.links) {
    var l = window.links[ent[0]];
    if (l.options.timestamp >= ent[1]) return; // this data is older or identical to the rendered data - abort processing

    // the data is newer/better - two options
    // 1. just update the data. assume the link render appearance is unmodified
    // 2. delete the entity, then re-create it with the new data
    this.deleteLinkEntity(ent[0]); // option 2 - for now
  }

  var team = window.teamStringToId(ent[2][1]);
  var latlngs = [L.latLng(data.oLatE6 / 1e6, data.oLngE6 / 1e6), L.latLng(data.dLatE6 / 1e6, data.dLngE6 / 1e6)];
  var poly = L.geodesicPolyline(latlngs, {
    color: window.COLORS[team],
    opacity: 1,
    weight: 2,
    interactive: false,

    team: team,
    ent: ent, // LEGACY - TO BE REMOVED AT SOME POINT! use .guid, .timestamp and .data instead
    guid: ent[0],
    timestamp: ent[1],
    data: data,
  });

  window.runHooks('linkAdded', { link: poly });

  window.links[ent[0]] = poly;

  if (!IITC.filters.filterLink(poly)) poly.addTo(window.map);
};

/**
 * Rescales portal markers based on the current map zoom level.
 *
 * @function
 * @memberof Render
 */
window.Render.prototype.rescalePortalMarkers = function () {
  if (this.portalMarkerScale === undefined || this.portalMarkerScale !== window.portalMarkerScale()) {
    this.portalMarkerScale = window.portalMarkerScale();

    log.log('Render: map zoom ' + window.map.getZoom() + ' changes portal scale to ' + window.portalMarkerScale() + ' - redrawing all portals');

    // NOTE: we're not calling this because it resets highlights - we're calling it as it
    // resets the style (inc size) of all portal markers, applying the new scale
    window.resetHighlightedPortals();
  }
};

/**
 * Adds a portal to the visible map layer.
 *
 * @function
 * @memberof Render
 * @param {Object} portal - The portal object to add to the map layer.
 */
window.Render.prototype.addPortalToMapLayer = function (portal) {
  if (!IITC.filters.filterPortal(portal)) portal.addTo(window.map);
};

/**
 * Removes a portal from the visible map layer.
 *
 * @function
 * @memberof Render
 * @param {Object} portal - The portal object to remove from the map layer.
 */
window.Render.prototype.removePortalFromMapLayer = function (portal) {
  // remove it from the portalsLevels layer
  portal.remove();
};
