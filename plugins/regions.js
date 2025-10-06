// @author         jonatkins
// @name           Ingress scoring regions
// @category       Layer
// @version        0.3.3
// @description    Show the regional scoring cells grid on the map

/* exported setup, changelog --eslint */
/* global L -- eslint */

var changelog = [
  {
    version: '0.3.3',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.3.2',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.3.1',
    changes: ['fixed region names'],
  },
  {
    version: '0.3.0',
    changes: ['a fix in the hilbercurve calculation', 'fix region-search by enhance the cell-id'],
  },
];

// use own namespace for plugin
window.plugin.regions = function () { };

window.plugin.regions.setup = function () {
  '@include_raw:external/s2geometry.js@';

  window.plugin.regions.regionLayer = L.layerGroup();

  $('<style>')
    .prop('type', 'text/css')
    .html(
      '.plugin-regions-name {\
             font-size: 14px;\
             font-weight: bold;\
             color: gold;\
             opacity: 0.7;\
             text-align: center;\
             text-shadow: 0 0 1px black, 0 0 1em black, 0 0 0.2em black;\
             pointer-events: none;\
          }'
    )
    .appendTo('head');

  window.layerChooser.addOverlay(window.plugin.regions.regionLayer, 'Score Regions');

  window.map.on('moveend', window.plugin.regions.update);

  window.addHook('search', window.plugin.regions.search);

  window.plugin.regions.update();
};

window.plugin.regions.FACE_NAMES = ['AF', 'AS', 'NR', 'PA', 'AM', 'ST'];
window.plugin.regions.CODE_WORDS = [
  'ALPHA',
  'BRAVO',
  'CHARLIE',
  'DELTA',
  'ECHO',
  'FOXTROT',
  'GOLF',
  'HOTEL',
  'JULIET',
  'KILO',
  'LIMA',
  'MIKE',
  'NOVEMBER',
  'PAPA',
  'ROMEO',
  'SIERRA',
];

// This regexp is quite forgiving. Dashes are allowed between all components, each dash and leading zero is optional.
// All whitespace is removed in onSearch(). If the first or both the first and second component are omitted, they are
// replaced with the current cell's coordinates (=the cell which contains the center point of the map). If the last
// component is omitted, the 4x4 cell group is used.
window.plugin.regions.REGEXP = new RegExp(
  '^(?:(?:(' +
  window.plugin.regions.FACE_NAMES.join('|') +
  ')-?)?((?:1[0-6])|(?:0?[1-9]))-?)?(' +
  window.plugin.regions.CODE_WORDS.join('|') +
  ')(?:-?((?:1[0-5])|(?:0?\\d)))?$',
  'i'
);

window.plugin.regions.regionName = function (cell) {
  // first component of the name is the face
  var name = window.plugin.regions.FACE_NAMES[cell.face];

  if (cell.level >= 4) {
    // next two components are from the most signifitant four bits of the cell I/J
    var regionI = cell.ij[0] >> (cell.level - 4);
    var regionJ = cell.ij[1] >> (cell.level - 4);

    // for Odd faces Nia swaps id & codename
    if (cell.face % 2 === 1) {
      [regionI, regionJ] = [regionJ, regionI];
    }

    name += window.zeroPad(regionI + 1, 2) + '-' + window.plugin.regions.CODE_WORDS[regionJ];
  }

  if (cell.level >= 6) {
    // the final component is based on the hibbert curve for the relevant cell
    var facequads = cell.getFaceAndQuads();
    var number = facequads[1][4] * 4 + facequads[1][5];

    name += '-' + window.zeroPad(number, 2);
  }

  return name;
};

window.plugin.regions.search = function (query) {
  var terms = query.term.replace(/\s+/g, '').split(/[,;]/);
  var matches = terms.map(function (string) {
    return string.match(window.plugin.regions.REGEXP);
  });
  if (
    !matches.every(function (match) {
      return match !== null;
    })
  )
    return;

  var currentCell = window.plugin.regions.regionName(window.S2.S2Cell.FromLatLng(window.map.getCenter(), 6));

  matches.forEach(function (match) {
    if (!match[1]) match[1] = currentCell.slice(0, 2);
    else match[1] = match[1].toUpperCase();

    if (!match[2]) match[2] = currentCell.slice(2, 4);

    match[3] = match[3].toUpperCase();

    var result = window.plugin.regions.getSearchResult(match);
    if (result) query.addResult(result);
  });
};

window.plugin.regions.getSearchResult = function (match) {
  var faceId = window.plugin.regions.FACE_NAMES.indexOf(match[1]);
  var id1 = parseInt(match[2]) - 1;
  var codeWordId = window.plugin.regions.CODE_WORDS.indexOf(match[3]);
  var id2 = match[4] === undefined ? undefined : parseInt(match[4]);

  if (faceId === -1 || id1 < 0 || id1 > 15 || codeWordId === -1 || id2 < 0 || id2 > 15) return;

  // for Odd faces Nia swaps id & codename
  if (faceId & 1) {
    [id1, codeWordId] = [codeWordId, id1];
  }

  // looks good. now we need the face/i/j values for this cell face is used as-is
  // id1 is the region 'i' value (first 4 bits), codeword is the 'j' value (first 4 bits)
  var cell = window.S2.S2Cell.FromFaceIJ(faceId, [id1, codeWordId], 4);

  var result = {};

  if (id2 === undefined) {
    result.description = 'Regional score cells (cluster of 16 cells)';
    result.icon = 'data:image/svg+xml;base64,' + btoa('@include_string:images/icon-cell.svg@'.replace(/orange/, 'gold'));
  } else {
    result.description = 'Regional score cell';
    result.icon = 'data:image/svg+xml;base64,' + btoa('@include_string:images/icon-cell.svg@');

    // eslint-disable-next-line no-unused-vars
    const [_, positions] = cell.getFaceAndQuads();
    positions.push(Math.floor(id2 / 4), id2 % 4);
    cell = window.S2.S2Cell.FromFacePosition(faceId, positions);
  }

  var corners = cell.getCornerLatLngs();

  result.title = window.plugin.regions.regionName(cell);
  result.layer = L.geodesicPolygon(corners, { fill: false, color: 'red', interactive: false });
  result.bounds = L.latLngBounds(corners);

  return result;
};

window.plugin.regions.update = function () {
  window.plugin.regions.regionLayer.clearLayers();

  var bounds = window.map.getBounds();

  var seenCells = {};

  var drawCellAndNeighbors = function (cell) {
    var cellStr = cell.toString();

    if (!seenCells[cellStr]) {
      // cell not visited - flag it as visited now
      seenCells[cellStr] = true;

      // is it on the screen?
      var corners = cell.getCornerLatLngs();
      var cellBounds = L.latLngBounds([corners[0], corners[1]]).extend(corners[2]).extend(corners[3]);

      if (cellBounds.intersects(bounds)) {
        // on screen - draw it
        window.plugin.regions.drawCell(cell);

        // and recurse to our neighbors
        var neighbors = cell.getNeighbors();
        for (let i = 0; i < neighbors.length; i++) {
          drawCellAndNeighbors(neighbors[i]);
        }
      }
    }
  };

  // centre cell
  var zoom = window.map.getZoom();
  if (zoom >= 5) {
    var cellSize = zoom >= 7 ? 6 : 4;
    var cell = window.S2.S2Cell.FromLatLng(window.map.getCenter(), cellSize);

    drawCellAndNeighbors(cell);
  }

  // the six cube side boundaries. we cheat by hard-coding the coords as it's simple enough
  var latLngs = [
    [45, -180],
    [35.264389682754654, -135],
    [35.264389682754654, -45],
    [35.264389682754654, 45],
    [35.264389682754654, 135],
    [45, 180],
  ];

  var globalCellOptions = { color: 'red', weight: 7, opacity: 0.5, interactive: false };

  for (let i = 0; i < latLngs.length - 1; i++) {
    // the geodesic line code can't handle a line/polyline spanning more than (or close to?) 180 degrees, so we draw
    // each segment as a separate line
    var poly1 = L.geodesicPolyline([latLngs[i], latLngs[i + 1]], globalCellOptions);
    window.plugin.regions.regionLayer.addLayer(poly1);

    // southern mirror of the above
    var poly2 = L.geodesicPolyline(
      [
        [-latLngs[i][0], latLngs[i][1]],
        [-latLngs[i + 1][0], latLngs[i + 1][1]],
      ],
      globalCellOptions
    );
    window.plugin.regions.regionLayer.addLayer(poly2);
  }

  // and the north-south lines. no need for geodesic here
  for (let i = -135; i <= 135; i += 90) {
    var poly = L.polyline(
      [
        [35.264389682754654, i],
        [-35.264389682754654, i],
      ],
      globalCellOptions
    );
    window.plugin.regions.regionLayer.addLayer(poly);
  }
};

window.plugin.regions.drawCell = function (cell) {
  // TODO: move to function - then call for all cells on screen

  // corner points
  var corners = cell.getCornerLatLngs();

  // center point
  var center = cell.getLatLng();

  // name
  var name = window.plugin.regions.regionName(cell);

  var color = cell.level === 6 ? 'gold' : 'orange';

  // the level 6 cells have noticible errors with non-geodesic lines - and the larger level 4 cells are worse
  // NOTE: we only draw two of the edges. as we draw all cells on screen, the other two edges will either be drawn
  // from the other cell, or be off screen so we don't care
  var region = L.geodesicPolyline([corners[0], corners[1], corners[2]], { fill: false, color: color, opacity: 0.5, weight: 5, interactive: false });

  window.plugin.regions.regionLayer.addLayer(region);

  // move the label if we're at a high enough zoom level and it's off screen
  if (window.map.getZoom() >= 9) {
    var namebounds = window.map.getBounds().pad(-0.1); // pad 10% inside the screen bounds
    if (!namebounds.contains(center)) {
      // name is off-screen. pull it in so it's inside the bounds
      var newlat = Math.max(Math.min(center.lat, namebounds.getNorth()), namebounds.getSouth());
      var newlng = Math.max(Math.min(center.lng, namebounds.getEast()), namebounds.getWest());

      var newpos = L.latLng(newlat, newlng);

      // ensure the new position is still within the same cell
      var newposcell = window.S2.S2Cell.FromLatLng(newpos, 6);
      if (newposcell.toString() === cell.toString()) {
        center = newpos;
      }
      // else we leave the name where it was - offscreen
    }
  }

  var marker = L.marker(center, {
    icon: new L.DivIcon({
      className: 'plugin-regions-name',
      iconAnchor: [100, 5],
      iconSize: [200, 10],
      html: name,
    }),
  });
  window.plugin.regions.regionLayer.addLayer(marker);
};

var setup = window.plugin.regions.setup;
