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

window.runOnAndroidBeforeBoot = function () {
  if (!isAndroid) { return; }

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
