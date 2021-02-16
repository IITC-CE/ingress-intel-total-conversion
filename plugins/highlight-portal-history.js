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

// Creating styles based on a given template
function inherit (parentName, childNames) {
  var styles = portalsHistory.styles;
  childNames.forEach(function (name) {
    // Extension of _styles_ with a new _name_ object, created based on _parentName_ object.
    styles[name] = L.extend(L.Util.create(styles[parentName]), styles[name]);
  });
}

var setup = function () {
  inherit('common', ['marked', 'semiMarked']);
  inherit('semiMarked', ['visited', 'captureTarget']);
  inherit('marked', ['captured', 'visitTarget', 'scoutControlled', 'scoutControllTarget']);

  window.addPortalHighlighter('History: visited/captured', portalsHistory.visited);
  window.addPortalHighlighter('History: not visited/captured', portalsHistory.notVisited);
  window.addPortalHighlighter('History: scout controlled', portalsHistory.scoutControlled);
  window.addPortalHighlighter('History: not scout controlled', portalsHistory.notScoutControlled);
};
