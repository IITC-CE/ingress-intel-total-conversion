// @author         Johtaja
// @name           Highlight portals based on history
// @category       Highlighter
// @version        0.1.0
// @description    Use the portal fill color to denote the portal has been visited, captured, scout controlled


function setStyle (data, color, opacity) {
  data.portal.setStyle({
    fillColor: color,
    fillOpacity: opacity
  });
}

function visited (data) {
  var history = data.portal.options.data.history;
  if (!history || !(history.visited || !history.captured)) {
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
  if (!history || history.visited || history.captured) {
    return;
  }

  if (history.captured) {
    setStyle(data, 'white', 0);
  } else if (history.visited) {
    setStyle(data, 'yellow', 1);
  }
}

function scoutControlled (data) {
  var history = data.portal.options.data.history;
  if (!history || !history.scoutControlled) {
    return;
  }

  setStyle(data, 'red', 1);
}

function notScoutControlled (data) {
  var history = data.portal.options.data.history;
  if (!history || history.scoutControlled) {
    return;
  }

  setStyle(data, 'white', 0);
}

// use own namespace for plugin
window.plugin.portalHighlighterPortalsHistory = {
  visited: visited,
  notVisited: notVisited,
  scoutControlled: scoutControlled,
  notScoutControlled: notScoutControlled,
};

var setup = function () {
  window.addPortalHighlighter('History: visited/captured', window.plugin.portalHighlighterPortalsHistory.visited);
  window.addPortalHighlighter('History: not visited/captured', window.plugin.portalHighlighterPortalsHistory.notVisited);
  window.addPortalHighlighter('History: scout controlled', window.plugin.portalHighlighterPortalsHistory.scoutControlled);
  window.addPortalHighlighter('History: not scout controlled', window.plugin.portalHighlighterPortalsHistory.notScoutControlled);
}
