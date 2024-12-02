// ==UserScript==
// @author         DanielOnDiordna
// @name           Highlight Resonator Owners
// @category       Highlighter
// @version        1.0.0.20231019.224200
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/highlight-resonator-owners.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/highlight-resonator-owners.user.js
// @description    [danielondiordna-1.0.0.20231019.224200] Highlight portals with resonators by owner
// @id             highlight-resonator-owners@DanielOnDiordna
// @namespace      https://softspot.nl/ingress/
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.highlightresonatorowners = function() {};
    var self = window.plugin.highlightresonatorowners;
    self.id = 'highlightresonatorowners';
    self.title = 'Highlight Resonator Owners';
    self.version = '1.0.0.20231019.224200';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 1.0.0.20231019.224200
- version upgrade due to a change in the wrapper, added changelog
- reversed the changelog order to show last changes at the top
- reformatted javascript code ES6 backticks
- replaced all var with let declarations
- added machina faction

version 0.0.5.20210724.002500
- prevent double plugin setup on hook iitcLoaded

version 0.0.5.20210421.190200
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin

version 0.0.5.20210328.002900
- disabled interaction on resonator text labels

version 0.0.4.20210123.174900
- integrated Spectrum Colorpicker 1.8.1 plugin code, no need anymore for the separate plugin
- updated plugin wrapper and userscript header formatting to match IITC-CE coding

version 0.0.3.20200908.231600
- added short names option
- added limit to scan portals by level and faction
- added a statusbar with total and loading indicator
- changed the orange highlighter function from all to any resonator by level
- fixed some issues

version 0.0.2.20200906.224900
- color picker for owner name/level (colorpicker add-on or drawtools plugin required)
- highlight portal if missing resonator by level for a selected player
- option to show/hide owner names
- option to show/hide resonator levels

version 0.0.1.20200906.182700
- first version
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.localstoragesettings = self.pluginname + '-settings';

    self.highlightername = 'Resonator Owners';
    self.portallabelslayer = {};
    self.portallabelslayergroup = null;

    self.settings = {};
    self.settings.refreshinterval = 5; // hours
    self.settings.resonatorowner = '';
    self.settings.shownames = true;
    self.settings.shortnames = false;
    self.settings.showlevels = true;
    self.settings.resonatorownercolor = '#ff00f7';
    self.settings.resolevel = [0,false,false,false,false,false,false,false,true]; // 0, level 1-8
    self.settings.portallevel = [0,true,true,true,true,true,true,true,true]; // 0, level 1-8
    self.settings.scanenl = true;
    self.settings.scanres = true;
    self.settings.scanmac = true;

    self.restartrunning = false;
    self.nextrunning = false;
    self.portals = {};
    self.resonatorowners = {};
    self.latlngindex = {};
    self.updatelist = {};
    self.requestlist = {};
    self.requestid = '';

    // need to initialise the 'spectrum' color picker
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

    self.highlight_portal = function(portal) {
        let guid = portal.options.guid;

        var noresonatorsforowner = (self.settings.resonatorowner != '' && self.resonatorowners[self.settings.resonatorowner] !== undefined);
        var noresonatorslevelforowner = false;
        if (noresonatorsforowner && self.portals[guid]) {
            var ownerlevels = {};
            for (let cnt = 0; cnt < self.portals[guid].resonators.length; cnt++) {
                if (self.portals[guid].resonators[cnt].owner === self.settings.resonatorowner) {
                    noresonatorsforowner = false;
                    ownerlevels[self.portals[guid].resonators[cnt].level]++;
                }
            }
            //console.log(self.title,ownerlevels);
            for (let level = 1; level < self.settings.portallevel.length; level++) {
                if (self.settings.resolevel[level] && ownerlevels[level] == undefined) {
                    noresonatorslevelforowner = true;
                }
            }
        }
        //console.log(self.title + ' highlight_portal',guid,noresonatorsforowner,noresonatorslevelforowner,portal.options.team,portal.options.level);

        let params = {opacity: 1.0, fillOpacity: 0.5};
        if (portal.options.team === window.TEAM_NONE ||
            !self.settings.scanenl && portal.options.team == window.TEAM_ENL ||
            !self.settings.scanres && portal.options.team == window.TEAM_RES ||
            !self.settings.scanmac && portal.options.team == window.TEAM_MAC ||
            !self.settings.portallevel[portal.options.level]) {
            params.fillColor = window.COLORS[portal.options.team];
            params.fillOpacity = 0.5;
        } else if (self.requestlist[guid]) {
            params.fillColor = window.COLORS[portal.options.team];
            params.fillOpacity = 0.3;
        } else if (!self.portals[guid]) {
            params.fillColor = window.COLORS[portal.options.team];
            params.fillOpacity = 0.1;
        } else if (noresonatorsforowner) {
            params.fillColor = 'red';
            params.fillOpacity = 1;
        } else if (noresonatorslevelforowner) {
            params.fillColor = 'orange';
            params.fillOpacity = 1;
        } else {
            params.fillColor = window.COLORS[portal.options.team];
            params.fillOpacity = 0.5;
        }
        portal.setStyle(params);
    };

    self.highlightportals = {
        highlight:
        function(data) {
            if (!data || !(data instanceof Object)) return;
            if (data.guid && window.portals[data.guid]) data.portal = window.portals[data.guid];
            if (!data || !data.portal || !data.portal.options || !data.portal.options.guid) return;

            if (self.highlighteractive()) {
                self.highlight_portal(data.portal);
            }
        },
        setSelected:
        function(active) {
            if (!active) {
                //hide
                window.map.removeLayer(self.portallabelslayergroup);
                self.stop();
            } else {
                self.updateHighlighter();
                window.map.addLayer(self.portallabelslayergroup);
                $(`.${self.pluginname}-portallabel`).css('pointer-events','none');
                self.restart();
            }
        }
    };

    self.highlighteractive = function() {
        return (window._current_highlighter === self.highlightername);
    };

    self.updateHighlighter = function() {
        if (!self.highlighteractive()) return;

        for (let guid in self.portals) {
            if (window.portals[guid]) {
                self.highlight_portal(window.portals[guid]);
            }
        }
    };

    self.addLabel = function(guid,latLng) {
        self.removeLabel(guid);
        if (!self.highlighteractive()) return;
        if (window.getMapZoomTileParameters(window.getDataZoomForMapZoom(window.map.getZoom())).level !== 0) return;
        let portal = window.portals[guid];
        if (window.teamStringToId(portal.options.data.team) == window.TEAM_NONE) return; // skip unclaimed

        if (!self.settings.scanenl && window.teamStringToId(portal.options.data.team) == window.TEAM_ENL) return;
        if (!self.settings.scanres && window.teamStringToId(portal.options.data.team) == window.TEAM_RES) return;
        if (!self.settings.scanmac && window.teamStringToId(portal.options.data.team) == window.TEAM_MAC) return;
        if (!self.settings.portallevel[portal.options.data.level]) return;

        // octant=slot: 0=E, 1=NE, 2=N, 3=NW, 4=W, 5=SW, 6=S, SE=7
        // resos in the display should be ordered like this:
        //   N    NE         Since the view is displayed in rows, they
        //  NW    E          need to be ordered like this: N NE NW E W SE SW S
        //   W    SE         i.e. 2 1 3 0 4 7 5 6
        //  SW    S
        // note: as of 2014-05-23 update, this is not true for portals with empty slots!
        // only if all 8 resonators are deployed, we know which is in which slot

        var resonatortext = ['','','','','','','',''];
        if (self.settings.showlevels || self.settings.shownames) resonatortext = ['?','?','?','?','?','?','?','?'];
        var resonatorstyle = ['','','','','','','',''];

        if (self.portals[guid]) {
            if (self.portals[guid].resonators.length == 8) {
                // fully deployed - we can make assumptions about deployment slots
                $.each([2, 1, 3, 0, 4, 7, 5, 6], function(cnt, slot) {
                    if (self.settings.resonatorowner && self.portals[guid].resonators[slot].owner === self.settings.resonatorowner) resonatorstyle[cnt] = ' color:' + self.settings.resonatorownercolor + ';';
                    var level = self.portals[guid].resonators[slot].level;
                    var owner = self.portals[guid].resonators[slot].owner;
                    if (self.settings.shortnames) owner = owner.substring(0,3);
                    if ((cnt+1) % 2 == 0) {
                        resonatortext[cnt] = (self.settings.showlevels?level:'') + ' ' + (self.settings.shownames?owner:''); // even, right side
                    } else {
                        resonatortext[cnt] = (self.settings.shownames?owner:'') + ' ' + (self.settings.showlevels?level:''); // odd, left side
                    }
                });
            } else {
                // partially deployed portal - we can no longer find out which resonator is in which slot
                for (let cnt = 0; cnt < 8; cnt++) {
                    if (cnt < self.portals[guid].resonators.length) {
                        var level = self.portals[guid].resonators[cnt].level;
                        var owner = self.portals[guid].resonators[cnt].owner;
                        if (self.settings.resonatorowner && owner === self.settings.resonatorowner) resonatorstyle[cnt] = ' color:' + self.settings.resonatorownercolor + ';';
                        if (self.settings.shortnames) owner = owner.substring(0,3);
                        if ((cnt+1) % 2 == 0) {
                            resonatortext[cnt] = (self.settings.showlevels?level:'') + ' ' + (self.settings.shownames?owner:''); // even, right side
                        } else {
                            resonatortext[cnt] = (self.settings.shownames?owner:'') + ' ' + (self.settings.showlevels?level:''); // odd, left side
                        }
                    } else {
                        resonatortext[cnt] = (self.settings.showlevels || self.settings.shownames?'-':'');
                    }
                }
            }
        }

        let labelwidth = 300;
        let labelheight = 40;
        let portaltext = `
<div style="position: absolute; width: ${labelwidth/2 - 5}px; left: 0px; top:0px; text-align: right; white-space: nowrap;${resonatorstyle[0]}">${resonatortext[0]}</div>
<div style="position: absolute; left: ${labelwidth/2 + 11}px; top:0px; white-space: nowrap;${resonatorstyle[1]}">${resonatortext[1]}</div>
<div style="position: absolute; width: ${labelwidth/2 - 10}px; left: 0px; top: ${((labelheight/4)*1)}px; text-align: right; white-space: nowrap;${resonatorstyle[2]}">${resonatortext[2]}</div>
<div style="position: absolute; left: ${labelwidth/2 + 17}px; top: ${((labelheight/4)*1)}px; white-space: nowrap;${resonatorstyle[3]}">${resonatortext[3]}</div>
<div style="position: absolute; width: ${labelwidth/2 - 10}px; left: 0px; top: ${((labelheight/4)*2)}px; text-align: right; white-space: nowrap;${resonatorstyle[4]}">${resonatortext[4]}</div>
<div style="position: absolute; left: ${labelwidth/2 + 17}px; top: ${((labelheight/4)*2)}px; white-space: nowrap;${resonatorstyle[5]}">${resonatortext[5]}</div>
<div style="position: absolute; width: ${labelwidth/2 - 5}px; left: 0px; top: ${((labelheight/4)*3)}px; text-align: right; white-space: nowrap;${resonatorstyle[6]}">${resonatortext[6]}</div>
<div style="position: absolute; left: ${labelwidth/2 + 11}px; top: ${((labelheight/4)*3)}px; white-space: nowrap;${resonatorstyle[7]}">${resonatortext[7]}</div>
`;
        self.portallabelslayer[guid] = window.L.marker(latLng, {
            icon: window.L.divIcon({
                className: `${self.pluginname}-portallabel`,
                iconAnchor: [labelwidth/2 + 3,labelheight/2],
                iconSize: [labelwidth,labelheight],
                html: portaltext
            }),
            guid: guid
        });

        self.portallabelslayer[guid].addTo(self.portallabelslayergroup);
        $(`.${self.pluginname}-portallabel`).css('pointer-events','none');
    };

    self.removeLabel = function(guid) {
        let existinglayer = self.portallabelslayer[guid];
        if (existinglayer) {
            self.portallabelslayergroup.removeLayer(existinglayer);
            delete self.portallabelslayer[guid];
        }
    };
    self.updatePortalLabel = function(data) {
        let portal = window.portals[data.guid];
        if (!portal) return;
        let latLng = portal.getLatLng();

        self.addLabel(data.guid, latLng);
    };
    self.updatePortalLabels = function() {
        $.each(self.portals, function(guid) {
            self.updatePortalLabel({guid: guid});
        });
    };

    self.portalonvisiblelayer = function(portal) {
        if (portal.options.data.team === 'E' && !window.overlayStatus['Enlightened']) return false;
        if (portal.options.data.team === 'R' && !window.overlayStatus['Resistance']) return false;
        if (portal.options.data.team === 'M' && !(window.overlayStatus['__MACHINA__'] || window.overlayStatus['U̶͚̓̍N̴̖̈K̠͔̍͑̂͜N̞̥͋̀̉Ȯ̶̹͕̀W̶̢͚͑̚͝Ṉ̨̟̒̅'])) return false;
        let unclaimedlayername = 'Unclaimed Portals';
        let found = window.setupMap.toString().match(/i === 0 \? \'([^']+)\'/);
        if (found) unclaimedlayername = found[1] + ' Portals';
        if (portal.options.data.team === 'N' && !window.overlayStatus[unclaimedlayername]) return false;
        if (!window.overlayStatus['Level ' + portal.options.data.level + ' Portals']) return false;
        return true;
    };

    self.storedetails = function(data) {
        if (!(data instanceof Object)) return;
        if (data.success === false) return data.guid; // retry

        // check if returned data is from requested portal
        delete(self.requestlist[data.guid]);
        delete(self.updatelist[data.guid]);

        let portal = {};
        portal.team = data.details.team;
        portal.level = (portal.team === window.TEAM_NONE?0:data.details.level); // set level to 0 if portal is unclaimed
        portal.owner = data.details.owner;
        portal.title = data.details.title;
        portal.resonators = data.details.resonators;
        portal.checked = new Date().getTime();

        // store unique resonatorowners
        let totalresonatorowners = Object.keys(self.resonatorowners).length;
        for (let cnt = 0; cnt < portal.resonators.length; cnt++) {
            self.resonatorowners[portal.resonators[cnt].owner] = window.teamStringToId(portal.team);
        }
        if (Object.keys(self.resonatorowners).length != totalresonatorowners) {
            self.updateplayerselectlist();
        }

        self.portals[data.guid] = portal;

        let latlngid = data.details.latE6 + ',' + data.details.lngE6;
        self.latlngindex[latlngid] = data.guid;

        //console.log(self.title + " storedetails 4",data);
//        if (!portal || !(portal instanceof Object)) return;
//        if (portal.options && portal.options.guid && window.portals[portal.options.guid]) portal = window.portals[portal.options.guid];
//        if (!portal || !portal.options || !portal.options.guid) return;

        self.highlight_portal(window.portals[data.guid]); //{ portal : { options : window.portals[guid].options } });

        //console.log(self.title + " storedetails 5");
        self.updatePortalLabel(data);

        //console.log(self.title + " storedetails 6");
        return data.guid;
    };

    self.stop = function() {
        //console.log(self.title + " STOP");
        // clear list
        window.clearTimeout(self.timerid);
        self.requestlist = {};
        self.requestid = '';
        self.nextrunning = false;
        self.updatestatusbar();
    };
    self.restart = function() {
        if (!self.highlighteractive()) return;
        if (window.mapDataRequest.status.short !== 'done' || window.getMapZoomTileParameters(window.getDataZoomForMapZoom(window.map.getZoom())).level !== 0) { // zoom to all portals
            self.stop();
            return;
        }
        if (self.restartrunning) return;
        self.restartrunning = true;
        //console.log(self.title + " RESTART");

        // create list of portals to request:
        let visiblebounds = window.map.getBounds();
        self.requestlist = {};

        let currenttime = new Date().getTime();
        for (let guid in window.portals) {
            let portal = window.portals[guid];
            // portal must be within visible bounds
            // and portal must on a visible layer
            if (visiblebounds.contains(portal.getLatLng()) && self.portalonvisiblelayer(portal)) {
                // portal must be new
                // or changed faction
                // or mentioned in comms (on updatelist)
                // or older then refreshinterval (hours)
                if (self.portals[guid] === undefined ||
                    self.portals[guid]['team'] !== portal.options.data.team ||
                    self.updatelist[guid] ||
                    (currenttime - self.portals[guid]['checked']) > self.settings.refreshinterval * 60*60*1000) {

                    if (!self.settings.scanenl && window.teamStringToId(portal.options.data.team) == window.TEAM_ENL) continue;
                    if (!self.settings.scanres && window.teamStringToId(portal.options.data.team) == window.TEAM_RES) continue;
                    if (!self.settings.scanmac && window.teamStringToId(portal.options.data.team) == window.TEAM_MAC) continue;
                    if (!self.settings.portallevel[portal.options.data.level]) continue;

                    self.requestlist[guid] = portal;

                    //break; // REMOVE THIS LINE WHEN READY

                }
            }
        }
        self.next();
        self.restartrunning = false;
    };
    self.next = function() {
        if (!self.highlighteractive() || window.mapDataRequest.status.short !== 'done') {
            self.stop();
            return;
        }
        if (self.nextrunning) return;
        self.nextrunning = true;
        //console.log(self.title + " NEXT");

        // request next portal, if any
        if (Object.keys(self.requestlist).length === 0) {
            self.stop();
            self.nextrunning = false;
            return;
        }

        // next key
        self.updatestatusbar();
        let guid = Object.keys(self.requestlist)[0];
        self.requestid = guid;

        let portal = window.portals[guid];
        if (!portal || !portal.options) {
            // skip portal if not in range
            delete(self.requestlist[guid]);
            self.timerid = window.setTimeout(function() {
                self.nextrunning = false;
                self.next();
            });
            return;
        }

        self.timerid = window.setTimeout(function() {
            self.nextrunning = false;
            let portal = self.requestlist[self.requestid];
            if (!portal) {
                self.next();
                return;
            }
            window.portalDetail.request(self.requestid);
        });
    };
    self.publicchat = function(data) {
        if (!self.highlighteractive()) return;
        //console.log(self.title + " PUBLICCHAT");
        let forceupdate = false;
        $.each(data.result, function(ind, json) {
            let plrname,latE6,lngE6,title,skipmessage = false;
            let portalstatuschanged = false;
            $.each(json[2].plext.markup, function(ind, markup) {
                switch(markup[0]) {
                    case 'TEXT':
                        // only register certain messages
                        if (markup[1].plain.indexOf(' captured ') >= 0 || markup[1].plain.indexOf(' destroyed ') >= 0 || markup[1].plain.indexOf(' deployed ') >= 0) {
                            portalstatuschanged = true;
                        } else {
                            skipmessage = true;
                            return;
                        }
                        break;
                    case 'PLAYER':
                        plrname = markup[1].plain;
                        break;
                    case 'PORTAL':
                        latE6 = markup[1].latE6;
                        lngE6 = markup[1].lngE6;
                        title = title ? title : markup[1].name;
                        //address = address ? address : markup[1].address;
                        break;
                }
            });

            if (!latE6 || !lngE6 || skipmessage) return;

            let latlngid = latE6+','+lngE6;
            let time = json[1];

            let guid = self.latlngindex[latlngid];
            if (self.portals[guid]) { // portal is stored, check if details need to be updated
                let checked = self.portals[guid]['checked'];
                if (portalstatuschanged && time > checked) {
                    self.updatelist[guid] = time;
                    forceupdate = true;
                }
            }
        });
        if (forceupdate) window.setTimeout(self.restart);
    };
    self.onPortalSelected = function() {
        //console.log(self.title + " onPortalSelected");
    };
    self.showPortalSelected = function() {
        //console.log(self.title + " showPortalSelected");
    };
    self.portalAdded = function(data) {
        data.portal.on('add', function() {
            self.addLabel(this.options.guid,this.getLatLng());
        });

        data.portal.on('remove', function() {
            self.removeLabel(this.options.guid);
        });
    };

    self.zoomend = function() {
        if (!self.highlighteractive) return;

        if (window.getMapZoomTileParameters(window.getDataZoomForMapZoom(window.map.getZoom())).level !== 0) { // zoom to all portals
            map.removeLayer(self.portallabelslayergroup);
        } else {
            map.addLayer(self.portallabelslayergroup);
            $('.' + self.pluginname + '-portallabel').css('pointer-events','none');
        }
    };

    self.updatestatusbar = function() {
        $('#' + self.id + '_statusbar').replaceWith(self.statusbarhtml());
    };
    self.statusbarhtml = function() {
        let portalstotal = Object.keys(self.portals).length;
        let requestlisttotal = Object.keys(self.requestlist).length;
        return '<span id="' + self.id + '_statusbar">Portals loaded: ' + portalstotal + (requestlisttotal > 0?' Loading: ' + requestlisttotal:'') + '</span>';
    };
    self.updateplayerselectlist = function() {
        let newlist = self.playerselectlist($('#' + self.id + '_selectplayer option:selected').val());
        if (newlist !== $('#' + self.id + '_selectplayer').html()) $('#' + self.id + '_selectplayer').replaceWith(newlist);
    };
    self.playerselectlist = function(selectedname) {
        //console.log(self.title + ' updateplayerselectlist ' + selectedname);
        let players = Object.keys(self.resonatorowners).sort(function(a,b) { return (a.toLowerCase() < b.toLowerCase()?-1:(a.toLowerCase() > b.toLowerCase()?1:0)); });

        if (!selectedname) selectedname = self.settings.resonatorowner;
        let player_team = window.teamStringToId(window.PLAYER.team);
        let selectednamefound = false;
        let list = [];
        list.push('<option value=""' + (selectedname == ''?' selected':'')+ '>(no selection)</option>');
        for (let index in players) {
            let plrname = players[index];
            //  style="color: ' + self.getPlayerColor(plrname) + '"
            list.push('<option value="' + plrname + '"' + (plrname === selectedname?' selected':'')+ '>' + plrname + (self.resonatorowners[plrname] !== player_team?' [' + window.TEAM_TO_CSS[self.resonatorowners[plrname]] + ']':'') + '</option>');
            if (plrname === selectedname) selectednamefound = true;
        }

        return '<select id="' + self.id + '_selectplayer" onchange="' + self.namespace + 'settings.resonatorowner = this.value; ' + self.namespace + 'storesettings(); ' + self.namespace + 'updateHighlighter(); ' + self.namespace + 'updatePortalLabels();">' + list.join('\n') + '</select>';
    };
    self.menu = function() {
        let lvl = 0;
        let reso_lvlcheckboxes = '';
        let portal_lvlcheckboxes = '';
        let reso_countselectors = '';
        for (lvl = 1; lvl <= 8; lvl++) {
            portal_lvlcheckboxes += '<label style="display: inline-block; width: 32px; white-space: nowrap;"><input type="checkbox" onclick="' + self.namespace + 'settings.portallevel[' + lvl + '] = this.checked; ' + self.namespace + 'storesettings(); ' + self.namespace + 'updateHighlighter(); ' + self.namespace + 'updatePortalLabels(); ' + self.namespace + 'restart();"' + (self.settings.portallevel[lvl]?' checked':'') + ' class="' + self.id + '-portalLevel' + lvl + '">R' + lvl + '</label>';
            reso_lvlcheckboxes += '<label style="display: inline-block; width: 32px; white-space: nowrap;"><input type="checkbox" onclick="' + self.namespace + 'settings.resolevel[' + lvl + '] = this.checked; ' + self.namespace + 'storesettings(); ' + self.namespace + 'updateHighlighter();"' + (self.settings.resolevel[lvl]?' checked':'') + ' class="' + self.id + '-resoLevel' + lvl + '">L' + lvl + '</label>';
            reso_countselectors += '<select style="width: 32px"><option disabled>R' + lvl + ':</option><option>0</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option><option>7</option><option>8</option></select>';
        }

        let container = document.createElement('div');
        container.innerHTML = `
Auto load resonator details<br>
Limit to these portal levels:<br>
${portal_lvlcheckboxes}<br>
Limit to portals of these factions:<br>
<label><input type="checkbox" class="${self.id}-scanenl">Enlightend</label>
<label><input type="checkbox" class="${self.id}-scanres">Resistance</label><br>
<label><input type="checkbox" class="${self.id}-scanmac">Machina</label><br>
${self.statusbarhtml()}<br>
<br>
For this selected player:<br>
${self.playerselectlist(self.settings.resonatorowner)}<br>
<input type="text" id="resonatorownercolor"></input> Text color<br>
Require resonators of this level:<br>
${reso_lvlcheckboxes}<br>
Require this number of resonators:<br>
${reso_countselectors}<br>
Highlight RED: 0 resonators<br>
Highlight ORANGE: missing required resonators<br>
<br>
Settings:<br>
<label><input type="checkbox" class="${self.id}-shownames">Show resonator owners</label>
(<label><input type="checkbox" class="${self.id}-shortnames">short names</label>)<br>
<label><input type="checkbox" class="${self.id}-showlevels">Show resonator levels</label><br>
<span style="font-style: italic; font-size: smaller">version ${self.version} by ${self.author}</span>
`;
        let scanenlcheckbox = container.querySelector(`.${self.id}-scanenl`);
        scanenlcheckbox.checked = self.settings.scanenl;
        scanenlcheckbox.addEventListener('click',function(e) {
            self.settings.scanenl = this.checked;
            self.storesettings();
            self.updateHighlighter();
            self.updatePortalLabels();
            self.restart();
        });
        let scanrescheckbox = container.querySelector(`.${self.id}-scanres`);
        scanrescheckbox.checked = self.settings.scanres;
        scanrescheckbox.addEventListener('click',function(e) {
            self.settings.scanres = this.checked;
            self.storesettings();
            self.updateHighlighter();
            self.updatePortalLabels();
            self.restart();
        });
        let scanmaccheckbox = container.querySelector(`.${self.id}-scanmac`);
        scanmaccheckbox.checked = self.settings.scanmac;
        scanmaccheckbox.addEventListener('click',function(e) {
            self.settings.scanmac = this.checked;
            self.storesettings();
            self.updateHighlighter();
            self.updatePortalLabels();
            self.restart();
        });
        let shownamescheckbox = container.querySelector(`.${self.id}-shownames`);
        shownamescheckbox.checked = self.settings.shownames;
        shownamescheckbox.addEventListener('click',function(e) {
            self.settings.shownames = this.checked;
            self.storesettings();
            self.updatePortalLabels();
        });
        let shortnamescheckbox = container.querySelector(`.${self.id}-shortnames`);
        shortnamescheckbox.checked = self.settings.shortnames;
        shortnamescheckbox.addEventListener('click',function(e) {
            self.settings.shortnames = this.checked;
            self.storesettings();
            self.updatePortalLabels();
        });
        let showlevelscheckbox = container.querySelector(`.${self.id}-showlevels`);
        showlevelscheckbox.checked = self.settings.showlevels;
        showlevelscheckbox.addEventListener('click',function(e) {
            self.settings.showlevels = this.checked;
            self.storesettings();
            self.updatePortalLabels();
        });

        window.dialog({
            html: container,
            id: self.pluginname + '-dialog',
            dialogClass: 'ui-dialog-' + self.pluginname,
            title: self.title
        });

        $('#resonatorownercolor').spectrum($.extend(true, self.colorpickeroptions, {
            change: function(color) { self.settings.resonatorownercolor = color.toHexString(); self.storesettings(); self.updatePortalLabels(); },
            color: self.settings.resonatorownercolor,
        }));
    };

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

        self.setupColorpickerSpectrum();

        self.restoresettings();

        self.portallabelslayergroup = new L.LayerGroup();
        window.addPortalHighlighter(self.highlightername,self.highlightportals);
        if (self.highlighteractive()) {
            self.updateHighlighter();
            map.addLayer(self.portallabelslayergroup);
            $('.' + self.pluginname + '-portallabel').css('pointer-events','none');
        }

        window.addHook('mapDataRefreshEnd',function() { window.setTimeout(self.updateHighlighter); });

//        window.addHook('portalSelected', self.onPortalSelected);
        // stop while map moved or when map loading starts
        window.map.on('movestart', self.stop);
        window.addHook('mapDataRefreshStart', self.stop);

        // restart when map loading is done
        window.map.on('moveend', function() { window.setTimeout(self.restart); }); // use a timeout to make sure the window status is set
        window.addHook('mapDataRefreshEnd',function() { window.setTimeout(self.restart); }); // use a timeout to make sure the window status is set
        // restart when a layer is added/removed
        window.map.on('overlayadd overlayremove', self.restart);

        // detect captures from comms
        window.addHook('publicChatDataAvailable',self.publicchat);
        window.addHook('portalDetailLoaded', function(data) { if (self.storedetails(data) === self.requestid) self.next(); });

        window.addHook('portalSelected',self.onPortalSelected);
        window.addHook('portalDetailLoaded',self.showPortalSelected);
        window.addHook('portalAdded', self.portalAdded);

        window.map.on('zoomend',self.zoomend);

        $('#toolbox').append(`<a onclick="${self.namespace}menu(); return false;" href="#">${self.title}</a>`);

        $('head').append(`
<style>
.${self.pluginname}-portallabel {
font-family: arial;
font-size: 10px;
color: black;
line-height: 10px;
text-align: center;
padding: 2px; /* padding needed so shadow doesn't clip */
overflow: hidden;
text-align: center;
pointer-events: none;
-webkit-text-size-adjust: none;
}
</style>`);

        console.log('IITC plugin loaded: ' + self.title + ' version ' + self.version);
    };

    var setup = function() {
        (window.iitcLoaded?self.setup():window.addHook('iitcLoaded',self.setup));
    };

    // Added to support About IITC details and changelog:
    plugin_info.script.version = plugin_info.script.version.replace(/\.\d{8}\.\d{6}$/,'');
    plugin_info.buildName = 'softspot.nl';
    plugin_info.dateTimeVersion = self.version.replace(/^.*(\d{4})(\d{2})(\d{2})\.(\d{6})/,'$1-$2-$3-$4');
    plugin_info.pluginId = self.id;
    let changelog = [{version:'This is a <a href="https://softspot.nl/ingress/" target="_blank">softspot.nl</a> plugin by ' + self.author,changes:[]},...self.changelog.replace(/^.*?version /s,'').split(/\nversion /).map((v)=>{v=v.split(/\n/).map((l)=>{return l.replace(/^- /,'')}).filter((l)=>{return l != "";}); return {version:v.shift(),changes:v}})];

    setup.info = plugin_info; //add the script info data to the function as a property
    if (typeof changelog !== 'undefined') setup.info.changelog = changelog;
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
