// ==UserScript==
// @author         DanielOnDiordna
// @name           Cells areas at portal level
// @category       Layer
// @version        0.0.4.20210724.002500
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/cells.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/cells.user.js
// @description    [danielondiordna-0.0.4.20210724.002500] Show the S2 cells areas on the map at portal zoom level. A tiny area instead of a score region. Also shows larger S2 cells when zooming out. Using geoJson instead of geodesicPolyline.
// @id             cells@DanielOnDiordna
// @namespace      https://softspot.nl/ingress/
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.cells = function() {};
    var self = window.plugin.cells;
    self.id = 'cells';
    self.title = 'Cells areas';
    self.version = '0.0.4.20210724.002500';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 0.0.1.20180723.233900
- use this plugin as a base iitc-plugin-regions@jonatkins (version 0.1.2.20170108.21732)
- combine with the help of this code: https://www.reddit.com/r/TheSilphRoad/comments/7p9ozm/i_made_a_plugin_to_show_level_17_s2_cells_on/
- convert window.plugin.pluginname to self throughout the script

version 0.0.2.20180724.155200
- removed menu with manual level selection
- added color as a function argument
- added 3 cell levels: Auto show level 14 (largest, orange), level 17 (larger, blue) and level 19 (small, red) together, depending on zoom level

version 0.0.3.20210123.175100
- updated plugin wrapper and userscript header formatting to match IITC-CE coding

version 0.0.4.20210213.235300
- rewritten recursive function to prevent error: Maximum call stack size exceeded
- removed all unused plugin regions code
- added extra cells at higher zoom levels
- added increasing opacity levels
- replaced L.geodesicPolyline by L.geoJson (added sourcecode https://github.com/springmeyer/arc.js)

version 0.0.4.20210421.190200
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin

version 0.0.4.20210724.002500
- prevent double plugin setup on hook iitcLoaded
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.cellsLayer = undefined;

    self.cellpattern = [
        { minzoom: 19, level: 19, color: 'red', opacity: 0.9 },
        { minzoom: 17, level: 19, color: 'red', opacity: 0.9 },
        { minzoom: 15, level: 17, color: 'blue', opacity: 0.8 },
        { minzoom: 13, level: 15, color: 'brown', opacity: 0.7 },
        { minzoom: 11, level: 13, color: 'orange', opacity: 0.6 },
        { minzoom: 9, level: 11, color: 'purple', opacity: 0.5 },
        { minzoom: 7, level: 9, color: 'green', opacity: 0.5 },
        { minzoom: 5, level: 7, color: 'blueviolet', opacity: 0.5 },
        { minzoom: 3, level: 5, color: 'pink', opacity: 0.5 }
    ];

    self.setupS2module = function() {
        /// S2 Geometry functions
        // the regional scoreboard is based on a level 6 S2 Cell
        // - https://docs.google.com/presentation/d/1Hl4KapfAENAOf4gv-pSngKwvS_jwNVHRPZTTDzXXn6Q/view?pli=1#slide=id.i22
        // at the time of writing there's no actual API for the intel map to retrieve scoreboard data,
        // but it's still useful to plot the score cells on the intel map


        // the S2 geometry is based on projecting the earth sphere onto a cube, with some scaling of face coordinates to
        // keep things close to approximate equal area for adjacent cells
        // to convert a lat,lng into a cell id:
        // - convert lat,lng to x,y,z
        // - convert x,y,z into face,u,v
        // - u,v scaled to s,t with quadratic formula
        // - s,t converted to integer i,j offsets
        // - i,j converted to a position along a Hubbert space-filling curve
        // - combine face,position to get the cell id

        //NOTE: compared to the google S2 geometry library, we vary from their code in the following ways
        // - cell IDs: they combine face and the hilbert curve position into a single 64 bit number. this gives efficient space
        //             and speed. javascript doesn't have appropriate data types, and speed is not cricical, so we use
        //             as [face,[bitpair,bitpair,...]] instead
        // - i,j: they always use 30 bits, adjusting as needed. we use 0 to (1<<level)-1 instead
        //        (so GetSizeIJ for a cell is always 1)

        self.S2 = {};
        var S2 = self.S2;

        var LatLngToXYZ = function(latLng) {
            var d2r = Math.PI/180.0;

            var phi = latLng.lat*d2r;
            var theta = latLng.lng*d2r;

            var cosphi = Math.cos(phi);

            return [Math.cos(theta)*cosphi, Math.sin(theta)*cosphi, Math.sin(phi)];
        };

        var XYZToLatLng = function(xyz) {
            var r2d = 180.0/Math.PI;

            var lat = Math.atan2(xyz[2], Math.sqrt(xyz[0]*xyz[0]+xyz[1]*xyz[1]));
            var lng = Math.atan2(xyz[1], xyz[0]);

            return L.latLng(lat*r2d, lng*r2d);
        };

        var largestAbsComponent = function(xyz) {
            var temp = [Math.abs(xyz[0]), Math.abs(xyz[1]), Math.abs(xyz[2])];

            if (temp[0] > temp[1]) {
                if (temp[0] > temp[2]) {
                    return 0;
                } else {
                    return 2;
                }
            } else {
                if (temp[1] > temp[2]) {
                    return 1;
                } else {
                    return 2;
                }
            }

        };

        var faceXYZToUV = function(face,xyz) {
            var u,v;

            switch (face) {
                case 0: u =  xyz[1]/xyz[0]; v =  xyz[2]/xyz[0]; break;
                case 1: u = -xyz[0]/xyz[1]; v =  xyz[2]/xyz[1]; break;
                case 2: u = -xyz[0]/xyz[2]; v = -xyz[1]/xyz[2]; break;
                case 3: u =  xyz[2]/xyz[0]; v =  xyz[1]/xyz[0]; break;
                case 4: u =  xyz[2]/xyz[1]; v = -xyz[0]/xyz[1]; break;
                case 5: u = -xyz[1]/xyz[2]; v = -xyz[0]/xyz[2]; break;
                default: throw {error: 'Invalid face'}; break;
            }

            return [u,v];
        }

        var XYZToFaceUV = function(xyz) {
            var face = largestAbsComponent(xyz);

            if (xyz[face] < 0) {
                face += 3;
            }

            let uv = faceXYZToUV (face,xyz);

            return [face, uv];
        };

        var FaceUVToXYZ = function(face,uv) {
            var u = uv[0];
            var v = uv[1];

            switch (face) {
                case 0: return [ 1, u, v];
                case 1: return [-u, 1, v];
                case 2: return [-u,-v, 1];
                case 3: return [-1,-v,-u];
                case 4: return [ v,-1,-u];
                case 5: return [ v, u,-1];
                default: throw {error: 'Invalid face'};
            }
        };


        var STToUV = function(st) {
            var singleSTtoUV = function(st) {
                if (st >= 0.5) {
                    return (1/3.0) * (4*st*st - 1);
                } else {
                    return (1/3.0) * (1 - (4*(1-st)*(1-st)));
                }
            }

            return [singleSTtoUV(st[0]), singleSTtoUV(st[1])];
        };



        var UVToST = function(uv) {
            var singleUVtoST = function(uv) {
                if (uv >= 0) {
                    return 0.5 * Math.sqrt (1 + 3*uv);
                } else {
                    return 1 - 0.5 * Math.sqrt (1 - 3*uv);
                }
            }

            return [singleUVtoST(uv[0]), singleUVtoST(uv[1])];
        };


        var STToIJ = function(st,order) {
            var maxSize = (1<<order);

            var singleSTtoIJ = function(st) {
                var ij = Math.floor(st * maxSize);
                return Math.max(0, Math.min(maxSize-1, ij));
            };

            return [singleSTtoIJ(st[0]), singleSTtoIJ(st[1])];
        };


        var IJToST = function(ij,order,offsets) {
            var maxSize = (1<<order);

            return [
                (ij[0]+offsets[0])/maxSize,
                (ij[1]+offsets[1])/maxSize
            ];
        }

        // hilbert space-filling curve
        // based on http://blog.notdot.net/2009/11/Damn-Cool-Algorithms-Spatial-indexing-with-Quadtrees-and-Hilbert-Curves
        // note: rather then calculating the final integer hilbert position, we just return the list of quads
        // this ensures no precision issues whth large orders (S3 cell IDs use up to 30), and is more
        // convenient for pulling out the individual bits as needed later
        var pointToHilbertQuadList = function(x,y,order) {
            var hilbertMap = {
                'a': [ [0,'d'], [1,'a'], [3,'b'], [2,'a'] ],
                'b': [ [2,'b'], [1,'b'], [3,'a'], [0,'c'] ],
                'c': [ [2,'c'], [3,'d'], [1,'c'], [0,'b'] ],
                'd': [ [0,'a'], [3,'c'], [1,'d'], [2,'d'] ]
            };

            var currentSquare='a';
            var positions = [];

            for (var i=order-1; i>=0; i--) {

                var mask = 1<<i;

                var quad_x = x&mask ? 1 : 0;
                var quad_y = y&mask ? 1 : 0;

                var t = hilbertMap[currentSquare][quad_x*2+quad_y];

                positions.push(t[0]);

                currentSquare = t[1];
            }

            return positions;
        };

        // S2Cell class

        S2.S2Cell = function(){};

        //static method to construct
        S2.S2Cell.FromLatLng = function(latLng,level) {

            var xyz = LatLngToXYZ(latLng);

            var faceuv = XYZToFaceUV(xyz);
            var st = UVToST(faceuv[1]);

            var ij = STToIJ(st,level);

            return S2.S2Cell.FromFaceIJ (faceuv[0], ij, level);
        };

        S2.S2Cell.FromFaceIJ = function(face,ij,level) {
            var cell = new S2.S2Cell();
            cell.face = face;
            cell.ij = ij;
            cell.level = level;

            return cell;
        };


        S2.S2Cell.prototype.toString = function() {
            return 'F'+this.face+'ij['+this.ij[0]+','+this.ij[1]+']@'+this.level;
        };

        S2.S2Cell.prototype.getLatLng = function() {
            var st = IJToST(this.ij,this.level, [0.5,0.5]);
            var uv = STToUV(st);
            var xyz = FaceUVToXYZ(this.face, uv);

            return XYZToLatLng(xyz);
        };

        S2.S2Cell.prototype.getCornerLatLngs = function() {
            var result = [];
            var offsets = [
                [ 0.0, 0.0 ],
                [ 0.0, 1.0 ],
                [ 1.0, 1.0 ],
                [ 1.0, 0.0 ]
            ];

            for (var i=0; i<4; i++) {
                var st = IJToST(this.ij, this.level, offsets[i]);
                var uv = STToUV(st);
                var xyz = FaceUVToXYZ(this.face, uv);

                result.push ( XYZToLatLng(xyz) );
            }
            return result;
        };


        S2.S2Cell.prototype.getFaceAndQuads = function() {
            var quads = pointToHilbertQuadList(this.ij[0], this.ij[1], this.level);

            return [this.face,quads];
        };

        S2.S2Cell.prototype.getNeighbours = function() {

            var fromFaceIJWrap = function(face,ij,level) {
                var maxSize = (1<<level);
                if (ij[0]>=0 && ij[1]>=0 && ij[0]<maxSize && ij[1]<maxSize) {
                    // no wrapping out of bounds
                    return S2.S2Cell.FromFaceIJ(face,ij,level);
                } else {
                    // the new i,j are out of range.
                    // with the assumption that they're only a little past the borders we can just take the points as
                    // just beyond the cube face, project to XYZ, then re-create FaceUV from the XYZ vector

                    var st = IJToST(ij,level,[0.5,0.5]);
                    var uv = STToUV(st);
                    var xyz = FaceUVToXYZ(face,uv);
                    var faceuv = XYZToFaceUV(xyz);
                    face = faceuv[0];
                    uv = faceuv[1];
                    st = UVToST(uv);
                    ij = STToIJ(st,level);
                    return S2.S2Cell.FromFaceIJ (face, ij, level);
                }
            };

            var face = this.face;
            var i = this.ij[0];
            var j = this.ij[1];
            var level = this.level;


            return [
                fromFaceIJWrap(face, [i-1,j], level),
                fromFaceIJWrap(face, [i,j-1], level),
                fromFaceIJWrap(face, [i+1,j], level),
                fromFaceIJWrap(face, [i,j+1], level)
            ];

        };

    };

    self.setup_arc = function() {
        // source start: https://github.com/springmeyer/arc.js (Latest commit e30b63b on 6 Nov 2015)
        var D2R = Math.PI / 180;
        var R2D = 180 / Math.PI;
        var Coord = function(lon,lat) {
            this.lon = lon;
            this.lat = lat;
            this.x = D2R * lon;
            this.y = D2R * lat;
        };
        Coord.prototype.view = function() {
            return String(this.lon).slice(0, 4) + ',' + String(this.lat).slice(0, 4);
        };
        Coord.prototype.antipode = function() {
            var anti_lat = -1 * this.lat;
            var anti_lon = (this.lon < 0) ? 180 + this.lon : (180 - this.lon) * -1;
            return new Coord(anti_lon, anti_lat);
        };

        var LineString = function() {
            this.coords = [];
            this.length = 0;
        };
        LineString.prototype.move_to = function(coord) {
            this.length++;
            this.coords.push(coord);
        };

        var Arc = function(properties) {
            this.properties = properties || {};
            this.geometries = [];
        };
        Arc.prototype.json = function() {
            if (this.geometries.length <= 0) {
                return {'geometry': { 'type': 'LineString', 'coordinates': null },
                        'type': 'Feature', 'properties': this.properties
                       };
            } else if (this.geometries.length == 1) {
                return {'geometry': { 'type': 'LineString', 'coordinates': this.geometries[0].coords },
                        'type': 'Feature', 'properties': this.properties
                       };
            } else {
                var multiline = [];
                for (var i = 0; i < this.geometries.length; i++) {
                    multiline.push(this.geometries[i].coords);
                }
                return {'geometry': { 'type': 'MultiLineString', 'coordinates': multiline },
                        'type': 'Feature', 'properties': this.properties
                       };
            }
        };
        // TODO - output proper multilinestring
        Arc.prototype.wkt = function() {
            var wkt_string = '';
            var wkt = 'LINESTRING(';
            var collect = function(c) { wkt += c[0] + ' ' + c[1] + ','; };
            for (var i = 0; i < this.geometries.length; i++) {
                if (this.geometries[i].coords.length === 0) {
                    return 'LINESTRING(empty)';
                } else {
                    var coords = this.geometries[i].coords;
                    coords.forEach(collect);
                    wkt_string += wkt.substring(0, wkt.length - 1) + ')';
                }
            }
            return wkt_string;
        };
        /*
         * http://en.wikipedia.org/wiki/Great-circle_distance
         *
        */
        var GreatCircle = function(start,end,properties) {
            if (!start || start.x === undefined || start.y === undefined) {
                throw new Error("GreatCircle constructor expects two args: start and end objects with x and y properties");
            }
            if (!end || end.x === undefined || end.y === undefined) {
                throw new Error("GreatCircle constructor expects two args: start and end objects with x and y properties");
            }
            this.start = start; //new Coord(start.x,start.y); // FIXED source to match plugin
            this.end = end; //new Coord(end.x,end.y); // FIXED source to match plugin
            this.properties = properties || {};

            var w = this.start.x - this.end.x;
            var h = this.start.y - this.end.y;
            var z = Math.pow(Math.sin(h / 2.0), 2) +
                Math.cos(this.start.y) *
                Math.cos(this.end.y) *
                Math.pow(Math.sin(w / 2.0), 2);
            this.g = 2.0 * Math.asin(Math.sqrt(z));

            if (this.g == Math.PI) {
                throw new Error('it appears ' + start.view() + ' and ' + end.view() + " are 'antipodal', e.g diametrically opposite, thus there is no single route but rather infinite");
            } else if (isNaN(this.g)) {
                throw new Error('could not calculate great circle between ' + start + ' and ' + end);
            }
        };
        /*
         * http://williams.best.vwh.net/avform.htm#Intermediate
         */
        GreatCircle.prototype.interpolate = function(f) {
            var A = Math.sin((1 - f) * this.g) / Math.sin(this.g);
            var B = Math.sin(f * this.g) / Math.sin(this.g);
            var x = A * Math.cos(this.start.y) * Math.cos(this.start.x) + B * Math.cos(this.end.y) * Math.cos(this.end.x);
            var y = A * Math.cos(this.start.y) * Math.sin(this.start.x) + B * Math.cos(this.end.y) * Math.sin(this.end.x);
            var z = A * Math.sin(this.start.y) + B * Math.sin(this.end.y);
            var lat = R2D * Math.atan2(z, Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)));
            var lon = R2D * Math.atan2(y, x);
            return [lon, lat];
        };
        /*
         * Generate points along the great circle
         */
        GreatCircle.prototype.Arc = function(npoints,options) {
            var first_pass = [];
            if (!npoints || npoints <= 2) {
                first_pass.push([this.start.lon, this.start.lat]);
                first_pass.push([this.end.lon, this.end.lat]);
            } else {
                var delta = 1.0 / (npoints - 1);
                for (var i = 0; i < npoints; ++i) {
                    var step = delta * i;
                    var pair = this.interpolate(step);
                    first_pass.push(pair);
                }
            }
            /* partial port of dateline handling from:
               gdal/ogr/ogrgeometryfactory.cpp

               TODO - does not handle all wrapping scenarios yet
            */
            var bHasBigDiff = false;
            var dfMaxSmallDiffLong = 0;
            // from http://www.gdal.org/ogr2ogr.html
            // -datelineoffset:
            // (starting with GDAL 1.10) offset from dateline in degrees (default long. = +/- 10deg, geometries within 170deg to -170deg will be splited)
            var dfDateLineOffset = options && options.offset ? options.offset : 10;
            var dfLeftBorderX = 180 - dfDateLineOffset;
            var dfRightBorderX = -180 + dfDateLineOffset;
            var dfDiffSpace = 360 - dfDateLineOffset;

            // https://github.com/OSGeo/gdal/blob/7bfb9c452a59aac958bff0c8386b891edf8154ca/gdal/ogr/ogrgeometryfactory.cpp#L2342
            for (var j = 1; j < first_pass.length; ++j) {
                var dfPrevX = first_pass[j-1][0];
                var dfX = first_pass[j][0];
                var dfDiffLong = Math.abs(dfX - dfPrevX);
                if (dfDiffLong > dfDiffSpace &&
                    ((dfX > dfLeftBorderX && dfPrevX < dfRightBorderX) || (dfPrevX > dfLeftBorderX && dfX < dfRightBorderX))) {
                    bHasBigDiff = true;
                } else if (dfDiffLong > dfMaxSmallDiffLong) {
                    dfMaxSmallDiffLong = dfDiffLong;
                }
            }

            var poMulti = [];
            if (bHasBigDiff && dfMaxSmallDiffLong < dfDateLineOffset) {
                var poNewLS = [];
                poMulti.push(poNewLS);
                for (var k = 0; k < first_pass.length; ++k) {
                    var dfX0 = parseFloat(first_pass[k][0]);
                    if (k > 0 &&  Math.abs(dfX0 - first_pass[k-1][0]) > dfDiffSpace) {
                        var dfX1 = parseFloat(first_pass[k-1][0]);
                        var dfY1 = parseFloat(first_pass[k-1][1]);
                        var dfX2 = parseFloat(first_pass[k][0]);
                        var dfY2 = parseFloat(first_pass[k][1]);
                        if (dfX1 > -180 && dfX1 < dfRightBorderX && dfX2 == 180 &&
                            k+1 < first_pass.length &&
                            first_pass[k-1][0] > -180 && first_pass[k-1][0] < dfRightBorderX)
                        {
                            poNewLS.push([-180, first_pass[k][1]]);
                            k++;
                            poNewLS.push([first_pass[k][0], first_pass[k][1]]);
                            continue;
                        } else if (dfX1 > dfLeftBorderX && dfX1 < 180 && dfX2 == -180 &&
                                   k+1 < first_pass.length &&
                                   first_pass[k-1][0] > dfLeftBorderX && first_pass[k-1][0] < 180)
                        {
                            poNewLS.push([180, first_pass[k][1]]);
                            k++;
                            poNewLS.push([first_pass[k][0], first_pass[k][1]]);
                            continue;
                        }

                        if (dfX1 < dfRightBorderX && dfX2 > dfLeftBorderX)
                        {
                            // swap dfX1, dfX2
                            var tmpX = dfX1;
                            dfX1 = dfX2;
                            dfX2 = tmpX;
                            // swap dfY1, dfY2
                            var tmpY = dfY1;
                            dfY1 = dfY2;
                            dfY2 = tmpY;
                        }
                        if (dfX1 > dfLeftBorderX && dfX2 < dfRightBorderX) {
                            dfX2 += 360;
                        }

                        if (dfX1 <= 180 && dfX2 >= 180 && dfX1 < dfX2)
                        {
                            var dfRatio = (180 - dfX1) / (dfX2 - dfX1);
                            var dfY = dfRatio * dfY2 + (1 - dfRatio) * dfY1;
                            poNewLS.push([first_pass[k-1][0] > dfLeftBorderX ? 180 : -180, dfY]);
                            poNewLS = [];
                            poNewLS.push([first_pass[k-1][0] > dfLeftBorderX ? -180 : 180, dfY]);
                            poMulti.push(poNewLS);
                        }
                        else
                        {
                            poNewLS = [];
                            poMulti.push(poNewLS);
                        }
                        poNewLS.push([dfX0, first_pass[k][1]]);
                    } else {
                        poNewLS.push([first_pass[k][0], first_pass[k][1]]);
                    }
                }
            } else {
                // add normally
                var poNewLS0 = [];
                poMulti.push(poNewLS0);
                for (var l = 0; l < first_pass.length; ++l) {
                    poNewLS0.push([first_pass[l][0],first_pass[l][1]]);
                }
            }

            var arc = new Arc(this.properties);
            for (var m = 0; m < poMulti.length; ++m) {
                var line = new LineString();
                arc.geometries.push(line);
                var points = poMulti[m];
                for (var j0 = 0; j0 < points.length; ++j0) {
                    line.move_to(points[j0]);
                }
            }
            return arc;
        };
        // source arc.js end

        self.arc = {};
        self.arc.Coord = Coord;
        self.arc.Arc = Arc;
        self.arc.GreatCircle = GreatCircle;
    }; // end setup_arc

    self.drawCell = function(cell,color,opacity) {
        function distanceBetween(startLatLng,endLatLng) {
            // source: Arc 1.7.0
            // How far between portals.
            let R = 6367;
            // km

            let lat1 = startLatLng.lat;
            let lon1 = startLatLng.lng;
            let lat2 = endLatLng.lat;
            let lon2 = endLatLng.lng;

            let dLat = (lat2 - lat1) * Math.PI / 180;
            let dLon = (lon2 - lon1) * Math.PI / 180;
            lat1 = lat1 * Math.PI / 180;
            lat2 = lat2 * Math.PI / 180;
            let a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
            let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            let d = R * c;
            d = Math.round(d * 1000) / 1000;
            return d;
        };

        if (!color) color = 'red';
        if (!opacity) opacity = 0.5;

        // corner points
        let corners = cell.getCornerLatLngs();
        let latLngs = cell.getCornerLatLngs();
        // center point
        let center = cell.getLatLng();

        // the level 6 cells have noticible errors with non-geodesic lines - and the larger level 4 cells are worse
        // NOTE: we only draw two of the edges. as we draw all cells on screen, the other two edges will either be drawn
        // from the other cell, or be off screen so we don't care
//        let cellobject = L.geodesicPolyline([corners[0],corners[1],corners[2]], {fill: false, color: color, opacity: opacity, weight: 1, clickable: false });

        // Arc method:
        let startCoord, stopCoord, distance, gc, geojson_feature = [];

        // horizontal line:
        startCoord = new self.arc.Coord(latLngs[0].lng,latLngs[0].lat);
        stopCoord = new self.arc.Coord(latLngs[1].lng,latLngs[1].lat);
        distance = distanceBetween(latLngs[0],latLngs[1]);
        gc = new self.arc.GreatCircle(startCoord,stopCoord);
        geojson_feature.push(gc.Arc(Math.round(distance)).json());

        // vertical line:
        startCoord = new self.arc.Coord(latLngs[1].lng,latLngs[1].lat);
        stopCoord = new self.arc.Coord(latLngs[2].lng,latLngs[2].lat);
        distance = distanceBetween(latLngs[1],latLngs[2]);
        gc = new self.arc.GreatCircle(startCoord,stopCoord);
        geojson_feature.push(gc.Arc(Math.round(distance)).json());

        var cellobject = L.geoJson(geojson_feature, {
            style: { fill: false, color: color, opacity: opacity, weight: 1, clickable: false }
        });

        self.cellsLayer.addLayer(cellobject);
    };

    self.update = function() {
        self.cellsLayer.clearLayers();

        if (!map.hasLayer(self.cellsLayer)) return; // layer disabled

        var bounds = map.getBounds();

        var seenCells = {};
        var prepareCellsArray = [];
        var maximumCells = 6000; // do not draw any cells if maximum reached (lower this value to prevent error: Maximum call stack size exceeded)

        function prepareCellAndNeighbours(cell) {
            var cellStr = cell.toString();
            if (seenCells[cellStr]) return true;

            // cell not visited - flag it as visited now
            seenCells[cellStr] = true;

            // is it on the screen?
            var corners = cell.getCornerLatLngs();
            var cellBounds = L.latLngBounds([corners[0],corners[1]]).extend(corners[2]).extend(corners[3]);

            if (!cellBounds.intersects(bounds)) return true;

            prepareCellsArray.push(cell);
            if (prepareCellsArray.length >= maximumCells) return false;

            // and recurse to our neighbours
            var neighbours = cell.getNeighbours();
            for (var i = 0; i < neighbours.length; i++) {
                if (!prepareCellAndNeighbours(neighbours[i])) return false;
            }

            return true;
        };

        var zoom = map.getZoom();
        for (let cnt = 0; cnt < self.cellpattern.length; cnt++) {
            let pattern = self.cellpattern[cnt];
            if (zoom >= pattern.minzoom && zoom < pattern.minzoom + 4) {
                seenCells = {};
                prepareCellsArray = [];
                let cell = self.S2.S2Cell.FromLatLng(map.getCenter(), pattern.level);
                prepareCellAndNeighbours(cell);
                if (prepareCellsArray.length < maximumCells)
                    for (let cnt = 0; cnt < prepareCellsArray.length; cnt++) {
                        self.drawCell(prepareCellsArray[cnt],pattern.color,pattern.opacity);
                    }
            }
        }
    };

    self.setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        self.setupS2module();
        self.setup_arc();

        self.cellsLayer = L.layerGroup();

        window.addLayerGroup(self.title, self.cellsLayer, true);
        window.map.on('layeradd', function(obj) {
            if (obj.layer === self.cellsLayer) { // show layer
                self.update();
            }
        });

        window.map.on('moveend', self.update);

        self.update();

        console.log('IITC plugin loaded: ' + self.title + ' version ' + self.version);
    };

    var setup = function() {
        (window.iitcLoaded?self.setup():window.addHook('iitcLoaded',self.setup));
    };

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

