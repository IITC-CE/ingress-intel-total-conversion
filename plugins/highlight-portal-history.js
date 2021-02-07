// @author         Johtaja
// @name           Highlight portals based on history
// @category       Highlighter
// @version        0.1.0
// @description    Use the portal fill color to denote the portal has been visited, caputured or scouted


// use own namespace for plugin
window.plugin.portalHighlighterPortalsHistory = function() {};

window.plugin.portalHighlighterPortalsHistory.visited = function(data) {

  var visited = false;
  var captured = false;
//  var scanned = false;
  var opacity = 1;
  var color = "red";

if (data.portal.options.data.history) {
    visited = (data.portal.options.data.history.visited);
    captured = (data.portal.options.data.history.captured);
//  scanned = (data.portal.options.history.data.scanned);
  }

if (visited) {debugger;};
  if (visited) {
    data.portal.setStyle(
      {fillColor: 'yellow',
       fillOpacity: opacity
      }
    );
  }
  if (captured) {
    data.portal.setStyle(
      {fillColor: 'red',
       fillOpacity: opacity
      }
    );
  }
}

window.plugin.portalHighlighterPortalsHistory.notVisited = function(data) {
  var visited = false;
  var captured = false;
//  var scanned = false;
  var opacity = 1;
  var color = "red";

if (data.portal.options.data.history) {
    visited = (data.portal.options.data.history.visited);
    captured = (data.portal.options.data.history.captured);
//  scanned = (data.portal.options.history.data.scanned);
  }

  if (visited) {
    opacity = 1;
    color = "yellow";
  }
  if (captured) {
    opacity = 0;
    color = "white";
  }
  data.portal.setStyle(
    {fillColor: color,
     fillOpacity: opacity
    }
  );
}

var setup =  function() {
  window.addPortalHighlighter('Portal visited/captured', window.plugin.portalHighlighterPortalsHistory.visited);
  window.addPortalHighlighter('Portal not visited/captured', window.plugin.portalHighlighterPortalsHistory.notVisited);
}
