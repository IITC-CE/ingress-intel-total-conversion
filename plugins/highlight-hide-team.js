// @author         vita10gy
// @name           Hide portal ownership
// @category       Highlighter
// @version        0.1.1
// @description    Show all portals as neutral, as if uncaptured. Great for creating plans.


// use own namespace for plugin
var highlightHideOwnership ={};
window.plugin.highlightHideOwnership = highlightHideOwnership;

highlightHideOwnership.highlight = function(data) {
  var scale = window.portalMarkerScale();

  var params = getMarkerStyleOptions({team: TEAM_NONE, level: 0});
  data.portal.setStyle(params);
}

var setup =  function() {
  window.addPortalHighlighter('Hide portal ownership', highlightHideOwnership.highlight);
}
