// @author         Johtaja
// @name           Portal History Ornaments
// @category       Highlighter
// @version        0.1.0
// @description    Display portal history as ornaments


// use own namespace for plugin
var portalsHistory = {};
window.plugin.portalHistoryOrnaments = portalsHistory;

// Exposed functions
/*
portalsHistory.makeButton

*/

var KEY_SETTINGS = "plugin-portal-history-flags";

// History Ornaments
// portalsHistory.layers = {};

/* portalsHistory.createStatusMarker = function(latlng, data, statusColor, scaleRadius) {
  var styleOptions = window.getMarkerStyleOptions(data.data);

  styleOptions.fill = false;
  styleOptions.color = statusColor;
  styleOptions.radius *= scaleRadius;

  var options = L.extend({}, data, styleOptions, { clickable: true });

  var marker = L.circleMarker(latlng, options);

  return marker;
};
*/
/* portalsHistory.onPortalAdded = function(data) {
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
*/
/* WIP 
portalsHistory.onportalRemoved = function(data) {
  // data = {portal: p, data: p.options.data }

  portalsHistory.layers.visited.removeLayer(data.p);
  portalsHistory.layers.captured.removeLayer(data.p);
  portalsHistory.layers.scoutControlled.removeLayer(data.p);

};
*/

/* portalsHistory.setupLayers = function() {
  portalsHistory.layers.normVisited = new L.LayerGroup();
  portalsHistory.layers.revVisited = new L.LayerGroup();
  portalsHistory.layers.normScoutControlled = new L.LayerGroup();
  portalsHistory.layers.revScoutControlled = new L.LayerGroup();

  portalsHistory.layers.visited = portalsHistory.layers.normVisited;
  portalsHistory.layers.scoutControlled = portalsHistory.layers.normScoutControlled;

  window.addLayerGroup('Visited/Captured', portalsHistory.layers.visited, false);
  window.addLayerGroup('Scout controlled', portalsHistory.layers.scoutControlled, false);

  window.addHook('portalAdded', portalsHistory.onPortalAdded);
//  window.addHook('portalRemoved', portalsHistory.onportalRemoved);
};
*/
//------------------------------------------------------------------------------------------
// Toggle Switch

portalsHistory.makeButton = function() {
  var isClass = portalsHistory.settings.drawMissing?'normHistory':'revHistory';
  $('.leaflet-top.leaflet-left')
    .append('<div class="leaflet-control leaflet-bar" id="toggleHistoryButton"> '
      +'<a onclick="window.plugin.portalHistoryOrnaments.toggleHistory(true); return false;" '
      +'id="toggleHistory" class="'+isClass+'" title="History toggle"></a></div>');
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
/* 
  // are the layers active?
  var visitedLayerActive = window.map.hasLayer (portalsHistory.layers.visited);
  var scoutControlledLayerActive = window.map.hasLayer(portalsHistory.layers.scoutControlled);
  // remove layers
  window.removeLayerGroup(portalsHistory.layers.visited);
  window.removeLayerGroup(portalsHistory.layers.scoutControlled);
*/
  portalsHistory.settings.drawMissing = !portalsHistory.settings.drawMissing
//  createIcons();
  portalsHistory.drawAllFlags();

  if (button.hasClass('normHistory')) {
    $('#toggleHistoryButton').css({'position':'fixed'});
    button.removeClass('normHistory');
    button.addClass('revHistory');
/*    //switch layers
    portalsHistory.layers.visited =
      portalsHistory.layers.revVisited;
    portalsHistory.layers.scoutControlled =
      portalsHistory.layers.revScoutControlled;
*/
  } else {
    $('#toggleHistoryButton').css({'position':'static'});
    button.addClass('normHistory');
    button.removeClass('revHistory');
/*    //switch layers
    portalsHistory.layers.visited =
      portalsHistory.layers.normVisited;
    portalsHistory.layers.scoutControlled =
      portalsHistory.layers.normScoutControlled;
*/
  }
/*  // reactivate previous active layers
  window.addLayerGroup('Visited/Captured', portalsHistory.layers.visited, visitedLayerActive);
  window.addLayerGroup('Scout Controlled', portalsHistory.layers.scoutControlled, scoutControlledLayerActive);
*/
};

// -----------------------------------------------------------------------------------------
// New Style Ornaments (by @Eisfrei)
svgToIcon = function(str, s) {
  const url = ("data:image/svg+xml," + encodeURIComponent(str)).replace(/#/g, '%23');
  return new L.Icon({
    iconUrl: url,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
    className: 'no-pointer-events', //allows users to click on portal under the unique marker
  })
}

portalsHistory.removePortalFromMap = function (data) {
  if (!data.portal._historyLayer) {
    return;
  }
  portalsHistory.layerGroup.removeLayer(data.portal._historyLayer);
}

portalsHistory.addToPortalMap = function (data) {
/*  if (data.portal.options.ent.length === 3 && data.portal.options.ent[2].length >= 19 && data.portal.options.ent[2][18] > 0) {
    data.portal.options.data.agentVisited = (data.portal.options.ent[2][18] & 0b1) === 1;
    data.portal.options.data.agentCaptured = (data.portal.options.ent[2][18] & 0b10) === 2;
    data.portal.options.data.agentScouted = (data.portal.options.ent[2][18] & 0b100) === 4;
  }

  //IITC.me support: getCurrentZoomTileParameters is iitc-ce only; iitc.me function is: getMapZoomTileParameters
*/
  var tileParams = window.getCurrentZoomTileParameters ? window.getCurrentZoomTileParameters() : window.getMapZoomTileParameters();
  if (tileParams.level === 0) {
    drawPortalFlags(data.portal);
  } else {
    portalsHistory.removePortalFromMap(data);
  }
}

loadSettings = function() {
  try {
    portalsHistory.settings = JSON.parse(localStorage[KEY_SETTINGS]);
  } catch (e) {
    portalsHistory.settings = {
      drawMissing: false,
      showVisited: true,
      showCaptured: true,
      showScouted: false,
    };
  }
}

portalsHistory.toggleDisplayMode = function () {
  dialog({
    html: `<div id="portal-history-settings">
<div>
<select id="portal-history-settings--display-mode">
  <option value="received" ${portalsHistory.settings.drawMissing?'':'selected'}>Show uniques received</option>
  <option value="missing" ${portalsHistory.settings.drawMissing?'selected':''}>Show missing uniques</option>
</select>
</div>
<div><label style="color:red;"><input type="checkbox" id="portal-history-settings--show-visited" 
  ${portalsHistory.settings.showVisitedCaptured?'checked':''}> Show visited/captured</label></div>
<div><label style="color:violet;"><input type="checkbox" id="portal-history-settings--show-scouted" 
  ${portalsHistory.settings.showScouted?'checked':''}> Show Scout Controlled</label></div>
</div>`,

/*
<div><label style="color:#ff0000;"><input type="checkbox" id="portal-history-settings--show-captured" 
  ${portalsHistory.settings.showCaptured?'checked':''}> Show captured</label></div>
*/
    title: 'Portal History Settings',
    id: 'plugin-portal-history-flags',
    width: 'auto',
    closeCallback: function () {
      const elMode = document.getElementById('portal-history-settings--display-mode');
      const elVisitedCaptured = document.getElementById('portal-history-settings--show-visited');
//      const elCaptured = document.getElementById('portal-history-settings--show-captured');
      const elScouted = document.getElementById('portal-history-settings--show-scouted');

      portalsHistory.settings.drawMissing = elMode.value === 'missing';
      portalsHistory.settings.showVisitedCaptured = elVisitedCaptured.checked;
 //     portalsHistory.settings.showCaptured = elCaptured.checked;
      portalsHistory.settings.showScouted = elScouted.checked;

      localStorage[KEY_SETTINGS] = JSON.stringify(portalsHistory.settings);
//      portalsHistory.createIcons();
      portalsHistory.drawAllFlags();
    }
  });
}
  
portalsHistory.createIcons = function() {
//  var LEVEL_TO_RADIUS = [7, 7, 7, 7, 8, 8, 9, 10, 11];
  var LEVEL_TO_RADIUS =   [6, 6, 6, 6, 8, 8, 8, 10, 11];
  var scale = window.portalMarkerScale();
  portalsHistory.iconSemiMarked = {};
  portalsHistory.iconMarked = {};
	portalsHistory.iconScouted = {};
  const parts = (portalsHistory.settings.showVisitedCaptured + portalsHistory.settings.showScouted);
  LEVEL_TO_RADIUS.forEach((el, idx) => {
    let size = (el * 2 + 8) * scale;
    let offset = 0;
    if (portalsHistory.settings.showScouted) {
      portalsHistory.iconScouted[idx] = svgToIcon(getSVGString(size, 'violet', parts, offset), size + 4);
    offset++;
      } else {
      portalsHistory.iconScouted[idx] = svgToIcon(getSVGString(size, 'transparent', parts, offset), size + 4);
    }

    if (portalsHistory.settings.showVisitedCaptured) {
      portalsHistory.iconSemiMarked[idx] = svgToIcon(getSVGString(size, 'yellow', parts, offset), size + 4);
      portalsHistory.iconMarked[idx] = svgToIcon(getSVGString(size, 'red', parts, offset), size + 4);
      offset++;
    } else {
      portalsHistory.iconSemiMarked[idx] = svgToIcon(getSVGString(size, 'transparent', parts, offset), size + 4);
      portalsHistory.iconMarked[idx] = svgToIcon(getSVGString(size, 'transparent', parts, offset), size + 4);
    }
/*
    if (portalsHistory.settings.showVisitedCaptured) {
      portalsHistory.iconMarked[idx] = svgToIcon(getSVGString(size, '#ff0000', parts, offset), size + 4);
      offset++;
    } else {
      portalsHistory.iconMarked[idx] = svgToIcon(getSVGString(size, 'transparent', parts, offset), size + 4);
    }
*/
  });
}

drawPortalFlags = function (portal) {
  /*if (portal._historyLayer) {
      portal._historyLayer.addTo(portalsHistory.layerGroup);
      return;
  }*/

  const drawMissing = portalsHistory.settings.drawMissing;
  portal._historyLayer = new L.LayerGroup();

//  if (!portal.options.data.history) return;
  if (portal.options.data.history) {
    if (drawMissing && !portal.options.data.history.visited || !drawMissing && portal.options.data.history.captured) {
      L.marker(portal._latlng, {
        icon: portalsHistory.iconMarked[portal.options.level],
        interactive: false,
        keyboard: false,
      }).addTo(portal._historyLayer);
    }
    if (drawMissing && portal.options.data.history.visited && !portal.options.data.history.captured 
        || !drawMissing && portal.options.data.history.visited && !portal.options.data.history.captured) {
      L.marker(portal._latlng, {
        icon: portalsHistory.iconSemiMarked[portal.options.level],
        interactive: false,
        keyboard: false,
      }).addTo(portal._historyLayer);
    }
    if (drawMissing && !portal.options.data.history.scoutControlled || !drawMissing && portal.options.data.history.scoutControlled) {
      L.marker(portal._latlng, {
        icon: portalsHistory.iconScouted[portal.options.level],
        interactive: false,
        keyboard: false,
      }).addTo(portal._historyLayer);
    }
  }
  portal._historyLayer.addTo(portalsHistory.layerGroup);
}

portalsHistory.drawAllFlags = function () {
  portalsHistory.layerGroup.clearLayers();
  portalsHistory.createIcons();
  //IITC.me support: getCurrentZoomTileParameters is iitc.app only; iitc.me function is: getMapZoomTileParameters
  var tileParams = window.getCurrentZoomTileParameters ? window.getCurrentZoomTileParameters() : window.getMapZoomTileParameters();
  if (tileParams.level !== 0) {
    return;
  }

  for (let id in window.portals) {
    drawPortalFlags(window.portals[id]);
  }
}

getSVGString = function(size, color, parts, offset) {
  const circumference = size * Math.PI;
  const arcOffset = circumference / parts * (parts - 1);
  const rotate = 360 / parts * offset;
  return `<svg width="${(size+4)}" height="${(size+4)}" xmlns="http://www.w3.org/2000/svg">
          <circle stroke="${color}" stroke-width="4" fill="transparent" cx="${(size+4)/2}" cy="${(size+4)/2}" 
          r="${(size/2)}" stroke-dasharray="${circumference}" stroke-dashoffset="${arcOffset}" 
          transform="rotate(${rotate}, ${((size+4)/2)}, ${((size+4)/2)})" />
          </svg>`;
}
// -----------------------------------------------------------------------------------------
var setup = function () {
  loadSettings();

  //portalsHistory.setupLayers();

  var checkedCircle = '<svg class="tracker-eye" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"> <path d="M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm0 48c110.532 0 200 89.451 200 200 0 110.532-89.451 200-200 200-110.532 0-200-89.451-200-200 0-110.532 89.451-200 200-200m140.204 130.267l-22.536-22.718c-4.667-4.705-12.265-4.736-16.97-.068L215.346 303.697l-59.792-60.277c-4.667-4.705-12.265-4.736-16.97-.069l-22.719 22.536c-4.705 4.667-4.736 12.265-.068 16.971l90.781 91.516c4.667 4.705 12.265 4.736 16.97.068l172.589-171.204c4.704-4.668 4.734-12.266.067-16.971z"/></svg>';
  var emptyCircle =  '<svg class="tracker-eye" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"> <path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm0 448c-110.5 0-200-89.5-200-200S145.5 56 256 56s200 89.5 200 200-89.5 200-200 200z"/></svg>';

  var style = `<style>
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
      </style>`;

  $('head').append(style);

  portalsHistory.makeButton();

  // New Style Ornaments (by @EisFrei)

//  portalsHistory.createIcons();
  portalsHistory.layerGroup = new L.LayerGroup();
  window.addLayerGroup('Portal History', portalsHistory.layerGroup, false);

//  window.addHook('portalAdded', portalsHistory.addToPortalMap);
//  window.addHook('portalRemoved', portalsHistory.removePortalFromMap);
  window.addHook('mapDataRefreshEnd', portalsHistory.drawAllFlags);
  window.map.on('zoom', portalsHistory.drawAllFlags);
  $('#toolbox').append('<a onclick="window.plugin.portalHistoryOrnaments.toggleDisplayMode()">Portal History</a>');

}

