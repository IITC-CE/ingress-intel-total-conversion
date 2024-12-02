// ==UserScript==
// @author          DanielOnDiordna
// @name            Unique Portal History
// @category        Layer
// @version         2.2.0.20240525.141200
// @updateURL       https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/uniqueportalhistory.meta.js
// @downloadURL     https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/uniqueportalhistory.user.js
// @description     [danielondiordna-2.2.0.20240525.141200] Show your personal unique portal history for Visited, Captured or Scout Controlled portals with layers. Choose your own colors for Resistance, Enlightened, Machina and Neutral portals. Place bookmarks. Invert results! Add three extra Portals List plugin columns. Does not require CORE subscription.
// @id              uniqueportalhistory@DanielOnDiordna
// @namespace       https://softspot.nl/ingress/
// @depends         portalhistorysupport@DanielOnDiordna
// @antiFeatures    scraper
// @match           https://intel.ingress.com/*
// @grant           none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.uniqueportalhistory = function() {};
    var self = window.plugin.uniqueportalhistory;
    self.id = 'uniqueportalhistory';
    self.title = 'Unique Portal History';
    self.version = '2.2.0.20240525.141200';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 2.2.0.20240525.141200
- added Machina support
- added a zoom to see all bookmarks button
- improved the bookmark menu and methods
- improved the inverting of overlay layers

version 2.1.0.20220711.235400
- made compatible with IITC-CE Beta 0.32.1.20211217.151857

version 2.0.1.20210724.002500
- prevent double plugin setup on hook iitcLoaded

version 2.0.1.20210517.233500
- added bookmarks anywhere for cached history portals (if plugin portalhistorysupport is installed)

version 2.0.0.20210313.210300
- removed all IITC core injection functions (moved to separate and required Portal History Support plugin)
- removed history storage, this is now cached and returned from Portal History Support plugin
- removed highlighter functions (moved to separate optional History Highlighter plugin)
- removed getPortalHistoryDetails function
- replace variable scanned with scoutControlled
- added rescaling markers when zooming in or out

version 1.0.1.20210222.233700
- rewritten some IITC core injection function
- added decodeArray.portalDetail rewrite, to support new history bitarray
- fixed all portals zoom level detection

version 1.0.0.20210220.134700
- renamed plugin from Portal Agent Status to Unique Portal History
- improved IITC core modifications (needed for older versions of IITC and also for latest version of IITC)
- applied portalAdded code to add history if it is missing (for older versions of IITC)
- added option to keep showing layers when zooming out
- added caching option, which will make it possible to display markers on linked portals without zooming in after reload of IITC and show total counts
- see sortable columns in Portals List plugin
- removed single team color and added both teams, there are now 5 layers to choose from
- added highlighters to hide all or only all captured portals, with or without ENL and RES portals

version 0.0.3.20210211.164200
version 0.0.3.20210211.182800
- fixed log.log debug error on IITC-CE
- added extra code injections
- added same team target color setting
- integrated Spectrum Colorpicker 1.8.1 plugin code, no need for the separate plugin
- bookmarks menu

version 0.0.2.20210209.235900
version 0.0.2.20210210.001100
- a lot of changes, a complete rewrite
- added a menu to select inversion of results

version 0.0.1.20210206.120400
- first release
- used plugin wrapper and userscript header formatting to match IITC-CE coding
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.localstoragesettings = self.pluginname + '-settings';

    self.settings = {};
    self.settings.invertresults = true;
    self.settings.showsameteamcolor = true;
    self.settings.showneutralcolor = true;
    self.settings.color = {
        visited: 'purple',
        capturedenl: '#FF0000',
        capturedres: '#FF0000',
        capturedmac: '#FF0000',
        capturedneutral: '#000000',
        scoutControlled: 'yellow'
    };
    self.settings.replacebookmarks = true;
    self.settings.bookmarkscolor = 'yellow';
    self.settings.showwhenzoomedout = false;
    self.settings.drawnameless = false;

    self.capturedlayers = {
        capturedenl: window.TEAM_ENL,
        capturedres: window.TEAM_RES,
        capturedmac: window.TEAM_MAC || 3,
        capturedneutral: window.TEAM_NONE
    };

    self.bookmarktimerlist = [];
    self.bookmarkrestorecolor = undefined;
    self.lastportalscale = undefined;

    self.markerformatting = {
        visited: { stroke: true, color: 'settingscolor', radius: 15.0, weight: 2, opacity: 0.5, fill: false, fillOpacity: 0.0 },
        capturedenl: { stroke: true, color: 'portalcolor', radius: 'portalradius', weight: 'portalweight', opacity: 1.0, fill: true, fillOpacity: 1.0, fillColor: 'settingscolor' },
        capturedres: { stroke: true, color: 'portalcolor', radius: 'portalradius', weight: 'portalweight', opacity: 1.0, fill: true, fillOpacity: 1.0, fillColor: 'settingscolor' },
        capturedmac: { stroke: true, color: 'portalcolor', radius: 'portalradius', weight: 'portalweight', opacity: 1.0, fill: true, fillOpacity: 1.0, fillColor: 'settingscolor' },
        capturedneutral: { stroke: true, color: 'portalcolor', radius: 'portalradius', weight: 'portalweight', opacity: 1.0, fill: true, fillOpacity: 1.0, fillColor: 'settingscolor' },
        scoutControlled: { stroke: true, color: 'settingscolor', radius: 19.0, weight: 3, opacity: 1.0, fill: false, fillOpacity: 0.0 }
    };

    self.basiclayers = {
        visited: 1,
        captured: 1,
        scoutControlled: 1
    };

    self.bookmarkfoldernames = {
        visited: 'Visited',
        captured: 'Captured',
        capturedenl: 'Captured ENL',
        capturedres: 'Captured RES',
        capturedmac: 'Captured MAC',
        capturedneutral: 'Captured Neutral',
        scoutControlled: 'Scout Controlled'
    };
    self.toggle_layernames = {
        visited: 'Visited',
        capturedenl: 'Captured ENL',
        capturedres: 'Captured RES',
        capturedmac: 'Captured MAC',
        capturedneutral: 'Captured neutral',
        scoutControlled: 'Scout Controlled'
    };
    self.toggle_layernamesinverted = {
        visited: 'Never Visited',
        capturedenl: 'Never Captured ENL',
        capturedres: 'Never Captured RES',
        capturedmac: 'Never Captured MAC',
        capturedneutral: 'Never Captured neutral',
        scoutControlled: 'Not Scout Controlled'
    };
    self.toggle_layers = {
        visited: undefined,
        capturedenl: undefined,
        capturedres: undefined,
        capturedmac: undefined,
        capturedneutral: undefined,
        scoutControlled: undefined,
    };
    self.layers = {
        visited: undefined,
        capturedenl: undefined,
        capturedres: undefined,
        capturedmac: undefined,
        capturedneutral: undefined,
        scoutControlled: undefined
    };
    self.layermarkers = {
        visited: {},
        capturedenl: {},
        capturedres: {},
        capturedmac: {},
        capturedneutral: {},
        scoutControlled: {}
    };
    self.layerdescription = {
        visited: '(Ever visited/total visible portals)',
        capturedenl: '(Ever captured/total visible ENL portals)',
        capturedres: '(Ever captured/total visible RES portals)',
        capturedmac: '(Ever captured/total visible MAC portals)',
        capturedneutral: '(Ever captured/total visible neutral portals)',
        scoutControlled: '(Ever Scout Controlled/total visible portals)'
    };
    self.layerdescriptioninverted = {
        visited: '(Never visited/total visible portals)',
        capturedenl: '(Never captured/total visible ENL portals)',
        capturedres: '(Never captured/total visible RES portals)',
        capturedmac: '(Never captured/total visible MAC portals)',
        capturedneutral: '(Never captured/total visible neutral portals)',
        scoutControlled: '(Not Scout Controlled/total visible portals)'
    };

    self.colorpickeroptions = {
        flat: false,
        showInput: true,
        showButtons: true,
        showPalette: true,
        showSelectionPalette: true,
        allowEmpty: false,
        hideAfterPaletteSelect: true,
        palette: [
            ['#004000','#008000','#00C000'],
            ['#00FF00','#80FF80','#C0FFC0'],
            ['#000040','#000080','#0000C0','rgb(254, 254, 51)'],
            ['#4040FF','#8080FF','#C0C0FF','#0000FF'],
            ['#6A3400','#964A00','#C05F00','#00FFFF'],
            ['#E27000','#FF8309','#FFC287','#FF0000'],
            ['#a24ac3','#514ac3','#4aa8c3','#51c34a'],
            ['#c1c34a','#c38a4a','#c34a4a','#c34a6f'],
            ['#000000','#666666','#bbbbbb','#ffffff']
        ]};

    self.requestlist = []; // [{guid:guid,cnt:cnt}]
    self.requestmax = 3;
    self.request = {};
    self.requestlisttimer = 0;
    self.requestlisttimeout = 0;
    self.requestdelay = 100;
    self.requestbookmarkfoldername = '';
    self.requesttimerstarttotal = 0;
    self.requesttimerstarttime = 0;

    self.restoresettings = function() {
        if (typeof localStorage[self.localstoragesettings] != 'string' || localStorage[self.localstoragesettings] == '') return;
        try {
            let settings = JSON.parse(localStorage[self.localstoragesettings]);
            if (typeof settings === 'object' && settings instanceof Object && !(settings instanceof Array)) { // expect an object
                for (const i in self.settings) {
                    if (i in settings && typeof settings[i] === typeof self.settings[i]) { // only accept settings from default template of same type
                        if (typeof self.settings[i] === 'object' && self.settings[i] instanceof Object && !(self.settings[i] instanceof Array)) { // 1 sublevel is supported
                            for (const a in self.settings[i]) {
                                if (a in settings[i] && typeof settings[i][a] === typeof self.settings[i][a]) {
                                    self.settings[i][a] = settings[i][a];
                                }
                            }
                        } else {
                            self.settings[i] = settings[i];
                        }
                    }
                }
            }
        } catch(e) {
            return false;
        }
    };
    self.storesettings = function() {
        localStorage[self.localstoragesettings] = JSON.stringify(self.settings);
    };

    self.moveHistoryToNewPlugin = function() {
        let localstoragehistory = `${self.pluginname}-history`;
        if (typeof localStorage[localstoragehistory] == 'undefined' || !window.plugin.portalhistorysupport) return; // no old values found, or required plugin not found

        if (typeof localStorage[localstoragehistory] == 'string' && localStorage[localstoragehistory] != '') {
            try {
                let storagehistoryraw = JSON.parse(localStorage[localstoragehistory]);
                if (typeof storagehistoryraw == 'object' && storagehistoryraw instanceof Object && !(storagehistoryraw instanceof Array)) {
                    for (const guid in storagehistoryraw) { // convert history data to new plugin cache
                        if (storagehistoryraw[guid] > 0) window.plugin.portalhistorysupport.addcache(guid,storagehistoryraw[guid]);
                    }
                }
                delete localStorage[localstoragehistory]; // delete permanently
            } catch(e) {
            }
        }
    };

    self.historySortString = function(history,layerkey,level) {
        if (!history) return '';
        let sortstring = (history[layerkey]?layerkey[0]:' ');
        for (const layerkey in self.basiclayers) {
            sortstring += (history[layerkey]?layerkey[0]:'z'); // descending
        }
        sortstring += level;
        return sortstring;
    };

    self.setupPortalsList = function() {
        if (!window.plugin.portalslist) return;

        let colpos = 0;
        for (colpos = 0; colpos < window.plugin.portalslist.fields.length; colpos++) { // find column Portal Name
            if (window.plugin.portalslist.fields[colpos].title == 'Portal Name') {
                break;
            }
        }
        if (colpos >= window.plugin.portalslist.fields.length) colpos = 0; // default first colum if column name not found

        // insert extra columns at colpos:
        for (const layerkey in self.basiclayers) {
            window.plugin.portalslist.fields.splice(colpos,0,{
                title: layerkey[0], // first character
                value: function(portal) { return (portal.options.data.history && portal.options.data.history[layerkey]); },
                sortValue: function(value, portal) { return self.historySortString(portal.options.data.history,layerkey,portal.options.data.level); },
                format: function(cell, portal, value) {
                    $(cell)
                        .append($('<span>')
                                .html((portal.options.data.history && portal.options.data.history[layerkey]?layerkey[0]:(!portal.options.data.history || portal.options.data.history._raw == undefined?'?':'')))
                                .attr({
                        "class": "value",
                        "style": "font-family: courier",
                    }));
                },
                defaultOrder: -1 // descending
            });
            colpos++;
        }
    };

    self.setupLayers = function() {
        for (const layername in self.toggle_layers) {
            // use separate layer togglers and actual drawing layers, to enable show/hide layers when zooming in/out:
            self.toggle_layers[layername] = new window.L.LayerGroup();

            window.layerChooser.addOverlay(self.toggle_layers[layername], (self.settings.invertresults?self.toggle_layernamesinverted[layername]:self.toggle_layernames[layername]), {default: true});
            // window.addLayerGroup((self.settings.invertresults?self.toggle_layernamesinverted[layername]:self.toggle_layernames[layername]), self.toggle_layers[layername], true);

            // create drawing layers:
            self.layers[layername] = new window.L.FeatureGroup();

            // setup initial drawing layers visibility:
            if (self.layeractive(layername)) self.showlayer(layername);
        }

        // toggle drawing layers:
        window.map.on('layeradd', function(obj) {
            for (const layername in self.toggle_layers) {
                if (obj.layer == self.toggle_layers[layername]) {
                    self.showlayer(layername);
                }
            }
            if (window.layerChooser._layers[obj.layer._leaflet_id] && window.layerChooser._layers[obj.layer._leaflet_id].overlay) {
                // if overlay layer is activated, then bring the layers to front, a moment/event later with a timeout:
                window.setTimeout(self.layersbringToFront,0);
            }
        });

        window.map.on('layerremove', function(obj) {
            for (const layername in self.toggle_layers) {
                if (obj.layer == self.toggle_layers[layername]) {
                    self.hidelayer(layername);
                }
            }
        });
    };

    self.getMarkerStyle = function(portaloptions, layerkey, selected) {
        let portalstyle = window.getMarkerStyleOptions(portaloptions);
        let scaleRadius = window.portalMarkerScale();
        if (selected) portalstyle.color = window.COLOR_SELECTED_PORTAL;
        let layername = self.gettogglelayername(layerkey,portaloptions.team);
        let markerformatting = self.markerformatting[layername];

        let styleOptions = {
            radius: markerformatting.radius,
            stroke: markerformatting.stroke,
            color: markerformatting.color,
            weight: markerformatting.weight,
            opacity: markerformatting.opacity,
            dashArray: null,
            fill: markerformatting.fill,
            fillColor: markerformatting.fillColor,
            fillOpacity: markerformatting.fillOpacity,
            clickable: (layerkey == 'captured')
        };
        if (typeof styleOptions.radius == 'number') styleOptions.radius = styleOptions.radius * scaleRadius;

        // convert values:
        for (const id in styleOptions) {
            switch (styleOptions[id]) {
                case 'settingscolor':
                    styleOptions[id] = self.settings.color[layername];
                    break;
                case 'portalcolor':
                case 'portalradius':
                case 'portalweight':
                    styleOptions[id] = portalstyle[id];
                    break;
            }
        }
        return styleOptions;
    };

    self.createMarker = function(latlng, dataOptions, layerkey) {
        // dataOptions = { guid: guid, data: data.portal.options }
        let styleOptions = self.getMarkerStyle(dataOptions.data, layerkey, dataOptions.guid == window.selectedPortal);

        let options = window.L.extend({}, dataOptions, styleOptions);
        let marker = window.L.circleMarker(latlng, options);

        marker.on('click', function() { window.renderPortalDetails(dataOptions.guid); });
        marker.on('dblclick', function() { window.renderPortalDetails(dataOptions.guid); window.map.setView(latlng, 17); });

        return marker;
    };

    self.gettogglelayername = function(layerkey,team) {
        let layername;
        if (layerkey == 'captured') {
            switch (team) {
                case window.TEAM_ENL:
                    layername = `${layerkey}enl`;
                    break;
                case window.TEAM_RES:
                    layername = `${layerkey}res`;
                    break;
                case (window.TEAM_MAC || 3):
                    layername = `${layerkey}mac`;
                    break;
                case window.TEAM_NONE:
                    layername = `${layerkey}neutral`;
                    break;
                default:
                    console.log('ERROR: gettogglelayername - unknown team',team);
            }
        } else if (layerkey in self.toggle_layers) {
            layername = layerkey
        } else {
            console.log('ERROR: gettogglelayername - unknown layerkey',layerkey);
        }
        return layername;
    };

    self.zoomlevelhasportals = function() {
        return window.getMapZoomTileParameters(window.getDataZoomForMapZoom(window.map.getZoom())).hasPortals;
    };

    self.onportalAdded = function(data) {
        // data = {portal: marker, previousData: previousData}
        if (!data.portal.options.data.history) return; // draw nothing if there is no history available (will never happen, but just in case)
        if (!self.zoomlevelhasportals() && !self.settings.showwhenzoomedout) return;

        let guid = data.portal.options.guid;
        let latlng = data.portal.getLatLng();
        let dataOptions = {
            guid: guid,
            data: data.portal.options
        };

        for (const layerkey in self.basiclayers) {
            if (data.portal.options.data.history && data.portal.options.data.history._raw != undefined) {
                if ((!self.settings.invertresults && data.portal.options.data.history[layerkey]) || (self.settings.invertresults && !data.portal.options.data.history[layerkey])) {
                    let marker = self.createMarker(latlng, dataOptions, layerkey);
                    let layername = self.gettogglelayername(layerkey,data.portal.options.team);
                    self.layers[layername].addLayer(marker);
                    self.layermarkers[layername][guid] = marker;
                }
            }
        }
    };

    self.onportalRemoved = function(data) {
        // data = {portal: p, data: p.options.data }
        let guid = data.portal.options.guid;
        for (const layername in self.layers) {
            if (guid in self.layermarkers[layername]) {
                self.layers[layername].removeLayer(self.layermarkers[layername][guid]);
                delete self.layermarkers[layername][guid];
            }
        }
    };

    self.onzoomlevelschange = function() {
        if (self.lastportalscale == window.portalMarkerScale()) return;

        for (const layername in self.layers) {
            let layerkey;
            switch (layername) {
                case 'visited':
                case 'scoutControlled':
                    layerkey = layername;
                    break;
                default:
                    layerkey = 'captured';
            }
            for (const guid in self.layermarkers[layername]) {
                let styleOptions = self.getMarkerStyle(window.portals[guid].options,layerkey,guid === window.selectedPortal);
                self.layermarkers[layername][guid].setStyle(styleOptions);
            }
        }
    }

    self.onportalSelected = function(data) {
        let layerkey = 'captured'; // draw on captured layer
        // restore portal color for unselected captured portal marker:
        if (data.unselectedPortalGuid && (data.unselectedPortalGuid != data.selectedPortalGuid)) {
            let styleOptions = self.getMarkerStyle(window.portals[data.unselectedPortalGuid].options,layerkey,false);
            let layername = self.gettogglelayername(layerkey,window.portals[data.unselectedPortalGuid].options.team);
            if (self.layermarkers[layername][data.unselectedPortalGuid]) self.layermarkers[layername][data.unselectedPortalGuid].setStyle(styleOptions);
        }

        // apply portal selected color to captured portal marker:
        if (data.selectedPortalGuid) {
            let styleOptions = self.getMarkerStyle(window.portals[data.selectedPortalGuid].options,layerkey,true);
            let layername = self.gettogglelayername(layerkey,window.portals[data.selectedPortalGuid].options.team);
            if (self.layermarkers[layername][data.selectedPortalGuid]) self.layermarkers[layername][data.selectedPortalGuid].setStyle(styleOptions);
        }
    };

    self.layersbringToFront = function() {
        for (const layername in self.layers) {
            if (self.layeractive(layername) && self.layers[layername]._map) { // only if layer is visible
                self.layers[layername].bringToFront();
            }
        }
    };

    self.showlayer = function(layername) {
        // only show layer if map is at zoom level all portals
        if (((!self.settings.showwhenzoomedout && self.zoomlevelhasportals()) || self.settings.showwhenzoomedout) && self.layers[layername] && !self.layers[layername]._map) window.map.addLayer(self.layers[layername]);
        //self.layersbringToFront();
        self.updatemenu();
    };

    self.hidelayer = function(layername) {
        if (self.layers[layername] && self.layers[layername]._map) window.map.removeLayer(self.layers[layername]);
        self.updatemenu();
    };

    self.displaytogglelayer = function(layername,display) {
        if (display && !window.map.hasLayer(self.toggle_layers[layername])) {
            window.map.addLayer(self.toggle_layers[layername]);
        } else if (!display && window.map.hasLayer(self.toggle_layers[layername])) {
            window.map.removeLayer(self.toggle_layers[layername]);
        }
    };

    self.layeractive = function(findlayername) {
        let overlayLayers = window.layerChooser.getLayers().overlayLayers;
        for (let cnt = overlayLayers.length -1; cnt >= 0; cnt--) {
            let layername = overlayLayers[cnt].name;
            // compare with self.toggle_layernames and self.toggle_layernamesinverted
            if (layername == self.toggle_layernames[findlayername] || layername == self.toggle_layernamesinverted[findlayername]) {
                return overlayLayers[cnt].active;
            }
        }
        return false;
    };

    self.updateMarkers = function(layername) {
        let markerformatting = self.markerformatting[layername];
        let styleOptions = {};
        for (const id in markerformatting) {
            if (markerformatting[id] == 'settingscolor') styleOptions[id] = self.settings.color[layername];
        }
        for (const guid in self.layermarkers[layername]) {
            self.layermarkers[layername][guid].setStyle(styleOptions);
        }
    };

    self.invertresults = function() {
        // replace layer choosers with new names:
        for (const layername in self.toggle_layernames) {
            // copy current layer visibility status, to force same initial status when creating the new layer:
            let oldlayername = (!self.settings.invertresults?self.toggle_layernamesinverted[layername]:self.toggle_layernames[layername]);
            let enabled = window.map.hasLayer(self.toggle_layers[layername]); // window.isLayerGroupDisplayed(oldlayername);
            let newlayername = (self.settings.invertresults?self.toggle_layernamesinverted[layername]:self.toggle_layernames[layername]);

            if (typeof window.layerChooser?._isOverlayDisplayed == 'function') { // IITC 0.32.1 Beta and up
                if (window.layerChooser._isOverlayDisplayed(newlayername,false) != enabled) {
                    window.layerChooser._storeOverlayState(newlayername,enabled); // force start status
                }
                window.layerChooser.removeLayer(self.toggle_layers[layername]);
                self.toggle_layers[layername] = new window.L.LayerGroup();
                window.layerChooser.addOverlay(self.toggle_layers[layername], newlayername, {default: enabled});
            } else if (typeof window.isLayerGroupDisplayed == 'function') { // IITC 0.32.1 Release and before
                if (window.isLayerGroupDisplayed(newlayername,false) != enabled) {
                    window.updateDisplayedLayerGroup(newlayername,enabled); // force start status
                }
                window.removeLayerGroup(self.toggle_layers[layername]);
                self.toggle_layers[layername] = new window.L.LayerGroup();
                window.addLayerGroup(newlayername, self.toggle_layers[layername], enabled);
            }

            // remove all markers:
            self.layers[layername].clearLayers();
            self.layermarkers[layername] = {};
        }

        // draw all new markers:
        for (const guid in window.portals) {
            let data = {portal: window.portals[guid], previousData: undefined};
            self.onportalAdded(data);
        }
    };

    self.onzoomend = function() {
        let ZOOM_LEVEL_ALL_PORTALS = self.zoomlevelhasportals();
        for (const layername in self.layers) {
            if (!ZOOM_LEVEL_ALL_PORTALS && !self.settings.showwhenzoomedout) { // hide layers
                window.map.removeLayer(self.layers[layername]);
            } else if (self.layeractive(layername)) { // show if enabled
                window.map.addLayer(self.layers[layername]);
            }
        }
    };

    self.about = function() {
        let container = document.createElement('div');
        container.innerHTML = `
<p>Thank you for choosing this plugin.</p>

<p>You can visualize your unique history with <b>6 toggle layers</b>:</p>

<ul>
<li>Visited: draws a small circle around each visited portal.</li>
<li>Captured: draw a filled portal, with a separate layer for ENL, RES, MAC and Neutral portals.</li>
<li>Scout Controlled: draws a larger circle around each scout controlled portal.</li>
</ul>

<p>You can toggle these 6 layers individually from the menu or from the layer selector.<br>
You can also <b>choose your own colors</b> for every layer.<br>
You can <b>invert the results</b> to Never. The layer selector names will change accordingly to Never Visited, Never Captured (ENL, RES, MAC and Neutral) and Not Scout Controlled.<br>
When zooming out to "link" levels, the layers will be hidden, unless Show markers when zooming out is enabled.</p>

<p>The <b>Portals List</b> plugin (if enabled) will show extra columns for visit, capture and scout controlled (v c s columns) and can be sorted.</p>

<p>You can draw (and remove) <b>Bookmarks</b> (if plugin is enabled) for groups of portals which are never visited or captured. Bookmarks are automatically created in named folders. With the Bookmarks add-on you can draw colored bookmarks.<br>
If the plugin <a href="#" name="portalhistorysupport">Portal History Support</a> is enabled, it is also possible to draw bookmarks for portals anywhere for cached history portals.</p>

<p><span class="footer">${self.title} version ${self.version} by ${self.author}</span></p>
`;

        container.querySelector('a[name=portalhistorysupport]').addEventListener('click',function(e) {
            e.preventDefault();
            self.missingPortalHistorySupportplugin();
        },false);

        window.dialog({
            html: container,
            id: `${self.pluginname}-dialog`,
            width: 'auto',
            title: `${self.title} - About`
        }).dialog('option', 'buttons', {
            '< Main menu': function() { self.menu(); },
            'Changelog': function() { alert(self.changelog); },
            'Close': function() { $(this).dialog('close'); },
        });
    };

    self.showAllBookmarks = function() {
        let bookmarklayers = window.plugin.bookmarks.starLayerGroup.getLayers();
        if (bookmarklayers.length === 0) {
            alert('There are no bookmarks');
            return;
        }
        // The bookmarks starLayerGroup is of type L.LayerGroup
        // The L.LayerGroup does not support getBounds
        // Convert all bookmarks to simple markers on a temporary layer of type L.FeatureGroup
        let layer = new window.L.FeatureGroup();
        for (let bookmarklayer of bookmarklayers) {
            let latlng = bookmarklayer.getLatLng();
            window.L.marker([latlng.lat, latlng.lng]).addTo(layer);
        }
        window.map.fitBounds(layer.getBounds());
    };
    self.drawbookmarks = function(bookmarkslist,replaceexisting) { // {<guid>:{folder:<string>,latlng:<window.L.LatLng>,label:<string>,color:<string>}};
        // super fast: draw bookmarks instantly by replacing all bookmarks data, without slow hooks and console calls
        if (!window.plugin.bookmarks) return;
        if (!bookmarkslist || !Object.keys(bookmarkslist).length) return;

        replaceexisting = replaceexisting || false;
        function saveAndRefreshBookmarks() {
            window.plugin.bookmarks.saveStorage();
            window.plugin.bookmarks.refreshBkmrks();
            window.runHooks('pluginBkmrksEdit', {"target": "all", "action": "import"});
        }
        function createBookmarkData(guid,latlng,label,color) {
            if (typeof latlng == 'object') {
                latlng = latlng.lat+','+latlng.lng;
            }
            let bookmark = {"guid":guid,"latlng":latlng,"label":label};
            if (window.plugin.bookmarksAddon) {
                bookmark.color = color;
            }
            return bookmark;
        }
        function getBookmarksFolderID(bookmarksfolder) {
            if (!bookmarksfolder) bookmarksfolder = "Others"; // default
            let folderid = undefined;
            for (const ID in window.plugin.bookmarks.bkmrksObj.portals) {
                if (window.plugin.bookmarks.bkmrksObj.portals[ID].label == bookmarksfolder) {
                    folderid = ID;
                    break;
                }
            }
            return folderid;
        }
        function createNewBookmarksFolder(bookmarksfolder) {
            if (!bookmarksfolder) bookmarksfolder = "Others"; // default
            let folderid = getBookmarksFolderID(bookmarksfolder);
            if (!folderid) {
                folderid = window.plugin.bookmarks.generateID();

                window.plugin.bookmarks.bkmrksObj.portals[folderid] = {"label":bookmarksfolder,"state":1,"bkmrk":{}};
                window.plugin.bookmarks.saveStorage();
                window.plugin.bookmarks.refreshBkmrks();
                window.runHooks('pluginBkmrksEdit', {"target": 'folder', "action": "add", "id": folderid});
            }
            return folderid;
        }

        let changecnt = 0,addcnt = 0,skipcnt = 0;
        for (let guid in bookmarkslist) {
            let bookmark = bookmarkslist[guid];
            let bookmarkFolderID = createNewBookmarksFolder(bookmark.folder);

            let newbookmarkdata = createBookmarkData(guid,bookmark.latlng,bookmark.label,bookmark.color);
            let bkmrkData = window.plugin.bookmarks.findByGuid(guid);
            if (bkmrkData) {
                if (bookmarkFolderID == bkmrkData.id_folder &&
                    newbookmarkdata.latlng == window.plugin.bookmarks.bkmrksObj.portals[bkmrkData.id_folder].bkmrk[bkmrkData.id_bookmark].latlng &&
                    newbookmarkdata.label == window.plugin.bookmarks.bkmrksObj.portals[bkmrkData.id_folder].bkmrk[bkmrkData.id_bookmark].label &&
                    newbookmarkdata.color == window.plugin.bookmarks.bkmrksObj.portals[bkmrkData.id_folder].bkmrk[bkmrkData.id_bookmark].color) {
                    // same data, skip
                    skipcnt++;
                    continue;
                }
                if (!replaceexisting) {
                    skipcnt++;
                    continue;
                }
                // remove (to replace) existing bookmark:
                delete window.plugin.bookmarks.bkmrksObj.portals[bkmrkData.id_folder].bkmrk[bkmrkData.id_bookmark];
                changecnt++;
            } else {
                addcnt++;
            }

            // add new bookmark:
            let ID = window.plugin.bookmarks.generateID();
            window.plugin.bookmarks.bkmrksObj.portals[bookmarkFolderID].bkmrk[ID] = newbookmarkdata;
        }

        if (addcnt || changecnt) {
            saveAndRefreshBookmarks();
        }

        //console.log('Bookmarks added: ' + addcnt + ' changed: ' + changecnt + ' unchanged: ' + skipcnt);
        return {added:addcnt,changed:changecnt,skipped:skipcnt};
    };
    self.removebookmarks = function(guids) { // guids = [guid,guid,...]
        let removecnt = 0;
        for (const folderid in window.plugin.bookmarks.bkmrksObj.portals) {
            // remove bookmarks from any/every folder:
            for (const ID in window.plugin.bookmarks.bkmrksObj.portals[folderid].bkmrk) {
                let bookmark = window.plugin.bookmarks.bkmrksObj.portals[folderid].bkmrk[ID];
                if (guids.includes(bookmark.guid)) {
                    // remove existing bookmark:
                    delete window.plugin.bookmarks.bkmrksObj.portals[folderid].bkmrk[ID];
                    removecnt++;
                }
            }
            // remove empty bookmarks folder:
            if (folderid != 'idOthers' && Object.keys(window.plugin.bookmarks.bkmrksObj.portals[folderid].bkmrk).length == 0) {
                delete window.plugin.bookmarks.bkmrksObj.portals[folderid];
            }
        }

        window.plugin.bookmarks.saveStorage();
        window.plugin.bookmarks.refreshBkmrks();
        window.runHooks('pluginBkmrksEdit', {"target": "all", "action": "reset"});
    };

    self.clearbookmarktimerlist = function() {
        self.requestlist = [];
        clearTimeout(self.requestlisttimer);
        self.requestlisttimer = 0;
        clearTimeout(self.requestlisttimeout);
        self.requestlisttimeout = 0;

        self.requestbookmarkfoldername = '';

        if (self.bookmarkrestorecolor) window.plugin.bookmarksAddon.settings.color = self.bookmarkrestorecolor;
        self.bookmarkrestorecolor = undefined;

        $(window.DIALOGS[`dialog-${self.pluginname}-dialog-patience`]).dialog('close');
    };

    self.addbookmarkanywhererequestnext = function() {
        function msToTime(duration) {
            let milliseconds = Math.floor((duration % 1000) / 100);
            let seconds = Math.floor((duration / 1000) % 60);
            let minutes = Math.floor((duration / (1000 * 60)) % 60);
            let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

            hours = `0${hours}`.substr(-2);
            minutes = `0${minutes}`.substr(-2);
            seconds = `0${seconds}`.substr(-2);

            return `${hours}:${minutes}:${seconds}`;
        }

        // update dialog values:
        let count_requestlist_span = window.DIALOGS[`dialog-${self.pluginname}-dialog-patience`]?.querySelector('span[name=count_requestlist]');
        if (count_requestlist_span) count_requestlist_span.innerHTML = self.requestlist.length;
        let count_timeleft_span = window.DIALOGS[`dialog-${self.pluginname}-dialog-patience`]?.querySelector('span[name=count_timeleft]');
        if (count_timeleft_span) {
            let timepassed = Date.now() - self.requesttimerstarttime;
            let requestsdone = self.requesttimerstarttotal - self.requestlist.length;
            if (requestsdone > 0) {
                let timeeach = timepassed / requestsdone;
                count_timeleft_span.innerHTML = msToTime(timeeach * self.requestlist.length);
            }
        }

        self.request = self.requestlist.shift();

        self.requestlisttimer = setTimeout(function() {
            let guid = self.request.guid;
            let requestcnt = self.request.cnt;
            self.requestlisttimeout = setTimeout(function() {
                // retry
                self.requestlisttimeout = 0;
                if (self.request.cnt < self.requestmax) {
                    console.log(`WARNING: addbookmarkanywhererequestnext - request timeout (${self.request.cnt}/${self.requestmax})`,guid);
                    self.requestlist.push({guid:guid,cnt:requestcnt});
                } else {
                    console.log(`FAIL: addbookmarkanywhererequestnext - max request timeout (${self.requestmax})`,guid);
                }
                self.addbookmarkanywhererequestnext();
            },1000); // timeout
            self.request.cnt++;
            window.portalDetail.request(guid); // wait for hook portalDetailLoaded: call self.addbookmarkanywhererequestloaded
        },self.requestdelay);
    };

    self.addbookmarkanywhererequestloaded = function(data) {
        let guid = data.guid;
        if (self.request.guid != guid && !self.requestlist.filter((el)=>{return el.guid == guid}).length) return;

        let requestcnt = 0;
        if (self.request.guid == guid) {
            requestcnt = self.request.cnt;
            self.request = {};

            clearTimeout(self.requestlisttimeout);
            self.requestlisttimeout = 0;
        } else if (self.requestlist.filter((el)=>{return el.guid == guid}).length) {
            self.requestlist = self.requestlist.filter((el)=>{return el.guid != guid});
        }

        if (data.success) {
            if (window.portals[guid].options.data.title) {
                let portal = window.portals[guid];
                let bookmarkslist = {};
                bookmarkslist[guid] = {folder:self.requestbookmarkfoldername || "Other",latlng:portal.getLatLng(),label:portal.options.data.title,color:self.settings.bookmarkscolor};
                self.drawbookmarks(bookmarkslist,self.settings.replacebookmarks); // {<guid>:{folder:<string>,latlng:<window.L.LatLng>,label:<string>,color:<string>}};
                if (requestcnt > 1) {
                    console.log(`SUCCESS: addbookmarkanywhererequestloaded - load portal title (${requestcnt}/${self.requestmax})`,data);
                }
            } else if (requestcnt < self.requestmax) {
                console.log(`WARNING: addbookmarkanywhererequestloaded - load portal missing title (${requestcnt}/${self.requestmax})`,data);
                self.requestlist.push({guid:guid,cnt:requestcnt});
            } else {
                console.log(`FAIL: addbookmarkanywhererequestloaded - load portal missing title (${self.requestmax})`,data);
            }
        } else if (requestcnt < self.requestmax) {
            // retry
            console.log(`WARNING: addbookmarkanywhererequestloaded - load portal details failure (${requestcnt}/${self.requestmax})`,data);
            self.requestlist.push({guid:guid,cnt:requestcnt});
        } else {
            console.log(`FAIL: addbookmarkanywhererequestloaded - load portal details failure (${self.requestmax})`,data);
        }

        if (self.requestlist.length == 0) {
            // console.log('OKAY: all requests finished');
            self.clearbookmarktimerlist();
        } else if (!self.request.guid) { // only if last request completed
            self.addbookmarkanywhererequestnext();
        }
    };
    self.loadportaldetailscreatebookmarks = function(addbookmarkrequests,bookmarkfoldername) {
        if (!addbookmarkrequests.length) return;

        self.clearbookmarktimerlist();
        self.requesttimerstarttotal = addbookmarkrequests.length;
        self.requesttimerstarttime = Date.now();
        for (let guid of addbookmarkrequests) {
            self.requestlist.push({guid:guid,cnt:0});
        }
        self.requestbookmarkfoldername = bookmarkfoldername || "Other";

        let container = document.createElement('div');
        container.innerHTML = `<div>Adding bookmarks: ${bookmarkfoldername}<br>
Loading details for ${self.requesttimerstarttotal} portals.<br>
To do: <span name="count_requestlist">${self.requestlist.length}</span><br>
Estimated time left: <span name="count_timeleft">?</span><br>
<br>
Please be patient...</div>`

        window.dialog({
            html: container,
            id: `${self.pluginname}-dialog-patience`,
            title: `${self.title} - Bookmarks`,
            width: 'auto',
            closeCallback: function() {
                self.clearbookmarktimerlist();
            }
        }).dialog('option', 'buttons', {
            'Stop': function() { $(this).dialog('close'); },
        });

        self.addbookmarkanywhererequestnext();
    };

    self.addbookmarksanywherecached = function(bookmarkgroup,never) {
        if (!window.plugin.portalhistorysupport) return;
        if (self.requestlist.length) return; // busy

        let bookmarkportalguids = self.getBookmarkPortalGuids();
        let addbookmarks = [];
        let addbookmarkrequests = [];
        let bookmarkfoldername = (never?(bookmarkgroup.match('scoutControlled')?'Not ':'Never '):'') + (self.bookmarkfoldernames[bookmarkgroup] || bookmarkgroup);
        let bookmarkslist = {};

        for (const guid in window.plugin.portalhistorysupport.cache[window.PLAYER.nickname]) {
            let bitarray = window.plugin.portalhistorysupport.cache[window.PLAYER.nickname][guid];
            let history = window.plugin.portalhistorysupport.decodeHistory(bitarray);
            if ((bookmarkgroup == "Visited but never Captured" && history.visited && !history.captured) || (!never && history[bookmarkgroup]) || (never && !history[bookmarkgroup])) {
                if (guid in bookmarkportalguids) {
                    if (self.settings.replacebookmarks) { // bookmark for portal exists and is visible
                        bookmarkslist[guid] = {
                            ...bookmarkportalguids[guid],
                            folder:bookmarkfoldername || "Other",
                            color:self.settings.bookmarkscolor
                        };
                    }
                } else { // no bookmark for portal exists
                    if (guid in window.portals && window.portals[guid].options.data.title) { // portal already loaded
                        let portal = window.portals[guid];
                        bookmarkslist[guid] = {folder:bookmarkfoldername || "Other",latlng:portal.getLatLng(),label:portal.options.data.title,color:self.settings.bookmarkscolor};
                    } else {
                        addbookmarkrequests.push(guid);
                    }
                }
            }
        }

        if (!Object.keys(bookmarkslist).length && !addbookmarkrequests.length) {
            alert('There are no bookmarks to add');
            return;
        }

        let counts = self.drawbookmarks(bookmarkslist,self.settings.replacebookmarks); // {added:addcnt,changed:changecnt,skipped:skipcnt}
        if (!addbookmarkrequests.length) {
            alert(`Bookmarks added: ${counts.added}\nBookmarks changed: ${counts.changed}`);
            return;
        }

        self.loadportaldetailscreatebookmarks(addbookmarkrequests,bookmarkfoldername);
    };

    self.addbookmarksvisible = function(bookmarkgroup,bookmarkfoldername,never) {
        let bookmarkportalguids = self.getBookmarkPortalGuids();
        let displayBounds = window.map.getBounds();
        //let addbookmarks = [];
        //let replacebookmarks = [];
        //let skipportals = [];
        let bookmarkslist = {}; // {<guid>:{folder:<string>,latlng:<window.L.LatLng>,label:<string>,color:<string>}};
        let addbookmarkrequests = [];
        for (const guid in window.portals) {
            let portal = window.portals[guid];
            let latlng = portal.getLatLng();
            if (displayBounds.contains(latlng)) {
                if (portal.options.data.history && portal.options.data.history._raw != undefined) {
                    let addbookmark = false;
                    switch (bookmarkgroup) {
                        case 'visited':
                        case 'captured':
                        case 'scoutControlled':
                            addbookmark = portal.options.data.history[bookmarkgroup];
                            if (never) addbookmark = !addbookmark;
                            break;
                        case 'capturedenl':
                            if (window.portals[guid].options.team == window.TEAM_ENL) {
                                addbookmark = portal.options.data.history.captured;
                                if (never) addbookmark = !addbookmark;
                            }
                            break;
                        case 'capturedres':
                            if (window.portals[guid].options.team == window.TEAM_RES) {
                                addbookmark = portal.options.data.history.captured;
                                if (never) addbookmark = !addbookmark;
                            }
                            break;
                        case 'capturedmac':
                            if (window.portals[guid].options.team == (window.TEAM_MAC || 3)) {
                                addbookmark = portal.options.data.history.captured;
                                if (never) addbookmark = !addbookmark;
                            }
                            break;
                        case 'capturedneutral':
                            if (window.portals[guid].options.team == window.TEAM_NONE) {
                                addbookmark = portal.options.data.history.captured;
                                if (never) addbookmark = !addbookmark;
                            }
                            break;
                    }

                    if (addbookmark) {
                        if (!(guid in bookmarkportalguids) || (guid in bookmarkportalguids && self.settings.replacebookmarks)) { // new bookmark, or replace if enabled
                            let label = portal.options.data.title || bookmarkportalguids[guid]?.label;
                            if (label) {
                                bookmarkslist[guid] = {folder:bookmarkfoldername || "Other",latlng:latlng,label:label,color:self.settings.bookmarkscolor};
                            } else {
                                addbookmarkrequests.push(guid);
                            }
                        }
                    }
                }
            }
        }

        if (!Object.keys(bookmarkslist).length && !addbookmarkrequests.length) {
            alert('There are no bookmarks to add');
            return;
        }

        let counts = self.drawbookmarks(bookmarkslist,self.settings.replacebookmarks); // {added:addcnt,changed:changecnt,skipped:skipcnt}
        if (!addbookmarkrequests.length) {
            alert(`Bookmarks added: ${counts.added}\nBookmarks changed: ${counts.changed}`);
            return;
        }

        self.loadportaldetailscreatebookmarks(addbookmarkrequests,bookmarkfoldername);
    };

    self.removebookmarksvisible = function(bookmarkgroup) {
        let bookmarkportalguids = self.getBookmarkPortalGuids();
        let guids = [];
        for (const guid in bookmarkportalguids) {
            if (bookmarkportalguids[guid].visible) { // bookmark for portal exists and is visible
                switch (bookmarkgroup) {
                    case 'all':
                        guids.push(guid);
                        break;
                    case 'visited':
                    case 'captured': {
                        let portal = window.portals[guid];
                        if (portal.options.data.history && portal.options.data.history._raw != undefined) {
                            if (portal.options.data.history[bookmarkgroup]) {
                                guids.push(guid);
                            }
                        }
                        break;
                    }
                }
            }
        }
        self.removebookmarks(guids);
    };

    self.removeallbookmarks = function() {
        let bookmarkportalguids = self.getBookmarkPortalGuids();
        let guids = Object.keys(bookmarkportalguids);
        self.removebookmarks(guids);
    };

    self.bookmarks = function(menu) {
        menu = menu || 'main';

        let container = document.createElement('div');
        if (!window.plugin.bookmarks) {
            container.innerHTML = `If you install and enable the Bookmarks plugin, you can auto create bookmarks for your ${self.title}.`;
        } else {
            if (window.plugin.bookmarksAddon) {
                container.innerHTML = `<input type="color"> Bookmarks color<br>`;
            }
            container.innerHTML += `
<label><input type="checkbox" name="replacebookmarks"> Replace a bookmark if it exists</label><br>
<a href="#" class="dialogbutton" onclick="${self.namespace}showAllBookmarks(); return false;">Zoom to see all bookmarks</a>
`;
            if (menu == 'main') {
                container.innerHTML += `
Draw bookmarks on visible portals:<br>
<div class="visibleportals"></div>
<hr>
`;
                if (window.plugin.portalhistorysupport) {
                    container.innerHTML += `
<a href="#" class="dialogbutton" onclick="${self.namespace}bookmarks('cached'); return false;">Portal History Bookmarks menu...</a>
`;
                }
                container.innerHTML += `
<a href="#" class="dialogbutton" onclick="${self.namespace}bookmarks('remove'); return false;">Remove bookmarks menu...</a>
`;
                for (let layerkey in self.bookmarkfoldernames) {
                    let bookmarkfoldername = (layerkey.match('scoutControlled')?'Not':'Never') + ' ' + self.bookmarkfoldernames[layerkey];
                    let a = container.querySelector('div.visibleportals').appendChild(document.createElement('a'));
                    a.className = 'dialogbutton';
                    a.innerHTML = `${bookmarkfoldername} (<span name="count_never${layerkey}"></span>/<span name="count_${layerkey.match(/captured./) ? layerkey.replace('captured','') : 'total'}"></span>)`;
                    a.addEventListener('click',function(e) {
                        self.addbookmarksvisible(layerkey,bookmarkfoldername,true);
                        e.preventDefault();
                    },false);
                }
            } else if (menu == 'cached') {
                container.innerHTML += `
Draw bookmarks for cached portals (slow):<br>
<a href="#" class="dialogbutton" onclick="${self.namespace}addbookmarksanywherecached('visited',false); return false;">Visited (<span name="count_visitedCached"></span>)</a>
<a href="#" class="dialogbutton" onclick="${self.namespace}addbookmarksanywherecached('captured',false); return false;">Captured (<span name="count_capturedCached"></span>)</a>
<a href="#" class="dialogbutton" onclick="${self.namespace}addbookmarksanywherecached('Visited but never Captured',false); return false;">Visited but never Captured (<span name="count_visitednevercapturedCached"></span>)</a>
<a href="#" class="dialogbutton" onclick="${self.namespace}addbookmarksanywherecached('scoutControlled',false); return false;">Scout Controlled (<span name="count_scoutControlledCached"></span>)</a>
<hr>
<a href="#" class="dialogbutton" onclick="${self.namespace}bookmarks('main'); return false;">Visible portals menu...</a>
<a href="#" class="dialogbutton" onclick="${self.namespace}bookmarks('remove'); return false;">Remove bookmarks menu...</a>
`;
            } else if (menu == 'remove') {
                container.innerHTML += `
Remove bookmarks for visible portals:<br>
<a href="#" class="dialogbutton" onclick="${self.namespace}removebookmarksvisible('visited'); return false;">Remove from Visited portals (<span name="count_bookmarksalreadyvisited"></span>)</a>
<a href="#" class="dialogbutton" onclick="${self.namespace}removebookmarksvisible('captured'); return false;">Remove from Captured portals (<span name="count_bookmarksalreadycaptured"></span>)</a>
<a href="#" class="dialogbutton" onclick="if (confirm('Are you sure to delete all visible bookmarks?')) ${self.namespace}removebookmarksvisible('all'); return false;">Remove all visible bookmarks (<span name="count_bookmarksvisible"></span>)</a>
<a href="#" class="dialogbutton" onclick="if (confirm('Are you sure to delete ALL bookmarks?')) ${self.namespace}removeallbookmarks(); return false;">Remove ALL bookmarks (<span name="count_bookmarks"></span>)</a>
<hr>
<a href="#" class="dialogbutton" onclick="${self.namespace}bookmarks('main'); return false;">Visible portals menu...</a>
`;
                if (window.plugin.portalhistorysupport) {
                    container.innerHTML += `
<a href="#" class="dialogbutton" onclick="${self.namespace}bookmarks('cached'); return false;">Portal History Bookmarks menu...</a>
`;
                }
            }

            container.querySelector(`input[type=checkbox][name=replacebookmarks]`).checked = self.settings.replacebookmarks;
            container.querySelector(`input[type=checkbox][name=replacebookmarks]`).addEventListener('click',function(e) {
                self.settings.replacebookmarks = this.checked;
                self.storesettings();
            },false);

            if (window.plugin.bookmarksAddon) {
                $(container.querySelector(`input[type=color]`)).spectrum({
                    ...self.colorpickeroptions,
                    change: function(color) {
                        self.settings.bookmarkscolor = color.toHexString();
                        self.storesettings();
                    },
                    color: self.settings.bookmarkscolor,
                });
            }

            self.updatemenu(container);
        }

        let bookmarksbutton = (window.plugin.bookmarks? { 'Bookmarks plugin': function() { window.plugin.bookmarks.manualOpt(); } } : {});
        window.dialog({
            html: container,
            id: `${self.pluginname}-dialog`,
            title: `${self.title} - Bookmarks`,
            width: 'auto'
        }).dialog('option', 'buttons', {
            '< Main menu': function() { self.menu(); },
            ...bookmarksbutton,
            'Close': function() { $(this).dialog('close'); },
        });
    };

    self.getBookmarkPortalGuids = function() {
        let guidlist = {};
        if (!window.plugin.bookmarks) return guidlist;

        let visiblebounds = window.map.getBounds();
        for (const ID in window.plugin.bookmarks.bkmrksObj.portals) {
            for (const bkmrkid in window.plugin.bookmarks.bkmrksObj.portals[ID].bkmrk) {
                let bookmark = window.plugin.bookmarks.bkmrksObj.portals[ID].bkmrk[bkmrkid];
                let latlng = JSON.parse('[' + bookmark.latlng + ']');
                guidlist[bookmark.guid] = {
                    ...bookmark,
                    folder: window.plugin.bookmarks.bkmrksObj.portals[ID].label,
                    visible: visiblebounds.contains(latlng)
                }
            }
        }
        return guidlist;
    };

    self.count = function() {
        let bookmarkportalguids = self.getBookmarkPortalGuids();
        let displayBounds = window.map.getBounds();
        let count = {
            total: 0,
            history: 0,
            nevervisited: 0,
            nevervisitedCached: 0,
            visited: 0,
            visitedCached: 0,
            visitednevercapturedCached: 0,
            nevercaptured: 0,
            nevercapturedCached: 0,
            captured: 0,
            capturedCached: 0,
            neverscoutControlled: 0,
            neverscoutControlledCached: 0,
            scoutControlled: 0,
            scoutControlledCached: 0,
            enl: 0,
            nevercapturedenl: 0,
            capturedenl: 0,
            res: 0,
            nevercapturedres: 0,
            capturedres: 0,
            mac: 0,
            nevercapturedmac: 0,
            capturedmac: 0,
            neutral: 0,
            nevercapturedneutral: 0,
            capturedneutral: 0,
            bookmarks: 0,
            bookmarksvisible: 0,
            bookmarksalreadyvisited: 0,
            bookmarksalreadycaptured: 0
        };

        count.bookmarks = Object.keys(bookmarkportalguids).length;
        for (const guid in bookmarkportalguids) {
            if (bookmarkportalguids[guid].visible) count.bookmarksvisible++;
        }
        for (const guid in window.portals) {
            let portal = window.portals[guid];
            if (displayBounds.contains(portal.getLatLng())) {
                count.total++;
                if (portal.options.data.history && portal.options.data.history._raw != undefined) {
                    count.history++;
                    if (portal.options.data.history.visited) count.visited++; else count.nevervisited++;
                    if (portal.options.data.history.captured) count.captured++; else count.nevercaptured++;
                    if (portal.options.data.history.scoutControlled) count.scoutControlled++; else count.neverscoutControlled++;
                    if (portal.options.team == window.TEAM_ENL) {
                        count.enl++;
                        if (portal.options.data.history.captured) count.capturedenl++; else count.nevercapturedenl++;
                    }
                    if (portal.options.team == window.TEAM_RES) {
                        count.res++;
                        if (portal.options.data.history.captured) count.capturedres++; else count.nevercapturedres++;
                    }
                    if (portal.options.team == (window.TEAM_MAC || 3)) {
                        count.mac++;
                        if (portal.options.data.history.captured) count.capturedmac++; else count.nevercapturedmac++;
                    }
                    if (portal.options.team == window.TEAM_NONE) {
                        count.neutral++;
                        if (portal.options.data.history.captured) count.capturedneutral++; else count.nevercapturedneutral++;
                    }
                    if (bookmarkportalguids[guid]?.visible) { // bookmark for portal exists and is visible
                        if (portal.options.data.history.visited) count.bookmarksalreadyvisited++;
                        if (portal.options.data.history.captured) count.bookmarksalreadycaptured++;
                    }
                }
            }
        }

        if (window.plugin.portalhistorysupport) {
            for (const guid in window.plugin.portalhistorysupport.cache[window.PLAYER.nickname]) {
                let bitarray = window.plugin.portalhistorysupport.cache[window.PLAYER.nickname][guid];
                let history = window.plugin.portalhistorysupport.decodeHistory(bitarray);

                if (history.visited) count.visitedCached++; else count.nevervisitedCached++;
                if (history.captured) count.capturedCached++; else count.nevercapturedCached++;
                if (history.visited && !history.captured) count.visitednevercapturedCached++;
                if (history.scoutControlled) count.scoutControlledCached++; else count.neverscoutControlledCached++;
            }
        }

        return count;
    };

    self.updatemenu = function(container) {
        if (!(container instanceof HTMLElement)) container = window.DIALOGS[`dialog-${self.pluginname}-dialog`];
        if (!container) return;

        let count = self.count();
        for (let id in count) {
            container.querySelectorAll(`span[name=count_${id}]`).forEach((el)=>{
                el.innerHTML = count[id];
            });
        }
        if (container.querySelector('div[name=layerrows]')) {
            for (const layername in self.toggle_layers) {
                let row = container.querySelector(`div[name=${layername}-row]`);
                row.querySelector('span[name=layer]').innerHTML = (self.settings.invertresults?self.toggle_layernamesinverted[layername]:self.toggle_layernames[layername]);
                row.querySelector('input[type=checkbox]').checked = self.layeractive(layername);
                row.querySelector('span[name=count]').innerHTML = (self.settings.invertresults?count[`never${layername}`]:count[layername]) + '/' + (layername.match(/captured/) ? count[layername.replace('captured','')] : count.total);
                row.querySelector('span[name=count]').setAttribute('title',(self.settings.invertresults?self.layerdescriptioninverted[layername]:self.layerdescription[layername]));
            }
        }
    };

    self.menu = function() {
        let container = document.createElement('div');
        container.innerHTML = `
Visible portals with history: <span name="count_history"></span><br>
Total visible portals: <span name="count_total"></span><br>
<label><input type="checkbox" name="showwhenzoomedout">Show markers at Links zoom level</label><br>
<label><input type="checkbox" name="invertresults">Invert layers to Never</label><br>
Show/hide layers:<br>
<div name="layerrows"></div>
<span class="footer">version ${self.version} by ${self.author}</span>
</div>
`;

        for (const layername in self.toggle_layers) {
            let row = container.querySelector('div[name=layerrows]').appendChild(document.createElement('div'));
            row.setAttribute('name',`${layername}-row`);
            row.innerHTML = `<input type="color"><label><input type="checkbox"><span name="layer"></span> portals (<span name="count"></span>)</label>`;
            row.querySelector('input[type=checkbox]').addEventListener('click',function(e) {
                self.displaytogglelayer(layername,this.checked);
            },false);
            $(row.querySelector('input[type=color]')).spectrum({
                ...self.colorpickeroptions,
                change: function(color) {
                    self.settings.color[layername] = color.toHexString();
                    self.storesettings();
                    self.updateMarkers(layername);
                },
                color: self.settings.color[layername]
            });
        }

        container.querySelector('input[name=showwhenzoomedout]').checked = self.settings.showwhenzoomedout;
        container.querySelector('input[name=showwhenzoomedout]').addEventListener('click',function(e) {
            self.settings.showwhenzoomedout = this.checked;
            self.onzoomend();
            self.storesettings();
        },false);
        container.querySelector('input[name=invertresults]').checked = self.settings.invertresults;
        container.querySelector('input[name=invertresults]').addEventListener('click',function(e) {
            self.settings.invertresults = this.checked;
            self.invertresults();
            self.storesettings();
            self.updatemenu(container);
        },false);

        self.updatemenu(container);

        if (window.useAndroidPanes()) window.show('map'); // hide sidepane
        window.dialog({
            html: container,
            id: `${self.pluginname}-dialog`,
            title: self.title,
            width: 'auto'
        }).dialog('option', 'buttons', {
            'Bookmarks': function() { self.bookmarks(); },
            'About': function() { self.about(); },
            'Ok': function() { $(this).dialog('close'); },
        });
    };

    self.setupColorpickerSpectrum = function() {
        // source: https://github.com/bgrins/spectrum
        // minified with https://www.minifier.org/

        // Spectrum Colorpicker v1.8.1
        // https://github.com/bgrins/spectrum
        // Author: Brian Grinstead
        // License: MIT

		(function(factory){"use strict";if(typeof define==='function'&&define.amd){define(['jquery'],factory)}else if(typeof exports=="object"&&typeof module=="object"){module.exports=factory(require('jquery'))}else{factory(jQuery)}})(function($,undefined){"use strict";var defaultOpts={beforeShow:noop,move:noop,change:noop,show:noop,hide:noop,color:!1,flat:!1,showInput:!1,allowEmpty:!1,showButtons:!0,clickoutFiresChange:!0,showInitial:!1,showPalette:!1,showPaletteOnly:!1,hideAfterPaletteSelect:!1,togglePaletteOnly:!1,showSelectionPalette:!0,localStorageKey:!1,appendTo:"body",maxSelectionSize:7,cancelText:"cancel",chooseText:"choose",togglePaletteMoreText:"more",togglePaletteLessText:"less",clearText:"Clear Color Selection",noColorSelectedText:"No Color Selected",preferredFormat:!1,className:"",containerClassName:"",replacerClassName:"",showAlpha:!1,theme:"sp-light",palette:[["#ffffff","#000000","#ff0000","#ff8000","#ffff00","#008000","#0000ff","#4b0082","#9400d3"]],selectionPalette:[],disabled:!1,offset:null},spectrums=[],IE=!!/msie/i.exec(window.navigator.userAgent),rgbaSupport=(function(){function contains(str,substr){return!!~(''+str).indexOf(substr)}
		var elem=document.createElement('div');var style=elem.style;style.cssText='background-color:rgba(0,0,0,.5)';return contains(style.backgroundColor,'rgba')||contains(style.backgroundColor,'hsla')})(),replaceInput=["<div class='sp-replacer'>","<div class='sp-preview'><div class='sp-preview-inner'></div></div>","<div class='sp-dd'>&#9660;</div>","</div>"].join(''),markup=(function(){var gradientFix="";if(IE){for(var i=1;i<=6;i++){gradientFix+="<div class='sp-"+i+"'></div>"}}
		return["<div class='sp-container sp-hidden'>","<div class='sp-palette-container'>","<div class='sp-palette sp-thumb sp-cf'></div>","<div class='sp-palette-button-container sp-cf'>","<button type='button' class='sp-palette-toggle'></button>","</div>","</div>","<div class='sp-picker-container'>","<div class='sp-top sp-cf'>","<div class='sp-fill'></div>","<div class='sp-top-inner'>","<div class='sp-color'>","<div class='sp-sat'>","<div class='sp-val'>","<div class='sp-dragger'></div>","</div>","</div>","</div>","<div class='sp-clear sp-clear-display'>","</div>","<div class='sp-hue'>","<div class='sp-slider'></div>",gradientFix,"</div>","</div>","<div class='sp-alpha'><div class='sp-alpha-inner'><div class='sp-alpha-handle'></div></div></div>","</div>","<div class='sp-input-container sp-cf'>","<input class='sp-input' type='text' spellcheck='false'  />","</div>","<div class='sp-initial sp-thumb sp-cf'></div>","<div class='sp-button-container sp-cf'>","<a class='sp-cancel' href='#'></a>","<button type='button' class='sp-choose'></button>","</div>","</div>","</div>"].join("")})();function paletteTemplate(p,color,className,opts){var html=[];for(var i=0;i<p.length;i++){var current=p[i];if(current){var tiny=tinycolor(current);var c=tiny.toHsl().l<0.5?"sp-thumb-el sp-thumb-dark":"sp-thumb-el sp-thumb-light";c+=(tinycolor.equals(color,current))?" sp-thumb-active":"";var formattedString=tiny.toString(opts.preferredFormat||"rgb");var swatchStyle=rgbaSupport?("background-color:"+tiny.toRgbString()):"filter:"+tiny.toFilter();html.push('<span title="'+formattedString+'" data-color="'+tiny.toRgbString()+'" class="'+c+'"><span class="sp-thumb-inner" style="'+swatchStyle+';"></span></span>')}else{var cls='sp-clear-display';html.push($('<div />').append($('<span data-color="" style="background-color:transparent;" class="'+cls+'"></span>').attr('title',opts.noColorSelectedText)).html())}}
		return"<div class='sp-cf "+className+"'>"+html.join('')+"</div>"}
		function hideAll(){for(var i=0;i<spectrums.length;i++){if(spectrums[i]){spectrums[i].hide()}}}
		function instanceOptions(o,callbackContext){var opts=$.extend({},defaultOpts,o);opts.callbacks={'move':bind(opts.move,callbackContext),'change':bind(opts.change,callbackContext),'show':bind(opts.show,callbackContext),'hide':bind(opts.hide,callbackContext),'beforeShow':bind(opts.beforeShow,callbackContext)};return opts}
		function spectrum(element,o){var opts=instanceOptions(o,element),flat=opts.flat,showSelectionPalette=opts.showSelectionPalette,localStorageKey=opts.localStorageKey,theme=opts.theme,callbacks=opts.callbacks,resize=throttle(reflow,10),visible=!1,isDragging=!1,dragWidth=0,dragHeight=0,dragHelperHeight=0,slideHeight=0,slideWidth=0,alphaWidth=0,alphaSlideHelperWidth=0,slideHelperHeight=0,currentHue=0,currentSaturation=0,currentValue=0,currentAlpha=1,palette=[],paletteArray=[],paletteLookup={},selectionPalette=opts.selectionPalette.slice(0),maxSelectionSize=opts.maxSelectionSize,draggingClass="sp-dragging",shiftMovementDirection=null;var doc=element.ownerDocument,body=doc.body,boundElement=$(element),disabled=!1,container=$(markup,doc).addClass(theme),pickerContainer=container.find(".sp-picker-container"),dragger=container.find(".sp-color"),dragHelper=container.find(".sp-dragger"),slider=container.find(".sp-hue"),slideHelper=container.find(".sp-slider"),alphaSliderInner=container.find(".sp-alpha-inner"),alphaSlider=container.find(".sp-alpha"),alphaSlideHelper=container.find(".sp-alpha-handle"),textInput=container.find(".sp-input"),paletteContainer=container.find(".sp-palette"),initialColorContainer=container.find(".sp-initial"),cancelButton=container.find(".sp-cancel"),clearButton=container.find(".sp-clear"),chooseButton=container.find(".sp-choose"),toggleButton=container.find(".sp-palette-toggle"),isInput=boundElement.is("input"),isInputTypeColor=isInput&&boundElement.attr("type")==="color"&&inputTypeColorSupport(),shouldReplace=isInput&&!flat,replacer=(shouldReplace)?$(replaceInput).addClass(theme).addClass(opts.className).addClass(opts.replacerClassName):$([]),offsetElement=(shouldReplace)?replacer:boundElement,previewElement=replacer.find(".sp-preview-inner"),initialColor=opts.color||(isInput&&boundElement.val()),colorOnShow=!1,currentPreferredFormat=opts.preferredFormat,clickoutFiresChange=!opts.showButtons||opts.clickoutFiresChange,isEmpty=!initialColor,allowEmpty=opts.allowEmpty&&!isInputTypeColor;function applyOptions(){if(opts.showPaletteOnly){opts.showPalette=!0}
		toggleButton.text(opts.showPaletteOnly?opts.togglePaletteMoreText:opts.togglePaletteLessText);if(opts.palette){palette=opts.palette.slice(0);paletteArray=Array.isArray(palette[0])?palette:[palette];paletteLookup={};for(var i=0;i<paletteArray.length;i++){for(var j=0;j<paletteArray[i].length;j++){var rgb=tinycolor(paletteArray[i][j]).toRgbString();paletteLookup[rgb]=!0}}}
		container.toggleClass("sp-flat",flat);container.toggleClass("sp-input-disabled",!opts.showInput);container.toggleClass("sp-alpha-enabled",opts.showAlpha);container.toggleClass("sp-clear-enabled",allowEmpty);container.toggleClass("sp-buttons-disabled",!opts.showButtons);container.toggleClass("sp-palette-buttons-disabled",!opts.togglePaletteOnly);container.toggleClass("sp-palette-disabled",!opts.showPalette);container.toggleClass("sp-palette-only",opts.showPaletteOnly);container.toggleClass("sp-initial-disabled",!opts.showInitial);container.addClass(opts.className).addClass(opts.containerClassName);reflow()}
		function initialize(){if(IE){container.find("*:not(input)").attr("unselectable","on")}
		applyOptions();if(shouldReplace){boundElement.after(replacer).hide()}
		if(!allowEmpty){clearButton.hide()}
		if(flat){boundElement.after(container).hide()}else{var appendTo=opts.appendTo==="parent"?boundElement.parent():$(opts.appendTo);if(appendTo.length!==1){appendTo=$("body")}
		appendTo.append(container)}
		updateSelectionPaletteFromStorage();offsetElement.on("click.spectrum touchstart.spectrum",function(e){if(!disabled){toggle()}
		e.stopPropagation();if(!$(e.target).is("input")){e.preventDefault()}});if(boundElement.is(":disabled")||(opts.disabled===!0)){disable()}
		container.on("click",stopPropagation);textInput.on("change",setFromTextInput);textInput.on("paste",function(){setTimeout(setFromTextInput,1)});textInput.on("keydown",function(e){if(e.keyCode==13){setFromTextInput()}});cancelButton.text(opts.cancelText);cancelButton.on("click.spectrum",function(e){e.stopPropagation();e.preventDefault();revert();hide()});clearButton.attr("title",opts.clearText);clearButton.on("click.spectrum",function(e){e.stopPropagation();e.preventDefault();isEmpty=!0;move();if(flat){updateOriginalInput(!0)}});chooseButton.text(opts.chooseText);chooseButton.on("click.spectrum",function(e){e.stopPropagation();e.preventDefault();if(IE&&textInput.is(":focus")){textInput.trigger('change')}
		if(isValid()){updateOriginalInput(!0);hide()}});toggleButton.text(opts.showPaletteOnly?opts.togglePaletteMoreText:opts.togglePaletteLessText);toggleButton.on("click.spectrum",function(e){e.stopPropagation();e.preventDefault();opts.showPaletteOnly=!opts.showPaletteOnly;if(!opts.showPaletteOnly&&!flat){container.css('left','-='+(pickerContainer.outerWidth(!0)+5))}
		applyOptions()});draggable(alphaSlider,function(dragX,dragY,e){currentAlpha=(dragX/alphaWidth);isEmpty=!1;if(e.shiftKey){currentAlpha=Math.round(currentAlpha*10)/10}
		move()},dragStart,dragStop);draggable(slider,function(dragX,dragY){currentHue=parseFloat(dragY/slideHeight);isEmpty=!1;if(!opts.showAlpha){currentAlpha=1}
		move()},dragStart,dragStop);draggable(dragger,function(dragX,dragY,e){if(!e.shiftKey){shiftMovementDirection=null}else if(!shiftMovementDirection){var oldDragX=currentSaturation*dragWidth;var oldDragY=dragHeight-(currentValue*dragHeight);var furtherFromX=Math.abs(dragX-oldDragX)>Math.abs(dragY-oldDragY);shiftMovementDirection=furtherFromX?"x":"y"}
		var setSaturation=!shiftMovementDirection||shiftMovementDirection==="x";var setValue=!shiftMovementDirection||shiftMovementDirection==="y";if(setSaturation){currentSaturation=parseFloat(dragX/dragWidth)}
		if(setValue){currentValue=parseFloat((dragHeight-dragY)/dragHeight)}
		isEmpty=!1;if(!opts.showAlpha){currentAlpha=1}
		move()},dragStart,dragStop);if(!!initialColor){set(initialColor);updateUI();currentPreferredFormat=opts.preferredFormat||tinycolor(initialColor).format;addColorToSelectionPalette(initialColor)}else{updateUI()}
		if(flat){show()}
		function paletteElementClick(e){if(e.data&&e.data.ignore){set($(e.target).closest(".sp-thumb-el").data("color"));move()}else{set($(e.target).closest(".sp-thumb-el").data("color"));move();if(opts.hideAfterPaletteSelect){updateOriginalInput(!0);hide()}else{updateOriginalInput()}}
		return!1}
		var paletteEvent=IE?"mousedown.spectrum":"click.spectrum touchstart.spectrum";paletteContainer.on(paletteEvent,".sp-thumb-el",paletteElementClick);initialColorContainer.on(paletteEvent,".sp-thumb-el:nth-child(1)",{ignore:!0},paletteElementClick)}
		function updateSelectionPaletteFromStorage(){if(localStorageKey&&window.localStorage){try{var oldPalette=window.localStorage[localStorageKey].split(",#");if(oldPalette.length>1){delete window.localStorage[localStorageKey];$.each(oldPalette,function(i,c){addColorToSelectionPalette(c)})}}catch(e){}
		try{selectionPalette=window.localStorage[localStorageKey].split(";")}catch(e){}}}
		function addColorToSelectionPalette(color){if(showSelectionPalette){var rgb=tinycolor(color).toRgbString();if(!paletteLookup[rgb]&&$.inArray(rgb,selectionPalette)===-1){selectionPalette.push(rgb);while(selectionPalette.length>maxSelectionSize){selectionPalette.shift()}}
		if(localStorageKey&&window.localStorage){try{window.localStorage[localStorageKey]=selectionPalette.join(";")}catch(e){}}}}
		function getUniqueSelectionPalette(){var unique=[];if(opts.showPalette){for(var i=0;i<selectionPalette.length;i++){var rgb=tinycolor(selectionPalette[i]).toRgbString();if(!paletteLookup[rgb]){unique.push(selectionPalette[i])}}}
		return unique.reverse().slice(0,opts.maxSelectionSize)}
		function drawPalette(){var currentColor=get();var html=$.map(paletteArray,function(palette,i){return paletteTemplate(palette,currentColor,"sp-palette-row sp-palette-row-"+i,opts)});updateSelectionPaletteFromStorage();if(selectionPalette){html.push(paletteTemplate(getUniqueSelectionPalette(),currentColor,"sp-palette-row sp-palette-row-selection",opts))}
		paletteContainer.html(html.join(""))}
		function drawInitial(){if(opts.showInitial){var initial=colorOnShow;var current=get();initialColorContainer.html(paletteTemplate([initial,current],current,"sp-palette-row-initial",opts))}}
		function dragStart(){if(dragHeight<=0||dragWidth<=0||slideHeight<=0){reflow()}
		isDragging=!0;container.addClass(draggingClass);shiftMovementDirection=null;boundElement.trigger('dragstart.spectrum',[get()])}
		function dragStop(){isDragging=!1;container.removeClass(draggingClass);boundElement.trigger('dragstop.spectrum',[get()])}
		function setFromTextInput(){var value=textInput.val();if((value===null||value==="")&&allowEmpty){set(null);move();updateOriginalInput()}else{var tiny=tinycolor(value);if(tiny.isValid()){set(tiny);move();updateOriginalInput()}else{textInput.addClass("sp-validation-error")}}}
		function toggle(){if(visible){hide()}else{show()}}
		function show(){var event=$.Event('beforeShow.spectrum');if(visible){reflow();return}
		boundElement.trigger(event,[get()]);if(callbacks.beforeShow(get())===!1||event.isDefaultPrevented()){return}
		hideAll();visible=!0;$(doc).on("keydown.spectrum",onkeydown);$(doc).on("click.spectrum",clickout);$(window).on("resize.spectrum",resize);replacer.addClass("sp-active");container.removeClass("sp-hidden");reflow();updateUI();colorOnShow=get();drawInitial();callbacks.show(colorOnShow);boundElement.trigger('show.spectrum',[colorOnShow])}
		function onkeydown(e){if(e.keyCode===27){hide()}}
		function clickout(e){if(e.button==2){return}
		if(isDragging){return}
		if(clickoutFiresChange){updateOriginalInput(!0)}else{revert()}
		hide()}
		function hide(){if(!visible||flat){return}
		visible=!1;$(doc).off("keydown.spectrum",onkeydown);$(doc).off("click.spectrum",clickout);$(window).off("resize.spectrum",resize);replacer.removeClass("sp-active");container.addClass("sp-hidden");callbacks.hide(get());boundElement.trigger('hide.spectrum',[get()])}
		function revert(){set(colorOnShow,!0);updateOriginalInput(!0)}
		function set(color,ignoreFormatChange){if(tinycolor.equals(color,get())){updateUI();return}
		var newColor,newHsv;if(!color&&allowEmpty){isEmpty=!0}else{isEmpty=!1;newColor=tinycolor(color);newHsv=newColor.toHsv();currentHue=(newHsv.h%360)/360;currentSaturation=newHsv.s;currentValue=newHsv.v;currentAlpha=newHsv.a}
		updateUI();if(newColor&&newColor.isValid()&&!ignoreFormatChange){currentPreferredFormat=opts.preferredFormat||newColor.getFormat()}}
		function get(opts){opts=opts||{};if(allowEmpty&&isEmpty){return null}
		return tinycolor.fromRatio({h:currentHue,s:currentSaturation,v:currentValue,a:Math.round(currentAlpha*1000)/1000},{format:opts.format||currentPreferredFormat})}
		function isValid(){return!textInput.hasClass("sp-validation-error")}
		function move(){updateUI();callbacks.move(get());boundElement.trigger('move.spectrum',[get()])}
		function updateUI(){textInput.removeClass("sp-validation-error");updateHelperLocations();var flatColor=tinycolor.fromRatio({h:currentHue,s:1,v:1});dragger.css("background-color",flatColor.toHexString());var format=currentPreferredFormat;if(currentAlpha<1&&!(currentAlpha===0&&format==="name")){if(format==="hex"||format==="hex3"||format==="hex6"||format==="name"){format="rgb"}}
		var realColor=get({format:format}),displayColor='';previewElement.removeClass("sp-clear-display");previewElement.css('background-color','transparent');if(!realColor&&allowEmpty){previewElement.addClass("sp-clear-display")}else{var realHex=realColor.toHexString(),realRgb=realColor.toRgbString();if(rgbaSupport||realColor.alpha===1){previewElement.css("background-color",realRgb)}else{previewElement.css("background-color","transparent");previewElement.css("filter",realColor.toFilter())}
		if(opts.showAlpha){var rgb=realColor.toRgb();rgb.a=0;var realAlpha=tinycolor(rgb).toRgbString();var gradient="linear-gradient(left, "+realAlpha+", "+realHex+")";if(IE){alphaSliderInner.css("filter",tinycolor(realAlpha).toFilter({gradientType:1},realHex))}else{alphaSliderInner.css("background","-webkit-"+gradient);alphaSliderInner.css("background","-moz-"+gradient);alphaSliderInner.css("background","-ms-"+gradient);alphaSliderInner.css("background","linear-gradient(to right, "+realAlpha+", "+realHex+")")}}
		displayColor=realColor.toString(format)}
		if(opts.showInput){textInput.val(displayColor)}
		if(opts.showPalette){drawPalette()}
		drawInitial()}
		function updateHelperLocations(){var s=currentSaturation;var v=currentValue;if(allowEmpty&&isEmpty){alphaSlideHelper.hide();slideHelper.hide();dragHelper.hide()}else{alphaSlideHelper.show();slideHelper.show();dragHelper.show();var dragX=s*dragWidth;var dragY=dragHeight-(v*dragHeight);dragX=Math.max(-dragHelperHeight,Math.min(dragWidth-dragHelperHeight,dragX-dragHelperHeight));dragY=Math.max(-dragHelperHeight,Math.min(dragHeight-dragHelperHeight,dragY-dragHelperHeight));dragHelper.css({"top":dragY+"px","left":dragX+"px"});var alphaX=currentAlpha*alphaWidth;alphaSlideHelper.css({"left":(alphaX-(alphaSlideHelperWidth/2))+"px"});var slideY=(currentHue)*slideHeight;slideHelper.css({"top":(slideY-slideHelperHeight)+"px"})}}
		function updateOriginalInput(fireCallback){var color=get(),displayColor='',hasChanged=!tinycolor.equals(color,colorOnShow);if(color){displayColor=color.toString(currentPreferredFormat);addColorToSelectionPalette(color)}
		if(isInput){boundElement.val(displayColor)}
		if(fireCallback&&hasChanged){callbacks.change(color);boundElement.trigger('change',[color])}}
		function reflow(){if(!visible){return}
		dragWidth=dragger.width();dragHeight=dragger.height();dragHelperHeight=dragHelper.height();slideWidth=slider.width();slideHeight=slider.height();slideHelperHeight=slideHelper.height();alphaWidth=alphaSlider.width();alphaSlideHelperWidth=alphaSlideHelper.width();if(!flat){container.css("position","absolute");if(opts.offset){container.offset(opts.offset)}else{container.offset(getOffset(container,offsetElement))}}
		updateHelperLocations();if(opts.showPalette){drawPalette()}
		boundElement.trigger('reflow.spectrum')}
		function destroy(){boundElement.show();offsetElement.off("click.spectrum touchstart.spectrum");container.remove();replacer.remove();spectrums[spect.id]=null}
		function option(optionName,optionValue){if(optionName===undefined){return $.extend({},opts)}
		if(optionValue===undefined){return opts[optionName]}
		opts[optionName]=optionValue;if(optionName==="preferredFormat"){currentPreferredFormat=opts.preferredFormat}
		applyOptions()}
		function enable(){disabled=!1;boundElement.attr("disabled",!1);offsetElement.removeClass("sp-disabled")}
		function disable(){hide();disabled=!0;boundElement.attr("disabled",!0);offsetElement.addClass("sp-disabled")}
		function setOffset(coord){opts.offset=coord;reflow()}
		initialize();var spect={show:show,hide:hide,toggle:toggle,reflow:reflow,option:option,enable:enable,disable:disable,offset:setOffset,set:function(c){set(c);updateOriginalInput()},get:get,destroy:destroy,container:container};spect.id=spectrums.push(spect)-1;return spect}
		function getOffset(picker,input){var extraY=0;var dpWidth=picker.outerWidth();var dpHeight=picker.outerHeight();var inputHeight=input.outerHeight();var doc=picker[0].ownerDocument;var docElem=doc.documentElement;var viewWidth=docElem.clientWidth+$(doc).scrollLeft();var viewHeight=docElem.clientHeight+$(doc).scrollTop();var offset=input.offset();var offsetLeft=offset.left;var offsetTop=offset.top;offsetTop+=inputHeight;offsetLeft-=Math.min(offsetLeft,(offsetLeft+dpWidth>viewWidth&&viewWidth>dpWidth)?Math.abs(offsetLeft+dpWidth-viewWidth):0);offsetTop-=Math.min(offsetTop,((offsetTop+dpHeight>viewHeight&&viewHeight>dpHeight)?Math.abs(dpHeight+inputHeight-extraY):extraY));return{top:offsetTop,bottom:offset.bottom,left:offsetLeft,right:offset.right,width:offset.width,height:offset.height}}
		function noop(){}
		function stopPropagation(e){e.stopPropagation()}
		function bind(func,obj){var slice=Array.prototype.slice;var args=slice.call(arguments,2);return function(){return func.apply(obj,args.concat(slice.call(arguments)))}}
		function draggable(element,onmove,onstart,onstop){onmove=onmove||function(){};onstart=onstart||function(){};onstop=onstop||function(){};var doc=document;var dragging=!1;var offset={};var maxHeight=0;var maxWidth=0;var hasTouch=('ontouchstart' in window);var duringDragEvents={};duringDragEvents.selectstart=prevent;duringDragEvents.dragstart=prevent;duringDragEvents["touchmove mousemove"]=move;duringDragEvents["touchend mouseup"]=stop;function prevent(e){if(e.stopPropagation){e.stopPropagation()}
		if(e.preventDefault){e.preventDefault()}
		e.returnValue=!1}
		function move(e){if(dragging){if(IE&&doc.documentMode<9&&!e.button){return stop()}
		var t0=e.originalEvent&&e.originalEvent.touches&&e.originalEvent.touches[0];var pageX=t0&&t0.pageX||e.pageX;var pageY=t0&&t0.pageY||e.pageY;var dragX=Math.max(0,Math.min(pageX-offset.left,maxWidth));var dragY=Math.max(0,Math.min(pageY-offset.top,maxHeight));if(hasTouch){prevent(e)}
		onmove.apply(element,[dragX,dragY,e])}}
		function start(e){var rightclick=(e.which)?(e.which==3):(e.button==2);if(!rightclick&&!dragging){if(onstart.apply(element,arguments)!==!1){dragging=!0;maxHeight=$(element).height();maxWidth=$(element).width();offset=$(element).offset();$(doc).on(duringDragEvents);$(doc.body).addClass("sp-dragging");move(e);prevent(e)}}}
		function stop(){if(dragging){$(doc).off(duringDragEvents);$(doc.body).removeClass("sp-dragging");setTimeout(function(){onstop.apply(element,arguments)},0)}
		dragging=!1}
		$(element).on("touchstart mousedown",start)}
		function throttle(func,wait,debounce){var timeout;return function(){var context=this,args=arguments;var throttler=function(){timeout=null;func.apply(context,args)};if(debounce)clearTimeout(timeout);if(debounce||!timeout)timeout=setTimeout(throttler,wait)}}
		function inputTypeColorSupport(){return $.fn.spectrum.inputTypeColorSupport()}
		var dataID="spectrum.id";$.fn.spectrum=function(opts,extra){if(typeof opts=="string"){var returnValue=this;var args=Array.prototype.slice.call(arguments,1);this.each(function(){var spect=spectrums[$(this).data(dataID)];if(spect){var method=spect[opts];if(!method){throw new Error("Spectrum: no such method: '"+opts+"'")}
		if(opts=="get"){returnValue=spect.get()}else if(opts=="container"){returnValue=spect.container}else if(opts=="option"){returnValue=spect.option.apply(spect,args)}else if(opts=="destroy"){spect.destroy();$(this).removeData(dataID)}else{method.apply(spect,args)}}});return returnValue}
		return this.spectrum("destroy").each(function(){var options=$.extend({},$(this).data(),opts);var spect=spectrum(this,options);$(this).data(dataID,spect.id)})};$.fn.spectrum.load=!0;$.fn.spectrum.loadOpts={};$.fn.spectrum.draggable=draggable;$.fn.spectrum.defaults=defaultOpts;$.fn.spectrum.inputTypeColorSupport=function inputTypeColorSupport(){if(typeof inputTypeColorSupport._cachedResult==="undefined"){var colorInput=$("<input type='color'/>")[0];inputTypeColorSupport._cachedResult=colorInput.type==="color"&&colorInput.value!==""}
		return inputTypeColorSupport._cachedResult};$.spectrum={};$.spectrum.localization={};$.spectrum.palettes={};$.fn.spectrum.processNativeColorInputs=function(){var colorInputs=$("input[type=color]");if(colorInputs.length&&!inputTypeColorSupport()){colorInputs.spectrum({preferredFormat:"hex6"})}};(function(){var trimLeft=/^[\s,#]+/,trimRight=/\s+$/,tinyCounter=0,math=Math,mathRound=math.round,mathMin=math.min,mathMax=math.max,mathRandom=math.random;var tinycolor=function(color,opts){color=(color)?color:'';opts=opts||{};if(color instanceof tinycolor){return color}
		if(!(this instanceof tinycolor)){return new tinycolor(color,opts)}
		var rgb=inputToRGB(color);this._originalInput=color;this._r=rgb.r;this._g=rgb.g;this._b=rgb.b;this._a=rgb.a;this._roundA=mathRound(1000*this._a)/1000;this._format=opts.format||rgb.format;this._gradientType=opts.gradientType;if(this._r<1){this._r=mathRound(this._r)}
		if(this._g<1){this._g=mathRound(this._g)}
		if(this._b<1){this._b=mathRound(this._b)}
		this._ok=rgb.ok;this._tc_id=tinyCounter++};tinycolor.prototype={isDark:function(){return this.getBrightness()<128},isLight:function(){return!this.isDark()},isValid:function(){return this._ok},getOriginalInput:function(){return this._originalInput},getFormat:function(){return this._format},getAlpha:function(){return this._a},getBrightness:function(){var rgb=this.toRgb();return(rgb.r*299+rgb.g*587+rgb.b*114)/1000},setAlpha:function(value){this._a=boundAlpha(value);this._roundA=mathRound(1000*this._a)/1000;return this},toHsv:function(){var hsv=rgbToHsv(this._r,this._g,this._b);return{h:hsv.h*360,s:hsv.s,v:hsv.v,a:this._a}},toHsvString:function(){var hsv=rgbToHsv(this._r,this._g,this._b);var h=mathRound(hsv.h*360),s=mathRound(hsv.s*100),v=mathRound(hsv.v*100);return(this._a==1)?"hsv("+h+", "+s+"%, "+v+"%)":"hsva("+h+", "+s+"%, "+v+"%, "+this._roundA+")"},toHsl:function(){var hsl=rgbToHsl(this._r,this._g,this._b);return{h:hsl.h*360,s:hsl.s,l:hsl.l,a:this._a}},toHslString:function(){var hsl=rgbToHsl(this._r,this._g,this._b);var h=mathRound(hsl.h*360),s=mathRound(hsl.s*100),l=mathRound(hsl.l*100);return(this._a==1)?"hsl("+h+", "+s+"%, "+l+"%)":"hsla("+h+", "+s+"%, "+l+"%, "+this._roundA+")"},toHex:function(allow3Char){return rgbToHex(this._r,this._g,this._b,allow3Char)},toHexString:function(allow3Char){return'#'+this.toHex(allow3Char)},toHex8:function(){return rgbaToHex(this._r,this._g,this._b,this._a)},toHex8String:function(){return'#'+this.toHex8()},toRgb:function(){return{r:mathRound(this._r),g:mathRound(this._g),b:mathRound(this._b),a:this._a}},toRgbString:function(){return(this._a==1)?"rgb("+mathRound(this._r)+", "+mathRound(this._g)+", "+mathRound(this._b)+")":"rgba("+mathRound(this._r)+", "+mathRound(this._g)+", "+mathRound(this._b)+", "+this._roundA+")"},toPercentageRgb:function(){return{r:mathRound(bound01(this._r,255)*100)+"%",g:mathRound(bound01(this._g,255)*100)+"%",b:mathRound(bound01(this._b,255)*100)+"%",a:this._a}},toPercentageRgbString:function(){return(this._a==1)?"rgb("+mathRound(bound01(this._r,255)*100)+"%, "+mathRound(bound01(this._g,255)*100)+"%, "+mathRound(bound01(this._b,255)*100)+"%)":"rgba("+mathRound(bound01(this._r,255)*100)+"%, "+mathRound(bound01(this._g,255)*100)+"%, "+mathRound(bound01(this._b,255)*100)+"%, "+this._roundA+")"},toName:function(){if(this._a===0){return"transparent"}
		if(this._a<1){return!1}
		return hexNames[rgbToHex(this._r,this._g,this._b,!0)]||!1},toFilter:function(secondColor){var hex8String='#'+rgbaToHex(this._r,this._g,this._b,this._a);var secondHex8String=hex8String;var gradientType=this._gradientType?"GradientType = 1, ":"";if(secondColor){var s=tinycolor(secondColor);secondHex8String=s.toHex8String()}
		return"progid:DXImageTransform.Microsoft.gradient("+gradientType+"startColorstr="+hex8String+",endColorstr="+secondHex8String+")"},toString:function(format){var formatSet=!!format;format=format||this._format;var formattedString=!1;var hasAlpha=this._a<1&&this._a>=0;var needsAlphaFormat=!formatSet&&hasAlpha&&(format==="hex"||format==="hex6"||format==="hex3"||format==="name");if(needsAlphaFormat){if(format==="name"&&this._a===0){return this.toName()}
		return this.toRgbString()}
		if(format==="rgb"){formattedString=this.toRgbString()}
		if(format==="prgb"){formattedString=this.toPercentageRgbString()}
		if(format==="hex"||format==="hex6"){formattedString=this.toHexString()}
		if(format==="hex3"){formattedString=this.toHexString(!0)}
		if(format==="hex8"){formattedString=this.toHex8String()}
		if(format==="name"){formattedString=this.toName()}
		if(format==="hsl"){formattedString=this.toHslString()}
		if(format==="hsv"){formattedString=this.toHsvString()}
		return formattedString||this.toHexString()},_applyModification:function(fn,args){var color=fn.apply(null,[this].concat([].slice.call(args)));this._r=color._r;this._g=color._g;this._b=color._b;this.setAlpha(color._a);return this},lighten:function(){return this._applyModification(lighten,arguments)},brighten:function(){return this._applyModification(brighten,arguments)},darken:function(){return this._applyModification(darken,arguments)},desaturate:function(){return this._applyModification(desaturate,arguments)},saturate:function(){return this._applyModification(saturate,arguments)},greyscale:function(){return this._applyModification(greyscale,arguments)},spin:function(){return this._applyModification(spin,arguments)},_applyCombination:function(fn,args){return fn.apply(null,[this].concat([].slice.call(args)))},analogous:function(){return this._applyCombination(analogous,arguments)},complement:function(){return this._applyCombination(complement,arguments)},monochromatic:function(){return this._applyCombination(monochromatic,arguments)},splitcomplement:function(){return this._applyCombination(splitcomplement,arguments)},triad:function(){return this._applyCombination(triad,arguments)},tetrad:function(){return this._applyCombination(tetrad,arguments)}};tinycolor.fromRatio=function(color,opts){if(typeof color=="object"){var newColor={};for(var i in color){if(color.hasOwnProperty(i)){if(i==="a"){newColor[i]=color[i]}else{newColor[i]=convertToPercentage(color[i])}}}
		color=newColor}
		return tinycolor(color,opts)};function inputToRGB(color){var rgb={r:0,g:0,b:0};var a=1;var ok=!1;var format=!1;if(typeof color=="string"){color=stringInputToObject(color)}
		if(typeof color=="object"){if(color.hasOwnProperty("r")&&color.hasOwnProperty("g")&&color.hasOwnProperty("b")){rgb=rgbToRgb(color.r,color.g,color.b);ok=!0;format=String(color.r).substr(-1)==="%"?"prgb":"rgb"}else if(color.hasOwnProperty("h")&&color.hasOwnProperty("s")&&color.hasOwnProperty("v")){color.s=convertToPercentage(color.s);color.v=convertToPercentage(color.v);rgb=hsvToRgb(color.h,color.s,color.v);ok=!0;format="hsv"}else if(color.hasOwnProperty("h")&&color.hasOwnProperty("s")&&color.hasOwnProperty("l")){color.s=convertToPercentage(color.s);color.l=convertToPercentage(color.l);rgb=hslToRgb(color.h,color.s,color.l);ok=!0;format="hsl"}
		if(color.hasOwnProperty("a")){a=color.a}}
		a=boundAlpha(a);return{ok:ok,format:color.format||format,r:mathMin(255,mathMax(rgb.r,0)),g:mathMin(255,mathMax(rgb.g,0)),b:mathMin(255,mathMax(rgb.b,0)),a:a}}
		function rgbToRgb(r,g,b){return{r:bound01(r,255)*255,g:bound01(g,255)*255,b:bound01(b,255)*255}}
		function rgbToHsl(r,g,b){r=bound01(r,255);g=bound01(g,255);b=bound01(b,255);var max=mathMax(r,g,b),min=mathMin(r,g,b);var h,s,l=(max+min)/2;if(max==min){h=s=0}else{var d=max-min;s=l>0.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break}
		h/=6}
		return{h:h,s:s,l:l}}
		function hslToRgb(h,s,l){var r,g,b;h=bound01(h,360);s=bound01(s,100);l=bound01(l,100);function hue2rgb(p,q,t){if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p}
		if(s===0){r=g=b=l}else{var q=l<0.5?l*(1+s):l+s-l*s;var p=2*l-q;r=hue2rgb(p,q,h+1/3);g=hue2rgb(p,q,h);b=hue2rgb(p,q,h-1/3)}
		return{r:r*255,g:g*255,b:b*255}}
		function rgbToHsv(r,g,b){r=bound01(r,255);g=bound01(g,255);b=bound01(b,255);var max=mathMax(r,g,b),min=mathMin(r,g,b);var h,s,v=max;var d=max-min;s=max===0?0:d/max;if(max==min){h=0}else{switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break}
		h/=6}
		return{h:h,s:s,v:v}}
		function hsvToRgb(h,s,v){h=bound01(h,360)*6;s=bound01(s,100);v=bound01(v,100);var i=math.floor(h),f=h-i,p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s),mod=i%6,r=[v,q,p,p,t,v][mod],g=[t,v,v,q,p,p][mod],b=[p,p,t,v,v,q][mod];return{r:r*255,g:g*255,b:b*255}}
		function rgbToHex(r,g,b,allow3Char){var hex=[pad2(mathRound(r).toString(16)),pad2(mathRound(g).toString(16)),pad2(mathRound(b).toString(16))];if(allow3Char&&hex[0].charAt(0)==hex[0].charAt(1)&&hex[1].charAt(0)==hex[1].charAt(1)&&hex[2].charAt(0)==hex[2].charAt(1)){return hex[0].charAt(0)+hex[1].charAt(0)+hex[2].charAt(0)}
		return hex.join("")}
		function rgbaToHex(r,g,b,a){var hex=[pad2(convertDecimalToHex(a)),pad2(mathRound(r).toString(16)),pad2(mathRound(g).toString(16)),pad2(mathRound(b).toString(16))];return hex.join("")}
		tinycolor.equals=function(color1,color2){if(!color1||!color2){return!1}
		return tinycolor(color1).toRgbString()==tinycolor(color2).toRgbString()};tinycolor.random=function(){return tinycolor.fromRatio({r:mathRandom(),g:mathRandom(),b:mathRandom()})};function desaturate(color,amount){amount=(amount===0)?0:(amount||10);var hsl=tinycolor(color).toHsl();hsl.s-=amount/100;hsl.s=clamp01(hsl.s);return tinycolor(hsl)}
		function saturate(color,amount){amount=(amount===0)?0:(amount||10);var hsl=tinycolor(color).toHsl();hsl.s+=amount/100;hsl.s=clamp01(hsl.s);return tinycolor(hsl)}
		function greyscale(color){return tinycolor(color).desaturate(100)}
		function lighten(color,amount){amount=(amount===0)?0:(amount||10);var hsl=tinycolor(color).toHsl();hsl.l+=amount/100;hsl.l=clamp01(hsl.l);return tinycolor(hsl)}
		function brighten(color,amount){amount=(amount===0)?0:(amount||10);var rgb=tinycolor(color).toRgb();rgb.r=mathMax(0,mathMin(255,rgb.r-mathRound(255*-(amount/100))));rgb.g=mathMax(0,mathMin(255,rgb.g-mathRound(255*-(amount/100))));rgb.b=mathMax(0,mathMin(255,rgb.b-mathRound(255*-(amount/100))));return tinycolor(rgb)}
		function darken(color,amount){amount=(amount===0)?0:(amount||10);var hsl=tinycolor(color).toHsl();hsl.l-=amount/100;hsl.l=clamp01(hsl.l);return tinycolor(hsl)}
		function spin(color,amount){var hsl=tinycolor(color).toHsl();var hue=(mathRound(hsl.h)+amount)%360;hsl.h=hue<0?360+hue:hue;return tinycolor(hsl)}
		function complement(color){var hsl=tinycolor(color).toHsl();hsl.h=(hsl.h+180)%360;return tinycolor(hsl)}
		function triad(color){var hsl=tinycolor(color).toHsl();var h=hsl.h;return[tinycolor(color),tinycolor({h:(h+120)%360,s:hsl.s,l:hsl.l}),tinycolor({h:(h+240)%360,s:hsl.s,l:hsl.l})]}
		function tetrad(color){var hsl=tinycolor(color).toHsl();var h=hsl.h;return[tinycolor(color),tinycolor({h:(h+90)%360,s:hsl.s,l:hsl.l}),tinycolor({h:(h+180)%360,s:hsl.s,l:hsl.l}),tinycolor({h:(h+270)%360,s:hsl.s,l:hsl.l})]}
		function splitcomplement(color){var hsl=tinycolor(color).toHsl();var h=hsl.h;return[tinycolor(color),tinycolor({h:(h+72)%360,s:hsl.s,l:hsl.l}),tinycolor({h:(h+216)%360,s:hsl.s,l:hsl.l})]}
		function analogous(color,results,slices){results=results||6;slices=slices||30;var hsl=tinycolor(color).toHsl();var part=360/slices;var ret=[tinycolor(color)];for(hsl.h=((hsl.h-(part*results>>1))+720)%360;--results;){hsl.h=(hsl.h+part)%360;ret.push(tinycolor(hsl))}
		return ret}
		function monochromatic(color,results){results=results||6;var hsv=tinycolor(color).toHsv();var h=hsv.h,s=hsv.s,v=hsv.v;var ret=[];var modification=1/results;while(results--){ret.push(tinycolor({h:h,s:s,v:v}));v=(v+modification)%1}
		return ret}
		tinycolor.mix=function(color1,color2,amount){amount=(amount===0)?0:(amount||50);var rgb1=tinycolor(color1).toRgb();var rgb2=tinycolor(color2).toRgb();var p=amount/100;var w=p*2-1;var a=rgb2.a-rgb1.a;var w1;if(w*a==-1){w1=w}else{w1=(w+a)/(1+w*a)}
		w1=(w1+1)/2;var w2=1-w1;var rgba={r:rgb2.r*w1+rgb1.r*w2,g:rgb2.g*w1+rgb1.g*w2,b:rgb2.b*w1+rgb1.b*w2,a:rgb2.a*p+rgb1.a*(1-p)};return tinycolor(rgba)};tinycolor.readability=function(color1,color2){var c1=tinycolor(color1);var c2=tinycolor(color2);var rgb1=c1.toRgb();var rgb2=c2.toRgb();var brightnessA=c1.getBrightness();var brightnessB=c2.getBrightness();var colorDiff=(Math.max(rgb1.r,rgb2.r)-Math.min(rgb1.r,rgb2.r)+Math.max(rgb1.g,rgb2.g)-Math.min(rgb1.g,rgb2.g)+Math.max(rgb1.b,rgb2.b)-Math.min(rgb1.b,rgb2.b));return{brightness:Math.abs(brightnessA-brightnessB),color:colorDiff}};tinycolor.isReadable=function(color1,color2){var readability=tinycolor.readability(color1,color2);return readability.brightness>125&&readability.color>500};tinycolor.mostReadable=function(baseColor,colorList){var bestColor=null;var bestScore=0;var bestIsReadable=!1;for(var i=0;i<colorList.length;i++){var readability=tinycolor.readability(baseColor,colorList[i]);var readable=readability.brightness>125&&readability.color>500;var score=3*(readability.brightness/125)+(readability.color/500);if((readable&&!bestIsReadable)||(readable&&bestIsReadable&&score>bestScore)||((!readable)&&(!bestIsReadable)&&score>bestScore)){bestIsReadable=readable;bestScore=score;bestColor=tinycolor(colorList[i])}}
		return bestColor};var names=tinycolor.names={aliceblue:"f0f8ff",antiquewhite:"faebd7",aqua:"0ff",aquamarine:"7fffd4",azure:"f0ffff",beige:"f5f5dc",bisque:"ffe4c4",black:"000",blanchedalmond:"ffebcd",blue:"00f",blueviolet:"8a2be2",brown:"a52a2a",burlywood:"deb887",burntsienna:"ea7e5d",cadetblue:"5f9ea0",chartreuse:"7fff00",chocolate:"d2691e",coral:"ff7f50",cornflowerblue:"6495ed",cornsilk:"fff8dc",crimson:"dc143c",cyan:"0ff",darkblue:"00008b",darkcyan:"008b8b",darkgoldenrod:"b8860b",darkgray:"a9a9a9",darkgreen:"006400",darkgrey:"a9a9a9",darkkhaki:"bdb76b",darkmagenta:"8b008b",darkolivegreen:"556b2f",darkorange:"ff8c00",darkorchid:"9932cc",darkred:"8b0000",darksalmon:"e9967a",darkseagreen:"8fbc8f",darkslateblue:"483d8b",darkslategray:"2f4f4f",darkslategrey:"2f4f4f",darkturquoise:"00ced1",darkviolet:"9400d3",deeppink:"ff1493",deepskyblue:"00bfff",dimgray:"696969",dimgrey:"696969",dodgerblue:"1e90ff",firebrick:"b22222",floralwhite:"fffaf0",forestgreen:"228b22",fuchsia:"f0f",gainsboro:"dcdcdc",ghostwhite:"f8f8ff",gold:"ffd700",goldenrod:"daa520",gray:"808080",green:"008000",greenyellow:"adff2f",grey:"808080",honeydew:"f0fff0",hotpink:"ff69b4",indianred:"cd5c5c",indigo:"4b0082",ivory:"fffff0",khaki:"f0e68c",lavender:"e6e6fa",lavenderblush:"fff0f5",lawngreen:"7cfc00",lemonchiffon:"fffacd",lightblue:"add8e6",lightcoral:"f08080",lightcyan:"e0ffff",lightgoldenrodyellow:"fafad2",lightgray:"d3d3d3",lightgreen:"90ee90",lightgrey:"d3d3d3",lightpink:"ffb6c1",lightsalmon:"ffa07a",lightseagreen:"20b2aa",lightskyblue:"87cefa",lightslategray:"789",lightslategrey:"789",lightsteelblue:"b0c4de",lightyellow:"ffffe0",lime:"0f0",limegreen:"32cd32",linen:"faf0e6",magenta:"f0f",maroon:"800000",mediumaquamarine:"66cdaa",mediumblue:"0000cd",mediumorchid:"ba55d3",mediumpurple:"9370db",mediumseagreen:"3cb371",mediumslateblue:"7b68ee",mediumspringgreen:"00fa9a",mediumturquoise:"48d1cc",mediumvioletred:"c71585",midnightblue:"191970",mintcream:"f5fffa",mistyrose:"ffe4e1",moccasin:"ffe4b5",navajowhite:"ffdead",navy:"000080",oldlace:"fdf5e6",olive:"808000",olivedrab:"6b8e23",orange:"ffa500",orangered:"ff4500",orchid:"da70d6",palegoldenrod:"eee8aa",palegreen:"98fb98",paleturquoise:"afeeee",palevioletred:"db7093",papayawhip:"ffefd5",peachpuff:"ffdab9",peru:"cd853f",pink:"ffc0cb",plum:"dda0dd",powderblue:"b0e0e6",purple:"800080",rebeccapurple:"663399",red:"f00",rosybrown:"bc8f8f",royalblue:"4169e1",saddlebrown:"8b4513",salmon:"fa8072",sandybrown:"f4a460",seagreen:"2e8b57",seashell:"fff5ee",sienna:"a0522d",silver:"c0c0c0",skyblue:"87ceeb",slateblue:"6a5acd",slategray:"708090",slategrey:"708090",snow:"fffafa",springgreen:"00ff7f",steelblue:"4682b4",tan:"d2b48c",teal:"008080",thistle:"d8bfd8",tomato:"ff6347",turquoise:"40e0d0",violet:"ee82ee",wheat:"f5deb3",white:"fff",whitesmoke:"f5f5f5",yellow:"ff0",yellowgreen:"9acd32"};var hexNames=tinycolor.hexNames=flip(names);function flip(o){var flipped={};for(var i in o){if(o.hasOwnProperty(i)){flipped[o[i]]=i}}
		return flipped}
		function boundAlpha(a){a=parseFloat(a);if(isNaN(a)||a<0||a>1){a=1}
		return a}
		function bound01(n,max){if(isOnePointZero(n)){n="100%"}
		var processPercent=isPercentage(n);n=mathMin(max,mathMax(0,parseFloat(n)));if(processPercent){n=parseInt(n*max,10)/100}
		if((math.abs(n-max)<0.000001)){return 1}
		return(n%max)/parseFloat(max)}
		function clamp01(val){return mathMin(1,mathMax(0,val))}
		function parseIntFromHex(val){return parseInt(val,16)}
		function isOnePointZero(n){return typeof n=="string"&&n.indexOf('.')!=-1&&parseFloat(n)===1}
		function isPercentage(n){return typeof n==="string"&&n.indexOf('%')!=-1}
		function pad2(c){return c.length==1?'0'+c:''+c}
		function convertToPercentage(n){if(n<=1){n=(n*100)+"%"}
		return n}
		function convertDecimalToHex(d){return Math.round(parseFloat(d)*255).toString(16)}
		function convertHexToDecimal(h){return(parseIntFromHex(h)/255)}
		var matchers=(function(){var CSS_INTEGER="[-\\+]?\\d+%?";var CSS_NUMBER="[-\\+]?\\d*\\.\\d+%?";var CSS_UNIT="(?:"+CSS_NUMBER+")|(?:"+CSS_INTEGER+")";var PERMISSIVE_MATCH3="[\\s|\\(]+("+CSS_UNIT+")[,|\\s]+("+CSS_UNIT+")[,|\\s]+("+CSS_UNIT+")\\s*\\)?";var PERMISSIVE_MATCH4="[\\s|\\(]+("+CSS_UNIT+")[,|\\s]+("+CSS_UNIT+")[,|\\s]+("+CSS_UNIT+")[,|\\s]+("+CSS_UNIT+")\\s*\\)?";return{rgb:new RegExp("rgb"+PERMISSIVE_MATCH3),rgba:new RegExp("rgba"+PERMISSIVE_MATCH4),hsl:new RegExp("hsl"+PERMISSIVE_MATCH3),hsla:new RegExp("hsla"+PERMISSIVE_MATCH4),hsv:new RegExp("hsv"+PERMISSIVE_MATCH3),hsva:new RegExp("hsva"+PERMISSIVE_MATCH4),hex3:/^([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,hex6:/^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,hex8:/^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/}})();function stringInputToObject(color){color=color.replace(trimLeft,'').replace(trimRight,'').toLowerCase();var named=!1;if(names[color]){color=names[color];named=!0}else if(color=='transparent'){return{r:0,g:0,b:0,a:0,format:"name"}}
		var match;if((match=matchers.rgb.exec(color))){return{r:match[1],g:match[2],b:match[3]}}
		if((match=matchers.rgba.exec(color))){return{r:match[1],g:match[2],b:match[3],a:match[4]}}
		if((match=matchers.hsl.exec(color))){return{h:match[1],s:match[2],l:match[3]}}
		if((match=matchers.hsla.exec(color))){return{h:match[1],s:match[2],l:match[3],a:match[4]}}
		if((match=matchers.hsv.exec(color))){return{h:match[1],s:match[2],v:match[3]}}
		if((match=matchers.hsva.exec(color))){return{h:match[1],s:match[2],v:match[3],a:match[4]}}
		if((match=matchers.hex8.exec(color))){return{a:convertHexToDecimal(match[1]),r:parseIntFromHex(match[2]),g:parseIntFromHex(match[3]),b:parseIntFromHex(match[4]),format:named?"name":"hex8"}}
		if((match=matchers.hex6.exec(color))){return{r:parseIntFromHex(match[1]),g:parseIntFromHex(match[2]),b:parseIntFromHex(match[3]),format:named?"name":"hex"}}
		if((match=matchers.hex3.exec(color))){return{r:parseIntFromHex(match[1]+''+match[1]),g:parseIntFromHex(match[2]+''+match[2]),b:parseIntFromHex(match[3]+''+match[3]),format:named?"name":"hex"}}
		return!1}
		window.tinycolor=tinycolor})();$(function(){if($.fn.spectrum.load){$.fn.spectrum.processNativeColorInputs()}})});

        $('head').append('<style>.sp-container{position:absolute;top:0;left:0;display:inline-block;*display:inline;*zoom:1;z-index:9999994;overflow:hidden}.sp-container.sp-flat{position:relative}.sp-container,.sp-container *{-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box}.sp-top{position:relative;width:100%;display:inline-block}.sp-top-inner{position:absolute;top:0;left:0;bottom:0;right:0}.sp-color{position:absolute;top:0;left:0;bottom:0;right:20%}.sp-hue{position:absolute;top:0;right:0;bottom:0;left:84%;height:100%}.sp-clear-enabled .sp-hue{top:33px;height:77.5%}.sp-fill{padding-top:80%}.sp-sat,.sp-val{position:absolute;top:0;left:0;right:0;bottom:0}.sp-alpha-enabled .sp-top{margin-bottom:18px}.sp-alpha-enabled .sp-alpha{display:block}.sp-alpha-handle{position:absolute;top:-4px;bottom:-4px;width:6px;left:50%;cursor:pointer;border:1px solid #000;background:#fff;opacity:.8}.sp-alpha{display:none;position:absolute;bottom:-14px;right:0;left:0;height:8px}.sp-alpha-inner{border:solid 1px #333}.sp-clear{display:none}.sp-clear.sp-clear-display{background-position:center}.sp-clear-enabled .sp-clear{display:block;position:absolute;top:0;right:0;bottom:0;left:84%;height:28px}.sp-container,.sp-replacer,.sp-preview,.sp-dragger,.sp-slider,.sp-alpha,.sp-clear,.sp-alpha-handle,.sp-container.sp-dragging .sp-input,.sp-container button{-webkit-user-select:none;-moz-user-select:-moz-none;-o-user-select:none;user-select:none}.sp-container.sp-input-disabled .sp-input-container{display:none}.sp-container.sp-buttons-disabled .sp-button-container{display:none}.sp-container.sp-palette-buttons-disabled .sp-palette-button-container{display:none}.sp-palette-only .sp-picker-container{display:none}.sp-palette-disabled .sp-palette-container{display:none}.sp-initial-disabled .sp-initial{display:none}.sp-sat{background-image:-webkit-gradient(linear,0 0,100% 0,from(#FFF),to(rgba(204,154,129,0)));background-image:-webkit-linear-gradient(left,#FFF,rgba(204,154,129,0));background-image:-moz-linear-gradient(left,#fff,rgba(204,154,129,0));background-image:-o-linear-gradient(left,#fff,rgba(204,154,129,0));background-image:-ms-linear-gradient(left,#fff,rgba(204,154,129,0));background-image:linear-gradient(to right,#fff,rgba(204,154,129,0));-ms-filter:"progid:DXImageTransform.Microsoft.gradient(GradientType = 1, startColorstr=#FFFFFFFF, endColorstr=#00CC9A81)";filter:progid:DXImageTransform.Microsoft.gradient(GradientType=1,startColorstr=\'#FFFFFFFF\',endColorstr=\'#00CC9A81\')}.sp-val{background-image:-webkit-gradient(linear,0 100%,0 0,from(#000000),to(rgba(204,154,129,0)));background-image:-webkit-linear-gradient(bottom,#000000,rgba(204,154,129,0));background-image:-moz-linear-gradient(bottom,#000,rgba(204,154,129,0));background-image:-o-linear-gradient(bottom,#000,rgba(204,154,129,0));background-image:-ms-linear-gradient(bottom,#000,rgba(204,154,129,0));background-image:linear-gradient(to top,#000,rgba(204,154,129,0));-ms-filter:"progid:DXImageTransform.Microsoft.gradient(startColorstr=#00CC9A81, endColorstr=#FF000000)";filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#00CC9A81\',endColorstr=\'#FF000000\')}.sp-hue{background:-moz-linear-gradient(top,#ff0000 0%,#ffff00 17%,#00ff00 33%,#00ffff 50%,#0000ff 67%,#ff00ff 83%,#ff0000 100%);background:-ms-linear-gradient(top,#ff0000 0%,#ffff00 17%,#00ff00 33%,#00ffff 50%,#0000ff 67%,#ff00ff 83%,#ff0000 100%);background:-o-linear-gradient(top,#ff0000 0%,#ffff00 17%,#00ff00 33%,#00ffff 50%,#0000ff 67%,#ff00ff 83%,#ff0000 100%);background:-webkit-gradient(linear,left top,left bottom,from(#ff0000),color-stop(.17,#ffff00),color-stop(.33,#00ff00),color-stop(.5,#00ffff),color-stop(.67,#0000ff),color-stop(.83,#ff00ff),to(#ff0000));background:-webkit-linear-gradient(top,#ff0000 0%,#ffff00 17%,#00ff00 33%,#00ffff 50%,#0000ff 67%,#ff00ff 83%,#ff0000 100%);background:linear-gradient(to bottom,#ff0000 0%,#ffff00 17%,#00ff00 33%,#00ffff 50%,#0000ff 67%,#ff00ff 83%,#ff0000 100%)}.sp-1{height:17%;filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#ff0000\',endColorstr=\'#ffff00\')}.sp-2{height:16%;filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#ffff00\',endColorstr=\'#00ff00\')}.sp-3{height:17%;filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#00ff00\',endColorstr=\'#00ffff\')}.sp-4{height:17%;filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#00ffff\',endColorstr=\'#0000ff\')}.sp-5{height:16%;filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#0000ff\',endColorstr=\'#ff00ff\')}.sp-6{height:17%;filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#ff00ff\',endColorstr=\'#ff0000\')}.sp-hidden{display:none!important}.sp-cf:before,.sp-cf:after{content:"";display:table}.sp-cf:after{clear:both}.sp-cf{*zoom:1}@media (max-device-width:480px){.sp-color{right:40%}.sp-hue{left:63%}.sp-fill{padding-top:60%}}.sp-dragger{border-radius:5px;height:5px;width:5px;border:1px solid #fff;background:#000;cursor:pointer;position:absolute;top:0;left:0}.sp-slider{position:absolute;top:0;cursor:pointer;height:3px;left:-1px;right:-1px;border:1px solid #000;background:#fff;opacity:.8}.sp-container{border-radius:0;background-color:#ECECEC;border:solid 1px #f0c49B;padding:0}.sp-container,.sp-container button,.sp-container input,.sp-color,.sp-hue,.sp-clear{font:normal 12px "Lucida Grande","Lucida Sans Unicode","Lucida Sans",Geneva,Verdana,sans-serif;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;-ms-box-sizing:border-box;box-sizing:border-box}.sp-top{margin-bottom:3px}.sp-color,.sp-hue,.sp-clear{border:solid 1px #666}.sp-input-container{float:right;width:100px;margin-bottom:4px}.sp-initial-disabled .sp-input-container{width:100%}.sp-input{font-size:12px!important;border:1px inset;padding:4px 5px;margin:0;width:100%;background:transparent;border-radius:3px;color:#222}.sp-input:focus{border:1px solid orange}.sp-input.sp-validation-error{border:1px solid red;background:#fdd}.sp-picker-container,.sp-palette-container{float:left;position:relative;padding:10px;padding-bottom:300px;margin-bottom:-290px}.sp-picker-container{width:172px;border-left:solid 1px #fff}.sp-palette-container{border-right:solid 1px #ccc}.sp-palette-only .sp-palette-container{border:0}.sp-palette .sp-thumb-el{display:block;position:relative;float:left;width:24px;height:15px;margin:3px;cursor:pointer;border:solid 2px transparent}.sp-palette .sp-thumb-el:hover,.sp-palette .sp-thumb-el.sp-thumb-active{border-color:orange}.sp-thumb-el{position:relative}.sp-initial{float:left;border:solid 1px #333}.sp-initial span{width:30px;height:25px;border:none;display:block;float:left;margin:0}.sp-initial .sp-clear-display{background-position:center}.sp-palette-button-container,.sp-button-container{float:right}.sp-replacer{margin:0;overflow:hidden;cursor:pointer;padding:4px;display:inline-block;*zoom:1;*display:inline;border:solid 1px #91765d;background:#eee;color:#333;vertical-align:middle}.sp-replacer:hover,.sp-replacer.sp-active{border-color:#F0C49B;color:#111}.sp-replacer.sp-disabled{cursor:default;border-color:silver;color:silver}.sp-dd{padding:2px 0;height:16px;line-height:16px;float:left;font-size:10px}.sp-preview{position:relative;width:25px;height:20px;border:solid 1px #222;margin-right:5px;float:left;z-index:0}.sp-palette{*width:220px;max-width:220px}.sp-palette .sp-thumb-el{width:16px;height:16px;margin:2px 1px;border:solid 1px #d0d0d0}.sp-container{padding-bottom:0}.sp-container button{background-color:#eee;background-image:-webkit-linear-gradient(top,#eeeeee,#cccccc);background-image:-moz-linear-gradient(top,#eeeeee,#cccccc);background-image:-ms-linear-gradient(top,#eeeeee,#cccccc);background-image:-o-linear-gradient(top,#eeeeee,#cccccc);background-image:linear-gradient(to bottom,#eeeeee,#cccccc);border:1px solid #ccc;border-bottom:1px solid #bbb;border-radius:3px;color:#333;font-size:14px;line-height:1;padding:5px 4px;text-align:center;text-shadow:0 1px 0 #eee;vertical-align:middle}.sp-container button:hover{background-color:#ddd;background-image:-webkit-linear-gradient(top,#dddddd,#bbbbbb);background-image:-moz-linear-gradient(top,#dddddd,#bbbbbb);background-image:-ms-linear-gradient(top,#dddddd,#bbbbbb);background-image:-o-linear-gradient(top,#dddddd,#bbbbbb);background-image:linear-gradient(to bottom,#dddddd,#bbbbbb);border:1px solid #bbb;border-bottom:1px solid #999;cursor:pointer;text-shadow:0 1px 0 #ddd}.sp-container button:active{border:1px solid #aaa;border-bottom:1px solid #888;-webkit-box-shadow:inset 0 0 5px 2px #aaaaaa,0 1px 0 0 #eee;-moz-box-shadow:inset 0 0 5px 2px #aaaaaa,0 1px 0 0 #eee;-ms-box-shadow:inset 0 0 5px 2px #aaaaaa,0 1px 0 0 #eee;-o-box-shadow:inset 0 0 5px 2px #aaaaaa,0 1px 0 0 #eee;box-shadow:inset 0 0 5px 2px #aaaaaa,0 1px 0 0 #eee}.sp-cancel{font-size:11px;color:#d93f3f!important;margin:0;padding:2px;margin-right:5px;vertical-align:middle;text-decoration:none}.sp-cancel:hover{color:#d93f3f!important;text-decoration:underline}.sp-palette span:hover,.sp-palette span.sp-thumb-active{border-color:#000}.sp-preview,.sp-alpha,.sp-thumb-el{position:relative;background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAGUlEQVQYV2M4gwH+YwCGIasIUwhT25BVBADtzYNYrHvv4gAAAABJRU5ErkJggg==)}.sp-preview-inner,.sp-alpha-inner,.sp-thumb-inner{display:block;position:absolute;top:0;left:0;bottom:0;right:0}.sp-palette .sp-thumb-inner{background-position:50% 50%;background-repeat:no-repeat}.sp-palette .sp-thumb-light.sp-thumb-active .sp-thumb-inner{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAIVJREFUeNpiYBhsgJFMffxAXABlN5JruT4Q3wfi/0DsT64h8UD8HmpIPCWG/KemIfOJCUB+Aoacx6EGBZyHBqI+WsDCwuQ9mhxeg2A210Ntfo8klk9sOMijaURm7yc1UP2RNCMbKE9ODK1HM6iegYLkfx8pligC9lCD7KmRof0ZhjQACDAAceovrtpVBRkAAAAASUVORK5CYII=)}.sp-palette .sp-thumb-dark.sp-thumb-active .sp-thumb-inner{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjEwMPRyoQAAAMdJREFUOE+tkgsNwzAMRMugEAahEAahEAZhEAqlEAZhEAohEAYh81X2dIm8fKpEspLGvudPOsUYpxE2BIJCroJmEW9qJ+MKaBFhEMNabSy9oIcIPwrB+afvAUFoK4H0tMaQ3XtlrggDhOVVMuT4E5MMG0FBbCEYzjYT7OxLEvIHQLY2zWwQ3D+9luyOQTfKDiFD3iUIfPk8VqrKjgAiSfGFPecrg6HN6m/iBcwiDAo7WiBeawa+Kwh7tZoSCGLMqwlSAzVDhoK+6vH4G0P5wdkAAAAASUVORK5CYII=)}.sp-clear-display{background-repeat:no-repeat;background-position:center;background-image:url(data:image/gif;base64,R0lGODlhFAAUAPcAAAAAAJmZmZ2dnZ6enqKioqOjo6SkpKWlpaampqenp6ioqKmpqaqqqqurq/Hx8fLy8vT09PX19ff39/j4+Pn5+fr6+vv7+wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAEAAP8ALAAAAAAUABQAAAihAP9FoPCvoMGDBy08+EdhQAIJCCMybCDAAYUEARBAlFiQQoMABQhKUJBxY0SPICEYHBnggEmDKAuoPMjS5cGYMxHW3IiT478JJA8M/CjTZ0GgLRekNGpwAsYABHIypcAgQMsITDtWJYBR6NSqMico9cqR6tKfY7GeBCuVwlipDNmefAtTrkSzB1RaIAoXodsABiZAEFB06gIBWC1mLVgBa0AAOw==)}</style>');
    }; // end setupColorpickerSpectrum

    self.checkforolderplugin = function() {
        let oldlocalstoragesettings = 'plugin-portalagentstatus-settings';
        let disableplugin = false;
        if (!window.plugin.portalagentstatus && !localStorage[oldlocalstoragesettings]) return disableplugin;

        let container = document.createElement('div');
        container.innerHTML = `
<p>Thank you for choosing this plugin.</p>

<p>The plugin was recently renamed from "Portal Agent Status" to "${self.title}".</p>
`;
        if (window.plugin.portalagentstatus) {
            container.innerHTML += `
<p>You now have both plugins activated and this can cause a conflict.<br>
Before you can use this new plugin, you must manually <u>disable and/or remove the old plugin</u> "Portal Agent Status".</p>

<p>The new plugin will not run until this is changed.</p>
`;
            disableplugin = true;
        } else if (localStorage[oldlocalstoragesettings]) {
            container.innerHTML += `
<p>You need to check the new plugin settings because the old settings are not compatible and have been deleted.<br>
<a class="dialogbutton" href="#" onclick="${self.namespace}menu(); return false;">Main menu</a>
<a class="dialogbutton" href="#" onclick="${self.namespace}about(); return false;">About</a>
There have been a lot of changes, so make sure you check out the About menu.</p>
`;
            localStorage.removeItem(oldlocalstoragesettings);
        }
        container.innerHTML += `
<span class="footer">version ${self.version} by ${self.author}</span>
`;

        window.dialog({
            html: container,
            id: `${self.pluginname}-dialog`,
            title: self.title,
            width: 'auto'
        });

        return disableplugin;
    };

    self.missingPortalHistorySupportplugin = function() {
        let container = document.createElement('div');
        container.innerHTML = `
<p>This plugin can make use of another plugin: Portal History Support<br>
You can download it here: <a href="https://softspot.nl/ingress/" target="_blank">softspot.nl</a></p>

<p>You will get more bookmark features when it is installed:<br>
You can draw bookmarks on cached portal with history, without the need to load them or have them within viewing range.</p>

<span class="footer">version ${self.version} by ${self.author}</span>
`;

        window.dialog({
            html: container,
            id: `${self.pluginname}-dialog`,
            title: self.title,
            width: 'auto'
        }).dialog('option', 'buttons', {
            '< Main menu': function() { self.menu(); },
            'Close': function() { $(this).dialog('close'); }
        });

        return true;
    };

    self.setup = function() {
        if ('pluginloaded' in self) {
            console.log(`IITC plugin already loaded: ${self.title} version ${self.version}`);
            return;
        } else {
            self.pluginloaded = true;
        }

        if (self.checkforolderplugin()) return; // prevent conflicts with the previous plugin
        self.moveHistoryToNewPlugin(); // convert old history data to new plugin

        self.setupPortalsList();
        self.setupColorpickerSpectrum();

        self.restoresettings();

        self.lastportalscale = window.portalMarkerScale();
        self.setupLayers();

        window.addHook('mapDataRefreshEnd', function() { setTimeout(self.layersbringToFront,100); self.updatemenu(); });
        window.addHook('portalSelected', function(data) { self.onportalSelected(data); self.layersbringToFront(); self.updatemenu(); });
        window.addHook('portalDetailLoaded', function() { setTimeout(self.layersbringToFront,100); self.updatemenu(); });
        window.addHook('portalAdded', self.onportalAdded);
        window.addHook('portalRemoved', self.onportalRemoved);

        window.addHook('portalDetailLoaded', self.addbookmarkanywhererequestloaded);

        window.map.on('zoomend zoomlevelschange', self.onzoomlevelschange);
        window.map.on('zoomend', function() { self.clearbookmarktimerlist(); self.onzoomend(); });
        window.map.on('moveend', function() { self.clearbookmarktimerlist(); self.updatemenu(); });
        if (window.plugin.bookmarks) window.addHook('pluginBkmrksEdit', self.updatemenu);

        let toolboxlink = document.getElementById('toolbox').appendChild(document.createElement('a'));
        toolboxlink.textContent = self.title;
        toolboxlink.addEventListener('click', function(e) {
            e.preventDefault();
            self.menu();
        }, false);

        let stylesheet = document.body.appendChild(document.createElement('style'));
        stylesheet.innerHTML = `
#dialog-${self.pluginname}-dialog label {
    user-select: none;
}
#dialog-${self.pluginname}-dialog .footer {
    font-style: italic;
    font-size: smaller;
}
#dialog-${self.pluginname}-dialog a.dialogbutton {
    display: block;
    color: #ffce00;
    border: 1px solid #ffce00;
    padding: 3px 0;
    margin: 10px auto;
    width: 80%;
    min-width: 232px;
    text-align: center;
    background: rgba(8,48,78,.9);
}
div[name=layerrows] {
    margin-top: 5px;
    margin-bottom: 5px;
}
`;

        console.log(`IITC plugin loaded: ${self.title} version ${self.version}`);
    };

    var setup = function() {
        (window.iitcLoaded?self.setup():window.addHook('iitcLoaded',self.setup));
    };

    // Added to support About IITC details and changelog:
    plugin_info.script.version = plugin_info.script.version.replace(/\.\d{8}\.\d{6}$/,'');
    plugin_info.buildName = 'softspot.nl';
    plugin_info.dateTimeVersion = self.version.replace(/^.*(\d{4})(\d{2})(\d{2})\.(\d{6})/,'$1-$2-$3-$4');
    plugin_info.pluginId = self.id;
    let changelog = [{version:'This is a <a href="https://softspot.nl/ingress/" target="_blank">softspot.nl</a> plugin by ' + self.author,changes:[]},...self.changelog.replace(/^.*?version /s,'').split(/\nversion /).map((v)=>{v=v.split(/\n/).map((l)=>{return l.replace(/^- /,'')}).filter((l)=>{return l != "";}); return {version:v.shift(),changes:v}})];

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
