// @author         vita10gy
// @name           Hide portal ownership
// @category       Highlighter
// @version        0.1.2
// @description    Show all portals as neutral, as if uncaptured. Great for creating plans.

/* exported setup --eslint */
/* global TEAM_NONE, getMarkerStyleOptions*/
// use own namespace for plugin
var highlightHideOwnership = {};
window.plugin.highlightHideOwnership = highlightHideOwnership;

highlightHideOwnership.highlight = function(data) {
  var params = getMarkerStyleOptions({team: TEAM_NONE, level: 0});
  data.portal.setStyle(params);
};

function setup () {
  window.addPortalHighlighter('Hide portal ownership', highlightHideOwnership.highlight);
}
