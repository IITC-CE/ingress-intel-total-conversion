// ==UserScript==
// @author         Zaso
// @name           Last Action Timestamp
// @category       Info
// @version        0.0.3.20200216.174029
// @description    Estimate the portal decaying.
// @id             last-action-timestamp@Zaso
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/last-action-timestamp.user.js
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/last-action-timestamp.meta.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'ZasoItems';
plugin_info.dateTimeVersion = '2020-02-16-174029';
plugin_info.pluginId = 'last-action-timestamp';
//END PLUGIN AUTHORS NOTE



// PLUGIN START ////////////////////////////////////////////////////////
// History
// 0.0.3 Headers changed. Ready for IITC-CE
// 0.0.2 Original sript


	// use own namespace for plugin
	window.plugin.lastAction = function() {};


	window.plugin.lastAction.convertTimestamp = function(timestamp){
		var dt = window.unixTimeToDateTimeString(timestamp, true);
		return dt;
	}

	window.plugin.lastAction.appendDetails = function(data){
		var guid = window.selectedPortal;
		var p = window.portals[guid];
		var t = p.options.timestamp;
		var dt = window.plugin.lastAction.convertTimestamp(t);

		if(dt !== undefined && dt !== null){
			dt = dt.slice(0, -4);
			var helpTxt = 'The action is a recharge, deploy, upgrade, install a mod, link, fire, expires, but not hack or get xm';
			var html = '<span style="cursor:help;" title="'+helpTxt+'">Last action</span>: <b>'+dt+'</b>';

			$('#portaldetails .linkdetails').before('<div class="lastAction">'+html+'</div>');
		}
	}

	//---------------------------------------------------------------------------------------
	// Append the stylesheet
	//---------------------------------------------------------------------------------------
	window.plugin.lastAction.setupCSS = function(){
		$('<style>').prop('type', 'text/css').html(''
			+'.lastAction{text-align:center;padding:2px 0 3px;border:1px solid #20A8B1;border-width:1px 0;color:lightgrey;}'
			+'.lastAction b{color:#ffc000;}'
		).appendTo('head');
	}

	var setup = function() {
		window.plugin.lastAction.setupCSS();
		window.addHook('portalDetailsUpdated', window.plugin.lastAction.appendDetails);
	};

// PLUGIN END //////////////////////////////////////////////////////////


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

