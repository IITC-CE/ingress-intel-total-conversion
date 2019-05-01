// ORNAMENTS ///////////////////////////////////////////////////////

// Added as part of the Ingress #Helios in 2014, ornaments
// are additional image overlays for portals.
// currently there are 6 known types of ornaments: ap$x$suffix
// - cluster portals (without suffix)
// - volatile portals (_v)
// - meeting points (_start)
// - finish points (_end)
//
// Beacons and Frackers were introduced at the launch of the Ingress
// ingame store on November 1st, 2015
// - Beacons (pe$TAG - $NAME) ie: 'peNIA - NIANTIC'
// - Frackers ('peFRACK')
// (there are 7 different colors for each of them)


window.ornaments = (function () {

  var ornaments = {};
  ornaments.OVERLAY_SIZE = 60;
  ornaments.OVERLAY_OPACITY = 0.6;

  ornaments.setup = function() {
    ornaments._portals = {};
    ornaments._layer = L.layerGroup();
    ornaments._beacons = L.layerGroup();
    ornaments._frackers = L.layerGroup();
    window.addLayerGroup('Ornaments', ornaments._layer, true);
    window.addLayerGroup('Beacons', ornaments._beacons, true);
    window.addLayerGroup('Frackers', ornaments._frackers, true);
  };

  // quick test for portal having ornaments
  ornaments.isInterestingPortal = function(portal) {
    return portal.options.data.ornaments.length !== 0;
  };

  ornaments.addPortal = function(portal) {
    var guid = portal.options.guid;

    ornaments.removePortal(portal);

    var size = ornaments.OVERLAY_SIZE;
    var latlng = portal.getLatLng();

    if (portal.options.data.ornaments && portal.options.data.ornaments.length) {
      ornaments._portals[guid] = portal.options.data.ornaments.map(function(ornament) {
        var layer = ornaments._layer;
        if (ornament.startsWith('pe')) {
          if (ornament === 'peFRACK') {
            layer = ornaments._frackers;
          } else {
            layer = ornaments._beacons;
          }
        }
        var icon = L.icon({
          iconUrl: '//commondatastorage.googleapis.com/ingress.com/img/map_icons/marker_images/' + ornament + '.png',
          iconSize: [size, size],
          iconAnchor: [size/2, size/2],
        });

        return L.marker(latlng, {
          icon: icon,
          interactive: false,
          keyboard: false,
          opacity: ornaments.OVERLAY_OPACITY
        }).addTo(layer);
      });
    }
  };

  ornaments.removePortal = function(portal) {
    var guid = portal.options.guid;
    if (ornaments._portals[guid]) {
      ornaments._portals[guid].forEach(function(marker) {
        ornaments._layer.removeLayer(marker);
        ornaments._beacons.removeLayer(marker);
        ornaments._frackers.removeLayer(marker);
      });
      delete ornaments._portals[guid];
    }
  };

  return ornaments;
}());
