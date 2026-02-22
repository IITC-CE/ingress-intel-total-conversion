// @author         ZasoGD
// @name           Portal Names
// @category       Layer
// @version        0.3.0
// @description    Show portal names on the map.

/* exported setup, changelog --eslint */
/* global IITC, L -- eslint */

var changelog = [
  {
    version: '0.3.0',
    changes: ['Add options dialog: X/Y offset, optional leader line, optional edge highlight, updated overlap detection'],
  },
  {
    version: '0.2.4',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.2.3',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.2.2',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
window.plugin.portalNames = function () {};

// Maximum label width. Width may be shrunk per-title if it still fits in <=2 lines.
window.plugin.portalNames.NAME_WIDTH = 80;
window.plugin.portalNames.MIN_LABEL_WIDTH = 30;

// Offsets are in px.
window.plugin.portalNames.MAX_OFFSET_X = 100;
window.plugin.portalNames.MAX_OFFSET_Y = 60;

// Keep these in sync with CSS below
window.plugin.portalNames.LABEL_PADDING = 2; // px (all sides)
window.plugin.portalNames.LABEL_LINE_HEIGHT = 12; // px
window.plugin.portalNames.LABEL_MAX_LINES = 2;

window.plugin.portalNames.MAX_LABEL_HEIGHT =
  window.plugin.portalNames.LABEL_PADDING * 2 + window.plugin.portalNames.LABEL_LINE_HEIGHT * window.plugin.portalNames.LABEL_MAX_LINES;

window.plugin.portalNames.SETTINGS_KEY = 'plugin-portal-names-settings';

window.plugin.portalNames.settings = {
  offsetX: 0, // px
  offsetY: 0, // px
  showLeaderLine: false,
  highlightEdge: true,
};

window.plugin.portalNames.labelLayers = {};
window.plugin.portalNames.leaderLineLayers = {};
window.plugin.portalNames.labelLayerGroup = null;

window.plugin.portalNames.refreshTimer = undefined;

window.plugin.portalNames.ruler = null;
window.plugin.portalNames.metricsCache = Object.create(null);

window.plugin.portalNames._clamp = function (value, min, max) {
  return Math.max(min, Math.min(max, value));
};

window.plugin.portalNames._escapeHtml = function (text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
};

window.plugin.portalNames.loadSettings = function () {
  try {
    var raw = localStorage[window.plugin.portalNames.SETTINGS_KEY];
    if (!raw) return;

    var data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return;

    if (typeof data.offsetX === 'number') window.plugin.portalNames.settings.offsetX = data.offsetX;
    if (typeof data.offsetY === 'number') window.plugin.portalNames.settings.offsetY = data.offsetY;
    if (typeof data.showLeaderLine === 'boolean') window.plugin.portalNames.settings.showLeaderLine = data.showLeaderLine;
    if (typeof data.highlightEdge === 'boolean') window.plugin.portalNames.settings.highlightEdge = data.highlightEdge;

    window.plugin.portalNames.settings.offsetX = window.plugin.portalNames._clamp(
      Math.round(window.plugin.portalNames.settings.offsetX),
      -window.plugin.portalNames.MAX_OFFSET_X,
      window.plugin.portalNames.MAX_OFFSET_X
    );
    window.plugin.portalNames.settings.offsetY = window.plugin.portalNames._clamp(
      Math.round(window.plugin.portalNames.settings.offsetY),
      -window.plugin.portalNames.MAX_OFFSET_Y,
      window.plugin.portalNames.MAX_OFFSET_Y
    );
  } catch (e) {
    console.warn(e);
  }
};

window.plugin.portalNames.saveSettings = function () {
  try {
    localStorage[window.plugin.portalNames.SETTINGS_KEY] = JSON.stringify(window.plugin.portalNames.settings);
  } catch (e) {
    console.warn(e);
  }
};

window.plugin.portalNames.scheduleRefresh = function () {
  if (window.plugin.portalNames.refreshTimer) clearTimeout(window.plugin.portalNames.refreshTimer);

  window.plugin.portalNames.refreshTimer = setTimeout(function () {
    window.plugin.portalNames.refreshTimer = undefined;
    window.plugin.portalNames.clearAllPortalLabels();
    window.plugin.portalNames.updatePortalLabels();
  }, 200);
};

window.plugin.portalNames._ensureRuler = function () {
  if (window.plugin.portalNames.ruler) return;

  var existing = document.getElementById('plugin-portal-names-ruler');
  if (existing) {
    window.plugin.portalNames.ruler = existing;
    return;
  }

  var parent = document.body || document.documentElement;

  var ruler = document.createElement('div');
  ruler.id = 'plugin-portal-names-ruler';
  ruler.className = 'plugin-portal-names plugin-portal-names-ruler';
  ruler.style.width = window.plugin.portalNames.NAME_WIDTH + 'px';

  parent.appendChild(ruler);
  window.plugin.portalNames.ruler = ruler;
};

window.plugin.portalNames._getLineCountForHeight = function (full) {
  var padY = window.plugin.portalNames.LABEL_PADDING * 2;
  var lineH = window.plugin.portalNames.LABEL_LINE_HEIGHT;

  // Tolerance to avoid false line jumps due to sub-pixel rounding.
  var eps = 1;

  if (full > padY + lineH * 2 + eps) return 3;
  if (full > padY + lineH + eps) return 2;
  return 1;
};

window.plugin.portalNames._getLabelMetrics = function (title) {
  var cacheKey = title;

  var cache = window.plugin.portalNames.metricsCache;
  if (cache[cacheKey] !== undefined) return cache[cacheKey];

  window.plugin.portalNames._ensureRuler();

  var ruler = window.plugin.portalNames.ruler;
  if (!ruler) {
    cache[cacheKey] = {
      lines: window.plugin.portalNames.LABEL_MAX_LINES,
      w: window.plugin.portalNames.NAME_WIDTH,
      h: window.plugin.portalNames.MAX_LABEL_HEIGHT,
    };
    return cache[cacheKey];
  }

  var maxW = window.plugin.portalNames.NAME_WIDTH;
  var minW = window.plugin.portalNames.MIN_LABEL_WIDTH;

  var padY = window.plugin.portalNames.LABEL_PADDING * 2;
  var lineH = window.plugin.portalNames.LABEL_LINE_HEIGHT;
  var maxLines = window.plugin.portalNames.LABEL_MAX_LINES;

  // Height limit for maxLines lines.
  var maxH = padY + lineH * maxLines;

  var epsX = 0.5;

  // Baseline at max width defines intended wrapping.
  ruler.style.width = maxW + 'px';
  ruler.textContent = title;

  var baseLines = window.plugin.portalNames._getLineCountForHeight(ruler.scrollHeight);
  if (baseLines > maxLines) {
    cache[cacheKey] = {
      lines: maxLines,
      w: maxW,
      h: maxH,
    };
    return cache[cacheKey];
  }

  // Unbreakable word overflowing at max width -> keep max width.
  if (ruler.scrollWidth > maxW + epsX) {
    cache[cacheKey] = {
      lines: baseLines,
      w: maxW,
      h: padY + baseLines * lineH,
    };
    return cache[cacheKey];
  }

  var bestW = maxW;

  // For single-line titles, the minimal width is the rendered text width.
  // This avoids any “wrap after first word” cases that would otherwise clip the 2nd line.
  if (baseLines === 1) {
    bestW = Math.ceil(ruler.scrollWidth);
    bestW = window.plugin.portalNames._clamp(bestW, minW, maxW);

    cache[cacheKey] = {
      lines: 1,
      w: bestW,
      h: padY + lineH,
    };
    return cache[cacheKey];
  }

  // baseLines is 2 here: search the minimal width that stays within baseLines lines.
  var lo = minW;
  var hi = maxW;

  while (lo <= hi) {
    var mid = Math.floor((lo + hi) / 2);

    ruler.style.width = mid + 'px';

    var overX = ruler.scrollWidth > mid + epsX;
    var lines = window.plugin.portalNames._getLineCountForHeight(ruler.scrollHeight);

    if (!overX && lines <= baseLines) {
      bestW = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }

  ruler.style.width = bestW + 'px';

  var finalLines = window.plugin.portalNames._getLineCountForHeight(ruler.scrollHeight);
  if (finalLines > maxLines) finalLines = maxLines;

  cache[cacheKey] = {
    lines: finalLines,
    w: bestW,
    h: padY + finalLines * lineH,
  };

  return cache[cacheKey];
};

window.plugin.portalNames._getLabelSize = function (title) {
  var m = window.plugin.portalNames._getLabelMetrics(title);
  return { w: m.w, h: m.h };
};

window.plugin.portalNames.setupCSS = function () {
  var pad = window.plugin.portalNames.LABEL_PADDING;
  var lineH = window.plugin.portalNames.LABEL_LINE_HEIGHT;
  var maxH = window.plugin.portalNames.MAX_LABEL_HEIGHT;

  $('<style>')
    .prop('type', 'text/css')
    .html(
      '' +
        '.plugin-portal-names{' +
        'box-sizing:border-box;' +
        'color:#FFFFBB;' +
        'font-size:11px;line-height:' +
        lineH +
        'px;' +
        'text-align:center;padding:' +
        pad +
        'px;' +
        'overflow:hidden;' +
        // cap the visible height to exactly 2 lines (prevents “3rd line remnants” even without -webkit-line-clamp)
        'max-height:' +
        maxH +
        'px;' +
        // webkit multiline ellipsis where supported
        'display: -webkit-box;' +
        '-webkit-line-clamp: 2;' +
        '-webkit-box-orient: vertical;' +
        'text-shadow: 0 0 1px black, 0 0 1em black, 0 0 0.2em black;' +
        'pointer-events:none;' +
        'border-style:dotted;border-color:#FFFFBB;border-width:0;' +
        '}' +
        '.plugin-portal-names.align-left{text-align:left;}' +
        '.plugin-portal-names.align-right{text-align:right;}' +
        '.plugin-portal-names.align-center{text-align:center;}' +
        '.plugin-portal-names.edge-left{border-left-width:1px;}' +
        '.plugin-portal-names.edge-right{border-right-width:1px;}' +
        '.plugin-portal-names.edge-top{border-top-width:1px;}' +
        '.plugin-portal-names.edge-bottom{border-bottom-width:1px;}' +
        // ruler for dynamic measurement (do not clamp, measure full height, then clamp in JS)
        '.plugin-portal-names-ruler{' +
        'position:absolute;left:-10000px;top:-10000px;visibility:hidden;' +
        'display:block !important;overflow:visible !important;' +
        'max-height:none !important;' +
        '-webkit-line-clamp:unset !important;-webkit-box-orient:unset !important;' +
        'white-space:normal;' +
        '}'
    )
    .appendTo('head');

  window.plugin.portalNames._ensureRuler();
};

window.plugin.portalNames.getIconAnchor = function (labelWidth) {
  // Default (original): anchor at top-center => [W/2, 0]
  // Offsets are applied to the icon by shifting the anchor in the opposite direction.
  var x = labelWidth / 2 - window.plugin.portalNames.settings.offsetX;
  var y = -window.plugin.portalNames.settings.offsetY;
  return [x, y];
};

window.plugin.portalNames.getLabelBounds = function (portalPoint, size) {
  var anchor = L.point(window.plugin.portalNames.getIconAnchor(size.w));
  var topLeft = portalPoint.subtract(anchor);
  return new L.Bounds(topLeft, topLeft.add([size.w, size.h]));
};

window.plugin.portalNames.getCollisionBounds = function (labelBounds, size) {
  // preserve original behavior: expand horizontally by W/2 (=> 2W total) to reduce clutter
  var padX = size.w / 2;
  return new L.Bounds(labelBounds.min.subtract([padX, 0]), labelBounds.max.add([padX, 0]));
};

window.plugin.portalNames._getDockingPoint = function (portalPoint, labelBounds) {
  var min = labelBounds.min;
  var max = labelBounds.max;

  var inside = portalPoint.x >= min.x && portalPoint.x <= max.x && portalPoint.y >= min.y && portalPoint.y <= max.y;

  var x;
  var y;
  var edge;

  if (!inside) {
    x = window.plugin.portalNames._clamp(portalPoint.x, min.x, max.x);
    y = window.plugin.portalNames._clamp(portalPoint.y, min.y, max.y);

    // Determine edge. Handle corners by choosing the dominant axis.
    var eps = 0.5;
    var onLeft = Math.abs(x - min.x) < eps;
    var onRight = Math.abs(x - max.x) < eps;
    var onTop = Math.abs(y - min.y) < eps;
    var onBottom = Math.abs(y - max.y) < eps;

    if ((onLeft || onRight) && (onTop || onBottom)) {
      var dx = Math.abs(portalPoint.x - x);
      var dy = Math.abs(portalPoint.y - y);
      if (dx >= dy) edge = onLeft ? 'left' : 'right';
      else edge = onTop ? 'top' : 'bottom';
    } else if (onLeft) edge = 'left';
    else if (onRight) edge = 'right';
    else if (onTop) edge = 'top';
    else edge = 'bottom';
  } else {
    // Portal is inside the label bounds - pick nearest edge
    var distLeft = portalPoint.x - min.x;
    var distRight = max.x - portalPoint.x;
    var distTop = portalPoint.y - min.y;
    var distBottom = max.y - portalPoint.y;

    var best = Math.min(distLeft, distRight, distTop, distBottom);

    if (best === distLeft) {
      edge = 'left';
      x = min.x;
      y = window.plugin.portalNames._clamp(portalPoint.y, min.y, max.y);
    } else if (best === distRight) {
      edge = 'right';
      x = max.x;
      y = window.plugin.portalNames._clamp(portalPoint.y, min.y, max.y);
    } else if (best === distTop) {
      edge = 'top';
      x = window.plugin.portalNames._clamp(portalPoint.x, min.x, max.x);
      y = min.y;
    } else {
      edge = 'bottom';
      x = window.plugin.portalNames._clamp(portalPoint.x, min.x, max.x);
      y = max.y;
    }
  }

  return { point: L.point([x, y]), edge: edge, inside: inside };
};

window.plugin.portalNames._getAlignClassByEdge = function (edge) {
  if (edge === 'left') return 'align-left';
  if (edge === 'right') return 'align-right';
  return 'align-center';
};

window.plugin.portalNames.removeLabel = function (guid) {
  var previousLayer = window.plugin.portalNames.labelLayers[guid];
  if (previousLayer) {
    window.plugin.portalNames.labelLayerGroup.removeLayer(previousLayer);
    delete window.plugin.portalNames.labelLayers[guid];
  }

  var previousLine = window.plugin.portalNames.leaderLineLayers[guid];
  if (previousLine) {
    window.plugin.portalNames.labelLayerGroup.removeLayer(previousLine);
    delete window.plugin.portalNames.leaderLineLayers[guid];
  }
};

window.plugin.portalNames.addLabel = function (guid, latLng, size, classNames) {
  var previousLayer = window.plugin.portalNames.labelLayers[guid];
  if (previousLayer) return;

  var d = window.portals[guid].options.data;
  var portalNameHtml = window.plugin.portalNames._escapeHtml(d.title);

  var classes = ['plugin-portal-names'];
  if (classNames && classNames.length) classes = classes.concat(classNames);

  var label = new L.Marker(latLng, {
    icon: new L.DivIcon({
      className: classes.join(' '),
      iconAnchor: window.plugin.portalNames.getIconAnchor(size.w),
      iconSize: [size.w, size.h],
      html: portalNameHtml,
    }),
    guid: guid,
    interactive: false,
  });

  window.plugin.portalNames.labelLayers[guid] = label;
  label.addTo(window.plugin.portalNames.labelLayerGroup);
};

window.plugin.portalNames._addLeaderLine = function (guid, portalPoint, dockPoint) {
  if (!window.plugin.portalNames.settings.showLeaderLine) return;
  if (window.plugin.portalNames.leaderLineLayers[guid]) return;

  var dx = dockPoint.x - portalPoint.x;
  var dy = dockPoint.y - portalPoint.y;
  var dist = Math.sqrt(dx * dx + dy * dy);

  var portalGap = 10; // px - stop before portal center
  var boxGap = 3; // px - stop before touching label border

  if (dist <= portalGap + boxGap + 1) return;

  var ux = dx / dist;
  var uy = dy / dist;

  var startPoint = L.point([portalPoint.x + ux * portalGap, portalPoint.y + uy * portalGap]);
  var endPoint = L.point([dockPoint.x - ux * boxGap, dockPoint.y - uy * boxGap]);

  var startLatLng = window.map.unproject(startPoint);
  var endLatLng = window.map.unproject(endPoint);

  var polyline = new L.Polyline([startLatLng, endLatLng], {
    color: '#FFFFBB',
    weight: 1,
    opacity: 0.9,
    dashArray: '1,4',
    interactive: false,
    className: 'plugin-portal-names-leaderline',
  });

  window.plugin.portalNames.leaderLineLayers[guid] = polyline;
  polyline.addTo(window.plugin.portalNames.labelLayerGroup);
};

window.plugin.portalNames.clearAllPortalLabels = function () {
  for (var guid in window.plugin.portalNames.labelLayers) {
    window.plugin.portalNames.removeLabel(guid);
  }
};

window.plugin.portalNames.updatePortalLabels = function () {
  // as this is called every time layers are toggled, there's no point in doing it when the layer is off
  if (!window.map.hasLayer(window.plugin.portalNames.labelLayerGroup)) {
    return;
  }

  var portalPoints = {};
  var labelMeta = {};

  for (const guid in window.portals) {
    var p = window.portals[guid];
    if (p._map && p.options.data.title) {
      var point = window.map.project(p.getLatLng());
      portalPoints[guid] = point;

      var title = p.options.data.title;
      var size = window.plugin.portalNames._getLabelSize(title);

      var lb = window.plugin.portalNames.getLabelBounds(point, size);
      var cb = window.plugin.portalNames.getCollisionBounds(lb, size);
      var docking = window.plugin.portalNames._getDockingPoint(point, lb);

      labelMeta[guid] = {
        size: size,
        collisionBounds: cb,
        docking: docking,
      };
    }
  }

  // Order portals deterministically to make results stable.
  var sortedGuids = Object.keys(portalPoints).sort(function (a, b) {
    var pa = portalPoints[a];
    var pb = portalPoints[b];
    if (pa.y !== pb.y) return pa.y - pb.y;
    return pa.x - pb.x;
  });

  // Spatial hash: place each *accepted* collisionBounds into buckets.
  // Use conservative cell sizes based on max possible bounds.
  var buckets = {};
  var cellW = window.plugin.portalNames.NAME_WIDTH;
  var cellH = window.plugin.portalNames.MAX_LABEL_HEIGHT;

  function getBucketKeys(bounds) {
    var x0 = Math.floor(bounds.min.x / cellW);
    var x1 = Math.floor(bounds.max.x / cellW);
    var y0 = Math.floor(bounds.min.y / cellH);
    var y1 = Math.floor(bounds.max.y / cellH);

    var keys = [];
    for (var x = x0; x <= x1; x++) {
      for (var y = y0; y <= y1; y++) {
        keys.push(x + ',' + y);
      }
    }
    return keys;
  }

  var visible = {};

  sortedGuids.forEach(function (g) {
    var meta = labelMeta[g];
    if (!meta) return;

    var cb = meta.collisionBounds;
    var keys = getBucketKeys(cb);

    var collides = false;
    for (var i = 0; i < keys.length && !collides; i++) {
      var k = keys[i];
      var list = buckets[k];
      if (!list) continue;

      for (var j = 0; j < list.length; j++) {
        var otherGuid = list[j];
        var otherMeta = labelMeta[otherGuid];
        if (otherMeta && cb.intersects(otherMeta.collisionBounds)) {
          collides = true;
          break;
        }
      }
    }

    if (!collides) {
      visible[g] = true;
      keys.forEach(function (k) {
        if (!buckets[k]) buckets[k] = [];
        buckets[k].push(g);
      });
    }
  });

  // remove any not wanted
  for (const guid in window.plugin.portalNames.labelLayers) {
    if (!visible[guid]) window.plugin.portalNames.removeLabel(guid);
  }

  // and add those we do
  sortedGuids.forEach(function (g) {
    if (!visible[g]) return;
    if (window.plugin.portalNames.labelLayers[g]) return;

    var meta = labelMeta[g];
    if (!meta) return;

    var portalLatLng = window.portals[g].getLatLng();
    var docking = meta.docking;

    // Alignment rule: derived from the docking edge (same rule as leader line)
    var classes = [window.plugin.portalNames._getAlignClassByEdge(docking.edge)];

    // Edge highlight only makes sense when the leader line is drawn (portal outside)
    var showEdge = window.plugin.portalNames.settings.showLeaderLine && window.plugin.portalNames.settings.highlightEdge && !docking.inside;
    if (showEdge) classes.push('edge-' + docking.edge);

    window.plugin.portalNames.addLabel(g, portalLatLng, meta.size, classes);

    if (window.plugin.portalNames.settings.showLeaderLine && !docking.inside) {
      window.plugin.portalNames._addLeaderLine(g, portalPoints[g], docking.point);
    }
  });
};

// as calculating portal marker visibility can take some time when there's lots of portals shown, we'll do it on
// a short timer. this way it doesn't get repeated so much
window.plugin.portalNames.delayedUpdatePortalLabels = function (wait) {
  if (window.plugin.portalNames.timer === undefined) {
    window.plugin.portalNames.timer = setTimeout(function () {
      window.plugin.portalNames.timer = undefined;
      window.plugin.portalNames.updatePortalLabels();
    }, wait * 1000);
  }
};

window.plugin.portalNames.showOptionsDialog = function () {
  var s = window.plugin.portalNames.settings;

  var div = document.createElement('div');

  function makeRowRange(labelText, id, value, min, max) {
    var row = document.createElement('div');
    row.style.marginBottom = '6px';

    var label = document.createElement('label');
    label.htmlFor = id;
    label.appendChild(document.createTextNode(labelText + ': '));
    row.appendChild(label);

    var valueSpan = document.createElement('span');
    valueSpan.id = id + '-value';
    valueSpan.textContent = String(value);
    row.appendChild(valueSpan);

    row.appendChild(document.createElement('br'));

    var input = document.createElement('input');
    input.type = 'range';
    input.id = id;
    input.min = String(min);
    input.max = String(max);
    input.step = '1';
    input.value = String(value);
    input.style.width = '100%';
    row.appendChild(input);

    return { row: row, input: input, valueSpan: valueSpan };
  }

  function makeRowCheckbox(labelText, id, checked) {
    var row = document.createElement('div');
    row.style.marginBottom = '6px';

    var label = document.createElement('label');
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.checked = checked;

    label.appendChild(input);
    label.appendChild(document.createTextNode(' ' + labelText));
    row.appendChild(label);

    return { row: row, input: input };
  }

  var offX = makeRowRange('Offset X (px)', 'portal-names-offset-x', s.offsetX, -window.plugin.portalNames.MAX_OFFSET_X, window.plugin.portalNames.MAX_OFFSET_X);
  var offY = makeRowRange('Offset Y (px)', 'portal-names-offset-y', s.offsetY, -window.plugin.portalNames.MAX_OFFSET_Y, window.plugin.portalNames.MAX_OFFSET_Y);

  div.appendChild(offX.row);
  div.appendChild(offY.row);

  var leader = makeRowCheckbox('Show leader line', 'portal-names-leader-line', s.showLeaderLine);
  div.appendChild(leader.row);

  var edge = makeRowCheckbox('Highlight docking edge', 'portal-names-highlight-edge', s.highlightEdge);
  div.appendChild(edge.row);

  function syncEdgeDisabled() {
    edge.input.disabled = !leader.input.checked;
  }

  syncEdgeDisabled();

  // presets
  var presets = document.createElement('div');
  presets.style.marginTop = '10px';

  var presetsTitle = document.createElement('div');
  presetsTitle.textContent = 'Presets:';
  presetsTitle.style.marginBottom = '4px';
  presets.appendChild(presetsTitle);

  function addPresetButton(text, handler) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = text;
    btn.style.marginRight = '6px';
    btn.style.marginBottom = '6px';
    btn.addEventListener('click', handler, false);
    presets.appendChild(btn);
  }

  addPresetButton('Below', function () {
    s.offsetX = 0;
    s.offsetY = 0;
    offX.input.value = '0';
    offY.input.value = '0';
    offX.valueSpan.textContent = '0';
    offY.valueSpan.textContent = '0';
    window.plugin.portalNames.saveSettings();
    window.plugin.portalNames.scheduleRefresh();
  });

  addPresetButton('Above', function () {
    s.offsetX = 0;
    s.offsetY = -window.plugin.portalNames.MAX_LABEL_HEIGHT;
    s.offsetY = window.plugin.portalNames._clamp(s.offsetY, -window.plugin.portalNames.MAX_OFFSET_Y, window.plugin.portalNames.MAX_OFFSET_Y);
    offX.input.value = String(s.offsetX);
    offY.input.value = String(s.offsetY);
    offX.valueSpan.textContent = String(s.offsetX);
    offY.valueSpan.textContent = String(s.offsetY);
    window.plugin.portalNames.saveSettings();
    window.plugin.portalNames.scheduleRefresh();
  });

  addPresetButton('Right', function () {
    var gap = 10;
    s.offsetX = window.plugin.portalNames.NAME_WIDTH / 2 + gap;
    s.offsetY = -Math.round(window.plugin.portalNames.MAX_LABEL_HEIGHT / 2);
    s.offsetX = window.plugin.portalNames._clamp(s.offsetX, -window.plugin.portalNames.MAX_OFFSET_X, window.plugin.portalNames.MAX_OFFSET_X);
    s.offsetY = window.plugin.portalNames._clamp(s.offsetY, -window.plugin.portalNames.MAX_OFFSET_Y, window.plugin.portalNames.MAX_OFFSET_Y);
    offX.input.value = String(s.offsetX);
    offY.input.value = String(s.offsetY);
    offX.valueSpan.textContent = String(s.offsetX);
    offY.valueSpan.textContent = String(s.offsetY);
    window.plugin.portalNames.saveSettings();
    window.plugin.portalNames.scheduleRefresh();
  });

  addPresetButton('Left', function () {
    var gap = 10;
    s.offsetX = -(window.plugin.portalNames.NAME_WIDTH / 2 + gap);
    s.offsetY = -Math.round(window.plugin.portalNames.MAX_LABEL_HEIGHT / 2);
    s.offsetX = window.plugin.portalNames._clamp(s.offsetX, -window.plugin.portalNames.MAX_OFFSET_X, window.plugin.portalNames.MAX_OFFSET_X);
    s.offsetY = window.plugin.portalNames._clamp(s.offsetY, -window.plugin.portalNames.MAX_OFFSET_Y, window.plugin.portalNames.MAX_OFFSET_Y);
    offX.input.value = String(s.offsetX);
    offY.input.value = String(s.offsetY);
    offX.valueSpan.textContent = String(s.offsetX);
    offY.valueSpan.textContent = String(s.offsetY);
    window.plugin.portalNames.saveSettings();
    window.plugin.portalNames.scheduleRefresh();
  });

  addPresetButton('Reset', function () {
    s.offsetX = 0;
    s.offsetY = 0;
    s.showLeaderLine = false;
    s.highlightEdge = true;

    offX.input.value = '0';
    offY.input.value = '0';
    offX.valueSpan.textContent = '0';
    offY.valueSpan.textContent = '0';

    leader.input.checked = s.showLeaderLine;
    edge.input.checked = s.highlightEdge;
    syncEdgeDisabled();

    window.plugin.portalNames.saveSettings();
    window.plugin.portalNames.scheduleRefresh();
  });

  div.appendChild(presets);

  function onAnyChange() {
    s.offsetX = window.plugin.portalNames._clamp(
      parseInt(offX.input.value, 10),
      -window.plugin.portalNames.MAX_OFFSET_X,
      window.plugin.portalNames.MAX_OFFSET_X
    );
    s.offsetY = window.plugin.portalNames._clamp(
      parseInt(offY.input.value, 10),
      -window.plugin.portalNames.MAX_OFFSET_Y,
      window.plugin.portalNames.MAX_OFFSET_Y
    );
    s.showLeaderLine = leader.input.checked;
    syncEdgeDisabled();
    s.highlightEdge = edge.input.checked;

    offX.valueSpan.textContent = String(s.offsetX);
    offY.valueSpan.textContent = String(s.offsetY);

    window.plugin.portalNames.saveSettings();
    window.plugin.portalNames.scheduleRefresh();
  }

  offX.input.addEventListener('input', onAnyChange, false);
  offY.input.addEventListener('input', onAnyChange, false);
  leader.input.addEventListener('click', onAnyChange, false);
  edge.input.addEventListener('click', onAnyChange, false);

  window.dialog({
    id: 'plugin-portal-names-options',
    html: div,
    title: 'Portal Names Options',
    width: 320,
  });
};

var setup = function () {
  window.plugin.portalNames.loadSettings();
  window.plugin.portalNames.setupCSS();

  window.plugin.portalNames.labelLayerGroup = new L.LayerGroup();
  window.layerChooser.addOverlay(window.plugin.portalNames.labelLayerGroup, 'Portal Names');

  if (window.IITC && IITC.toolbox && typeof IITC.toolbox.addButton === 'function') {
    IITC.toolbox.addButton({
      label: 'Portal Names Opt',
      action: window.plugin.portalNames.showOptionsDialog,
    });
  }

  window.addHook('requestFinished', function () {
    setTimeout(function () {
      window.plugin.portalNames.delayedUpdatePortalLabels(3.0);
    }, 1);
  });

  window.addHook('mapDataRefreshEnd', function () {
    window.plugin.portalNames.delayedUpdatePortalLabels(0.5);
  });

  window.map.on('overlayadd overlayremove', function () {
    setTimeout(function () {
      window.plugin.portalNames.delayedUpdatePortalLabels(1.0);
    }, 1);
  });

  // On zoom the leader line endpoints (computed from pixel offsets) need recalculation.
  window.map.on('zoomend', function () {
    window.plugin.portalNames.clearAllPortalLabels();
    window.plugin.portalNames.delayedUpdatePortalLabels(0.1);
  });
};
