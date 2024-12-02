// ==UserScript==
// @author          Zetaphor
// @id              ingress_export@zetaphor
// @name            Ingress Portal CSV Export
// @category        Information
// @version         0.0.5
// @namespace       http://github.com/Zetaphor/IITC-Ingress-Portal-CSV-Export
// @updateURL       https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/zetaphor/ingress_export.meta.js
// @downloadURL     https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/zetaphor/ingress_export.user.js
// @description     Exports portals to a CSV list
// @antiFeatures    scraper|export
// @include         https://*ingress.com/intel*
// @include         http://*ingress.com/intel*
// @match           https://*ingress.com/intel*
// @match           http://*ingress.com/intel*
// @match           https://intel.ingress.com/*
// @match           http://intel.ingress.com/*
// @grant           none
// ==/UserScript==

/*global $:false */
/*global map:false */
/*global L:false */
function wrapper() {
    // in case IITC is not available yet, define the base plugin object
    if (typeof window.plugin !== "function") {
        window.plugin = function() {};
    }

    // base context for plugin
    window.plugin.portal_csv_export = function() {};
    var self = window.plugin.portal_csv_export;

    window.master_portal_list = {};
    window.portal_scraper_enabled = false;
    window.current_area_scraped = false;

    self.portalInScreen = function portalInScreen(p) {
        return map.getBounds().contains(p.getLatLng());
    };

    //  adapted from
    //+ Jonas Raoni Soares Silva
    //@ http://jsfromhell.com/math/is-point-in-poly [rev. #0]
    self.portalInPolygon = function portalInPolygon(polygon, portal) {
        var poly = polygon.getLatLngs();
        var pt = portal.getLatLng();
        var c = false;
        for (var i = -1, l = poly.length, j = l - 1; ++i < l; j = i) {
            ((poly[i].lat <= pt.lat && pt.lat < poly[j].lat) || (poly[j].lat <= pt.lat && pt.lat < poly[i].lat)) && (pt.lng < (poly[j].lng - poly[i].lng) * (pt.lat - poly[i].lat) / (poly[j].lat - poly[i].lat) + poly[i].lng) && (c = !c);
        }
        return c;
    };

    // return if the portal is within the drawtool objects.
    // Polygon and circles are available, and circles are implemented
    // as round polygons.
    self.portalInForm = function(layer) {
        if (layer instanceof L.Rectangle) {
            return true;
        }
        if (layer instanceof L.Circle) {
            return true;
        }
        return false;
    };

    self.portalInGeo = function(layer) {
        if (layer instanceof L.GeodesicPolygon) {
            return true;
        }
        if (layer instanceof L.GeodesicCircle) {
            return true;
        }
        return false;
    };

    self.portalInDrawnItems = function(portal) {
        var c = false;

        window.plugin.drawTools.drawnItems.eachLayer(function(layer) {
            if (!(self.portalInForm(layer) || self.portalInGeo(layer))) {
                return false;
            }

            if (self.portalInPolygon(layer, portal)) {
                c = true;
            }
        });
        return c;
    };

    self.inBounds = function(portal) {
        if (window.plugin.drawTools && window.plugin.drawTools.drawnItems.getLayers().length) {
            return self.portalInDrawnItems(portal);
        } else {
            return self.portalInScreen(portal);
        }
    };

    self.genStr = function genStr(title, image, lat, lng, portalGuid) {
        var href = lat + "," + lng;
        var str= "";
        str = title;
        str = str.replace(/\"/g, "\\\"");
        str = str.replace(";", "_");
        str = '"'+str+'"' + "," + href + "," + '"'+image+'"';
        if (window.plugin.keys && (typeof window.portals[portalGuid] !== "undefined")) {
            var keyCount =window.plugin.keys.keys[portalGuid] || 0;
            str = str + "," + keyCount;
        }
        return str;
    };

    self.genStrFromPortal = function genStrFromPortal(portal, portalGuid) {
        var lat = portal._latlng.lat,
            lng = portal._latlng.lng,
            title = portal.options.data.title || "untitled portal";
            image = portal.options.data.image || ""

        return self.genStr(title, image, lat, lng, portalGuid);
    };

    self.addPortalToExportList = function(portalStr, portalGuid) {
        if (typeof window.master_portal_list[portalGuid] == 'undefined') {
            window.master_portal_list[portalGuid] = portalStr;
            self.updateTotalScrapedCount()
        }
    };

    self.updateTotalScrapedCount = function() {
        $('#totalScrapedPortals').html(Object.keys(window.master_portal_list).length);
    };

    self.drawRectangle = function() {
        var bounds = window.map.getBounds();
        var bounds = [[bounds._southWest.lat, bounds._southWest.lng], [bounds._northEast.lat, bounds._northEast.lng]];
        L.rectangle(bounds, {color: "#00ff11", weight: 1, opacity: 0.9}).addTo(window.map);
    };

    self.managePortals = function managePortals(obj, portal, x) {
        if (self.inBounds(portal)) {
            var str = self.genStrFromPortal(portal, x);
            obj.list.push(str);
            obj.count += 1;
            self.addPortalToExportList(str, x);
        }
        return obj;

    };

    self.checkPortals = function checkPortals(portals) {
        var obj = {
            list: [],
            count: 0
        };
        for (var x in portals) {
            if (typeof window.portals[x] !== "undefined") {
                self.managePortals(obj, window.portals[x], x);
            }
        }
        return obj;
    };

    self.generateCsvData = function() {
        var csvData = 'Name, Latitude, Longitude, Image' + "\n";
        $.each(window.master_portal_list, function(key, value) {
            csvData += (value + "\n");
        });

        return csvData;
    };

    self.downloadCSV = function() {
        var csvData = self.generateCsvData();
        var link = document.createElement("a");
        link.download = 'Portal_Export.csv';
        link.href = "data:text/csv," + escape(csvData);
        link.click();
    }

    self.showDialog = function showDialog(o) {
        var csvData = self.generateCsvData();

        var data = `
        <form name='maxfield' action='#' method='post' target='_blank'>
            <div class="row">
                <div id='form_area' class="column" style="float:left;width:100%;box-sizing: border-box;padding-right: 5px;">
                    <textarea class='form_area'
                        name='portal_list_area'
                        rows='30'
                        placeholder='Zoom level must be 15 or higher for portal data to load'
                        style="width: 100%; white-space: nowrap;">${csvData}</textarea>
                </div>
            </div>
        </form>
        `;

        var dia = window.dialog({
            title: "Portal CSV Export",
            html: data
        }).parent();
        $(".ui-dialog-buttonpane", dia).remove();
        dia.css("width", "600px").css("top", ($(window).height() - dia.height()) / 2).css("left", ($(window).width() - dia.width()) / 2);
        return dia;
    };

    self.gen = function gen() {
        var dialog = self.showDialog(window.master_portal_list);
        return dialog;
    };

    self.setZoomLevel = function() {
        window.map.setZoom(15);
        $('#currentZoomLevel').html('15');
        self.updateZoomStatus();
    };

    self.updateZoomStatus = function() {
        var zoomLevel = window.map.getZoom();
        $('#currentZoomLevel').html(window.map.getZoom());
        if (zoomLevel != 15) {
            window.current_area_scraped = false;
            $('#currentZoomLevel').css('color', 'red');
            if (window.portal_scraper_enabled) $('#scraperStatus').html('Invalid Zoom Level').css('color', 'yellow');
        }
        else $('#currentZoomLevel').css('color', 'green');
    };

    self.updateTimer = function() {
        self.updateZoomStatus();
        if (window.portal_scraper_enabled) {
            if (window.map.getZoom() == 15) {
                if ($('#innerstatus > span.map > span').html() === 'done') {
                    if (!window.current_area_scraped) {
                        self.checkPortals(window.portals);
                        window.current_area_scraped = true;
                        $('#scraperStatus').html('Running').css('color', 'green');
                        self.drawRectangle();
                    } else {
                        $('#scraperStatus').html('Area Scraped').css('color', 'green');
                    }
                } else {
                    current_area_scraped = false;
                    $('#scraperStatus').html('Waiting For Map Data').css('color', 'yellow');
                }
            }
        }
    };

    self.panMap = function() {
        window.map.getBounds();
        window.map.panTo({lat: 40.974379, lng: -85.624982});
    };

    self.toggleStatus = function() {
        if (window.portal_scraper_enabled) {
            window.portal_scraper_enabled = false;
            $('#scraperStatus').html('Stopped').css('color', 'red');
            $('#startScraper').show();
            $('#stopScraper').hide();
            $('#csvControlsBox').hide();
            $('#totalPortals').hide();
        } else {
            window.portal_scraper_enabled = true;
            $('#scraperStatus').html('Running').css('color', 'green');
            $('#startScraper').hide();
            $('#stopScraper').show();
            $('#csvControlsBox').show();
            $('#totalPortals').show();
            self.updateTotalScrapedCount();
        }

    };

    // setup function called by IITC
    self.setup = function init() {
        // add controls to toolbox
        var link = $("");
        $("#toolbox").append(link);

        var csvToolbox = `
        <div id="csvToolbox" style="position: relative;">
            <p style="margin: 5px 0 5px 0; text-align: center; font-weight: bold;">Portal CSV Exporter</p>
            <a id="startScraper" style="position: absolute; top: 0; left: 0; margin: 0 5px 0 5px;" onclick="window.plugin.portal_csv_export.toggleStatus();" title="Start the portal data scraper">Start</a>
            <a id="stopScraper" style="position: absolute; top: 0; left: 0; display: none; margin: 0 5px 0 5px;" onclick="window.plugin.portal_csv_export.toggleStatus();" title="Stop the portal data scraper">Stop</a>

            <div class="zoomControlsBox" style="margin-top: 5px; padding: 5px 0 5px 5px;">
                Current Zoom Level: <span id="currentZoomLevel">0</span>
                <a style="margin: 0 5px 0 5px;" onclick="window.plugin.portal_csv_export.setZoomLevel();" title="Set zoom level to enable portal data download.">Set Zoom Level</a>
            </div>

            <p style="margin:0 0 0 5px;">Scraper Status: <span style="color: red;" id="scraperStatus">Stopped</span></p>
            <p id="totalPortals" style="display: none; margin:0 0 0 5px;">Total Portals Scraped: <span id="totalScrapedPortals">0</span></p>

            <div id="csvControlsBox" style="display: none; margin-top: 5px; padding: 5px 0 5px 5px; border-top: 1px solid #20A8B1;">
                <a style="margin: 0 5px 0 5px;" onclick="window.plugin.portal_csv_export.gen();" title="View the CSV portal data.">View Data</a>
                <a style="margin: 0 5px 0 5px;" onclick="window.plugin.portal_csv_export.downloadCSV();" title="Download the CSV portal data.">Download CSV</a>
            </div>
        </div>
        `;

        $(csvToolbox).insertAfter('#toolbox');

        window.csvUpdateTimer = window.setInterval(self.updateTimer, 500);

        // delete self to ensure init can't be run again
        delete self.init;
    };
    // IITC plugin setup
    if (window.iitcLoaded && typeof self.setup === "function") {
        self.setup();
    } else if (window.bootPlugins) {
        window.bootPlugins.push(self.setup);
    } else {
        window.bootPlugins = [self.setup];
    }
}
// inject plugin into page
var script = document.createElement("script");
script.appendChild(document.createTextNode("(" + wrapper + ")();"));
(document.body || document.head || document.documentElement)
.appendChild(script);
