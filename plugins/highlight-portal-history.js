// @author         Johtaja
// @name           Highlight portals based on history
// @category       Highlighter
// @version        0.2.0
// @description    Use the portal fill color to denote the portal has been visited, captured, scout controlled


// use own namespace for plugin
var portalsHistory = {};
window.plugin.portalHighlighterPortalsHistory = portalsHistory;

portalsHistory.styles = {
  common: {
    fillOpacity: 1
  },
  marked: {
    fillColor: 'red'
  },
  semiMarked: {
    fillColor: 'yellow'
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
  var styles = portalsHistory.styles;
  ['marked', 'semiMarked'].forEach(function (name) {
    styles[name] = L.extend(L.Util.create(styles.common), styles[name]);
  });
  ['visited', 'captureTarget'].forEach(function (name) {
    styles[name] = L.extend(L.Util.create(styles.semiMarked), styles[name]);
  });
  ['captured', 'visitTarget', 'scoutControlled', 'scoutControllTarget'].forEach(function (name) {
    styles[name] = L.extend(L.Util.create(styles.marked), styles[name]);
  });

  window.addPortalHighlighter('History: visited/captured', portalsHistory.visited);
  window.addPortalHighlighter('History: not visited/captured', portalsHistory.notVisited);
  window.addPortalHighlighter('History: scout controlled', portalsHistory.scoutControlled);
  window.addPortalHighlighter('History: not scout controlled', portalsHistory.notScoutControlled);
};
