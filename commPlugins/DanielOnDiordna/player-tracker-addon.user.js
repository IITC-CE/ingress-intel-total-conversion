// ==UserScript==
// @author         DanielOnDiordna
// @name           Player Tracker add-on
// @category       Addon
// @version        1.3.1.20240209.233200
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/player-tracker-addon.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/player-tracker-addon.user.js
// @description    [danielondiordna-1.3.1.20240209.233200] Add-on to the player tracker plugin: Adjust history limit of 3 hours to another value. Toggle name labels, last action time, toggle/adjust player colors, focus on players, display 1 single player. Integrated Marker Label plugin and Spectrum Colorpicker 1.8.1 plugin. Supports Machina U̶͚̓̍N̴̖̈K̠͔̍͑̂͜N̞̥͋̀̉Ȯ̶̹͕̀W̶̢͚͑̚͝Ṉ̨̟̒̅' player.
// @id             player-tracker-addon@DanielOnDiordna
// @namespace      https://softspot.nl/ingress/
// @depends        player-activity-tracker@breunigs
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.playerTrackerAddon = function() {};
    var self = window.plugin.playerTrackerAddon;
    self.id = 'playerTrackerAddon';
    self.title = 'Player Tracker add-on';
    self.version = '1.3.1.20240209.233200';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 1.3.1.20240209.233200
- minor fix to display player nickname on the labels (fix for Player Tracker version 0.12.3.20240201.073623 IITC-CE 0.37.1 beta)

version 1.3.0.20230514.005600
- added Machina U̶͚̓̍N̴̖̈K̠͔̍͑̂͜N̞̥͋̀̉Ȯ̶̹͕̀W̶̢͚͑̚͝Ṉ̨̟̒̅' icons, player tracker layer and colors
- reversed the changelog order to show last changes at the top

version 1.2.0.20220319.231800
- added new option to hide the "on your portal" actions, which can interfere when viewing remote locations

version 1.0.2.20211011.231300
- added new option to hide the date from the label if it is today, if show date+time is set
- properly replaced the playerTracker publicChatDataAvailable handleData hook
- fixed a console warning about a missing color during updateplayerlist when the menu is not visible
- reformatted the settings menu

version 1.0.1.20210724.002500
- prevent double plugin setup on hook iitcLoaded

version 1.0.1.20210421.190200
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin

version 1.0.1.20210328.000100
- added click event to player tracker icons while name labels are enabled to show history
- changed default settings values

version 1.0.0.20210119.225600
- changed description header

version 1.0.0.20210119.201900
- integrated marker label plugin code, no need anymore for the separate plugin
- integrated Spectrum Colorpicker 1.8.1 plugin code, no need anymore for the separate plugin
- updated plugin wrapper and userscript header formatting to match IITC-CE coding

version 0.0.13.20200131.220500
- problem solved, added better processNewData fix

version 0.0.12.20200130.172600
- problem solved, added processNewData fix

version 0.0.3.20200130.160000
version 0.0.4.20200130.160000
version 0.0.5.20200130.160000
version 0.0.6.20200130.160000
version 0.0.7.20200130.160000
version 0.0.8.20200130.160000
version 0.0.9.20200130.160000
version 0.0.10.20200130.160000
version 0.0.11.20200130.160000
- debugging for IITC CE purposes

version 0.0.2.20190915.135600
- fix for ago display for iOS users
- modified defaults for new users: show labels, apply random colors
- changed menu order and modified some menu labels to make it more clear

version 0.0.1.20181018.104200
- added plugin version on menu
- added option list to set maximum events to display (default 10)
- added choice to display date and time instead of default 'ago'

version 0.0.1.20181030.212900
- intel URL changed from www.ingress.com to *.ingress.com
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.localstoragesettings = 'plugin-' + self.id + '-settings';
    self.settings = {
        limit: 3,
        showlabels: true,
        applyrandomcolors: true,
        showcenter: false,
        showlastaction: true,
        maxdisplayevents: 10,
        showdatetime: true,
        hidedatetoday: false,
        hideonyourportalactions: false
    };
    self.displayselectedplayer = false;
    self.selectedplayer = '';
    self.drawData_backup = '';
    self.ago_backup = '';

    self.restoresettings = function() {
        if (typeof localStorage[self.localstoragesettings] != 'string' || localStorage[self.localstoragesettings] == '') return;

        function isObject(element) {
            return (typeof element == 'object' && element instanceof Object && !(element instanceof Array));
        }

        function parseSettings(source,target) {
            if (!isObject(source) || !isObject(target)) return;

            for (const key in target) {
                if (key in source) {
                    if (isObject(target[key])) {
                        parseSettings(source[key],target[key]);
                    } else if (typeof source[key] == typeof target[key]) { // only accept settings from default settings template of same type
                        target[key] = source[key];
                    }
                }
            }
        }

        try {
            let settings = JSON.parse(localStorage[self.localstoragesettings]);
            parseSettings(settings,self.settings);

            // convert old settings here if needed

            let storechanges = false;
            if (localStorage['plugin-playerTrackerOverride-limit']) {
                self.settings.limit = parseFloat(localStorage['plugin-playerTrackerOverride-limit']);
                delete(localStorage['plugin-playerTrackerOverride-limit']);
                storechanges = true;
            }
            if (localStorage['plugin-playerTrackerOverride-showlabels']) {
                self.settings.showlabels = localStorage['plugin-playerTrackerOverride-showlabels'] === '1';
                delete(localStorage['plugin-playerTrackerOverride-showlabels']);
                storechanges = true;
            }
            if (localStorage['plugin-playerTrackerOverride-color']) {
                self.settings.applyrandomcolors = localStorage['plugin-playerTrackerOverride-color'] === '1';
                delete(localStorage['plugin-playerTrackerOverride-color']);
                storechanges = true;
            }

            if (!self.settings.limit) { // set a default if missing or zero
                self.settings.limit = window.PLAYER_TRACKER_MAX_TIME / (60*60*1000);
                storechanges = true;
            }

            if (storechanges) {
                self.storesettings();
            }
        } catch(e) {
            return false;
        }
    };
    self.storesettings = function() {
        localStorage[self.localstoragesettings] = JSON.stringify(self.settings);
    };

    self.setlimit = function(hours) {
        hours = parseFloat(hours);
        self.settings.limit = hours;
        self.storesettings();
        window.PLAYER_TRACKER_MAX_TIME = hours * 60*60*1000;
        window.plugin.playerTracker.handleData(); // call to processNewData requires data, this is fixed by rewriting that function elsewhere
    };

    self.setmaxdisplayevents = function(max) {
        max = parseInt(max);
        self.settings.maxdisplayevents = max;
        self.storesettings();
        self.resettracks();
    };

    self.makeoptionshtml = function(options,selection) {
        var optionslist = [];
        if (typeof selection !== 'string') selection = selection.toString();
        if (options instanceof Array) {
            var cnt;
            for (cnt = 0; cnt < options.length; cnt++) {
                if (typeof options[cnt] !== 'string') options[cnt] = options[cnt].toString();
                optionslist.push('<option' + (options[cnt] === selection?' selected':'') + '>' + options[cnt].replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;") + '</option>');
            }
        } else if (options instanceof Object) {
            var key;
            for (key of Object.keys(options).sort(function(a, b) {return -(options[b] - options[a])})) {
                if (typeof options[key] !== 'string') options[key] = options[key].toString();
                optionslist.push('<option value="' + options[key].replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;") + '"' + (options[key] === selection?' selected':'') + '>' + key.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;") + '</option>');
            }
        }
        return optionslist.join('\n');
    };

    self.labelsetup = function() {
        if (self.settings.showlabels) {
            // documentation: https://github.com/jacobtoye/Leaflet.iconlabel
            // create a label for each marker, override the original code:

            // optional:
            //  iconSize: new L.Point(24, 24),
            //  labelClassName: 'custom-label-formatting-class',
            if (!self.iconEnl_backup) {
                self.iconEnl_backup = window.plugin.playerTracker.iconEnl;
                window.plugin.playerTracker.iconEnl = L.Icon.Label.extend({
                    options: {
                        iconUrl: window.plugin.playerTracker.iconEnl.prototype.options.iconUrl,
                        iconRetinaUrl: window.plugin.playerTracker.iconEnl.prototype.options.iconRetinaUrl,
                        shadowUrl: null,
                        iconSize: new L.Point(25, 41),
                        iconAnchor: new L.Point(0, -28),
                        labelAnchor: new L.Point(16, -18),
                        wrapperAnchor: new L.Point(12, 13)
                    }
                });
            }
            if (!self.iconRes_backup) {
                self.iconRes_backup = window.plugin.playerTracker.iconRes;
                window.plugin.playerTracker.iconRes = L.Icon.Label.extend({
                    options: {
                        iconUrl: window.plugin.playerTracker.iconRes.prototype.options.iconUrl,
                        iconRetinaUrl: window.plugin.playerTracker.iconRes.prototype.options.iconRetinaUrl,
                        shadowUrl: null,
                        iconSize: new L.Point(25, 41),
                        iconAnchor: new L.Point(0, -28),
                        labelAnchor: new L.Point(16, -18),
                        wrapperAnchor: new L.Point(12, 13)
                    }
                });
            }
            if (!self.iconMac_backup) {
                self.iconMac_backup = window.plugin.playerTracker.iconMac;
                window.plugin.playerTracker.iconMac = window.L.Icon.Label.extend({
                    options: {
                        iconUrl: window.plugin.playerTracker.iconMac.prototype.options.iconUrl,
                        iconRetinaUrl: window.plugin.playerTracker.iconMac.prototype.options.iconRetinaUrl,
                        shadowUrl: null,
                        iconSize: new window.L.Point(25, 41),
                        iconAnchor: new window.L.Point(0, -28),
                        labelAnchor: new window.L.Point(16, -18),
                        wrapperAnchor: new window.L.Point(12, 13)
                    }
                });
            }
        } else {
            if (self.iconEnl_backup) {
                window.plugin.playerTracker.iconEnl = self.iconEnl_backup;
                self.iconEnl_backup = undefined;
            }
            if (self.iconRes_backup) {
                window.plugin.playerTracker.iconRes = self.iconRes_backup;
                self.iconRes_backup = undefined;
            }
            if (self.iconMac_backup) {
                window.plugin.playerTracker.iconMac = self.iconMac_backup;
                self.iconMac_backup = undefined;
            }
        }
        self.modify_drawData();
    };

    self.colorsetup = function() {
        if (!self.processNewData_backup) {
            self.processNewData_backup = window.plugin.playerTracker.processNewData;
            var processNewData_override = window.plugin.playerTracker.processNewData.toString();
            processNewData_override = processNewData_override.replace('var limit','if (!data) return;\n  var limit');
            processNewData_override = processNewData_override.replace(/( +)(events: \[newEvent\])/,'$1$2,\n$1color: ' + self.namespace + 'getPlayerColor(plrname,json[2].plext.team)');
            eval('window.plugin.playerTracker.processNewData = ' + processNewData_override);
        }
        // restore
        /*
    if (self.processNewData_backup) {
      eval('window.plugin.playerTracker.processNewData = ' + self.processNewData_backup.toString());
      self.processNewData_backup = undefined;
    }
  }
  */

        self.modify_drawData();
    };

    self.actionssetup = function() {
        let processNewData_override = window.plugin.playerTracker.processNewData.toString();
        processNewData_override = processNewData_override.replace(/(, address);/,'$1, action;');
        processNewData_override = processNewData_override.replace(/( +)(case 'TEXT':)/,'$1$2\n$1  action = markup[1].plain;');
        processNewData_override = processNewData_override.replace(/( +)(address: address)/,'$1$2,\n$1actions: [action]');
        eval('window.plugin.playerTracker.processNewData = ' + processNewData_override);
    };

    self.resettracks = function() {
        window.plugin.playerTracker.drawnTracesEnl.clearLayers();
        window.plugin.playerTracker.drawnTracesRes.clearLayers();
        window.plugin.playerTracker.drawnTracesMac.clearLayers();
        window.plugin.playerTracker.drawData();
    };

    self.modify_drawData = function() {
        if (!self.drawData_backup) {
            self.drawData_backup = window.plugin.playerTracker.drawData.toString();
        }
        var drawData_override = self.drawData_backup;

        if (self.settings.showlabels) {
            if (drawData_override.indexOf('iconEnl()') >= 0) {
                drawData_override = drawData_override.replace('iconEnl()','iconEnl({ labelText: (plrname || playerData.nick) + (' + self.namespace + 'settings.showlastaction?\', \' + window.plugin.playerTracker.ago(playerData.events[playerData.events.length - 1].time,now):\'\') })');
                drawData_override = drawData_override.replace('iconRes()','iconRes({ labelText: (plrname || playerData.nick) + (' + self.namespace + 'settings.showlastaction?\', \' + window.plugin.playerTracker.ago(playerData.events[playerData.events.length - 1].time,now):\'\') })');
            }
        }

        if (drawData_override.indexOf('displayselectedplayer') < 0) {
            drawData_override = drawData_override.replace('if(!playerData','if (' + self.namespace + 'displayselectedplayer && plrname !== ' + self.namespace + 'selectedplayer) {\nreturn true;\n}\nif(!playerData');
        }

        if (drawData_override.indexOf('var polyLineByAgeEnl = [') >= 0) {
            drawData_override = drawData_override.replace('var polyLineByAgeEnl = ','var polyLineByAgeEnl = {}; //');
            drawData_override = drawData_override.replace('var polyLineByAgeRes = ','var polyLineByAgeRes = {}; //');
            drawData_override = drawData_override.replace('polyLineByAgeRes[ageBucket].push(line);','{ if (!polyLineByAgeRes[plrname]) polyLineByAgeRes[plrname] = [[], [], [], []]; polyLineByAgeRes[plrname][ageBucket].push(line); }');
            drawData_override = drawData_override.replace('polyLineByAgeEnl[ageBucket].push(line);','{ if (!polyLineByAgeEnl[plrname]) polyLineByAgeEnl[plrname] = [[], [], [], []]; polyLineByAgeEnl[plrname][ageBucket].push(line); }');
            drawData_override = drawData_override.replace('$.each(polyLineByAgeEnl, function(i, polyLine) {','$.each(polyLineByAgeEnl, function(plrname, polyLineByAge) {\n$.each(polyLineByAge, function(i, polyLine) {');
            drawData_override = drawData_override.replace('color: PLAYER_TRACKER_LINE_COLOUR,','color: window.plugin.playerTracker.stored[plrname].color,');
            drawData_override = drawData_override.replace('$.each(polyLineByAgeRes, function(i, polyLine) {','});\n$.each(polyLineByAgeRes, function(plrname, polyLineByAge) {\n$.each(polyLineByAge, function(i, polyLine) {');
            drawData_override = drawData_override.replace('color: PLAYER_TRACKER_LINE_COLOUR,','color: window.plugin.playerTracker.stored[plrname].color,');
            drawData_override = drawData_override + ');}';
        }

        drawData_override = drawData_override.replace('for(var i = evtsLength - 2; i >= 0 && i >= evtsLength - 10; i--) {','for(var i = evtsLength - 2; i >= 0 && i >= evtsLength - ' + self.namespace + 'settings.maxdisplayevents; i--) {');
        drawData_override = drawData_override.replace(/' ago'/g,'(' + self.namespace + 'settings.showdatetime?\'\':\' ago\')');

        if (self.settings.showcenter) {
            if (drawData_override.indexOf('var m = L.marker(gllfe(last),') >= 0) {
                drawData_override = drawData_override.replace('var m = L.marker(gllfe(last),','var screen = map.getBounds();\n    var markerpos = gllfe(last);\n    if (screen.contains(markerpos)) markerpos = L.latLng(screen._southWest.lat + (screen._northEast.lat - screen._southWest.lat)/2,screen._southWest.lng + (screen._northEast.lng - screen._southWest.lng)/2);\n    var m = L.marker(markerpos,');
            }
        }
        eval('window.plugin.playerTracker.drawData = ' + drawData_override);
    };

    self.modify_ago = function() {
        if (!self.ago_backup) {
            self.ago_backup = window.plugin.playerTracker.ago.toString();
        }
        var ago_override = self.ago_backup;
        if (ago_override.indexOf('var returnVal = m') >= 0) {
            if (ago_override.indexOf('function(time, now) {') === 0) {
                ago_override = ago_override.replace('function(time, now) {','function(time, now) {\nif (' + self.namespace + 'settings.showdatetime) {\n        if (!(time instanceof Date)) {\n            if (time) {\n                time = new Date(time);\n            } else {\n                time = new Date();\n            }\n        }\n        return (' + self.namespace + 'settings.hidedatetoday && new Date().toDateString() == time.toDateString()?"":[time.getFullYear(),time.getMonth()+1,time.getDate()].join(\'-\') + \' \') + [time.getHours(),(\'0\' + time.getMinutes()).slice(-2)].join(\':\');\n}');
            } else if (ago_override.indexOf('function (time, now) {') === 0) { // fix for IITC on iOS
                ago_override = ago_override.replace('function (time, now) {','function(time, now) {\nif (' + self.namespace + 'settings.showdatetime) {\n        if (!(time instanceof Date)) {\n            if (time) {\n                time = new Date(time);\n            } else {\n                time = new Date();\n            }\n        }\n        return (' + self.namespace + 'settings.hidedatetoday && new Date().toDateString() == time.toDateString()?"":[time.getFullYear(),time.getMonth()+1,time.getDate()].join(\'-\') + \' \') + [time.getHours(),(\'0\' + time.getMinutes()).slice(-2)].join(\':\');\n}');
            }
        }
        eval('window.plugin.playerTracker.ago = ' + ago_override);
    };

    self.centersetup = function() {
        self.modify_drawData();
        window.plugin.playerTracker.drawData();
    };

    self.getRandomColor = function(plrname,team) {
        //  return '#' + (Math.random().toString(16) + '00000000').slice(2, 8).toUpperCase();
        if (!plrname) plrname = '';

        var hash = 0;
        for (var i = 0; i < plrname.length; i++) {
            hash = plrname.charCodeAt(i) + ((hash << 5) - hash);
        }

        hash = Math.abs(hash);
        hash %= 200;
        hash += 55; // result: number from 55 to 255

        var randomcolor = hash.toString(16).toUpperCase();
        if (team === 'ENLIGHTENED') {
            // random green color
            return '#00' + randomcolor + '00';
        } else if (team === 'RESISTANCE') {
            // random blue color
            return '#0000' + randomcolor;
        } else if (team === 'NEUTRAL') {
            // random red color
            return '#' + randomcolor + '0000';
        }

        return '#' + (hash.toString(16) + '00000000').slice(2, 8).toUpperCase();
    };

    self.getPlayerColor = function(plrname,team) {
        if (window.plugin.playerTracker.stored && window.plugin.playerTracker.stored[plrname]) {
            team = window.plugin.playerTracker.stored[plrname].team;
            if (window.plugin.playerTracker.stored[plrname].color) return window.plugin.playerTracker.stored[plrname].color;
            if (self.settings.applyrandomcolors) {
                window.plugin.playerTracker.stored[plrname].color = self.getRandomColor(plrname,team);
                return window.plugin.playerTracker.stored[plrname].color;
            }
        }

        if (self.settings.applyrandomcolors) return self.getRandomColor(plrname,team);
        return window.PLAYER_TRACKER_LINE_COLOUR;
    };

    self.showlist = function() {
        if (!window.plugin.playerTracker.stored) return;
        var resultsE = [];
        var resultsR = [];
        var resultsU = [];
        $.each(window.plugin.playerTracker.stored, function(plrname, player) {
            var text = plrname + ' ' + window.plugin.playerTracker.ago(player.events[player.events.length-1].time, new Date().getTime()) + (self.settings.showdatetime?'':' ago') + (player.events.length>1?' (' + player.events.length + ' events)':'');

            if (player.team === "ENLIGHTENED") {
                resultsE.push(text);
            } else if (player.team === "NEUTRAL") {
                resultsU.push(text);
            } else {
                resultsR.push(text);
            }
        });
        alert('ENLIGHTENED:\n' + resultsE.sort(function(a,b) { return (a.toLowerCase() < b.toLowerCase()?-1:(a.toLowerCase() > b.toLowerCase()?1:0)); }).join('\n') + '\n' +
              '\nRESISTANCE:\n' + resultsR.sort(function(a,b) { return (a.toLowerCase() < b.toLowerCase()?-1:(a.toLowerCase() > b.toLowerCase()?1:0)); }).join('\n') + '\n' +
              '\nU̶͚̓̍N̴̖̈K̠͔̍͑̂͜N̞̥͋̀̉Ȯ̶̹͕̀W̶̢͚͑̚͝Ṉ̨̟̒̅:\n' + resultsU.sort(function(a,b) { return (a.toLowerCase() < b.toLowerCase()?-1:(a.toLowerCase() > b.toLowerCase()?1:0)); }).join('\n'));
    };

    self.playerselectlist = function(selectedname) {
        if (!window.plugin.playerTracker.stored || window.plugin.playerTracker.stored.length === 0) return 'nothing stored';

        var list = [];
        var players = Object.keys(window.plugin.playerTracker.stored).sort(function(a,b) { return (a.toLowerCase() < b.toLowerCase()?-1:(a.toLowerCase() > b.toLowerCase()?1:0)); });
        if (players.length === 0) {
            self.selectedplayer = '';
            return '<span id="' + self.id + '_selectplayer">nothing stored</span>';
        }

        if (!selectedname) selectedname = self.selectedplayer;
        if (!selectedname) selectedname = players[0];
        var selectednamefound = false;
        for (var index in players) {
            var plrname = players[index];
            list.push('<option style="color: ' + self.getPlayerColor(plrname) + '" value="' + plrname + '"' + (plrname === selectedname?' selected':'')+ '>' + plrname + ' ' + window.plugin.playerTracker.stored[plrname].team + '</option>');
            if (plrname === selectedname) selectednamefound = true;
        }
        self.selectedplayer = (selectednamefound?selectedname:'');

        return '<select id="' + self.id + '_selectplayer" style="color:' + window.plugin.playerTracker.stored[selectedname].color + ';" onchange="' + self.namespace + 'selectedplayer = this.value; if (' + self.namespace + 'displayselectedplayer) ' + self.namespace + 'resettracks(); this.style.color=window.plugin.playerTracker.stored[this.value].color; $(\'#' + self.id + '_playercolor\').spectrum(\'set\',window.plugin.playerTracker.stored[this.value].color);">' + list.join('\n') + '</select>';
    };

    self.setSelectedPlayerColor = function(color) {
        var plyrname = $('#' + self.id + '_selectplayer option:selected').val();
        window.plugin.playerTracker.stored[plyrname].color = color;
        $('#' + self.id + '_selectplayer').css('color',color);
        $('#' + self.id + '_selectplayer option:selected').css('color',color);
        self.resettracks();
    };

    self.updateplayerlist = function() {
        if (!document.getElementById(self.id + '_selectplayer')) return;
        var newlist = self.playerselectlist($('#' + self.id + '_selectplayer option:selected').val());
        if (newlist !== $('#' + self.id + '_selectplayer').html()) $('#' + self.id + '_selectplayer').replaceWith(newlist);
        $('#' + self.id + '_playercolor').spectrum('set',(window.plugin.playerTracker.stored && window.plugin.playerTracker.stored[$('#' + self.id + '_selectplayer option:selected').val()] && window.plugin.playerTracker.stored[$('#' + self.id + '_selectplayer option:selected').val()].color?window.plugin.playerTracker.stored[$('#' + self.id + '_selectplayer option:selected').val()].color:'black'));
    };

    self.viewselectedplayer = function() {
        var plyrname = $('#' + self.id + '_selectplayer option:selected').val();
        if (!window.plugin.playerTracker.stored || !window.plugin.playerTracker.stored[plyrname]) return;
        var lasteventlatlng = window.plugin.playerTracker.stored[plyrname].events[window.plugin.playerTracker.stored[plyrname].events.length-1].latlngs[0];
        // map.fitBounds(window.plugin.quickdrawlinks.drawnItems.getBounds());
        var position = new L.LatLng(lasteventlatlng[0],lasteventlatlng[1]);
        window.map.setView(position, map.getZoom());
    };

    self.menu = function() {
        var limitchoices = {'30 minutes':0.5,'1 hour':1,'2 hours':2,'3 hours (default)':3,'4 hours':4,'5 hours':5,'6 hours':6,'12 hours':12,'1 day':24,'2 days':48,'3 days':72,'4 days':96,'5 days':120,'6 days':144,'1 week':168};
        var maxdisplayeventschoices = {'1':1,'5':5,'10 (default)':10,'15':15,'20':20,'25':25,'30':30,'40':40};

        let container = document.createElement('div');
        container.className = self.id + 'menu';

        let hiddenautofocusinput = container.appendChild(document.createElement('input')); // added to prevent auto focus on first element
        hiddenautofocusinput.type = 'hidden';
        hiddenautofocusinput.autofocus = 'autofocus';

        let showlabelsarea = container.appendChild(document.createElement('label'));
        let showlabels = showlabelsarea.appendChild(document.createElement('input'));
        showlabels.type = 'checkbox';
        showlabels.checked = self.settings.showlabels;
        showlabelsarea.appendChild(document.createTextNode('Show player name labels'));

        container.appendChild(document.createElement('br'));

        let showlastactionarea = container.appendChild(document.createElement('label'));
        let showlastaction = showlastactionarea.appendChild(document.createElement('input'));
        showlastaction.type = 'checkbox';
        showlastaction.checked = self.settings.showlastaction;
        showlastaction.disabled = !self.settings.showlabels;
        showlastactionarea.appendChild(document.createTextNode('Display time on labels'));

        container.appendChild(document.createElement('br'));

        let showdatetimearea = container.appendChild(document.createElement('label'));
        let showdatetime = showdatetimearea.appendChild(document.createElement('input'));
        showdatetime.type = 'checkbox';
        showdatetime.checked = self.settings.showdatetime;
        showdatetime.disabled = !(self.settings.showlabels && self.settings.showlastaction);
        showdatetimearea.appendChild(document.createTextNode("Show date+time instead of 'ago'"));

        container.appendChild(document.createElement('br'));

        let hidedatetodayarea = container.appendChild(document.createElement('label'));
        let hidedatetoday = hidedatetodayarea.appendChild(document.createElement('input'));
        hidedatetoday.type = 'checkbox';
        hidedatetoday.checked = self.settings.hidedatetoday;
        hidedatetoday.disabled = !(self.settings.showlabels && self.settings.showlastaction && self.settings.showdatetime);
        hidedatetodayarea.appendChild(document.createTextNode('Hide date if it is today'));

        container.appendChild(document.createElement('br'));

        let hideonyourportalactionsarea = container.appendChild(document.createElement('label'));
        let hideonyourportalactions = hideonyourportalactionsarea.appendChild(document.createElement('input'));
        hideonyourportalactions.type = 'checkbox';
        hideonyourportalactions.checked = self.settings.hideonyourportalactions;
        hideonyourportalactionsarea.appendChild(document.createTextNode('Hide "on your portal" actions'));

        showlabels.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.showlabels = this.checked;
            self.storesettings();
            self.labelsetup();
            self.resettracks();
            showlastaction.disabled = !self.settings.showlabels;
            showdatetime.disabled = !(self.settings.showlabels && self.settings.showlastaction);
            hidedatetoday.disabled = !(self.settings.showlabels && self.settings.showlastaction && self.settings.showdatetime);
        },false);

        showlastaction.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.showlastaction = this.checked;
            self.storesettings();
            self.labelsetup();
            self.resettracks();
            showlastaction.disabled = !self.settings.showlabels;
            showdatetime.disabled = !(self.settings.showlabels && self.settings.showlastaction);
            hidedatetoday.disabled = !(self.settings.showlabels && self.settings.showlastaction && self.settings.showdatetime);
        },false);

        showdatetime.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.showdatetime = this.checked;
            self.storesettings();
            self.labelsetup();
            self.resettracks();
            showlastaction.disabled = !self.settings.showlabels;
            showdatetime.disabled = !(self.settings.showlabels && self.settings.showlastaction);
            hidedatetoday.disabled = !(self.settings.showlabels && self.settings.showlastaction && self.settings.showdatetime);
        },false);

        hidedatetoday.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.hidedatetoday = this.checked;
            self.storesettings();
            self.labelsetup();
            self.resettracks();
            showlastaction.disabled = !self.settings.showlabels;
            showdatetime.disabled = !(self.settings.showlabels && self.settings.showlastaction);
            hidedatetoday.disabled = !(self.settings.showlabels && self.settings.showlastaction && self.settings.showdatetime);
        },false);

        hideonyourportalactions.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.hideonyourportalactions = this.checked;
            self.storesettings();
            self.resettracks();
        },false);

        let othersettings = container.appendChild(document.createElement('div'));
        othersettings.className = self.id + 'menu';
        othersettings.innerHTML =
            'History: <select onchange="' + self.namespace + 'setlimit(this.value);">' + self.makeoptionshtml(limitchoices,self.settings.limit) + '</select><br />' +
            'History lines: <select onchange="' + self.namespace + 'setmaxdisplayevents(this.value);">' + self.makeoptionshtml(maxdisplayeventschoices,self.settings.maxdisplayevents) + '</select><br />' +
            '<input type="checkbox" id="' + self.id + 'center" name="' + self.id + 'center" onclick="' + self.namespace + 'settings.showcenter = this.checked; ' + self.namespace + 'storesettings(); ' + self.namespace + 'centersetup(); ' + self.namespace + 'resettracks();"' + (self.settings.showcenter?' checked':'') + '><label for="' + self.id + 'center" title="This is a nice feature to make screenshots of all players on the map.">Center all visible players on the map</label><br />' +
            '<input type="text" id="' + self.id + '_playercolor"> Adjust color for selected player:<br />' +
            self.playerselectlist() + '<br />' +
            '<label><input type="checkbox" id="' + self.id + 'randomcolor" name="' + self.id + 'randomcolor" onclick="' + self.namespace + 'settings.applyrandomcolors = this.checked; ' + self.namespace + 'storesettings(); ' + self.namespace + 'updateplayerlist(); ' + self.namespace + 'resettracks();"' + (self.settings.applyrandomcolors?' checked':'') + '>Apply random team colors</label><br />' +
            '<label><input type="checkbox" id="' + self.id + 'selectedplayer" name="' + self.id + 'selectedplayer" onclick="' + self.namespace + 'displayselectedplayer = this.checked; ' + self.namespace + 'resettracks();"' + (self.displayselectedplayer?' checked':'') + '>Display selected player only</label><br />' +
            '<a href="#" onclick="' + self.namespace + 'viewselectedplayer(); return false;">Focus on selected player</a>' +
            '<a href="#" onclick="' + self.namespace + 'showlist(); return false;">Show list of stored players</a>';

        let author = container.appendChild(document.createElement('div'));
        author.className = self.id + 'author';
        author.textContent = self.title + ' version ' + self.version + ' by ' + self.author;

        dialog({
            id: 'ui-dialog-' + self.id,
            html: container,
            dialogClass: 'ui-dialog-' + self.id + 'Set',
            title: self.title
        }).dialog('option', 'buttons', {
            'Changelog': function() { alert(self.changelog); },
            'Close': function() { $(this).dialog('close'); }
        });

        // need to initialise the 'spectrum' color picker
        $('#' + self.id + '_playercolor').spectrum({
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
                ['#E27000','#FF8309','#FFC287',window.PLAYER_TRACKER_LINE_COLOUR],
                ['#a24ac3','#514ac3','#4aa8c3','#51c34a'],
                ['#c1c34a','#c38a4a','#c34a4a','#c34a6f'],
                ['#000000','#666666','#bbbbbb','#ffffff']
            ],
            change: function(color) { self.setSelectedPlayerColor(color.toHexString()); },
            color: self.getPlayerColor($('#' + self.id + '_selectplayer option:selected').val()),
        });
    };

    self.setupMarkerlabel = function() {
        /*
Leaflet.iconlabel (https://github.com/jacobtoye/Leaflet.iconlabel) Copyright 2012 Jacob Toye

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

        L.Icon.Label = L.Icon.extend({
            options: {
                /*
		labelAnchor: (Point) (top left position of the label within the wrapper, default is right)
		wrapperAnchor: (Point) (position of icon and label relative to Lat/Lng)
		iconAnchor: (Point) (top left position of icon within wrapper)
		labelText: (String) (label's text component, if this is null the element will not be created)
		*/
                /* Icon options:
		iconUrl: (String) (required)
		iconSize: (Point) (can be set through CSS)
		iconAnchor: (Point) (centered by default if size is specified, can be set in CSS with negative margins)
		popupAnchor: (Point) (if not specified, popup opens in the anchor point)
		shadowUrl: (Point) (no shadow by default)
		shadowSize: (Point)
		*/
                labelClassName: ''
            },

            initialize: function (options) {
                L.Util.setOptions(this, options);
                L.Icon.prototype.initialize.call(this, this.options);
            },

            setLabelAsHidden: function () {
                this._labelHidden = true;
            },

            createIcon: function () {
                return this._createLabel(L.Icon.prototype.createIcon.call(this));
            },

            createShadow: function () {
                if (!this.options.shadowUrl) {
                    return null;
                }
                var shadow = L.Icon.prototype.createShadow.call(this);
                //need to reposition the shadow
                if (shadow) {
                    shadow.style.marginLeft = (-this.options.wrapperAnchor.x) + 'px';
                    shadow.style.marginTop = (-this.options.wrapperAnchor.y) + 'px';
                }
                return shadow;
            },

            updateLabel: function (icon, text) {
                if (icon.nodeName.toUpperCase() === 'DIV') {
                    icon.childNodes[1].innerHTML = text;

                    this.options.labelText = text;
                }
            },

            showLabel: function (icon) {
                if (!this._labelTextIsSet()) {
                    return;
                }

                icon.childNodes[1].style.display = 'block';
            },

            hideLabel: function (icon) {
                if (!this._labelTextIsSet()) {
                    return;
                }

                icon.childNodes[1].style.display = 'none';
            },

            _createLabel: function (img) {
                if (!this._labelTextIsSet()) {
                    return img;
                }

                var wrapper = document.createElement('div'),
                    label = document.createElement('span');

                // set up wrapper anchor
                wrapper.style.marginLeft = (-this.options.wrapperAnchor.x) + 'px';
                wrapper.style.marginTop = (-this.options.wrapperAnchor.y) + 'px';

                wrapper.className = 'leaflet-marker-icon-wrapper leaflet-zoom-animated';

                // set up label
                label.className = 'leaflet-marker-iconlabel ' + this.options.labelClassName;

                label.innerHTML = this.options.labelText;

                label.style.marginLeft = this.options.labelAnchor.x + 'px';
                label.style.marginTop = this.options.labelAnchor.y + 'px';

                if (this._labelHidden) {
                    label.style.display = 'none';
                    // Ensure that the pointer cursor shows
                    img.style.cursor = 'pointer';
                }
                img.className = 'leaflet-interactive';

                //reset icons margins (as super makes them -ve)
                img.style.marginLeft = this.options.iconAnchor.x + 'px';
                img.style.marginTop = this.options.iconAnchor.y + 'px';

                wrapper.appendChild(img);
                wrapper.appendChild(label);

                return wrapper;
            },

            _labelTextIsSet: function () {
                return typeof this.options.labelText !== 'undefined' && this.options.labelText !== null;
            }
        });

        L.Icon.Label.Default = L.Icon.Label.extend({
            options: {
                //This is the top left position of the label within the wrapper. By default it will display at the right
                //middle position of the default icon. x = width of icon + padding
                //If the icon height is greater than the label height you will need to set the y value.
                //y = (icon height - label height) / 2
                labelAnchor: new L.Point(29, 8),

                //This is the position of the wrapper div. Use this to position icon + label relative to the Lat/Lng.
                //By default the point of the default icon is anchor
                wrapperAnchor: new L.Point(13, 41),

                //This is now the top left position of the icon within the wrapper.
                //If the label height is greater than the icon you will need to set the y value.
                //y = (label height - icon height) / 2
                iconAnchor: new L.Point(0, 0),

                //label's text component, if this is null the element will not be created
                labelText: null,

                /* From L.Icon.Default */
                iconUrl: L.Icon.Default.imagePath + '/marker-icon.png',
                iconSize: new L.Point(25, 41),
                popupAnchor: new L.Point(0, -33),

                shadowUrl: L.Icon.Default.imagePath + '/marker-shadow.png',
                shadowSize: new L.Point(41, 41)
            }
        });

        L.Marker.Label = L.Marker.extend({
            updateLabel: function (text) {
                this.options.icon.updateLabel(this._icon, text);
            },

            _initIcon: function () {
                if (!(this.options.icon instanceof L.Icon.Label)) {
                    throw new Error('Icon must be an instance of L.Icon.Label.');
                }

                // Ensure that the label is hidden to begin with
                if (this.options.revealing) {
                    this.options.icon.setLabelAsHidden();
                }

                L.Marker.prototype._initIcon.call(this);
            },

            _removeIcon: function () {
                if (this.options.revealing) {
                    L.DomEvent
                        .off(this._icon, 'mouseover', this._showLabel)
                        .off(this._icon, 'mouseout', this._hideLabel);
                }

                L.Marker.prototype._removeIcon.call(this);
            },

            _initInteraction: function () {
                L.Marker.prototype._initInteraction.call(this);

                if (!this.options.revealing) {
                    return;
                }

                L.DomEvent
                    .on(this._icon, 'mouseover', this._showLabel, this)
                    .on(this._icon, 'mouseout', this._hideLabel, this);
            },

            _showLabel: function () {
                this.options.icon.showLabel(this._icon);
            },

            _hideLabel: function () {
                this.options.icon.hideLabel(this._icon);
            }
        });

        //  '	font: 9px/0.5 Arial;' +
        // '	font: 12px/1.5 Arial;' +
        $('head').append(
            '<style>' +
            '.leaflet-marker-icon-wrapper {' +
            '	position: absolute;' +
            '}' +
            '' +
            '.leaflet-marker-iconlabel {' +
            '	background: white;' +
            '	-moz-border-radius: 7px; ' +
            '	-webkit-border-radius: 7px;' +
            '	border-radius: 7px;' +
            '	-moz-box-shadow: 0 3px 10px #888;' +
            '	-webkit-box-shadow: 0 3px 14px #999;' +
            '	box-shadow: 0 3px 10px #888;' +
            '	display: block;' +
            '	font: 9px/0.5 Arial;' +
            '  color: black;' +
            '	padding: 4px 6px;' +
            '	-ms-user-select: none;' +
            '	-moz-user-select: none;' +
            '	-webkit-user-select: none;' +
            '	user-select: none;' +
            '	white-space: nowrap;' +
            '}' +
            '</style>');
    }; // end self.setupMarkerlabel

    self.setupColorpickerSpectrum = function() {
        // source: https://github.com/bgrins/spectrum
        // minified with https://www.minifier.org/

        // Spectrum Colorpicker v1.8.1
        // https://github.com/bgrins/spectrum
        // Author: Brian Grinstead
        // License: MIT

		(function(factory){"use strict";if(typeof define==='function'&&define.amd){define(['jquery'],factory)}else if(typeof exports=="object"&&typeof module=="object"){module.exports=factory(require('jquery'))}else{factory(jQuery)}})(function($,undefined){"use strict";var defaultOpts={beforeShow:noop,move:noop,change:noop,show:noop,hide:noop,color:!1,flat:!1,showInput:!1,allowEmpty:!1,showButtons:!0,clickoutFiresChange:!0,showInitial:!1,showPalette:!1,showPaletteOnly:!1,hideAfterPaletteSelect:!1,togglePaletteOnly:!1,showSelectionPalette:!0,localStorageKey:!1,appendTo:"body",maxSelectionSize:7,cancelText:"cancel",chooseText:"choose",togglePaletteMoreText:"more",togglePaletteLessText:"less",clearText:"Clear Color Selection",noColorSelectedText:"No Color Selected",preferredFormat:!1,className:"",containerClassName:"",replacerClassName:"",showAlpha:!1,theme:"sp-light",palette:[["#ffffff","#000000","#ff0000","#ff8000","#ffff00","#008000","#0000ff","#4b0082","#9400d3"]],selectionPalette:[],disabled:!1,offset:null},spectrums=[],IE=!!/msie/i.exec(window.navigator.userAgent),rgbaSupport=(function(){function contains(str,substr){return!!~(''+str).indexOf(substr)}
		var elem=document.createElement('div');var style=elem.style;style.cssText='background-color:rgba(0,0,0,.5)';return contains(style.backgroundColor,'rgba')||contains(style.backgroundColor,'hsla')})(),replaceInput=["<div class='sp-replacer'>","<div class='sp-preview'><div class='sp-preview-inner'></div></div>","<div class='sp-dd'>&#9660;</div>","</div>"].join(''),markup=(function(){var gradientFix="";if(IE){for(var i=1;i<=6;i++){gradientFix+="<div class='sp-"+i+"'></div>"}}
		return["<div class='sp-container sp-hidden'>","<div class='sp-palette-container'>","<div class='sp-palette sp-thumb sp-cf'></div>","<div class='sp-palette-button-container sp-cf'>","<button type='button' class='sp-palette-toggle'></button>","</div>","</div>","<div class='sp-picker-container'>","<div class='sp-top sp-cf'>","<div class='sp-fill'></div>","<div class='sp-top-inner'>","<div class='sp-color'>","<div class='sp-sat'>","<div class='sp-val'>","<div class='sp-dragger'></div>","</div>","</div>","</div>","<div class='sp-clear sp-clear-display'>","</div>","<div class='sp-hue'>","<div class='sp-slider'></div>",gradientFix,"</div>","</div>","<div class='sp-alpha'><div class='sp-alpha-inner'><div class='sp-alpha-handle'></div></div></div>","</div>","<div class='sp-input-container sp-cf'>","<input class='sp-input' type='text' spellcheck='false'  />","</div>","<div class='sp-initial sp-thumb sp-cf'></div>","<div class='sp-button-container sp-cf'>","<a class='sp-cancel' href='#'></a>","<button type='button' class='sp-choose'></button>","</div>","</div>","</div>"].join("")})();function paletteTemplate(p,color,className,opts){var html=[];for(var i=0;i<p.length;i++){var current=p[i];if(current){var tiny=tinycolor(current);var c=tiny.toHsl().l<0.5?"sp-thumb-el sp-thumb-dark":"sp-thumb-el sp-thumb-light";c+=(tinycolor.equals(color,current))?" sp-thumb-active":"";var formattedString=tiny.toString(opts.preferredFormat||"rgb");var swatchStyle=rgbaSupport?("background-color:"+tiny.toRgbString()):"filter:"+tiny.toFilter();html.push('<span title="'+formattedString+'" data-color="'+tiny.toRgbString()+'" class="'+c+'"><span class="sp-thumb-inner" style="'+swatchStyle+';"></span></span>')}else{var cls='sp-clear-display';html.push($('<div />').append($('<span data-color="" style="background-color:transparent;" class="'+cls+'"></span>').attr('title',opts.noColorSelectedText)).html())}}
		return"<div class='sp-cf "+className+"'>"+html.join('')+"</div>"}
		function hideAll(){for(var i=0;i<spectrums.length;i++){if(spectrums[i]){spectrums[i].hide()}}}
		function instanceOptions(o,callbackContext){var opts=$.extend({},defaultOpts,o);opts.callbacks={'move':bind(opts.move,callbackContext),'change':bind(opts.change,callbackContext),'show':bind(opts.show,callbackContext),'hide':bind(opts.hide,callbackContext),'beforeShow':bind(opts.beforeShow,callbackContext)};return opts}
		function spectrum(element,o){var opts=instanceOptions(o,element),flat=opts.flat,showSelectionPalette=opts.showSelectionPalette,localStorageKey=opts.localStorageKey,theme=opts.theme,callbacks=opts.callbacks,resize=throttle(reflow,10),visible=!1,isDragging=!1,dragWidth=0,dragHeight=0,dragHelperHeight=0,slideHeight=0,slideWidth=0,alphaWidth=0,alphaSlideHelperWidth=0,slideHelperHeight=0,currentHue=0,currentSaturation=0,currentValue=0,currentAlpha=1,palette=[],paletteArray=[],paletteLookup={},selectionPalette=opts.selectionPalette.slice(0),maxSelectionSize=opts.maxSelectionSize,draggingClass="sp-dragging",shiftMovementDirection=null;var doc=element.ownerDocument,body=doc.body,boundElement=$(element),disabled=!1,container=$(markup,doc).addClass(theme),pickerContainer=container.find(".sp-picker-container"),dragger=container.find(".sp-color"),dragHelper=container.find(".sp-dragger"),slider=container.find(".sp-hue"),slideHelper=container.find(".sp-slider"),alphaSliderInner=container.find(".sp-alpha-inner"),alphaSlider=container.find(".sp-alpha"),alphaSlideHelper=container.find(".sp-alpha-handle"),textInput=container.find(".sp-input"),paletteContainer=container.find(".sp-palette"),initialColorContainer=container.find(".sp-initial"),cancelButton=container.find(".sp-cancel"),clearButton=container.find(".sp-clear"),chooseButton=container.find(".sp-choose"),toggleButton=container.find(".sp-palette-toggle"),isInput=boundElement.is("input"),isInputTypeColor=isInput&&boundElement.attr("type")==="color"&&inputTypeColorSupport(),shouldReplace=isInput&&!flat,replacer=(shouldReplace)?$(replaceInput).addClass(theme).addClass(opts.className).addClass(opts.replacerClassName):$([]),offsetElement=(shouldReplace)?replacer:boundElement,previewElement=replacer.find(".sp-preview-inner"),initialColor=opts.color||(isInput&&boundElement.val()),colorOnShow=!1,currentPreferredFormat=opts.preferredFormat,clickoutFiresChange=!opts.showButtons||opts.clickoutFiresChange,isEmpty=!initialColor,allowEmpty=opts.allowEmpty&&!isInputTypeColor;function applyOptions(){if(opts.showPaletteOnly){opts.showPalette=!0}
		toggleButton.text(opts.showPaletteOnly?opts.togglePaletteMoreText:opts.togglePaletteLessText);if(opts.palette){palette=opts.palette.slice(0);paletteArray=Array.isArray(palette[0])?palette:[palette];paletteLookup={};for(var i=0;i<paletteArray.length;i++){for(var j=0;j<paletteArray[i].length;j++){var rgb=tinycolor(paletteArray[i][j]).toRgbString();paletteLookup[rgb]=!0}}}
		container.toggleClass("sp-flat",flat);container.toggleClass("sp-input-disabled",!opts.showInput);container.toggleClass("sp-alpha-enabled",opts.showAlpha);container.toggleClass("sp-clear-enabled",allowEmpty);container.toggleClass("sp-buttons-disabled",!opts.showButtons);container.toggleClass("sp-palette-buttons-disabled",!opts.togglePaletteOnly);container.toggleClass("sp-palette-disabled",!opts.showPalette);container.toggleClass("sp-palette-only",opts.showPaletteOnly);container.toggleClass("sp-initial-disabled",!opts.showInitial);container.addClass(opts.className).addClass(opts.containerClassName);reflow()}
		function initialize(){if(IE){container.find("*:not(input)").attr("unselectable","on")}
		applyOptions();if(shouldReplace){boundElement.after(replacer).hide()}
		if(!allowEmpty){clearButton.hide()}
		if(flat){boundElement.after(container).hide()}else{var appendTo=opts.appendTo==="parent"?boundElement.parent():$(opts.appendTo);if(appendTo.length!==1){appendTo=$("body")}
		appendTo.append(container)}
		updateSelectionPaletteFromStorage();offsetElement.on("click.spectrum touchstart.spectrum",function(e){if(!disabled){toggle()}
		e.stopPropagation();if(!$(e.target).is("input")){e.preventDefault()}});if(boundElement.is(":disabled")||(opts.disabled===!0)){disable()}
		container.on("click",stopPropagation);textInput.on("change",setFromTextInput);textInput.on("paste",function(){setTimeout(setFromTextInput,1)});textInput.on("keydown",function(e){if(e.keyCode==13){setFromTextInput()}});cancelButton.text(opts.cancelText);cancelButton.on("click.spectrum",function(e){e.stopPropagation();e.preventDefault();revert();hide()});clearButton.attr("title",opts.clearText);clearButton.on("click.spectrum",function(e){e.stopPropagation();e.preventDefault();isEmpty=!0;move();if(flat){updateOriginalInput(!0)}});chooseButton.text(opts.chooseText);chooseButton.on("click.spectrum",function(e){e.stopPropagation();e.preventDefault();if(IE&&textInput.is(":focus")){textInput.trigger('change')}
		if(isValid()){updateOriginalInput(!0);hide()}});toggleButton.text(opts.showPaletteOnly?opts.togglePaletteMoreText:opts.togglePaletteLessText);toggleButton.on("click.spectrum",function(e){e.stopPropagation();e.preventDefault();opts.showPaletteOnly=!opts.showPaletteOnly;if(!opts.showPaletteOnly&&!flat){container.css('left','-='+(pickerContainer.outerWidth(!0)+5))}
		applyOptions()});draggable(alphaSlider,function(dragX,dragY,e){currentAlpha=(dragX/alphaWidth);isEmpty=!1;if(e.shiftKey){currentAlpha=Math.round(currentAlpha*10)/10}
		move()},dragStart,dragStop);draggable(slider,function(dragX,dragY){currentHue=parseFloat(dragY/slideHeight);isEmpty=!1;if(!opts.showAlpha){currentAlpha=1}
		move()},dragStart,dragStop);draggable(dragger,function(dragX,dragY,e){if(!e.shiftKey){shiftMovementDirection=null}else if(!shiftMovementDirection){var oldDragX=currentSaturation*dragWidth;var oldDragY=dragHeight-(currentValue*dragHeight);var furtherFromX=Math.abs(dragX-oldDragX)>Math.abs(dragY-oldDragY);shiftMovementDirection=furtherFromX?"x":"y"}
		var setSaturation=!shiftMovementDirection||shiftMovementDirection==="x";var setValue=!shiftMovementDirection||shiftMovementDirection==="y";if(setSaturation){currentSaturation=parseFloat(dragX/dragWidth)}
		if(setValue){currentValue=parseFloat((dragHeight-dragY)/dragHeight)}
		isEmpty=!1;if(!opts.showAlpha){currentAlpha=1}
		move()},dragStart,dragStop);if(!!initialColor){set(initialColor);updateUI();currentPreferredFormat=opts.preferredFormat||tinycolor(initialColor).format;addColorToSelectionPalette(initialColor)}else{updateUI()}
		if(flat){show()}
		function paletteElementClick(e){if(e.data&&e.data.ignore){set($(e.target).closest(".sp-thumb-el").data("color"));move()}else{set($(e.target).closest(".sp-thumb-el").data("color"));move();if(opts.hideAfterPaletteSelect){updateOriginalInput(!0);hide()}else{updateOriginalInput()}}
		return!1}
		var paletteEvent=IE?"mousedown.spectrum":"click.spectrum touchstart.spectrum";paletteContainer.on(paletteEvent,".sp-thumb-el",paletteElementClick);initialColorContainer.on(paletteEvent,".sp-thumb-el:nth-child(1)",{ignore:!0},paletteElementClick)}
		function updateSelectionPaletteFromStorage(){if(localStorageKey&&window.localStorage){try{var oldPalette=window.localStorage[localStorageKey].split(",#");if(oldPalette.length>1){delete window.localStorage[localStorageKey];$.each(oldPalette,function(i,c){addColorToSelectionPalette(c)})}}catch(e){}
		try{selectionPalette=window.localStorage[localStorageKey].split(";")}catch(e){}}}
		function addColorToSelectionPalette(color){if(showSelectionPalette){var rgb=tinycolor(color).toRgbString();if(!paletteLookup[rgb]&&$.inArray(rgb,selectionPalette)===-1){selectionPalette.push(rgb);while(selectionPalette.length>maxSelectionSize){selectionPalette.shift()}}
		if(localStorageKey&&window.localStorage){try{window.localStorage[localStorageKey]=selectionPalette.join(";")}catch(e){}}}}
		function getUniqueSelectionPalette(){var unique=[];if(opts.showPalette){for(var i=0;i<selectionPalette.length;i++){var rgb=tinycolor(selectionPalette[i]).toRgbString();if(!paletteLookup[rgb]){unique.push(selectionPalette[i])}}}
		return unique.reverse().slice(0,opts.maxSelectionSize)}
		function drawPalette(){var currentColor=get();var html=$.map(paletteArray,function(palette,i){return paletteTemplate(palette,currentColor,"sp-palette-row sp-palette-row-"+i,opts)});updateSelectionPaletteFromStorage();if(selectionPalette){html.push(paletteTemplate(getUniqueSelectionPalette(),currentColor,"sp-palette-row sp-palette-row-selection",opts))}
		paletteContainer.html(html.join(""))}
		function drawInitial(){if(opts.showInitial){var initial=colorOnShow;var current=get();initialColorContainer.html(paletteTemplate([initial,current],current,"sp-palette-row-initial",opts))}}
		function dragStart(){if(dragHeight<=0||dragWidth<=0||slideHeight<=0){reflow()}
		isDragging=!0;container.addClass(draggingClass);shiftMovementDirection=null;boundElement.trigger('dragstart.spectrum',[get()])}
		function dragStop(){isDragging=!1;container.removeClass(draggingClass);boundElement.trigger('dragstop.spectrum',[get()])}
		function setFromTextInput(){var value=textInput.val();if((value===null||value==="")&&allowEmpty){set(null);move();updateOriginalInput()}else{var tiny=tinycolor(value);if(tiny.isValid()){set(tiny);move();updateOriginalInput()}else{textInput.addClass("sp-validation-error")}}}
		function toggle(){if(visible){hide()}else{show()}}
		function show(){var event=$.Event('beforeShow.spectrum');if(visible){reflow();return}
		boundElement.trigger(event,[get()]);if(callbacks.beforeShow(get())===!1||event.isDefaultPrevented()){return}
		hideAll();visible=!0;$(doc).on("keydown.spectrum",onkeydown);$(doc).on("click.spectrum",clickout);$(window).on("resize.spectrum",resize);replacer.addClass("sp-active");container.removeClass("sp-hidden");reflow();updateUI();colorOnShow=get();drawInitial();callbacks.show(colorOnShow);boundElement.trigger('show.spectrum',[colorOnShow])}
		function onkeydown(e){if(e.keyCode===27){hide()}}
		function clickout(e){if(e.button==2){return}
		if(isDragging){return}
		if(clickoutFiresChange){updateOriginalInput(!0)}else{revert()}
		hide()}
		function hide(){if(!visible||flat){return}
		visible=!1;$(doc).off("keydown.spectrum",onkeydown);$(doc).off("click.spectrum",clickout);$(window).off("resize.spectrum",resize);replacer.removeClass("sp-active");container.addClass("sp-hidden");callbacks.hide(get());boundElement.trigger('hide.spectrum',[get()])}
		function revert(){set(colorOnShow,!0);updateOriginalInput(!0)}
		function set(color,ignoreFormatChange){if(tinycolor.equals(color,get())){updateUI();return}
		var newColor,newHsv;if(!color&&allowEmpty){isEmpty=!0}else{isEmpty=!1;newColor=tinycolor(color);newHsv=newColor.toHsv();currentHue=(newHsv.h%360)/360;currentSaturation=newHsv.s;currentValue=newHsv.v;currentAlpha=newHsv.a}
		updateUI();if(newColor&&newColor.isValid()&&!ignoreFormatChange){currentPreferredFormat=opts.preferredFormat||newColor.getFormat()}}
		function get(opts){opts=opts||{};if(allowEmpty&&isEmpty){return null}
		return tinycolor.fromRatio({h:currentHue,s:currentSaturation,v:currentValue,a:Math.round(currentAlpha*1000)/1000},{format:opts.format||currentPreferredFormat})}
		function isValid(){return!textInput.hasClass("sp-validation-error")}
		function move(){updateUI();callbacks.move(get());boundElement.trigger('move.spectrum',[get()])}
		function updateUI(){textInput.removeClass("sp-validation-error");updateHelperLocations();var flatColor=tinycolor.fromRatio({h:currentHue,s:1,v:1});dragger.css("background-color",flatColor.toHexString());var format=currentPreferredFormat;if(currentAlpha<1&&!(currentAlpha===0&&format==="name")){if(format==="hex"||format==="hex3"||format==="hex6"||format==="name"){format="rgb"}}
		var realColor=get({format:format}),displayColor='';previewElement.removeClass("sp-clear-display");previewElement.css('background-color','transparent');if(!realColor&&allowEmpty){previewElement.addClass("sp-clear-display")}else{var realHex=realColor.toHexString(),realRgb=realColor.toRgbString();if(rgbaSupport||realColor.alpha===1){previewElement.css("background-color",realRgb)}else{previewElement.css("background-color","transparent");previewElement.css("filter",realColor.toFilter())}
		if(opts.showAlpha){var rgb=realColor.toRgb();rgb.a=0;var realAlpha=tinycolor(rgb).toRgbString();var gradient="linear-gradient(left, "+realAlpha+", "+realHex+")";if(IE){alphaSliderInner.css("filter",tinycolor(realAlpha).toFilter({gradientType:1},realHex))}else{alphaSliderInner.css("background","-webkit-"+gradient);alphaSliderInner.css("background","-moz-"+gradient);alphaSliderInner.css("background","-ms-"+gradient);alphaSliderInner.css("background","linear-gradient(to right, "+realAlpha+", "+realHex+")")}}
		displayColor=realColor.toString(format)}
		if(opts.showInput){textInput.val(displayColor)}
		if(opts.showPalette){drawPalette()}
		drawInitial()}
		function updateHelperLocations(){var s=currentSaturation;var v=currentValue;if(allowEmpty&&isEmpty){alphaSlideHelper.hide();slideHelper.hide();dragHelper.hide()}else{alphaSlideHelper.show();slideHelper.show();dragHelper.show();var dragX=s*dragWidth;var dragY=dragHeight-(v*dragHeight);dragX=Math.max(-dragHelperHeight,Math.min(dragWidth-dragHelperHeight,dragX-dragHelperHeight));dragY=Math.max(-dragHelperHeight,Math.min(dragHeight-dragHelperHeight,dragY-dragHelperHeight));dragHelper.css({"top":dragY+"px","left":dragX+"px"});var alphaX=currentAlpha*alphaWidth;alphaSlideHelper.css({"left":(alphaX-(alphaSlideHelperWidth/2))+"px"});var slideY=(currentHue)*slideHeight;slideHelper.css({"top":(slideY-slideHelperHeight)+"px"})}}
		function updateOriginalInput(fireCallback){var color=get(),displayColor='',hasChanged=!tinycolor.equals(color,colorOnShow);if(color){displayColor=color.toString(currentPreferredFormat);addColorToSelectionPalette(color)}
		if(isInput){boundElement.val(displayColor)}
		if(fireCallback&&hasChanged){callbacks.change(color);boundElement.trigger('change',[color])}}
		function reflow(){if(!visible){return}
		dragWidth=dragger.width();dragHeight=dragger.height();dragHelperHeight=dragHelper.height();slideWidth=slider.width();slideHeight=slider.height();slideHelperHeight=slideHelper.height();alphaWidth=alphaSlider.width();alphaSlideHelperWidth=alphaSlideHelper.width();if(!flat){container.css("position","absolute");if(opts.offset){container.offset(opts.offset)}else{container.offset(getOffset(container,offsetElement))}}
		updateHelperLocations();if(opts.showPalette){drawPalette()}
		boundElement.trigger('reflow.spectrum')}
		function destroy(){boundElement.show();offsetElement.off("click.spectrum touchstart.spectrum");container.remove();replacer.remove();spectrums[spect.id]=null}
		function option(optionName,optionValue){if(optionName===undefined){return $.extend({},opts)}
		if(optionValue===undefined){return opts[optionName]}
		opts[optionName]=optionValue;if(optionName==="preferredFormat"){currentPreferredFormat=opts.preferredFormat}
		applyOptions()}
		function enable(){disabled=!1;boundElement.attr("disabled",!1);offsetElement.removeClass("sp-disabled")}
		function disable(){hide();disabled=!0;boundElement.attr("disabled",!0);offsetElement.addClass("sp-disabled")}
		function setOffset(coord){opts.offset=coord;reflow()}
		initialize();var spect={show:show,hide:hide,toggle:toggle,reflow:reflow,option:option,enable:enable,disable:disable,offset:setOffset,set:function(c){set(c);updateOriginalInput()},get:get,destroy:destroy,container:container};spect.id=spectrums.push(spect)-1;return spect}
		function getOffset(picker,input){var extraY=0;var dpWidth=picker.outerWidth();var dpHeight=picker.outerHeight();var inputHeight=input.outerHeight();var doc=picker[0].ownerDocument;var docElem=doc.documentElement;var viewWidth=docElem.clientWidth+$(doc).scrollLeft();var viewHeight=docElem.clientHeight+$(doc).scrollTop();var offset=input.offset();var offsetLeft=offset.left;var offsetTop=offset.top;offsetTop+=inputHeight;offsetLeft-=Math.min(offsetLeft,(offsetLeft+dpWidth>viewWidth&&viewWidth>dpWidth)?Math.abs(offsetLeft+dpWidth-viewWidth):0);offsetTop-=Math.min(offsetTop,((offsetTop+dpHeight>viewHeight&&viewHeight>dpHeight)?Math.abs(dpHeight+inputHeight-extraY):extraY));return{top:offsetTop,bottom:offset.bottom,left:offsetLeft,right:offset.right,width:offset.width,height:offset.height}}
		function noop(){}
		function stopPropagation(e){e.stopPropagation()}
		function bind(func,obj){var slice=Array.prototype.slice;var args=slice.call(arguments,2);return function(){return func.apply(obj,args.concat(slice.call(arguments)))}}
		function draggable(element,onmove,onstart,onstop){onmove=onmove||function(){};onstart=onstart||function(){};onstop=onstop||function(){};var doc=document;var dragging=!1;var offset={};var maxHeight=0;var maxWidth=0;var hasTouch=('ontouchstart' in window);var duringDragEvents={};duringDragEvents.selectstart=prevent;duringDragEvents.dragstart=prevent;duringDragEvents["touchmove mousemove"]=move;duringDragEvents["touchend mouseup"]=stop;function prevent(e){if(e.stopPropagation){e.stopPropagation()}
		if(e.preventDefault){e.preventDefault()}
		e.returnValue=!1}
		function move(e){if(dragging){if(IE&&doc.documentMode<9&&!e.button){return stop()}
		var t0=e.originalEvent&&e.originalEvent.touches&&e.originalEvent.touches[0];var pageX=t0&&t0.pageX||e.pageX;var pageY=t0&&t0.pageY||e.pageY;var dragX=Math.max(0,Math.min(pageX-offset.left,maxWidth));var dragY=Math.max(0,Math.min(pageY-offset.top,maxHeight));if(hasTouch){prevent(e)}
		onmove.apply(element,[dragX,dragY,e])}}
		function start(e){var rightclick=(e.which)?(e.which==3):(e.button==2);if(!rightclick&&!dragging){if(onstart.apply(element,arguments)!==!1){dragging=!0;maxHeight=$(element).height();maxWidth=$(element).width();offset=$(element).offset();$(doc).on(duringDragEvents);$(doc.body).addClass("sp-dragging");move(e);prevent(e)}}}
		function stop(){if(dragging){$(doc).off(duringDragEvents);$(doc.body).removeClass("sp-dragging");setTimeout(function(){onstop.apply(element,arguments)},0)}
		dragging=!1}
		$(element).on("touchstart mousedown",start)}
		function throttle(func,wait,debounce){var timeout;return function(){var context=this,args=arguments;var throttler=function(){timeout=null;func.apply(context,args)};if(debounce)clearTimeout(timeout);if(debounce||!timeout)timeout=setTimeout(throttler,wait)}}
		function inputTypeColorSupport(){return $.fn.spectrum.inputTypeColorSupport()}
		var dataID="spectrum.id";$.fn.spectrum=function(opts,extra){if(typeof opts=="string"){var returnValue=this;var args=Array.prototype.slice.call(arguments,1);this.each(function(){var spect=spectrums[$(this).data(dataID)];if(spect){var method=spect[opts];if(!method){throw new Error("Spectrum: no such method: '"+opts+"'")}
		if(opts=="get"){returnValue=spect.get()}else if(opts=="container"){returnValue=spect.container}else if(opts=="option"){returnValue=spect.option.apply(spect,args)}else if(opts=="destroy"){spect.destroy();$(this).removeData(dataID)}else{method.apply(spect,args)}}});return returnValue}
		return this.spectrum("destroy").each(function(){var options=$.extend({},$(this).data(),opts);var spect=spectrum(this,options);$(this).data(dataID,spect.id)})};$.fn.spectrum.load=!0;$.fn.spectrum.loadOpts={};$.fn.spectrum.draggable=draggable;$.fn.spectrum.defaults=defaultOpts;$.fn.spectrum.inputTypeColorSupport=function inputTypeColorSupport(){if(typeof inputTypeColorSupport._cachedResult==="undefined"){var colorInput=$("<input type='color'/>")[0];inputTypeColorSupport._cachedResult=colorInput.type==="color"&&colorInput.value!==""}
		return inputTypeColorSupport._cachedResult};$.spectrum={};$.spectrum.localization={};$.spectrum.palettes={};$.fn.spectrum.processNativeColorInputs=function(){var colorInputs=$("input[type=color]");if(colorInputs.length&&!inputTypeColorSupport()){colorInputs.spectrum({preferredFormat:"hex6"})}};(function(){var trimLeft=/^[\s,#]+/,trimRight=/\s+$/,tinyCounter=0,math=Math,mathRound=math.round,mathMin=math.min,mathMax=math.max,mathRandom=math.random;var tinycolor=function(color,opts){color=(color)?color:'';opts=opts||{};if(color instanceof tinycolor){return color}
		if(!(this instanceof tinycolor)){return new tinycolor(color,opts)}
		var rgb=inputToRGB(color);this._originalInput=color;this._r=rgb.r;this._g=rgb.g;this._b=rgb.b;this._a=rgb.a;this._roundA=mathRound(1000*this._a)/1000;this._format=opts.format||rgb.format;this._gradientType=opts.gradientType;if(this._r<1){this._r=mathRound(this._r)}
		if(this._g<1){this._g=mathRound(this._g)}
		if(this._b<1){this._b=mathRound(this._b)}
		this._ok=rgb.ok;this._tc_id=tinyCounter++};tinycolor.prototype={isDark:function(){return this.getBrightness()<128},isLight:function(){return!this.isDark()},isValid:function(){return this._ok},getOriginalInput:function(){return this._originalInput},getFormat:function(){return this._format},getAlpha:function(){return this._a},getBrightness:function(){var rgb=this.toRgb();return(rgb.r*299+rgb.g*587+rgb.b*114)/1000},setAlpha:function(value){this._a=boundAlpha(value);this._roundA=mathRound(1000*this._a)/1000;return this},toHsv:function(){var hsv=rgbToHsv(this._r,this._g,this._b);return{h:hsv.h*360,s:hsv.s,v:hsv.v,a:this._a}},toHsvString:function(){var hsv=rgbToHsv(this._r,this._g,this._b);var h=mathRound(hsv.h*360),s=mathRound(hsv.s*100),v=mathRound(hsv.v*100);return(this._a==1)?"hsv("+h+", "+s+"%, "+v+"%)":"hsva("+h+", "+s+"%, "+v+"%, "+this._roundA+")"},toHsl:function(){var hsl=rgbToHsl(this._r,this._g,this._b);return{h:hsl.h*360,s:hsl.s,l:hsl.l,a:this._a}},toHslString:function(){var hsl=rgbToHsl(this._r,this._g,this._b);var h=mathRound(hsl.h*360),s=mathRound(hsl.s*100),l=mathRound(hsl.l*100);return(this._a==1)?"hsl("+h+", "+s+"%, "+l+"%)":"hsla("+h+", "+s+"%, "+l+"%, "+this._roundA+")"},toHex:function(allow3Char){return rgbToHex(this._r,this._g,this._b,allow3Char)},toHexString:function(allow3Char){return'#'+this.toHex(allow3Char)},toHex8:function(){return rgbaToHex(this._r,this._g,this._b,this._a)},toHex8String:function(){return'#'+this.toHex8()},toRgb:function(){return{r:mathRound(this._r),g:mathRound(this._g),b:mathRound(this._b),a:this._a}},toRgbString:function(){return(this._a==1)?"rgb("+mathRound(this._r)+", "+mathRound(this._g)+", "+mathRound(this._b)+")":"rgba("+mathRound(this._r)+", "+mathRound(this._g)+", "+mathRound(this._b)+", "+this._roundA+")"},toPercentageRgb:function(){return{r:mathRound(bound01(this._r,255)*100)+"%",g:mathRound(bound01(this._g,255)*100)+"%",b:mathRound(bound01(this._b,255)*100)+"%",a:this._a}},toPercentageRgbString:function(){return(this._a==1)?"rgb("+mathRound(bound01(this._r,255)*100)+"%, "+mathRound(bound01(this._g,255)*100)+"%, "+mathRound(bound01(this._b,255)*100)+"%)":"rgba("+mathRound(bound01(this._r,255)*100)+"%, "+mathRound(bound01(this._g,255)*100)+"%, "+mathRound(bound01(this._b,255)*100)+"%, "+this._roundA+")"},toName:function(){if(this._a===0){return"transparent"}
		if(this._a<1){return!1}
		return hexNames[rgbToHex(this._r,this._g,this._b,!0)]||!1},toFilter:function(secondColor){var hex8String='#'+rgbaToHex(this._r,this._g,this._b,this._a);var secondHex8String=hex8String;var gradientType=this._gradientType?"GradientType = 1, ":"";if(secondColor){var s=tinycolor(secondColor);secondHex8String=s.toHex8String()}
		return"progid:DXImageTransform.Microsoft.gradient("+gradientType+"startColorstr="+hex8String+",endColorstr="+secondHex8String+")"},toString:function(format){var formatSet=!!format;format=format||this._format;var formattedString=!1;var hasAlpha=this._a<1&&this._a>=0;var needsAlphaFormat=!formatSet&&hasAlpha&&(format==="hex"||format==="hex6"||format==="hex3"||format==="name");if(needsAlphaFormat){if(format==="name"&&this._a===0){return this.toName()}
		return this.toRgbString()}
		if(format==="rgb"){formattedString=this.toRgbString()}
		if(format==="prgb"){formattedString=this.toPercentageRgbString()}
		if(format==="hex"||format==="hex6"){formattedString=this.toHexString()}
		if(format==="hex3"){formattedString=this.toHexString(!0)}
		if(format==="hex8"){formattedString=this.toHex8String()}
		if(format==="name"){formattedString=this.toName()}
		if(format==="hsl"){formattedString=this.toHslString()}
		if(format==="hsv"){formattedString=this.toHsvString()}
		return formattedString||this.toHexString()},_applyModification:function(fn,args){var color=fn.apply(null,[this].concat([].slice.call(args)));this._r=color._r;this._g=color._g;this._b=color._b;this.setAlpha(color._a);return this},lighten:function(){return this._applyModification(lighten,arguments)},brighten:function(){return this._applyModification(brighten,arguments)},darken:function(){return this._applyModification(darken,arguments)},desaturate:function(){return this._applyModification(desaturate,arguments)},saturate:function(){return this._applyModification(saturate,arguments)},greyscale:function(){return this._applyModification(greyscale,arguments)},spin:function(){return this._applyModification(spin,arguments)},_applyCombination:function(fn,args){return fn.apply(null,[this].concat([].slice.call(args)))},analogous:function(){return this._applyCombination(analogous,arguments)},complement:function(){return this._applyCombination(complement,arguments)},monochromatic:function(){return this._applyCombination(monochromatic,arguments)},splitcomplement:function(){return this._applyCombination(splitcomplement,arguments)},triad:function(){return this._applyCombination(triad,arguments)},tetrad:function(){return this._applyCombination(tetrad,arguments)}};tinycolor.fromRatio=function(color,opts){if(typeof color=="object"){var newColor={};for(var i in color){if(color.hasOwnProperty(i)){if(i==="a"){newColor[i]=color[i]}else{newColor[i]=convertToPercentage(color[i])}}}
		color=newColor}
		return tinycolor(color,opts)};function inputToRGB(color){var rgb={r:0,g:0,b:0};var a=1;var ok=!1;var format=!1;if(typeof color=="string"){color=stringInputToObject(color)}
		if(typeof color=="object"){if(color.hasOwnProperty("r")&&color.hasOwnProperty("g")&&color.hasOwnProperty("b")){rgb=rgbToRgb(color.r,color.g,color.b);ok=!0;format=String(color.r).substr(-1)==="%"?"prgb":"rgb"}else if(color.hasOwnProperty("h")&&color.hasOwnProperty("s")&&color.hasOwnProperty("v")){color.s=convertToPercentage(color.s);color.v=convertToPercentage(color.v);rgb=hsvToRgb(color.h,color.s,color.v);ok=!0;format="hsv"}else if(color.hasOwnProperty("h")&&color.hasOwnProperty("s")&&color.hasOwnProperty("l")){color.s=convertToPercentage(color.s);color.l=convertToPercentage(color.l);rgb=hslToRgb(color.h,color.s,color.l);ok=!0;format="hsl"}
		if(color.hasOwnProperty("a")){a=color.a}}
		a=boundAlpha(a);return{ok:ok,format:color.format||format,r:mathMin(255,mathMax(rgb.r,0)),g:mathMin(255,mathMax(rgb.g,0)),b:mathMin(255,mathMax(rgb.b,0)),a:a}}
		function rgbToRgb(r,g,b){return{r:bound01(r,255)*255,g:bound01(g,255)*255,b:bound01(b,255)*255}}
		function rgbToHsl(r,g,b){r=bound01(r,255);g=bound01(g,255);b=bound01(b,255);var max=mathMax(r,g,b),min=mathMin(r,g,b);var h,s,l=(max+min)/2;if(max==min){h=s=0}else{var d=max-min;s=l>0.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break}
		h/=6}
		return{h:h,s:s,l:l}}
		function hslToRgb(h,s,l){var r,g,b;h=bound01(h,360);s=bound01(s,100);l=bound01(l,100);function hue2rgb(p,q,t){if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p}
		if(s===0){r=g=b=l}else{var q=l<0.5?l*(1+s):l+s-l*s;var p=2*l-q;r=hue2rgb(p,q,h+1/3);g=hue2rgb(p,q,h);b=hue2rgb(p,q,h-1/3)}
		return{r:r*255,g:g*255,b:b*255}}
		function rgbToHsv(r,g,b){r=bound01(r,255);g=bound01(g,255);b=bound01(b,255);var max=mathMax(r,g,b),min=mathMin(r,g,b);var h,s,v=max;var d=max-min;s=max===0?0:d/max;if(max==min){h=0}else{switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break}
		h/=6}
		return{h:h,s:s,v:v}}
		function hsvToRgb(h,s,v){h=bound01(h,360)*6;s=bound01(s,100);v=bound01(v,100);var i=math.floor(h),f=h-i,p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s),mod=i%6,r=[v,q,p,p,t,v][mod],g=[t,v,v,q,p,p][mod],b=[p,p,t,v,v,q][mod];return{r:r*255,g:g*255,b:b*255}}
		function rgbToHex(r,g,b,allow3Char){var hex=[pad2(mathRound(r).toString(16)),pad2(mathRound(g).toString(16)),pad2(mathRound(b).toString(16))];if(allow3Char&&hex[0].charAt(0)==hex[0].charAt(1)&&hex[1].charAt(0)==hex[1].charAt(1)&&hex[2].charAt(0)==hex[2].charAt(1)){return hex[0].charAt(0)+hex[1].charAt(0)+hex[2].charAt(0)}
		return hex.join("")}
		function rgbaToHex(r,g,b,a){var hex=[pad2(convertDecimalToHex(a)),pad2(mathRound(r).toString(16)),pad2(mathRound(g).toString(16)),pad2(mathRound(b).toString(16))];return hex.join("")}
		tinycolor.equals=function(color1,color2){if(!color1||!color2){return!1}
		return tinycolor(color1).toRgbString()==tinycolor(color2).toRgbString()};tinycolor.random=function(){return tinycolor.fromRatio({r:mathRandom(),g:mathRandom(),b:mathRandom()})};function desaturate(color,amount){amount=(amount===0)?0:(amount||10);var hsl=tinycolor(color).toHsl();hsl.s-=amount/100;hsl.s=clamp01(hsl.s);return tinycolor(hsl)}
		function saturate(color,amount){amount=(amount===0)?0:(amount||10);var hsl=tinycolor(color).toHsl();hsl.s+=amount/100;hsl.s=clamp01(hsl.s);return tinycolor(hsl)}
		function greyscale(color){return tinycolor(color).desaturate(100)}
		function lighten(color,amount){amount=(amount===0)?0:(amount||10);var hsl=tinycolor(color).toHsl();hsl.l+=amount/100;hsl.l=clamp01(hsl.l);return tinycolor(hsl)}
		function brighten(color,amount){amount=(amount===0)?0:(amount||10);var rgb=tinycolor(color).toRgb();rgb.r=mathMax(0,mathMin(255,rgb.r-mathRound(255*-(amount/100))));rgb.g=mathMax(0,mathMin(255,rgb.g-mathRound(255*-(amount/100))));rgb.b=mathMax(0,mathMin(255,rgb.b-mathRound(255*-(amount/100))));return tinycolor(rgb)}
		function darken(color,amount){amount=(amount===0)?0:(amount||10);var hsl=tinycolor(color).toHsl();hsl.l-=amount/100;hsl.l=clamp01(hsl.l);return tinycolor(hsl)}
		function spin(color,amount){var hsl=tinycolor(color).toHsl();var hue=(mathRound(hsl.h)+amount)%360;hsl.h=hue<0?360+hue:hue;return tinycolor(hsl)}
		function complement(color){var hsl=tinycolor(color).toHsl();hsl.h=(hsl.h+180)%360;return tinycolor(hsl)}
		function triad(color){var hsl=tinycolor(color).toHsl();var h=hsl.h;return[tinycolor(color),tinycolor({h:(h+120)%360,s:hsl.s,l:hsl.l}),tinycolor({h:(h+240)%360,s:hsl.s,l:hsl.l})]}
		function tetrad(color){var hsl=tinycolor(color).toHsl();var h=hsl.h;return[tinycolor(color),tinycolor({h:(h+90)%360,s:hsl.s,l:hsl.l}),tinycolor({h:(h+180)%360,s:hsl.s,l:hsl.l}),tinycolor({h:(h+270)%360,s:hsl.s,l:hsl.l})]}
		function splitcomplement(color){var hsl=tinycolor(color).toHsl();var h=hsl.h;return[tinycolor(color),tinycolor({h:(h+72)%360,s:hsl.s,l:hsl.l}),tinycolor({h:(h+216)%360,s:hsl.s,l:hsl.l})]}
		function analogous(color,results,slices){results=results||6;slices=slices||30;var hsl=tinycolor(color).toHsl();var part=360/slices;var ret=[tinycolor(color)];for(hsl.h=((hsl.h-(part*results>>1))+720)%360;--results;){hsl.h=(hsl.h+part)%360;ret.push(tinycolor(hsl))}
		return ret}
		function monochromatic(color,results){results=results||6;var hsv=tinycolor(color).toHsv();var h=hsv.h,s=hsv.s,v=hsv.v;var ret=[];var modification=1/results;while(results--){ret.push(tinycolor({h:h,s:s,v:v}));v=(v+modification)%1}
		return ret}
		tinycolor.mix=function(color1,color2,amount){amount=(amount===0)?0:(amount||50);var rgb1=tinycolor(color1).toRgb();var rgb2=tinycolor(color2).toRgb();var p=amount/100;var w=p*2-1;var a=rgb2.a-rgb1.a;var w1;if(w*a==-1){w1=w}else{w1=(w+a)/(1+w*a)}
		w1=(w1+1)/2;var w2=1-w1;var rgba={r:rgb2.r*w1+rgb1.r*w2,g:rgb2.g*w1+rgb1.g*w2,b:rgb2.b*w1+rgb1.b*w2,a:rgb2.a*p+rgb1.a*(1-p)};return tinycolor(rgba)};tinycolor.readability=function(color1,color2){var c1=tinycolor(color1);var c2=tinycolor(color2);var rgb1=c1.toRgb();var rgb2=c2.toRgb();var brightnessA=c1.getBrightness();var brightnessB=c2.getBrightness();var colorDiff=(Math.max(rgb1.r,rgb2.r)-Math.min(rgb1.r,rgb2.r)+Math.max(rgb1.g,rgb2.g)-Math.min(rgb1.g,rgb2.g)+Math.max(rgb1.b,rgb2.b)-Math.min(rgb1.b,rgb2.b));return{brightness:Math.abs(brightnessA-brightnessB),color:colorDiff}};tinycolor.isReadable=function(color1,color2){var readability=tinycolor.readability(color1,color2);return readability.brightness>125&&readability.color>500};tinycolor.mostReadable=function(baseColor,colorList){var bestColor=null;var bestScore=0;var bestIsReadable=!1;for(var i=0;i<colorList.length;i++){var readability=tinycolor.readability(baseColor,colorList[i]);var readable=readability.brightness>125&&readability.color>500;var score=3*(readability.brightness/125)+(readability.color/500);if((readable&&!bestIsReadable)||(readable&&bestIsReadable&&score>bestScore)||((!readable)&&(!bestIsReadable)&&score>bestScore)){bestIsReadable=readable;bestScore=score;bestColor=tinycolor(colorList[i])}}
		return bestColor};var names=tinycolor.names={aliceblue:"f0f8ff",antiquewhite:"faebd7",aqua:"0ff",aquamarine:"7fffd4",azure:"f0ffff",beige:"f5f5dc",bisque:"ffe4c4",black:"000",blanchedalmond:"ffebcd",blue:"00f",blueviolet:"8a2be2",brown:"a52a2a",burlywood:"deb887",burntsienna:"ea7e5d",cadetblue:"5f9ea0",chartreuse:"7fff00",chocolate:"d2691e",coral:"ff7f50",cornflowerblue:"6495ed",cornsilk:"fff8dc",crimson:"dc143c",cyan:"0ff",darkblue:"00008b",darkcyan:"008b8b",darkgoldenrod:"b8860b",darkgray:"a9a9a9",darkgreen:"006400",darkgrey:"a9a9a9",darkkhaki:"bdb76b",darkmagenta:"8b008b",darkolivegreen:"556b2f",darkorange:"ff8c00",darkorchid:"9932cc",darkred:"8b0000",darksalmon:"e9967a",darkseagreen:"8fbc8f",darkslateblue:"483d8b",darkslategray:"2f4f4f",darkslategrey:"2f4f4f",darkturquoise:"00ced1",darkviolet:"9400d3",deeppink:"ff1493",deepskyblue:"00bfff",dimgray:"696969",dimgrey:"696969",dodgerblue:"1e90ff",firebrick:"b22222",floralwhite:"fffaf0",forestgreen:"228b22",fuchsia:"f0f",gainsboro:"dcdcdc",ghostwhite:"f8f8ff",gold:"ffd700",goldenrod:"daa520",gray:"808080",green:"008000",greenyellow:"adff2f",grey:"808080",honeydew:"f0fff0",hotpink:"ff69b4",indianred:"cd5c5c",indigo:"4b0082",ivory:"fffff0",khaki:"f0e68c",lavender:"e6e6fa",lavenderblush:"fff0f5",lawngreen:"7cfc00",lemonchiffon:"fffacd",lightblue:"add8e6",lightcoral:"f08080",lightcyan:"e0ffff",lightgoldenrodyellow:"fafad2",lightgray:"d3d3d3",lightgreen:"90ee90",lightgrey:"d3d3d3",lightpink:"ffb6c1",lightsalmon:"ffa07a",lightseagreen:"20b2aa",lightskyblue:"87cefa",lightslategray:"789",lightslategrey:"789",lightsteelblue:"b0c4de",lightyellow:"ffffe0",lime:"0f0",limegreen:"32cd32",linen:"faf0e6",magenta:"f0f",maroon:"800000",mediumaquamarine:"66cdaa",mediumblue:"0000cd",mediumorchid:"ba55d3",mediumpurple:"9370db",mediumseagreen:"3cb371",mediumslateblue:"7b68ee",mediumspringgreen:"00fa9a",mediumturquoise:"48d1cc",mediumvioletred:"c71585",midnightblue:"191970",mintcream:"f5fffa",mistyrose:"ffe4e1",moccasin:"ffe4b5",navajowhite:"ffdead",navy:"000080",oldlace:"fdf5e6",olive:"808000",olivedrab:"6b8e23",orange:"ffa500",orangered:"ff4500",orchid:"da70d6",palegoldenrod:"eee8aa",palegreen:"98fb98",paleturquoise:"afeeee",palevioletred:"db7093",papayawhip:"ffefd5",peachpuff:"ffdab9",peru:"cd853f",pink:"ffc0cb",plum:"dda0dd",powderblue:"b0e0e6",purple:"800080",rebeccapurple:"663399",red:"f00",rosybrown:"bc8f8f",royalblue:"4169e1",saddlebrown:"8b4513",salmon:"fa8072",sandybrown:"f4a460",seagreen:"2e8b57",seashell:"fff5ee",sienna:"a0522d",silver:"c0c0c0",skyblue:"87ceeb",slateblue:"6a5acd",slategray:"708090",slategrey:"708090",snow:"fffafa",springgreen:"00ff7f",steelblue:"4682b4",tan:"d2b48c",teal:"008080",thistle:"d8bfd8",tomato:"ff6347",turquoise:"40e0d0",violet:"ee82ee",wheat:"f5deb3",white:"fff",whitesmoke:"f5f5f5",yellow:"ff0",yellowgreen:"9acd32"};var hexNames=tinycolor.hexNames=flip(names);function flip(o){var flipped={};for(var i in o){if(o.hasOwnProperty(i)){flipped[o[i]]=i}}
		return flipped}
		function boundAlpha(a){a=parseFloat(a);if(isNaN(a)||a<0||a>1){a=1}
		return a}
		function bound01(n,max){if(isOnePointZero(n)){n="100%"}
		var processPercent=isPercentage(n);n=mathMin(max,mathMax(0,parseFloat(n)));if(processPercent){n=parseInt(n*max,10)/100}
		if((math.abs(n-max)<0.000001)){return 1}
		return(n%max)/parseFloat(max)}
		function clamp01(val){return mathMin(1,mathMax(0,val))}
		function parseIntFromHex(val){return parseInt(val,16)}
		function isOnePointZero(n){return typeof n=="string"&&n.indexOf('.')!=-1&&parseFloat(n)===1}
		function isPercentage(n){return typeof n==="string"&&n.indexOf('%')!=-1}
		function pad2(c){return c.length==1?'0'+c:''+c}
		function convertToPercentage(n){if(n<=1){n=(n*100)+"%"}
		return n}
		function convertDecimalToHex(d){return Math.round(parseFloat(d)*255).toString(16)}
		function convertHexToDecimal(h){return(parseIntFromHex(h)/255)}
		var matchers=(function(){var CSS_INTEGER="[-\\+]?\\d+%?";var CSS_NUMBER="[-\\+]?\\d*\\.\\d+%?";var CSS_UNIT="(?:"+CSS_NUMBER+")|(?:"+CSS_INTEGER+")";var PERMISSIVE_MATCH3="[\\s|\\(]+("+CSS_UNIT+")[,|\\s]+("+CSS_UNIT+")[,|\\s]+("+CSS_UNIT+")\\s*\\)?";var PERMISSIVE_MATCH4="[\\s|\\(]+("+CSS_UNIT+")[,|\\s]+("+CSS_UNIT+")[,|\\s]+("+CSS_UNIT+")[,|\\s]+("+CSS_UNIT+")\\s*\\)?";return{rgb:new RegExp("rgb"+PERMISSIVE_MATCH3),rgba:new RegExp("rgba"+PERMISSIVE_MATCH4),hsl:new RegExp("hsl"+PERMISSIVE_MATCH3),hsla:new RegExp("hsla"+PERMISSIVE_MATCH4),hsv:new RegExp("hsv"+PERMISSIVE_MATCH3),hsva:new RegExp("hsva"+PERMISSIVE_MATCH4),hex3:/^([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,hex6:/^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,hex8:/^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/}})();function stringInputToObject(color){color=color.replace(trimLeft,'').replace(trimRight,'').toLowerCase();var named=!1;if(names[color]){color=names[color];named=!0}else if(color=='transparent'){return{r:0,g:0,b:0,a:0,format:"name"}}
		var match;if((match=matchers.rgb.exec(color))){return{r:match[1],g:match[2],b:match[3]}}
		if((match=matchers.rgba.exec(color))){return{r:match[1],g:match[2],b:match[3],a:match[4]}}
		if((match=matchers.hsl.exec(color))){return{h:match[1],s:match[2],l:match[3]}}
		if((match=matchers.hsla.exec(color))){return{h:match[1],s:match[2],l:match[3],a:match[4]}}
		if((match=matchers.hsv.exec(color))){return{h:match[1],s:match[2],v:match[3]}}
		if((match=matchers.hsva.exec(color))){return{h:match[1],s:match[2],v:match[3],a:match[4]}}
		if((match=matchers.hex8.exec(color))){return{a:convertHexToDecimal(match[1]),r:parseIntFromHex(match[2]),g:parseIntFromHex(match[3]),b:parseIntFromHex(match[4]),format:named?"name":"hex8"}}
		if((match=matchers.hex6.exec(color))){return{r:parseIntFromHex(match[1]),g:parseIntFromHex(match[2]),b:parseIntFromHex(match[3]),format:named?"name":"hex"}}
		if((match=matchers.hex3.exec(color))){return{r:parseIntFromHex(match[1]+''+match[1]),g:parseIntFromHex(match[2]+''+match[2]),b:parseIntFromHex(match[3]+''+match[3]),format:named?"name":"hex"}}
		return!1}
		window.tinycolor=tinycolor})();$(function(){if($.fn.spectrum.load){$.fn.spectrum.processNativeColorInputs()}})});

        $('head').append('<style>.sp-container{position:absolute;top:0;left:0;display:inline-block;*display:inline;*zoom:1;z-index:9999994;overflow:hidden}.sp-container.sp-flat{position:relative}.sp-container,.sp-container *{-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box}.sp-top{position:relative;width:100%;display:inline-block}.sp-top-inner{position:absolute;top:0;left:0;bottom:0;right:0}.sp-color{position:absolute;top:0;left:0;bottom:0;right:20%}.sp-hue{position:absolute;top:0;right:0;bottom:0;left:84%;height:100%}.sp-clear-enabled .sp-hue{top:33px;height:77.5%}.sp-fill{padding-top:80%}.sp-sat,.sp-val{position:absolute;top:0;left:0;right:0;bottom:0}.sp-alpha-enabled .sp-top{margin-bottom:18px}.sp-alpha-enabled .sp-alpha{display:block}.sp-alpha-handle{position:absolute;top:-4px;bottom:-4px;width:6px;left:50%;cursor:pointer;border:1px solid #000;background:#fff;opacity:.8}.sp-alpha{display:none;position:absolute;bottom:-14px;right:0;left:0;height:8px}.sp-alpha-inner{border:solid 1px #333}.sp-clear{display:none}.sp-clear.sp-clear-display{background-position:center}.sp-clear-enabled .sp-clear{display:block;position:absolute;top:0;right:0;bottom:0;left:84%;height:28px}.sp-container,.sp-replacer,.sp-preview,.sp-dragger,.sp-slider,.sp-alpha,.sp-clear,.sp-alpha-handle,.sp-container.sp-dragging .sp-input,.sp-container button{-webkit-user-select:none;-moz-user-select:-moz-none;-o-user-select:none;user-select:none}.sp-container.sp-input-disabled .sp-input-container{display:none}.sp-container.sp-buttons-disabled .sp-button-container{display:none}.sp-container.sp-palette-buttons-disabled .sp-palette-button-container{display:none}.sp-palette-only .sp-picker-container{display:none}.sp-palette-disabled .sp-palette-container{display:none}.sp-initial-disabled .sp-initial{display:none}.sp-sat{background-image:-webkit-gradient(linear,0 0,100% 0,from(#FFF),to(rgba(204,154,129,0)));background-image:-webkit-linear-gradient(left,#FFF,rgba(204,154,129,0));background-image:-moz-linear-gradient(left,#fff,rgba(204,154,129,0));background-image:-o-linear-gradient(left,#fff,rgba(204,154,129,0));background-image:-ms-linear-gradient(left,#fff,rgba(204,154,129,0));background-image:linear-gradient(to right,#fff,rgba(204,154,129,0));-ms-filter:"progid:DXImageTransform.Microsoft.gradient(GradientType = 1, startColorstr=#FFFFFFFF, endColorstr=#00CC9A81)";filter:progid:DXImageTransform.Microsoft.gradient(GradientType=1,startColorstr=\'#FFFFFFFF\',endColorstr=\'#00CC9A81\')}.sp-val{background-image:-webkit-gradient(linear,0 100%,0 0,from(#000000),to(rgba(204,154,129,0)));background-image:-webkit-linear-gradient(bottom,#000000,rgba(204,154,129,0));background-image:-moz-linear-gradient(bottom,#000,rgba(204,154,129,0));background-image:-o-linear-gradient(bottom,#000,rgba(204,154,129,0));background-image:-ms-linear-gradient(bottom,#000,rgba(204,154,129,0));background-image:linear-gradient(to top,#000,rgba(204,154,129,0));-ms-filter:"progid:DXImageTransform.Microsoft.gradient(startColorstr=#00CC9A81, endColorstr=#FF000000)";filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#00CC9A81\',endColorstr=\'#FF000000\')}.sp-hue{background:-moz-linear-gradient(top,#ff0000 0%,#ffff00 17%,#00ff00 33%,#00ffff 50%,#0000ff 67%,#ff00ff 83%,#ff0000 100%);background:-ms-linear-gradient(top,#ff0000 0%,#ffff00 17%,#00ff00 33%,#00ffff 50%,#0000ff 67%,#ff00ff 83%,#ff0000 100%);background:-o-linear-gradient(top,#ff0000 0%,#ffff00 17%,#00ff00 33%,#00ffff 50%,#0000ff 67%,#ff00ff 83%,#ff0000 100%);background:-webkit-gradient(linear,left top,left bottom,from(#ff0000),color-stop(.17,#ffff00),color-stop(.33,#00ff00),color-stop(.5,#00ffff),color-stop(.67,#0000ff),color-stop(.83,#ff00ff),to(#ff0000));background:-webkit-linear-gradient(top,#ff0000 0%,#ffff00 17%,#00ff00 33%,#00ffff 50%,#0000ff 67%,#ff00ff 83%,#ff0000 100%);background:linear-gradient(to bottom,#ff0000 0%,#ffff00 17%,#00ff00 33%,#00ffff 50%,#0000ff 67%,#ff00ff 83%,#ff0000 100%)}.sp-1{height:17%;filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#ff0000\',endColorstr=\'#ffff00\')}.sp-2{height:16%;filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#ffff00\',endColorstr=\'#00ff00\')}.sp-3{height:17%;filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#00ff00\',endColorstr=\'#00ffff\')}.sp-4{height:17%;filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#00ffff\',endColorstr=\'#0000ff\')}.sp-5{height:16%;filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#0000ff\',endColorstr=\'#ff00ff\')}.sp-6{height:17%;filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#ff00ff\',endColorstr=\'#ff0000\')}.sp-hidden{display:none!important}.sp-cf:before,.sp-cf:after{content:"";display:table}.sp-cf:after{clear:both}.sp-cf{*zoom:1}@media (max-device-width:480px){.sp-color{right:40%}.sp-hue{left:63%}.sp-fill{padding-top:60%}}.sp-dragger{border-radius:5px;height:5px;width:5px;border:1px solid #fff;background:#000;cursor:pointer;position:absolute;top:0;left:0}.sp-slider{position:absolute;top:0;cursor:pointer;height:3px;left:-1px;right:-1px;border:1px solid #000;background:#fff;opacity:.8}.sp-container{border-radius:0;background-color:#ECECEC;border:solid 1px #f0c49B;padding:0}.sp-container,.sp-container button,.sp-container input,.sp-color,.sp-hue,.sp-clear{font:normal 12px "Lucida Grande","Lucida Sans Unicode","Lucida Sans",Geneva,Verdana,sans-serif;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;-ms-box-sizing:border-box;box-sizing:border-box}.sp-top{margin-bottom:3px}.sp-color,.sp-hue,.sp-clear{border:solid 1px #666}.sp-input-container{float:right;width:100px;margin-bottom:4px}.sp-initial-disabled .sp-input-container{width:100%}.sp-input{font-size:12px!important;border:1px inset;padding:4px 5px;margin:0;width:100%;background:transparent;border-radius:3px;color:#222}.sp-input:focus{border:1px solid orange}.sp-input.sp-validation-error{border:1px solid red;background:#fdd}.sp-picker-container,.sp-palette-container{float:left;position:relative;padding:10px;padding-bottom:300px;margin-bottom:-290px}.sp-picker-container{width:172px;border-left:solid 1px #fff}.sp-palette-container{border-right:solid 1px #ccc}.sp-palette-only .sp-palette-container{border:0}.sp-palette .sp-thumb-el{display:block;position:relative;float:left;width:24px;height:15px;margin:3px;cursor:pointer;border:solid 2px transparent}.sp-palette .sp-thumb-el:hover,.sp-palette .sp-thumb-el.sp-thumb-active{border-color:orange}.sp-thumb-el{position:relative}.sp-initial{float:left;border:solid 1px #333}.sp-initial span{width:30px;height:25px;border:none;display:block;float:left;margin:0}.sp-initial .sp-clear-display{background-position:center}.sp-palette-button-container,.sp-button-container{float:right}.sp-replacer{margin:0;overflow:hidden;cursor:pointer;padding:4px;display:inline-block;*zoom:1;*display:inline;border:solid 1px #91765d;background:#eee;color:#333;vertical-align:middle}.sp-replacer:hover,.sp-replacer.sp-active{border-color:#F0C49B;color:#111}.sp-replacer.sp-disabled{cursor:default;border-color:silver;color:silver}.sp-dd{padding:2px 0;height:16px;line-height:16px;float:left;font-size:10px}.sp-preview{position:relative;width:25px;height:20px;border:solid 1px #222;margin-right:5px;float:left;z-index:0}.sp-palette{*width:220px;max-width:220px}.sp-palette .sp-thumb-el{width:16px;height:16px;margin:2px 1px;border:solid 1px #d0d0d0}.sp-container{padding-bottom:0}.sp-container button{background-color:#eee;background-image:-webkit-linear-gradient(top,#eeeeee,#cccccc);background-image:-moz-linear-gradient(top,#eeeeee,#cccccc);background-image:-ms-linear-gradient(top,#eeeeee,#cccccc);background-image:-o-linear-gradient(top,#eeeeee,#cccccc);background-image:linear-gradient(to bottom,#eeeeee,#cccccc);border:1px solid #ccc;border-bottom:1px solid #bbb;border-radius:3px;color:#333;font-size:14px;line-height:1;padding:5px 4px;text-align:center;text-shadow:0 1px 0 #eee;vertical-align:middle}.sp-container button:hover{background-color:#ddd;background-image:-webkit-linear-gradient(top,#dddddd,#bbbbbb);background-image:-moz-linear-gradient(top,#dddddd,#bbbbbb);background-image:-ms-linear-gradient(top,#dddddd,#bbbbbb);background-image:-o-linear-gradient(top,#dddddd,#bbbbbb);background-image:linear-gradient(to bottom,#dddddd,#bbbbbb);border:1px solid #bbb;border-bottom:1px solid #999;cursor:pointer;text-shadow:0 1px 0 #ddd}.sp-container button:active{border:1px solid #aaa;border-bottom:1px solid #888;-webkit-box-shadow:inset 0 0 5px 2px #aaaaaa,0 1px 0 0 #eee;-moz-box-shadow:inset 0 0 5px 2px #aaaaaa,0 1px 0 0 #eee;-ms-box-shadow:inset 0 0 5px 2px #aaaaaa,0 1px 0 0 #eee;-o-box-shadow:inset 0 0 5px 2px #aaaaaa,0 1px 0 0 #eee;box-shadow:inset 0 0 5px 2px #aaaaaa,0 1px 0 0 #eee}.sp-cancel{font-size:11px;color:#d93f3f!important;margin:0;padding:2px;margin-right:5px;vertical-align:middle;text-decoration:none}.sp-cancel:hover{color:#d93f3f!important;text-decoration:underline}.sp-palette span:hover,.sp-palette span.sp-thumb-active{border-color:#000}.sp-preview,.sp-alpha,.sp-thumb-el{position:relative;background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAGUlEQVQYV2M4gwH+YwCGIasIUwhT25BVBADtzYNYrHvv4gAAAABJRU5ErkJggg==)}.sp-preview-inner,.sp-alpha-inner,.sp-thumb-inner{display:block;position:absolute;top:0;left:0;bottom:0;right:0}.sp-palette .sp-thumb-inner{background-position:50% 50%;background-repeat:no-repeat}.sp-palette .sp-thumb-light.sp-thumb-active .sp-thumb-inner{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAIVJREFUeNpiYBhsgJFMffxAXABlN5JruT4Q3wfi/0DsT64h8UD8HmpIPCWG/KemIfOJCUB+Aoacx6EGBZyHBqI+WsDCwuQ9mhxeg2A210Ntfo8klk9sOMijaURm7yc1UP2RNCMbKE9ODK1HM6iegYLkfx8pligC9lCD7KmRof0ZhjQACDAAceovrtpVBRkAAAAASUVORK5CYII=)}.sp-palette .sp-thumb-dark.sp-thumb-active .sp-thumb-inner{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjEwMPRyoQAAAMdJREFUOE+tkgsNwzAMRMugEAahEAahEAZhEAqlEAZhEAohEAYh81X2dIm8fKpEspLGvudPOsUYpxE2BIJCroJmEW9qJ+MKaBFhEMNabSy9oIcIPwrB+afvAUFoK4H0tMaQ3XtlrggDhOVVMuT4E5MMG0FBbCEYzjYT7OxLEvIHQLY2zWwQ3D+9luyOQTfKDiFD3iUIfPk8VqrKjgAiSfGFPecrg6HN6m/iBcwiDAo7WiBeawa+Kwh7tZoSCGLMqwlSAzVDhoK+6vH4G0P5wdkAAAAASUVORK5CYII=)}.sp-clear-display{background-repeat:no-repeat;background-position:center;background-image:url(data:image/gif;base64,R0lGODlhFAAUAPcAAAAAAJmZmZ2dnZ6enqKioqOjo6SkpKWlpaampqenp6ioqKmpqaqqqqurq/Hx8fLy8vT09PX19ff39/j4+Pn5+fr6+vv7+wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAEAAP8ALAAAAAAUABQAAAihAP9FoPCvoMGDBy08+EdhQAIJCCMybCDAAYUEARBAlFiQQoMABQhKUJBxY0SPICEYHBnggEmDKAuoPMjS5cGYMxHW3IiT478JJA8M/CjTZ0GgLRekNGpwAsYABHIypcAgQMsITDtWJYBR6NSqMico9cqR6tKfY7GeBCuVwlipDNmefAtTrkSzB1RaIAoXodsABiZAEFB06gIBWC1mLVgBa0AAOw==)}</style>');
    }; // end setupColorpickerSpectrum

    self.setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        if (!window.plugin.playerTracker) {
            console.log('IITC plugin ERROR: ' + self.title + ' version ' + self.version + ' - window.plugin.playerTracker required');
            return;
        }

        self.setupMarkerlabel();
        self.setupColorpickerSpectrum();

        self.restoresettings();

        // override original time display function, to enable display of time in minutes, hours or days:
        window.plugin.playerTracker.ago = function(time, now) {
            var s = (now-time) / 1000;
            var m = Math.floor((s % 3600) / 60);
            var h = Math.floor(s / 3600);
            var d = Math.floor(h / 24);
            var returnVal = m + 'm';
            if (h > 24) {
                h = Math.floor(h % 24);
            }
            if (h > 0) {
                returnVal = h + 'h' + returnVal;
            }
            if (d > 0) {
                returnVal = d + 'd' + returnVal;
            }
            return returnVal;
        };

        // inject code for Machina:
        if (!window.plugin.playerTracker.iconMac) {
            var iconMacImage = 'data:image/png;base64,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';
            var iconMacRetImage = 'data:image/png;base64,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';
            window.plugin.playerTracker.iconMac = window.L.Icon.Default.extend({options: {
                iconUrl: iconMacImage,
                iconRetinaUrl: iconMacRetImage
            }});
        }

        // inject code for Machina:
        if (!window.plugin.playerTracker.drawnTracesMac) {
            window.plugin.playerTracker.drawnTracesMac = new window.L.LayerGroup();

            if ('addOverlay' in window.layerChooser) {
                window.layerChooser.addOverlay(window.plugin.playerTracker.drawnTracesMac, 'Player Tracker U̶͚̓̍N̴̖̈K̠͔̍͑̂͜N̞̥͋̀̉Ȯ̶̹͕̀W̶̢͚͑̚͝Ṉ̨̟̒̅',{default: true});
            } else { // before IITC 0.34:
                window.addLayerGroup('Player Tracker U̶͚̓̍N̴̖̈K̠͔̍͑̂͜N̞̥͋̀̉Ȯ̶̹͕̀W̶̢͚͑̚͝Ṉ̨̟̒̅', window.plugin.playerTracker.drawnTracesMac, true);
            }

            window.map.on('layeradd',function(obj) {
                if(obj.layer === window.plugin.playerTracker.drawnTracesMac) {
                    obj.layer.eachLayer(function(marker) {
                        if(marker._icon) window.setupTooltips($(marker._icon));
                    });
                }
            });
        }

        try {
            self.labelsetup();
            self.colorsetup();
            self.actionssetup();
            self.centersetup();
            self.modify_ago();
            self.resettracks();
        } catch(e) {
            console.log('PLAYERTRACKERADDON - ERROR: setup failed');
            return;
        }

        // inject code for Machina:
        if (!window.plugin.playerTracker.closeIconTooltips.toString().match(/Mac/)) {
            let original_closeIconTooltips = window.plugin.playerTracker.closeIconTooltips;
            window.plugin.playerTracker.closeIconTooltips = function() {
                original_closeIconTooltips();
                window.plugin.playerTracker.drawnTracesMac.eachLayer(function(layer) {
                    if ($(layer._icon)) { $(layer._icon).tooltip('close');}
                });
            };
            let original_zoomListener = window.plugin.playerTracker.zoomListener;
            window.plugin.playerTracker.zoomListener = function() {
                original_zoomListener();
                if(window.map.getZoom() < window.PLAYER_TRACKER_MIN_ZOOM) {
                    window.plugin.playerTracker.drawnTracesMac.clearLayers();
                }
            };

            let drawData_string = window.plugin.playerTracker.drawData.toString();
            drawData_string = drawData_string.replace(/(var polyLineByAgeRes.*?\n)/s,'$1var polyLineByAgeMac = {};\n');
            drawData_string = drawData_string.replace(/(else\n)/s,'else if(playerData.team === \'NEUTRAL\')\n        { if (!polyLineByAgeMac[plrname]) polyLineByAgeMac[plrname] = [[], [], [], []]; polyLineByAgeMac[plrname][ageBucket].push(line); }\n      $1');
            drawData_string = drawData_string.replace(/(addClass\('nickname.*?)('enl')/,'$1(playerData.team === \'NEUTRAL\' ? \'mac\' : $2)');
            drawData_string = drawData_string.replace(/(var icon =.*?) : (.*?);/s,'$1 : (playerData.team === \'NEUTRAL\' ? new plugin.playerTracker.iconMac({ labelText: (plrname || playerData.nick) + (window.plugin.playerTrackerAddon.settings.showlastaction?\', \' + window.plugin.playerTracker.ago(playerData.events[playerData.events.length - 1].time,now):\'\') }) : $2);');
            drawData_string = drawData_string.replace(/(m.addTo\(.*?) : (.*?);/s,'$1 : (playerData.team === \'NEUTRAL\' ? plugin.playerTracker.drawnTracesMac : $2);\n');
            drawData_string = drawData_string.replace(/\}$/s,`
    $.each(polyLineByAgeMac, function(plrname, polyLineByAge) {
        $.each(polyLineByAge, function(i, polyLine) {
            if(polyLine.length === 0) return true;

            var opts = {
                weight: 2-0.25*i,
                color: window.plugin.playerTracker.stored[plrname].color,
                interactive: false,
                opacity: 1-0.2*i,
                dashArray: "5,8"
            };

            $.each(polyLine, function(ind,poly) {
                L.polyline(poly, opts).addTo(plugin.playerTracker.drawnTracesMac);
            });
        });
    });
    //console.log('NEUTRAL PLAYER INJECTED');
}`);
            //console.log(drawData_string);
            try {
                eval('window.plugin.playerTracker.drawData = ' + drawData_string);
            } catch(e) {
                console.log('PLAYERTRACKERADDON - ERROR: injecting code for drawData failed');
            }
        }

        // inject an extra function into the playerTracker publicChatDataAvailable handleData hook:
        var handleData_override = window.plugin.playerTracker.handleData.toString();
        handleData_override = handleData_override.replace('}','  ' + self.namespace + 'updateplayerlist();\n}');
        if (!handleData_override.match(/drawnTracesMac/)) {
            handleData_override = handleData_override.replace(/(clearLayers.*?\n)/s,'$1  window.plugin.playerTracker.drawnTracesMac.clearLayers();\n');
        }
        eval('window.plugin.playerTracker.handleData = ' + handleData_override);
        for (let callback of window._hooks.publicChatDataAvailable) {
            if (callback.toString().match('playerTracker')) {
                window.removeHook('publicChatDataAvailable',callback);
                break;
            }
        }
        addHook('publicChatDataAvailable',window.plugin.playerTracker.handleData);

        self.setlimit(self.settings.limit);

        //add options menu
        let toolboxlink = document.getElementById('toolbox').appendChild(document.createElement('a'));
        toolboxlink.textContent = self.title;
        toolboxlink.addEventListener('click', function(e) {
            e.preventDefault();
            self.menu();
        }, false);

        var stylesheet = document.body.appendChild(document.createElement('style'));
        stylesheet.innerHTML = '';
        stylesheet.innerHTML += '.' + self.id + 'menu > a { display:block; color:#ffce00; border:1px solid #ffce00; padding:3px 0; margin:10px auto; width:80%; text-align:center; background:rgba(8,48,78,.9); }';
        stylesheet.innerHTML += '.' + self.id + 'menu > label { user-select: none; }';
        stylesheet.innerHTML += '.' + self.id + 'author { margin-top: 14px; font-style: italic; font-size: smaller; }';

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
