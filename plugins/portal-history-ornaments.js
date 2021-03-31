// @author         Johtaja
// @name           Portal History Ornaments
// @category       Highlighter
// @version        0.1.0
// @description    Display portal history as ornaments


// use own namespace for plugin
var portalsHistory = {};
window.plugin.portalHistoryOrnaments = portalsHistory;

//Exposed functions
portalsHistory.toggleHistory        = toggleHistory;        // needed for button
portalsHistory.toggleDisplayMode    = toggleDisplayMode;    // used by dialog
portalsHistory.drawAllFlags         = drawAllFlags;         // hooked to 'mapDataRefreshEnd'

var KEY_SETTINGS = 'plugin-portal-history-flags';

//------------------------------------------------------------------------------------------
// Toggle Switch

function makeButton () {
  var newClass = portalsHistory.settings.drawMissing ? 'revHistory' : 'normHistory';

  $('.leaflet-top.leaflet-left').append(
    $('<div>', { id: 'toggleHistoryButton', class: 'leaflet-control leaflet-bar' }).append(
      $('<a>', {
        id: 'toggleHistory',
        title: 'History toggle',
        class: newClass,
        click: function () { toggleHistory(); return false; },
        dblclick : function () { toggleDisplayMode(); return false;}
      })
    )
  );
}

function toggleHistory() {
  var button = $('#toggleHistory');

  portalsHistory.settings.drawMissing = !portalsHistory.settings.drawMissing;
  localStorage[KEY_SETTINGS] = JSON.stringify(portalsHistory.settings);
  drawAllFlags();

  if (button.hasClass('normHistory')) {
    button.removeClass('normHistory');
    button.addClass('revHistory');
  } else {
    button.addClass('normHistory');
    button.removeClass('revHistory');
  }
}

function svgToIcon (str, s) {
  var url = ('data:image/svg+xml,' + encodeURIComponent(str)).replace(/#/g, '%23');
  return new L.Icon({
    iconUrl: url,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
    className: 'no-pointer-events', // allows users to click on portal under the unique marker
  })
}

function loadSettings() {
  try {
    portalsHistory.settings = JSON.parse(localStorage[KEY_SETTINGS]);
  } catch (e) {
    portalsHistory.settings = {
      drawMissing: false,
      showVisitedCaptured: true,
      showScoutControlled: false,
    };
  }
}

function toggleDisplayMode () {
  var html = '<div id="portal-history-settings"> '+
      '<div> '+
      '<select id="portal-history-settings--display-mode"> '+
      '  <option value="received" '+(portalsHistory.settings.drawMissing ? '' : 'selected')+'>Show uniques received</option> '+
      '  <option value="missing" '+(portalsHistory.settings.drawMissing ? 'selected' : '')+'>Show missing uniques</option> '+
      '</select> '+
      '</div> '+
      '<div><label style="color:red;"><input type="checkbox" id="portal-history-settings--show-visited" '+
      '  '+(portalsHistory.settings.showVisitedCaptured ? 'checked' : '')+'> Show visited/captured</label></div> '+
      '<div><label style="color:violet;"><input type="checkbox" id="portal-history-settings--show-scouted" '+
      '  '+(portalsHistory.settings.showScoutControlled ? 'checked' : '')+'> Show Scout Controlled</label></div> '+
      '</div>';

  dialog({
    html: html,
    title: 'Portal History Settings',
    id: 'plugin-portal-history-flags',
    width: 'auto',
    closeCallback: function () {
      var elMode = document.getElementById('portal-history-settings--display-mode');
      var elVisitedCaptured = document.getElementById('portal-history-settings--show-visited');
      var elScouted = document.getElementById('portal-history-settings--show-scouted');

      portalsHistory.settings.drawMissing = elMode.value === 'missing';
      portalsHistory.settings.showVisitedCaptured = elVisitedCaptured.checked;
      portalsHistory.settings.showScoutControlled = elScouted.checked;

      localStorage[KEY_SETTINGS] = JSON.stringify(portalsHistory.settings);
      portalsHistory.drawAllFlags();
    }
  });
}

function createIcons () {
// portalMarkerRadiuses are [7, 7, 7, 7, 8, 8, 9, 10, 11];
  var LEVEL_TO_RADIUS =   [6, 6, 6, 6, 8, 8, 8, 10, 11];    // values differ as the weight is not included
  var scale = window.portalMarkerScale();
  portalsHistory.iconSemiMarked = {};
  portalsHistory.iconMarked = {};
  portalsHistory.iconScoutControlled = {};
  var parts = (portalsHistory.settings.showVisitedCaptured + portalsHistory.settings.showScoutControlled);
  LEVEL_TO_RADIUS.forEach((portalMarkerRadius, idx) => {
    var iconSize = (portalMarkerRadius * 2 + 8) * scale;    // 8 = 2 x weight of ornament (4px)
    var offset = 0;
    if (portalsHistory.settings.showScoutControlled) {
      portalsHistory.iconScoutControlled[idx] = svgToIcon(getSVGString(iconSize, 'violet', parts, offset), iconSize + 4);
      offset++;
    } else {
      portalsHistory.iconScoutControlled[idx] = svgToIcon(getSVGString(iconSize, 'transparent', parts, offset), iconSize + 4);
    }

    if (portalsHistory.settings.showVisitedCaptured) {
      portalsHistory.iconSemiMarked[idx] = svgToIcon(getSVGString(iconSize, 'yellow', parts, offset), iconSize + 4);
      portalsHistory.iconMarked[idx] = svgToIcon(getSVGString(iconSize, 'red', parts, offset), iconSize + 4);
      offset++;
    } else {
      portalsHistory.iconSemiMarked[idx] = svgToIcon(getSVGString(iconSize, 'transparent', parts, offset), iconSize + 4);
      portalsHistory.iconMarked[idx] = svgToIcon(getSVGString(iconSize, 'transparent', parts, offset), iconSize + 4);
    }
  });
}

function drawPortalFlags (portal) {
  var drawMissing = portalsHistory.settings.drawMissing;
  portal._historyLayer = L.layerGroup();
  var history = portal.options.data.history;

  if (history) {
    if (drawMissing && !history.visited || !drawMissing && history.captured) {
      L.marker(portal._latlng, {
        icon: portalsHistory.iconMarked[portal.options.level],
        interactive: false,
        keyboard: false,
      }).addTo(portal._historyLayer);
    }
    if (drawMissing && history.visited && !history.captured
        || !drawMissing && history.visited && !history.captured) {
      L.marker(portal._latlng, {
        icon: portalsHistory.iconSemiMarked[portal.options.level],
        interactive: false,
        keyboard: false,
      }).addTo(portal._historyLayer);
    }
    if (drawMissing && !history.scoutControlled || !drawMissing && history.scoutControlled) {
      L.marker(portal._latlng, {
        icon: portalsHistory.iconScoutControlled[portal.options.level],
        interactive: false,
        keyboard: false,
      }).addTo(portal._historyLayer);
    }
  }
  portal._historyLayer.addTo(portalsHistory.layerGroup);
}

function drawAllFlags () {
  portalsHistory.layerGroup.clearLayers();
  createIcons();
  /* As getDataZoomTileParameters is not available in all IITC versions
     fallback to getMapZoomTileParameters
  */ 
  var tileParams = window.getDataZoomTileParameters ? window.getDataZoomTileParameters() : window.getMapZoomTileParameters();
  if (tileParams.level !== 0) {
    return;
  }

  for (var id in window.portals) {
    drawPortalFlags(window.portals[id]);
  }
}

function getSVGString (size, color, parts, offset) {
  var circumference = size * Math.PI;
  var arcOffset = circumference / parts * (parts - 1);
  var rotate = 360 / parts * offset;
  return `<svg width="${(size+4)}" height="${(size+4)}" xmlns="http://www.w3.org/2000/svg">
          <circle stroke="${color}" stroke-width="4" fill="transparent" cx="${(size+4)/2}" cy="${(size+4)/2}"
          r="${(size/2)}" stroke-dasharray="${circumference}" stroke-dashoffset="${arcOffset}"
          transform="rotate(${rotate}, ${((size+4)/2)}, ${((size+4)/2)})" />
          </svg>`;
}
// -----------------------------------------------------------------------------------------
var setup = function () {

  var checkedCircle = '<svg class="tracker-eye" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"> <path d="M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm0 48c110.532 0 200 89.451 200 200 0 110.532-89.451 200-200 200-110.532 0-200-89.451-200-200 0-110.532 89.451-200 200-200m140.204 130.267l-22.536-22.718c-4.667-4.705-12.265-4.736-16.97-.068L215.346 303.697l-59.792-60.277c-4.667-4.705-12.265-4.736-16.97-.069l-22.719 22.536c-4.705 4.667-4.736 12.265-.068 16.971l90.781 91.516c4.667 4.705 12.265 4.736 16.97.068l172.589-171.204c4.704-4.668 4.734-12.266.067-16.971z"/></svg>';
  var emptyCircle = '<svg class="tracker-eye" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"> <path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm0 448c-110.5 0-200-89.5-200-200S145.5 56 256 56s200 89.5 200 200-89.5 200-200 200z"/></svg>';

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
        
        .no-pointer-events {
          pointer-events: none;
        }
      </style>`;

  $('head').append(style);

// Initialization
  loadSettings();
  portalsHistory.layerGroup = L.layerGroup()
    .on('add', function () {
       $('#toggleHistoryButton').show();
    })
    .on('remove', function () {
      $('#toggleHistoryButton').hide();
    });

  window.addLayerGroup('Portal History', portalsHistory.layerGroup, false);

// Hooks
  window.addHook('mapDataRefreshEnd', portalsHistory.drawAllFlags);

// UI additions
  makeButton ();
  $('<a>Portal History</a>')
    .click(toggleDisplayMode)
    .appendTo('#toolbox');
}
