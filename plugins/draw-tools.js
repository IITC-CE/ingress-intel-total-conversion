// @author         breunigs
// @name           Draw tools
// @category       Draw
// @version        0.13.0
// @description    Allow drawing things onto the current map so you may plan your next move. Supports Multi-Project-Extension.

/* global IITC, L -- eslint */
/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '0.13.0',
    changes: [
      'Sync drawn items across devices via the Sync plugin (Multi-Projects-Extension aware)',
      'Register with the Sync plugin regardless of plugin load order',
      'Fix drawn area used by Tidy Links and Fly Links being misplaced after zooming',
      'Re-sync drawn items when Multi Projects Extension loads late',
    ],
  },
  { version: '0.12.1', changes: ['Refactoring: update Leaflet API usage'] },
  {
    version: '0.11.0',
    changes: ['Add confirmation dialog', 'Fix portal snap positioning bug'],
  },
  {
    version: '0.11.0',
    changes: ['Custom paste dialog', 'Import multiple files'],
  },
  {
    version: '0.10.4',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.10.3',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.10.2',
    changes: ['IITC.toolbox API is used to create plugin buttons'],
  },
  {
    version: '0.10.1',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// HOOK: pluginDrawTools
// custom hook for draw tools to share it's activity with other plugins

// use own namespace for plugin
window.plugin.drawTools = function () {};

window.plugin.drawTools.DEFAULT_KEY_STORAGE = 'plugin-draw-tools-layer';
// MPE points this at the active project's key, while DEFAULT_KEY_STORAGE keeps naming the default one
window.plugin.drawTools.KEY_STORAGE = window.plugin.drawTools.DEFAULT_KEY_STORAGE;

// Field synced by plugins/sync.js, keyed by "<projectStorageKey>::<uuid>" so that one
// registered field covers every MPE project
window.plugin.drawTools.itemMap = {};
window.plugin.drawTools.updateQueue = {};
window.plugin.drawTools.enableSync = false;
window.plugin.drawTools.SYNC_DELAY = 5000;
window.plugin.drawTools.KEY_DELIMITER = '::';

window.plugin.drawTools.merge = {};
window.plugin.drawTools.merge.status = true;
// reset: the new value of the setting; without it the setting flips (merge.status is its opposite)
window.plugin.drawTools.merge.toggle = (reset = window.plugin.drawTools.merge.status) => {
  IITC.settings.set('draw-tools.resetBeforeImport', reset);
};

// set between Leaflet.draw's edit or delete start and stop
window.plugin.drawTools.editing = false;
// a redraw was needed while editing (fill changed or a layer was added); done when editing stops
window.plugin.drawTools.fillPending = false;

window.plugin.drawTools.registerSettings = () => {
  IITC.settings.register('draw-tools', {
    title: 'Draw Tools',
    accesskey: 'x',
    shortcut: { label: 'DrawTools Opt' },
    blocks: [
      {
        type: 'color',
        key: 'color',
        title: 'Color',
        default: '#a24ac3',
        onChange: (color) => {
          window.plugin.drawTools.currentColor = color;
          window.plugin.drawTools.setDrawColor(color);
        },
      },
      {
        type: 'boolean',
        key: 'fill',
        title: 'Fill polygons',
        default: true,
        onChange: (fill) => {
          // reloading the shapes would drop the layers an edit or delete is working on
          if (window.plugin.drawTools.editing) {
            window.plugin.drawTools.fillPending = true;
            return;
          }
          window.plugin.drawTools.EDFstatus = !fill;
          window.plugin.drawTools.toggleOpacityOpt();
          window.plugin.drawTools.clearAndDraw();
        },
      },
      {
        type: 'action',
        title: 'Snap to portals',
        description: 'Moves the points in view onto the nearest portals',
        button: 'Snap',
        action: () => window.plugin.drawTools.snapToPortals(),
      },
      { type: 'heading', title: 'Export' },
      {
        type: 'export',
        title: 'Drawn items',
        description: 'Draw Tools data, as text or a file',
        data: () => drawnData(),
        filename: 'IITC-drawn-items.json',
        dataType: 'application/json',
      },
      {
        type: 'export',
        title: 'Polygons as lines',
        description: 'Drawn items with each polygon turned into a line, which is never filled',
        data: () => {
          requireDrawn();
          return window.plugin.drawTools.getDrawAsLines();
        },
      },
      {
        type: 'export',
        title: 'Link for the standard Intel map',
        description: () => {
          if (!window.plugin.drawTools.drawnItems || window.plugin.drawTools.isEmpty()) return 'For players without IITC';
          return ['For players without IITC', ...window.plugin.drawTools.stockLink().warnings].join('. ');
        },
        data: () => {
          requireDrawn();
          return window.plugin.drawTools.stockLink().url;
        },
      },
      { type: 'heading', title: 'Import' },
      {
        type: 'boolean',
        key: 'resetBeforeImport',
        title: 'Delete drawn items before importing',
        description: 'Otherwise imported items are added to the ones already drawn',
        onChange: (reset) => {
          window.plugin.drawTools.merge.status = !reset;
        },
      },
      {
        type: 'import',
        title: 'Drawn items',
        description: 'Draw Tools data, as text or files; pasted text may also be a link of the standard Intel map with drawn lines',
        onData: (text) => window.plugin.drawTools.promptImport(text),
        accept: 'application/json',
        onFiles: (files) => window.plugin.drawTools.importFiles(files),
      },
      { type: 'heading', title: 'Danger zone' },
      {
        type: 'action',
        title: 'Delete all drawn items',
        description: 'Asks before deleting; cannot be undone',
        button: 'Delete',
        action: () => window.plugin.drawTools.optReset(),
      },
    ],
  });
};

window.plugin.drawTools.getMarkerIcon = function (color) {
  if (!color) {
    console.warn('Color is not set (default #a24ac3 will be used)');
  }
  // todo: refactor to get rid of getMarkerIcon
  return new L.DivIcon.ColoredSvg(color);
};

window.plugin.drawTools.currentColor = '#a24ac3';

window.plugin.drawTools.setOptions = function () {
  window.plugin.drawTools.lineOptions = {
    stroke: true,
    color: window.plugin.drawTools.currentColor,
    weight: 4,
    opacity: 0.5,
    fill: false,
    interactive: true,
  };

  window.plugin.drawTools.polygonOptions = L.extend({}, window.plugin.drawTools.lineOptions, {
    fill: true,
    fillColor: null, // to use the same as 'color' for fill
    fillOpacity: 0.2,
    dashArray: '',
  });

  window.plugin.drawTools.editOptions = L.extend({}, window.plugin.drawTools.polygonOptions, {
    dashArray: '10,10',
  });
  delete window.plugin.drawTools.editOptions.color;

  window.plugin.drawTools.markerOptions = {
    icon: window.plugin.drawTools.currentMarker,
    zIndexOffset: 2000,
  };
};

window.plugin.drawTools.setDrawColor = function (color) {
  window.plugin.drawTools.currentColor = color;
  window.plugin.drawTools.currentMarker = window.plugin.drawTools.getMarkerIcon(color);

  window.plugin.drawTools.lineOptions.color = color;
  window.plugin.drawTools.polygonOptions.color = color;
  window.plugin.drawTools.markerOptions.icon = window.plugin.drawTools.currentMarker;

  window.plugin.drawTools.drawControl.setDrawingOptions({
    polygon: { shapeOptions: window.plugin.drawTools.polygonOptions, feet: false, nautic: false },
    polyline: { shapeOptions: window.plugin.drawTools.lineOptions, feet: false, nautic: false },
    circle: { shapeOptions: window.plugin.drawTools.polygonOptions, feet: false, nautic: false },
    marker: { icon: window.plugin.drawTools.markerOptions.icon },
  });
};

// renders the draw control buttons in the top left corner
window.plugin.drawTools.addDrawControl = function () {
  var drawControl = new L.Control.Draw({
    draw: {
      rectangle: false,
      circlemarker: false,
      polygon: {
        shapeOptions: window.plugin.drawTools.polygonOptions,
        snapPoint: window.plugin.drawTools.getSnapLatLng,
      },

      polyline: {
        shapeOptions: window.plugin.drawTools.lineOptions,
        snapPoint: window.plugin.drawTools.getSnapLatLng,
      },

      circle: {
        shapeOptions: window.plugin.drawTools.polygonOptions,
        snapPoint: window.plugin.drawTools.getSnapLatLng,
      },

      // Options for marker (icon, zIndexOffset) are not set via shapeOptions,
      // so we have merge them here!
      marker: L.extend({}, window.plugin.drawTools.markerOptions, {
        snapPoint: window.plugin.drawTools.getSnapLatLng,
        repeatMode: true,
      }),
    },

    edit: {
      featureGroup: window.plugin.drawTools.drawnItems,

      edit: {
        selectedPathOptions: window.plugin.drawTools.editOptions,
      },
    },
  });

  window.plugin.drawTools.drawControl = drawControl;

  window.map.addControl(drawControl);

  window.plugin.drawTools.setAccessKeys();
  for (var toolbarId in drawControl._toolbars) {
    if (drawControl._toolbars[toolbarId] instanceof L.Toolbar) {
      drawControl._toolbars[toolbarId].on('enable', function () {
        setTimeout(window.plugin.drawTools.setAccessKeys, 10);
      });
    }
  }
};

window.plugin.drawTools.setAccessKeys = function () {
  var expr = /\s*\[\w+]$/;
  // there is no API to add accesskeys, so have to dig in the DOM
  // must be same order as in markup. Note that each toolbar has a container for save/cancel
  var accessKeys = [
    'l', // line
    'p', // polygon
    'o', // circle
    'm', // marker
    'a', // cancel (_abort)
    'e', // edit
    'd', // delete
    's', // save
    'a', // cancel
  ];
  var buttons = window.plugin.drawTools.drawControl._container.getElementsByTagName('a');
  for (var i = 0; i < buttons.length; i++) {
    var button = buttons[i];

    var title = button.title;
    var index = title.search(expr);
    if (index !== -1) title = title.slice(0, index);

    if (!button.offsetParent) {
      // element hidden, delete accessKey (so other elements can use it)
      button.accessKey = '';
    } else if (accessKeys[i]) {
      button.accessKey = accessKeys[i];
      if (title === '') title = '[' + accessKeys[i] + ']';
      else title += ' [' + accessKeys[i] + ']';
    }
    button.title = title;
  }
};

// given a point it tries to find the most suitable portal to
// snap to. It takes the CircleMarker’s radius and weight into account.
// Will return null if nothing to snap to or a LatLng instance.
window.plugin.drawTools.getSnapLatLng = function (unsnappedLatLng) {
  var containerPoint = window.map.latLngToContainerPoint(unsnappedLatLng);
  var candidates = [];
  $.each(window.portals, function (guid, portal) {
    var ll = portal.getLatLng();
    var pp = window.map.latLngToContainerPoint(ll);
    var size = portal.options.weight + portal.options.radius;
    var dist = pp.distanceTo(containerPoint);
    if (dist > size) return true;
    candidates.push([dist, ll]);
  });

  if (candidates.length === 0) return unsnappedLatLng;
  candidates = candidates.sort(function (a, b) {
    return a[0] - b[0];
  });
  return new L.LatLng(candidates[0][1].lat, candidates[0][1].lng); // return a clone of the portal location
};

window.plugin.drawTools.generateId = () => {
  if (window.plugin.sync?.generateUUID) return window.plugin.sync.generateUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

window.plugin.drawTools.makeKey = (prefix, id) => prefix + window.plugin.drawTools.KEY_DELIMITER + id;

window.plugin.drawTools.parseKey = (composite) => {
  // ids are UUIDs, so splitting from the right holds without relying on MPE to keep delimiters out of project keys
  const idx = composite.lastIndexOf(window.plugin.drawTools.KEY_DELIMITER);
  if (idx === -1) return null;
  return { prefix: composite.slice(0, idx), id: composite.slice(idx + window.plugin.drawTools.KEY_DELIMITER.length) };
};

// null for a layer type draw-tools does not persist
window.plugin.drawTools.serializeLayer = function (layer) {
  const item = {};
  if (layer instanceof L.GeodesicCircle || layer instanceof L.Circle) {
    item.type = 'circle';
    item.latLng = layer.getLatLng();
    item.radius = layer.getRadius();
    item.color = layer.options.color;
  } else if (layer instanceof L.GeodesicPolygon || layer instanceof L.Polygon) {
    item.type = 'polygon';
    item.latLngs = layer.getLatLngs();
    item.color = layer.options.color;
  } else if (layer instanceof L.GeodesicPolyline || layer instanceof L.Polyline) {
    item.type = 'polyline';
    item.latLngs = layer.getLatLngs();
    item.color = layer.options.color;
  } else if (layer instanceof L.Marker) {
    item.type = 'marker';
    item.latLng = layer.getLatLng();
    item.color = layer.options.icon.options.color;
  } else {
    return null;
  }
  return item;
};

window.plugin.drawTools.save = function () {
  const data = [];
  const currentItems = {};
  const prefix = window.plugin.drawTools.KEY_STORAGE;
  const itemMap = window.plugin.drawTools.itemMap;

  window.plugin.drawTools.drawnItems.eachLayer((layer) => {
    const item = window.plugin.drawTools.serializeLayer(layer);
    if (!item) {
      console.warn('Unknown layer type when saving draw tools layer');
      return; // .eachLayer 'continue'
    }
    // a merge import can bring in ids already in use, and the duplicate would overwrite its twin in currentItems
    if (!layer._drawToolsId || currentItems[layer._drawToolsId]) {
      layer._drawToolsId = window.plugin.drawTools.generateId();
    }
    item.id = layer._drawToolsId;
    currentItems[item.id] = item;
    data.push(item);
  });
  localStorage[prefix] = JSON.stringify(data);

  const changed = [];
  Object.keys(itemMap).forEach((compKey) => {
    const parsed = window.plugin.drawTools.parseKey(compKey);
    if (!parsed || parsed.prefix !== prefix || currentItems[parsed.id]) return;
    delete itemMap[compKey];
    changed.push(compKey);
  });
  Object.entries(currentItems).forEach(([id, item]) => {
    const compKey = window.plugin.drawTools.makeKey(prefix, id);
    const newStr = JSON.stringify(item);
    if (itemMap[compKey] && JSON.stringify(itemMap[compKey]) === newStr) return;
    // serializeLayer hands back Leaflet's own latLng arrays and a vertex edit mutates them in place, so a stored reference compares equal to itself
    itemMap[compKey] = JSON.parse(newStr);
    changed.push(compKey);
  });

  if (changed.length > 0) {
    changed.forEach((k) => {
      window.plugin.drawTools.updateQueue[k] = true;
    });
    window.plugin.drawTools.delaySync();
  }

  console.log('draw-tools: saved to localStorage');
  // the export warnings on the settings page depend on the drawn items
  IITC.settings.refresh('draw-tools');
};

window.plugin.drawTools.load = function () {
  try {
    var dataStr = localStorage[window.plugin.drawTools.KEY_STORAGE];
    if (dataStr === undefined) return;

    var data = JSON.parse(dataStr);
    window.plugin.drawTools.import(data);
  } catch (e) {
    console.warn('draw-tools: failed to load data from localStorage: ' + e);
  } finally {
    // drawn items loaded again, such as from sync, change the export warnings on the settings page
    IITC.settings.refresh('draw-tools');
  }
};

window.plugin.drawTools.import = function (data) {
  $.each(data, function (index, item) {
    var layer = null;
    var extraOpt = {};
    if (item.color) extraOpt.color = item.color;

    switch (item.type) {
      case 'polyline':
        layer = L.geodesicPolyline(item.latLngs, L.extend({}, window.plugin.drawTools.lineOptions, extraOpt));
        break;
      case 'polygon':
        layer = L.geodesicPolygon(item.latLngs, L.extend({}, window.plugin.drawTools.polygonOptions, extraOpt));
        break;
      case 'circle':
        layer = L.geodesicCircle(item.latLng, item.radius, L.extend({}, window.plugin.drawTools.polygonOptions, extraOpt));
        break;
      case 'marker':
        var extraMarkerOpt = {};
        if (item.color) extraMarkerOpt.icon = window.plugin.drawTools.getMarkerIcon(item.color);
        layer = new L.Marker(item.latLng, L.extend({}, window.plugin.drawTools.markerOptions, extraMarkerOpt));
        window.registerMarkerForOMS(layer);
        break;
      default:
        console.warn('unknown layer type "' + item.type + '" when loading draw tools layer');
        break;
    }
    if (layer) {
      layer._drawToolsId = item.id || window.plugin.drawTools.generateId();
      window.plugin.drawTools.drawnItems.addLayer(layer);
    }
  });

  window.runHooks('pluginDrawTools', { event: 'import' });
};

// whether nothing is drawn
window.plugin.drawTools.isEmpty = () => {
  const data = localStorage.getItem(window.plugin.drawTools.KEY_STORAGE);
  return !data || data.length <= 2;
};

// nothing to export is an error the settings page shows
const requireDrawn = () => {
  if (window.plugin.drawTools.isEmpty()) throw new Error('Nothing is drawn yet');
};

// the drawn items as stored, for an export
const drawnData = () => {
  requireDrawn();
  return localStorage.getItem(window.plugin.drawTools.KEY_STORAGE);
};

/**
 * Builds a link of the standard Intel map that shows the drawn lines and polygons
 *
 * @returns {{url: string, warnings: string[]}} The link, and what it leaves out or may fail on
 */
window.plugin.drawTools.stockLink = function () {
  var stockWarnings = {};
  var stockLinks = [];
  window.plugin.drawTools.drawnItems.eachLayer(function (layer) {
    if (layer instanceof L.GeodesicCircle || layer instanceof L.Circle) {
      stockWarnings.noCircle = true;
      return; // .eachLayer 'continue'
    } else if (layer instanceof L.GeodesicPolygon || layer instanceof L.Polygon) {
      stockWarnings.polyAsLine = true;
      // but we can export them
    } else if (layer instanceof L.GeodesicPolyline || layer instanceof L.Polyline) {
      // polylines are fine
    } else if (layer instanceof L.Marker) {
      stockWarnings.noMarker = true;
      return; // .eachLayer 'continue'
    } else {
      stockWarnings.unknown = true; // should never happen
      return; // .eachLayer 'continue'
    }
    // only polygons and polylines make it through to here
    var latLngs = layer.getLatLngs();
    // stock only handles one line segment at a time
    for (var i = 0; i < latLngs.length - 1; i++) {
      stockLinks.push([latLngs[i].lat, latLngs[i].lng, latLngs[i + 1].lat, latLngs[i + 1].lng]);
    }
    // for polygons, we also need a final link from last to first point
    if (layer instanceof L.GeodesicPolygon || layer instanceof L.Polygon) {
      stockLinks.push([latLngs[latLngs.length - 1].lat, latLngs[latLngs.length - 1].lng, latLngs[0].lat, latLngs[0].lng]);
    }
  });
  var stockUrl =
    IITC.portal.display.makePermalink(null, {
      includeMapView: true,
      fullURL: true,
    }) +
    '&pls=' +
    stockLinks
      .map(function (link) {
        return link.join(',');
      })
      .join('_');
  var stockWarnTexts = [];
  if (stockWarnings.polyAsLine) stockWarnTexts.push('Note: polygons are exported as lines');
  if (stockLinks.length > 40) stockWarnTexts.push('Warning: Stock intel may not work with more than 40 line segments - there are ' + stockLinks.length);
  if (stockWarnings.noCircle) stockWarnTexts.push('Warning: Circles cannot be exported to stock intel');
  if (stockWarnings.noMarker) stockWarnTexts.push('Warning: Markers cannot be exported to stock intel');
  if (stockWarnings.unknown) stockWarnTexts.push('Warning: UNKNOWN ITEM TYPE');
  return { url: stockUrl, warnings: stockWarnTexts };
};

window.plugin.drawTools.optExport = () => {
  IITC.utils.exportFile(drawnData(), 'IITC-drawn-items.json', 'application/json');
};

/**
 * Adds pasted drawn items, or the lines of a link of the standard Intel map
 *
 * @param {string} promptAction - Draw Tools data or a link
 * @returns {string} What was imported
 * @throws {Error} When the text is neither
 */
window.plugin.drawTools.promptImport = function (promptAction) {
  let message;
  try {
    // first see if it looks like a URL-format stock intel link, and if so, try and parse out any stock drawn items
    // from the pls parameter

    // var intel = new RegExp('(https?://)?(www\\.)?ingress\\.com/intel.*[?&]pls=').exec(promptAction); // old url
    var matchIntel = new RegExp('(https://)?intel\\.ingress\\.com/.*[?&]pls=').exec(promptAction);
    if (matchIntel && matchIntel.index === 0) {
      // looks like a ingress URL that has drawn items...
      var items = promptAction.split(/[?&]/);
      var foundAt = -1;
      for (let i = 0; i < items.length; i++) {
        if (items[i].startsWith('pls=')) {
          foundAt = i;
        }
      }

      if (foundAt === -1) {
        throw new Error('No drawn items found in intel URL');
      }

      var newLines = [];
      var linesStr = items[foundAt].slice(4).split('_');
      for (let i = 0; i < linesStr.length; i++) {
        var floats = linesStr[i].split(',').map(Number);
        if (floats.length !== 4) {
          throw new Error('URL item not a set of four floats');
        }
        for (var j = 0; j < floats.length; j++) {
          if (isNaN(floats[j])) {
            throw new Error('URL item had invalid number');
          }
        }
        var layer = L.geodesicPolyline(
          [
            [floats[0], floats[1]],
            [floats[2], floats[3]],
          ],
          window.plugin.drawTools.lineOptions
        );
        newLines.push(layer);
      }

      // all parsed OK - clear and insert
      if (!window.plugin.drawTools.merge.status) {
        window.plugin.drawTools.drawnItems.clearLayers();
      }
      for (let i = 0; i < newLines.length; i++) {
        window.plugin.drawTools.drawnItems.addLayer(newLines[i]);
      }
      window.runHooks('pluginDrawTools', { event: 'import' });

      console.log('DRAWTOOLS: ' + (window.plugin.drawTools.merge.status ? '' : 'reset and ') + 'pasted drawn items from stock URL');
      message = `Imported ${newLines.length} lines from the link`;
    } else {
      if (window.plugin.drawTools.merge.status) {
        promptAction =
          typeof window.localStorage[window.plugin.drawTools.KEY_STORAGE] !== 'undefined' && window.localStorage[window.plugin.drawTools.KEY_STORAGE].length > 4
            ? window.localStorage[window.plugin.drawTools.KEY_STORAGE].slice(0, -1) + ',' + promptAction.slice(1)
            : promptAction;
      }
      var data;
      try {
        data = JSON.parse(promptAction);
      } catch {
        // invalid json, filter out any leading or trailing text and try again
        var mutatedPromptAction = promptAction;
        if (!mutatedPromptAction.match(new RegExp('^\\[\\{'))) {
          mutatedPromptAction = mutatedPromptAction.slice(mutatedPromptAction.indexOf('[{'));
        }
        if (!mutatedPromptAction.match(new RegExp('}]$'))) {
          mutatedPromptAction = mutatedPromptAction.slice(0, mutatedPromptAction.lastIndexOf('}]') + 2);
        }
        data = JSON.parse(mutatedPromptAction); // throws a new exception if we still didn't get good data, which is handled by the outer enclosure
      }
      window.plugin.drawTools.drawnItems.clearLayers();
      window.plugin.drawTools.import(data);
      console.log('DRAWTOOLS: ' + (window.plugin.drawTools.merge.status ? '' : 'reset and ') + 'pasted drawn items');
      message = 'Imported drawn items';
    }

    // to write back the data to localStorage
    window.plugin.drawTools.save();
  } catch (e) {
    console.warn('DRAWTOOLS: failed to import data: ' + e);
    throw new Error('Neither drawn items nor a link with drawn lines');
  }
  return message;
};

/**
 * Lets the user pick files of drawn items and adds them
 *
 * @returns {Promise<string|undefined>} What was imported, undefined when no file was picked
 * @throws {Error} When no file holds drawn items
 */
window.plugin.drawTools.optImport = async () => {
  const files = await IITC.utils.importFile({ accept: 'application/json', multiple: true });
  if (!files.length) return undefined;
  return window.plugin.drawTools.importFiles(files);
};

/**
 * Adds the drawn items of files read; with the reset before import on, the drawn items are deleted once, before
 * the first file
 *
 * @param {Array<{name: string, text: string}>} files - Files read, as `IITC.utils.importFile` returns them
 * @returns {string} What was imported
 * @throws {Error} When no file holds drawn items
 */
window.plugin.drawTools.importFiles = (files) => {
  let firstRun = true;
  const failed = [];
  for (const file of files) {
    try {
      const data = JSON.parse(file.text);
      if (firstRun && !window.plugin.drawTools.merge.status) {
        window.plugin.drawTools.drawnItems.clearLayers();
        firstRun = false;
      }
      window.plugin.drawTools.import(data);
      console.log('DRAWTOOLS: ' + (window.plugin.drawTools.merge.status ? '' : 'reset and ') + 'imported drawn items');
    } catch (e) {
      console.warn('DRAWTOOLS: failed to import data: ' + e);
      failed.push(file.name);
    }
  }
  // to write back the data to localStorage
  window.plugin.drawTools.save();
  if (failed.length === files.length) throw new Error(`No drawn items in ${failed.join(', ')}`);
  return failed.length ? `Imported drawn items; no drawn items in ${failed.join(', ')}` : 'Imported drawn items';
};

window.plugin.drawTools.optReset = function () {
  var promptAction = confirm('All drawn items will be deleted. Are you sure?');
  if (promptAction) {
    localStorage[window.plugin.drawTools.KEY_STORAGE] = '[]';
    window.plugin.drawTools.drawnItems.clearLayers();
    window.plugin.drawTools.load();
    window.plugin.drawTools.save(); // reconcile itemMap and push deletions through sync
    console.log('DRAWTOOLS: reset all drawn items');
    window.runHooks('pluginDrawTools', { event: 'clear' });
    return 'Deleted all drawn items';
  }
  return undefined;
};

window.plugin.drawTools.snapToPortals = function () {
  if (!IITC.map.tiles.getDataZoomParameters().hasPortals) {
    if (!confirm('Not all portals are visible on the map. Snap to portals may move valid points to the wrong place. Continue?')) {
      return;
    }
  }

  if (IITC.map.request.status.short !== 'done') {
    if (!confirm('Map data has not completely loaded, so some portals may be missing. Do you want to continue?')) {
      return;
    }
  }

  var visibleBounds = window.map.getBounds();

  // let's do all the distance calculations in screen space. 2d is much easier, should be faster, and is more than good enough
  // we'll pre-project all the on-screen portals too, to save repeatedly doing it
  var visiblePortals = {};
  $.each(window.portals, function (guid, portal) {
    var ll = portal.getLatLng();
    if (visibleBounds.contains(ll)) {
      visiblePortals[guid] = window.map.project(ll);
    }
  });

  if (!Object.keys(visiblePortals).length) {
    throw new Error('No portals visible in this view - nothing to snap points to');
  }

  var findClosestPortalLatLng = function (latlng) {
    // except when latlng is already on portal
    var testpoint = window.map.project(latlng);

    var minDistSquared = Infinity;
    var minGuid;
    for (var guid in visiblePortals) {
      var diff = visiblePortals[guid].subtract(testpoint);
      var distSquared = diff.x * diff.x + diff.y * diff.y;
      if (minDistSquared > distSquared) {
        minDistSquared = distSquared;
        minGuid = guid;
      }
    }
    if (minGuid) {
      var pll = window.portals[minGuid].getLatLng();
      if (pll.lat !== latlng.lat || pll.lng !== latlng.lng) {
        return new L.LatLng(pll.lat, pll.lng);
      }
    }
  };

  var changedCount = 0;
  var testCount = 0;
  window.plugin.drawTools.drawnItems.eachLayer(function (layer) {
    var newll;
    if (layer.getLatLng) {
      // circles and markers - a single point to snap
      var ll = layer.getLatLng();
      if (visibleBounds.contains(ll)) {
        testCount++;
        newll = findClosestPortalLatLng(ll);
        if (newll) {
          layer.setLatLng(newll);
          changedCount++;
        }
      }
    } else if (layer.getLatLngs) {
      var lls = layer.getLatLngs();
      var layerChanged;
      layer.getLatLngs().forEach(function (ll, i) {
        if (visibleBounds.contains(ll)) {
          testCount++;
          newll = findClosestPortalLatLng(ll);
          if (newll) {
            lls[i] = newll;
            changedCount++;
            layerChanged = true;
          }
        }
      });
      if (layerChanged) {
        layer.setLatLngs(lls);
      }
    }
  });
  if (changedCount) {
    window.runHooks('pluginDrawTools', {
      // or should we send 'layersEdited'? as that's effectively what's happened...
      event: 'layersSnappedToPortals',
    });
  }
  window.plugin.drawTools.save();
  return 'Tested ' + testCount + ' points, and moved ' + changedCount + ' onto portal coordinates';
};

window.plugin.drawTools.boot = function () {
  window.plugin.drawTools.registerSettings();
  window.plugin.drawTools.currentColor = IITC.settings.get('draw-tools.color');
  window.plugin.drawTools.merge.status = !IITC.settings.get('draw-tools.resetBeforeImport');
  window.plugin.drawTools.EDFstatus = !IITC.settings.get('draw-tools.fill');

  window.plugin.drawTools.currentMarker = window.plugin.drawTools.getMarkerIcon(window.plugin.drawTools.currentColor);

  window.plugin.drawTools.setOptions();
  window.plugin.drawTools.toggleOpacityOpt();

  // create a leaflet FeatureGroup to hold drawn items
  window.plugin.drawTools.drawnItems = new L.FeatureGroup();

  // load any previously saved items
  window.plugin.drawTools.load();

  // add the draw control - this references the above FeatureGroup for editing purposes
  window.plugin.drawTools.addDrawControl();
  window.plugin.drawTools.setDrawColor(window.plugin.drawTools.currentColor);

  // start off hidden. if the layer is enabled, the below layerChooser.addOverlay will add it, triggering a 'show'
  $('.leaflet-draw-section').hide();

  // hide the draw tools when the 'drawn items' layer is off, show it when on
  window.map.on('layeradd', function (obj) {
    if (obj.layer === window.plugin.drawTools.drawnItems) {
      $('.leaflet-draw-section').show();
    }
  });
  window.map.on('layerremove', function (obj) {
    if (obj.layer === window.plugin.drawTools.drawnItems) {
      $('.leaflet-draw-section').hide();
    }
  });

  // add the layer
  window.layerChooser.addOverlay(window.plugin.drawTools.drawnItems, 'Drawn Items');

  // place created items into the specific layer
  window.map.on('draw:created', function (e) {
    var layer = e.layer;
    window.plugin.drawTools.drawnItems.addLayer(layer);
    window.plugin.drawTools.save();

    if (layer instanceof L.Marker) {
      window.registerMarkerForOMS(layer);
    }

    if (window.plugin.drawTools.EDFstatus) {
      //    window.plugin.drawTools.toggleOpacityOpt(); // disabled by Zaso
      // reloading would drop the layers an edit or delete is working on; redraw when it stops
      if (window.plugin.drawTools.editing) window.plugin.drawTools.fillPending = true;
      else window.plugin.drawTools.clearAndDraw();
    }

    window.runHooks('pluginDrawTools', { event: 'layerCreated', layer: layer });
  });

  window.map.on('draw:editstart', window.plugin.drawTools.onEditStart);
  window.map.on('draw:editstop', window.plugin.drawTools.onEditStop);
  window.map.on('draw:deletestart', window.plugin.drawTools.onDeleteStart);
  window.map.on('draw:deletestop', window.plugin.drawTools.onDeleteStop);

  window.map.on('draw:deleted', function () {
    window.plugin.drawTools.save();
    window.runHooks('pluginDrawTools', { event: 'layersDeleted' });
  });

  window.map.on('draw:edited', function () {
    window.plugin.drawTools.save();
    window.runHooks('pluginDrawTools', { event: 'layersEdited' });
  });
};

// ---------------------------------------------------------------------------------
// EXPORT (POLYS AS LINES)
// ---------------------------------------------------------------------------------
window.plugin.drawTools.getDrawAsLines = function () {
  var rawDraw = JSON.parse(window.localStorage[window.plugin.drawTools.KEY_STORAGE]);
  var draw = [];

  for (const i in rawDraw) {
    var elemDraw = rawDraw[i];

    if (elemDraw.type === 'polygon') {
      var convElemDraw = {};
      convElemDraw.color = elemDraw.color;
      convElemDraw.type = 'polyline';
      convElemDraw.latLngs = [];

      for (const j in elemDraw.latLngs) {
        var ll = elemDraw.latLngs[j];
        convElemDraw.latLngs.push(ll);
      }
      convElemDraw.latLngs.push(elemDraw.latLngs[0]);

      draw.push(convElemDraw);
    } else {
      draw.push(elemDraw);
    }
  }

  return JSON.stringify(draw);
};

// ---------------------------------------------------------------------------------
// EMPTY POLYGONS (EMPTY DRAWN FIELDS)
// ---------------------------------------------------------------------------------
window.plugin.drawTools.EDFstatus = false;

window.plugin.drawTools.onEditStart = () => {
  window.plugin.drawTools.editing = true;
};

window.plugin.drawTools.onEditStop = () => {
  window.plugin.drawTools.editing = false;
  if (!window.plugin.drawTools.fillPending) return;
  window.plugin.drawTools.fillPending = false;
  window.plugin.drawTools.EDFstatus = !IITC.settings.get('draw-tools.fill');
  window.plugin.drawTools.toggleOpacityOpt();
  window.plugin.drawTools.clearAndDraw();
};

// polygons stay filled and clickable while deleting, so that they can be picked
window.plugin.drawTools.onDeleteStart = () => {
  window.plugin.drawTools.editing = true;
  window.plugin.drawTools.EDFstatus = false;
  window.plugin.drawTools.toggleOpacityOpt();
  window.plugin.drawTools.clearAndDraw();
};

window.plugin.drawTools.onDeleteStop = () => {
  window.plugin.drawTools.editing = false;
  window.plugin.drawTools.fillPending = false;
  window.plugin.drawTools.EDFstatus = !IITC.settings.get('draw-tools.fill');
  window.plugin.drawTools.toggleOpacityOpt();
  window.plugin.drawTools.clearAndDraw();
};

// fill: the new value of the setting; without it the setting flips. onChange redraws the polygons
window.plugin.drawTools.toggleEDF = (fill = !IITC.settings.get('draw-tools.fill')) => {
  IITC.settings.set('draw-tools.fill', fill);
};

window.plugin.drawTools.toggleOpacityOpt = function () {
  if (window.plugin.drawTools.EDFstatus) {
    window.plugin.drawTools.polygonOptions.fillOpacity = 0.0;
    window.plugin.drawTools.polygonOptions.interactive = false;
  } else {
    window.plugin.drawTools.polygonOptions.fillOpacity = 0.2;
    window.plugin.drawTools.polygonOptions.interactive = true;
  }
};

window.plugin.drawTools.clearAndDraw = function () {
  window.plugin.drawTools.drawnItems.clearLayers();
  window.plugin.drawTools.load();
  console.log('DRAWTOOLS: reset all drawn items');
};

window.plugin.drawTools.edfStatusToggle = (fill) => {
  window.plugin.drawTools.toggleEDF(fill);
};

// ---------------------------------------------------------------------------------
// MPE - MULTI PROJECTS EXTENSION
// ---------------------------------------------------------------------------------
window.plugin.drawTools.initMPE = function () {
  // MPE may not be loaded yet, and fires this hook once it is
  if (!window.plugin.mpe) {
    window.addHook('pluginMpeReady', window.plugin.drawTools.initMPE);
    return;
  }

  // The MPE function to set a MultiProjects type
  window.plugin.mpe.setMultiProjects({
    namespace: 'drawTools',
    title: 'Draw Tools Layer',
    // Material Symbols ligature name
    icon: 'edit',
    // Font awesome css class
    fa: 'fa-pencil',
    // Function to change a localstorage key
    func_setKey: function (newKey) {
      window.plugin.drawTools.KEY_STORAGE = newKey;
    },
    // Native value of localstorage key
    defaultKey: window.plugin.drawTools.DEFAULT_KEY_STORAGE,
    // This function is run before the localstorage key change
    func_pre: function () {},
    // This function is run after the localstorage key change
    func_post: function () {
      window.plugin.drawTools.drawnItems.clearLayers();
      window.plugin.drawTools.load();
      console.log('DRAWTOOLS: reset all drawn items (func_post)');

      if (window.plugin.crossLinks) {
        window.plugin.crossLinks.checkAllLinks();

        if (window.plugin.destroyedLinks) {
          window.plugin.destroyedLinks.cross.removeCrossAll();
        }
      }

      // Code to:
      // hide/remove elements from DOM, layers, variables, etc...
      // load data from window.localStorage[window.plugin.myPlugin.KEY_STORAGE]
      // show/add/draw elements in the DOM, layers, variables, etc...
    },
  });
};

// one filter per drawn polygon; each compares layer points, so it is valid only for the view it was built in
window.plugin.drawTools.getLocationFilters = function () {
  var filters;
  if (!window.map.hasLayer(window.plugin.drawTools.drawnItems)) {
    return [];
  }
  var markers = [];
  var polygons = [];
  window.plugin.drawTools.drawnItems.eachLayer(function (layer) {
    if (layer instanceof L.GeodesicPolygon) {
      polygons.push(layer);
    } else if (layer instanceof L.Marker) {
      markers.push(layer);
    }
  });
  markers = markers.filter(function (marker) {
    return marker._icon._leaflet_pos;
  });
  polygons = polygons.filter(function (poly) {
    return poly._rings && poly._rings.length;
  });
  polygons = polygons.map(function (poly) {
    return poly._rings[0];
  });
  filters = polygons.map(function (poly) {
    return function (portal) {
      // portal|Point|LatLng
      var point;
      if ('_point' in portal || portal instanceof L.CircleMarker) {
        point = portal._point;
        if (!point) {
          return false;
        }
      } else if ('x' in portal) {
        point = portal;
      } else if ('lat' in portal) {
        point = window.map.latLngToLayerPoint(portal);
      } else if (portal.getLatLng) {
        point = window.map.latLngToLayerPoint(portal.getLatLng());
      }
      if (
        markers.some(function (marker) {
          return marker._icon._leaflet_pos.equals(point);
        })
      ) {
        return false;
      }
      return window.pnpoly(poly, point);
    };
  });
  return filters;
};

// ---------------------------------------------------------------------------------
// SYNC (via plugins/sync.js)
// ---------------------------------------------------------------------------------

// localStorage keys holding draw-tools data: the default project plus any MPE projects
window.plugin.drawTools.getAllProjectKeys = () => {
  const keys = [window.plugin.drawTools.DEFAULT_KEY_STORAGE];
  // MPE prefixes every project key with 'MPE_', so none of them can collide with the default one
  keys.push(...(window.plugin.mpe?.obj?.projects?.drawTools?.pj ?? []));
  return keys;
};

// Mints ids for legacy id-less drawings in every project and populates itemMap
// Returns true when the active project was rewritten, leaving its layers out of step with storage
window.plugin.drawTools.seedItemMap = () => {
  const itemMap = {};
  const activePrefix = window.plugin.drawTools.KEY_STORAGE;
  let activeMutated = false;

  window.plugin.drawTools.getAllProjectKeys().forEach((prefix) => {
    const raw = localStorage[prefix];
    if (!raw) return;
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.warn(`draw-tools: failed to parse localStorage[${prefix}] during sync seed`);
      return;
    }
    if (!Array.isArray(data)) return;

    let mutated = false;
    data.forEach((item) => {
      if (!item?.type) return;
      if (!item.id) {
        item.id = window.plugin.drawTools.generateId();
        mutated = true;
      }
      itemMap[window.plugin.drawTools.makeKey(prefix, item.id)] = item;
    });
    if (!mutated) return;
    localStorage[prefix] = JSON.stringify(data);
    if (prefix === activePrefix) activeMutated = true;
  });

  window.plugin.drawTools.itemMap = itemMap;
  return activeMutated;
};

window.plugin.drawTools.delaySync = () => {
  if (!window.plugin.drawTools.enableSync) return;
  clearTimeout(window.plugin.drawTools.delaySync.timer);
  window.plugin.drawTools.delaySync.timer = setTimeout(() => {
    window.plugin.drawTools.delaySync.timer = null;
    window.plugin.drawTools.syncNow();
  }, window.plugin.drawTools.SYNC_DELAY);
};

window.plugin.drawTools.syncNow = () => {
  if (!window.plugin.drawTools.enableSync) return;
  const keys = Object.keys(window.plugin.drawTools.updateQueue);
  if (keys.length === 0) return;
  window.plugin.drawTools.updateQueue = {};
  window.plugin.sync.updateMap('drawTools', 'itemMap', keys);
};

// fullUpdated is set whenever the file was last written by another client, meaning sync has
// just replaced itemMap wholesale, so every project's localStorage is rebuilt from it
window.plugin.drawTools.remoteCallback = (pluginName, fieldName, e, fullUpdated) => {
  if (!fullUpdated || fieldName !== 'itemMap') return;

  const byPrefix = {};
  Object.entries(window.plugin.drawTools.itemMap).forEach(([compKey, item]) => {
    const parsed = window.plugin.drawTools.parseKey(compKey);
    if (!parsed || !item) return;
    (byPrefix[parsed.prefix] ??= []).push(item);
  });

  // a project the remote no longer lists has to be emptied here, not left as it was
  window.plugin.drawTools.getAllProjectKeys().forEach((prefix) => {
    byPrefix[prefix] ??= [];
  });
  Object.entries(byPrefix).forEach(([prefix, items]) => {
    localStorage[prefix] = JSON.stringify(items);
  });

  // so MPE learns about projects that arrived only from the remote
  window.plugin.mpe?.data?.scanStorageForOne?.('drawTools');

  window.plugin.drawTools.drawnItems.clearLayers();
  window.plugin.drawTools.load();

  // sync already replaced itemMap, so anything still queued refers to values that are gone
  const discarded = Object.keys(window.plugin.drawTools.updateQueue).length;
  window.plugin.drawTools.updateQueue = {};

  console.log('draw-tools: rebuilt from remote sync');
  if (discarded > 0) console.warn(`draw-tools: ${discarded} local change(s) were overwritten before they reached sync`);
};

window.plugin.drawTools.syncInitialized = (pluginName, fieldName) => {
  if (fieldName !== 'itemMap') return;
  window.plugin.drawTools.enableSync = true;
  if (Object.keys(window.plugin.drawTools.updateQueue).length > 0) {
    window.plugin.drawTools.delaySync();
  }
};

// MPE reports a switch and a deletion through the same hook; entries left pointing at a vanished
// prefix are what tells us a project is gone
window.plugin.drawTools.reconcileAfterMpeChange = (data) => {
  if (data?.data?.namespace !== 'drawTools') return;

  const validPrefixes = new Set(window.plugin.drawTools.getAllProjectKeys());
  const dropped = Object.keys(window.plugin.drawTools.itemMap).filter((compKey) => {
    const parsed = window.plugin.drawTools.parseKey(compKey);
    return parsed && !validPrefixes.has(parsed.prefix);
  });
  if (dropped.length === 0) return;

  dropped.forEach((compKey) => {
    delete window.plugin.drawTools.itemMap[compKey];
    window.plugin.drawTools.updateQueue[compKey] = true;
  });
  window.plugin.drawTools.delaySync();
};

// MPE can register its projects after the seeding below, leaving them out of itemMap
window.plugin.drawTools.reseedAfterMpeReady = () => {
  if (window.plugin.drawTools.seedItemMap()) {
    window.plugin.drawTools.drawnItems.clearLayers();
    window.plugin.drawTools.load();
  }
};

window.plugin.drawTools.registerFieldForSyncing = () => {
  // sync may not be loaded yet, and fires this hook once it is
  if (!window.plugin.sync) {
    window.addHook('pluginSyncReady', window.plugin.drawTools.registerFieldForSyncing);
    return;
  }
  // seeding rewrote storage, so the layers already on the map still carry no ids
  if (window.plugin.drawTools.seedItemMap()) {
    window.plugin.drawTools.drawnItems.clearLayers();
    window.plugin.drawTools.load();
  }
  window.addHook('mpe', window.plugin.drawTools.reconcileAfterMpeChange);
  window.addHook('pluginMpeReady', window.plugin.drawTools.reseedAfterMpeReady);
  window.plugin.sync.registerMapForSync('drawTools', 'itemMap', window.plugin.drawTools.remoteCallback, window.plugin.drawTools.syncInitialized);
};

function setup() {
  loadExternals(); // initialize leaflet
  window.plugin.drawTools.boot(); // initialize drawtools
  window.plugin.drawTools.initMPE(); // register to MPE if available
  window.plugin.drawTools.registerFieldForSyncing(); // register with sync.js if available

  var filterEvents = new L.Evented();
  window.map.on('draw:created draw:edited draw:deleted', function (e) {
    filterEvents.fire('changed', { originalEvent: e });
  });
  window.plugin.drawTools.filterEvents = filterEvents;
}
setup.priority = 'high';

function loadExternals() {
  try {
    // https://github.com/Leaflet/Leaflet.draw
    // eslint-disable-next-line
    '@include_raw:external/leaflet.draw-src.js@';
    $('<style>').html('@include_css:external/leaflet.draw-src.css@').appendTo('head');

    $('<style>').html('@include_css:external/leaflet.draw-fix.css@').appendTo('head');

    // eslint-disable-next-line
    '@include_raw:external/leaflet.draw-snap.js@';

    // eslint-disable-next-line
    '@include_raw:external/leaflet.draw-geodesic.js@';

    // eslint-disable-next-line
    '@include_raw:external/leaflet.draw-confirm.js@';

    // support Leaflet >= 1
    // https://github.com/Leaflet/Leaflet.draw/pull/911
    L.Draw.Polyline.prototype.options.shapeOptions.interactive = true;
    L.Draw.Polygon.prototype.options.shapeOptions.interactive = true;
    L.Draw.Rectangle.prototype.options.shapeOptions.interactive = true;
    L.Draw.CircleMarker.prototype.options.interactive = true;
    L.Draw.Circle.prototype.options.shapeOptions.interactive = true;

    // https://github.com/Leaflet/Leaflet.draw/issues/789
    // https://github.com/Leaflet/Leaflet.draw/issues/695
    L.Draw.Polyline.prototype._onTouch_original = L.Draw.Polyline.prototype._onTouch; // just in case
    L.Draw.Polyline.prototype._onTouch = L.Util.falseFn;

    // workaround for https://github.com/Leaflet/Leaflet.draw/issues/923
    window.map.addHandler('touchExtend', L.Map.TouchExtend);

    // disable tap handler as it conflicts with leaflet.draw
    // https://github.com/Leaflet/Leaflet/issues/6977
    // !Note: currently this may brake `contextmenu` handling on iOS
    window.map.tap = window.map.tap ? window.map.tap.disable() : false;
  } catch (e) {
    console.error('leaflet.draw-src.js loading failed');
    throw e;
  }
}
