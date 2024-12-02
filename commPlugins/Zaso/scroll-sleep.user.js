// ==UserScript==
// @author         Zaso
// @name           Scroll Sleep
// @category       Tweaks
// @version        0.0.3.20200216.174030
// @description    A control to enable/disable the zoom map by scroll mouse.
// @id             scroll-sleep@Zaso
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/scroll-sleep.user.js
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/scroll-sleep.meta.js
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
plugin_info.pluginId = 'scroll-sleep';
//END PLUGIN AUTHORS NOTE



// PLUGIN START ////////////////////////////////////////////////////////
// History
// 0.0.3 Headers changed. Ready for IITC-CE
// 0.0.2 Original sript


	// use own namespace for plugin
	window.plugin.scrollSleep = function(){};

	window.plugin.scrollSleep.status = true;

	window.plugin.scrollSleep.STORAGE = 'plugin-scrollSleep';
	window.plugin.scrollSleep.saveStorage = function(){
		window.localStorage[window.plugin.scrollSleep.STORAGE] = JSON.stringify(window.plugin.scrollSleep.status);
	}
	window.plugin.scrollSleep.loadStorage = function(){
		window.plugin.scrollSleep.status = JSON.parse(window.localStorage[window.plugin.scrollSleep.STORAGE]);
	}
	window.plugin.scrollSleep.checkStorage = function(){
		if(!window.localStorage[window.plugin.scrollSleep.STORAGE]){
			window.localStorage[window.plugin.scrollSleep.STORAGE] = true;
		}
	}

	window.plugin.scrollSleep.switchStatus = function(){
		if(window.plugin.scrollSleep.status){
			window.plugin.scrollSleep.scrollOff();
		}else{
			window.plugin.scrollSleep.scrollOn();
		}
	}

	window.plugin.scrollSleep.scrollOn = function(){
		$('a.scrollMouseControlButton').removeClass('disabled');
		window.plugin.scrollSleep.status = true;
		window.plugin.scrollSleep.saveStorage();
		map.scrollWheelZoom.enable();
	}
	window.plugin.scrollSleep.scrollOff = function(){
		$('a.scrollMouseControlButton').addClass('disabled');
		window.plugin.scrollSleep.status = false;
		window.plugin.scrollSleep.saveStorage();
		map.scrollWheelZoom.disable();
	}

	window.plugin.scrollSleep.setupCSS = function() {
		$('<style>').prop('type', 'text/css').html(''
			+'a.scrollMouseControlButton{'
			+'background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAUCAQAAAAT+RSaAAABCUlEQVQY06XNsS8DcQDF8dekJHKI6LFIxEAJEhGJSo0SC3+DzYjBUguDSIyGTvwB1/FIRMwNialV6VITg0GcG1o/vxL3NUna3mh7eZ/kPUma1YVjpk3GLJoxo3cdqk+SMnpe45IGAE/kmUC+hqTaJp8AVPkA4J4Z5CkdBUDICf0sUOQH8Eh+a9lCwAEOQkziA6+MN5W1EPDAFmKAAhUgIG2VtQBwhHApAfDWCscIl2o7vJBnHeGwS6EV6pziIsQct51TFVbZJox/QPQXOoF/QMiU1VIzDjVGvjQc3cVgn0Rd8ucpt9VndKGclNL5KDmuuKGIxwbdaE8JSerRjh57TcoMmmRD11qRpF9h2GxUZRxr2wAAAABJRU5ErkJggg==);'
				+'background-position:center center;'
				+'background-repeat:no-repeat;'
				+'outline:none !important;'
			+'}'
			+'a.scrollMouseControlButton,'
			+'a.scrollMouseControlButton:hover{background-color:#0C0;}'
			+'a.scrollMouseControlButton.disabled,'
			+'a.scrollMouseControlButton:hover.disabled{background-color:red;}'
		).appendTo('head');
	}

	window.plugin.scrollSleep.generateControl = function(){
		L.Control.MapZoomScrollControl = L.Control.extend({
			options:{position: 'topleft'},

			onAdd:function(map) {
				var controlDiv = L.DomUtil.create('div', 'leaflet-scrollMouseControl');
				var controlSubDIV = L.DomUtil.create('div', 'leaflet-bar', controlDiv);

				var butt_1 = L.DomUtil.create('a', 'scrollMouseControlButton', controlSubDIV);
				butt_1.title = 'Enable/Disable the zoom map by mouse scroll.';

				L.DomEvent
					.addListener(butt_1, 'click', L.DomEvent.stopPropagation)
					.addListener(butt_1, 'click', L.DomEvent.preventDefault)
					.addListener(butt_1, 'dblclick', L.DomEvent.stopPropagation)
					.addListener(butt_1, 'dblclick', L.DomEvent.preventDefault)

					.addListener(butt_1, 'click', function() {
						window.plugin.scrollSleep.switchStatus();
					})
				;
				return controlDiv;
			}
		});
		L.control.mapzoomscrollcontrol = function(options) { return new L.Control.MapZoomScrollControl(options); };
		map.addControl(new L.control.mapzoomscrollcontrol());
	};

	var setup = function(){
		window.plugin.scrollSleep.setupCSS();

		window.plugin.scrollSleep.checkStorage();
		window.plugin.scrollSleep.loadStorage();

		window.plugin.scrollSleep.generateControl();

		if(window.plugin.scrollSleep.status === false){
			window.plugin.scrollSleep.scrollOff();
		}
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

