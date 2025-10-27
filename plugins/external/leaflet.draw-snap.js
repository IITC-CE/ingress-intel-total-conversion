// L.Draw extension to support options.snapPoint

L.Draw.Polyline.include({
	_endPoint: function (clientX, clientY, e) {
		if (this._mouseDownOrigin) {
			var dragCheckDistance = new L.Point(clientX, clientY)
				.distanceTo(this._mouseDownOrigin);
			var lastPtDistance = this._calculateFinishDistance(e.latlng);
			if (this.options.maxPoints > 1 && this.options.maxPoints == this._markers.length + 1) {
				this.addVertex(e.latlng);
				this._finishShape();
			} else if (lastPtDistance < 10 && L.Browser.touch) {
				this._finishShape();
			} else if (Math.abs(dragCheckDistance) < 9 * (window.devicePixelRatio || 1)) {
				// *** MOD ***
				if (this.options.snapPoint) {
					e.latlng = this.options.snapPoint(e.latlng);
				}
				// ^^^^^^^^^^^
				this.addVertex(e.latlng);
			}
			this._enableNewMarkers(); // after a short pause, enable new markers
		}
		this._mouseDownOrigin = null;
	}
});

(function (_onClick) {
	L.Draw.Marker.include({
		_onClick: function () {
			if (this.options.snapPoint) {
				this._marker.setLatLng(this.options.snapPoint(this._marker.getLatLng()));
			}
			return _onClick.call(this);
		}
	});
})(L.Draw.Marker.prototype._onClick);
