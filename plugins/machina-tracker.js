// @name           Machina tracker
// @author         McBen
// @category       Layer
// @version        1.1.3
// @description    Show locations of Machina activities

/* exported setup, changelog --eslint */
/* global IITC, L */

var changelog = [
  {
    version: '1.1.3',
    changes: ['Refactoring: use IITC.portal and IITC.chat APIs instead of legacy globals'],
  },
  { version: '1.1.2', changes: ['Refactoring: update Leaflet API usage'] },
  {
    version: '1.1.1',
    changes: ['Fix decayed messages attributed to Machina'],
  },
  {
    version: '1.1.0',
    changes: ['Using `IITC.utils.formatAgo` instead of the plugin own function'],
  },
  {
    version: '1.0.1',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '1.0.0',
    changes: ['First version'],
  },
];

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

  machinaTracker.icon = new L.Icon({
    iconUrl: iconImage,
    iconSize: [26, 32],
    iconAnchor: [12, 32],
    tooltipAnchor: IITC.map.tooltipAnchors.pinTip,
  });

  machinaTracker.popup = new L.Popup({ offset: new L.Point([1, -34]) });
  machinaTracker.drawnTraces = new L.LayerGroup([], { minZoom: machinaTracker.MACHINA_TRACKER_MIN_ZOOM });
  window.addLayerGroup('Machina Tracker', machinaTracker.drawnTraces, true);

  window.addHook('publicChatDataAvailable', machinaTracker.handleData);

  window.map.on('zoomend', machinaTracker.zoomListener);
  machinaTracker.zoomListener();
  // last, as a change of the options redraws what is set up above
  machinaTracker.registerOptions();
  setInterval(machinaTracker.refreshTimes, 60 * 1000);
};

machinaTracker.registerOptions = () => {
  IITC.options.register('machina-tracker', {
    title: 'Machina tracker',
    blocks: [
      {
        type: 'boolean',
        key: 'alwaysShowLabels',
        title: 'Always show time labels',
        description: 'Otherwise on hover. Touch screens show labels only when they are always shown',
        default: false,
        onChange: () => machinaTracker.redraw(),
      },
      {
        type: 'select',
        key: 'timeFormat',
        title: 'Time in labels and popups',
        description: 'Clock time has the date when it is not today',
        choices: [
          { value: 'relative', label: 'Time ago' },
          { value: 'absolute', label: 'Clock time' },
        ],
        default: 'relative',
        onChange: () => {
          machinaTracker.redraw();
          machinaTracker.refreshTimes();
        },
      },
    ],
  });
};

/**
 * Formats the time of an event in the chosen format
 *
 * @param {number} time - Time of the event in milliseconds
 * @param {number} now - Current time in milliseconds
 * @returns {string} Time ago, or the clock time with the date when it is not today
 */
machinaTracker.formatTime = (time, now) => {
  if (IITC.options.get('machina-tracker.timeFormat') === 'relative') return `${IITC.utils.formatAgo(time, now)} ago`;
  return IITC.utils.formatTimestamp(time, { now });
};

/**
 * Creates an element showing the time of an event in a popup, written again by `writeTimes`
 *
 * @param {number} time - Time of the event in milliseconds
 * @returns {jQuery} The element
 */
machinaTracker.timeElement = (time) => $('<span>').attr('data-time', time).text(machinaTracker.formatTime(time, Date.now()));

// writes the times in a popup again, so they are current and in the chosen format
machinaTracker.writeTimes = (container) => {
  const now = Date.now();
  for (const element of container.querySelectorAll('[data-time]')) element.textContent = machinaTracker.formatTime(Number(element.dataset.time), now);
};

// writes the times in open labels and popups again, so they stay current
machinaTracker.refreshTimes = () => {
  machinaTracker.drawnTraces.eachLayer((layer) => {
    const tooltip = layer.getTooltip();
    if (tooltip?.isOpen()) tooltip.update();
  });
  if (machinaTracker.popup.isOpen()) {
    machinaTracker.writeTimes(machinaTracker.popup.getContent());
    // a layout for the new width of the times, without panning back to a popup the map was moved away from
    const { autoPan } = machinaTracker.popup.options;
    machinaTracker.popup.options.autoPan = false;
    machinaTracker.popup.update();
    machinaTracker.popup.options.autoPan = autoPan;
  }
};

machinaTracker.redraw = () => {
  if (window.map.getZoom() < machinaTracker.MACHINA_TRACKER_MIN_ZOOM) return;
  machinaTracker.drawnTraces.clearLayers();
  machinaTracker.drawData();
};

machinaTracker.onClickListener = (event) => {
  var marker = event.target;

  if (marker.options.desc) {
    machinaTracker.writeTimes(marker.options.desc);
    machinaTracker.popup.setContent(marker.options.desc);
    machinaTracker.popup.setLatLng(marker.getLatLng());
    window.map.openPopup(machinaTracker.popup);
  }
};

machinaTracker.zoomListener = function () {
  var ctrl = $('.leaflet-control-layers-list span:contains("Machina Tracker")').parent('label');
  if (window.map.getZoom() < machinaTracker.MACHINA_TRACKER_MIN_ZOOM) {
    machinaTracker.drawnTraces.clearLayers();
    ctrl.addClass('disabled').attr('data-popover', 'Zoom in to show those.');
    // note: zoomListener is also called at init time to set up things, so we only need to do this in here
    IITC.chat.backgroundChannelData('plugin.machinaTracker', 'all', false); // disable this plugin's interest in 'all' COMM
  } else {
    ctrl.removeClass('disabled').removeAttr('data-popover');
    // note: zoomListener is also called at init time to set up things, so we only need to do this in here
    IITC.chat.backgroundChannelData('plugin.machinaTracker', 'all', true); // enable this plugin's interest in 'all' COMM
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
  return new L.LatLng(locationData.latE6 / 1e6, locationData.lngE6 / 1e6);
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
      if (newEvent.from && newEvent.to && newEvent.team && [window.TEAM_MAC, window.TEAM_NONE].includes(window.teamStringToId(newEvent.team))) {
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

machinaTracker.createPortalLink = function (portal) {
  return $('<a>')
    .addClass('text-overflow-ellipsis')
    .text(portal.name)
    .prop({
      title: portal.name,
      href: IITC.portal.display.makePermalink(portal.latLng),
    })
    .on('click', (event) => {
      IITC.portal.selectByLatLng(portal.latLng);
      event.preventDefault();
      return false;
    })
    .on('dblclick', (event) => {
      window.map.setView(portal.latLng, window.DEFAULT_ZOOM);
      IITC.portal.selectByLatLng(portal.latLng);
      event.preventDefault();
      return false;
    });
};

machinaTracker.drawData = function () {
  var isTouchDev = window.isTouchDevice();
  const showAlways = IITC.options.get('machina-tracker.alwaysShowLabels');

  var split = machinaTracker.MACHINA_TRACKER_MAX_TIME / 4;
  var now = new Date().getTime();

  machinaTracker.events.forEach((event) => {
    var ageBucket = Math.min((now - event.time) / split, 3);
    var position = event.from.latLng;

    // written whenever the label is shown, so the time in it stays current
    const title = () => machinaTracker.formatTime(event.time, Date.now());
    var icon = machinaTracker.icon;
    var opacity = 1 - 0.2 * ageBucket;

    var popup = $('<div>').addClass('plugin-machina-tracker-popup');
    $('<div>').addClass('plugin-machina-tracker-popup-header').append(machinaTracker.createPortalLink(event.from)).appendTo(popup);

    var linkList = $('<ul>').addClass('plugin-machina-tracker-link-list');
    linkList.appendTo(popup);

    event.to.forEach((to) => {
      $('<li>').append(machinaTracker.createPortalLink(to)).append(' ').append(machinaTracker.timeElement(to.time)).appendTo(linkList);
    });

    var m = new L.Marker(position, { icon: icon, opacity: opacity, desc: popup[0] });
    // a label on hover needs a mouse, an ever shown one fades with the marker and keeps to one side
    if (showAlways) m.bindTooltip(title, { permanent: true, direction: 'right', opacity, className: 'plugin-machina-tracker-label' });
    else if (!isTouchDev) m.bindTooltip(title, { className: 'plugin-machina-tracker-label' });
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
