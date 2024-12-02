// ==UserScript==
// @author         Zaso
// @name           Minify Some Portals Details
// @category       Tweaks
// @version        0.0.4.20200216.174030
// @description    Minify some Portal Details in sidebar: mod slots and resonators info
// @id             minify-some-portal-details@Zaso
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/minify-some-portal-details.user.js
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/minify-some-portal-details.meta.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'ZasoItems';
plugin_info.dateTimeVersion = '2020-02-16-174030';
plugin_info.pluginId = 'minify-some-portal-details';
//END PLUGIN AUTHORS NOTE



// PLUGIN START ////////////////////////////////////////////////////////
// History
// 0.0.4 Headers changed. Ready for IITC-CE
// 0.0.3 Original sript


	window.plugin.minifySomePortalDetails = {};
	window.plugin.minifySomePortalDetails.obj = {};
	window.plugin.minifySomePortalDetails.storage = {};

	//-----------------------------------
	// STORAGE
	//-----------------------------------
	window.plugin.minifySomePortalDetails.storage.NAME = 'plugin-minify-someportaldetails';

	window.plugin.minifySomePortalDetails.storage.save = function(){ window.localStorage[window.plugin.minifySomePortalDetails.storage.NAME] = JSON.stringify(window.plugin.minifySomePortalDetails.obj); }
	window.plugin.minifySomePortalDetails.storage.load = function(){ window.plugin.minifySomePortalDetails.obj = JSON.parse(window.localStorage[window.plugin.minifySomePortalDetails.storage.NAME]); }

	window.plugin.minifySomePortalDetails.storage.reset = function(){
		window.plugin.minifySomePortalDetails.obj = {minify:1};
		window.plugin.minifySomePortalDetails.storage.save();
	}
	window.plugin.minifySomePortalDetails.storage.delete = function(){ delete window.localStorage[window.plugin.minifySomePortalDetails.storage.NAME]; }
	window.plugin.minifySomePortalDetails.storage.check = function(){
		if(!window.localStorage[window.plugin.minifySomePortalDetails.storage.NAME]){
			window.plugin.minifySomePortalDetails.storage.reset();
		}
		window.plugin.minifySomePortalDetails.storage.load();
	}

	//-----------------------------------

	window.plugin.minifySomePortalDetails.isMinify = function(){
		return (parseInt(window.plugin.minifySomePortalDetails.obj.minify) === 1)? true : false;
	}

	window.plugin.minifySomePortalDetails.toggle = function(){
		if(window.plugin.minifySomePortalDetails.isMinify() === true){
			window.plugin.minifySomePortalDetails.setDefaultStyle();
		}else{
			window.plugin.minifySomePortalDetails.setSmallerStyle();
		}

		$('#portaldetails').toggleClass('minifySomePortalDetails');
		window.plugin.minifySomePortalDetails.obj.minify = (!parseInt(window.plugin.minifySomePortalDetails.obj.minify))? 1 : 0;
		window.plugin.minifySomePortalDetails.storage.save();
	}

	window.plugin.minifySomePortalDetails.minimize = function(){
		$('#portaldetails').addClass('minifySomePortalDetails');
		window.plugin.minifySomePortalDetails.obj.minify = 1;
		window.plugin.minifySomePortalDetails.storage.save();
	}

	window.plugin.minifySomePortalDetails.expand = function(){
		$('#portaldetails').removeClass('minifySomePortalDetails');
		window.plugin.minifySomePortalDetails.obj.minify = 0;
		window.plugin.minifySomePortalDetails.storage.save();
	}

	window.plugin.minifySomePortalDetails.restoreStatus = function(){
		if(window.plugin.minifySomePortalDetails.isMinify() === true) window.plugin.minifySomePortalDetails.minimize();
		if(window.plugin.minifySomePortalDetails.isMinify() === false) window.plugin.minifySomePortalDetails.expand();
	}

	//-----------------------------------

	window.plugin.minifySomePortalDetails.redrawSomePortalDetails = function(){
		window.plugin.minifySomePortalDetails.restoreStatus();
		if(window.plugin.minifySomePortalDetails.isMinify()) window.plugin.minifySomePortalDetails.setSmallerStyle();
		$('#portaldetails #resodetails th, #portaldetails .mods > span').on('click', window.plugin.minifySomePortalDetails.toggle);
	}

	//-----------------------------------

	window.plugin.minifySomePortalDetails.setDefaultStyle = function(){
		$('#portaldetails .mods > span').each(function(i){
			var text = $(this).text();
			var abbr_rarity = undefined;
			var abbr_mod = undefined;

			if(1 === 0){}
			else if(text.indexOf('HS') >= 0){ abbr_mod = 'Heat Sink'; }
			else if(text.indexOf('MH') >= 0){ abbr_mod = 'Multi-hack'; }
			else if(text.indexOf('FA') >= 0){ abbr_mod = 'Force Amp'; }
			else if(text.indexOf('LA') >= 0){ abbr_mod = 'Link Amp'; }
			else if(text.indexOf('AES') >= 0){ abbr_mod = 'Aegis Shield'; }
			else if(text.indexOf('SBU') >= 0){ abbr_mod = 'SoftBank Ultra Link'; }
			else if(text.indexOf('ITO+') >= 0){ abbr_mod = 'Ito En Transmuter (+)'; }
			else if(text.indexOf('ITO-') >= 0){ abbr_mod = 'Ito En Transmuter (-)'; }
			else if(text.indexOf('S') >= 0){ abbr_mod = 'Portal Shield'; }
			else if(text.indexOf('T') >= 0){ abbr_mod = 'Turret'; }
			else{ abbr_mod = undefined; }

			if(1 === 0){}
			else if(text.indexOf('[VR]') >= 0){ abbr_rarity = 'Very rare'; }
			else if(text.indexOf('[R]') >= 0){ abbr_rarity = 'Rare'; }
			else if(text.indexOf('[C]') >= 0){ abbr_rarity = 'Common'; }
			else{ abbr_rarity = undefined; }

			if(abbr_rarity !== undefined && abbr_mod !== undefined) $(this).text(abbr_rarity+' '+abbr_mod);
		});
	}

	window.plugin.minifySomePortalDetails.setSmallerStyle = function(){
		/*function ff(label, replaceWith){var sel = $('#portaldetails .mods > span:contains('+label+')');var txt = sel.text().replace(label, replaceWith);sel.text(txt);console.log(txt);}ff('Heat Sink', 'HS');ff('Multi-hack', 'MH');ff('Turret', 'T');ff('Force Amp', 'FA');ff('Link Amp', 'LA');ff('Portal Shield', 'S');ff('AXA Shield', 'AX');ff('SoftBank Ultra Link', 'SB');ff('Ito En Transmuter (+)', 'ITO+');ff('Ito En Transmuter (-)', 'ITO-');	*/
		// var vr = COLORS_MOD.VERY_RARE; var r = COLORS_MOD.RARE; var c = COLORS_MOD.COMMON;
		/*var color = window.plugin.minifySomePortalDetails.rgb2hex($(this).css('color'));if(color == vr){$(this).text().replace('Very rare ', ' [VR]');// $(this).append(' [VR]');}else if(color == r){$(this).text().replace('Rare ', ' [R]');// $(this).append(' [R]');}else if(color == c){$(this).text().replace('Common ', ' [C]');$(this).append(' [C]');}*/

		$('#portaldetails .mods > span').each(function(i){
			var text = $(this).text();
			var abbr_rarity = undefined;
			var abbr_mod = undefined;

			if(1 === 0){}
			else if(text.indexOf('Heat Sink') >= 0){ abbr_mod = 'HS'; }
			else if(text.indexOf('Multi-hack') >= 0){ abbr_mod = 'MH'; }
			else if(text.indexOf('Turret') >= 0){ abbr_mod = 'T'; }
			else if(text.indexOf('Force Amp') >= 0){ abbr_mod = 'FA'; }
			else if(text.indexOf('Link Amp') >= 0){ abbr_mod = 'LA'; }
			else if(text.indexOf('Portal Shield') >= 0){ abbr_mod = 'S'; }
			else if(text.indexOf('Aegis Shield') >= 0){ abbr_mod = 'AES'; }
			else if(text.indexOf('SoftBank Ultra Link') >= 0){ abbr_mod = 'SBU'; }
			else if(text.indexOf('Ito En Transmuter (+)') >= 0){ abbr_mod = 'ITO+'; }
			else if(text.indexOf('Ito En Transmuter (-)') >= 0){ abbr_mod = 'ITO-'; }
			else{ abbr_mod = undefined; }

			if(1 === 0){}
			else if(text.indexOf('Very rare') >= 0){ abbr_rarity = '[VR]'; }
			else if(text.indexOf('Rare') >= 0){ abbr_rarity = '[R]'; }
			else if(text.indexOf('Common') >= 0){ abbr_rarity = '[C]'; }
			else{ abbr_rarity = undefined; }

			if(abbr_rarity !== undefined && abbr_mod !== undefined) $(this).text(abbr_mod+' '+abbr_rarity);
		});
	}

	window.plugin.minifySomePortalDetails.rgb2hex = function(rgb){
		if(/^#[0-9A-F]{6}$/i.test(rgb)) return rgb;
		rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
		function hex(x){ return ("0" + parseInt(x).toString(16)).slice(-2); }
		return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
	}

	//-----------------------------------

	window.plugin.minifySomePortalDetails.setupCSS = function(){
		$("<style>").prop("type", "text/css").html(''
			+'#portaldetails.minifySomePortalDetails .mods{ height:auto; }'
			+'#portaldetails.minifySomePortalDetails .mods > span{ height:16px; }'

			+'#portaldetails.minifySomePortalDetails #resodetails td{ display:none; }'
			+'#portaldetails.minifySomePortalDetails #resodetails tr{ width:50%; float:left; }'

			// +'#portaldetails.minifySomePortalDetails .mods > span[title*="AXA"]{ background: #ffff00; }'
			// +'#portaldetails.minifySomePortalDetails .mods > span[title*="AXA"]::after{ content: "ciao"; }'
		).appendTo("head");
	}

	var setup = function(){
		window.plugin.minifySomePortalDetails.storage.check();
		window.plugin.minifySomePortalDetails.setupCSS();
		window.addHook('portalDetailsUpdated', window.plugin.minifySomePortalDetails.redrawSomePortalDetails);
	}

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

