// ==UserScript==
// @author         DanielOnDiordna
// @name           pan control add-on
// @category       Addon
// @version        1.0.0.20210724.002500
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/pan-control-add-on.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/pan-control-add-on.user.js
// @description    [danielondiordna-1.0.0.20210724.002500] Change Pan Control to pan whole screens
// @id             pan-control-add-on@DanielOnDiordna
// @namespace      https://softspot.nl/ingress/
// @depends        pan-control@fragger
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.panControlAddon = function() {};
    var self = window.plugin.panControlAddon;
    self.id = 'panControlAddon';
    self.title = 'pan control add-on';
    self.version = '1.0.0.20210724.002500';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 0.0.1.20160412.220300
- first version

version 0.0.2.20200115.225600
- renamed plugin from Override to Add-on
- fixed offset method code injection

version 0.0.2.20210421.190200
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin

version 1.0.0.20210422.200000
- updated plugin wrapper and userscript header formatting to match IITC-CE coding
- added support for IITC CE

version 1.0.0.20210724.002500
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

        if (!window.plugin.panControl) {
            console.log('IITC plugin error: ' + self.title + ' version ' + self.version + ' - missing plugin panControl');
            return;
        }

        if (window.plugin.panControl.setup) { // old version
            console.log('panControl old version found');
            var panControl_string = window.plugin.panControl.setup.toString();

            // replace some code:
            panControl_string = panControl_string.replace('map.panBy(offset);',
                                                          "            let down = (title == 'Down' ? 1 : 0);" +
                                                          "            let left = (title == 'Left' ? 1 : 0);" +
                                                          "            let up = (title == 'Up' ? 1 : 0);" +
                                                          "            let right = (title == 'Right' ? 1 : 0);" +
                                                          "            let bounds = map.getPixelBounds();" +
                                                          "            let width =  Math.abs(bounds.max.x - bounds.min.x);" +
                                                          "            let height = Math.abs(bounds.max.y - bounds.min.y);" +
                                                          "            let offset = new L.Point(right * width - left * width,down * height - up * height);" +
                                                          "            map.panBy(offset);");

            // disable the whole style setup, to prevent being recreated when running setup again:
            panControl_string = panControl_string.replace('$(\'head\').append(\'<style>','//$(\'head\').append(\'<style>');

            // tag the console output with Add-on text:
            panControl_string = panControl_string.replace(/Leaflet.Pancontrol JS/g,'Leaflet.Pancontrol Add-on JS');

            // activate the new code:
            eval('window.plugin.panControl.setup = ' + panControl_string);

            // remove the old controls:
            if (window.map.panControl._map) {
                window.map.removeControl(window.map.panControl);
            }

            // run the new code and place controls:
            window.plugin.panControl.setup();
        } else if (window.plugin.panControl.control) { // new version

            function replacePanButton(container,title,classname,xoffset,yoffset) {
                let a = document.createElement('a');
                a.className = classname;
                a.title = title;

                a.addEventListener('click', function(e) {
                    e.preventDefault();
                    let bounds = window.map.getPixelBounds();
                    let width = Math.abs(bounds.max.x - bounds.min.x);
                    let height = Math.abs(bounds.max.y - bounds.min.y);
                    let offset = new window.L.Point(xoffset * width,yoffset * height);
                    window.map.panBy(offset);
                }, false);

                container.getElementsByClassName(classname)[0].replaceWith(a);
            }

            let classNameBase = 'leaflet-control-pan';
            let container = window.plugin.panControl.control.getContainer();
            replacePanButton(container,'Up',classNameBase + '-up',0,-1);
            replacePanButton(container,'Left',classNameBase + '-left',-1,0);
            replacePanButton(container,'Right',classNameBase + '-right',1,0);
            replacePanButton(container,'Down',classNameBase + '-down',0,1);
        } else {
            console.log('panControl map object not found');
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
