// L.Draw extension to support L.Geodesic*

L.Draw.Polyline.include({
	Poly: L.GeodesicPolyline,

	addHooks: function () {
		L.Draw.Feature.prototype.addHooks.call(this);
		if (this._map) {
			this._markers = [];

			this._markerGroup = new L.LayerGroup();
			this._map.addLayer(this._markerGroup);

			// *** MOD ***
			// this._poly = new L.Polyline([], this.options.shapeOptions);
			this._poly = new L.GeodesicPolyline([], this.options.shapeOptions);
			// ^^^^^^^^^^^

			this._tooltip.updateContent(this._getTooltipText());

			// Make a transparent marker that will used to catch click events. These click
			// events will create the vertices. We need to do this so we can ensure that
			// we can create vertices over other map layers (markers, vector layers). We
			// also do not want to trigger any click handlers of objects we are clicking on
			// while drawing.
			if (!this._mouseMarker) {
				this._mouseMarker = L.marker(this._map.getCenter(), {
					icon: L.divIcon({
						className: 'leaflet-mouse-marker',
						iconAnchor: [20, 20],
						iconSize: [40, 40]
					}),
					opacity: 0,
					zIndexOffset: this.options.zIndexOffset
				});
			}

			this._mouseMarker
				.on('mouseout', this._onMouseOut, this)
				.on('mousemove', this._onMouseMove, this) // Necessary to prevent 0.8 stutter
				.on('mousedown', this._onMouseDown, this)
				.on('mouseup', this._onMouseUp, this) // Necessary for 0.8 compatibility
				.addTo(this._map);

			this._map
				.on('mouseup', this._onMouseUp, this) // Necessary for 0.7 compatibility
				.on('mousemove', this._onMouseMove, this)
				.on('zoomlevelschange', this._onZoomEnd, this)
				.on('touchstart', this._onTouch, this)
				.on('zoomend', this._onZoomEnd, this);

		}
	}
});

L.Draw.Polygon.prototype.Poly = L.GeodesicPolygon;

L.Draw.Circle.include({ // ?? extend to L.Draw.GeodesicCircle ??
	_drawShape: function (latlng) {
		var distance = this._map.distance(this._startLatLng, latlng);
		if (!this._shape) {
			this._shape = new L.GeodesicCircle(this._startLatLng, distance, this.options.shapeOptions);
			this._map.addLayer(this._shape);
		} else {
			this._shape.setRadius(distance);
		}
	},

	_fireCreatedEvent: function () {
		var circle = new L.GeodesicCircle(this._startLatLng, this._shape.getRadius(), this.options.shapeOptions);
		L.Draw.SimpleShape.prototype._fireCreatedEvent.call(this, circle);
	}

});

// ******* avoid direct access to L.Geodesic* private property _latlngs
L.Edit.Poly.include({
	initialize: function (poly) {

		// this.latlngs = [poly._latlngs];
		this.latlngs = [poly.getLatLngs()];
		if (poly._holes) {
			this.latlngs = this.latlngs.concat(poly._holes);
		}

		this._poly = poly;

		this._poly.on('revert-edited', this._updateLatLngs, this);
	},

	_defaultShape: function () { // support Leaflet >= 1
		var latlngs = this._poly.getLatLngs();
		return L.LineUtil.isFlat(latlngs) ? latlngs : latlngs[0];
	},

	_updateLatLngs: function (e) {
		// this.latlngs = [e.layer._latlngs];
		this.latlngs = [e.layer.getLatLngs()];
		if (e.layer._holes) {
			this.latlngs = this.latlngs.concat(e.layer._holes);
		}
	}
});

L.Edit.PolyVerticesEdit.include({
	_defaultShape: function () { // support Leaflet >= 1
		var latlngs = this._poly.getLatLngs();
		return L.LineUtil.isFlat(latlngs) ? latlngs : latlngs[0];
	},
});
// ^^^^^^

(function (_getMiddleLatLng) {
var coeff =  Math.PI/180.0 * 6367000.0 / 2.01;
L.Edit.PolyVerticesEdit.include({
	_getMiddleLatLng: function (marker1, marker2) {
		if (this._poly._geodesicConvert) {
			var start = marker1.getLatLng(), end = marker2.getLatLng();
			// todo: implement relevant function/method in L.Geodesic* instead of following hack
			var geoline = L.geodesicPolyline([start, end], {
				segmentsCoeff: (start.lng-end.lng) * coeff
			});
			if (geoline._latlngs.length > 2) {
				return geoline._latlngs[1];
			}
		}
		return _getMiddleLatLng.call(this, marker1, marker2);
	}
});
})(L.Edit.PolyVerticesEdit.prototype._getMiddleLatLng);

L.GeodesicCircle.addInitHook(function () { // todo check if this does not conflict with L.Polyline.addInitHook
	if (L.Edit.Circle) {
		this.editing = new L.Edit.Circle(this);

		if (this.options.editable) {
			this.editing.enable();
		}
	}
});

L.Edit.Circle.include({
	_getResizeMarkerPoint: function (latlng) {
		var bounds = this._shape.getBounds(); // geodesic circle stores precalculated bounds
		return L.latLng(bounds.getNorth(), latlng.lng);
	}
});

(function (_backupLayer,_revertLayer) { // GeodesicCircle has to be processed first as it is also instance of L.Polyline
L.EditToolbar.Edit.include({
	_backupLayer: function (layer) {
		var id = L.Util.stamp(layer);

		if (!this._uneditedLayerProps[id]) {
			if (layer instanceof L.GeodesicCircle) {
				this._uneditedLayerProps[id] = {
					latlng: L.LatLngUtil.cloneLatLng(layer.getLatLng()),
					radius: layer.getRadius()
				};
			} else {
				_backupLayer.call(this,layer);
			}
		}
	},

	_revertLayer: function (layer) {
		var id = L.Util.stamp(layer);
		layer.edited = false;
		if (this._uneditedLayerProps.hasOwnProperty(id)) {
			if (layer instanceof L.GeodesicCircle) {
				layer.setLatLng(this._uneditedLayerProps[id].latlng);
				layer.setRadius(this._uneditedLayerProps[id].radius);
				layer.fire('revert-edited', {layer: layer});
			} else {
				_revertLayer.call(this,layer);
			}
		}
	}
});
})(L.EditToolbar.Edit.prototype._backupLayer,L.EditToolbar.Edit.prototype._revertLayer);
