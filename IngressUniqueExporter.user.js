// ==UserScript==
// @id             iitc-plugin-uniqueinfo-exporter@c-schmitz
// @name           IITC plugin: Unique Info Import/Export
// @category       Misc
// @version        0.0.0.2
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @description    Import/exports the unique capture/visits info to/from a JSON file. This plugin requires the IITC Unique plugin to be installed.
// @include        https://www.ingress.com/intel*
// @include        http://www.ingress.com/intel*
// @match          https://www.ingress.com/intel*
// @match          http://www.ingress.com/intel*
// @grant          none
// ==/UserScript==

function wrapper() {
    // in case IITC is not available yet, define the base plugin object
    if (typeof window.plugin !== "function") {
        window.plugin = function() {};
    }
    // base context for plugin
    window.plugin.uniqueinfo = function() {};
    var self = window.plugin.uniqueinfo;
    self.gen = function gen() {

      sExportUniqueJSON='{'+"\n";
      aoPortals=window.plugin.uniques.uniques;
      visited=captured=0;
      $.each(aoPortals,function(PUID){
             aPortal=window.plugin.uniques.uniques[PUID];
             sExportUniqueJSON+='"'+PUID+'": {"visited":'+aPortal.visited+',"captured":'+aPortal.captured+"},\n";
             i++;
             if (aPortal.visited) visited++;
             if (aPortal.captured) captured++;
      });
      sExportUniqueJSON=sExportUniqueJSON.slice(0, -2);
      sExportUniqueJSON+="\n"+'}'+"\n"

        var dialog = window.dialog({
            title: "Ingress unique visits/cpatures JSON export",
            html: '<span>Find all of your visited/captured portals as JSON below (visited: '+visited+' - vaptured: '+captured+'):</span>'
            + '<textarea id="idmUnqiuesExport" style="width: 570px; height: ' + ($(window).height() - 190) + 'px; margin-top: 5px;"></textarea>'
        }).parent();
        $(".ui-dialog-buttonpane", dialog).remove();
        // width first, then centre
        dialog.css("width", 600).css({
            "top": ($(window).height() - dialog.height()) / 2,
            "left": ($(window).width() - dialog.width()) / 2
        });
        $("#idmUnqiuesExport").val(sExportUniqueJSON);
        return dialog;
    }
    // setup function called by IITC
    self.setup = function init() {
        // add controls to toolbox
        var link = $("<a onclick=\"window.plugin.uniqueinfo.gen();\" title=\"Export a JSON of portals and their unique visit/capture status.\">Unique visits/capture export</a>");
        $("#toolbox").append(link);
        // delete setup to ensure init can't be run again
        delete self.setup;
    }
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
(document.body || document.head || document.documentElement).appendChild(script);
