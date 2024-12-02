// ==UserScript==
// @author         mrDinckleman
// @id             aurora@mrDinckleman
// @name           Aurora Glyph Hack Challenge
// @category       Misc
// @version        0.1.1.20190821.192931
// @description    [2019-08-21-192931] Allow manual entry of portals glyphed during Aurora Glyph Hack Challenge. Use the 'highlighter-aurora' plugin to show the portals on the map, and 'sync' to share between multiple browsers or desktop/mobile.
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/mrDinckleman/aurora.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/mrDinckleman/aurora.user.js
// @namespace      https://github.com/mrDinckleman/iitc-plugins
// @include        https://intel.ingress.com/*
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


/* globals $ */

function wrapper(plugin_info) {
  // Ensure plugin framework is there, even if iitc is not yet loaded
  if (typeof window.plugin !== 'function') window.plugin = function () {};

  // PLUGIN START //////////////////////////////////////////////////////////
  var glyph = {
    1: parseInt('00001', 2),
    2: parseInt('00010', 2),
    3: parseInt('00100', 2),
    4: parseInt('01000', 2),
    5: parseInt('10000', 2)
  };

  // Use own namespace for plugin
  window.plugin.aurora = function () {};

  // Delay in ms
  window.plugin.aurora.SYNC_DELAY = 5000;

  // Maps the JS property names to localStorage keys
  window.plugin.aurora.FIELDS = {
    'glyphed': 'plugin-aurora-data',
    'updateQueue': 'plugin-aurora-data-queue',
    'updatingQueue': 'plugin-aurora-data-updating-queue'
  };

  window.plugin.aurora.glyphed = {};
  window.plugin.aurora.updateQueue = {};
  window.plugin.aurora.updatingQueue = {};

  window.plugin.aurora.enableSync = false;

  window.plugin.aurora.disabledMessage = null;
  window.plugin.aurora.contentHTML = null;

  window.plugin.aurora.isHighlightActive = false;

  window.plugin.aurora.onPortalDetailsUpdated = function () {
    var $preview = $('#portaldetails > .imgpreview');

    if (typeof(Storage) === 'undefined') {
      $preview.after(window.plugin.aurora.disabledMessage);
      return;
    }

    var guid = window.selectedPortal;

    $preview.after(window.plugin.aurora.contentHTML);
    window.plugin.aurora.updateCheckedAndHighlight(guid);
  };

  window.plugin.aurora.updateCheckedAndHighlight = function (guid) {
    if (guid === window.selectedPortal) {
      var glyphInfo = window.plugin.aurora.glyphed[guid];
      var glyphed = (glyphInfo && glyphInfo.glyphed) || 0;

      $('#glyph_1').prop('checked', glyphed & glyph[1]);
      $('#glyph_2').prop('checked', glyphed & glyph[2]);
      $('#glyph_3').prop('checked', glyphed & glyph[3]);
      $('#glyph_4').prop('checked', glyphed & glyph[4]);
      $('#glyph_5').prop('checked', glyphed & glyph[5]);
    }

    if (window.plugin.aurora.isHighlightActive) {
      if (window.portals[guid]) {
        window.setMarkerStyle(window.portals[guid], guid === window.selectedPortal);
      }
    }
  };

  window.plugin.aurora.updateGlyphed = function (state, seq, guid) {
    if (typeof guid === 'undefined') guid = window.selectedPortal;

    var glyphInfo = window.plugin.aurora.glyphed[guid];

    if (!glyphInfo) {
      window.plugin.aurora.glyphed[guid] = glyphInfo = {
        glyphed: 0
      };
    }

    // Nothing changed
    if (state === !!(glyphInfo.glyphed & glyph[seq])) return;

    glyphInfo.glyphed = glyphInfo.glyphed + (state ? 1 : -1) * glyph[seq];

    window.plugin.aurora.updateCheckedAndHighlight(guid);
    window.plugin.aurora.sync(guid);

    $('input.glyph_' + seq + '[data-guid="' + guid + '"]').prop('checked', state);
    window.plugin.aurora.toggleAll(seq);
    $('#dialog-aurora-dialog').prev().find('.ui-dialog-title').text(window.plugin.aurora.getModalTitle());
  };

  // Stores the given GUID for sync
  window.plugin.aurora.sync = function (guid) {
    window.plugin.aurora.updateQueue[guid] = true;
    window.plugin.aurora.storeLocal('glyphed');
    window.plugin.aurora.storeLocal('updateQueue');
    window.plugin.aurora.syncQueue();
  };

  // Sync the queue, but delay the actual sync to group a few updates in a single request
  window.plugin.aurora.syncQueue = function () {
    if (!window.plugin.aurora.enableSync) return;

    clearTimeout(window.plugin.aurora.syncTimer);

    window.plugin.aurora.syncTimer = setTimeout(function () {
      window.plugin.aurora.syncTimer = null;

      $.extend(window.plugin.aurora.updatingQueue, window.plugin.aurora.updateQueue);
      window.plugin.aurora.updateQueue = {};
      window.plugin.aurora.storeLocal('updatingQueue');
      window.plugin.aurora.storeLocal('updateQueue');

      window.plugin.sync.updateMap('aurora', 'glyphed', Object.keys(window.plugin.aurora.updatingQueue));
    }, window.plugin.aurora.SYNC_DELAY);
  };

  // Call after IITC and all plugin loaded
  window.plugin.aurora.registerFieldForSyncing = function () {
    if (!window.plugin.sync) return;

    window.plugin.sync.registerMapForSync(
      'aurora',
      'glyphed',
      window.plugin.aurora.syncCallback,
      window.plugin.aurora.syncInitialed
    );
  };

  // Call after local or remote change uploaded
  window.plugin.aurora.syncCallback = function (pluginName, fieldName, e, fullUpdated) {
    if (fieldName === 'glyphed') {
      window.plugin.aurora.storeLocal('glyphed');

      // All data is replaced if other client update the data during this client offline
      if (fullUpdated) {
        // A full update - update the selected portal sidebar
        if (window.selectedPortal) {
          window.plugin.aurora.updateCheckedAndHighlight(window.selectedPortal);
        }

        // And also update all highlights, if needed
        if (window.plugin.aurora.isHighlightActive) {
          window.resetHighlightedPortals();
        }

        return;
      }

      if (!e) return;

      if (e.isLocal) {
        // Update pushed successfully, remove it from updatingQueue
        delete window.plugin.aurora.updatingQueue[e.property];
      } else {
        // Remote update
        delete window.plugin.aurora.updateQueue[e.property];
        window.plugin.aurora.storeLocal('updateQueue');
        window.plugin.aurora.updateCheckedAndHighlight(e.property);
      }
    }
  };

  // Syncing of the field is initialed, upload all queued update
  window.plugin.aurora.syncInitialed = function (pluginName, fieldName) {
    if (fieldName === 'glyphed') {
      window.plugin.aurora.enableSync = true;

      if (Object.keys(window.plugin.aurora.updateQueue).length > 0) {
        window.plugin.aurora.syncQueue();
      }
    }
  };

  window.plugin.aurora.storeLocal = function (name) {
    var key = window.plugin.aurora.FIELDS[name];
    if (key === undefined) return;

    var value = window.plugin.aurora[name];

    if (typeof value !== 'undefined' && value !== null) {
      localStorage[key] = JSON.stringify(window.plugin.aurora[name]);
    } else {
      localStorage.removeItem(key);
    }
  };

  window.plugin.aurora.loadLocal = function (name) {
    var key = window.plugin.aurora.FIELDS[name];
    if (key === undefined) return;

    if (localStorage[key] !== undefined) {
      window.plugin.aurora[name] = JSON.parse(localStorage[key]);
    }
  };

  /**
   * HIGHLIGHTER
   */
  window.plugin.aurora.highlighter = {
    highlight: function (data) {
      var guid = data.portal.options.ent[0];
      var glyphInfo = window.plugin.aurora.glyphed[guid];

      var style = {};

      if (glyphInfo) {
        var total = 0;

        if (glyphInfo.glyphed & glyph[1]) total += 1;
        if (glyphInfo.glyphed & glyph[2]) total += 1;
        if (glyphInfo.glyphed & glyph[3]) total += 1;
        if (glyphInfo.glyphed & glyph[4]) total += 1;
        if (glyphInfo.glyphed & glyph[5]) total += 1;

        switch (total) {
          case 0:
            style.fillColor = 'red';
            style.fillOpacity = 0.7;
            break;
          case 1:
            style.fillColor = 'coral';
            style.fillOpacity = 0.7;
            break;
          case 2:
            style.fillColor = 'orange';
            style.fillOpacity = 0.7;
            break;
          case 3:
            style.fillColor = 'yellow';
            style.fillOpacity = 0.6;
            break;
          case 4:
            style.fillColor = 'chartreuse';
            style.fillOpacity = 0.6;
            break;
          case 5:
            // glyphed all - no highlights
            break;
        }
      } else {
        // no glyph data at all
        style.fillColor = 'red';
        style.fillOpacity = 0.7;
      }

      data.portal.setStyle(style);
    },

    setSelected: function (active) {
      window.plugin.aurora.isHighlightActive = active;
    }
  };

  window.plugin.aurora.setupCSS = function () {
    $('<style>')
      .prop('type', 'text/css')
      .html('#aurora-container {'
          + 'display: block;'
          + 'text-align: center;'
          + 'margin: 6px 3px 1px 3px;'
          + 'padding: 0 4px;}'
        + '.aurora-container label {'
          + 'white-space: nowrap;'
          + 'margin: 0 0.3em;}'
        + '.aurora-container input {'
          + 'vertical-align: middle;}'
        + '#aurora-portals {'
          + 'border-collapse: collapse;'
          + 'empty-cells: show;'
          + 'width: 100%;}'
        + '#aurora-portals th, #aurora-portals td {'
          + 'padding: 3px; color: white;'
          + ' background-color: #1b415e;'
          + ' border-bottom: 1px solid #0b314e;}')
      .appendTo('head');
  };

  window.plugin.aurora.setupContent = function () {
    window.plugin.aurora.contentHTML = '<div class="aurora-container" id="aurora-container">Aurora '
      + '<label><input type="checkbox" id="glyph_1" onclick="window.plugin.aurora.updateGlyphed($(this).prop(\'checked\'), 1)"> 1</label>'
      + '<label><input type="checkbox" id="glyph_2" onclick="window.plugin.aurora.updateGlyphed($(this).prop(\'checked\'), 2)"> 2</label>'
      + '<label><input type="checkbox" id="glyph_3" onclick="window.plugin.aurora.updateGlyphed($(this).prop(\'checked\'), 3)"> 3</label>'
      + '<label><input type="checkbox" id="glyph_4" onclick="window.plugin.aurora.updateGlyphed($(this).prop(\'checked\'), 4)"> 4</label>'
      + '<label><input type="checkbox" id="glyph_5" onclick="window.plugin.aurora.updateGlyphed($(this).prop(\'checked\'), 5)"> 5</label>'
      + '</div>';

    window.plugin.aurora.disabledMessage = '<div id="aurora-container" class="help" title="Your browser does not support localStorage">Plugin Aurora disabled</div>';

    $("#toolbox").append('<a onclick="window.plugin.aurora.showList();" title="Show portals for Aurora Glyph Hack Challenge">Aurora portals</a>');
  };

  window.plugin.aurora.isPortalInPolygon = function (portal, latLngsObjectsArray) {
    var portalCoords = portal.split(',');

    var x = portalCoords[0];
    var y = portalCoords[1];

    var inside = false;

    for (var i = 0, j = latLngsObjectsArray.length - 1; i < latLngsObjectsArray.length; j = i++) {
      var xi = latLngsObjectsArray[i].lat, yi = latLngsObjectsArray[i].lng;
      var xj = latLngsObjectsArray[j].lat, yj = latLngsObjectsArray[j].lng;

      var intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }

    return inside;
  };

  window.plugin.aurora.getList = function () {
    var drawLayer = null;
    var list = [];

    if (localStorage['plugin-draw-tools-layer']) {
      drawLayer = JSON.parse(localStorage['plugin-draw-tools-layer']);
    }

    var portals = window.portals;

    portalLoop: for (var i in portals) {
      if (!portals.hasOwnProperty(i)) continue;

      var p = window.portals[i];
      var name = p.options.data.title;
      var guid = p.options.guid;
      var latlng = p._latlng.lat + ',' + p._latlng.lng;

      if (drawLayer) {
        for (var dl in drawLayer) {
          if (drawLayer[dl].type === 'polygon') {
            if (!window.plugin.aurora.isPortalInPolygon(latlng, drawLayer[dl].latLngs)) continue portalLoop;
          }
        }
      }

      var b = window.map.getBounds();
      // skip if not currently visible
      if (p._latlng.lat < b._southWest.lat || p._latlng.lng < b._southWest.lng || p._latlng.lat > b._northEast.lat || p._latlng.lng > b._northEast.lng) continue;

      var lat = latlng.split(',')[0];
      var lng = latlng.split(',')[1];

      list.push({
        title: name,
        guid: guid,
        latlng: latlng
      });
    }

    return list.sort(function (a, b) {
      if (a.title > b.title) return 1;
      if (a.title < b.title) return -1;
      return 0;
    });
  };

  window.plugin.aurora.countTotal = function () {
    var data = window.plugin.aurora.glyphed;
    var total = 0;

    for (var guid in data) {
      var glyphed = data[guid].glyphed;

      if (glyphed & glyph[1]) total += 1;
      if (glyphed & glyph[2]) total += 1;
      if (glyphed & glyph[3]) total += 1;
      if (glyphed & glyph[4]) total += 1;
      if (glyphed & glyph[5]) total += 1;
    }

    return total;
  };

  window.plugin.aurora.showList = function () {
    var portals = window.plugin.aurora.getList();

    var html = '<table class="aurora-container" id="aurora-portals"><thead>';
    html += '</thead><tbody>';
    html += '<tr><th>#</th><th>Portal Name</th>'
      + '<th><label><input type="checkbox" class="glyph_all" value="1"> 1</label></th>'
      + '<th><label><input type="checkbox" class="glyph_all" value="2"> 2</label></th>'
      + '<th><label><input type="checkbox" class="glyph_all" value="3"> 3</label></th>'
      + '<th><label><input type="checkbox" class="glyph_all" value="4"> 4</label></th>'
      + '<th><label><input type="checkbox" class="glyph_all" value="5"> 5</label></th></tr>';

    for (var i = 0; i < portals.length; i++) {
      var guid = portals[i].guid;
      var glyphInfo = window.plugin.aurora.glyphed[guid];
      var data = glyphInfo ? glyphInfo.glyphed : 0;

      html += '<tr><td>' + (i + 1) + '</td>'
        + '<td><a href="https://www.ingress.com/intel?ll=' + portals[i].latlng + '&amp;z=17&amp;pll=' + portals[i].latlng + '">' + portals[i].title + '</a></td>'
        + '<td><label><input type="checkbox" class="glyph_1" data-guid="' + guid + '" onclick="window.plugin.aurora.updateGlyphed($(this).prop(\'checked\'), 1, \'' + guid + '\')"' + (data & glyph[1] ? ' checked' : '') + '> 1</label></td>'
        + '<td><label><input type="checkbox" class="glyph_2" data-guid="' + guid + '" onclick="window.plugin.aurora.updateGlyphed($(this).prop(\'checked\'), 2, \'' + guid + '\')"' + (data & glyph[2] ? ' checked' : '') + '> 2</label></td>'
        + '<td><label><input type="checkbox" class="glyph_3" data-guid="' + guid + '" onclick="window.plugin.aurora.updateGlyphed($(this).prop(\'checked\'), 3, \'' + guid + '\')"' + (data & glyph[3] ? ' checked' : '') + '> 3</label></td>'
        + '<td><label><input type="checkbox" class="glyph_4" data-guid="' + guid + '" onclick="window.plugin.aurora.updateGlyphed($(this).prop(\'checked\'), 4, \'' + guid + '\')"' + (data & glyph[4] ? ' checked' : '') + '> 4</label></td>'
        + '<td><label><input type="checkbox" class="glyph_5" data-guid="' + guid + '" onclick="window.plugin.aurora.updateGlyphed($(this).prop(\'checked\'), 5, \'' + guid + '\')"' + (data & glyph[5] ? ' checked' : '') + '> 5</label></td></tr>';
    }

    html += '</tbody></table>';

    var dialog = window.dialog({
      id: 'aurora-dialog',
      title: window.plugin.aurora.getModalTitle(),
      dialogClass: 'ui-dialog-aurora',
      html: html,
      width: 500
    });

    window.plugin.aurora.toggleAll();
  };

  window.plugin.aurora.toggleAll = function (val) {
    if (typeof val === 'undefined') {
      val = [1, 2, 3, 4, 5];
    } else {
      val = [val];
    }

    val.forEach(function (value) {
      $('input.glyph_all[value="' + value + '"]').prop('checked', $('input.glyph_' + value).length === $('input.glyph_' + value + ':checked').length);
    });
  };

  window.plugin.aurora.getModalTitle = function () {
    return 'Aurora Portals (Total ' + window.plugin.aurora.countTotal() + ' points)';
  };

  var setup = function () {
    window.plugin.aurora.setupCSS();
    window.plugin.aurora.setupContent();
    window.plugin.aurora.loadLocal('glyphed');
    window.addPortalHighlighter('Aurora', window.plugin.aurora.highlighter);
    window.addHook('portalDetailsUpdated', window.plugin.aurora.onPortalDetailsUpdated);
    window.addHook('iitcLoaded', window.plugin.aurora.registerFieldForSyncing);

    $('body').on('change', '.glyph_all', function () {
      var val = $(this).val();
      if ($(this).prop('checked')) {
        $('.glyph_' + val + ':not(:checked)').trigger('click');
      } else {
        $('.glyph_' + val + ':checked').trigger('click');
      }
    });
  };
  // PLUGIN END //////////////////////////////////////////////////////////

  // Add the script info data to the function as a property
  setup.info = plugin_info;
  if (!window.bootPlugins) window.bootPlugins = [];
  window.bootPlugins.push(setup);

  // If IITC has already booted, immediately run the 'setup' function
  if (window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end

// Inject code into site context
var script = document.createElement('script');
var info = {};

if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
  info.script = {
    version: GM_info.script.version,
    name: GM_info.script.name,
    description: GM_info.script.description
  };
}

script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
(document.body || document.head || document.documentElement).appendChild(script);
