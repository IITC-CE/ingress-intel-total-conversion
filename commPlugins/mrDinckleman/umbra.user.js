// ==UserScript==
// @author         mrDinckleman
// @id             umbra@mrDinckleman
// @name           Umbra Deploy Challenge
// @category       Misc
// @version        0.1.1.20191224.211839
// @description    [2019-12-24-211839] Allow manual entry of portals deployed during Umbra Deploy Challenge. Use the 'highlighter-umbra' plugin to show the portals on the map, and 'sync' to share between multiple browsers or desktop/mobile.
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/mrDinckleman/umbra.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/mrDinckleman/umbra.user.js
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
  var pluginName = 'umbra';

  // Use own namespace for plugin
  window.plugin[pluginName] = function () {};

  // Delay in ms
  window.plugin[pluginName].SYNC_DELAY = 5000;

  // Maps the JS property names to localStorage keys
  window.plugin[pluginName].FIELDS = {
    'deployed': 'plugin-' + pluginName + '-data',
    'updateQueue': 'plugin-' + pluginName + '-data-queue',
    'updatingQueue': 'plugin-' + pluginName + '-data-updating-queue'
  };

  window.plugin[pluginName].deployed = {};
  window.plugin[pluginName].updateQueue = {};
  window.plugin[pluginName].updatingQueue = {};

  window.plugin[pluginName].enableSync = false;

  window.plugin[pluginName].disabledMessage = null;
  window.plugin[pluginName].contentHTML = null;

  window.plugin[pluginName].isHighlightActive = false;

  window.plugin[pluginName].onPortalDetailsUpdated = function () {
    var $preview = $('#portaldetails > .imgpreview');

    if (typeof(Storage) === 'undefined') {
      $preview.after(window.plugin[pluginName].disabledMessage);
      return;
    }

    var guid = window.selectedPortal;

    $preview.after(window.plugin[pluginName].contentHTML);
    window.plugin[pluginName].updateCheckedAndHighlight(guid);
  };

  window.plugin[pluginName].updateCheckedAndHighlight = function (guid) {
    if (guid === window.selectedPortal) {
      var deployCount = window.plugin[pluginName].deployed[guid] || 0;

      $('#umbra-deploy').val(deployCount);
    }

    if (window.plugin[pluginName].isHighlightActive) {
      if (window.portals[guid]) {
        window.setMarkerStyle(window.portals[guid], guid === window.selectedPortal);
      }
    }
  };

  window.plugin[pluginName].updateDeployed = function (count, guid) {
    if (typeof guid === 'undefined') guid = window.selectedPortal;
    count = parseInt(count, 10);

    var deployCount = window.plugin[pluginName].deployed[guid] || 0;

    if (!deployCount) {
      window.plugin[pluginName].deployed[guid] = deployCount = 0;
    }

    // Nothing changed
    if (count === deployCount) return;

    window.plugin[pluginName].deployed[guid] = count;

    window.plugin[pluginName].updateCheckedAndHighlight(guid);
    window.plugin[pluginName].sync(guid);

    $('select.umbra-deploy[data-guid="' + guid + '"]').val(count);
    $('#dialog-' + pluginName + '-dialog').prev().find('.ui-dialog-title').text(window.plugin[pluginName].getModalTitle());
  };

  // Stores the given GUID for sync
  window.plugin[pluginName].sync = function (guid) {
    window.plugin[pluginName].updateQueue[guid] = true;
    window.plugin[pluginName].storeLocal('deployed');
    window.plugin[pluginName].storeLocal('updateQueue');
    window.plugin[pluginName].syncQueue();
  };

  // Sync the queue, but delay the actual sync to group a few updates in a single request
  window.plugin[pluginName].syncQueue = function () {
    if (!window.plugin[pluginName].enableSync) return;

    clearTimeout(window.plugin[pluginName].syncTimer);

    window.plugin[pluginName].syncTimer = setTimeout(function () {
      window.plugin[pluginName].syncTimer = null;

      $.extend(window.plugin[pluginName].updatingQueue, window.plugin[pluginName].updateQueue);
      window.plugin[pluginName].updateQueue = {};
      window.plugin[pluginName].storeLocal('updatingQueue');
      window.plugin[pluginName].storeLocal('updateQueue');

      window.plugin.sync.updateMap('umbra', 'deployed', Object.keys(window.plugin[pluginName].updatingQueue));
    }, window.plugin[pluginName].SYNC_DELAY);
  };

  // Call after IITC and all plugin loaded
  window.plugin[pluginName].registerFieldForSyncing = function () {
    if (!window.plugin.sync) return;

    window.plugin.sync.registerMapForSync(
      'umbra',
      'deployed',
      window.plugin[pluginName].syncCallback,
      window.plugin[pluginName].syncInitialed
    );
  };

  // Call after local or remote change uploaded
  window.plugin[pluginName].syncCallback = function (inPluginName, fieldName, e, fullUpdated) {
    if (fieldName === 'deployed') {
      window.plugin[pluginName].storeLocal('deployed');

      // All data is replaced if other client update the data during this client offline
      if (fullUpdated) {
        // A full update - update the selected portal sidebar
        if (window.selectedPortal) {
          window.plugin[pluginName].updateCheckedAndHighlight(window.selectedPortal);
        }

        // And also update all highlights, if needed
        if (window.plugin[pluginName].isHighlightActive) {
          window.resetHighlightedPortals();
        }

        return;
      }

      if (!e) return;

      if (e.isLocal) {
        // Update pushed successfully, remove it from updatingQueue
        delete window.plugin[pluginName].updatingQueue[e.property];
      } else {
        // Remote update
        delete window.plugin[pluginName].updateQueue[e.property];
        window.plugin[pluginName].storeLocal('updateQueue');
        window.plugin[pluginName].updateCheckedAndHighlight(e.property);
      }
    }
  };

  // Syncing of the field is initialed, upload all queued update
  window.plugin[pluginName].syncInitialed = function (inPluginName, fieldName) {
    if (fieldName === 'deployed') {
      window.plugin[pluginName].enableSync = true;

      if (Object.keys(window.plugin[pluginName].updateQueue).length > 0) {
        window.plugin[pluginName].syncQueue();
      }
    }
  };

  window.plugin[pluginName].storeLocal = function (name) {
    var key = window.plugin[pluginName].FIELDS[name];
    if (key === undefined) return;

    var value = window.plugin[pluginName][name];

    if (typeof value !== 'undefined' && value !== null) {
      localStorage[key] = JSON.stringify(window.plugin[pluginName][name]);
    } else {
      localStorage.removeItem(key);
    }
  };

  window.plugin[pluginName].loadLocal = function (name) {
    var key = window.plugin[pluginName].FIELDS[name];
    if (key === undefined) return;

    if (localStorage[key] !== undefined) {
      window.plugin[pluginName][name] = JSON.parse(localStorage[key]);
    }
  };

  /**
   * HIGHLIGHTER
   */
  window.plugin[pluginName].highlighter = {
    highlight: function (data) {
      var guid = data.portal.options.ent[0];
      var deployCount = window.plugin[pluginName].deployed[guid] || 0;

      var style = {};

      switch (deployCount) {
        case 0:
          style.fillColor = hsl(0); // hsl(0,100%,50%)
          style.fillOpacity = 0.7;
          break;
        case 1:
          style.fillColor = hsl(1);
          style.fillOpacity = 0.7;
          break;
        case 2:
          style.fillColor = hsl(1.5);
          style.fillOpacity = 0.7;
          break;
        case 3:
          style.fillColor = hsl(2);
          style.fillOpacity = 0.7;
          break;
        case 4:
          style.fillColor = hsl(2.5);
          style.fillOpacity = 0.6;
          break;
        case 5:
          style.fillColor = hsl(3);
          style.fillOpacity = 0.6;
          break;
        case 6:
          style.fillColor = hsl(4);
          style.fillOpacity = 0.6;
          break;
        case 7:
          style.fillColor = hsl(6);
          style.fillOpacity = 0.8;
          break;
        case 8:
          // fully deployed - no highlights
          break;
      }

      data.portal.setStyle(style);

      function hsl(index) { // from 0 to 8
        return 'hsl(' + (index / 8 * 120) + ', 100%, ' + (50 - index / 8 * 25) + '%)';
      }
    },

    setSelected: function (active) {
      window.plugin[pluginName].isHighlightActive = active;
    }
  };

  window.plugin[pluginName].setupCSS = function () {
    $('<style>')
      .prop('type', 'text/css')
      .html('#' + pluginName + '-container {'
        + 'display: block;'
        + 'text-align: center;'
        + 'margin: 6px 3px 1px 3px;'
        + 'padding: 0 4px;}'
        + '.' + pluginName + '-container label {'
        + 'white-space: nowrap;'
        + 'margin: 0 0.3em;}'
        + '.' + pluginName + '-container select {'
        + 'vertical-align: middle;}'
        + '#' + pluginName + '-portals {'
        + 'border-collapse: collapse;'
        + 'empty-cells: show;'
        + 'width: 100%;}'
        + '#' + pluginName + '-portals th, #' + pluginName + '-portals td {'
        + 'padding: 3px; color: white;'
        + ' background-color: #1b415e;'
        + ' border-bottom: 1px solid #0b314e;}')
      .appendTo('head');
  };

  window.plugin[pluginName].setupContent = function () {
    window.plugin[pluginName].contentHTML = '<div class="' + pluginName + '-container" id="' + pluginName + '-container">Umbra '
      + '<select id="' + pluginName + '-deploy" onchange="window.plugin.' + pluginName + '.updateDeployed($(this).val())">'
      + '<option value="0">0</option>'
      + '<option value="1">1</option>'
      + '<option value="2">2</option>'
      + '<option value="3">3</option>'
      + '<option value="4">4</option>'
      + '<option value="5">5</option>'
      + '<option value="6">6</option>'
      + '<option value="7">7</option>'
      + '<option value="8">8</option>'
      + '</select>'
      + '</div>';

    window.plugin[pluginName].disabledMessage = '<div id="' + pluginName + '-container" class="help" title="Your browser does not support localStorage">Plugin Umbra disabled</div>';

    $("#toolbox").append('<a onclick="window.plugin.' + pluginName + '.showList();" title="Show portals for Umbra Deploy Challenge">Umbra portals</a>');
  };

  window.plugin[pluginName].isPortalInPolygon = function (portal, latLngsObjectsArray) {
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

  window.plugin[pluginName].getList = function () {
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
            if (!window.plugin[pluginName].isPortalInPolygon(latlng, drawLayer[dl].latLngs)) continue portalLoop;
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

  window.plugin[pluginName].countTotal = function () {
    var data = window.plugin[pluginName].deployed;
    var total = 0;

    for (var guid in data) {
      total += (data[guid] || 0);
    }

    return total;
  };

  window.plugin[pluginName].showList = function () {
    var portals = window.plugin[pluginName].getList();

    var html = '<table class="' + pluginName + '-container" id="' + pluginName + '-portals"><thead>';
    html += '</thead><tbody>';
    html += '<tr><th>#</th><th>Portal Name</th>'
      + '<th></th></tr>';

    for (var i = 0; i < portals.length; i++) {
      var guid = portals[i].guid;
      var deployCount = window.plugin[pluginName].deployed[guid] || 0;

      html += '<tr><td>' + (i + 1) + '</td>'
        + '<td><a href="https://www.ingress.com/intel?ll=' + portals[i].latlng + '&amp;z=17&amp;pll=' + portals[i].latlng + '">' + portals[i].title + '</a></td>'
        + '<td><select class="' + pluginName + '-deploy" data-guid="' + guid + '" onchange="window.plugin.' + pluginName + '.updateDeployed($(this).val(), \'' + guid + '\')">'
        + '<option value="0"' + (deployCount == 0 ? ' selected' : '') + '>0</option>'
        + '<option value="1"' + (deployCount == 1 ? ' selected' : '') + '>1</option>'
        + '<option value="2"' + (deployCount == 2 ? ' selected' : '') + '>2</option>'
        + '<option value="3"' + (deployCount == 3 ? ' selected' : '') + '>3</option>'
        + '<option value="4"' + (deployCount == 4 ? ' selected' : '') + '>4</option>'
        + '<option value="5"' + (deployCount == 5 ? ' selected' : '') + '>5</option>'
        + '<option value="6"' + (deployCount == 6 ? ' selected' : '') + '>6</option>'
        + '<option value="7"' + (deployCount == 7 ? ' selected' : '') + '>7</option>'
        + '<option value="8"' + (deployCount == 8 ? ' selected' : '') + '>8</option>'
        + '</select></td></tr>';
    }

    html += '</tbody></table>';

    var dialog = window.dialog({
      id: pluginName + '-dialog',
      title: window.plugin[pluginName].getModalTitle(),
      dialogClass: 'ui-dialog-' + pluginName,
      html: html,
      width: 500
    });
  };

  window.plugin[pluginName].getModalTitle = function () {
    return 'Umbra Portals (Total ' + window.plugin[pluginName].countTotal() + ' points)';
  };

  var setup = function () {
    window.plugin[pluginName].setupCSS();
    window.plugin[pluginName].setupContent();
    window.plugin[pluginName].loadLocal('deployed');
    window.addPortalHighlighter('Umbra', window.plugin[pluginName].highlighter);
    window.addHook('portalDetailsUpdated', window.plugin[pluginName].onPortalDetailsUpdated);
    window.addHook('iitcLoaded', window.plugin[pluginName].registerFieldForSyncing);
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
