/* global android, app -- eslint */

var isApp = typeof app !== 'undefined' || typeof android !== 'undefined';
window.isApp = isApp;

window.useAppPanes = function () {
  // isSmartphone is important to disable panes in desktop mode
  return isApp && app.addPane && window.isSmartphone();
};
window.useAndroidPanes = window.useAppPanes; // compatibility

if (isApp) {
  if (typeof app === 'undefined') { // compatibility
    window.app = android;
  } else {
    window.android = app;
  }

  window.requestFile = function (callback) { // deprecated
    L.FileListLoader.loadFiles()
      .on('load', function (e) {
        callback(e.file.name, e.reader.result);
      });
  };
}

function debounce (callback, time) { // https://gist.github.com/nmsdvid/8807205#gistcomment-2641356
  var timeout;
  return function () {
    var context = this;
    var args = arguments;
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(function () {
      timeout = null;
      callback.apply(context, args);
    }, time);
  };
}

function extendLayerChooser () {
  if (app.setLayers) {
    // hook some additional code into the LayerControl so it's easy for the mobile app to interface with it
    window.LayerChooser.include({
      _setAppLayers: debounce(function () {
        var l = this.getLayers();
        app.setLayers(JSON.stringify(l.baseLayers), JSON.stringify(l.overlayLayers));
      }, 1000),

      setLabel: (function (setLabel) {
        return function () {
          this._setAppLayers();
          return setLabel.apply(this, arguments);
        };
      })(window.LayerChooser.prototype.setLabel),

      _update: function () {
        this._setAppLayers();
        return L.Control.Layers.prototype._update.apply(this, arguments);
      }
    });
  }
}

window.runOnAppBeforeBoot = function () {
  if (!isApp) { return; }

  if (app.showZoom) {
    window.mapOptions.zoomControl = app.showZoom();
  }

  extendLayerChooser();

  // add jquery listeners ******************************************************
  if (app.dialogOpened && app.dialogFocused) {
    $(document.body).on({
      // hints for iitc mobile
      dialogopen: function (e) {
        var id = $(e.target).data('id');
        app.dialogOpened(id, true);
      },
      dialogclose: function (e) {
        var id = $(e.target).data('id');
        app.dialogOpened(id, false);
      },
      dialogfocus: function (e) {
        var id = $(e.target).data('id');
        app.dialogFocused(id);
      }
    });
  }
  // notify app that a select spinner is enabled.
  // this disables javascript injection on app's side.
  // if app is not notified, the spinner closes on the next JS call
  if (app.spinnerEnabled) {
    $(document.body).on('click', 'select', function () {
      app.spinnerEnabled(true);
    });
  }

  // add iitc hooks ************************************************************
  if (app.switchToPane) {
    window.addHook('paneChanged', function (name) { // https://stackoverflow.com/a/59158952/2520247
      app.switchToPane(name);
    });
  }

  // overwrite some functions **************************************************
  if (app.copy) {
    window.androidCopy = function (text) {
      app.copy(text);
      return false;
    };
  }

  if (app.saveFile) {
    window.saveFile = function (data, filename, dataType) {
      app.saveFile(filename || '', dataType || '*/*', data);
    };
  }

  if (app.intentPosLink) {
    window.renderPortalUrl = function (lat, lng, title) {
      // one share link option - and the app provides an interface to share the URL,
      // share as a geo: intent (navigation via google maps), etc

      var shareLink = $('<a>').text('Share portal').click(function () {
        app.intentPosLink(lat, lng, window.map.getZoom(), title, true);
      });
      $('.linkdetails').append($('<aside>').append(shareLink));
    };
  }
};

window.runOnAppAfterBoot = function () {
  if (!isApp) { return; }

  if (app.intentPosLink) {
    $('#permalink').click(function (e) {
      e.preventDefault();
      var center = window.map.getCenter();
      app.intentPosLink(center.lat, center.lng, window.map.getZoom(), 'Selected map view', false);
    });
  }

  // add leaflet listeners *****************************************************
  if (app.setPermalink) {
    var setAppPermalink = function () {
      var p = window.selectedPortal && window.portals[window.selectedPortal];
      var href = window.makePermalink(p && p.getLatLng(), {
        fullURL: true,
        includeMapView: true
      });
      app.setPermalink(href);
    };

    window.map.on('moveend', setAppPermalink);
    window.addHook('portalSelected', setAppPermalink);
  }

  // hide layer chooser if booted with the iitcm app
  if (app.setLayers) {
    $('.leaflet-control-layers').hide();
  }

  /* !!This block is commented out as it's unlikely that we still need this workaround
  //
  // for some reason, leaflet misses the WebView size being set at startup on IITC Mobile
  // create a short timer that checks for this issue
  setTimeout(function () { map.invalidateSize(); }, 0.2*1000);
  */

  if (app.bootFinished) { app.bootFinished(); }
};
