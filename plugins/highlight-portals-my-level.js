// @author         vita10gy
// @name           Highlight portals by my level
// @category       Highlighter
// @version        0.1.2
// @description    Use the portal fill color to denote if the portal is either at and above, or at and below your level.


// use own namespace for plugin
var highlightMyLevel = {};
window.plugin.highlightMyLevel = highlightMyLevel;


highlightMyLevel.belowLevel = function(data) {
  highlightMyLevel.colorLevel(true,data);
}

highlightMyLevel.aboveLevel = function(data) {
  highlightMyLevel.colorLevel(false,data);
}

highlightMyLevel.colorLevel = function(below,data) {
  var portal_level = data.portal.options.level;

  // as portal levels can never be higher than L8, clamp the player level to this for highlight purposes
  var player_level = Math.min(PLAYER.level,8);

  var opacity = .6;
  if((below && portal_level <= player_level) ||
     (!below && portal_level >= player_level)) {
    data.portal.setStyle({fillColor: 'red', fillOpacity: opacity});
  } 
}

var setup =  function() {
  window.addPortalHighlighter('Below My Level', highlightMyLevel.belowLevel);
  window.addPortalHighlighter('Above My Level', highlightMyLevel.aboveLevel);
}
