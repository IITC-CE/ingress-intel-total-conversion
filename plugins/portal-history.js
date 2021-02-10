// @author         Johtaja
// @name           portal-history
// @category       Info
// @version        0.1.0
// @description    display portal histroy as highlighters, ornaments and in portal-list (if installed)


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
window.plugin.portalHistory = function() {};

// History Highlighters
window.plugin.portalHistory = {
  visited: visited,
  notVisited: notVisited,
  scoutControlled: scoutControlled,
  notScoutControlled: notScoutControlled,
};

// History Ornaments
window.plugin.portalHistory.layers = {};

window.plugin.portalHistory.createStatusMarker = function(latlng, data, statusColor, scaleRadius) {
  var styleOptions = window.getMarkerStyleOptions(data.data);

  styleOptions.fill = false;
  styleOptions.color = statusColor;
  styleOptions.radius *= scaleRadius;

  var options = L.extend({}, data, styleOptions, { clickable: true });

  var marker = L.circleMarker(latlng, options);

  return marker;
};

window.plugin.portalHistory.onportalAdded = function(data) {
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
    var markerV = window.plugin.portalHistory.createStatusMarker(
      latlng,
      { guid: data.portal.options.guid, data: dataOptions },
      colorV,
      1.3);
    window.plugin.portalHistory.layers.normVisited.addLayer(markerV);
  }

  if (colorNV !== "") {
    var markerNV = window.plugin.portalHistory.createStatusMarker(
      latlng,
      { guid: data.portal.options.guid, data: dataOptions },
      colorNV,
      1.3);
    window.plugin.portalHistory.layers.revVisited.addLayer(markerNV);
  }
  if (portaloptionsdata.history.scoutControlled) {
    var marker = window.plugin.portalHistory.createStatusMarker(
      latlng,
      { guid: data.portal.options.guid, data: dataOptions },
      'violet',
      1.4);
    window.plugin.portalHistory.layers.normScoutControlled.addLayer(marker);
  }

  if (!portaloptionsdata.history.scoutControlled) {
    var marker = window.plugin.portalHistory.createStatusMarker(
      latlng,
      { guid: data.portal.options.guid, data: dataOptions },
      'violet',
      1.4);
    window.plugin.portalHistory.layers.revScoutControlled.addLayer(marker);
  }
};

/*
window.plugin.portalHistory.onportalRemoved = function(data) {
  // data = {portal: p, data: p.options.data }

  window.plugin.portalHistory.layers.visited.removeLayer(data.p);
  window.plugin.portalHistory.layers.captured.removeLayer(data.p);
  window.plugin.portalHistory.layers.scoutControlled.removeLayer(data.p);

};
*/

window.plugin.portalHistory.setupLayers = function() {
  window.plugin.portalHistory.layers.normVisited = new L.LayerGroup();
  window.plugin.portalHistory.layers.revVisited = new L.LayerGroup();
  window.plugin.portalHistory.layers.normScoutControlled = new L.LayerGroup();
  window.plugin.portalHistory.layers.revScoutControlled = new L.LayerGroup();

  window.plugin.portalHistory.layers.visited = window.plugin.portalHistory.layers.normVisited;
  window.plugin.portalHistory.layers.scoutControlled = window.plugin.portalHistory.layers.normScoutControlled;
  

  window.addLayerGroup('Visited/Captured', window.plugin.portalHistory.layers.visited, false);
  window.addLayerGroup('Scout controlled', window.plugin.portalHistory.layers.scoutControlled, false);

  window.addHook('portalAdded', window.plugin.portalHistory.onportalAdded);
//  window.addHook('portalRemoved', window.plugin.portalHistory.onportalRemoved);
};


// Portal-List - add columns to Portal-list if that plugin is loaded.

window.plugin.portalHistory.setupPortalsList = function() {
  function visitedValue(guid) {
    var info = window.portals[guid].options.data.history;
    if(!info) return 0;
    if(info.visited === undefined) return 0;
    if(!info.visited) return 0;
    if(info.visited && info.captured) return 3;
    if(info.visited) return 1;
  }

  function scoutControlledValue(guid) {
    var info = window.portals[guid].options.data.history
    if (!info) return 0;
    if (info.scoutControlled === undefined ) return 0;
    if (!info.scoutControlled ) return 0;
    if (info.scoutControlled ) return 4;
  }

  window.plugin.portalslist.fields.push(
    {title: "V/C",
      value: function(portal) { return portal.options.guid; }, // we store the guid, but implement a custom comparator so the list does sort properly without closing and reopening the dialog
      sort: function(guidA, guidB) {
        return visitedValue(guidA) - visitedValue(guidB);
      },
      format: function(cell, portal, guid) {
        var info = window.portals[guid].options.data.history;
        if(!info) info = { visited: false, captured: false, scoutControlled: false};

        $(cell).addClass("portal-list-history");
        cell.append((info.visited ? "V" : "_")+"/"+(info.captured ? "C" : "_"));

      }
    },

    {title: "S",
      value: function(portal) { return portal.options.guid; }, // we store the guid, but implement a custom comparator so the list does sort properly without closing and reopening the dialog
      sort:  function(guidA, guidB) {
        return scoutControlledValue(guidA) - scoutControlledValue(guidB);
      },
      format: function(cell, portal, guid) {
        var info = window.portals[guid].options.data.history;
        if(!info) info = { visited: false, captured: false, scoutControlled: false};

        $(cell).addClass("portal-list-history");
        cell.append(info.scoutControlled ? "S" : "_");
      }
    }
  );
};
//------------------------------------------------------------------------------------------
// Toggle Switch

window.plugin.portalHistory.makeButton = function() {
  $('.leaflet-top.leaflet-left')
    .append('<div class="leaflet-control leaflet-bar" id="toggleHistoryButton">'
      +'<a onclick="window.plugin.portalHistory.toggleHistory(true); return false;"'
      +' id="toggleHistory" class="normHistory" title="History toggle"></a></div>');
};

window.plugin.portalHistory.toggleHistory = function(keepUIbutton) {
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
  var visitedLayerActive = window.map.hasLayer (window.plugin.portalHistory.layers.visited);
  var scoutControlledLayerActive = window.map.hasLayer(window.plugin.portalHistory.layers.scoutControlled);
  // remove layers
  window.removeLayerGroup(window.plugin.portalHistory.layers.visited);
  window.removeLayerGroup(window.plugin.portalHistory.layers.scoutControlled);

  if (button.hasClass('normHistory')) {
    $('#toggleHistoryButton').css({'position':'fixed'});
    button.removeClass('normHistory');
    button.addClass('revHistory');
    //switch layers
    window.plugin.portalHistory.layers.visited =
      window.plugin.portalHistory.layers.revVisited;
    window.plugin.portalHistory.layers.scoutControlled =
      window.plugin.portalHistory.layers.revScoutControlled;
  } else {
    $('#toggleHistoryButton').css({'position':'static'});
    button.addClass('normHistory');
    button.removeClass('revHistory');
    //switch layers
    window.plugin.portalHistory.layers.visited =
      window.plugin.portalHistory.layers.normVisited;
    window.plugin.portalHistory.layers.scoutControlled =
      window.plugin.portalHistory.layers.normScoutControlled;
  }
  // reactivate previous active layers
  window.addLayerGroup('Visited/Captured', window.plugin.portalHistory.layers.visited, visitedLayerActive);
  window.addLayerGroup('Scout Controlled', window.plugin.portalHistory.layers.scoutControlled, scoutControlledLayerActive);
};

// -----------------------------------------------------------------------------------------

var setup = function() {
  window.addPortalHighlighter('History: visited/captured', window.plugin.portalHistory.visited);
  window.addPortalHighlighter('History: NOT visited/captured', window.plugin.portalHistory.notVisited);
  window.addPortalHighlighter('History: scoutControlled', window.plugin.portalHistory.scoutControlled);
  window.addPortalHighlighter('History: NOT scoutControlled', window.plugin.portalHistory.notScoutControlled);
  window.plugin.portalHistory.setupLayers();
  if (window.plugin.portalslist) {
    window.plugin.portalHistory.setupPortalsList();
  }
  var style = `
  <style>
    #toggleHistory {
      background-size: 90% 90%;
      background-position: center;
    }

    #toggleHistory.normHistory {
      background-color: red;
    }

    #toggleHistory.revHistory {
      background-color: black;
    }
  </style>
  `;
  $('head').append(style);
window.plugin.portalHistory.makeButton();
}

