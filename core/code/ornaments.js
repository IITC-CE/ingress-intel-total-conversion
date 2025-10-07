/* global IITC, L, log -- eslint */

/**
 * @namespace window.ornaments
 * @description Manages the overlay of additional images (ornaments) on portals, such as beacons, frackers,
 * and anomaly markers.
 *
 * Added as part of the Ingress #Helios in 2014, ornaments are additional image overlays for portals.
 * currently there are 6 known types of ornaments: `ap$x$suffix`
 * - `cluster portals` (without suffix)
 * - `volatile portals` (_v)
 * - `meeting points` (_start)
 * - `finish points` (_end)
 *
 * Beacons and Frackers were introduced at the launch of the Ingress ingame store on November 1st, 2015
 * - `Beacons` (pe$TAG - $NAME) ie: `peNIA - NIANTIC`
 * - `Frackers` ('peFRACK')
 * (there are 7 different colors for each of them)
 *
 * Ornament IDs are dynamic. NIANTIC might change them at any time without prior notice.
 * New ornamnent IDs found on the map will be recorded and saved to knownOrnaments from
 * which the Ornaments dialog will be filled with checked checkboxes.
 * To exclude a set of ornaments, even if they have not yet shown up on the map, the user
 * can add an entry to excludedOrnaments, which will compared (startsWith) to all known and
 * future IDs. example: "ap" to exclude all Ornaments for anomalies (ap1, ap2, ap2_v)
 */
window.ornaments = {
  /**
   * Default size for ornament.
   * @constant
   * @type {number}
   */
  OVERLAY_SIZE: 60,

  /**
   * Default opacity for ornament.
   * @constant
   * @type {number}
   */
  OVERLAY_OPACITY: 0.6,

  /**
   * Object holding optional definitions for ornaments and beacons.
   * The icon object holds optional definitions for the ornaments an beacons. The object shall
   * be filled from a plugin
   * ```
   * 'ornamentID' : {
   *   name: 'meaningful name',     // shows up in dialog
   *   layer: 'name for the Layer', // shows up in layerchooser, optional, if not set
   *                                // ornament will be in "Ornaments"
   *   url: 'url',                  // from which the image will be taken, optional,
   *                                // 84x84px is default, if not set, stock images will be
   *                                // used
   *   offset: [dx,dy],             // optional, shift the ornament vertically or horizontally by
   *                                // dx (vertical)and dy )horizontal.
   *                                // [0, 0.5] to place right above the portal.
   *                                // default is [0, 0] to center
   *   opacity: 0..1                // optional, default is 0.6
   * }
   * ```
   *
   * @property {object} icon - The icon object for ornaments and beacons.
   */
  icon: {},

  /**
   * List of ornaments to be excluded.
   * @property {string[]} excludedOrnaments - Patterns to be excluded from display.
   */
  excludedOrnaments: [],

  /**
   * List of known ornaments.
   * @property {object} knownOrnaments - Object tracking known ornaments.
   */
  knownOrnaments: {},

  /**
   * Sets up the ornament layer and necessary event handlers.
   *
   * @function
   * @memberof window.ornaments
   */
  setup: function () {
    this._portals = {};
    this.layerGroup = () => new L.LayerGroup();
    if (window.map.options.preferCanvas && L.Browser.canvas && !window.DISABLE_CANVASICONLAYER) {
      this.layerGroup = L.canvasIconLayer;
      L.CanvasIconLayer.mergeOptions({ padding: L.Canvas.prototype.options.padding });
    }
    this.load();

    this.layers = {};
    this.layers['Ornaments'] = window.ornaments.layerGroup();
    this.layers['Excluded ornaments'] = window.ornaments.layerGroup(); // to keep excluded ornaments in an own layer

    window.layerChooser.addOverlay(this.layers['Ornaments'], 'Ornaments');
    window.layerChooser.addOverlay(this.layers['Excluded ornaments'], 'Excluded ornaments', { default: false });

    IITC.toolbox.addButton({
      id: 'ornaments-toolbox-link',
      label: 'Ornaments Opt',
      title: 'Edit ornament exclusions',
      accesskey: 'o',
      action: window.ornaments.ornamentsOpt,
    });
  },

  /**
   * Creates a new layer for a given ornament ID.
   *
   * @function
   * @memberof window.ornaments
   * @param {string} layerID - The ID for the new layer.
   */
  createLayer: function (layerID) {
    window.ornaments.layers[layerID] = window.ornaments.layerGroup();
    window.layerChooser.addOverlay(window.ornaments.layers[layerID], layerID);
  },

  /**
   * Adds ornament overlays to the specified portal.
   *
   * @function
   * @memberof window.ornaments
   * @param {object} portal - The portal to which ornaments are added.
   */
  addPortal: function (portal) {
    this.removePortal(portal);
    var ornaments = portal.options.data.ornaments;
    if (ornaments && ornaments.length) {
      this._portals[portal.options.guid] = ornaments.map(function (ornament) {
        var layer = this.layers['Ornaments'];
        var opacity = this.OVERLAY_OPACITY;
        var size = this.OVERLAY_SIZE * window.portalMarkerScale();
        var anchor = [size / 2, size / 2];
        var iconUrl = '//commondatastorage.googleapis.com/ingress.com/img/map_icons/marker_images/' + ornament + '.png';

        if (!this.knownOrnaments[ornament]) {
          this.knownOrnaments[ornament] = false;
        }

        if (ornament in this.icon) {
          if (this.icon[ornament].layer) {
            if (this.layers[this.icon[ornament].layer] === undefined) {
              log.log('Add missing layer: ', this.icon[ornament].layer);
              window.ornaments.createLayer(window.ornaments.icon[ornament].layer);
            }
            layer = this.layers[window.ornaments.icon[ornament].layer];
          }
          if (window.ornaments.icon[ornament].url) {
            iconUrl = window.ornaments.icon[ornament].url;
            if (this.icon[ornament].offset) {
              var offset = this.icon[ornament].offset;
              anchor = [size * offset[0] + anchor[0], size * offset[1] + anchor[1]];
            }
            if (this.icon[ornament].opacity) {
              opacity = this.icon[ornament].opacity;
            }
          }
        }

        var exclude = false;
        if (this.excludedOrnaments && !(this.excludedOrnaments.length === 1 && this.excludedOrnaments[0] === '')) {
          exclude = this.excludedOrnaments.some(function (pattern) {
            return ornament.startsWith(pattern);
          });
        }
        exclude = exclude || this.knownOrnaments[ornament];
        if (exclude) {
          layer = this.layers['Excluded ornaments'];
        }

        return new L.Marker(portal.getLatLng(), {
          icon: new L.Icon({
            iconUrl: iconUrl,
            iconSize: [size, size],
            iconAnchor: anchor, // https://github.com/IITC-CE/Leaflet.Canvas-Markers/issues/4
            className: 'no-pointer-events',
          }),
          interactive: false,
          keyboard: false,
          opacity: opacity,
          layer: layer,
        }).addTo(layer);
      }, this);
    }
  },

  /**
   * Removes ornament overlays from the specified portal.
   *
   * @function
   * @memberof window.ornaments
   * @param {object} portal - The portal from which ornaments are removed.
   */
  removePortal: function (portal) {
    var guid = portal.options.guid;
    if (this._portals[guid]) {
      this._portals[guid].forEach(function (marker) {
        marker.options.layer.removeLayer(marker);
      });
      delete this._portals[guid];
    }
  },

  /**
   * Initializes known ornaments.
   *
   * @function
   * @memberof window.ornaments
   */
  initOrnaments: function () {
    this.knownOrnaments = {};
    this.save();
  },

  /**
   * Loads ornament data from localStorage.
   *
   * @function
   * @memberof window.ornaments
   */
  load: function () {
    var dataStr;
    try {
      dataStr = localStorage.getItem('excludedOrnaments');
      if (!dataStr) {
        return;
      }
      this.excludedOrnaments = JSON.parse(dataStr);
    } catch (e) {
      log.warn('ornaments: failed to load excludedOrnaments from localStorage: ' + e);
    }
    try {
      dataStr = localStorage.getItem('knownOrnaments');
      if (!dataStr) {
        this.initOrnaments();
        return;
      }
      this.knownOrnaments = JSON.parse(dataStr);
    } catch (e) {
      log.warn('ornaments: failed to load data from localStorage: ' + e);
    }
  },

  /**
   * Saves the current ornament configuration to localStorage.
   *
   * @function
   * @memberof window.ornaments
   */
  save: function () {
    localStorage['excludedOrnaments'] = JSON.stringify(this.excludedOrnaments);
    localStorage['knownOrnaments'] = JSON.stringify(this.knownOrnaments);
  },

  /**
   * Reloads all ornaments on the map.
   * @function
   * @memberof window.ornaments
   */
  reload: function () {
    // reload: addPortal also calls removePortal
    for (var guid in window.ornaments._portals) {
      window.ornaments.addPortal(window.portals[guid]);
    }
  },

  /**
   * Processes input data for managing ornaments.
   *
   * @function
   * @memberof window.ornaments
   */
  processInput: function () {
    window.ornaments.excludedOrnaments = $('#ornaments_E')
      .val()
      .split(/[\s,]+/);
    window.ornaments.excludedOrnaments = window.ornaments.excludedOrnaments.filter(function (ornamentCode) {
      return ornamentCode !== '';
    });
    // process the input from the checkboxes
    for (var ornamentCode in window.ornaments.knownOrnaments) {
      var input = $('#chk_orn_' + ornamentCode);
      window.ornaments.knownOrnaments[ornamentCode] = input.is(':checked');
    }
  },

  /**
   * Generates a list of ornaments for display in the options dialog.
   *
   * @function
   * @memberof window.ornaments
   * @returns {string} HTML string representing the list of ornaments.
   */
  ornamentsList: function () {
    var text = '';
    var sortedIDs = Object.keys(window.ornaments.knownOrnaments).sort();

    sortedIDs.forEach(function (ornamentCode) {
      var hidden = window.ornaments.excludedOrnaments.some(function (code) {
        return ornamentCode.startsWith(code);
      });

      var name = window.ornaments.icon[ornamentCode] ? window.ornaments.icon[ornamentCode].name + ' (' + ornamentCode + ')' : ornamentCode;
      var checked = window.ornaments.knownOrnaments[ornamentCode] || hidden ? 'checked ' : '';
      text += '<label><input id="chk_orn_' + ornamentCode + '" type="checkbox" ' + checked;
      text += ' onchange="window.ornaments.processInput();window.ornaments.save();window.ornaments.reload()"';
      text += hidden ? 'disabled' : '';
      text += '>' + name + '</label><br>';
    });
    return text;
  },

  /**
   * Replaces the content of the ornaments list in the dialog.
   *
   * @function
   * @memberof window.ornaments
   */
  replaceOL: function () {
    document.getElementById('ornamentsList').innerHTML = window.ornaments.ornamentsList();
  },

  /**
   * Handles changes in ornament options and updates the map accordingly.
   *
   * @function
   * @memberof window.ornaments
   */
  onChangeHandler: function () {
    window.ornaments.processInput();
    window.ornaments.replaceOL();
    window.ornaments.save();
    window.ornaments.reload();
  },

  /**
   * Opens the dialog for ornament options, allowing users to manage ornament visibility.
   *
   * @function
   * @memberof window.ornaments
   */
  ornamentsOpt: function () {
    var excludedIDs = window.ornaments.excludedOrnaments.join(',');
    var html =
      '<div class="ornamentsOpts">' +
      'Hide Ornaments from IITC that start with:<br>' +
      `<input type="text" value="${excludedIDs}" id="ornaments_E"` +
      ' onchange="window.ornaments.onChangeHandler()" /><br>' +
      '(separator: space or comma allowed)<hr>' +
      '<b>known Ornaments, check to hide:</b><br>' +
      `<div id="ornamentsList"> ${window.ornaments.ornamentsList()}</div>` +
      '</div>';

    window.dialog({
      html: html,
      id: 'ornamentsOpt',
      title: 'Ornament excludes',
      buttons: {
        RESET: function () {
          window.ornaments.initOrnaments();
          window.ornaments.reload();
          $(this).dialog('close');
        },
        OK: function () {
          // process the input from the input
          window.ornaments.processInput();
          window.ornaments.save();
          window.ornaments.reload();
          $(this).dialog('close');
        },
      },
    });
  },
};
