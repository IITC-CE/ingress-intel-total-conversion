// ==UserScript==
// @author         Jormund
// @id             poly-counts2@Jormund
// @name           Poly Counts 2
// @category       Info
// @version        2.2.5.20221130.2310
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Jormund/poly-counts2.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Jormund/poly-counts2.user.js
// @description    [2022-11-30-2310] Counts portals by level and faction inside polygons or search result.
// @depends        draw-tools@breunigs
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @match          https://*.ingress.com/intel*
// @grant          none
// ==/UserScript==

//improvements on carb.poly-counts.user.js

//Changelog
//2.2.5 Try fixing autoupdate
//2.2.4 Fix missing total for Machina and total in title
//2.2.3 Fix name was changed from TEAM_MACHINA to TEAM_MAC
//2.2.2 Fix backward compatibility with IITC without TEAM_MACHINA
//2.2.1 Removed some logs
//2.2.0 Handle Machina faction
//2.1.1 Activate on intel - x.ingress.com
//2.1.0 Fix error with IITC-CE, MultiPolygon doesn't exist in Leaflet 1.4
//2.0.3 Activate on intel.ingress.com, changed download url to github
//2.0.2 Distinguish placeholders from other portals
//2.0.1 Use same algorithm as layer-count (better approximation of "curved" edges), still not an exact solution for GeodesicPolygons. Handle holes.
//2.0.0 Activate on ingress.com (without www)
//1.0.0 Count in search result when available, drawn items otherwise (last version by @Carbncl)
//0.0.1 Modified portal counts to filter in drawn polys

function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if (typeof window.plugin !== 'function') window.plugin = function () { };

    window.plugin.polyCounts2 = {
        BAR_TOP: 20,
        BAR_HEIGHT: 180,
        BAR_WIDTH: 25,
        BAR_PADDING: 5,
        RADIUS_INNER: 60,
        RADIUS_OUTER: 80,
        CENTER_X: 220,
        CENTER_Y: 100
    };

    // FUNCTIONS ////////////////////////////////////////////////////////
    /*
    pnpoly Copyright (c) 1970-2003, Wm. Randolph Franklin

    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
    documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
    rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
    persons to whom the Software is furnished to do so, subject to the following conditions:

    1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following
    disclaimers.
    2. Redistributions in binary form must reproduce the above copyright notice in the documentation and/or other
    materials provided with the distribution.
    3. The name of W. Randolph Franklin may not be used to endorse or promote products derived from this Software without
    specific prior written permission.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
    WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
    COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
    OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
    */
    window.plugin.polyCounts2.pnpoly = function (latlngs, point) {
        var length = latlngs.length, c = false;

        for (var i = 0, j = length - 1; i < length; j = i++) {
            if (((latlngs[i].lat > point.lat) != (latlngs[j].lat > point.lat)) &&
                (point.lng < latlngs[i].lng + (latlngs[j].lng - latlngs[i].lng) * (point.lat - latlngs[i].lat) / (latlngs[j].lat - latlngs[i].lat))) {
                c = !c;
            }
        }

        return c;
    }

    window.plugin.polyCounts2.circleToSearchCircle = function (drawnItem) {
        var circleCenter = drawnItem.getLatLng();
        var result = { type: 'circle', radius: drawnItem.getRadius(), center: new L.LatLng(circleCenter.lat, circleCenter.lng) };
        return result;
    };

    //drawnItem can be multipolygon or polygon
    window.plugin.polyCounts2.multiPolygonToSearchPolygons = function (drawnItem) {
        var result = [];
        var polygonArr = [];
        if (drawnItem instanceof L.GeodesicPolygon) {
            //_latlngs contains the Polygon path used to approximate the GeodesicPolygon
            //we use this because the pnpoly algorithm is not suited for GeodesicPolygon and the approximation works better
            if (typeof drawnItem._latlngs != "undefined" && drawnItem._latlngs.length > 0) {
                if (typeof drawnItem._latlngs[0].lng == "number") {
                    polygonArr = drawnItem._latlngs.map(function (item) { return [item.lng, item.lat] });
                    polygonArr = [polygonArr]; //handle simple polygon like a multipolygon of one polygon only
                } else if (typeof drawnItem._latlngs[0][0].lng == "number") {
                    $.each(drawnItem._latlngs, function (i, latLngs) {//each latLngs is a polygon of a multipolygon
                        var innerPolygonArr = latLngs.map(function (item) { return [item.lng, item.lat] });
                        polygonArr.push(innerPolygonArr);
                    });
                }
            }
        }
        else {
            //console.log("Not a GeodesicPolygon");
            polygonArr = drawnItem.toGeoJSON().geometry.coordinates;
            if (polygonArr[0].length == 2 && typeof polygonArr[0][0] == "number") {
                //console.log("Not a MultiPolygon");
                polygonArr = [polygonArr]; //handle simple polygon like a multipolygon of one polygon only
            }
        }
        //console.log("polygonArr:"+polygonArr.length);
        $.each(polygonArr, function (i, polygonCoords) {//each polygonCoords is a polygon of a multipolygon
            var searchPolygon = {
                type: 'polygon',
                outerRing: [],
                holes: []
            };
            if (polygonCoords[0].length == 2 && typeof polygonCoords[0][0] == "number") {
                //polygon has no hole, we wrap it in an array
                polygonCoords = [polygonCoords];
            }
            //console.log(i+" polygonCoords:"+polygonCoords.length);
            $.each(polygonCoords, function (j, linearRing) {//in a polygon, the first set of coords is the outside bound, the others are holes
                var latLngArr = [];
                //console.log(j+" linearRing:"+linearRing.length);
                $.each(linearRing, function (k, latlng) {
                    var obj = { lng: latlng[0], lat: latlng[1] };
                    latLngArr.push(obj);
                    //console.log(k+" latLngArr:" + latLngArr.length);
                });
                if (j == 0) {
                    searchPolygon.outerRing = latLngArr;
                }
                else {
                    searchPolygon.holes.push(latLngArr);
                }
                //console.log("searchPolygon.outerRing:"+searchPolygon.outerRing.length);
                //console.log("searchPolygon.holes:"+searchPolygon.holes.length);
            });
            result.push(searchPolygon);
            //console.log("result:"+result.length);
        });
        return result;
    };

    window.plugin.polyCounts2.pointIsInPolygon = function (point, searchItem) {
        var nodeIn = window.plugin.polyCounts2.pnpoly(searchItem.outerRing, point);
        $.each(searchItem.holes, function (index, hole) {
            var inHole = window.plugin.polyCounts2.pnpoly(hole, point);
            if (inHole) {
                nodeIn = false; //portal is in the hole so not in the polygon
                return false; //breaks the loop
            }
        });
        return nodeIn;
    };

    window.plugin.polyCounts2.pointIsInCircle = function (point, searchItem) {
        var found = false;
        if (searchItem.center.distanceTo(point) <= searchItem.radius) {
            found = true;
        }
        return found;
    };


    //count portals for each level available on the map
    window.plugin.polyCounts2.getPortals = function () {
        //console.log('** getPortals');
        var self = window.plugin.polyCounts2;
        self.work = {};
        self.work.enlP = 0; //ENL portal count
        self.work.resP = 0; //RES portal count
        self.work.neuP = 0; //neutral portal count
        self.work.macP = 0; //machina portal count

        self.work.PortalsEnl = []; //ENL portal count by level
        self.work.PortalsRes = []; //RES portal count by level
        self.work.PortalsMac = []; //Machina portal count by level
        for (var level = window.MAX_PORTAL_LEVEL; level >= 0; level--) {
            self.work.PortalsEnl[level] = 0;
            self.work.PortalsRes[level] = 0;
            self.work.PortalsMac[level] = 0;
        }

        self.work.searchItems = []; //data about shapes that will be searched for portals
        self.work.portalsUnderDraw = []; //guids of portals under draw

        if (window.plugin.drawTools && window.plugin.drawTools.drawnItems) {
            window.plugin.drawTools.drawnItems.eachLayer(function (drawnItem) {
                if (drawnItem instanceof L.GeodesicCircle) {//must be tested first because GeodesicCircle inherit from Polygon
                    var searchCircle = window.plugin.polyCounts2.circleToSearchCircle(drawnItem);
                    self.work.searchItems.push(searchCircle);
                }
                else if (drawnItem instanceof L.GeodesicPolygon) {
                    var searchPolygons = window.plugin.polyCounts2.multiPolygonToSearchPolygons(drawnItem);
                    //console.log("searchPolygons:"+searchPolygons.length);
                    $.each(searchPolygons, function (index, searchItem) {
                        self.work.searchItems.push(searchItem);
                    });
                }
                else if (drawnItem instanceof L.GeodesicPolyline || drawnItem instanceof L.Marker) {
                    //ignored, nothing to do
                }
                else {
                    //should not happen
                    console.log('Poly counts 2 : unknown drawn item type');
                }
            });
        }

        //if search, add it to job
        if (window.search.lastSearch &&
            window.search.lastSearch.selectedResult &&
            window.search.lastSearch.selectedResult.layer) {
            window.search.lastSearch.selectedResult.layer.eachLayer(function (drawnItem) {
                if (drawnItem instanceof L.Polygon || (typeof L.MultiPolygon == "function" && drawnItem instanceof L.MultiPolygon)) {
                    var searchPolygons = window.plugin.polyCounts2.multiPolygonToSearchPolygons(drawnItem);
                    $.each(searchPolygons, function (index, searchItem) {
                        self.work.searchItems.push(searchItem);
                    });
                }
            });
        }

        var total = 0;
        //TODO: error message
        if (self.work.searchItems.length == 0) {
            total = -1;
        }
        else {
            console.log('Poly counts 2 :' + self.work.searchItems.length + ' shapes found');

            //var work = self.work;
            var input = window.portals;

            //console.log("portals:" + input.length);
            $.each(input, function (guid, portal) {
                var point = portal.getLatLng();
                var found = false;
                $.each(self.work.searchItems, function (index, searchItem) {
                    switch (searchItem.type) {
                        case 'circle':
                            if (self.pointIsInCircle(point, searchItem)) {
                                found = true;
                                //console.log("in circle:" + point.lat + "," + point.lng);
                                return false; //breaks the $.each
                            }
                            break;
                        case 'polygon':
                            if (self.pointIsInPolygon(point, searchItem)) {
                                found = true;
                                //console.log("in polygon:" + point.lat + "," + point.lng);
                                return false; //breaks the $.each
                            }
                            break;
                        default:
                            console.log('Poly counts 2 ERROR : invalid draw type (' + searchItem.type + ')');
                            return true; //continue the $.each
                            break;
                    };
                });
                //console.log("found"+found);
                if (found) {
                    self.work.portalsUnderDraw.push(guid);
                    var level = portal.options.level || 0; //placeholders have level 0
                    var team = portal.options.team;
                    switch (team) {
                        case window.TEAM_RES:
                            self.work.resP++;
                            self.work.PortalsRes[level]++;
                            break;
                        case window.TEAM_ENL:
                            self.work.enlP++;
                            self.work.PortalsEnl[level]++;
                            break;
                        //case window.TEAM_MAC:
                        //    self.work.macP++;
                        //    self.work.PortalsMac[level]++;
                        //    break;
                        default:
                            if (window.plugin.polyCounts2.machina_exists && team == window.TEAM_MAC) {
                                self.work.macP++;
                                self.work.PortalsMac[level]++;
                                break;
                            }
                            else {
                                self.work.neuP++;
                            }
                            break;
                    }
                }
            });

            total = self.work.neuP + self.work.enlP + self.work.resP + self.work.macP;
        }
        //get portals informations from IITC
        var z = map.getZoom();
        z = getDataZoomForMapZoom(z);
        var tileParam = getMapZoomTileParameters(z);
        var hasPortals = tileParam.hasPortals || false;
        var counts = '';
        if (total > 0) {
            counts += '<table><tr><th></th><th class="enl">Enlightened</th><th class="res">Resistance</th>';
            var numcol = 2;
            if (window.plugin.polyCounts2.machina_exists) {
                counts += '<th class="mac">Machina</th>';
                numcol = 3;
            }
            counts += '</tr>';
            for (var level = window.MAX_PORTAL_LEVEL; level >= 0; level--) {
                if (level > 0) {
                    counts += '<tr><td class="L' + level + '">Level ' + level + '</td>';
                }
                else {
                    counts += '<tr><td class="L' + level + '">Placeholders</td>';
                }
                if (!hasPortals && level > 0
                    && self.work.PortalsEnl[level] == 0 && self.work.PortalsRes[level] == 0 && self.work.PortalsMac[level] == 0) {
                    counts += '<td colspan="' + numcol + '">zoom in to see portals level</td>';
                }
                //else if (we have some portals) {
                else {
                    counts += '<td class="enl">' + self.work.PortalsEnl[level] + '</td>' +
                        '<td class="res">' + self.work.PortalsRes[level] + '</td>';
                    if (window.plugin.polyCounts2.machina_exists)
                        counts += '<td class="mac">' + self.work.PortalsMac[level] + '</td>';
                }

                counts += '</tr>';
            }

            counts += '<tr><th>Total:</th><td class="enl">' + self.work.enlP + '</td><td class="res">' + self.work.resP + '</td>';
            if (window.plugin.polyCounts2.machina_exists)
                counts += '<td class="mac">' + self.work.macP + '</td>';
            counts += '</tr>';

            counts += '<tr><td>Neutral:</td><td colspan="' + numcol + '">';
            if (!hasPortals)
                counts += 'zoom in to see unclaimed portals';
            else
                counts += self.work.neuP;
            counts += '</td></tr></table>';

            var svg = $('<svg width="300" height="200">').css('margin-top', 10);

            self.work.all = self.work.PortalsRes.map(function (val, i) { return val + self.work.PortalsEnl[i] + self.work.PortalsMac[i] });
            self.work.all[0] += self.work.neuP;

            // bar graphs
            self.makeBar(self.work.PortalsEnl, 'Enl', COLORS[window.TEAM_ENL], 0).appendTo(svg);
            self.makeBar(self.work.all, 'All', '#FFFFFF', 1 * (self.BAR_WIDTH + self.BAR_PADDING)).appendTo(svg);
            self.makeBar(self.work.PortalsRes, 'Res', COLORS[window.TEAM_RES], 2 * (self.BAR_WIDTH + self.BAR_PADDING)).appendTo(svg);
            if (window.plugin.polyCounts2.machina_exists)
                self.makeBar(self.work.PortalsMac, 'Mac', COLORS[window.TEAM_MAC], 3 * (self.BAR_WIDTH + self.BAR_PADDING)).appendTo(svg);

            // pie graph
            var g = $('<g>')
                .attr('transform', self.format('translate(%s,%s)', self.CENTER_X, self.CENTER_Y))
                .appendTo(svg);

            // inner parts - factions
            self.makePie(0, self.work.resP / total, COLORS[window.TEAM_RES]).appendTo(g);
            self.makePie(self.work.resP / total, (self.work.neuP + self.work.resP) / total, COLORS[0]).appendTo(g);
            if (window.plugin.polyCounts2.machina_exists) {
                self.makePie((self.work.neuP + self.work.resP) / total, (self.work.neuP + self.work.resP + self.work.enlP) / total, COLORS[window.TEAM_ENL]).appendTo(g);
                self.makePie((self.work.neuP + self.work.resP + self.work.enlP) / total, 1, COLORS[window.TEAM_MAC]).appendTo(g);
            }
            else {
                self.makePie((self.work.neuP + self.work.resP) / total, 1, COLORS[window.TEAM_ENL]).appendTo(g);
            }

            // outer part - levels
            var angle = 0;
            for (var i = self.work.PortalsRes.length - 1; i >= 0; i--) {
                if (!self.work.PortalsRes[i])
                    continue;

                var diff = self.work.PortalsRes[i] / total;
                self.makeRing(angle, angle + diff, COLORS_LVL[i]).appendTo(g);
                angle += diff;
            }

            var diff = self.work.neuP / total;
            self.makeRing(angle, angle + diff, COLORS_LVL[0]).appendTo(g);
            angle += diff;

            for (var i = 0; i < self.work.PortalsEnl.length; i++) {
                if (!self.work.PortalsEnl[i])
                    continue;

                var diff = self.work.PortalsEnl[i] / total;
                self.makeRing(angle, angle + diff, COLORS_LVL[i]).appendTo(g);
                angle += diff;
            }

            if (window.plugin.polyCounts2.machina_exists) {
                for (var i = 0; i < self.work.PortalsMac.length; i++) {
                    if (!self.work.PortalsMac[i])
                        continue;

                    var diff = self.work.PortalsMac[i] / total;
                    self.makeRing(angle, angle + diff, COLORS_LVL[i]).appendTo(g);
                    angle += diff;
                }
            }

            // black line from center to top
            $('<line>')
                .attr({
                    x1: self.work.resP < self.work.enlP ? 0.5 : -0.5,
                    y1: 0,
                    x2: self.work.resP < self.work.enlP ? 0.5 : -0.5,
                    y2: -self.RADIUS_OUTER,
                    stroke: '#000',
                    'stroke-width': 1
                })
                .appendTo(g);

            // if there are no neutral portals, draw a black line between res and enl
            if (self.work.neuP == 0) {
                var x = Math.sin((0.5 - self.work.resP / total) * 2 * Math.PI) * self.RADIUS_OUTER;
                var y = Math.cos((0.5 - self.work.resP / total) * 2 * Math.PI) * self.RADIUS_OUTER;

                $('<line>')
                    .attr({
                        x1: self.work.resP < self.work.enlP ? 0.5 : -0.5,
                        y1: 0,
                        x2: x,
                        y2: y,
                        stroke: '#000',
                        'stroke-width': 1
                    })
                    .appendTo(g);
            }

            counts += $('<div>').append(svg).html();
        } else if (total == 0) {
            counts += '<p>No Portals in range!</p>';
        } else if (total == -1) {
            //warning icon
            var img = '<img style="vertical-align:middle;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAGE0lEQVR4nMWXbWxUWRnHf885985Mh2lnpm8zLeVlS3mp1qGgFigLUyltpcTZalsENST4icSYXXenbDZt4uqaGDG4H0gaNVk0uyvuayK4omY1K1kN8SVGDYlb1oSlVGophYUy05nOzD1+mBkKkgWKLJzkn5Obe+7z/93nec7cOWKM4UEO9UDdAetuHhoaHKo1xpwpLS21EonE7NTFqbbh4eET9w1AKXV0W/c2a8OGDYyPj7sOHjz4uojUGWOcecea7wPxeDwWrgl/fGHFAiYPfZqyEs3SJUtruru7H5tvrLsC8Lg9z2/fvp333/o2iCIzcpSdu3ayds3a/SIS+lAB4k/En2pqavInT5+g1n0FEUX2naNYuSTRaFTv3r37BRHRHxqAz+d7ZmtHO653XwZRoDQoReZPzxKNbmZ5w/IO4KH5xLzjJhyID7wZi8X0xJ9fowTDuasaARBQyXdZ/N5x+vr7GBsb+62IrDLGzNwzgKHBodpgMNgeaVpF5o0DfP2tJD97+51r9+vq6vjFosMs7/why5YtWxyNRvuAF+4k9h2VIJ1On4g9EpN//+YAyhKS6dmb1vjKpph57zB7vryHdevWfV9EgvcEIB6Px+rr6xeXWWnCzgjKY1jguXmdLgFP4nUCfi+RSMTb39//XRGR/xvA4/a8snPXTsxf9qM9oD1QEbBvBijcc8a+SW9vL5GPRfYAdbeLf8se2Dew78CmTZvcF08dp7I0g3KDduWbvziMMWAMyg2I4DIjJNOjdG/frkZHR4+KSIsxJvNBHh+YgaHBoVqfz/fo+vXrKD33E3TR3A1ocByH9MwM01cuk5qZATW3Lb3T3yMSaaKxsbG5vb29964ykEqlXuvq6tJXTh6musRBuUEVAMoDLhJXp0kmk2AMOSeXNxfJ/z5wicTkr9jx+R2Mj48Pi8gbxpird5yBocGhT4bD4fVrm5uonv0D2g3KLSiPoN1QVeUhmUhgWxZ+v59PNJWBMwVMgboCtsZvvUQoVElDQ0Owq6vrK/PKQCaT+XV/f79MvP0M1XIe0pchO4lk00jmEjK7Cq01Pp+P8vJyFoaA2eP5aE5BGlKTAb74pf2cPXv2WyJyyBgzeVuA+BPxp1asWBH0qgT25I8x3ixSkkNZWbTOoWyHRaEslmXh9XqpqKhgVeMl8M0ZY+VnnxpmOvc40WjUGj07+qKIdBtjcrcsQYm35Bv9O/p4/8hWlMtBuxyUO4d252cEFoWyiAgiglIKEcmbuv5Hbih1tfGpLW00LGvoBJbcMgMD8YE3Ozo77MmTR6j2p1Au5wYIFCDgURM8950l+Wt9iY0bz4AUohWlC1JjXJx6hf4d/YyNjf1SRFYbY1I3ARS2Xfvmh1uZer4e5XdQdkEuB9EmbyJQVZmgd9M/uei2qK7KkMteZ2wXAQSUDXioqn6UQHCMNWvWrGhra+sDXrypBLOzs7/r+WyP/OvIV1lQkr3R3HaumaPgzGUPnY+1saV3JRs/s5H/XPTljV1FAAtUGVAJVAEhksmn2fWFXbS0tPxARAI3AMTj8ViwPLi84aE6aqd/jrKcvOz8LGru7dFw8nQZExPnKS8vp6YmzB//Wps3tgHLBRIAKgrm1UAIv/9vaJ2idUOrt6enZ/AGANuyf7p3717GXvocYhnEcuZ0/dsXAFY3JggEAgQCfmpra1kTuVxIuw34gfICQOU1AAij9XN0dnXSvLr5cRFZCKCTieSB5ubmzUsrNd5Tz6ILHX+9is1XrHFZaYbGlWkqq+Ejjf/go5FzuBcoED8QLAAUFSwogG3nuHAhRP2yiGRmM1tij8QOWbZtf62jcyszr27Dqw1SkLLyovhBLdQ/3/nQ2nKe1ofPz2058QGlhQwErpnmr0uBEsCmpubvhMO7CYfDzUCDpbUW5aQ5PXEF7SnDTuXQiRx6Oov25JAihGKuzkW5illRQNl1hgsAT2FR8dNpCppm5coMLreLUCjUYWUymawvUG1tfvoU92skEkkAZ2JiwifGGJ7c9+R5y7KCxpjb/oO5FyOVTs0cO3bsRyMjI7+X4ulYRFzAQvLFul9H5gvyoI/n/wXy2/DuK2rGkQAAAABJRU5ErkJggg=="/>';
            counts += img + ' A polygon or circle must be drawn or a search result selected';
        } else {
            counts += 'Total portals:' + total; //should not happen
        }

        //intel doesn't filter density anymore, it's based on link length but the point is we warn about the zoom
        var minPortalLevel = 0;
        if (typeof getMinPortalLevel == 'function')//original IITC 0.26.0.20170108.21732
            minPortalLevel = getMinPortalLevel();
        else if (typeof getCurrentZoomTileParameters == 'function')
            minPortalLevel = getCurrentZoomTileParameters();//IITC-CE 0.29.1.20190315.122355
        if (minPortalLevel >= 2) {
            counts += '<p class="help" title="To reduce data usage and speed up map display, the backend servers only return some portals in dense areas."><b>Warning</b>: Poly counts can be inaccurate when zoomed out</p>';
        }

        //var total = self.work.enlP + self.work.resP + self.work.neuP + self.work.macP;
        var title = total + ' ' + (total == 1 ? 'portal' : 'portals');

        if (window.useAndroidPanes()) {
            $('<div id="polyCounts2" class="mobile">'
                + '<div class="ui-dialog-titlebar"><span class="ui-dialog-title ui-dialog-title-active">' + title + '</span></div>'
                + counts
                + '</div>').appendTo(document.body);
        } else {
            dialog({
                html: '<div id="polyCounts2">' + counts + '</div>',
                title: 'Poly counts: ' + title,
                width: 'auto'
            });
        }
    };

    window.plugin.polyCounts2.makeBar = function (portals, text, color, shift) {
        var self = window.plugin.polyCounts2;
        var g = $('<g>').attr('transform', 'translate(' + shift + ',0)');
        var sum = portals.reduce(function (a, b) { return a + b });
        var top = self.BAR_TOP;

        if (sum != 0) {
            for (var i = portals.length - 1; i >= 0; i--) {
                if (!portals[i])
                    continue;
                var height = self.BAR_HEIGHT * portals[i] / sum;
                $('<rect>')
                    .attr({
                        x: 0,
                        y: top,
                        width: self.BAR_WIDTH,
                        height: height,
                        fill: COLORS_LVL[i]
                    })
                    .appendTo(g);
                top += height;
            }
        }

        $('<text>')
            .html(text)
            .attr({
                x: self.BAR_WIDTH * 0.5,
                y: self.BAR_TOP * 0.75,
                fill: color,
                'text-anchor': 'middle'
            })
            .appendTo(g);

        return g;
    };

    window.plugin.polyCounts2.makePie = function (startAngle, endAngle, color) {
        if (startAngle == endAngle)
            return $([]); // return empty element query

        var self = window.plugin.polyCounts2;
        var large_arc = (endAngle - startAngle) > 0.5 ? 1 : 0;

        var labelAngle = (endAngle + startAngle) / 2;
        var label = Math.round((endAngle - startAngle) * 100) + '%';

        startAngle = 0.5 - startAngle;
        endAngle = 0.5 - endAngle;
        labelAngle = 0.5 - labelAngle;

        var p1x = Math.sin(startAngle * 2 * Math.PI) * self.RADIUS_INNER;
        var p1y = Math.cos(startAngle * 2 * Math.PI) * self.RADIUS_INNER;
        var p2x = Math.sin(endAngle * 2 * Math.PI) * self.RADIUS_INNER;
        var p2y = Math.cos(endAngle * 2 * Math.PI) * self.RADIUS_INNER;
        var lx = Math.sin(labelAngle * 2 * Math.PI) * self.RADIUS_INNER / 1.5;
        var ly = Math.cos(labelAngle * 2 * Math.PI) * self.RADIUS_INNER / 1.5;

        // for a full circle, both coordinates would be identical, so no circle would be drawn
        if (startAngle == 0.5 && endAngle == -0.5)
            p2x -= 1E-5;

        var text = $('<text>')
            .attr({
                'text-anchor': 'middle',
                'dominant-baseline': 'central',
                x: lx,
                y: ly
            })
            .html(label);

        var path = $('<path>')
            .attr({
                fill: color,
                d: self.format('M %s,%s A %s,%s 0 %s 1 %s,%s L 0,0 z', p1x, p1y, self.RADIUS_INNER, self.RADIUS_INNER, large_arc, p2x, p2y)
            });

        return path.add(text); // concat path and text
    };

    window.plugin.polyCounts2.makeRing = function (startAngle, endAngle, color) {
        var self = window.plugin.polyCounts2;
        var large_arc = (endAngle - startAngle) > 0.5 ? 1 : 0;

        startAngle = 0.5 - startAngle;
        endAngle = 0.5 - endAngle;

        var p1x = Math.sin(startAngle * 2 * Math.PI) * self.RADIUS_OUTER;
        var p1y = Math.cos(startAngle * 2 * Math.PI) * self.RADIUS_OUTER;
        var p2x = Math.sin(endAngle * 2 * Math.PI) * self.RADIUS_OUTER;
        var p2y = Math.cos(endAngle * 2 * Math.PI) * self.RADIUS_OUTER;
        var p3x = Math.sin(endAngle * 2 * Math.PI) * self.RADIUS_INNER;
        var p3y = Math.cos(endAngle * 2 * Math.PI) * self.RADIUS_INNER;
        var p4x = Math.sin(startAngle * 2 * Math.PI) * self.RADIUS_INNER;
        var p4y = Math.cos(startAngle * 2 * Math.PI) * self.RADIUS_INNER;

        // for a full circle, both coordinates would be identical, so no circle would be drawn
        if (startAngle == 0.5 && endAngle == -0.5) {
            p2x -= 1E-5;
            p3x -= 1E-5;
        }

        return $('<path>')
            .attr({
                fill: color,
                d: self.format('M %s,%s ', p1x, p1y)
                    + self.format('A %s,%s 0 %s 1 %s,%s ', self.RADIUS_OUTER, self.RADIUS_OUTER, large_arc, p2x, p2y)
                    + self.format('L %s,%s ', p3x, p3y)
                    + self.format('A %s,%s 0 %s 0 %s,%s ', self.RADIUS_INNER, self.RADIUS_INNER, large_arc, p4x, p4y)
                    + 'Z'
            });
    };

    window.plugin.polyCounts2.format = function (str) {
        var re = /%s/;
        for (var i = 1; i < arguments.length; i++) {
            str = str.replace(re, arguments[i]);
        }
        return str;
    };

    window.plugin.polyCounts2.onPaneChanged = function (pane) {
        if (pane == 'plugin-polyCounts2')
            window.plugin.polyCounts2.getPortals();
        else
            $('#polyCounts2').remove()
    };

    var setup = function () {
        //window.plugin.polyCounts2.loadExternals();
        if (window.useAndroidPanes()) {
            android.addPane('plugin-polyCounts2', 'Poly counts 2', 'ic_action_data_usage');
            addHook('paneChanged', window.plugin.polyCounts2.onPaneChanged);
        } else {
            $('#toolbox').append(' <a onclick="window.plugin.polyCounts2.getPortals()" title="Display a summary of portals in the current view">Poly counts 2</a>');
        }

        $('head').append('<style>' +
            '#polyCounts2.mobile {background: transparent; border: 0 none !important; height: 100% !important; width: 100% !important; left: 0 !important; top: 0 !important; position: absolute; overflow: auto; z-index: 9000 !important; }' +
            '#polyCounts2 table {margin-top:5px; border-collapse: collapse; empty-cells: show; width:100%; clear: both;}' +
            '#polyCounts2 table td, #polyCounts2 table th {border-bottom: 1px solid #0b314e; padding:3px; color:white; background-color:#1b415e}' +
            '#polyCounts2 table tr.res th {  background-color: #005684; }' +
            '#polyCounts2 table tr.enl th {  background-color: #017f01; }' +
            '#polyCounts2 table tr.mac th {  background-color: #D30000; }' +
            '#polyCounts2 table th { text-align: center;}' +
            '#polyCounts2 table td { text-align: center;}' +
            '#polyCounts2 table td.L0 { background-color: #000000 !important;}' +
            '#polyCounts2 table td.L1 { background-color: #FECE5A !important;}' +
            '#polyCounts2 table td.L2 { background-color: #FFA630 !important;}' +
            '#polyCounts2 table td.L3 { background-color: #FF7315 !important;}' +
            '#polyCounts2 table td.L4 { background-color: #E40000 !important;}' +
            '#polyCounts2 table td.L5 { background-color: #FD2992 !important;}' +
            '#polyCounts2 table td.L6 { background-color: #EB26CD !important;}' +
            '#polyCounts2 table td.L7 { background-color: #C124E0 !important;}' +
            '#polyCounts2 table td.L8 { background-color: #9627F4 !important;}' +
            '#polyCounts2 table td:nth-child(1) { text-align: left;}' +
            '#polyCounts2 table th:nth-child(1) { text-align: left;}' +
            '</style>');

        //backward compatibility for intel.ingress.com
        if (typeof window.TEAM_MAC == "undefined") {
            window.plugin.polyCounts2.machina_exists = false;
        }
        else {
            window.plugin.polyCounts2.machina_exists = true;
        }
    };

    // PLUGIN END //////////////////////////////////////////////////////////

    // PLUGIN END
    setup.info = plugin_info; //add the script info data to the function as a property
    if (!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);
    // if IITC has already booted, immediately run the 'setup' function
    if (window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
(document.body || document.head || document.documentElement).appendChild(script);

// PLUGIN END
