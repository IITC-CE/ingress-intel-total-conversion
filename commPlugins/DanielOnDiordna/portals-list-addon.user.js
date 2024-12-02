// ==UserScript==
// @author         DanielOnDiordna
// @name           Portals list add-on
// @category       Addon
// @version        1.1.0.20230321.232000
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/portals-list-addon.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/portals-list-addon.user.js
// @description    [danielondiordna-1.1.0.20230321.232000] Add-on to only display portals for visible/enabled layers, a fix for Unclaimed/Placeholder Portals, added level filters and load portal details.
// @id             portals-list-addon@DanielOnDiordna
// @namespace      https://softspot.nl/ingress/
// @depends        portals-list@teo96
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.portalslistAddon = function() {};
    var self = window.plugin.portalslistAddon;
    self.id = 'portalslistAddon';
    self.title = 'Portals list add-on';
    self.version = '1.1.0.20230321.232000';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 1.1.0.20230321.232000
- added Machina support when loading details
- added updating faction totals when loading details
- added updating history totals when loading details for Portals list version 0.4.0
- added updating level selectors when loading details
- improved continue loading details on failures
- fixed the footnotes dialog

version 1.0.0.20221010.154100
- reversed the changelog order
- fixed the neutral portals layer detection
- added error checking when replacing strings
- added error checking when running the eval
- fixed load details button by replacing display hidden with display none
- fixed support for stock plugin Portals list version 0.4.0
- moved the footnotes into a dialog

version 0.0.7.20210724.002500
- prevent double plugin setup on hook iitcLoaded

version 0.0.7.20210711.210800
- fixed row number for loaded portal details
- fixed problem that would filter away all neutral portals
- neutral portals now show no shields, resonators, mods and owne
- details for neutral portals are not loaded anymore

version 0.0.6.20210621.234600
- added level filter checkboxes
- changed filtering for visible layers

version 0.0.5.20210421.190200
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin

version 0.0.5.20210204.231200
- changed title from 'show list of portals add-on' to 'Portals list add-on' to match IITC-CE plugin name
- disabled skipping ghost portals in main plugin
- fixed sort functions to support ghost portals
- portal table displayed with fixed title and made scrollable
- updated plugin wrapper and userscript header formatting to match IITC-CE coding

version 0.0.4.20200308.232600
- replaced a lot of code to speed up the table updates
- added a stop loading button
- limit loading details to new details only

version 0.0.3.2020125.003100
- added loading of more portal details columns like shields, resonators, mods, owner

version 0.0.2.2020109.001300
- added a fix for portals with an undefined title, level and health

version 0.0.1.20191114.115600
- first release
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.unclaimedlayername = 'Unclaimed/Placeholder Portals'; // Value will be retreived from window.setupMap
    self.enllayername = 'Enlightened';
    self.reslayername = 'Resistance';
    self.levellayername = 'Level '; // Value will be retreived from window.setupMap
    self.portallayername = ' Portals'; // Value will be retreived from window.setupMap
    self.machinaname = 'U̶͚̓̍N̴̖̈K̠͔̍͑̂͜N̞̥͋̀̉Ȯ̶̹͕̀W̶̢͚͑̚͝Ṉ̨̟̒̅ ';

    self.portaldetails = {};
    self.requestlist = {};
    self.requestid = undefined;
    self.requestmaxretries = 3;

    self.ownercolor = 'black';
    self.shortmodnames =
        {
            'Heat Sink'            :'H',
            'Portal Shield'        :'S',
            'Link Amp'             :'L',
            'Turret'               :'T',
            'Multi-hack'           :'M',
            'Aegis Shield'         :'A',
            'Force Amp'            :'F',
            'SoftBank Ultra Link'  :'U',
            'Ito En Transmuter (+)':'I+',
            'Ito En Transmuter (-)':'I-'
        };
    self.shortrarities =
        {
            'COMMON'    : 'c',
            'RARE'      : 'r',
            'VERY_RARE' : 'v'
        };
    self.filterlevel = [];
    self.countlevel = [];
    self.filterreversed = false;

    self.gettotalshielding = function(guid,htmlformatting) {
        if (!self.portaldetails[guid]) return (htmlformatting?(window.portals[guid] && (self.isMachinaPortal(window.portals[guid]) || window.portals[guid].options.team != window.TEAM_NONE) ? 'unknown' : ''):-1);
        let details = self.portaldetails[guid];
        let linkInfo = window.getPortalLinks(guid);
        let linkCount = linkInfo.in.length + linkInfo.out.length;
        let mitigationDetails = window.getPortalMitigationDetails(details,linkCount);
        let totalshielding = mitigationDetails.shields + mitigationDetails.links;
        return Math.round(totalshielding);
    };

    self.getresonatorstring = function(guid,htmlformatting,highlightowner) {
        if (!self.portaldetails[guid]) return (self.requestlist[guid]?'(loading)':(window.portals[guid] && (self.isMachinaPortal(window.portals[guid]) || window.portals[guid].options.team != window.TEAM_NONE) ? '(unknown)' : '--------') );

        if (!highlightowner) highlightowner = window.PLAYER.nickname;
        let resonators = self.portaldetails[guid].resonators;
        let portalowner = self.getportalowner(guid);

        resonators = resonators.sort(function(b,a) {return (a.level + a.owner > b.level + b.owner) ? 1 : ((b.level + b.owner > a.level + a.owner) ? -1 : 0);}); // sort by resonator level resonator[owner,level]

        let resolist = [];
        for (let cnt=0; cnt<8; cnt++) {
            let resonator = '-';
            if (cnt < resonators.length && resonators[cnt]) {
                //let nrg = parseInt(resonators[cnt].energy);
                resonator = parseInt(resonators[cnt].level); // level
                let resonatorowner = resonators[cnt].owner;
                if (htmlformatting) {
                    if (resonatorowner === highlightowner) {
                        resonator = '<span style="color:' + self.ownercolor + '">' + resonator + '</span>'; // highlight reso's of current player
                    } else if (resonatorowner !== portalowner) {
                        resonator = '<u>' + resonator + '</u>'; // underline reso's of other people then the portal owner
                    }
                    resonator = '<span title="' + resonatorowner + (self.requestlist[guid]?' (updating)':'') + '">' + resonator + '</span>';
                }
            }
            resolist.push(resonator);
        }
        return resolist.join('');
    };

    self.getmodstring = function(guid,htmlformatting,highlightowner) {
        if (!self.portaldetails[guid]) return (self.requestlist[guid]?'(loading)':(window.portals[guid] && (self.isMachinaPortal(window.portals[guid]) || window.portals[guid].options.team != window.TEAM_NONE) ? '(unknown)' : ''));

        if (!highlightowner) highlightowner = window.PLAYER.nickname;
        let mods = self.portaldetails[guid].mods;
        if (mods.length === 0) return '(empty)';
        let portalowner = self.getportalowner(guid);

        let modslist = [];
        for (let cnt=0; cnt<4; cnt++) {
            let mod = '';
            if (cnt < mods.length && mods[cnt]) {
                mod = self.shortmodnames[mods[cnt].name];
                let modowner = mods[cnt].owner; // owner
                if (mod === 'H' || mod === 'S' || mod === 'M') mod = self.shortrarities[mods[cnt].rarity] + mod;
                if (htmlformatting) {
                    if (modowner === highlightowner) {
                        mod = '<span style="color:' + self.ownercolor + '">' + mod + '</span>'; // highlight mods of current player
                    } else if (modowner !== portalowner) {
                        mod = '<u>' + mod + '</u>'; // underline mods of other people then the portal owner
                    }
                    mod = '<span title="' + modowner + (self.requestlist[guid]?' (updating)':'') + ' - ' + mods[cnt].name + '">' + mod + '</span>';
                }
            }
            modslist.push(mod);
        }
        return modslist.join(' ');
    };

    self.getportalowner = function(guid) {
        if (guid in window.portals) {
            if (self.isMachinaPortal(window.portals[guid])) return self.machinaname;
            if (window.portals[guid].options.team == window.TEAM_NONE) return '-';
        }

        return self.portaldetails[guid]?.owner || window.portals[guid]?.options?.data.owner || 'unknown';
    };

    self.getportalownerhtml = function(guid) {
        if (guid in self.requestlist) return (guid in self.portaldetails ? '(updating)' : '(loading)');
        if (guid in window.portals && self.isMachinaPortal(window.portals[guid])) return self.machinaname;

        if (!(guid in self.portaldetails)) return (window.portals[guid] && window.portals[guid].options.team != window.TEAM_NONE ? '(unknown)' : '-');

        let owner = self.portaldetails[guid].owner || '-'; // use - if unknown
        if (owner === window.PLAYER.nickname) owner = `<span style="color:${self.ownercolor}">${owner}</span>`;
        return owner;
    };

    self.isMachinaPortal = function(portal) {
        if (!portal?.options) return false;
        if (portal.options.team == window.TEAM_ENL || portal.options.team == window.TEAM_RES) return false;
        if (portal.options.data.resCount > 0) return true;
        if (portal.options.data.resCount === 0) return false;
        // only if resCount is undefined, check all links for matching origin or destination match

        // Be aware: a placeholder portal is allways drawn before the link is drawn, so most of the time there is no link yet to check for a match, unless the portal has multiple links
        let portallatlng = portal.getLatLng();
        let machinalinkplaceholderfound = false;
        for (let id in window.links) {
            let link = window.links[id];
            if (portal.options.guid == link.options.data.oGuid || portal.options.guid == link.options.data.dGuid) {
                machinalinkplaceholderfound = true;
                break;
            }
        }
        return machinalinkplaceholderfound;
    };

    self.loaddetails = function() {
        self.requestlist = {};

        // parse guid list of visible portal rows
        let skipped = {};
        let neutral = {};
        for (const guid of [...document.querySelectorAll('#portalslist TR[guid]')].map((el)=>{return el.getAttribute('guid');})) {
            if (guid in self.portaldetails) {
                skipped[guid] = self.requestmaxretries;
            } else if (!(guid in window.portals) || guid in window.portals && (self.isMachinaPortal(window.portals[guid]) || window.portals[guid]?.options.team == window.TEAM_ENL || window.portals[guid]?.options.team == window.TEAM_RES)) {
                // add only if not already loaded, and not in portals, or in portals and not team_none
                self.requestlist[guid] = self.requestmaxretries;
                self.updatePortalsListRow(guid);
            } else {
                neutral[guid] = self.requestmaxretries;
            }
        }

        if (Object.keys(self.requestlist).length == 0 && Object.keys(neutral).length == 0 && Object.keys(skipped).length > 0) {
            if (confirm('All details already loaded. Do you want to reload all details again?')) {
                neutral = {};
                for (let guid in skipped) {
                    if (!(guid in window.portals) || guid in window.portals && (self.isMachinaPortal(window.portals[guid]) || window.portals[guid]?.options.team == window.TEAM_ENL || window.portals[guid]?.options.team == window.TEAM_RES)) {
                        // add only if not already loaded, and not in portals, or in portals and not team_none
                        self.requestlist[guid] = self.requestmaxretries;
                        self.updatePortalsListRow(guid);
                    } else {
                        neutral[guid] = self.requestmaxretries;
                    }
                }
            }
        }

        self.requestlist = {...self.requestlist,...neutral}; // handle all neutral last
        for (let guid in neutral) {
            self.updatePortalsListRow(guid);
        }

        self.requestid = undefined;
        setTimeout(self.loadnext);
    };

    self.stoploaddetails = function() {
        clearTimeout(self.loadfailtimerid);
        self.loadfailtimerid = 0;

        // restore portal list
        for (const guid in self.requestlist) {
            delete(self.requestlist[guid]);
            self.updatePortalsListRow(guid);
        }

        self.requestlist = {};
        self.requestid = undefined;
    };

    self.loadfail = function() {
        self.requestlist[self.requestid]--;
        if (self.requestlist[self.requestid] > 0) {
            console.log(self.title + " - Load portal details failed (retry " + (self.requestmaxretries - self.requestlist[self.requestid]) + "/" + self.requestmaxretries + ")",self.requestid);
            // place element at the end of the object, try again later:
            let retriesleft = self.requestlist[self.requestid];
            delete(self.requestlist[self.requestid]);
            self.requestlist[self.requestid] = retriesleft;

            self.requestid = undefined;
            setTimeout(self.loadnext);
            return;
        }
        console.log(self.title + " - Load portal details failed (after " + self.requestmaxretries + " retries)",self.requestid);
        self.stopbuttonarea.style.display = 'none';
        self.loadbutton.style.display = 'inline';
        self.stoploaddetails();
        window.dialog({
            html: "Load portal details failed for guid:<br>\n" + self.requestid + "<br>\n<br>\nYou can press 'Load details' to try again.",
            title: self.title,
            id: "portalslist-loadfail"
        });
    };

    self.loadnext = function() {
        if (self.requestid) return; // busy

        if (Object.keys(self.requestlist).length == 0) {
            self.loaddetailsarea.textContent = '';
            self.loadbutton.style.display = 'inline';
            self.stopbuttonarea.style.display = 'none';
            return;
        }
        self.loaddetailsarea.textContent = ' (' + Object.keys(self.requestlist).length + ')';

        self.requestid = Object.keys(self.requestlist)[0];

        if (self.loadfailtimerid) {
            clearTimeout(self.loadfailtimerid);
            self.loadfailtimerid = 0;
        }
        self.loadfailtimerid = setTimeout(function() { self.loadfailtimerid = 0; self.loadfail(); },1000);

        window.portalDetail.request(self.requestid);
    };

    self.storedetails = function(data) {
        if (!(data instanceof Object) || !('guid' in data) || !('details' in data)) return;

        if (data.guid == self.requestid && self.loadfailtimerid) {
            clearTimeout(self.loadfailtimerid);
            self.loadfailtimerid = 0;
        }

        self.portaldetails[data.guid] = data.details; // plain storage of all details
        delete(self.requestlist[data.guid]); // delete before executing getPortalObj

        self.updatePortalsListRow(data.guid);

        if (data.guid == self.requestid) { // only load next if this guid was the last request
            self.requestid = undefined;
            setTimeout(self.loadnext);
        }
    };

    self.updatePortalsListRow = function(guid) {
        // update table row
        let listindex = window.plugin.portalslist.listPortals.findIndex((el)=>{return el.portal.options.guid == guid});
        if (listindex >= 0) {
            // update list item
            window.plugin.portalslist.listPortals[listindex] = self.getPortalObj(guid);
            if (window.plugin.portalslist.listPortals[listindex].row.classList.contains(window.TEAM_TO_CSS[window.TEAM_NONE]) && self.isMachinaPortal(window.portals[guid])) {
                window.plugin.portalslist.listPortals[listindex].row.classList.replace(window.TEAM_TO_CSS[window.TEAM_NONE],self.id + '-mac');
            }
            let tablerow = document.querySelector('#portalslist TR[guid="' + guid + '"]');
            if (tablerow) {
                // update this row
                let row = window.plugin.portalslist.listPortals[listindex].row;
                row.cells[0].textContent = tablerow.rowIndex;
                tablerow.replaceWith(row);
            }
            // update header counts
            self.updateCountsRow();
            // update filterlevel, countlevel
            self.updateLevelRow();
        }
    };

    self.initialize = function() {
        let neutraldisplayed = window.isLayerGroupDisplayed(self.unclaimedlayername);
        let enldisplayed = window.isLayerGroupDisplayed(self.enllayername);
        let resdisplayed = window.isLayerGroupDisplayed(self.reslayername);

        if (window.plugin.portalslist.portalTable.toString().match('reversed')) {
            if (neutraldisplayed && resdisplayed && enldisplayed) {
                window.plugin.portalslist.filter = 0;
                self.filterreversed = false;
            } else if (neutraldisplayed && !resdisplayed && !enldisplayed) {
                window.plugin.portalslist.filter = 1;
                self.filterreversed = false;
            } else if (!neutraldisplayed && resdisplayed && enldisplayed) {
                window.plugin.portalslist.filter = 1;
                self.filterreversed = true;
            } else if (!neutraldisplayed && resdisplayed && !enldisplayed) {
                window.plugin.portalslist.filter = 2;
                self.filterreversed = false;
            } else if (neutraldisplayed && !resdisplayed && enldisplayed) {
                window.plugin.portalslist.filter = 2;
                self.filterreversed = true;
            } else if (!neutraldisplayed && !resdisplayed && enldisplayed) {
                window.plugin.portalslist.filter = 3;
                self.filterreversed = false;
            } else if (neutraldisplayed && resdisplayed && !enldisplayed) {
                window.plugin.portalslist.filter = 3;
                self.filterreversed = true;
            }
        } else {
            // method before 0.4.0 had negative and positive filter values:
            if (neutraldisplayed && resdisplayed && enldisplayed) {
                window.plugin.portalslist.filter = 0;
            } else if (neutraldisplayed && !resdisplayed && !enldisplayed) {
                window.plugin.portalslist.filter = 1;
            } else if (!neutraldisplayed && resdisplayed && enldisplayed) {
                window.plugin.portalslist.filter = -1;
            } else if (!neutraldisplayed && resdisplayed && !enldisplayed) {
                window.plugin.portalslist.filter = 2;
            } else if (neutraldisplayed && !resdisplayed && enldisplayed) {
                window.plugin.portalslist.filter = -2;
            } else if (!neutraldisplayed && !resdisplayed && enldisplayed) {
                window.plugin.portalslist.filter = 3;
            } else if (neutraldisplayed && resdisplayed && !enldisplayed) {
                window.plugin.portalslist.filter = -3;
            }
        }

        self.filterlevel = [];
        self.countlevel = [];
        self.filterlevel[0] = neutraldisplayed;
        for (let level = 1; level <= 8; level++) {
            self.filterlevel[level] = window.isLayerGroupDisplayed(self.levellayername + level + self.portallayername);
            self.countlevel[level] = 0;
        }
    };

    self.setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        if (!window.plugin.portalslist) {
            console.log('IITC plugin ERROR: ' + self.title + ' version ' + self.version + ' - requires plugin portalslist');
            return;
        }

        // get the actual layer names for Unclaimed and Level portals
        let overlaylayers = window.layerChooser._layers;
        if (!(overlaylayers instanceof Array)) { // IITC 0.26
            overlaylayers = Object.keys(window.layerChooser._layers).map((el)=>{return window.layerChooser._layers[el]});
        }
        self.unclaimedlayername = overlaylayers.filter((el)=>{return el.overlay})[0].name; // the first overlay layer is always for Unclaimed/Placeholder Portals
        let layermatches = overlaylayers.filter((el)=>{return el.overlay})[1].name.match(/^(.*)1(.*)$/);
        if (layermatches) { // the second overlay layer is always for Level 1 Portals
            self.levellayername = layermatches[1];
            self.portallayername = layermatches[2];
        }

        if (window.TEAM_NAMES) self.enllayername = window.TEAM_NAMES[window.TEAM_ENL];
        if (window.TEAM_NAMES) self.reslayername = window.TEAM_NAMES[window.TEAM_RES];

        let getPortalsString = window.plugin.portalslist.getPortals.toString();
        // disable skipping ghost portals
        if (getPortalsString == (getPortalsString = getPortalsString.replace(/(if \()(!portal\.options\.data\.title\))/,'$1false && $2'))) { // older version
            if (getPortalsString == (getPortalsString = getPortalsString.replace(/(if \()(!\('title' in portal\.options\.data\)\))/,'$1false && $2'))) { // newer versions
                // oldest version did not have this filter
                // console.log(self.title + ' - ERROR: replace if title failed');
            }
        }

        // add portal guid as an attribute, to be used for replacing data in the table
        if (getPortalsString == (getPortalsString = getPortalsString.replace('obj.row = row;','row.setAttribute("guid", portal.options.guid);\n    obj.row = row;'))) {
            console.log(self.title + ' - ERROR: replace obj.row failed');
        }
        if (getPortalsString == (getPortalsString = getPortalsString.replace(/(.*switch)/,'    ' + self.namespace + 'countlevel[portal.options.level]++;\n$1'))) {
            console.log(self.title + ' - ERROR: replace switch failed');
        }
        getPortalsString = getPortalsString.replaceAll('data.history.','data?.history?.'); // fix Missions 0.4.0 error
        try {
            eval('window.plugin.portalslist.getPortals = ' + getPortalsString + ';');
        } catch(e) {
            console.log(self.title + ' - ERROR: eval getPortals failed',e,getPortalsString);
        }

        let getPortalLinkString = window.plugin.portalslist.getPortalLink.toString();
        // fix undefined titles and make the title smaller
        if (getPortalLinkString == (getPortalLinkString = getPortalLinkString.replace('link.textContent = portal.options.data.title;','link.textContent = (portal.options.data.title ? portal.options.data.title : "[undefined]");\n  if (link.textContent.length > 30) {\n    link.title = link.textContent;\n    link.textContent = link.textContent.substring(0,27) + \'...\';\n  }\n'))) {
            console.log(self.title + ' - ERROR: replace link.textContent failed');
        }
        // show leading spaces in a title
        if (getPortalLinkString == (getPortalLinkString = getPortalLinkString.replace('("a");','("a");\n  link.style.whiteSpace = "pre";'))) {
            console.log(self.title + ' - ERROR: replace a failed');
        }
        try {
            eval('window.plugin.portalslist.getPortalLink = ' + getPortalLinkString + ';');
        } catch(e) {
            console.log(self.title + ' - ERROR: eval getPortalLink failed',e,getPortalLinkString);
        }

        // Fix columns value and format functions to support ghost portals:
        for (let cnt = 0; cnt < window.plugin.portalslist.fields.length; cnt++) {
            if (window.plugin.portalslist.fields[cnt].title == "Portal Name") {
                window.plugin.portalslist.fields[cnt].value = function(portal) { return (portal.options.data.title && portal.options.data.title != "" ? portal.options.data.title : "[undefined]"); };
            } else if (window.plugin.portalslist.fields[cnt].title == "Level") {
                window.plugin.portalslist.fields[cnt].value = function(portal) { return (portal.options.data.level ? portal.options.data.level : -1); };
                let formatString = window.plugin.portalslist.fields[cnt].format.toString().replace('{','{\n     value = (value == -1?"?":value);');
                try {
                    eval('window.plugin.portalslist.fields[' + cnt + '].format = ' + formatString + ';');
                } catch(e) {
                    console.log(self.title + ' - ERROR: eval portalslist.fields[' + cnt + '].format failed',e,formatString);
                }
            } else if (window.plugin.portalslist.fields[cnt].title == "Health") {
                window.plugin.portalslist.fields[cnt].value = function(portal) { return (portal.options.data.health ? portal.options.data.health : -1); };
                let formatString = window.plugin.portalslist.fields[cnt].format.toString().replace('{','{\n     value = (value == -1?"?":value);');
                try {
                    eval('window.plugin.portalslist.fields[' + cnt + '].format = ' + formatString + ';');
                } catch(e) {
                    console.log(self.title + ' - ERROR: eval portalslist.fields[' + cnt + '].format failed',e,formatString);
                }
            } else if (window.plugin.portalslist.fields[cnt].title == "AP") {
                window.plugin.portalslist.fields[cnt].sortValue = function(value, portal) { return (Number.isNaN(value.enemyAp) ? -1 : value.enemyAp); }
                let formatString = window.plugin.portalslist.fields[cnt].format.toString().replace('{','{\n      for (let i in value) {\n        value[i] = (Number.isNaN(value[i])?"?":value[i]);\n      };');
                try {
                    eval('window.plugin.portalslist.fields[' + cnt + '].format = ' + formatString + ';');
                } catch(e) {
                    console.log(self.title + ' - ERROR: eval portalslist.fields[' + cnt + '].format failed',e,formatString);
                }
            }
        }

        // make dialog wider to fit extra columns and extra buttons
        let displayPLString = window.plugin.portalslist.displayPL.toString();
        displayPLString = displayPLString.replace(/(, false\))/,', ' + self.namespace + 'filterreversed)'); // for version 0.4.0
        if (displayPLString == (displayPLString = displayPLString.replace(/(.+getPortals.+)/,'  ' + self.namespace + 'initialize();\n\n$1'))) {
            console.log(self.title + ' - ERROR: replace getPortals failed');
        }
        if (displayPLString == (displayPLString = displayPLString.replace(/(Nothing to show!)/,'$1 <a onclick="if (window.useAndroidPanes()) { \$(\\\'#portalslist\\\').remove(); } window.plugin.portalslist.displayPL()">Refresh</a>'))) {
            console.log(self.title + ' - ERROR: replace nothing to show failed');
        }
        if (displayPLString == (displayPLString = displayPLString.replace('width: 700','width: 960'))) {
            console.log(self.title + ' - ERROR: replace width failed');
        }
        if (!displayPLString.match('macP') && displayPLString == (displayPLString = displayPLString.replace(/(neuP = 0;)/,'$1\n  window.plugin.portalslist.macP = 0;'))) {
            console.log(self.title + ' - ERROR: add macP failed');
        }

        if (displayPLString == (displayPLString = displayPLString.replace(/(list =)/,`for (let item of window.plugin.portalslist.listPortals) {
      if (item.portal.options.team == window.TEAM_NONE && item.row.classList.contains(window.TEAM_TO_CSS[window.TEAM_NONE]) && ${self.namespace}isMachinaPortal(item.portal)) {
        item.row.classList.replace(window.TEAM_TO_CSS[window.TEAM_NONE],'${self.id}-mac');
        window.plugin.portalslist.neuP--;
        window.plugin.portalslist.macP++;
      }
    }
    $1`))) {
            console.log(self.title + ' - ERROR: insert machine class failed');
        }

        try {
            eval('window.plugin.portalslist.displayPL = ' + displayPLString + ';');
        } catch(e) {
            console.log(self.title + ' - ERROR: eval getPortalLink failed',e,displayPLString);
        }

        // modification max-width: 1000px
        $('<style>').prop('type', 'text/css').html('.ui-dialog-portalslist { max-width: 1000px }').appendTo('head');

        self.appendLoadButton = function(cell) {
            cell.style.cursor = 'unset';
            cell.style.textAlign = 'unset';
            cell.style.whiteSpace = 'nowrap';

            self.loadbutton = cell.appendChild(document.createElement('a'));
            self.loadbutton.textContent = 'Load details';
            self.loadbutton.style.display = (Object.keys(self.requestlist).length <= 0 ? 'inline' : 'none');

            self.stopbuttonarea = cell.appendChild(document.createElement('div'));
            self.stopbuttonarea.style.display = (Object.keys(self.requestlist).length > 0 ? 'inline' : 'none');
            let stopbutton = self.stopbuttonarea.appendChild(document.createElement('a'));
            stopbutton.textContent = 'Stop';
            self.loaddetailsarea = self.stopbuttonarea.appendChild(document.createElement('span'));
            self.loaddetailsarea.textContent = '';

            self.loadbutton.addEventListener('click', function(e) {
                e.preventDefault();
                self.loadbutton.style.display = 'none';
                self.stopbuttonarea.style.display = 'inline';
                self.loaddetails();
            },false);

            stopbutton.addEventListener('click', function(e) {
                e.preventDefault();
                self.stopbuttonarea.style.display = 'none';
                self.loadbutton.style.display = 'inline';
                self.stoploaddetails();
            },false);
        };

        self.updateCountsRow = function() {
            let resP = 0;
            let enlP = 0;
            let macP = 0;
            let neuP = 0;
            let visitedP = 0;
            let capturedP = 0;
            let scoutControlledP = 0;
            for (let listitem of window.plugin.portalslist.listPortals) {
                switch (listitem.portal.options.team) {
                    case window.TEAM_RES:
                        resP++;
                        break;
                    case window.TEAM_ENL:
                        enlP++;
                        break;
                    case window.TEAM_MAC:
                        macP++;
                        break;
                    default:
                        neuP++;
                }
                if (listitem.portal.options.data.history?.visited) visitedP++;
                if (listitem.portal.options.data.history?.captured) capturedP++;
                if (listitem.portal.options.data.history?.scoutControlled) scoutControlledP++;
            }

            let total = window.plugin.portalslist.listPortals.length;
            if (resP != window.plugin.portalslist.resP) {
                let el = document.querySelector('.filters .count.filterRes') || document.querySelectorAll('.filter .filterRes')?.[1];
                if (el) {
                    window.plugin.portalslist.resP = resP;
                    el.childNodes[0].textContent = `${resP} (${Math.round(resP/total*100)}%)`;
                }
            }
            if (enlP != window.plugin.portalslist.enlP) {
                let el = document.querySelector('.filters .count.filterEnl') || document.querySelectorAll('.filter .filterEnl')?.[1];
                if (el) {
                    window.plugin.portalslist.enlP = enlP;
                    el.childNodes[0].textContent = `${enlP} (${Math.round(enlP/total*100)}%)`;
                }
            }
            if (macP != window.plugin.portalslist.macP) {
                let el = document.querySelector('.filters .count.filterUnk') || document.querySelectorAll('.filter .filterU̶͚')?.[1];
                if (el) {
                    window.plugin.portalslist.macP = macP;
                    el.childNodes[0].textContent = `${macP} (${Math.round(macP/total*100)}%)`;
                }
            }
            if (neuP != window.plugin.portalslist.neuP) {
                let el = document.querySelector('.filters .count.filterNeu') || document.querySelectorAll('.filter .filterNeu')?.[1];
                if (el) {
                    window.plugin.portalslist.neuP = neuP;
                    el.childNodes[0].textContent = `${neuP} (${Math.round(neuP/total*100)}%)`;
                }
            }

            if (visitedP != window.plugin.portalslist.visitedP) {
                let el = document.querySelector('.filters .count.filterVis') || document.querySelectorAll('.filter .filterVis')?.[1];
                if (el) {
                    window.plugin.portalslist.visitedP = visitedP;
                    el.childNodes[0].textContent = `${visitedP} (${Math.round(visitedP/total*100)}%)`;
                }
            }
            if (capturedP != window.plugin.portalslist.capturedP) {
                let el = document.querySelector('.filters .count.filterCap') || document.querySelectorAll('.filter .filterCap')?.[1];
                if (el) {
                    window.plugin.portalslist.capturedP = capturedP;
                    el.childNodes[0].textContent = `${capturedP} (${Math.round(capturedP/total*100)}%)`;
                }
            }
            if (scoutControlledP != window.plugin.portalslist.scoutControlledP) {
                let el = document.querySelector('.filters .count.filterSco') || document.querySelectorAll('.filter .filterSco')?.[1];
                if (el) {
                    window.plugin.portalslist.scoutControlledP = scoutControlledP;
                    el.childNodes[0].textContent = `${scoutControlledP} (${Math.round(scoutControlledP/total*100)}%)`;
                }
            }
        };

        self.updateLevelRow = function() {
            let levelrow = document.querySelector('.levelrow');
            if (!levelrow) return;

            let newcountlevel = [];
            for (let level = 1; level <= 8; level++) {
                newcountlevel[level] = 0;
            }
            for (let listitem of window.plugin.portalslist.listPortals) {
                newcountlevel[listitem.portal.options.level]++;
            }

            for (let level = 1; level <= 8; level++) {
                if (self.countlevel[level] == newcountlevel[level]) continue;
                self.countlevel[level] = newcountlevel[level];
                let levelcell = levelrow.querySelector(`.levelcell${level}`);
                let buttonarea = levelcell.querySelector('label');
                let button = levelcell.querySelector('input[type=checkbox]');
                buttonarea.childNodes[1].textContent = 'L' + level + (self.countlevel[level] > 0 ? ' x' + self.countlevel[level] : '');
                if (self.countlevel[level] <= 0) {
                    button.checked = false;
                    button.disabled = true;
                    buttonarea.disabled = true;
                } else {
                    button.checked = self.filterlevel[level];
                    button.disabled = false;
                    buttonarea.disabled = false;
                }
            }
        };

        self.appendLevelRow = function(row) {
            row.className = 'levelrow';
            if(!window.useAndroidPanes()) row.insertCell(-1);
            for (let level = 1; level <= 8; level++) {
                let cell = row.insertCell(-1);
                cell.className = `levelcell${level}`;
                cell.style.textAlign = 'unset';
                let buttonarea = cell.appendChild(document.createElement('label'));
                buttonarea.style.display = 'block';
                buttonarea.style.cursor = 'pointer';
                buttonarea.style.userSelect = 'none';
                let button = buttonarea.appendChild(document.createElement('input'));
                button.type = 'checkbox';
                buttonarea.appendChild(document.createTextNode('L' + level + (self.countlevel[level] > 0 ? ' x' + self.countlevel[level] : '')));
                if (self.countlevel[level] <= 0) {
                    button.checked = false;
                    button.disabled = true;
                    buttonarea.disabled = true;
                } else {
                    button.checked = self.filterlevel[level];
                }
                button.addEventListener('change', function(e) {
                    e.preventDefault();
                    self.filterlevel[level] = button.checked;
                    $('#portalslist').empty().append(window.plugin.portalslist.portalTable(window.plugin.portalslist.sortBy, window.plugin.portalslist.sortOrder, window.plugin.portalslist.filter, self.filterreversed));
                },false);
            }
        };

        let portalTableString = window.plugin.portalslist.portalTable.toString();

        // do not display portals in the list, when the layer is disabled:
        self.filterLevels = function(portals) {
            return portals.filter(function(obj) {
                return self.filterlevel[obj.portal.options.level];
            });
        };

        if (portalTableString.match('reversed')) {
            if (portalTableString == (portalTableString = portalTableString.replace(/(reversed\) \{)/,'$1\n  ' + self.namespace + 'filterreversed = reversed;'))) {
                console.log(self.title + ' - ERROR: replace reversed failed');
            }
        }
        if (portalTableString == (portalTableString = portalTableString.replace(/(var container)/,'portals = ' + self.namespace + 'filterLevels(portals);\n  $1'))) {
            console.log(self.title + ' - ERROR: replace var table failed');
        }
        if (portalTableString == (portalTableString = portalTableString.replace(/(.*\$\('\#portalslist'\).+)/,'      if (i == 0) {\n       for (let level = 0; level <= 8; level++) {\n         ' + self.namespace + 'filterlevel[level] = true;\n         }\n       };\n$1'))) {
            console.log(self.title + ' - ERROR: replace #portalslist failed');
        }

        if (portalTableString == (portalTableString = portalTableString.replace(/(var container.*)/,"$1\n    let hiddenautofocusinput = document.createElement('input');\n    hiddenautofocusinput.type = 'hidden';\n    hiddenautofocusinput.autofocus = 'autofocus';\n    container.append(hiddenautofocusinput);\n"))) {
            console.log(self.title + ' - ERROR: replace container failed');
        }
        if (portalTableString == (portalTableString = portalTableString.replace("table.className = 'portals';","table.className = 'portals';\n  table.setAttribute('style', 'display: block; overflow-y: auto; max-height: calc(100vh - 57px - 24px - 2px - 51px - 52px);');"))) { // from css source: .ui-dialog-content (100vh - 57px - 24px - 2px) - filters clientHeight (desktop)
            console.log(self.title + ' - ERROR: replace table.className failed');
        }
        if (portalTableString == (portalTableString = portalTableString.replaceAll(/(cell = row.appendChild\(document.createElement\('th'\)\);)/gs,"let th = document.createElement('th');\n  th.setAttribute('style','position: sticky; top: 0px;');\n  cell = row.appendChild(th);\n  //$1"))) {
            console.log(self.title + ' - ERROR: replace row.appendChild failed');
        }
        if (portalTableString != (portalTableString = portalTableString.replace('var let','let'))) { // correct for a var cell line in version 0.4.0
            // this must be 0.4.0, handle differently:
            if (portalTableString == (portalTableString = portalTableString.replace(/(\}\);)(\s+var tableDiv =)/s,"$1\n  var cell = filters.appendChild(document.createElement('div'));\n  cell.style.gridRow = 2;\n  " + self.namespace + "appendLoadButton(cell,true);\n  let tbl = document.createElement('table');\n  tbl.className = 'levelfilters';\n  container.append(tbl);\n  row = tbl.insertRow(-1);\n  " + self.namespace + "appendLevelRow(row,true);$2"))) {
                console.log(self.title + ' - ERROR: replace table failed');
            }
        } else {
//        portalTableString = portalTableString.replace(/(\}\);)(\s+table =)/s,"$1\n  cell = row.insertCell(-1);\n  cell.innerHTML = '" + '<a href="#" onclick="' + self.namespace + 'loaddetails(); return false;" style="display: inline;">Load details</a><a href="#" onclick="' + self.namespace + 'stoploaddetails(); return false;" style="display: none;">Stop loading</a>' + "';$2");
            if (portalTableString == (portalTableString = portalTableString.replace(/(\}\);)(\s+table =)/s,"$1\n  cell = row.insertCell(-1);\n  " + self.namespace + "appendLoadButton(cell);\n  row = table.insertRow(-1);\n  " + self.namespace + "appendLevelRow(row);$2"))) {
                console.log(self.title + ' - ERROR: replace table failed');
            }
        }

        /*
        container.append('<div class="disclaimer">Click on portals table headers to sort by that column. '
        + 'Click on <b>All, Neutral, Resistance, Enlightened</b> to only show portals owner by that faction or on the number behind the factions to show all but those portals.</div>');
        */
        self.disclaimerdialog = function(disclaimertext) {
            disclaimertext += `<p>${self.title} extra's:<br>
                Extra columns for portal details: shields, resonators, mods and owner.<br>
                Click on Level checkboxes to filter by portal level.<br>
                Click on Load details to load shield, resonator, mods and owner information for every portal (visible in the list).</p>
                <span style="font-style: italic; font-size: smaller">${self.title} version ${self.version} by ${self.author}</span>`;
            window.dialog({
                html: disclaimertext,
                id: "portalslistdisclaimer",
                title: "Portals list information"
            });
        };

        if (portalTableString == (portalTableString = portalTableString.replace(/(container.append\((['`])<div class="disclaimer")>(.*?)(<\/div>['`]\);)/s,'$1 style="cursor: pointer;" onclick="' + self.namespace + 'disclaimerdialog(\\$2$3\\$2)">Click here for more information$4'))) {
            console.log(self.title + ' - ERROR: replace disclaimer failed:',portalTableString);
        }

        try {
            eval('window.plugin.portalslist.portalTable = ' + portalTableString + ';');
        } catch(e) {
            console.log(self.title + ' - ERROR: eval portalTable failed',e,portalTableString);
        }

        /*
        if (window.useAndroidPanes()) {
            let portalTableString = window.plugin.portalslist.portalTable.toString();
            portalTableString = portalTableString.replace('return container','container.append(\'<a href="#" onclick="' + self.namespace + 'loaddetails(); return false;" class="portalslistbutton">Load details</a>\',\'<a href="#" onclick="' + self.namespace + 'stoploaddetails(); return false;" class="portalslistbutton">Stop loading</a>\');\n\n  return container');
            eval('window.plugin.portalslist.portalTable = ' + portalTableString + ';');
        }
        */

        // create a new getPortalObj function, using the getPortals function details, to enable updating the portals list table rows:
        let getPortalObjString = window.plugin.portalslist.getPortals.toString();
        if (getPortalObjString == (getPortalObjString = getPortalObjString.replace('()','(guid)').replace(/\{.*?var obj/s,`{
    let portal = window.plugin.portalslist.listPortals.find((el)=>{return el.portal.options.guid == guid})?.portal; // recycle existing data
    if (guid in window.portals) { // update data or options if changed
        for (let key of ['team','level']) {
            if (key in window.portals[guid].options && portal.options[key] != window.portals[guid].options[key]) portal.options[key] = window.portals[guid].options[key];
        }
        for (let key of ['title','health','level','resCount','team']) {
            if (key in window.portals[guid].options.data && portal.options.data[key] != window.portals[guid].options.data[key]) portal.options.data[key] = window.portals[guid].options.data[key];
        }
        if (!('history' in portal.options.data)) {
            portal.options.data.history = {
                captured: false,
                scoutControlled: false,
                visited: false,
                _raw: 0
            };
        }
        if ('history' in window.portals[guid].options.data) {
            for (let key of ['captured','scoutControlled','visited','_raw']) {
                if (key in window.portals[guid].options.data.history && portal.options.data.history[key] != window.portals[guid].options.data.history[key]) portal.options.data.history[key] = window.portals[guid].options.data.history[key];
            }
        }
    }
    let obj`).replace(/window\.plugin\.portalslist\.listPortals\.push.*/s,'return obj;\n}'))) {
            console.log(self.title + ' - ERROR: replace guid/var obj/return failed');
        }
        try {
            eval(self.namespace + 'getPortalObj = ' + getPortalObjString + ';');
        } catch(e) {
            console.log(self.title + ' - ERROR: eval getPortalObj failed',e,getPortalObjString);
        }

        // add extra columns
        window.plugin.portalslist.fields.push({
            title: "shields",
            value: function(portal) { return portal.options.guid; },
            sortValue: function(value, portal) { return self.gettotalshielding(portal.options.guid); },
            format: function(cell, portal, guid) {
                $(cell)
                    .addClass("alignR")
                    .append($('<span>')
                            .html(self.gettotalshielding(guid,true))
                            .attr({
                    "class": "value",
                    "style": "font-family: courier",
                }));
            },
        });
        window.plugin.portalslist.fields.push({
            title: "resonators",
            value: function(portal) { return portal.options.guid; },
            sortValue: function(value, portal) { return self.getresonatorstring(portal.options.guid,false); },
            format: function(cell, portal, guid) {
                $(cell)
                    .append($('<span>')
                            .html(self.getresonatorstring(guid,true))
                            .attr({
                    "class": "value",
                    "style": "font-family: courier",
                }));
            },
        });
        window.plugin.portalslist.fields.push({
            title: "mods",
            value: function(portal) { return portal.options.guid; },
            sortValue: function(value, portal) { return self.getmodstring(portal.options.guid,false).toLowerCase(); },
            format: function(cell, portal, guid) {
                $(cell)
                    .append($('<span>')
                            .html(self.getmodstring(guid,true))
                            .attr({
                    "class": "value",
                }));
            },
        });
        window.plugin.portalslist.fields.push({
            title: "owner",
            value: function(portal) { return portal.options.guid; },
            sortValue: function(value, portal) { return self.getportalowner(portal.options.guid).toLowerCase(); },
            format: function(cell, portal, guid) {
                $(cell)
                    .append($('<span>')
                            .html(self.getportalownerhtml(guid))
                            .attr({
                    "class": "value",
                }));
            },
        });

        window.addHook('portalDetailLoaded', function(data) { self.storedetails(data); });

        let stylesheet = document.head.appendChild(document.createElement('style'));
        stylesheet.innerHTML = `
.portalslistbutton { padding: 5px; margin-top: 3px; margin-bottom: 3px; margin-left: 5px; margin-right: 5px; border: 2px outset #20A8B1; white-space: nowrap; display: inline-block;}
tr.${self.id}-mac td { background-color: #a00!important; }
`;

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

