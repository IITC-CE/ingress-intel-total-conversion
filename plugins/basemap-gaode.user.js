// ==UserScript==
// @id             iitc-plugin-basemap-gaode@jonatkins
// @name           IITC plugin: Map layers from GAODE by GMOogway
// @category       Map Tiles
// @version        0.1.0.@@DATETIMEVERSION@@
// @description    [@@BUILDNAME@@-@@BUILDDATE@@] Add autonavi.com (China) map layers
@@METAINFO@@
// ==/UserScript==

@@PLUGINSTART@@

    // PLUGIN START ////////////////////////////////////////////////////////

    // use own namespace for plugin
    window.plugin.mapTileGaode = function() {};

    /////////// begin WGS84 to GCJ-02 obfuscator /////////
    var PRCoords = window.plugin.mapTileGaode.PRCoords = (function() {
        // This set of points roughly illustrates the scope of Google's
        // distortion. It has nothing to do with national borders etc.
        // Points around Hong Kong/Shenzhen are mapped with a little more precision,
        // in hope that it will make agents work a bit more smoothly there.
        //
        // Edits around these points are welcome.
        var POINTS = [
            // start hkmo
            114.433722, 22.064310, 114.009458, 22.182105, 113.599275, 22.121763, 113.583463, 22.176002, 113.530900, 22.175318, 113.529542, 22.210608, 113.613377, 22.227435, 113.938514, 22.483714, 114.043449, 22.500274, 114.138506, 22.550640, 114.222984, 22.550960, 114.366803, 22.524255,
            // end hkmo
            115.254019, 20.235733, 121.456316, 26.504442, 123.417261, 30.355685, 124.289197, 39.761103, 126.880509, 41.774504, 127.887261, 41.370015, 128.214602, 41.965359, 129.698745, 42.452788, 130.766139, 42.668534, 131.282487, 45.037051, 133.142361, 44.842986, 134.882453, 48.370596, 132.235531, 47.785403, 130.980075, 47.804860, 130.659026, 48.968383, 127.860252, 50.043973, 125.284310, 53.667091, 120.619316, 53.100485, 119.403751, 50.105903, 117.070862, 49.690388, 115.586019, 47.995542, 118.599613, 47.927785, 118.260771, 46.707335, 113.534759, 44.735134, 112.093739, 45.001999, 111.431259, 43.489381, 105.206324, 41.809510, 96.485703, 42.778692, 94.167961, 44.991668, 91.130430, 45.192938, 90.694601, 47.754437, 87.356293, 49.232005, 85.375791, 48.263928, 85.876055, 47.109272, 82.935423, 47.285727, 81.929808, 45.506317, 79.919457, 45.108122, 79.841455, 42.178752, 73.334917, 40.076332, 73.241805, 39.062331, 79.031902, 34.206413, 78.738395, 31.578004, 80.715812, 30.453822, 81.821692, 30.585965, 85.501663, 28.208463, 92.096061, 27.754241, 94.699781, 29.357171, 96.079442, 29.429559, 98.910308, 27.140660, 97.404057, 24.494701, 99.400021, 23.168966, 100.697449, 21.475914, 102.976870, 22.616482, 105.476997, 23.244292, 108.565621, 20.907735, 107.730505, 18.193406, 110.669856, 17.754550, ]
        var HK_LENGTH = 12 // for future use (e.g. with Baidu)
        var lats = POINTS.filter(function(_, idx) { return idx % 2 == 1;})
        var lngs = POINTS.filter(function(_, idx) { return idx % 2 == 0;})
        POINTS = null
        // not needed anyway...
        /// *** pnpoly *** ///
        // Wm. Franklin's 8-line point-in-polygon C program
        // Copyright (c) 1970-2003, Wm. Randolph Franklin
        // Copyright (c) 2017, Mingye Wang (js translation)
        //
        // Permission is hereby granted, free of charge, to any person obtaining
        // a copy of this software and associated documentation files (the
        // "Software"), to deal in the Software without restriction, including
        // without limitation the rights to use, copy, modify, merge, publish,
        // distribute, sublicense, and/or sell copies of the Software, and to
        // permit persons to whom the Software is furnished to do so, subject to
        // the following conditions:
        //
        //   1. Redistributions of source code must retain the above copyright
        //      notice, this list of conditions and the following disclaimers.
        //   2. Redistributions in binary form must reproduce the above
        //      copyright notice in the documentation and/or other materials
        //      provided with the distribution.
        //   3. The name of W. Randolph Franklin may not be used to endorse or
        //      promote products derived from this Software without specific
        //      prior written permission.
        //
        // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
        // EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
        // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
        // NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
        // LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
        // OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
        // WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
        var pnpoly = function(xs, ys, x, y) {
            if (! (xs.length === ys.length)) throw new Error('pnpoly: assert(xs.length === ys.length)')
            var inside = 0
            for (let i = 0, j = xs.length - 1; i < xs.length; j = i++)
                inside ^= (((ys[i] > y) !== (ys[j] > y)) && (x < (xs[j] - xs[i]) * (y - ys[i]) / (ys[j] - ys[i]) + xs[i]))
            return !! inside
        }
        /// ^^^ pnpoly ^^^ ///
        var isInGoogle = function(coords) {
            // Yank out South China Sea as it's not distorted.
            return coords.lat >= 17.754 && coords.lat <= 55.8271 && coords.lng >= 72.004 && coords.lng <= 137.8347 && pnpoly(lats, lngs, coords.lat, coords.lng)
        }

        /// Krasovsky 1940 ellipsoid
        /// @const
        var GCJ_A = 6378245
        var GCJ_EE = 0.00669342162296594323 // f = 1/298.3; e^2 = 2*f - f**2
        var gcjObfs = function(wgs) {
            if (!isInGoogle(wgs)) {
                return wgs
            }

            var x = wgs.lng - 105,
                y = wgs.lat - 35
            // These distortion functions accept (x = lon - 105, y = lat - 35).
            // They return distortions in terms of arc lengths, in meters.
            var dLat_m = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x)) + 20 / 3 * (2 * Math.sin(x * 6 * Math.PI) + 2 * Math.sin(x * 2 * Math.PI) + 2 * Math.sin(y * Math.PI) + 4 * Math.sin(y / 3 * Math.PI) + 16 * Math.sin(y / 12 * Math.PI) + 32 * Math.sin(y / 30 * Math.PI))
            var dLon_m = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x)) + 20 / 3 * (2 * Math.sin(x * 6 * Math.PI) + 2 * Math.sin(x * 2 * Math.PI) + 2 * Math.sin(x * Math.PI) + 4 * Math.sin(x / 3 * Math.PI) + 15 * Math.sin(x / 12 * Math.PI) + 30 * Math.sin(x / 30 * Math.PI))

            var radLat = wgs.lat / 180 * Math.PI
            var magic = 1 - GCJ_EE * Math.pow(Math.sin(radLat), 2) // just a common expr
            // Arc lengths per degree, on the wrong ellipsoid
            var lat_deg_arclen = (Math.PI / 180) * (GCJ_A * (1 - GCJ_EE)) * Math.pow(magic, 1.5)
            var lon_deg_arclen = (Math.PI / 180) * (GCJ_A * Math.cos(radLat) / Math.sqrt(magic))

            return {
                lat: wgs.lat + (dLat_m / lat_deg_arclen),
                lng: wgs.lng + (dLon_m / lon_deg_arclen),
            }
        }

        return {
            gcjObfs: gcjObfs,
            isInGoogle: isInGoogle,
        }
    })();

    /////////// end WGS84 to GCJ-02 obfuscator /////////

    window.plugin.mapTileGaode.addLayer = function() {

        var types = {
            'Normal': ['路网', 3, 20, 'appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=7', 'GD-Normal'],
            'Satellite': ['影像', 3, 18, 'appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=6', 'GD-Satellite'],
        };

        var baseUrl = 'https://wprd0{s}.is.autonavi.com/';

        for (var layer in types) {
            var info = types[layer];

            var name = info[0];
            var minZoom = info[1];
            var maxZoom = info[2];
            var address = info[3];

            var mapLayer = new L.TileLayer(baseUrl + address, {
                attribution: 'map tiles by autonavi.com, plugin written by GMOogway.',
                subdomains: '1234',
                layer: layer,
                type: '',
                minZoom: minZoom,
                maxNativeZoom: maxZoom,
                maxZoom: 20
            });

            layerChooser.addBaseLayer(mapLayer, '高德 ' + name);
        }

    };

    var setup = function() {

        window.plugin.mapTileGaode.addLayer();

        if (!localStorage['iitc-base-map-gaode-alert'] || localStorage['iitc-base-map-gaode-alert'] != 1 ){
            alert('After the first use this plugin, please refresh it manually due to the need to correct the offset. At present, the coordinates of portal, link, field and player tracker plugin have been fixed. Because iitc-mobile on iPhone can\'t select the layer in the new version of IITC, please remove the following comments before adding to user script. If you want to use other maps, disable this plugin. Map tiles by autonavi.com, plugin written by (TG)GMOogway.');
            localStorage['iitc-base-map-gaode-alert'] = 1;
        }

        // if you use iitc-mobile on IOS, remove the comments below.
        //localStorage['iitc-base-map'] = '高德 路网';

        var newpos;

        var PluginBookmarksExist = false;
        var PluginPlayerTracker = false;
        if (window.bootPlugins) {
            for (var i in bootPlugins) {
                var info = bootPlugins[i].info;
                if (info) {
                    var pname = info.script && info.script.name || info.pluginId;
                    if (pname.indexOf('Bookmarks for maps and portals') != -1) {
                        PluginBookmarksExist = true;
                    }
                    if (pname.indexOf('Player tracker') != -1) {
                        PluginPlayerTracker = true;
                    }
                }
            }

        }
        if (PluginPlayerTracker){
            window.plugin.playerTracker.getLatLngFromEvent = function(ev) {
                //TODO? add weight to certain events, or otherwise prefer them, to give better locations?
                var lats = 0;
                var lngs = 0;
                $.each(ev.latlngs, function(i, latlng) {
                    newpos = PRCoords.gcjObfs(L.latLng(latlng[0], latlng[1]));
                    lats += newpos.lat;
                    lngs += newpos.lng;
                });

                return L.latLng(lats / ev.latlngs.length, lngs / ev.latlngs.length);
            }
            window.plugin.playerTracker.getPortalLink = function(data) {
                var position = data.latlngs[0];
                newpos = PRCoords.gcjObfs(L.latLng(position[0], position[1]));
                position = L.latLng(newpos.lat, newpos.lng);
                var ll = [newpos.lat, newpos.lng].join(',');
                return $('<a>')
                    .addClass('text-overflow-ellipsis')
                    .css('max-width', '15em')
                    .text(window.chat.getChatPortalName(data))
                    .prop({
                    title: window.chat.getChatPortalName(data),
                    href: '/intel?ll=' + ll + '&pll=' + ll,
                })
                    .click(function(event) {
                    window.selectPortalByLatLng(position);
                    event.preventDefault();
                    return false;
                })
                    .dblclick(function(event) {
                    map.setView(position, 17)
                    window.selectPortalByLatLng(position);
                    event.preventDefault();
                    return false;
                });
            }
        }
        if (PluginBookmarksExist) {
            window.plugin.bookmarks.addStar_remove = function(guid, latlng, lbl) {
                newpos = PRCoords.gcjObfs(L.latLng(latlng[0], latlng[1]));
                latlng = [newpos.lat, newpos.lng];
                var star = L.marker(latlng, {
                    title: lbl,
                    icon: L.icon({
                        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAoCAMAAACo9wirAAAAzFBMVEXbuTR9YwDd0T+ulyry2VDt53/s5Jv34a+tmUbJtGRtVwAtJADg14j304viyIZeSwDXyH5IOQD07JLPvnhqVQBuWACmkjpgTQBxWwC4p1WchikRDQCPdxeBaAQTDwADAgAOCwAAAAAAAAAAAAALCQAAAAAAAAAAAAD9+Jb97IT+3VT9+WH+0i3993D+80793Yr/yXL+5Tr+6XL+zEP/z2X+vSX+zB/+52L/qw393SX89xr9+yv/siP/vUf9+Dv+20P+rgH+xQv+vgH+twNAe/b8AAAAKHRSTlPywvLj+vn4/OLrqFb0/PSS8Hb77meB4FGX5t1A2dUkEy8HDQoaAwEAoclaPQAAAo1JREFUeF5VkeeyozAMRrPphdwkdIxpBu7SSe/llvd/p5VxlMx+PxiMzhxJuPX3mc/PzzgIQwYJwyCGoyggwMuRav6BmKrLGgQBrBvUkuQkkSWLGh5DooX1UNWlXplDyp6kq5EXCqL1qlu9srpfIPeq7FmaIBCIA9WScyjznC/3XOZEEAsABIFBoH6GUrt9v5zPQEAXFoCiAWLPkUqon+8lIbl4kRwfmggABFZSXXh9PhbopUos1fWCBoAJnT4MCMMlZLHQE/Hed/wIFA3gkiSvqjLtK45tO/N+WlZVnhA7YgKAFZK83dGJM5v4rmFSonfaeWotoEcDhJqSVl06W0A5gviTGelWqTJzvZADcWjO11XVIzPbjzzGPFfT4bxWTD8SAANgtTrIQ8eF3QPmDOXDarWej/mUL+C0SgfU91gcR3TAj42BNQDMAMDpwBfzwjCi/cMJgNFMGGBIY5g+AACnrWl+NJay0+mRDhcAiDVdKsOnzJqZRFGoZo74SaYTXDPwzPnhUTw6dCSnaT2inUdRHD7GNgIxM/QUvrW6WfZ4ZFm3VRSiA4sFEEaOlBX7oij2EP4ssqlj413wHqq13uy/X9lvYAcbb5P3cGmd7b9/nvneZzWdNB0EAApN2RZvoNjCvfKb4IBQ+LTe7H5+RXabmjwFCISw6Xb3i8D2oxEgwMdkBgHF7xeEC/SF34yIAN90/LHdHb94QCB2REBsauj17cqB660eogAB8bOE4vgUsBiBt2J6ux6P19v0OQECb8V8y4G34D+AKwgoQEBQgMBLYSrL222pjHEFBN4KOl0up/wWUIAA/k5tNBg014gCBPB3+s5g0EwYYB2Bl8KyND9CAQJvgnmq6kYeXxHzDyATueNnvZcYAAAAAElFTkSuQmCC',
                        iconAnchor: [15,40],
                        iconSize: [30,40]
                    })
                });
                window.registerMarkerForOMS(star);
                star.on('spiderfiedclick', function() { renderPortalDetails(guid); });
                window.plugin.bookmarks.starLayers[guid] = star;
                star.addTo(window.plugin.bookmarks.starLayerGroup);
            }
        }

        if (localStorage['iitc-base-map'].indexOf('高德') != -1) {

            window.Render.prototype.processGameEntities = function(entities) {

                // we loop through the entities three times - for fields, links and portals separately
                // this is a reasonably efficient work-around for leafletjs limitations on svg render order

                for (var i in entities) {
                    var ent = entities[i];
                    if (ent[2][0] == 'r' && !(ent[0] in this.deletedGuid)) {
                        for (var j = 0; j < 3; j++) {
                            newpos = PRCoords.gcjObfs(L.latLng(ent[2][2][j][1] / 1E6, ent[2][2][j][2] / 1E6));
                            ent[2][2][j][1] = newpos.lat * 1E6;
                            ent[2][2][j][2] = newpos.lng * 1E6;
                        }
                        this.createFieldEntity(ent);
                    }
                }

                for (var i in entities) {
                    var ent = entities[i];

                    if (ent[2][0] == 'e' && !(ent[0] in this.deletedGuid)) {
                        newpos = PRCoords.gcjObfs(L.latLng(ent[2][3] / 1E6, ent[2][4] / 1E6));
                        ent[2][3] = newpos.lat * 1E6;
                        ent[2][4] = newpos.lng * 1E6;
                        newpos = PRCoords.gcjObfs(L.latLng(ent[2][6] / 1E6, ent[2][7] / 1E6));
                        ent[2][6] = newpos.lat * 1E6;
                        ent[2][7] = newpos.lng * 1E6;
                        this.createLinkEntity(ent);
                    }
                }

                for (var i in entities) {
                    var ent = entities[i];

                    if (ent[2][0] == 'p' && !(ent[0] in this.deletedGuid)) {
                        newpos = PRCoords.gcjObfs(L.latLng(ent[2][2] / 1E6, ent[2][3] / 1E6));
                        ent[2][2] = newpos.lat * 1E6;
                        ent[2][3] = newpos.lng * 1E6;
                        this.createPortalEntity(ent);
                    }
                }
            }
        }
    }

    // PLUGIN END //////////////////////////////////////////////////////////
    
    @@PLUGINEND@@
