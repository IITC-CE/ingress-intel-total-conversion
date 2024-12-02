// ==UserScript==
// @author         McBen
// @name           KMLImport
// @id             KMLImport@McBen
// @category       Draw
// @version        1.0.1
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/McBen/KMLImport.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/McBen/KMLImport.user.js
// @description    Import KML/GPX/Geojson/TCX into DrawTools
// @icon64         data:image/png;base64,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
// @depends        draw-tools@breunigs
// @include        https://intel.ingress.com/*
// ==/UserScript==

function wrapper(SCRIPT_INFO) {
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 520:
/***/ (function (__unused_webpack_module, exports) {

                    !function (e, t) { true ? t(exports) : 0 }(this, (function (e) { "use strict"; function t(e) { return e && e.normalize && e.normalize(), e && e.textContent || "" } function n(e, t) { const n = e.getElementsByTagName(t); return n.length ? n[0] : null } function o(e) { const o = {}; if (e) { const s = n(e, "line"); if (s) { const e = t(n(s, "color")), r = parseFloat(t(n(s, "opacity"))), i = parseFloat(t(n(s, "width"))); e && (o.stroke = e), isNaN(r) || (o["stroke-opacity"] = r), isNaN(i) || (o["stroke-width"] = 96 * i / 25.4) } } return o } function s(e, o) { const s = {}; let r, i; for (i = 0; i < o.length; i++)r = n(e, o[i]), r && (s[o[i]] = t(r)); return s } function r(e) { const n = s(e, ["name", "cmt", "desc", "type", "time", "keywords"]), o = e.getElementsByTagNameNS("http://www.garmin.com/xmlschemas/GpxExtensions/v3", "*"); for (let s = 0; s < o.length; s++) { const r = o[s]; r.parentNode.parentNode === e && (n[r.tagName.replace(":", "_")] = t(r)) } const r = e.getElementsByTagName("link"); r.length && (n.links = []); for (let e = 0; e < r.length; e++)n.links.push(Object.assign({ href: r[e].getAttribute("href") }, s(r[e], ["text", "type"]))); return n } function i(e) { const o = [parseFloat(e.getAttribute("lon")), parseFloat(e.getAttribute("lat"))], s = n(e, "ele"), r = n(e, "gpxtpx:hr") || n(e, "hr"), i = n(e, "time"); let l; s && (l = parseFloat(t(s)), isNaN(l) || o.push(l)); const a = { coordinates: o, time: i ? t(i) : null, extendedValues: [] }; r && a.extendedValues.push(["heart", parseFloat(t(r))]); const c = n(e, "extensions"); if (null !== c) for (const e of ["speed", "course", "hAcc", "vAcc"]) { const o = parseFloat(t(n(c, e))); isNaN(o) || a.extendedValues.push([e, o]) } return a } function l(e) { const t = a(e, "rtept"); if (t) return { type: "Feature", properties: Object.assign(r(e), o(n(e, "extensions")), { _gpxType: "rte" }), geometry: { type: "LineString", coordinates: t.line } } } function a(e, t) { const n = e.getElementsByTagName(t); if (n.length < 2) return; const o = [], s = [], r = {}; for (let e = 0; e < n.length; e++) { const t = i(n[e]); o.push(t.coordinates), t.time && s.push(t.time); for (let o = 0; o < t.extendedValues.length; o++) { const [s, i] = t.extendedValues[o], l = "heart" === s ? s : s + "s"; r[l] || (r[l] = Array(n.length).fill(null)), r[l][e] = i } } return { line: o, times: s, extendedValues: r } } function c(e) { const t = e.getElementsByTagName("trkseg"), s = [], i = [], l = []; for (let e = 0; e < t.length; e++) { const n = a(t[e], "trkpt"); n && (l.push(n), n.times && n.times.length && i.push(n.times)) } if (0 === l.length) return; const c = l.length > 1, g = Object.assign(r(e), o(n(e, "extensions")), { _gpxType: "trk" }, i.length ? { coordinateProperties: { times: c ? i : i[0] } } : {}); for (let e = 0; e < l.length; e++) { const t = l[e]; s.push(t.line); for (const [n, o] of Object.entries(t.extendedValues)) { let t = g; "heart" === n && (g.coordinateProperties || (g.coordinateProperties = {}), t = g.coordinateProperties), c ? (t[n] || (t[n] = l.map((e => new Array(e.line.length).fill(null)))), t[n][e] = o) : t[n] = o } } return { type: "Feature", properties: g, geometry: c ? { type: "MultiLineString", coordinates: s } : { type: "LineString", coordinates: s[0] } } } function* g(e) { const t = e.getElementsByTagName("trk"), n = e.getElementsByTagName("rte"), o = e.getElementsByTagName("wpt"); for (let e = 0; e < t.length; e++) { const n = c(t[e]); n && (yield n) } for (let e = 0; e < n.length; e++) { const t = l(n[e]); t && (yield t) } for (let e = 0; e < o.length; e++)yield (a = o[e], { type: "Feature", properties: Object.assign(r(a), s(a, ["sym"])), geometry: { type: "Point", coordinates: i(a).coordinates } }); var a } const u = [["heartRate", "heartRates"], ["Cadence", "cadences"], ["Speed", "speeds"], ["Watts", "watts"]], m = [["TotalTimeSeconds", "totalTimeSeconds"], ["DistanceMeters", "distanceMeters"], ["MaximumSpeed", "maxSpeed"], ["AverageHeartRateBpm", "avgHeartRate"], ["MaximumHeartRateBpm", "maxHeartRate"], ["AvgSpeed", "avgSpeed"], ["AvgWatts", "avgWatts"], ["MaxWatts", "maxWatts"]]; function p(e, o) { const s = []; for (const [r, i] of o) { let o = n(e, r); if (!o) { const t = e.getElementsByTagNameNS("http://www.garmin.com/xmlschemas/ActivityExtension/v2", r); t.length && (o = t[0]) } const l = parseFloat(t(o)); isNaN(l) || s.push([i, l]) } return s } function h(e) { const o = t(n(e, "LongitudeDegrees")), s = t(n(e, "LatitudeDegrees")); if (!o.length || !s.length) return null; const r = [parseFloat(o), parseFloat(s)], i = n(e, "AltitudeMeters"), l = n(e, "HeartRateBpm"), a = n(e, "Time"); let c; return i && (c = parseFloat(t(i)), isNaN(c) || r.push(c)), { coordinates: r, time: a ? t(a) : null, heartRate: l ? parseFloat(t(l)) : null, extensions: p(e, u) } } function f(e, t) { const n = e.getElementsByTagName(t), o = [], s = [], r = []; if (n.length < 2) return null; const i = { extendedProperties: {} }; for (let e = 0; e < n.length; e++) { const t = h(n[e]); if (null !== t) { o.push(t.coordinates), t.time && s.push(t.time), t.heartRate && r.push(t.heartRate); for (const [o, s] of t.extensions) i.extendedProperties[o] || (i.extendedProperties[o] = Array(n.length).fill(null)), i.extendedProperties[o][e] = s } } return Object.assign(i, { line: o, times: s, heartRates: r }) } function d(e) { const o = e.getElementsByTagName("Track"), s = [], r = [], i = [], l = []; let a; const c = function (e) { const t = {}; for (const [n, o] of e) t[n] = o; return t }(p(e, m)), g = n(e, "Name"); g && (c.name = t(g)); for (let e = 0; e < o.length; e++)a = f(o[e], "Trackpoint"), a && (s.push(a.line), a.times.length && r.push(a.times), a.heartRates.length && i.push(a.heartRates), l.push(a.extendedProperties)); for (let e = 0; e < l.length; e++) { const t = l[e]; for (const n in t) 1 === o.length ? c[n] = a.extendedProperties[n] : (c[n] || (c[n] = s.map((e => Array(e.length).fill(null)))), c[n][e] = t[n]) } if (0 !== s.length) return (r.length || i.length) && (c.coordinateProperties = Object.assign(r.length ? { times: 1 === s.length ? r[0] : r } : {}, i.length ? { heart: 1 === s.length ? i[0] : i } : {})), { type: "Feature", properties: c, geometry: { type: 1 === s.length ? "LineString" : "MultiLineString", coordinates: 1 === s.length ? s[0] : s } } } function* y(e) { const t = e.getElementsByTagName("Lap"); for (let e = 0; e < t.length; e++) { const n = d(t[e]); n && (yield n) } const n = e.getElementsByTagName("Courses"); for (let e = 0; e < n.length; e++) { const t = d(n[e]); t && (yield t) } } const N = /\s*/g, x = /^\s*|\s*$/g, T = /\s+/; function b(e) { if (!e || !e.length) return 0; let t = 0; for (let n = 0; n < e.length; n++)t = (t << 5) - t + e.charCodeAt(n) | 0; return t } function S(e) { return e.replace(N, "").split(",").map(parseFloat) } function k(e) { return e.replace(x, "").split(T).map(S) } function A(e) { if (void 0 !== e.xml) return e.xml; if (e.tagName) { let t = e.tagName; for (let n = 0; n < e.attributes.length; n++)t += e.attributes[n].name + e.attributes[n].value; for (let n = 0; n < e.childNodes.length; n++)t += A(e.childNodes[n]); return t } return "#text" === e.nodeName ? (e.nodeValue || e.value || "").trim() : "#cdata-section" === e.nodeName ? e.nodeValue : "" } const B = ["Polygon", "LineString", "Point", "Track", "gx:Track"]; function E(e, o, s) { let r = t(n(o, "color")) || ""; const i = "stroke" == s || "fill" === s ? s : s + "-color"; "#" === r.substr(0, 1) && (r = r.substr(1)), 6 === r.length || 3 === r.length ? e[i] = r : 8 === r.length && (e[s + "-opacity"] = parseInt(r.substr(0, 2), 16) / 255, e[i] = "#" + r.substr(6, 2) + r.substr(4, 2) + r.substr(2, 2)) } function F(e, o, s, r) { const i = parseFloat(t(n(o, s))); isNaN(i) || (e[r] = i) } function P(e) { let n = e.getElementsByTagName("coord"); const o = [], s = []; 0 === n.length && (n = e.getElementsByTagName("gx:coord")); for (let e = 0; e < n.length; e++)o.push(t(n[e]).split(" ").map(parseFloat)); const r = e.getElementsByTagName("when"); for (let e = 0; e < r.length; e++)s.push(t(r[e])); return { coords: o, times: s } } function v(e) { let o, s, r, i, l; const a = [], c = []; if (n(e, "MultiGeometry")) return v(n(e, "MultiGeometry")); if (n(e, "MultiTrack")) return v(n(e, "MultiTrack")); if (n(e, "gx:MultiTrack")) return v(n(e, "gx:MultiTrack")); for (r = 0; r < B.length; r++)if (s = e.getElementsByTagName(B[r]), s) for (i = 0; i < s.length; i++)if (o = s[i], "Point" === B[r]) a.push({ type: "Point", coordinates: S(t(n(o, "coordinates"))) }); else if ("LineString" === B[r]) a.push({ type: "LineString", coordinates: k(t(n(o, "coordinates"))) }); else if ("Polygon" === B[r]) { const e = o.getElementsByTagName("LinearRing"), s = []; for (l = 0; l < e.length; l++)s.push(k(t(n(e[l], "coordinates")))); a.push({ type: "Polygon", coordinates: s }) } else if ("Track" === B[r] || "gx:Track" === B[r]) { const e = P(o); a.push({ type: "LineString", coordinates: e.coords }), e.times.length && c.push(e.times) } return { geoms: a, coordTimes: c } } function L(e, o, s, r) { const i = v(e); let l; const a = {}, c = t(n(e, "name")), g = t(n(e, "address")); let u = t(n(e, "styleUrl")); const m = t(n(e, "description")), p = n(e, "TimeSpan"), h = n(e, "TimeStamp"), f = n(e, "ExtendedData"); let d = n(e, "IconStyle"), y = n(e, "LabelStyle"), N = n(e, "LineStyle"), x = n(e, "PolyStyle"); const T = n(e, "visibility"); if (c && (a.name = c), g && (a.address = g), u) { "#" !== u[0] && (u = "#" + u), a.styleUrl = u, o[u] && (a.styleHash = o[u]), s[u] && (a.styleMapHash = s[u], a.styleHash = o[s[u].normal]); const e = r[a.styleHash]; e && (d || (d = n(e, "IconStyle")), y || (y = n(e, "LabelStyle")), N || (N = n(e, "LineStyle")), x || (x = n(e, "PolyStyle"))) } if (m && (a.description = m), p) { const e = t(n(p, "begin")), o = t(n(p, "end")); a.timespan = { begin: e, end: o } } if (h && (a.timestamp = t(n(h, "when"))), d) { E(a, d, "icon"), F(a, d, "scale", "icon-scale"), F(a, d, "heading", "icon-heading"); const e = n(d, "hotSpot"); if (e) { const t = parseFloat(e.getAttribute("x")), n = parseFloat(e.getAttribute("y")); isNaN(t) || isNaN(n) || (a["icon-offset"] = [t, n]) } const o = n(d, "Icon"); if (o) { const e = t(n(o, "href")); e && (a.icon = e) } } if (y && (E(a, y, "label"), F(a, y, "scale", "label-scale")), N && (E(a, N, "stroke"), F(a, N, "width", "stroke-width")), x) { E(a, x, "fill"); const e = t(n(x, "fill")), o = t(n(x, "outline")); e && (a["fill-opacity"] = "1" === e ? a["fill-opacity"] || 1 : 0), o && (a["stroke-opacity"] = "1" === o ? a["stroke-opacity"] || 1 : 0) } if (f) { const e = f.getElementsByTagName("Data"), o = f.getElementsByTagName("SimpleData"); for (l = 0; l < e.length; l++)a[e[l].getAttribute("name")] = t(n(e[l], "value")); for (l = 0; l < o.length; l++)a[o[l].getAttribute("name")] = t(o[l]) } T && (a.visibility = t(T)), i.coordTimes.length && (a.coordinateProperties = { times: 1 === i.coordTimes.length ? i.coordTimes[0] : i.coordTimes }); const b = { type: "Feature", geometry: 0 === i.geoms.length ? null : 1 === i.geoms.length ? i.geoms[0] : { type: "GeometryCollection", geometries: i.geoms }, properties: a }; return e.getAttribute("id") && (b.id = e.getAttribute("id")), b } function* M(e) { const o = {}, s = {}, r = {}, i = e.getElementsByTagName("Placemark"), l = e.getElementsByTagName("Style"), a = e.getElementsByTagName("StyleMap"); for (let e = 0; e < l.length; e++) { const t = b(A(l[e])).toString(16); o["#" + l[e].getAttribute("id")] = t, s[t] = l[e] } for (let e = 0; e < a.length; e++) { o["#" + a[e].getAttribute("id")] = b(A(a[e])).toString(16); const s = a[e].getElementsByTagName("Pair"), i = {}; for (let e = 0; e < s.length; e++)i[t(n(s[e], "key"))] = t(n(s[e], "styleUrl")); r["#" + a[e].getAttribute("id")] = i } for (let e = 0; e < i.length; e++) { const t = L(i[e], o, r, s); t && (yield t) } } e.gpx = function (e) { return { type: "FeatureCollection", features: Array.from(g(e)) } }, e.gpxGen = g, e.kml = function (e) { return { type: "FeatureCollection", features: Array.from(M(e)) } }, e.kmlGen = M, e.tcx = function (e) { return { type: "FeatureCollection", features: Array.from(y(e)) } }, e.tcxGen = y, Object.defineProperty(e, "__esModule", { value: !0 }) }));
                    //# sourceMappingURL=togeojson.umd.js.map


                    /***/
})

            /******/
});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
                /******/
}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
                /******/
};
/******/
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
            /******/
}
        /******/
        /************************************************************************/
        var __webpack_exports__ = {};
        // This entry need to be wrapped in an IIFE because it need to be in strict mode.
        (() => {
            "use strict";

            ;// CONCATENATED MODULE: ./node_modules/iitcpluginkit/dist/Plugin.js
            /*
            *   Usage example:
            
                import * as Plugin from "../plugin";
            
                class myPlugin implements Plugin.Class {
                    init() {
                        console.log("Hello World!");
                    }
                }
            
                Plugin.Register(new myPlugin(), "myPlugin");
            */
            /// <reference path="./types/index.d.ts" />
            function Register(plugin, name) {
                const setup = () => {
                    window.plugin[name] = plugin;
                    window.plugin[name].init();
                };
                setup.info = SCRIPT_INFO;
                if (!window.bootPlugins) {
                    window.bootPlugins = [];
                }
                window.bootPlugins.push(setup);
                if (window.iitcLoaded) {
                    setup();
                }
            }

            // EXTERNAL MODULE: ./node_modules/@tmcw/togeojson/dist/togeojson.umd.js
            var togeojson_umd = __webpack_require__(520);
            ;// CONCATENATED MODULE: ./src/Vector.ts
            class Vector {
                constructor(x, y, z) {
                    this.x = x;
                    this.y = y;
                    this.z = z;
                }
                static fromCartesian(p) {
                    const d2r = Math.PI / 180;
                    const lat = p.lat * d2r;
                    const lng = p.lng * d2r;
                    const o = Math.cos(lat);
                    return new Vector(o * Math.cos(lng), o * Math.sin(lng), Math.sin(lat));
                }
                cross(n) {
                    return new Vector(this.y * n.z - this.z * n.y, this.z * n.x - this.x * n.z, this.x * n.y - this.y * n.x);
                }
                dot(n) {
                    return this.x * n.x + this.y * n.y + this.z * n.z;
                }
                sub(p2) {
                    return new Vector(this.x - p2.x, this.y - p2.y, this.z - p2.z);
                }
                length() {
                    return Math.sqrt(this.x * this.x * +this.y * this.y + this.z * this.z);
                }
            }

            ;// CONCATENATED MODULE: ./src/Point.ts

            class Point {
                constructor(p) {
                    this.coordinate = p;
                    this.xyz = Vector.fromCartesian(p);
                }
            }

            ;// CONCATENATED MODULE: ./src/Polygon.ts

            class Polygon {
                constructor(base, isClosed) {
                    this.polygon = base;
                    this.isClosed = isClosed;
                    const lls = this.polygon.getLatLngs();
                    this.points = lls.map(p => new Point(p));
                    this.optimized = this.points;
                }
                getPointCount() {
                    return this.optimized.length;
                }
                optimize(tolerance) {
                    const points = this.filterDuplicates(this.points);
                    this.optimized = this.douglasPeucker(points, tolerance);
                }
                filterDuplicates(points) {
                    return points.filter((p, index) => index === 0 || !p.coordinate.equals(points[index - 1].coordinate));
                }
                douglasPeucker(points, tolerance) {
                    if (this.isClosed) {
                        const split = this.findFarrestPoint(points);
                        const left = this.douglasStep(points.slice(0, split + 1), tolerance);
                        const right = this.douglasStep(points.slice(split), tolerance);
                        return [...left.slice(0, -1), ...right];
                    }
                    else {
                        return this.douglasStep(points, tolerance);
                    }
                }
                douglasStep(points, tolerance) {
                    if (points.length < 3) {
                        return points;
                    }
                    const [split, distance] = this.findFarrestPointFromLine(points);
                    if (distance > tolerance) {
                        const left = this.douglasStep(points.slice(0, split + 1), tolerance);
                        const right = this.douglasStep(points.slice(split), tolerance);
                        return [...left.slice(0, -1), ...right];
                    }
                    else {
                        return [points[0], points[points.length - 1]];
                    }
                }
                findFarrestPointFromLine(points) {
                    const first = points[0];
                    const last = points[points.length - 1];
                    const basePlane = first.xyz.cross(last.xyz);
                    const planeLength = basePlane.length();
                    if (length === 0)
                        return [0, 0];
                    let maxDistance = 0;
                    let maxIndex = 0;
                    for (let i = 1; i < points.length; i++) {
                        const distance = Math.abs(points[i].xyz.sub(first.xyz).dot(basePlane));
                        if (distance > maxDistance) {
                            maxDistance = distance;
                            maxIndex = i;
                        }
                    }
                    maxDistance /= planeLength;
                    return [maxIndex, maxDistance];
                }
                findFarrestPoint(points) {
                    const first = points[0];
                    let maxDistance = 0;
                    let maxIndex = 0;
                    for (let i = 1; i < points.length; i++) {
                        const distance = points[i].xyz.sub(first.xyz).length();
                        if (distance > maxDistance) {
                            maxDistance = distance;
                            maxIndex = i;
                        }
                    }
                    return maxIndex;
                }
                update() {
                    const lls = this.optimized.map(p => p.coordinate);
                    this.polygon.setLatLngs(lls);
                }
            }

            ;// CONCATENATED MODULE: ./src/Optimize.ts

            class Optimize {
                constructor() {
                    this.polygons = [];
                }
                show() {
                    const html = $("<div>").append($("<div>", { id: "polystats" }), $("<div>", { id: "polyslide" }).append($("<input>", { type: "range", min: "0", max: "1000", value: "0", id: "tolerance", width: "100%" })
                        .on("input", () => this.optimize())));
                    this.dialog = dialog({
                        title: "Optimize",
                        html,
                        buttons: {
                            "OK": () => this.close()
                        },
                        closeCallback: () => {
                            const drawTools = window.plugin.drawTools;
                            drawTools.drawnItems.clearLayers();
                            drawTools.load();
                        }
                    });
                    this.readPolygons();
                }
                close() {
                    window.plugin.drawTools.save();
                    this.dialog.dialog("close");
                }
                readPolygons() {
                    this.polygons = [];
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                    window.plugin.drawTools.drawnItems.eachLayer((layer) => {
                        if (layer instanceof L.GeodesicPolygon || layer instanceof L.Polygon) {
                            this.polygons.push(new Polygon(layer, true));
                        }
                        else if (layer instanceof L.GeodesicPolyline || layer instanceof L.Polyline) {
                            this.polygons.push(new Polygon(layer, false));
                        }
                    });
                    this.startCount = this.polygons.reduce((sum, poly) => sum + poly.getPointCount(), 0);
                    this.updateStats();
                }
                updateStats() {
                    const pointCount = this.polygons.reduce((sum, poly) => sum + poly.getPointCount(), 0);
                    const status = `Polygons: ${this.polygons.length}<br>Total Points: ${pointCount} (was ${this.startCount})`;
                    $("#polystats", this.dialog).html(status);
                }
                optimize() {
                    const tolerance = parseInt($("#tolerance", this.dialog).val());
                    this.polygons.forEach(p => {
                        p.optimize(tolerance * 1e-6);
                        p.update();
                    });
                    this.updateStats();
                }
            }

            ;// CONCATENATED MODULE: ./src/Main.ts



            class KMLImport {
                constructor() {
                    this.optimize = () => {
                        new Optimize().show();
                    };
                }
                init() {
                    console.log("KMLImport " + "v1.0.1");
                    this.monkeyPatchDrawTools();
                }
                monkeyPatchDrawTools() {
                    if (typeof window.plugin.drawTools !== "function") {
                        alert("KMLImport requires DrawTools");
                        return;
                    }
                    this.DTmanualOpt = window.plugin.drawTools.manualOpt;
                    window.plugin.drawTools.manualOpt = () => this.manualOpt();
                }
                manualOpt() {
                    this.DTmanualOpt();
                    const newButton = $("<a>", {
                        click: (event) => {
                            void this.import();
                            $(event.target).blur();
                        },
                        tabindex: "0",
                        text: "Import",
                        title: "Import DrawTools/KML/GPX/Geojson/TCX"
                    });
                    const importButton = $(".drawtoolsSetbox a:contains(Import Drawn Items)");
                    if (importButton.length === 1) {
                        importButton.replaceWith(newButton);
                    }
                    else {
                        $(".drawtoolsSetbox a:eq(1)").after(newButton);
                    }
                    $(".drawtoolsSetbox a:last").before($("<a>", {
                        click: () => this.optimize(),
                        tabindex: "0",
                        text: "Optimize"
                    }));
                }
                async import() {
                    const files = await this.fileChooser();
                    const text = await this.readFile(files[0]);
                    const DTitems = this.convert2DrawTools(text);
                    if (!DTitems)
                        return;
                    this.importIntoDrawTools(DTitems);
                }
                convert2DrawTools(text) {
                    try {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        const json = JSON.parse(text);
                        // DrawTools
                        if (json[0] && json[0].type && ["polygon", "circle", "polyline", "marker"].includes(json[0].type)) {
                            return json;
                        }
                        // GeoJSON
                        if (json.type && json.type === "FeatureCollection") {
                            return this.convertGeoJSON(json);
                        }
                    }
                    catch ( /* ignore */_a) { /* ignore */ }
                    if (text.search(/^\s*<?xml</)) {
                        const content = (new window.DOMParser()).parseFromString(text, "text/xml");
                        // KML
                        if (content.getElementsByTagName("kml")) {
                            const converted = togeojson_umd.kml(content);
                            return this.convertGeoJSON(converted);
                        }
                        // GPX
                        if (content.getElementsByTagName("gpx")) {
                            const converted = togeojson_umd.gpx(content);
                            return this.convertGeoJSON(converted);
                        }
                        // TCX
                        if (content.getElementsByTagName("TrainingCenterDatabase")) {
                            const converted = togeojson_umd.tcx(content);
                            return this.convertGeoJSON(converted);
                        }
                    }
                    alert("unrecognized file type");
                    return;
                }
                convertGeoJSON(geo) {
                    const DTitems = [];
                    if (geo.features) {
                        geo.features.forEach(feature => this.createPoly(feature, DTitems));
                    }
                    else {
                        this.createPoly(geo.features, DTitems);
                    }
                    const DTLayer = window.plugin.drawTools.drawnItems;
                    if (!window.plugin.drawTools.merge || !window.plugin.drawTools.merge.status) {
                        DTLayer.clearLayers();
                    }
                    return DTitems;
                }
                createPoly(feature, items) {
                    if (feature.type !== "Feature") {
                        console.log("skipping data-block", feature.type);
                        return;
                    }
                    if (!feature.geometry) {
                        console.log("block has no data", feature);
                        return;
                    }
                    let latLng;
                    let latLngs;
                    switch (feature.geometry.type) {
                        case "Point":
                            latLng = L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
                            items.push({ type: "marker", latLng });
                            break;
                        case "MultiPoint":
                            feature.geometry.coordinates.forEach(point => {
                                latLng = L.latLng(point[1], point[0]);
                                items.push({ type: "marker", latLng });
                            });
                            break;
                        case "LineString":
                            latLngs = feature.geometry.coordinates.map(point => {
                                return L.latLng(point[1], point[0]);
                            });
                            if (latLngs.length === 0) {
                                console.error("LineString without coordinates", feature);
                                return;
                            }
                            items.push({ type: "polyline", latLngs });
                            break;
                        case "MultiLineString":
                            feature.geometry.coordinates.forEach(line => {
                                latLngs = line.map(point => {
                                    return L.latLng(point[1], point[0]);
                                });
                                if (latLngs.length > 1) {
                                    items.push({ type: "polyline", latLngs });
                                }
                            });
                            break;
                        case "Polygon":
                            feature.geometry.coordinates.forEach(poly => {
                                latLngs = poly.map(point => {
                                    return L.latLng(point[1], point[0]);
                                });
                                if (latLngs.length > 1) {
                                    items.push({ type: "polygon", latLngs });
                                }
                            });
                            break;
                        case "MultiPolygon":
                            feature.geometry.coordinates.forEach(multipoly => {
                                multipoly.forEach(poly => {
                                    latLngs = poly.map(point => {
                                        return L.latLng(point[1], point[0]);
                                    });
                                    if (latLngs.length > 1) {
                                        items.push({ type: "polygon", latLngs });
                                    }
                                });
                            });
                            break;
                        default:
                            console.error("unrecognized geometry type");
                    }
                }
                importIntoDrawTools(data) {
                    const drawTools = window.plugin.drawTools;
                    if (!drawTools.merge || !drawTools.merge.status) {
                        drawTools.drawnItems.clearLayers();
                    }
                    try {
                        drawTools.import(data);
                    }
                    catch (_a) {
                        drawTools.optAlert('<span style="color: #f88">Import failed</span>');
                    }
                    drawTools.save();
                }
                async fileChooser() {
                    return new Promise((resolve, reject) => {
                        const fileInput = L.DomUtil.create("input", "hidden");
                        fileInput.type = "file";
                        fileInput.accept = ".gpx,.tcx,.kml,.json,.geojson";
                        fileInput.style.display = "none";
                        fileInput.addEventListener("change", () => {
                            if (fileInput.files !== null) {
                                resolve(fileInput.files);
                            }
                            else {
                                reject();
                            }
                        }, false);
                        fileInput.click();
                    });
                }
                async readFile(file) {
                    return new Promise((resolve, reject) => {
                        const fr = new FileReader();
                        fr.addEventListener("load", () => {
                            if (fr.result !== null) {
                                resolve(fr.result);
                            }
                            else {
                                reject();
                            }
                        });
                        fr.addEventListener("error", reject);
                        fr.readAsText(file);
                    });
                }
            }
            Register(new KMLImport(), "KMLImport");

        })();

        /******/
})()
        ;
};
(function () {
    const info = {};
    if (typeof GM_info !== 'undefined' && GM_info && GM_info.script)
        info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
    if (typeof unsafeWindow != 'undefined' || typeof GM_info == 'undefined' || GM_info.scriptHandler != 'Tampermonkey') {
        const script = document.createElement('script');
        script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
        document.head.appendChild(script);
    }
    else wrapper(info);
})();