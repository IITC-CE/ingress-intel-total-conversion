// ==UserScript==
// @author         3ch01c
// @id             spamfilter@3ch01c
// @name           spam-filter
// @category       Misc
// @version        0.0.7
// @namespace      https://github.com/3ch01c/ingress-intel-total-conversion
// @description    This is a spam filter plugin which filters out SPAM from Comm messages.
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/3ch01c/spamfilter.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/3ch01c/spamfilter.user.js
// @include        https://*.ingress.com/intel*
// @include        http://*.ingress.com/intel*
// @include        https://*.ingress.com/mission/*
// @include        http://*.ingress.com/mission/*
// @match          https://*.ingress.com/intel*
// @match          http://*.ingress.com/intel*
// @match          https://*.ingress.com/mission/*
// @match          http://*.ingress.com/mission/*
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==



function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

// setup plugin
var setup = function() {
	var renderData_orig = window.chat.renderData;

	// spam filter
	window.chat.renderData = function(data, element, likelyWereOldMsgs) {
		var filteredData = {};
		for (var key in data) {
			var user = data[key][3];
			if (user.search(/^(enl|res)[0-9]+$/)>=0) {
				continue;
			}
			var text = data[key][2];
			if (text.search(/xmps\.biz|ecwid\.com|ingress-(shop|store)|(store|shop)-ingress|ingressfarm\.com/i)>=0) {
				continue;
			}
			filteredData[key] = data[key];
		}
		renderData_orig(filteredData, element, likelyWereOldMsgs);
	}
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
