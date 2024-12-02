// ==UserScript==
// @author          DanielOnDiordna
// @name            Zoom Override
// @category        Tweaks
// @version         1.2.0.20240122.225900
// @updateURL       https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/zoom-override.meta.js
// @downloadURL     https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/zoom-override.user.js
// @description     [danielondiordna-1.2.0.20240122.225900] Override the portal and links display levels for every zoom level. Using this method can cause more bandwidth usage when showing more details at higher zoom levels.
// @id              zoom-override@DanielOnDiordna
// @namespace       https://softspot.nl/ingress/
// @antiFeatures    highLoad
// @match           https://intel.ingress.com/*
// @grant           none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.zoomoverride = function() {};
    var self = window.plugin.zoomoverride;
    self.id = 'zoomoverride';
    self.title = 'Zoom Override';
    self.version = '1.2.0.20240122.225900';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 1.2.0.20240122.225900
- changed header category from Tweak to Tweaks
- fixed alignment of the Go buttons

version 1.1.0.20230828.230800
- added a dialog to quickly set the load level by clicking the link/portal load level text at the bottom of the screen
- reversed the changelog order to show last changes at the top

version 1.0.1.20210725.171600
- prevent double plugin setup
- changed zoom level texts to match mobile texts and IITC-CE 0.32.0 texts
- added changelog button in the mobile pane

version 1.0.0.20210704.120900
- changed tweak method from eval function modification to a function replacement with a callback to the original function
- added Go buttons, to set the zoom level from the menu
- added highlighter for the active zoom level in the menu
- added an override enable checkbox in the menu, synced with the layer toggle checkbox

version 0.0.2.20210128.234000
- updated plugin wrapper and userscript header formatting to match IITC-CE coding
- fix to work in IITC CE as well

version 0.0.1.20181030.211100
- intel URL changed from www.ingress.com to *.ingress.com

version 0.0.1.20161103.114500
- earlier version
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.localstoragesettings = self.pluginname + '-settings';

    self.settings = {};
    self.settings.zoomoverridechecked = true;
    self.settings.check = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0]; // default override some levels
    self.settings.showzoom = [3, 3, 3, 3, 3, 5, 5, 7, 8, 9, 9, 11, 13, 15, 15, 15, 15, 15, 15, 15, 15, 15];

    self.zoomtext =
        ['links: >200km',
         'links: >200km',
         'links: >200km',
         'links: >200km',
         'links: >200km',
         'links: >60km',
         'links: >60km',
         'links: >10km',
         'links: >5km',
         'links: >2.5km',
         'links: >2.5km',
         'links: >800m',
         'links: >300m',
         'links: all links',
         'links: all links',
         'portals: all',
         'portals: all',
         'portals: all',
         'portals: all',
         'portals: all',
         'portals: all',
         'portals: all'];
    self.zoomlevels =
        {'portals: all':15,
         'links: all links':13,
         'links: >300m':12,
         'links: >800m':11,
         'links: >2.5km':9,
         'links: >5km':8,
         'links: >10km':7,
         'links: >60km':5,
         'links: >200km':3};

    self.standardZoomFunction = undefined;
    self.toggleoverride = undefined;
    self.menucontainer = undefined;

    self.quickzoom = 0;

    self.getDataZoomForMapZoom = function(zoom) {
        let newzoom = zoom;

        if (self.quickzoom) {
            newzoom = self.quickzoom;
        } else if (self.settings.zoomoverridechecked && self.settings.check[zoom] == 1) {
            newzoom = self.settings.showzoom[zoom];
        }

        return self.standardZoomFunction(newzoom);
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

    self.updatemenu = function() {
        $(`#${self.id}_toggle`).prop("checked", window.map.hasLayer(self.toggleoverride));
        let zoomlevel = window.map.getZoom();
        $(`.${self.id}mainmenu span.active`).removeClass();
        $(`#${self.id}_level${zoomlevel}`).addClass('active');

        $(`.${self.id}_zoomlevel_text`).text(window.map.getZoom());
        $(`.${self.id}_default_text`).text(self.zoomtext[window.map.getZoom()]);
        $(`.${self.id}_override_text`).text(self.zoomtext[self.settings.showzoom[window.map.getZoom()]]);
    };

    self.menu = function() {
        self.menucontainer = document.createElement('div');
        self.menucontainer.className = self.id + 'mainmenu';
        let layertogglearea = self.menucontainer.appendChild(document.createElement('label'));
        let layertoggle = layertogglearea.appendChild(document.createElement('input'));
        layertoggle.id = self.id + '_toggle';
        layertoggle.type = 'checkbox';
        layertoggle.checked = self.settings.zoomoverridechecked;
        layertogglearea.appendChild(document.createTextNode('Enable ' + self.title));

        layertoggle.addEventListener('change', function(e) {
            e.preventDefault();
            if (this.checked && !window.map.hasLayer(self.toggleoverride)) {
                window.map.addLayer(self.toggleoverride);
            } else if (!this.checked && window.map.hasLayer(self.toggleoverride)) {
                window.map.removeLayer(self.toggleoverride);
            }
        },false);

        let sortedzoomlevels = Object.keys(self.zoomlevels).map(function(key) { return {key:key,value:self.zoomlevels[key]}; }).sort(function(a,b) { let x = a.value; let y = b.value; return ((x > y) ? -1 : ((x < y) ? 1 : 0)); });
        for (let levelcnt = self.zoomtext.length - 1; levelcnt >= 3; levelcnt--) { // skip last 3 zoom levels for links > 200km
            let zoomtogglerow = self.menucontainer.appendChild(document.createElement('div'));
            let zoomtogglearea = zoomtogglerow.appendChild(document.createElement('label'));
            let zoomtoggle = zoomtogglearea.appendChild(document.createElement('input'));
            zoomtoggle.type = 'checkbox';
            zoomtoggle.checked = (self.settings.check[levelcnt] == 1);
            zoomtogglearea.appendChild(document.createTextNode('Show '));
            let zoomselect = zoomtogglearea.appendChild(document.createElement('select'));
            for (let cnt = 0; cnt < sortedzoomlevels.length; cnt++) {
                let zoomselectoption = zoomselect.appendChild(document.createElement('option'));
                zoomselectoption.value = sortedzoomlevels[cnt].value;
                zoomselectoption.textContent = sortedzoomlevels[cnt].key;
                zoomselectoption.selected = (sortedzoomlevels[cnt].value === self.settings.showzoom[levelcnt]);
            }
            zoomtogglearea.appendChild(document.createTextNode(' at '));
            let zoomlevel = zoomtogglearea.appendChild(document.createElement('span'));
            zoomlevel.id = self.id + '_level' + levelcnt;
            if (levelcnt == window.map.getZoom()) zoomlevel.className = 'active';
            zoomlevel.textContent = self.zoomtext[levelcnt] + ' (' + levelcnt + ')';

            let zoombutton = zoomtogglerow.appendChild(document.createElement('input'));
            zoombutton.type = 'button';
            zoombutton.style.float = 'right';
            zoombutton.value = 'Go';

            zoomtoggle.addEventListener('change', function(e) {
                e.preventDefault();
                let currentzoom = window.getDataZoomForMapZoom(window.map.getZoom());
                self.settings.check[levelcnt] = (this.checked ? 1 : 0);
                self.storesettings();
                if (self.settings.zoomoverridechecked && window.getDataZoomForMapZoom(window.map.getZoom()) != currentzoom) {
                    window.mapDataRequest.start();
                }
            },false);

            zoomselect.addEventListener('change', function(e) {
                e.preventDefault();
                let currentzoom = window.getDataZoomForMapZoom(window.map.getZoom());
                self.settings.showzoom[levelcnt] = parseInt(this.value);
                self.storesettings();
                if (self.settings.zoomoverridechecked && window.getDataZoomForMapZoom(window.map.getZoom()) != currentzoom) {
                    window.mapDataRequest.start();
                }
            },false);

            zoombutton.addEventListener('click', function(e) {
                e.preventDefault();
                window.map.setZoom(levelcnt);
            },false);
        }

        let author = self.menucontainer.appendChild(document.createElement('div'));
        author.className = self.id + 'author';
        author.textContent = self.title + ' version ' + self.version + ' by ' + self.author;

        if (window.useAndroidPanes()) {
            let changelogbutton = self.menucontainer.appendChild(document.createElement('input'));
            changelogbutton.type = 'button';
            changelogbutton.style.float = 'right';
            changelogbutton.value = 'Changelog';
            changelogbutton.addEventListener('click', function(e) {
                e.preventDefault();
                alert(self.changelog);
            },false);

            self.menucontainer.id = self.id + 'panemenu';
            document.body.appendChild(self.menucontainer);
        } else {
            window.dialog({
                id: self.pluginname + '-dialog',
                html: self.menucontainer,
                width: 'auto',
                title: self.title
            }).dialog('option', 'buttons', {
                'Changelog': function() { alert(self.changelog); },
                'Close': function() { $(this).dialog('close'); }
            });
        }
    };

    self.setquickzoom = function(zoom) {
        if (zoom != self.quickzoom) {
            self.quickzoom = zoom;
            window.mapDataRequest.start();
        }
    };

    self.showquickdialog = function() {
        let container = document.createElement('div');
        container.className = `${self.id}_quickdialog`;
        container.innerHTML = `
Quickly set a view level<br>
for this zoom level: <span class="${self.id}_zoomlevel_text active"></span>
<button class="${self.id}_showportals_button">Show portals</button>
<button class="${self.id}_showlinks_button">Show links: all links</button>
<button class="${self.id}_showdefault_button">Show default: <span class="${self.id}_default_text"></span></button>
<button class="${self.id}_showoverride_button">Show override: <span class="${self.id}_override_text"></span></button>
`;

        container.querySelector(`.${self.id}_zoomlevel_text`).innerText = window.map.getZoom();
        container.querySelector(`.${self.id}_default_text`).innerText = self.zoomtext[window.map.getZoom()];
        container.querySelector(`.${self.id}_override_text`).innerText = self.zoomtext[self.settings.showzoom[window.map.getZoom()]];

        container.querySelector(`.${self.id}_showportals_button`).addEventListener('click',function(e) {
            self.setquickzoom(self.zoomlevels['portals'] || self.zoomlevels['portals: all']);
        },false);
        container.querySelector(`.${self.id}_showlinks_button`).addEventListener('click',function(e) {
            self.setquickzoom(self.zoomlevels['links: all links'] || self.zoomlevels['all links']);
        },false);
        container.querySelector(`.${self.id}_showdefault_button`).addEventListener('click',function(e) {
            self.setquickzoom(window.map.getZoom());
        },false);
        container.querySelector(`.${self.id}_showoverride_button`).addEventListener('click',function(e) {
            self.setquickzoom(self.settings.showzoom[window.map.getZoom()]);
        },false);

        window.dialog({
            id: self.pluginname + '-dialog',
            html: container,
            width: 'auto',
            title: "Quick " + self.title
        }).dialog('option', 'buttons', {
            '< Main menu': function() {
                if (window.useAndroidPanes()) {
                    $(this).dialog('close');
                    if (window.currentPane != self.pluginname) {
                        window.show(self.pluginname);
                    }
                } else {
                    self.menu();
                }
            },
            'Close': function() { $(this).dialog('close'); }
        });
    };

    self.onPaneChanged = function(pane) {
		if (pane == self.pluginname) {
            self.menu();
		} else if (self.menucontainer && self.menucontainer.parentNode) {
			self.menucontainer.parentNode.removeChild(self.menucontainer);
		}
    };

    var setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        if (!window.renderUpdateStatus.toString().match(/loadlevel">all</)) {
            // text for renderUpdateStatus has been changed from IITC-CE 0.32.0
            for (let level = 15; level < self.zoomtext.length; level++) {
                self.zoomtext[level] = 'portals';
            }
            self.zoomlevels['portals'] = parseInt(self.zoomlevels['portals: all']);
            delete(self.zoomlevels['portals: all']);
            if (window.isSmartphone()) {
                // remove links:
                for (let cnt = 0; cnt < self.zoomtext.length; cnt++) {
                    let matches = self.zoomtext[cnt].match(/^(links): /);
                    if (matches) {
                        let newzoomtext = self.zoomtext[cnt].replace(matches[1] + ': ','');
                        if (self.zoomtext[cnt] in self.zoomlevels) {
                            self.zoomlevels[newzoomtext] = parseInt(self.zoomlevels[self.zoomtext[cnt]]);
                            delete(self.zoomlevels[self.zoomtext[cnt]]);
                        }
                        self.zoomtext[cnt] = newzoomtext;
                    }
                }
            }
        } else if (window.isSmartphone()) {
            // remove links: and portals:
            for (let cnt = 0; cnt < self.zoomtext.length; cnt++) {
                let matches = self.zoomtext[cnt].match(/^(links|portals): /);
                if (matches) {
                    let newzoomtext = self.zoomtext[cnt].replace(matches[1] + ': ','');
                    if (self.zoomtext[cnt] in self.zoomlevels) {
                        self.zoomlevels[newzoomtext] = parseInt(self.zoomlevels[self.zoomtext[cnt]]);
                        delete(self.zoomlevels[self.zoomtext[cnt]]);
                    }
                    self.zoomtext[cnt] = newzoomtext;
                }
            }
        }

        self.restoresettings();
        // correct settings to default if needed
        for (let cnt = 0; cnt < self.zoomtext.length; cnt++) {
            if (self.settings.check[cnt] !== 0 && self.settings.check[cnt] !== 1) self.settings.check[cnt] = 0;
            if (self.settings.showzoom[cnt] < 3 || self.settings.showzoom[cnt] > 15) self.settings.showzoom[cnt] = self.zoomlevels[self.zoomtext[cnt]];
        }
        self.storesettings();

        // delete localstorage settings of an older version of the plugin:
        localStorage.removeItem(self.pluginname + '-checked');
        for (let levelcnt = 10; levelcnt <= 16; levelcnt++) {
            localStorage.removeItem(self.pluginname + '-' + levelcnt + '-checked');
            localStorage.removeItem(self.pluginname + '-' + levelcnt + '-show');
        }
        localStorage.removeItem(self.pluginname + '-scale-checked');

        //add options menu
        if (window.useAndroidPanes()) {
            android.addPane(self.pluginname, self.title, "ic_action_full_screen");
            window.addHook("paneChanged", self.onPaneChanged);
        } else {
            let toolboxlink = document.getElementById('toolbox').appendChild(document.createElement('a'));
            toolboxlink.textContent = self.title;
            toolboxlink.addEventListener('click', function(e) {
                e.preventDefault();
                self.menu();
            }, false);
        }

        self.toggleoverride = new window.L.LayerGroup();
        window.addLayerGroup(self.title, self.toggleoverride, false);
        window.map.on('layeradd', function(obj) {
            if (obj.layer === self.toggleoverride) {
                // enable override and apply zoom level
                let currentzoom = window.getDataZoomForMapZoom(window.map.getZoom());
                self.settings.zoomoverridechecked = true;
                self.storesettings();
                if (window.getDataZoomForMapZoom(window.map.getZoom()) != currentzoom) {
                    window.mapDataRequest.start();
                }
                self.updatemenu();
            }
        });
        window.map.on('layerremove', function(obj) {
            if (obj.layer === self.toggleoverride) {
                // disable override and restore zoom level
                let currentzoom = window.getDataZoomForMapZoom(window.map.getZoom());
                self.settings.zoomoverridechecked = false;
                self.storesettings();
                if (window.getDataZoomForMapZoom(window.map.getZoom()) != currentzoom) {
                    window.mapDataRequest.start();
                }
                self.updatemenu();
            }
        });
        window.map.on('zoomend', self.updatemenu);
        window.map.on('zoomend movestart', function() {
            self.quickzoom = 0;
        });

        var stylesheet = document.createElement('style');
        stylesheet.innerHTML = `
.${self.id}mainmenu label { user-select: none; display: flex; }
.${self.id}mainmenu>div { align-items: center; column-gap: 10px; display: flex; flex-wrap: nowrap; }
.${self.id}mainmenu select { margin-left: 5px; margin-right: 5px; }
.${self.id}mainmenu span { margin-left: 5px; }
.${self.id}mainmenu>div>input[type=button] { margin-left: auto; }
.${self.id}author { margin-top: 14px; font-style: italic; font-size: smaller; }
#${self.id}panemenu { background: transparent; border: 0 none !important; height: 100% !important; width: 100% !important; left: 0 !important; top: 0 !important; position: absolute; overflow: auto; }
.${self.id}mainmenu span.active { font-weight: bold; color: #ffce00; }
.${self.id}_quickdialog .active { font-weight: bold; color: #ffce00; }
.${self.id}_quickdialog button { width: 200px; display: block; margin-block-start: 6px; cursor: pointer; }
`;
        document.body.appendChild(stylesheet);

        // override function:
        self.standardZoomFunction = window.getDataZoomForMapZoom;
        window.getDataZoomForMapZoom = self.getDataZoomForMapZoom;

        setTimeout(function() {
            document.querySelector('#innerstatus').addEventListener('click',function(e) {
                if (e.target == document.querySelector('#innerstatus #loadlevel')) {
                    // console.log(e.target);
                    self.showquickdialog();
                }
            },false);
        });

        console.log('IITC plugin loaded: ' + self.title + ' version ' + self.version);
    };

    // Added to support About IITC details and changelog:
    plugin_info.script.version = plugin_info.script.version.replace(/\.\d{8}\.\d{6}$/,'');
    plugin_info.buildName = 'softspot.nl';
    plugin_info.dateTimeVersion = self.version.replace(/^.*(\d{4})(\d{2})(\d{2})\.(\d{6})/,'$1-$2-$3-$4');
    plugin_info.pluginId = self.id;
    let changelog = [{version:'This is a <a href="https://softspot.nl/ingress/" target="_blank">softspot.nl</a> plugin by ' + self.author,changes:[]},...self.changelog.replace(/^.*?version /s,'').split(/\nversion /).map((v)=>{v=v.split(/\n/).map((l)=>{return l.replace(/^- /,'')}).filter((l)=>{return l != "";}); return {version:v.shift(),changes:v}})];

    setup.info = plugin_info; //add the script info data to the function as a property
    if (typeof changelog !== 'undefined') setup.info.changelog = changelog;
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
