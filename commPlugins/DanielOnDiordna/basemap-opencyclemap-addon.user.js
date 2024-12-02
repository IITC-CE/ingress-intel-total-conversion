// ==UserScript==
// @author         DanielOnDiordna
// @name           OpenCycleMap.org map tiles add-on
// @version        1.0.1.20220712.094300
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/basemap-opencyclemap-addon.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/basemap-opencyclemap-addon.user.js
// @description    [danielondiordna-1.0.1.20220712.094300] Add-on to set an API KEY for the Thunderforest map tiles (OpenCycleMap). To make things easier, the Add-on already includes the code from the OpenCycleMap plugin.
// @namespace      https://softspot.nl/ingress/
// @id             basemap-opencyclemap-addon@DanielOnDiordna
// @category       Addon
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.basemapOpenCycleMapAddon = function() {};
    var self = window.plugin.basemapOpenCycleMapAddon;
    self.id = 'basemapOpenCycleMapAddon';
    self.title = 'OpenCycleMap Addon';
    self.version = '1.0.1.20220712.094300';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 1.0.1.20220712.094300
- removed some console debugging messages

version 1.0.0.20220710.185000
- fixed keeping selected Thunderforest map active after IITC reloads
- changed words for the dialog and alert texts
- added 5 more maps found at the Thunderforest website (total of 10)

version 0.0.4.20210724.002500
- prevent double plugin setup on hook iitcLoaded

version 0.0.4.20210421.190200
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin

version 0.0.4.20210124.184400
- modify every link from http: to https:

version 0.0.3.20210121.224000
- version number fix

version 0.0.2.20210117.190200
- added source code from https://static.iitc.me/build/release/plugins/basemap-opencyclemap.user.js
- added API key check and popups
- updated plugin wrapper and userscript header formatting to match IITC-CE coding

version 0.0.1.20191023.001600
- first release
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.settings = {};
    self.settings.apikey = "";

    self.storeSettings = function() {
        localStorage[self.pluginname + '-settings'] = JSON.stringify(self.settings);
    };

    self.restoreSettings = function() {
        if (localStorage[self.pluginname + '-settings']) {
            let settings = JSON.parse(localStorage[self.pluginname + '-settings']);
            if (typeof settings === 'object' && settings instanceof Object) {
                if (typeof settings.apikey === 'string') self.settings.apikey = settings.apikey;
            }
        }
    };

    self.enterApiKey = function() {
        let newapikey = prompt("Enter API key:",self.settings.apikey);
        if (newapikey == null) return;

        self.settings.apikey = newapikey;
        self.storeSettings();
        self.updateApiKey();

        if (newapikey) {
            alert('The Thunderforest (OpenCycleMap) map tiles are now available (if your API key is valid)');
        } else {
            alert('Without an API key, The Thunderforest (OpenCycleMap) map tiles will mention: API key required');
        }
    };

    self.menu = function() {
        let container = document.createElement('div');
        container.className = `${self.id}-dialog`;
        container.innerHTML = `<input type="hidden" autofocus>
            The OpenCycleMap (Thunderforest) map tiles require a personal API key.<br>
            Without an API key, The Thunderforest (OpenCycleMap) map tiles will mention: API key required<br>
            Disable the OpenCycleMap plugin (and add-on) if you do not have an API key.<br>
            <a href="https://manage.thunderforest.com/" target="_blank">Sign up and get your free API key</a>
            <a href="#" class="${self.id}-apikeybutton">Enter/view API key</a></p>
            <span style="font-style: italic; font-size: smaller">version ${self.version} by ${self.author}</span>`;

        container.querySelector(`.${self.id}-apikeybutton`).addEventListener('click',function(e) {
            e.preventDefault();
            self.enterApiKey();
        },false);

        self.dialogobject = window.dialog({
            html: container,
            id: self.pluginname + '-dialog',
            title: self.title
        });
    };

    self.updateApiKey = function() {
        // replace api key in urls
        if (!('getLayers' in window.layerChooser)) return; // getLayers not defined (yet)
        for (let layer of window.layerChooser.getLayers().baseLayers) {
            if (layer.name.match(/^Thunderforest/)) {
                let url = window.layerChooser._layers[layer.layerId].layer._url;
                url = url.replace(/^http:/,'https:').replace(/\?apikey=.*$/,''); // remove old apikey
                if (self.settings.apikey) url += '?apikey=' + self.settings.apikey;
                window.layerChooser._layers[layer.layerId].layer.setUrl(url,false);
            }
        }
    };

    self.inject_mapTileOpenCycleMap = function() {
        /*
        @id             iitc-plugin-basemap-opencyclepam@jonatkins
        @name           IITC-me plugin: OpenCycleMap.org map tiles
        @category       Map Tiles
        @version        0.2.0.20170108.21732
        @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
        @updateURL      https://static.iitc.me/build/release/plugins/basemap-opencyclemap.meta.js
        @downloadURL    https://static.iitc.me/build/release/plugins/basemap-opencyclemap.user.js
        @description    [iitc-2017-01-08-021732] Add the OpenCycleMap.org map tiles as an optional layer.
        */

        if (!window.plugin.mapTileOpenCycleMap) {
            // if this plugin is missing, add the code for the map layer anyway:
            window.plugin.mapTileOpenCycleMap = {
                addLayer: function() {
                    //the Thunderforest (OpenCycleMap) tiles are free to use - http://www.thunderforest.com/terms/ (edit: not free anymore, key required, this plugin will help setting up that key)

                    var ocmOpt = {
                        attribution: 'Tiles © OpenCycleMap, Map data © OpenStreetMap',
                        maxNativeZoom: 18,
                        maxZoom: 21,
                    };

                    var layers = {
                        'cycle': 'OpenCycleMap',
                        'transport': 'Transport',
                        'transport-dark': 'Transport Dark',
                        'outdoors': 'Outdoors',
                        'landscape': 'Landscape',
                    };

                    for(var i in layers) {
                        var layer = new window.L.TileLayer('http://{s}.tile.thunderforest.com/' + i + '/{z}/{x}/{y}.png', ocmOpt);
                        window.layerChooser.addBaseLayer(layer, 'Thunderforest ' + layers[i]);
                    }
                },
            };
            window.plugin.mapTileOpenCycleMap.addLayer();
        } else {
            // console.log("mapTileOpenCycleMap plugin already active");
        }

        // added some more layers (available from https://manage.thunderforest.com/dashboard):
        let ocmOpt = {
            attribution: 'Tiles © OpenCycleMap, Map data © OpenStreetMap',
            maxNativeZoom: 18,
            maxZoom: 21,
        };
        let layers = {
            'spinal-map':'Spinal Map',
            pioneer:'Pioneer',
            'mobile-atlas':'Mobile Atlas',
            neighbourhood:'Neighbourhood',
            atlas:'Atlas'
        };
        for (let i in layers) {
            let layer = new window.L.TileLayer('http://{s}.tile.thunderforest.com/' + i + '/{z}/{x}/{y}.png', ocmOpt);
            window.layerChooser.addBaseLayer(layer, 'Thunderforest ' + layers[i]);
        }
    };

    self.setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        self.restoreSettings();

        self.updateApiKey();

        let toolboxlink = document.body.querySelector('#toolbox').appendChild(document.createElement('a'));
        toolboxlink.textContent = self.title;
        toolboxlink.addEventListener('click', function(e) {
            e.preventDefault();
            self.menu();
        }, false);

        let stylesheet = document.head.appendChild(document.createElement('style'));
        stylesheet.innerHTML = `
.${self.id}-dialog > a {
    display: block;
    color: #ffce00;
    border: 1px solid #ffce00;
    padding: 3px 0;
    margin: 10px auto;
    width: 80%;
    text-align: center;
    background: rgba(8,48,78,.9);
}`;

        if (self.settings.apikey == '') self.menu();

        console.log('IITC plugin loaded: ' + self.title + ' version ' + self.version);
    };

    var setup = function() {
        self.inject_mapTileOpenCycleMap(); // don't wait for the iitcLoaded, this needs to be executed asap
        (window.iitcLoaded?self.setup():window.addHook('iitcLoaded',self.setup)); // updateApiKey must be executed later, because layerChooser.getLayers is not defined yet
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
