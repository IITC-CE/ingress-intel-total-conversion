// ==UserScript==
// @author         Perringaiden
// @id             wolf-uncaptured@Perringaiden
// @name           Non Captured/Visited/Scout Highlighters
// @category       Misc
// @version        0.7
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Perringaiden/wolf-uncaptured.user.js
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Perringaiden/wolf-uncaptured.meta.js
// @include        *://*.ingress.com/*
// @match          *://*.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    //PLUGIN START ////////////////////////////////////////////////////////

    var fillOpacityUncaptured = 0.7;
    var fillOpacityUnvisited = 0.7;
    var fillOpacityUnActionable = 0.0;
    var fillColorUnvisited = '#FB6FFF';
    var fillColorUncaptured = 'yellow';


    //use own namespace for plugin
    window.plugin.wolfUncaptured = function() {};

    window.plugin.wolfUncaptured.optAlert = function(message) {
        $('.ui-dialog-drawtoolsSet .ui-dialog-buttonset').prepend('<p class="drawtools-alert" style="float:left;margin-top:4px;">'+message+'</p>');
        $('.drawtools-alert').delay(2500).fadeOut();
    }

    window.plugin.wolfUncaptured.zoomlevelHasPortals = function() {
        debugger;
        return window.getMapZoomTileParameters(window.getDataZoomForMapZoom(window.map.getZoom())).hasPortals;
    };

    window.plugin.wolfUncaptured.highlighterNoCaptured = function(data) {
        var guid = data.portal.options.ent[0];
        var historyInfo = data.portal.options.data.history;

        var style = {};

        if (historyInfo) {
            if (historyInfo.captured) {
                // captured (and, implied, visited too) - no highlights
                style.opacity = fillOpacityUnActionable;
                style.fillOpacity = fillOpacityUnActionable;
                style.radius = 0.1;


            } else if (historyInfo.visited) {
                style.fillColor = fillColorUncaptured;
                style.fillOpacity = fillOpacityUncaptured;
            } else {
                style.fillColor = fillColorUnvisited;
                style.fillOpacity = fillOpacityUnvisited;
            }
        } else {
            // no visit data at all
            style.fillColor = fillColorUnvisited;
            style.fillOpacity =fillOpacityUnvisited;
        }

        data.portal.setStyle(style);
    };

    window.plugin.wolfUncaptured.highlighterNoVisited = function(data) {
        var guid = data.portal.options.ent[0];
        var historyInfo = data.portal.options.data.history;

        var style = {};

        if (historyInfo) {
            if (historyInfo.captured) {
                // captured (and, implied, visited too) - no highlights
                style.opacity = fillOpacityUnActionable;
                style.fillOpacity = fillOpacityUnActionable;
                style.radius = 0.1;


            } else if (historyInfo.visited) {
                style.opacity = fillOpacityUnActionable;
                style.fillOpacity = fillOpacityUnActionable;
                style.radius = 0.1;
            } else {
                // we have an 'historyInfo' entry for the portal, but it's not set visited or captured?
                // could be used to flag a portal you don't plan to visit, so use a less opaque red
                style.fillColor = fillColorUnvisited;
                style.fillOpacity = fillOpacityUnvisited;
            }
        } else {
            // no visit data at all
            style.fillColor = fillColorUnvisited;
            style.fillOpacity = fillOpacityUnvisited;
        }

        data.portal.setStyle(style);
    };

    window.plugin.wolfUncaptured.highlighterOnlyActionable = function(data) {
        var guid = data.portal.options.ent[0];
        var historyInfo = data.portal.options.data.history;
        var playerTeam = window.teamStringToId(window.PLAYER.team);
        var portalTeam = data.portal.options.team;
        var isOwnTeam = (playerTeam == portalTeam);
        var scale = window.portalMarkerScale();
        var style = {};

        style.opacity = 1.0;

        if (historyInfo) {
            if (historyInfo.captured) {
                // captured (and, implied, visited too) - no highlights
                style.opacity = fillOpacityUnActionable;
                style.fillOpacity = fillOpacityUnActionable;
                style.radius = 0.1;

            } else if (historyInfo.visited) {
                if (isOwnTeam) {
                    style.opacity = fillOpacityUnActionable;
                    style.fillOpacity = fillOpacityUnActionable;
                    style.radius = 0.1;

                } else {
                    style.fillColor = fillColorUncaptured;
                    style.fillOpacity = fillOpacityUncaptured;
                }

            } else {
                // we have an 'historyInfo' entry for the portal, but it's not set visited or captured?
                // could be used to flag a portal you don't plan to visit, so use a less opaque red
                style.fillColor = fillColorUnvisited;
                style.fillOpacity = fillOpacityUnvisited;
            }
        } else {
            // no visit data at all
            style.fillColor = fillColorUnvisited;
            style.fillOpacity = fillOpacityUnvisited;
        }

        data.portal.setStyle(style);
    };

    window.plugin.wolfUncaptured.highlighterOnlyPioneerActionable = function(data) {
        var guid = data.portal.options.ent[0];
        var historyInfo = data.portal.options.data.history;
        var playerTeam = window.teamStringToId(window.PLAYER.team);
        var portalTeam = data.portal.options.team;
        var isOwnTeam = (playerTeam == portalTeam);
        var scale = window.portalMarkerScale();
        var style = {};

        style.opacity = 1.0;

        if (historyInfo) {
            if (historyInfo.captured) {
                // captured (and, implied, visited too) - no highlights
                style.opacity = fillOpacityUnActionable;
                style.fillOpacity = fillOpacityUnActionable;
                style.radius = 0.1;

            } else if (historyInfo.visited) {
                if (isOwnTeam) {
                    style.opacity = fillOpacityUnActionable;
                    style.fillOpacity = fillOpacityUnActionable;
                    style.radius = 0.1;

                } else {
                    style.fillColor = fillColorUncaptured;
                    style.fillOpacity = fillOpacityUncaptured;

                    if (data.portal.options.level > 6) {
                        style.radius = scale * 5;
                        style.weight = 1;
                    }

                }

            } else if (isOwnTeam) {
                style.opacity = fillOpacityUnActionable;
                style.fillOpacity = fillOpacityUnActionable;
                style.radius = 0.1;

            } else {
                // we have an 'historyInfo' entry for the portal, but it's not set visited or captured?
                // could be used to flag a portal you don't plan to visit, so use a less opaque red
                style.fillColor = fillColorUnvisited;
                style.fillOpacity = fillOpacityUnvisited;

                if (data.portal.options.level > 6) {
                    style.radius = scale * 5;
                    style.weight = 1;
                }
            }
        } else {
            if (isOwnTeam) {
                // own team portals are unactionable for Pioneer.
                style.opacity = fillOpacityUnActionable;
                style.fillOpacity = fillOpacityUnActionable;
                style.radius = 0.1;

            } else {
                // no visit data at all
                style.fillColor = fillColorUnvisited;
                style.fillOpacity = fillOpacityUnvisited;

                if (data.portal.options.level > 6) {
                    style.radius = scale * 5;
                    style.weight = 1;
                }

            }
        }

        data.portal.setStyle(style);
    };

    window.plugin.wolfUncaptured.displayHistoryStats = function() {

        if (window.plugin.wolfUncaptured.zoomlevelHasPortals()) {
            var historyData;
            var title = 'History Stats';
            var displayBounds = map.getBounds();

            var captured = 0;
            var visited = 0;
            var unvisited = 0;


            $.each(window.portals, function(i, portal) {
                // just count portals in viewport
                if(!displayBounds.contains(portal.getLatLng())) return true;

                var historyInfo = portal.options.data.history;


                if (historyInfo) {
                    if (historyInfo.captured) {
                        captured += 1;
                    } else if (historyInfo.visited) {
                        visited += 1;
                    } else {
                        unvisited += 1;
                    }
                } else {
                    unvisited += 1;
                }
            });

            historyData = '';
            historyData += 'Total: ' + (unvisited + captured + visited) + '<br>';
            historyData += 'Unvisited: ' + unvisited + '<br>';
            historyData += 'Visited: (Explorer) ' + (visited + captured) + '<br>';
            historyData += 'Visited, Not Captured:  ' + visited + '<br>';
            historyData += 'Captured (Pioneer): ' + captured + '<br>';
        } else {
            historyData = 'Switch View to All Portals (Zoom Level 15) or lower.'
        }

        dialog({
            html: historyData,
            width: 270,
            title: title
        });
    };

    //

    var setup = function() {
        window.addPortalHighlighter('History: Hide captured', window.plugin.wolfUncaptured.highlighterNoCaptured);
        window.addPortalHighlighter('History: Hide visited', window.plugin.wolfUncaptured.highlighterNoVisited);
        window.addPortalHighlighter('History: Only actionable', window.plugin.wolfUncaptured.highlighterOnlyActionable);
        window.addPortalHighlighter('History: Only Pioneer', window.plugin.wolfUncaptured.highlighterOnlyPioneerActionable);

        $('#toolbox').append(' <a onclick="window.plugin.wolfUncaptured.displayHistoryStats()" title="Display History Stats">History Stats</a>');
    };



    setup.info = plugin_info; //add the script info data to the function as a property

    if(!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);

    // if IITC has already booted, immediately run the 'setup' function
    if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end

//PLUGIN END ////////////////////////////////////////////////////////

var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
(document.body || document.head || document.documentElement).appendChild(script);
