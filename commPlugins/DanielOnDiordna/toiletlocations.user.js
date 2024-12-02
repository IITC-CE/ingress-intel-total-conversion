// ==UserScript==
// @author         DanielOnDiordna
// @name           Toilet locations
// @category       Layer
// @version        0.0.1.20210724.002500
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/toiletlocations.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/toiletlocations.user.js
// @description    [danielondiordna-0.0.1.20210724.002500] Show public toilet locations in The Netherlands (using data from hogenood.nl)
// @id             toiletlocations@DanielOnDiordna
// @namespace      https://softspot.nl/ingress/
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.toiletlocations = function() {};
    var self = window.plugin.toiletlocations;
    self.id = 'toiletlocations';
    self.title = 'Toilet locations NL';
    self.version = '0.0.1.20210724.002500';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 0.0.1.20210414.232800
version 0.0.1.20210415.091800
- first release
- optional settings to toggle viewing public, open access toilets and 250m walking buffer
- get remote data and store locally (prevent unwanted server requests)
- use svg icon and buffer colors from source website
- changed button text from Open source website to Open website
- replace some code for DOM code

version 0.0.1.20210421.190200
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin

version 0.0.1.20210724.002500
- prevent double plugin setup on hook iitcLoaded
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.localstoragesettings = self.pluginname + '-settings';
    self.settings = {};
    self.settings.updatetimestamp = '';
    self.settings.showtype1 = true;
    self.settings.showtype2 = true;
    self.settings.showbuffer = true;

    self.localstoragedata = self.pluginname + '-data';
    self.data = {};

    self.toilet_type_colors = {
        'openbaar': '#c00000',
        'opengesteld': '#400040'
    };
    self.buffer_colors = {
        stroke: '#803E00',
        fill:'#FFAB01'
    };

    self.remotedatalocation = "https://www.hogenood.nu/kaart/data/Toiletten_7.js";
    self.remotewebsite = "https://www.hogenood.nl/kaart";

    self.svglogo = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.0" width="387.000000pt" height="387.000000pt" viewBox="0 0 387.000000 387.000000" preserveAspectRatio="xMidYMid meet">
<g transform="translate(0.000000,387.000000) scale(0.100000,-0.100000)" id="" fill="#000000" stroke="none">
<path d="M1810 3863 c-224 -21 -397 -59 -565 -124 -592 -228 -1033 -728 -1184 -1340 -44 -180 -55 -272 -55 -474 1 -208 23 -365 80 -552 297 -981 1314 -1562 2309 -1319 701 171 1250 720 1421 1421 258 1060 -418 2131 -1484 2350 -180 37 -381 52 -522 38z m505 -77 c670 -142 1202 -615 1416 -1256 196 -589 93 -1227 -280 -1730 -69 -93 -223 -253 -317 -331 -165 -134 -393 -261 -593 -329 -288 -97 -618 -123 -922 -71 -771 133 -1370 714 -1537 1491 -24 116 -26 143 -27 370 0 280 13 373 86 594 212 646 775 1142 1435 1265 161 30 151 29 394 26 196 -3 240 -6 345 -29z"/>
<path d="M1877 3268 c-30 -51 -169 -289 -309 -528 -140 -239 -267 -457 -280 -485 -209 -412 26 -913 482 -1026 78 -19 260 -17 340 4 237 63 424 236 507 469 20 58 27 98 30 195 6 144 -10 233 -61 339 -25 52 -636 1105 -651 1122 -2 2 -28 -39 -58 -90z m163 -1089 c170 -77 214 -294 87 -428 -79 -84 -216 -106 -318 -53 -193 101 -191 379 3 476 67 33 161 35 228 5z"/>
</g>
</svg>`;

    self.markerlayer = undefined;

    self.drawmarker = function(latlng,type,mapzoom) {
        let zoomsize = {0:2,1:2,2:2,3:2,4:2,5:2,6:2,7:2,8:2,9:2,10:5,11:8,12:10,13:15,14:19,15:20,16:25,17:30,18:33,19:62,20:107,21:150};

        let width = zoomsize[mapzoom];
        let height = zoomsize[mapzoom];

        let color = self.toilet_type_colors[type] || '#000000';

        let svgicon = self.svglogo;
        svgicon = svgicon.replace(/width=[^ ]+/,'width="' + width + 'px"');
        svgicon = svgicon.replace(/height=[^ ]+/,'height="' + height + 'px"');
        svgicon = svgicon.replace(/fill=[^ ]+/,'fill="' + color + '"');
        svgicon = svgicon.replace(/id=[^ ]+/,'id="' + JSON.stringify(latlng) + '"');

        if (self.settings.showbuffer) {
            var radius = 250.0;
            var buffer = L.geodesicCircle(latlng, radius, {
                radius: radius,
                weight: 1,
                opacity: 1,
                color: self.buffer_colors.stroke,
                fill: true,
                fillColor: self.buffer_colors.fill,
                fillOpacity: 0.24,
                dashArray: '5,5',
                interactive: false
            });
            self.markerlayer.addLayer(buffer);
        }

        var marker = L.marker(latlng, {
            title: type,
            interactive: false,
            icon: L.divIcon({
                iconSize: new L.Point(width, height),
                iconAnchor: new L.Point(parseInt(width / 2), parseInt(height / 2)),
                html: svgicon,
                className: 'leaflet-iitc-custom-icon',
                color: color
            })
        });
        marker.addTo(self.markerlayer);
    };

    self.updatemarkers = function() {
        if (!self.data.features || !(self.data.features instanceof Array)) return;

        self.markerlayer.clearLayers(); // simply clear and redraw all

        let mapzoom = map.getZoom();
        if (mapzoom < 12) return; // limit draw levels

        let bounds = window.map.getBounds(); // only draw markers within visible bounds
        for (let cnt = 0; cnt < self.data.features.length; cnt++) {
            if (self.data.features[cnt].geometry.type == 'Point') {
                let lat = self.data.features[cnt].geometry.coordinates[1];
                let lng = self.data.features[cnt].geometry.coordinates[0];
                let latlng = L.latLng([lat,lng]);
                if (bounds.contains(latlng)) {
                    let markertype = self.data.features[cnt].properties.toilet_typ;
                    if (markertype == 'openbaar' && self.settings.showtype1 || markertype == 'opengesteld' && self.settings.showtype2)
                        self.drawmarker(latlng,markertype,mapzoom);
                }
            }
        }
    };

    self.restoresettings = function() {
        if (typeof localStorage[self.localstoragesettings] != 'string' || localStorage[self.localstoragesettings] == '') return;
        try {
            var settings = JSON.parse(localStorage[self.localstoragesettings]);
            if (typeof settings === 'object' && settings instanceof Object && !(settings instanceof Array)) { // expect an object
                for (const i in self.settings) {
                    if (i in settings && typeof settings[i] === typeof self.settings[i]) { // only accept settings from default settings template of same type
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

    self.validdata = function(data) {
        let validdata = true;
        if (!(typeof data == 'object' && !(data instanceof Array))) // expect an object
        {
            validdata = false;
            console.log(self.title + ' - data no object',data);
        }
        else if (!(typeof data.features == 'object' && data.features instanceof Array)) // expect an array of features
        {
            validdata = false;
            console.log(self.title + ' - data.features no array',data.features);
        }
        else
            for (let cnt = 0; cnt < data.features.length && validdata; cnt++) {
                let features = data.features[cnt];
                if (!(typeof features == 'object' && !(features instanceof Array) &&
                      typeof features.type == 'string' &&
                      typeof features.properties == 'object' && !(features.properties instanceof Array) &&
                      typeof features.properties.toilet_typ == 'string' &&
                      typeof features.geometry == 'object' && !(features.geometry instanceof Array) &&
                      typeof features.geometry.type == 'string' &&
                      typeof features.geometry.coordinates == 'object' && features.geometry.coordinates instanceof Array
                   ))
                {
                    validdata = false;
                    console.log(self.title + ' - data.features[cnt] invalid format',data.features[cnt]);
                }
            }
       return validdata;
    };
    self.restoredata = function() {
        if (typeof localStorage[self.localstoragedata] != 'string' || localStorage[self.localstoragedata] == '') return;
        try {
            var data = JSON.parse(localStorage[self.localstoragedata]);
            if (self.validdata(data))
                self.data = data;
        } catch(e) {
            return false;
        }
    };
    self.storedata = function() {
        localStorage[self.localstoragedata] = JSON.stringify(self.data);
    };

    self.updatedata = function(callback) {
        var script = document.createElement("script");
        script.onload = function() {
            if (typeof json_Toiletten_7 == "undefined") {
                alert('Failed to get data');
            } else if (!self.validdata(json_Toiletten_7)) {
                alert('Invalid data format');
                console.log(self.title + ' - invalid data format',json_Toiletten_7);
            } else {
                self.settings.updatetimestamp = new Date().toJSON();
                self.storesettings();

                self.data = json_Toiletten_7;
                self.storedata();
            }
            if (typeof callback == 'function')
                callback();
        };
        script.src = self.remotedatalocation;
        document.body.appendChild(script);
    };

    self.about = function() {
        let container = document.createElement('div');
        let aboutarea = container.appendChild(document.createElement('div'));
        aboutarea.appendChild(document.createTextNode('The website hogenood.nl offers a map and an app to find a public toilet near you.'));
        aboutarea.appendChild(document.createElement('br'));
        aboutarea.appendChild(document.createTextNode('This plugin places the same markers on the IITC map.'));
        aboutarea.appendChild(document.createElement('br'));
        aboutarea.appendChild(document.createTextNode('You only need to manually update the data from hogenood.nl every once in a while.'));
        aboutarea.appendChild(document.createElement('br'));
        aboutarea.appendChild(document.createTextNode('The data is stored in your IITC and used when the map layer is enabled.'));

        let author = container.appendChild(document.createElement('div'));
        author.className = self.id + 'author';
        author.textContent = self.title + ' version ' + self.version + ' by ' + self.author;

        window.dialog({
            html: container,
            id: self.id,
            width: 'auto',
            title: self.title + ' - About'
        }).dialog('option', 'buttons', {
            '< Main menu': function() { self.menu(); },
            'Changelog': function() { alert(self.changelog); },
            'Close': function() { $(this).dialog('close'); },
        });
    };

    self.menu = function() {
        function timeago(time) {
            time = new Date(time).getTime();
            let now = new Date().getTime();
            let s = (now-time) / 1000;

            let returnVal = '';
            if (s < 60*60*24) {
                let h = Math.floor(s / 3600);
                let m = Math.floor((s % 3600) / 60);
                returnVal = m + 'm';
                if (h > 0) {
                    returnVal = h + 'h' + returnVal;
                }
                returnVal += ' ago';
            } else if (s < 60*60*24*10) { // 10 days
                returnVal += Math.floor(s / (60*60*24)) + ' days ago';
            } else {
                returnVal = new Date(time).toLocaleString();
            }
            return returnVal;
        }

        let container = document.createElement('div');
        container.className = self.id + 'mainmenu';
        container.appendChild(document.createTextNode('Locations loaded: ' + (!self.settings.updatetimestamp || !self.data.features?'nothing':self.data.features.length)));
        container.appendChild(document.createElement('br'));
        container.appendChild(document.createTextNode('Last update: ' + (!self.settings.updatetimestamp?'never':timeago(self.settings.updatetimestamp))));

        container.appendChild(document.createElement('br'));

        let updatebutton = container.appendChild(document.createElement('button'));
        updatebutton.textContent = 'Update locations';
        if (typeof json_Toiletten_7 != "undefined") {
            updatebutton.disabled = true;
            updatebutton.title = 'Reload the map to enable the update function';
        } else {
            updatebutton.addEventListener('click', function(e) {
                e.preventDefault();
                updatebutton.disabled = true;
                self.updatedata(function() {self.updatemarkers(); self.menu();});
            }, false);
        }

        container.appendChild(document.createElement('br'));

        let checkboxarea = container.appendChild(document.createElement('div'));
        checkboxarea.className = self.id + 'checkboxarea';

        let type1checkboxarea = checkboxarea.appendChild(document.createElement('label'));
        let img1area = type1checkboxarea.appendChild(document.createElement('span'));
        img1area.innerHTML = self.svglogo.replace(/(height|width)=[^ ]+/g,'$1="' + 20 + 'px"').replace(/fill=[^ ]+/,'fill="' + self.toilet_type_colors.openbaar + '"');;
        let type1checkbox = type1checkboxarea.appendChild(document.createElement('input'));
        type1checkbox.type = 'checkbox';
        type1checkbox.checked = self.settings.showtype1;
        type1checkboxarea.appendChild(document.createTextNode('Show Public toilets'));

        type1checkbox.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.showtype1 = this.checked;
            self.storesettings();
            self.updatemarkers();
        },false);

        checkboxarea.appendChild(document.createElement('br'));

        let type2checkboxarea = checkboxarea.appendChild(document.createElement('label'));
        let img2area = type2checkboxarea.appendChild(document.createElement('span'));
        img2area.innerHTML = self.svglogo.replace(/(height|width)=[^ ]+/g,'$1="' + 20 + 'px"').replace(/fill=[^ ]+/,'fill="' + self.toilet_type_colors.opengesteld + '"');;
        let type2checkbox = type2checkboxarea.appendChild(document.createElement('input'));
        type2checkbox.type = 'checkbox';
        type2checkbox.checked = self.settings.showtype2;
        type2checkboxarea.appendChild(document.createTextNode('Show Open access toilets'));
        type2checkbox.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.showtype2 = this.checked;
            self.storesettings();
            self.updatemarkers();
        },false);

        checkboxarea.appendChild(document.createElement('br'));

        let showbuffercheckboxarea = checkboxarea.appendChild(document.createElement('label'));
        let showbuffersample = showbuffercheckboxarea.appendChild(document.createElement('span'));
        showbuffersample.className = self.id + 'buffersample';
        let showbuffercheckbox = showbuffercheckboxarea.appendChild(document.createElement('input'));
        showbuffercheckbox.type = 'checkbox';
        showbuffercheckbox.checked = self.settings.showbuffer;
        showbuffercheckboxarea.appendChild(document.createTextNode('Show 250m buffer'));
        showbuffercheckbox.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.showbuffer = this.checked;
            self.storesettings();
            self.updatemarkers();
        },false);

        let websitebutton = container.appendChild(document.createElement('button'));
        websitebutton.textContent = 'Open website';
        websitebutton.title = self.remotewebsite;
        websitebutton.addEventListener('click', function(e) {
            e.preventDefault();
            open(self.remotewebsite,'_blank').focus();
        }, false);

        let imgarea = container.appendChild(document.createElement('div'));
        imgarea.innerHTML = self.svglogo.replace(/(height|width)=[^ ]+/g,'$1="' + 100 + 'px"');

        let clearbutton = container.appendChild(document.createElement('button'));
        clearbutton.textContent = 'Clear storage';
        clearbutton.addEventListener('click', function(e) {
            e.preventDefault();
            if (!confirm('Are you sure you want to clear all stored locations?')) return;

            self.settings.updatetimestamp = '';
            self.storesettings();

            self.markerlayer.clearLayers();
            self.data = {};
            self.storedata();

            self.menu();
        }, false);

        let author = container.appendChild(document.createElement('div'));
        author.className = self.id + 'author';
        author.textContent = self.title;
        author.appendChild(document.createElement('br'));
        author.appendChild(document.createTextNode('version ' + self.version));
        author.appendChild(document.createElement('br'));
        author.appendChild(document.createTextNode('by ' + self.author));

        dialog({
            title: self.title,
            html: container,
            id: self.id,
            width: 'auto',
            height: 'auto'
        }).dialog('option', 'buttons', {
            'About': function() { self.about(); },
            'Close': function() { $(this).dialog('close'); }
        });
    };

    self.setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        self.restoresettings();
        self.restoredata();

        self.markerlayer = new L.LayerGroup();
        window.addLayerGroup(self.title, self.markerlayer, true);
        self.updatemarkers();

        window.map.on('zoomend moveend zoomlevelschange', function() { setTimeout(self.updatemarkers,10); });

        var sheet = document.createElement('style')
        sheet.innerHTML = '';
        sheet.innerHTML += '.' + self.id + 'mainmenu { text-align: center }';
        sheet.innerHTML += '.' + self.id + 'mainmenu > button { min-width: 140px; margin: 5px; cursor: pointer; }';
        sheet.innerHTML += '.' + self.id + 'mainmenu .' + self.id + 'checkboxarea { text-align: left; }';
        sheet.innerHTML += '.' + self.id + 'mainmenu > button:disabled { color: #bbb; cursor: default; }';
        sheet.innerHTML += '.' + self.id + 'mainmenu > label { user-select: none; }';
        sheet.innerHTML += '.' + self.id + 'mainmenu .' + self.id + 'buffersample { display: inline-block; margin-top: 2px; margin-left: 2px; width: 16px; height: 16px; border: 1px dashed ' + self.buffer_colors.stroke + '; background-color: ' + self.buffer_colors.fill + '; }';
        sheet.innerHTML += '.' + self.id + 'author { margin-top: 14px; font-style: italic; font-size: smaller }';

        document.body.appendChild(sheet);

        let toolboxlink = document.getElementById('toolbox').appendChild(document.createElement('a'));
        toolboxlink.textContent = self.title;
        toolboxlink.addEventListener('click', function(e) {
            e.preventDefault();
            self.menu();
        }, false);

        console.log('IITC plugin loaded: ' + self.title + ' version ' + self.version);
    };

    var setup = function() {
        (window.iitcLoaded?self.setup():window.addHook('iitcLoaded',self.setup));
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
