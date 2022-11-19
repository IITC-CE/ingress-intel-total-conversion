// ==UserScript==
// @author         Perringaiden
// @name           IITC plugin: Machina Tools
// @category       Misc
// @version        0.1
// @description    Machina investigation tools
// @id             misc-wolf-machina
// @updateURL      https://bitbucket.org/perringaiden/iitc/raw/master/iitc-plugin-wolf-machina.meta.js
// @downloadURL    https://bitbucket.org/perringaiden/iitc/raw/master/iitc-plugin-wolf-machina.user.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if (typeof window.plugin !== 'function') window.plugin = function () { };

    // use own namespace for plugin
    window.plugin.wolfMachina = function () { };

    window.plugin.wolfMachina.findParent = function (portalGuid) {
        // Get the portal's data.
        let parent = undefined;

        debugger;

        if (portalGuid !== 'undefined') {

            let linkGuids = getPortalLinks(portalGuid);
            $.each(linkGuids.in.concat(linkGuids.out), function (i, lguid) {
                let l = window.links[lguid];
                let ld = l.options.data;

                if (ld.dGuid == portalGuid) {
                    parent = {};
                    parent.guid = ld.oGuid;
                    parent.lat = ld.oLatE6 / 1E6;
                    parent.lng = ld.oLngE6 / 1E6;

                    return false;
                }
            });

        }

        return parent;
    };

    window.plugin.wolfMachina.goToParent = function (portalGuid) {
        let parent;


        parent = window.plugin.wolfMachina.findParent(portalGuid);

        if (parent != undefined) {
            window.zoomToAndShowPortal(parent.guid, [parent.lat, parent.lng]);
        } else {
            dialog({
                html: $('<div id="no-machina-parent">No Parent found.</div>'),
                title: 'Machina Tools',
                id: 'no-machina-parent'
            });
        }
    };

    window.plugin.wolfMachina.goToSeed = function (portalGuid) {
        let parent;

        while (portalGuid != undefined) {
            let newParent;

            newParent = window.plugin.wolfMachina.findParent(portalGuid);

            if (newParent != undefined) {
                parent = newParent;
                portalGuid = newParent.guid;
            } else {
                portalGuid = undefined;
            }
        }

        if (parent !== undefined) {
            window.zoomToAndShowPortal(parent.guid, [parent.lat, parent.lng]);
        }
    }

    window.plugin.wolfMachina.onPortalDetailsUpdated = function () {
        let portalData;

        // If the portal was cleared then exit.
        if (window.selectedPortal === null) return;

        portalData = portalDetail.get(window.selectedPortal);

        debugger;
        if (portalData.team == "M") {

            // Add the 'find Parent' button.
            $('.linkdetails').append('<aside><a onclick="window.plugin.wolfMachina.goToParent(\'' + window.selectedPortal + '\')" title=" Find Machina Parent ">Find Parent</a></aside>');
            $('.linkdetails').append('<aside><a onclick="window.plugin.wolfMachina.goToSeed(\'' + window.selectedPortal + '\')" title="Find Machina Seed">Find Seed</a></aside>');
            // Add the 'trace children' button.

        }
    };


    let setup = function () {
        window.addHook('portalDetailsUpdated', window.plugin.wolfMachina.onPortalDetailsUpdated);
    }

    setup.info = plugin_info; //add the script info data to the function as a property
    if (!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);
    // if IITC has already booted, immediately run the 'setup' function
    if (window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
let script = document.createElement('script');
let info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = {
    version: GM_info.script.version,
    name: GM_info.script.name,
    description: GM_info.script.description
};
script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
(document.body || document.head || document.documentElement).appendChild(script);