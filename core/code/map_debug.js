/* global IITC, L -- eslint */

/**
 * Contains functions for rendering debug tiles on the map. These are used for debugging map data tiles.
 *
 * @memberof IITC.map
 * @class DebugTiles
 */
IITC.map.DebugTiles = function () {
  this.debugTileLayer = new L.LayerGroup();
  window.layerChooser.addOverlay(this.debugTileLayer, 'DEBUG Data Tiles', { default: false });

  this.debugTileToRectangle = {};
  this.debugTileClearTimes = {};
  this.timer = undefined;
};

// timings for the debug-tile fade/clear cycle (seconds)
const CLEAR_CHECK_TIME = 0.1;
const FADE_TIME = 1.0;

// base rectangle style for a debug tile; state changes only tweak the stroke/fill colour
const TILE_BASE_STYLE = { color: '#666', weight: 1, opacity: 0.4, fillColor: '#666', fillOpacity: 0.1, interactive: false };

// per-state colours and auto-clear delay (seconds); clearDelay < 0 means the tile stays until replaced
const STATE_STYLES = {
  ok: { color: '#0f0', fill: '#0f0', clearDelay: 2 },
  error: { color: '#f00', fill: '#f00', clearDelay: 30 },
  'cache-fresh': { color: '#0f0', fill: '#ff0', clearDelay: 2 },
  'cache-stale': { color: '#f00', fill: '#ff0', clearDelay: 10 },
  requested: { color: '#66f', fill: '#66f', clearDelay: -1 },
  retrying: { color: '#666', fill: '#666', clearDelay: -1 },
  'request-fail': { color: '#a00', fill: '#666', clearDelay: -1 },
  'tile-fail': { color: '#f00', fill: '#666', clearDelay: -1 },
  'tile-timeout': { color: '#ff0', fill: '#666', clearDelay: -1 },
  'render-queue': { color: '#f0f', fill: '#f0f', clearDelay: -1 },
};

// fallback style for an unknown state
const DEFAULT_STATE_STYLE = { color: '#f0f', fill: '#f0f', clearDelay: -1 };

/**
 * Resets the debug tiles by clearing all layers, rectangles and clear times.
 * @function
 * @memberof IITC.map.DebugTiles
 */
IITC.map.DebugTiles.prototype.reset = function () {
  this.debugTileLayer.clearLayers();
  this.debugTileToRectangle = {};
  this.debugTileClearTimes = {};
};

/**
 * Creates a new debug tile with the specified ID and bounds.
 *
 * @function
 * @memberof IITC.map.DebugTiles
 * @param {string} id - The ID of the debug tile.
 * @param {L.LatLngBounds} bounds - The geographical bounds of the tile.
 */
IITC.map.DebugTiles.prototype.create = function (id, bounds) {
  bounds = new L.LatLngBounds(bounds);
  bounds = bounds.pad(-0.02);

  const l = new L.Rectangle(bounds, TILE_BASE_STYLE);
  this.debugTileToRectangle[id] = l;
  this.debugTileLayer.addLayer(l);
  if (window.map.hasLayer(this.debugTileLayer)) {
    // only bring to back if we have the debug layer turned on
    l.bringToBack();
  }
};

/**
 * Sets the color of the border and fill for a specific debug tile.
 *
 * @function
 * @memberof IITC.map.DebugTiles
 * @param {string} id - The ID of the debug tile.
 * @param {string} bordercol - The color for the border.
 * @param {string} fillcol - The color for the fill.
 */
IITC.map.DebugTiles.prototype.setColour = function (id, bordercol, fillcol) {
  const l = this.debugTileToRectangle[id];
  if (l) {
    const s = { color: bordercol, fillColor: fillcol };
    l.setStyle(s);
  }
};

/**
 * Sets the state of a specific debug tile. Changes its color based on the state.
 *
 * @function
 * @memberof IITC.map.DebugTiles
 * @param {string} id - The ID of the debug tile.
 * @param {string} state - The state of the tile (e.g., 'ok', 'error', 'requested').
 */
IITC.map.DebugTiles.prototype.setState = function (id, state) {
  const style = STATE_STYLES[state] || DEFAULT_STATE_STYLE;

  this.setColour(id, style.color, style.fill);
  if (style.clearDelay >= 0) {
    const clearAt = Date.now() + style.clearDelay * 1000;
    this.debugTileClearTimes[id] = clearAt;

    if (!this.timer) {
      this.startTimer(style.clearDelay * 1000);
    }
  }
};

/**
 * Starts a timer to run the clear pass function after a specified wait time.
 *
 * @function
 * @memberof IITC.map.DebugTiles
 * @param {number} waitTime - The wait time in milliseconds before running the clear pass.
 */
IITC.map.DebugTiles.prototype.startTimer = function (waitTime) {
  if (!this.timer) {
    // a timeout of 0 firing the actual timeout - helps things run smoother
    this.timer = setTimeout(() => {
      this.timer = setTimeout(() => {
        this.timer = undefined;
        this.runClearPass();
      }, waitTime);
    }, 0);
  }
};

/**
 * Executes a pass to clear debug tiles that have exceeded their fade time.
 * This function adjusts the opacity of the tiles and removes them if necessary.
 *
 * @function
 * @memberof IITC.map.DebugTiles
 */
IITC.map.DebugTiles.prototype.runClearPass = function () {
  const now = Date.now();
  for (const id in this.debugTileClearTimes) {
    const diff = now - this.debugTileClearTimes[id];
    if (diff > 0) {
      if (diff > FADE_TIME * 1000) {
        this.debugTileLayer.removeLayer(this.debugTileToRectangle[id]);
        delete this.debugTileClearTimes[id];
      } else {
        const fade = 1.0 - diff / (FADE_TIME * 1000);

        this.debugTileToRectangle[id].setStyle({ opacity: TILE_BASE_STYLE.opacity * fade, fillOpacity: TILE_BASE_STYLE.fillOpacity * fade });
      }
    }
  }

  if (Object.keys(this.debugTileClearTimes).length > 0) {
    this.startTimer(CLEAR_CHECK_TIME * 1000);
  }
};

IITC.registerLegacyAliases(IITC.map, {
  RenderDebugTiles: 'DebugTiles',
});
