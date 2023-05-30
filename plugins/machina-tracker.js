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
// use own namespace for plugin
window.plugin.machinaTracker = function () {};
var machinaTracker = window.plugin.machinaTracker;

machinaTracker.MACHINA_TRACKER_MAX_TIME = 8 * 60 * 60 * 1000;
machinaTracker.MACHINA_TRACKER_MIN_ZOOM = 9;

machinaTracker.events = [];

machinaTracker.setup = () => {
  $('<style>').prop('type', 'text/css').html('@include_string:machina-tracker.css@').appendTo('head');

  var iconImage = '@include_img:images/marker-machina.png@';

  machinaTracker.icon = L.icon({
    iconUrl: iconImage,
    iconSize: [26, 32],
    iconAnchor: [12, 32],
  });

  machinaTracker.popup = new L.Popup({ offset: L.point([1, -34]) });
  machinaTracker.drawnTraces = new L.LayerGroup([], { minZoom: machinaTracker.MACHINA_TRACKER_MIN_ZOOM });
  window.addLayerGroup('Machina Tracker', machinaTracker.drawnTraces, true);

  window.addHook('publicChatDataAvailable', machinaTracker.handleData);

  window.map.on('zoomend', machinaTracker.zoomListener);
  machinaTracker.zoomListener();
};

machinaTracker.onClickListener = (event) => {
  var marker = event.target;

  if (marker.options.desc) {
    machinaTracker.popup.setContent(marker.options.desc);
    machinaTracker.popup.setLatLng(marker.getLatLng());
    window.map.openPopup(machinaTracker.popup);
  }
};

machinaTracker.zoomListener = function () {
  var ctrl = $('.leaflet-control-layers-list span:contains("Machina Tracker")').parent('label');
  if (window.map.getZoom() < machinaTracker.MACHINA_TRACKER_MIN_ZOOM) {
    machinaTracker.drawnTraces.clearLayers();
    ctrl.addClass('disabled').attr('title', 'Zoom in to show those.');
    // note: zoomListener is also called at init time to set up things, so we only need to do this in here
    window.chat.backgroundChannelData('plugin.machinaTracker', 'all', false); // disable this plugin's interest in 'all' COMM
  } else {
    ctrl.removeClass('disabled').attr('title', '');
    // note: zoomListener is also called at init time to set up things, so we only need to do this in here
    window.chat.backgroundChannelData('plugin.machinaTracker', 'all', true); // enable this plugin's interest in 'all' COMM
  }
};

machinaTracker.getLimit = function () {
  return new Date().getTime() - machinaTracker.MACHINA_TRACKER_MAX_TIME;
};

machinaTracker.discardOldData = function () {
  var limit = machinaTracker.getLimit();
  machinaTracker.events = machinaTracker.events.reduce((result, event) => {
    event.to = event.to.filter((to) => to.time >= limit);
    if (event.to.length) {
      result.push(event);
    }
    return result;
  }, []);
};

machinaTracker.toLanLng = function (locationData) {
  return L.latLng(locationData.latE6 / 1e6, locationData.lngE6 / 1e6);
};

machinaTracker.createEvent = function (json) {
  var newEvent = { time: json[1] };
  json[2].plext.markup.forEach((markup) => {
    switch (markup[0]) {
      case 'PLAYER':
        newEvent.team = markup[1].team;
        break;
      case 'PORTAL':
        if (!newEvent.from) {
          newEvent.from = {
            latLng: machinaTracker.toLanLng(markup[1]),
            name: markup[1].name,
          };
        } else {
          newEvent.to = [
            {
              latLng: machinaTracker.toLanLng(markup[1]),
              name: markup[1].name,
              time: json[1],
            },
          ];
        }
        break;
    }
  });

  return newEvent;
};

machinaTracker.processNewData = function (data) {
  var limit = machinaTracker.getLimit();
  data.result.forEach((json) => {
    if (json[1] >= limit) {
      var newEvent = machinaTracker.createEvent(json);
      if (newEvent.from && newEvent.to && [window.TEAM_MAC, window.TEAM_NONE].includes(window.teamStringToId(newEvent.team))) {
        var prevEvent = machinaTracker.events.find((e) => e.from.latLng.equals(newEvent.from.latLng));
        if (!prevEvent) {
          machinaTracker.events.push(newEvent);
        } else {
          var newTo = newEvent.to[0];
          if (!prevEvent.to.some((to) => newTo.latLng.equals(to.latLng) && newTo.time === to.time)) {
            prevEvent.to.push(newTo);
            prevEvent.to.sort((a, b) => a.time - b.time);
            prevEvent.time = prevEvent.to[0].time;
          }
        }
      }
    }
  });
};

machinaTracker.ago = function (time, now) {
  var s = (now - time) / 1000;
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  var returnVal = m + 'm';
  if (h > 0) {
    returnVal = h + 'h' + returnVal;
  }
  return returnVal + ' ago';
};

machinaTracker.createPortalLink = function (portal) {
  return $('<a>')
    .addClass('text-overflow-ellipsis')
    .text(portal.name)
    .prop({
      title: portal.name,
      href: window.makePermalink(portal.latLng),
    })
    .click((event) => {
      window.selectPortalByLatLng(portal.latLng);
      event.preventDefault();
      return false;
    })
    .dblclick((event) => {
      window.map.setView(portal.latLng, window.DEFAULT_ZOOM);
      window.selectPortalByLatLng(portal.latLng);
      event.preventDefault();
      return false;
    });
};

machinaTracker.drawData = function () {
  var isTouchDev = window.isTouchDevice();

  var split = machinaTracker.MACHINA_TRACKER_MAX_TIME / 4;
  var now = new Date().getTime();

  machinaTracker.events.forEach((event) => {
    var ageBucket = Math.min((now - event.time) / split, 3);
    var position = event.from.latLng;

    var title = isTouchDev ? '' : machinaTracker.ago(event.time, now);
    var icon = machinaTracker.icon;
    var opacity = 1 - 0.2 * ageBucket;

    var popup = $('<div>').addClass('plugin-machina-tracker-popup');
    $('<div>').addClass('plugin-machina-tracker-popup-header').append(machinaTracker.createPortalLink(event.from)).appendTo(popup);

    var linkList = $('<ul>').addClass('plugin-machina-tracker-link-list');
    linkList.appendTo(popup);

    event.to.forEach((to) => {
      $('<li>').append(machinaTracker.createPortalLink(to)).append(' ').append(machinaTracker.ago(to.time, now)).appendTo(linkList);
    });

    var m = L.marker(position, { icon: icon, opacity: opacity, desc: popup[0], title: title });
    m.addEventListener('spiderfiedclick', machinaTracker.onClickListener);

    window.registerMarkerForOMS(m);
    m.addTo(machinaTracker.drawnTraces);
  });
};

machinaTracker.handleData = function (data) {
  if (window.map.getZoom() < machinaTracker.MACHINA_TRACKER_MIN_ZOOM) return;

  machinaTracker.discardOldData();
  machinaTracker.processNewData(data);

  machinaTracker.drawnTraces.clearLayers();
  machinaTracker.drawData();
};

var setup = machinaTracker.setup;
