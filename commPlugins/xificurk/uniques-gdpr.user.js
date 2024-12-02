// ==UserScript==
// @author          xificurk
// @id              uniques-gdpr@xificurk
// @name            show uniques visit/captures based on GDPR game_log
// @category        Misc
// @version         0.1.0.20201122.121942
// @namespace       https://github.com/xificurk/iitc-plugins
// @updateURL       https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/xificurk/uniques-gdpr.meta.js
// @downloadURL     https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/xificurk/uniques-gdpr.user.js
// @description     [xificurk-2020-11-22-121942] Show uniques visit/captures based on GDPR game_log
// @issueTracker    https://github.com/xificurk/iitc-plugins/issues
// @homepageURL     https://github.com/xificurk/iitc-plugins
// @include         https://intel.ingress.com/*
// @include         http://intel.ingress.com/*
// @include         https://*.ingress.com/intel*
// @include         http://*.ingress.com/intel*
// @include         https://*.ingress.com/mission/*
// @include         http://*.ingress.com/mission/*
// @match           https://intel.ingress.com/*
// @match           http://intel.ingress.com/*
// @match           https://*.ingress.com/intel*
// @match           http://*.ingress.com/intel*
// @match           https://*.ingress.com/mission/*
// @match           http://*.ingress.com/mission/*
// @grant           none
// ==/UserScript==



function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'xificurk';
plugin_info.dateTimeVersion = '20201122.121942';
plugin_info.pluginId = 'uniques-gdpr';
//END PLUGIN AUTHORS NOTE


//PLUGIN START ////////////////////////////////////////////////////////

window.plugin.uniquesGdpr = function() {
};

window.plugin.uniquesGdpr.UNMATCHED_UNIQUES_LAYER_MIN_ZOOM = 15;

window.plugin.uniquesGdpr.getPortalsInView = function() {
  var portalsInView = {};
  var mapBounds = map.getBounds();
  $.each(window.portals, function(guid, portal) {
    if(mapBounds.contains(portal.getLatLng())) {
      portalsInView[guid] = portal;
    }
  });
  return portalsInView;
};

window.plugin.uniquesGdpr.getTextStatus = function(state) {
  if(state) {
    if(state.captured) {
      return 'CAPTURED';
    }
    if (state.visited) {
      return 'VISITED';
    }
  }
  return '-';
};


// Local storage
window.plugin.uniquesGdpr.FIELDS = {
  'uniques': 'plugin-uniques-gdpr-data'
};

window.plugin.uniquesGdpr.uniques = {};

window.plugin.uniquesGdpr.storeLocal = function(name) {
  var key = window.plugin.uniquesGdpr.FIELDS[name];
  if(key === undefined) {
    return;
  }

  var value = plugin.uniquesGdpr[name];

  if(typeof value !== 'undefined' && value !== null) {
    localStorage[key] = JSON.stringify(plugin.uniquesGdpr[name]);
  } else {
    localStorage.removeItem(key);
  }
};

window.plugin.uniquesGdpr.loadLocal = function(name) {
  var key = window.plugin.uniquesGdpr.FIELDS[name];
  if(key === undefined) {
    return;
  }

  if(localStorage[key] !== undefined) {
    plugin.uniquesGdpr[name] = JSON.parse(localStorage[key]);
  }
};


// Game log import
window.plugin.uniquesGdpr.import = function() {
  window.plugin.uniquesGdpr.uniques = {};
  var gameLog = $('#uniquesGdprGameLogImport').val().trim().split("\n");
  for(var i = 0; i < gameLog.length; i++) {
    var line = gameLog[i].trim().split("\t");
    var point = line[0] + "," + line[1];
    window.plugin.uniquesGdpr.uniques[point] = {
      visited: line[2] === 'CAPTURED' || line[2] === 'VISITED',
      captured: line[2] === 'CAPTURED',
      lat: line[0] / 1E6,
      lon: line[1] / 1E6
    };
  }
  window.plugin.uniquesGdpr.storeLocal('uniques');

  // Redraw
  window.changePortalHighlights($('#portal_highlight_select').val());
  window.plugin.uniquesGdpr.delayedUpdateUnmatchedUniquesLayer(0.1);

  window.alert(gameLog.length + " items from game_log imported.");
};

window.plugin.uniquesGdpr.openImportDialog = function() {
  var html = '<span>Paste the output of geme_log_parser.py:</span>'
    + '<textarea id="uniquesGdprGameLogImport" style="width: 100%; height: 300px; margin-top: 5px;"></textarea>';

  window.dialog({
    html: html,
    title: 'Import filtered game_log',
    buttons: {
      'OK': function() {
        window.plugin.uniquesGdpr.import();
        $(this).dialog('close');
      }
    }
  });
};


// Compare with uniques
window.plugin.uniquesGdpr.compareWithUniques = function() {
  var data = [];
  $.each(window.plugin.uniquesGdpr.getPortalsInView(), function(guid, portal) {
    var point = portal.options.data.latE6 + ',' + portal.options.data.lngE6;
    var gdprStatus = window.plugin.uniquesGdpr.getTextStatus(window.plugin.uniquesGdpr.uniques[point]);
    var uniqueStatus = window.plugin.uniquesGdpr.getTextStatus(window.plugin.uniques.uniques[guid]);
    if(uniqueStatus !== gdprStatus) {
      data.push([uniqueStatus, gdprStatus, guid]);
    }
  });
  data.sort();

  var html = '';
  $.each(data, function(i, row) {
    var uniqueStatus = row[0];
    var gdprStatus = row[1];
    var guid = row[2];
    var portal = window.portals[guid];
    var portalLink = $('<a href="javascript:renderPortalDetails(\'' + guid + '\');">').text(portal.options.data.title || '[Unknown title]');
    html += '<tr><td style="white-space: nowrap;overflow: hidden;text-overflow: ellipsis;">' + portalLink.get(0).outerHTML + '</td><td>' + uniqueStatus + '</td><td>' + gdprStatus + '</td></tr>'
  });

  html = '<table style="width: 100%"><tr><th>Portal</th><th>Uniques</th><th>GDPR</th></tr>' + html + '</table>';

  window.dialog({
    html: html,
    title: 'GDPR data compared to uniques',
    width: 400
  });
};


// Merge with uniques
window.plugin.uniquesGdpr.mergeWithUniques = function() {
  var changes = [];
  $.each(window.plugin.uniquesGdpr.getPortalsInView(), function(guid, portal) {
    var point = portal.options.data.latE6 + ',' + portal.options.data.lngE6;
    var gdprInfo = window.plugin.uniquesGdpr.uniques[point];
    if (!gdprInfo || !gdprInfo.visited) {
      return;
    }

    if (!window.plugin.uniques.uniques[guid]) {
      window.plugin.uniques.uniques[guid] = {visited: false, captured: false};
    }
    var uniqueInfo = window.plugin.uniques.uniques[guid];

    if (gdprInfo.captured) {
      if (uniqueInfo.captured) {
        return;
      }
      changes.push([window.plugin.uniquesGdpr.getTextStatus(uniqueInfo), 'CAPTURED', guid]);
      window.plugin.uniques.uniques[guid].captured = true;
      window.plugin.uniques.uniques[guid].visited = true;

    } else if (!uniqueInfo.visited) {
      changes.push([window.plugin.uniquesGdpr.getTextStatus(uniqueInfo), 'VISITED', guid]);
      window.plugin.uniques.uniques[guid].visited = true;
    }
  });
  changes.sort();
  
  window.plugin.uniques.storeLocal('uniques');

  if(window.plugin.sync) {
    window.plugin.sync.updateMap('uniques', 'uniques', Object.keys(window.plugin.uniques.uniques));
  }

  // Redraw
  window.changePortalHighlights($('#portal_highlight_select').val());

  var html = '';
  $.each(changes, function(i, row) {
    var originalStatus = row[0];
    var newStatus = row[1];
    var guid = row[2];
    var portal = window.portals[guid];
    var portalLink = $('<a href="javascript:renderPortalDetails(\'' + guid + '\');">').text(portal.options.data.title || '[Unknown title]');
    html += '<tr><td style="white-space: nowrap;overflow: hidden;text-overflow: ellipsis;">' + portalLink.get(0).outerHTML + '</td><td>' + originalStatus + '</td><td>' + newStatus + '</td></tr>'
  });

  html = '<table style="width: 100%"><tr><th>Portal</th><th>Old status</th><th>New status</th></tr>' + html + '</table>';

  window.dialog({
    html: html,
    title: 'Performed changes to uniques data',
    width: 400
  });
};


// Menu
window.plugin.uniquesGdpr.openMenuDialog = function() {
  var html = '<button style="margin: 5px; padding: 5px;" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" onclick="window.plugin.uniquesGdpr.openImportDialog();"><span class="ui-button-text">Import game_log</span></button><br>';

  if(window.plugin.uniques) {
    html += '<button style="margin: 5px; padding: 5px;" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" onclick="window.plugin.uniquesGdpr.compareWithUniques();" title="Compare visit/capture data from GDPR package with uniques info for all portals in view"><span class="ui-button-text">Compare GDPR data with uniques</span></button><br>';
    html += '<button style="margin: 5px; padding: 5px;" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" onclick="window.plugin.uniquesGdpr.mergeWithUniques();" title="Merge visit/capture data from GDPR package into uniques for all portals in view"><span class="ui-button-text">Merge GDPR data with uniques</span></button><br>';
  }

  html = '<div style="text-align: center">' + html + '</div>';

  window.dialog({
    html: html,
    title: 'GDPR uniques'
  });
};


// Highlighter
window.plugin.uniquesGdpr.highlighter = {
  highlight: function(data) {
    var point = data.portal.options.data.latE6 + ',' + data.portal.options.data.lngE6;
    var uniqueInfo = window.plugin.uniquesGdpr.uniques[point];

    var style = {};

    if(uniqueInfo) {
      if(uniqueInfo.captured) {
        // captured (and, implied, visited too) - no highlights

      } else if(uniqueInfo.visited) {
        style.fillColor = 'yellow';
        style.fillOpacity = 0.6;
      } else {
        // we have an 'uniqueInfo' entry for the portal, but it's not set visited or captured?
        // could be used to flag a portal you don't plan to visit, so use a less opaque red
        style.fillColor = 'red';
        style.fillOpacity = 0.5;
      }
    } else {
      // no visit data at all
      style.fillColor = 'red';
      style.fillOpacity = 0.7;
    }

    data.portal.setStyle(style);
  }
};


// Unmatched uniques layers
window.plugin.uniquesGdpr.getUnmatchedUniqueMarkerStyle = function(layer) {
  var scale = window.portalMarkerScale();

  var options = {
    fill: false,
    stroke: true,
    weight: 3 * Math.sqrt(scale),
    opacity: 1
  };

  if(layer === window.plugin.uniquesGdpr.unmatchedCapturedLayer) {
    options['color'] = 'black';
    options['radius'] = 5 * scale;
  } else {
    options['color'] = 'fuchsia';
    options['radius'] = 7 * scale;
  }

  return options;
};

window.plugin.uniquesGdpr.getUnmatchedUniques = function(onlyVisited, onlyCaptured) {
  var result = [];
  var mapBounds = window.map.getBounds();
  for(var point in window.plugin.uniquesGdpr.uniques) {
    var unique = window.plugin.uniquesGdpr.uniques[point];
    if((onlyVisited && unique.captured) || (onlyCaptured && !unique.captured)) {
      continue;
    }

    var position = L.latLng(unique.lat, unique.lon);
    if(!mapBounds.contains(position)) {
      continue;
    }

    var isMatched = false;
    for(var guid in window.portals) {
      var portal = window.portals[guid];
      if(point === portal.options.data.latE6 + ',' + portal.options.data.lngE6) {
        isMatched = true;
        break;
      }
    }

    if(!isMatched) {
      result.push(unique);
    }
  }
  return result;
};

window.plugin.uniquesGdpr.updateUnmatchedUniquesLayer = function(layer) {
  // as this is called every time layers are toggled, there's no point in doing it when the layer is off
  if(!map.hasLayer(layer)) {
    return;
  }

  layer.clearLayers();
  if(map.getZoom() < window.plugin.uniquesGdpr.UNMATCHED_UNIQUES_LAYER_MIN_ZOOM) {
    return;
  }

  var markerOptions = window.plugin.uniquesGdpr.getUnmatchedUniqueMarkerStyle(layer);
  var uniques = window.plugin.uniquesGdpr.getUnmatchedUniques(layer === window.plugin.uniquesGdpr.unmatchedVisitedLayer, layer === window.plugin.uniquesGdpr.unmatchedCapturedLayer);

  for(var i = 0; i < uniques.length; i++) {
    var unique = uniques[i];
    var position = L.latLng(unique.lat, unique.lon);
    var marker = L.circleMarker(position, markerOptions);
    layer.addLayer(marker);
  }
};

window.plugin.uniquesGdpr.delayedUpdateUnmatchedUniquesLayer = function(wait) {
  if(window.plugin.uniquesGdpr.timer === undefined) {
    window.plugin.uniquesGdpr.timer = setTimeout(function() {
      window.plugin.uniquesGdpr.timer = undefined;
      window.plugin.uniquesGdpr.updateUnmatchedUniquesLayer(window.plugin.uniquesGdpr.unmatchedVisitedLayer);
      window.plugin.uniquesGdpr.updateUnmatchedUniquesLayer(window.plugin.uniquesGdpr.unmatchedCapturedLayer);
    }, wait * 1000);
  }
};


var setup = function() {
  window.plugin.uniquesGdpr.loadLocal('uniques');
  window.addPortalHighlighter('Uniques (GDPR)', window.plugin.uniquesGdpr.highlighter);
  $('#toolbox').append('<a onclick="window.plugin.uniquesGdpr.openMenuDialog();">Uniques from GDPR</a>');

  window.plugin.uniquesGdpr.unmatchedVisitedLayer = L.layerGroup();
  window.addLayerGroup('Unmatched visited portals from GDPR', window.plugin.uniquesGdpr.unmatchedVisitedLayer, false);

  window.plugin.uniquesGdpr.unmatchedCapturedLayer = L.layerGroup();
  window.addLayerGroup('Unmatched captured portals from GDPR', window.plugin.uniquesGdpr.unmatchedCapturedLayer, false);

  window.addHook('mapDataRefreshEnd', function() {
    window.plugin.uniquesGdpr.delayedUpdateUnmatchedUniquesLayer(0.5);
  });
  window.map.on('overlayadd overlayremove', function() {
    window.plugin.uniquesGdpr.delayedUpdateUnmatchedUniquesLayer(1.0);
  });
};

//PLUGIN END //////////////////////////////////////////////////////////


setup.info = plugin_info; //add the script info data to the function as a property
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);


