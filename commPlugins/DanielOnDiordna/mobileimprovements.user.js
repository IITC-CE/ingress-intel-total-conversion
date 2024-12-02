// ==UserScript==
// @author         DanielOnDiordna
// @name           Mobile improvements
// @category       Misc
// @version        1.0.0.20211027.195200
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/mobileimprovements.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/mobileimprovements.user.js
// @description    [danielondiordna-1.0.0.20211027.195200] Add some improvements for IITC mobile, such as a close button for the portal details/info screen, a full screen button.
// @id             mobileimprovements@DanielOnDiordna
// @namespace      https://softspot.nl/ingress/
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.mobileimprovements = function() {};
    var self = window.plugin.mobileimprovements;
    self.id = 'mobileimprovements';
    self.title = 'Mobile improvements';
    self.version = '1.0.0.20211027.195200';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 1.0.0.20211027.195200
- first release
- updated plugin wrapper and userscript header formatting to match IITC-CE coding
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin
- prevent double plugin setup on hook iitcLoaded
- add a close button to the info screen, usefull when no portal is selected
- add a full screen button, for use with Kiwi mobile browser
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        if (window.isSmartphone()) {
            $('#playerstat').attr({style:'display:flex'});
            $('#playerstat').prepend(
                $('<span>').attr({
                    style: 'padding: 2px 4px 4px 4px; margin-bottom: 4px; border: 1px outset #20A8B1; color: #ffce00;',
                    title: 'Close',
                }).html('&#x2716;').click(function () {
                    show('map');
                })
            );
            $('#playerstat').append(
                $('<span>').attr({
                    style: 'padding: 2px 4px 4px 4px; margin-bottom: 4px; border: 1px outset #20A8B1; color: #ffce00;',
                    title: 'Fullscreen'
                }).html('&#x26F6;').click(function () {
                    let elem = document.documentElement;
                    let rfs =
                        elem.requestFullScreen
                    || elem.webkitRequestFullScreen
                    || elem.mozRequestFullScreen
                    || elem.msRequestFullScreen;
                    rfs.call(elem);
                })
            );
        }

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
