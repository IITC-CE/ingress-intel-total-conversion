/* global L -- eslint */

/**
 * Contains functions for rendering debug tiles on the map. These are used for debugging map data tiles.
 * @class RenderDebugTiles
 */
window.RenderDebugTiles = function () {
  this.CLEAR_CHECK_TIME = 0.1;
  this.FADE_TIME = 1.0;

  this.debugTileLayer = new L.LayerGroup();
  window.layerChooser.addOverlay(this.debugTileLayer, 'DEBUG Data Tiles', { default: false });

  this.debugTileToRectangle = {};
  this.debugTileClearTimes = {};
  this.timer = undefined;
};

/**
 * Resets the debug tiles by clearing all layers, rectangles and clear times.
 * @function
 * @memberof RenderDebugTiles
 */
window.RenderDebugTiles.prototype.reset = function () {
  this.debugTileLayer.clearLayers();
  this.debugTileToRectangle = {};
  this.debugTileClearTimes = {};
};

/**
 * Creates a new debug tile with the specified ID and bounds.
 *
 * @function
 * @memberof RenderDebugTiles
 * @param {string} id - The ID of the debug tile.
 * @param {L.LatLngBounds} bounds - The geographical bounds of the tile.
 */
window.RenderDebugTiles.prototype.create = function (id, bounds) {
  var s = { color: '#666', weight: 1, opacity: 0.4, fillColor: '#666', fillOpacity: 0.1, interactive: false };

  bounds = new L.LatLngBounds(bounds);
  bounds = bounds.pad(-0.02);

  var l = new L.Rectangle(bounds, s);
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
 * @memberof RenderDebugTiles
 * @param {string} id - The ID of the debug tile.
 * @param {string} bordercol - The color for the border.
 * @param {string} fillcol - The color for the fill.
 */
window.RenderDebugTiles.prototype.setColour = function (id, bordercol, fillcol) {
  var l = this.debugTileToRectangle[id];
  if (l) {
    var s = { color: bordercol, fillColor: fillcol };
    l.setStyle(s);
  }
};

/**
 * Sets the state of a specific debug tile. Changes its color based on the state.
 *
 * @function
 * @memberof RenderDebugTiles
 * @param {string} id - The ID of the debug tile.
 * @param {string} state - The state of the tile (e.g., 'ok', 'error', 'requested').
 */
window.RenderDebugTiles.prototype.setState = function (id, state) {
  var col = '#f0f';
  var fill = '#f0f';
  var clearDelay = -1;
  switch (state) {
    case 'ok':
      col = '#0f0';
      fill = '#0f0';
      clearDelay = 2;
      break;
    case 'error':
      col = '#f00';
      fill = '#f00';
      clearDelay = 30;
      break;
    case 'cache-fresh':
      col = '#0f0';
      fill = '#ff0';
      clearDelay = 2;
      break;
    case 'cache-stale':
      col = '#f00';
      fill = '#ff0';
      clearDelay = 10;
      break;
    case 'requested':
      col = '#66f';
      fill = '#66f';
      break;
    case 'retrying':
      col = '#666';
      fill = '#666';
      break;
    case 'request-fail':
      col = '#a00';
      fill = '#666';
      break;
    case 'tile-fail':
      col = '#f00';
      fill = '#666';
      break;
    case 'tile-timeout':
      col = '#ff0';
      fill = '#666';
      break;
    case 'render-queue':
      col = '#f0f';
      fill = '#f0f';
      break;
  }
  this.setColour(id, col, fill);
  if (clearDelay >= 0) {
    var clearAt = Date.now() + clearDelay * 1000;
    this.debugTileClearTimes[id] = clearAt;

    if (!this.timer) {
      this.startTimer(clearDelay * 1000);
    }
  }
};

/**
 * Starts a timer to run the clear pass function after a specified wait time.
 *
 * @function
 * @memberof RenderDebugTiles
 * @param {number} waitTime - The wait time in milliseconds before running the clear pass.
 */
window.RenderDebugTiles.prototype.startTimer = function (waitTime) {
  var _this = this;
  if (!_this.timer) {
    // a timeout of 0 firing the actual timeout - helps things run smoother
    _this.timer = setTimeout(function () {
      _this.timer = setTimeout(function () {
        _this.timer = undefined;
        _this.runClearPass();
      }, waitTime);
    }, 0);
  }
};

/**
 * Executes a pass to clear debug tiles that have exceeded their fade time.
 * This function adjusts the opacity of the tiles and removes them if necessary.
 *
 * @function
 * @memberof RenderDebugTiles
 */
window.RenderDebugTiles.prototype.runClearPass = function () {
  var now = Date.now();
  for (var id in this.debugTileClearTimes) {
    var diff = now - this.debugTileClearTimes[id];
    if (diff > 0) {
      if (diff > this.FADE_TIME * 1000) {
        this.debugTileLayer.removeLayer(this.debugTileToRectangle[id]);
        delete this.debugTileClearTimes[id];
      } else {
        var fade = 1.0 - diff / (this.FADE_TIME * 1000);

        this.debugTileToRectangle[id].setStyle({ opacity: 0.4 * fade, fillOpacity: 0.1 * fade });
      }
    }
  }

  if (Object.keys(this.debugTileClearTimes).length > 0) {
    this.startTimer(this.CLEAR_CHECK_TIME * 1000);
  }
};
