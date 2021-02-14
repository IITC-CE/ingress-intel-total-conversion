// @author         Johtaja
// @name           Highlight portals based on history
// @category       Highlighter
// @version        0.2.0
// @description    Use the portal fill color to denote the portal has been visited, captured, scout controlled


// use own namespace for plugin
var portalsHistory = {};
window.plugin.portalHighlighterPortalsHistory = portalsHistory;

portalsHistory.styles = {
  marked: {
    fillColor: 'red',
    fillOpacity: 1
  },
  semiMarked: {
    fillColor: 'yellow',
    fillOpacity: 1
  }
};

portalsHistory.setStyle = function (data, name) {
  data.portal.setStyle(portalsHistory.styles[name]);
};

portalsHistory.visited = function (data) {
  var history = data.portal.options.data.history;
  if (!history) {
    return;
  }
  if (history.captured) {
    data.portal.setStyle(portalsHistory.styles.captured);
  } else if (history.visited) {
    data.portal.setStyle(portalsHistory.styles.visited);
  }
};

portalsHistory.notVisited = function (data) {
  var history = data.portal.options.data.history;
  if (!history) {
    return;
  }
  if (!history.visited) {
    data.portal.setStyle(portalsHistory.styles.visitTarget);
  } else if (!history.captured) {
    data.portal.setStyle(portalsHistory.styles.captureTarget);
  }
};

portalsHistory.scoutControlled = function (data) {
  var history = data.portal.options.data.history;
  if (history && history.scoutControlled) {
    data.portal.setStyle(portalsHistory.styles.scoutControlled);
  }
};

portalsHistory.notScoutControlled = function (data) {
  var history = data.portal.options.data.history;
  if (history && !history.scoutControlled) {
    data.portal.setStyle(portalsHistory.styles.scoutControllTarget);
  }
};

var setup = function () {
  ['visited', 'captureTarget'].forEach(function (name) {
    portalsHistory.styles[name] = portalsHistory.styles.semiMarked;
  });
  ['captured', 'visitTarget', 'scoutControlled', 'scoutControllTarget'].forEach(function (name) {
    portalsHistory.styles[name] = portalsHistory.styles.marked;
  });

  window.addPortalHighlighter('History: visited/captured', portalsHistory.visited);
  window.addPortalHighlighter('History: not visited/captured', portalsHistory.notVisited);
  window.addPortalHighlighter('History: scout controlled', portalsHistory.scoutControlled);
  window.addPortalHighlighter('History: not scout controlled', portalsHistory.notScoutControlled);
};
