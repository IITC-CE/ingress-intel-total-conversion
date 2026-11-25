// @author         breunigs
// @name           Player activity tracker
// @category       Layer
// @version        0.14.2
// @description    Draw trails for the path a user took onto the map based on status messages in COMMs. Keeps three hours of data by default. Does not request chat data on its own, even if that would be useful.

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
window.PLAYER_TRACKER_ANIMATE_STEP_TIME = 150; // in milliseconds, for each step of the animated path

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

  // the animated path repaints only this canvas, not the shared one with all portals, links and fields;
  // the paths take no clicks, so the pane lets them through to the layers below
  const pathPane = window.map.createPane('plugin-player-tracker-paths');
  pathPane.style.pointerEvents = 'none';
  pathPane.style.zIndex = 400;
  window.plugin.playerTracker.pathRenderer = window.map.options.preferCanvas ? L.canvas({ pane: pathPane }) : L.svg({ pane: pathPane });
  window.map.on('movestart', () => (window.plugin.playerTracker.mapMoving = true));
  window.map.on('moveend', () => (window.plugin.playerTracker.mapMoving = false));

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
  window.plugin.playerTracker.playerPopup = new L.Popup({ offset: new L.Point([1, -34]), maxWidth: 400, className: 'plugin-player-tracker-leaflet-popup' });

  window.addHook('publicChatDataAvailable', window.plugin.playerTracker.handleData);

  window.map.on('zoomend', function () {
    window.plugin.playerTracker.zoomListener();
  });
  window.plugin.playerTracker.zoomListener();

  window.plugin.playerTracker.setupUserSearch();
  // last, as a change of the options redraws what is set up above
  window.plugin.playerTracker.registerOptions();
  window.plugin.playerTracker.applyHistoryLength();
  window.plugin.playerTracker.animatePaths();
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
        },
      },
      {
        type: 'boolean',
        key: 'animatePath',
        title: 'Animated path',
        description: 'Dashes run along the path the way the agent went',
        default: false,
        onChange: () => {
          window.plugin.playerTracker.redraw();
          window.plugin.playerTracker.animatePaths();
        },
      },
      {
        type: 'select',
        key: 'historyHours',
        title: 'History length',
        description: 'Older actions are dropped. A longer history builds up while IITC stays open',
        choices: [
          { value: 0.5, label: '30 minutes' },
          { value: 1, label: '1 hour' },
          { value: 2, label: '2 hours' },
          { value: 3, label: '3 hours' },
          { value: 6, label: '6 hours' },
          { value: 12, label: '12 hours' },
          { value: 24, label: '1 day' },
          { value: 72, label: '3 days' },
          { value: 168, label: '1 week' },
        ],
        default: 3,
        onChange: () => {
          window.plugin.playerTracker.applyHistoryLength();
          window.plugin.playerTracker.discardOldData();
          window.plugin.playerTracker.redraw();
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
      { type: 'heading', title: 'Popup' },
      {
        type: 'boolean',
        key: 'detailedPopup',
        title: 'Detailed view',
        description: 'What the agent did at each portal',
        default: false,
        onChange: () => window.plugin.playerTracker.redraw(),
      },
    ],
  });
};

/**
 * Sets how long actions are kept from the History length option
 */
window.plugin.playerTracker.applyHistoryLength = () => {
  window.PLAYER_TRACKER_MAX_TIME = IITC.options.get('player-activity-tracker.historyHours') * 60 * 60 * 1000;
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
 * Creates an element showing the time of an event in a popup, written again by `writeTimes`, with the time to the
 * second on hover
 *
 * @param {number} time - Time of the event in milliseconds
 * @returns {HTMLElement} The element
 */
window.plugin.playerTracker.timeElement = (time) =>
  IITC.utils.createElement(
    'span',
    { dataset: { time, popover: IITC.utils.formatTimestamp(time, { precision: 'seconds' }) } },
    window.plugin.playerTracker.formatTime(time, Date.now())
  );

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
    // a layout for the new width of the times
    window.plugin.playerTracker.withoutPopupPan((popup) => popup.update());
  }
};

// runs a change to the open popup, which lays it out again, without panning back to it, as the map may have been
// moved away from it on purpose
window.plugin.playerTracker.withoutPopupPan = (change) => {
  const popup = window.plugin.playerTracker.playerPopup;
  const { autoPan } = popup.options;
  popup.options.autoPan = false;
  change(popup);
  popup.options.autoPan = autoPan;
};

window.plugin.playerTracker.redraw = () => {
  if (window.map.getZoom() < window.PLAYER_TRACKER_MIN_ZOOM) return;
  window.plugin.playerTracker.drawnTracesEnl.clearLayers();
  window.plugin.playerTracker.drawnTracesRes.clearLayers();
  window.plugin.playerTracker.drawData();
  window.plugin.playerTracker.refreshPopup();
};

// a dash of 7 and a gap of 6 with flat ends look like the static 5,8 with round ones; each step moves the dashes
// one unit further along a path, a zero-length dash at the start stands for a path that begins in a gap
window.plugin.playerTracker.PATH_FRAMES = Array.from({ length: 13 }, (_, shift) => {
  if (shift === 0) return '7,6';
  if (shift <= 6) return `0,${shift},7,${6 - shift}`;
  return `${shift - 6},6,${13 - shift},0`;
});
window.plugin.playerTracker.pathFrame = 0;

/**
 * Moves the dashes of the paths one step along, and plans the next step while the animated path is on
 */
window.plugin.playerTracker.animatePaths = () => {
  const playerTracker = window.plugin.playerTracker;
  clearTimeout(playerTracker.animationTimer);
  if (!IITC.options.get('player-activity-tracker.animatePath')) return;
  playerTracker.animationTimer = setTimeout(playerTracker.animatePaths, window.PLAYER_TRACKER_ANIMATE_STEP_TIME);
  // the map redraws everything once it stops
  if (playerTracker.mapMoving) return;

  playerTracker.pathFrame = (playerTracker.pathFrame + 1) % playerTracker.PATH_FRAMES.length;
  const dashArray = playerTracker.PATH_FRAMES[playerTracker.pathFrame];
  for (const group of [playerTracker.drawnTracesEnl, playerTracker.drawnTracesRes]) {
    if (!window.map.hasLayer(group)) continue;
    group.eachLayer((layer) => {
      if (layer instanceof L.Polyline) layer.setStyle({ dashArray });
    });
  }
};

window.plugin.playerTracker.stored = {};

// after a redraw an open popup takes the content of the new marker of its player, or closes when the player is gone
window.plugin.playerTracker.refreshPopup = () => {
  const playerTracker = window.plugin.playerTracker;
  if (!playerTracker.playerPopup.isOpen()) return;
  const marker = playerTracker.stored[playerTracker.popupPlayer]?.marker;
  if (!marker) {
    window.map.closePopup(playerTracker.playerPopup);
    return;
  }
  playerTracker.writeTimes(marker.options.desc);
  playerTracker.withoutPopupPan((popup) => popup.setContent(marker.options.desc));
};

window.plugin.playerTracker.onClickListener = function (event) {
  var marker = event.target;

  if (marker.options.desc) {
    window.plugin.playerTracker.popupPlayer = marker.options.player;
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

    const action = { guid: json[0], time: json[1], markup: json[2].plext.markup };
    var newEvent = {
      latlngs: [[lat, lng]],
      time: json[1],
      name: name,
      address: address,
      actions: [action],
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
      window.plugin.playerTracker.addAction(evts[cmp], action);
      return true;
    }

    // the time changed. Is the player still at the same location?

    // assume this is an older event at the same location. Then we need
    // to look at the next item in the event list. If this event is the
    // newest one, there may not be a newer event so check for that. If
    // it really is an older event at the same location, then skip it.
    if (evts[cmp + 1] && window.plugin.playerTracker.eventHasLatLng(evts[cmp + 1], lat, lng)) {
      window.plugin.playerTracker.addAction(evts[cmp + 1], action);
      return true;
    }

    // if this event is newer, need to look at the previous one
    var sameLocation = window.plugin.playerTracker.eventHasLatLng(evts[cmp], lat, lng);

    // if it’s the same location, just update the timestamp. Otherwise
    // push as new event.
    if (sameLocation) {
      evts[cmp].time = json[1];
      window.plugin.playerTracker.addAction(evts[cmp], action);
    } else {
      evts.splice(i, 0, newEvent);
    }
  });
};

/**
 * Adds a message to the actions of an event unless it is there already, keeping them in time order
 *
 * @param {Object} ev - The event
 * @param {Object} action - The message, with its guid, time and markup
 */
window.plugin.playerTracker.addAction = (ev, action) => {
  ev.actions ??= [];
  if (ev.actions.some((known) => known.guid === action.guid)) return;
  ev.actions.push(action);
  ev.actions.sort((a, b) => a.time - b.time);
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
  const detailed = IITC.options.get('player-activity-tracker.detailedPopup');

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
      // from the older event to the newer one, so the dashes of the animated path run the way the agent went
      const line = [gllfe(playerData.events[i - 1]), gllfe(p)];

      if (!polyLineByPlayerAndAge[plrname]) {
        polyLineByPlayerAndAge[plrname] = [[], [], [], []];
      }
      polyLineByPlayerAndAge[plrname][ageBucket].push(line);
    }

    const last = playerData.events.at(-1);

    // label for marker - no HTML - written whenever it is shown, so the time in it stays current
    const tooltip = () => (showTime ? `${plrname}, ${window.plugin.playerTracker.formatTime(last.time, Date.now())}` : plrname);

    // popup for marker
    const el = IITC.utils.createElement;
    const team = playerData.team === 'RESISTANCE' ? 'res' : 'enl';
    const popup = el('div', { className: `plugin-player-tracker-popup plugin-player-tracker-popup-${team}` });
    popup.classList.toggle('plugin-player-tracker-popup-detailed', detailed);
    // keeps clear of the close button
    const header = el(
      'div',
      { className: 'plugin-player-tracker-popup-header' },
      el('span', { className: `nickname ${team}`, style: 'font-weight: bold' }, plrname)
    );
    popup.append(header);

    if (window.plugin.guessPlayerLevels?.fetchLevelDetailsByPlayer !== undefined) {
      const getLevel = (lvl) => el('span', { style: `padding: 4px; color: white; background-color: ${window.COLORS_LVL[lvl]}` }, String(lvl));
      const { min, guessed } = window.plugin.guessPlayerLevels.fetchLevelDetailsByPlayer(plrname);
      const level = el('span', { style: 'font-weight: bold; margin-left: 10px' }, 'Min level ', getLevel(min));
      if (min !== guessed) level.append(', guessed level: ', getLevel(guessed));
      header.append(level);
    }

    popup.append(
      el('div', {}, 'Last seen ', el('b', {}, window.plugin.playerTracker.timeElement(last.time))),
      el('div', { className: 'plugin-player-tracker-popup-line' }, 'at ', window.plugin.playerTracker.portalLink(last))
    );

    // the latest locations, or in the detailed view the latest actions, the newest first; an event an extension
    // of the plugin stored without its messages shows as its portal
    const rows = detailed
      ? playerData.events.flatMap((ev) => (ev.actions?.length ? ev.actions : [{ time: ev.time, event: ev }])).sort((a, b) => b.time - a.time)
      : playerData.events.map((ev) => ({ time: ev.time, event: ev })).reverse();
    if (rows.length >= (detailed ? 1 : 2)) {
      const table = el('table', { className: 'plugin-player-tracker-events' });
      for (const row of rows.slice(0, window.PLAYER_TRACKER_MAX_DISPLAY_EVENTS)) {
        const what = row.markup
          ? window.plugin.playerTracker.actionElement(row.markup)
          : el('div', { className: 'plugin-player-tracker-popup-line' }, window.plugin.playerTracker.portalLink(row.event));
        table.append(el('tr', {}, el('td', { className: 'time' }, window.plugin.playerTracker.timeElement(row.time)), el('td', { className: 'entry' }, what)));
      }
      popup.append(table);
    }

    // marker opacity
    var relOpacity = 1 - (now - last.time) / window.PLAYER_TRACKER_MAX_TIME;
    var absOpacity = window.PLAYER_TRACKER_MIN_OPACITY + (1 - window.PLAYER_TRACKER_MIN_OPACITY) * relOpacity;

    // marker itself
    var icon = playerData.team === 'RESISTANCE' ? new window.plugin.playerTracker.iconRes() : new window.plugin.playerTracker.iconEnl();
    // as per OverlappingMarkerSpiderfier docs, click events (popups, etc) must be handled via it rather than the standard
    // marker click events. so store the popup text in the options, then display it in the oms click handler
    const markerPos = gllfe(last);
    const m = new L.Marker(markerPos, { icon: icon, opacity: absOpacity, desc: popup, player: plrname });
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
  const animate = IITC.options.get('player-activity-tracker.animatePath');
  for (const [playerName, polyLineByAge] of Object.entries(polyLineByPlayerAndAge)) {
    polyLineByAge.forEach((polyLine, i) => {
      if (polyLine.length === 0) return;

      const opts = {
        weight: 2 - 0.25 * i,
        color: window.PLAYER_TRACKER_LINE_COLOUR,
        interactive: false,
        opacity: 1 - 0.2 * i,
        dashArray: animate ? window.plugin.playerTracker.PATH_FRAMES[window.plugin.playerTracker.pathFrame] : '5,8',
        lineCap: animate ? 'butt' : 'round',
        renderer: window.plugin.playerTracker.pathRenderer,
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

/**
 * Creates a link that selects the portal of an event, and zooms to it on a double click
 *
 * @param {Object} data - The event, or anything with its latlngs, name and address
 * @returns {HTMLElement} The link
 */
window.plugin.playerTracker.portalLink = (data) => {
  const position = data.latlngs[0];
  const name = IITC.comm.getChatPortalName(data);
  return IITC.utils.createElement(
    'a',
    {
      title: name,
      href: IITC.portal.display.makePermalink(position),
      onclick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        IITC.portal.selectByLatLng(position);
      },
      ondblclick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        window.map.setView(position, window.DEFAULT_ZOOM);
        IITC.portal.selectByLatLng(position);
      },
    },
    name
  );
};

/**
 * Writes a message as the chat shows it, on one line and without the player it is about, its portals in the
 * colour of their faction then
 *
 * @param {Array} markup - The markup of the message
 * @returns {HTMLElement} The line
 */
window.plugin.playerTracker.actionElement = (markup) => {
  const shown = IITC.comm.transformMessage({ markup });
  if (shown[0]?.[0] === 'PLAYER') shown.shift();

  const el = IITC.utils.createElement;
  const line = el('div', { className: 'plugin-player-tracker-popup-line plugin-player-tracker-popup-action' });
  for (const [type, data] of shown) {
    if (type === 'PORTAL') {
      const portal = { latlngs: [[data.latE6 / 1e6, data.lngE6 / 1e6]], name: data.name, address: data.address };
      const link = window.plugin.playerTracker.portalLink(portal);
      link.classList.add(window.TEAM_TO_CSS[IITC.utils.getTeamId(data.team)]);
      line.append(link);
    } else {
      // in a span, as the line would drop the spaces at the ends of a bare text
      line.append(el('span', {}, data.plain ?? ''));
    }
  }
  return line;
};

window.plugin.playerTracker.handleData = function (data) {
  if (window.map.getZoom() < window.PLAYER_TRACKER_MIN_ZOOM) return;

  window.plugin.playerTracker.discardOldData();
  window.plugin.playerTracker.processNewData(data);

  window.plugin.playerTracker.drawnTracesEnl.clearLayers();
  window.plugin.playerTracker.drawnTracesRes.clearLayers();
  window.plugin.playerTracker.drawData();
  window.plugin.playerTracker.refreshPopup();
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
