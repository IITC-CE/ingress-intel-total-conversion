// @author         jonatkins
// @name           Distance to portal
// @category       Portal Info
// @version        0.2.0
// @description    Allows your current location to be set manually, then shows the distance to the selected portal. Useful when managing portal keys.


// use own namespace for plugin
window.plugin.distanceToPortal = function() {};

window.plugin.distanceToPortal.addDistance = function() {
  var div = $('<div>')
    .attr({
      id: 'portal-distance',
      title: 'Double-click to set/change current location',
    })
    .on('dblclick', window.plugin.distanceToPortal.setLocation);

  $('#resodetails').after(div);

  window.plugin.distanceToPortal.updateDistance();
};

window.plugin.distanceToPortal.formatDistance = function(dist) {
  if (dist >= 10000) {
    dist = Math.round(dist/1000)+'km';
  } else if (dist >= 1000) {
    dist = Math.round(dist/100)/10+'km';
  } else {
    dist = Math.round(dist)+'m';
  }

  return dist;
}


window.plugin.distanceToPortal.updateDistance = function() {
  if(!(selectedPortal && portals[selectedPortal])) return;
  var portal = portals[selectedPortal];

  var ll = portal.getLatLng();

  var text;

  if (window.plugin.distanceToPortal.currentLoc) {
    var dist = window.plugin.distanceToPortal.currentLoc.distanceTo(ll);

    dist = window.plugin.distanceToPortal.formatDistance(dist);

    var bearing = window.plugin.distanceToPortal.currentLoc.bearingTo(ll);
    var bearingWord = window.plugin.distanceToPortal.currentLoc.bearingWordTo(ll);

    $('#portal-distance')
      .text('Distance: ' + dist + ' ')
      .append($('<span>')
        .addClass('portal-distance-bearing')
        .css({
          'transform': 'rotate('+bearing+'deg)',
          '-moz-transform': 'rotate('+bearing+'deg)',
          '-webkit-transform': 'rotate('+bearing+'deg)',
        }))
      .append(document.createTextNode(' ' + zeroPad(bearing, 3) + '° ' + bearingWord));
  } else {
    $('#portal-distance').text('Location not set');
  }
};


window.plugin.distanceToPortal.setLocation = function() {
  if (window.plugin.distanceToPortal.currentLocMarker) {
    map.removeLayer(window.plugin.distanceToPortal.currentLocMarker);
    window.plugin.distanceToPortal.currentLocMarker = null;
    return;
  }


  if (!window.plugin.distanceToPortal.currentLoc) {
    window.plugin.distanceToPortal.currentLoc = map.getCenter();
  }

  window.plugin.distanceToPortal.currentLocMarker = L.marker(window.plugin.distanceToPortal.currentLoc, {
    icon: L.divIcon.coloredSvg('#444'),
    draggable: true,
    title: 'Drag to change current location'
  });

  window.plugin.distanceToPortal.currentLocMarker.on('drag', function(e) {
    window.plugin.distanceToPortal.currentLoc = window.plugin.distanceToPortal.currentLocMarker.getLatLng();

    localStorage['plugin-distance-to-portal'] = JSON.stringify({lat:window.plugin.distanceToPortal.currentLoc.lat, lng:window.plugin.distanceToPortal.currentLoc.lng});

    if (selectedPortal) window.plugin.distanceToPortal.updateDistance();
  });

  map.addLayer(window.plugin.distanceToPortal.currentLocMarker);
};

window.plugin.distanceToPortal.setupPortalsList = function() {
  window.plugin.portalslist.fields.push({
    title: "Dist",
    value: function(portal) { if (window.plugin.distanceToPortal.currentLoc) return window.plugin.distanceToPortal.currentLoc.distanceTo(portal.getLatLng()); else return 0; },
    format: function(cell, portal, dist) {
      $(cell).addClass('alignR').text(dist?window.plugin.distanceToPortal.formatDistance(dist):'-');
    }
  });
}


window.plugin.distanceToPortal.setup = function () {
  // https://github.com/gregallensworth/Leaflet/
  IITCTool.import('external/LatLng_Bearings.js');

  try {
    window.plugin.distanceToPortal.currentLoc = L.latLng(JSON.parse(localStorage['plugin-distance-to-portal']));
  } catch (e) {
    window.plugin.distanceToPortal.currentLoc = null;
  }

  window.plugin.distanceToPortal.currentLocMarker = null;

  IITCTool.importCSS('distance-to-portal.css');

  addHook('portalDetailsUpdated', window.plugin.distanceToPortal.addDistance);

  if (window.plugin.portalslist) {
    window.plugin.distanceToPortal.setupPortalsList();
  }
};

var setup =  window.plugin.distanceToPortal.setup;
