// ==UserScript==
// @author         DanielOnDiordna
// @name           Missions add-on
// @category       Addon
// @version        1.1.1.20221027.234600
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/missions-addon.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/missions-addon.user.js
// @description    [danielondiordna-1.1.1.20221027.234600] Add-on to add extra functionality for the missions plugin (up to version 0.3.0): 1: Optionally search for all missions within visible range, not just the top 25 (be aware: using this option will increase your server requests). 2: Sort the loaded missions by title (including roman numbers). 3: Show and remove stored missions. 4: Selected mission color changed to red. 5. Displayed missions show filled start portal. 6. Banner view for stored missions. 7. Transfer missions (export/import). 8. Missions routes layer can show a colorful path. 9. Redraw opened missions after IITC reloads.
// @id             missions-addon@DanielOnDiordna
// @namespace      https://softspot.nl/ingress/
// @depends        missions@jonatkins
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.missionsAddon = function() {};
    var self = window.plugin.missionsAddon;
    self.id = 'missionsAddon';
    self.title = 'Missions add-on';
    self.version = '1.1.1.20221027.234600';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 1.1.1.20221027.234600
- fixed an error with 'this' in the showMissionListDialog function

version 1.1.0.20221005.214400
- fixed a path redraw issue when opening an already opened mission again
- hardcode replace function showMissionListDialog because stock plugin Missions version 0.3.0 has too many (unneeded) changes
- this also the fixed the Bannergress plugin (which now needs the Add-on to work properly with stock plugin Missions version 0.3.0)

version 1.0.0.20221003.221800
- reversed the changelog order
- added changelog button on settings help screen
- fixed compatibility for stock Missions plugin version 0.3.0
- added auto list refresh on map move end for pre version 0.3.0
- added option to toggle auto refresh missions list when map is moved (default on from Missions plugin version 0.3.0)
- changed dialog ids to be compatible with stock Missions plugin version 0.2.2 and version 0.3.0
- changed setupShowMissionListDialog to be compatible with stock Missions plugin version 0.2.2 and version 0.3.0
- placed the eval functions inside try catch methods to prevent crashes and handle errors
- updated the help page to match the current list of settings
- added button to open all missions from banner view
- added zoom all missions from banner view
- added 'window' in front of global functions like L and dialog
- added curly brackets for readability
- open settings help in a separate window aligned to the right
- toggle colorful path option now redraws all opened missions instantly

version 0.2.5.20210724.002500
- prevent double plugin setup on hook iitcLoaded

version 0.2.5.20210527.203000
- fixed debuglayer retry bounds coloring
- added expert setting to choose the number of scan retry attempts (default 2)

version 0.2.4.20210526.002100
- changed debuglayer from LayerGroup to FeatureGroup to enable bringToBack
- changed mission debug layer colors (yellow: split area for more then 25 missions, purple: maximum 25 missions, green: less then 25 missions, orange: retry failed scan, red: failed scan)
- added scan dialog information about scans with 25 missions and failed scans

version 0.2.3.20210524.175700
- moved declaration of missiondebuglayer up, in case openTopMissions is called to soon

version 0.2.2.20210511.225000
- removed bug with settings menu create new mission button

version 0.2.1.20210501.230100
version 0.2.1.20210501.232800
version 0.2.1.20210501.233600
- added an option to keep missions always on top
- added an option to redraw opened missions after IITC reloads
- keep active mission on top
- on desktop open mission dialogs at the top left and stack them under eachother instead of at the screen center

version 0.2.0.20210501.111500
version 0.2.0.20210501.114200
- Missions routes layer can show a colorful path

version 0.1.10.20210430.001700
- added search method settings radio buttons and an option for default search
- fixed mission checkbox when clicking a mission title

version 0.1.9.20210426.234700
- improved bounds split for mission start portals
- hardcoded a minimum bounds size when splitting bounds areas
- changed some dialogs

version 0.1.8.20210422.000500
version 0.1.8.20210422.234900
- added advanced option to enable or disable a color for the active mission
- improved color setup for drawn missions (prepared for rainbow colors)
- debug layer fill when succesfull scan
- renamed Settings button to Add-on opt
- fixed endless loop on small scan areas when overlapping missions were found
- added hsl colors on debug layer to show results
- changed replace method of mission details to retain extra buttons

version 0.1.7.20210419.233500
- injected code for mission colors into functions highlightMissionLayers and drawMission
- added advanced option to use an alternative color for checked/completed missions
- added expert option to not clear mission results on rescan

version 0.1.6.20210418.231900
- fixed banneredit refresh and title
- improved missions transfer dialog
- added fix for loadmission stock function, to handle errors

version 0.1.5.20210421.190200
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin

version 0.1.5.20210416.210200
version 0.1.5.20210417.002900
- improved banner edit placeholder dialog
- added mobile side pane buttons for Stored missions and Add on Settings
- removed questionmark help buttons from settings, moved to separate help dialog, added help button on dialog titlebar

version 0.1.4.20210415.232500
- added banner editor title list to copy as placeholder
- added information for every setting in settings dialog
- added expert settings to enable a debug layer
- improved missions scanning, detect map moves
- improved dialogs if map moved

version 0.1.3.20210413.235700
version 0.1.3.20210414.070800
version 0.1.3.20210414.071600
version 0.1.3.20210415.000100
version 0.1.3.20210415.153800
version 0.1.3.20210415.161000
- fixed a bug on iOS IITC that stopped the plugin from working
- replaced named buttons by (unicode) symbols
- added a settings menu to toggle the advanced buttons
- added a settings to show classic text buttons
- added map load status in waiting dialog
- improved banner edit dialog renewing
- fixed a zoom level error with getMapZoomTileParameters

version 0.1.2.20210412.233200
- first raw version to export and import stored missions

version 0.1.1.20210412.204800
- added banner placeholders for missing missions
- added extra dialogs
- replace reload with rescan button
- improved missions finder, also find missions without start portals waypoints

version 0.1.0.20210412.001600
- improved dialogs
- added setting to always find more missions
- removed banner edit functionality
- stop loading when map is moved or zoomed
- do not reload when map is in same position

version 0.0.6.20210328.232800
version 0.0.6.20210329.231200
- minimized image download size to save on bandwidth
- display total bounds during mission reload
- added total banner missions time
- added total banner missions distance

version 0.0.5.20210327.231300
- improved mission finder system
- replaced X buttons by checkbox for missions in view
- added edit modus for banner view to remove missions

version 0.0.4.20210327.094100
version 0.0.4.20210327.102600
- improved mission title sorting mechanism, including sort by roman numbers

version 0.0.4.20210322.202300
- fix to replace http with https for image urls

version 0.0.4.20210321.211700
- added button to show earlier selected missions
- added button X to remove selected missions
- Selected mission color changed to red
- Displayed missions show filled start portal
- Banner view for selected missions

version 0.0.3.20210131.222200
- load all missions for all on screen mission start portals, not just the top 25
- store and show loaded missions until map reload or missions reload
- improved title sort for digits without trailing zeros

version 0.0.2.20210130.211900
- updated plugin wrapper and userscript header formatting to match IITC-CE coding

version 0.0.1.20191129.233100
- first release
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.retrybounds = '';
    self.retrycount = 0;

    self.subboundstotal = 0;
    self.subboundslist = [];
    self.subboundscallback = undefined;
    self.subboundserrorcallback = undefined;
    self.subboundsloading = false;
    self.missions = [];
    self.missionsindex = {};
    self.boundsloaded = '';
    self.boundsloadedcomplete = false;
    self.count25 = 0;
    self.count25max = 0;
    self.countretries = 0;
    self.countfailed = 0;
    self.countrequests = 0;
    self.countmissions = 0;

    self.localstoragesettings = self.pluginname + '-settings';
    self.settings = {};
    self.settings.showcreatenewbutton = true;
    self.settings.showstoredbutton = false;
    self.settings.showstoredicon = false;
    self.settings.showbannerbutton = false;
    self.settings.showtransferbutton = false;
    self.settings.alwaysfindmore = false;
    self.settings.activemissioncolor = true;
    self.settings.colorcheckedmissions = false;
    self.settings.showtextbuttons = true;
    self.settings.enabledebuglayer = false;
    self.settings.cleardebuglayeronscan = true;
    self.settings.keepresultsonscan = false;
    self.settings.colorfulpath = false;
    self.settings.keepontop = false;
    self.settings.redrawmissions = false;
    self.settings.retrymax = 2;
    self.settings.autorefreshonmoveend = false;

    self.settings.searchmethoddefault = false;
    self.settings.searchmethodstartportals = true;

    self.localstorageplaceholdertitles = self.pluginname + '-placeholdertitles';
    self.placeholdertitles = [];

    self.localstoragedrawnmissions = self.pluginname + '-drawnmissions';
    self.drawnmissions = [];

    self.missiondebuglayer = undefined;
    self.missiondebuglayertitle = "Missions DEBUG";
    self.missiondebugobjects = {};
    self.missionactiveguid = undefined;

    self.restoresettings = function() {
        if (typeof localStorage[self.localstoragesettings] != 'string' || localStorage[self.localstoragesettings] == '') return;
        try {
            var settings = JSON.parse(localStorage[self.localstoragesettings]);
            if (typeof settings === 'object' && settings instanceof Object && !(settings instanceof Array)) { // expect an object
                for (const i in self.settings) {
                    if (i in settings && typeof settings[i] === typeof self.settings[i]) { // only accept settings from default settings template of same type
                        if (typeof self.settings[i] === 'object' && self.settings[i] instanceof Object && !(self.settings[i] instanceof Array)) { // 1 sublevel is supported
                            for (const a in self.settings[i]) {
                                if (a in settings[i] && typeof settings[i][a] === typeof self.settings[i][a]) {
                                    self.settings[i][a] = settings[i][a];
                                }
                            }
                        } else {
                            self.settings[i] = settings[i];
                        }
                    }
                }
            }
        } catch(e) {
            return false;
        }
    };
    self.storesettings = function() {
        localStorage[self.localstoragesettings] = JSON.stringify(self.settings);
    };

    self.restorePlaceholders = function() {
        if (typeof localStorage[self.localstorageplaceholdertitles] != 'string' || localStorage[self.localstorageplaceholdertitles] == '') return;
        try {
            let placeholdertitles = JSON.parse(localStorage[self.localstorageplaceholdertitles]);
            if (typeof placeholdertitles === 'object' && placeholdertitles instanceof Object && placeholdertitles instanceof Array) { // expect an array
                for (let cnt = 0; cnt < placeholdertitles.length; cnt++) {
                    if (typeof placeholdertitles[cnt] == 'string' && placeholdertitles[cnt] != '' && self.placeholdertitles.indexOf(placeholdertitles[cnt]) < 0) {
                        self.placeholdertitles.push(placeholdertitles[cnt]);
                    }
                }
            }
        } catch(e) {
            return false;
        }
    };
    self.storePlaceholders = function() {
        localStorage[self.localstorageplaceholdertitles] = JSON.stringify(self.placeholdertitles);
    };

    self.restoredrawnmissions = function() {
        if (typeof localStorage[self.localstoragedrawnmissions] != 'string' || localStorage[self.localstoragedrawnmissions] == '') return;
        try {
            let drawnmissions = JSON.parse(localStorage[self.localstoragedrawnmissions]);
            if (typeof drawnmissions === 'object' && drawnmissions instanceof Object && drawnmissions instanceof Array) { // expect an array
                for (let cnt = 0; cnt < drawnmissions.length; cnt++) {
                    if (typeof drawnmissions[cnt] == 'string' && drawnmissions[cnt] != '' && self.drawnmissions.indexOf(drawnmissions[cnt]) < 0) {
                        self.drawnmissions.push(drawnmissions[cnt]);
                    }
                }
            }
        } catch(e) {
            return false;
        }
    };
    self.storedrawnmissions = function() {
        localStorage[self.localstoragedrawnmissions] = JSON.stringify(self.drawnmissions);
    };

    self.clearmissions = function() {
        if (!self.settings.keepresultsonscan) {
            self.missions = [];
            self.missionsindex = {};
        }
        self.boundsloaded = '';
        self.boundsloadedcomplete = false;
    };
    self.appendmissions = function(missions) {
        if (!missions || missions.length == 0) return 0;
        let newcount = 0;
        for (let cnt = 0; cnt < missions.length; cnt++) {
            let missionguid = missions[cnt].guid;
            if (self.missionsindex[missionguid] >= 0) {
                self.missions[self.missionsindex[missionguid]] = missions[cnt];
            } else {
                newcount++;
                self.missions.push(missions[cnt]);
                self.missionsindex[missionguid] = self.missions.length - 1;
            }
        }
        return newcount;
    };

    self.sortMissionPortalsByLng = function(missionportals) { // missionportals = [{guid:string,lat:float,lng:float,title:string}]
        // sort the lng positions, this creates a list from west to east:
        missionportals.sort(function(a, b) {
            var x = a.lng;
            var y = b.lng;
            return x < y ? -1 : x > y ? 1 : 0;
        });
        return missionportals;
    };

    self.sortMissionPortalsByLat = function(missionportals) { // missionportals = [{guid:string,lat:float,lng:float,title:string}]
        // sort the lat positions, this creates a list from north to south:
        missionportals.sort(function(a, b) {
            var x = a.lat;
            var y = b.lat;
            return x < y ? -1 : x > y ? 1 : 0;
        });
        return missionportals;
    };

    self.getMissionPortalsInBounds = function(bounds) {
        if (!bounds || !(bounds instanceof window.L.LatLngBounds)) bounds = window.map.getBounds();

        let missionportals = [];
        for (let guid in window.portals) {
            if (window.portals[guid].options.data.mission || window.portals[guid].options.data.mission50plus) {
                let latlng = window.portals[guid].getLatLng();
                if (bounds.contains(latlng)) {
                    missionportals.push({
                        guid: guid,
                        lat: latlng.lat,
                        lng: latlng.lng,
                        title: window.portals[guid].options.data.title
                    });
                }
            }
        }

        return missionportals;
    };

    self.zoomlevelHasPortals = function() {
        return window.getMapZoomTileParameters(window.getDataZoomForMapZoom(window.map.getZoom())).hasPortals;
    };

    self.splitboundslist = function(bounds,maxmissionportals,horizontalsplit,splitlatlng) {
        let subboundslist = [];
        if (self.settings.searchmethodstartportals && self.zoomlevelHasPortals()) {
            let missionportals = self.getMissionPortalsInBounds(bounds);
            if (horizontalsplit) {
                missionportals = self.sortMissionPortalsByLng(missionportals);
            } else { // vertical split
                missionportals = self.sortMissionPortalsByLat(missionportals);
            }

            // split bounds in blocks of mission start portals
            for (let cnt = 0; cnt < missionportals.length;) {
                let north = bounds.getNorth();
                let south = bounds.getSouth();
                let west = bounds.getWest();
                let east = bounds.getEast();

                // find next portal
                let nextcnt = Math.min(cnt + maxmissionportals - 1, missionportals.length - 1);
                if (splitlatlng != undefined) {
                    for (nextcnt = cnt; nextcnt < missionportals.length; nextcnt++) { // find portal with splitlatlng
                        if (horizontalsplit && missionportals[nextcnt].lat == splitlatlng || !horizontalsplit && missionportals[nextcnt].lng == splitlatlng) {
                            break;
                        }
                    }
                }

                // adjust bounds, between portals
                if (horizontalsplit) {
                    let prevlng = cnt - 1;
                    while (prevlng > 0 && (missionportals[cnt].lng - missionportals[prevlng].lng) == 0) {
                        prevlng--;
                    }
                    let nextlng = nextcnt + 1;
                    while (nextlng < missionportals.length - 1 && (missionportals[nextlng].lng - missionportals[nextcnt].lng) == 0) {
                        nextcnt--;
                    }

                    if (cnt > 0) west = missionportals[cnt].lng - (missionportals[cnt].lng - missionportals[prevlng].lng) / 2;
                    if (nextcnt < missionportals.length - 1) east = missionportals[nextcnt].lng + (missionportals[nextlng].lng - missionportals[nextcnt].lng) / 2;
                } else { // vertical split
                    let prevlat = cnt - 1;
                    while (prevlat > 0 && (missionportals[cnt].lat - missionportals[prevlat].lat) == 0) {
                        prevlat--;
                    }
                    let nextlat = nextcnt + 1;
                    while (nextlat < missionportals.length - 1 && (missionportals[nextlat].lat - missionportals[nextcnt].lat) == 0) {
                        nextcnt--;
                    }

                    if (cnt > 0) south = missionportals[cnt].lat - (missionportals[cnt].lat - missionportals[prevlat].lat) / 2;
                    if (nextcnt < missionportals.length - 1) north = missionportals[nextcnt].lat + (missionportals[nextlat].lat - missionportals[nextcnt].lat) / 2;
                }

                let subbounds = new window.L.LatLngBounds([south,west],[north,east]);
                let subportals = self.getMissionPortalsInBounds(subbounds);

                let splitneeded = false;
                if (horizontalsplit) {
                    subportals = self.sortMissionPortalsByLng(subportals);
                    for (let cnt = 1; cnt < subportals.length - 1; cnt++) {
                        if (subportals[cnt - 1].lng == subportals[cnt].lng) {
                            splitneeded = true;
                            subboundslist = subboundslist.concat(self.splitboundslist(subbounds,1,false,subportals[cnt].lng)); // split vertical!
                            break;
                        }
                    }
                } else {
                    subportals = self.sortMissionPortalsByLat(subportals);
                    for (let cnt = 1; cnt < subportals.length - 1; cnt++) {
                        if (subportals[cnt - 1].lat == subportals[cnt].lat) {
                            splitneeded = true;
                            subboundslist = subboundslist.concat(self.splitboundslist(subbounds,1,true,subportals[cnt].lat)); // split horizontal!
                            break;
                        }
                    }
                }

                if (!splitneeded) {
                    let missionportalcount = subportals.length;
                    subboundslist.push({bounds:subbounds,missionportalcount:missionportalcount,missionportals:subportals});
                }

                cnt += maxmissionportals;
                if (splitlatlng != undefined) {
                    cnt = nextcnt + 1;
                }
            }
        } else {
            let south = bounds.getNorth();
            let north = bounds.getSouth();
            let west = bounds.getWest();
            let east = bounds.getEast();

            let width = east - west;
            let height = south - north;

            if (width * height > 4.2558632880323265e-9) { // minimum split size
                if (width > height) { // split horizontal
                    subboundslist.push({bounds:new window.L.LatLngBounds([south,west],[north,west + width / 2])});
                    subboundslist.push({bounds:new window.L.LatLngBounds([south,west + width / 2],[north,east])});
                } else { // split vertical
                    subboundslist.push({bounds:new window.L.LatLngBounds([north + height / 2,west],[north,east])});
                    subboundslist.push({bounds:new window.L.LatLngBounds([south,west],[north + height / 2,east])});
                }
            } else {
                self.count25max++;
                self.updateProgressDialog();
                self.setdebuglayercolor(bounds,{color: '#c000c0', fill: true, fillColor: '#c000c0', fillOpacity: 0.5}); // MAX: purple fill
                console.log('splitboundslist minimum bounds reached',bounds,width * height);
            }
        }
        self.subboundstotal += subboundslist.length;
        return subboundslist;
    };

    self.decodeWaypoint = function(data) { // litteral copy from Missions plugin
        var result = {
            hidden: data[0],
            guid: data[1],
            title: data[2],
            typeNum: data[3],
            type: [null, 'Portal', 'Field Trip'][data[3]],
            objectiveNum: data[4],
            objective: [null, 'Hack this Portal', 'Capture or Upgrade Portal', 'Create Link from Portal', 'Create Field from Portal', 'Install a Mod on this Portal', 'Take a Photo', 'View this Field Trip Waypoint', 'Enter the Passphrase'][data[4]],
        };
        if (result.typeNum === 1 && data[5]) {
            result.portal = window.decodeArray.portalSummary(data[5]);
            // Portal waypoints have the same guid as the respective portal.
            result.portal.guid = result.guid;
        }
        return result;
    };
    self.decodeMission = function(data) { // copy from Missions plugin, with fix for empty result
        if (!data) return null; // fix for empty result
        return {
            guid: data[0],
            title: data[1],
            description: data[2],
            authorNickname: data[3],
            authorTeam: data[4],
            // Notice: this format is weird(100%: 1.000.000)
            ratingE6: data[5],
            medianCompletionTimeMs: data[6],
            numUniqueCompletedPlayers: data[7],
            typeNum: data[8],
            type: [null, 'Sequential', 'Non Sequential', 'Hidden'][data[8]],
            waypoints: data[9].map(self.decodeWaypoint),
            image: data[10]
        };
    };
    self.decodeMissionSummary = function(data) { // copy from Missions plugin, with fix for http images, and resize to default 50x50
        return {
            guid: data[0],
            title: data[1],
            image: data[2].replace("http:","https:").replace(/=[swh]\d+(|\-[cp])$/,'') + '=s50-c', // fix invalid urls, download max 50x50 image,
            ratingE6: data[3],
            medianCompletionTimeMs: data[4]
        };
    };

    self.loadmapmissions = function() {
        self.updateProgressDialog();

        if (!self.subboundsloading || self.subboundslist.length == 0) {
            self.subboundsloading = false;
            self.subboundslist = [];
            console.log('Total requests: ' + self.countrequests + ' (split at 25 missions: ' + self.count25 + ', stopped at maximum 25 missions: ' + self.count25max + ', retried scans: ' + self.countretries + ', failed scans: ' + self.countfailed + ') Missions found: ' + self.countmissions);
            if (typeof self.subboundscallback == "function") {
                let missions = self.getMissions();
                self.subboundscallback(missions);
                self.subboundscallback = undefined;
            } else {
                console.log('no subboundscallback function');
            }
            return;
        }

        let subbounds = self.subboundslist.shift();
        if (self.subboundslist.length == 0) self.boundsloadedcomplete = true;
        let bounds = subbounds.bounds;

        self.drawdebuglayer(bounds);
        self.countrequests++;
        window.postAjax('getTopMissionsInBounds', { // returns all (top 25) missions with mission portals starting in - or has mission portals passing through - this region
            northE6: ((bounds.getNorth() * 1E6) | 0),
            southE6: ((bounds.getSouth() * 1E6) | 0),
            westE6: ((bounds.getWest() * 1E6) | 0),
            eastE6: ((bounds.getEast() * 1E6) | 0)
        }, function(data) {
            var missions = data.result.map(self.decodeMissionSummary);
            //console.log('loadmapmissions - debug',data,missions);
            if (!missions) {
                console.log('loadmapmissions - warning: no valid mission data found',data);
            } else {
                self.setdebuglayercolor(bounds,{color: '#ffff00', fill: false}); // SPLIT: yellow border (reset color after possible retry attempt)
                let newmissionscount = self.appendmissions(missions);
                if (missions.length == 25) { // there are 25 missions found, this could be exactly the total number of missions, or it is capped of at 25
                    self.count25++;
                    self.updateProgressDialog();
                    if (self.settings.searchmethodstartportals && self.zoomlevelHasPortals()) {
                        let missionportalcount = subbounds.missionportalcount;
                        if (missionportalcount <= 1) { // stop!
                            self.count25max++;
                            self.updateProgressDialog();
                            self.setdebuglayercolor(bounds,{color: '#c000c0', fill: true, fillColor: '#c000c0', fillOpacity: 0.5}); // MAX: purple fill
                            console.log('loadmapmissions - maximum of 25 missions found on 1 portal',bounds);
                        } else { // split bounds and continue
                            self.setdebuglayercolor(bounds,{color: '#ffff00', fill: false}); // SPLIT: yellow border
                            //console.log('loadmapmissions - maximum of 25 found on ' + missionportalcount + ' portals - requeuing into 2 smaller areas to find all missions',bounds);
                            let maxmissionportals = Math.min(15, Math.ceil(missionportalcount / 2)); // min:25 higher chance of getting max missions, min:20 better, min:15 even better, min:10 less good
                            [].unshift.apply(self.subboundslist, self.splitboundslist(bounds,maxmissionportals,true));
                        }
                    } else {
                        // split bounds in 2 and continue:
                        self.setdebuglayercolor(bounds,{color: '#ffff00', fill: false}); // SPLIT: yellow border
                        // console.log('loadmapmissions - maximum of 25 found - requeuing into 2 smaller areas to find all missions',bounds);
                        [].unshift.apply(self.subboundslist, self.splitboundslist(bounds));
                    }
                } else {
                    self.countmissions += missions.length;
                    // less then 25 missions found, continue
                    self.setdebuglayercolor(bounds,{color: '#008000', fill: true, fillColor: '#008000'}); // OKAY: green fill
                }
            }
            setTimeout(self.loadmapmissions,10);
        }, function(error) {
            subbounds.retrycount = (subbounds.retrycount || 0) + 1;
            if (subbounds.retrycount <= self.settings.retrymax) {
                self.countretries++;
                self.setdebuglayercolor(bounds,{color: '#ff690f', fill: true, fillColor: '#ff690f'}); // RETRY: orange fill
                console.log('loadmapmissions - error loading map missions, retry (' + subbounds.retrycount + '/' + self.settings.retrymax + ')',bounds,arguments);
                self.subboundslist.unshift(subbounds); // retry same bounds
                setTimeout(self.loadmapmissions,50);
            } else {
                self.countfailed++;
                self.updateProgressDialog();
                self.setdebuglayercolor(bounds,{color: '#FF0000', fill: true, fillColor: '#FF0000', fillOpacity: 0.8}); // FAIL: red fill
                console.warn('loadmapmissions - permanently failed loading map missions for bounds:',bounds,arguments);
                setTimeout(self.loadmapmissions,10);
            }
        });
    };

    self.updateProgressDialog = function() {
        $('#boundsLength').text(self.subboundslist.length + ' (total: ' + self.subboundstotal + ')');
        $('#count25').text(self.count25);
        $('#count25max').text(self.count25max);
        $('#countfailed').text(self.countfailed);
        $('#missionsFound').text(self.missions.length);
    };
    self.showprogressDialog = function() {
        let container = document.createElement('div');
        container.appendChild(document.createTextNode('Areas to go: '));

        let boundsLength = container.appendChild(document.createElement('span'));
        boundsLength.id = 'boundsLength';
        boundsLength.textContent = self.subboundslist.length + ' (total: ' + self.subboundstotal + ')';

        container.appendChild(document.createElement('br'));
        container.appendChild(document.createTextNode('Areas with 25 missions that will be split up: '));

        let count25 = container.appendChild(document.createElement('span'));
        count25.id = 'count25';
        count25.textContent = self.count25;

        container.appendChild(document.createElement('br'));
        container.appendChild(document.createTextNode('Areas with max 25 missions: '));

        let count25max = container.appendChild(document.createElement('span'));
        count25max.id = 'count25max';
        count25max.textContent = self.count25max;

        container.appendChild(document.createElement('br'));
        container.appendChild(document.createTextNode('Permanently failed scans: '));

        let countfailed = container.appendChild(document.createElement('span'));
        countfailed.id = 'countfailed';
        countfailed.textContent = self.countfailed;

        container.appendChild(document.createElement('br'));
        container.appendChild(document.createTextNode('Missions found: '));

        let missionsFound = container.appendChild(document.createElement('span'));
        missionsFound.id = 'missionsFound';
        missionsFound.textContent = self.missions.length;

        container.appendChild(document.createElement('br'));
        container.appendChild(document.createElement('br'));
        container.appendChild(document.createTextNode('Please wait...'));
        container.appendChild(document.createElement('br'));

        let stopbutton = container.appendChild(document.createElement('button'));
        stopbutton.textContent = 'Stop';
        stopbutton.addEventListener('click', function(e) {
            e.preventDefault();
            stopbutton.disabled = true;
            stopbutton.textContent = 'Stopped';
            self.stoploading();
        }, false);

        let alwayscheckboxarea = container.appendChild(document.createElement('label'));
        let alwayscheckbox = alwayscheckboxarea.appendChild(document.createElement('input'));
        alwayscheckbox.type = 'checkbox';
        alwayscheckbox.checked = self.settings.alwaysfindmore;
        alwayscheckboxarea.appendChild(document.createTextNode('Always automatically try to find more'));
        alwayscheckbox.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.alwaysfindmore = this.checked;
            self.storesettings();
        },false);

        let buttons = {};
        buttons[(self.settings.showtextbuttons?'Close':'✖')] = function() { $(this).dialog('close'); };

        window.dialog({
            id: "missionsList",
            title: 'Missions in view',
            height: 'auto',
            html: container,
            width: '400px',
            closeCallback: function() {
                if (self.subboundslist.length != 0) {
                    self.stoploading();
                    self.subboundscallback = undefined;
                }
            }
        }).dialog('option', 'buttons', buttons);
    };

    self.stoploading = function() {
        self.subboundsloading = false;
        //self.subboundslist = [];
    };

    self.removehooks = function() {
        // remove hooks
        if (window._hooks && window._hooks.mapDataRefreshEnd && window._hooks.mapDataRefreshEnd.length > 0) {
            for (let cnt = 0; cnt < window._hooks.mapDataRefreshEnd.length; cnt++) {
                if (window._hooks.mapDataRefreshEnd[cnt].toString().match(/loadAllMissionsInBounds/)) {
                    window.removeHook('mapDataRefreshEnd',window._hooks.mapDataRefreshEnd[cnt]);
                    break;
                }
            }
        }
        if (window._hooks && window._hooks.requestFinished && window._hooks.requestFinished.length > 0) {
            for (let cnt = 0; cnt < window._hooks.requestFinished.length; cnt++) {
                if (window._hooks.requestFinished[cnt].toString().match(/mapDataRequest/)) {
                    window.removeHook('requestFinished',window._hooks.requestFinished[cnt]);
                    break;
                }
            }
        }
    };

    self.loadAllMissionsInBounds = function(bounds, callback, errorcallback) {
        if (self.subboundsloading || self.subboundslist.length > 0) { // already running
            self.showprogressDialog();
            return;
        }

        self.removehooks();

        let status = window.mapDataRequest.getStatus();
        if (self.settings.searchmethodstartportals && self.zoomlevelHasPortals() && status.short && status.short != 'done') {
            let container = document.createElement('div');
            container.className = self.id + 'mainmenu';

            container.textContent = 'Waiting until map loading status is "done"...';
            let statusarea = container.appendChild(document.createElement('div'));
            let missionstartportalsarea = container.appendChild(document.createElement('div'));

            let buttons = {};
            buttons[(self.settings.showtextbuttons?'In view':'🔎')] = function() { window.plugin.missions.showMissionListDialog(self.getMissions()); };
            buttons[(self.settings.showtextbuttons?'Close':'✖')] = function() { $(this).dialog('close'); };
            window.dialog({
                id: "missionsList",
                title: 'Missions in view - Wait',
                height: 'auto',
                html: container,
                width: '400px',
                closeCallback: function() {
                    if (window.mapDataRequest.status.short != 'done') {
                        self.removehooks();
                    }
                }
            }).dialog('option', 'buttons', buttons);

            // add hook to update map loading status
            window.addHook('requestFinished',function() {
                if (!statusarea) return;
                let status = window.mapDataRequest.getStatus();
                statusarea.textContent = 'map: ' + status.short + (status.progress !== undefined && status.progress !== -1 ? ' ' + Math.floor(status.progress*100)+'%':'');
                missionstartportalsarea.textContent = 'mission start portals found: ' + self.getMissionPortalsInBounds(bounds).length;
            });
            // add hook to wait for map loading done
            window.addHook('mapDataRefreshEnd',function() { setTimeout(function() { self.loadAllMissionsInBounds(bounds, callback, errorcallback); },0); }); // timeout needed to wait for status to be updated to done (setStatus is executed after the hook is fired)
            return;
        }

        if (window.map.getBounds().toBBoxString() != bounds.toBBoxString()) { // map was moved during this dialog!
            console.log('map was moved during this dialog!');
            bounds = window.map.getBounds();
        }

        let maxmissionportals = 15; // max 25 gives a high chance of getting max 25 missions; After some testing: 20 better, 15 even better, 10 less good
        self.subboundslist = self.splitboundslist(bounds,maxmissionportals,true);
        self.subboundstotal = self.subboundslist.length;
        self.subboundscallback = callback;
        self.subboundserrorcallback = errorcallback;
        self.showprogressDialog();
        self.subboundsloading = true;
        setTimeout(self.loadmapmissions,0);
    };

    self.confirmFindmore = function(missions,bounds,callback,errorcallback) {
        if (self.settings.alwaysfindmore) {
            self.loadAllMissionsInBounds(bounds,callback,errorcallback);
            return;
        }

        let container = document.createElement('div');
        container.className = self.id + 'mainmenu';

        container.appendChild(document.createTextNode('Default maximum of 25 missions found.'));
        container.appendChild(document.createElement('br'));
        container.appendChild(document.createTextNode('There are probably more in view.'));
        container.appendChild(document.createElement('br'));
        container.appendChild(document.createElement('br'));
        container.appendChild(document.createTextNode('Try to find more?'));
        container.appendChild(document.createElement('br'));
        container.appendChild(document.createTextNode('(be aware that this function will increase your server requests)'));
        container.appendChild(document.createElement('br'));
        if (!self.zoomlevelHasPortals()) {
            container.appendChild(document.createTextNode('Zoom in to show all portals to find more missions.'));
            container.appendChild(document.createElement('br'));
        }

        let buttonsarea = container.appendChild(document.createElement('div'));
        let nobutton = buttonsarea.appendChild(document.createElement('button'));
        nobutton.textContent = 'No';
        nobutton.addEventListener('click', function(e) {
            e.preventDefault();
            window.plugin.missions.showMissionListDialog(self.getMissions());
        }, false);

        let okaybutton = buttonsarea.appendChild(document.createElement('button'));
        okaybutton.textContent = 'Okay';
        okaybutton.addEventListener('click', function(e) {
            e.preventDefault();
            if (window.map.getBounds().toBBoxString() != bounds.toBBoxString()) { // map was moved during this dialog!
                let restartarea = document.createElement('div');
                let restartbutton = restartarea.appendChild(document.createElement('button'));
                restartbutton.textContent = 'Restart';
                restartarea.appendChild(document.createTextNode(' Map was moved during this dialog!'));
                restartarea.appendChild(document.createElement('br'));
                restartarea.appendChild(document.createTextNode('Scan needs to restart.'));
                restartbutton.addEventListener('click', function(e) {
                    e.preventDefault();
                    window.plugin.missions.openTopMissions(window.map.getBounds());
                }, false);
                buttonsarea.replaceWith(restartarea);
            } else {
                self.loadAllMissionsInBounds(bounds,callback,errorcallback);
            }
        }, false);

        let alwayscheckboxarea = buttonsarea.appendChild(document.createElement('label'));
        let alwayscheckbox = alwayscheckboxarea.appendChild(document.createElement('input'));
        alwayscheckbox.type = 'checkbox';
        alwayscheckbox.checked = self.settings.alwaysfindmore;
        alwayscheckboxarea.appendChild(document.createTextNode('Always try to automatically find more'));
        alwayscheckbox.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.alwaysfindmore = this.checked;
            self.storesettings();
        },false);

        let buttons = self.getdialogbuttons();
        window.dialog({
            id: "missionsList",
            title: 'Missions in view - Scan',
            height: 'auto',
            html: container,
            width: '400px'
        }).dialog('option', 'buttons', buttons);
    };

    self.createsortablemissiontitle = function(missiontitle) {
        function deromanize(str) {
            str = str.toUpperCase();
            let validator = /^M*(?:D?C{0,3}|C[MD])(?:L?X{0,3}|X[CL])(?:V?I{0,3}|I[XV])$/;
            if (!(str && validator.test(str))) {
                return str;
            }
            let token = /[MDLV]|C[MD]?|X[CL]?|I[XV]?/g;
            let key = {M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1};
            let num = 0, m;
            while (m = token.exec(str)) {
                num += key[m[0]];
            }
            return num;
        }

        let sortabletitle = missiontitle.toLowerCase();
        sortabletitle = sortabletitle.replace(/([^a-z])([MDCLXVI]+)([^a-z])/gi,function(full,one,two,three,pos) {
            return one + deromanize(two) + three;
        }).replace(/([^a-z])([MDCLXVI]+)$/gi,function(full,one,two,pos) {
            return one + deromanize(two);
        }).replace(/^([MDCLXVI]+)([^a-z])/gi,function(full,one,two,pos) {
            return deromanize(one) + two;
        });

        sortabletitle = sortabletitle.replace(/\d+/g, function(num) {
            return "0000".substr(num.length) + num;
        });
        sortabletitle = sortabletitle.replace(/^([0-9\s\-\/\\\.\[\]\(\)#<>:!,;\{\}'"]+)([^0-9\s\-\/\\\.\[\]\(\)#<>:!,;\{\}'"]+)/,'$2$1');
        return sortabletitle;
    };

    self.sortmissions = function(missions) {
        // sort the list by mission title (case insensitive, smart sort numbers, sort roman numbers):
        let sortable = [];
        missions.forEach(function(mission) {
            sortable.push({sortabletitle:self.createsortablemissiontitle(mission.title), mission:mission});
        }, this);

        sortable.sort(function(a, b) {
            var x = a.sortabletitle;
            var y = b.sortabletitle;
            return x < y ? -1 : x > y ? 1 : 0;
        });

        let sortedmissions = [];
        for (let cnt = 0; cnt < sortable.length; cnt++) {
            sortedmissions.push(sortable[cnt].mission);
        }

        return sortedmissions;
    };

    self.bannerEdit = function(oldcontainer) {
        let missions = self.getMissions(true);

        let bannermissions = [];
        for (let cnt = 0; cnt < missions.length; cnt++) {
            bannermissions.push(missions[cnt]);
            bannermissions[cnt].index = cnt;
        }
        for (let cnt = 0; cnt < self.placeholdertitles.length; cnt++) {
            bannermissions.push({
                placeholdertitle: true,
                title: self.placeholdertitles[cnt],
                image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAAAAAA7VNdtAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQflBAwOJxIW6dfOAAAC4klEQVRIx43VW08bRxQH8P85M3vDC8TGCBbiNk1pkjZJJVLlIlUqqdRP0Y+ZfoE+9AYoiNAqihBNGqKEVhBfkMFe786cPnCz2RWeeZmHOT/9NdI5M/RP7WerBI6Le41veKP1HVlyFf2FBxus1w+fwtFwP3myvssUrHUcDfeTx6t7EQtcDfeTx6sfQstwNScZoQXD0ZwLMNzMhQDDyQyJEzLWDItTMsaMiDNypRkV5+TMGBonLghEgrXOUyqYy2KIACgzBTFCpMQUxWhK0ZSIUVK4T5m4RIARQ70SUSBAsNb53rMEgLJGiQADRAQCAAJAgmCtdU9AIDN1Z/3f0NJJCYhO92dkrGghghgNZEpE930SIqMwYChYJUbEFwMlBh40ZZ9+1vnzVus/qi1tGNydl532E70TdQ+Wt8JHE83N6cbW1H0+eDl3m19Wr+9tE5OtdqJGJRK7mNR7X84/fx2H4U6rFnJNP+z8Ed2nGRNE29c/9/V2d/bDfD1nUD4XtAg2nnzxCdc3m7ubCL6opl99a6tmq7txLTBE2dutOancirMbWZcZoj7+9tHL+rMzC7OVtJarKnd/fR/8vYnUj9OqGAwENJ2rg1+aQPtQqx/zxeP3Ormhk3dvouj1cn1psrk0O5g83L/5Kvx6Zumv9HbtuLE4/8K7We/W3yx2j+gnW8ER4nhg29lE5SBO0j0d62PKB1OHg1p9vxVd43bstY8mpnXT6wf2iJ6RAcMahiJrtcnJT6vBPhEZDmZ2ERgj2ohS1oi2LGCGKAUoX2sIaeEgTBdWfCiCpjT5wcvZ88nzWcjzSZNiMCACiIgAEIB6yaPVt1oAAf3eWSEDwcmhQCDFHjt9d09/j7BsTrlMnHdi6WzzVaLc8JWi1PDVoszwGFFieJwoGh4rCobHi8uGHcQlwy5i1LCTGDHsJoYNO4ohw67iwjD3F9zEueGeY8aZWWFaXV53FQAofVij7Pm7yFkAyB/8D26O+q45FJqpAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIxLTA0LTEyVDE0OjM4OjQzKzAwOjAwkPtYggAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMS0wNC0xMlQxNDozODo0MyswMDowMOGm4D4AAAAASUVORK5CYII='
            });
        }
        bannermissions = self.sortmissions(bannermissions);

        let container = document.createElement('div');
        container.textContent = 'Mission and placeholder titles:';

        let titlesarea = container.appendChild(document.createElement('textarea'));
        titlesarea.readOnly = true;
        titlesarea.textContent = bannermissions.map(function(mission) { return mission.title + (mission.placeholdertitle ? ' [p]':''); }).join('\n');
        titlesarea.style.width = '96%';
        titlesarea.style.height = '75px';
        titlesarea.style.resize = 'vertical';
        titlesarea.style.display = 'block';

        let addplaceholderbutton = container.appendChild(document.createElement('button'));
        addplaceholderbutton.textContent = 'Add placeholder title';
        addplaceholderbutton.title = 'You can add a placeholder title to fill up the banner for a missing mission (not found/stored yet).\nPlaceholder titles are automatically removed when you download and store the mission later on.';
        addplaceholderbutton.id = self.id + 'placeholderbutton';
        addplaceholderbutton.lasttitle = '';
        let oldplaceholderbutton = document.getElementById(self.id + 'placeholderbutton');
        if (oldplaceholderbutton != null) addplaceholderbutton.lasttitle = oldplaceholderbutton.lasttitle;

        addplaceholderbutton.addEventListener('click', function(e) {
            e.preventDefault();

            let suggestion = (addplaceholderbutton.lasttitle? addplaceholderbutton.lasttitle : (bannermissions && bannermissions.length > 0?bannermissions[0].title:'') );
            if (titlesarea.selectionStart !== undefined && titlesarea.selectionStart != titlesarea.selectionEnd) {
                suggestion = titlesarea.value.substring(titlesarea.selectionStart, titlesarea.selectionEnd).replace(/\n.*$/s,'');
            }
            let placeholdertitle = prompt('Enter a (missing) mission title to use as placeholder:',suggestion);
            if (typeof placeholdertitle == 'string') {
                placeholdertitle = placeholdertitle.trim();
                if (placeholdertitle != '' && self.placeholdertitles.map(function(title) { return title.toUpperCase(); }).indexOf(placeholdertitle.toUpperCase()) >= 0) {
                    addplaceholderbutton.lasttitle = placeholdertitle;
                    placeholdertitle = '';
                    alert('Placeholder title already exists');
                }
                for (let cnt = 0; cnt < missions.length && placeholdertitle != ""; cnt++) {
                    if (missions[cnt].title.toUpperCase() == placeholdertitle.toUpperCase()) {
                        addplaceholderbutton.lasttitle = placeholdertitle;
                        placeholdertitle = '';
                        alert('Placeholder title already exists as a stored mission');
                    }
                }
                if (placeholdertitle != '') {
                    addplaceholderbutton.lasttitle = placeholdertitle;
                    self.placeholdertitles.push(placeholdertitle);
                    self.storePlaceholders();
                    self.bannerEdit(container);
                }
            }
        }, false);
        container.appendChild(document.createElement('br'));

        let table = container.appendChild(document.createElement('table'));
        table.className = self.id + '-banner-summary';

        bannermissions = self.sortmissions(bannermissions).reverse(); // reverse sort, switched a and b
        for (let rowcnt = 0; rowcnt < bannermissions.length; rowcnt += 6) {
            var row = table.appendChild(document.createElement('tr'));
            for (let cellcnt = 0; cellcnt < 6 && rowcnt + cellcnt < bannermissions.length; cellcnt++) {
                let mission = bannermissions[rowcnt + cellcnt];
                let cell = row.appendChild(document.createElement('td'));
                cell.style.position = 'relative';
                let img = cell.appendChild(document.createElement('img'));
                if (mission.placeholdertitle) {
                    img.src = mission.image;
                } else {
                    img.src = mission.image.replace('http:','https:').replace(/=[swh]\d+(|\-[cp])$/,'') + '=s50-c'; // fix for http urls, download max 50x50 image
                }
                img.title = (mission.placeholdertitle?'Placeholder: ':'') + mission.title;

                let txt = cell.appendChild(document.createElement('span'));
                txt.className = self.id + '-banner-edit-buttons';

                let deleteButton = txt.appendChild(document.createElement('span'));
                deleteButton.textContent = 'X';
                deleteButton.title = img.title;
                deleteButton.addEventListener('click', function() {
                    if (mission.placeholdertitle) {
                        self.placeholdertitles.splice(self.placeholdertitles.indexOf(mission.title),1);
                        self.storePlaceholders();
                    } else {
                        self.deleteCachedListItem(mission.guid);
                    }
                    self.bannerEdit(container);
                }, false);
            }
        }

        if (typeof oldcontainer == 'object' && oldcontainer instanceof HTMLElement) {
            oldcontainer.replaceWith(container);
            document.getElementById('dialog-missionsList').parentElement.getElementsByClassName('ui-dialog-title')[0].textContent = 'Stored Missions Banner Edit - ' + missions.length;
            return;
        }

        let buttons = self.getdialogbuttons();
        window.dialog({
            title: 'Stored Missions Banner Edit - ' + missions.length,
            html: container,
            id: "missionsList",
            minWidth: 360,
            height: 'auto'
        }).dialog('option', 'buttons', buttons);
    };

    self.bannerDisplay = function(missions) {
        if (!missions) missions = self.getMissions(true);

        function msToTime(s) {
            // Pad to 2 or 3 digits, default is 2
            function pad(n, z) {
                z = z || 2;
                return ('00' + n).slice(-z);
            }

            var ms = s % 1000;
            s = (s - ms) / 1000;
            var secs = s % 60;
            s = (s - secs) / 60;
            var mins = s % 60;
            var hrs = (s - mins) / 60;

            return hrs + ':' + pad(mins) + ':' + pad(secs) + '.' + pad(ms, 3);
        }
        function distance(len) {
            if (len > 0) {
                if (len > 1000) {
                    len = Math.round(len / 100) / 10 + 'km';
                } else {
                    len = Math.round(len * 10) / 10 + 'm';
                }
            } else {
                len = 'unknown';
            }
            return len;
        }

        let container = document.createElement('div');
        let table = container.appendChild(document.createElement('table'));
        table.className = self.id + '-banner-summary';

        let medianCompletionTimeMs_total = 0;
        let waypoints_length = 0;

        let bannermissions = [];
        let missiontitles = [];
        for (let cnt = 0; cnt < missions.length; cnt++) {
            let mission = missions[cnt];
            bannermissions.push(mission);
            missiontitles.push(mission.title);
            if (mission.medianCompletionTimeMs) medianCompletionTimeMs_total += mission.medianCompletionTimeMs;
            if (mission.waypoints) {
                var len = mission.waypoints.filter(function(waypoint) {
                    return !!waypoint.portal;
                }).map(function(waypoint) {
                    return window.L.latLng(waypoint.portal.latE6/1E6, waypoint.portal.lngE6/1E6);
                }).map(function(latlng1, i, latlngs) {
                    if(i == 0) return 0;
                    var latlng2 = latlngs[i - 1];
                    return latlng1.distanceTo(latlng2);
                }).reduce(function(a, b) {
                    return a + b;
                }, 0);
                waypoints_length += len;
                missions[cnt].waypoints_length = len;
            }
        }

        for (let cnt = self.placeholdertitles.length - 1; cnt >= 0; cnt--) {
            if (missiontitles.indexOf(self.placeholdertitles[cnt]) >= 0) {
                self.placeholdertitles.splice(cnt,1); // remove placeholdertitles if mission with same name is stored
                self.storePlaceholders();
            } else {
                bannermissions.push({
                    placeholdertitle: true,
                    title: self.placeholdertitles[cnt],
                    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAAAAAA7VNdtAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQflBAwOJxIW6dfOAAAC4klEQVRIx43VW08bRxQH8P85M3vDC8TGCBbiNk1pkjZJJVLlIlUqqdRP0Y+ZfoE+9AYoiNAqihBNGqKEVhBfkMFe786cPnCz2RWeeZmHOT/9NdI5M/RP7WerBI6Le41veKP1HVlyFf2FBxus1w+fwtFwP3myvssUrHUcDfeTx6t7EQtcDfeTx6sfQstwNScZoQXD0ZwLMNzMhQDDyQyJEzLWDItTMsaMiDNypRkV5+TMGBonLghEgrXOUyqYy2KIACgzBTFCpMQUxWhK0ZSIUVK4T5m4RIARQ70SUSBAsNb53rMEgLJGiQADRAQCAAJAgmCtdU9AIDN1Z/3f0NJJCYhO92dkrGghghgNZEpE930SIqMwYChYJUbEFwMlBh40ZZ9+1vnzVus/qi1tGNydl532E70TdQ+Wt8JHE83N6cbW1H0+eDl3m19Wr+9tE5OtdqJGJRK7mNR7X84/fx2H4U6rFnJNP+z8Ed2nGRNE29c/9/V2d/bDfD1nUD4XtAg2nnzxCdc3m7ubCL6opl99a6tmq7txLTBE2dutOancirMbWZcZoj7+9tHL+rMzC7OVtJarKnd/fR/8vYnUj9OqGAwENJ2rg1+aQPtQqx/zxeP3Ormhk3dvouj1cn1psrk0O5g83L/5Kvx6Zumv9HbtuLE4/8K7We/W3yx2j+gnW8ER4nhg29lE5SBO0j0d62PKB1OHg1p9vxVd43bstY8mpnXT6wf2iJ6RAcMahiJrtcnJT6vBPhEZDmZ2ERgj2ohS1oi2LGCGKAUoX2sIaeEgTBdWfCiCpjT5wcvZ88nzWcjzSZNiMCACiIgAEIB6yaPVt1oAAf3eWSEDwcmhQCDFHjt9d09/j7BsTrlMnHdi6WzzVaLc8JWi1PDVoszwGFFieJwoGh4rCobHi8uGHcQlwy5i1LCTGDHsJoYNO4ohw67iwjD3F9zEueGeY8aZWWFaXV53FQAofVij7Pm7yFkAyB/8D26O+q45FJqpAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIxLTA0LTEyVDE0OjM4OjQzKzAwOjAwkPtYggAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMS0wNC0xMlQxNDozODo0MyswMDowMOGm4D4AAAAASUVORK5CYII='
                });
            }
        }
        bannermissions = self.sortmissions(bannermissions).reverse(); // reverse sort, switched a and b

        for (let rowcnt = 0; rowcnt < bannermissions.length; rowcnt += 6) {
            var row = table.appendChild(document.createElement('tr'));
            for (let cellcnt = 0; cellcnt < 6 && rowcnt + cellcnt < bannermissions.length; cellcnt++) {
                let mission = bannermissions[rowcnt + cellcnt];
                let cell = row.appendChild(document.createElement('td'));
                cell.style.position = 'relative';
                let img = cell.appendChild(document.createElement('img'));
                if (mission.placeholdertitle) {
                    img.src = mission.image;
                } else {
                    img.src = mission.image.replace('http:','https:').replace(/=[swh]\d+(|\-[cp])$/,'') + '=s50-c'; // fix for http urls, download max 50x50 image
                }
                img.title = (mission.placeholdertitle?'Placeholder: ':'') + mission.title;
                if (mission.medianCompletionTimeMs) img.title += '\n' + msToTime(mission.medianCompletionTimeMs);
                if (mission.waypoints_length) img.title += '\n' + distance(mission.waypoints_length);

                img.style.cursor = 'pointer';
                img.addEventListener('click', function() {
                    if (!mission.placeholdertitle) {
                        window.plugin.missions.openMission(mission.guid);
                    }
                }, false);
            }
        }
        let totaltime = container.appendChild(document.createElement('span'));
        totaltime.className = 'plugin-mission-info time help';
        totaltime.textContent = 'Total time: ' + msToTime(medianCompletionTimeMs_total);
        let timeimg = totaltime.insertBefore(document.createElement('img'), totaltime.firstChild);
        timeimg.src = 'https://commondatastorage.googleapis.com/ingress.com/img/tm_icons/time.png';

        container.appendChild(document.createElement('br'));
        let totallength = container.appendChild(document.createElement('span'));
        totallength.className = 'plugin-mission-info length help';
        totallength.textContent = 'Total distance: ' + distance(waypoints_length);
        let distanceimg = totallength.insertBefore(document.createElement('img'), totallength.firstChild);
        distanceimg.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASAQMAAABsABwUAAAABlBMVEUAAACy+/gnk9HpAAAAAXRSTlMAQObYZgAAABVJREFUCNdjYEADB9Dg//8QjA7RAAB2VBF9TkATUAAAAABJRU5ErkJggg==';

        container.appendChild(document.createElement('br'));
        let drawmissions = container.appendChild(document.createElement('button'));
        drawmissions.textContent = "Draw all missions";
        drawmissions.addEventListener('click', function(e) {
            e.preventDefault();
            for (let cnt = bannermissions.length - 1; cnt >= 0; cnt--) { // reverse
                if (!bannermissions[cnt].placeholdertitle) {
                    window.plugin.missions.openMission(bannermissions[cnt].guid);
                }
            }
        },false);
        let zoommissions = container.appendChild(document.createElement('button'));
        zoommissions.textContent = "Zoom to view all missions";
        zoommissions.addEventListener('click', function(e) {
            e.preventDefault();
            let allmissionwaypoints = { waypoints: [] };
            for (let cnt = 0; cnt < bannermissions.length; cnt++) {
                allmissionwaypoints.waypoints = allmissionwaypoints.waypoints.concat(bannermissions[cnt].waypoints);
            }
            window.plugin.missions.zoomToMission(allmissionwaypoints);
        },false);

        let author = container.appendChild(document.createElement('div'));
        author.className = self.id + 'author';
        author.textContent = self.title + ' version ' + self.version + ' by ' + self.author;

        let buttons = self.getdialogbuttons('Banner view');
        window.dialog({
            title: 'Stored Missions Banner View - ' + missions.length,
            html: container,
            id: "missionsList",
            minWidth: 360,
            height: 'auto'
        }).dialog('option', 'buttons', buttons);
    };

    self.loadMissionsList = function(missionguids,total,importstatusarea,exportbutton,failonerror) {
        let loadguid = '';
        while ((typeof loadguid != 'string' || loadguid == '') && missionguids.length > 0) {
            loadguid = missionguids.shift();
            //if (typeof loadguid == 'string' && loadguid != '' && window.plugin.missions.cacheByMissionGuid[loadguid]) loadguid = '';
        }
        if (typeof loadguid == 'string' && loadguid != '') {
            importstatusarea.textContent = 'Importing: ' + (total - missionguids.length) + '/' + total;
            setTimeout(function() { window.plugin.missions.loadMission(loadguid,function(mission) { let missions = self.getMissions(true); exportbutton.textContent = 'Export stored missions: ' + missions.length; self.loadMissionsList(missionguids,total,importstatusarea,exportbutton,false); },function(error) { importstatusarea.textContent += ' Failed'; if (failonerror === false) missionguids.unshift(loadguid); self.loadMissionsList(missionguids,total,importstatusarea,exportbutton,true); }); },20);
        } else {
            importstatusarea.textContent = 'Import ready: ' + total;
        }
    };

    self.missionsTransfer = function() {
        let missions = self.getMissions(true);

        let container = document.createElement('div');
        container.className = self.id + 'mainmenu';
        container.style.textAlign = 'center';

        let exportbutton = container.appendChild(document.createElement('button'));
        exportbutton.textContent = 'Export stored missions: ' + missions.length;
        exportbutton.style.minWidth = '190px';
        exportbutton.style.margin = '5px';
        exportbutton.addEventListener('click', function(e) {
            e.preventDefault();
            let missionguids = [];
            for (let cnt = 0; cnt < missions.length; cnt++) {
                missionguids.push(missions[cnt].guid);
            }
            prompt('Export missions:',JSON.stringify(missionguids));
        }, false);

        container.appendChild(document.createElement('br'));

        let importbutton = container.appendChild(document.createElement('button'));
        importbutton.textContent = 'Import missions';
        importbutton.style.minWidth = '190px';
        importbutton.style.margin = '5px';
        let importstatusarea = container.appendChild(document.createElement('div'));
        importbutton.addEventListener('click', function(e) {
            e.preventDefault();
            let missionguids = prompt('Import missions:');
            if (missionguids == null) {
                importstatusarea.textContent = '';
            } else {
                importstatusarea.textContent = 'Checking data...';
                try {
                    missionguids = JSON.parse(missionguids);
                } catch(e) {
                    importstatusarea.textContent = 'Invalid data';
                }
                if (typeof missionguids === 'object' && missionguids instanceof Object && missionguids instanceof Array) { // expect an array
                    self.loadMissionsList(missionguids,missionguids.length,importstatusarea,exportbutton,false);
                } else {
                    importstatusarea.textContent = 'No valid data';
                }
            }
        }, false);

        let clearbutton = container.appendChild(document.createElement('button'));
        clearbutton.textContent = 'Clear stored';
        clearbutton.style.minWidth = '190px';
        clearbutton.style.margin = '5px';
        clearbutton.addEventListener('click', function(e) {
            e.preventDefault();
            self.clearStored(function() { self.missionsTransfer(); });
        }, false);

        container.appendChild(document.createElement('br'));

        let buttons = self.getdialogbuttons('Transfer');
        window.dialog({
            title: 'Stored Missions Transfer',
            html: container,
            id: "missionsList",
            width: 'auto',
            height: 'auto'
        }).dialog('option', 'buttons', buttons);
    };

    self.showconfirmDialog = function(bounds) {
        let container = document.createElement('div');
        container.appendChild(document.createTextNode('Missions for the current map view were recently scanned.'));
        container.appendChild(document.createElement('br'));
        container.appendChild(document.createTextNode('Missions found: ' + self.missions.length));
        if (!self.boundsloadedcomplete) {
            container.appendChild(document.createElement('br'));
            container.appendChild(document.createTextNode('Last scan was incomplete, there could be more missions.'));
        }
        if (!self.zoomlevelHasPortals()) {
            container.appendChild(document.createElement('br'));
            container.appendChild(document.createTextNode('Zoom in to show all portals to find more missions.'));
        }
        container.appendChild(document.createElement('br'));

        let cancelbutton = container.appendChild(document.createElement('button'));
        cancelbutton.textContent = 'Use previous scan';
        cancelbutton.addEventListener('click', function(e) {
            e.preventDefault();
            cancelbutton.disabled = true;
            window.plugin.missions.showMissionListDialog(self.getMissions());
        }, false);

        let rescanbutton = container.appendChild(document.createElement('button'));
        rescanbutton.textContent = (self.settings.showtextbuttons?'Rescan anyway':'🔎↻');
        rescanbutton.addEventListener('click', function(e) {
            e.preventDefault();
            rescanbutton.disabled = true;
            self.clearmissions();
            window.plugin.missions.openTopMissions(bounds);
        }, false);

        let buttons = self.getdialogbuttons('Confirm rescan');
        window.dialog({
            title: 'Missions in view',
            html: container,
            id: "missionsList",
            minWidth: 360,
            height: 'auto'
        }).dialog('option', 'buttons', buttons);
    };

    self.setupOpenTopMissions = function() {
        // replace stock missions function:
        window.plugin.missions.openTopMissions = function(bounds) {
            if (self.subboundsloading || self.subboundslist.length > 0) { // already running
                self.showprogressDialog();
                return;
            }

            bounds = bounds || window.map.getBounds();
            if (self.boundsloaded == bounds.toBBoxString()) {
                // map did not move, ask to show same missions or reload
                self.showconfirmDialog(bounds);
                return;
            }

            let buttons = self.getdialogbuttons('Scan');
            window.dialog({
                title: 'Missions in view',
                html: 'Loading top missions for current view<br><br>Please wait...',
                id: "missionsList",
                minWidth: 360,
                height: 'auto'
            }).dialog('option', 'buttons', buttons);

            if (self.settings.cleardebuglayeronscan) {
                self.cleardebuglayer();
            }
            self.count25 = 0;
            self.count25max = 0;
            self.countretries = 0;
            self.countfailed = 0;
            self.countrequests = 1;
            self.countmissions = 0;
            self.drawdebuglayer(bounds);
            window.plugin.missions.loadMissionsInBounds(
                bounds,
                function(missions) {
                    // first run
                    self.clearmissions();
                    self.appendmissions(missions);
                    self.boundsloaded = bounds.toBBoxString();
                    if (missions.length < 25) {
                        self.setdebuglayercolor(bounds,{color: '#008000', fill: true, fillColor: '#008000'}); // OKAY: green fill
                    } else {
                        self.count25++;
                        self.updateProgressDialog();
                        if (!self.settings.searchmethoddefault) {
                            self.setdebuglayercolor(bounds,{color: '#ffff00', fill: false}); // SPLIT: yellow border
                            self.confirmFindmore(missions,bounds,window.plugin.missions.showMissionListDialog);
                            return;
                        }
                        self.setdebuglayercolor(bounds,{color: '#c000c0', fill: true, fillColor: '#c000c0', fillOpacity: 0.5}); // MAX: purple fill
                    }
                    self.countmissions += missions.length;
                    console.log('Total requests: ' + self.countrequests + ' (result 25 missions: ' + self.count25 + ') Missions found: ' + self.countmissions);
                    self.boundsloadedcomplete = true;
                    window.plugin.missions.showMissionListDialog(self.getMissions());
                },
                function() { // on error
                    if (self.retrybounds != bounds.toBBoxString()) {
                        self.retrybounds = bounds.toBBoxString();
                        self.retrycount = 0;
                    }
                    self.retrycount++;
                    if (self.retrycount <= self.settings.retrymax) {
                        self.setdebuglayercolor(bounds,{color: '#ff690f', fill: true, fillColor: '#ff690f'}); // RETRY: orange fill
                        window.plugin.missions.openTopMissions(bounds);
                    } else {
                        self.setdebuglayercolor(bounds,{color: '#FF0000', fill: true, fillColor: '#FF0000', fillOpacity: 0.8}); // FAIL: red fill
                        alert('Failed to load missions in view');
                    }
                }
            );
        }
    };

    self.getdialogbuttons = function(currentdialog) {
        let buttons = {};

        if (self.settings.showtransferbutton) buttons[(self.settings.showtextbuttons?'Transfer':'🔀')] = function() { self.missionsTransfer(); };

        if (self.settings.showbannerbutton) {
            if (currentdialog == 'Banner view') {
                buttons[(self.settings.showtextbuttons?'Banner edit':'⚬⚬⚬🧰')] = function() { self.bannerEdit(); };
            } else {
                buttons[(self.settings.showtextbuttons?'Banner view':'⚬⚬⚬')] = function() { self.bannerDisplay(); };
            }
        }

        if (self.settings.showstoredbutton) {
            if (currentdialog == 'Stored') {
                buttons[(self.settings.showtextbuttons?'Clear stored':'☑⛔')] = function() { self.clearStored(function() { window.plugin.missions.showMissionListDialog([],"Missions stored"); }); };
            } else {
                buttons[(self.settings.showtextbuttons?'Stored':'☑')] = function() { window.plugin.missions.showMissionListDialog(self.getMissions(true),"Missions stored"); };
            }
        }

        if (currentdialog == 'In view') {
            buttons[(self.settings.showtextbuttons?'Rescan':'🔎↻')] = function() { window.plugin.missions.openTopMissions(); };
        } else {
            buttons[(self.settings.showtextbuttons?'In view':'🔎')] = function() { window.plugin.missions.showMissionListDialog(self.getMissions()); };
        }

        if (self.settings.showcreatenewbutton) buttons[(self.settings.showtextbuttons?'Create new mission':'➕')] = function() { open('//missions.ingress.com','_blank').focus(); };

        buttons[(self.settings.showtextbuttons?'Add-on opt':'☰')] = function() { self.settingsdialog(); };
        buttons[(self.settings.showtextbuttons?'Close':'✖')] = function() { $(this).dialog('close'); };

        return buttons;
    };

    self.showhelpdialog = function() {
        let container = document.createElement('div');

        container.innerHTML = `Basic settings:
        - Show traditonal text buttons (instead of icons) (default on)
        Dialog buttons at the bottom are traditonally text buttons.
        If there are a lot of buttons it can become unclear.
        Disable this option to show unicode icons for your buttons.
        Be aware that unicode icons differ between phones and desktops.
        - Show button "Create new mission" ➕ (default on)
        The missions plugin shows a button to open the mission creator website.
        You can disable this button if you never intend to create a new mission.
        - Auto refresh missions list when map is moved
        - Default mission search (top 25 missions)
        The standard missions plugin stops after 1 search and returns a maximum of 25 missions inside the visible area.
        - Keep splitting in even areas if 25 missions found
        This add on can keep searching smaller areas until less then 25 missions are found. All found missions from the smaller areas are combined in one list. It continues until the area has a minimum size.
        - At portal zoomlevel split area by mission startportals
        At portal zoomlevel it can be more efficient (less areas of maximum 25 missions) to split the area up by using small groups of mission startportals. It continues until a single portal has 25 or less missions. At higher zoom levels it will automatically use the even area split method.
        <hr>
        ${self.title} - Advanced settings:
        - Show button "Stored" missions ☑ (default off)
        Enable this option to access your stored missions (cache).
        If you click the mission title the details are automatically stored in your IITC storage.
        With this option enabled, there is also a download button displayed.
        You can also clear (all) stored missions.
        - Show download icons ⇓/☑ (disable for checkboxes) (default off)
        Enable this option to show icons to download missions.
        Disable this option to see checkboxes (on desktop you can use tab and spacebar to toggle checkboxes by keyboard).
        - Show button "Banner view" ⚬⚬⚬ (default off)
        Stored missions can form a banner (lines of 6 missions). Enable this option to access the Banner viewer.
        You can also edit the Banner to easily remove missions and add placeholder titles for missing missions.
        Placeholder titles are automatically removed when you download and store the mission later on.
        - Show button "Transfer" 🔀 (default off)
        Enable this option to access a missions transfer dialog.
        You can export/import lists of mission id's.
        This way you can store and share missions and banners between ${self.title} plugin users.
        - Always automatically try to find more then default 25
        During the first scan, the screen bounds are used.
        Enable this option to automatically continue if a search method for finding more then default 25 missions is selected.
        - Apply active mission color (default on)
        Enable this option to color the active (selected) mission red.
        - Alternative color for checked/completed missions (default off)
        Click on a mission image to set a checkmark for that mission. Enable this option to give the checked/completed missions on the map another color.
        - Show routes as a colorful path (default off)
        Enable this option to apply a rainbow color for visible missions with a clear background.
        - Keep drawn missions on top (default off)
        By default missions are drawn behind portals and links/fields. Enable this option to show missions on top of other layers.
        <hr>
        ${self.title} - Expert settings:
        - Enable layer ${self.missiondebuglayertitle} (default off)
        If you want to visualize the scanning areas, you can enable the debug layer.
        You can toggle layer visibility in the layer chooser sidepane.
        Purple bounds are scans with less then 25 missions.
        Red bounds are scans with 25 scans.
        - Clear layer ${self.missiondebuglayertitle} on every scan (default on)
        Enable this option to keep all scanned areas visible. Overlapping areas will be scanned again.
        - Do not clear mission results on rescan (default off)
        Keep this disabled to clear the list of missions in view when hitting rescan. With this option enabled, be aware that your "in view" list will also contain missions out of view.
        - Redraw opened missions after IITC reload (default off)
        By default opened missions are lost when IITC reloads. Enable this option to redraw all opened missions.
        - Maximum scan retry (default 2)
        When scanning for missions, there could be an error. You can change the retry count (0 = fail after first attempt)
        `.replace(/([^>])\n/g,'$1<br>\n');

        let changelogbutton = container.appendChild(document.createElement('button'));
        changelogbutton.style.display = 'block';
        changelogbutton.textContent = 'Changelog';
        changelogbutton.addEventListener('click', function(e) {
            e.preventDefault();
            alert(self.changelog);
        }, false);

        let author = container.appendChild(document.createElement('div'));
        author.className = self.id + 'author';
        author.textContent = self.title + ' version ' + self.version + ' by ' + self.author;

        let buttons = {};
        buttons[(self.settings.showtextbuttons?'Close':'✖')] = function() { $(this).dialog('close'); };
        window.dialog({
            title: self.title + ' - Settings Help',
            html: container,
            id: "missionsList-help",
            minWidth: 360,
            height: 'auto',
            position: { my: "right top", at: "right top", of: document.body }
        }).dialog('option', 'buttons', buttons);
    };

    self.settingsdialog = function() {
        let container = document.createElement('div');
        container.className = self.id + 'settingsmenu';

        let hiddenautofocusinput = container.appendChild(document.createElement('input')); // added to prevent auto focus on first element
        hiddenautofocusinput.type = 'hidden';
        hiddenautofocusinput.autofocus = 'autofocus';

        container.appendChild(document.createTextNode('Basic settings:'));
        container.appendChild(document.createElement('br'));

        let showtextbuttonscheckboxarea = container.appendChild(document.createElement('label'));
        let showtextbuttonscheckbox = showtextbuttonscheckboxarea.appendChild(document.createElement('input'));
        showtextbuttonscheckbox.type = 'checkbox';
        showtextbuttonscheckbox.checked = self.settings.showtextbuttons;
        showtextbuttonscheckboxarea.appendChild(document.createTextNode('Show traditonal text buttons (instead of icons)'));
        showtextbuttonscheckbox.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.showtextbuttons = this.checked;
            if (window.plugin.missions.mobilePane) {
                let buttons = window.plugin.missions.mobilePane.getElementsByTagName('button');
                buttons[0].textContent = (self.settings.showtextbuttons ? 'Stored' : '☑');
                buttons[1].textContent = (self.settings.showtextbuttons ? 'Missions in view' : '🔎');
                buttons[2].textContent = (self.settings.showtextbuttons ? 'Add-on opt' : '☰');
            }
            self.storesettings();
            self.settingsdialog();
        },false);

        let newmissioncheckboxarea = container.appendChild(document.createElement('label'));
        let newmissioncheckbox = newmissioncheckboxarea.appendChild(document.createElement('input'));
        newmissioncheckbox.type = 'checkbox';
        newmissioncheckbox.checked = self.settings.showcreatenewbutton;
        newmissioncheckboxarea.appendChild(document.createTextNode('Show button "Create new mission" ➕'));
        newmissioncheckbox.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.showcreatenewbutton = this.checked;
            self.storesettings();
            self.settingsdialog();
        },false);

        let autorefreshcheckboxarea = container.appendChild(document.createElement('label'));
        let autorefreshcheckbox = autorefreshcheckboxarea.appendChild(document.createElement('input'));
        autorefreshcheckbox.type = 'checkbox';
        autorefreshcheckbox.checked = self.settings.autorefreshonmoveend;
        autorefreshcheckboxarea.appendChild(document.createTextNode('Auto refresh missions list when map is moved'));
        autorefreshcheckbox.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.autorefreshonmoveend = this.checked;
            window.plugin.missions.autoRefreshOnMoveEnd = self.settings.autorefreshonmoveend;
            self.storesettings();
        },false);

        let searchmethod0radioarea = container.appendChild(document.createElement('label'));
        let searchmethod0radio = searchmethod0radioarea.appendChild(document.createElement('input'));
        searchmethod0radio.type = 'radio';
        searchmethod0radio.name = 'searchmethod';
        searchmethod0radio.checked = self.settings.searchmethoddefault;
        searchmethod0radioarea.appendChild(document.createTextNode('Default mission search (top 25 missions)'));
        searchmethod0radio.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.searchmethoddefault = this.checked;
            self.storesettings();
        },false);

        let searchmethod1radioarea = container.appendChild(document.createElement('label'));
        let searchmethod1radio = searchmethod1radioarea.appendChild(document.createElement('input'));
        searchmethod1radio.type = 'radio';
        searchmethod1radio.name = 'searchmethod';
        searchmethod1radio.checked = !self.settings.searchmethoddefault && !self.settings.searchmethodstartportals;
        searchmethod1radioarea.appendChild(document.createTextNode('Keep splitting in even areas if 25 missions found'));
        searchmethod1radio.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.searchmethodstartportals = !this.checked;
            if (this.checked) self.settings.searchmethoddefault = false;
            self.storesettings();
        },false);

        let searchmethod2radioarea = container.appendChild(document.createElement('label'));
        let searchmethod2radio = searchmethod2radioarea.appendChild(document.createElement('input'));
        searchmethod2radio.type = 'radio';
        searchmethod2radio.name = 'searchmethod';
        searchmethod2radio.checked = !self.settings.searchmethoddefault && self.settings.searchmethodstartportals;
        searchmethod2radioarea.appendChild(document.createTextNode('At portal zoomlevel split area by mission startportals'));
        searchmethod2radio.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.searchmethodstartportals = this.checked;
            if (this.checked) self.settings.searchmethoddefault = false;
            self.storesettings();
        },false);

        container.appendChild(document.createElement('hr'));
        container.appendChild(document.createTextNode(self.title + ' - Advanced settings:'));

        let showstoredcheckboxarea = container.appendChild(document.createElement('label'));
        let showstoredcheckbox = showstoredcheckboxarea.appendChild(document.createElement('input'));
        showstoredcheckbox.type = 'checkbox';
        showstoredcheckbox.checked = self.settings.showstoredbutton;
        showstoredcheckboxarea.appendChild(document.createTextNode('Show button "Stored" missions ☑'));
        showstoredcheckbox.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.showstoredbutton = this.checked;
            if (window.plugin.missions.mobilePane) window.plugin.missions.mobilePane.getElementsByTagName('button')[0].style.display = (self.settings.showstoredbutton ? 'unset' : 'none');
            self.storesettings();
            self.settingsdialog();
        },false);

        let showstorediconarea = container.appendChild(document.createElement('label'));
        let showstoredicon = showstorediconarea.appendChild(document.createElement('input'));
        showstoredicon.type = 'checkbox';
        showstoredicon.checked = self.settings.showstoredicon;
        showstorediconarea.appendChild(document.createTextNode('Show download icons ⇓/☑ (disable for checkboxes)'));
        showstoredicon.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.showstoredicon = this.checked;
            self.storesettings();
        },false);

        let showbannercheckboxarea = container.appendChild(document.createElement('label'));
        let showbannercheckbox = showbannercheckboxarea.appendChild(document.createElement('input'));
        showbannercheckbox.type = 'checkbox';
        showbannercheckbox.checked = self.settings.showbannerbutton;
        showbannercheckboxarea.appendChild(document.createTextNode('Show button "Banner view" ⚬⚬⚬'));
        showbannercheckbox.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.showbannerbutton = this.checked;
            self.storesettings();
            self.settingsdialog();
        },false);

        let showtransfercheckboxarea = container.appendChild(document.createElement('label'));
        let showtransfercheckbox = showtransfercheckboxarea.appendChild(document.createElement('input'));
        showtransfercheckbox.type = 'checkbox';
        showtransfercheckbox.checked = self.settings.showtransferbutton;
        showtransfercheckboxarea.appendChild(document.createTextNode('Show button "Transfer" 🔀'));
        showtransfercheckbox.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.showtransferbutton = this.checked;
            self.storesettings();
            self.settingsdialog();
        },false);

        let alwayscheckboxarea = container.appendChild(document.createElement('label'));
        let alwayscheckbox = alwayscheckboxarea.appendChild(document.createElement('input'));
        alwayscheckbox.type = 'checkbox';
        alwayscheckbox.checked = self.settings.alwaysfindmore;
        alwayscheckboxarea.appendChild(document.createTextNode('Always try to automatically find more then default 25'));
        alwayscheckbox.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.alwaysfindmore = this.checked;
            self.storesettings();
        },false);

        let activemissioncolorcheckboxarea = container.appendChild(document.createElement('label'));
        let activemissioncolorcheckbox = activemissioncolorcheckboxarea.appendChild(document.createElement('input'));
        activemissioncolorcheckbox.type = 'checkbox';
        activemissioncolorcheckbox.checked = self.settings.activemissioncolor;
        activemissioncolorcheckboxarea.appendChild(document.createTextNode('Apply active mission color'));
        activemissioncolorcheckbox.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.activemissioncolor = this.checked;
            self.storesettings();

            window.plugin.missions.highlightMissionLayers();
        },false);

        let colorcheckedmissionscheckboxarea = container.appendChild(document.createElement('label'));
        let colorcheckedmissionscheckbox = colorcheckedmissionscheckboxarea.appendChild(document.createElement('input'));
        colorcheckedmissionscheckbox.type = 'checkbox';
        colorcheckedmissionscheckbox.checked = self.settings.colorcheckedmissions;
        colorcheckedmissionscheckboxarea.appendChild(document.createTextNode('Alternative color for checked/completed missions'));
        colorcheckedmissionscheckbox.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.colorcheckedmissions = this.checked;
            self.storesettings();

            window.plugin.missions.highlightMissionLayers();
        },false);

        let colorfulpathcheckboxarea = container.appendChild(document.createElement('label'));
        let colorfulpathcheckbox = colorfulpathcheckboxarea.appendChild(document.createElement('input'));
        colorfulpathcheckbox.type = 'checkbox';
        colorfulpathcheckbox.checked = self.settings.colorfulpath;
        colorfulpathcheckboxarea.appendChild(document.createTextNode('Show routes as a colorful path'));
        colorfulpathcheckbox.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.colorfulpath = this.checked;
            self.storesettings();

            // redraw opened missions by guid
            for (let guid in window.plugin.missions.drawnMarkers) {
                window.plugin.missions.removeMissionLayers(window.plugin.missions.drawnMarkers[guid]);
                window.plugin.missions.drawnMarkers[guid] = window.plugin.missions.drawMission(window.plugin.missions.cacheByMissionGuid[guid].data);
            }
            // window.plugin.missions.highlightMissionLayers();
        },false);

        let keepontopcheckboxarea = container.appendChild(document.createElement('label'));
        let keepontopcheckbox = keepontopcheckboxarea.appendChild(document.createElement('input'));
        keepontopcheckbox.type = 'checkbox';
        keepontopcheckbox.checked = self.settings.keepontop;
        keepontopcheckboxarea.appendChild(document.createTextNode('Keep drawn missions on top'));
        keepontopcheckbox.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.keepontop = this.checked;
            self.storesettings();

            if (self.settings.keepontop && window.plugin.missions.missionLayer._map) window.plugin.missions.missionLayer.bringToFront();
        },false);

        container.appendChild(document.createElement('hr'));
        container.appendChild(document.createTextNode(self.title + ' - Expert settings:'));

        let debugcheckboxarea = container.appendChild(document.createElement('label'));
        let debugcheckbox = debugcheckboxarea.appendChild(document.createElement('input'));
        debugcheckbox.type = 'checkbox';
        debugcheckbox.checked = self.settings.enabledebuglayer;
        debugcheckboxarea.appendChild(document.createTextNode('Enable layer ' + self.missiondebuglayertitle));

        let debugclearcheckboxarea = container.appendChild(document.createElement('label'));
        let debugclearcheckbox = debugclearcheckboxarea.appendChild(document.createElement('input'));
        debugclearcheckbox.type = 'checkbox';
        debugclearcheckbox.checked = self.settings.cleardebuglayeronscan;
        debugclearcheckbox.disabled = (!self.settings.enabledebuglayer);
        debugclearcheckboxarea.appendChild(document.createTextNode('Clear layer ' + self.missiondebuglayertitle + ' on every scan'));
        debugclearcheckbox.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.cleardebuglayeronscan = this.checked;
            self.storesettings();
        },false);
        let debugclearbutton = container.appendChild(document.createElement('button'));
        debugclearbutton.textContent = 'Clear now';
        debugclearbutton.style.marginLeft = '5px';
        debugclearbutton.addEventListener('click', function(e) {
            e.preventDefault();
            self.cleardebuglayer();
        },false);

        debugcheckbox.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.enabledebuglayer = this.checked;
            self.storesettings();
            debugclearcheckbox.disabled = (!self.settings.enabledebuglayer);
            debugclearbutton.disabled = (!self.settings.enabledebuglayer);
            let layerexists = (window.layerChooser._layers.map(function(l) { return (l.overlay?l.layer:undefined); }).indexOf(self.missiondebuglayer) >= 0);
            if (self.settings.enabledebuglayer) {
                if (!layerexists) window.addLayerGroup(self.missiondebuglayertitle, self.missiondebuglayer, true);
            } else {
                if (layerexists) window.removeLayerGroup(self.missiondebuglayer);
            }
        },false);

        let keepresultsonscancheckboxarea = container.appendChild(document.createElement('label'));
        let keepresultsonscancheckbox = keepresultsonscancheckboxarea.appendChild(document.createElement('input'));
        keepresultsonscancheckbox.type = 'checkbox';
        keepresultsonscancheckbox.checked = self.settings.keepresultsonscan;
        keepresultsonscancheckboxarea.appendChild(document.createTextNode('Do not clear mission results on rescan'));
        keepresultsonscancheckbox.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.keepresultsonscan = this.checked;
            self.storesettings();
        },false);

        let redrawmissionscheckboxarea = container.appendChild(document.createElement('label'));
        let redrawmissionscheckbox = redrawmissionscheckboxarea.appendChild(document.createElement('input'));
        redrawmissionscheckbox.type = 'checkbox';
        redrawmissionscheckbox.checked = self.settings.redrawmissions;
        redrawmissionscheckboxarea.appendChild(document.createTextNode('Redraw opened missions after IITC reload'));
        redrawmissionscheckbox.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.redrawmissions = this.checked;
            self.storesettings();

            self.drawnmissions = [];
            if (self.settings.redrawmissions) {
                window.plugin.missions.missionLayer.eachLayer(function(layer) {
                    let guid = layer.options.guid;
                    if (self.drawnmissions.indexOf(guid) < 0) {
                        self.drawnmissions.push(guid);
                    }
                }, this);
            }
            self.storedrawnmissions();
        },false);

        let retryselectionarea = container.appendChild(document.createElement('label'));
        retryselectionarea.appendChild(document.createTextNode('Maximum scan retry: '));
        let retryselection = retryselectionarea.appendChild(document.createElement('select'));
        let options = [0,1,2,3,4,5,6,7,8,9,10];
        for (let cnt = 0; cnt < options.length; cnt++) {
            let retryoption = retryselection.appendChild(document.createElement('option'));
            retryoption.value = options[cnt];
            retryoption.textContent = options[cnt] + (options[cnt] == 2 ? ' (default)':'');
            retryoption.selected = (options[cnt] == self.settings.retrymax);
        }
        retryselection.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.retrymax = this.value;
            self.storesettings();
        },false);

        let author = container.appendChild(document.createElement('div'));
        author.className = self.id + 'author';
        author.textContent = self.title + ' version ' + self.version + ' by ' + self.author;

        let buttons = self.getdialogbuttons();
        window.dialog({
            title: self.title + ' - Settings',
            html: container,
            id: "missionsList",
            minWidth: 360,
            height: 'auto'
        }).dialog('option', 'buttons', buttons);

        // manipulate the dialog menu bar
        let helpbuttonarea = document.createElement('button');
        helpbuttonarea.style.right = '50px';
        helpbuttonarea.className = 'ui-button ui-corner-all ui-widget ui-button-icon-only ui-dialog-titlebar-button';
        helpbuttonarea.style.cursor = 'help';
        let helpbutton1 = helpbuttonarea.appendChild(document.createElement('span'));
        helpbutton1.className = "ui-button-icon ui-icon ui-icon-help";
        helpbutton1.style.color = 'rgb(32, 168, 177)';
        helpbutton1.textContent = '?';
        let helpbutton2 = helpbuttonarea.appendChild(document.createElement('span'));
        helpbutton2.className = "ui-button-icon-space";
        helpbuttonarea.addEventListener('click', function(e) {
            e.preventDefault();
            self.showhelpdialog();
        },false);

        document.getElementById('dialog-' + "missionsList").parentElement.prepend(helpbuttonarea);
    };

    self.clearStored = function(callback) {
        let missionscount = Object.keys(window.plugin.missions.cacheByMissionGuid).length;
        if (missionscount > 0) {
            if (confirm('Are you sure to clear all ' + missionscount + ' stored missions?')) {
                window.plugin.missions.cacheByMissionGuid = {};
                window.plugin.missions.storeCache();
                if (typeof callback == 'function') {
                    callback();
                }
            }
        }
    };

    self.replaceMissionsWithCachedDetails = function(missions) {
        for (let cnt = 0; cnt < missions.length; cnt++) {
            if (window.plugin.missions.cacheByMissionGuid[missions[cnt].guid]) {
                missions[cnt] = window.plugin.missions.cacheByMissionGuid[missions[cnt].guid].data;
            }
        }
        return missions;
    };

    self.getMissions = function(getstored) {
        let missions = [];
        if (getstored) {
            missions = Object.keys(window.plugin.missions.cacheByMissionGuid).map(function(guid) { return window.plugin.missions.cacheByMissionGuid[guid].data; });
        } else {
            missions = self.replaceMissionsWithCachedDetails(self.missions);
        }

        return self.sortmissions(missions);
    };

    self.setupShowMissionListDialog = function() {
        // add an extra function argument, to show buttons for Stored missions dialog
        // inject a dialog id, to auto replace the dialog with a new dialog with the same id
        // add a title for missions in view and missions stored
        // replace the renderMissionList call by a container object, to use the container when closing the dialog to stop download of mission images
        // add extra menu buttons under the dialog

        //let showMissionListDialog_string = window.plugin.missions.showMissionListDialog.toString();
        //if (showMissionListDialog_string.match('dialog-missionsList')) {

        // function showMissionListDialog from Missions 0.3.0 has too many changes
        // replace the complete function back to Missions 0.2.2 including add-on modifications
        window.plugin.missions.showMissionListDialog = function(missions, caption) {
            let container = window.plugin.missions.renderMissionList(missions);
            let thisdialog = dialog({
                html: container,
                id: "missionsList",
                title: (caption ? caption + ": " : "Missions in view: ") + missions.length,
                height: 'auto',
                width: '400px',
                closeCallback: function() {
                    // cancel loading images when dialog is closed
                    for (let cnt = 0, total = container.getElementsByTagName("img").length; cnt < total; cnt++) {
                        container.getElementsByTagName("img")[cnt].src = "";
                    }
                },
                collapseCallback: window.plugin.missions.collapseFix,
                expandCallback: window.plugin.missions.collapseFix,
            });
            let buttons = window.plugin.missionsAddon.getdialogbuttons((caption == 'Missions stored'?'Stored':'In view'));
            thisdialog.dialog('option','buttons',buttons);
        };

        /*
        } else {
            showMissionListDialog_string = showMissionListDialog_string.replace('function(missions)','function(missions, caption)'); // 0.2.2 compatible

            showMissionListDialog_string = showMissionListDialog_string.replaceAll('this.renderMissionList(missions)','container'); // 0.2.2 and 0.3.0 compatible
            showMissionListDialog_string = showMissionListDialog_string.replace('{','{\nlet container = this.renderMissionList(missions);'); // 0.2.2 and 0.3.0 compatible

            if (!showMissionListDialog_string.match(/id:/)) { // 0.2.2
                showMissionListDialog_string = showMissionListDialog_string.replace(
                    'height:',
                    'id: "missionsList",\n' +
                    'title: (caption ? caption + ": " : "Missions in view: ") + missions.length,\n' +
                    'height:');
            } else { // 0.3.0
                showMissionListDialog_string = showMissionListDialog_string.replaceAll('title: caption','title: (caption ? caption + ": " : "Missions in view: ") + missions.length');
            }
            showMissionListDialog_string = showMissionListDialog_string.replace(
                'collapseCallback:',
                'closeCallback: function() {\n' +
                '    // cancel loading images on dialog\n' +
                '    for (let cnt = 0, total = container.getElementsByTagName("img").length; cnt < total; cnt++) {\n' +
                '        container.getElementsByTagName("img")[cnt].src = "";\n' +
                '    }\n' +
                '},\n' +
                'collapseCallback:');

            if (!showMissionListDialog_string.match(/buttons:/)) { // 0.2.2
                showMissionListDialog_string = showMissionListDialog_string.replace('dialog({','let thisdialog = dialog({');
                showMissionListDialog_string = showMissionListDialog_string.replace(
                    '});',
                    "});\n" +
                    "        let buttons = " + self.namespace + "getdialogbuttons((caption == 'Missions stored'?'Stored':'In view'));\n" +
                    "        thisdialog.dialog('option','buttons',buttons);");
            } else { // 0.3.0
                showMissionListDialog_string = showMissionListDialog_string.replace(
                    /(\t\$\(openDialog\))/,
                    "\tlet buttons = " + self.namespace + "getdialogbuttons((caption == 'Missions stored'?'Stored':'In view'));\n" +
                    "\t\t$(openDialog).dialog('option','buttons',buttons);\n\t$1");
            }

            showMissionListDialog_string = showMissionListDialog_string.replace("this.resizeMissionList()","window.plugin.missions.resizeMissionList()");

            try {
                eval('window.plugin.missions.showMissionListDialog = ' + showMissionListDialog_string + ';');
            } catch(e) {
                console.warn('IITC plugin eval failure: ' + self.namespace + 'setupShowMissionListDialog showMissionListDialog');
            }
        }
        */
    };

    self.setupRenderMissionList = function() {
        let renderMissionList_string = window.plugin.missions.renderMissionList.toString();
        renderMissionList_string = renderMissionList_string.replace('this.renderMissionSummary(mission)',self.namespace + 'modifyMissionListItem(window.plugin.missions.renderMissionSummary(mission),mission.guid)');
        eval('window.plugin.missions.renderMissionList = ' + renderMissionList_string + ';');
    };

    self.setupMobilePane = function() {
        if (!window.plugin.missions.mobilePane) return;

        let buttons = window.plugin.missions.mobilePane.getElementsByTagName('button');
        if (!buttons || buttons.length == 0) return;

        let storebutton = document.createElement('button');
        storebutton.style.display = (self.settings.showstoredbutton ? 'unset' : 'none');
        storebutton.style.padding = '0.3em 0.5em';
        storebutton.textContent = (self.settings.showtextbuttons ? 'Stored' : '☑');
        storebutton.addEventListener('click', function(e) {
            e.preventDefault();
            window.plugin.missions.showMissionListDialog(self.getMissions(true),"Missions stored");
        }, false);
        buttons[0].replaceWith(storebutton);

        let inviewbutton = document.createElement('button');
        inviewbutton.style.padding = '0.3em 0.5em';
        inviewbutton.textContent = (self.settings.showtextbuttons ? 'Missions in view' : '🔎');
        inviewbutton.addEventListener('click', function(e) {
            e.preventDefault();
            if (self.missions.length > 0) {
                window.plugin.missions.showMissionListDialog(self.getMissions()); // new action
            } else {
                window.plugin.missions.openTopMissions(); // default action
            }
        }, false);
        buttons[buttons.length-1].parentNode.insertBefore(inviewbutton,buttons[buttons.length-1].nextSibling); // insertAfter

        let settingsbutton = document.createElement('button');
        settingsbutton.style.position = 'absolute';
        settingsbutton.style.right = '0px';
        settingsbutton.style.padding = '0.3em 0.5em';
        settingsbutton.textContent = (self.settings.showtextbuttons ? 'Add-on opt' : '☰');
        settingsbutton.addEventListener('click', function(e) {
            e.preventDefault();
            self.settingsdialog();
        }, false);
        buttons[buttons.length-1].parentNode.insertBefore(settingsbutton,buttons[buttons.length-1].nextSibling); // insertAfter
    };

    self.setupLoadMission = function() {
        // fix a problem if the guid returns null data
        // add checks for valid callback functions
        let loadMission_string = window.plugin.missions.loadMission.toString();
        loadMission_string = loadMission_string.replace('decodeMission',self.namespace + 'decodeMission');
        loadMission_string = loadMission_string.replace(/(\s)(callback\()/sg,"$1if (typeof callback == 'function') $2"); // add a check for valid function
        loadMission_string = loadMission_string.replace(/function\(\)/sg,"function(requestObject,error,errorThrown)"); // add a fix for missing error variable
        loadMission_string = loadMission_string.replace(/if \(errorcallback\)/sg,"if (typeof errorcallback == 'function')"); // add a check for valid function
        try {
            eval('window.plugin.missions.loadMission = ' + loadMission_string + ';');
        } catch(e) {
            console.warn('IITC plugin eval failure: ' + self.namespace + 'setupLoadMission');
        }
    };

    self.hsl2rgb = function(h,s,l) {
        // input: h in [0,360] and s,v in [0,1] - output: r,g,b in [0,1]
        // source: https://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion
        let a = s*Math.min(l,1-l);
        let f = (n,k=(n+h/30)%12) => l - a*Math.max(Math.min(k-3,9-k,1),-1);
        return [f(0)*255,f(8)*255,f(4)*255];
    };
    self.getMissionColor = function(guid,active,missions) {
        if (typeof active == 'undefined') { // check if guid is active
            active = (guid && guid == self.missionactiveguid);
        } else if (active === true) { // set active guid
            self.missionactiveguid = guid;
        }

        if (!guid || !window.plugin.missions.cacheByMissionGuid[guid]) return (active && self.settings.activemissioncolor ? window.plugin.missions.MISSION_COLOR_ACTIVE : window.plugin.missions.MISSION_COLOR);
        if (active && self.settings.activemissioncolor) return window.plugin.missions.MISSION_COLOR_ACTIVE;

        if (self.settings.colorcheckedmissions && window.plugin.missions.checkedMissions[guid]) {
            return 'rgb(255, 187, 0)';
        }

        // create a mission color
        if (self.settings.colorfulpath) {
            if (!missions) missions = self.getMissions(true);
            let missionscount = missions.length;
            let missionnumber = missions.map(function(mission) { return mission.guid; }).indexOf(guid);
            return 'rgb(' + self.hsl2rgb(missionnumber * Math.round(360/missionscount), 1, 0.5).join(',') + ')';
        }

        return window.plugin.missions.MISSION_COLOR;
    };
    self.setupDrawMission = function() {
        var drawMission_string = window.plugin.missions.drawMission.toString();

        // replace internal plugin variable by fixed value
        drawMission_string = drawMission_string.replace('MissionOrder.NonSequential','2'); // version 0.3.0

        // add mission guid to every layer options:
        drawMission_string = drawMission_string.replace(/(\s+)(interactive)/gs,'$1guid: mission.guid,$1$2');

        // create background code, use a copy:
        let drawMissionBackground_string = drawMission_string;
        // strip unwanted code:
        drawMissionBackground_string = drawMissionBackground_string.replace(/^.*markers = \[\];/s,"if (" + self.namespace + "settings.colorfulpath) {");
        drawMissionBackground_string = drawMissionBackground_string.replace(/return markers.*$/s,"}");
        // circles background:
        drawMissionBackground_string = drawMissionBackground_string.replace(/\s+var radius.*?;/s,"");
        drawMissionBackground_string = drawMissionBackground_string.replace(/radius: radius/s,"radius: (latlngs.length == 1 ? 9.0 : 6.0)");
        drawMissionBackground_string = drawMissionBackground_string.replace(/weight: 3/s,"weight: 1");
        drawMissionBackground_string = drawMissionBackground_string.replace(/color: this\.MISSION_COLOR/gs,"color: '#000000'");
        drawMissionBackground_string = drawMissionBackground_string.replace(/(\s+)fill: false/s,"$1fillColor: '#000000',$1fillOpacity: 1.0");
        drawMissionBackground_string = drawMissionBackground_string.replace(/(\s+)(interactive)/gs,'$1background: true,$1$2');
        // polyline background:
        drawMissionBackground_string = drawMissionBackground_string.replace(/weight: 2/s,"weight: 8");

        // fill waypoints with colors:
        drawMission_string = drawMission_string.replace(/(\s+)(var latlngs)/s,'$1let missioncolor = ' + self.namespace + 'getMissionColor(mission.guid);$1$2');
        drawMission_string = drawMission_string.replace('radius: radius',"radius: (" + self.namespace + "settings.colorfulpath?(latlngs.length == 1 ? 7.0 : 4.0):radius)");
        drawMission_string = drawMission_string.replace(/(\s+)fill: false/,'$1fill: (' + self.namespace + 'settings.colorfulpath ? true : (latlngs.length == 1)),$1fillColor: missioncolor,$1fillOpacity: (' + self.namespace + 'settings.colorfulpath ? 1.0 : 0.5)');
        drawMission_string = drawMission_string.replace(/weight: 3/s,"weight: (" + self.namespace + "settings.colorfulpath ? 1 : 3)");
        // polyline colors:
        drawMission_string = drawMission_string.replace(/weight: 2/s,"weight: (" + self.namespace + "settings.colorfulpath ? 3 : 2)");
        drawMission_string = drawMission_string.replace(/color: this\.MISSION_COLOR/gs,'color: missioncolor');
        drawMission_string = drawMission_string.replace(/(\s+)(interactive)/gs,'$1background: false,$1$2');

        drawMission_string = drawMission_string.replace(/(\s+)(return markers)/s,'$1window.plugin.missions.highlightMissionLayers(markers);$1$2');

        // add background code:
        drawMission_string = drawMission_string.replace(/(\s+)(var latlngs)/,'$1' + drawMissionBackground_string + '$1$2');

        try {
            eval('window.plugin.missions.drawMission = ' + drawMission_string + ';');
        } catch(e) {
            console.warn('IITC plugin eval failure: ' + self.namespace + 'setupDrawMission');
        }
    };
    self.setupHighlightMissionLayers = function() {
        let highlightMissionLayers_string = window.plugin.missions.highlightMissionLayers.toString();
        highlightMissionLayers_string = highlightMissionLayers_string.replace(/(\s+)(var bringToFront)/s,'$1let missions = ' + self.namespace + 'getMissions(true);$1$2');
        highlightMissionLayers_string = highlightMissionLayers_string.replace(/(\s+)(layer\.setStyle)/s,'$1if (!markers && layer.options.guid == ' + self.namespace + 'missionactiveguid) active = true;$1$2');
        highlightMissionLayers_string = highlightMissionLayers_string.replace(/(\s+)(layer\.setStyle)/s,'$1let missioncolor = ' + self.namespace + 'getMissionColor(layer.options.guid,active,missions);$1$2');
        highlightMissionLayers_string = highlightMissionLayers_string.replace('markers.','typeof markers == "undefined" ? undefined : markers.');
        highlightMissionLayers_string = highlightMissionLayers_string.replace(/(color:).*?,/,'$1missioncolor,');
        highlightMissionLayers_string = highlightMissionLayers_string.replace(/(\s+)(color)(:.*?,)(\s)/s,'$1$2$3$1fillColor$3$4');
        highlightMissionLayers_string = highlightMissionLayers_string.replace(/(layer\.setStyle)/,'if (!layer.options.background) $1');

        // bring active layer to front as the very last action of the function
        highlightMissionLayers_string = highlightMissionLayers_string.replace(/(\s+)(var bringToFront)/s,'$1let activelayers = [];$1$2');
        highlightMissionLayers_string = highlightMissionLayers_string.replace(/layer\.bringToFront\(\);/s,'activelayers.push(layer);');
        highlightMissionLayers_string = highlightMissionLayers_string.replace(/(\s+)(\})$/s,'$1    for (let cnt = 0; cnt < activelayers.length; cnt++) {$1        activelayers[cnt].bringToFront();$1    }$1$2');

        try {
            eval('window.plugin.missions.highlightMissionLayers = ' + highlightMissionLayers_string + ';');
        } catch(e) {
            console.warn('IITC plugin eval failure: ' + self.namespace + 'setupHighlightMissionLayers');
        }
    };

    self.setupMissionLayer = function() {
        // replace
        window.removeLayerGroup(window.plugin.missions.missionLayer);
		window.plugin.missions.missionLayer = new window.L.FeatureGroup(); // a FeatureGroup has the option bringToFront/bringToBack for the whole group of layers
		window.addLayerGroup('Mission portals and routes', window.plugin.missions.missionLayer, true);
    };

    self.setupShowMissionDialog = function() {
        let showMissionDialog_string = window.plugin.missions.showMissionDialog.toString();

        // store mission guid when openening the mission (when setting redrawmissions is enabled)
        showMissionDialog_string = showMissionDialog_string.replace(/(\s+)(var me)/s,'$1if (' + self.namespace + 'settings.redrawmissions) {$1if (' + self.namespace + 'drawnmissions.indexOf(mission.guid) < 0) {$1' + self.namespace + 'drawnmissions.push(mission.guid); ' + self.namespace + 'storedrawnmissions();$1}$1}$1$2');

        // removed stored mission guid when closing the mission (when setting redrawmissions is enabled)
        showMissionDialog_string = showMissionDialog_string.replace(/(\s+)(this|me)(\.removeMissionLayers)/gs,'$1if (' + self.namespace + 'settings.redrawmissions) {$1let cnt = ' + self.namespace + 'drawnmissions.indexOf(mission.guid);$1if (cnt >= 0) {$1' + self.namespace + 'drawnmissions.splice(cnt,1);$1' + self.namespace + 'storedrawnmissions();$1}$1}$1$2$3');

        // remember last opened dialog, to position the next dialog just under the previous dialog
        showMissionDialog_string = showMissionDialog_string.replace(/\{(\s+)(window\.dialog|dialog)/s,'{$1this.lastdialog = $2');
        // place the dialog at top left, or just below the last dialog
        showMissionDialog_string = showMissionDialog_string.replace(/(\s+)(height)/s,'$1position: { my: "left top", at: "left top", of: this.lastdialog || document.body },$1$2');

        // store drawn markers, to enable replace when choosing a different display (setting colorfulpath)
        // first close previous dialog if same mission is redrawn
        showMissionDialog_string = showMissionDialog_string.replace('var markers','$(window.DIALOGS["dialog-plugin-mission-details-" + mission.guid.replace(/\\./g, "_")]).dialog("close");\n\tif (!("drawnMarkers" in me)) me.drawnMarkers = {};\n\tme.drawnMarkers[mission.guid]');
        showMissionDialog_string = showMissionDialog_string.replaceAll('markers','me.drawnMarkers[mission.guid]');
        showMissionDialog_string = showMissionDialog_string.replaceAll(/(removeMissionLayers.*;)/g,'$1\n\tdelete me.drawnMarkers[mission.guid];');

        try {
            eval('window.plugin.missions.showMissionDialog = ' + showMissionDialog_string + ';');
        } catch(e) {
            console.warn('IITC plugin eval failure: ' + self.namespace + 'setupShowMissionDialog');
        }
    };


    self.toggleStoredListItem = function(guid,selected,callback) {
        if (!selected) {
            self.deleteCachedListItem(guid);
            if (typeof callback == 'function') callback();
        } else {
            window.plugin.missions.loadMission(guid,function(mission) { if (typeof callback == 'function') callback(); },function(error) { if (typeof callback == 'function') callback(); });
        }
    };

    self.deleteCachedListItem = function(guid) {
        delete window.plugin.missions.cacheByMissionGuid[guid];
        window.plugin.missions.storeCache();

        // remove visualized details from cache:
        $('[data-mission_mid="' + guid + '"] span.nickname').remove();
        $('[data-mission_mid="' + guid + '"] span.plugin-mission-info.length').remove();
        $('[data-mission_mid="' + guid + '"] span.plugin-mission-info.distance').remove();
        $('[data-mission_mid="' + guid + '"] span.plugin-mission-info.players').remove();
        $('[data-mission_mid="' + guid + '"] span.plugin-mission-info.waypoints').remove();
        $('[data-mission_mid="' + guid + '"] span.nickname').remove();

        $('[data-mission_mid="' + guid + '"] span.plugin-mission-load-button').checked = false;
    };

    self.modifyMissionListItem = function(renderedmissionobject,guid) {
        if (!self.settings.showstoredbutton) return renderedmissionobject;

        let storedmission = (guid in window.plugin.missions.cacheByMissionGuid);

        let toggleStored = document.createElement('label');
        toggleStored.style.position = 'absolute';
        toggleStored.style.top = '1.25em';
        toggleStored.style.right = '3em';
        toggleStored.style.padding = '0.25em';
        toggleStored.style.textAlign = 'center';
        toggleStored.className = 'plugin-mission-load-button';

        let toggleStoredCheckbox = toggleStored.appendChild(document.createElement('input'));
        toggleStoredCheckbox.type = 'checkbox';
        toggleStoredCheckbox.className = self.id + '-checkboxstored';
        toggleStoredCheckbox.checked = storedmission;
        toggleStoredCheckbox.title = (storedmission ? 'Click to clear stored mission' : 'Click to locally store mission details');
        if (self.settings.showstoredicon) {
            toggleStoredCheckbox.style.display = 'none';

            let toggleStoredIcon = toggleStored.appendChild(document.createElement('span'));
            toggleStoredIcon.textContent = (storedmission ? '☑' : '⇓');
            toggleStoredIcon.style.cursor = 'pointer';
            toggleStoredIcon.style.display = 'inline-block';
            toggleStoredIcon.style.width = '1em';
            toggleStoredIcon.className = self.id + '-iconstored';
            toggleStoredIcon.title = toggleStoredCheckbox.title;

            toggleStoredCheckbox.addEventListener('change', function(e) {
                e.preventDefault();
                toggleStoredIcon.textContent = '⏳';
                self.toggleStoredListItem(guid,toggleStoredCheckbox.checked,function() { let storedmission = (guid in window.plugin.missions.cacheByMissionGuid); toggleStoredIcon.textContent = (storedmission ? '☑' : '⇓');});
            }, false);
        } else {
            toggleStoredCheckbox.addEventListener('change', function(e) {
                e.preventDefault();
                toggleStoredCheckbox.disabled = true;
                self.toggleStoredListItem(guid,toggleStoredCheckbox.checked,function() { let storedmission = (guid in window.plugin.missions.cacheByMissionGuid); toggleStoredCheckbox.checked = storedmission; toggleStoredCheckbox.disabled = false; });
            }, false);
        }

        let missionlink = renderedmissionobject.getElementsByTagName('A')[0];
        missionlink.parentNode.insertBefore(toggleStored, missionlink); // same as: $(toggleStored).insertAfter(missionlink);

        return renderedmissionobject;
    };

    self.updateMissionListItem = function(data) {
        // cacheByMissionGuid is used to display renderMissionSummary
        // cacheByMissionGuid is filled a moment after runhook plugin-missions-loaded-mission, so, we need a small delay:
        setTimeout(function() {
            let newimage = data.mission.image.replace('http:','https:').replace(/=[swh]\d+(|\-[cp])$/,'') + '=s50-c'; // fix image url and shrink image to 50x50
            if (data.mission.image != newimage) {
                window.plugin.missions.cacheByMissionGuid[data.mission.guid].data.image = newimage;
                window.plugin.missions.storeCache();
                data.mission.image = newimage;
                if ($('#dialog-plugin-mission-view-dialog [data-mission_mid="' + data.mission.guid + '"] img').length > 0) {
                    $('#dialog-missionsList [data-mission_mid="' + data.mission.guid + '"] img')[0].src = newimage;
                }
            }
            // $('#dialog-missionsList [data-mission_mid="' + data.mission.guid + '"]').replaceWith(self.modifyMissionListItem(window.plugin.missions.renderMissionSummary(data.mission),data.mission.guid));

            let renderedDetails = window.plugin.missions.renderMissionSummary(data.mission).innerHTML.replace(/^.*?(<span|<br)/s,'$1');
            $('#dialog-missionsList [data-mission_mid="' + data.mission.guid + '"] > span.plugin-mission-info').remove();
            $('#dialog-missionsList [data-mission_mid="' + data.mission.guid + '"] > br').replaceWith(renderedDetails);

            if (self.settings.showstoredbutton)
                if (self.settings.showstoredicon) {
                    $('#dialog-missionsList [data-mission_mid="' + data.mission.guid + '"] span.' + self.id + '-iconstored').first().text('☑');
                    $('#dialog-missionsList [data-mission_mid="' + data.mission.guid + '"] input.' + self.id + '-checkboxstored').first().prop('checked',true);
                } else {
                    $('#dialog-missionsList [data-mission_mid="' + data.mission.guid + '"] input.' + self.id + '-checkboxstored').first().prop('checked',true);
                }
        },0);
    };

    self.fixCachedImageURLs = function() { // only usefull when this add-on is installed after missions plugin has been used
        let updated = false;
        for (const guid in window.plugin.missions.cacheByMissionGuid) {
            let image = window.plugin.missions.cacheByMissionGuid[guid].data.image;
            let newimage = image.replace('http:','https:').replace(/=[swh]\d+(|\-[cp])$/,'') + '=s50-c';
            if (image != newimage) {
                console.log('Replace cached img source',image);
                window.plugin.missions.cacheByMissionGuid[guid].data.image = newimage;
                updated = true;
            }
        }
        if (updated) {
            window.plugin.missions.storeCache();
        }
    };

    self.cleardebuglayer = function() {
        self.missiondebuglayer.clearLayers();
        self.missiondebugobjects = {};
    };
    self.createboundsid = function(bounds) {
        return JSON.stringify([bounds.getSouth(),bounds.getWest(),bounds.getNorth(),bounds.getEast()]);
    };
    self.drawdebuglayer = function(bounds,options) {
        if (!(typeof options === 'object' && options instanceof Object && !(options instanceof Array))) { // expect an object
            options = {};
        }
        options = { ...{
            color: '#a24ac3', // soft purple
            fill: false,
            fillOpacity: 0.1,
            weight: 1,
            opacity: 0.8,
            interactive: false
        }, ...options};

        let id = self.createboundsid(bounds);
        let layer = self.missiondebugobjects[id];
        if (!layer) {
            let latLngs = [bounds.getSouthWest(),bounds.getNorthEast()];
            layer = new window.L.Rectangle(latLngs,options);
            self.missiondebugobjects[id] = layer;
            self.missiondebuglayer.addLayer(layer);
        } else {
            layer.setStyle(options);
        }
//        if (window.map.hasLayer(self.missiondebuglayer)) // only bring to back if we have the debug layer turned on
//            self.missiondebuglayer.bringToBack();
    };
    self.setdebuglayercolor = function(bounds,options) {
        let id = self.createboundsid(bounds);
        let layer = self.missiondebugobjects[id];
        if (layer) {
            layer.setStyle(options);
        }
    };

    self.setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        if (!window.plugin.missions) {
            console.log('ERROR: plugin missions is required for plugin ' + self.title);
            return;
        }

        var sheet = document.createElement('style');
        sheet.innerHTML = `
        .${self.id}mainmenu > button { display: block; min-width: 180px; margin: 5px; cursor: pointer; margin-left: auto; margin-right: auto; }
        .${self.id}mainmenu > button:disabled { color: #bbb; cursor: default; }
        .${self.id}mainmenu > label { user-select: none; }
        .${self.id}settingsmenu button { cursor: pointer; }
        .${self.id}settingsmenu button:disabled { color: #bbb; cursor: default; }
        .${self.id}settingsmenu > label { display: block; user-select: none; }

        .${self.id}author { margin-top: 14px; font-style: italic; font-size: smaller; }

        .${self.id}-banner-summary img { width: 50px; }
        .${self.id}-banner-edit-buttons { cursor: pointer; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
        .${self.id}-banner-edit-buttons span { color: black; font-size: 2em; margin-left: 1px; }
        `;
        document.body.appendChild(sheet);

        window.addHook('plugin-missions-mission-changed', function(data) { window.plugin.missions.highlightMissionLayers(); });
        window.addHook('plugin-missions-loaded-mission', self.updateMissionListItem);

        // init before restore settings
        if (!('autoRefreshOnMoveEnd' in window.plugin.missions)) { // pre version 0.3.0 had no auto refresh
            window.plugin.missions.autoRefreshOnMoveEnd = false;
            window.plugin.missions.onMoveEnd = function() {
                if (window.plugin.missions.autoRefreshOnMoveEnd) {
                    if (window.DIALOGS['dialog-missionsList']) {
                        window.plugin.missions.openTopMissions();
                    }
                }
            }
            window.map.on('moveend', window.plugin.missions.onMoveEnd, window.plugin.missions);
        }
        self.settings.autorefreshonmoveend = window.plugin.missions?.autoRefreshOnMoveEnd || self.settings.autorefreshonmoveend; // default true from Missions version 0.3.0

        self.restoresettings();
        self.restorePlaceholders();
        self.restoredrawnmissions();

        // update missions plugin value with stored setting
        window.plugin.missions.autoRefreshOnMoveEnd = self.settings.autorefreshonmoveend;

        window.plugin.missions.MISSION_COLOR_ACTIVE = '#FF0000'; //'#7f7f00',

        self.missiondebuglayer = new window.L.FeatureGroup(); // LayerGroup
        if (self.settings.enabledebuglayer) {
            window.addLayerGroup(self.missiondebuglayertitle, self.missiondebuglayer, true);
        }

        self.setupOpenTopMissions();
        self.setupShowMissionListDialog();
        self.setupRenderMissionList();
        self.setupMobilePane();
        self.fixCachedImageURLs();
        self.setupLoadMission();
        self.setupDrawMission();
        self.setupHighlightMissionLayers();
        self.setupMissionLayer();
        self.setupShowMissionDialog();

        // redraw missions:
        if (self.settings.redrawmissions) {
            for (let cnt = 0; cnt < self.drawnmissions.length; cnt++) {
                let guid = self.drawnmissions[cnt];
                if (guid in window.plugin.missions.cacheByMissionGuid) {
                    let mission = window.plugin.missions.cacheByMissionGuid[guid].data;
                    window.plugin.missions.showMissionDialog(mission);
                }
            }
        }

        window.map.on('zoomstart movestart', self.stoploading);
        window.map.on('zoomend moveend zoomlevelschange', self.stoploading);

        // bring to front, if option enabled and map is active, and do this a moment later, after all portals are brought to front
        window.addHook('mapDataRefreshEnd', function() { setTimeout(function() { if (self.settings.keepontop && window.plugin.missions.missionLayer._map) { window.plugin.missions.missionLayer.bringToFront(); window.plugin.missions.highlightMissionLayers(); } },100); });

        console.log('IITC plugin loaded: ' + self.title + ' version ' + self.version);
    };

    var setup = function() {
        (window.iitcLoaded?self.setup():window.addHook('iitcLoaded',self.setup));
    };
    setup.priority = 'lowest'; // plugin Missions 0.3.0 is set to low, this plugin must be even lower

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
