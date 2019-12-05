// https://github.com/IITC-CE/ingress-intel-total-conversion/pull/175
// https://github.com/Leaflet/Leaflet.draw/issues/922

(function (addHooks,removeHooks) {
L.Draw.SimpleShape.include({
  addHooks: function () {
    addHooks.call(this);
    if (this._map) {
      document.removeEventListener('touchstart', L.DomEvent.preventDefault);
      this._map.getPanes().mapPane.addEventListener('touchstart', L.DomEvent.preventDefault, {passive: false});
    }
  },
  removeHooks: function () {
    removeHooks.call(this);
    if (this._map) {
      this._map.getPanes().mapPane.removeEventListener('touchstart', L.DomEvent.preventDefault);
    }
  }
});
})(L.Draw.SimpleShape.prototype.addHooks,L.Draw.SimpleShape.prototype.removeHooks);
