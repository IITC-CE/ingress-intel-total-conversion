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
window.plugin.tidyLinks = function() {};

// const values
window.plugin.tidyLinks.MAX_PORTALS_TO_LINK = 200;
// zoom level used for projecting points between latLng and pixel coordinates. may affect precision of triangulation
window.plugin.tidyLinks.PROJECT_ZOOM = 16;

window.plugin.tidyLinks.STROKE_STYLE = {
  color: '#FF0000',
  opacity: 1,
  weight: 1.5,
  interactive: false,
  dashArray: '6,4',
  smoothFactor: 10,
};
window.plugin.tidyLinks.layer = null;
window.plugin.tidyLinks.errorMarker = null;



window.plugin.tidyLinks.addErrorMarker = function() {
  if (window.plugin.tidyLinks.errorMarker == null) {
    window.plugin.tidyLinks.errorMarker = L.marker (window.map.getCenter(), {
      icon: L.divIcon({
        className: 'tidy-links-error',
        iconSize: [300,30],
        html: 'Tidy Links: too many portals!'
      }),
      interactive: false
    });

    window.map.addLayer(window.plugin.tidyLinks.errorMarker);
  }

}

window.plugin.tidyLinks.clearErrorMarker = function() {
  if (window.plugin.tidyLinks.errorMarker != null) {
    window.map.removeLayer(window.plugin.tidyLinks.errorMarker);
    window.plugin.tidyLinks.errorMarker = null;
  }
}


window.plugin.tidyLinks.updateLayer = function() {
  if (!window.map.hasLayer(window.plugin.tidyLinks.layer))
    return;

  window.plugin.tidyLinks.layer.clearLayers();

  var locations = [];

  var bounds = map.getBounds();
  $.each(window.portals, function(guid, portal) {
    var ll = portal.getLatLng();
    if (bounds.contains(ll)) {
      var p = map.project (portal.getLatLng(), window.plugin.tidyLinks.PROJECT_ZOOM);
      locations.push(p);
      if (locations.length > window.plugin.tidyLinks.MAX_PORTALS_TO_LINK) return false; //$.each break
    }
  });

  if (locations.length > window.plugin.tidyLinks.MAX_PORTALS_TO_LINK) {
    window.plugin.tidyLinks.addErrorMarker();
    return;
  }

  var triangles = window.delaunay.triangulate(locations.map(function (p) { return [p.x,p.y] }));

  var drawnLinkCount = 0;

  var orderedPoints = function(a,b) {
    if(a.x<b.x) return [a,b];
    if(a.x==b.x && a.y<b.y) return [a,b];
    return [b,a];
  }
  var drawnLinks = {};

  //draw a link, but only if it hasn't already been drawn
  var drawLink = function(a,b) {
    //order the points, so a pair of coordinates in any order is handled in one direction only
    var points = orderedPoints(a,b);
    a=points[0];
    b=points[1];

    //do we have a line already drawn from a to b?
    if(!(a in drawnLinks)) {
      //no lines from a to anywhere yet - create an empty target array
      drawnLinks[a] = {};
    }

    if (!(b in drawnLinks[a])) {
      //no line from a to b yet

      //using drawnLinks[a] as a set - so the stored value is of no importance
      drawnLinks[a][b] = null;

      // convert back from x/y coordinates to lat/lng for drawing
      var alatlng = map.unproject (a, window.plugin.tidyLinks.PROJECT_ZOOM);
      var blatlng = map.unproject (b, window.plugin.tidyLinks.PROJECT_ZOOM);

      var poly = L.polyline([alatlng, blatlng], window.plugin.tidyLinks.STROKE_STYLE);
      poly.addTo(window.plugin.tidyLinks.layer);
      drawnLinkCount++;
    }
  }

  for (var i = 0; i<triangles.length;) {
    var a = locations[triangles[i++]],
        b = locations[triangles[i++]],
        c = locations[triangles[i++]];
    drawLink(a,b);
    drawLink(b,c);
    drawLink(c,a);
  }
}

window.plugin.tidyLinks.setup = function() {
  try { console.log('Loading delaunay JS now'); } catch(e) {}
  @@INCLUDERAW:external/delaunay.js@@
  window.delaunay = Delaunay;
  try { console.log('done loading delaunay JS'); } catch(e) {}

  window.plugin.tidyLinks.layer = L.layerGroup([]);

  window.addHook('mapDataRefreshEnd', function(e) {
    window.plugin.tidyLinks.updateLayer();
  });

  window.addHook('mapDataRefreshStart', function(e) {
    window.plugin.tidyLinks.clearErrorMarker();
  });

  window.map.on('layeradd', function(e) {
    if (e.layer === window.plugin.tidyLinks.layer)
      window.plugin.tidyLinks.updateLayer();
  });
  window.map.on('layerremove', function(e) {
    if (e.layer === window.plugin.tidyLinks.layer)
      window.plugin.tidyLinks.clearErrorMarker();
  });

  window.addLayerGroup('Tidy Links', window.plugin.tidyLinks.layer, false);

  $('head').append('<style>'+
    '.tidy-links-error { color: #F88; font-size: 20px; font-weight: bold; text-align: center; text-shadow: -1px -1px #000, 1px -1px #000, -1px 1px #000, 1px 1px #000; background-color: rgba(0,0,0,0.6); border-radius: 5px; }'+
    '</style>');


}
var setup = window.plugin.tidyLinks.setup;

// PLUGIN END //////////////////////////////////////////////////////////

@@PLUGINEND@@
