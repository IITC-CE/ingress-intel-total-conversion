// @author         3ch01c
// @name           Uniques
// @category       Misc
// @version        0.3.9
// @description    Allow manual entry of portals visited/captured, scouted or droned. Highlighters for all three help to identify new portals. Uniques uses the 'sync'-plugin to share between multiple browsers or desktop/mobile. COMM and portal details are analyzed to fill the fields automatically (but this will not catch every case).

//use own namespace for plugin
window.plugin.uniques = function() {};

//delay in ms
window.plugin.uniques.SYNC_DELAY = 5000;

// maps the JS property names to localStorage keys
window.plugin.uniques.FIELDS = {
  'uniques': 'plugin-uniques-data',
  'updateQueue': 'plugin-uniques-data-queue',
  'updatingQueue': 'plugin-uniques-data-updating-queue',
  'missedLatLngs': 'plugin-uniques-missedLatLngs',
  'parsedMsgs': 'pugin-uniques-parsedMsgs'
};

window.plugin.uniques.uniques = {};
window.plugin.uniques.updateQueue = {};
window.plugin.uniques.updatingQueue = {};
window.plugin.uniques.missedLatLngs = {};
window.plugin.uniques.parsedMsgs = {};

window.plugin.uniques.enableSync = false;

window.plugin.uniques.disabledMessage = null;
window.plugin.uniques.contentHTML = null;

window.plugin.uniques.isHighlightActive = false;

window.plugin.uniques.onPortalDetailsUpdated = function() {
  if(typeof(Storage) === "undefined") {
    $('#portaldetails > .imgpreview').after(plugin.uniques.disabledMessage);
    return;
  }

  var guid = window.selectedPortal,
    details = portalDetail.get(guid),
    nickname = window.PLAYER.nickname;
  if(details) {
    if(details.owner == nickname) {
      //FIXME: a virus flip will set the owner of the portal, but doesn't count as a unique capture
      plugin.uniques.updateCaptured(true);
      // no further logic required
    } else {
      function installedByPlayer(entity) {
        return entity && entity.owner == nickname;
      }

      if(details.resonators.some(installedByPlayer) || details.mods.some(installedByPlayer)) {
        plugin.uniques.updateVisited(true);
      }
    }
  }

  $('#portaldetails > .imgpreview').after(plugin.uniques.contentHTML);
  plugin.uniques.updateCheckedAndHighlight(guid);
}

window.plugin.uniques.onPublicChatDataAvailable = function(data) {
  var nick = window.PLAYER.nickname;
  let match = false;
  data.result.forEach(function(msg) {
    match = false;
    if (!window.plugin.uniques.parsedMsgs[msg[0]]){
      var plext = msg[2].plext,
        markup = plext.markup;

      if(plext.plextType == 'SYSTEM_BROADCAST'
      && markup.length==5
      && markup[0][0] == 'PLAYER'
      && markup[0][1].plain == nick
      && markup[1][0] == 'TEXT'
      && markup[1][1].plain == ' deployed an '
      && markup[2][0] == 'TEXT'
      && markup[3][0] == 'TEXT'
      && markup[3][1].plain == ' Resonator on '
      && markup[4][0] == 'PORTAL') {
        // search for "x deployed an Ly Resonator on z"
        var portal = markup[4][1];
        match = true;
        plugin.uniques.setPortalAction(portal,'visited');
  //    plugin.uniques.setPortalVisited(portal.latE6, portal.lngE6);
      } else if(plext.plextType == 'SYSTEM_BROADCAST'
      && markup.length==3
      && markup[0][0] == 'PLAYER'
      && markup[0][1].plain == nick
      && markup[1][0] == 'TEXT'
      && markup[1][1].plain == ' deployed a Resonator on '
      && markup[2][0] == 'PORTAL') {
        // search for "x deployed a Resonator on z"
        var portal = markup[2][1];
        match = true;
        plugin.uniques.setPortalAction(portal,'visited');
  //    plugin.uniques.setPortalVisited(portal.latE6, portal.lngE6);
      } else if(plext.plextType == 'SYSTEM_BROADCAST'
      && markup.length==3
      && markup[0][0] == 'PLAYER'
      && markup[0][1].plain == nick
      && markup[1][0] == 'TEXT'
      && markup[1][1].plain == ' captured '
      && markup[2][0] == 'PORTAL') {
        // search for "x captured y"
        var portal = markup[2][1];
        match = true;
        plugin.uniques.setPortalAction(portal,'captured');
  //    plugin.uniques.setPortalCaptured(portal.latE6, portal.lngE6);
      } else if(plext.plextType == 'SYSTEM_BROADCAST'
      && markup.length==5
      && markup[0][0] == 'PLAYER'
      && markup[0][1].plain == nick
      && markup[1][0] == 'TEXT'
      && markup[1][1].plain == ' linked '
      && markup[2][0] == 'PORTAL'
      && markup[3][0] == 'TEXT'
      && markup[3][1].plain == ' to '
      && markup[4][0] == 'PORTAL') {
        // search for "x linked y to z"
        var portal = markup[2][1];
        match = true;
        plugin.uniques.setPortalAction(portal,'visited');
  //    plugin.uniques.setPortalVisited(portal.latE6, portal.lngE6);
      } else if(plext.plextType == 'SYSTEM_NARROWCAST'
      && markup.length==6
      && markup[0][0] == 'TEXT'
      && markup[0][1].plain == 'Your '
      && markup[1][0] == 'TEXT'
      && markup[2][0] == 'TEXT'
      && markup[2][1].plain == ' Resonator on '
      && markup[3][0] == 'PORTAL'
      && markup[4][0] == 'TEXT'
      && markup[4][1].plain == ' was destroyed by '
      && markup[5][0] == 'PLAYER') {
        // search for "Your Lx Resonator on y was destroyed by z"
        var portal = markup[3][1];
        match = true;
        plugin.uniques.setPortalAction(portal,'visited');
  //    plugin.uniques.setPortalVisited(portal.latE6, portal.lngE6);
      } else if(plext.plextType == 'SYSTEM_NARROWCAST'
      && markup.length==5
      && markup[0][0] == 'TEXT'
      && markup[0][1].plain == 'Your '
      && markup[1][0] == 'TEXT'
      && markup[2][0] == 'TEXT'
      && markup[2][1].plain == ' Resonator on '
      && markup[3][0] == 'PORTAL'
      && markup[4][0] == 'TEXT'
      && markup[4][1].plain == ' has decayed') {
          // search for "Your Lx Resonator on y has decayed"
        var portal = markup[3][1];
        match = true;
        plugin.uniques.setPortalAction(portal,'visited');
  //    plugin.uniques.setPortalVisited(portal.latE6, portal.lngE6);
      } else if(plext.plextType == 'SYSTEM_NARROWCAST'
      && markup.length==4
      && markup[0][0] == 'TEXT'
      && markup[0][1].plain == 'Your Portal '
      && markup[1][0] == 'PORTAL'
      && markup[2][0] == 'TEXT'
      && (markup[2][1].plain == ' neutralized by ' || markup[2][1].plain == ' is under attack by ')
      && markup[3][0] == 'PLAYER') {
          // search for "Your Portal x neutralized by y"
          // search for "Your Portal x is under attack by y"
        var portal = markup[1][1];
        match = true;
        plugin.uniques.setPortalAction(portal,'visited');
  //    plugin.uniques.setPortalVisited(portal.latE6, portal.lngE6);
      } else if(plext.plextType == 'SYSTEM_NARROWCAST'
        && markup.length==3
        && markup[0][0] == 'TEXT'
        && markup[0][1].plain == 'You claimed Scout Controller on '
        && markup[1][0] == 'PORTAL') {
          // search for "You claimed Scout Controller on "
          var portal = markup[1][1];
          match = true;
          plugin.uniques.setPortalAction(portal,'scouted');
  //      plugin.uniques.setPortalScouted(portal.latE6, portal.lngE6);
      } else if(plext.plextType == 'SYSTEM_NARROWCAST'
        && markup.length==3
        && markup[0][0] == 'TEXT'
        && markup[0][1].plain == 'You were displaced as Scout Controller on '
        && markup[1][0] == 'PORTAL') {
          // search for "You were displaced as Scout Controller on"
          var portal = markup[1][1];
          match = true;
          plugin.uniques.setPortalAction(portal,'scouted');
  //      plugin.uniques.setPortalScouted(portal.latE6, portal.lngE6);
      }
    }
    if (match){
      window.plugin.uniques.parsedMsgs[msg[0]] = msg[1];
      window.plugin.uniques.storeLocal('parsedMsgs');
    }
  });
}

window.plugin.uniques.updateCheckedAndHighlight = function(guid) {
  runHooks('pluginUniquesUpdateUniques', { guid: guid });

  if (guid == window.selectedPortal) {

    var uniqueInfo = plugin.uniques.uniques[guid],
      visited = (uniqueInfo && uniqueInfo.visited) || false,
      captured = (uniqueInfo && uniqueInfo.captured) || false,
      scouted = (uniqueInfo && uniqueInfo.scouted) || false,
      droned = (uniqueInfo && uniqueInfo.droned) || false;
    $('#visited').prop('checked', visited);
    $('#captured').prop('checked', captured);
    $('#scouted').prop('checked', scouted);
    $('#droned').prop('checked', droned);
  }

  if (window.plugin.uniques.isHighlightActive) {
    if (portals[guid]) {
      window.setMarkerStyle (portals[guid], guid == selectedPortal);
    }
  }
}

window.plugin.uniques.setPortalAction = function(portal, action) {
  let latE6 = portal.latE6;
  let lngE6 = portal.lngE6;
  let guid = window.findPortalGuidByPositionE6(latE6, lngE6);
  let id = latE6 + "," + lngE6;

  if (guid) {
    let uniqueInfo = window.plugin.uniques.uniques[guid];
    if (!uniqueInfo) uniqueInfo = {};
        // merge ALL pending actions, then remove from missedLatLngs
    if (window.plugin.uniques.missedLatLngs[id]) {
      Object.assign(uniqueInfo,window.uniques.missedLatLngs[id].action);
//    delete window.plugin.uniques.missedLatLngs[id].action[action];
      // no more actions pending for this portal
//    if  (Object.keys(window.plugin.uniques.missedLatLngs[id].action).length == 0)
      delete window.plugin.uniques.missedLatLngs[id];
      window.plugin.uniques.storeLocal('missedLatLngs');
    }
//    if (!uniqueInfo[action]) { // abort if already set
      uniqueInfo[action] = true;
      // special handling for captured
      if (action === 'captured') uniqueInfo.visited = true;
//    }
    window.plugin.uniques.uniques[guid] = uniqueInfo;
    window.plugin.uniques.storeLocal('uniques');
    // trigger highlighters
    plugin.uniques.updateCheckedAndHighlight(guid);
    // triger sync
    plugin.uniques.sync(guid);
  } else { //guid not found, so add to missedLatLngs
    if (!window.plugin.uniques.missedLatLngs[id])
      window.plugin.uniques.missedLatLngs[id] = {portal:portal,action:{}};
    window.plugin.uniques.missedLatLngs[id].action[action] = true;
    if (action === 'captured') window.plugin.uniques.missedLatLngs[id].action.visited = true;
    window.plugin.uniques.storeLocal('missedLatLngs');
  }
}

window.plugin.uniques.updateVisited = function(visited, guid) {
  if(guid == undefined) guid = window.selectedPortal;

  var uniqueInfo = plugin.uniques.uniques[guid];
  if (!uniqueInfo) {
    plugin.uniques.uniques[guid] = uniqueInfo = {
      visited: false,
      captured: false
    };
  }

  if(visited == uniqueInfo.visited) return;

  if (visited) {
    uniqueInfo.visited = true;
  } else { // not visited --> not captured
    uniqueInfo.visited = false;
    uniqueInfo.captured = false;
  }

  plugin.uniques.updateCheckedAndHighlight(guid);
  plugin.uniques.sync(guid);
}

window.plugin.uniques.updateCaptured = function(captured, guid) {
  if(guid == undefined) guid = window.selectedPortal;

  var uniqueInfo = plugin.uniques.uniques[guid];
  if (!uniqueInfo) {
    plugin.uniques.uniques[guid] = uniqueInfo = {
      visited: false,
      captured: false
    };
  }

  if(captured == uniqueInfo.captured) return;

  if (captured) { // captured --> visited
    uniqueInfo.captured = true;
    uniqueInfo.visited = true;
  } else {
    uniqueInfo.captured = false;
  }

  plugin.uniques.updateCheckedAndHighlight(guid);
  plugin.uniques.sync(guid);
}
// Scouted
window.plugin.uniques.updateScouted = function(scouted, guid) {
  if(guid == undefined) guid = window.selectedPortal;

  var uniqueInfo = plugin.uniques.uniques[guid];
  if (!uniqueInfo) {
    plugin.uniques.uniques[guid] = uniqueInfo = {
      visited: false,
      captured: false,
      scouted: false,
      droned: false
    };
  }

  if(scouted == uniqueInfo.scouted) return;

  if (scouted) {
    uniqueInfo.scouted = true;
//    uniqueInfo.visited = true;
  } else {
    uniqueInfo.scouted = false;
  }

  plugin.uniques.updateCheckedAndHighlight(guid);
  plugin.uniques.sync(guid);
}
// Droned
window.plugin.uniques.updateDroned = function(droned, guid) {
  if(guid == undefined) guid = window.selectedPortal;

  var uniqueInfo = plugin.uniques.uniques[guid];
  if (!uniqueInfo) {
    plugin.uniques.uniques[guid] = uniqueInfo = {
      visited: false,
      captured: false,
      scouted: false,
      droned: false
    };
  }

  if(droned == uniqueInfo.droned) return;

  if (droned) {
    uniqueInfo.droned = true;
//    uniqueInfo.visited = true;
  } else {
    uniqueInfo.droned = false;
  }

  plugin.uniques.updateCheckedAndHighlight(guid);
  plugin.uniques.sync(guid);
}

// stores the gived GUID for sync
plugin.uniques.sync = function(guid) {
  plugin.uniques.updateQueue[guid] = true;
  plugin.uniques.storeLocal('uniques');
  plugin.uniques.storeLocal('updateQueue');
  plugin.uniques.syncQueue();
}

// sync the queue, but delay the actual sync to group a few updates in a single request
window.plugin.uniques.syncQueue = function() {
  if(!plugin.uniques.enableSync) return;

  clearTimeout(plugin.uniques.syncTimer);

  plugin.uniques.syncTimer = setTimeout(function() {
    plugin.uniques.syncTimer = null;

    $.extend(plugin.uniques.updatingQueue, plugin.uniques.updateQueue);
    plugin.uniques.updateQueue = {};
    plugin.uniques.storeLocal('updatingQueue');
    plugin.uniques.storeLocal('updateQueue');

    plugin.sync.updateMap('uniques', 'uniques', Object.keys(plugin.uniques.updatingQueue));
  }, plugin.uniques.SYNC_DELAY);
}

//Call after IITC and all plugin loaded
window.plugin.uniques.registerFieldForSyncing = function() {
  if(!window.plugin.sync) return;
  window.plugin.sync.registerMapForSync('uniques', 'uniques', window.plugin.uniques.syncCallback, window.plugin.uniques.syncInitialed);
}

//Call after local or remote change uploaded
window.plugin.uniques.syncCallback = function(pluginName, fieldName, e, fullUpdated) {
  if(fieldName === 'uniques') {
    plugin.uniques.storeLocal('uniques');
    // All data is replaced if other client update the data during this client
    // offline,
    // fire 'pluginUniquesRefreshAll' to notify a full update
    if(fullUpdated) {
      // a full update - update the selected portal sidebar
      if (window.selectedPortal) {
        plugin.uniques.updateCheckedAndHighlight(window.selectedPortal);
      }
      // and also update all highlights, if needed
      if (window.plugin.uniques.isHighlightActive) {
        resetHighlightedPortals();
      }

      window.runHooks('pluginUniquesRefreshAll');
      return;
    }

    if(!e) return;
    if(e.isLocal) {
      // Update pushed successfully, remove it from updatingQueue
      delete plugin.uniques.updatingQueue[e.property];
    } else {
      // Remote update
      delete plugin.uniques.updateQueue[e.property];
      plugin.uniques.storeLocal('updateQueue');
      plugin.uniques.updateCheckedAndHighlight(e.property);
      window.runHooks('pluginUniquesUpdateUniques', {guid: e.property});
    }
  }
}

//syncing of the field is initialed, upload all queued update
window.plugin.uniques.syncInitialed = function(pluginName, fieldName) {
  if(fieldName === 'uniques') {
    plugin.uniques.enableSync = true;
    if(Object.keys(plugin.uniques.updateQueue).length > 0) {
      plugin.uniques.syncQueue();
    }
  }
}

window.plugin.uniques.storeLocal = function(name) {
  var key = window.plugin.uniques.FIELDS[name];
  if(key === undefined) return;

  var value = plugin.uniques[name];

  if(typeof value !== 'undefined' && value !== null) {
    localStorage[key] = JSON.stringify(plugin.uniques[name]);
  } else {
    localStorage.removeItem(key);
  }
}

window.plugin.uniques.loadLocal = function(name) {
  var key = window.plugin.uniques.FIELDS[name];
  if(key === undefined) return;

  if(localStorage[key] !== undefined) {
    plugin.uniques[name] = JSON.parse(localStorage[key]);
  }
}

/****************************************************************************************/
/** HIGHLIGHTERS ************************************************************************/
/****************************************************************************************/
/*var highlightStyles = {}
highlightstyles.VC = {
  1:{ //set 1
    0:{ // not visited
      fillColor = 'red';
      fillOpacity = 0.7;
    },
    1:{ // visited
      fillColor = 'yellow';
      fillOpacity = 0.6;
    },
    2:{ // captured (& visited)
        // no highlight
    }
  },
  2:{ //set 2
    0:{ // not visited
      fillColor = 'red';
      fillOpacity = 0.7;
    },
    1:{ // visited
      fillColor = 'yellow';
      fillOpacity = 0.6;
    },
    2:{ // captured (& visited)
      fillOpacity = 1.0
      radius = 5;
      weight = 2;
       
    }
  }
  
}
*/  
window.plugin.uniques.highlighterCaptured = {
  highlight: function(data) {
    var guid = data.portal.options.ent[0];
    var uniqueInfo = window.plugin.uniques.uniques[guid];

    var style = {};

    if (uniqueInfo) {
      if (uniqueInfo.captured) {
        // captured (and, implied, visited too) - no highlights

      } else if (uniqueInfo.visited) {
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
  },

  setSelected: function(active) {
    window.plugin.uniques.isHighlightActive = active;
  }
}

// highlighter scouted
window.plugin.uniques.highlighterScouted = {
  highlight: function(data) {
    var guid = data.portal.options.ent[0];
    var uniqueInfo = window.plugin.uniques.uniques[guid];

    var style = {};

    if (uniqueInfo && uniqueInfo.scouted)
    { // scouted - no highlights
    } else {
        style.fillColor = 'red';
        style.fillOpacity = 0.7;
    }
    data.portal.setStyle(style);
  },

  setSelected: function(active) {
    window.plugin.uniques.isHighlightActive = active;
  }
}
// highlighter droned
window.plugin.uniques.highlighterDroned = {
  highlight: function(data) {
    var guid = data.portal.options.ent[0];
    var uniqueInfo = window.plugin.uniques.uniques[guid];

    var style = {};

    if (uniqueInfo && uniqueInfo.droned)
    { // droneded - no highlights
    } else {
        style.fillColor = 'red';
        style.fillOpacity = 0.7;
    }
    data.portal.setStyle(style);
  },

  setSelected: function(active) {
    window.plugin.uniques.isHighlightActive = active;
  }
}

window.plugin.uniques.setupCSS = function() {
  $("<style>")
  .prop("type", "text/css")
  .html('\
#uniques-container {\
  display: block;\
  text-align: center;\
  margin: 6px 3px 1px 3px;\
  padding: 0 4px;\
}\
#uniques-container label {\
  margin: 0 0.5em;\
}\
#uniques-container input {\
  vertical-align: middle;\
}\
\
.portal-list-uniques input[type=\'checkbox\'] {\
  padding: 0;\
  height: auto;\
  margin-top: -5px;\
  margin-bottom: -5px;\
}\
')
  .appendTo("head");
}

window.plugin.uniques.setupContent = function() {
  plugin.uniques.contentHTML = '<div id="uniques-container">'
    + '<label><input type="checkbox" id="visited" onclick="window.plugin.uniques.updateVisited($(this).prop(\'checked\'))"> Visited</label>'
    + '<label><input type="checkbox" id="captured" onclick="window.plugin.uniques.updateCaptured($(this).prop(\'checked\'))"> Captured</label>'
    + '<label><input type="checkbox" id="scouted" onclick="window.plugin.uniques.updateScouted($(this).prop(\'checked\'))"> Scouted</label>'
    + '<label><input type="checkbox" id="droned" onclick="window.plugin.uniques.updateDroned($(this).prop(\'checked\'))"> Droned</label>'
    + '</div>';
  plugin.uniques.disabledMessage = '<div id="uniques-container" class="help" title="Your browser does not support localStorage">Plugin Uniques disabled</div>';
}
// ***************************************************************************************
window.plugin.uniques.setupPortalsList = function() {

  window.addHook('pluginUniquesUpdateUniques', function(data) {
    var info = plugin.uniques.uniques[data.guid];
    if(!info) info = { visited: false, captured: false, scouted: false, droned: false  };

    $('[data-list-uniques="'+data.guid+'"].visited').prop('checked', !!info.visited);
    $('[data-list-uniques="'+data.guid+'"].captured').prop('checked', !!info.captured);
    $('[data-list-uniques="'+data.guid+'"].scouted').prop('checked', !!info.scouted);
    $('[data-list-uniques="'+data.guid+'"].droned').prop('checked', !!info.droned);
  });

  window.addHook('pluginUniquesRefreshAll', function() {
    $('[data-list-uniques]').each(function(i, element) {
      var guid = element.getAttribute("data-list-uniques");

      var info = plugin.uniques.uniques[guid];
      if(!info) info = { visited: false, captured: false, scouted: false, droned: false };

      var e = $(element);
      if(e.hasClass('visited')) e.prop('checked', !!info.visited);
      if(e.hasClass('captured')) e.prop('checked', !!info.captured);
      if(e.hasClass('scouted')) e.prop('checked', !!info.scouted);
      if(e.hasClass('droned')) e.prop('checked', !!info.droned);
    });
  });

  function uniqueValue(guid) {
    var info = plugin.uniques.uniques[guid];
    if(!info) return 0;
    if(info.visited === undefined) return 0;
    if(!info.visited) return 0;
    if(info.visited && info.captured) return 2;
    if(info.visited) return 1;
  }

  function scoutedValue(guid) {
    var info = plugin.uniques.uniques[guid];
    if (!info) return 0;
    if (info.scouted === undefined ) return 0;
    if (info.scouted === true) return 1;
  }

  function dronedValue(guid) {
    var info = plugin.uniques.uniques[guid];
    if (!info) return 0;
    if (info.droned === undefined ) return 0;
    if (info.droned === true) return 1;
  }

  window.plugin.portalslist.fields.push(
    {title: "V/C",
    value: function(portal) { return portal.options.guid; }, // we store the guid, but implement a custom comparator so the list does sort properly without closing and reopening the dialog
    sort: function(guidA, guidB) {
      return uniqueValue(guidA) - uniqueValue(guidB);
    },
    format: function(cell, portal, guid) {
      var info = plugin.uniques.uniques[guid];
      if(!info) info = { visited: false, captured: false, scouted: false, droned: false  };

      $(cell).addClass("portal-list-uniques");

      // for some reason, jQuery removes event listeners when the list is sorted. Therefore we use DOM's addEventListener
      $('<input>')
        .prop({
          type: "checkbox",
          className: "visited",
          title: "Portal visited?",
          checked: !!info.visited,
        })
        .attr("data-list-uniques", guid)
        .appendTo(cell)
        [0].addEventListener("change", function(ev) {
          window.plugin.uniques.updateVisited(this.checked, guid);
          ev.preventDefault();
          return false;
        }, false);
      $('<input>')
        .prop({
          type: "checkbox",
          className: "captured",
          title: "Portal captured?",
          checked: !!info.captured,
        })
        .attr("data-list-uniques", guid)
        .appendTo(cell)
        [0].addEventListener("change", function(ev) {
          window.plugin.uniques.updateCaptured(this.checked, guid);
          ev.preventDefault();
          return false;
        }, false);
      },
    },
//---------------------------------------------------------------------------
    {title: "S",
      value: function(portal) { return portal.options.guid; }, // we store the guid, but implement a custom comparator so the list does sort properly without closing and reopening the dialog
      sort:  function(guidA, guidB) {
        return scoutedValue(guidA) - scoutedValue(guidB);
      },
      format: function(cell, portal, guid) {
      var info = plugin.uniques.uniques[guid];
      if(!info) info = { visited: false, captured: false, scouted: false, droned: false  };

      $(cell).addClass("portal-list-uniques");

      // for some reason, jQuery removes event listeners when the list is sorted. Therefore we use DOM's addEventListener
      $('<input>')
        .prop({
          type: "checkbox",
          className: "scouted",
          title: "Portal scouted?",
          checked: !!info.scouted,
        })
        .attr("data-list-uniques", guid)
        .appendTo(cell)
        [0].addEventListener("change", function(ev) {
          window.plugin.uniques.updateScouted(this.checked, guid);
          ev.preventDefault();
          return false;
        }, false);
    },
  },
//---------------------------------------------------------------------------
    {title: "D",
      value: function(portal) { return portal.options.guid; }, // we store the guid, but implement a custom comparator so the list does sort properly without closing and reopening the dialog
      sort:  function(guidA, guidB) {
        return dronedValue(guidA) - dronedValue(guidB);
      },
      format: function(cell, portal, guid) {
      var info = plugin.uniques.uniques[guid];
      if(!info) info = { visited: false, captured: false, scouted: false, droned: false  };

      $(cell).addClass("portal-list-uniques");

      // for some reason, jQuery removes event listeners when the list is sorted. Therefore we use DOM's addEventListener
      $('<input>')
        .prop({
          type: "checkbox",
          className: "droned",
          title: "Portal droned?",
          checked: !!info.droned,
        })
        .attr("data-list-uniques", guid)
        .appendTo(cell)
        [0].addEventListener("change", function(ev) {
          window.plugin.uniques.updateDroned(this.checked, guid);
          ev.preventDefault();
          return false;
        }, false);
    },
  }
// --------------------------------------------------------------------------

  );
};

window.plugin.uniques.onMissionChanged = function(data) {
  if(!data.local) return;

  var mission = window.plugin.missions && window.plugin.missions.getMissionCache(data.mid, false);
  if(!mission) return;

  window.plugin.uniques.checkMissionWaypoints(mission);
};

window.plugin.uniques.onMissionLoaded = function(data) {
  // the mission has been loaded, but the dialog isn't visible yet.
  // we'll wait a moment so the mission dialog is opened behind the confirmation prompt
  setTimeout(function() {
    window.plugin.uniques.checkMissionWaypoints(data.mission);
  }, 0);
};

window.plugin.uniques.checkMissionWaypoints = function(mission) {
  if(!(window.plugin.missions && window.plugin.missions.checkedMissions[mission.guid])) return;

  if(!mission.waypoints) return;

  function isValidWaypoint(wp) {
    // might be hidden or field trip card
    if(!(wp && wp.portal && wp.portal.guid)) return false;

    // only use hack, deploy, link, field and upgrade; ignore photo and passphrase
    if(wp.objectiveNum <= 0 || wp.objectiveNum > 5) return false;

    return true;
  }
  function isVisited(wp) {
    var guid = wp.portal.guid,
      uniqueInfo = plugin.uniques.uniques[guid],
      visited = (uniqueInfo && uniqueInfo.visited) || false;

    return visited;
  }

  // check if all waypoints are already visited
  if(mission.waypoints.every(function(wp) {
    if(!isValidWaypoint(wp)) return true;
    return isVisited(wp);
  })) return;

  if(!confirm('The mission ' + mission.title + ' contains waypoints not yet marked as visited.\n\n' +
      'Do you want to set them to \'visited\' now?'))
    return;

  mission.waypoints.forEach(function(wp) {
    if(!isValidWaypoint(wp)) return;
    if(isVisited(wp)) return;

    plugin.uniques.setPortalVisited(wp.portal.guid);
  });
};
/****************************************************************************************/
/** Im-/Export of uniques ***************************************************************/
/****************************************************************************************/
window.plugin.uniques.save = function save() {
    if (!confirm("Please only confirm this if you know what you are doing!!\nAre you sure you want to save your Unique visits/captures back to IITC?")) return;

    window.plugin.uniques.uniques=$.parseJSON( $('#taUCExportImport').val() );
    window.plugin.sync.updateMap('uniques', 'uniques', Object.keys(window.plugin.uniques.uniques));
}

window.plugin.uniques.toolbox = function toolbox() {
  sExportUniqueJSON='{'+"\n";
  aoPortals=window.plugin.uniques.uniques;
  visited=captured=scouted=droned=0;
  $.each(aoPortals,function(PUID){
    aPortal=window.plugin.uniques.uniques[PUID];
    if (aPortal.visited) visited++;
    if (aPortal.captured) captured++;
    if (aPortal.scouted) scouted++;
    if (aPortal.droned) droned++;
  });
  sExportUniqueJSON=JSON.stringify(window.plugin.uniques.uniques,null,4);

  var dialog = window.dialog({
    title: "Ingress unique visits/captures JSON export",
    html: '<span>Find all of your visited/captured portals as JSON below<br>'
        + '(visited: '+visited+' - captured: '+captured+' - scouted: '+scouted+' - droned: '+droned+'):</span>'
        + '<textarea id="taUCExportImport" style="width: 300px; height: 300px)'
        + 'px; margin-top: 5px;"></textarea><a onclick=\"window.plugin.uniques.save();\" title=\"Save portals\' unique info to IITC.\">Save</a>'
  }).parent();
  $(".ui-dialog-buttonpane", dialog).remove();
  // width first, then centre
  dialog.css("width", 600).css({
    "top": ($(window).height() - dialog.height()) / 2,
    "left": ($(window).width() - dialog.width()) / 2
  });
  $("#taUCExportImport").val(sExportUniqueJSON);
  return dialog;
}

/*****************************************************************************************/
/** UNIQUES Backlog to be processed whenever a portal's LatLonE6 can be resolved to GUID */
/*****************************************************************************************/
window.plugin.uniques.onPortalAdded = function(data) {
  //window.plugin.uniques.log("portal added: %o", data);
  let guid = data.portal.options.guid;
  let p = data.portal.options.data;
  let id = p.latE6 + "," + p.lngE6;
  
  //window.plugin.uniques.log("portal added: %s %s %o", guid, id, data);
  // check if portal is in missedLatLngs
  if (window.plugin.uniques.missedLatLngs[id]) {
    console.log("found portal guid for previously missed portal: %s -> %s (%o)", id, guid, data);
    window.plugin.uniques.uniques[guid] = Object.assign (
      {}, 
      window.plugin.uniques.uniques[guid],
      window.plugin.uniques.missedLatLngs[id].action
    );
    window.plugin.uniques.storeLocal('uniques');
    delete window.plugin.uniques.missedLatLngs[id];
    window.plugin.uniques.storeLocal('missedLatLngs');
  }
}

window.plugin.uniques.removeOldParsedMsgs = function() {

//  remove all timestamps older than 30 days
  let old = (Date.now() - (30*24*60*60*1000)); //miliseconds
  let count = 0;
  for (let item in window.plugin.uniques.parsedMsgs){
    if (item < old) {
      delete item;
      count++;
    }
  }
  console.log ('[uniques] removed old parsedMsgs');
}

window.plugin.uniques.missedPortalsList = function (){
  let list = 'Missed Portals:<br>';
  let mLL = window.plugin.uniques.missedLatLngs;
  for (let item in mLL) {
    let p = mLL[item].portal;
    list = list + '<a onclick=\"map.setView(['+p.latE6/1E6+','+p.lngE6/1E6+'],15);\">'+p.name+'</a><br>';
// <a onclick=\"window.plugin.uniques.save();\" title=\"Save portals\' unique info to IITC.\">Save</a>    
  }
  
  var dialog = window.dialog ({
    title: "Missed portals",
    html: list + "Click on portals to move the map to resolve the backlogged actions for this portal."
  }).parent();
  
  return dialog;  
}
/****************************************************************************************/
var setup = function() {
  // HOOKS:
  // - pluginUniquesUpdateUniques
  // - pluginUniquesRefreshAll

  window.plugin.uniques.setupCSS();
  window.plugin.uniques.setupContent();
  window.plugin.uniques.loadLocal('uniques');
  window.plugin.uniques.loadLocal('missedLatLngs');
  window.plugin.uniques.loadLocal('parsedMsgs');
  
  window.plugin.uniques.removeOldParsedMsgs();

//  window.plugin.uniques.backLogInit();
  
  window.addPortalHighlighter('Droned', window.plugin.uniques.highlighterDroned);
  window.addPortalHighlighter('Scouted', window.plugin.uniques.highlighterScouted);
  window.addPortalHighlighter('Visited/Captured', window.plugin.uniques.highlighterCaptured);
  
  window.addHook('portalDetailsUpdated', window.plugin.uniques.onPortalDetailsUpdated);
  window.addHook('publicChatDataAvailable', window.plugin.uniques.onPublicChatDataAvailable);
  window.addHook('alertsChatDataAvailable', window.plugin.uniques.onPublicChatDataAvailable);
  window.addHook('portalAdded', window.plugin.uniques.onPortalAdded);
  window.plugin.uniques.registerFieldForSyncing();

  // to mark mission portals as visited
  window.addHook('plugin-missions-mission-changed', window.plugin.uniques.onMissionChanged);
  window.addHook('plugin-missions-loaded-mission', window.plugin.uniques.onMissionLoaded);
  
  // add controls to toolbox
  var link = $("<a onclick=\"window.plugin.uniques.toolbox();\" title=\"Ex-/import a JSON of portals and their unique visit/capture status.\">Uniques ex-/import</a>");
  $("#toolbox").append(link);

  link = $("<a onclick=\"window.plugin.uniques.missedPortalsList();\" title=\"List missed Portals\">Uniques missed</a>");
  $("#toolbox").append(link);

  if (window.plugin.portalslist) {
    window.plugin.uniques.setupPortalsList();
  }
}
