// ==UserScript==
// @name           IITC plugin: Machina Tools
// @author         Perringaiden
// @category       Misc
// @version        0.4
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
    let wm = window.plugin.wolfMachina;

    window.plugin.wolfMachina.findParent = function (portalGuid) {
        // Get the portal's data.
        let parent = undefined;


        if (portalGuid !== 'undefined') {

            let linkGuids = getPortalLinks(portalGuid);
            $.each(linkGuids.in, function (i, lguid) {
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

    window.plugin.wolfMachina.findSeed = function (portalGuid) {
        let parent = undefined;
        let portal = window.portals[portalGuid];


        if (portal != undefined) {

            // Since we could be the seed, if there's no
            // parent, then we have to return the portal.
            parent = {};
            parent.guid = portalGuid;
            parent.lat = portal.options.data.latE6 / 1E6;
            parent.lng = portal.options.data.lngE6 / 1E6;

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
        }

        return parent;
    }

    window.plugin.wolfMachina.goToSeed = function (portalGuid) {
        let seed;

        seed = window.plugin.wolfMachina.findSeed(portalGuid)

        if (seed !== undefined) {
            window.zoomToAndShowPortal(seed.guid, [seed.lat, seed.lng]);
        }
    }

    /*

        {
            [xyz] = {
                [level] = x
                [guid] = xyz
                [latlng] = [lat,lng]
                [children] = {
                    [childGuid, linkTime],
                    [childGuid, linkTime]
                }
            }
        }



    */

    window.plugin.wolfMachina.gatherMachinaPortalDetail = function (portalGuid, depth) {
        let rc = {};
        let portal = window.portals[portalGuid];


        rc.children = [];
        rc.guid = portalGuid;
        rc.depth = depth;
        rc.latlng = [portal.options.data.latE6 / 1E6, portal.options.data.lngE6 / 1E6]
        rc.level = portal.options.data.level;
        rc.name = portal.options.data.title;

        let linkGuids = getPortalLinks(portalGuid);


        $.each(linkGuids.out, function (i, lguid) {
            let l = window.links[lguid];
            let ld = l.options.data;

            rc.children.push({
                childGuid: ld.dGuid,
                linkTime: l.options.timestamp
            });
        });

        rc.children.sort(function (a, b) { return a.linkTime - b.linkTime });

        return rc;
    }

    window.plugin.wolfMachina.gatherCluster = function (portalGuid) {
        let rc = {};
        let processingQueue = [];
        let seed = wm.findSeed(portalGuid);
        let curPortal = undefined;


        if (seed != undefined) {
            // Remember the seed.
            rc.portals = {};

            // Add the seed GUID to the queue.
            processingQueue.push(
                {
                    guid: seed.guid,
                    depth: 0
                });
        }

        curPortal = processingQueue.shift();

        while (curPortal != undefined) {
            rc.portals[curPortal.guid] = wm.gatherMachinaPortalDetail(curPortal.guid, curPortal.depth);

            rc.portals[curPortal.guid].children.forEach(element => {
                processingQueue.push(
                    {
                        guid: element.childGuid,
                        depth: curPortal.depth + 1
                    }
                );
            });

            // Move on to the next portal on the list.
            curPortal = processingQueue.shift();
        };

        return rc;
    }



    window.plugin.wolfMachina.clusterDisplayString = function (clusterData) {
        let rc = '';


        rc += '<div>';

        for (const guid in clusterData.portals) {
            let portal = clusterData.portals[guid];

            rc += 'Portal: <a onclick="window.zoomToAndShowPortal(\'' + guid + '\', [' + portal.latlng + ']);" title="' + portal.name + '">' + portal.name + '</a>(' + portal.level + ') [Depth: ' + portal.depth + ']<br/>';
            if (portal.children.length > 0) {
                rc += '<ul>'

                portal.children.forEach(child => {
                    let childPortal = clusterData.portals[child.childGuid];

                    if (childPortal != undefined) {
                        rc += '<li>' + new Date(child.linkTime).toUTCString() + ' link to <a onclick="window.zoomToAndShowPortal(\'' + child.childGuid + '\', [' + childPortal.latlng + ']);" title="' + childPortal.name + '">' + childPortal.name + '</a>(' + childPortal.level + ')</li>';
                    } else {
                        rc += '<li>' + new Date(child.linkTime).toUTCString() + ' link to UNKNOWN</li>';
                    }
                });

                rc += '</ul>';
            } else {
                rc += '<br/>';
            };
        };

        rc += '</div>';

        return rc;
    }

    window.plugin.wolfMachina.displayCluster = function (portalGuid) {
        let clusterData = wm.gatherCluster(portalGuid);

        if (clusterData != undefined) {
            let html = '';

            html += '<div id="machina-cluster">';
            html += wm.clusterDisplayString(clusterData);
            html += '<br/><pre>' + JSON.stringify(clusterData, null, 4) + '</pre>';
            html += '</div>';


            dialog({
                html: html,
                title: 'Machina Cluster',
                id: 'machina-cluster',
                width: 'auto'
            });
        } else {
            dialog({
                html: $('<div id="no-machina-cluster">No Cluster found.</div>'),
                title: 'Machina Tools',
                id: 'no-machina-cluster'
            });
        }
    }

    window.plugin.wolfMachina.onPortalDetailsUpdated = function () {
        let portalData;

        // If the portal was cleared then exit.
        if (window.selectedPortal === null) return;

        portalData = portalDetail.get(window.selectedPortal);

        if (portalData.team == "M") {

            // Add the 'find Parent' button.
            $('.linkdetails').append('<aside><a onclick="window.plugin.wolfMachina.goToParent(\'' + window.selectedPortal + '\')" title=" Find Machina Parent ">Find Parent</a></aside>');
            $('.linkdetails').append('<aside><a onclick="window.plugin.wolfMachina.goToSeed(\'' + window.selectedPortal + '\')" title="Find Machina Seed">Find Seed</a></aside>');
            $('.linkdetails').append('<aside><a onclick="window.plugin.wolfMachina.displayCluster(\'' + window.selectedPortal + '\')" title="Display Machina Cluster">Cluster Details</a></aside>');
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