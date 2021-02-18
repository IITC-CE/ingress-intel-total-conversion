// @author         Johtaja
// @name           Portal History&Ornaments
// @category       Highlighters
// @version        0.2.0
// @description    display portal histroy as highlighters, ornaments


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

function inherit (parentName, childNames) {
  var styles = portalsHistory.styles;
  childNames.forEach(function (name) {
    styles[name] = L.extend(L.Util.create(styles[parentName]), styles[name]);
  });
}

// History Ornaments
portalsHistory.layers = {};

portalsHistory.createStatusMarker = function(latlng, data, statusColor, scaleRadius) {
  var styleOptions = window.getMarkerStyleOptions(data.data);

  styleOptions.fill = false;
  styleOptions.color = statusColor;
  styleOptions.radius *= scaleRadius;

  var options = L.extend({}, data, styleOptions, { clickable: true });

  var marker = L.circleMarker(latlng, options);

  return marker;
};

portalsHistory.onportalAdded = function(data) {
  // data = {portal: marker, previousData: previousData}
  var portaloptionsdata = data.portal.options.data;
  if (!portaloptionsdata.history) return; // skip portal placeholders without titles

  var latlng = L.latLng(portaloptionsdata.latE6/1E6, portaloptionsdata.lngE6/1E6);

  var ent = data.portal.options.ent;
  var portalLevel = portaloptionsdata.level;
  var team = portaloptionsdata.team;
//    if (team == TEAM_NONE) portalLevel = 0;

  var dataOptions = {
    level: portalLevel,
    team: team,
    guid: data.portal.options.guid,
    timestamp: data.portal.options.data.timestamp, // ent[1] ??
    data: portaloptionsdata
  };

  //if (map.getBounds().contains(latlng)) console.log(portaloptionsdata.title,dataOptions);

  var colorV = "";
  var colorNV = "red";

  if (portaloptionsdata.history.visited) {
    colorV = "yellow";
    colorNV = "yellow";
  };
  if (portaloptionsdata.history.captured) {
    colorV = "red";
    colorNV = "";
  };

  if (colorV !== "") {
    var markerV = portalsHistory.createStatusMarker(
      latlng,
      { guid: data.portal.options.guid, data: dataOptions },
      colorV,
      1.3);
    portalsHistory.layers.normVisited.addLayer(markerV);
  }

  if (colorNV !== "") {
    var markerNV = portalsHistory.createStatusMarker(
      latlng,
      { guid: data.portal.options.guid, data: dataOptions },
      colorNV,
      1.3);
    portalsHistory.layers.revVisited.addLayer(markerNV);
  }
  if (portaloptionsdata.history.scoutControlled) {
    var marker = portalsHistory.createStatusMarker(
      latlng,
      { guid: data.portal.options.guid, data: dataOptions },
      'violet',
      1.4);
    portalsHistory.layers.normScoutControlled.addLayer(marker);
  }

  if (!portaloptionsdata.history.scoutControlled) {
    var marker = portalsHistory.createStatusMarker(
      latlng,
      { guid: data.portal.options.guid, data: dataOptions },
      'violet',
      1.4);
    portalsHistory.layers.revScoutControlled.addLayer(marker);
  }
};

/*
portalsHistory.onportalRemoved = function(data) {
  // data = {portal: p, data: p.options.data }

  portalsHistory.layers.visited.removeLayer(data.p);
  portalsHistory.layers.captured.removeLayer(data.p);
  portalsHistory.layers.scoutControlled.removeLayer(data.p);

};
*/

portalsHistory.setupLayers = function() {
  portalsHistory.layers.normVisited = new L.LayerGroup();
  portalsHistory.layers.revVisited = new L.LayerGroup();
  portalsHistory.layers.normScoutControlled = new L.LayerGroup();
  portalsHistory.layers.revScoutControlled = new L.LayerGroup();

  portalsHistory.layers.visited = portalsHistory.layers.normVisited;
  portalsHistory.layers.scoutControlled = portalsHistory.layers.normScoutControlled;

  window.addLayerGroup('Visited/Captured', portalsHistory.layers.visited, false);
  window.addLayerGroup('Scout controlled', portalsHistory.layers.scoutControlled, false);

  window.addHook('portalAdded', portalsHistory.onportalAdded);
//  window.addHook('portalRemoved', portalsHistory.onportalRemoved);
};

//------------------------------------------------------------------------------------------
// Toggle Switch

portalsHistory.makeButton = function() {
  $('.leaflet-top.leaflet-left')
    .append('<div class="leaflet-control leaflet-bar" id="toggleHistoryButton">'
      +'<a onclick="window.plugin.portalHighlighterPortalsHistory.toggleHistory(true); return false;"'
      +' id="toggleHistory" class="normHistory" title="History toggle"></a></div>');
};

portalsHistory.toggleHistory = function(keepUIbutton) {
  var button = $('#toggleHistory');

  var buttonPos = $('#toggleHistoryButton').position();
  var top = buttonPos.top;
  var left = buttonPos.left;
  var fixedStyle = {
    position: 'fixed',
    top: top,
    left: left
  };

  $('#toggleHistoryButton').css(fixedStyle);

  // are the layers active?
  var visitedLayerActive = window.map.hasLayer (portalsHistory.layers.visited);
  var scoutControlledLayerActive = window.map.hasLayer(portalsHistory.layers.scoutControlled);
  // remove layers
  window.removeLayerGroup(portalsHistory.layers.visited);
  window.removeLayerGroup(portalsHistory.layers.scoutControlled);

  if (button.hasClass('normHistory')) {
    $('#toggleHistoryButton').css({'position':'fixed'});
    button.removeClass('normHistory');
    button.addClass('revHistory');
    //switch layers
    portalsHistory.layers.visited =
      portalsHistory.layers.revVisited;
    portalsHistory.layers.scoutControlled =
      portalsHistory.layers.revScoutControlled;
  } else {
    $('#toggleHistoryButton').css({'position':'static'});
    button.addClass('normHistory');
    button.removeClass('revHistory');
    //switch layers
    portalsHistory.layers.visited =
      portalsHistory.layers.normVisited;
    portalsHistory.layers.scoutControlled =
      portalsHistory.layers.normScoutControlled;
  }
  // reactivate previous active layers
  window.addLayerGroup('Visited/Captured', portalsHistory.layers.visited, visitedLayerActive);
  window.addLayerGroup('Scout Controlled', portalsHistory.layers.scoutControlled, scoutControlledLayerActive);
};

// -----------------------------------------------------------------------------------------
var setup = function () {
  inherit('common', ['marked', 'semiMarked']);
  inherit('semiMarked', ['visited', 'captureTarget']);
  inherit('marked', ['captured', 'visitTarget', 'scoutControlled', 'scoutControllTarget']);
  inherit('commonOther', ['otherVC', 'otherNotVC', 'otherScout', 'otherNotScout']);

  window.addPortalHighlighter('History: visited/captured', portalsHistory.visited);
  window.addPortalHighlighter('History: not visited/captured', portalsHistory.notVisited);
  window.addPortalHighlighter('History: scout controlled', portalsHistory.scoutControlled);
  window.addPortalHighlighter('History: not scout controlled', portalsHistory.notScoutControlled);

  portalsHistory.setupLayers();

  var checkedCircle = '<svg class="tracker-eye" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"> <path d="M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm0 48c110.532 0 200 89.451 200 200 0 110.532-89.451 200-200 200-110.532 0-200-89.451-200-200 0-110.532 89.451-200 200-200m140.204 130.267l-22.536-22.718c-4.667-4.705-12.265-4.736-16.97-.068L215.346 303.697l-59.792-60.277c-4.667-4.705-12.265-4.736-16.97-.069l-22.719 22.536c-4.705 4.667-4.736 12.265-.068 16.971l90.781 91.516c4.667 4.705 12.265 4.736 16.97.068l172.589-171.204c4.704-4.668 4.734-12.266.067-16.971z"/></svg>';
  var emptyCircle =  '<svg class="tracker-eye" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"> <path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm0 448c-110.5 0-200-89.5-200-200S145.5 56 256 56s200 89.5 200 200-89.5 200-200 200z"/></svg>';

  var style = `
  <style>
    #toggleHistory {
      background-size: 90% 90%;
      background-position: center;
    }

    #toggleHistory.normHistory {
      background-image: url('data:image/svg+xml;charset=UTF8,`+checkedCircle+`');
    }

    #toggleHistory.revHistory {
      background-image: url('data:image/svg+xml;charset=UTF8,`+emptyCircle+`');
    }
  </style>
  `;
  $('head').append(style);
portalsHistory.makeButton();
}

