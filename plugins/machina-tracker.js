// @name           Machina tracker
// @author         McBen
// @category       Layer
// @version        1.0.0
// @description    Show locations of Machina activities

/* exported setup --eslint */
/* global L */

// ensure plugin framework is there, even if iitc is not yet loaded
if (typeof window.plugin !== 'function') window.plugin = function () {};

// PLUGIN START ////////////////////////////////////////////////////////
window.MACHINA_TRACKER_MAX_TIME = 8 * 60 * 60 * 1000;
window.MACHINA_TRACKER_MIN_ZOOM = 9;
window.MACHINA_TRACKER_MIN_OPACITY = 0.3;

// use own namespace for plugin
window.plugin.machinaTracker = function () {};

window.plugin.machinaTracker.setup = function () {
  var iconImage = '@include_img:images/marker-machina.png@';

  window.plugin.machinaTracker.icon = L.icon({
    iconUrl: iconImage,
    iconSize: [26, 32],
    iconAnchor: [12, 32],
  });

  window.plugin.machinaTracker.drawnTraces = new L.LayerGroup();
  window.addLayerGroup('Machina Tracker', window.plugin.machinaTracker.drawnTraces, true);

  window.addHook('publicChatDataAvailable', window.plugin.machinaTracker.handleData);

  window.map.on('zoomend', function () {
    window.plugin.machinaTracker.zoomListener();
  });
  window.plugin.machinaTracker.zoomListener();
};

window.plugin.machinaTracker.events = [];

window.plugin.machinaTracker.zoomListener = function () {
  var ctrl = $('.leaflet-control-layers-selector + span:contains("Machina Tracker")').parent();
  if (window.map.getZoom() < window.MACHINA_TRACKER_MIN_ZOOM) {
    window.plugin.machinaTracker.drawnTraces.clearLayers();
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
  var limit = window.plugin.machinaTracker.getLimit();
  var i;
  var ev = window.plugin.machinaTracker.events;
  for (i = 0; i < ev.length; i++) {
    if (ev[i].time >= limit) break;
  }
  if (i === ev.length) {
    window.plugin.machinaTracker.events = [];
  } else if (i > 0) {
    window.plugin.machinaTracker.events.splice(0, i);
  }
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
  var limit = window.plugin.machinaTracker.getLimit();
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
    if (!plrname || !lat || !lng || !id || skipThisMessage || window.teamStringToId(json[2].plext.team) !== window.TEAM_NONE) return true;

    var newEvent = {
      latlngs: [[lat, lng]],
      ids: [id],
      time: json[1],
      name: name,
      address: address,
    };

    // short-path if this is a new player
    if (window.plugin.machinaTracker.events.length === 0) {
      window.plugin.machinaTracker.events = [newEvent];
      return true;
    }

    var evts = window.plugin.machinaTracker.events;
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
      window.plugin.machinaTracker.events = evts;
      return true;
    }

    // the time changed. Is the player still at the same location?

    // assume this is an older event at the same location. Then we need
    // to look at the next item in the event list. If this event is the
    // newest one, there may not be a newer event so check for that. If
    // it really is an older event at the same location, then skip it.
    if (evts[cmp + 1] && window.plugin.machinaTracker.eventHasLatLng(evts[cmp + 1], lat, lng)) return true;

    // if this event is newer, need to look at the previous one
    var sameLocation = window.plugin.machinaTracker.eventHasLatLng(evts[cmp], lat, lng);

    // if it’s the same location, just update the timestamp. Otherwise
    // push as new event.
    if (sameLocation) {
      evts[cmp].time = json[1];
    } else {
      evts.splice(i, 0, newEvent);
    }

    // update player data
    window.plugin.machinaTracker.events = evts;
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
  var gllfe = window.plugin.machinaTracker.getLatLngFromEvent;
  var split = window.MACHINA_TRACKER_MAX_TIME / 4;
  var now = new Date().getTime();

  for (var i = 0; i < window.plugin.machinaTracker.events.length; i++) {
    var p = window.plugin.machinaTracker.events[i];
    var ageBucket = Math.min(parseInt((now - p.time) / split), 4 - 1);
    var position = gllfe(p);

    var title = window.plugin.machinaTracker.ago(p.time, now) + ' ago';
    var icon = window.plugin.machinaTracker.icon;
    var opacity = 1 - 0.2 * ageBucket;

    var m = L.marker(position, { icon, opacity, title });
    // m.on('mouseout', function() { $(this._icon).tooltip('close'); });
    window.registerMarkerForOMS(m);

    m.addTo(window.plugin.machinaTracker.drawnTraces);
  }
};

window.plugin.machinaTracker.handleData = function (data) {
  if (window.map.getZoom() < window.MACHINA_TRACKER_MIN_ZOOM) return;

  window.plugin.machinaTracker.discardOldData();
  window.plugin.machinaTracker.processNewData(data);

  window.plugin.machinaTracker.drawnTraces.clearLayers();
  window.plugin.machinaTracker.drawData();
};

var setup = window.plugin.machinaTracker.setup;
