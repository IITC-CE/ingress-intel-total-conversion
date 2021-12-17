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
    var layerGroup = L.layerGroup;
    if (window.map.options.preferCanvas && L.Browser.canvas && !window.DISABLE_CANVASICONLAYER) {
      layerGroup = L.canvasIconLayer;
      L.CanvasIconLayer.mergeOptions({ padding: L.Canvas.prototype.options.padding });
    }
    this._layer = layerGroup();
    this._beacons = layerGroup();
    this._frackers = layerGroup();
    window.layerChooser.addOverlay(this._layer, 'Ornaments');
    window.layerChooser.addOverlay(this._beacons, 'Beacons');
    window.layerChooser.addOverlay(this._frackers, 'Frackers');
  },

  addPortal: function (portal) {
    this.removePortal(portal);

    var ornaments = portal.options.data.ornaments;
    if (ornaments && ornaments.length) {
      this._portals[portal.options.guid] = ornaments.map(function (ornament) {
        var layer = this._layer;
        if (ornament.startsWith('pe')) {
          layer = ornament === 'peFRACK'
            ? this._frackers
            : this._beacons;
        }
        var size = this.OVERLAY_SIZE;
        return L.marker(portal.getLatLng(), {
          icon: L.icon({
            iconUrl: '//commondatastorage.googleapis.com/ingress.com/img/map_icons/marker_images/' + ornament + '.png',
            iconSize: [size, size],
            iconAnchor: [size/2, size/2] // https://github.com/IITC-CE/Leaflet.Canvas-Markers/issues/4
          }),
          interactive: false,
          keyboard: false,
          opacity: this.OVERLAY_OPACITY,
          layer: layer
        }).addTo(layer);
      }, this);
    }
  },

  removePortal: function (portal) {
    var guid = portal.options.guid;
    if (this._portals[guid]) {
      this._portals[guid].forEach(function (marker) {
        marker.options.layer.removeLayer(marker);
      });
      delete this._portals[guid];
    }
  }
};
