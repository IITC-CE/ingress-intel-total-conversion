// ==UserScript==
// @author         DanielOnDiordna
// @name           Keep all data
// @version        1.0.0.20220711.233600
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/keepalldata.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/keepalldata.user.js
// @description    [danielondiordna-1.0.0.20220711.233600] Use the layer selector to toggle Keep all portals and Keep all links, to keep all out of view portals and links loaded (be aware that currently destroyed links are not removed when these options are switched on)
// @namespace      https://softspot.nl/ingress/
// @category       Cache
// @id             keepalldata@DanielOnDiordna
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.keepalldata = function() {};
    var self = window.plugin.keepalldata;
    self.id = 'keepalldata';
    self.title = 'Keep all data';
    self.version = '1.0.0.20220711.233600';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 1.0.0.20220711.233600
- made compatible with IITC-CE Beta 0.32.1.20211217.151857

version 0.0.7.20210724.002500
- prevent double plugin setup on hook iitcLoaded

version 0.0.7.20210421.190200
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin

version 0.0.7.20210222.194600
- fixed a log.log error for IITC-CE in function endRenderPass
- changed from injecting into window.Render.prototype to window.mapDataRequest.render
- moved some code into functions to clean up the setup

version 0.0.6.20210121.223500
- version number fix
- added delete portals and delete links code when keep all data options are disabled

version 0.0.5.20211801.221400
- updated plugin wrapper and userscript header formatting to match IITC-CE coding

version 0.0.4.20201230.203400
- earlier release
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.settings = {
        keepallportalstitle: 'Keep all portals',
        keepallportals: false,
        keepalllinkstitle: 'Keep all links',
        keepalllinks: false
    };

    self.portalwarningdisplayed = false;
    self.linkwarningdisplayed = false;

    self.setupRenderPass = function() {
        if (!window.mapDataRequest || !window.mapDataRequest.render || !window.mapDataRequest.render.endRenderPass || !window.mapDataRequest.render.startRenderPass) {
            console.log('IITC plugin ERROR: ' + self.title + ' version ' + self.version + ' - requires window.mapDataRequest.render.endRenderPass and startRenderPass');
            return false;
        }

        let endRenderPass_string = window.mapDataRequest.render.endRenderPass.toString();
        if (endRenderPass_string.match('log.log')) endRenderPass_string = endRenderPass_string.replace('{','{\n  var log = ulog(\'map_data_render\');'); // IITC-CE fix
        endRenderPass_string = endRenderPass_string.replace('selectedPortal','selectedPortal && !' + self.namespace + 'settings.keepallportals');
        endRenderPass_string = endRenderPass_string.replace('seenLinksGuid)','seenLinksGuid) && !' + self.namespace + 'settings.keepalllinks');
        eval('window.mapDataRequest.render.endRenderPass = ' + endRenderPass_string);

        let startRenderPass_string = window.mapDataRequest.render.startRenderPass.toString();
        startRenderPass_string = startRenderPass_string.replace('this.clearPortals','if (!' + self.namespace + 'settings.keepallportals) this.clearPortals');
        startRenderPass_string = startRenderPass_string.replace('this.clearLinks','if (!' + self.namespace + 'settings.keepalllinks) this.clearLinks');
        eval('window.mapDataRequest.render.startRenderPass = ' + startRenderPass_string);

        return true;
    };

    self.setupLayerGroupPortals = function() {
        if (window.isLayerGroupDisplayed(self.settings.keepallportalstitle)) {
            if (typeof window.updateDisplayedLayerGroup == "function") { // IITC 0.32.1 Release
                window.updateDisplayedLayerGroup(self.settings.keepallportalstitle,false); // force start status false
            } else if (typeof window.layerChooser._storeOverlayState == "function") { // IITC 0.32.1 Beta
                window.layerChooser._storeOverlayState(self.settings.keepallportalstitle,false); // force start status false
            }
        }
        self.togglekeepallportals = new window.L.LayerGroup();
        window.addLayerGroup(self.settings.keepallportalstitle, self.togglekeepallportals);
        window.map.on('layeradd', function(obj) {
            if (obj.layer == self.togglekeepallportals) {
                self.settings.keepallportals = true;
                if (!self.portalwarningdisplayed) {
                    alert('You have enabled the "Keep all portals" option.\n\nAll loaded portals will stay visible at every zoom level, until you disable this option or refresh the map.');
                    self.portalwarningdisplayed = true;
                }
            }
        });
        window.map.on('layerremove', function(obj) {
            if (obj.layer == self.togglekeepallportals) {
                self.settings.keepallportals = false;

                // delete portals
                let countp = 0;
                for (const guid in window.portals) {
                    if (!(guid in window.mapDataRequest.render.seenPortalsGuid) && guid !== window.selectedPortal) {
                        window.mapDataRequest.render.deletePortalEntity(guid);
                        countp++;
                    }
                }
                if (countp > 0) console.log(self.title + ': end cleanup: removed ' + countp + ' portals');
            }
        });
    };

    self.setupLayerGroupLinks = function() {
        if (window.isLayerGroupDisplayed(self.settings.keepalllinkstitle)) {
            if (typeof window.updateDisplayedLayerGroup == "function") { // IITC 0.32.1 Release
                window.updateDisplayedLayerGroup(self.settings.keepalllinkstitle,false); // force start status false
            } else if (typeof window.layerChooser._storeOverlayState == "function") { // IITC 0.32.1 Beta
                window.layerChooser._storeOverlayState(self.settings.keepalllinkstitle,false); // force start status false
            }
        }
        self.togglekeepalllinks = new window.L.LayerGroup();
        window.addLayerGroup(self.settings.keepalllinkstitle, self.togglekeepalllinks);
        window.map.on('layeradd', function(obj) {
            if (obj.layer == self.togglekeepalllinks) {
                self.settings.keepalllinks = true;
                if (!self.linkwarningdisplayed) {
                    alert('You have enabled the "Keep all links" option.\n\nAll loaded links will stay visible at every zoom level. Be aware that destroyed links will not be removed from the map, until you disable this option and refresh the map.');
                    self.linkwarningdisplayed = true;
                }
            }
        });
        map.on('layerremove', function(obj) {
            if (obj.layer == self.togglekeepalllinks) {
                self.settings.keepalllinks = false;

                // delete links
                let countl = 0
                for (const guid in window.links) {
                    if (!(guid in window.mapDataRequest.render.seenLinksGuid)) {
                        window.mapDataRequest.render.deleteLinkEntity(guid);
                        countl++;
                    }
                }
                if (countl > 0) console.log(self.title + ': end cleanup: removed ' + countl + ' links');
            }
        });
    };

    self.menu = function() {
        let container = document.createElement('div');
        container.innerHTML = `<input type="hidden" autofocus><div>
            You can find 2 options in the layer selector:<br>
            <br>
            - Keep all portals: if you enable this, then all loaded portals will stay visible at every zoom level, until you disable this option or refresh the map.<br>
            <br>
            - Keep all links: if you enable this, then all loaded links will stay visible at every zoom level. <b>Be aware</b> that destroyed links will not be removed from the map, until you disable this option and refresh the map.<br>
            <br>
            Both options will automatically start disabled when the map is refreshed.<br>
            <span style="font-style: italic; font-size: smaller">version ${self.version} by ${self.author}</span>
            </div>`;

        window.dialog({
            html: container,
            id: self.pluginname + '-dialog',
            title: self.title + ' - info'
        }).dialog('option', 'buttons', {
            'Changelog': function() { alert(self.changelog); },
            'Close': function() { $(this).dialog('close'); },
        });
    };

    self.setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        if (!self.setupRenderPass()) return;

        self.setupLayerGroupPortals();
        self.setupLayerGroupLinks();

        let toolboxlink = document.body.querySelector('#toolbox').appendChild(document.createElement('a'));
        toolboxlink.textContent = self.title;
        toolboxlink.addEventListener('click', function(e) {
            e.preventDefault();
            self.menu();
        }, false);

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

