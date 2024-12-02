// ==UserScript==
// @author         blsmit5728
// @id             throwrange@blsmit5728
// @name           Under-Field Throw Range
// @category       Layer
// @version        1.1.2
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/blsmit5728/throwrange.user.js
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/blsmit5728/throwrange.meta.js
// @description    Shows under field throw range at 500m
// @match          *://intel.ingress.com/*
// @match          *://*.ingress.com/mission/*
// @grant          none
// ==/UserScript==





/* globals dialog */

function wrapper(plugin_info) {
    // Make sure that window.plugin exists. IITC defines it as a no-op function,
    // and other plugins assume the same.
    if (typeof window.plugin !== "function") window.plugin = function () { };

    const KEY_SETTINGS = "FieldThrowrange-settings";

    // Use own namespace for plugin
    window.plugin.FieldThrowrange = function () { };

    const thisPlugin = window.plugin.FieldThrowrange;

    // Name of the IITC build for first-party plugins
    plugin_info.buildName = "FieldThrowrange";

    // Datetime-derived version of the plugin
    plugin_info.dateTimeVersion = "20201112000000";

    // ID/name of the plugin
    plugin_info.pluginId = "FieldThrowrange";

    const TIMERS = {};
    function createThrottledTimer(name, callback, ms) {
        if (TIMERS[name]) clearTimeout(TIMERS[name]);

        // throttle if there are several calls to the functions
        TIMERS[name] = setTimeout(function () {
            delete TIMERS[name];
            if (typeof window.requestIdleCallback == "undefined") callback();
            // and even now, wait for iddle
            else
                requestIdleCallback(
                    function () {
                        callback();
                    },
                    { timeout: 2000 }
                );
        }, ms || 100);
    }

    window.portalFieldThrowrangeIndicator = null;
    FieldThrowrangeLayer = null;
    dFieldThrowrangeLayerGroup = null;
    let lastPortalGuid = null;

    map = window.map;

    const defaultSettings = {
        circleColor: "#800080",
        circleWidth: 2,
        circleRange: 500
    };

    let settings = defaultSettings;

    function saveSettings() {
        createThrottledTimer("saveSettings", function () {
            localStorage[KEY_SETTINGS] = JSON.stringify(settings);
        });
        drawFieldThrowRange(lastPortalGuid);
    }

    thisPlugin.loadSettings = function () {
        const tmp = localStorage[KEY_SETTINGS];
        try {
            settings = JSON.parse(tmp);
        } catch (e) {
            // eslint-disable-line no-empty
        }
        if (!settings.circleWidth) {
            settings.circleWidth = "2";
        }
        if (!settings.circleRange) {
            settings.circleRange = 500;
        }
    }

    window.resetSettings = function () {
        settings = JSON.parse(JSON.stringify(defaultSettings));
        showSettingsDialog();
    }

    // The entry point for this plugin.
    function setup() {
        thisPlugin.loadSettings();

        window.addHook(
            "portalSelected",
            window.drawFieldThrowRange
        );

        FieldThrowrangeLayer = L.layerGroup();
        window.addLayerGroup('Under Field Throw Range', FieldThrowrangeLayer, true);
        dFieldThrowrangeLayerGroup = L.layerGroup();

        const toolbox = document.getElementById("toolbox");

        let buttonFieldThrowrange = document.createElement("a");
        buttonFieldThrowrange.textContent = "Under Field Throw Range Settings";
        buttonFieldThrowrange.title = "Configuration for Under Field Throw Range Plugin";
        buttonFieldThrowrange.addEventListener("click", showSettingsDialog);
        toolbox.appendChild(buttonFieldThrowrange);
    }

    thisPlugin.saveToFile = function (text, filename) {
        if (typeof text != 'string') {
            text = JSON.stringify(text);
        }

        if (typeof window.saveFile != 'undefined') {
            window.saveFile(text, filename, 'application/json');
            return;
        }
    };

    thisPlugin.readFromFile = function (callback) {
        if (typeof L.FileListLoader != 'undefined') {
            L.FileListLoader.loadFiles({ accept: 'application/json' })
                .on('load', function (e) {
                    callback(e.reader.result);
                });
            return;
        }
    };

    function showSettingsDialog() {
        const html =
            `<p><label for="colorCircleColor">Radius Circle Color</label><br><input type="color" id="colorCircleColor" /></p>
                   <p><label for="textCircleWidth">Radius Circle Thickness</label><br><input type="text" id="textCircleWidth" /></p>
                   <p><label for="textCircleRange">Throw Range in Meters</label><br><input type="text" id="textCircleRange" /></p>
                   <a onclick="window.resetSettings();return false;" title="Restores settings to default state">Reset to Defaults</a>
                  `;

        const width = Math.min(screen.availWidth, 420);
        const container = dialog({
            id: "settings",
            width: width + "px",
            html: html,
            title: "Under Field Throw Range Settings",
        });

        const div = container[0];

        const colorCircleColorPicker = div.querySelector("#colorCircleColor");
        colorCircleColorPicker.value = settings.circleColor;
        colorCircleColorPicker.addEventListener("change", (e) => {
            settings.circleColor = colorCircleColorPicker.value;
            saveSettings();
        });

        const textCircleWidthStr = div.querySelector("#textCircleWidth");
        textCircleWidthStr.value = settings.circleWidth;
        textCircleWidthStr.addEventListener("change", (e) => {
            settings.circleWidth = textCircleWidthStr.value;
            saveSettings();
        });

        const textCircleRangeStr = div.querySelector("#textCircleRange");
        textCircleRangeStr.value = settings.circleRange;
        textCircleRangeStr.addEventListener("change", (e) => {
            settings.circleRange = textCircleRangeStr.value;
            saveSettings();
        });
    };

    window.drawFieldThrowRange = function (guid) {
        portalFieldThrowrangeIndicator = null;
        dFieldThrowrangeLayerGroup.clearLayers();

        if (guid) {
            if (guid.selectedPortalGuid) {
                lastPortalGuid = guid;

                p = window.portals[guid.selectedPortalGuid];
                if (p) {
                    const coord = new LatLng(p._latlng.lat, p._latlng.lng);
                    console.log("[UFTR] ", settings.circleRange);
                    console.log("[UFTR] ", Number(settings.circleRange));
                    portalFieldThrowrangeIndicator = L.circle(coord, Number(settings.circleRange),
                        { fill: false, color: settings.circleColor, weight: settings.circleWidth, interactive: false }
                    )
                    dFieldThrowrangeLayerGroup.addLayer(portalFieldThrowrangeIndicator);
                }
                updateMap();
            } else {
                if (FieldThrowrangeLayer.hasLayer(dFieldThrowrangeLayerGroup)) {
                    FieldThrowrangeLayer.removeLayer(dFieldThrowrangeLayerGroup);
                }
            }
        }
    };

    setup.info = plugin_info; //add the script info data to the function as a property
    // if IITC has already booted, immediately run the 'setup' function
    if (window.iitcLoaded) {
        setup();
    } else {
        if (!window.bootPlugins) {
            window.bootPlugins = [];
        }
        window.bootPlugins.push(setup);
    }

    function updateMap() {
        if (!portalFieldThrowrangeIndicator) {
            return;
        }

        const zoom = map.getZoom();
        console.log("[UFTR] ", zoom);
        if (zoom > 2) {
            if (!FieldThrowrangeLayer.hasLayer(dFieldThrowrangeLayerGroup)) {
                FieldThrowrangeLayer.addLayer(dFieldThrowrangeLayerGroup);
            }
        }
    }

    function LatLng(lat, lng, alt) {
        if (isNaN(lat) || isNaN(lng)) {
            throw new Error('Invalid LatLng object: (' + lat + ', ' + lng + ')');
        }

        // @property lat: Number
        // Latitude in degrees
        this.lat = +lat;

        // @property lng: Number
        // Longitude in degrees
        this.lng = +lng;

        // @property alt: Number
        // Altitude in meters (optional)
        if (alt !== undefined) {
            this.alt = +alt;
        }
    }

    LatLng.prototype = {

        // @method toString(): String
        // Returns a string representation of the point (for debugging purposes).
        toString: function (precision) {
            return 'LatLng(' +
                formatNum(this.lat, precision) + ', ' +
                formatNum(this.lng, precision) + ')';
        }

    };

}

(function () {
    const plugin_info = {};
    if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
        plugin_info.script = {
            version: GM_info.script.version,
            name: GM_info.script.name,
            description: GM_info.script.description
        };
    }
    // Greasemonkey. It will be quite hard to debug
    if (typeof unsafeWindow != 'undefined' || typeof GM_info == 'undefined' || GM_info.scriptHandler != 'Tampermonkey') {
        // inject code into site context
        const script = document.createElement('script');
        script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(plugin_info) + ');'));
        (document.body || document.head || document.documentElement).appendChild(script);
    } else {
        // Tampermonkey, run code directly
        wrapper(plugin_info);
    }
})();
