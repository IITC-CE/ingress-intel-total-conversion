/*
 * @class LayerChooser
 * @aka window.LayerChooser
 * @inherits L.Controls.Layers
 *
 * Provides 'persistence' of layers display state between sessions.
 *
 * Also some additional methods provided, see below.
 */

'use strict';

var LayerChooser = L.Control.Layers.extend({
  options: {
    // @option sortLayers: Boolean = true
    // Ensures stable sort order (based on initial), while still providing ability
    // to enforce specific order with `addBaseLayer`/`addOverlay`
    // `sortPriority` option.
    sortLayers: true,

    // @option sortFunction: Function = *
    // A [compare function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)
    // that will be used for sorting the layers, when `sortLayers` is `true`.
    // The function receives objects with the layers's data.
    sortFunction: function (A, B) {
      var a = A.sortPriority;
      var b = B.sortPriority;
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

  _addLayer: function (layer, name, overlay, options) {
    options = options || {};
    // _chooser property stores layerChooser data after layer removal
    // (in case if it's meant to be re-added)
    var data = layer._chooser;
    if (!data) {
      data = {
        layer: layer,
        // name should be unique, otherwise behavior of other methods is undefined
        // (typically: first found will be taken)
        name: name,
        // label: name,
        overlay: overlay,
        persistent: 'persistent' in options ? options.persistent : true
      };
    } else {
      delete layer._chooser;
    }
    // provide stable sort order
    if ('sortPriority' in options) {
      data.sortPriority = options.sortPriority;
    } else if (!('sortPriority' in data)) {
      this._lastPriority = this._lastPriority + 10;
      data.sortPriority = this._lastPriority;
    }
    // *** adapted from L.Control.Layers.prototype._addLayer.call(this, layer, name, overlay);
    if (this._map) {
      layer.on('add remove', this._onLayerChange, this);
    }

    this._layers.push(data);

    if (this.options.sortLayers) {
      this._layers.sort(this.options.sortFunction);
    }

    if (this.options.autoZIndex && layer.setZIndex) {
       this._lastZIndex++;
       layer.setZIndex(this._lastZIndex);
    }

    this._expandIfNotCollapsed();
    // ***

    if (data.overlay) {
      data.default = 'default' in options ? options.default : true;
    }
    var map = this._map || this._mapToAdd;
    if (!data.persistent) {
      if (!data.overlay) { return; }
      if ('enable' in options ? options.enable : data.default) {
        layer.addTo(map);
      }
      return;
    }
    if (overlay) {
      data.statusTracking = function (e) {
        this._storeOverlayState(data.name, e.type === 'add');
      };
      layer.on('add remove', data.statusTracking, this);
      if ('enable' in options) { // do as explicitly specified
        map[options.enable ? 'addLayer' : 'removeLayer'](layer);
      } else if (layer._map) { // already on map, only store state
        this._storeOverlayState(data.name, true);
      } else { // restore at recorded state
        if (this._isOverlayDisplayed(data.name, data.default)) {
          layer.addTo(map);
        }
      }
    } else {
      data.statusTracking = function () {
        localStorage['iitc-base-map'] = data.name;
      };
      layer.on('add', data.statusTracking);
    }
  },

  _addItem: function (obj) {
    var labelEl = L.Control.Layers.prototype._addItem.call(this, {
      layer: obj.layer,
      overlay: obj.overlay,
      name: obj.label || obj.name
    });
    obj.labelEl = labelEl;
    // obj.inputEl = this._layerControlInputs[this._layerControlInputs.length-1];
    return labelEl;
  },

  // @miniclass LayersEntry options (LayerChooser)
  // @aka layersEntry options

  // @option persistent: Boolean = true
  // * When `false` - baselayer's status is not tracked.

  // @option sortPriority: Number = *
  // Enforces specific order in control, lower value means layer's upper position.
  // If not specified - the value will be assigned implicitly in increasing manner.

  // @method addBaseLayer(layer: Layer, name: String, options?: LayersEntry options): this
  // Adds a base layer (radio button entry) with the given name to the control.
  addBaseLayer: function (layer, name, options) {
    this._addLayer(layer, name, false, options);
    return (this._map) ? this._update() : this;
  },

  // @miniclass AddOverlay options (LayerChooser)
  // @aka addOverlay options
  // @inherits LayersEntry options

  // @option persistent: Boolean = true
  // * When `true` (or not specified) - adds overlay to the map as well,
  //   if it's last state was active.
  //   If no record exists then value specified in `default` option is used.
  // * When `false` - overlay status is not tracked, `default` option is honored too.

  // @option default: Boolean = true
  // Default state of overlay (used only when no record about previous state found).

  // @option enable: Boolean
  // Enforce specified state ignoring previously saved.

  // @method addOverlay(layer: L.Layer, name: String, options?: AddOverlay options): this
  // Adds an overlay (checkbox entry) with the given name to the control.
  addOverlay: function (layer, name, options) {
    this._addLayer(layer, name, true, options);
    return (this._map) ? this._update() : this;
  },

  // @method removeLayer(layer: Layer|String, options?: Object): this
  // Removes the given layer from the control.
  // Either layer object or it's name in the control must be specified.
  // Layer is removed from the map as well, except `.keepOnMap` option is true.
  removeLayer: function (layer, options) {
    layer = this.getLayer(layer);
    var data = this.layerInfo(layer);
    if (data) {
      options = options || {};
      if (data.statusTracking) {
        data.layer.off('add remove', data.statusTracking, this);
        delete data.statusTracking;
      }
      L.Control.Layers.prototype.removeLayer.apply(this, arguments);
      if (this._map && !options.keepOnMap) {
        map.removeLayer(data.layer);
      }
      delete data.labelEl;
      // delete data.inputEl;
      layer._chooser = data;
    } else {
      log.warn('Layer not found: ', layer);
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

  __byName: function (data) {
    var name = this.toString();
    return data.name === name ||
      data.label === name;
  },

  __byLayer: function (data) {
    return data.layer === this;
  },

  __byLabelEl: function (data) {
    return data.labelEl === this;
  },

  // @method layerInfo(name: String|Layer): Layer
  // Returns layer info by it's name in the control, or by layer object itself,
  // or label html element.
  // Info is internal data object with following properties:
  // `layer`, `name`, `label`, `overlay`, `sortPriority`, `persistent`, `default`,
  // `labelEl`, `inputEl`, `statusTracking`.
  layerInfo: function (layer) {
    var fn = layer instanceof L.Layer ? this.__byLayer
      : layer instanceof HTMLElement ? this.__byLabelEl
        : this.__byName;
    return this._layers.find(fn, layer);
  },

  // @method getLayer(name: String|Layer): Layer
  // Returns layer by it's name in the control, or by layer object itself,
  // or label html element.
  // The latter can be used to ensure the layer is in layerChooser.
  getLayer: function (layer) {
    var data = this.layerInfo(layer);
    return data && data.layer;
  },

  // @method showLayer(layer: Layer|String|Number, display?: Boolean): this
  // Switches layer's display state to given value (true by default).
  // Layer can be specified also by it's name in the control.
  showLayer: function (layer, display) {
    var data = this._layers[layer]; // layer is index, private use only
    if (!data) {
      data = this.layerInfo(layer);
      if (!data) {
        log.warn('Layer not found: ', layer);
        return this;
      }
    }
    var map = this._map;
    if (display || arguments.length === 1) {
      if (!map.hasLayer(data.layer)) {
        if (!data.overlay) {
          // if it's a base layer, remove any others
          this._layers.forEach(function (el) {
            if (!el.overlay && el.layer !== data.layer) {
              map.removeLayer(el.layer);
            }
          });
        }
        map.addLayer(data.layer);
      }
    } else {
      map.removeLayer(data.layer);
    }
    return this;
  },

  // @method setLabel(layer: String|Layer, label?: String): this
  // Sets layers label to specified label text (html),
  // or resets it to original name when label is not specified.
  setLabel: function (layer, label) {
    var data = this.layerInfo(layer);
    if (!data) {
      log.warn('Layer not found: ', layer);
      return this;
    }
    data.label = label;
    var nameEl = data.labelEl.querySelector('span');
    nameEl.innerHTML = ' ' + label;
    return this;
  },

  _onLongClick: function (data, originalEvent) {
    var defaultPrevented;

    // @miniclass LayersControlInteractionEvent (LayerChooser)
    // @inherits Event
    // @property layer: L.Layer
    // The layer that was interacted in LayerChooser control.
    // @property control: LayerChooser
    // LayerChooser control instance (just handy shortcut for window.layerChooser).
    // @property data: Object
    // Internal data object TODO
    // @property originalEvent: DOMEvent
    // The original mouse/jQuery event that triggered this Leaflet event.
    // @method preventDefault: Function
    // Method to prevent default action of event (like overlays toggling), otherwise handled by layerChooser.
    var obj = {
      control: this,
      data: data,
      originalEvent: originalEvent || {type: 'taphold'},
      preventDefault: function () {
        defaultPrevented = true;
        this.defaultPrevented = true;
      }
    };

    // @namespace Layer
    // @section Layers control interaction events
    // Fired when the overlay's label is long-clicked in the layers control.

    // @section Layers control interaction events
    // @event longclick: LayersControlInteractionEvent
    // Fired on layer
    data.layer.fire('longclick', obj);
    if (!defaultPrevented) {
      this._toggleOverlay(data);
    }
    // @namespace LayerChooser
  },

  // adds listeners to the overlays list to make inputs toggleable.
  _initLayout: function () {
    L.Control.Layers.prototype._initLayout.call(this);
    $(this._overlaysList).on('click taphold', 'label', function (e) {
      if (!(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.type === 'taphold')) {
        return;
      }
      // e.preventDefault(); // seems no effect
      var labelEl = e.target.closest('label');
      this._onLongClick(this.layerInfo(labelEl), e);
    }.bind(this));
  },

  _filterOverlays: function (data) {
    return data.overlay &&
      ['DEBUG Data Tiles', 'Resistance', 'Enlightened'].indexOf(data.name) === -1;
  },

  // Hides all the control's overlays except given one,
  // or restores all, if it was the only one displayed (or none was displayed).
  _toggleOverlay: function (data) {
    if (!data || !data.overlay) {
      log.warn('Overlay not found: ', data);
      return;
    }
    var map = this._map;

    var isChecked = map.hasLayer(data.layer);
    var checked = 0;
    var overlays = this._layers.filter(this._filterOverlays);
    overlays.forEach(function (el) {
      if (map.hasLayer(el.layer)) { checked++; }
    });

    if (checked === 0 || isChecked && checked === 1) {
      // if nothing is selected, or specified overlay is exclusive,
      // assume all boxes should be checked again
      overlays.forEach(function (el) {
        if (el.default) {
          map.addLayer(el.layer);
        }
      });
    } else {
      // uncheck all, check specified
      overlays.forEach(function (el) {
        if (el.layer === data.layer) {
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
    this._layers.forEach(function (data, idx) {
      (data.overlay ? overlayLayers : baseLayers).push({
        layerId: idx,
        name: this._stripHtmlTags(data.label || data.name), // IITCm does not support html in layers labels
        active: this._map.hasLayer(data.layer)
      });
    }, this);

    return {
      baseLayers: baseLayers,
      overlayLayers: overlayLayers
    };
  }
});

window.LayerChooser = LayerChooser;

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

// !!deprecated: use `layerChooser.addOverlay` directly
window.addLayerGroup = function (name, layerGroup, defaultDisplay) {
  var options = {default: defaultDisplay};
  if (arguments.length < 3) { options = undefined; }
  window.layerChooser.addOverlay(layerGroup, name, options);
};

// !!deprecated: use `layerChooser.removeLayer` directly
// our method differs from inherited (https://leafletjs.com/reference.html#control-layers-removelayer),
// as (by default) layer is removed from the map as well, see description for more details.
window.removeLayerGroup = function (layerGroup) {
  window.layerChooser.removeLayer(layerGroup);
};
