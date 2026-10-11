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
 * New ornamnent IDs found on the map will be recorded and saved to knownOrnaments, which
 * the Ornaments page of the settings window lists with a checkbox to hide each.
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
   *   name: 'meaningful name',     // shows up on the Ornaments settings page
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

  // set while a redraw waits in the microtask queue, so changes in one task redraw once
  _reloadQueued: false,

  /**
   * Sets up the ornament layer and necessary event handlers.
   *
   * @function
   * @memberof window.ornaments
   */
  setup: function () {
    this.registerSettings();
    this._portals = {};
    this.layerGroup = () => new L.LayerGroup();
    if (window.map.options.preferCanvas && L.Browser.canvas && !window.DISABLE_CANVASICONLAYER) {
      this.layerGroup = L.canvasIconLayer;
      L.CanvasIconLayer.mergeOptions({ padding: L.Canvas.prototype.options.padding });
    }
    this.migrate();
    this.load();

    this.layers = {};
    this.layers['Ornaments'] = window.ornaments.layerGroup();
    this.layers['Excluded ornaments'] = window.ornaments.layerGroup(); // to keep excluded ornaments in an own layer

    window.layerChooser.addOverlay(this.layers['Ornaments'], 'Ornaments');
    window.layerChooser.addOverlay(this.layers['Excluded ornaments'], 'Excluded ornaments', { default: false });
  },

  /**
   * Declares the `ornaments` settings page: `excluded` is the comma-separated list of ID prefixes to hide,
   * and `hidden` maps each known ornament ID to whether it is hidden. A change from the page, a backup or (for
   * the prefixes) sync updates `excludedOrnaments` and `knownOrnaments` and schedules a redraw
   *
   * @memberof window.ornaments
   */
  registerSettings() {
    IITC.settings.register('ornaments', {
      title: 'Ornaments',
      accesskey: 'o',
      shortcut: { label: 'Ornaments Opt', title: 'Edit ornament exclusions' },
      blocks: [
        {
          type: 'string',
          key: 'excluded',
          title: 'Hide ornaments that start with',
          description: 'Separated by spaces or commas',
          onChange: (text) => {
            const prefixes = window.ornaments.parsePrefixes(text);
            // a list save() stores from the one in use needs no reload
            if (prefixes.join(',') === window.ornaments.excludedOrnaments.join(',')) return;
            window.ornaments.excludedOrnaments = prefixes;
            window.ornaments.scheduleReload();
          },
        },
        { type: 'heading', title: 'Known ornaments' },
        {
          type: 'text',
          text: 'None seen yet; ornaments are listed as they show up on the map',
          visible: () => !Object.keys(window.ornaments.knownOrnaments).length,
        },
        {
          type: 'repeat',
          over: () =>
            Object.keys(window.ornaments.knownOrnaments)
              .sort()
              .map((id) => ({ id, title: window.ornaments.icon[id]?.name ? `${window.ornaments.icon[id].name} (${id})` : id })),
          blocks: [
            {
              type: 'boolean',
              key: 'hidden',
              title: 'Hide',
              // an ornament a prefix hides shows as hidden, and only the prefix can show it again
              enabled: (item) => !window.ornaments.isExcluded(item.id),
              value: (item) => (window.ornaments.isExcluded(item.id) ? true : undefined),
              // the map also lists the ornaments this device has seen, and a remote copy would replace it whole
              sync: false,
              onChange: (hidden) => {
                // ornaments seen this session stay known, unhidden unless the new value says otherwise
                const known = Object.keys(window.ornaments.knownOrnaments).map((id) => [id, false]);
                window.ornaments.knownOrnaments = { ...Object.fromEntries(known), ...hidden };
                window.ornaments.scheduleReload();
              },
            },
          ],
        },
        {
          type: 'action',
          title: 'Forget known ornaments',
          description: 'Clears the list and its Hide marks; ornaments are listed again as they show up on the map',
          button: 'Forget',
          action: () => window.ornaments.initOrnaments(),
        },
      ],
    });
  },

  /**
   * Redraws the ornaments once the current task is done, however many changes it makes
   *
   * @memberof window.ornaments
   */
  scheduleReload() {
    if (this._reloadQueued) return;
    this._reloadQueued = true;
    queueMicrotask(() => {
      this._reloadQueued = false;
      this.reload();
    });
  },

  /**
   * Tells whether a prefix of `excludedOrnaments` hides an ornament
   *
   * @memberof window.ornaments
   * @param {string} id - Ornament ID
   * @returns {boolean}
   */
  isExcluded(id) {
    return this.excludedOrnaments.some((prefix) => id.startsWith(prefix));
  },

  /**
   * Moves the ornament settings of older builds to the settings, once: the prefixes from `excludedOrnaments`
   * and the known ornaments from `knownOrnaments`. The legacy keys go, values left out as unreadable with them
   *
   * @memberof window.ornaments
   */
  migrate() {
    const legacy = (key) => {
      try {
        return JSON.parse(localStorage.getItem(key));
      } catch (e) {
        log.warn(`ornaments: cannot read the legacy "${key}": ${e}`);
        return null;
      }
    };

    const excluded = legacy('excludedOrnaments');
    if (Array.isArray(excluded))
      IITC.settings.set('ornaments.excluded', excluded.filter((prefix) => typeof prefix === 'string').join(','), { source: 'legacy' });
    else if (excluded !== null) log.warn('ornaments: the legacy "excludedOrnaments" is not a list and is left out');

    const known = legacy('knownOrnaments');
    if (known !== null && typeof known === 'object' && !Array.isArray(known)) {
      // any truthy entry hid the ornament in older builds
      IITC.settings.set('ornaments.hidden', Object.fromEntries(Object.entries(known).map(([id, hidden]) => [id, Boolean(hidden)])), {
        source: 'legacy',
      });
    } else if (known !== null) log.warn('ornaments: the legacy "knownOrnaments" is not a map and is left out');
    localStorage.removeItem('excludedOrnaments');
    localStorage.removeItem('knownOrnaments');
  },

  /**
   * Splits a list of ornament ID prefixes separated by spaces or commas
   *
   * @memberof window.ornaments
   * @param {string} text - Prefixes as typed by the user
   * @returns {string[]} Non-empty prefixes
   */
  parsePrefixes(text) {
    return text.split(/[\s,]+/).filter(Boolean);
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
        var size = this.OVERLAY_SIZE * IITC.portal.marker.scale();
        var anchor = [size / 2, size / 2];
        var iconUrl = '//commondatastorage.googleapis.com/ingress.com/img/map_icons/marker_images/' + ornament + '.png';

        if (!this.knownOrnaments[ornament]) {
          this.knownOrnaments[ornament] = false;
        }

        if (ornament in this.icon) {
          if (this.icon[ornament].layer) {
            if (this.layers[this.icon[ornament].layer] === undefined) {
              log.debug('Add missing layer: ', this.icon[ornament].layer);
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
   * Loads the ornament settings
   *
   * @function
   * @memberof window.ornaments
   */
  load: function () {
    this.excludedOrnaments = this.parsePrefixes(IITC.settings.get('ornaments.excluded'));
    this.knownOrnaments = IITC.settings.get('ornaments.hidden');
  },

  /**
   * Stores the ornament settings and redraws the ornaments
   *
   * @function
   * @memberof window.ornaments
   */
  save: function () {
    IITC.settings.set('ornaments.excluded', this.excludedOrnaments.join(','));
    IITC.settings.set('ornaments.hidden', this.knownOrnaments);
    this.scheduleReload();
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
   * Opens the Ornaments page of the settings window, which replaces the options dialog
   *
   * @deprecated use `IITC.settings.open('ornaments')` instead
   * @memberof window.ornaments
   */
  ornamentsOpt: () => IITC.settings.open('ornaments'),
};
