/* global L -- eslint */

/**
 * @file This file contains the main JavaScript code for the app, including utility functions,
 *       app-specific behaviors, and integration with the Android environment.
 * @module app
 */

/**
 * Global flag indicating whether the app is running as a standalone app or within a browser.
 * @type {boolean}
 * @memberof module:app
 */
var isApp = typeof app !== 'undefined' || typeof android !== 'undefined';
window.isApp = isApp;

/**
 * Determines whether to use the interface for mobile devices depending on the application environment and device type.
 *
 * @function useAppPanes
 * @returns {boolean} Returns true if app panes should be used, false otherwise.
 */
window.useAppPanes = function () {
  // isSmartphone is important to disable panes in desktop mode
  return isApp && window.app.addPane && window.isSmartphone();
};
window.useAndroidPanes = window.useAppPanes; // compatibility

if (isApp) {
  if (typeof app === 'undefined') {
    // compatibility
    window.app = window.android;
  } else {
    window.android = window.app;
  }

  window.requestFile = function (callback) {
    // deprecated
    L.FileListLoader.loadFiles().on('load', function (e) {
      callback(e.file.name, e.reader.result);
    });
  };
}

/**
 * Returns a function, that, as long as it continues to be invoked, will not be triggered.
 * The function will be called after it stops being called for N milliseconds.
 * source: https://gist.github.com/nmsdvid/8807205#gistcomment-2641356
 *
 * @function debounce
 * @param {Function} callback - The function to debounce.
 * @param {number} time - The debounce time in milliseconds.
 * @returns {Function} Returns a debounced version of the given function.
 */
function debounce(callback, time) {
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

function extendLayerChooser() {
  if (window.app.setLayers) {
    // hook some additional code into the LayerControl so it's easy for the mobile app to interface with it
    window.LayerChooser.include({
      _setAppLayers: debounce(function () {
        var l = this.getLayers();
        window.app.setLayers(JSON.stringify(l.baseLayers), JSON.stringify(l.overlayLayers));
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
      },
    });
  }
}

window.runOnAppBeforeBoot = function () {
  if (!isApp) {
    return;
  }

  if (window.app.showZoom) {
    window.mapOptions.zoomControl = window.app.showZoom();
  }

  extendLayerChooser();

  // add jquery listeners ******************************************************
  if (window.app.dialogOpened && window.app.dialogFocused) {
    $(document.body).on({
      // hints for iitc mobile
      dialogopen: function (e) {
        var id = $(e.target).data('id');
        window.app.dialogOpened(id, true);
      },
      dialogclose: function (e) {
        var id = $(e.target).data('id');
        window.app.dialogOpened(id, false);
      },
      dialogfocus: function (e) {
        var id = $(e.target).data('id');
        window.app.dialogFocused(id);
      },
    });
  }
  // notify app that a select spinner is enabled.
  // this disables javascript injection on app's side.
  // if app is not notified, the spinner closes on the next JS call
  if (window.app.spinnerEnabled) {
    $(document.body).on('click', 'select', function () {
      window.app.spinnerEnabled(true);
    });
  }

  // add iitc hooks ************************************************************
  if (window.app.switchToPane) {
    window.addHook('paneChanged', function (name) {
      // https://stackoverflow.com/a/59158952/2520247
      window.app.switchToPane(name);
    });
  }

  // overwrite some functions **************************************************
  if (window.app.copy) {
    window.androidCopy = function (text) {
      window.app.copy(text);
      return false;
    };
  }

  if (window.app.saveFile) {
    window.saveFile = function (data, filename, dataType) {
      window.app.saveFile(filename || '', dataType || '*/*', data);
    };
  }

  if (window.app.intentPosLink) {
    window.renderPortalUrl = function (lat, lng, title, guid) {
      // one share link option - and the app provides an interface to share the URL,
      // share as a geo: intent (navigation via google maps), etc

      var shareLink = $('<a>')
        .text('Share portal')
        .click(function () {
          window.app.intentPosLink(lat, lng, window.map.getZoom(), title, true, guid);
        });
      $('.linkdetails').append($('<aside>').append(shareLink));
    };
  }
};

window.runOnAppAfterBoot = function () {
  if (!isApp) {
    return;
  }

  if (window.app.intentPosLink) {
    $('#permalink').click(function (e) {
      e.preventDefault();
      var center = window.map.getCenter();
      window.app.intentPosLink(center.lat, center.lng, window.map.getZoom(), 'Selected map view', false);
    });
  }

  // add leaflet listeners *****************************************************
  if (window.app.setPermalink) {
    var setAppPermalink = function () {
      var p = window.selectedPortal && window.portals[window.selectedPortal];
      var href = window.makePermalink(p && p.getLatLng(), {
        fullURL: true,
        includeMapView: true,
      });
      window.app.setPermalink(href);
    };

    window.map.on('moveend', setAppPermalink);
    window.addHook('portalSelected', setAppPermalink);
  }

  // hide layer chooser if booted with the iitcm app
  if (window.app.setLayers) {
    $('.leaflet-control-layers').hide();
  }

  /* !!This block is commented out as it's unlikely that we still need this workaround
  //
  // for some reason, leaflet misses the WebView size being set at startup on IITC Mobile
  // create a short timer that checks for this issue
  setTimeout(function () { map.invalidateSize(); }, 0.2*1000);
  */

  if (window.app.bootFinished) {
    window.app.bootFinished();
  }
};
