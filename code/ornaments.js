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


window.ornaments = {

  OVERLAY_SIZE: 60,
  OVERLAY_OPACITY: 0.6,

  setup: function () {
    this._portals = {};
    this._layer = L.layerGroup();
    this._beacons = L.layerGroup();
    this._frackers = L.layerGroup();
    window.addLayerGroup('Ornaments', this._layer, true);
    window.addLayerGroup('Beacons', this._beacons, true);
    window.addLayerGroup('Frackers', this._frackers, true);
  },

  addPortal: function (portal) {
    var guid = portal.options.guid;

    this.removePortal(portal);

    var size = this.OVERLAY_SIZE;
    var latlng = portal.getLatLng();

    if (portal.options.data.ornaments && portal.options.data.ornaments.length) {
      this._portals[guid] = portal.options.data.ornaments.map(function (ornament) {
        var layer = this._layer;
        if (ornament.startsWith('pe')) {
          if (ornament === 'peFRACK') {
            layer = this._frackers;
          } else {
            layer = this._beacons;
          }
        }
        var icon = L.icon({
          iconUrl: '//commondatastorage.googleapis.com/ingress.com/img/map_icons/marker_images/' + ornament + '.png',
          iconSize: [size, size],
          iconAnchor: [size/2, size/2]
        });

        return L.marker(latlng, {
          icon: icon,
          interactive: false,
          keyboard: false,
          opacity: this.OVERLAY_OPACITY
        }).addTo(layer);
      }, this);
    }
  },

  removePortal: function (portal) {
    var guid = portal.options.guid;
    if (this._portals[guid]) {
      this._portals[guid].forEach(function (marker) {
        this._layer.removeLayer(marker);
        this._beacons.removeLayer(marker);
        this._frackers.removeLayer(marker);
      }, this);
      delete this._portals[guid];
    }
  }
};
