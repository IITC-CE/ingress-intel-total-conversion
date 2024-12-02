// ==UserScript==
// @author         DanielOnDiordna
// @id             imageOverlay@DanielOnDiordna
// @name           imageOverlay
// @category       Layer
// @version        0.0.1.20210724.002500
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/imageOverlay.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/imageOverlay.user.js
// @description    [danielondiordna-0.0.1.20210724.002500] Place an image on the map, to help draw field art
// @namespace      https://softspot.nl/ingress/
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // PLUGIN START ////////////////////////////////////////////////////////

    // use own namespace for plugin
    window.plugin.imageOverlay = function() {};
	var self = window.plugin.imageOverlay;
    self.id = 'imageOverlay';
    self.title = 'imageOverlay';
    self.version = '0.0.1.20210724.002500';
    self.author = 'DanielOnDiordna';
	self.changelog = `
Changelog:

version 0.0.1.20180218.214700
- first version

version 0.0.1.20210421.190200
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin

version 0.0.1.20210724.002500
- prevent double plugin setup on hook iitcLoaded
`;
	self.namespace = 'window.plugin.' + self.id + '.';

    self.localstoragesettings = 'plugin-imageOverlay-settings';
    self.overlayname = 'Image Overlay';
    self.settings = {};
    self.settings.imageURL = '';
    self.settings.corners = undefined;
    self.settings.aspectratio = 0.0;
    self.settings.edit = false;
    self.settings.editmodus = 'resize';
    self.settings.keepaspectratio = false;
    self.settings.opacity = 0.7;
    self.settings.transparancy = false;
    self.settings.outlinestyle = '1px solid red';
    self.settings.outline = false;
    self.drawlayer = undefined;
    self.imagelayer = undefined;

    self.restoresettings = function(data) {
        if (typeof data !== 'string') return false;
        var settings = JSON.parse(data);
        if (typeof settings !== 'object' || !(settings instanceof Object)) return false;

        if (typeof settings.imageURL === 'string') self.settings.imageURL = settings.imageURL;
        if (typeof settings.aspectratio === 'number') self.settings.aspectratio = settings.aspectratio;
        if (typeof settings.corners === 'object' && settings.corners instanceof Array) self.settings.corners = self.parsecorners(settings.corners);
        if (typeof settings.edit === 'boolean') self.settings.edit = settings.edit;
        if (typeof settings.editmodus === 'string') self.settings.editmodus = settings.editmodus;
        if (typeof settings.keepaspectratio === 'boolean') self.settings.keepaspectratio = settings.keepaspectratio;
        if (typeof settings.opacity === 'number') self.settings.opacity = settings.opacity;
        if (typeof settings.transparancy === 'boolean') self.settings.transparancy = settings.transparancy;
        if (typeof settings.outlinestyle === 'string') self.settings.outlinestyle = settings.outlinestyle;
        if (typeof settings.outline === 'boolean') self.settings.outline = settings.outline;
    };

    self.storesettings = function() {
        var settings = {};
        settings.imageURL = self.settings.imageURL;
        settings.aspectratio = self.settings.aspectratio;
        settings.corners = self.settings.corners;
        settings.edit = self.settings.edit;
        settings.editmodus = self.settings.editmodus;
        settings.keepaspectratio = self.settings.keepaspectratio;
        settings.opacity = self.settings.opacity;
        settings.transparancy = self.settings.transparancy;
        settings.outlinestyle = self.settings.outlinestyle;
        settings.outline = self.settings.outline;
        localStorage[self.localstoragesettings] = JSON.stringify(settings);
    };

    self.parsecorners = function(corners) {
        // corners is an array of 4 objects with lat lng elements
        if (typeof corners === 'object' && corners instanceof Array) {
            var cnt;
            for (cnt = 0; cnt < corners.length; cnt++) {
                if (typeof corners[cnt] === 'object' && corners[cnt] instanceof Object) {
                    corners[cnt] = new L.LatLng(corners[cnt].lat,corners[cnt].lng);
                }
            }
        }
        return corners;
    };

    self.storecorners = function() {
        if (self.imagelayer instanceof Object) {
            self.settings.corners = self.imagelayer.getCorners();
        } else {
            self.settings.corners = undefined;
        }
        self.storesettings();
    };

    self.getaspectratio = function() {
        if (self.imagelayer instanceof Object) {
            var corners = self.imagelayer.getCorners();
            if (corners[0].lat === corners[1].lat && corners[0].lng === corners[2].lng && corners[3].lat === corners[2].lat && corners[3].lng === corners[1].lng) {
                // corners are 'straight'
                var width = corners[1].lng - corners[0].lng;
                var height = corners[0].lat - corners[2].lat;
                return width/height;
            }
        }
        return 0.0;
    };

    self.showimage = function() {
        if (self.imagelayer) {
            if (self.settings.edit) {
                self.imagelayer.bringToFront();
            } else {
                self.imagelayer.bringToBack();
            }
            return;
        }

        var imageUrl = self.settings.imageURL;
        if (!imageUrl) return;

        var options = {};
        if (self.settings.corners) {
            options.corners = self.settings.corners;
        }
        self.imagelayer = new L.DistortableImageOverlay(
            imageUrl, options
        ).addTo(self.drawlayer).bringToBack();

        L.DomEvent.on(self.imagelayer._image, 'load', function() { self.settings.aspectratio = self.getaspectratio(); self.storecorners(); self.imagelayer.editing.enable(); self.editmodus(); self.applyoutline(); self.applytransparancy(); }, self.imagelayer.editing);
    };

    self.removeimage = function() {
        self.drawlayer.removeLayer(self.imagelayer);
        self.imagelayer = undefined;
        self.settings.corners = undefined;
    };

    self.editmodus = function() {
        if (!self.imagelayer && self.settings.edit) {
            self.settings.edit = false;
            self.storesettings();
        }

        if (self.settings.edit) {
            $("input#imageOverlayEdittoggle").prop("checked",true);
            if (self.imagelayer.editing._mode === 'lock') self.imagelayer.editing._toggleLock(); // unlock
            if (!self.drawlayeractive()) self.enableLayer(self.overlayname); // make layer visible
            self.imagelayer.bringToFront();
            $("input#imageOverlayResizetoggle").removeAttr("disabled");
            $("input#imageOverlayDistorttoggle").removeAttr("disabled");
            $("input#imageOverlayRotatetoggle").removeAttr("disabled");
            self.applyrotatemodus();
        } else {
            $("input#imageOverlayEdittoggle").prop("checked",false);
            if (self.imagelayer) {
                if (self.imagelayer.editing._mode !== 'lock') self.imagelayer.editing._toggleLock(); // lock
                if (self.drawlayeractive()) self.imagelayer.bringToBack();
            }
            $("input#imageOverlayResizetoggle").attr("disabled", true);
            $("input#imageOverlayDistorttoggle").attr("disabled", true);
            $("input#imageOverlayRotatetoggle").attr("disabled", true);
        }
    };

    self.applyrotatemodus = function() {
        if (!self.imagelayer) return;
        if (!self.settings.edit) return;

        if (self.settings.editmodus === 'rotate') {
            // enable rotate:
            if (self.imagelayer.editing._mode === 'distort') self.imagelayer.editing._toggleRotateDistort(); // enable rotate
        } else {
            // disable rotate:
            if (self.imagelayer.editing._mode === 'rotate') self.imagelayer.editing._toggleRotateDistort(); // disable rotate
        }
    };

    self.applytransparancy = function() {
        if (!self.imagelayer) return;
        var opacity = self.settings.transparancy ? self.settings.opacity : 1;

        //L.DomUtil.setOpacity(self.imagelayer, opacity);
        self.imagelayer.setOpacity(opacity);
    };

    self.applyoutline = function() {
        if (!self.imagelayer) return;

        if (self.settings.outline) {
            self.imagelayer.editing._overlay._image.style.outline = self.settings.outlinestyle;
        } else {
            self.imagelayer.editing._overlay._image.style.outline = 'none';
        }
    };
    self.copydata = function() {
        if (typeof android !== 'undefined' && android && android.shareString) {
            android.shareString(localStorage[self.localstoragesettings]);
            return;
        }

        var data = JSON.parse(localStorage[self.localstoragesettings]);
        var html = '<p><a onclick="$(\'.ui-dialog-imageOverlay-export textarea\').select();">Select all</a> and press CTRL+C to copy it.</p>' +
            '<textarea readonly onclick="$(\'.ui-dialog-imageOverlay-export textarea\').select();">' + JSON.stringify(data) + '</textarea>';
        window.plugin.quickdrawlinks.dialogobject = window.dialog({
            html: html,
            id: 'ui-dialog-imageOverlay-export-data',
            width: 600,
            dialogClass: 'ui-dialog-imageOverlay-export',
            title: 'Image Overlay Copy'
        });
    };

    self.pastedata = function() {
        if (!confirm('Are you sure you want to replace all data?')) return;

        var promptAction = prompt('Press CTRL+V to paste (replace ' + self.overlayname + ' data).', '');
        if (promptAction === null || promptAction === '') return;
        try {
            var data = JSON.parse(promptAction); // test for JSON parse data
            if (self.restoresettings(promptAction)) { // restore plain input data
                self.removeimage();
                self.storesettings();
            }
            if (self.drawlayeractive()) self.showimage();
            alert('Import Successful.');
        } catch(e) {
            alert('Import failed');
        }
    };

    self.menu = function() {
        var html = '<div class="imageOverlaymenu">' +
            '<a href="#" onclick="var newurl = prompt(\'Image URL:\',' + self.namespace + 'settings.imageURL); if (newurl === null || newurl === ' + self.namespace + 'settings.imageURL) return false; ' + self.namespace + 'settings.imageURL = newurl; $(\'#imageOverlayURL\').text(newurl); ' + self.namespace + 'settings.corners = undefined; ' + self.namespace + 'showimage(); ' + self.namespace + 'storesettings(); return false;">Input Image URL</a>' +
            '<span id="imageOverlayURL">' + self.settings.imageURL + '</span><br />' +
            '<input type="checkbox" id="imageOverlayEdittoggle" onclick="' + self.namespace + 'settings.edit = this.checked; ' + self.namespace + 'editmodus(); ' + self.namespace + 'storesettings();"' + (self.settings.edit?' checked':'') + '><label for="imageOverlayEdittoggle">Edit image</label><br />' +
            '<input type="radio" name="imageOverlayEditradio" id="imageOverlayResizetoggle" onclick="' + self.namespace + 'settings.editmodus = \'resize\'; ' + self.namespace + 'applyrotatemodus(); ' + self.namespace + 'storesettings();"' + (self.settings.editmodus === 'resize'?' checked':'') + (!self.settings.edit?' disabled':'') + '><label for="imageOverlayResizetoggle">Resize</label>' +
            '<input type="radio" name="imageOverlayEditradio" id="imageOverlayDistorttoggle" onclick="' + self.namespace + 'settings.editmodus = \'distort\'; ' + self.namespace + 'applyrotatemodus(); ' + self.namespace + 'storesettings();"' + (self.settings.editmodus === 'distort'?' checked':'') + (!self.settings.edit?' disabled':'') + '><label for="imageOverlayDistorttoggle">Distort</label>' +
            '<input type="radio" name="imageOverlayEditradio" id="imageOverlayRotatetoggle" onclick="' + self.namespace + 'settings.editmodus = \'rotate\'; ' + self.namespace + 'applyrotatemodus(); ' + self.namespace + 'storesettings();"' + (self.settings.editmodus === 'rotate'?' checked':'') + (!self.settings.edit?' disabled':'') + '><label for="imageOverlayRotatetoggle">Rotate/Resize</label><br />' +
            '<input type="checkbox" id="imageOverlaykeepaspectratiotoggle" onclick="' + self.namespace + 'settings.keepaspectratio = this.checked; ' + self.namespace + 'storesettings();"' + (self.settings.keepaspectratio?' checked':'') + '><label for="imageOverlaykeepaspectratiotoggle">Keep aspect ratio</label>' +
            '<input type="checkbox" id="imageOverlayTransparancytoggle" onclick="' + self.namespace + 'settings.transparancy = this.checked; ' + self.namespace + 'applytransparancy(); ' + self.namespace + 'storesettings();"' + (self.settings.transparancy?' checked':'') + '><label for="imageOverlayTransparancytoggle">Transparancy</label>' +
            '<input type="checkbox" id="imageOverlayOutlinetoggle" onclick="' + self.namespace + 'settings.outline = this.checked; ' + self.namespace + 'applyoutline(); ' + self.namespace + 'storesettings();"' + (self.settings.outline?' checked':'') + '><label for="imageOverlayOutlinetoggle">Outline</label>' +
            '<a href="#" onclick="' + self.namespace + 'copydata(); return false;">Export data (copy)</a>' +
            '<a href="#" onclick="' + self.namespace + 'pastedata(); return false;">Import data (paste)</a>' +
            '<a href="#" onclick="if (!confirm(\'Are you sure you want to delete the image?\')) return false; ' + self.namespace + 'settings.imageURL = \'\'; $(\'#imageOverlayURL\').text(\'\'); ' + self.namespace + 'removeimage(); ' + self.namespace + 'storesettings(); return false;">Delete image</a>' +
            '</div>';

        self.dialogobject = window.dialog({
            html: html,
            id: 'plugin-imageOverlay-menu',
            dialogClass: 'ui-dialog-imageOverlay',
            title: self.overlayname
        });
    };

    self.setupleafletdistortion = function() {
        $('head').append(
            '<style>' +
            '#imgcontainer { position:relative; width: 100%; height: 100%; overflow: clip; } #imgdistort { position: absolute; top: 0px; left: 0px; transform-origin: 0 0; -webkit-transform-origin: 0 0; -moz-transform-origin: 0 0; -o-transform-origin: 0 0; } .corner { position: absolute; top: -10px; left: -10px; } #inputimage { position:absolute; top:-100px; } .leaflet-pane .leaflet-overlay-pane img { pointer-events: all !important; }' +
            '</style>');

        // source https://github.com/publiclab/Leaflet.DistortableImage

        L.DomUtil = L.extend(L.DomUtil, {
            getMatrixString: function(m) {
                var is3d = L.Browser.webkit3d || L.Browser.gecko3d || L.Browser.ie3d
                ,
                    /*
		     * Since matrix3d takes a 4*4 matrix, we add in an empty row and column, which act as the identity on the z-axis.
		     * See:
		     *     http://franklinta.com/2014/09/08/computing-css-matrix3d-transforms/
		     *     https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function#M.C3.B6bius'_homogeneous_coordinates_in_projective_geometry
		     */
                    matrix = [m[0], m[3], 0, m[6], m[1], m[4], 0, m[7], 0, 0, 1, 0, m[2], m[5], 0, m[8]]
                ,
                    str = is3d ? 'matrix3d(' + matrix.join(',') + ')' : '';

                if (!is3d) {
                    console.log('Your browser must support 3D CSS transforms in order to use DistortableImageOverlay.');
                }

                return str;
            },

            getRotateString: function(angle, units) {
                var is3d = L.Browser.webkit3d || L.Browser.gecko3d || L.Browser.ie3d
                , open = 'rotate' + (is3d ? '3d' : '') + '('
                , rotateString = (is3d ? '0, 0, 1, ' : '') + angle + units;

                return open + rotateString + ')';
            }
        });

        L.Map.include({
            _newLayerPointToLatLng: function(point, newZoom, newCenter) {
                var topLeft = L.Map.prototype._getNewTopLeftPoint.call(this, newCenter, newZoom).add(L.Map.prototype._getMapPanePos.call(this));
                return this.unproject(point.add(topLeft), newZoom);
            }
        });
        L.MatrixUtil = {

            // Compute the adjugate of m
            adj: function(m) {
                return [m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4], m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5], m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3]];
            },

            // multiply two 3*3 matrices
            multmm: function(a, b) {
                var c = [], i;

                for (i = 0; i < 3; i++) {
                    for (var j = 0; j < 3; j++) {
                        var cij = 0;
                        for (var k = 0; k < 3; k++) {
                            cij += a[3 * i + k] * b[3 * k + j];
                        }
                        c[3 * i + j] = cij;
                    }
                }
                return c;
            },

            // multiply a 3*3 matrix and a 3-vector
            multmv: function(m, v) {
                return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
            },

            // multiply a scalar and a 3*3 matrix
            multsm: function(s, m) {
                var matrix = [];

                for (var i = 0, l = m.length; i < l; i++) {
                    matrix.push(s * m[i]);
                }

                return matrix;
            },

            basisToPoints: function(x1, y1, x2, y2, x3, y3, x4, y4) {
                var m = [x1, x2, x3, y1, y2, y3, 1, 1, 1]
                , v = L.MatrixUtil.multmv(L.MatrixUtil.adj(m), [x4, y4, 1]);

                return L.MatrixUtil.multmm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
            },

            project: function(m, x, y) {
                var v = L.MatrixUtil.multmv(m, [x, y, 1]);
                return [v[0] / v[2], v[1] / v[2]];
            },

            general2DProjection: function(x1s, y1s, x1d, y1d, x2s, y2s, x2d, y2d, x3s, y3s, x3d, y3d, x4s, y4s, x4d, y4d) {
                var s = L.MatrixUtil.basisToPoints(x1s, y1s, x2s, y2s, x3s, y3s, x4s, y4s)
                , d = L.MatrixUtil.basisToPoints(x1d, y1d, x2d, y2d, x3d, y3d, x4d, y4d)
                , m = L.MatrixUtil.multmm(d, L.MatrixUtil.adj(s));

                /*
		 *	Normalize to the unique matrix with m[8] == 1.
		 * 	See: http://franklinta.com/2014/09/08/computing-css-matrix3d-transforms/
		 */
                return L.MatrixUtil.multsm(1 / m[8], m);
            }
        };
        L.EditHandle = L.Marker.extend({
            initialize: function(overlay, corner, options) {
                var markerOptions, latlng = overlay._corners[corner];

                L.setOptions(this, options);

                this._handled = overlay;
                this._corner = corner;

                markerOptions = {
                    draggable: true,
                    zIndexOffset: 10
                };

                if (options && options.hasOwnProperty('draggable')) {
                    markerOptions.draggable = options.draggable;
                }

                L.Marker.prototype.initialize.call(this, latlng, markerOptions);
            },

            onAdd: function(map) {
                L.Marker.prototype.onAdd.call(this, map);
                this._bindListeners();

                this.updateHandle();
            },

            onRemove: function(map) {
                this._unbindListeners();
                L.Marker.prototype.onRemove.call(this, map);
            },

            _onHandleDragStart: function() {
                this._handled.fire('editstart');
            },

            _onHandleDragEnd: function() {
                this._fireEdit();
            },

            _fireEdit: function() {
                this._handled.edited = true;
                this._handled.fire('edit');
                self.storecorners();
            },

            _bindListeners: function() {
                this.on({
                    'dragstart': this._onHandleDragStart,
                    'drag': this._onHandleDrag,
                    'dragend': this._onHandleDragEnd
                }, this);

                this._handled._map.on('zoomend', this.updateHandle, this);

                this._handled.on('update', this.updateHandle, this);
            },

            _unbindListeners: function() {
                this.off({
                    'dragstart': this._onHandleDragStart,
                    'drag': this._onHandleDrag,
                    'dragend': this._onHandleDragEnd
                }, this);

                this._handled._map.off('zoomend', this.updateHandle, this);
                this._handled.off('update', this.updateHandle, this);
            }
        });

        L.LockHandle = L.EditHandle.extend({
            options: {
                TYPE: 'lock',
                icon: new L.Icon({
                    iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA3ElEQVR4nM3TMU4CQRSH8d8qJ6AgFia2xksYkj0AhVa2JhRGbfEENJyA3oIjUHkFG42tHUE08QAGC8YwjG8LQsOrdnfm+/Y/7+1WdV3bpQ52ogPBJW6CfUcY4aRcaGXX1xijwjEeMvgJp7jAOd6jBKMEwwDDApYS3DYdoY+f7H6AlwyGt/SiUDDBVSFpF3AXsybBn+TO//qK4EjQEU+hjfvg+YagY9Wws2ijdWMbBdMCfk1pysZuJMy/g48C7mKOTzziEEssmhL0UornDGY9nW+rUU9yQbV3P9PW9QuPNylUonujQAAAAABJRU5ErkJggg%3D%3D',
                    iconSize: [0, 0],
                    iconAnchor: [0, 0]
                })
            },

            /* cannot be dragged */
            _onHandleDrag: function() {},

            updateHandle: function() {
                this.setLatLng(this._handled._corners[this._corner]);
            }

        });

        L.DistortHandle = L.EditHandle.extend({
            options: {
                TYPE: 'distort',
                icon: new L.Icon({
                    iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABH0lEQVR4nKXTvy5EURDH8c8V/SJBr9HzBFiN/7wAzWolIoqloCBRiJ7GvoBd/0IhnsB6hO0pWE+wintOcnKzZMUkN5Mzmd/3zNyZk5XLZf+xvi6xUeyjiU984AVVDBeT+wvnZVxioBCfDN8O1nHbrYIl1IP4HjMYxBBm8RDO11gsAkZQQ4Y9LOAZ7dDGE+ZwEHJqsZ0IqISb73Bc7DOxQzyGSiopYC34s1/E0U5TTQSMBf/aA6CZaiIgC77TAyDmZCmgFfxED4CY00oB9eC3egBsp5oIOMeXfJF2fxFXMS8f70UKeJNvWAcnaGAKJfl4p+XbdxRyNoJGVnhMK/JVLv1QQTtcdBMDxbfQwDg2sSofVUf+w65C2e+poFjBn+0bdEY280EXr3wAAAAASUVORK5CYII%3D',
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                })
            },

            updateHandle: function() {
                this.setLatLng(this._handled._corners[this._corner]);
            },

            _onHandleDrag: function() {
                this._handled._updateCorner(this._corner, this.getLatLng());

                if (self.settings.editmodus === 'resize') {
                    var corners = self.imagelayer.getCorners();
                    // 0 1
                    // 2 3
                    switch (this._corner) {
                        case 0:
                            // set corner 1 lat = corner 0 lat (y)
                            // set corner 2 lng = corner 0 lng (x)
                            corners[1].lat = corners[0].lat;
                            this._handled._updateCorner(1, corners[1]);
                            corners[2].lng = corners[0].lng;
                            this._handled._updateCorner(2, corners[2]);
                            break;
                        case 1:
                            if (self.settings.keepaspectratio && self.settings.aspectratio) {
                                console.log('FIX corner 1 lat');
                                //corners[1].lat = corners[0].lng / self.settings.aspectratio;
                                //this._handled._updateCorner(1, corners[1]);
                            }
                            // set corner 0 lat = corner 1 lat (y)
                            // set corner 3 lng = corner 1 lng (x)
                            corners[0].lat = corners[1].lat;
                            this._handled._updateCorner(0, corners[0]);
                            corners[3].lng = corners[1].lng;
                            this._handled._updateCorner(3, corners[3]);
                            break;
                        case 2:
                            // set corner 3 lat = corner 2 lat (y)
                            // set corner 0 lng = corner 2 lng (x)
                            corners[3].lat = corners[2].lat;
                            this._handled._updateCorner(3, corners[3]);
                            corners[0].lng = corners[2].lng;
                            this._handled._updateCorner(0, corners[0]);
                            break;
                        case 3:
                            // set corner 2 lat = corner 3 lat (y)
                            // set corner 1 lng = corner 3 lng (x)
                            corners[2].lat = corners[3].lat;
                            this._handled._updateCorner(2, corners[2]);
                            corners[1].lng = corners[3].lng;
                            this._handled._updateCorner(1, corners[1]);
                            break;
                    }
                }
                this._handled.fire('update');
            }
        });

        L.RotateHandle = L.EditHandle.extend({
            options: {
                TYPE: 'rotate',
                icon: new L.Icon({
                    iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABG0lEQVR4nKXSvS5EURTF8d8V/SBBr9F7A4zGNy9AQytRKIaCgkQhehrzAmZ8hUI8wYxHmJ7CjCcYxT0nublmJlecZueerPXf69y9k0a57D9nqMfdJI7QRBtfaKCC8bw4ySVYww1G+jRsYwsPvRKsohbMT5jHKMawgOfwfYeVPGACVSQ4xDLe0AldX7GI46CpxudEwE7o/IizPvHhBC8hyU4WsBnq5QBzPBdZTwRMhfpeANDMeiIgCbVbABA1SRbQCnWmACBqWllALdS9AoD9rCcCrvAtXaSDAeYKlqTjvc4CPqQb1sU56phFSTreOen2nQbNdvD8WuV16SqX+iTohEb38WI4J6hjGrvYkI6qK/1htyH2Z9aQT/Dn8wMV5jnxJDAcbAAAAABJRU5ErkJggg%3D%3D',
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                })
            },

            _onHandleDrag: function() {
                var overlay = this._handled
                , formerLatLng = this._handled._corners[this._corner]
                , newLatLng = this.getLatLng()
                ,
                    angle = this._calculateAngle(formerLatLng, newLatLng)
                , scale = this._calculateScalingFactor(formerLatLng, newLatLng);

                overlay.editing._rotateBy(angle);
                overlay.editing._scaleBy(scale);

                overlay.fire('update');
            },

            updateHandle: function() {
                this.setLatLng(this._handled._corners[this._corner]);
            },

            /* Takes two latlngs and calculates the angle between them. */
            _calculateAngle: function(latlngA, latlngB) {
                var map = this._handled._map
                ,
                    centerPoint = map.latLngToLayerPoint(this._handled.getCenter())
                , formerPoint = map.latLngToLayerPoint(latlngA)
                , newPoint = map.latLngToLayerPoint(latlngB)
                ,
                    initialAngle = Math.atan2(centerPoint.y - formerPoint.y, centerPoint.x - formerPoint.x)
                , newAngle = Math.atan2(centerPoint.y - newPoint.y, centerPoint.x - newPoint.x);

                return newAngle - initialAngle;
            },

            /* Takes two latlngs and calculates the scaling difference. */
            _calculateScalingFactor: function(latlngA, latlngB) {
                var map = this._handled._map
                ,
                    centerPoint = map.latLngToLayerPoint(this._handled.getCenter())
                , formerPoint = map.latLngToLayerPoint(latlngA)
                , newPoint = map.latLngToLayerPoint(latlngB)
                ,
                    formerRadiusSquared = this._d2(centerPoint, formerPoint)
                , newRadiusSquared = this._d2(centerPoint, newPoint);

                return Math.sqrt(newRadiusSquared / formerRadiusSquared);
            },

            /* Distance between two points in cartesian space, squared (distance formula). */
            _d2: function(a, b) {
                var dx = a.x - b.x
                , dy = a.y - b.y;

                return Math.pow(dx, 2) + Math.pow(dy, 2);
            }
        });

        L.DistortableImageOverlay = L.ImageOverlay.extend({
            include: L.Mixin.Events,

            options: {
                alt: '',
                height: 200
            },

            initialize: function(url, options) {
                this._url = url;
                this._rotation = this.options.rotation;

                L.setOptions(this, options);
            },

            onAdd: function(map) {
                /* Copied from L.ImageOverlay */
                this._map = map;

                if (!this._image) {
                    this._initImage();
                }
                if (!this._events) {
                    this._initEvents();
                }

                map._panes.overlayPane.appendChild(this._image);

                map.on('viewreset', this._reset, this);
                /* End copied from L.ImageOverlay */

                /* Use provided corners if available */
                if (this.options.corners) {
                    this._corners = this.options.corners;
                    if (map.options.zoomAnimation && L.Browser.any3d) {
                        map.on('zoomanim', this._animateZoom, this);
                    }

                    /* This reset happens before image load; it allows
			 * us to place the image on the map earlier with
			 * "guessed" dimensions. */
                    this._reset();
                }

                /* Have to wait for the image to load because
		 * we need to access its width and height. */
                L.DomEvent.on(this._image, 'load', function() {
                    this._initImageDimensions();
                    this._reset();
                    /* Initialize default corners if not already set */
                    if (!this._corners) {
                        if (map.options.zoomAnimation && L.Browser.any3d) {
                            map.on('zoomanim', this._animateZoom, this);
                        }
                    }
                }, this);

                this.fire('add');
            },

            onRemove: function(map) {
                this.fire('remove');

                L.ImageOverlay.prototype.onRemove.call(this, map);
            },

            _initImage: function() {
                L.ImageOverlay.prototype._initImage.call(this);

                L.extend(this._image, {
                    alt: this.options.alt
                });
            },

            _initImageDimensions: function() {
                var map = this._map
                ,
                    originalImageWidth = L.DomUtil.getStyle(this._image, 'width')
                , originalImageHeight = L.DomUtil.getStyle(this._image, 'height')
                ,
                    aspectRatio = parseInt(originalImageWidth) / parseInt(originalImageHeight)
                ,
                    imageHeight = this.options.height
                , imageWidth = parseInt(aspectRatio * imageHeight)
                ,
                    center = map.latLngToContainerPoint(map.getCenter())
                , offset = new L.Point(imageWidth,imageHeight).divideBy(2);

                if (this.options.corners) {
                    this._corners = this.options.corners;
                } else {
                    this._corners = [map.containerPointToLatLng(center.subtract(offset)), map.containerPointToLatLng(center.add(new L.Point(offset.x,-offset.y))), map.containerPointToLatLng(center.add(new L.Point(-offset.x,offset.y))), map.containerPointToLatLng(center.add(offset))];
                }
            },

            _initEvents: function() {
                this._events = ['click'];

                for (var i = 0, l = this._events.length; i < l; i++) {
                    L.DomEvent.on(this._image, this._events[i], this._fireMouseEvent, this);
                }
            },

            /* See src/layer/vector/Path.SVG.js in the Leaflet source. */
            _fireMouseEvent: function(event) {
                if (!this.hasEventListeners(event.type)) {
                    return;
                }

                var map = this._map
                , containerPoint = map.mouseEventToContainerPoint(event)
                , layerPoint = map.containerPointToLayerPoint(containerPoint)
                , latlng = map.layerPointToLatLng(layerPoint);

                this.fire(event.type, {
                    latlng: latlng,
                    layerPoint: layerPoint,
                    containerPoint: containerPoint,
                    originalEvent: event
                });
            },

            _updateCorner: function(corner, latlng) {
                this._corners[corner] = latlng;
                this._reset();
            },

            /* Copied from Leaflet v0.7 https://github.com/Leaflet/Leaflet/blob/66282f14bcb180ec87d9818d9f3c9f75afd01b30/src/dom/DomUtil.js#L189-L199 */
            /* since L.DomUtil.getTranslateString() is deprecated in Leaflet v1.0 */
            _getTranslateString: function(point) {
                // on WebKit browsers (Chrome/Safari/iOS Safari/Android) using translate3d instead of translate
                // makes animation smoother as it ensures HW accel is used. Firefox 13 doesn't care
                // (same speed either way), Opera 12 doesn't support translate3d

                var is3d = L.Browser.webkit3d
                , open = 'translate' + (is3d ? '3d' : '') + '('
                , close = (is3d ? ',0' : '') + ')';

                return open + point.x + 'px,' + point.y + 'px' + close;
            },

            _reset: function() {
                var map = this._map
                , image = this._image
                , latLngToLayerPoint = L.bind(map.latLngToLayerPoint, map)
                ,
                    transformMatrix = this._calculateProjectiveTransform(latLngToLayerPoint)
                , topLeft = latLngToLayerPoint(this._corners[0])
                ,
                    warp = L.DomUtil.getMatrixString(transformMatrix)
                , translation = this._getTranslateString(topLeft);

                /* See L.DomUtil.setPosition. Mainly for the purposes of L.Draggable. */
                image._leaflet_pos = topLeft;

                image.style[L.DomUtil.TRANSFORM] = [translation, warp].join(' ');

                /* Set origin to the upper-left corner rather than the center of the image, which is the default. */
                image.style[L.DomUtil.TRANSFORM + '-origin'] = "0 0 0";
            },

            /*
	 * Calculates the transform string that will be correct *at the end* of zooming.
	 * Leaflet then generates a CSS3 animation between the current transform and
	 *		 future transform which makes the transition appear smooth.
	 */
            _animateZoom: function(event) {
                var map = this._map
                , image = this._image
                , latLngToNewLayerPoint = function(latlng) {
                    return map._latLngToNewLayerPoint(latlng, event.zoom, event.center);
                }
                ,
                    transformMatrix = this._calculateProjectiveTransform(latLngToNewLayerPoint)
                , topLeft = latLngToNewLayerPoint(this._corners[0])
                ,
                    warp = L.DomUtil.getMatrixString(transformMatrix)
                , translation = this._getTranslateString(topLeft);

                /* See L.DomUtil.setPosition. Mainly for the purposes of L.Draggable. */
                image._leaflet_pos = topLeft;

                if (!L.Browser.gecko) {
                    image.style[L.DomUtil.TRANSFORM] = [translation, warp].join(' ');
                }
            },

            getCorners: function() {
                return this._corners;
            },

            /*
	 * Calculates the centroid of the image.
	 *		 See http://stackoverflow.com/questions/6149175/logical-question-given-corners-find-center-of-quadrilateral
	 */
            getCenter: function(ll2c, c2ll) {
                var map = this._map
                , latLngToCartesian = ll2c ? ll2c : map.latLngToLayerPoint
                , cartesianToLatLng = c2ll ? c2ll : map.layerPointToLatLng
                , nw = latLngToCartesian.call(map, this._corners[0])
                , ne = latLngToCartesian.call(map, this._corners[1])
                , se = latLngToCartesian.call(map, this._corners[2])
                , sw = latLngToCartesian.call(map, this._corners[3])
                ,
                    nmid = nw.add(ne.subtract(nw).divideBy(2))
                , smid = sw.add(se.subtract(sw).divideBy(2));

                return cartesianToLatLng.call(map, nmid.add(smid.subtract(nmid).divideBy(2)));
            },

            _calculateProjectiveTransform: function(latLngToCartesian) {
                /* Setting reasonable but made-up image defaults
		 * allow us to place images on the map before
		 * they've finished downloading. */
                var offset = latLngToCartesian(this._corners[0]), w = this._image.offsetWidth || 500, h = this._image.offsetHeight || 375, c = [], j;
                /* Convert corners to container points (i.e. cartesian coordinates). */
                for (j = 0; j < this._corners.length; j++) {
                    c.push(latLngToCartesian(this._corners[j])._subtract(offset));
                }

                /*
		 * This matrix describes the action of the CSS transform on each corner of the image.
		 * It maps from the coordinate system centered at the upper left corner of the image
		 *		 to the region bounded by the latlngs in this._corners.
		 * For example:
		 *		 0, 0, c[0].x, c[0].y
		 *		 says that the upper-left corner of the image maps to the first latlng in this._corners.
		 */
                return L.MatrixUtil.general2DProjection(0, 0, c[0].x, c[0].y, w, 0, c[1].x, c[1].y, 0, h, c[2].x, c[2].y, w, h, c[3].x, c[3].y);
            }
        });

        L.DistortableImage = L.DistortableImage || {};
/*
        var EditOverlayAction = LeafletToolbar.ToolbarAction.extend({
            initialize: function(map, overlay, options) {
                this._overlay = overlay;
                this._map = map;

                LeafletToolbar.ToolbarAction.prototype.initialize.call(this, options);
            }
        })
        ,
            closetoolbar = EditOverlayAction.extend({
                options: {
                    toolbarIcon: {
                        html: '<span class="fa fa-close"></span>',
                        tooltip: 'Close',
                        title: 'Close'
                    }
                },

                addHooks: function() {
                    this._overlay.editing._hideToolbar();
                    this.disable();
                }
            })
        ,

            ToggleTransparency = EditOverlayAction.extend({
                options: {
                    toolbarIcon: {
                        html: '<span class="fa fa-adjust"></span>',
                        tooltip: 'Toggle Image Transparency',
                        title: 'Toggle Image Transparency'
                    }
                },

                addHooks: function() {
                    var editing = this._overlay.editing;

                    editing._toggleTransparency();
                    this.disable();
                }
            })
        ,
            ToggleOutline = EditOverlayAction.extend({
                options: {
                    toolbarIcon: {
                        html: '<span class="fa fa-square-o"></span>',
                        tooltip: 'Toggle Image Outline',
                        title: 'Toggle Image Outline'
                    }
                },

                addHooks: function() {
                    var editing = this._overlay.editing;

                    editing._toggleOutline();
                    this.disable();
                }
            })
        ,
            RemoveOverlay = EditOverlayAction.extend({
                options: {
                    toolbarIcon: {
                        html: '<span class="fa fa-trash"></span>',
                        tooltip: 'Delete image',
                        title: 'Delete image'
                    }
                },

                addHooks: function() {
                    if (confirm('Are you sure you want to delete the image?')) {
                        var map = this._map;
                        map.removeLayer(this._overlay);
                        this._overlay.editing._hideToolbar();
                        this._overlay.fire('delete');
                    }
                    this.disable();
                }
            })
        ,
            ToggleEditable = EditOverlayAction.extend({
                options: {
                    toolbarIcon: {
                        html: '<span class="fa fa-lock"></span>',
                        tooltip: 'Lock / Unlock editing',
                        title: 'Lock / Unlock editing'
                    }
                },

                addHooks: function() {
                    var editing = this._overlay.editing;

                    editing._toggleLock();
                    this.disable();
                }
            })
        ,
            ToggleRotateDistort = EditOverlayAction.extend({
                initialize: function(map, overlay, options) {
                    var icon = overlay.editing._mode === 'rotate' ? 'image' : 'rotate-left';

                    options = options || {};
                    options.toolbarIcon = {
                        html: '<span class="fa fa-' + icon + '"></span>',
                        tooltip: 'Rotate',
                        title: 'Rotate'
                    };

                    EditOverlayAction.prototype.initialize.call(this, map, overlay, options);
                },

                addHooks: function() {
                    var editing = this._overlay.editing;

                    editing._toggleRotateDistort();
                    this.disable();
                }
            });

        L.DistortableImage.EditToolbar = LeafletToolbar.Popup.extend({
            options: {
                actions: [closetoolbar,ToggleTransparency, RemoveOverlay, ToggleOutline, ToggleEditable, ToggleRotateDistort]
            }
        });
*/
        L.DistortableImage = L.DistortableImage || {};

        L.DistortableImage.Edit = L.Handler.extend({
            options: {
                opacity: 0.7,
                outline: '1px solid red'
            },

            initialize: function(overlay) {
                this._overlay = overlay;

                /* Interaction modes. */
                this._mode = this._overlay.options.mode || 'distort';
                this._transparent = false;
                this._outlined = false;
            },

            /* Run on image seletion. */
            addHooks: function() {
                var overlay = this._overlay, map = overlay._map, i;

                this._lockHandles = new L.LayerGroup();
                for (i = 0; i < 4; i++) {
                    this._lockHandles.addLayer(new L.LockHandle(overlay,i,{
                        draggable: false
                    }));
                }

                this._distortHandles = new L.LayerGroup();
                for (i = 0; i < 4; i++) {
                    this._distortHandles.addLayer(new L.DistortHandle(overlay,i));
                }

                this._rotateHandles = new L.LayerGroup();
                for (i = 0; i < 4; i++) {
                    this._rotateHandles.addLayer(new L.RotateHandle(overlay,i));
                }

                this._handles = {
                    'lock': this._lockHandles,
                    'distort': this._distortHandles,
                    'rotate': this._rotateHandles
                };

                if (this._mode === 'lock') {
                    map.addLayer(this._lockHandles);
                } else {
                    this._mode = 'distort';
                    map.addLayer(this._distortHandles);
                    this._enableDragging();
                }

                overlay.fire('select');

            },

            /* Run on image deseletion. */
            removeHooks: function() {
                var overlay = this._overlay
                , map = overlay._map;

                // First, check if dragging exists;
                // it may be off due to locking
                if (this.dragging) {
                    this.dragging.disable();
                }
                delete this.dragging;

                map.removeLayer(this._handles[this._mode]);

                overlay.fire('deselect');
            },

            _rotateBy: function(angle) {
                var overlay = this._overlay, map = overlay._map, center = map.latLngToLayerPoint(overlay.getCenter()), i, p, q;

                for (i = 0; i < 4; i++) {
                    p = map.latLngToLayerPoint(overlay._corners[i]).subtract(center);
                    q = new L.Point(Math.cos(angle) * p.x - Math.sin(angle) * p.y,Math.sin(angle) * p.x + Math.cos(angle) * p.y);
                    overlay._corners[i] = map.layerPointToLatLng(q.add(center));
                }

                overlay._reset();
            },

            _scaleBy: function(scale) {
                var overlay = this._overlay, map = overlay._map, center = map.latLngToLayerPoint(overlay.getCenter()), i, p;

                for (i = 0; i < 4; i++) {
                    p = map.latLngToLayerPoint(overlay._corners[i]).subtract(center).multiplyBy(scale).add(center);
                    overlay._corners[i] = map.layerPointToLatLng(p);
                }

                overlay._reset();
            },

            _enableDragging: function() {
                var overlay = this._overlay
                , map = overlay._map;

                this.dragging = new L.Draggable(overlay._image);
                this.dragging.enable();

                /* Hide toolbars while dragging; click will re-show it */
                //this.dragging.on('dragstart', this._hideToolbar, this);

                /*
		 * Adjust default behavior of L.Draggable.
		 * By default, L.Draggable overwrites the CSS3 distort transform
		 * that we want when it calls L.DomUtil.setPosition.
		 */
                this.dragging._updatePosition = function() {
                    var delta = this._newPos.subtract(map.latLngToLayerPoint(overlay._corners[0])), currentPoint, i;

                    this.fire('predrag');

                    for (i = 0; i < 4; i++) {
                        currentPoint = map.latLngToLayerPoint(overlay._corners[i]);
                        overlay._corners[i] = map.layerPointToLatLng(currentPoint.add(delta));
                    }
                    overlay._reset();
                    overlay.fire('update');

                    this.fire('drag');
                };
            },

            _toggleRotateDistort: function() {
                var map = this._overlay._map;

                map.removeLayer(this._handles[this._mode]);

                /* Switch mode. */
                if (this._mode !== '_lock') {
                    if (this._mode === 'rotate') {
                        this._mode = 'distort';
                    } else {
                        this._mode = 'rotate';
                    }
                }

                map.addLayer(this._handles[this._mode]);
            },

            _toggleTransparency: function() {
                var image = this._overlay._image, opacity;

                this._transparent = !this._transparent;
                opacity = this._transparent ? this.options.opacity : 1;

                L.DomUtil.setOpacity(image, opacity);
                image.setAttribute('opacity', opacity);
            },

            _toggleOutline: function() {
                var image = this._overlay._image, opacity, outline;

                this._outlined = !this._outlined;
                opacity = this._outlined ? this.options.opacity / 2 : 1;
                outline = this._outlined ? this.options.outline : 'none';

                L.DomUtil.setOpacity(image, opacity);
                image.setAttribute('opacity', opacity);

                image.style.outline = outline;
            },

            _toggleLock: function() {
                var map = this._overlay._map;

                map.removeLayer(this._handles[this._mode]);
                /* Switch mode. */
                if (this._mode === 'lock') {
                    this._mode = 'distort';
                    this._enableDragging();
                } else {
                    this._mode = 'lock';
                    if (this.dragging) {
                        this.dragging.disable();
                    }
                    delete this.dragging;
                }

                map.addLayer(this._handles[this._mode]);
            },

            toggleIsolate: function() {// this.isolated = !this.isolated;
                // if (this.isolated) {
                // 	$.each($L.images,function(i,img) {
                // 		img.hidden = false;
                // 		img.setOpacity(1);
                // 	});
                // } else {
                // 	$.each($L.images,function(i,img) {
                // 		img.hidden = true;
                // 		img.setOpacity(0);
                // 	});
                // }
                // this.hidden = false;
                // this.setOpacity(1);
            }

        });

        L.DistortableImageOverlay.addInitHook(function() {
            this.editing = new L.DistortableImage.Edit(this);

            if (this.options.editable) {
                L.DomEvent.on(this._image, 'load', this.editing.enable, this.editing);
            }

            this.on('remove', function() {
                if (this.editing) {
                    this.editing.disable();
                }
            });
        });
    };

    self.enableLayer = function(layername) {
        function getOverlayLayers() {
            var layers = window.layerChooser.getLayers().overlayLayers;
            var overlayLayers = {};
            for (i in layers) {
                overlayLayers[layers[i].layerId] = layers[i];
            }
            return overlayLayers;
        }

        function getLayerId(overlayLayers,layername) {
            for (var id in overlayLayers) {
                if (overlayLayers[id].name === layername) {
                    return parseInt(id);
                }
            }
            return -1;
        }

        var overlayLayers = getOverlayLayers();
        var layerid = getLayerId(overlayLayers,layername);
        if (layerid < 0) return false;

        if (!overlayLayers[layerid].active) {
            var inputs = layerChooser._form.getElementsByTagName('input');
            for (var i = 0; i < inputs.length; i++) {
                if (inputs[i].layerId === layerid) {
                    inputs[i].click();
                    return true;
                }
            }
        }
    };

    self.drawlayeractive = function() {
        var layers = window.layerChooser.getLayers().overlayLayers;
        for (var id in layers) {
            if (layers[id].name === self.overlayname) {
                if (layers[id].active) {
                    return true;
                }
            }
        }
        return false;
    };

    self.setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        self.setupleafletdistortion();

        $('head').append(
            '<style>' +
            '.imageOverlaymenu a { display:block; color:#ffce00; border:1px solid #ffce00; padding:3px 0; margin:10px auto; width:80%; text-align:center; background:rgba(8,48,78,.9); }' +
            '.ui-dialog-imageOverlay-export textarea { width:96%; height:250px; resize:vertical; }' +
            '</style>');

        self.restoresettings(localStorage[self.localstoragesettings]);

        self.drawlayer = new L.FeatureGroup();
        window.addLayerGroup(self.overlayname, self.drawlayer, true);
        $('#toolbox').append('<a onclick="' + self.namespace + 'menu(); return false;" href="#">' + self.overlayname + '</a>');

        if (self.drawlayeractive()) self.showimage();

        map.on('layeradd', function(obj) {
            if (obj.layer === self.drawlayer) {
                self.showimage();
            }
        });

        map.on('layerremove', function(obj) {
            if (obj.layer === self.drawlayer) {
                self.settings.edit = false;
                self.editmodus();
                self.storesettings();
            }
        });

        window.addHook('mapDataRefreshEnd',function() { if (self.imagelayer && self.settings.edit) self.imagelayer.bringToFront(); });
		console.log('IITC plugin loaded: ' + self.title + ' version ' + self.version);
    };

    var setup = function() {
		(window.iitcLoaded?self.setup():window.addHook('iitcLoaded',self.setup));
    };

    // PLUGIN END //////////////////////////////////////////////////////////


    setup.info = plugin_info; //add the script info data to the function as a property
    if(!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);
    // if IITC has already booted, immediately run the 'setup' function
    if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);
