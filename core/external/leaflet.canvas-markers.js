'use strict';

function layerFactory (L) {

    function extend (Parent, props) {
        var NewClass = function () {
            if (this.init) { this.init.apply(this, arguments); }
        };
        var proto = L.Util.create(Parent.prototype);
        L.Util.extend(proto, props);
        NewClass.prototype = proto;
        return NewClass;
    }

    var Common = extend(rbush, {
        init: function () {
            rbush.apply(this, arguments);
            this._batch = [];
        },
        insert: function (item, batch) {
            if (batch) {
                this._batch.push(item);
                return this;
            }
            return rbush.prototype.insert.call(this, item);
        },
        flush: function () {
            this.load(this._batch);
            this._batch.length = 0;
            return this;
        }
    });

    var LatLngsIndex = extend(Common, {
        toBBox: function (marker) {
            var ll = marker._latlng;
            return {minX: ll.lng, minY: ll.lat, maxX: ll.lng, maxY: ll.lat};
        },
        compareMinX: function (a, b) { return a._latlng.lng - b._latlng.lng; },
        compareMinY: function (a, b) { return a._latlng.lat - b._latlng.lat; },
        searchIn: function (bounds) {
            return this.search({
                minX: bounds.getWest(),
                minY: bounds.getSouth(),
                maxX: bounds.getEast(),
                maxY: bounds.getNorth()
            });
        },
        init: function () {
            Common.prototype.init.apply(this, arguments);
            this._dirty = 0;
            this._total = 0;
        },
        // If we are 10% individual inserts\removals, reconstruct lookup for efficiency
        cleanup: function () {
            if (this._dirty / this._total >= .1) {
                var all = this.all();
                this.clear();
                this._dirty = 0;
                this.load(all);
            }
            return this;
        },
        insert: function () {
            this._dirty++;
            this._total++;
            return Common.prototype.insert.apply(this, arguments);
        },
        remove: function () {
            this._total--;
            return Common.prototype.remove.apply(this, arguments);
        },
        clear: function () {
            this._dirty = 0;
            this._total = 0;
            return rbush.prototype.clear.apply(this);
        }
    });

    var PointsIndex = extend(Common, {
        toBBox: function (marker) {
            var iconSize = marker.options.icon.options.iconSize;
            var pos = marker._point;
            var adj_x = iconSize[0] / 2;
            var adj_y = iconSize[1] / 2;
            return {
                minX: pos.x - adj_x,
                minY: pos.y - adj_y,
                maxX: pos.x + adj_x,
                maxY: pos.y + adj_y,
            };
        },
        compareMinX: function (a, b) { return a._point.x - b._point.x; },
        compareMinY: function (a, b) { return a._point.y - b._point.y; },
        searchBy: function (point) {
            return this.search({
                minX: point.x, minY: point.y, maxX: point.x, maxY: point.y
            });
        }
    });

    var CanvasIconLayer = L.Layer.extend({ // todo inherit from L.Renderer or L.Canvas

        options: L.Canvas.prototype.options,

        initialize: function (options) {
            L.Renderer.prototype.initialize.call(this, options);
            // _pointsIdx contains Points of markers currently displaying on map
            this._pointsIdx = new PointsIndex();
            // _latlngsIdx contains Lat\Long coordinates of all markers in layer.
            this._latlngsIdx = new LatLngsIndex();
        },

        onAdd: function () {
            L.Renderer.prototype.onAdd.call(this);
            L.DomUtil.toBack(this._container);
        },

        _initContainer: function () {
            L.Canvas.prototype._initContainer.call(this);
            this._hideContainer(true);
        },

        onRemove: function () {
            L.Renderer.prototype.onRemove.call(this);
        },

        _destroyContainer: function () {
            L.Canvas.prototype._destroyContainer.call(this);
            this._pointsIdx.clear();
        },

        getEvents: function () { // todo use L.Renderer.prototype.getEvents
            var events = {
                viewreset: this._reset,
                zoom: this._onZoom,
                moveend: this._update,
                click: this._onClick,
                mousemove: this._onMouseMove,
                mouseout: this._handleMouseOut
            };
            if (this._zoomAnimated) {
                events.zoomanim = this._onAnimZoom;
            }
            return events;
        },

        _onAnimZoom: function (ev) {
            L.Renderer.prototype._onAnimZoom.call(this, ev);
        },

        _onZoom: function () {
            L.Renderer.prototype._onZoom.call(this);
        },

        _updateTransform: function (center, zoom) {
            L.Renderer.prototype._updateTransform.call(this, center, zoom);
        },

        _updatePaths: L.Util.falseFn, // stub for L.Renderer onAdd/onRemove

        _update: function () {
            L.Canvas.prototype._update.call(this);
            this._draw();
        },

        _reset: function () {
            this._update();
            this._updateTransform(this._center, this._zoom);
        },

        _redraw: function () {
            L.Canvas.prototype._redraw.call(this);
        },

        _clear: function () {
            L.Canvas.prototype._clear.call(this);
        },

        _draw: function () {
            var bounds = this._redrawBounds;
            if (bounds) {
                var size = bounds.getSize();
                this._ctx.beginPath();
                this._ctx.rect(bounds.min.x, bounds.min.y, size.x, size.y);
                this._ctx.clip();
            }
            this._drawing = true;
            this._latlngsIdx.cleanup();
            var mapBounds = this._map.getBounds().pad(this.options.padding);

            // Only re-draw what we are showing on the map.
            var isEmpty = true;
            this._latlngsIdx.searchIn(mapBounds).forEach(function (marker) {
                // Readjust Point Map
                if (!marker._map) { marker._map = this._map; } // todo ??implement proper handling in (on)add*/remove*
                this._drawMarker(marker);
                this._pointsIdx.insert(marker,true);
                isEmpty = false;
            }, this);
            this._drawing = false;
            // Clear rBush & Bulk Load for performance
            this._pointsIdx.clear().flush();
            this._hideContainer(isEmpty);
        },

        _drawMarker: function (marker) {
            marker._point = this._map.latLngToLayerPoint(marker.getLatLng());
            this._imageLookup = this._imageLookup || {};

            var iconUrl = marker.options.icon.options.iconUrl;
            var queued = this._imageLookup[iconUrl];
            if (!marker.canvas_img) {
                if (queued) {
                    marker.canvas_img = queued.img;
                    if (queued.loaded) {
                        this._drawImage(marker);
                    } else {
                        queued.queue.push(marker);
                    }
                } else {
                    var img = new Image();
                    img.src = iconUrl;
                    marker.canvas_img = img;
                    queued = {
                        loaded: false,
                        img: img,
                        queue: [marker]
                    };
                    this._imageLookup[iconUrl] = queued;
                    img.onload = function () {
                        queued.loaded = true;
                        queued.queue.forEach(function (_marker) {
                            if (this.hasLayer(_marker)) {
                                this._drawImage(_marker);
                            }
                        }, this);
                    }.bind(this);
                }
            } else if (queued.loaded) { // image may be not loaded / bad url
                this._drawImage(marker);
            }
        },

        _drawImage: function (marker) {
            var options = marker.options.icon.options;
            var pos = marker._point.subtract(options.iconAnchor);
            this._ctx.drawImage(
                marker.canvas_img,
                pos.x,
                pos.y,
                options.iconSize[0],
                options.iconSize[1]
            );
        },

        _onClick: function (e) {
            var point = e.layerPoint || this._map.mouseEventToLayerPoint(e), clickedLayer;

            var layer_intersect = this._pointsIdx && this._pointsIdx.searchBy(point);
            if (layer_intersect) {
                layer_intersect.forEach(function (layer) {
                    if (layer.options.interactive && !this._map._draggableMoved(layer)) {
                        clickedLayer = layer;
                    }
                }, this);
            }
            if (clickedLayer) {
                L.DomEvent.fakeStop(e);
                this._fireEvent([clickedLayer], e);
            }
        },

        _onMouseMove: function (e) {
            if (!this._map || this._map.dragging.moving() || this._map._animatingZoom) { return; }

            var point = e.layerPoint || this._map.mouseEventToLayerPoint(e);
            this._handleMouseHover(e, point);
        },

        _handleMouseHover: function (e, point) {
            if (this._mouseHoverThrottled) {
                return;
            }
            var candidateHoveredLayer;
            var layer_intersect = this._pointsIdx && this._pointsIdx.searchBy(point);
            if (layer_intersect) {
                layer_intersect.forEach(function (layer) {
                    if (layer.options.interactive) {
                        candidateHoveredLayer = layer;
                    }
                }, this);
            }

            if (candidateHoveredLayer !== this._hoveredLayer) {
                this._handleMouseOut(e);

                if (candidateHoveredLayer) {
                    L.DomUtil.addClass(this._container, 'leaflet-interactive'); // change cursor
                    this._fireEvent([candidateHoveredLayer], e, 'mouseover');
                    this._hoveredLayer = candidateHoveredLayer;
                }
            }

            if (this._hoveredLayer) {
                this._fireEvent([this._hoveredLayer], e);
            }

            this._mouseHoverThrottled = true;
            setTimeout(L.bind(function () {
                this._mouseHoverThrottled = false;
            }, this), 32);
        },

        _handleMouseOut: function (e) {
            L.Canvas.prototype._handleMouseOut.call(this,e);
        },

        _fireEvent: function (layers, e, type) {
            if (e.layerPoint) {
                layers[0].fire(type || e.type, e, true);
                return;
            }
            L.Canvas.prototype._fireEvent.call(this, layers, e, type);
        },

        _addMarker: function (marker, latlng, isDisplaying, batch) {
            if (!(marker instanceof L.Marker)) {
                throw new Error("Layer isn't a marker");
            }
            marker._map = this._map; // Needed for pop-up & tooltip to work
            L.Util.stamp(marker);
            marker.addEventParent(this);

            if (isDisplaying) {
                this._drawMarker(marker);
                this._pointsIdx.insert(marker, batch);
                this._hideContainer(false);
            }
            this._latlngsIdx.insert(marker, batch);
        },

        // Adds single layer at a time. Less efficient for rBush
        addMarker: function (marker, groupID) {
            groupID = groupID ? groupID.toString() : '0';
            this._groupIDs = this._groupIDs || {};

            var latlng = marker.getLatLng();
            var isDisplaying = this._map && this._map.getBounds().pad(this.options.padding).contains(latlng);
            this._addMarker(marker, latlng, isDisplaying);
            this._groupIDs[groupID] = (this._groupIDs[groupID] || 0) + 1;
            marker._canvasGroupID = groupID;
            return this;
        },

        addLayer: function (layer, groupID) {
            return this.addMarker(layer,groupID);
        },

        // Multiple layers at a time for rBush performance
        addMarkers: function (markers, groupID) {
            groupID = groupID ? groupID.toString() : '0';
            this._groupIDs = this._groupIDs || {};
            this._groupIDs[groupID] = this._groupIDs[groupID] || 0;

            var mapBounds = this._map && this._map.getBounds().pad(this.options.padding);
            markers.forEach(function (marker) {
                var latlng = marker.getLatLng();
                var isDisplaying = mapBounds && mapBounds.contains(latlng);
                this._addMarker(marker, latlng, isDisplaying, true);
                this._groupIDs[groupID]++;
                marker._canvasGroupID = groupID;
            }, this);
            this._pointsIdx.flush();
            this._latlngsIdx.flush();
            return this;
        },

        addLayers: function (layers, groupID) {
            return this.addMarkers(layers,groupID);
        },

        removeGroups: function (groupIDs) {
            groupIDs.forEach(function (groupID) {
                this._removeGroup(groupID);
            }, this);
            this._redraw();
            return this;
        },

        removeGroup: function (groupID) {
            this._removeGroup(groupID);
            this._redraw();
            return this;
        },

        _removeGroup: function (groupID) {
            groupID = groupID.toString();
            if (!this._groupIDs[groupID]) { return; }
            delete this._groupIDs[groupID];
            this._latlngsIdx.all().filter(function (marker) {
                return marker._canvasGroupID === groupID;
            }).forEach(function (el) {
                this.removeMarker(el, false, true);
            }, this);
        },

        removeMarker: function (marker, redraw, hasLayer) {
            if (!hasLayer && !this.hasLayer(marker)) { return; }
            this._latlngsIdx.remove(marker);

            if (redraw && this._map &&
                  this._map.getBounds().pad(this.options.padding).contains(marker.getLatLng())) {
                this._redraw();
            }
            marker.removeEventParent(this);
            return this;
        },

        removeLayer: function (layer) {
            return this.removeMarker(layer, true);
        },
        /*
        removeLayers: function (layers) {
            layers.forEach(function (el) {
                this.removeMarker(el, false);
            }, this);
            this._redraw();
            return this;
        },
        */
        clearLayers: function () {
            this._latlngsIdx.clear();
            this._pointsIdx.clear();
            this._clear();
            return this;
        },

        hasLayer: function (layer) {
            // return this._latlngsIdx.all().indexOf(layer) !== -1;
            return layer._eventParents[L.Util.stamp(this)]; // !! to cut corners
        },

        _hideContainer: function (hide) {
            if (this._isEmpty === hide) { return; }
            this._isEmpty = hide;
            this._container.style.display = hide ? 'none' : 'initial';
        }
    });

    L.canvasIconLayer = function (options) {
        return new CanvasIconLayer(options);
    };

    return CanvasIconLayer;
}

module.exports = layerFactory;
