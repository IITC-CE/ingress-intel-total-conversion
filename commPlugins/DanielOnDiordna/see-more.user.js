// ==UserScript==
// @author          DanielOnDiordna
// @name            See More
// @category        Tweak
// @version         2.0.0.20210724.002500
// @updateURL       https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/see-more.meta.js
// @downloadURL     https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/see-more.user.js
// @description     [danielondiordna-2.0.0.20210724.002500] See more portals and links when zooming out: zoom level all links changes to all portals, zoom level links>300m changes to all links. Beware: This plugin will cause slightly more data usage when zooming out.
// @id              see-more@DanielOnDiordna
// @namespace       https://softspot.nl/ingress/
// @antiFeatures    highLoad
// @match           https://intel.ingress.com/*
// @grant           none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.seeMore = function() {};
    var self = window.plugin.seeMore;
    self.id = 'seeMore';
    self.title = 'See More';
    self.version = '2.0.0.20210724.002500';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 1.0.0.20171229.191100
- version 1.0.0

version 1.0.1.20200908.152100
- fix to work in IITC CE as well

version 1.0.2.20210117.190200
version 1.0.3.20210120.192800
- updated plugin wrapper and userscript header formatting to match IITC-CE coding

version 1.0.3.20210421.190200
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin

version 2.0.0.20210701.160200
- changed tweak method from eval function modification to a function replacement with a callback to the original function

version 2.0.0.20210724.002500
- prevent double plugin setup on hook iitcLoaded
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.standardZoomFunction = undefined;

    self.getDataZoomForMapZoom = function(zoom) {
        let newzoom = zoom;
        if (zoom == 12) {
            newzoom = 13; // change zoom level "links: >300m" to "links: all links"
        } else if (zoom == 13 || zoom == 14) {
            newzoom = 15; // change zoom level "links: all links" to "portals: all"
        }

        return self.standardZoomFunction(newzoom);
    };

    self.setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        self.standardZoomFunction = window.getDataZoomForMapZoom;
        window.getDataZoomForMapZoom = self.getDataZoomForMapZoom;
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

