// @author         Johtaja
// @name           Highlight portals based on history
// @category       Highlighter
// @version        0.1.1
// @description    Use the portal fill color to denote the portal has been visited, captured, scout controlled


function setStyle (data, color, opacity) {
  data.portal.setStyle({
    fillColor: color,
    fillOpacity: opacity
  });
}

function visited (data) {
  var history = data.portal.options.data.history;
  if (!history) {
    return;
  }
  if (history.captured) {
    setStyle(data, 'red', 1);
  } else if (history.visited) {
    setStyle(data, 'yellow', 1);
  }
}

function notVisited (data) {
  var history = data.portal.options.data.history;
  if (!history) {
    return;
  }
  if (!history.visited) {
    setStyle(data, 'red', 1);
  } else if (!history.captured) {
    setStyle(data, 'yellow', 1);
  }
}

function scoutControlled (data) {
  var history = data.portal.options.data.history;
  if (history && history.scoutControlled) {
    setStyle(data, 'red', 1);
  }
}

function notScoutControlled (data) {
  var history = data.portal.options.data.history;
  if (history && !history.scoutControlled) {
    setStyle(data, 'red', 1);
  }
}

// use own namespace for plugin
var portalHighlighterPortalsHistory = {
  visited: visited,
  notVisited: notVisited,
  scoutControlled: scoutControlled,
  notScoutControlled: notScoutControlled,
};

// use own namespace for plugin
window.plugin.portalHighlighterPortalsHistory = portalHighlighterPortalsHistory;

var setup = function () {
  window.addPortalHighlighter('History: visited/captured', portalHighlighterPortalsHistory.visited);
  window.addPortalHighlighter('History: not visited/captured', portalHighlighterPortalsHistory.notVisited);
  window.addPortalHighlighter('History: scout controlled', portalHighlighterPortalsHistory.scoutControlled);
  window.addPortalHighlighter('History: not scout controlled', portalHighlighterPortalsHistory.notScoutControlled);
};
