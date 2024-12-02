// ==UserScript==
// @author         DanielOnDiordna
// @name           Onscreen Portal Details
// @category       Info
// @version        0.0.3.20210724.002500
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/onscreenportaldetails.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/onscreenportaldetails.user.js
// @description    [danielondiordna-0.0.3.20210724.002500] Show portal info about resonators and mods for the selected portal directly on the map.
// @id             onscreenportaldetails@DanielOnDiordna
// @namespace      https://softspot.nl/ingress/
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.onscreenportaldetails = function() {};
    var self = window.plugin.onscreenportaldetails;
    self.id = 'onscreenportaldetails';
    self.title = 'Onscreen Portal Details';
    self.version = '0.0.3.20210724.002500';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 0.0.1.20190523.214500
- first release

version 0.0.2.20190530.124000
- default color set to red
- added horizontal offset
- changed mods from 1 to 2 characters
- fixed portal details display for selected portal only

version 0.0.3.20210204.103400
- renamed plugin to from 'Selected Portal Info' to 'Onscreen Portal Details'
- added click through option: pointer-events:none;
- sort resonators by level and owner name
- updated plugin wrapper and userscript header formatting to match IITC-CE coding

version 0.0.3.20210421.190200
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin

version 0.0.3.20210724.002500
- prevent double plugin setup on hook iitcLoaded
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.settings = {};
    self.settings.show = true;

    self.textcolor = 'red';
    self.shadowcolor = 'black';
    self.currentplayercolor = 'black';
    self.backgroundcolor = 'rgba(255, 255, 255, 0.5)';
    self.horizontaloffset = 10; // px
    self.verticaloffset = -190; // px
    self.textsize = 8; // pt

    self.shortmodnames =
        {
            'Heat Sink'            :'HS',
            'Portal Shield'        :'SH',
            'Link Amp'             :'LA',
            'Turret'               :'TU',
            'Multi-hack'           :'MH',
            'Aegis Shield'         :'AE',
            'Force Amp'            :'FA',
            'SoftBank Ultra Link'  :'UL',
            'Ito En Transmuter (+)':'I+',
            'Ito En Transmuter (-)':'I-'
        };
    self.shortrarities =
        {
            'COMMON'    : 'c',
            'RARE'      : 'r',
            'VERY_RARE' : 'vr'
        };

    self.restoresettings = function() {
        if (typeof localStorage[self.pluginname + '-settings'] === 'string') {
            var settings = JSON.parse(localStorage[self.pluginname + '-settings']);
            if (typeof settings === 'object' && settings instanceof Object) {
                if (typeof settings.show === 'boolean') self.settings.show = settings.show;
            }
        }
    };

    self.storesettings = function() {
        var settings = {};
        settings.show = self.settings.show;
        localStorage[self.pluginname + '-settings'] = JSON.stringify(settings);
    };

    self.onPortalSelected = function() {
        $('.' + self.id).remove();
        if (self.settings.show === false) return;
        if (!window.selectedPortal) return;
        // prepare a text area above the mobile status-bar or above the chatcontrols
        $('#' + (window.isSmartphone()?'updatestatus':'chatcontrols')).prepend('<span class="' + self.id + '" style="background-color: ' + self.backgroundcolor + '; pointer-events:none; float:left; margin:' + self.verticaloffset + 'px 0px 0px ' + self.horizontaloffset + 'px; color: ' + self.textcolor + '; font-size:' + self.textsize + 'pt"></span>');
        //  text-shadow: 2px 2px 5px ' + self.shadowcolor + ';

        if (window.portals[window.selectedPortal]) {
            self.showPortalSelected();
        }
    };

    self.showPortalSelected = function(data) {
        if (!window.selectedPortal || self.settings.moredetailschecked === false) {
            $('.' + self.id).html('');
            return;
        }
        if (data && data.guid !== window.selectedPortal) return;
        if (!data || !data.details) {
            data = {};
            data.details = window.portalDetail.get(window.selectedPortal);
            if (!data.details) return;
        }
        if (!data.details.resonators) return;

        var portalowner = data.details.owner;
        var player = window.PLAYER.nickname;

        data.details.resonators.sort(function(a, b) {
            if (a.level === b.level) {
                if (a.owner === b.owner) {
                    return 0;
                } else {
                    return (a.owner.toLowerCase() > b.owner.toLowerCase()) ? 1 : -1;
                }
            } else {
                return (a.level < b.level) ? 1 : -1;
            }
        });
        var resonators = [];
        for (let cnt = 0; cnt < 8; cnt++) {
            if (data.details.resonators[cnt] && data.details.resonators[cnt].owner) {
                let owner = data.details.resonators[cnt].owner;
                let ownertext = owner;
                if (owner === player) ownertext = '<span style="color:' + self.currentplayercolor + '">' + ownertext + '</span>';
                if (owner === portalowner) ownertext = '<u>' + ownertext + '</u>';
                resonators.push('R' + data.details.resonators[cnt].level + ' ' + ownertext);
            }
        }

        var mods = [];
        for (let cnt = 0; cnt < 4; cnt++) {
            if (data.details.mods[cnt] && data.details.mods[cnt].owner) {
                let shortname = self.shortmodnames[data.details.mods[cnt].name];
                let rarity = (shortname === 'HS' || shortname === 'SH' || shortname === 'MH' ? self.shortrarities[data.details.mods[cnt].rarity] : '');
                let owner = data.details.mods[cnt].owner;
                let ownertext = owner;
                if (owner === player) ownertext = '<span style="color:' + self.currentplayercolor + '">' + ownertext + '</span>';
                if (owner === portalowner) ownertext = '<u>' + ownertext + '</u>';
                mods.push(rarity + shortname + ' ' + ownertext);
            }
        }

        $('.' + self.id).html('<div>' +resonators.join('<br />') + '</div><div style="margin-top: 4px;">' + mods.join('<br />') + '</div>');
    };

    self.setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        // delete old plugin data:
        localStorage.removeItem('selectedportalinfo-settings');

        self.infolayer = new L.LayerGroup();
        window.addLayerGroup(self.title, self.infolayer, self.settings.show);
        map.on('layeradd', function(obj) {
            if (obj.layer === self.infolayer) {
                self.settings.show = true;
                self.storesettings();
                self.onPortalSelected();
            }
        });
        map.on('layerremove', function(obj) {
            if (obj.layer === self.infolayer) {
                self.settings.show = false;
                self.storesettings();
                self.onPortalSelected();
            }
        });

        self.restoresettings();

        window.addHook('portalSelected',self.onPortalSelected);
        window.addHook('portalDetailLoaded',self.showPortalSelected);

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

