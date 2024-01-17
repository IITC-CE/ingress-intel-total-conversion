/**
 * @file This file contains the code related to creating and updating portal markers on the map.
 * @module portal_marker
 */

/**
 * Calculates the scale of portal markers based on the current zoom level of the map.
 *
 * @function portalMarkerScale
 * @returns {number} The scale factor for portal markers.
 */
window.portalMarkerScale = function() {
  var zoom = map.getZoom();
  if (L.Browser.mobile)
    return zoom >= 16 ? 1.5 : zoom >= 14 ? 1.2 : zoom >= 11 ? 1.0 : zoom >= 8 ? 0.65 : 0.5;
  else
    return zoom >= 14 ? 1 : zoom >= 11 ? 0.8 : zoom >= 8 ? 0.65 : 0.5;
}

/**
 * Creates a new portal marker on the map.
 *
 * @function createMarker
 * @param {L.LatLng} latlng - The latitude and longitude where the marker will be placed.
 * @param {Object} data - The IITC-specific entity data to be stored in the marker options.
 * @returns {L.circleMarker} A Leaflet circle marker representing the portal.
 */
window.createMarker = function(latlng, data) {
  var styleOptions = window.getMarkerStyleOptions(data);

  var options = L.extend({}, data, styleOptions, { interactive: true });

  var marker = L.circleMarker(latlng, options);

  highlightPortal(marker);

  return marker;
}

/**
 * Sets the style of a portal marker, including options for when the portal is selected.
 *
 * @function setMarkerStyle
 * @param {L.circleMarker} marker - The portal marker whose style will be set.
 * @param {boolean} selected - Indicates if the portal is selected.
 */
window.setMarkerStyle = function(marker, selected) {

  var styleOptions = window.getMarkerStyleOptions(marker.options);

  marker.setStyle(styleOptions);

  // FIXME? it's inefficient to set the marker style (above), then do it again inside the highlighter
  // the highlighter API would need to be changed for this to be improved though. will it be too slow?
  highlightPortal(marker);

  if (selected) {
    marker.setStyle ({color: COLOR_SELECTED_PORTAL});
  }
}

/**
 * Determines the style options for a portal marker based on its details.
 *
 * @function getMarkerStyleOptions
 * @param {Object} details - Details of the portal, including team and level.
 * @returns {Object} Style options for the portal marker.
 */
window.getMarkerStyleOptions = function(details) {
  var scale = window.portalMarkerScale();

  //   portal level      0  1  2  3  4  5  6  7  8
  var LEVEL_TO_WEIGHT = [2, 2, 2, 2, 2, 3, 3, 4, 4];
  var LEVEL_TO_RADIUS = [7, 7, 7, 7, 8, 8, 9,10,11];

  var level = Math.floor(details.level||0);

  var lvlWeight = LEVEL_TO_WEIGHT[level] * Math.sqrt(scale);
  var lvlRadius = LEVEL_TO_RADIUS[level] * scale;

  var dashArray = null;
  // thinner and dashed outline for placeholder portals
  if (details.team != TEAM_NONE && level==0) {
    lvlWeight = 1;
    dashArray = '1,2';
  }

  var options = {
    radius: lvlRadius,
    stroke: true,
    color: COLORS[details.team],
    weight: lvlWeight,
    opacity: 1,
    fill: true,
    fillColor: COLORS[details.team],
    fillOpacity: 0.5,
    dashArray: dashArray
  };

  return options;
}

