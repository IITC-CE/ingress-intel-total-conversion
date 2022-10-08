/// SETUP /////////////////////////////////////////////////////////////
// these functions set up specific areas after the boot function
// created a basic framework. All of these functions should only ever
// be run once.
import "overlapping-marker-spiderfier-leaflet";
const log = require("ulog")("boot.js");


window.setupTooltips = function (element) {
  element = element || $(document);
  element.tooltip({
    // disable show/hide animation
    show: { effect: 'none', duration: 0, delay: 350 },
    hide: false,
    open: function (event, ui) {
      // ensure all other tooltips are closed
      $('.ui-tooltip').not(ui.tooltip).remove();
    },
    content: function () {
      var title = $(this).attr('title');
      return window.convertTextToTableMagic(title);
    }
  });

  if (!window.tooltipClearerHasBeenSetup) {
    window.tooltipClearerHasBeenSetup = true;
    $(document).on('click', '.ui-tooltip', function () { $(this).remove(); });
  }
};

function setupIngressMarkers() {
  L.Icon.Default.mergeOptions({
    iconUrl: '@include_img:images/marker-ingress.png@',
    iconRetinaUrl: '@include_img:images/marker-ingress-2x.png@',
    shadowUrl: '@include_img:external/images/marker-shadow.png@'
  });
  L.Icon.Default.imagePath = ' '; // in order to suppress _detectIconPath (it fails with data-urls)

  $(['<svg>',
    // search.js, distance-to-portal.user.js, draw-tools.user.js
    '<symbol id="marker-icon" viewBox="0 0 25 41">',
    '<path d="M1.36241844765,18.67488124675 A12.5,12.5 0 1,1 23.63758155235,18.67488124675 L12.5,40.5336158073 Z" style="stroke:none;" />',
    '<path d="M1.80792170975,18.44788599685 A12,12 0 1,1 23.19207829025,18.44788599685 L12.5,39.432271175 Z" style="stroke:#000000; stroke-width:1px; stroke-opacity: 0.15; fill: none;" />',
    '<path d="M2.921679865,17.8803978722 A10.75,10.75 0 1,1 22.078320135,17.8803978722 L12.5,36.6789095943 Z" style="stroke:#ffffff; stroke-width:1.5px; stroke-opacity: 0.35; fill: none;" />',
    '<path d="M19.86121593215,17.25 L12.5,21.5 L5.13878406785,17.25 L5.13878406785,8.75 L12.5,4.5 L19.86121593215,8.75 Z M7.7368602792,10.25 L17.2631397208,10.25 L12.5,18.5 Z M12.5,13 L7.7368602792,10.25 M12.5,13 L17.2631397208,10.25 M12.5,13 L12.5,18.5 M19.86121593215,17.25 L16.39711431705,15.25 M5.13878406785,17.25 L8.60288568295,15.25 M12.5,4.5 L12.5,8.5" style="stroke:#ffffff; stroke-width:1.25px; stroke-opacity: 1; fill: none;" />',
    '</symbol>',
    '</svg>'].join('\\n')).appendTo('body');

  L.DivIcon.ColoredSvg = L.DivIcon.extend({
    options: {
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      className: 'leaflet-div-icon-iitc-generic-marker',
      // ^ actually any name, just to prevent default
      // ^ (as it's inappropriately styled)
      svgTemplate: '<svg style="fill: {color}"><use xlink:href="#marker-icon"/></svg>',
      color: '#a24ac3' // for draw-tools:
      // L.divIcon does not use the option `color`, but we store it here to
      // be able to simply retrieve the color for serializing markers
    },
    initialize: function (color, options) {
      L.DivIcon.prototype.initialize.call(this, options);
      if (color) { this.options.color = color; }
      this.options.html = L.Util.template(
        this.options.svgTemplate,
        { color: this.options.color }
      );
    }
  });
  L.divIcon.coloredSvg = function (color, options) {
    return new L.DivIcon.ColoredSvg(color, options);
  };
}

/*
OMS doesn't cancel the original click event, so the topmost marker will get a click event while spiderfying.
Also, OMS only supports a global callback for all managed markers. Therefore, we will use a custom event that gets fired
for each marker.
*/

window.setupOMS = function () {
  window.oms = new OverlappingMarkerSpiderfier(map, {
    keepSpiderfied: true,
    legWeight: 3.5,
    legColors: {
      usual: '#FFFF00',
      highlighted: '#FF0000'
    }
  });

  window.oms.addListener('click', function (marker) {
    map.closePopup();
    marker.fireEvent('spiderfiedclick', { target: marker });
  });
  window.oms.addListener('spiderfy', function () {
    map.closePopup();
  });
  map._container.addEventListener('keypress', function (ev) {
    if (ev.keyCode === 27) { // Esc
      window.oms.unspiderfy();
    }
  }, false);
};

window.registerMarkerForOMS = function (marker) {
  marker.on('add', function () {
    window.oms.addMarker(marker);
  });
  marker.on('remove', function () {
    window.oms.removeMarker(marker);
  });
  if (marker._map) { // marker has already been added
    window.oms.addMarker(marker);
  }
};

// BOOTING ///////////////////////////////////////////////////////////

function prepPluginsToLoad() {

  var priorities = {
    lowest: 100,
    low: 75,
    normal: 50,
    high: 25,
    highest: 0,
    boot: -100
  };

  function getPriority(data) {
    var v = data && data.priority || 'normal';
    var prio = v in priorities ? priorities[v] : v;
    if (typeof prio !== 'number') {
      log.warn('wrong plugin priority specified: ', v);
      prio = priorities.normal;
    }
    return prio;
  }

  if (!script_info.script) {
    log.warn('GM_info is not provided (improper userscript manager?)'); // IITC-Mobile for iOS
  }

  // executes setup function of plugin
  // and collects info for About IITC
  function safeSetup(setup) {
    if (typeof setup !== 'function') {
      log.warn('plugin must provide setup function');
      return;
    }
    var info = setup.info;
    if (typeof info !== 'object') {
      log.warn('plugin does not have proper wrapper:', { function: setup, info: setup.info, source: setup.toString() });
      info = {};
    }
    try {
      setup.call(this);
    } catch (err) {
      var name = info.script && info.script.name || info.pluginId;
      log.error('error starting plugin: ' + name,
        '\n' + err,
        '\nsetup: ', setup
      );
      info.error = err;
    }
    pluginsInfo.push(info);
  }

  if (window.bootPlugins) { // sort plugins by priority
    bootPlugins.sort(function (a, b) {
      return getPriority(a) - getPriority(b);
    });
  } else {
    window.bootPlugins = [];
  }

  var pluginsInfo = []; // for About IITC
  bootPlugins.info = pluginsInfo;

  // loader function returned
  // if called with parameter then load plugins with priorities up to specified
  return function (prio) {
    while (bootPlugins[0]) {
      if (prio && getPriority(bootPlugins[0]) > priorities[prio]) { break; }
      safeSetup(bootPlugins.shift());
    }
  };
}

function boot() {
  log.log('loading done, booting. Built: ' + '@build_date@');
  if (window.deviceID) {
    log.log('Your device ID: ' + window.deviceID);
  }
  window.runOnSmartphonesBeforeBoot();
  window.runOnAppBeforeBoot();

  var loadPlugins = prepPluginsToLoad();
  loadPlugins('boot');

  setupIngressMarkers();
  window.checkCookieLaw();
  window.extractFromStock();
  window.setupIdle();
  window.setupDialogs();
  window.setupDataTileParams();
  window.setupMap();
  window.setupOMS();
  window.ornaments.setup();
  layerChooser._lastPriority = 1000; // plugins overlays have priority >1000
  window.setupTooltips();
  window.chat.setup();
  window.updateGameScore();
  window.search.setup();
  window.portalDetail.setup();
  window.setupRedeem();
  window.setupSidebar();

  loadPlugins();

  window.runOnSmartphonesAfterBoot();
  window.runOnAppAfterBoot();

  // workaround for #129. Not sure why this is required.
  // setTimeout('window.map.invalidateSize(false);', 500);

  window.iitcLoaded = true;
  window.runHooks('iitcLoaded');
}

// Styles
require("../external/jquery-ui-1.12.1-resizable.css");
require("../style.css");

// Leaflet
window.L_NO_TOUCH = navigator.maxTouchPoints === 0; // prevent mobile style on desktop https://github.com/IITC-CE/ingress-intel-total-conversion/pull/189
require("leaflet");
require("leaflet/dist/leaflet.css");
require("leaflet.gridlayer.googlemutant");

require("../external/autolink-min.js"); // TODO move to dependencies
require("../external/L.Geodesic.js"); // TODO move to dependencies
require("../external/oms.min.js"); // TODO move to dependencies

// L.CanvasIconLayer = (function (module) { // FIXME: 
require("../external/rbush.min.js"); // TODO move to dependencies
L.CanvasIconLayer = require("../external/leaflet.canvas-markers.js")(L); // TODO move to dependencies
// }


// require("../external/jquery-3.6.0.min.js"); // TODO move to dependencies
// require("../external/jquery-ui-1.12.1.min.js"); // TODO move to dependencies
require("../external/taphold.js"); // TODO move to dependencies
require("../external/jquery.qrcode.min.js"); // TODO move to dependencies


if (document.readyState === 'complete') { // IITCm
  setTimeout(boot);
} else {
  window.addEventListener('load', function () {
    setTimeout(boot);
  });
}
