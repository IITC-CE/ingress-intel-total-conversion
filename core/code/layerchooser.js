'use strict';

/* global L, log -- eslint */

/**
 * Represents a control for selecting layers on the map. It extends the Leaflet's L.Control.Layers class.
 * This control not only manages layer visibility but also provides persistence of layer display states between sessions.
 * The class has been enhanced with additional options and methods for more flexible layer management.
 *
 * @memberof L
 * @class LayerChooser
 * @extends L.Control.Layers
 */
var LayerChooser = L.Control.Layers.extend({
  options: {
    /**
     * @property {Boolean} sortLayers=true - Ensures stable sort order (based on initial), while still providing
     *                                       ability to enforce specific order with `addBaseLayer`/`addOverlay`
     *                                       `sortPriority` option.
     */
    sortLayers: true,

    /**
     * @property {Function} sortFunction - A compare function that will be used for sorting the layers,
     *                                     when `sortLayers` is `true`. The function receives objects with
     *                                     the layer's data.
     * @see https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
     */
    sortFunction: function (A, B) {
      var a = A.sortPriority;
      var b = B.sortPriority;
      return a < b ? -1 : b < a ? 1 : 0;
    },
  },

  /**
   * Initializes a new instance of the LayerChooser control.
   *
   * @memberof LayerChooser
   * @method
   * @param {L.Layer[]} baseLayers - Array of base layers to include in the chooser.
   * @param {L.Layer[]} overlays - Array of overlay layers to include in the chooser.
   * @param {Object} [options] - Additional options for the LayerChooser control.
   */
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
        persistent: 'persistent' in options ? options.persistent : true,
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
      if (!data.overlay) {
        return;
      }
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
      if ('enable' in options) {
        // do as explicitly specified
        map[options.enable ? 'addLayer' : 'removeLayer'](layer);
      } else if (layer._map) {
        // already on map, only store state
        this._storeOverlayState(data.name, true);
      } else {
        // restore at recorded state
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
      name: obj.label || obj.name,
    });
    obj.labelEl = labelEl;
    // obj.inputEl = this._layerControlInputs[this._layerControlInputs.length-1];
    return labelEl;
  },

  /**
   * Adds a base layer (radio button entry) with the given name to the control.
   *
   * @memberof LayerChooser
   * @param {L.Layer} layer - The layer to be added.
   * @param {String} name - The name of the layer.
   * @param {Object} [options] - Additional options for the layer entry.
   * @param {Boolean} [options.persistent=true] - When set to `false`, the base layer's status is not tracked.
   * @param {Number} [options.sortPriority] - Enforces a specific order in the control. Lower value means
   *                                          higher position in the list. If not specified, the value
   *                                          will be assigned implicitly in an increasing manner.
   * @returns {LayerChooser} Returns the `LayerChooser` instance for chaining.
   */
  addBaseLayer: function (layer, name, options) {
    this._addLayer(layer, name, false, options);
    return this._map ? this._update() : this;
  },

  /**
   * Adds an overlay (checkbox entry) with the given name to the control.
   *
   * @memberof LayerChooser
   * @param {L.Layer} layer - The overlay layer to be added.
   * @param {String} name - The name of the overlay.
   * @param {Object} [options] - Additional options for the overlay entry.
   * @param {Boolean} [options.persistent=true] - When `true` (or not specified), the overlay is added to the map
   *                                              if its last state was active. If no previous state is recorded,
   *                                              the value specified in the `default` option is used.
   *                                              When `false`, the overlay status is not tracked,
   *                                              but the `default` option is still honored.
   * @param {Boolean} [options.default=true] - The default state of the overlay, used only when no record
   *                                           of the previous state is found.
   * @param {Boolean} [options.enable] - If set, enforces the specified state, ignoring any previously saved state.
   * @returns {LayerChooser} Returns the `LayerChooser` instance for chaining.
   */
  addOverlay: function (layer, name, options) {
    this._addLayer(layer, name, true, options);
    return this._map ? this._update() : this;
  },

  /**
   * Removes the given layer from the control.
   *
   * @memberof LayerChooser
   * @param {L.Layer|String} layer - The layer to be removed, either as a Leaflet layer object or its name.
   * @param {Object} [options] - Additional options, including `keepOnMap` to keep the layer on the map.
   * @returns {LayerChooser} Returns the `LayerChooser` instance for chaining.
   */
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
        window.map.removeLayer(data.layer);
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
    return data.name === name || data.label === name;
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
  /**
   * Retrieves layer info by its name in the control, or by the layer object itself, or its label HTML element.
   *
   * @memberof LayerChooser
   * @param {String|L.Layer|HTMLElement} layer - The name, layer object, or label element of the layer.
   * @returns {Object} Layer info object with following properties: `layer`, `name`, `label`, `overlay`, `sortPriority`,
   *                   `persistent`, `default`, `labelEl`, `inputEl`, `statusTracking`.
   */
  layerInfo: function (layer) {
    var fn = layer instanceof L.Layer ? this.__byLayer : layer instanceof HTMLElement ? this.__byLabelEl : this.__byName;
    return this._layers.find(fn, layer);
  },

  /**
   * Returns the Leaflet layer object based on its name in the control, or the layer object itself,
   * or its label HTML element. The latter can be used to ensure the layer is in layerChooser.
   *
   * @memberof LayerChooser
   * @param {String|L.Layer|HTMLElement} layer - The name, layer object, or label element of the layer.
   * @returns {L.Layer} The corresponding Leaflet layer object.
   */
  getLayer: function (layer) {
    var data = this.layerInfo(layer);
    return data && data.layer;
  },

  /**
   * Shows or hides a specified basemap or overlay layer. The layer can be specified by its ID, name, or layer object.
   * If the display parameter is not provided, the layer will be shown by default.
   * When showing a base layer, it ensures that no other base layers are displayed at the same time.
   *
   * @memberof LayerChooser
   * @param {L.Layer|String|Number} layer - The layer to show or hide. This can be a Leaflet layer object,
   *                                        a layer name, or a layer ID.
   * @param {Boolean} [display=true] - Pass `false` to hide the layer, or `true`/omit to show it.
   * @returns {LayerChooser} Returns the `LayerChooser` instance for chaining.
   */
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

  /**
   * Sets the label of a layer in the control.
   *
   * @memberof LayerChooser
   * @param {String|L.Layer} layer - The name or layer object.
   * @param {String} [label] - The label text (HTML allowed) to set. Resets to original name if not provided.
   * @returns {LayerChooser} Returns the `LayerChooser` instance for chaining.
   */
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
      originalEvent: originalEvent || { type: 'taphold' },
      preventDefault: function () {
        defaultPrevented = true;
        this.defaultPrevented = true;
      },
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
    $(this._overlaysList).on(
      'click taphold',
      'label',
      function (e) {
        if (!(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.type === 'taphold')) {
          return;
        }
        // e.preventDefault(); // seems no effect
        var labelEl = e.target.closest('label');
        this._onLongClick(this.layerInfo(labelEl), e);
      }.bind(this)
    );
  },

  _filterOverlays: function (data) {
    return data.overlay && ['DEBUG Data Tiles', 'Resistance', 'Enlightened'].indexOf(data.name) === -1;
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
      if (map.hasLayer(el.layer)) {
        checked++;
      }
    });

    if (checked === 0 || (isChecked && checked === 1)) {
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

  /**
   * Retrieves the current state of base and overlay layers managed by this control.
   * This method is deprecated and should be used with caution.
   *
   * The method returns an object with two properties: 'baseLayers' and 'overlayLayers'.
   * Each array contains objects representing the respective layers with properties: 'layerId', 'name', and 'active'.
   * 'layerId' is an internal identifier for the layer, 'name' is the layer's name, and 'active' is a boolean indicating
   * if the layer is currently active on the map.
   *
   * @memberof LayerChooser
   * @deprecated
   * @returns {{overlayLayers: Array, baseLayers: Array}} An object containing arrays of base and overlay layers.
   */
  getLayers: function () {
    var baseLayers = [];
    var overlayLayers = [];
    this._layers.forEach(function (data, idx) {
      (data.overlay ? overlayLayers : baseLayers).push({
        layerId: idx,
        name: this._stripHtmlTags(data.label || data.name), // IITCm does not support html in layers labels
        active: this._map.hasLayer(data.layer),
      });
    }, this);

    return {
      baseLayers: baseLayers,
      overlayLayers: overlayLayers,
    };
  },
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
  var options = { default: defaultDisplay };
  if (arguments.length < 3) {
    options = undefined;
  }
  window.layerChooser.addOverlay(layerGroup, name, options);
};

// !!deprecated: use `layerChooser.removeLayer` directly
// our method differs from inherited (https://leafletjs.com/reference.html#control-layers-removelayer),
// as (by default) layer is removed from the map as well, see description for more details.
window.removeLayerGroup = function (layerGroup) {
  window.layerChooser.removeLayer(layerGroup);
};
