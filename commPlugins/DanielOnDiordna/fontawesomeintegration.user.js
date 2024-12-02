// ==UserScript==
// @author         DanielOnDiordna
// @name           Font awesome integration
// @category       Tweak
// @version        0.0.1.20210724.002500
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/fontawesomeintegration.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/fontawesomeintegration.user.js
// @description    [danielondiordna-0.0.1.20210724.002500] Font awesome: Get vector icons and social logos on your website with Font Awesome, the web's most popular icon set and toolkit (https://fontawesome.com/ using source: https://www.bootstrapcdn.com/fontawesome/).
// @id             fontawesomeintegration@DanielOnDiordna
// @namespace      https://softspot.nl/ingress/
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.fontawesomeintegration = function() {};
    var self = window.plugin.fontawesomeintegration;
    self.id = 'fontawesomeintegration';
    self.title = 'Font awesome integration';
    self.version = '0.0.1.20210724.002500';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 0.0.1.20210204.082900
- first release
- enables the use of icons by other plugins, example: <i class="fa fa-search-plus"></i> (see for all icons: https://fontawesome.com/icons?d=gallery)
- prop name crossOrigin is case sensitive!
- used plugin wrapper and userscript header formatting to match IITC-CE coding

version 0.0.1.20210421.190200
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin

version 0.0.1.20210724.002500
- prevent double plugin setup on hook iitcLoaded
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

        // source: https://www.bootstrapcdn.com/fontawesome/
		$('<link>')
			.prop('type', 'text/css')
			.prop('rel', 'stylesheet')
			.prop('href', 'https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css')
			.prop('crossOrigin', 'anonymous')
			.prop('integrity', 'sha384-wvfXpqpZZVQGK6TAh5PVlGOfQNHSoD2xbE+QkPxCAFlNEevoEH3Sl0sibVcOQVnN')
			.appendTo('head');

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

