// @author         breunigs
// @name           Player activity tracker
// @category       Layer
// @version        0.14.2
// @description    Draw trails for the path a user took onto the map based on status messages in COMMs. Uses up to three hours of data. Does not request chat data on its own, even if that would be useful.

/* exported setup, changelog --eslint */
/* global IITC, L -- eslint */

var changelog = [
  {
    version: '0.14.2',
    changes: ['Refactoring: use IITC.chat, IITC.portal and IITC.utils APIs instead of legacy globals'],
  },
  { version: '0.14.1', changes: ['Refactoring: update Leaflet API usage'] },
  {
    version: '0.14.0',
    changes: ['Using `IITC.utils.formatAgo` instead of the plugin own function', 'Refactoring to make it easier to extend plugin functions'],
  },
  {
    version: '0.13.2',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.13.1',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.13.0',
    changes: ['Removed unused and obsolete code'],
  },
  {
    version: '0.12.3',
    changes: ['Update for new COMM messages'],
  },
  {
    version: '0.12.2',
    changes: ['🐛 - Exclude __MACHINA__ actions'],
  },
];

window.PLAYER_TRACKER_MAX_TIME = 3 * 60 * 60 * 1000; // in milliseconds
window.PLAYER_TRACKER_MIN_ZOOM = 9;
window.PLAYER_TRACKER_MIN_OPACITY = 0.3;
window.PLAYER_TRACKER_LINE_COLOUR = '#FF00FD';
window.PLAYER_TRACKER_MAX_DISPLAY_EVENTS = 10; // Maximum number of events in a popup

// use own namespace for plugin
window.plugin.playerTracker = function () {};

window.plugin.playerTracker.setup = function () {
  $('<style>').prop('type', 'text/css').html('@include_string:player-tracker.css@').appendTo('head');

  var iconEnlImage = '@include_img:images/marker-green.png@';
  var iconEnlRetImage = '@include_img:images/marker-green-2x.png@';
  var iconResImage = '@include_img:images/marker-blue.png@';
  var iconResRetImage = '@include_img:images/marker-blue-2x.png@';

  window.plugin.playerTracker.iconEnl = L.Icon.Default.extend({
    options: {
      iconUrl: iconEnlImage,
      iconRetinaUrl: iconEnlRetImage,
      tooltipAnchor: IITC.map.tooltipAnchors.pinTip,
    },
  });
  window.plugin.playerTracker.iconRes = L.Icon.Default.extend({
    options: {
      iconUrl: iconResImage,
      iconRetinaUrl: iconResRetImage,
      tooltipAnchor: IITC.map.tooltipAnchors.pinTip,
    },
  });

  window.plugin.playerTracker.drawnTracesEnl = new L.LayerGroup();
  window.plugin.playerTracker.drawnTracesRes = new L.LayerGroup();
  // to avoid any favouritism, we'll put the player's own faction layer first
  if (window.PLAYER.team === 'RESISTANCE') {
    window.layerChooser.addOverlay(window.plugin.playerTracker.drawnTracesRes, 'Player Tracker Resistance');
    window.layerChooser.addOverlay(window.plugin.playerTracker.drawnTracesEnl, 'Player Tracker Enlightened');
  } else {
    window.layerChooser.addOverlay(window.plugin.playerTracker.drawnTracesEnl, 'Player Tracker Enlightened');
    window.layerChooser.addOverlay(window.plugin.playerTracker.drawnTracesRes, 'Player Tracker Resistance');
  }
  window.plugin.playerTracker.playerPopup = new L.Popup({ offset: new L.Point([1, -34]) });

  window.addHook('publicChatDataAvailable', window.plugin.playerTracker.handleData);

  window.map.on('zoomend', function () {
    window.plugin.playerTracker.zoomListener();
  });
  window.plugin.playerTracker.zoomListener();

  window.plugin.playerTracker.setupUserSearch();
  // last, as a change of the options redraws what is set up above
  window.plugin.playerTracker.registerOptions();
  setInterval(window.plugin.playerTracker.refreshTimes, 60 * 1000);
};

window.plugin.playerTracker.registerOptions = () => {
  IITC.options.register('player-activity-tracker', {
    title: 'Player tracker',
    blocks: [
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
          window.plugin.playerTracker.redraw();
          window.plugin.playerTracker.refreshTimes();
        },
      },
      { type: 'heading', title: 'Labels' },
      {
        type: 'boolean',
        key: 'alwaysShowLabels',
        title: 'Always show',
        description: 'Otherwise on hover. Touch screens show labels only when they are always shown',
        default: false,
        onChange: () => window.plugin.playerTracker.redraw(),
      },
      {
        type: 'boolean',
        key: 'labelTime',
        title: 'Time of the last action',
        default: true,
        onChange: () => window.plugin.playerTracker.redraw(),
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
window.plugin.playerTracker.formatTime = (time, now) => {
  if (IITC.options.get('player-activity-tracker.timeFormat') === 'relative') return `${IITC.utils.formatAgo(time, now)} ago`;
  return IITC.utils.formatTimestamp(time, { now });
};

/**
 * Creates an element showing the time of an event in a popup, written again by `writeTimes`
 *
 * @param {number} time - Time of the event in milliseconds
 * @returns {jQuery} The element
 */
window.plugin.playerTracker.timeElement = (time) => $('<span>').attr('data-time', time).text(window.plugin.playerTracker.formatTime(time, Date.now()));

// writes the times in a popup again, so they are current and in the chosen format
window.plugin.playerTracker.writeTimes = (container) => {
  const now = Date.now();
  for (const element of container.querySelectorAll('[data-time]'))
    element.textContent = window.plugin.playerTracker.formatTime(Number(element.dataset.time), now);
};

// writes the times in open labels and popups again, so they stay current
window.plugin.playerTracker.refreshTimes = () => {
  for (const group of [window.plugin.playerTracker.drawnTracesEnl, window.plugin.playerTracker.drawnTracesRes]) {
    group.eachLayer((layer) => {
      const tooltip = layer.getTooltip();
      if (tooltip?.isOpen()) tooltip.update();
    });
  }
  if (window.plugin.playerTracker.playerPopup.isOpen()) {
    window.plugin.playerTracker.writeTimes(window.plugin.playerTracker.playerPopup.getContent());
    // a layout for the new width of the times, without panning back to a popup the map was moved away from
    const { autoPan } = window.plugin.playerTracker.playerPopup.options;
    window.plugin.playerTracker.playerPopup.options.autoPan = false;
    window.plugin.playerTracker.playerPopup.update();
    window.plugin.playerTracker.playerPopup.options.autoPan = autoPan;
  }
};

window.plugin.playerTracker.redraw = () => {
  if (window.map.getZoom() < window.PLAYER_TRACKER_MIN_ZOOM) return;
  window.plugin.playerTracker.drawnTracesEnl.clearLayers();
  window.plugin.playerTracker.drawnTracesRes.clearLayers();
  window.plugin.playerTracker.drawData();
};

window.plugin.playerTracker.stored = {};

window.plugin.playerTracker.onClickListener = function (event) {
  var marker = event.target;

  if (marker.options.desc) {
    window.plugin.playerTracker.writeTimes(marker.options.desc);
    window.plugin.playerTracker.playerPopup.setContent(marker.options.desc);
    window.plugin.playerTracker.playerPopup.setLatLng(marker.getLatLng());
    window.map.openPopup(window.plugin.playerTracker.playerPopup);
  }
};

/**
 * Does nothing: the tooltip of a marker closes by itself when the marker is cleared
 *
 * @deprecated
 */
window.plugin.playerTracker.closeIconTooltips = function () {};

window.plugin.playerTracker.zoomListener = function () {
  var ctrl = $('.leaflet-control-layers-selector + span:contains("Player Tracker")').parent();
  if (window.map.getZoom() < window.PLAYER_TRACKER_MIN_ZOOM) {
    window.plugin.playerTracker.drawnTracesEnl.clearLayers();
    window.plugin.playerTracker.drawnTracesRes.clearLayers();
    ctrl.addClass('disabled').attr('data-popover', 'Zoom in to show those.');
    // note: zoomListener is also called at init time to set up things, so we only need to do this in here
    IITC.chat.backgroundChannelData('plugin.playerTracker', 'all', false); // disable this plugin's interest in 'all' COMM
  } else {
    ctrl.removeClass('disabled').removeAttr('data-popover');
    // note: zoomListener is also called at init time to set up things, so we only need to do this in here
    IITC.chat.backgroundChannelData('plugin.playerTracker', 'all', true); // enable this plugin's interest in 'all' COMM
  }
};

window.plugin.playerTracker.getLimit = function () {
  return Date.now() - window.PLAYER_TRACKER_MAX_TIME;
};

window.plugin.playerTracker.discardOldData = function () {
  var limit = window.plugin.playerTracker.getLimit();
  $.each(window.plugin.playerTracker.stored, function (plrname, player) {
    var i;
    var ev = player.events;
    for (i = 0; i < ev.length; i++) {
      if (ev[i].time >= limit) break;
    }
    if (i === 0) return true;
    if (i === ev.length) return delete window.plugin.playerTracker.stored[plrname];
    window.plugin.playerTracker.stored[plrname].events.splice(0, i);
  });
};

window.plugin.playerTracker.eventHasLatLng = function (ev, lat, lng) {
  var hasLatLng = false;
  $.each(ev.latlngs, function (ind, ll) {
    if (ll[0] === lat && ll[1] === lng) {
      hasLatLng = true;
      return false;
    }
  });
  return hasLatLng;
};

window.plugin.playerTracker.processNewData = function (data) {
  var limit = window.plugin.playerTracker.getLimit();
  $.each(data.result, function (ind, json) {
    // skip old data
    if (json[1] < limit) return true;

    // find player and portal information
    var plrname, plrteam, lat, lng, name, address;
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
            // COMM messages changed a bit, keep old rules ↑ in case of rollback
            markup[1].plain.indexOf('destroyed the') !== -1 ||
            markup[1].plain.indexOf('Your Link') !== -1
          ) {
            skipThisMessage = true;
            return false;
          }
          break;
        case 'PLAYER':
          plrname = markup[1].plain;
          plrteam = markup[1].team;
          break;
        case 'PORTAL':
          // link messages are “player linked X to Y” and the player is at
          // X.
          lat = lat ? lat : markup[1].latE6 / 1e6;
          lng = lng ? lng : markup[1].lngE6 / 1e6;

          name = name ? name : markup[1].name;
          address = address ? address : markup[1].address;
          break;
      }
    });

    // skip unusable events
    if (!plrname || !lat || !lng || skipThisMessage || ![window.TEAM_RES, window.TEAM_ENL].includes(window.teamStringToId(plrteam))) {
      return true;
    }

    var newEvent = {
      latlngs: [[lat, lng]],
      time: json[1],
      name: name,
      address: address,
    };

    var playerData = window.plugin.playerTracker.stored[plrname];

    // short-path if this is a new player
    if (!playerData || playerData.events.length === 0) {
      window.plugin.playerTracker.stored[plrname] = {
        team: plrteam,
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
      return true;
    }

    // the time changed. Is the player still at the same location?

    // assume this is an older event at the same location. Then we need
    // to look at the next item in the event list. If this event is the
    // newest one, there may not be a newer event so check for that. If
    // it really is an older event at the same location, then skip it.
    if (evts[cmp + 1] && window.plugin.playerTracker.eventHasLatLng(evts[cmp + 1], lat, lng)) return true;

    // if this event is newer, need to look at the previous one
    var sameLocation = window.plugin.playerTracker.eventHasLatLng(evts[cmp], lat, lng);

    // if it’s the same location, just update the timestamp. Otherwise
    // push as new event.
    if (sameLocation) {
      evts[cmp].time = json[1];
    } else {
      evts.splice(i, 0, newEvent);
    }
  });
};

window.plugin.playerTracker.getLatLngFromEvent = function (ev) {
  // TODO? add weight to certain events, or otherwise prefer them, to give better locations?
  var lats = 0;
  var lngs = 0;
  $.each(ev.latlngs, function (i, latlng) {
    lats += latlng[0];
    lngs += latlng[1];
  });

  return new L.LatLng(lats / ev.latlngs.length, lngs / ev.latlngs.length);
};

window.plugin.playerTracker.drawData = function () {
  var isTouchDev = window.isTouchDevice();
  const showAlways = IITC.options.get('player-activity-tracker.alwaysShowLabels');
  const showTime = IITC.options.get('player-activity-tracker.labelTime');

  var gllfe = window.plugin.playerTracker.getLatLngFromEvent;

  var polyLineByPlayerAndAge = {};

  var split = window.PLAYER_TRACKER_MAX_TIME / 4;
  var now = Date.now();
  $.each(window.plugin.playerTracker.stored, function (plrname, playerData) {
    if (!playerData || playerData.events.length === 0) {
      console.warn('broken player data for plrname=' + plrname);
      return true;
    }

    // gather line data and put them in buckets so we can color them by
    // their age
    for (let i = 1; i < playerData.events.length; i++) {
      var p = playerData.events[i];
      var ageBucket = Math.min(Math.trunc((now - p.time) / split), 4 - 1);
      var line = [gllfe(p), gllfe(playerData.events[i - 1])];

      if (!polyLineByPlayerAndAge[plrname]) {
        polyLineByPlayerAndAge[plrname] = [[], [], [], []];
      }
      polyLineByPlayerAndAge[plrname][ageBucket].push(line);
    }

    var evtsLength = playerData.events.length;
    var last = playerData.events[evtsLength - 1];

    // label for marker - no HTML - written whenever it is shown, so the time in it stays current
    const tooltip = () => (showTime ? `${plrname}, ${window.plugin.playerTracker.formatTime(last.time, Date.now())}` : plrname);

    // popup for marker
    var popup = $('<div>').addClass('plugin-player-tracker-popup');
    $('<span>')
      .addClass('nickname ' + (playerData.team === 'RESISTANCE' ? 'res' : 'enl'))
      .css('font-weight', 'bold')
      .text(plrname)
      .appendTo(popup);

    if (window.plugin.guessPlayerLevels !== undefined && window.plugin.guessPlayerLevels.fetchLevelDetailsByPlayer !== undefined) {
      function getLevel(lvl) {
        return $('<span>')
          .css({
            padding: '4px',
            color: 'white',
            backgroundColor: window.COLORS_LVL[lvl],
          })
          .text(lvl);
      }

      var level = $('<span>').css({ 'font-weight': 'bold', 'margin-left': '10px' }).appendTo(popup);

      var playerLevelDetails = window.plugin.guessPlayerLevels.fetchLevelDetailsByPlayer(plrname);
      level.text('Min level ').append(getLevel(playerLevelDetails.min));
      if (playerLevelDetails.min !== playerLevelDetails.guessed) {
        level.append(document.createTextNode(', guessed level: ')).append(getLevel(playerLevelDetails.guessed));
      }
    }

    popup.append('<br>').append(window.plugin.playerTracker.timeElement(last.time)).append('<br>').append(window.plugin.playerTracker.getPortalLink(last));

    // show previous data in popup
    if (evtsLength >= 2) {
      popup.append('<br>').append('<br>').append(document.createTextNode('previous locations:')).append('<br>');

      var table = $('<table>').appendTo(popup).css('border-spacing', '0');
      for (let i = evtsLength - 2; i >= 0 && i >= evtsLength - window.PLAYER_TRACKER_MAX_DISPLAY_EVENTS; i--) {
        var ev = playerData.events[i];
        $('<tr>')
          .append($('<td>').append(window.plugin.playerTracker.timeElement(ev.time)))
          .append($('<td>').append(window.plugin.playerTracker.getPortalLink(ev)))
          .appendTo(table);
      }
    }

    // marker opacity
    var relOpacity = 1 - (now - last.time) / window.PLAYER_TRACKER_MAX_TIME;
    var absOpacity = window.PLAYER_TRACKER_MIN_OPACITY + (1 - window.PLAYER_TRACKER_MIN_OPACITY) * relOpacity;

    // marker itself
    var icon = playerData.team === 'RESISTANCE' ? new window.plugin.playerTracker.iconRes() : new window.plugin.playerTracker.iconEnl();
    // as per OverlappingMarkerSpiderfier docs, click events (popups, etc) must be handled via it rather than the standard
    // marker click events. so store the popup text in the options, then display it in the oms click handler
    const markerPos = gllfe(last);
    var m = new L.Marker(markerPos, { icon: icon, opacity: absOpacity, desc: popup[0] });
    // a label on hover needs a mouse, an ever shown one fades with the marker and keeps to one side
    if (showAlways) m.bindTooltip(tooltip, { permanent: true, direction: 'right', opacity: absOpacity, className: 'plugin-player-tracker-label' });
    else if (!isTouchDev) m.bindTooltip(tooltip, { className: 'plugin-player-tracker-label' });
    m.addEventListener('spiderfiedclick', window.plugin.playerTracker.onClickListener);

    // m.bindPopup(title);

    playerData.marker = m;

    m.addTo(window.plugin.playerTracker.getDrawnTracesByTeam(playerData.team));
    window.registerMarkerForOMS(m);
  });

  // draw the poly lines to the map
  for (const [playerName, polyLineByAge] of Object.entries(polyLineByPlayerAndAge)) {
    polyLineByAge.forEach((polyLine, i) => {
      if (polyLine.length === 0) return;

      const opts = {
        weight: 2 - 0.25 * i,
        color: window.PLAYER_TRACKER_LINE_COLOUR,
        interactive: false,
        opacity: 1 - 0.2 * i,
        dashArray: '5,8',
      };

      polyLine.forEach((poly) => {
        L.polyline(poly, opts).addTo(window.plugin.playerTracker.getDrawnTracesByTeam(window.plugin.playerTracker.stored[playerName].team));
      });
    });
  }
};

window.plugin.playerTracker.getDrawnTracesByTeam = function (team) {
  return team === 'RESISTANCE' ? window.plugin.playerTracker.drawnTracesRes : window.plugin.playerTracker.drawnTracesEnl;
};

window.plugin.playerTracker.getPortalLink = function (data) {
  var position = data.latlngs[0];
  return $('<a>')
    .addClass('text-overflow-ellipsis')
    .css('max-width', '15em')
    .text(IITC.comm.getChatPortalName(data))
    .prop({
      title: IITC.comm.getChatPortalName(data),
      href: IITC.portal.display.makePermalink(position),
    })
    .on('click', function (event) {
      IITC.portal.selectByLatLng(position);
      event.preventDefault();
      return false;
    })
    .on('dblclick', function (event) {
      window.map.setView(position, window.DEFAULT_ZOOM);
      IITC.portal.selectByLatLng(position);
      event.preventDefault();
      return false;
    });
};

window.plugin.playerTracker.handleData = function (data) {
  if (window.map.getZoom() < window.PLAYER_TRACKER_MIN_ZOOM) return;

  window.plugin.playerTracker.discardOldData();
  window.plugin.playerTracker.processNewData(data);

  window.plugin.playerTracker.drawnTracesEnl.clearLayers();
  window.plugin.playerTracker.drawnTracesRes.clearLayers();
  window.plugin.playerTracker.drawData();
};

window.plugin.playerTracker.findUser = function (nick) {
  nick = nick.toLowerCase();
  var foundPlayerData = false;
  $.each(window.plugin.playerTracker.stored, function (plrname, playerData) {
    if (plrname.toLowerCase() === nick) {
      foundPlayerData = playerData;
      return false;
    }
  });
  return foundPlayerData;
};

window.plugin.playerTracker.centerMapOnUser = function (nick) {
  var data = window.plugin.playerTracker.findUser(nick);
  if (!data) return false;

  var last = data.events[data.events.length - 1];
  var position = window.plugin.playerTracker.getLatLngFromEvent(last);

  if (IITC.utils.isSmartphone()) window.show('map');
  window.map.setView(position, window.map.getZoom());

  if (data.marker) {
    window.plugin.playerTracker.onClickListener({ target: data.marker });
  }
  return true;
};

window.plugin.playerTracker.onNicknameClicked = function (info) {
  if (info.event.ctrlKey || info.event.metaKey) {
    return !window.plugin.playerTracker.centerMapOnUser(info.nickname);
  }
  return true; // don't interrupt hook
};

window.plugin.playerTracker.onSearchResultSelected = function (result, event) {
  event.stopPropagation(); // prevent chat from handling the click

  if (IITC.utils.isSmartphone()) window.show('map');

  // if the user moved since the search was started, check if we have a new set of data
  if (false === window.plugin.playerTracker.centerMapOnUser(result.nickname)) window.map.setView(result.position);

  if (event.type === 'dblclick') window.map.setZoom(window.DEFAULT_ZOOM);

  return true;
};

window.plugin.playerTracker.onSearch = function (query) {
  var term = query.term.toLowerCase();

  if (term.length && term[0] === '@') term = term.slice(1);

  $.each(window.plugin.playerTracker.stored, function (nick, data) {
    if (nick.toLowerCase().indexOf(term) === -1) return;

    var event = data.events[data.events.length - 1];

    query.addResult({
      title: `<mark class="nickname help ${window.TEAM_TO_CSS[window.getTeam(data)]}">${nick}</mark>`,
      nickname: nick,
      description: `${data.team.slice(0, 3)}, last seen ${IITC.utils.formatTimestamp(event.time)}`,
      position: window.plugin.playerTracker.getLatLngFromEvent(event),
      onSelected: window.plugin.playerTracker.onSearchResultSelected,
    });
  });
};

window.plugin.playerTracker.setupUserSearch = function () {
  window.addHook('nicknameClicked', window.plugin.playerTracker.onNicknameClicked);
  window.addHook('search', window.plugin.playerTracker.onSearch);
};

var setup = window.plugin.playerTracker.setup;
