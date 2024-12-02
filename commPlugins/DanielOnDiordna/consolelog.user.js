// ==UserScript==
// @author         DanielOnDiordna
// @name           Console log
// @category       Misc
// @version        0.0.1.20210724.002500
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/consolelog.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/consolelog.user.js
// @description    [danielondiordna-0.0.1.20210724.002500] Display the Console log in a window, captures console.log and console.warn. Execute Javascript commands with the eval field, results are displayed with JSON.stringify formatting
// @id             consolelog@DanielOnDiordna
// @namespace      https://softspot.nl/ingress/
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.consolelog = function() {};
    var self = window.plugin.consolelog;
    self.id = 'consolelog';
    self.title = 'Console log';
    self.version = '0.0.1.20210724.002500';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:
version 0.0.1.20210321.121900
- first release
- updated plugin wrapper and userscript header formatting to match IITC-CE coding
- capture console.log and console.warn

version 0.0.1.20210421.190200
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin

version 0.0.1.20210724.002500
- prevent double plugin setup on hook iitcLoaded
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.consolelog = '';

    self.evaltext = function() {
        $('#' + self.pluginname + 'result').val($('#' + self.pluginname + 'text').val() + " = " + JSON.stringify(eval($('#' + self.pluginname + 'text').val())) + ";\n" + $('#' + self.pluginname + 'result').val());
    };

    self.menu = function() {
        let html = '<div>' +
            '<input type="text" id="' + self.pluginname + 'text" size="55" />' +
            '<input type="button" onclick="' + self.namespace + 'evaltext()" value="Eval"><br />' +
            '<textarea rows="10" cols="55" id="' + self.pluginname + 'result"></textarea><br />' +
            'Console:<br />' +
            '<textarea rows="10" cols="55" id="' + self.pluginname + 'console"></textarea>' +
            '</div>';

        dialog({
            html: html,
            id: self.id,
            title: self.title,
            width: 'auto'
        });

        $('#' + self.pluginname + 'console').val(self.consolelog);
        $('#' + self.pluginname + 'text').on('keypress',function(e) {
            if (e.which == 13) {
                self.evaltext();
            }
        });
    };

    self.setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        $('<a href="#">')
            .text(self.title)
            .click(self.menu)
            .appendTo($('#toolbox'));

        console.log('IITC plugin loaded: ' + self.title + ' version ' + self.version);
    };

    var setup = function() {
        //if (typeof ulog == "function") ulog = function () { return console; };

        (function(){
            var oldLog = console.log;
            console.log = function (message) {
                self.consolelog = new Date().toLocaleTimeString() + " " + message + "\n" + self.consolelog;
                $('#' + self.pluginname + 'console').val(self.consolelog);
                oldLog.apply(console, arguments);
            };
        })();

        (function(){
            var oldWarn = console.warn;
            console.warn = function (message) {
                self.consolelog = new Date().toLocaleTimeString() + " WARN: " + message + "\n" + self.consolelog;
                $('#' + self.pluginname + 'console').val(self.consolelog);
                oldWarn.apply(console, arguments);
            };
        })();

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

