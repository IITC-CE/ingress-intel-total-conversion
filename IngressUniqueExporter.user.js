// ==UserScript==
// @id             iitc-plugin-uniqueinfo-exporter@c-schmitz
// @name           IITC plugin: Unique Info Import/Export
// @category       Misc
// @version        0.0.0.3
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      https://github.com/c-schmitz/iitc-unique-export/raw/master/IngressUniqueExporter.user.js
// @downloadURL    https://github.com/c-schmitz/iitc-unique-export/raw/master/IngressUniqueExporter.user.js
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
    self.save = function save() {
        if (!confirm("Please only confirm this if you know what you are doing!!\nAre you sure you want to save your Unique visits/captures back to IITC?")) return;

        window.plugin.uniques.uniques=$.parseJSON( $('#taUCExportImport').val() );
        window.plugin.sync.updateMap('uniques', 'uniques', Object.keys(window.plugin.uniques.uniques));
    }

    self.gen = function gen() {

      sExportUniqueJSON='{'+"\n";
      aoPortals=window.plugin.uniques.uniques;
      visited=captured=0;
      $.each(aoPortals,function(PUID){
             aPortal=window.plugin.uniques.uniques[PUID];
             if (aPortal.visited) visited++;
             if (aPortal.captured) captured++;
      });
      sExportUniqueJSON=JSON.stringify(window.plugin.uniques.uniques,null,4);

        var dialog = window.dialog({
            title: "Ingress unique visits/captures JSON export",
            html: '<span>Find all of your visited/captured portals as JSON below (visited: '+visited+' - captured: '+captured+'):</span>'
            + '<textarea id="taUCExportImport" style="width: 570px; height: ' + ($(window).height() - 230) + 'px; margin-top: 5px;"></textarea><a onclick=\"window.plugin.uniqueinfo.save();\" title=\"Save unique UV/UC info to IITC.\">Save</a>'
        }).parent();
        $(".ui-dialog-buttonpane", dialog).remove();
        // width first, then centre
        dialog.css("width", 600).css({
            "top": ($(window).height() - dialog.height()) / 2,
            "left": ($(window).width() - dialog.width()) / 2
        });
        $("#taUCExportImport").val(sExportUniqueJSON);
        return dialog;
    }
    // setup function called by IITC
    self.setup = function init() {
        // add controls to toolbox
        var link = $("<a onclick=\"window.plugin.uniqueinfo.gen();\" title=\"Export/import a JSON of portals and their unique visit/capture status.\">UV/UC export/import</a>");
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
