// @name           IITC Plugin: Machina tracker
// @author         McBen
// @category       Layer
// @version        1.0.0
// @description    Show locations of Machina activities

/* exported setup --eslint */
/* global plugin,L,addHook */

// ensure plugin framework is there, even if iitc is not yet loaded
if (typeof window.plugin !== 'function') window.plugin = function () {};

// PLUGIN START ////////////////////////////////////////////////////////
window.MACHINA_TRACKER_MAX_TIME = 8 * 60 * 60 * 1000;
window.MACHINA_TRACKER_MIN_ZOOM = 9;
window.MACHINA_TRACKER_MIN_OPACITY = 0.3;

// use own namespace for plugin
window.plugin.machinaTracker = function () {};

window.plugin.machinaTracker.setup = function () {
  var iconImage =
    'data:image/png;base64,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';

  plugin.machinaTracker.icon = L.icon({
    iconUrl: iconImage,
    iconSize: [26, 32],
    iconAnchor: [12, 32],
  });

  plugin.machinaTracker.drawnTraces = new L.LayerGroup();
  window.addLayerGroup('Machina Tracker', plugin.machinaTracker.drawnTraces, true);

  addHook('publicChatDataAvailable', window.plugin.machinaTracker.handleData);

  window.map.on('zoomend', function () {
    window.plugin.machinaTracker.zoomListener();
  });
  window.plugin.machinaTracker.zoomListener();
};

window.plugin.machinaTracker.stored = {};

window.plugin.machinaTracker.zoomListener = function () {
  var ctrl = $('.leaflet-control-layers-selector + span:contains("Machina Tracker")').parent();
  if (window.map.getZoom() < window.MACHINA_TRACKER_MIN_ZOOM) {
    plugin.machinaTracker.drawnTraces.clearLayers();
    ctrl.addClass('disabled').attr('title', 'Zoom in to show those.');
    // note: zoomListener is also called at init time to set up things, so we only need to do this in here
    window.chat.backgroundChannelData('plugin.machinaTracker', 'all', false); // disable this plugin's interest in 'all' COMM
  } else {
    ctrl.removeClass('disabled').attr('title', '');
    // note: zoomListener is also called at init time to set up things, so we only need to do this in here
    window.chat.backgroundChannelData('plugin.machinaTracker', 'all', true); // enable this plugin's interest in 'all' COMM
  }
};

window.plugin.machinaTracker.getLimit = function () {
  return new Date().getTime() - window.MACHINA_TRACKER_MAX_TIME;
};

window.plugin.machinaTracker.discardOldData = function () {
  var limit = plugin.machinaTracker.getLimit();
  $.each(plugin.machinaTracker.stored, function (plrname, player) {
    var i;
    var ev = player.events;
    for (i = 0; i < ev.length; i++) {
      if (ev[i].time >= limit) break;
    }
    if (i === 0) return true;
    if (i === ev.length) return delete plugin.machinaTracker.stored[plrname];
    plugin.machinaTracker.stored[plrname].events.splice(0, i);
  });
};

window.plugin.machinaTracker.eventHasLatLng = function (ev, lat, lng) {
  var hasLatLng = false;
  $.each(ev.latlngs, function (ind, ll) {
    if (ll[0] === lat && ll[1] === lng) {
      hasLatLng = true;
      return false;
    }
  });
  return hasLatLng;
};

window.plugin.machinaTracker.processNewData = function (data) {
  var limit = plugin.machinaTracker.getLimit();
  $.each(data.result, function (ind, json) {
    // skip old data
    if (json[1] < limit) return true;

    // find player and portal information
    var plrname,
      lat,
      lng,
      id = null,
      name,
      address;
    var skipThisMessage = false;
    $.each(json[2].plext.markup, function (ind, markup) {
      switch (markup[0]) {
        case 'TEXT':
          // Destroy link and field messages depend on where the link or
          // field was originally created. Therefore it’s not clear which
          // portal the player is at, so ignore it.
          if (
            markup[1].plain.indexOf('destroyed the Link') !== -1 ||
            markup[1].plain.indexOf('destroyed a Control Field') !== -1 ||
            markup[1].plain.indexOf('Your Link') !== -1
          ) {
            skipThisMessage = true;
            return false;
          }
          break;
        case 'PLAYER':
          plrname = markup[1].plain;
          break;
        case 'PORTAL':
          // link messages are “player linked X to Y” and the player is at
          // X.
          lat = lat ? lat : markup[1].latE6 / 1e6;
          lng = lng ? lng : markup[1].lngE6 / 1e6;

          // no GUID in the data any more - but we need some unique string. use the latE6,lngE6
          id = markup[1].latE6 + ',' + markup[1].lngE6;

          name = name ? name : markup[1].name;
          address = address ? address : markup[1].address;
          break;
      }
    });

    // skip unusable events
    if (!plrname || !lat || !lng || !id || skipThisMessage || json[2].plext.team !== 'NEUTRAL') return true;

    var newEvent = {
      latlngs: [[lat, lng]],
      ids: [id],
      time: json[1],
      name: name,
      address: address,
    };

    var playerData = window.plugin.machinaTracker.stored[plrname];

    // short-path if this is a new player
    if (!playerData || playerData.events.length === 0) {
      plugin.machinaTracker.stored[plrname] = {
        nick: plrname,
        team: json[2].plext.team,
        events: [newEvent],
      };
      return true;
    }

    var evts = playerData.events;
    // there’s some data already. Need to find correct place to insert.
    var i;
    for (i = 0; i < evts.length; i++) {
      if (evts[i].time > json[1]) break;
    }

    var cmp = Math.max(i - 1, 0);

    // so we have an event that happened at the same time. Most likely
    // this is multiple resos destroyed at the same time.
    if (evts[cmp].time === json[1]) {
      evts[cmp].latlngs.push([lat, lng]);
      evts[cmp].ids.push(id);
      plugin.machinaTracker.stored[plrname].events = evts;
      return true;
    }

    // the time changed. Is the player still at the same location?

    // assume this is an older event at the same location. Then we need
    // to look at the next item in the event list. If this event is the
    // newest one, there may not be a newer event so check for that. If
    // it really is an older event at the same location, then skip it.
    if (evts[cmp + 1] && plugin.machinaTracker.eventHasLatLng(evts[cmp + 1], lat, lng)) return true;

    // if this event is newer, need to look at the previous one
    var sameLocation = plugin.machinaTracker.eventHasLatLng(evts[cmp], lat, lng);

    // if it’s the same location, just update the timestamp. Otherwise
    // push as new event.
    if (sameLocation) {
      evts[cmp].time = json[1];
    } else {
      evts.splice(i, 0, newEvent);
    }

    // update player data
    plugin.machinaTracker.stored[plrname].events = evts;
  });
};

window.plugin.machinaTracker.getLatLngFromEvent = function (ev) {
  var lats = 0;
  var lngs = 0;
  $.each(ev.latlngs, function (i, latlng) {
    lats += latlng[0];
    lngs += latlng[1];
  });

  return L.latLng(lats / ev.latlngs.length, lngs / ev.latlngs.length);
};

window.plugin.machinaTracker.ago = function (time, now) {
  var s = (now - time) / 1000;
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  var returnVal = m + 'm';
  if (h > 0) {
    returnVal = h + 'h' + returnVal;
  }
  return returnVal;
};

window.plugin.machinaTracker.drawData = function () {
  var isTouchDev = window.isTouchDevice();

  var gllfe = plugin.machinaTracker.getLatLngFromEvent;

  var split = window.MACHINA_TRACKER_MAX_TIME / 4;
  var now = new Date().getTime();

  $.each(plugin.machinaTracker.stored, function (plrname, playerData) {
    if (!playerData || playerData.events.length === 0) {
      console.error('broken player data for plrname=' + plrname);
      return true;
    }

    for (var i = 0; i < playerData.events.length; i++) {
      var p = playerData.events[i];
      var ageBucket = Math.min(parseInt((now - p.time) / split), 4 - 1);
      var position = gllfe(p);

      var title = isTouchDev ? '' : plugin.machinaTracker.ago(p.time, now) + ' ago';
      var icon = plugin.machinaTracker.icon;
      var opacity = 1 - 0.2 * ageBucket;

      var m = L.marker(position, { icon, opacity, title });
      // m.on('mouseout', function() { $(this._icon).tooltip('close'); });
      window.registerMarkerForOMS(m);

      m.addTo(plugin.machinaTracker.drawnTraces);
    }
  });
};

window.plugin.machinaTracker.handleData = function (data) {
  if (window.map.getZoom() < window.MACHINA_TRACKER_MIN_ZOOM) return;

  plugin.machinaTracker.discardOldData();
  plugin.machinaTracker.processNewData(data);

  plugin.machinaTracker.drawnTraces.clearLayers();
  plugin.machinaTracker.drawData();
};

var setup = plugin.machinaTracker.setup;
