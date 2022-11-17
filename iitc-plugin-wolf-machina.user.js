// ==UserScript==
// @author         Perringaiden
// @name           IITC plugin: Machina Tools
// @category       Misc
// @version        0.01
// @description    Machina investigation tools
// @id             misc-wolf-machina
// @updateURL      https://bitbucket.org/perringaiden/iitc/raw/master/iitc-plugin-wolf-machina.meta.js
// @downloadURL    https://bitbucket.org/perringaiden/iitc/raw/master/iitc-plugin-wolf-machina.user.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if (typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.wolfMachina = function() {};

    window.plugin.wolfMachina.findParent = function(portalGuid) {}



    window.plugin.wolfMachina.onPortalDetailsUpdated = function() {
        // If the portal was cleared then exit.
        if (window.selectedPortal === null) return;

        // Add the 'find Parent' button.
        $('.linkdetails').append('<a onclick="window.plugin.wolfMachina.findParent("' + window.selectedPortal + '")" title=" Find Machina Parent ">Find Parent</a>');

        // Add the 'trace children' button.


    };

    var setup = function() {
        window.addHook('portalDetailsUpdated', window.plugin.wolfMachina.onPortalDetailsUpdated);
    }

    setup.info = plugin_info; //add the script info data to the function as a property
    if (!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);
    // if IITC has already booted, immediately run the 'setup' function
    if (window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = {
    version: GM_info.script.version,
    name: GM_info.script.name,
    description: GM_info.script.description
};
script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
(document.body || document.head || document.documentElement).appendChild(script);