/* global android -- eslint */

var isAndroid = typeof android !== 'undefined';
window.isAndroid = isAndroid;

window.useAndroidPanes = function () {
  // isSmartphone is important to disable panes in desktop mode
  return isAndroid && android.addPane && window.isSmartphone();
};

if (isAndroid) {
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
  if (android.setLayers) {
    // hook some additional code into the LayerControl so it's easy for the mobile app to interface with it
    window.LayerChooser.include({
      _setAndroidLayers: debounce(function () {
        var l = this.getLayers();
        android.setLayers(JSON.stringify(l.baseLayers), JSON.stringify(l.overlayLayers));
      }, 1000),

      setLabel: (function (setLabel) {
        return function () {
          this._setAndroidLayers();
          return setLabel.apply(this, arguments);
        };
      })(window.LayerChooser.prototype.setLabel),

      _update: function () {
        this._setAndroidLayers();
        return L.Control.Layers.prototype._update.apply(this, arguments);
      }
    });
  }
}

window.runOnAndroidBeforeBoot = function () {
  if (!isAndroid) { return; }

  if (android.showZoom) {
    window.mapOptions.zoomControl = android.showZoom();
  }

  extendLayerChooser();

  // add jquery listeners ******************************************************
  if (android.dialogOpened && android.dialogFocused) {
    $(document.body).on({
      // hints for iitc mobile
      dialogopen: function (e) {
        var id = $(e.target).data('id');
        android.dialogOpened(id, true);
      },
      dialogclose: function (e) {
        var id = $(e.target).data('id');
        android.dialogOpened(id, false);
      },
      dialogfocus: function (e) {
        var id = $(e.target).data('id');
        android.dialogFocused(id);
      }
    });
  }
  // notify android that a select spinner is enabled.
  // this disables javascript injection on android side.
  // if android is not notified, the spinner closes on the next JS call
  if (android.spinnerEnabled) {
    $(document.body).on('click', 'select', function () {
      android.spinnerEnabled(true);
    });
  }

  // add iitc hooks ************************************************************
  if (android.switchToPane) {
    window.addHook('paneChanged', function (name) { // https://stackoverflow.com/a/59158952/2520247
      android.switchToPane(name);
    });
  }

  // overwrite some functions **************************************************
  if (android.copy) {
    window.androidCopy = function (text) {
      android.copy(text);
      return false;
    };
  }
};

window.runOnAndroidAfterBoot = function () {
  if (!isAndroid) { return; }

  // add leaflet listeners *****************************************************
  if (android.setPermalink) {
    var setAndroidPermalink = function () {
      var p = window.selectedPortal && window.portals[window.selectedPortal];
      var href = window.makePermalink(p && p.getLatLng(), {
        fullURL: true,
        includeMapView: true
      });
      android.setPermalink(href);
    };

    window.map.on('moveend', setAndroidPermalink);
    window.addHook('portalSelected', setAndroidPermalink);
  }

  // hide layer chooser if booted with the iitcm android app
  if (android.setLayers) {
    $('.leaflet-control-layers').hide();
  }

  /* !!This block is commented out as it's unlikely that we still need this workaround
  //
  // for some reason, leaflet misses the WebView size being set at startup on IITC Mobile
  // create a short timer that checks for this issue
  setTimeout(function () { map.invalidateSize(); }, 0.2*1000);
  */

  if (android.bootFinished) { android.bootFinished(); }
};
