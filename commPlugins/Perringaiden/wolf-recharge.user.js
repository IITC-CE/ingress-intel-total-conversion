// ==UserScript==
// @author         Perringaiden
// @name           Highlight field anchors that need recharging
// @category       Highlighter
// @version        0.4
// @description    Use the portal fill color to denote if the portal needs recharging and how much. Yellow: above 85%. Orange: above 50%. Red: above 15%. Magenta: below 15%.
// @id             wolf-recharge@Perringaiden
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Perringaiden/wolf-recharge.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Perringaiden/wolf-recharge.user.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.wolfRecharge = function() {};

    window.plugin.wolfRecharge.highlightAnchorsNeedingRecharge = function(data, conditional) {
        var d = data.portal.options.data;
        var health = d.health;
        var guid = data.portal.options.ent[0];

        if (conditional(guid)) {
            if(health !== undefined && data.portal.options.team != TEAM_NONE && health < 100) {
                var color,fill_opacity;


                if (health > 95) {
                    color = 'yellow';
                    fill_opacity = (1-health/100)*.50 + .50;
                } else if (health > 75) {
                    color = 'DarkOrange';
                    fill_opacity = (1-health/100)*.50 + .50;
                } else if (health > 15) {
                    color = 'red';
                    fill_opacity = (1-health/100)*.75 + .25;
                } else {
                    color = 'magenta';
                    fill_opacity = (1-health/100)*.75 + .25;
                }

                var params = {fillColor: color, fillOpacity: fill_opacity};
                data.portal.setStyle(params);
            }
        } else {

            var style = {};


            style.fillOpacity = 0.0;
            style.radius = 0.1;
            style.opacity = 0.0;

            data.portal.setStyle(style);
        }
    }

    window.plugin.wolfRecharge.fieldAnchor = function(guid) {
        var fieldGuids = getPortalFields(guid)

        return (fieldGuids != undefined && fieldGuids.length > 0)
    }

    window.plugin.wolfRecharge.linkAnchor = function(guid) {
        var linkGuids = getPortalLinks(guid)

        if (linkGuids != undefined) {
            return ((linkGuids.in != undefined && linkGuids.in.length > 0) || (linkGuids.out != undefined && linkGuids.out.length > 0));
        }
    }

    window.plugin.wolfRecharge.highlightFieldAnchorsNeedingRecharge = function(data) {
        window.plugin.wolfRecharge.highlightAnchorsNeedingRecharge(data, window.plugin.wolfRecharge.fieldAnchor);
    }

    window.plugin.wolfRecharge.highlightLinkAnchorsNeedingRecharge = function(data) {
        window.plugin.wolfRecharge.highlightAnchorsNeedingRecharge(data, window.plugin.wolfRecharge.linkAnchor);
    }

    var setup =  function() {
        window.addPortalHighlighter('Anchor (Field) Needs Recharge', window.plugin.wolfRecharge.highlightFieldAnchorsNeedingRecharge);
        window.addPortalHighlighter('Anchor (Link) Needs Recharge', window.plugin.wolfRecharge.highlightLinkAnchorsNeedingRecharge);
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

