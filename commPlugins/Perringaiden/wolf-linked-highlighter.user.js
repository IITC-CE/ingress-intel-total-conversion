// ==UserScript==
// @author         Perringaiden
// @name           Hide portals that aren't linked or fielded.
// @category       Highlighter
// @version        0.1
// @description    Hides any portal that doesn't have a link or field from it.
// @id             wolf-linked-highlighter@Perringaiden
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Perringaiden/wolf-linked-highlighter.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Perringaiden/wolf-linked-highlighter.user.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.wolfLinked = function() {};

    /**
     * Indicates whether portals are displayed at the current level.  Simply using zoom level
     * does not factor in other tools that adjust display capabilities.
     */
     window.plugin.wolfLinked.zoomLevelHasPortals = function() {
        return window.getMapZoomTileParameters(window.getDataZoomForMapZoom(window.map.getZoom())).hasPortals;
    };

    window.plugin.wolfLinked.hideAnchors = function(data, conditional) {
        var d = data.portal.options.data;
        var health = d.health;
        var guid = data.portal.options.ent[0];

        if (conditional(guid) == false && window.plugin.wolfLinked.zoomLevelHasPortals()) {
            // Hide any portal that meets the conditions.
            var style = {};

            style.fillOpacity = 0.0;
            style.radius = 0.1;
            style.opacity = 0.0;

            data.portal.setStyle(style);
        }
    }

    window.plugin.wolfLinked.fieldAnchor = function(guid) {
        var fieldGuids = getPortalFields(guid)

        return (fieldGuids != undefined && fieldGuids.length > 0)
    }

    window.plugin.wolfLinked.linkAnchor = function(guid) {
        var linkGuids = getPortalLinks(guid)

        if (linkGuids != undefined) {
            return ((linkGuids.in != undefined && linkGuids.in.length > 0) || (linkGuids.out != undefined && linkGuids.out.length > 0));
        }
    }

    window.plugin.wolfLinked.highlightFieldAnchors = function(data) {
        window.plugin.wolfLinked.hideAnchors(data, window.plugin.wolfLinked.fieldAnchor);
    }

    window.plugin.wolfLinked.highlightLinkAnchors = function(data) {
        window.plugin.wolfLinked.hideAnchors(data, window.plugin.wolfLinked.linkAnchor);
    }

    var setup =  function() {
        window.addPortalHighlighter('Field Anchor', window.plugin.wolfLinked.highlightFieldAnchors);
        window.addPortalHighlighter('Link Anchor', window.plugin.wolfLinked.highlightLinkAnchors);
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

