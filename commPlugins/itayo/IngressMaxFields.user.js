// ==UserScript==
// @author         itayo
// @id             IngressMaxFields@itayo
// @name           Ingress Maxfields
// @category       Information
// @version        0.2.0.0
// @namespace      http://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/itayo/IngressMaxFields.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/itayo/IngressMaxFields.user.js
// @description    Exports portals in the format for http://www.ingress-maxfield.com/ and allow direct transfer to site
// @include        https://intel.ingress.com/*
// @match          https://intel.ingress.com/*
// @grant          none
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
    window.plugin.ingressmaxfield = function() {};
    var self = window.plugin.ingressmaxfield;

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
  
    self.genStr = function genStr(title, lat, lng, portalGuid) {
        var href = "https://www.ingress.com/intel?ll=" + lat + "," + lng + "&z=17&pll=" + lat + "," + lng;
        var str = "";
        var keyCount = 0;

        str = title;
        str = str.replace(/\"/g, "\\\"");
        str = str.replace(";", " ");
        str = str + ";" + href;

        if (typeof window.portals[portalGuid] !== "undefined") {

            if (window.plugin.keys) {
                keyCount = window.plugin.keys.keys[portalGuid] || 0;

            } else if (window.plugin.LiveInventory && typeof window.plugin.LiveInventory.keyMap[portalGuid] !== "undefined") {
                keyCount = window.plugin.LiveInventory.keyMap[portalGuid].count;
            }
            str = str + ";" + keyCount;
        }
        return str;
    };

    self.genStrFromPortal = function genStrFromPortal(portal, portalGuid) {
        var lat = portal._latlng.lat,
            lng = portal._latlng.lng,
            title = portal.options.data.title || portal.label || "untitled portal";

        return self.genStr(title, lat, lng, portalGuid);
    };

    self.managePortals = function managePortals(obj, portal, x) {
        if (self.inBounds(portal)) {
            var str = self.genStrFromPortal(portal, x);
            obj.list.push(str);
            obj.count += 1;
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

    // Return markup for the bookmarks to show in the IMF dialog
    self.renderPortalBookmarkFolders = function renderPortalBookmarkFolder(folders) {
        var data = "<p>With Portal Bookmarks, you can populate the list with a folder you have created instead:</p>";

        for (var folder in folders) {
            if (folders.hasOwnProperty(folder)) {
                data += `<div
                  style="text-align: center; border: yellow 1px solid; margin-bottom: 0.3em; cursor: pointer;"
                  onClick='window.plugin.ingressmaxfield.appendBookmarkFolder("${folder}");'>
                    ${folders[folder]}
                  </div>`;
            }
        }

        return data;
    };

    // Generate string for given bookmarked portal
    self.genStrFromBookmarkPortal = function genStrFromBookmarkPortal(portalId, folder) {
        var portalsList = JSON.parse(localStorage["plugin-bookmarks"]);
        var portal = portalsList.portals[folder]["bkmrk"][portalId];
        var latlng = portal.latlng.split(",");

        return self.genStr(portal.label, latlng[0], latlng[1], portal.guid);
    };

    // Generate string for all the portals
    self.genStrFromBookmarkFolder = function genStrFromBookmarkFolder(folder) {
        var data = "",
            portalsList = JSON.parse(localStorage["plugin-bookmarks"]);

        for (var portal in portalsList.portals[folder]["bkmrk"]) {
            if (portalsList.portals[folder]["bkmrk"].hasOwnProperty(portal)) {
                data += self.genStrFromBookmarkPortal(portal, folder) + "\n";
            }
        }

        return data;
    };


    // Write a list of all portal bookmarks to the text area
    self.appendBookmarkFolder = function appendBookmarkFolder(folder) {
        var $form = $("form[name='maxfield'] textarea");
        $form.val(self.genStrFromBookmarkFolder(folder));
    };

    self.showDialog = function showDialog(o, b) {
        var data = `
        <form name='maxfield' action='https://www.ingress-maxfield.com/submit.php' enctype='multipart/form-data' method='post' target='_blank'>
            <div class="row">
                <div id='form_area' class="column" style="float:left;width:80%;box-sizing: border-box;padding-right: 10px;">
                    <textarea class='form_area'
                        name='portal_list_area'
                        rows='30'
                        placeholder='Copy and paste portal list here OR upload portal list file below. Proper formatting guidelines can be found in the instructions.  Anything after a # is considered a comment and will be ignored - be sure to remove any # or ; that appear in a portal name. Each portal should start on a new line.'
                        style="width: 100%; white-space: nowrap;">${o.join("\n")}</textarea>
                </div>
                <div class="column" style="float:left;width:20%;">
                    ${self.renderPortalBookmarkFolders(b)}
                </div>
            </div>
            <div id='form_part2'>
                <div id='file_upload'>
                    <br/>
                    <label class='upload_button' hidden>
                        <span>
                            <input id='hidden' type='file' name='portal_list'>
                        </span>
                    </label>
                    <input type='hidden' id='path' placeholder='No file selected' disabled>
                </div>
                <div id='num_agents'>
                    <table width='100%'>
                        <tr>
                            <td width='50%'>
                                Number of agents:
                            </td>
                            <td width='50%'>
                                <input type='number' class='num_agents' name='num_agents' value='1' min='1' required>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                Use Google Maps?
                            </td>
                            <td>
                                <input type='checkbox' name='useGoogle' value='YES' checked>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                Color scheme
                            </td>
                            <td>
                                <input type='radio' name='color' value='ENL' checked>ENL</input>
                                <input type='radio' name='color' value='RES'>RES</input>
                            </td>
                        </tr>
                    </table>
                </div>
                <div id='submit'>
                    <table>
                        <tr>
                            <td>
                                Email:
                            </td>
                            <td>
                                <input type='email' name='email' placeholder='(optional)'>
                            </td>
                        </tr>
                        <tr>
                            <td></td>
                            <td>
                                <input type='submit' class='submit' name='submit' value='Submit!'>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
        </form>
        `;
        var dia = window.dialog({
            title: "www.ingress-maxfield.com: Field your future",
            html: data
        }).parent();
        $(".ui-dialog-buttonpane", dia).remove();
        dia.css("width", "600px").css("top", ($(window).height() - dia.height()) / 2).css("left", ($(window).width() - dia.width()) / 2);
        return dia;
    };

    self.gen = function gen() {
        var o = self.checkPortals(window.portals);
        var bookmarks = self.checkBookmarks();
        var dialog = self.showDialog(o.list, bookmarks);
        return dialog;
    };

    // Return a list of portal bookmark folders
    self.checkBookmarks = function checkBookmarks() {
        if (!window.plugin.bookmarks) {
            return null;
        }

        var portalsList = JSON.parse(localStorage["plugin-bookmarks"]);

        var res = {};
        for (var folder in portalsList.portals) {
            if (portalsList.portals.hasOwnProperty(folder)) {
                res[folder] = portalsList.portals[folder].label;
            }
        }
        return res;
    };

    // setup function called by IITC
    self.setup = function init() {
        // add controls to toolbox
        var link = $("<a onclick=\"window.plugin.ingressmaxfield.gen();\" title=\"Generate a CSV list of portals and locations for use with www.ingress-maxfield.com.\">IMF Export</a>");
        $("#toolbox").append(link);
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
