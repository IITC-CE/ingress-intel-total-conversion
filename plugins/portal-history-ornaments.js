// @author         Johtaja
// @name           Portal History Ornaments
// @category       Highlighter
// @version        0.1.0
// @description    Display portal history as ornaments


// use own namespace for plugin
var portalsHistory = {};
window.plugin.portalHistoryOrnaments = portalsHistory;

// Global functions used
var dialog = window.dialog;

// Exposed functions
portalsHistory.toggleHistoryMode       = toggleHistoryMode;       // needed for button
portalsHistory.historyDialog           = historyDialog;           // used by dialog
portalsHistory.drawAllHistoryOrnaments = drawAllHistoryOrnaments; // hooked to 'mapDataRefreshEnd'

var KEY_SETTINGS = 'plugin-portal-history-flags';

// ------------------------------------------------------------------------------------------
// Toggle Switch
function toggleIcon() {
  return ('<svg width=26px height=26px color=white>'+
             '  <use xlink:href="'+(portalsHistory.settings.historyModeInverted ? '#fa-emptyCircle' : '#fa-checkedCircle')+'">'+
             '</svg>');
}

function makeButton () {
  $('.leaflet-top.leaflet-left').append(
    $('<div>', { id: 'toggleHistoryButton', class: 'leaflet-control leaflet-bar' }).append(
      $('<a>', {
        id: 'toggleHistory',
        title: 'History toggle',
        click: function () { toggleHistoryMode(); return false; },
        dblclick : function () { historyDialog(); return false;},
        html: toggleIcon()
      })
    )
  );
}

function toggleHistoryMode() {
  portalsHistory.settings.historyModeInverted = !portalsHistory.settings.historyModeInverted;
  localStorage[KEY_SETTINGS] = JSON.stringify(portalsHistory.settings);
  $('#toggleHistory').html(toggleIcon());
  drawAllHistoryOrnaments();
  updateDialogOption();
}

function svgToIcon (str, s) {
  var url = ('data:image/svg+xml,' + encodeURIComponent(str)).replace(/#/g, '%23');
  return new L.Icon({
    iconUrl: url,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2]
  });
}

function loadSettings() {
  try {
    portalsHistory.settings = JSON.parse(localStorage[KEY_SETTINGS]);
  } catch (e) {
    portalsHistory.settings = {
      drawMissing: false,
      showVisitedCaptured: true,
      showScoutControlled: false
    };
  }
}

function historyDialog() {
  var html = '<div> ' +
    '<select id="display-mode"> ' +
    '  <option value="received">Show uniques received</option> ' +
    '  <option value="missing">Show missing uniques</option> ' +
    '</select> ' +
    '</div> ' +
    '<div><label><input type="checkbox" id="show-visited">Show <span class="dot yellow"></span>Visited/'+
    '<span class="dot red"></span>Captured</label></div> ' +
    '<div><label><input type="checkbox" id="show-scouted">Show <span class="dot violet"></span>Scout Controlled</label></div>';

  dialog({
    html: html,
    title: 'Portal History Settings',
    id: 'plugin-portal-history-flags',
    width: 'auto',
    closeCallback: function () {
      saveDialogOption();
    }
  });

  updateDialogOption();
}


function updateDialogOption() {
  var dialog = $('#dialog-plugin-portal-history-flags');

  var displayMode = portalsHistory.settings.historyModeInverted ? 'missing' : 'received';
  $('#display-mode', dialog).val(displayMode);
  $('#show-visited', dialog).prop('checked', portalsHistory.settings.showVisitedCaptured);
  $('#show-scouted', dialog).prop('checked', portalsHistory.settings.showScoutControlled);
}


function saveDialogOption() {
  var dialog = $('#dialog-plugin-portal-history-flags');

  portalsHistory.settings.historyModeInverted = $('#display-mode', dialog).val() === 'missing';
  portalsHistory.settings.showVisitedCaptured = $('#show-visited', dialog).is(':checked');
  portalsHistory.settings.showScoutControlled = $('#show-scouted', dialog).is(':checked');

  localStorage.setItem(KEY_SETTINGS, JSON.stringify(portalsHistory.settings));
  $('#toggleHistory').html(toggleIcon());
  portalsHistory.drawAllHistoryOrnaments();
}


function createIcons () {
  var LEVEL_TO_RADIUS =   [6, 6, 6, 6, 8, 8, 8, 10, 11];
  var scale = window.portalMarkerScale();
  portalsHistory.iconSemiMarked = {};
  portalsHistory.iconMarked = {};
  portalsHistory.iconScoutControlled = {};
  var ornamentWeight = 4;
  var parts = (portalsHistory.settings.showVisitedCaptured + portalsHistory.settings.showScoutControlled);
  LEVEL_TO_RADIUS.forEach(function (portalMarkerRadius, idx) {
    var iconSize = (portalMarkerRadius + ornamentWeight) * 2 * scale;
    var offset = 0;
    if (portalsHistory.settings.showScoutControlled) {
      portalsHistory.iconScoutControlled[idx] = svgToIcon(getSVGString(iconSize, 'violet', parts, offset), iconSize + ornamentWeight);
      offset++;
    } else {
      portalsHistory.iconScoutControlled[idx] = svgToIcon(getSVGString(iconSize, 'transparent', parts, offset), iconSize + ornamentWeight);
    }

    if (portalsHistory.settings.showVisitedCaptured) {
      portalsHistory.iconSemiMarked[idx] = svgToIcon(getSVGString(iconSize, 'yellow', parts, offset), iconSize + ornamentWeight);
      portalsHistory.iconMarked[idx] = svgToIcon(getSVGString(iconSize, 'red', parts, offset), iconSize + ornamentWeight);
      offset++;
    } else {
      portalsHistory.iconSemiMarked[idx] = svgToIcon(getSVGString(iconSize, 'transparent', parts, offset), iconSize + ornamentWeight);
      portalsHistory.iconMarked[idx] = svgToIcon(getSVGString(iconSize, 'transparent', parts, offset), iconSize + ornamentWeight);
    }
  }) ;
}

function drawHistoryOrnaments (portal) {
  var drawMissing = portalsHistory.settings.historyModeInverted;
  portal._historyLayer = L.layerGroup();
  var history = portal.options.data.history;

  if (history) {
    if (drawMissing && !history.visited || !drawMissing && history.captured) {
      L.marker(portal._latlng, {
        icon: portalsHistory.iconMarked[portal.options.level],
        interactive: false,
        keyboard: false
      }).addTo(portal._historyLayer);
    }
    if (drawMissing && history.visited && !history.captured
        || !drawMissing && history.visited && !history.captured) {
      L.marker(portal._latlng, {
        icon: portalsHistory.iconSemiMarked[portal.options.level],
        interactive: false,
        keyboard: false
      }).addTo(portal._historyLayer);
    }
    if (drawMissing && !history.scoutControlled || !drawMissing && history.scoutControlled) {
      L.marker(portal._latlng, {
        icon: portalsHistory.iconScoutControlled[portal.options.level],
        interactive: false,
        keyboard: false
      }).addTo(portal._historyLayer);
    }
  }
  portal._historyLayer.addTo(portalsHistory.layerGroup);
}

function drawAllHistoryOrnaments () {
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
    drawHistoryOrnaments(window.portals[id]);
  }
}

function getSVGString (size, color, parts, offset) {
  var circumference = size * Math.PI;
  var arcOffset = circumference / parts * (parts - 1);
  var rotate = 360 / parts * offset;
  return L.Util.template(
    '<svg width="{size}" height="{size}" xmlns="http://www.w3.org/2000/svg">'+
    '<circle stroke="{color}" stroke-width="4" fill="transparent" cx="{middle}" cy="{middle}" '+
    'r="{radius}" stroke-dasharray="{dasharray}" stroke-dashoffset="{offset}"'+
    ' transform="rotate({rotate}, {middle}, {middle})" /></svg>',
    {
      size: size+4,
      radius: size/2,
      middle: (size+4)/2,
      rotate: rotate,
      color: color,
      dasharray: circumference,
      offset: arcOffset
    }
  );
}
// -----------------------------------------------------------------------------------------
function setup () { // eslint-disable-line no-unused-vars
  var faSymbols ='<svg xmlns="http://www.w3.org/2000/svg">'+
    '<symbol id="fa-emptyCircle" viewBox="0 0 512 512"> '+
    '  <path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm0 '+
    '  448c-110.5 0-200-89.5-200-200S145.5 56 256 56s200 89.5 200 200-89.5 200-200 200z"/>'+
    '<symbol id="fa-checkedCircle" viewBox="0 0 512 512">'+
    '  <path d="M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 '+
    '  248-248S392.967 8 256 8zm0 48c110.532 0 200 89.451 200 200 0 110.532-89.451 200-200 '+
    '  200-110.532 0-200-89.451-200-200 0-110.532 89.451-200 200-200m140.204 '+
    '  130.267l-22.536-22.718c-4.667-4.705-12.265-4.736-16.97-.068L215.346 '+
    '  303.697l-59.792-60.277c-4.667-4.705-12.265-4.736-16.97-.069l-22.719 22.536c-4.705 '+
    '  4.667-4.736 12.265-.068 16.971l90.781 91.516c4.667 4.705 12.265 4.736 '+
    '  16.97.068l172.589-171.204c4.704-4.668 4.734-12.266.067-16.971z"/>'+
    '</svg>';
  $('body').append(faSymbols);

  // Initialization
  loadSettings();
  makeButton ();
  $('#toggleHistoryButton').hide(); // hide the button on start, it will show on add

  portalsHistory.layerGroup = L.layerGroup()
    .on('add', function () {
      $('#toggleHistoryButton').show();
    })
    .on('remove', function () {
      $('#toggleHistoryButton').hide();
    });

  window.addLayerGroup('Portal History', portalsHistory.layerGroup, false);

  // Hooks
  window.addHook('mapDataRefreshEnd', portalsHistory.drawAllHistoryOrnaments);

  // toolbox additions
  $('<a>Portal History</a>')
    .click(historyDialog)
    .appendTo('#toolbox');

  $('<style>')
    .prop('type', 'text/css')
    .html('@include_string:portal-history-ornaments.css@')
    .appendTo('head');

}
