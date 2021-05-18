// @author         vita10gy
// @name           Hide portal ownership
// @category       Highlighter
// @version        0.2.0
// @description    Show all portals as neutral, as if uncaptured. Great for creating plans.

/* exported setup --eslint */
/* global TEAM_NONE, getMarkerStyleOptions*/

function hideOwnership (data) {
  var params = getMarkerStyleOptions({team: TEAM_NONE, level: 0});
  data.portal.setStyle(params);
}

function setup () {
  window.addPortalHighlighter('Hide portal ownership', hideOwnership);
}
