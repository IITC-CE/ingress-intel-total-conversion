// @author         Johtaja
// @name           Highlight portals based on history
// @category       Highlighter
// @version        0.3.0
// @description    Use the portal fill color to denote the portal has been visited, captured, scout controlled

/* exported setup --eslint */
/* global L */
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
  },
  commonOther: {
    // no action by default
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
  var s = portalsHistory.styles;
  if (history.captured) {
    data.portal.setStyle(s.captured);
  } else if (history.visited) {
    data.portal.setStyle(s.visited);
  } else if (!$.isEmptyObject(s.otherVC)) {
    data.portal.setStyle(s.otherVC);
  }
};

portalsHistory.notVisited = function (data) {
  var history = data.portal.options.data.history;
  if (!history) {
    return;
  }
  var s = portalsHistory.styles;
  if (!history.visited) {
    data.portal.setStyle(s.visitTarget);
  } else if (!history.captured) {
    data.portal.setStyle(s.captureTarget);
  } else if (!$.isEmptyObject(s.otherNotVC)) {
    data.portal.setStyle(s.otherNotVC);
  }
};

portalsHistory.scoutControlled = function (data) {
  var history = data.portal.options.data.history;
  if (!history) {
    return;
  }
  var s = portalsHistory.styles;
  if (history.scoutControlled) {
    data.portal.setStyle(s.scoutControlled);
  } else if (!$.isEmptyObject(s.otherScout)) {
    data.portal.setStyle(s.otherScout);
  }
};

portalsHistory.notScoutControlled = function (data) {
  var history = data.portal.options.data.history;
  if (!history) {
    return;
  }
  var s = portalsHistory.styles;
  if (!history.scoutControlled) {
    data.portal.setStyle(s.scoutControllTarget);
  } else if (!$.isEmptyObject(s.otherNotScout)) {
    data.portal.setStyle(s.otherNotScout);
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

function setup () {
  inherit('common', ['marked', 'semiMarked']);
  inherit('semiMarked', ['visited', 'captureTarget']);
  inherit('marked', ['captured', 'visitTarget', 'scoutControlled', 'scoutControllTarget']);
  inherit('commonOther', ['otherVC', 'otherNotVC', 'otherScout', 'otherNotScout']);

  window.addPortalHighlighter('History: visited/captured', portalsHistory.visited);
  window.addPortalHighlighter('History: not visited/captured', portalsHistory.notVisited);
  window.addPortalHighlighter('History: scout controlled', portalsHistory.scoutControlled);
  window.addPortalHighlighter('History: not scout controlled', portalsHistory.notScoutControlled);
}
