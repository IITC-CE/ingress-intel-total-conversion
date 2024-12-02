// ==UserScript==
// @author         Zaso
// @name           Portal Hack Range
// @category       Layer
// @version        0.0.7.20200216.174030
// @description    Add a circle around the portals to show the range where you can hack the portal.
// @id             portal-hack-range@Zaso
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/portal-hack-range.user.js
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/portal-hack-range.meta.js
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
plugin_info.pluginId = 'portal-hack-range';
//END PLUGIN AUTHORS NOTE



// PLUGIN START ////////////////////////////////////////////////////////
// History
// 0.0.7 Headers changed. Ready for IITC-CE
// 0.0.6 Original sript


	// use own namespace for plugin
	window.plugin.hackrange = function() {};
	window.plugin.hackrange.hackLayers = {};
	window.plugin.hackrange.MIN_MAP_ZOOM = 17;

	window.plugin.hackrange.removeCircle = function(guid){
		var previousLayer = window.plugin.hackrange.hackLayers[guid];
		if(previousLayer){
			window.plugin.hackrange.hackCircleHolderGroup.removeLayer(previousLayer);
			delete window.plugin.hackrange.hackLayers[guid];
		}
	}
	window.plugin.hackrange.addCircle = function(guid){
		var d = window.portals[guid];
		var coo = d._latlng;
		var latlng = new L.LatLng(coo.lat,coo.lng);
		var optCircle = {color:window.ACCESS_INDICATOR_COLOR,opacity:1,fillColor:window.ACCESS_INDICATOR_COLOR,fillOpacity:0.2,weight:1,clickable:false, dashArray: [10,10]};
		var range = window.HACK_RANGE;

		var circle = new L.Circle(latlng, range, optCircle);
		circle.addTo(window.plugin.hackrange.hackCircleHolderGroup);
		window.plugin.hackrange.hackLayers[guid] = circle;
	}

	window.plugin.hackrange.portalAdded = function(data){
		data.portal.on('add', function(){
			window.plugin.hackrange.addCircle(this.options.guid);
		});

		data.portal.on('remove', function(){
			window.plugin.hackrange.removeCircle(this.options.guid);
		});
	}

	// *****************************************************************

	var setup =  function() {
		// this layer is added to the layer chooser, to be toggled on/off
		window.plugin.hackrange.rangeLayerGroup = new L.LayerGroup();
		// this layer is added into the above layer, and removed from it when we zoom out too far
		window.plugin.hackrange.hackCircleHolderGroup = new L.LayerGroup();

		window.plugin.hackrange.rangeLayerGroup.addLayer(window.plugin.hackrange.hackCircleHolderGroup);

		window.addLayerGroup('Hack Portal Ranges', window.plugin.hackrange.rangeLayerGroup, true);

		window.addHook('portalAdded', window.plugin.hackrange.portalAdded);
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

