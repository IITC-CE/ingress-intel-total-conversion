/// SETUP /////////////////////////////////////////////////////////////
// these functions set up specific areas after the boot function
// created a basic framework. All of these functions should only ever
// be run once.

window.setupLargeImagePreview = function () {
  $('#portaldetails').on('click', '.imgpreview', function (e) {
    var img = this.querySelector('img');
    //dialogs have 12px padding around the content
    var dlgWidth = Math.max(img.naturalWidth+24,500);
    // This might be a case where multiple dialogs make sense, for example
    // someone might want to compare images of multiple portals.  But
    // usually we only want to show one version of each image.
    // To support that, we'd need a unique key per portal.  Example, guid.
    // So that would have to be in the html fetched into details.

    var preview = new Image(img.width, img.height);
    preview.src = img.src;
    preview.style = 'margin: auto; display: block';
    var title = e.delegateTarget.querySelector('.title').innerText;
    dialog({
      html: preview,
      title: title,
      id: 'iitc-portal-image',
      width: dlgWidth,
    });
  });
}

// adds listeners to the layer chooser such that a long press hides
// all custom layers except the long pressed one.
window.setupLayerChooserSelectOne = function() {
  $('.leaflet-control-layers-overlays').on('click taphold', 'label', function(e) {
    if(!e) return;
    if(!(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.type === 'taphold')) return;
    var m = window.map;

    var add = function(layer) {
      if(!m.hasLayer(layer.layer)) m.addLayer(layer.layer);
    };
    var rem = function(layer) {
      if(m.hasLayer(layer.layer)) m.removeLayer(layer.layer);
    };

    var isChecked = $(e.target).find('input').is(':checked');
    var checkSize = $('.leaflet-control-layers-overlays input:checked').length;
    if((isChecked && checkSize === 1) || checkSize === 0) {
      // if nothing is selected or the users long-clicks the only
      // selected element, assume all boxes should be checked again
      $.each(window.layerChooser._layers, function(ind, layer) {
        if(!layer.overlay) return true;
        add(layer);
      });
    } else {
      // uncheck all
      var keep = $.trim($(e.target).text());
      $.each(window.layerChooser._layers, function(ind, layer) {
        if(layer.overlay !== true) return true;
        if(layer.name === keep) { add(layer);  return true; }
        rem(layer);
      });
    }
    e.preventDefault();
  });
}

// Setup the function to record the on/off status of overlay layerGroups
window.setupLayerChooserStatusRecorder = function() {
  // Record already added layerGroups
  $.each(window.layerChooser._layers, function(ind, chooserEntry) {
    if(!chooserEntry.overlay) return true;
    var display = window.map.hasLayer(chooserEntry.layer);
    window.updateDisplayedLayerGroup(chooserEntry.name, display);
  });

  // Record layerGroups change
  window.map.on('overlayadd overlayremove', function(e) {
    var display = (e.type === 'overlayadd');
    window.updateDisplayedLayerGroup(e.name, display);
  });
}

window.setupStyles = function() {
  $('head').append('<style>' +
    [ '#largepreview.enl img { border:2px solid '+COLORS[TEAM_ENL]+'; } ',
      '#largepreview.res img { border:2px solid '+COLORS[TEAM_RES]+'; } ',
      '#largepreview.none img { border:2px solid '+COLORS[TEAM_NONE]+'; } ',
      '#chatcontrols { bottom: '+(CHAT_SHRINKED+22)+'px; }',
      '#chat { height: '+CHAT_SHRINKED+'px; } ',
      '.leaflet-right { margin-right: '+(SIDEBAR_WIDTH+1)+'px } ',
      '#updatestatus { width:'+(SIDEBAR_WIDTH+2)+'px;  } ',
      '#sidebar { width:'+(SIDEBAR_WIDTH + HIDDEN_SCROLLBAR_ASSUMED_WIDTH + 1 /*border*/)+'px;  } ',
      '#sidebartoggle { right:'+(SIDEBAR_WIDTH+1)+'px;  } ',
      '#scrollwrapper  { width:'+(SIDEBAR_WIDTH + 2*HIDDEN_SCROLLBAR_ASSUMED_WIDTH)+'px; right:-'+(2*HIDDEN_SCROLLBAR_ASSUMED_WIDTH-2)+'px } ',
      '#sidebar > * { width:'+(SIDEBAR_WIDTH+1)+'px;  }'].join("\n")
    + '</style>');
}

window.setupIcons = function() {
  $(['<svg>',
      // Material Icons

      // portal_detail_display.js
      '<symbol id="ic_place_24px" viewBox="0 0 24 24">',
        '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/>',
      '</symbol>',
    '</svg>'].join('\\n')).appendTo('body');
}


// renders player details into the website. Since the player info is
// included as inline script in the original site, the data is static
// and cannot be updated.
window.setupPlayerStat = function() {
  // stock site updated to supply the actual player level, AP requirements and XM capacity values
  var level = PLAYER.verified_level;
  PLAYER.level = level; //for historical reasons IITC expects PLAYER.level to contain the current player level

  var n = window.PLAYER.nickname;
  PLAYER.nickMatcher = new RegExp('\\b('+n+')\\b', 'ig');

  var ap = parseInt(PLAYER.ap);
  var thisLvlAp = parseInt(PLAYER.min_ap_for_current_level);
  var nextLvlAp = parseInt(PLAYER.min_ap_for_next_level);

  if (nextLvlAp) {
    var lvlUpAp = digits(nextLvlAp-ap);
    var lvlApProg = Math.round((ap-thisLvlAp)/(nextLvlAp-thisLvlAp)*100);
  } // else zero nextLvlAp - so at maximum level(?)

  var xmMax = parseInt(PLAYER.xm_capacity);
  var xmRatio = Math.round(PLAYER.energy/xmMax*100);

  var cls = PLAYER.team === 'RESISTANCE' ? 'res' : 'enl';


  var t = 'Level:\t' + level + '\n'
        + 'XM:\t' + PLAYER.energy + ' / ' + xmMax + '\n'
        + 'AP:\t' + digits(ap) + '\n'
        + (nextLvlAp > 0 ? 'level up in:\t' + lvlUpAp + ' AP' : 'Maximum level reached(!)')
        + '\n\Invites:\t'+PLAYER.available_invites
        + '\n\nNote: your player stats can only be updated by a full reload (F5)';

  $('#playerstat').html(''
    + '<h2 title="'+t+'">'+level+'&nbsp;'
    + '<div id="name">'
    + '<span class="'+cls+'">'+PLAYER.nickname+'</span>'
    + '<a href="https://intel.ingress.com/logout" id="signout">sign out</a>'
    + '</div>'
    + '<div id="stats">'
    + '<sup>XM: '+xmRatio+'%</sup>'
    + '<sub>' + (nextLvlAp > 0 ? 'level: '+lvlApProg+'%' : 'max level') + '</sub>'
    + '</div>'
    + '</h2>'
  );
}

window.setupSidebarToggle = function() {
  $('#sidebartoggle').on('click', function() {
    var toggle = $('#sidebartoggle');
    var sidebar = $('#scrollwrapper');
    if(sidebar.is(':visible')) {
      sidebar.hide();
      $('.leaflet-right').css('margin-right','0');
      toggle.html('<span class="toggle open"></span>');
      toggle.css('right', '0');
    } else {
      sidebar.show();
      window.resetScrollOnNewPortal();
      $('.leaflet-right').css('margin-right', SIDEBAR_WIDTH+1+'px');
      toggle.html('<span class="toggle close"></span>');
      toggle.css('right', SIDEBAR_WIDTH+1+'px');
    }
    $('.ui-tooltip').remove();
  });
}

window.setupTooltips = function(element) {
  element = element || $(document);
  element.tooltip({
    // disable show/hide animation
    show: { effect: 'none', duration: 0, delay: 350 },
    hide: false,
    open: function(event, ui) {
      // ensure all other tooltips are closed
      $(".ui-tooltip").not(ui.tooltip).remove();
    },
    content: function() {
      var title = $(this).attr('title');
      return window.convertTextToTableMagic(title);
    }
  });

  if(!window.tooltipClearerHasBeenSetup) {
    window.tooltipClearerHasBeenSetup = true;
    $(document).on('click', '.ui-tooltip', function() { $(this).remove(); });
  }
}

window.setupLayerChooserApi = function() {
  // hide layer chooser if booted with the iitcm android app
  if (typeof android !== 'undefined' && android && android.setLayers) {
    $('.leaflet-control-layers').hide();
  }

  //hook some additional code into the LayerControl so it's easy for the mobile app to interface with it
  //WARNING: does depend on internals of the L.Control.Layers code
  window.layerChooser.getLayers = function() {
    var baseLayers = [];
    var overlayLayers = [];
    this._layers.forEach(function (obj,idx) {
      var layerActive = window.map.hasLayer(obj.layer);
      var info = {
        layerId: idx,
        name: obj.name,
        active: layerActive
      }
      if (obj.overlay) {
        overlayLayers.push(info);
      } else {
        baseLayers.push(info);
      }
    });

    var overlayLayersJSON = JSON.stringify(overlayLayers);
    var baseLayersJSON = JSON.stringify(baseLayers);

    if (typeof android !== 'undefined' && android && android.setLayers) {
        if(this.androidTimer) clearTimeout(this.androidTimer);
        this.androidTimer = setTimeout(function() {
            this.androidTimer = null;
            android.setLayers(baseLayersJSON, overlayLayersJSON);
        }, 1000);
    }

    return {
      baseLayers: baseLayers,
      overlayLayers: overlayLayers
    }
  }

  window.layerChooser.showLayer = function(id,show) {
    if (show === undefined) show = true;
    obj = this._layers[id];
    if (!obj) return false;

    if(show) {
      if (!this._map.hasLayer(obj.layer)) {
        //the layer to show is not currently active
        this._map.addLayer(obj.layer);

        //if it's a base layer, remove any others
        if (!obj.overlay) {
          for(i in this._layers) {
            if (i != id) {
              var other = this._layers[i];
              if (!other.overlay && this._map.hasLayer(other.layer)) this._map.removeLayer(other.layer);
            }
          }
        }
      }
    } else {
      if (this._map.hasLayer(obj.layer)) {
        this._map.removeLayer(obj.layer);
      }
    }

    /* this code seems obsolete.

    //below logic based on code in L.Control.Layers _onInputClick
    if(!obj.overlay) {
      this._map.setZoom(this._map.getZoom());
      this._map.fire('baselayerchange', {layer: obj.layer});
    }
    */
    return true;
  };

  var _update = window.layerChooser._update;
  window.layerChooser._update = function() {
    // update layer menu in IITCm
    try {
      if (typeof android !== 'undefined')
        window.layerChooser.getLayers();
    } catch (e) {
      log.error(e);
    }
    // call through
    return _update.apply(this, arguments);
  }
  // as this setupLayerChooserApi function is called after the layer menu is populated, we need to also get they layers once
  // so they're passed through to the android app
  try {
    if (typeof android !== 'undefined')
      window.layerChooser.getLayers();
  } catch (e) {
    log.error(e);
  }
}

function setupIngressMarkers () {
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
  }

  function getPriority (data) {
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
  function safeSetup (setup) {
    if (!setup) {
      log.warn('plugin must provide setup function');
      return;
    }
    var info = setup.info;
    if (typeof info !== 'object') {
      log.warn('plugin does not have proper wrapper:',setup);
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
    bootPlugins.sort(function (a,b) {
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
  if(!isSmartphone()) // TODO remove completely?
    window.debug.console.overwriteNativeIfRequired();

  log.log('loading done, booting. Built: '+'@build_date@');
  if (window.deviceID) {
    log.log('Your device ID: ' + window.deviceID);
  }
  window.runOnSmartphonesBeforeBoot();

  var loadPlugins = prepPluginsToLoad();
  loadPlugins('boot');

  setupIngressMarkers();
  window.extractFromStock();
  window.setupIdle();
  window.setupStyles();
  window.setupIcons();
  window.setupDialogs();
  window.setupDataTileParams();
  window.setupMap();
  window.setupOMS();
  window.search.setup();
  window.setupRedeem();
  window.setupLargeImagePreview();
  window.setupSidebarToggle();
  window.updateGameScore();
  window.artifact.setup();
  window.ornaments.setup();
  window.setupPlayerStat();
  window.setupTooltips();
  window.chat.setup();
  window.portalDetail.setup();
  window.setupLayerChooserSelectOne();
  window.setupLayerChooserStatusRecorder();
  // read here ONCE, so the URL is only evaluated one time after the
  // necessary data has been loaded.
  urlPortalLL = getURLParam('pll');
  if(urlPortalLL) {
    urlPortalLL = urlPortalLL.split(",");
    urlPortalLL = [parseFloat(urlPortalLL[0]) || 0.0, parseFloat(urlPortalLL[1]) || 0.0];
  }
  urlPortal = getURLParam('pguid');

  $('#sidebar').show();

  loadPlugins();

  window.setMapBaseLayer();
  window.setupLayerChooserApi();

  window.runOnSmartphonesAfterBoot();

  // workaround for #129. Not sure why this is required.
  // setTimeout('window.map.invalidateSize(false);', 500);

  window.iitcLoaded = true;
  window.runHooks('iitcLoaded');

  if (typeof android !== 'undefined' && android.bootFinished) {
    android.bootFinished();
  }

}

/*
OMS doesn't cancel the original click event, so the topmost marker will get a click event while spiderfying.
Also, OMS only supports a global callback for all managed markers. Therefore, we will use a custom event that gets fired
for each marker.
*/

window.setupOMS = function() {
  window.oms = new OverlappingMarkerSpiderfier(map, {
    keepSpiderfied: true,
    legWeight: 3.5,
    legColors: {
      usual: '#FFFF00',
      highlighted: '#FF0000'
    }
  });

  window.oms.addListener('click', function(marker) {
    map.closePopup();
    marker.fireEvent('spiderfiedclick', {target: marker});
  });
  window.oms.addListener('spiderfy', function(markers) {
    map.closePopup();
  });
  map._container.addEventListener("keypress", function(ev) {
    if(ev.keyCode === 27) // Esc
      window.oms.unspiderfy();
  }, false);
}

window.registerMarkerForOMS = function(marker) {
  marker.on('add', function () {
    window.oms.addMarker(marker);
  });
  marker.on('remove', function () {
    window.oms.removeMarker(marker);
  });
  if(marker._map) // marker has already been added
    window.oms.addMarker(marker);
}

try {
  '@include_raw:external/autolink-min.js@';

  window.L_NO_TOUCH = navigator.maxTouchPoints===0; // prevent mobile style on desktop https://github.com/IITC-CE/ingress-intel-total-conversion/pull/189
  '@include_raw:external/leaflet-src.js@';
  '@include_raw:external/L.Geodesic.js@';
  '@include_raw:external/Leaflet.GoogleMutant.js@';
  '@include_raw:external/oms.min.js@';
  L.CanvasIconLayer = (function (module) {
    '@include_raw:external/rbush.min.js@';
    '@include_raw:external/leaflet.canvas-markers.js@';
    return module;
  }({})).exports(L);

  '@include_raw:external/jquery-3.6.0.min.js@';
  '@include_raw:external/jquery-ui-1.12.1.min.js@';
  '@include_raw:external/taphold.js@';
  '@include_raw:external/jquery.qrcode.min.js@';

} catch (e) {
  log.error("External's js loading failed");
  throw e;
}

if (document.readyState === 'complete') { // IITCm
  setTimeout(boot);
} else {
  window.addEventListener('load', function () {
    setTimeout(boot);
  });
}
