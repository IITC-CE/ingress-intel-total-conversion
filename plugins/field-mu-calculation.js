// ==UserScript==
// @author         AndysaurusRex
// @id             iitc-plugin-field-mu-calculation@local
// @name           IITC plugin: Field MU Calculation
// @category       Info
// @version        0.1.5
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @description    Reports the Mind Units (MU) of fields drawn with Draw Tools, using the Ingress-MU-Calculation API released November 2026.
// @include        https://intel.ingress.com/*
// @include        https://intel-x.ingress.com/*
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
  if (typeof window.plugin !== 'function') window.plugin = function () {};

  plugin_info.buildName = 'local';
  plugin_info.dateTimeVersion = '20261117000000';
  plugin_info.pluginId = 'triangle-mu';

  var STORAGE_KEY = 'plugin-triangle-mu-api';
  var DEFAULT_API = 'https://api.investigatexm.com';
  var TIMEOUT_MS = 25000;
  var BULK_LIMIT = 50; // API accepts 1-50 fields per bulk request

  window.plugin.triangleMU = function () {};
  var self = window.plugin.triangleMU;
  self.labelLayer = null;

  // ---------- settings ----------

  self.normalizeApi = function (url) {
    url = String(url || '').trim().replace(/\/+$/, '');
    return /^https?:\/\/\S+$/i.test(url) ? url : null;
  };

  self.getApi = function () {
    try {
      return self.normalizeApi(localStorage.getItem(STORAGE_KEY)) || DEFAULT_API;
    } catch (e) {
      return DEFAULT_API;
    }
  };

  self.setApi = function (url) {
    var clean = self.normalizeApi(url);
    if (!clean) return false;
    try { localStorage.setItem(STORAGE_KEY, clean); } catch (e) { /* ignore */ }
    return true;
  };

  // ---------- helpers ----------

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function flatten(latlngs) {
    // Leaflet 0.7 returns a flat array; Leaflet 1.x returns nested rings.
    while (latlngs.length && Array.isArray(latlngs[0])) latlngs = latlngs[0];
    return latlngs.slice();
  }

  function fmtCoord(ll) {
    return ll.lat.toFixed(6) + ',' + ll.lng.toFixed(6);
  }

  // ---------- collecting fields (3-vertex polygons) ----------

  self.collectTriangles = function () {
    var dt = window.plugin.drawTools;
    var triangles = [];
    var skipped = 0;

    dt.drawnItems.eachLayer(function (layer) {
      if (!(layer instanceof L.Polygon) || layer instanceof L.Rectangle) return;
      var pts = flatten(layer.getLatLngs());
      if (pts.length > 1 && pts[0].lat === pts[pts.length - 1].lat && pts[0].lng === pts[pts.length - 1].lng) {
        pts.pop(); // drop a duplicated closing vertex
      }
      if (pts.length !== 3) { skipped++; return; }
      triangles.push({ layer: layer, points: pts });
    });

    return { triangles: triangles, skipped: skipped };
  };

  // ---------- API ----------

  self.requestMU = function (triangles) {
    var fields = triangles.map(function (t, i) {
      return { id: 't' + i, coordinates: t.points.map(fmtCoord) };
    });

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;

    return fetch(self.getApi() + '/getMUbulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: fields }),
      signal: controller ? controller.signal : undefined
    }).then(function (resp) {
      return resp.json().catch(function () { return {}; }).then(function (body) {
        if (!resp.ok) throw new Error(body.error || ('HTTP ' + resp.status));
        if (!body.results) throw new Error('Unexpected response from the MU API.');
        return body;
      });
    }).then(function (body) {
      if (timer) clearTimeout(timer);
      return body;
    }, function (err) {
      if (timer) clearTimeout(timer);
      if (err && err.name === 'AbortError') throw new Error('The MU API did not answer within ' + (TIMEOUT_MS / 1000) + ' s.');
      throw err;
    });
  };

  // ---------- map labels ----------

  self.clearLabels = function () {
    if (self.labelLayer) self.labelLayer.clearLayers();
  };

  self.addLabel = function (triangle, text) {
    var pts = triangle.points;
    var lat = (pts[0].lat + pts[1].lat + pts[2].lat) / 3;
    var lng = (pts[0].lng + pts[1].lng + pts[2].lng) / 3;
    var icon = L.divIcon({
      className: 'plugin-triangle-mu-label',
      html: '<span>' + esc(text) + '</span>',
      iconSize: [100, 20],
      iconAnchor: [50, 10]
    });
    self.labelLayer.addLayer(L.marker([lat, lng], { icon: icon, clickable: false, keyboard: false }));
  };

  // ---------- UI ----------

  function showDialog(html, buttons) {
    window.dialog({
      id: 'plugin-triangle-mu',
      title: 'Field MU',
      html: html,
      width: 520,
      buttons: buttons || {},
      closeCallback: function () { self.clearLabels(); }
    });
  }

  function dialogButtons() {
    return {
      'Recalculate': function () { self.run(true); },
      'Set API URL': function () {
        var v = window.prompt(
          'MU API base URL (e.g. http://localhost:8000 for a self-hosted container):',
          self.getApi()
        );
        if (v === null) return;
        if (!self.setApi(v)) {
          window.alert('Please enter a valid http(s) URL.');
          return;
        }
        self.run(true);
      }
    };
  }

  // ---------- results table (sortable when there are 2+ fields) ----------

  // key: 'n' (drawing order) | 'mu' | 'area'; dir: 'desc' = big to small
  self.sort = { key: 'n', dir: 'asc' };
  self.view = { rows: [] };
  self.expanded = {}; // row number -> true when its vertices are shown

  self.renderTable = function () {
    var rows = self.view.rows.slice();
    var multi = rows.length > 1;
    var key = self.sort.key;
    var dir = self.sort.dir === 'asc' ? 1 : -1;

    if (multi && key) {
      rows.sort(function (a, b) {
        if (key !== 'n') {
          if (a.ok !== b.ok) return a.ok ? -1 : 1; // failed rows always last
          if (!a.ok) return a.n - b.n;
        }
        return ((a[key] - b[key]) * dir) || (a.n - b.n);
      });
    }

    function vertsCell(r) {
      if (self.expanded[r.n]) {
        return '<td class="v"><span class="vexp" onclick="window.plugin.triangleMU.toggleVerts(' + r.n + ');return false;" ' +
          'title="Click to collapse">' + r.verts + '</span></td>';
      }
      return '<td class="v"><a class="vtoggle" onclick="window.plugin.triangleMU.toggleVerts(' + r.n + ');return false;">expand</a></td>';
    }

    var allExpanded = rows.length > 0 && rows.every(function (r) { return self.expanded[r.n]; });

    var totalMU = 0, totalArea = 0, okCount = 0;
    var body = rows.map(function (r) {
      if (!r.ok) {
        return '<tr><td>' + r.n + '</td><td colspan="2" class="err">' + esc(r.error) + '</td>' +
          vertsCell(r) + '</tr>';
      }
      totalMU += r.mu;
      totalArea += r.area;
      okCount++;
      return '<tr><td>' + r.n + '</td>' +
        '<td class="mu"><b>' + r.mu.toLocaleString() + '</b></td>' +
        '<td>' + r.area.toLocaleString(undefined, { maximumFractionDigits: 3 }) + '</td>' +
        vertsCell(r) + '</tr>';
    }).join('');

    if (multi && okCount > 0) {
      var totalLabel = okCount === rows.length
        ? 'Total (' + okCount + ' fields)'
        : 'Total (' + okCount + ' of ' + rows.length + ' fields)';
      body += '<tr class="total"><td>&Sigma;</td>' +
        '<td class="mu"><b>' + totalMU.toLocaleString() + '</b></td>' +
        '<td><b>' + totalArea.toLocaleString(undefined, { maximumFractionDigits: 3 }) + '</b></td>' +
        '<td>' + totalLabel + '</td></tr>';
    }

    function th(label, k) {
      if (!multi) return '<th>' + label + '</th>';
      var ind = self.sort.key === k
        ? (self.sort.dir === 'asc' ? ' &#9650;' : ' &#9660;')
        : ' <span class="sortind">&#8645;</span>';
      return '<th class="sortable" onclick="window.plugin.triangleMU.sortBy(\'' + k + '\');return false;" ' +
        'title="Click to sort; click again to reverse">' + label + ind + '</th>';
    }

    return '<table class="plugin-triangle-mu-table">' +
      '<thead><tr>' + th('#', 'n') + th('MU', 'mu') + th('km&sup2;', 'area') +
      '<th class="clickable" onclick="window.plugin.triangleMU.toggleAllVerts();return false;" ' +
      'title="Click to expand or collapse all vertices">Vertices (lat,lng) ' + (allExpanded ? '[&minus;]' : '[+]') + '</th>' +
      '</tr></thead>' +
      '<tbody>' + body + '</tbody></table>';
  };

  self.sortBy = function (key) {
    if (self.sort.key === key) {
      self.sort.dir = self.sort.dir === 'desc' ? 'asc' : 'desc';
    } else {
      self.sort.key = key;
      self.sort.dir = 'desc'; // first click: biggest first
    }
    $('#plugin-triangle-mu-results').html(self.renderTable());
  };

  self.toggleVerts = function (n) {
    self.expanded[n] = !self.expanded[n];
    $('#plugin-triangle-mu-results').html(self.renderTable());
  };

  self.toggleAllVerts = function () {
    var all = self.view.rows.length > 0 && self.view.rows.every(function (r) { return self.expanded[r.n]; });
    self.view.rows.forEach(function (r) { self.expanded[r.n] = !all; });
    $('#plugin-triangle-mu-results').html(self.renderTable());
  };

  // In-memory cache of the last successful calculation. Valid while the API URL
  // and the fields (coordinates and order) are unchanged.
  self.cache = null; // { sig, rows, model }
  self.requestId = 0;

  function signature(batch) {
    return self.getApi() + '|' + batch.map(function (t) {
      return t.points.map(fmtCoord).join(';');
    }).join('/');
  }

  // Draws labels and the dialog from self.view / self.cache.
  self.showResults = function (batch, found, overflow, fromCache) {
    self.expanded = {}; // vertices start collapsed
    self.clearLabels();
    self.view.rows.forEach(function (r) {
      if (r.ok && batch[r.n - 1]) self.addLabel(batch[r.n - 1], r.mu.toLocaleString() + ' MU');
    });

    var html = '<div id="plugin-triangle-mu-results">' + self.renderTable() + '</div>';
    if (overflow > 0) html += '<p>Only the first ' + BULK_LIMIT + ' fields were calculated; ' + overflow + ' more were skipped.</p>';
    if (found.skipped) html += '<p>' + found.skipped + ' drawn polygon(s) ignored (not 3 vertices).</p>';
    html += '<p class="note">API: ' + esc(self.getApi()) + (fromCache ? ' (cached)' : '') +
      '<br>Model: ' + esc(self.cache.model || 'unknown') + '</p>';

    showDialog(html, dialogButtons());
  };

  // force = true skips the cache and always asks the API.
  self.run = function (force) {
    if (!window.plugin.drawTools || !window.plugin.drawTools.drawnItems) {
      showDialog('<p>The <b>Draw Tools</b> plugin is required. Enable it and draw a field (a polygon with exactly 3 vertices).</p>');
      return;
    }

    var found = self.collectTriangles();
    var triangles = found.triangles;

    if (!triangles.length) {
      var msg = '<p>No field found. Draw a polygon with exactly <b>3 vertices</b> using Draw Tools.</p>';
      if (found.skipped) msg += '<p>' + found.skipped + ' drawn polygon(s) ignored because they do not have 3 vertices.</p>';
      showDialog(msg, dialogButtons());
      return;
    }

    var batch = triangles.slice(0, BULK_LIMIT);
    var overflow = triangles.length - batch.length;
    var sig = signature(batch);

    if (force !== true && self.cache && self.cache.sig === sig) {
      self.requestId++; // invalidate any request still in flight
      self.view = { rows: self.cache.rows };
      self.showResults(batch, found, overflow, true);
      return;
    }

    var token = ++self.requestId;
    showDialog('<p>Calculating MU for ' + batch.length + ' field(s)&hellip;</p>');

    self.requestMU(batch).then(function (body) {
      if (token !== self.requestId) return; // a newer request superseded this one

      var rows = body.results.map(function (r, i) {
        var row = {
          n: i + 1,
          ok: !!r.ok,
          verts: batch[i].points.map(function (p) { return esc(fmtCoord(p)); }).join('<br>')
        };
        if (r.ok) {
          row.mu = r.mu;
          row.area = Number(r.area_km2);
        } else {
          row.error = r.error || 'Failed';
        }
        return row;
      });

      self.cache = { sig: sig, rows: rows, model: body.model };
      self.view = { rows: rows };
      self.showResults(batch, found, overflow, false);
    }).catch(function (err) {
      if (token !== self.requestId) return;
      showDialog('<p class="plugin-triangle-mu-error">Could not get MU: ' + esc(err && err.message ? err.message : err) +
        '</p><p class="note">API: ' + esc(self.getApi()) + '</p>', dialogButtons());
    });
  };

  // ---------- setup ----------

  var setup = function () {
    $('<style>').prop('type', 'text/css').html(
      '.plugin-triangle-mu-label{pointer-events:none;text-align:center;}' +
      '.plugin-triangle-mu-label span{display:inline-block;padding:1px 6px;border-radius:3px;' +
      'background:rgba(0,0,0,.75);color:#ffce00;border:1px solid #ffce00;font-size:12px;white-space:nowrap;}' +
      '.plugin-triangle-mu-table{width:100%;border-collapse:collapse;}' +
      '.plugin-triangle-mu-table th,.plugin-triangle-mu-table td{padding:3px 6px;text-align:left;vertical-align:top;' +
      'border-bottom:1px solid #20A8B1;}' +
      '.plugin-triangle-mu-table td.mu{font-size:15px;color:#ffce00;}' +
      '.plugin-triangle-mu-table th.sortable,.plugin-triangle-mu-table th.clickable{cursor:pointer;user-select:none;white-space:nowrap;}' +
      '.plugin-triangle-mu-table th.sortable:hover,.plugin-triangle-mu-table th.clickable:hover{color:#ffce00;}' +
      '.plugin-triangle-mu-table a.vtoggle,.plugin-triangle-mu-table .vexp{cursor:pointer;}' +
      '.plugin-triangle-mu-table .vexp{display:inline-block;}' +
      '.plugin-triangle-mu-table .sortind{opacity:.4;}' +
      '.plugin-triangle-mu-table tr.total td{border-top:2px solid #ffce00;border-bottom:none;}' +
      '.plugin-triangle-mu-table td.v{font-family:monospace;font-size:11px;}' +
      '.plugin-triangle-mu-table td.err,.plugin-triangle-mu-error{color:#ff6666;}' +
      '#dialog-plugin-triangle-mu .note{opacity:.7;font-size:11px;}'
    ).appendTo('head');

    self.labelLayer = new L.LayerGroup();
    window.addLayerGroup('Field MU labels', self.labelLayer, true);

    $('#toolbox').append(
      '<a id="plugin-triangle-mu-link" onclick="window.plugin.triangleMU.run();return false;" ' +
      'title="Calculate Mind Units for fields drawn with Draw Tools">Field MU</a>'
    );
  };

  setup.info = plugin_info;
  if (!window.bootPlugins) window.bootPlugins = [];
  window.bootPlugins.push(setup);
  if (window.iitcLoaded && typeof setup === 'function') setup();
}

var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
  info.script = {
    version: GM_info.script.version,
    name: GM_info.script.name,
    description: GM_info.script.description
  };
}
script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
(document.body || document.head || document.documentElement).appendChild(script);
