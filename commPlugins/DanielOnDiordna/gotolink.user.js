// ==UserScript==
// @author         DanielOnDiordna
// @name           Goto Ingress intel link
// @version        1.0.0.20220614.235300
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/gotolink.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/gotolink.user.js
// @description    [danielondiordna-1.0.0.20220614.235300] Instead of clicking a link you can copy/paste any URL into IITC with this Goto Intel Link plugin. Support for portal links, map/perma links, mission links, and also support for portal and mission links created in the Ingress Prime scanner.
// @namespace      https://softspot.nl/ingress/
// @category       Misc
// @id             gotolink@DanielOnDiordna
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.gotolink = function() {};
    var self = window.plugin.gotolink;
    self.id = 'gotolink';
    self.title = 'Goto Intel Link';
    self.version = '1.0.0.20220614.235300';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 1.0.0.20220614.235300
- added support for scanner links
- added support for links with comma separated floating point values
- added support for mission links to zoom to all mission portals

version 0.0.4.20210724.002500
- prevent double plugin setup on hook iitcLoaded

version 0.0.4.20210607.233700
- also support for links with a combination of a location ll and a portal pll parameter

version 0.0.3.20210528.201400
- added a history select list with recently used links

version 0.0.2.20210421.230800
- added support for negative coordinate values

version 0.0.1.20210421.190200
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin

version 0.0.1.20210408.122600
version 0.0.1.20210408.143800
- first release
- updated plugin wrapper and userscript header formatting to match IITC-CE coding
- dialog position at the top
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.lastlink = '';
    self.history = [];

    self.gotolink = function(newlink) {
        if (newlink == null || newlink == "") return false;

        if (newlink.match(/%3a/)) newlink = decodeURIComponent(newlink);
        newlink = newlink.replace(/([-\d]+),(\d+),([-\d]+),(\d+)/,"$1.$2,$3.$4");
        let missionmatches = newlink.match(/http(|s):\/\/(|intel\.)ingress\.com\/mission\/([0-9a-f\.]+)/);
        let matches = newlink.match(/http(|s):\/\/(|intel\.)ingress\.com\/(|intel)\?(pll|ll)=([-\d\.]+),([-\d\.]+)/);
        if (!missionmatches && !matches) {
            alert(self.title + "\n\n" + 'This apears to be an invalid intel link');
        } else if (matches && matches[4] == 'll') {
            let lat = parseFloat(matches[5]) || 0.0;
            let lng = parseFloat(matches[6]) || 0.0;

            let zoom = newlink.match(/&z=(\d+)/);
            if (zoom) zoom = zoom[1];
            if (!zoom) zoom = window.DEFAULT_ZOOM;
            window.map.setView(new window.L.LatLng(lat, lng), zoom, {reset:true});

            let matchportal = newlink.match(/pll=([-\d\.]+),([-\d\.]+)/);
            if (matchportal) {
                let portallat = parseFloat(matchportal[1]) || 0.0;
                let portallng = parseFloat(matchportal[2]) || 0.0;
                window.selectPortalByLatLng(portallat,portallng);
            }
            return true;
        } else if (matches && matches[4] == 'pll') {
            let portallat = parseFloat(matches[5]) || 0.0;
            let portallng = parseFloat(matches[6]) || 0.0;
            let urlPortalLL = [portallat, portallng];
            if (!window.map.getBounds().contains(urlPortalLL)) {
                window.map.setView(urlPortalLL);
            }
            window.selectPortalByLatLng(portallat,portallng);
            return true;
        } else if (missionmatches) {
            let guid = missionmatches[3];
            window.postAjax('getMissionDetails', {
                guid: guid
            }, function(data) {
                // console.log(self.title + ' - mission details loaded',missionmatches,data);
                try {
                    let waypoints = data.result[9].map((data)=>{return [ data[5][2] / 1E6,data[5][3] / 1E6 ]});
                    window.map.fitBounds(window.L.latLngBounds(waypoints));
                    if (self.history.indexOf(newlink) == -1) {
                        self.history.push(newlink);
                        let selectlink = document.querySelector('.gotolinkmainmenu select');
                        if (selectlink) {
                            let option = selectlink.appendChild(document.createElement('option'));
                            option.textContent = newlink;
                        }
                    }
                    return true;
                } catch(e) {
                    alert(self.title + "\n\n" + 'This apears to be an invalid mission link');
                }
            }, function(error) {
                alert(self.title + "\n\n" + 'This apears to be an invalid mission link');
            });
        }
        return false;
    };

    self.menu = function(menu) {
        menu = (menu || 'main');

        let container = document.createElement('div');
        container.className = self.id + 'mainmenu';

        let buttons = {};
        let title = self.title;
        let dialogoptions = {};
        if (menu == 'main') {
            let hiddenautofocusinput = container.appendChild(document.createElement('input')); // added to prevent auto focus on first element
            hiddenautofocusinput.type = 'hidden';
            hiddenautofocusinput.autofocus = 'autofocus';

            let inputform = container.appendChild(document.createElement('form'));
            inputform.style.display = 'flex';
            inputform.style.flexDirection = 'row';
            inputform.onsubmit = function(e) {
                e.preventDefault();
                return false;
            };

            let inputlink = inputform.appendChild(document.createElement('input'));
            inputlink.type = 'text';
            inputlink.placeholder = 'Paste intel link';
            if (!window.isSmartphone()) inputlink.title = inputlink.placeholder;
            inputlink.style.width = '100%';
            inputlink.value = self.lastlink;

            let gotobutton = inputform.appendChild(document.createElement('button'));
            gotobutton.textContent = 'Goto';
            gotobutton.style.cursor = 'pointer';
            gotobutton.style.flex = '0 1 0%';
            gotobutton.style.width = '120px !important';

            let clearbutton = inputform.appendChild(document.createElement('button'));
            clearbutton.textContent = 'X';
            clearbutton.style.cursor = 'pointer';
            clearbutton.style.flex = '0 1 0%';
            clearbutton.style.width = '20px !important';

            clearbutton.addEventListener('click', function(e) {
                e.preventDefault();
                inputlink.value = '';
            }, false);

            let selectlinkarea = container.appendChild(document.createElement('div'));
            let selectlink = selectlinkarea.appendChild(document.createElement('select'));
            selectlink.style.width = '264px';
            let option0 = selectlink.appendChild(document.createElement('option'));
            option0.textContent = 'Select a recently used link...';
            option0.disabled = true;
            option0.selected = true;
            for (let cnt = 0; cnt < self.history.length; cnt++) {
                let option = selectlink.appendChild(document.createElement('option'));
                option.textContent = self.history[cnt];
            }
            selectlink.addEventListener('change', function(e) {
                e.preventDefault();
                inputlink.value = selectlink.value;
                option0.selected = true;
            });

            gotobutton.addEventListener('click', function(e) {
                e.preventDefault();
                inputlink.value = inputlink.value.trim();
                if (self.gotolink(inputlink.value) && self.history.indexOf(inputlink.value) == -1) {
                    self.history.push(inputlink.value);
                    let option = selectlink.appendChild(document.createElement('option'));
                    option.textContent = inputlink.value;
                }
            }, false);
            dialogoptions = {
                closeCallback: function() {
                    self.lastlink = inputlink.value;
                }
            };
            buttons = { 'About': function() { self.menu('about'); } };
        } else if (menu == 'about') {
            title += ' - About';
            let aboutarea = container.appendChild(document.createElement('div'));
            aboutarea.innerHTML = `<input type="hidden" autofocus>
            <p>Thank you for using the ${self.title} plugin.<br>
            <br>
            Instead of clicking a link you can copy/paste any URL into IITC with this plugin.<br>
            Support for:<br>
            - portal links<br>
            - map/perma links<br>
            - mission links<br>
            - portal and mission links created in the Ingress Prime scanner<br>
            <br>
            This way, instead of clicking on an Ingress intel link, the link does not open a new IITC session (and no reload on the mobile app).<br>
            <br>
            Mission links will auto zoom to show all waypoints for that mission.<br>
            <br>
            Share this plugin with this link: <a href="https://softspot.nl/ingress/#iitc-plugin-gotolink.user.js" target="_blank">Softspot IITC plugins</a> to get the latest version.</p>
            `;
            buttons = {
                '< Main menu': function() { self.menu(); },
                'Changelog': function() { alert(self.changelog); }
            };
        }

        let author = container.appendChild(document.createElement('div'));
        author.className = self.id + 'author';
        author.textContent = self.title + ' version ' + self.version + ' by ' + self.author;

        if (window.useAndroidPanes()) window.show('map'); // hide sidepane
        let position = (document.getElementById('dialog-' + self.pluginname + '-dialog') ? $('#dialog-' + self.pluginname + '-dialog').dialog('option','position') : { my: "center", at: "top" });
        window.dialog({
            ...{
                html: container,
                id: self.pluginname + '-dialog',
                dialogClass: 'ui-dialog-' + self.pluginname,
                title: self.title,
                width: '350px',
                position: position
            },
            ...dialogoptions
        }).dialog('option', 'buttons', {
            ...buttons,
            ...{ 'Close': function() { $(this).dialog('close'); } }
        });
    };

    self.setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        var sheet = document.createElement('style')
        sheet.innerHTML = '';
        sheet.innerHTML += '.' + self.id + 'author { margin-top: 14px; font-style: italic; font-size: smaller; }';
        document.body.appendChild(sheet);

        let toolboxlink = document.getElementById('toolbox').appendChild(document.createElement('a'));
        toolboxlink.textContent = self.title;
        toolboxlink.addEventListener('click', function(e) {
            self.menu();
            e.preventDefault();
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
