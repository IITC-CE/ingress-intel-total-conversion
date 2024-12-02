// ==UserScript==
// @author         Perringaiden
// @name           Hide portals that aren't fully deployed.
// @category       Highlighter
// @version        0.2
// @description    Hides any portal that doesn't have 8 resonators.
// @id             wolf-deployed-highlighter@Perringaiden
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Perringaiden/wolf-deployed-highlighter.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Perringaiden/wolf-deployed-highlighter.user.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.wolfDeployed = function() {};

    /**
     * Indicates whether portals are displayed at the current level.  Simply using zoom level
     * does not factor in other tools that adjust display capabilities.
     */
     window.plugin.wolfDeployed.zoomLevelHasPortals = function() {
        return window.getMapZoomTileParameters(window.getDataZoomForMapZoom(window.map.getZoom())).hasPortals;
    };

    window.plugin.wolfDeployed.hidePortal = function(data, conditional) {
        var d = data.portal.options.data;
        var health = d.health;
        var guid = data.portal.options.ent[0];

            // Hide any portal that meets the conditions.
        var style = {};

        if (conditional(guid, d) == false && window.plugin.wolfDeployed.zoomLevelHasPortals()) {

            style.fillOpacity = 0.0;
            style.radius = 0.1;
            style.opacity = 0.0;

        } else {
            window.plugin.wolfDeployed.setStyleByLevel(style, d)
        }

        data.portal.setStyle(style);

    }

    window.plugin.wolfDeployed.setStyleByLevel = function(style, data){
        switch (data.level) {
            case 6: style.fillColor = 'orange'; break;
            case 7: style.fillColor = 'red'; break;
            case 8: style.fillColor = 'magenta'; break;
          }
    }

     window.plugin.wolfDeployed.notDeployed = function(guid, data) {
        return (data.resCount == 8)
    }

    window.plugin.wolfDeployed.highlightDeployed = function(data) {
        window.plugin.wolfDeployed.hidePortal(data, window.plugin.wolfDeployed.notDeployed);
    }

    var setup =  function() {
        window.addPortalHighlighter('Fully Deployed', window.plugin.wolfDeployed.highlightDeployed);
    }

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

