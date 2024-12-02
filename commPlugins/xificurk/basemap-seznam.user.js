// ==UserScript==
// @author          xificurk
// @id              basemap-seznam@xificurk
// @name            Seznam map tiles
// @category        Map Tiles
// @version         0.2.0.20230130.201555
// @namespace       https://github.com/xificurk/iitc-plugins
// @updateURL       https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/xificurk/basemap-seznam.meta.js
// @downloadURL     https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/xificurk/basemap-seznam.user.js
// @description     [xificurk-2023-01-30-201555] Seznam map tiles.
// @issueTracker    https://github.com/xificurk/iitc-plugins/issues
// @homepageURL     https://github.com/xificurk/iitc-plugins
// @include         https://intel.ingress.com/*
// @include         http://intel.ingress.com/*
// @include         https://*.ingress.com/intel*
// @include         http://*.ingress.com/intel*
// @include         https://*.ingress.com/mission/*
// @include         http://*.ingress.com/mission/*
// @match           https://intel.ingress.com/*
// @match           http://intel.ingress.com/*
// @match           https://*.ingress.com/intel*
// @match           http://*.ingress.com/intel*
// @match           https://*.ingress.com/mission/*
// @match           http://*.ingress.com/mission/*
// @grant           none
// ==/UserScript==



function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'xificurk';
plugin_info.dateTimeVersion = '20230130.201555';
plugin_info.pluginId = 'basemap-seznam';
//END PLUGIN AUTHORS NOTE


//PLUGIN START ////////////////////////////////////////////////////////


var setup = function() {
  console.error('Seznam map tiles are no longer publicly available - you should remove the plugin.');
}

//PLUGIN END //////////////////////////////////////////////////////////


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


