// ==UserScript==
// @author         DanielOnDiordna
// @name           Team bookmarks
// @category       Controls
// @version        0.0.5.20210724.002500
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/team-bookmarks.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/team-bookmarks.user.js
// @description    [danielondiordna-0.0.5.20210724.002500] Easily add or remove bookmarks for all portals within visible range per team. This plugin requires the Bookmarks plugin and optionally the Bookmarks add-on (to enable color bookmarks).
// @id             team-bookmarks@DanielOnDiordna
// @namespace      https://softspot.nl/ingress/
// @depends        bookmarks@ZasoGD
// @recommends     bookmarks-add-on@danielondiordna
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.teambookmarks = function() {};
    var self = window.plugin.teambookmarks;
    self.id = 'teambookmarks';
    self.title = 'Team bookmarks';
    self.version = '0.0.5.20210724.002500';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 0.0.1.20160608.002800
- first release

version 0.0.2.20210121.130100
- updated plugin wrapper and userscript header formatting to match IITC-CE coding

version 0.0.3.20210121.131000
- renamed plugin from Auto bookmarks to Team bookmarks
- modified menu

version 0.0.4.20210121.135000
- fixed compatibility for Bookmarks add-on color settings

version 0.0.4.20210121.140600
- moved from category Layer to Controls

version 0.0.5.20210121.234700
- removed colorpicker code, because it is required for and already integrade in the optional Bookmarks add-on
- button integrated in bookmarks menu
- show visible portal counts and total visible bookmarks count

version 0.0.5.20210421.190200
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin

version 0.0.5.20210724.002500
- prevent double plugin setup on hook iitcLoaded
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.localstoragesettings = self.pluginname + '-settings';

    self.settings = {};
    self.settings.colorE = '#00FF00';
    self.settings.colorR = '#0000C0';
    self.settings.colorU = '#FF8309';
    self.settings.replace = false;

    self.colorpickeroptions = {
        flat: false,
        showInput: true,
        showButtons: true,
        showPalette: true,
        showSelectionPalette: true,
        allowEmpty: false,
        palette: [
            ['#004000','#008000','#00C000'],
            ['#00FF00','#80FF80','#C0FFC0'],
            ['#000040','#000080','#0000C0'],
            ['#4040FF','#8080FF','#C0C0FF'],
            ['#6A3400','#964A00','#C05F00'],
            ['#E27000','#FF8309','#FFC287'],
            ['#a24ac3','#514ac3','#4aa8c3','#51c34a'],
            ['#c1c34a','#c38a4a','#c34a4a','#c34a6f'],
            ['#000000','#666666','#bbbbbb','#ffffff']
        ]};

    self.restoresettings = function() {
        if (typeof localStorage[self.localstoragesettings] === 'string' && localStorage[self.localstoragesettings] !== '') {
            try {
                var settings = JSON.parse(localStorage[self.localstoragesettings]);
                if (typeof settings === 'object' && settings instanceof Object && !(settings instanceof Array)) {
                    for (const i in settings) {
                        if (typeof settings[i] === typeof self.settings[i]) self.settings[i] = settings[i];
                    }
                }
            } catch(e) {
                return false;
            }
        }
    };

    self.storesettings = function() {
        localStorage[self.localstoragesettings] = JSON.stringify(self.settings);
    };

    self.setcolor = function(team,color) {
        if (team === TEAM_ENL) self.settings.colorE = color;
        if (team === TEAM_RES) self.settings.colorR = color;
        if (team === TEAM_NONE) self.settings.colorU = color;
        self.storesettings();
    };

    self.getvisibleportals = function() {
        var visibleportals = {};
        var visiblebounds = map.getBounds();
        for (var guid in window.portals) {
            if (visiblebounds.contains(window.portals[guid].getLatLng())) {
                // portal must be withing visible bounds
                visibleportals[guid] = window.portals[guid];
            }
        }
        return visibleportals;
    };

    self.addbookmarks = function(team) {
        if (!window.plugin.bookmarks) return;

        var visibleportals = self.getvisibleportals();
        var bookmarksAddonBbackupcolor;
        if (window.plugin.bookmarksAddon) {
            bookmarksAddonBbackupcolor = window.plugin.bookmarksAddon.settings.color; // bookmarksAddon.color is being used by function addPortalBookmark
            if (team === TEAM_ENL) window.plugin.bookmarksAddon.settings.color = self.settings.colorE;
            if (team === TEAM_RES) window.plugin.bookmarksAddon.settings.color = self.settings.colorR;
            if (team === TEAM_NONE) window.plugin.bookmarksAddon.settings.color = self.settings.colorU;
        }
        var cntadd = 0;
        var cntreplaced = 0;
        for (var guid in visibleportals) {
            var portal = visibleportals[guid];
            if (portal.options.team === team) {
                var bkmrkData = window.plugin.bookmarks.findByGuid(guid);
                if (bkmrkData) {
                    if (self.settings.replace) {
                        var ID = bkmrkData.id_bookmark;
                        if (window.plugin.bookmarksAddon) {
                            window.plugin.bookmarks.bkmrksObj['portals'][window.plugin.bookmarks.KEY_OTHER_BKMRK]['bkmrk'][ID]["color"] = window.plugin.bookmarksAddon.settings.color;
                            window.plugin.bookmarks.saveStorage();
                        }

                        var starInLayer = window.plugin.bookmarks.starLayers[guid];
                        window.plugin.bookmarks.starLayerGroup.removeLayer(starInLayer);
                        delete window.plugin.bookmarks.starLayers[guid];
                        var latlng = visibleportals[guid].getLatLng();
                        var lbl = visibleportals[guid].options.data.title;
                        window.plugin.bookmarks.addStar(guid, latlng, lbl);
                        cntreplaced++;
                    }
                } else {
                    var ll = portal.getLatLng();
                    plugin.bookmarks.addPortalBookmark(guid, ll.lat+','+ll.lng, portal.options.data.title);
                    cntadd++;
                }
            }
        }
        if (window.plugin.bookmarksAddon) window.plugin.bookmarksAddon.settings.color = bookmarksAddonBbackupcolor;
        window.plugin.bookmarks.updateStarPortal();
        let teamstring = 'All portals: ';
        if (team === TEAM_ENL) teamstring = 'Enlightened portals: ';
        if (team === TEAM_RES) teamstring = 'Resistance portals: ';
        if (team === TEAM_NONE) teamstring = 'Unclaimed portals: ';
        $('#' + self.id + 'menustatus').html(teamstring + cntadd + ' added' + (self.settings.replace?' / ' + cntreplaced + ' replaced':''));
    };

    self.getVisibleBookmarks = function() {
        var guidlist = [];
        let visiblebounds = map.getBounds();
        for (let id in window.plugin.bookmarks.bkmrksObj['portals']['idOthers']['bkmrk']) {
            let latlng = JSON.parse('[' + window.plugin.bookmarks.bkmrksObj['portals']['idOthers']['bkmrk'][id].latlng + ']');
            if (visiblebounds.contains(latlng)) {
                guidlist.push(window.plugin.bookmarks.bkmrksObj['portals']['idOthers']['bkmrk'][id].guid);
            }
        }
        return guidlist;
    };

    self.removebookmarks = function(team) {
        if (!window.plugin.bookmarks) return;

        var cntremoved = 0;
        var guidlist = [];
        if (team === undefined) {
            guidlist = self.getVisibleBookmarks();
        } else {
            var portals = self.getvisibleportals();
            for (let guid in portals) {
                let portal = portals[guid];
                if (portal.options.team === team) {
                    let bkmrkData = window.plugin.bookmarks.findByGuid(guid);
                    if (bkmrkData) {
                        guidlist.push(guid);
                    }
                }
            }
        }

        let teamstring = 'All portals: ';
        if (team === TEAM_ENL) teamstring = 'Enlightened portals: ';
        if (team === TEAM_RES) teamstring = 'Resistance portals: ';
        if (team === TEAM_NONE) teamstring = 'Unclaimed portals: ';

        if (guidlist.length === 0) {
            alert(teamstring + 'No bookmarks to delete');
            return;
        }

        if (confirm(teamstring + 'Remove bookmarks (' + guidlist.length + ')?')) {
            console.log(JSON.stringify(guidlist));
            for (cntremoved = 0; cntremoved < guidlist.length; cntremoved++) {
                let guid = guidlist[cntremoved];
                let bkmrkData = window.plugin.bookmarks.findByGuid(guid);

                let starInLayer = window.plugin.bookmarks.starLayers[guid];
                window.plugin.bookmarks.starLayerGroup.removeLayer(starInLayer);
                delete window.plugin.bookmarks.starLayers[guid];

                let list = window.plugin.bookmarks.bkmrksObj['portals'];
                delete list[bkmrkData['id_folder']]['bkmrk'][bkmrkData['id_bookmark']];
                $('.bkmrk#'+bkmrkData['id_bookmark']+'').remove();
            }
            window.plugin.bookmarks.saveStorage();
        }

        window.plugin.bookmarks.updateStarPortal();
        $('#' + self.id + 'menustatus').html(teamstring + cntremoved + ' removed');
    };

    self.getCount = function() {
        var count = { E:0, R:0, U:0, B:0 };
        var visibleportals = self.getvisibleportals();
        for (var guid in visibleportals) {
            var portal = visibleportals[guid];
            switch (portal.options.team) {
                case TEAM_ENL:
                    count.E++;
                    break;
                case TEAM_RES:
                    count.R++;
                    break;
                case TEAM_NONE:
                    count.U++;
                    break;
            }
        }
        count.B = self.getVisibleBookmarks().length;
        return count;
    };

    self.updatemenu = function() {
        var count = self.getCount();
        $('#' + self.id + '_countE').html(count.E);
        $('#' + self.id + '_countR').html(count.R);
        $('#' + self.id + '_countU').html(count.U);
        $('#' + self.id + '_countB').html(count.B);
    };

    self.menu = function() {
        var count = self.getCount();
        var html = '<div class="' + self.id + 'menu">' +
            'Add or remove bookmarks for all portals within visible range:<table border=0>' +
            '<tr><td width="20" style="vertical-align: middle" id="' + self.id + '_countE">' + count.E + '</td><td style="vertical-align: middle">Enlightened</td><td>' + (window.plugin.bookmarksAddon?'<input type="color" id="' + self.id + '_colorE"></input> ':'') + '<input type="button" onclick="' + self.namespace + 'addbookmarks(TEAM_ENL); return false;" value="Add" /> <input type="button" onclick="' + self.namespace + 'removebookmarks(TEAM_ENL); return false;" value="Remove" /></td></tr>' +
            '<tr><td width="20" style="vertical-align: middle" id="' + self.id + '_countR">' + count.R + '</td><td style="vertical-align: middle">Resistance</td><td>' + (window.plugin.bookmarksAddon?'<input type="color" id="' + self.id + '_colorR"></input> ':'') + '<input type="button" onclick="' + self.namespace + 'addbookmarks(TEAM_RES); return false;" value="Add" /> <input type="button" onclick="' + self.namespace + 'removebookmarks(TEAM_RES); return false;" value="Remove" /></td></tr>' +
            '<tr><td width="20" style="vertical-align: middle" id="' + self.id + '_countU">' + count.U + '</td><td style="vertical-align: middle">Unclaimed</td><td>' + (window.plugin.bookmarksAddon?'<input type="color" id="' + self.id + '_colorU"></input> ':'') + '<input type="button" onclick="' + self.namespace + 'addbookmarks(TEAM_NONE); return false;" value="Add" /> <input type="button" onclick="' + self.namespace + 'removebookmarks(TEAM_NONE); return false;" value="Remove" /></td></tr>' +
            '</table><a href="#" onclick="' + self.namespace + 'removebookmarks(); return false;">Remove <span id="' + self.id + '_countB">' + count.B + '</span> visible bookmarks</a>' +
            '<input type="checkbox" id="replacetoggle" onclick="' + self.namespace + 'settings.replace = this.checked; ' + self.namespace + 'storesettings();"' + (self.settings.replace?' checked':'') + '><label for="replacetoggle">Overwrite existing bookmarks</label><br />' +
            '<p id="' + self.id + 'menustatus"></p>' +
            '<span style="font-style: italic; font-size: smaller">version ' + self.version + ' by ' + self.author + '</span>' +
            '</div>';

        window.dialog({
            html: html,
            id: self.pluginname + '-dialog',
            dialogClass: 'ui-dialog-' + self.id,
            title: self.title
        });

        if (!window.plugin.bookmarksAddon) return;

        // need to initialise the 'spectrum' color picker
        $('#' + self.id + '_colorE').spectrum($.extend(true, self.colorpickeroptions, {
            change: function(color) { self.setcolor(TEAM_ENL,color.toHexString()); },
            color: self.settings.colorE,
        }));
        $('#' + self.id + '_colorR').spectrum($.extend(true, self.colorpickeroptions, {
            change: function(color) { self.setcolor(TEAM_RES,color.toHexString()); },
            color: self.settings.colorR,
        }));
        $('#' + self.id + '_colorU').spectrum($.extend(true, self.colorpickeroptions, {
            change: function(color) { self.setcolor(TEAM_NONE,color.toHexString()); },
            color: self.settings.colorU,
        }));
    };

    self.setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        if (!window.plugin.bookmarks) {
            console.log('IITC plugin NOT loaded: ' + self.title + ' version ' + self.version + ' - plugin bookmarks is required');
            return;
        }

        localStorage.removeItem('plugin-autobookmark-replace'); // remove storage item value from old version

        self.restoresettings();

        window.map.on('moveend',self.updatemenu);
        window.addHook('mapDataRefreshEnd',self.updatemenu);
        window.addHook('pluginBkmrksEdit',self.updatemenu);

        // insert button:
        window.plugin.bookmarks.htmlSetbox = plugin.bookmarks.htmlSetbox.replace('</div>','<a onclick="' + self.namespace + 'menu();return false;">' + self.title + '...</a></div>');

        // add options menu:
        $('#toolbox').append('<a onclick="' + self.namespace + 'menu();return false;" href="#">' + self.title + '</a>');

        $('head').append(
            '<style>' +
            '.' + self.id + 'menu > a { display:block; color:#ffce00; border:1px solid #ffce00; padding:3px 0; margin:10px auto; width:80%; text-align:center; background:rgba(8,48,78,.9); }'+
            '</style>');
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

