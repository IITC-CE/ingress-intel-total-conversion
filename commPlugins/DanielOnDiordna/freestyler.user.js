// ==UserScript==
// @author         DanielOnDiordna
// @name           Free Styler
// @category       Layer
// @version        2.2.0.20230320.000500
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/freestyler.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/freestyler.user.js
// @description    [danielondiordna-2.2.0.20230320.000500] This plugin gives you free choice to style colors and opacity for portals, links (width) and fields, including the new Machina portals and links.
// @id             freestyler@DanielOnDiordna
// @namespace      https://softspot.nl/ingress/
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.freestyler = function() {};
    var self = window.plugin.freestyler;
    self.id = 'freestyler';
    self.title = 'Free Styler';
    self.version = '2.2.0.20230320.000500';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 2.2.0.20230320.000500
- changed the menu buttons to be more clear about what they do
- added a restoreProfile function which can be called from other plugins if needed
- added change of settings detection
- added more clear messages and dialogs

version 2.1.0.20221117.195900
- renamed Machina to U̶͚̓̍N̴̖̈K̠͔̍͑̂͜N̞̥͋̀̉Ȯ̶̹͕̀W̶̢͚͑̚͝Ṉ̨̟̒̅ (as being used from IITC 0.34)
- added declaration of window.TEAM_MAC if missing (available from IITC 0.34)
- added extra values for window.TEAM_NAMES, window.COLORS if missing (available from IITC 0.34)

version 2.0.1.20221114.112200
- fixed detection and marking of Machina link placeholder portals when zoomed out to link view

version 2.0.0.20221114.003600
- added support for the new Machina portals and links

version 1.0.1.20211108.225200
- added window.TEAM_NAMES array for IITC-me support

version 1.0.0.20211103.230600
- first version
- option to enable/disable all settings
- select color and opacity for portals, fill portals, links, fields, for each faction
- select color and opacity for selected portal
- store, restore, import and export (share) profiles
- modified colorpicker code to support default value and alpha only input
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.localstoragesettings = 'plugin-' + self.id + '-settings';
    self.localstorageprofiles = 'plugin-' + self.id + '-profiles';
    self.localstoragespectrum = 'plugin-' + self.id + '-spectrum';

    // moved to setup function:
    self.defaultsettings = {};
    self.settings = {};
    self.profiles = {};
    self.spectrumoptions = {};
    self.spectrumopacityoptions = {};
    self.TEAM_SELECTED = 4;

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

        // add MACHINA values if missing
        if (target.linkcolor.length < self.defaultsettings.linkcolor.length) target.linkcolor.push(self.defaultsettings.linkcolor[window.TEAM_MAC]);
        if (target.linkweight.length < self.defaultsettings.linkweight.length) target.linkweight.push(self.defaultsettings.linkweight[window.TEAM_MAC]);
        if (target.linkopacity.length < self.defaultsettings.linkopacity.length) target.linkopacity.push(self.defaultsettings.linkopacity[window.TEAM_MAC]);
        if (target.portalcolor.length < self.defaultsettings.portalcolor.length) {
            let selectedportalcolor = target.portalcolor[3]; // old TEAM_SELECTED value was 3, moved to 4 when TEAM_MAC was added
            target.portalcolor[3] = self.defaultsettings.portalcolor[window.TEAM_MAC];
            target.portalcolor.push(selectedportalcolor);
        }
        if (target.portalopacity.length < self.defaultsettings.portalopacity.length) {
            let selectedportalopacity = target.portalopacity[3]; // old TEAM_SELECTED value was 3, moved to 4 when TEAM_MAC was added
            target.portalopacity[3] = self.defaultsettings.portalopacity[window.TEAM_MAC];
            target.portalopacity.push(selectedportalopacity);
        }
        if (target.portalfillcolor.length < self.defaultsettings.portalfillcolor.length) target.portalfillcolor.push(self.defaultsettings.portalfillcolor[window.TEAM_MAC]);
        if (target.portalfillopacity.length < self.defaultsettings.portalfillopacity.length) target.portalfillopacity.push(self.defaultsettings.portalfillopacity[window.TEAM_MAC]);
    }

    self.restoresettings = function() {
        if (typeof localStorage[self.localstoragesettings] != 'string' || localStorage[self.localstoragesettings] == '') return;

        try {
            let settings = JSON.parse(localStorage[self.localstoragesettings]);
            parseSettings(settings,self.settings);
        } catch(e) {
            return false;
        }

        // convert old settings here if needed
    };
    self.storesettings = function() {
        localStorage[self.localstoragesettings] = JSON.stringify(self.settings);
    };

    self.settingsChanged = function(selectedprofile) {
        // check if settings are changed for selected profile
        if (!selectedprofile) selectedprofile = self.settings.selectedprofile;
        if (!selectedprofile) return true;
        let storedsettings;
        if (isObject(selectedprofile)) {
            storedsettings = selectedprofile;
        } else {
            if (!(selectedprofile in self.profiles)) return true;
            storedsettings = JSON.parse(self.profiles[selectedprofile]);
        }
        for (let key in self.settings) {
            if (self.settings[key] instanceof Array) {
                if (!(key in storedsettings)) return true;
                if (!(storedsettings[key] instanceof Array)) return true;
                for (let index in self.settings[key]) {
                    if (!(index in storedsettings[key])) return true;
                    if (storedsettings[key][index] != self.settings[key][index]) return true;
                }
            }
        }
        return false;
    };

    self.restoreprofiles = function() {
        if (typeof localStorage[self.localstorageprofiles] != 'string' || localStorage[self.localstorageprofiles] == '') return;
        try {
            self.profiles = JSON.parse(localStorage[self.localstorageprofiles]);
        } catch(e) {
            return false;
        }
    };

    self.storeprofiles = function() {
        localStorage[self.localstorageprofiles] = JSON.stringify(self.profiles);
    };

    self.isMachinaPortal = function(portal) {
        if (portal.options.team == window.TEAM_ENL || portal.options.team == window.TEAM_RES) return false;
        if (portal.options.team == window.TEAM_MAC) return true; // works from IITC 0.34
        if (portal.options.data.resCount > 0) {
            // portal.options.team = window.TEAM_MAC;
            portal.options.level = parseInt(portal.options.ent[2][4]);
            return true;
        }
        if (portal.options.data.resCount === 0) return false;
        // only if resCount is undefined, check all links for matching origin or destination match

        // Be aware: a placeholder portal is always drawn before the link is drawn, so most of the time there is no link yet to check for a match, unless the portal has multiple links
        let portallatlng = portal.getLatLng();
        let machinalinkplaceholderfound = false;
        for (let id in window.links) {
            let link = window.links[id];
            if (portal.options.guid == link.options.data.oGuid || portal.options.guid == link.options.data.dGuid) {
                machinalinkplaceholderfound = true;
                // portal.options.team = window.TEAM_MAC;
                portal.options.level = parseInt(portal.options.ent[2][4]);
                break;
            }
        }
        return machinalinkplaceholderfound;
    };

    self.applyPortalStyle = function(portal,selected,teamoverride) {
        if (!portal || !portal.setStyle) return;

        if (typeof selected != 'boolean') selected = (portal.options.guid === window.selectedPortal);
        if (!self.settings.enabled) {
            window.setMarkerStyle(portal,selected);
            return;
        }

        let portalteam = (typeof teamoverride == 'number' ? teamoverride : portal.options.team); // 0 = NEUTRAL, 1 = RES, 2 = ENL
        if (portalteam != window.TEAM_MAC && self.isMachinaPortal(portal)) portalteam = window.TEAM_MAC; // 3 = MACHINA

        let styleOptions = window.getMarkerStyleOptions(portal.options);
        styleOptions = {
            ...styleOptions,
            color: self.settings.portalcolor[portalteam],
            opacity: self.settings.portalopacity[portalteam],
            fillColor: self.settings.portalfillcolor[portalteam],
            fillOpacity: self.settings.portalfillopacity[portalteam]
        };

        portal.setStyle(styleOptions);

        window.highlightPortal(portal);

        if (selected) {
            portal.setStyle({
                color: self.settings.portalcolor[self.TEAM_SELECTED],
                opacity: self.settings.portalopacity[self.TEAM_SELECTED]
            });
        }
    };
    self.applyLinkStyle = function(link) {
        if (!link || !link.setStyle) return;
        if (!link.options.hasOwnProperty('faked')) {
            link.options.faked = link.options.weight == 1;
        }

        let linkteam = link.options.team; // 0 = NEUTRAL, 1 = RES, 2 = ENL
        if (linkteam == 0) linkteam = window.TEAM_MAC; // 3 = MACHINA

        let settings = JSON.parse(JSON.stringify((!self.settings.enabled?self.defaultsettings:self.settings))); // hard copy
        link.setStyle(
            {
                weight: settings.linkweight[linkteam] / (link.options.faked?2:1),
                color: settings.linkcolor[linkteam],
                opacity: settings.linkopacity[linkteam]
            }
        );
        if (linkteam == window.TEAM_MAC) {
            // update the portal placeholders
            // placeholders portals are drawn before the link itself is drawn; and the link is even drawn after the hook is executed
            self.applyPortalStyle(window.portals[link.options.data.oGuid],undefined,linkteam);
            self.applyPortalStyle(window.portals[link.options.data.dGuid],undefined,linkteam);
        }
    };
    self.applyFieldStyle = function(field) {
        if (!field || !field.setStyle) return;
        let settings = JSON.parse(JSON.stringify((!self.settings.enabled?self.defaultsettings:self.settings))); // hard copy
        field.setStyle(
            {
                fillColor: settings.fieldcolor[field.options.team],
                fillOpacity: settings.fieldopacity[field.options.team]
            });
    };

    self.updatePortals = function(team) {
        if (team == self.TEAM_SELECTED) {
            if (window.selectedPortal in window.portals) {
                self.applyPortalStyle(window.portals[window.selectedPortal],true);
            }
            return;
        }
        for (let portalguid in window.portals) {

            let portalteam = window.portals[portalguid].options.team; // 0 = NEUTRAL, 1 = RES, 2 = ENL
            if (portalteam == 0 && window.portals[portalguid].options.data.resCount > 0) portalteam = window.TEAM_MAC; // 3 = MACHINA

            if (typeof team == "undefined" || portalteam == team) {
                self.applyPortalStyle(window.portals[portalguid]);
            }
        }
    };
    self.updateLinks = function(team) {
        for (let linkguid in window.links) {

            let linkteam = window.links[linkguid].options.team; // 0 = NEUTRAL, 1 = RES, 2 = ENL
            if (linkteam == 0) linkteam = window.TEAM_MAC; // 3 = MACHINA

            if (typeof team == "undefined" || linkteam == team) {
                self.applyLinkStyle(window.links[linkguid]);
            }
        }
    };
    self.updateFields = function(team) {
        for (let fieldguid in window.fields) {
            if (typeof team == "undefined" || window.fields[fieldguid].options.team == team) {
                self.applyFieldStyle(window.fields[fieldguid]);
            }
        }
    };

    self.setPortalColor = function(color,opacity,team) {
        self.settings.portalcolor[team] = color;
        self.settings.portalopacity[team] = opacity;
        self.storesettings();
        self.updatePortals(team);
    };
    self.setPortalFillColor = function(color,opacity,team) {
        self.settings.portalfillcolor[team] = color;
        self.settings.portalfillopacity[team] = opacity;
        self.storesettings();
        self.updatePortals(team);
    };
    self.setLinkColor = function(color,opacity,team) {
        self.settings.linkcolor[team] = color;
        self.settings.linkopacity[team] = opacity;
        self.storesettings();
        self.updateLinks(team);
    };
    self.setLinkWeight = function(weight,team) {
        self.settings.linkweight[team] = weight;
        self.storesettings();
        self.updateLinks(team);
    };
    self.setFieldColor = function(color,opacity,team) {
        self.settings.fieldcolor[team] = color;
        self.settings.fieldopacity[team] = opacity;
        self.storesettings();
        self.updateFields(team);
    };

    self.import = function() {
        let data = prompt("Paste a profile to import:");
        if (!data) return;
        try {
            let settings = JSON.parse(data);
            if (!self.settingsChanged(settings)) {
                alert("Import\n\nThe imported settings are the same as the current settings.");
                return;
            }
            if (self.settingsChanged() && !confirm("Import\n\nThe current settings are not stored in a profile.\nAre you sure you want to replace the current settings?")) return;
            let oldsettings_enabled = self.settings.enabled;
            let oldsettings_selectedprofile = self.settings.selectedprofile;
            parseSettings(settings,self.settings);
            self.settings.enabled = oldsettings_enabled;
            self.settings.selectedprofile = oldsettings_selectedprofile;
            self.storesettings();
            self.updatePortals();
            self.updateFields();
            self.updateLinks();
            showNotification("Settings imported successfully");
        } catch(e) {
            showNotification("Import profile\n\nRestoring profile settings failed.");
        }
    };

    self.export = function() {
        let exportdata = JSON.parse(JSON.stringify(self.settings)); // hard copy
        delete(exportdata.enabled);
        delete(exportdata.selectedprofile);
        let data = JSON.stringify(exportdata);
        navigator.clipboard.writeText(data).then(function() {
            showNotification('Current settings copied to your clipboard');
        }, function() {
            prompt('Select and copy these settings:',data);
        });
    };

    self.loaddefaultsettings = function() {
        let oldsettings_enabled = self.settings.enabled;
        let oldsettings_selectedprofile = self.settings.selectedprofile;
        self.settings = JSON.parse(JSON.stringify(self.defaultsettings)); // hard copy
        self.settings.enabled = oldsettings_enabled;
        self.settings.selectedprofile = oldsettings_selectedprofile;
        self.storesettings();
        self.updatePortals();
        self.updateFields();
        self.updateLinks();
    };

    self.restoreProfile = function(profile) {
        if (!(profile in self.profiles)) return;
        try {
            let settings = JSON.parse(self.profiles[profile]);
            parseSettings(settings,self.settings);
            self.settings.enabled = true;
            self.settings.selectedprofile = profile;
            self.storesettings();
            self.updatePortals();
            self.updateFields();
            self.updateLinks();
        } catch(e) {
            showNotification("Selected profile: " + profile + "\n\nRestoring profile settings failed.");
        }
        self.updateMenu();
    };

    self.about = function() {
        let container = document.createElement('div');

        container.innerHTML = `
<p>With this plugin you are free to style all colors and opacity (alpha/visibility) for every portal, link and field. Portals have a separate color and opacity setting for the edge and the fill center. Links width can be changed. There are ofcourse no link and field settings for Neutral faction, but there are Machina portals and links now.</p>

<p>By default all colors for portals, links and fields are the same within each faction.<br>
This can make it confusing to spot portals under a multilayer field.<br>
Now you are free to create your own settings profile.</p>

<p>You can store multiple profiles, so you can switch between profiles.<br>
You can also export (to clipboard), share and import (paste) your settings.</p>

<p>Highlighters can still alter the style of portals.</p>

<div class="${self.id}author">${self.title} version ${self.version} by ${self.author}</div>
`;

        window.dialog({
            html: container,
            id: self.id,
            title: self.title + ' - About',
            width: 'auto'
        }).dialog('option', 'buttons', {
            '< Main menu': function() { self.menu(); },
            'Changelog': function() { alert(self.changelog); },
            'Close': function() { $(this).dialog('close'); },
        });
    };

    self.updateMenu = function() {
        if (`dialog-${self.id}` in window.DIALOGS) {
            self.menu();
        }
    };

    self.menu = function() {
        let container = document.createElement('div');
        container.className = self.id + 'menu';

        let hiddenautofocusinput = container.appendChild(document.createElement('input')); // added to prevent auto focus on first element
        hiddenautofocusinput.type = 'hidden';
        hiddenautofocusinput.autofocus = 'autofocus';

        let enablecheckboxarea = container.appendChild(document.createElement('label'));
        let enablecheckbox = enablecheckboxarea.appendChild(document.createElement('input'));
        enablecheckbox.type = 'checkbox';
        enablecheckbox.checked = self.settings.enabled;
        enablecheckbox.addEventListener('change', function (e) {
            e.preventDefault();
            self.settings.enabled = this.checked;
            self.storesettings();
            self.updatePortals();
            self.updateFields();
            self.updateLinks();
        }, false);
        enablecheckboxarea.appendChild(document.createTextNode('Enable these settings:'));

        let table = container.appendChild(document.createElement('table'));

        let thead = table.appendChild(document.createElement('thead'));
        let theadtr = thead.appendChild(document.createElement('tr'));
        ['Faction:','Portals:','fill:','Links:','Fields:'].forEach(function(columntext) {
            let td = theadtr.appendChild(document.createElement('td'));
            td.textContent = columntext;
        });

        let tbody = table.appendChild(document.createElement('tbody'));
        (window.teamStringToId(window.PLAYER.team) == window.TEAM_RES?[window.TEAM_NAMES[window.TEAM_RES],window.TEAM_NAMES[window.TEAM_ENL],window.TEAM_NAMES[window.TEAM_NONE],window.TEAM_NAMES[window.TEAM_MAC],'Selected']:[window.TEAM_NAMES[window.TEAM_ENL],window.TEAM_NAMES[window.TEAM_RES],window.TEAM_NAMES[window.TEAM_NONE],window.TEAM_NAMES[window.TEAM_MAC],'Selected']).forEach(function(rowtext) {
            let team = (rowtext == "Selected" ? self.TEAM_SELECTED : (rowtext == window.TEAM_NAMES[window.TEAM_MAC] ? window.TEAM_MAC : window.teamStringToId(rowtext[0])));
            let tr = tbody.appendChild(document.createElement('tr'));
            ['Faction:','Portals:','fill:','Links:','Fields:'].forEach(function(columntext) {
                let td = tr.appendChild(document.createElement('td'));
                switch(columntext) {
                    case 'Faction:':
                        td.textContent = rowtext;
                        break;
                    case 'Portals:':
                        if (true) {
                            let inputportalcolor = td.appendChild(document.createElement('input'));
                            let inputportalopacity = td.appendChild(document.createElement('input'));
                            $(inputportalcolor).spectrum2($.extend(true,self.spectrumoptions,{
                                defaultValue: self.defaultsettings.portalcolor[team],
                                change: function(color) { self.setPortalColor(color.toHexString(),self.settings.portalopacity[team],team); $(inputportalopacity).spectrum2("set",window.tinycolor2(self.settings.portalcolor[team]).setAlpha(self.settings.portalopacity[team])); },
                                color: self.settings.portalcolor[team]
                            }));
                            $(inputportalopacity).spectrum2($.extend(true,self.spectrumopacityoptions,{
                                defaultValue: self.defaultsettings.portalopacity[team],
                                change: function(color) { self.setPortalColor(color.toHexString(),color.getAlpha(),team); },
                                color: window.tinycolor2(self.settings.portalcolor[team]).setAlpha(self.settings.portalopacity[team])
                            }));
                        }
                        break;
                    case 'fill:':
                        if (team != self.TEAM_SELECTED) {
                            let inputportalfillcolor = td.appendChild(document.createElement('input'));
                            let inputportalfillopacity = td.appendChild(document.createElement('input'));
                            $(inputportalfillcolor).spectrum2($.extend(true,self.spectrumoptions,{
                                defaultValue: self.defaultsettings.portalfillcolor[team],
                                change: function(color) { self.setPortalFillColor(color.toHexString(),self.settings.portalfillopacity[team],team); $(inputportalfillopacity).spectrum2("set",window.tinycolor2(self.settings.portalfillcolor[team]).setAlpha(self.settings.portalfillopacity[team])); },
                                color: self.settings.portalfillcolor[team]
                            }));
                            $(inputportalfillopacity).spectrum2($.extend(true,self.spectrumopacityoptions,{
                                defaultValue: self.defaultsettings.portalfillopacity[team],
                                change: function(color) { self.setPortalFillColor(color.toHexString(),color.getAlpha(),team); },
                                color: window.tinycolor2(self.settings.portalfillcolor[team]).setAlpha(self.settings.portalfillopacity[team])
                            }));
                        }
                        break;
                    case 'Links:':
                        if (team != window.TEAM_NONE && team != self.TEAM_SELECTED) {
                            let inputlinkcolor = td.appendChild(document.createElement('input'));
                            let inputlinkopacity = td.appendChild(document.createElement('input'));
                            $(inputlinkcolor).spectrum2($.extend(true,self.spectrumoptions,{
                                defaultValue: self.defaultsettings.linkcolor[team],
                                change: function(color) { self.setLinkColor(color.toHexString(),self.settings.linkopacity[team],team); $(inputlinkopacity).spectrum2("set",window.tinycolor2(self.settings.linkcolor[team]).setAlpha(self.settings.linkopacity[team])); },
                                color: self.settings.linkcolor[team]
                            }));
                            $(inputlinkopacity).spectrum2($.extend(true,self.spectrumopacityoptions,{
                                defaultValue: self.defaultsettings.linkopacity[team],
                                change: function(color) { self.setLinkColor(color.toHexString(),color.getAlpha(),team); },
                                color: window.tinycolor2(self.settings.linkcolor[team]).setAlpha(self.settings.linkopacity[team])
                            }));
                            let linkwidthselect = td.appendChild(document.createElement('select'));
                            linkwidthselect.style.width = '40px';
                            for (let width = 1; width <= 10; width++) {
                                let widthoption = linkwidthselect.appendChild(document.createElement('option'));
                                widthoption.value = width;
                                widthoption.textContent = width + (width == self.defaultsettings.linkweight[team]?' (default)':'');
                                widthoption.selected = width == self.settings.linkweight[team];
                            }
                            linkwidthselect.addEventListener('change', function (e) {
                                e.preventDefault();
                                self.setLinkWeight(this.value,team);
                            });
                        }
                        break;
                    case 'Fields:':
                        if (team != window.TEAM_NONE && team != self.TEAM_SELECTED && team != window.TEAM_MAC) {
                            let inputfieldcolor = td.appendChild(document.createElement('input'));
                            let inputfieldopacity = td.appendChild(document.createElement('input'));
                            $(inputfieldcolor).spectrum2($.extend(true,self.spectrumoptions,{
                                defaultValue: self.defaultsettings.fieldcolor[team],
                                change: function(color) { self.setFieldColor(color.toHexString(),self.settings.fieldopacity[team],team); $(inputfieldopacity).spectrum2("set",window.tinycolor2(self.settings.fieldcolor[team]).setAlpha(self.settings.fieldopacity[team])); },
                                color: self.settings.fieldcolor[team]
                            }));
                            $(inputfieldopacity).spectrum2($.extend(true,self.spectrumopacityoptions,{
                                defaultValue: self.defaultsettings.fieldopacity[team],
                                change: function(color) { self.setFieldColor(color.toHexString(),color.getAlpha(),team); },
                                color: window.tinycolor2(self.settings.fieldcolor[team]).setAlpha(self.settings.fieldopacity[team])
                            }));
                        }
                        break;
                }
            });
        });

        let defaultsbutton = container.appendChild(document.createElement('button'));
        defaultsbutton.textContent = 'Load defaults...';
        defaultsbutton.addEventListener('click', function (e) {
            e.preventDefault();
            if (!self.settingsChanged(self.defaultsettings)) {
                alert("Load defaults\n\nThe current settings are already the same as the default values.");
                return;
            }
            if (self.settingsChanged() && !confirm("Load defaults\n\nThe current settings are not stored in a profile.\nAre you sure you want to replace your settings with the default values?")) return;
            self.loaddefaultsettings();
            self.menu();
        }, false);
        let importbutton = container.appendChild(document.createElement('button'));
        importbutton.textContent = 'Import...';
        importbutton.style.marginLeft = '5px';
        importbutton.addEventListener('click', function (e) {
            e.preventDefault();
            self.import();
            self.menu();
        }, false);
        let exportbutton = container.appendChild(document.createElement('button'));
        exportbutton.textContent = 'Export...';
        exportbutton.style.marginLeft = '5px';
        exportbutton.addEventListener('click', function (e) {
            e.preventDefault();
            self.export();
        }, false);

        let profilearea = container.appendChild(document.createElement('div'));
        profilearea.textContent = 'Profiles:';
        let profileselect = profilearea.appendChild(document.createElement('select'));
        profileselect.style.marginLeft = '5px';
        profileselect.style.width = '100%';

        if (Object.keys(self.profiles).length == 0) {
            profileselect.disabled = true;
            let profileoption = profileselect.appendChild(document.createElement('option'));
            profileoption.value = '';
            profileoption.textContent = '(nothing stored)';
        }
        for (let profile in self.profiles) {
            let profileoption = profileselect.appendChild(document.createElement('option'));
            profileoption.value = profile;
            profileoption.textContent = profile;
            profileoption.selected = profile == self.settings.selectedprofile;
        }

        profilearea.appendChild(document.createElement('br'));

        let profileopenbutton = profilearea.appendChild(document.createElement('button'));
        profileopenbutton.style.marginLeft = '5px';
        profileopenbutton.textContent = 'Restore...';
        profileopenbutton.disabled = Object.keys(self.profiles).length == 0;
        profileopenbutton.addEventListener('click', function (e) {
            e.preventDefault();
            if (!profileselect.value) return;
            if (!self.settingsChanged(profileselect.value)) {
                alert("Restore\n\nSelected profile: " + profileselect.value + "\n\nThe current settings are already the same as the selected profile.");
                if (self.settings.selectedprofile != profileselect.value) {
                    self.settings.selectedprofile = profileselect.value;
                    self.storesettings();
                }
                return;
            }
            if (!confirm("Restore\n\nSelected profile: " + profileselect.value + "\n\nAre you sure you want to replace all settings with the stored values?")) return;
            self.restoreProfile(profileselect.value);
        }, false);
        let profileupdatebutton = profilearea.appendChild(document.createElement('button'));
        profileupdatebutton.style.marginLeft = '5px';
        profileupdatebutton.style.minWidth = '25px';
        profileupdatebutton.textContent = 'Save...';
        profileupdatebutton.addEventListener('click', function (e) {
            e.preventDefault();
            if (profileselect.value && !self.settingsChanged(profileselect.value)) {
                alert("Save\n\nSelected profile: " + profileselect.value + "\n\nNothing changed");
                return;
            }
            let profile = (profileselect.value ? (confirm("Save\n\nSelected profile: " + profileselect.value + "\n\nSave and overwrite existing profile?") ? profileselect.value : undefined) : prompt("Enter a new profile name: ") );
            if (!profile) return;
            self.profiles[profile] = JSON.stringify(self.settings);
            self.settings.selectedprofile = profile;
            self.storesettings();
            self.storeprofiles();
            self.updatePortals();
            self.updateFields();
            self.updateLinks();
            self.menu();
        }, false);
        let profileaddbutton = profilearea.appendChild(document.createElement('button'));
        profileaddbutton.style.marginLeft = '5px';
        profileaddbutton.style.minWidth = '25px';
        profileaddbutton.textContent = 'Save as...';
        profileaddbutton.addEventListener('click', function (e) {
            e.preventDefault();
            let profile = prompt("Enter a new profile name: ");
            if (!profile) return;
            if (profile in self.profiles) {
                alert('Save as\n\nNew profile name: ' + profile + "\n\nProfile already exists. To replace, select profile name and use the Save button.");
                return;
            }
            self.profiles[profile] = JSON.stringify(self.settings);
            self.settings.selectedprofile = profile;
            self.storesettings();
            self.storeprofiles();
            self.updatePortals();
            self.updateFields();
            self.updateLinks();
            self.menu();
        }, false);
        let profiledelbutton = profilearea.appendChild(document.createElement('button'));
        profiledelbutton.style.marginLeft = '5px';
        profiledelbutton.style.minWidth = '25px';
        profiledelbutton.textContent = 'Delete...';
        profiledelbutton.disabled = Object.keys(self.profiles).length == 0;
        profiledelbutton.addEventListener('click', function (e) {
            e.preventDefault();
            if (!profileselect.value || !confirm("Delete\n\nSelected profile: " + profileselect.value + "\n\nAre you sure you want to delete this profile?")) return;
            delete(self.profiles[profileselect.value]);
            self.settings.selectedprofile = '';
            self.storesettings();
            self.storeprofiles();
            self.updatePortals();
            self.updateFields();
            self.updateLinks();
            self.menu();
        }, false);

        let author = container.appendChild(document.createElement('div'));
        author.className = self.id + 'author';
        author.textContent = self.title + ' version ' + self.version + ' by ' + self.author;

        if (window.useAndroidPanes()) window.show("map");

        let position = (`dialog-${self.id}` in window.DIALOGS ? $(window.DIALOGS[`dialog-${self.id}`]).dialog('option','position') : { my: "center", at: "middle" });
        window.dialog({
            html: container,
            id: self.id,
            title: self.title,
            width: 'auto',
            position: position
        }).dialog('option', 'buttons', {
            'About': function() { self.about(); },
            'Close': function() { $(this).dialog('close'); }
        });
    };

    self.setupSetMarkerStyle = function() {
        // make sure the self.applyPortalStyle is executed instead of setMarkerStyle
        let setMarkerStyle_string = window.setMarkerStyle.toString();
        setMarkerStyle_string = setMarkerStyle_string.replace(/\{/,`{\n  if (${self.namespace}settings.enabled) {\n    ${self.namespace}applyPortalStyle(marker,selected);\n    return;\n  }`);
        eval('window.setMarkerStyle = ' + setMarkerStyle_string + ';');
    };

    self.setupResetHighlightedPortals = function() {
        // replace the setMarkerStyle call with self.applyPortalStyle
        let resetHighlightedPortals_string = window.resetHighlightedPortals.toString();
        resetHighlightedPortals_string = resetHighlightedPortals_string.replace(/(setMarkerStyle.*?;)/,`${self.namespace}applyPortalStyle(portal);`);
        eval('window.resetHighlightedPortals = ' + resetHighlightedPortals_string + ';');
    };

    function showNotification(notificationText) {
        let className = '.' + self.id + 'notification';
        $(className).hide(); // force hide if old notification is still fading out
        let notification = $(className).text(notificationText); // inject as plain text to support html as plain text
        notification.html(notification.html().replace(/\n/g, '<br/>'));
        $(className).show();
        window.clearTimeout(self.notificationTimer);
        self.notificationTimer = window.setTimeout(function () {
            $(className).fadeOut(400);
        }, 3000); // show 3 seconds, then fade out over 0.4 seconds
    }

    self.setupColorpickerSpectrum = function() {
        // source: https://github.com/bgrins/spectrum
        // modified to support alpha input
        // modified to support default value
        // changed spectrum to spectrum2
        // changed tinycolor to tinycolor2

        // Spectrum Colorpicker v1.8.1
        // https://github.com/bgrins/spectrum
        // Author: Brian Grinstead
        // License: MIT

        (function (factory) {
            "use strict";

            if (typeof define === 'function' && define.amd) { // AMD
                define(['jquery'], factory);
            }
            else if (typeof exports == "object" && typeof module == "object") { // CommonJS
                module.exports = factory(require('jquery'));
            }
            else { // Browser
                factory(jQuery);
            }
        })(function($, undefined) {
            "use strict";

            var defaultOpts = {

                // Callbacks
                beforeShow: noop,
                move: noop,
                change: noop,
                show: noop,
                hide: noop,

                // Options
                color: false,
                showPicker: true,
                flat: false,
                showInput: false,
                allowEmpty: false,
                showButtons: true,
                clickoutFiresChange: true,
                showInitial: false,
                showPalette: false,
                showPaletteOnly: false,
                hideAfterPaletteSelect: false,
                togglePaletteOnly: false,
                showSelectionPalette: true,
                localStorageKey: false,
                appendTo: "body",
                maxSelectionSize: 7,
                defaultValue: false,
                defaultText: "default",
                cancelText: "cancel",
                chooseText: "choose",
                togglePaletteMoreText: "more",
                togglePaletteLessText: "less",
                clearText: "Clear Color Selection",
                noColorSelectedText: "No Color Selected",
                preferredFormat: false,
                className: "", // Deprecated - use containerClassName and replacerClassName instead.
                containerClassName: "",
                replacerClassName: "",
                showAlpha: false,
                theme: "sp2-light",
                palette: [["#ffffff", "#000000", "#ff0000", "#ff8000", "#ffff00", "#008000", "#0000ff", "#4b0082", "#9400d3"]],
                selectionPalette: [],
                disabled: false,
                offset: null
            },
                spectrums = [],
                IE = !!/msie/i.exec( window.navigator.userAgent ),
                rgbaSupport = (function() {
                    function contains( str, substr ) {
                        return !!~('' + str).indexOf(substr);
                    }

                    var elem = document.createElement('div');
                    var style = elem.style;
                    style.cssText = 'background-color:rgba(0,0,0,.5)';
                    return contains(style.backgroundColor, 'rgba') || contains(style.backgroundColor, 'hsla');
                })(),
                replaceInput = [
                    "<div class='sp2-replacer'>",
                    "<div class='sp2-preview'><div class='sp2-preview-inner'></div></div>",
                    "<div class='sp2-dd'>&#9660;</div>",
                    "</div>"
                ].join(''),
                markup = (function () {

                    // IE does not support gradients with multiple stops, so we need to simulate
                    //  that for the rainbow slider with 8 divs that each have a single gradient
                    var gradientFix = "";
                    if (IE) {
                        for (var i = 1; i <= 6; i++) {
                            gradientFix += "<div class='sp2-" + i + "'></div>";
                        }
                    }

                    return [
                        "<div class='sp2-container sp2-hidden'>",
                        "<div class='sp2-palette-container'>",
                        "<div class='sp2-palette sp2-thumb sp2-cf'></div>",
                        "<div class='sp2-palette-button-container sp2-cf'>",
                        "<button type='button' class='sp2-palette-toggle'></button>",
                        "</div>",
                        "</div>",
                        "<div class='sp2-picker-container'>",
                        "<div class='sp2-top sp2-cf'>",
                        "<div class='sp2-fill'></div>",
                        "<div class='sp2-top-inner'>",
                        "<div class='sp2-color'>",
                        "<div class='sp2-sat'>",
                        "<div class='sp2-val'>",
                        "<div class='sp2-dragger'></div>",
                        "</div>",
                        "</div>",
                        "</div>",
                        "<div class='sp2-clear sp2-clear-display'>",
                        "</div>",
                        "<div class='sp2-hue'>",
                        "<div class='sp2-slider'></div>",
                        gradientFix,
                        "</div>",
                        "</div>",
                        "<div class='sp2-alpha'><div class='sp2-alpha-inner'><div class='sp2-alpha-handle'></div></div></div>",
                        "</div>",
                        "<div class='sp2-input-container sp2-cf'>",
                        "<input class='sp2-input' type='text' spellcheck='false'  />",
                        "</div>",
                        "<div class='sp2-initial sp2-thumb sp2-cf'></div>",
                        "<div class='sp2-button-container sp2-cf'>",
                        "<a class='sp2-default' href='#'></a>",
                        "<a class='sp2-cancel' href='#'></a>",
                        "<button type='button' class='sp2-choose'></button>",
                        "</div>",
                        "</div>",
                        "</div>"
                    ].join("");
                })();

            function paletteTemplate (p, color, className, opts) {
                var html = [];
                for (var i = 0; i < p.length; i++) {
                    var current = p[i];
                    if(current) {
                        var tiny = tinycolor2(current);
                        var c = tiny.toHsl().l < 0.5 ? "sp2-thumb-el sp2-thumb-dark" : "sp2-thumb-el sp2-thumb-light";
                        c += (tinycolor2.equals(color, current)) ? " sp2-thumb-active" : "";
                        var formattedString = tiny.toString(opts.preferredFormat || "rgb");
                        var swatchStyle = rgbaSupport ? ("background-color:" + tiny.toRgbString()) : "filter:" + tiny.toFilter();
                        html.push('<span title="' + formattedString + '" data-color="' + tiny.toRgbString() + '" class="' + c + '"><span class="sp2-thumb-inner" style="' + swatchStyle + ';"></span></span>');
                    } else {
                        var cls = 'sp2-clear-display';
                        html.push($('<div />')
                                  .append($('<span data-color="" style="background-color:transparent;" class="' + cls + '"></span>')
                                          .attr('title', opts.noColorSelectedText)
                                         )
                                  .html()
                                 );
                    }
                }
                return "<div class='sp2-cf " + className + "'>" + html.join('') + "</div>";
            }

            function hideAll() {
                for (var i = 0; i < spectrums.length; i++) {
                    if (spectrums[i]) {
                        spectrums[i].hide();
                    }
                }
            }

            function instanceOptions(o, callbackContext) {
                var opts = $.extend({}, defaultOpts, o);
                opts.callbacks = {
                    'move': bind(opts.move, callbackContext),
                    'change': bind(opts.change, callbackContext),
                    'show': bind(opts.show, callbackContext),
                    'hide': bind(opts.hide, callbackContext),
                    'beforeShow': bind(opts.beforeShow, callbackContext)
                };

                return opts;
            }

            function spectrum2(element, o) {

                var opts = instanceOptions(o, element),
                    flat = opts.flat,
                    showSelectionPalette = opts.showSelectionPalette,
                    localStorageKey = opts.localStorageKey,
                    theme = opts.theme,
                    callbacks = opts.callbacks,
                    resize = throttle(reflow, 10),
                    visible = false,
                    isDragging = false,
                    dragWidth = 0,
                    dragHeight = 0,
                    dragHelperHeight = 0,
                    slideHeight = 0,
                    slideWidth = 0,
                    alphaWidth = 0,
                    alphaSlideHelperWidth = 0,
                    slideHelperHeight = 0,
                    currentHue = 0,
                    currentSaturation = 0,
                    currentValue = 0,
                    currentAlpha = 1,
                    palette = [],
                    paletteArray = [],
                    paletteLookup = {},
                    selectionPalette = opts.selectionPalette.slice(0),
                    maxSelectionSize = opts.maxSelectionSize,
                    draggingClass = "sp2-dragging",
                    shiftMovementDirection = null;

                var doc = element.ownerDocument,
                    body = doc.body,
                    boundElement = $(element),
                    disabled = false,
                    container = $(markup, doc).addClass(theme),
                    pickerContainer = container.find(".sp2-picker-container"),
                    dragger = container.find(".sp2-color"),
                    dragHelper = container.find(".sp2-dragger"),
                    slider = container.find(".sp2-hue"),
                    slideHelper = container.find(".sp2-slider"),
                    alphaSliderInner = container.find(".sp2-alpha-inner"),
                    alphaSlider = container.find(".sp2-alpha"),
                    alphaSlideHelper = container.find(".sp2-alpha-handle"),
                    textInput = container.find(".sp2-input"),
                    paletteContainer = container.find(".sp2-palette"),
                    initialColorContainer = container.find(".sp2-initial"),
                    defaultButton = container.find(".sp2-default"),
                    cancelButton = container.find(".sp2-cancel"),
                    clearButton = container.find(".sp2-clear"),
                    chooseButton = container.find(".sp2-choose"),
                    toggleButton = container.find(".sp2-palette-toggle"),
                    isInput = boundElement.is("input"),
                    isInputTypeColor = isInput && boundElement.attr("type") === "color" && inputTypeColorSupport(),
                    shouldReplace = isInput && !flat,
                    replacer = (shouldReplace) ? $(replaceInput).addClass(theme).addClass(opts.className).addClass(opts.replacerClassName) : $([]),
                    offsetElement = (shouldReplace) ? replacer : boundElement,
                    previewElement = replacer.find(".sp2-preview-inner"),
                    initialColor = opts.color || (isInput && boundElement.val()),
                    colorOnShow = false,
                    currentPreferredFormat = opts.preferredFormat,
                    clickoutFiresChange = !opts.showButtons || opts.clickoutFiresChange,
                    isEmpty = !initialColor,
                    allowEmpty = opts.allowEmpty && !isInputTypeColor;

                function applyOptions() {

                    if (opts.showPaletteOnly) {
                        opts.showPalette = true;
                    }

                    toggleButton.text(opts.showPaletteOnly ? opts.togglePaletteMoreText : opts.togglePaletteLessText);

                    if (opts.palette) {
                        palette = opts.palette.slice(0);
                        paletteArray = Array.isArray(palette[0]) ? palette : [palette];
                        paletteLookup = {};
                        for (var i = 0; i < paletteArray.length; i++) {
                            for (var j = 0; j < paletteArray[i].length; j++) {
                                var rgb = tinycolor2(paletteArray[i][j]).toRgbString();
                                paletteLookup[rgb] = true;
                            }
                        }
                    }

                    container.toggleClass("sp2-flat", flat);
                    container.toggleClass("sp2-input-disabled", !opts.showInput);
                    container.toggleClass("sp2-alpha-enabled", opts.showAlpha);
                    container.toggleClass("sp2-clear-enabled", allowEmpty);
                    container.toggleClass("sp2-buttons-disabled", !opts.showButtons);
                    container.toggleClass("sp2-palette-buttons-disabled", !opts.togglePaletteOnly);
                    container.toggleClass("sp2-palette-disabled", !opts.showPalette);
                    container.toggleClass("sp2-palette-only", opts.showPaletteOnly);
                    container.toggleClass("sp2-picker-disabled", !opts.showPicker);
                    container.toggleClass("sp2-initial-disabled", !opts.showInitial);
                    container.addClass(opts.className).addClass(opts.containerClassName);

                    reflow();
                }

                function initialize() {

                    if (IE) {
                        container.find("*:not(input)").attr("unselectable", "on");
                    }

                    applyOptions();

                    if (shouldReplace) {
                        boundElement.after(replacer).hide();
                    }

                    if (!allowEmpty) {
                        clearButton.hide();
                    }

                    if (flat) {
                        boundElement.after(container).hide();
                    }
                    else {

                        var appendTo = opts.appendTo === "parent" ? boundElement.parent() : $(opts.appendTo);
                        if (appendTo.length !== 1) {
                            appendTo = $("body");
                        }

                        appendTo.append(container);
                    }

                    updateSelectionPaletteFromStorage();

                    offsetElement.on("click.spectrum2 touchstart.spectrum2", function (e) {
                        if (!disabled) {
                            toggle();
                        }

                        e.stopPropagation();

                        if (!$(e.target).is("input")) {
                            e.preventDefault();
                        }
                    });

                    if(boundElement.is(":disabled") || (opts.disabled === true)) {
                        disable();
                    }

                    // Prevent clicks from bubbling up to document.  This would cause it to be hidden.
                    container.on("click", stopPropagation);

                    // Handle user typed input
                    textInput.on("change", setFromTextInput);
                    textInput.on("paste", function () {
                        setTimeout(setFromTextInput, 1);
                    });
                    textInput.on("keydown", function (e) { if (e.keyCode == 13) { setFromTextInput(); } });

                    if (opts.defaultValue) {
                        defaultButton.text(opts.defaultText);
                        defaultButton.on("click.spectrum2", function (e) {
                            e.stopPropagation();
                            e.preventDefault();
                            if (!(opts.defaultValue instanceof window.tinycolor2)) {
                                if (opts.preferredFormat == "alpha" || opts.preferredFormat == "alphapercentage") {
                                    opts.defaultValue = get().setAlpha(opts.defaultValue);
                                } else {
                                    opts.defaultValue = window.tinycolor2(opts.defaultValue);
                                }
                            }
                            if (opts.defaultValue.isValid())
                                set(opts.defaultValue);
                        });
                    }

                    cancelButton.text(opts.cancelText);
                    cancelButton.on("click.spectrum2", function (e) {
                        e.stopPropagation();
                        e.preventDefault();
                        revert();
                        hide();
                    });

                    clearButton.attr("title", opts.clearText);
                    clearButton.on("click.spectrum2", function (e) {
                        e.stopPropagation();
                        e.preventDefault();
                        isEmpty = true;
                        move();

                        if(flat) {
                            //for the flat style, this is a change event
                            updateOriginalInput(true);
                        }
                    });

                    chooseButton.text(opts.chooseText);
                    chooseButton.on("click.spectrum2", function (e) {
                        e.stopPropagation();
                        e.preventDefault();

                        if (IE && textInput.is(":focus")) {
                            textInput.trigger('change');
                        }

                        if (isValid()) {
                            updateOriginalInput(true);
                            hide();
                        }
                    });

                    toggleButton.text(opts.showPaletteOnly ? opts.togglePaletteMoreText : opts.togglePaletteLessText);
                    toggleButton.on("click.spectrum2", function (e) {
                        e.stopPropagation();
                        e.preventDefault();

                        opts.showPaletteOnly = !opts.showPaletteOnly;

                        // To make sure the Picker area is drawn on the right, next to the
                        // Palette area (and not below the palette), first move the Palette
                        // to the left to make space for the picker, plus 5px extra.
                        // The 'applyOptions' function puts the whole container back into place
                        // and takes care of the button-text and the sp2-palette-only CSS class.
                        if (!opts.showPaletteOnly && !flat) {
                            container.css('left', '-=' + (pickerContainer.outerWidth(true) + 5));
                        }
                        applyOptions();
                    });

                    draggable(alphaSlider, function (dragX, dragY, e) {
                        currentAlpha = (dragX / alphaWidth);
                        isEmpty = false;
                        if (e.shiftKey) {
                            currentAlpha = Math.round(currentAlpha * 10) / 10;
                        }

                        move();
                    }, dragStart, dragStop);

                    draggable(slider, function (dragX, dragY) {
                        currentHue = parseFloat(dragY / slideHeight);
                        isEmpty = false;
                        if (!opts.showAlpha) {
                            currentAlpha = 1;
                        }
                        move();
                    }, dragStart, dragStop);

                    draggable(dragger, function (dragX, dragY, e) {

                        // shift+drag should snap the movement to either the x or y axis.
                        if (!e.shiftKey) {
                            shiftMovementDirection = null;
                        }
                        else if (!shiftMovementDirection) {
                            var oldDragX = currentSaturation * dragWidth;
                            var oldDragY = dragHeight - (currentValue * dragHeight);
                            var furtherFromX = Math.abs(dragX - oldDragX) > Math.abs(dragY - oldDragY);

                            shiftMovementDirection = furtherFromX ? "x" : "y";
                        }

                        var setSaturation = !shiftMovementDirection || shiftMovementDirection === "x";
                        var setValue = !shiftMovementDirection || shiftMovementDirection === "y";

                        if (setSaturation) {
                            currentSaturation = parseFloat(dragX / dragWidth);
                        }
                        if (setValue) {
                            currentValue = parseFloat((dragHeight - dragY) / dragHeight);
                        }

                        isEmpty = false;
                        if (!opts.showAlpha) {
                            currentAlpha = 1;
                        }

                        move();

                    }, dragStart, dragStop);

                    if (!!initialColor) {
                        set(initialColor);

                        // In case color was black - update the preview UI and set the format
                        // since the set function will not run (default color is black).
                        updateUI();
                        currentPreferredFormat = opts.preferredFormat || tinycolor2(initialColor).format;

                        addColorToSelectionPalette(initialColor);
                    }
                    else {
                        updateUI();
                    }

                    if (flat) {
                        show();
                    }

                    function paletteElementClick(e) {
                        if (e.data && e.data.ignore) {
                            set($(e.target).closest(".sp2-thumb-el").data("color"));
                            move();
                        }
                        else {
                            set($(e.target).closest(".sp2-thumb-el").data("color"));
                            move();

                            // If the picker is going to close immediately, a palette selection
                            // is a change.  Otherwise, it's a move only.
                            if (opts.hideAfterPaletteSelect) {
                                updateOriginalInput(true);
                                hide();
                            } else {
                                updateOriginalInput();
                            }
                        }

                        return false;
                    }

                    var paletteEvent = IE ? "mousedown.spectrum2" : "click.spectrum2 touchstart.spectrum2";
                    paletteContainer.on(paletteEvent, ".sp2-thumb-el", paletteElementClick);
                    initialColorContainer.on(paletteEvent, ".sp2-thumb-el:nth-child(1)", { ignore: true }, paletteElementClick);
                }

                function updateSelectionPaletteFromStorage() {

                    if (localStorageKey && window.localStorage) {

                        // Migrate old palettes over to new format.  May want to remove this eventually.
                        try {
                            var oldPalette = window.localStorage[localStorageKey].split(",#");
                            if (oldPalette.length > 1) {
                                delete window.localStorage[localStorageKey];
                                $.each(oldPalette, function(i, c) {
                                    addColorToSelectionPalette(c);
                                });
                            }
                        }
                        catch(e) { }

                        try {
                            selectionPalette = window.localStorage[localStorageKey].split(";");
                        }
                        catch (e) { }
                    }
                }

                function addColorToSelectionPalette(color) {
                    if (showSelectionPalette) {
                        var rgb = tinycolor2(color).toRgbString();
                        if (!paletteLookup[rgb] && $.inArray(rgb, selectionPalette) === -1) {
                            selectionPalette.push(rgb);
                            while(selectionPalette.length > maxSelectionSize) {
                                selectionPalette.shift();
                            }
                        }

                        if (localStorageKey && window.localStorage) {
                            try {
                                window.localStorage[localStorageKey] = selectionPalette.join(";");
                            }
                            catch(e) { }
                        }
                    }
                }

                function getUniqueSelectionPalette() {
                    var unique = [];
                    if (opts.showPalette) {
                        for (var i = 0; i < selectionPalette.length; i++) {
                            var rgb = tinycolor2(selectionPalette[i]).toRgbString();

                            if (!paletteLookup[rgb]) {
                                unique.push(selectionPalette[i]);
                            }
                        }
                    }

                    return unique.reverse().slice(0, opts.maxSelectionSize);
                }

                function drawPalette() {

                    var currentColor = get();

                    var html = $.map(paletteArray, function (palette, i) {
                        return paletteTemplate(palette, currentColor, "sp2-palette-row sp2-palette-row-" + i, opts);
                    });

                    updateSelectionPaletteFromStorage();

                    if (selectionPalette) {
                        html.push(paletteTemplate(getUniqueSelectionPalette(), currentColor, "sp2-palette-row sp2-palette-row-selection", opts));
                    }

                    paletteContainer.html(html.join(""));
                }

                function drawInitial() {
                    if (opts.showInitial) {
                        var initial = colorOnShow;
                        var current = get();
                        initialColorContainer.html(paletteTemplate([initial, current], current, "sp2-palette-row-initial", opts));
                    }
                }

                function dragStart() {
                    if (dragHeight <= 0 || dragWidth <= 0 || slideHeight <= 0) {
                        reflow();
                    }
                    isDragging = true;
                    container.addClass(draggingClass);
                    shiftMovementDirection = null;
                    boundElement.trigger('dragstart.spectrum2', [ get() ]);
                }

                function dragStop() {
                    isDragging = false;
                    container.removeClass(draggingClass);
                    boundElement.trigger('dragstop.spectrum2', [ get() ]);
                }

                function setFromTextInput() {

                    var value = textInput.val();

                    if ((value === null || value === "") && allowEmpty) {
                        set(null);
                        move();
                        updateOriginalInput();
                    }
                    else {
                        var tiny = tinycolor2(value);
                        if (opts.preferredFormat == "alpha" || opts.preferredFormat == "alphapercentage") {
                            tiny = get().setAlpha(tiny.getAlpha());
                        } else {
                            tiny = tinycolor2(value);
                        }
                        if (tiny.isValid()) {
                            set(tiny);
                            move();
                            updateOriginalInput();
                        }
                        else {
                            textInput.addClass("sp2-validation-error");
                        }
                    }
                }

                function toggle() {
                    if (visible) {
                        hide();
                    }
                    else {
                        show();
                    }
                }

                function show() {
                    var event = $.Event('beforeShow.spectrum2');

                    if (visible) {
                        reflow();
                        return;
                    }

                    boundElement.trigger(event, [ get() ]);

                    if (callbacks.beforeShow(get()) === false || event.isDefaultPrevented()) {
                        return;
                    }

                    hideAll();
                    visible = true;

                    $(doc).on("keydown.spectrum2", onkeydown);
                    $(doc).on("click.spectrum2", clickout);
                    $(window).on("resize.spectrum2", resize);
                    replacer.addClass("sp2-active");
                    container.removeClass("sp2-hidden");

                    reflow();
                    updateUI();

                    colorOnShow = get();

                    drawInitial();
                    callbacks.show(colorOnShow);
                    boundElement.trigger('show.spectrum2', [ colorOnShow ]);
                }

                function onkeydown(e) {
                    // Close on ESC
                    if (e.keyCode === 27) {
                        hide();
                    }
                }

                function clickout(e) {
                    // Return on right click.
                    if (e.button == 2) { return; }

                    // If a drag event was happening during the mouseup, don't hide
                    // on click.
                    if (isDragging) { return; }

                    if (clickoutFiresChange) {
                        updateOriginalInput(true);
                    }
                    else {
                        revert();
                    }
                    hide();
                }

                function hide() {
                    // Return if hiding is unnecessary
                    if (!visible || flat) { return; }
                    visible = false;

                    $(doc).off("keydown.spectrum2", onkeydown);
                    $(doc).off("click.spectrum2", clickout);
                    $(window).off("resize.spectrum2", resize);

                    replacer.removeClass("sp2-active");
                    container.addClass("sp2-hidden");

                    callbacks.hide(get());
                    boundElement.trigger('hide.spectrum2', [ get() ]);
                }

                function revert() {
                    set(colorOnShow, true);
                    updateOriginalInput(true);
                }

                function set(color, ignoreFormatChange) {
                    if (tinycolor2.equals(color, get())) {
                        // Update UI just in case a validation error needs
                        // to be cleared.
                        updateUI();
                        return;
                    }

                    var newColor, newHsv;
                    if (!color && allowEmpty) {
                        isEmpty = true;
                    } else {
                        isEmpty = false;
                        newColor = tinycolor2(color);
                        newHsv = newColor.toHsv();

                        currentHue = (newHsv.h % 360) / 360;
                        currentSaturation = newHsv.s;
                        currentValue = newHsv.v;
                        currentAlpha = newHsv.a;
                    }
                    updateUI();

                    if (newColor && newColor.isValid() && !ignoreFormatChange) {
                        currentPreferredFormat = opts.preferredFormat || newColor.getFormat();
                    }
                }

                function get(opts) {
                    opts = opts || { };

                    if (allowEmpty && isEmpty) {
                        return null;
                    }

                    return tinycolor2.fromRatio({
                        h: currentHue,
                        s: currentSaturation,
                        v: currentValue,
                        a: Math.round(currentAlpha * 1000) / 1000
                    }, { format: opts.format || currentPreferredFormat });
                }

                function isValid() {
                    return !textInput.hasClass("sp2-validation-error");
                }

                function move() {
                    updateUI();

                    callbacks.move(get());
                    boundElement.trigger('move.spectrum2', [ get() ]);
                }

                function updateUI() {

                    textInput.removeClass("sp2-validation-error");

                    updateHelperLocations();

                    // Update dragger background color (gradients take care of saturation and value).
                    var flatColor = tinycolor2.fromRatio({ h: currentHue, s: 1, v: 1 });
                    dragger.css("background-color", flatColor.toHexString());

                    // Get a format that alpha will be included in (hex and names ignore alpha)
                    var format = currentPreferredFormat;
                    if (currentAlpha < 1 && !(currentAlpha === 0 && format === "name")) {
                        if (format === "hex" || format === "hex3" || format === "hex6" || format === "name") {
                            format = "rgb";
                        }
                    }

                    var realColor = get({ format: format }),
                        displayColor = '';

                    //reset background info for preview element
                    previewElement.removeClass("sp2-clear-display");
                    previewElement.css('background-color', 'transparent');

                    if (!realColor && allowEmpty) {
                        // Update the replaced elements background with icon indicating no color selection
                        previewElement.addClass("sp2-clear-display");
                    }
                    else {
                        var realHex = realColor.toHexString(),
                            realRgb = realColor.toRgbString();

                        // Update the replaced elements background color (with actual selected color)
                        if (rgbaSupport || realColor.alpha === 1) {
                            previewElement.css("background-color", realRgb);
                        }
                        else {
                            previewElement.css("background-color", "transparent");
                            previewElement.css("filter", realColor.toFilter());
                        }

                        if (opts.showAlpha) {
                            var rgb = realColor.toRgb();
                            rgb.a = 0;
                            var realAlpha = tinycolor2(rgb).toRgbString();
                            var gradient = "linear-gradient(left, " + realAlpha + ", " + realHex + ")";

                            if (IE) {
                                alphaSliderInner.css("filter", tinycolor2(realAlpha).toFilter({ gradientType: 1 }, realHex));
                            }
                            else {
                                alphaSliderInner.css("background", "-webkit-" + gradient);
                                alphaSliderInner.css("background", "-moz-" + gradient);
                                alphaSliderInner.css("background", "-ms-" + gradient);
                                // Use current syntax gradient on unprefixed property.
                                alphaSliderInner.css("background",
                                                     "linear-gradient(to right, " + realAlpha + ", " + realHex + ")");
                            }
                        }

                        displayColor = realColor.toString(format);
                    }

                    // Update the text entry input as it changes happen
                    if (opts.showInput) {
                        textInput.val(displayColor);
                    }

                    if (opts.showPalette) {
                        drawPalette();
                    }

                    drawInitial();
                }

                function updateHelperLocations() {
                    var s = currentSaturation;
                    var v = currentValue;

                    if(allowEmpty && isEmpty) {
                        //if selected color is empty, hide the helpers
                        alphaSlideHelper.hide();
                        slideHelper.hide();
                        dragHelper.hide();
                    }
                    else {
                        //make sure helpers are visible
                        alphaSlideHelper.show();
                        slideHelper.show();
                        dragHelper.show();

                        // Where to show the little circle in that displays your current selected color
                        var dragX = s * dragWidth;
                        var dragY = dragHeight - (v * dragHeight);
                        dragX = Math.max(
                            -dragHelperHeight,
                            Math.min(dragWidth - dragHelperHeight, dragX - dragHelperHeight)
                        );
                        dragY = Math.max(
                            -dragHelperHeight,
                            Math.min(dragHeight - dragHelperHeight, dragY - dragHelperHeight)
                        );
                        dragHelper.css({
                            "top": dragY + "px",
                            "left": dragX + "px"
                        });

                        var alphaX = currentAlpha * alphaWidth;
                        alphaSlideHelper.css({
                            "left": (alphaX - (alphaSlideHelperWidth / 2)) + "px"
                        });

                        // Where to show the bar that displays your current selected hue
                        var slideY = (currentHue) * slideHeight;
                        slideHelper.css({
                            "top": (slideY - slideHelperHeight) + "px"
                        });
                    }
                }

                function updateOriginalInput(fireCallback) {
                    var color = get(),
                        displayColor = '',
                        hasChanged = !tinycolor2.equals(color, colorOnShow);

                    if (color) {
                        displayColor = color.toString(currentPreferredFormat);
                        // Update the selection palette with the current color
                        addColorToSelectionPalette(color);
                    }

                    if (isInput) {
                        boundElement.val(displayColor);
                    }

                    if (fireCallback && hasChanged) {
                        callbacks.change(color);
                        boundElement.trigger('change', [ color ]);
                    }
                }

                function reflow() {
                    if (!visible) {
                        return; // Calculations would be useless and wouldn't be reliable anyways
                    }
                    dragWidth = dragger.width();
                    dragHeight = dragger.height();
                    dragHelperHeight = dragHelper.height();
                    slideWidth = slider.width();
                    slideHeight = slider.height();
                    slideHelperHeight = slideHelper.height();
                    alphaWidth = alphaSlider.width();
                    alphaSlideHelperWidth = alphaSlideHelper.width();

                    if (!flat) {
                        container.css("position", "absolute");
                        if (opts.offset) {
                            container.offset(opts.offset);
                        } else {
                            container.offset(getOffset(container, offsetElement));
                        }
                    }

                    updateHelperLocations();

                    if (opts.showPalette) {
                        drawPalette();
                    }

                    boundElement.trigger('reflow.spectrum2');
                }

                function destroy() {
                    boundElement.show();
                    offsetElement.off("click.spectrum2 touchstart.spectrum2");
                    container.remove();
                    replacer.remove();
                    spectrums[spect.id] = null;
                }

                function option(optionName, optionValue) {
                    if (optionName === undefined) {
                        return $.extend({}, opts);
                    }
                    if (optionValue === undefined) {
                        return opts[optionName];
                    }

                    opts[optionName] = optionValue;

                    if (optionName === "preferredFormat") {
                        currentPreferredFormat = opts.preferredFormat;
                    }
                    applyOptions();
                }

                function enable() {
                    disabled = false;
                    boundElement.attr("disabled", false);
                    offsetElement.removeClass("sp2-disabled");
                }

                function disable() {
                    hide();
                    disabled = true;
                    boundElement.attr("disabled", true);
                    offsetElement.addClass("sp2-disabled");
                }

                function setOffset(coord) {
                    opts.offset = coord;
                    reflow();
                }

                initialize();

                var spect = {
                    show: show,
                    hide: hide,
                    toggle: toggle,
                    reflow: reflow,
                    option: option,
                    enable: enable,
                    disable: disable,
                    offset: setOffset,
                    set: function (c) {
                        set(c);
                        updateOriginalInput();
                    },
                    get: get,
                    destroy: destroy,
                    container: container
                };

                spect.id = spectrums.push(spect) - 1;

                return spect;
            }

            /**
    * checkOffset - get the offset below/above and left/right element depending on screen position
    * Thanks https://github.com/jquery/jquery-ui/blob/master/ui/jquery.ui.datepicker.js
    */
            function getOffset(picker, input) {
                var extraY = 0;
                var dpWidth = picker.outerWidth();
                var dpHeight = picker.outerHeight();
                var inputHeight = input.outerHeight();
                var doc = picker[0].ownerDocument;
                var docElem = doc.documentElement;
                var viewWidth = docElem.clientWidth + $(doc).scrollLeft();
                var viewHeight = docElem.clientHeight + $(doc).scrollTop();
                var offset = input.offset();
                var offsetLeft = offset.left;
                var offsetTop = offset.top;

                offsetTop += inputHeight;

                offsetLeft -=
                    Math.min(offsetLeft, (offsetLeft + dpWidth > viewWidth && viewWidth > dpWidth) ?
                             Math.abs(offsetLeft + dpWidth - viewWidth) : 0);

                offsetTop -=
                    Math.min(offsetTop, ((offsetTop + dpHeight > viewHeight && viewHeight > dpHeight) ?
                                         Math.abs(dpHeight + inputHeight - extraY) : extraY));

                return {
                    top: offsetTop,
                    bottom: offset.bottom,
                    left: offsetLeft,
                    right: offset.right,
                    width: offset.width,
                    height: offset.height
                };
            }

            /**
    * noop - do nothing
    */
            function noop() {

            }

            /**
    * stopPropagation - makes the code only doing this a little easier to read in line
    */
            function stopPropagation(e) {
                e.stopPropagation();
            }

            /**
    * Create a function bound to a given object
    * Thanks to underscore.js
    */
            function bind(func, obj) {
                var slice = Array.prototype.slice;
                var args = slice.call(arguments, 2);
                return function () {
                    return func.apply(obj, args.concat(slice.call(arguments)));
                };
            }

            /**
    * Lightweight drag helper.  Handles containment within the element, so that
    * when dragging, the x is within [0,element.width] and y is within [0,element.height]
    */
            function draggable(element, onmove, onstart, onstop) {
                onmove = onmove || function () { };
                onstart = onstart || function () { };
                onstop = onstop || function () { };
                var doc = document;
                var dragging = false;
                var offset = {};
                var maxHeight = 0;
                var maxWidth = 0;
                var hasTouch = ('ontouchstart' in window);

                var duringDragEvents = {};
                duringDragEvents["selectstart"] = prevent;
                duringDragEvents["dragstart"] = prevent;
                duringDragEvents["touchmove mousemove"] = move;
                duringDragEvents["touchend mouseup"] = stop;

                function prevent(e) {
                    if (e.stopPropagation) {
                        e.stopPropagation();
                    }
                    if (e.preventDefault) {
                        e.preventDefault();
                    }
                    e.returnValue = false;
                }

                function move(e) {
                    if (dragging) {
                        // Mouseup happened outside of window
                        if (IE && doc.documentMode < 9 && !e.button) {
                            return stop();
                        }

                        var t0 = e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0];
                        var pageX = t0 && t0.pageX || e.pageX;
                        var pageY = t0 && t0.pageY || e.pageY;

                        var dragX = Math.max(0, Math.min(pageX - offset.left, maxWidth));
                        var dragY = Math.max(0, Math.min(pageY - offset.top, maxHeight));

                        if (hasTouch) {
                            // Stop scrolling in iOS
                            prevent(e);
                        }

                        onmove.apply(element, [dragX, dragY, e]);
                    }
                }

                function start(e) {
                    var rightclick = (e.which) ? (e.which == 3) : (e.button == 2);

                    if (!rightclick && !dragging) {
                        if (onstart.apply(element, arguments) !== false) {
                            dragging = true;
                            maxHeight = $(element).height();
                            maxWidth = $(element).width();
                            offset = $(element).offset();

                            $(doc).on(duringDragEvents);
                            $(doc.body).addClass("sp2-dragging");

                            move(e);

                            prevent(e);
                        }
                    }
                }

                function stop() {
                    if (dragging) {
                        $(doc).off(duringDragEvents);
                        $(doc.body).removeClass("sp2-dragging");

                        // Wait a tick before notifying observers to allow the click event
                        // to fire in Chrome.
                        setTimeout(function() {
                            onstop.apply(element, arguments);
                        }, 0);
                    }
                    dragging = false;
                }

                $(element).on("touchstart mousedown", start);
            }

            function throttle(func, wait, debounce) {
                var timeout;
                return function () {
                    var context = this, args = arguments;
                    var throttler = function () {
                        timeout = null;
                        func.apply(context, args);
                    };
                    if (debounce) clearTimeout(timeout);
                    if (debounce || !timeout) timeout = setTimeout(throttler, wait);
                };
            }

            function inputTypeColorSupport() {
                return $.fn.spectrum2.inputTypeColorSupport();
            }

            /**
    * Define a jQuery plugin
    */
            var dataID = "spectrum2.id";
            $.fn.spectrum2 = function (opts, extra) {

                if (typeof opts == "string") {

                    var returnValue = this;
                    var args = Array.prototype.slice.call( arguments, 1 );

                    this.each(function () {
                        var spect = spectrums[$(this).data(dataID)];
                        if (spect) {
                            var method = spect[opts];
                            if (!method) {
                                throw new Error( "Spectrum2: no such method: '" + opts + "'" );
                            }

                            if (opts == "get") {
                                returnValue = spect.get();
                            }
                            else if (opts == "container") {
                                returnValue = spect.container;
                            }
                            else if (opts == "option") {
                                returnValue = spect.option.apply(spect, args);
                            }
                            else if (opts == "destroy") {
                                spect.destroy();
                                $(this).removeData(dataID);
                            }
                            else {
                                method.apply(spect, args);
                            }
                        }
                    });

                    return returnValue;
                }

                // Initializing a new instance of spectrum
                return this.spectrum2("destroy").each(function () {
                    var options = $.extend({}, $(this).data(), opts);
                    var spect = spectrum2(this, options);
                    $(this).data(dataID, spect.id);
                });
            };

            $.fn.spectrum2.load = true;
            $.fn.spectrum2.loadOpts = {};
            $.fn.spectrum2.draggable = draggable;
            $.fn.spectrum2.defaults = defaultOpts;
            $.fn.spectrum2.inputTypeColorSupport = function inputTypeColorSupport() {
                if (typeof inputTypeColorSupport._cachedResult === "undefined") {
                    var colorInput = $("<input type='color'/>")[0]; // if color element is supported, value will default to not null
                    inputTypeColorSupport._cachedResult = colorInput.type === "color" && colorInput.value !== "";
                }
                return inputTypeColorSupport._cachedResult;
            };

            $.spectrum2 = { };
            $.spectrum2.localization = { };
            $.spectrum2.palettes = { };

            $.fn.spectrum2.processNativeColorInputs = function () {
                var colorInputs = $("input[type=color]");
                if (colorInputs.length && !inputTypeColorSupport()) {
                    colorInputs.spectrum2({
                        preferredFormat: "hex6"
                    });
                }
            };

            // TinyColor v1.1.2
            // https://github.com/bgrins/TinyColor
            // Brian Grinstead, MIT License

            (function() {

                var trimLeft = /^[\s,#]+/,
                    trimRight = /\s+$/,
                    tinyCounter = 0,
                    math = Math,
                    mathRound = math.round,
                    mathMin = math.min,
                    mathMax = math.max,
                    mathRandom = math.random;

                var tinycolor2 = function(color, opts) {

                    color = (color) ? color : '';
                    opts = opts || { };

                    // If input is already a tinycolor2, return itself
                    if (color instanceof tinycolor2) {
                        return color;
                    }
                    // If we are called as a function, call using new instead
                    if (!(this instanceof tinycolor2)) {
                        return new tinycolor2(color, opts);
                    }

                    var rgb = inputToRGB(color);
                    this._originalInput = color;
                    this._r = rgb.r;
                    this._g = rgb.g;
                    this._b = rgb.b;
                    this._a = rgb.a;
                    this._roundA = mathRound(1000 * this._a) / 1000;
                    this._format = opts.format || rgb.format;
                    this._gradientType = opts.gradientType;

                    // Don't let the range of [0,255] come back in [0,1].
                    // Potentially lose a little bit of precision here, but will fix issues where
                    // .5 gets interpreted as half of the total, instead of half of 1
                    // If it was supposed to be 128, this was already taken care of by `inputToRgb`
                    if (this._r < 1) { this._r = mathRound(this._r); }
                    if (this._g < 1) { this._g = mathRound(this._g); }
                    if (this._b < 1) { this._b = mathRound(this._b); }

                    this._ok = rgb.ok;
                    this._tc_id = tinyCounter++;
                };

                tinycolor2.prototype = {
                    isDark: function() {
                        return this.getBrightness() < 128;
                    },
                    isLight: function() {
                        return !this.isDark();
                    },
                    isValid: function() {
                        return this._ok;
                    },
                    getOriginalInput: function() {
                        return this._originalInput;
                    },
                    getFormat: function() {
                        return this._format;
                    },
                    getAlpha: function() {
                        return this._a;
                    },
                    getBrightness: function() {
                        var rgb = this.toRgb();
                        return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
                    },
                    setAlpha: function(value) {
                        this._a = boundAlpha(value);
                        this._roundA = mathRound(1000 * this._a) / 1000;
                        return this;
                    },
                    toHsv: function() {
                        var hsv = rgbToHsv(this._r, this._g, this._b);
                        return { h: hsv.h * 360, s: hsv.s, v: hsv.v, a: this._a };
                    },
                    toHsvString: function() {
                        var hsv = rgbToHsv(this._r, this._g, this._b);
                        var h = mathRound(hsv.h * 360), s = mathRound(hsv.s * 100), v = mathRound(hsv.v * 100);
                        return (this._a == 1) ?
                            "hsv("  + h + ", " + s + "%, " + v + "%)" :
                        "hsva(" + h + ", " + s + "%, " + v + "%, "+ this._roundA + ")";
                    },
                    toAlphaString: function() {
                        return this._roundA;
                    },
                    toAlphaPercentageString: function() {
                        return mathRound(this._a * 100) + "%";
                    },
                    toHsl: function() {
                        var hsl = rgbToHsl(this._r, this._g, this._b);
                        return { h: hsl.h * 360, s: hsl.s, l: hsl.l, a: this._a };
                    },
                    toHslString: function() {
                        var hsl = rgbToHsl(this._r, this._g, this._b);
                        var h = mathRound(hsl.h * 360), s = mathRound(hsl.s * 100), l = mathRound(hsl.l * 100);
                        return (this._a == 1) ?
                            "hsl("  + h + ", " + s + "%, " + l + "%)" :
                        "hsla(" + h + ", " + s + "%, " + l + "%, "+ this._roundA + ")";
                    },
                    toHex: function(allow3Char) {
                        return rgbToHex(this._r, this._g, this._b, allow3Char);
                    },
                    toHexString: function(allow3Char) {
                        return '#' + this.toHex(allow3Char);
                    },
                    toHex8: function() {
                        return rgbaToHex(this._r, this._g, this._b, this._a);
                    },
                    toHex8String: function() {
                        return '#' + this.toHex8();
                    },
                    toRgb: function() {
                        return { r: mathRound(this._r), g: mathRound(this._g), b: mathRound(this._b), a: this._a };
                    },
                    toRgbString: function() {
                        return (this._a == 1) ?
                            "rgb("  + mathRound(this._r) + ", " + mathRound(this._g) + ", " + mathRound(this._b) + ")" :
                        "rgba(" + mathRound(this._r) + ", " + mathRound(this._g) + ", " + mathRound(this._b) + ", " + this._roundA + ")";
                    },
                    toPercentageRgb: function() {
                        return { r: mathRound(bound01(this._r, 255) * 100) + "%", g: mathRound(bound01(this._g, 255) * 100) + "%", b: mathRound(bound01(this._b, 255) * 100) + "%", a: this._a };
                    },
                    toPercentageRgbString: function() {
                        return (this._a == 1) ?
                            "rgb("  + mathRound(bound01(this._r, 255) * 100) + "%, " + mathRound(bound01(this._g, 255) * 100) + "%, " + mathRound(bound01(this._b, 255) * 100) + "%)" :
                        "rgba(" + mathRound(bound01(this._r, 255) * 100) + "%, " + mathRound(bound01(this._g, 255) * 100) + "%, " + mathRound(bound01(this._b, 255) * 100) + "%, " + this._roundA + ")";
                    },
                    toName: function() {
                        if (this._a === 0) {
                            return "transparent";
                        }

                        if (this._a < 1) {
                            return false;
                        }

                        return hexNames[rgbToHex(this._r, this._g, this._b, true)] || false;
                    },
                    toFilter: function(secondColor) {
                        var hex8String = '#' + rgbaToHex(this._r, this._g, this._b, this._a);
                        var secondHex8String = hex8String;
                        var gradientType = this._gradientType ? "GradientType = 1, " : "";

                        if (secondColor) {
                            var s = tinycolor2(secondColor);
                            secondHex8String = s.toHex8String();
                        }

                        return "progid:DXImageTransform.Microsoft.gradient("+gradientType+"startColorstr="+hex8String+",endColorstr="+secondHex8String+")";
                    },
                    toString: function(format) {
                        var formatSet = !!format;
                        format = format || this._format;

                        var formattedString = false;
                        var hasAlpha = this._a < 1 && this._a >= 0;
                        var needsAlphaFormat = !formatSet && hasAlpha && (format === "hex" || format === "hex6" || format === "hex3" || format === "name");

                        if (needsAlphaFormat) {
                            // Special case for "transparent", all other non-alpha formats
                            // will return rgba when there is transparency.
                            if (format === "name" && this._a === 0) {
                                return this.toName();
                            }
                            return this.toRgbString();
                        }
                        if (format === "rgb") {
                            formattedString = this.toRgbString();
                        }
                        if (format === "prgb") {
                            formattedString = this.toPercentageRgbString();
                        }
                        if (format === "hex" || format === "hex6") {
                            formattedString = this.toHexString();
                        }
                        if (format === "hex3") {
                            formattedString = this.toHexString(true);
                        }
                        if (format === "hex8") {
                            formattedString = this.toHex8String();
                        }
                        if (format === "name") {
                            formattedString = this.toName();
                        }
                        if (format === "hsl") {
                            formattedString = this.toHslString();
                        }
                        if (format === "hsv") {
                            formattedString = this.toHsvString();
                        }
                        if (format === "alpha") {
                            formattedString = this.toAlphaString();
                        }
                        if (format === "alphapercentage") {
                            formattedString = this.toAlphaPercentageString();
                        }

                        return formattedString || this.toHexString();
                    },

                    _applyModification: function(fn, args) {
                        var color = fn.apply(null, [this].concat([].slice.call(args)));
                        this._r = color._r;
                        this._g = color._g;
                        this._b = color._b;
                        this.setAlpha(color._a);
                        return this;
                    },
                    lighten: function() {
                        return this._applyModification(lighten, arguments);
                    },
                    brighten: function() {
                        return this._applyModification(brighten, arguments);
                    },
                    darken: function() {
                        return this._applyModification(darken, arguments);
                    },
                    desaturate: function() {
                        return this._applyModification(desaturate, arguments);
                    },
                    saturate: function() {
                        return this._applyModification(saturate, arguments);
                    },
                    greyscale: function() {
                        return this._applyModification(greyscale, arguments);
                    },
                    spin: function() {
                        return this._applyModification(spin, arguments);
                    },

                    _applyCombination: function(fn, args) {
                        return fn.apply(null, [this].concat([].slice.call(args)));
                    },
                    analogous: function() {
                        return this._applyCombination(analogous, arguments);
                    },
                    complement: function() {
                        return this._applyCombination(complement, arguments);
                    },
                    monochromatic: function() {
                        return this._applyCombination(monochromatic, arguments);
                    },
                    splitcomplement: function() {
                        return this._applyCombination(splitcomplement, arguments);
                    },
                    triad: function() {
                        return this._applyCombination(triad, arguments);
                    },
                    tetrad: function() {
                        return this._applyCombination(tetrad, arguments);
                    }
                };

                // If input is an object, force 1 into "1.0" to handle ratios properly
                // String input requires "1.0" as input, so 1 will be treated as 1
                tinycolor2.fromRatio = function(color, opts) {
                    if (typeof color == "object") {
                        var newColor = {};
                        for (var i in color) {
                            if (color.hasOwnProperty(i)) {
                                if (i === "a") {
                                    newColor[i] = color[i];
                                }
                                else {
                                    newColor[i] = convertToPercentage(color[i]);
                                }
                            }
                        }
                        color = newColor;
                    }

                    return tinycolor2(color, opts);
                };

                // Given a string or object, convert that input to RGB
                // Possible string inputs:
                //
                //     "red"
                //     "#f00" or "f00"
                //     "#ff0000" or "ff0000"
                //     "#ff000000" or "ff000000"
                //     "rgb 255 0 0" or "rgb (255, 0, 0)"
                //     "rgb 1.0 0 0" or "rgb (1, 0, 0)"
                //     "rgba (255, 0, 0, 1)" or "rgba 255, 0, 0, 1"
                //     "rgba (1.0, 0, 0, 1)" or "rgba 1.0, 0, 0, 1"
                //     "hsl(0, 100%, 50%)" or "hsl 0 100% 50%"
                //     "hsla(0, 100%, 50%, 1)" or "hsla 0 100% 50%, 1"
                //     "hsv(0, 100%, 100%)" or "hsv 0 100% 100%"
                //     "0" or "1" for alpha
                //     "1%" or "100%" for alpha percentage
                //
                function inputToRGB(color) {

                    var rgb = { r: 0, g: 0, b: 0 };
                    var a = 1;
                    var ok = false;
                    var format = false;
                    if (typeof color == "string") {
                        color = stringInputToObject(color);
                    }

                    if (typeof color == "object") {
                        if (color.hasOwnProperty("r") && color.hasOwnProperty("g") && color.hasOwnProperty("b")) {
                            rgb = rgbToRgb(color.r, color.g, color.b);
                            ok = true;
                            format = String(color.r).substr(-1) === "%" ? "prgb" : "rgb";
                        }
                        else if (color.hasOwnProperty("h") && color.hasOwnProperty("s") && color.hasOwnProperty("v")) {
                            color.s = convertToPercentage(color.s);
                            color.v = convertToPercentage(color.v);
                            rgb = hsvToRgb(color.h, color.s, color.v);
                            ok = true;
                            format = "hsv";
                        }
                        else if (color.hasOwnProperty("h") && color.hasOwnProperty("s") && color.hasOwnProperty("l")) {
                            color.s = convertToPercentage(color.s);
                            color.l = convertToPercentage(color.l);
                            rgb = hslToRgb(color.h, color.s, color.l);
                            ok = true;
                            format = "hsl";
                        }

                        if (color.hasOwnProperty("a")) {
                            if (!ok) ok = (color.format == "alpha" || color.format == "alphapercentage");
                            a = color.a;
                        }
                    }

                    a = boundAlpha(a);

                    return {
                        ok: ok,
                        format: color.format || format,
                        r: mathMin(255, mathMax(rgb.r, 0)),
                        g: mathMin(255, mathMax(rgb.g, 0)),
                        b: mathMin(255, mathMax(rgb.b, 0)),
                        a: a
                    };
                }


                // Conversion Functions
                // --------------------

                // `rgbToHsl`, `rgbToHsv`, `hslToRgb`, `hsvToRgb` modified from:
                // <http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript>

                // `rgbToRgb`
                // Handle bounds / percentage checking to conform to CSS color spec
                // <http://www.w3.org/TR/css3-color/>
                // *Assumes:* r, g, b in [0, 255] or [0, 1]
                // *Returns:* { r, g, b } in [0, 255]
                function rgbToRgb(r, g, b){
                    return {
                        r: bound01(r, 255) * 255,
                        g: bound01(g, 255) * 255,
                        b: bound01(b, 255) * 255
                    };
                }

                // `rgbToHsl`
                // Converts an RGB color value to HSL.
                // *Assumes:* r, g, and b are contained in [0, 255] or [0, 1]
                // *Returns:* { h, s, l } in [0,1]
                function rgbToHsl(r, g, b) {

                    r = bound01(r, 255);
                    g = bound01(g, 255);
                    b = bound01(b, 255);

                    var max = mathMax(r, g, b), min = mathMin(r, g, b);
                    var h, s, l = (max + min) / 2;

                    if(max == min) {
                        h = s = 0; // achromatic
                    }
                    else {
                        var d = max - min;
                        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                        switch(max) {
                            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                            case g: h = (b - r) / d + 2; break;
                            case b: h = (r - g) / d + 4; break;
                        }

                        h /= 6;
                    }

                    return { h: h, s: s, l: l };
                }

                // `hslToRgb`
                // Converts an HSL color value to RGB.
                // *Assumes:* h is contained in [0, 1] or [0, 360] and s and l are contained [0, 1] or [0, 100]
                // *Returns:* { r, g, b } in the set [0, 255]
                function hslToRgb(h, s, l) {
                    var r, g, b;

                    h = bound01(h, 360);
                    s = bound01(s, 100);
                    l = bound01(l, 100);

                    function hue2rgb(p, q, t) {
                        if(t < 0) t += 1;
                        if(t > 1) t -= 1;
                        if(t < 1/6) return p + (q - p) * 6 * t;
                        if(t < 1/2) return q;
                        if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                        return p;
                    }

                    if(s === 0) {
                        r = g = b = l; // achromatic
                    }
                    else {
                        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                        var p = 2 * l - q;
                        r = hue2rgb(p, q, h + 1/3);
                        g = hue2rgb(p, q, h);
                        b = hue2rgb(p, q, h - 1/3);
                    }

                    return { r: r * 255, g: g * 255, b: b * 255 };
                }

                // `rgbToHsv`
                // Converts an RGB color value to HSV
                // *Assumes:* r, g, and b are contained in the set [0, 255] or [0, 1]
                // *Returns:* { h, s, v } in [0,1]
                function rgbToHsv(r, g, b) {

                    r = bound01(r, 255);
                    g = bound01(g, 255);
                    b = bound01(b, 255);

                    var max = mathMax(r, g, b), min = mathMin(r, g, b);
                    var h, s, v = max;

                    var d = max - min;
                    s = max === 0 ? 0 : d / max;

                    if(max == min) {
                        h = 0; // achromatic
                    }
                    else {
                        switch(max) {
                            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                            case g: h = (b - r) / d + 2; break;
                            case b: h = (r - g) / d + 4; break;
                        }
                        h /= 6;
                    }
                    return { h: h, s: s, v: v };
                }

                // `hsvToRgb`
                // Converts an HSV color value to RGB.
                // *Assumes:* h is contained in [0, 1] or [0, 360] and s and v are contained in [0, 1] or [0, 100]
                // *Returns:* { r, g, b } in the set [0, 255]
                function hsvToRgb(h, s, v) {

                    h = bound01(h, 360) * 6;
                    s = bound01(s, 100);
                    v = bound01(v, 100);

                    var i = math.floor(h),
                        f = h - i,
                        p = v * (1 - s),
                        q = v * (1 - f * s),
                        t = v * (1 - (1 - f) * s),
                        mod = i % 6,
                        r = [v, q, p, p, t, v][mod],
                        g = [t, v, v, q, p, p][mod],
                        b = [p, p, t, v, v, q][mod];

                    return { r: r * 255, g: g * 255, b: b * 255 };
                }

                // `rgbToHex`
                // Converts an RGB color to hex
                // Assumes r, g, and b are contained in the set [0, 255]
                // Returns a 3 or 6 character hex
                function rgbToHex(r, g, b, allow3Char) {

                    var hex = [
                        pad2(mathRound(r).toString(16)),
                        pad2(mathRound(g).toString(16)),
                        pad2(mathRound(b).toString(16))
                    ];

                    // Return a 3 character hex if possible
                    if (allow3Char && hex[0].charAt(0) == hex[0].charAt(1) && hex[1].charAt(0) == hex[1].charAt(1) && hex[2].charAt(0) == hex[2].charAt(1)) {
                        return hex[0].charAt(0) + hex[1].charAt(0) + hex[2].charAt(0);
                    }

                    return hex.join("");
                }
                // `rgbaToHex`
                // Converts an RGBA color plus alpha transparency to hex
                // Assumes r, g, b and a are contained in the set [0, 255]
                // Returns an 8 character hex
                function rgbaToHex(r, g, b, a) {

                    var hex = [
                        pad2(convertDecimalToHex(a)),
                        pad2(mathRound(r).toString(16)),
                        pad2(mathRound(g).toString(16)),
                        pad2(mathRound(b).toString(16))
                    ];

                    return hex.join("");
                }

                // `equals`
                // Can be called with any tinycolor input
                tinycolor2.equals = function (color1, color2) {
                    if (!color1 || !color2) { return false; }
                    return tinycolor2(color1).toRgbString() == tinycolor2(color2).toRgbString();
                };
                tinycolor2.random = function() {
                    return tinycolor2.fromRatio({
                        r: mathRandom(),
                        g: mathRandom(),
                        b: mathRandom()
                    });
                };


                // Modification Functions
                // ----------------------
                // Thanks to less.js for some of the basics here
                // <https://github.com/cloudhead/less.js/blob/master/lib/less/functions.js>

                function desaturate(color, amount) {
                    amount = (amount === 0) ? 0 : (amount || 10);
                    var hsl = tinycolor2(color).toHsl();
                    hsl.s -= amount / 100;
                    hsl.s = clamp01(hsl.s);
                    return tinycolor2(hsl);
                }

                function saturate(color, amount) {
                    amount = (amount === 0) ? 0 : (amount || 10);
                    var hsl = tinycolor2(color).toHsl();
                    hsl.s += amount / 100;
                    hsl.s = clamp01(hsl.s);
                    return tinycolor2(hsl);
                }

                function greyscale(color) {
                    return tinycolor2(color).desaturate(100);
                }

                function lighten (color, amount) {
                    amount = (amount === 0) ? 0 : (amount || 10);
                    var hsl = tinycolor2(color).toHsl();
                    hsl.l += amount / 100;
                    hsl.l = clamp01(hsl.l);
                    return tinycolor2(hsl);
                }

                function brighten(color, amount) {
                    amount = (amount === 0) ? 0 : (amount || 10);
                    var rgb = tinycolor2(color).toRgb();
                    rgb.r = mathMax(0, mathMin(255, rgb.r - mathRound(255 * - (amount / 100))));
                    rgb.g = mathMax(0, mathMin(255, rgb.g - mathRound(255 * - (amount / 100))));
                    rgb.b = mathMax(0, mathMin(255, rgb.b - mathRound(255 * - (amount / 100))));
                    return tinycolor2(rgb);
                }

                function darken (color, amount) {
                    amount = (amount === 0) ? 0 : (amount || 10);
                    var hsl = tinycolor2(color).toHsl();
                    hsl.l -= amount / 100;
                    hsl.l = clamp01(hsl.l);
                    return tinycolor2(hsl);
                }

                // Spin takes a positive or negative amount within [-360, 360] indicating the change of hue.
                // Values outside of this range will be wrapped into this range.
                function spin(color, amount) {
                    var hsl = tinycolor2(color).toHsl();
                    var hue = (mathRound(hsl.h) + amount) % 360;
                    hsl.h = hue < 0 ? 360 + hue : hue;
                    return tinycolor2(hsl);
                }

                // Combination Functions
                // ---------------------
                // Thanks to jQuery xColor for some of the ideas behind these
                // <https://github.com/infusion/jQuery-xcolor/blob/master/jquery.xcolor.js>

                function complement(color) {
                    var hsl = tinycolor2(color).toHsl();
                    hsl.h = (hsl.h + 180) % 360;
                    return tinycolor2(hsl);
                }

                function triad(color) {
                    var hsl = tinycolor2(color).toHsl();
                    var h = hsl.h;
                    return [
                        tinycolor2(color),
                        tinycolor2({ h: (h + 120) % 360, s: hsl.s, l: hsl.l }),
                        tinycolor2({ h: (h + 240) % 360, s: hsl.s, l: hsl.l })
                    ];
                }

                function tetrad(color) {
                    var hsl = tinycolor2(color).toHsl();
                    var h = hsl.h;
                    return [
                        tinycolor2(color),
                        tinycolor2({ h: (h + 90) % 360, s: hsl.s, l: hsl.l }),
                        tinycolor2({ h: (h + 180) % 360, s: hsl.s, l: hsl.l }),
                        tinycolor2({ h: (h + 270) % 360, s: hsl.s, l: hsl.l })
                    ];
                }

                function splitcomplement(color) {
                    var hsl = tinycolor2(color).toHsl();
                    var h = hsl.h;
                    return [
                        tinycolor2(color),
                        tinycolor2({ h: (h + 72) % 360, s: hsl.s, l: hsl.l}),
                        tinycolor2({ h: (h + 216) % 360, s: hsl.s, l: hsl.l})
                    ];
                }

                function analogous(color, results, slices) {
                    results = results || 6;
                    slices = slices || 30;

                    var hsl = tinycolor2(color).toHsl();
                    var part = 360 / slices;
                    var ret = [tinycolor2(color)];

                    for (hsl.h = ((hsl.h - (part * results >> 1)) + 720) % 360; --results; ) {
                        hsl.h = (hsl.h + part) % 360;
                        ret.push(tinycolor2(hsl));
                    }
                    return ret;
                }

                function monochromatic(color, results) {
                    results = results || 6;
                    var hsv = tinycolor2(color).toHsv();
                    var h = hsv.h, s = hsv.s, v = hsv.v;
                    var ret = [];
                    var modification = 1 / results;

                    while (results--) {
                        ret.push(tinycolor2({ h: h, s: s, v: v}));
                        v = (v + modification) % 1;
                    }

                    return ret;
                }

                // Utility Functions
                // ---------------------

                tinycolor2.mix = function(color1, color2, amount) {
                    amount = (amount === 0) ? 0 : (amount || 50);

                    var rgb1 = tinycolor2(color1).toRgb();
                    var rgb2 = tinycolor2(color2).toRgb();

                    var p = amount / 100;
                    var w = p * 2 - 1;
                    var a = rgb2.a - rgb1.a;

                    var w1;

                    if (w * a == -1) {
                        w1 = w;
                    } else {
                        w1 = (w + a) / (1 + w * a);
                    }

                    w1 = (w1 + 1) / 2;

                    var w2 = 1 - w1;

                    var rgba = {
                        r: rgb2.r * w1 + rgb1.r * w2,
                        g: rgb2.g * w1 + rgb1.g * w2,
                        b: rgb2.b * w1 + rgb1.b * w2,
                        a: rgb2.a * p  + rgb1.a * (1 - p)
                    };

                    return tinycolor2(rgba);
                };


                // Readability Functions
                // ---------------------
                // <http://www.w3.org/TR/AERT#color-contrast>

                // `readability`
                // Analyze the 2 colors and returns an object with the following properties:
                //    `brightness`: difference in brightness between the two colors
                //    `color`: difference in color/hue between the two colors
                tinycolor2.readability = function(color1, color2) {
                    var c1 = tinycolor2(color1);
                    var c2 = tinycolor2(color2);
                    var rgb1 = c1.toRgb();
                    var rgb2 = c2.toRgb();
                    var brightnessA = c1.getBrightness();
                    var brightnessB = c2.getBrightness();
                    var colorDiff = (
                        Math.max(rgb1.r, rgb2.r) - Math.min(rgb1.r, rgb2.r) +
                        Math.max(rgb1.g, rgb2.g) - Math.min(rgb1.g, rgb2.g) +
                        Math.max(rgb1.b, rgb2.b) - Math.min(rgb1.b, rgb2.b)
                    );

                    return {
                        brightness: Math.abs(brightnessA - brightnessB),
                        color: colorDiff
                    };
                };

                // `readable`
                // http://www.w3.org/TR/AERT#color-contrast
                // Ensure that foreground and background color combinations provide sufficient contrast.
                // *Example*
                //    tinycolor2.isReadable("#000", "#111") => false
                tinycolor2.isReadable = function(color1, color2) {
                    var readability = tinycolor2.readability(color1, color2);
                    return readability.brightness > 125 && readability.color > 500;
                };

                // `mostReadable`
                // Given a base color and a list of possible foreground or background
                // colors for that base, returns the most readable color.
                // *Example*
                //    tinycolor2.mostReadable("#123", ["#fff", "#000"]) => "#000"
                tinycolor2.mostReadable = function(baseColor, colorList) {
                    var bestColor = null;
                    var bestScore = 0;
                    var bestIsReadable = false;
                    for (var i=0; i < colorList.length; i++) {

                        // We normalize both around the "acceptable" breaking point,
                        // but rank brightness constrast higher than hue.

                        var readability = tinycolor2.readability(baseColor, colorList[i]);
                        var readable = readability.brightness > 125 && readability.color > 500;
                        var score = 3 * (readability.brightness / 125) + (readability.color / 500);

                        if ((readable && ! bestIsReadable) ||
                            (readable && bestIsReadable && score > bestScore) ||
                            ((! readable) && (! bestIsReadable) && score > bestScore)) {
                            bestIsReadable = readable;
                            bestScore = score;
                            bestColor = tinycolor2(colorList[i]);
                        }
                    }
                    return bestColor;
                };


                // Big List of Colors
                // ------------------
                // <http://www.w3.org/TR/css3-color/#svg-color>
                var names = tinycolor2.names = {
                    aliceblue: "f0f8ff",
                    antiquewhite: "faebd7",
                    aqua: "0ff",
                    aquamarine: "7fffd4",
                    azure: "f0ffff",
                    beige: "f5f5dc",
                    bisque: "ffe4c4",
                    black: "000",
                    blanchedalmond: "ffebcd",
                    blue: "00f",
                    blueviolet: "8a2be2",
                    brown: "a52a2a",
                    burlywood: "deb887",
                    burntsienna: "ea7e5d",
                    cadetblue: "5f9ea0",
                    chartreuse: "7fff00",
                    chocolate: "d2691e",
                    coral: "ff7f50",
                    cornflowerblue: "6495ed",
                    cornsilk: "fff8dc",
                    crimson: "dc143c",
                    cyan: "0ff",
                    darkblue: "00008b",
                    darkcyan: "008b8b",
                    darkgoldenrod: "b8860b",
                    darkgray: "a9a9a9",
                    darkgreen: "006400",
                    darkgrey: "a9a9a9",
                    darkkhaki: "bdb76b",
                    darkmagenta: "8b008b",
                    darkolivegreen: "556b2f",
                    darkorange: "ff8c00",
                    darkorchid: "9932cc",
                    darkred: "8b0000",
                    darksalmon: "e9967a",
                    darkseagreen: "8fbc8f",
                    darkslateblue: "483d8b",
                    darkslategray: "2f4f4f",
                    darkslategrey: "2f4f4f",
                    darkturquoise: "00ced1",
                    darkviolet: "9400d3",
                    deeppink: "ff1493",
                    deepskyblue: "00bfff",
                    dimgray: "696969",
                    dimgrey: "696969",
                    dodgerblue: "1e90ff",
                    firebrick: "b22222",
                    floralwhite: "fffaf0",
                    forestgreen: "228b22",
                    fuchsia: "f0f",
                    gainsboro: "dcdcdc",
                    ghostwhite: "f8f8ff",
                    gold: "ffd700",
                    goldenrod: "daa520",
                    gray: "808080",
                    green: "008000",
                    greenyellow: "adff2f",
                    grey: "808080",
                    honeydew: "f0fff0",
                    hotpink: "ff69b4",
                    indianred: "cd5c5c",
                    indigo: "4b0082",
                    ivory: "fffff0",
                    khaki: "f0e68c",
                    lavender: "e6e6fa",
                    lavenderblush: "fff0f5",
                    lawngreen: "7cfc00",
                    lemonchiffon: "fffacd",
                    lightblue: "add8e6",
                    lightcoral: "f08080",
                    lightcyan: "e0ffff",
                    lightgoldenrodyellow: "fafad2",
                    lightgray: "d3d3d3",
                    lightgreen: "90ee90",
                    lightgrey: "d3d3d3",
                    lightpink: "ffb6c1",
                    lightsalmon: "ffa07a",
                    lightseagreen: "20b2aa",
                    lightskyblue: "87cefa",
                    lightslategray: "789",
                    lightslategrey: "789",
                    lightsteelblue: "b0c4de",
                    lightyellow: "ffffe0",
                    lime: "0f0",
                    limegreen: "32cd32",
                    linen: "faf0e6",
                    magenta: "f0f",
                    maroon: "800000",
                    mediumaquamarine: "66cdaa",
                    mediumblue: "0000cd",
                    mediumorchid: "ba55d3",
                    mediumpurple: "9370db",
                    mediumseagreen: "3cb371",
                    mediumslateblue: "7b68ee",
                    mediumspringgreen: "00fa9a",
                    mediumturquoise: "48d1cc",
                    mediumvioletred: "c71585",
                    midnightblue: "191970",
                    mintcream: "f5fffa",
                    mistyrose: "ffe4e1",
                    moccasin: "ffe4b5",
                    navajowhite: "ffdead",
                    navy: "000080",
                    oldlace: "fdf5e6",
                    olive: "808000",
                    olivedrab: "6b8e23",
                    orange: "ffa500",
                    orangered: "ff4500",
                    orchid: "da70d6",
                    palegoldenrod: "eee8aa",
                    palegreen: "98fb98",
                    paleturquoise: "afeeee",
                    palevioletred: "db7093",
                    papayawhip: "ffefd5",
                    peachpuff: "ffdab9",
                    peru: "cd853f",
                    pink: "ffc0cb",
                    plum: "dda0dd",
                    powderblue: "b0e0e6",
                    purple: "800080",
                    rebeccapurple: "663399",
                    red: "f00",
                    rosybrown: "bc8f8f",
                    royalblue: "4169e1",
                    saddlebrown: "8b4513",
                    salmon: "fa8072",
                    sandybrown: "f4a460",
                    seagreen: "2e8b57",
                    seashell: "fff5ee",
                    sienna: "a0522d",
                    silver: "c0c0c0",
                    skyblue: "87ceeb",
                    slateblue: "6a5acd",
                    slategray: "708090",
                    slategrey: "708090",
                    snow: "fffafa",
                    springgreen: "00ff7f",
                    steelblue: "4682b4",
                    tan: "d2b48c",
                    teal: "008080",
                    thistle: "d8bfd8",
                    tomato: "ff6347",
                    turquoise: "40e0d0",
                    violet: "ee82ee",
                    wheat: "f5deb3",
                    white: "fff",
                    whitesmoke: "f5f5f5",
                    yellow: "ff0",
                    yellowgreen: "9acd32"
                };

                // Make it easy to access colors via `hexNames[hex]`
                var hexNames = tinycolor2.hexNames = flip(names);


                // Utilities
                // ---------

                // `{ 'name1': 'val1' }` becomes `{ 'val1': 'name1' }`
                function flip(o) {
                    var flipped = { };
                    for (var i in o) {
                        if (o.hasOwnProperty(i)) {
                            flipped[o[i]] = i;
                        }
                    }
                    return flipped;
                }

                // Return a valid alpha value [0,1] with all invalid values being set to 1
                function boundAlpha(a) {
                    a = parseFloat(a);

                    if (isNaN(a) || a < 0 || a > 1) {
                        a = 1;
                    }

                    return a;
                }

                // Take input from [0, n] and return it as [0, 1]
                function bound01(n, max) {
                    if (isOnePointZero(n)) { n = "100%"; }

                    var processPercent = isPercentage(n);
                    n = mathMin(max, mathMax(0, parseFloat(n)));

                    // Automatically convert percentage into number
                    if (processPercent) {
                        n = parseInt(n * max, 10) / 100;
                    }

                    // Handle floating point rounding errors
                    if ((math.abs(n - max) < 0.000001)) {
                        return 1;
                    }

                    // Convert into [0, 1] range if it isn't already
                    return (n % max) / parseFloat(max);
                }

                // Force a number between 0 and 1
                function clamp01(val) {
                    return mathMin(1, mathMax(0, val));
                }

                // Parse a base-16 hex value into a base-10 integer
                function parseIntFromHex(val) {
                    return parseInt(val, 16);
                }

                // Need to handle 1.0 as 100%, since once it is a number, there is no difference between it and 1
                // <http://stackoverflow.com/questions/7422072/javascript-how-to-detect-number-as-a-decimal-including-1-0>
                function isOnePointZero(n) {
                    return typeof n == "string" && n.indexOf('.') != -1 && parseFloat(n) === 1;
                }

                // Check to see if string passed in is a percentage
                function isPercentage(n) {
                    return typeof n === "string" && n.indexOf('%') != -1;
                }

                // Force a hex value to have 2 characters
                function pad2(c) {
                    return c.length == 1 ? '0' + c : '' + c;
                }

                // Replace a decimal with it's percentage value
                function convertToPercentage(n) {
                    if (n <= 1) {
                        n = (n * 100) + "%";
                    }

                    return n;
                }

                // Converts a decimal to a hex value
                function convertDecimalToHex(d) {
                    return Math.round(parseFloat(d) * 255).toString(16);
                }
                // Converts a hex value to a decimal
                function convertHexToDecimal(h) {
                    return (parseIntFromHex(h) / 255);
                }

                var matchers = (function() {

                    // <http://www.w3.org/TR/css3-values/#integers>
                    var CSS_INTEGER = "[-\\+]?\\d+%?";

                    // <http://www.w3.org/TR/css3-values/#number-value>
                    var CSS_NUMBER = "[-\\+]?\\d*\\.\\d+%?";

                    // Allow positive/negative integer/number.  Don't capture the either/or, just the entire outcome.
                    var CSS_UNIT = "(?:" + CSS_NUMBER + ")|(?:" + CSS_INTEGER + ")";

                    // Actual matching.
                    // Parentheses and commas are optional, but not required.
                    // Whitespace can take the place of commas or opening paren
                    var PERMISSIVE_MATCH3 = "[\\s|\\(]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")\\s*\\)?";
                    var PERMISSIVE_MATCH4 = "[\\s|\\(]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")\\s*\\)?";

                    return {
                        rgb: new RegExp("rgb" + PERMISSIVE_MATCH3),
                        rgba: new RegExp("rgba" + PERMISSIVE_MATCH4),
                        hsl: new RegExp("hsl" + PERMISSIVE_MATCH3),
                        hsla: new RegExp("hsla" + PERMISSIVE_MATCH4),
                        hsv: new RegExp("hsv" + PERMISSIVE_MATCH3),
                        hsva: new RegExp("hsva" + PERMISSIVE_MATCH4),
                        hex3: /^([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
                        hex6: /^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,
                        hex8: /^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,
                        alpha: /^(1|0|0\.\d+)$/,
                        alphapercentage: /^(100|\d|\d\d)\s*%/,
                    };
                })();

                // `stringInputToObject`
                // Permissive string parsing.  Take in a number of formats, and output an object
                // based on detected format.  Returns `{ r, g, b }` or `{ h, s, l }` or `{ h, s, v}`
                function stringInputToObject(color) {

                    color = color.replace(trimLeft,'').replace(trimRight, '').toLowerCase();
                    var named = false;
                    if (names[color]) {
                        color = names[color];
                        named = true;
                    }
                    else if (color == 'transparent') {
                        return { r: 0, g: 0, b: 0, a: 0, format: "name" };
                    }

                    // Try to match string input using regular expressions.
                    // Keep most of the number bounding out of this function - don't worry about [0,1] or [0,100] or [0,360]
                    // Just return an object and let the conversion functions handle that.
                    // This way the result will be the same whether the tinycolor is initialized with string or object.
                    var match;
                    if ((match = matchers.rgb.exec(color))) {
                        return { r: match[1], g: match[2], b: match[3] };
                    }
                    if ((match = matchers.rgba.exec(color))) {
                        return { r: match[1], g: match[2], b: match[3], a: match[4] };
                    }
                    if ((match = matchers.hsl.exec(color))) {
                        return { h: match[1], s: match[2], l: match[3] };
                    }
                    if ((match = matchers.hsla.exec(color))) {
                        return { h: match[1], s: match[2], l: match[3], a: match[4] };
                    }
                    if ((match = matchers.hsv.exec(color))) {
                        return { h: match[1], s: match[2], v: match[3] };
                    }
                    if ((match = matchers.hsva.exec(color))) {
                        return { h: match[1], s: match[2], v: match[3], a: match[4] };
                    }
                    if ((match = matchers.hex8.exec(color))) {
                        return {
                            a: convertHexToDecimal(match[1]),
                            r: parseIntFromHex(match[2]),
                            g: parseIntFromHex(match[3]),
                            b: parseIntFromHex(match[4]),
                            format: named ? "name" : "hex8"
                        };
                    }
                    if ((match = matchers.hex6.exec(color))) {
                        return {
                            r: parseIntFromHex(match[1]),
                            g: parseIntFromHex(match[2]),
                            b: parseIntFromHex(match[3]),
                            format: named ? "name" : "hex"
                        };
                    }
                    if ((match = matchers.hex3.exec(color))) {
                        return {
                            r: parseIntFromHex(match[1] + '' + match[1]),
                            g: parseIntFromHex(match[2] + '' + match[2]),
                            b: parseIntFromHex(match[3] + '' + match[3]),
                            format: named ? "name" : "hex"
                        };
                    }
                    if ((match = matchers.alphapercentage.exec(color))) {
                        return {a:match[1]/100,format:"alpha"};
                    }
                    if ((match = matchers.alpha.exec(color))) {
                        return {a:match[1],format:"alpha"};
                    }
                    return false;
                }

                window.tinycolor2 = tinycolor2;
            })();

            $(function () {
                if ($.fn.spectrum2.load) {
                    $.fn.spectrum2.processNativeColorInputs();
                }
            });

        });

        var stylesheet = document.body.appendChild(document.createElement('style'));
        stylesheet.innerHTML = `
/***
Spectrum Colorpicker v1.8.1
https://github.com/bgrins/spectrum
Author: Brian Grinstead
License: MIT
***/

.sp2-container {
    position:absolute;
    top:0;
    left:0;
    display:inline-block;
    *display: inline;
    *zoom: 1;
    /* https://github.com/bgrins/spectrum/issues/40 */
    z-index: 9999994;
    overflow: hidden;
}
.sp2-container.sp2-flat {
    position: relative;
}

/* Fix for * { box-sizing: border-box; } */
.sp2-container,
.sp2-container * {
    -webkit-box-sizing: content-box;
       -moz-box-sizing: content-box;
            box-sizing: content-box;
}

/* http://ansciath.tumblr.com/post/7347495869/css-aspect-ratio */
.sp2-top {
  position:relative;
  width: 100%;
  display:inline-block;
}
.sp2-top-inner {
   position:absolute;
   top:0;
   left:0;
   bottom:0;
   right:0;
}
.sp2-color {
    position: absolute;
    top:0;
    left:0;
    bottom:0;
    right:20%;
}
.sp2-hue {
    position: absolute;
    top:0;
    right:0;
    bottom:0;
    left:84%;
    height: 100%;
}

.sp2-clear-enabled .sp2-hue {
    top:33px;
    height: 77.5%;
}

.sp2-fill {
    padding-top: 80%;
}
.sp2-sat, .sp2-val {
    position: absolute;
    top:0;
    left:0;
    right:0;
    bottom:0;
}

.sp2-alpha-enabled .sp2-top {
    margin-bottom: 18px;
}
.sp2-alpha-enabled .sp2-alpha {
    display: block;
}
.sp2-alpha-handle {
    position:absolute;
    top:-4px;
    bottom: -4px;
    width: 6px;
    left: 50%;
    cursor: pointer;
    border: 1px solid black;
    background: white;
    opacity: .8;
}
.sp2-alpha {
    display: none;
    position: absolute;
    bottom: -14px;
    right: 0;
    left: 0;
    height: 8px;
}
.sp2-alpha-inner {
    border: solid 1px #333;
}

.sp2-clear {
    display: none;
}

.sp2-clear.sp2-clear-display {
    background-position: center;
}

.sp2-clear-enabled .sp2-clear {
    display: block;
    position:absolute;
    top:0px;
    right:0;
    bottom:0;
    left:84%;
    height: 28px;
}

/* Don't allow text selection */
.sp2-container, .sp2-replacer, .sp2-preview, .sp2-dragger, .sp2-slider, .sp2-alpha, .sp2-clear, .sp2-alpha-handle, .sp2-container.sp2-dragging .sp2-input, .sp2-container button  {
    -webkit-user-select:none;
    -moz-user-select: -moz-none;
    -o-user-select:none;
    user-select: none;
}

.sp2-container.sp2-input-disabled .sp2-input-container {
    display: none;
}
.sp2-container.sp2-buttons-disabled .sp2-button-container {
    display: none;
}
.sp2-container.sp2-palette-buttons-disabled .sp2-palette-button-container {
    display: none;
}
.sp2-palette-only .sp2-picker-container {
    display: none;
}
.sp2-palette-disabled .sp2-palette-container {
    display: none;
}

.sp2-picker-disabled .sp2-fill {
    display: none;
}
.sp2-picker-disabled .sp2-top-inner {
    display: none;
}

.sp2-initial-disabled .sp2-initial {
    display: none;
}


/* Gradients for hue, saturation and value instead of images.  Not pretty... but it works */
.sp2-sat {
    background-image: -webkit-gradient(linear,  0 0, 100% 0, from(#FFF), to(rgba(204, 154, 129, 0)));
    background-image: -webkit-linear-gradient(left, #FFF, rgba(204, 154, 129, 0));
    background-image: -moz-linear-gradient(left, #fff, rgba(204, 154, 129, 0));
    background-image: -o-linear-gradient(left, #fff, rgba(204, 154, 129, 0));
    background-image: -ms-linear-gradient(left, #fff, rgba(204, 154, 129, 0));
    background-image: linear-gradient(to right, #fff, rgba(204, 154, 129, 0));
    -ms-filter: "progid:DXImageTransform.Microsoft.gradient(GradientType = 1, startColorstr=#FFFFFFFF, endColorstr=#00CC9A81)";
    filter : progid:DXImageTransform.Microsoft.gradient(GradientType = 1, startColorstr='#FFFFFFFF', endColorstr='#00CC9A81');
}
.sp2-val {
    background-image: -webkit-gradient(linear, 0 100%, 0 0, from(#000000), to(rgba(204, 154, 129, 0)));
    background-image: -webkit-linear-gradient(bottom, #000000, rgba(204, 154, 129, 0));
    background-image: -moz-linear-gradient(bottom, #000, rgba(204, 154, 129, 0));
    background-image: -o-linear-gradient(bottom, #000, rgba(204, 154, 129, 0));
    background-image: -ms-linear-gradient(bottom, #000, rgba(204, 154, 129, 0));
    background-image: linear-gradient(to top, #000, rgba(204, 154, 129, 0));
    -ms-filter: "progid:DXImageTransform.Microsoft.gradient(startColorstr=#00CC9A81, endColorstr=#FF000000)";
    filter : progid:DXImageTransform.Microsoft.gradient(startColorstr='#00CC9A81', endColorstr='#FF000000');
}

.sp2-hue {
    background: -moz-linear-gradient(top, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);
    background: -ms-linear-gradient(top, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);
    background: -o-linear-gradient(top, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);
    background: -webkit-gradient(linear, left top, left bottom, from(#ff0000), color-stop(0.17, #ffff00), color-stop(0.33, #00ff00), color-stop(0.5, #00ffff), color-stop(0.67, #0000ff), color-stop(0.83, #ff00ff), to(#ff0000));
    background: -webkit-linear-gradient(top, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);
    background: linear-gradient(to bottom, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);
}

/* IE filters do not support multiple color stops.
   Generate 6 divs, line them up, and do two color gradients for each.
   Yes, really.
 */
.sp2-1 {
    height:17%;
    filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='#ff0000', endColorstr='#ffff00');
}
.sp2-2 {
    height:16%;
    filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='#ffff00', endColorstr='#00ff00');
}
.sp2-3 {
    height:17%;
    filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='#00ff00', endColorstr='#00ffff');
}
.sp2-4 {
    height:17%;
    filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='#00ffff', endColorstr='#0000ff');
}
.sp2-5 {
    height:16%;
    filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='#0000ff', endColorstr='#ff00ff');
}
.sp2-6 {
    height:17%;
    filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='#ff00ff', endColorstr='#ff0000');
}

.sp2-hidden {
    display: none !important;
}

/* Clearfix hack */
.sp2-cf:before, .sp2-cf:after { content: ""; display: table; }
.sp2-cf:after { clear: both; }
.sp2-cf { *zoom: 1; }

/* Mobile devices, make hue slider bigger so it is easier to slide */
@media (max-device-width: 480px) {
    .sp2-color { right: 40%; }
    .sp2-hue { left: 63%; }
    .sp2-fill { padding-top: 60%; }
}
.sp2-dragger {
   border-radius: 5px;
   height: 5px;
   width: 5px;
   border: 1px solid #fff;
   background: #000;
   cursor: pointer;
   position:absolute;
   top:0;
   left: 0;
}
.sp2-slider {
    position: absolute;
    top:0;
    cursor:pointer;
    height: 3px;
    left: -1px;
    right: -1px;
    border: 1px solid #000;
    background: white;
    opacity: .8;
}

/*
Theme authors:
Here are the basic themeable display options (colors, fonts, global widths).
See http://bgrins.github.io/spectrum/themes/ for instructions.
*/

.sp2-container {
    border-radius: 0;
    background-color: #ECECEC;
    border: solid 1px #f0c49B;
    padding: 0;
}
.sp2-container, .sp2-container button, .sp2-container input, .sp2-color, .sp2-hue, .sp2-clear {
    font: normal 12px "Lucida Grande", "Lucida Sans Unicode", "Lucida Sans", Geneva, Verdana, sans-serif;
    -webkit-box-sizing: border-box;
    -moz-box-sizing: border-box;
    -ms-box-sizing: border-box;
    box-sizing: border-box;
}
.sp2-top {
    margin-bottom: 3px;
}
.sp2-color, .sp2-hue, .sp2-clear {
    border: solid 1px #666;
}

/* Input */
.sp2-input-container {
    float:right;
    width: 100px;
    margin-bottom: 4px;
}
.sp2-initial-disabled  .sp2-input-container {
    width: 100%;
}
.sp2-input {
   font-size: 12px !important;
   border: 1px inset;
   padding: 4px 5px;
   margin: 0;
   width: 100%;
   background:transparent;
   border-radius: 3px;
   color: #222;
}
.sp2-input:focus  {
    border: 1px solid orange;
}
.sp2-input.sp2-validation-error {
    border: 1px solid red;
    background: #fdd;
}
.sp2-picker-container , .sp2-palette-container {
    float:left;
    position: relative;
    padding: 10px;
    padding-bottom: 300px;
    margin-bottom: -290px;
}
.sp2-picker-container {
    width: 172px;
    border-left: solid 1px #fff;
}

/* Palettes */
.sp2-palette-container {
    border-right: solid 1px #ccc;
}

.sp2-palette-only .sp2-palette-container {
    border: 0;
}

.sp2-palette .sp2-thumb-el {
    display: block;
    position:relative;
    float:left;
    width: 24px;
    height: 15px;
    margin: 3px;
    cursor: pointer;
    border:solid 2px transparent;
}
.sp2-palette .sp2-thumb-el:hover, .sp2-palette .sp2-thumb-el.sp2-thumb-active {
    border-color: orange;
}
.sp2-thumb-el {
    position:relative;
}

/* Initial */
.sp2-initial {
    float: left;
    border: solid 1px #333;
}
.sp2-initial span {
    width: 30px;
    height: 25px;
    border:none;
    display:block;
    float:left;
    margin:0;
}

.sp2-initial .sp2-clear-display {
    background-position: center;
}

/* Buttons */
.sp2-palette-button-container,
.sp2-button-container {
    float: right;
}

/* Replacer (the little preview div that shows up instead of the <input>) */
.sp2-replacer {
    margin:0;
    overflow:hidden;
    cursor:pointer;
    padding: 4px;
    display:inline-block;
    *zoom: 1;
    *display: inline;
    border: solid 1px #91765d;
    background: #eee;
    color: #333;
    vertical-align: middle;
}
.sp2-replacer:hover, .sp2-replacer.sp2-active {
    border-color: #F0C49B;
    color: #111;
}
.sp2-replacer.sp2-disabled {
    cursor:default;
    border-color: silver;
    color: silver;
}
.sp2-dd {
    padding: 2px 0;
    height: 16px;
    line-height: 16px;
    float:left;
    font-size:10px;
}
.sp2-preview {
    position:relative;
    width:25px;
    height: 20px;
    border: solid 1px #222;
    margin-right: 5px;
    float:left;
    z-index: 0;
}

.sp2-palette {
    *width: 220px;
    max-width: 220px;
}
.sp2-palette .sp2-thumb-el {
    width:16px;
    height: 16px;
    margin:2px 1px;
    border: solid 1px #d0d0d0;
}

.sp2-container {
    padding-bottom:0;
}


/* Buttons: http://hellohappy.org/css3-buttons/ */
.sp2-container button {
  background-color: #eeeeee;
  background-image: -webkit-linear-gradient(top, #eeeeee, #cccccc);
  background-image: -moz-linear-gradient(top, #eeeeee, #cccccc);
  background-image: -ms-linear-gradient(top, #eeeeee, #cccccc);
  background-image: -o-linear-gradient(top, #eeeeee, #cccccc);
  background-image: linear-gradient(to bottom, #eeeeee, #cccccc);
  border: 1px solid #ccc;
  border-bottom: 1px solid #bbb;
  border-radius: 3px;
  color: #333;
  font-size: 14px;
  line-height: 1;
  padding: 5px 4px;
  text-align: center;
  text-shadow: 0 1px 0 #eee;
  vertical-align: middle;
}
.sp2-container button:hover {
    background-color: #dddddd;
    background-image: -webkit-linear-gradient(top, #dddddd, #bbbbbb);
    background-image: -moz-linear-gradient(top, #dddddd, #bbbbbb);
    background-image: -ms-linear-gradient(top, #dddddd, #bbbbbb);
    background-image: -o-linear-gradient(top, #dddddd, #bbbbbb);
    background-image: linear-gradient(to bottom, #dddddd, #bbbbbb);
    border: 1px solid #bbb;
    border-bottom: 1px solid #999;
    cursor: pointer;
    text-shadow: 0 1px 0 #ddd;
}
.sp2-container button:active {
    border: 1px solid #aaa;
    border-bottom: 1px solid #888;
    -webkit-box-shadow: inset 0 0 5px 2px #aaaaaa, 0 1px 0 0 #eeeeee;
    -moz-box-shadow: inset 0 0 5px 2px #aaaaaa, 0 1px 0 0 #eeeeee;
    -ms-box-shadow: inset 0 0 5px 2px #aaaaaa, 0 1px 0 0 #eeeeee;
    -o-box-shadow: inset 0 0 5px 2px #aaaaaa, 0 1px 0 0 #eeeeee;
    box-shadow: inset 0 0 5px 2px #aaaaaa, 0 1px 0 0 #eeeeee;
}
.sp2-cancel,.sp2-default {
    font-size: 11px;
    color: #d93f3f !important;
    margin:0;
    padding:2px;
    margin-right: 5px;
    vertical-align: middle;
    text-decoration:none;

}
.sp2-cancel:hover,.sp2-default:hover {
    color: #d93f3f !important;
    text-decoration: underline;
}


.sp2-palette span:hover, .sp2-palette span.sp2-thumb-active {
    border-color: #000;
}

.sp2-preview, .sp2-alpha, .sp2-thumb-el {
    position:relative;
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAGUlEQVQYV2M4gwH+YwCGIasIUwhT25BVBADtzYNYrHvv4gAAAABJRU5ErkJggg==);
}
.sp2-preview-inner, .sp2-alpha-inner, .sp2-thumb-inner {
    display:block;
    position:absolute;
    top:0;left:0;bottom:0;right:0;
}

.sp2-palette .sp2-thumb-inner {
    background-position: 50% 50%;
    background-repeat: no-repeat;
}

.sp2-palette .sp2-thumb-light.sp2-thumb-active .sp2-thumb-inner {
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAIVJREFUeNpiYBhsgJFMffxAXABlN5JruT4Q3wfi/0DsT64h8UD8HmpIPCWG/KemIfOJCUB+Aoacx6EGBZyHBqI+WsDCwuQ9mhxeg2A210Ntfo8klk9sOMijaURm7yc1UP2RNCMbKE9ODK1HM6iegYLkfx8pligC9lCD7KmRof0ZhjQACDAAceovrtpVBRkAAAAASUVORK5CYII=);
}

.sp2-palette .sp2-thumb-dark.sp2-thumb-active .sp2-thumb-inner {
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjEwMPRyoQAAAMdJREFUOE+tkgsNwzAMRMugEAahEAahEAZhEAqlEAZhEAohEAYh81X2dIm8fKpEspLGvudPOsUYpxE2BIJCroJmEW9qJ+MKaBFhEMNabSy9oIcIPwrB+afvAUFoK4H0tMaQ3XtlrggDhOVVMuT4E5MMG0FBbCEYzjYT7OxLEvIHQLY2zWwQ3D+9luyOQTfKDiFD3iUIfPk8VqrKjgAiSfGFPecrg6HN6m/iBcwiDAo7WiBeawa+Kwh7tZoSCGLMqwlSAzVDhoK+6vH4G0P5wdkAAAAASUVORK5CYII=);
}

.sp2-clear-display {
    background-repeat:no-repeat;
    background-position: center;
    background-image: url(data:image/gif;base64,R0lGODlhFAAUAPcAAAAAAJmZmZ2dnZ6enqKioqOjo6SkpKWlpaampqenp6ioqKmpqaqqqqurq/Hx8fLy8vT09PX19ff39/j4+Pn5+fr6+vv7+wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAEAAP8ALAAAAAAUABQAAAihAP9FoPCvoMGDBy08+EdhQAIJCCMybCDAAYUEARBAlFiQQoMABQhKUJBxY0SPICEYHBnggEmDKAuoPMjS5cGYMxHW3IiT478JJA8M/CjTZ0GgLRekNGpwAsYABHIypcAgQMsITDtWJYBR6NSqMico9cqR6tKfY7GeBCuVwlipDNmefAtTrkSzB1RaIAoXodsABiZAEFB06gIBWC1mLVgBa0AAOw==);
}
`;
    }; // end setupColorpickerSpectrum

    self.setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        if (!window.TEAM_NAMES) window.TEAM_NAMES = ['Neutral', 'Resistance', 'Enlightened']; // IITC-me support
        if (!window.TEAM_MAC) window.TEAM_MAC = 3; // IITC 0.34 support
        if (window.TEAM_NAMES.length <= 3) window.TEAM_NAMES.push('U̶͚̓̍N̴̖̈K̠͔̍͑̂͜N̞̥͋̀̉Ȯ̶̹͕̀W̶̢͚͑̚͝Ṉ̨̟̒̅'); // add machina
        if (window.COLORS.length <= 3) window.COLORS.push('#FF0028'); // none, res, enl, mac

        // settings and spectrumoptions need to be setup here
        let defaultlinkopacity = 1;
        try {
            defaultlinkopacity = parseFloat(window.Render.prototype.createLinkEntity.toString().match(/opacity:(.+?),/)[1]);
        } catch(e) {}
        let defaultlinkweight = 2;
        try {
            defaultlinkweight = parseInt(window.Render.prototype.createLinkEntity.toString().match(/weight:.+?:(.+?),/)[1]);
        } catch(e) {}
        let defaultfieldopacity = 0.25;
        try {
            defaultfieldopacity = parseFloat(window.Render.prototype.createFieldEntity.toString().match(/fillOpacity:(.+),/)[1]);
        } catch(e) {}
        let defaultportaloptions = {
            opacity:1,
            fillOpacity:0.5
        };
        try {
            defaultportaloptions = window.getMarkerStyleOptions({level:undefined,team:undefined});
        } catch(e) {}

        self.defaultsettings = {
            enabled: true,
            fieldcolor: [...window.COLORS],
            portalcolor: [...window.COLORS,window.COLOR_SELECTED_PORTAL],
            portalfillcolor: [...window.COLORS],
            linkcolor: [...window.COLORS],
            linkweight: [0,defaultlinkweight,defaultlinkweight,defaultlinkweight],
            fieldopacity: [0,defaultfieldopacity,defaultfieldopacity],
            portalopacity: [defaultportaloptions.opacity,defaultportaloptions.opacity,defaultportaloptions.opacity,defaultportaloptions.opacity,defaultportaloptions.opacity],
            portalfillopacity: [defaultportaloptions.fillOpacity,defaultportaloptions.fillOpacity,defaultportaloptions.fillOpacity,defaultportaloptions.fillOpacity],
            linkopacity: [0,defaultlinkopacity,defaultlinkopacity,defaultlinkopacity],
            selectedprofile: ''
        };
        self.settings = JSON.parse(JSON.stringify(self.defaultsettings)); // hard copy
        self.spectrumoptions = {
            flat: false,
            showInput: true,
            showButtons: true,
            showPalette: true,
            showAlpha: false,
            showSelectionPalette: true,
            allowEmpty: false,
            preferredFormat: "hex6",
            palette: [
                ['#004000','#008000','#00C000',window.COLORS[window.TEAM_ENL]],
                ['#00FF00','#80FF80','#C0FFC0'],
                ['#000040','#000080','#0000C0',window.COLORS[window.TEAM_RES]],
                ['#4040FF','#8080FF','#C0C0FF'],
                ['#6A3400','#964A00','#C05F00',window.COLORS[window.TEAM_NONE]],
                ['#E27000','#FF8309','#FFC287'],
                ['#a24ac3','#514ac3','#4aa8c3','#51c34a'],
                ['#c1c34a','#c38a4a','#c34a4a','#c34a6f'],
                ['#000000','#666666','#bbbbbb','#ffffff']
            ],
            localStorageKey: self.localstoragespectrum
        };
        self.spectrumopacityoptions = {
            flat: false,
            showInput: true,
            showButtons: true,
            showPalette: false,
            showPicker: false,
            showAlpha: true,
            allowEmpty: false,
            preferredFormat: "alphapercentage"
        };

        self.setupColorpickerSpectrum();
        //self.setupResetHighlightedPortals();
        self.setupSetMarkerStyle();
        self.restoresettings();
        self.restoreprofiles();

        window.addHook('portalAdded',function(data) { if (data && data.portal && (data.portal instanceof Object)) self.applyPortalStyle(data.portal); }); // {portal: marker, previousData: previousData}
        window.addHook('linkAdded',function(data) { if (data && data.link && (data.link instanceof window.L.GeodesicPolyline)) self.applyLinkStyle(data.link); }); // {link: poly}
        window.addHook('fieldAdded',function(data) { if (data && data.field && (data.field instanceof window.L.GeodesicPolygon)) self.applyFieldStyle(data.field); }); // {field: poly}
        window.addHook('portalSelected',function(data) { if (data && data.selectedPortalGuid && data.selectedPortalGuid in window.portals) self.applyPortalStyle(window.portals[data.selectedPortalGuid],true); }); // {selectedPortalGuid: guid, unselectedPortalGuid: oldPortalGuid}

        //add options menu
        let toolboxlink = document.getElementById('toolbox').appendChild(document.createElement('a'));
        toolboxlink.textContent = self.title;
        toolboxlink.addEventListener('click', function(e) {
            e.preventDefault();
            self.menu();
        }, false);

        var stylesheet = document.body.appendChild(document.createElement('style'));
        stylesheet.innerHTML = `
.${self.id}menu a { display:block; color:#ffce00; border:1px solid #ffce00; padding:3px 0; margin:10px auto; width:80%; text-align:center; background:rgba(8,48,78,.9); }
.${self.id}menu button { min-width: unset; width: fit-content; cursor: pointer; }
.${self.id}menu button:disabled { color: #bbb; cursor: default; }
.${self.id}menu label { user-select: none; }
.${self.id}author { margin-top: 14px; font-style: italic; font-size: smaller; }
.${self.id}notificationwrapper{position:absolute;top:20px;width:100%;display:flex;justify-content:center;}
.${self.id}notification{z-index: 10000;background-color: #383838;color: #F0F0F0;font-family: Calibri;font-size: 20px;padding:10px;text-align:center;border-radius: 2px;-webkit-box-shadow: 0px 0px 24px -1px rgba(56, 56, 56, 1);-moz-box-shadow: 0px 0px 24px -1px rgba(56, 56, 56, 1);box-shadow: 0px 0px 24px -1px rgba(56, 56, 56, 1);}
`;

        let notificationwrapper = document.body.appendChild(document.createElement('div'));
        notificationwrapper.className = `${self.id}notificationwrapper`;
        let notificationobject = notificationwrapper.appendChild(document.createElement('div'));
        notificationobject.className = `${self.id}notification`;
        notificationobject.style.display = 'none';

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
