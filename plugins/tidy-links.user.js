// ==UserScript==
// @id             tidy-links@boombuler
// @name           IITC plugin: Tidy Links
// @category       Draw
// @version        0.5.0.@@DATETIMEVERSION@@
// @description    [@@BUILDNAME@@-@@BUILDDATE@@] Calculate how to link the portals to create a reasonably tidy set of links/fields. Enable from the layer chooser. (former `Max Links`)
@@METAINFO@@
// ==/UserScript==

@@PLUGINSTART@@

// PLUGIN START ////////////////////////////////////////////////////////

// use own namespace for plugin
var tidyLinks = {};
window.plugin.tidyLinks = tidyLinks;

tidyLinks.MAX_PORTALS_TO_LINK = 200; // N.B.: this limit is not about performance

// zoom level used for projecting points between latLng and pixel coordinates. may affect precision of triangulation
tidyLinks.PROJECT_ZOOM = 16;

tidyLinks.STROKE_STYLE = { // https://leafletjs.com/reference-1.4.0.html#polyline-stroke
  color: 'red',
  opacity: 1,
  weight: 1.5,
  dashArray: '6,4',
  interactive: false
};

tidyLinks.errorMarkerIconOptions = { // https://leafletjs.com/reference-1.4.0.html#divicon-html
  className: 'tidy-links-error',
  iconSize: [300,30],
  html: 'Tidy Links: too many portals!'
};

var map, errorMarker;

function updateLayer () {
  var locations = [];
  var bounds = map.getBounds();
  $.each(window.portals, function (guid, portal) {
    var ll = portal.getLatLng();
    if (bounds.contains(ll)) {
      locations.push(ll);
      return locations.length <= tidyLinks.MAX_PORTALS_TO_LINK; // $.each break
    }
  });

  if (locations.length > tidyLinks.MAX_PORTALS_TO_LINK) {
    errorMarker.setLatLng(map.getCenter()).addTo(tidyLinks.layer);
    return;
  }

  var triangles = tidyLinks.Delaunay.triangulate(locations.map(function (latlng) {
    var point = map.project(latlng, tidyLinks.PROJECT_ZOOM);
    return [point.x,point.y];
  }));

  tidyLinks.layer.clearLayers();

  var drawnLinks = {};

  // draw a link, but only if it hasn't already been drawn
  function drawLink (a,b) {
    // order the points, so a pair of coordinates in any order is handled in one direction only
    if (a>b) { b = [a, a = b][0]; } // swap

    if (!(a in drawnLinks)) { // no lines from a to anywhere yet
      drawnLinks[a] = {};
    }

    if (!(b in drawnLinks[a])) { // no line from a to b yet
      drawnLinks[a][b] = true;
      L.polyline([locations[a], locations[b]], tidyLinks.STROKE_STYLE).addTo(tidyLinks.layer);
    }
  }
  for (var i = 0; i<triangles.length;) {
    var a = triangles[i++],
        b = triangles[i++],
        c = triangles[i++];
    drawLink(a,b);
    drawLink(b,c);
    drawLink(c,a);
  }
}

function setup () {
  tidyLinks.Delaunay = loadDelaunay();

  map = window.map;
  var icon = L.divIcon(tidyLinks.errorMarkerIconOptions);
  errorMarker = L.marker([0,0], { icon: icon, interactive: false });
  tidyLinks.layer = L.layerGroup([])
    .on('add', function () {
      updateLayer();
      window.addHook('mapDataRefreshEnd', updateLayer);
    })
    .on('remove', function () {
      window.removeHook('mapDataRefreshEnd', updateLayer);
    });

  window.addLayerGroup('Tidy Links', tidyLinks.layer, false);

  $('<style>').html('\
    .tidy-links-error {\
      color: #F88;\
      font-size: 20px;\
      font-weight: bold;\
      text-align: center;\
      text-shadow: -1px -1px #000, 1px -1px #000, -1px 1px #000, 1px 1px #000;\
      background-color: rgba(0,0,0,0.6);\
      border-radius: 5px;\
    }\
  ').appendTo('head');
}

function loadDelaunay () {
  try {
    // https://github.com/ironwallaby/delaunay
    @@INCLUDERAW:external/delaunay.js@@

    return Delaunay;
  } catch (e) {
    console.error('delaunay.js loading failed');
    throw e;
  }
}

// PLUGIN END //////////////////////////////////////////////////////////

@@PLUGINEND@@
