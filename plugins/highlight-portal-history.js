// @author         Johtaja
// @name           Highlight portals based on history
// @category       Highlighter
// @version        0.1.0
// @description    Use the portal fill color to denote the portal has been visited, caputured or scouted


// use own namespace for plugin
window.plugin.portalHighlighterPortalsHistory = function() {};

window.plugin.portalHighlighterPortalsHistory.visited = function(data) {
  var visited = (data.portal.options.ent[2][18] & 3);
  if (visited !== undefined) {
    if (visited === 1) {
      var opacity = .6;
      data.portal.setStyle(
        {fillColor: 'yellow' 
        }
      );
    }
    if (visited === 2 || visited ===3) {
      var opacity = .6;
      data.portal.setStyle(
        {fillColor: 'red' 
        }
      );
    }  
  }
}

var setup =  function() {
  window.addPortalHighlighter('Portal visited', window.plugin.portalHighlighterPortalsHistory.visited);
}
