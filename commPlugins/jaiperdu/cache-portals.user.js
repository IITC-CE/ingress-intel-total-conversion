// ==UserScript==
// @author         jaiperdu
// @name           Cache visible portals
// @category       Cache
// @version        0.4.3
// @description    Cache the data of visible portals and use this to populate the map when possible
// @id             cache-portals@jaiperdu
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/jaiperdu/cache-portals.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/jaiperdu/cache-portals.user.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'lejeu';
plugin_info.dateTimeVersion = '2022-06-30-074250';
plugin_info.pluginId = 'cache-portals';
//END PLUGIN AUTHORS NOTE

// use own namespace for plugin
var cachePortals = {};

var MAX_ZOOM = 22;

cachePortals.SETTINGS_KEY = "plugins-cache-portals";
cachePortals.settings = {
  injectPortals: false,
  injectZoom: 15, // do whatever you want...
  storeTeam: false,
  maxLocationAge: 30, // days
};

function openDB() {
  var rq = window.indexedDB.open("cache-portals", 7);
  rq.onupgradeneeded = function (event) {
    var db = event.target.result;
    if (event.oldVersion < 1) {
      var store = db.createObjectStore("portals", { keyPath: "guid" });
      store.createIndex("latLngE6", ["latE6", "lngE6"], { unique: false });
      store.createIndex("loadtime", "loadtime", { unique: false });
    }
    if (event.oldVersion < 2) {
      var store = rq.transaction.objectStore("portals");
      store.openCursor().onsuccess = function (e) {
        var cursor = e.target.result;
        if (cursor) {
          var portal = cursor.value;
          L.Util.extend(portal, coordsToTiles(portal.latE6, portal.lngE6));
          store.put(portal);
          cursor.continue();
        }
      };
      // MAX_ZOOM=22
      for (var i = 1; i <= 22; i++) {
        var key = "z" + i;
        store.createIndex(key, key, { unique: false });
      }
    }
    if (1 <= event.oldVersion && event.oldVersion < 4) {
      // allow co-located portals
      var store = rq.transaction.objectStore('portals');
      store.deleteIndex("latLngE6");
      store.createIndex("latLngE6", ["latE6", "lngE6"], { unique: false });
      // this index is not used yet...
    }
    if (3 <= event.oldVersion && event.oldVersion < 6) {
      db.deleteObjectStore('portals_history');
    }
  };
  rq.onsuccess = function (event) {
    var db = event.target.result;
    cachePortals.db = db;
    cleanup();
  };
  rq.onerror = function (event) {
    console.error("cache-portals: something went wrong", event);
  };
  return rq;
}

function cleanup() {
  if (!cachePortals.db) return;
  console.time("cache-portals: cleanup");
  var maxAge = Date.now() - cachePortals.settings.maxLocationAge * 24 * 60 * 60 * 1000;
  var tx = cachePortals.db.transaction("portals", "readwrite");
  tx
    .objectStore("portals")
    .index("loadtime")
    .openKeyCursor(window.IDBKeyRange.upperBound(maxAge)).onsuccess = function (
    event
  ) {
    var cursor = event.target.result;
    if (cursor) {
      tx.objectStore("portals").delete(cursor.primaryKey);
      cursor.continue();
    }
  };

  tx.oncomplete = function () {
    console.timeEnd("cache-portals: cleanup");
  };
}

function putPortals(portals) {
  if (!cachePortals.db) return;

  var tx = cachePortals.db.transaction("portals", "readwrite");
  var store = tx.objectStore("portals");
  var count = portals.length;
  console.time("cache-portals: putPortals");
  tx.oncomplete = () => {
    console.timeEnd("cache-portals: putPortals");
    console.log("cache-portals: putPortals:", count, "portals");
  }
  portals.forEach((portal) => store.put(portal));
}

function putPortal(portal) {
  putPortals([portal]);
}

function portalDetailLoaded(data) {
  if (data.success) {
    var portal = {
      guid: data.guid,
      team: data.details.team,
      latE6: data.details.latE6,
      lngE6: data.details.lngE6,
      timestamp: data.details.timestamp,
      loadtime: Date.now(),
    };
    L.Util.extend(portal, coordsToTiles(portal.latE6, portal.lngE6));
    if (!cachePortals.settings.storeTeam)
      delete portal.team;
    putPortal(portal);
  }
}

function mapDataRefreshEnd() {
  var portals = [];
  var linkPortals = {};
  // real placeholder
  for (var guid in window.links) {
    var link = window.links[guid];
    linkPortals[link.options.data.oGuid] = true;
    linkPortals[link.options.data.dGuid] = true;
  }
  for (var guid in window.portals) {
    var options = window.portals[guid].options;
    // skip our injected portals
    if (!linkPortals[guid] && options.data.level === undefined) continue;
    var portal = {
      guid: options.guid,
      team: options.data.team,
      latE6: options.data.latE6,
      lngE6: options.data.lngE6,
      timestamp: options.timestamp,
      loadtime: +Date.now(),
    };
    L.Util.extend(portal, coordsToTiles(portal.latE6, portal.lngE6));
    if (!cachePortals.settings.storeTeam)
      delete portal.team;
    portals.push(portal);
  }
  putPortals(portals);
}

function coordsToTile(latE6, lngE6, zoom) {
  latE6 = latE6 + 90000000;
  lngE6 = lngE6 + 180000000;
  var size = 360000000;
  for (var i = 0; i < zoom; i++) size = size / 2;
  return [Math.floor(latE6 / size), Math.floor(lngE6 / size)];
}

function coordsToTiles(latE6, lngE6) {
  latE6 = latE6 + 90000000;
  lngE6 = lngE6 + 180000000;
  var size = 360000000;
  var tiles = {};
  for (var i = 0; i <= MAX_ZOOM; i++) {
    tiles["z" + i] = Math.floor(latE6 / size) + "_" + Math.floor(lngE6 / size);
    size = size / 2;
  }
  return tiles;
}

function entityInject(data) {
  if (!cachePortals.db) return;
  if (!cachePortals.settings.injectPortals) return;

  var mapZoom = map.getZoom();
  if (mapZoom < cachePortals.settings.injectZoom) return;

  if (mapZoom > MAX_ZOOM) mapZoom = MAX_ZOOM;

  var bounds = window.clampLatLngBounds(map.getBounds());

  var tx = cachePortals.db.transaction("portals", "readonly");
  var index = tx.objectStore("portals").index("z" + mapZoom);

  var lowerBound = [bounds.getSouth(), bounds.getWest()].map((v) =>
    Math.round(v * 1e6)
  );
  var upperBound = [bounds.getNorth(), bounds.getEast()].map((v) =>
    Math.round(v * 1e6)
  );

  var lowerTile = coordsToTile(lowerBound[0], lowerBound[1], mapZoom);
  var upperTile = coordsToTile(upperBound[0], upperBound[1], mapZoom);

  var tiles = (upperTile[0] - lowerTile[0] + 1) * (upperTile[1] - lowerTile[1] + 1);
  var count = 0;
  console.time("cache-portals: inject portals");
  for (var x = lowerTile[0]; x <= upperTile[0]; x++) {
    for (var y = lowerTile[1]; y <= upperTile[1]; y++) {
      var ents = [];
      index.getAll(x + "_" + y).onsuccess = function (event) {
        var portals = event.target.result;
        if (portals.length > 0) {
          data.callback(
            portals.map((portal) => [
              portal.guid,
              portal.timestamp,
              ["p", portal.team, portal.latE6, portal.lngE6],
            ]),
            "core"
          );
        }
        tiles -= 1;
        count += portals.length;
        if (tiles === 0) {
          console.timeEnd("cache-portals: inject portals");
          console.log("cache-portals:", count, "portals injected");
        }
      };
    }
  }
}

function saveSettings() {
  localStorage[cachePortals.SETTINGS_KEY] = JSON.stringify(cachePortals.settings);
}

function addInput(container, type, desc, key) {
  L.DomUtil.create('label', '', container).textContent = desc;
  var input = L.DomUtil.create('input', '', container);
  input.type = type;
  if (type == 'checkbox') input.checked = !!cachePortals.settings[key];
  else input.value = cachePortals.settings[key];

  L.DomEvent.on(input, 'change', () => {
    if (type == 'checkbox') cachePortals.settings[key] = input.checked;
    else cachePortals.settings[key] = parseInt(input.value);
    saveSettings();
  });
}

function displayOpt() {
  var div = L.DomUtil.create('div');
  div.style.display = "grid";
  div.style.gridTemplateColumns = "auto auto";

  var section = L.DomUtil.create('h4', '', div);
  section.textContent = "Cache on map";
  section.style.gridColumn = "1/3";
  addInput(div, 'checkbox', "Use cache to populate the map", 'injectPortals');
  addInput(div, 'number', "Populate from zoom", 'injectZoom');
  addInput(div, 'checkbox', "Store team", 'storeTeam');
  addInput(div, 'number', "Days to keep data", 'maxLocationAge');

  window.dialog({
    title: "Cache portals options",
    html: div,
    width: 'auto',
    buttons: {
      'History': () => alert("Portal history has been removed. Prefer using https://github.com/vrabcak/iitc-offle instead.")
    }
  });
}

function setup() {
  if (!window.indexedDB) return;
  window.plugin.cachePortals = cachePortals;

  try {
    var settings = JSON.parse(localStorage[cachePortals.SETTINGS_KEY]);
    delete settings.maxAge;
    Object.assign(cachePortals.settings, settings);
  } catch {
    saveSettings();
  }

  openDB();

  window.addHook("mapDataRefreshEnd", mapDataRefreshEnd);
  window.addHook("portalDetailLoaded", portalDetailLoaded);
  window.addHook("mapDataEntityInject", entityInject);

  $('<a>')
    .html('Portal Cache Opt')
    .click(displayOpt)
    .appendTo('#toolbox');
}

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

