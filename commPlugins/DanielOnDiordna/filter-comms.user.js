// ==UserScript==
// @author         DanielOnDiordna
// @name           Filter Comms for MU and more
// @category       Tweak
// @version        1.1.0.20231019.181300
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/filter-comms.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/filter-comms.user.js
// @description    [danielondiordna-1.1.0.20231019.181300] Filter the 'all' comms pane, options to show only created Control Fields and their MUs, filter for capture, deploy, link, destroy or drone actions, filter faction or public chat, or filter all actions by faction
// @id             filter-comms@DanielOnDiordna
// @namespace      https://softspot.nl/ingress/
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.filtercomms = function() {};
    var self = window.plugin.filtercomms;
    self.id = 'filtercomms';
    self.title = 'Filter Comms for MU and more';
    self.version = '1.1.0.20231019.181300';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 1.1.0.20231019.181300
version 1.1.0.20231006.231600
version 1.1.0.20230925.232700
- version upgrade due to a change in the wrapper, added changelog
- updated for IITC version 0.36.1 and 0.37.0
- added faction machina

version 1.0.0.20230223.164800
- reversed changelog order to show latest first
- major release version 1.0.0
- renamed plugin from Filter Comms for MU, to Filter Comms for MU and more
- added a menu button to the 'all' comms pane
- added filter options for capture, deploy, link or destroy actions
- added a filter for fireworks and beacons
- added a filter for battle beacon announcements
- added a filter by faction
- added label double click to filter for only the selected filter
- added buttons to check or disable all checkboxes

version 0.0.3.20211024.003700
- minor change to work side by side with Logs Diary plugin by ZasoItems

version 0.0.2.20210724.002500
- prevent double plugin setup on hook iitcLoaded

version 0.0.2.20210421.190200
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin

version 0.0.2.20210126.231800
- updated plugin wrapper and userscript header formatting to match IITC-CE coding
- auto show toggle filter menu on mobile when 'all' pane is displayed

version 0.0.1.20201112.164400
- First version
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.settings = {
        fields: true,
        capture: true,
        deploy: true,
        link: true,
        destroyedresonator: true,
        destroyedlink: true,
        destroyedfield: true,
        drone: true,
        beacon: true,
        battlebeacon: true,
        firstcapture: true,
        yourportalattack: true,
        yourportalneutralized: true,
        yourlinkdestroyed: true,
        yourkinetic: true,
        faction: true,
        public: true,
        enl: true,
        res: true,
        mac: true
    };

    self.updatechat = function() {
        let tab = window.chat.getActive();
        switch(tab) {
            case 'faction':
                window.chat.renderFaction(false);
                break;
            case 'all':
                window.chat.renderPublic(false);
                break;
            case 'alerts':
                window.chat.renderAlerts(false);
                break;
            case 'public':
                window.chat.renderPublicChat(false);
                break;
        }
    };

    self.hidemessage = function(msg) {
        // msg comes from the window.chat.renderData
        // if ((/color:#03DC03/.test(msg[2]))) console.log(msg);
        // console.log(msg[2]);
        if (!self.settings.fields && (/ created a Control Field/.test(msg[2]))) return true;
        if (!self.settings.capture && (/> captured/.test(msg[2]))) return true;
        if (!self.settings.deploy && (/> deployed a Resonator/.test(msg[2]))) return true;
        if (!self.settings.link && (/ linked from/.test(msg[2]))) return true;
        if (!self.settings.destroyedresonator && (/> destroyed a Resonator/.test(msg[2]))) return true;
        if (!self.settings.destroyedlink && (/> destroyed the Link|destroyed the (FACTION.*?&gt;|<span.*?>) Link/.test(msg[2]))) return true;
        if (!self.settings.destroyedfield && (/> destroyed a Control Field|destroyed the (FACTION.*?&gt;|<span.*?>) Control Field/.test(msg[2]))) return true;
        if (!self.settings.drone && (/>Drone returned/.test(msg[2]))) return true;
        if (!self.settings.battlebeacon && (/ won a CAT-I Rare Battle Beacon on |Rare Battle Beacon will be deployed at the end of the Septicycle/.test(msg[2]))) return true;
        if (!self.settings.beacon && (/deployed a Beacon on/.test(msg[2]))) return true;
        if (!self.settings.firstcapture && (/ captured their first Portal/.test(msg[2]))) return true;
        if (!self.settings.yourportalattack && (/Your Portal.*?is under attack/.test(msg[2]))) return true;
        if (!self.settings.yourportalneutralized && (/Your Portal.*neutralized by/.test(msg[2]))) return true;
        if (!self.settings.yourlinkdestroyed && (/Your Link.*destroyed by/.test(msg[2]))) return true;
        if (!self.settings.yourkinetic && (/Your Kinetic Capsule/.test(msg[2]))) return true;

        let el = document.createElement('table');
        el.innerHTML = msg[2];
        if (!self.settings.faction && (/>\[faction\]</.test(msg[2]) || el.querySelector('tr').classList.contains('faction'))) return true;
        if (!self.settings.public && (/>\[public\]</.test(msg[2]) || el.querySelector('tr').classList.contains('public'))) return true;

        if (!self.settings.enl && (/color:#03DC03/.test(msg[2]) || el.querySelector('.nickname').classList.contains('enl'))) return true;
        if (!self.settings.res && (/color:#0088FF/.test(msg[2]) || el.querySelector('.nickname').classList.contains('res'))) return true;
        if (!self.settings.mac && (/color:#FF0028/.test(msg[2]) || el.querySelector('.nickname').classList.contains('mac'))) return true;
        return false;
    };

    self.onPaneChanged = function(pane) {
        if (pane === 'all') {
            self.menu();
        } else if (window.DIALOGS[`dialog-${self.id}-menu`]) {
            $(window.DIALOGS[`dialog-${self.id}-menu`]).dialog('close');
        }
    };

    self.about = function() {
        let container = document.createElement('div');
        container.innerHTML = `
<p>This plugin adds a filter button to the chat panes.<br>
You can set a filter for the 'all' comms pane.<br>
Filter the 'all' comms pane, options to show only created Control Fields and their MUs, filter for capture, deploy, link, destroy or drone actions, filter faction or public chat, or filter by faction.<br>
Double click a checkbox or the label to disable all other checkboxes and keep only one checked.<br>
On mobile devices, the dialog will be aligned at the top and will auto show/hide with the All chat pane. Close button will minimize the dialog; the title bar toggles minimize.<br>
All filters will be reset after a page reload; settings are not stored.<br>
Be aware that filter by faction will overrule all other filters.</p>
<p>Share this plugin with this link: <a href="https://softspot.nl/ingress/#iitc-plugin-filter-comms.user.js" target="_blank">Softspot IITC plugins</a> to get the latest version.</p>
<div style="margin-top: 14px; font-style: italic; font-size: smaller;">version ${self.version} by ${self.author}</div>
`;

        window.dialog({
            html: container,
            id: `${self.id}-menu`,
            title: self.title
        }).dialog('option','buttons', {
            '< Main menu': self.menu,
            'Changelog': function() { alert(self.changelog); },
            'Close': function() {
                if (window.useAndroidPanes()) {
                    self.menu();
                } else {
                    $(this).dialog('close');
                }
            },
        });
    };

    self.checkall = function() {
        for (let filter in self.settings) {
            self.settings[filter] = true;
            let checkbox = document.querySelector(`input[name=${self.id}-${filter}]`);
            if (checkbox) checkbox.checked = true;
        }
        setTimeout(self.updatechat); // place in a non-delay timeout, so the checkboxes are displayed first
    };
    self.disableall = function() {
        for (let filter in self.settings) {
            if (filter != 'enl' && filter != 'res' && filter != 'mac') { // exclude the faction filters
                self.settings[filter] = false;
                let checkbox = document.querySelector(`input[name=${self.id}-${filter}]`);
                if (checkbox) checkbox.checked = false;
            }
        }
        setTimeout(self.updatechat); // place in a non-delay timeout, so the checkboxes are displayed first
    };

    self.menu = function() {
        let container = document.createElement('div');
        container.innerHTML = `
Filter by activity:<br>
<label><input type="checkbox" name="${self.id}-fields"> Created Control Fields and MU</label><br>
<label><input type="checkbox" name="${self.id}-capture"> Captured portals</label><br>
<label><input type="checkbox" name="${self.id}-deploy"> Deployed resonators</label><br>
<label><input type="checkbox" name="${self.id}-link"> Created links</label><br>
<label><input type="checkbox" name="${self.id}-destroyedresonator"> Destroyed resonators</label><br>
<label><input type="checkbox" name="${self.id}-destroyedlink"> Destroyed links</label><br>
<label><input type="checkbox" name="${self.id}-destroyedfield"> Destroyed fields</label><br>
<label><input type="checkbox" name="${self.id}-drone"> Drone returned</label><br>
<label><input type="checkbox" name="${self.id}-beacon"> Deploy of Fireworks and Beacons</label><br>
<label><input type="checkbox" name="${self.id}-battlebeacon"> Battle beacon announcements</label><br>
<label><input type="checkbox" name="${self.id}-firstcapture"> Captured first portal (faction tab)</label><br>
<label><input type="checkbox" name="${self.id}-yourportalattack"> Your portal is under attack</label><br>
<label><input type="checkbox" name="${self.id}-yourportalneutralized"> Your portal neutralized</label><br>
<label><input type="checkbox" name="${self.id}-yourlinkdestroyed"> Your link destroyed</label><br>
<label><input type="checkbox" name="${self.id}-yourkinetic"> Your Kinetic Capsule is ready</label><br>
<label><input type="checkbox" name="${self.id}-public"> Public chat</label><br>
<label><input type="checkbox" name="${self.id}-faction"> Faction chat</label><br>
Filter by faction:<br>
<label><input type="checkbox" name="${self.id}-enl"> Enlightend</label><br>
<label><input type="checkbox" name="${self.id}-res"> Resistance</label><br>
<label><input type="checkbox" name="${self.id}-mac"> Machina</label><br>
`;

        for (let filter in self.settings) {
            let checkbox = container.querySelector(`input[name=${self.id}-${filter}]`);
            checkbox.checked = self.settings[filter];
            checkbox.addEventListener('change',function(e) {
                self.settings[filter] = this.checked;
                setTimeout(self.updatechat); // place in a non-delay timeout, so the checkboxes are displayed first
            },false);

            // add label double click to filter for only one
            if (filter != 'enl' && filter != 'res' && filter != 'mac') { // exclude the faction filters
                let label = checkbox.parentElement;
                label.addEventListener('dblclick',function(e) {
                    // console.log('dblclick',filter);
                    e.preventDefault();
                    e.stopPropagation();
                    // disable all other filters
                    self.settings[filter] = true;
                    checkbox.checked = true;
                    for (let disablefilter in self.settings) {
                        if (disablefilter != filter && disablefilter != 'enl' && disablefilter != 'res' && disablefilter != 'mac') { // exclude the faction filters
                            self.settings[disablefilter] = false;
                            let disablecheckbox = container.querySelector(`input[name=${self.id}-${disablefilter}]`);
                            disablecheckbox.checked = false;
                        }
                    }
                    setTimeout(self.updatechat); // place in a non-delay timeout, so the checkboxes are displayed first
                },false);
            }
        }

        let position = (window.useAndroidPanes() ? { my: "center", at: "top" } : {});
        window.dialog({
            html: container,
            id: `${self.id}-menu`,
            title: self.title,
            position: position
        }).dialog('option','buttons', [
            {
                text: 'Check all',
                style: 'float: left',
                click: self.checkall,
            },
            {
                text: 'Disable all',
                style: 'float: left',
                click: self.disableall,
            },
            {
                text: 'About',
                click: self.about
            },
            {
                text: 'Close',
                click: function() {
                    if (window.useAndroidPanes()) {
                        // collapse instead of close:
                        window.DIALOGS[`dialog-${self.id}-menu`].parentElement.querySelector('.ui-dialog-titlebar-button-collapse').click();
                    } else {
                        $(this).dialog('close');
                    }
                }
            }
        ]);

        window.DIALOGS[`dialog-${self.id}-menu`]?.parentElement.querySelector('.ui-dialog-title').addEventListener('click',function(e) {
            // dialog title click toggles collapse:
            window.DIALOGS[`dialog-${self.id}-menu`].parentElement.querySelector('.ui-dialog-titlebar-button-collapse').click();
        },false);
    };

    self.setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        // rewrite existing function from IITC core to add a filter for created Control Fields:
        // window.plugin.logsDiary replaces the renderData function and formatting differs where the change was made! so this replacement needs to be delayed and changed what to replace
        setTimeout(function() {
            let renderData_override = window.chat.renderData.toString();
            renderData_override = renderData_override.replace(/(var nextTime)/,`if (${self.namespace}hidemessage(msg)) return;\n    $1`);
            eval('window.chat.renderData = ' + renderData_override);
        },0);

        let stylesheet = document.body.appendChild(document.createElement('style'));
        stylesheet.innerHTML = `
#dialog-${self.id}-menu label {
    user-select: none;
    cursor: pointer;
}
`;

        if (window.useAndroidPanes()) {
            // on mobile, add menu button when pane changed to 'all'
            window.addHook("paneChanged", self.onPaneChanged);
        } else {
            // on desktop, add menu button as a tab next to the 'all' tab
            // $("#chatcontrols a:contains('all')").after('<input type="checkbox" title="Filter for created Control Fields" id="filtercreatedcontrolfields">');

            let menubutton = document.createElement('input');
            menubutton.type = 'button';
            menubutton.title = self.title;
            menubutton.value = 'Filter';
            menubutton.addEventListener('click',function(e) {
                e.preventDefault();
                e.stopPropagation();
                self.menu();
            },false);

            let alltab = [...document.querySelectorAll('#chatcontrols a')].filter(el=>el.textContent == 'all')?.[0];
            alltab?.after(menubutton);
        }

        console.log('IITC plugin loaded: ' + self.title + ' version ' + self.version);
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
