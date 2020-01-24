// https://github.com/Leaflet/Leaflet.draw/issues/789
// https://github.com/Leaflet/Leaflet.draw/issues/695
L.Draw.Polyline.prototype._onTouch_original = L.Draw.Polyline.prototype._onTouch; // just in case
L.Draw.Polyline.prototype._onTouch = L.Util.falseFn;

// see more fixes in window.plugin.drawTools.draw_hotfix()