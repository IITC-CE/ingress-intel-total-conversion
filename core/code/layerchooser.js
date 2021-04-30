/*
 * @class LayerChooser
 * @aka window.LayerChooser
 * @inherits L.Controls.Layers
 *
 * Provides 'persistence' of layers display state between sessions, saving it to localStorage.
 * Every overlay is added to map automatically if it's last state was active.
 * When no record exists - active is assumed, except when layer has option `defaultDisabled`.
 * And with `notPersistent` layer option it is possible to suppress it's status tracking.
 *
 * Also some additional methods provided, see below.
 */

'use strict';

var LayerChooser = L.Control.Layers.extend({
  options: {
    // @option sortLayers: Boolean = true
    // Ensures stable sort order (based on initial), while still providing ability
    // to enforce specific order with layer's `sortPriority` option,
    // which lower value means layer's upper position.
    //
    // If `sortPriority` is not specified - it will be assigned implicitly in increasing manner.
    sortLayers: true,

    sortFunction: function (layerA, layerB) {
      var a = layerA.options.sortPriority;
      var b = layerB.options.sortPriority;
      return a < b ? -1 : (b < a ? 1 : 0);
    }
  },

  initialize: function (baseLayers, overlays, options) {
    this._overlayStatus = {};
    var layersJSON = localStorage['ingress.intelmap.layergroupdisplayed'];
    if (layersJSON) {
      try {
        this._overlayStatus = JSON.parse(layersJSON);
      } catch (e) {
        log.error(e);
      }
    }
    this._mapToAdd = options && options.map;
    this.lastBaseLayerName = localStorage['iitc-base-map'];
    this._lastPriority = -1000; // initial layers get priority <0
    L.Control.Layers.prototype.initialize.apply(this, arguments);
    this._lastPriority = 0; // any following gets >0
  },

  _addLayer: function (layer, label, overlay, options) { // todo process .sortPriority/.defaultDisabled ??
    options = options || {};
    if (!layer._name) {
      // name is stored on first add (with .addBaseLayer/.addOverlay)
      // should be unique, otherwise behavior of other methods is undefined (typically: first found will be taken)
      layer._name = label;
      layer._overlay = overlay;
    } else {
      label = label || layer._label || layer._name;
    }
    L.Control.Layers.prototype._addLayer.call(this, layer, label, overlay);
    // provide stable sort order
    if (!('sortPriority' in layer.options)) {
      this._lastPriority = this._lastPriority + 10;
      layer.options.sortPriority = this._lastPriority;
    }
    if (layer.options.notPersistent) {
      layer._statusTracking = L.Util.falseFn; // dummy
      if (overlay && !layer.options.defaultDisabled) {
        layer.addTo(this._map || this._mapToAdd);
      }
      return;
    }
    if (overlay) {
      layer._statusTracking = function (e) {
        this._storeOverlayState(layer._name, e.type === 'add');
      };
      layer.on('add remove', layer._statusTracking, this);
      var map = this._map || this._mapToAdd;
      if ('enable' in options) { // do as explicitly specified
        map[options.enable ? 'addLayer' : 'removeLayer'](layer);
      } else if (layer._map) { // already on map, only store state
        this._storeOverlayState(layer._name, true);
      } else { // restore at recorded state
        var defaultState = !layer.options.defaultDisabled;
        if (this._isOverlayDisplayed(layer._name, defaultState)) {
          layer.addTo(map);
        }
      }
    } else {
      layer._statusTracking = function () {
        localStorage['iitc-base-map'] = layer._name;
      };
      layer.on('add', layer._statusTracking);
    }
  },

  // @method addOverlay(layer: Layer, name: String, options: Object): this //todo
  // Adds an overlay (checkbox entry) with the given name to the control.
  addOverlay: function (layer, name, options) {
    this._addLayer(layer, name, true, options);
    return (this._map) ? this._update() : this;
  },

  // @method removeLayer(layer: Layer|String, keepOnMap?: Boolean): this
  // Removes the given layer from the control.
  // Either layer object or it's name in the control must be specified.
  // Layer is removed from the map as well, except `keepOnMap` argument is true.
  removeLayer: function (layer, keepOnMap) {
    layer = this.getLayer(layer);
    if (layer && layer._statusTracking) {
      layer.off('add remove', layer._statusTracking, this);
      delete layer._statusTracking;
      L.Control.Layers.prototype.removeLayer.apply(this, arguments);
      if (this._map && !keepOnMap) {
        map.removeLayer(layer);
      }
    } else {
      log.warn('Layer not found');
    }
    return this;
  },

  _storeOverlayState: function (name, isDisplayed) {
    this._overlayStatus[name] = isDisplayed;
    localStorage['ingress.intelmap.layergroupdisplayed'] = JSON.stringify(this._overlayStatus);
  },

  _isOverlayDisplayed: function (name, defaultState) {
    if (name in this._overlayStatus) {
      return this._overlayStatus[name];
    }
    return defaultState;
  },

  __byName: function (el) {
    var name = this.toString();
    return el.layer._name === name ||
      el.name === name;
  },

  __byLayer: function (el) {
    return el.layer === this;
  },

  // layer: either Layer or it's name in the control
  _layerInfo: function (layer) {
    var fn = layer instanceof L.Layer
      ? this.__byLayer
      : this.__byName;
    return this._layers.find(fn, layer);
  },

  // @method getLayer(name: String|Layer): Layer
  // Returns layer by it's name in the control, or by layer object itself.
  // The latter can be used to ensure the layer is in layerChooser.
  getLayer: function (layer) {
    var info = this._layerInfo(layer);
    return info && info.layer;
  },

  // @method showLayer(layer: Layer|String|Number, display?: Boolean): this
  // Switches layer's display state to given value (true by default).
  // Layer can be specified also by it's name in the control.
  showLayer: function (layer, display) {
    var info = this._layers[layer]; // layer is index, private use only
    if (info) {
      layer = info.layer;
    } else {
      layer = this.getLayer(layer);
      if (!layer) {
        log.warn('Layer not found');
        return this;
      }
    }
    var map = this._map;
    if (display || arguments.length === 1) {
      if (!map.hasLayer(layer)) {
        if (!layer._overlay) {
          // if it's a base layer, remove any others
          this._layers.forEach(function (el) {
            if (!el.overlay && el.layer !== layer) {
              map.removeLayer(el.layer);
            }
          });
        }
        map.addLayer(layer);
      }
    } else {
      map.removeLayer(layer);
    }
    return this;
  },

  // @method setLabel(layer: String|Layer, label?: String): this
  // Sets layers label to specified label text (html),
  // or resets it to original name when label is not specified.
  setLabel: function (layer, label) {
    var fn = layer instanceof L.Layer
      ? this.__byLayer
      : this.__byName;
    var idx = this._layers.findIndex(fn, layer);
    if (idx === -1) {
      log.warn('Layer not found');
      return this;
    }
    var info = this._layers[idx];
    label = label || info.layer._name;
    info.name = label;
    var nameEl = this._layerControlInputs[idx].closest('label').querySelector('span');
    nameEl.innerHTML = ' ' + label;
    return this;
  },

  // adds listeners to the overlays list to make inputs toggleable.
  _initLayout: function () {
    L.Control.Layers.prototype._initLayout.call(this);
    $(this._overlaysList).on('click taphold', 'label', function (e) {
      if (!(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.type === 'taphold')) {
        return;
      }
      // e.preventDefault(); // seems no effect
      var input = e.target.closest('label').querySelector('input');
      var idx = this._layerControlInputs.indexOf(input);
      this._toggleOverlay(idx);
    }.bind(this));
  },

  _filterOverlays: function (el) {
    return el.overlay &&
      ['DEBUG Data Tiles', 'Resistance', 'Enlightened'].indexOf(el.layer._name) === -1;
  },

  // Hides all the control's overlays except given one,
  // or restores all, if it was the only one displayed (or none was displayed).
  _toggleOverlay: function (idx) {
    var info = this._layers[idx];
    if (!info || !info.overlay) {
      log.warn('Overlay not found: ', info);
      return;
    }
    var map = this._map;

    var isChecked = map.hasLayer(info.layer);
    var checked = 0;
    var overlays = this._layers.filter(this._filterOverlays);
    overlays.forEach(function (el) {
      if (map.hasLayer(el.layer)) { checked++; }
    });

    if (checked === 0 || isChecked && checked === 1) {
      // if nothing is selected, or specified overlay is exclusive,
      // assume all boxes should be checked again
      overlays.forEach(function (el) {
        if (!el.layer.options.defaultDisabled) {
          map.addLayer(el.layer);
        }
      });
    } else {
      // uncheck all, check specified
      overlays.forEach(function (el) {
        if (el.layer === info.layer) {
          map.addLayer(el.layer);
        } else {
          map.removeLayer(el.layer);
        }
      });
    }
  },

  _stripHtmlTags: function (str) {
    return str.replace(/(<([^>]+)>)/gi, ''); // https://css-tricks.com/snippets/javascript/strip-html-tags-in-javascript/
  },

  // !!deprecated
  getLayers: function () {
    var baseLayers = [];
    var overlayLayers = [];
    this._layers.forEach(function (info, idx) {
      (info.overlay ? overlayLayers : baseLayers).push({
        layerId: idx,
        name: this._stripHtmlTags(info.name), // IITCm does not support html in layers labels
        active: this._map.hasLayer(info.layer)
      });
    }, this);

    return {
      baseLayers: baseLayers,
      overlayLayers: overlayLayers
    };
  }
});

window.LayerChooser = LayerChooser;

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

if (typeof android !== 'undefined' && android && android.setLayers) {
  // hook some additional code into the LayerControl so it's easy for the mobile app to interface with it
  LayerChooser.include({
    _setAndroidLayers: debounce(function () { // update layer menu in IITCm
      var l = this.getLayers();
      android.setLayers(JSON.stringify(l.baseLayers), JSON.stringify(l.overlayLayers));
    }, 1000),

    setLabel: (function (setLabel) {
      return function () {
        this._setAndroidLayers();
        return setLabel.apply(this, arguments);
      };
    })(LayerChooser.prototype.setLabel),

    _update: function () {
      this._setAndroidLayers();
      return L.Control.Layers.prototype._update.apply(this, arguments);
    }
  });
}

// contains current status(on/off) of overlay layerGroups.
// !!deprecated: use `map.hasLayer` instead (https://leafletjs.com/reference.html#map-haslayer)
window.overlayStatus = {}; // to be set in constructor

// Reads recorded layerGroup status (as it may not be added to map yet),
// return `defaultDisplay` if no record found.
// !!deprecated: for most use cases prefer `getLayer()` method
// or `map.hasLayer` (https://leafletjs.com/reference.html#map-haslayer)
// window.isLayerGroupDisplayed = function (name, defaultDisplay) { // ...
window.isLayerGroupDisplayed = L.Util.falseFn; // to be set in constructor

LayerChooser.addInitHook(function () {
  window.overlayStatus = this._overlayStatus;
  window.isLayerGroupDisplayed = this._isOverlayDisplayed.bind(this);
});

// !!deprecated: use `layerChooser.addOverlay` directly (https://leafletjs.com/reference.html#control-layers-addoverlay)
// persistent status is now handled automatically by layerChooser.
// `defaultDisabled` state should be set as `layerGroup` option.
window.addLayerGroup = function (name, layerGroup, defaultDisplay) {
  if (defaultDisplay === false) {
    layerGroup.options.defaultDisabled = true;
  }
  window.layerChooser.addOverlay(layerGroup, name);
};

// !!deprecated: use `layerChooser.removeLayer` directly
// our method differs from inherited (https://leafletjs.com/reference.html#control-layers-removelayer),
// as (by default) layer is removed from the map as well, see description for more details.
window.removeLayerGroup = function (layerGroup) {
  window.layerChooser.removeLayer(layerGroup);
};
