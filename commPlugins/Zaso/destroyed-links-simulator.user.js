// ==UserScript==
// @author         Zaso
// @name           Destroyed Links Simulator
// @category       Layer
// @version        0.0.8.20200216.174029
// @description    Simulate the destruction of portal links: hide its links and fields.
// @id             destroyed-links-simulator@Zaso
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/destroyed-links-simulator.user.js
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/destroyed-links-simulator.meta.js
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
plugin_info.pluginId = 'destroyed-links-simulator';
//END PLUGIN AUTHORS NOTE



// PLUGIN START ////////////////////////////////////////////////////////
// History
// 0.0.8 Headers changed. Ready for IITC-CE
// 0.0.7 Original sript


	// use own namespace for plugin
	window.plugin.destroyedLinks = function(){};

	window.plugin.destroyedLinks.util = {};
	window.plugin.destroyedLinks.data = {};
	window.plugin.destroyedLinks.layer = {};
	window.plugin.destroyedLinks.cross = {};
	window.plugin.destroyedLinks.ui = {};
	window.plugin.destroyedLinks.action = {};

	window.plugin.destroyedLinks.listDestroyed = [];
	window.plugin.destroyedLinks.markerLayers = {};
	window.plugin.destroyedLinks.portalsInfo = {};

	window.plugin.destroyedLinks.obj = {listGuids: window.plugin.destroyedLinks.listDestroyed};
	window.plugin.destroyedLinks.storage = {};
	window.plugin.destroyedLinks.bkmrk = {};

	//-------------------------------------------------------------
	// STORAGE
	//-------------------------------------------------------------
	window.plugin.destroyedLinks.storage.NAME = 'plugin-destroylinksimulator';

	window.plugin.destroyedLinks.storage.save = function(){ window.localStorage[window.plugin.destroyedLinks.storage.NAME] = JSON.stringify(window.plugin.destroyedLinks.obj); }
	window.plugin.destroyedLinks.storage.load = function(){
		window.plugin.destroyedLinks.obj = JSON.parse(window.localStorage[window.plugin.destroyedLinks.storage.NAME]);
		window.plugin.destroyedLinks.listDestroyed = window.plugin.destroyedLinks.obj['listGuids'];
	}

	window.plugin.destroyedLinks.storage.reset = function(){
		window.plugin.destroyedLinks.obj = {listGuids: []};
		// window.plugin.destroyedLinks.storage.save();
		// window.plugin.destroyedLinks.ui.getHTMLdialogMain();
		// window.plugin.destroyedLinks.ui.updateDialogBkmrks();
		// window.plugin.destroyedLinks.listDestroyed = [];
		// window.plugin.destroyedLinks.markerLayers = {};
		// window.plugin.destroyedLinks.portalsInfo = {};
	}
	window.plugin.destroyedLinks.storage.delete = function(){ delete window.localStorage[window.plugin.destroyedLinks.storage.NAME]; }
	window.plugin.destroyedLinks.storage.check = function(){
		if(!window.localStorage[window.plugin.destroyedLinks.storage.NAME]){
			window.plugin.destroyedLinks.storage.reset();
		}
		window.plugin.destroyedLinks.storage.load();
	}

	//-------------------------------------------------------------
	// UTIL functions
	//-------------------------------------------------------------
	window.plugin.destroyedLinks.util.getPortalLinks = function(guid){
		if(guid === undefined){ var guid = window.selectedPortal; }

		var linkGuids = getPortalLinks(guid);
		var linkGuids = linkGuids.in.concat(linkGuids.out);
		return linkGuids;
	}
	window.plugin.destroyedLinks.util.getPortalFields = function(guid){
		if(guid === undefined){ var guid = window.selectedPortal; }

		var fieldGuids = getPortalFields(guid);
		return fieldGuids;
	}

	window.plugin.destroyedLinks.util.generateID = function(){
		return 'uuid-'+((new Date).getTime().toString(16)+Math.floor(1E7*Math.random()).toString(16));
	}

	window.plugin.destroyedLinks.util.getMarkerUrl = function(type){
		switch(type){
			case 'red':
				var markUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAoCAMAAACo9wirAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAADbUExURQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIoRDgMAAAoAAH8CAlYAAEQAACcAAJIbF4QHBiIAAGcAAKEuKVwAAFEAALFKO6pAM5omILxZSAgAACsAADIAAFgAAG4AALlLQ3oAAGUAANASDNIiC9EcCthJENMpCd5oIeFyM+J6P9tbBNlIH9UzE9xYGs1pU8VkTtxVVtUsJeBrR8hZV8xhOdN8WNpPLeGEU+GLX9g4OtxpWdg9Htp6UdZVO91bPd1iEd9vJ9EZGt5lNtlDONZDBc91Xt10e+zkDyQAAAAkdFJOUwAaFSgQLwwCByDmNz/heHFL6uNan/CGmvb07PxsgJForPvQvInMR+kAAAKfSURBVDjLbZTZlqIwEEBBFjHsoKK4j9OtwLCoCKKItr3Y//9FUyG4dtdLTqx7biplEYqCqNcFga3RDYbjRJHjmAZdYwWhXqeqgDzPQlpTxn8gxooGCMtfiSrPjVAn3UKkHTTi7gnsh7zSSgvPPZ1cr0hbCibglErA1hpcu1N4zts/iDfHKzptrgF1lAo4AOe7mUvymHCzLiZ4rMCCBjOyIe9cDM7JzWyFaZSKUiAaqXdyk8RzII/Xk5caIlFgAad0s5Mb6dOe5zheZEwX3inrQqFsCYBATl0nQcOB3Ntuz2g4nCaOm8qgwABfYzQ9c8JEt/p9eRGhQX+IEsfJdI2p8XVK4GlO6Xhh6BS2ZZqGrJoDFLlh6HUUjuYFCpfQXLjhLHRTuy1BqCjy8HZh4SIuwOxrFnpb2xRFST5nIWzdRfMO+CiBM9Iw0Nti4OMJmPlxhFRJ0yTT6MERD4DVi/EPaGCqyGibfWMC+7hX1cDTjNKNfT8xhv0BOm/htgN54vtxV2HwLco+oGLjH1rWEEVxXOiWhRJ/UyDSh7KT4+job6KWvDj6/jHXEWyP0bjqJC5CbcX+fnM4bPwgICs+4fJfQBGSnG8gtQ+C+Zysm9yQcAl4IIRyno6Qu0VwnOCJEchEsTSUme/nL9eY73OkcTRLgDqemGbvENyA4LCWRYaMHEXKNPV89fJaxcsq101SIlVNLSOO15834DMCAV0JKoVq56vXv2W8rpYt9SagqptOQUEALJDuBGTyoVnLFQFAoJR3vH29pFnr3TvOv+/Wj4JnxU/Bo+IXwVVhY8VqaZMr3ANEITZBAYKm+Cy4KEx9udstqyY+ApdHYLJcTq4f/g8F3ZCM729Dwo/Ls6BUAKF0ugp5nijqN6JGj0bwBN7n/wMkT2wKmO3vXQAAAABJRU5ErkJggg==';
				break;
			case 'green':
				var markUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAoCAMAAACo9wirAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAADGUExURQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAxMCQNCAQEsAAAaAAAAAAAZACpsKj6GPxVVEwI1AAEmAAIwACJjIQATAAEhADZ7N0iSSgAVABpdGQI3AAM5AAKQDgCLDAGEDk+mVQKVDRGbHDXBPB+8JzapPFezW0+bUgS1DTa5PwqqFBqkJDGcOxivIlilXUq5UUfBTRuRJyeoMFPEWSi+MA+IGwOlDVvHX1CwVw+5Fz2tRHG3dhKnHC2QNya0Ly89pccAAAAgdFJOUwAZHSozDCMHAxI/5OB+bC5e8PjnnnSN7FCd9PyG6sGsphhP9AAAApVJREFUOMttlGl7ojAQgBEQhRBO8b52I5BQRA6Pbq3W/v8/tRMC7Up3vmCeeZ93kplESYIYDgeDvi5riq1C2Iom6/3BYDiUmoB8X+9pioE3a9Ncb7ChaD1AWqLJq47vsTcI5vmO+i8Bfp7HLquiSxxfooq5mBNQpRXwvFdG8fsLxHsclR4nGgUvoNl4fm7yNXH2sK3xIrVAlxVrAvk4zkU+BsK1FFnnClEAsegS3Q5p/PISR5TCgiFRRKoFwby6RMRfL6pLHBG0TqJLNQ9qBQc01WRRTP3Z0ly8nRlaLtcUFKaqcQAqKNPVOc7pamZZZlIgbC0RjePzasprACAr2Kvy/ed1MnYcZFpTjEiU55WHFZkDumyPknS/36dsgg2IAJE0h2UytmETHFBHJN3/2efVfeKoqmEW509YpslIFYD2BRT+lAOLt2egMeQp8QNjahgOWpT5E2CPF+nHR5qgpRP4aOxYyOPrRbMHOIU1L7PsgGZwvuIOp12ajzwveafqY/Y0A7FTRt3ZDJGyZCv43vIT86cK70PdyQ2h2Ym4ZnLLMnpdIVhSshGd5LOwLbfMwhOlNNvt+PeUZaUb2M0soNeGyU4hjx1E/ePEkKH0xIXgNbB3q5NthDdvLCpIYt5TxLLd9it2Gd+i3AJ93swFDb+BkCZmc18ahe3413D7q4lteIWpNAJJXDpjkxy+gUNhtltsFJpqTa7HFjgSN2i32CoUY10ctr/r6Arqm6+pgUuOAgAB5oLB9+sVzUoOrzz/2hV0FT8Fz4rXQ9IViAfOD8IVRzKxuoKmF+oIFCAYqV1B84ShncXjUfiOLZ6t9FMx9gjhY/whEAp+9+53ZPA/l65ADLWn4fkci78nSfofocuW09Of8n8BSL1hctmNvVwAAAAASUVORK5CYII=';
				break;
			case 'blue':
				var markUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAoCAMAAACo9wirAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAADqUExURQAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAkpawASPQIfYBQ2dwAKIwAEDwAQNilOkAACCAAVREZxswANKzZfnx9DhQAXSwAZUjpoowATQAABBgAJIAAYTgAcWgBh7ABd7AWK7QJU7QFm7AZ87QBZ7DWc8E+CySaX7xiT7gtt7Rx+7xRy7i918A1d7R5n7xR67lGa3FmV0B6L7zyg8UiZ8lOL3TKT8BKF7lKJyjOF8CmC7zyR8Vmr7E6E7016vk6n8UuK8lWX7jaC4lOj5DmJ2DiDyzN2xFKC6HSY6G2k4cEGnMoAAABDdFJOUwARFQ4aITMDBgktKOR54ehZQ2zvPYf8k/XsmK72smyAotD///////////////////////////////////////////6SFyTYAAACsklEQVQ4y22U6XaiQBCFDYFWoVlVBNdMMgNBEBVlMaDGLcYs7/86U01jjCb1hwN1z3erqqsplSDK5Ur1lmE5gUcQvMCxzG21Ui6XiiD5G0irYvsPRFtUeY69OSuKPK/JnfAZIuzI2oWC5pFYC2eOC+HMwpqIqIICwJ9Djc4s9ry/EJ4XzzoNnoM6ckS5Anm+YRycPJ1LnIORKwgCADesoJkHx/VOBLA5mJoAJoDIAQiHseu8vhGI5xyPsRuHGFEEAfCisYXa5K6+dd04w91B7G4NkScIEABAmjnRq9zsSzp0iZvN7hH0EiBAAA6CIm8jDwS9nrTJcL/XxMco2sqKAB4gAIdOnKbuzGwqCpY0pY8zJ03jDngQAZTQ2jipnT7NzIaq1lUR8pGdOpsWFEEEHLobPNm2HSWfpoJQXQq3Ebw+DVqIuxKEMghUqPQXwdROVxkWVUVVFawnkT0lAmoBNeirKXzAfUWUcUPpYfK+0hu0BuhCqyW+/4abvT4OP6HbvvTm+4mh0S6qjKDive+/1LpNnCUJDLSLX31/L6sCU63QSbazxXQ5r0mDlT9dzGU8X/iLrE0nmZ8F8RgtX16W0+Ewf478pKYVZwFFCHVpvoTUaDi0LPpczrEqsHQhiEfDWI2sbzGCHqgD2SjwgDLH1v1XWNO9rFCHfGcB0dIXw7NguNhIiPRAt5aUqcj70f1DEfejHQA4CqBbK6D2YGGdBNZ4LtWLEgsEhzRzFzw85vEQ7MjFYKqnu0c7bQ/GEyqYXAHI5jPkZu2Cx38QjydA5Xx76bAAQQQEoH4HnBHrgAiC9TXgEjEZDy4rKH0NSzMJIlib2jWgQKC7zXgyGW/u0DWguMIwzvcgeC9O4VJw+gno67X+dfF/Irg6/viQ6twvgNOPSDQM8fzz+algWEVhmYv8f2bKbJ6hOQarAAAAAElFTkSuQmCC';
				break;
		}
		return markUrl;
	}

	window.plugin.destroyedLinks.util.isGuidInArr = function(guid){
		return window.plugin.destroyedLinks.listDestroyed.indexOf(guid);
	}

	window.plugin.destroyedLinks.util.countToDestroy = function(){
		return window.plugin.destroyedLinks.listDestroyed.length;
	}

	window.plugin.destroyedLinks.util.checkFriendPlugins = function(){
		if(window.plugin.drawTools === undefined){
			alert('"Destroyed Links Simulator" requires "draw-tools" to convert his markers in drawn markers.');
			return;
		}
	}

	//-------------------------------------------------------------
	// LAYER functions
	//-------------------------------------------------------------
	window.plugin.destroyedLinks.layer.showLink = function(lguid){
		if(!window.map.hasLayer(window.links[lguid])){
		   window.map.addLayer(window.links[lguid]);
		}
	}
	window.plugin.destroyedLinks.layer.hideLink = function(lguid){
		if(window.map.hasLayer(window.links[lguid])){
		   window.map.removeLayer(window.links[lguid]);
		}
	}

	window.plugin.destroyedLinks.layer.showField = function(fguid){
		if(!window.map.hasLayer(window.fields[fguid])){
		   window.map.addLayer(window.fields[fguid]);
		}
	}
	window.plugin.destroyedLinks.layer.hideField = function(fguid){
		if(window.map.hasLayer(window.fields[fguid])){
		   window.map.removeLayer(window.fields[fguid]);
		}
	}

	//*PORTAL: LINKS
	window.plugin.destroyedLinks.layer.showPortalLinks = function(guid){
		if(guid === undefined){ var guid = window.selectedPortal; }
		var linkGuids = window.plugin.destroyedLinks.util.getPortalLinks(guid);

		// LINKS
		for(var i in linkGuids){
			var lguid = linkGuids[i];

			window.plugin.destroyedLinks.layer.showLink(lguid);
		}
	}
	window.plugin.destroyedLinks.layer.hidePortalLinks = function(guid){
		if(guid === undefined){ var guid = window.selectedPortal; }
		var linkGuids = window.plugin.destroyedLinks.util.getPortalLinks(guid);

		// LINKS
		for(var i in linkGuids){
			var lguid = linkGuids[i];

			window.plugin.destroyedLinks.layer.hideLink(lguid);
		}
	}
	//*PORTAL: FIELDS
	window.plugin.destroyedLinks.layer.showPortalFields = function(guid){
		if(guid === undefined){ var guid = window.selectedPortal; }
		var fieldGuids = window.plugin.destroyedLinks.util.getPortalFields(guid);

		// FIELDS
		for(var i in fieldGuids){
			var fguid = fieldGuids[i]

			window.plugin.destroyedLinks.layer.showField(fguid);
		}
	}
	window.plugin.destroyedLinks.layer.hidePortalFields = function(guid){
		if(guid === undefined){ var guid = window.selectedPortal; }
		var fieldGuids = window.plugin.destroyedLinks.util.getPortalFields(guid);

		// FIELDS
		for(var i in fieldGuids){
			var fguid = fieldGuids[i]

			window.plugin.destroyedLinks.layer.hideField(fguid);
		}
	}
	//*PORTAL: LINKS and FIELDS
	window.plugin.destroyedLinks.layer.showLayer = function(guid){
		if(guid === undefined){ var guid = window.selectedPortal; }
		window.plugin.destroyedLinks.layer.showPortalLinks(guid);
		window.plugin.destroyedLinks.layer.showPortalFields(guid);
	}
	window.plugin.destroyedLinks.layer.hideLayer = function(guid){
		if(guid === undefined){ var guid = window.selectedPortal; }
		window.plugin.destroyedLinks.layer.hidePortalLinks(guid);
		window.plugin.destroyedLinks.layer.hidePortalFields(guid);
	}

	//*ALL PORTALS: LINKS
	window.plugin.destroyedLinks.layer.showAllLinks = function(){
		var list = window.plugin.destroyedLinks.listDestroyed;
		for(var index in list){
			var guid = list[index];
			window.plugin.destroyedLinks.layer.showPortalLinks(guid);
		}
	}
	window.plugin.destroyedLinks.layer.hideAllLinks = function(){
		var list = window.plugin.destroyedLinks.listDestroyed;
		for(var index in list){
			var guid = list[index];
			window.plugin.destroyedLinks.layer.hidePortalLinks(guid);
		}
	}
	//*ALL PORTALS: FIELDS
	window.plugin.destroyedLinks.layer.showAllFields = function(){
		var list = window.plugin.destroyedLinks.listDestroyed;
		for(var index in list){
			var guid = list[index];
			window.plugin.destroyedLinks.layer.showPortalFields(guid);
		}
	}
	window.plugin.destroyedLinks.layer.hideAllFields = function(){
		var list = window.plugin.destroyedLinks.listDestroyed;
		for(var index in list){
			var guid = list[index];
			window.plugin.destroyedLinks.layer.hidePortalFields(guid);
		}
	}
	//*ALL PORTALS: LINKS and FIELDS
	window.plugin.destroyedLinks.layer.showAllLayers = function(){
		var list = window.plugin.destroyedLinks.listDestroyed;
		for(var index in list){
			var guid = list[index];
			window.plugin.destroyedLinks.layer.showLayer(guid);
		}
		window.Render.prototype.bringPortalsToFront();
	}
	window.plugin.destroyedLinks.layer.hideAllLayers = function(){
		var list = window.plugin.destroyedLinks.listDestroyed;
		for(var index in list){
			var guid = list[index];
			window.plugin.destroyedLinks.layer.hideLayer(guid);
		}
	}

	window.plugin.destroyedLinks.data.addToList = function(guid){
		if(guid === undefined){ var guid = window.selectedPortal; }
		var ind = window.plugin.destroyedLinks.util.isGuidInArr(guid);
		if(ind < 0){ window.plugin.destroyedLinks.listDestroyed.push(guid); }
	}
	window.plugin.destroyedLinks.data.removeFromList = function(guid){
		if(guid === undefined){ var guid = window.selectedPortal; }
		var ind = window.plugin.destroyedLinks.util.isGuidInArr(guid);
		if(ind >= 0){ window.plugin.destroyedLinks.listDestroyed.splice(ind, 1); }
	}

	//-------------------------------------------------------------
	// CROSS-LINK support
	//-------------------------------------------------------------
	window.plugin.destroyedLinks.cross.removeCrossLink = function(lguid){
		if(window.plugin.crossLinks !== undefined && window.overlayStatus['Cross Links']){
			var crossLinkLayer = window.plugin.crossLinks.linkLayerGuids[lguid];
			if(window.plugin.crossLinks.linkLayer.hasLayer(crossLinkLayer)){
				window.plugin.crossLinks.linkLayer.removeLayer(crossLinkLayer);
			}
		}
	}
	window.plugin.destroyedLinks.cross.removeCrossPortal = function(guid){
		if(window.plugin.crossLinks !== undefined && window.overlayStatus['Cross Links']){
			var linkGuids = window.plugin.destroyedLinks.util.getPortalLinks(guid);
			for(i in linkGuids){
				var lguid = linkGuids[i];
				window.plugin.destroyedLinks.cross.removeCrossLink(lguid);
			}
		}
	}
	window.plugin.destroyedLinks.cross.removeCrossAll = function(){
		if(window.plugin.crossLinks !== undefined && window.overlayStatus['Cross Links']){
			var list = window.plugin.destroyedLinks.listDestroyed;
			for(i in list){
				var guid = list[i];
				window.plugin.destroyedLinks.cross.removeCrossPortal(guid);
			}
		}
	}

	window.plugin.destroyedLinks.cross.restoreCrossAll = function(){
		if(window.plugin.crossLinks !== undefined && window.overlayStatus['Cross Links']){
			window.plugin.crossLinks.checkAllLinks();
		}
	}

	window.plugin.destroyedLinks.cross.hookDrawTools = function(e){
		if(window.plugin.crossLinks !== undefined && window.overlayStatus['Cross Links']){
			if(e.event == 'layerCreated'){
				// we can just test the new layer in this case
				window.plugin.crossLinks.testAllLinksAgainstLayer(e.layer);
			}else{
				// all other event types - assume anything could have been modified and re-check all links
				// window.plugin.crossLinks.checkAllLinks();
				window.plugin.destroyedLinks.cross.removeCrossAll();
			}
		}
	}

	//-------------------------------------------------------------
	// BOOKMARKS GENERATOR
	// PORTALS INFO (utils for exports as bookmarks)
	//-------------------------------------------------------------
	window.plugin.destroyedLinks.bkmrk.removeFromObj = function(guid){
		if(guid === undefined) guid = window.selectedPortal;
		if(guid === undefined) return false;
		delete window.plugin.destroyedLinks.portalsInfo[guid];
	}
	window.plugin.destroyedLinks.bkmrk.generateBookmarkedPortal = function(guid){
		if(guid === undefined) guid = window.selectedPortal;
		if(guid === undefined) return false;

		var portalLayer = window.portals[guid];
		if(portalLayer){
			var p = portalLayer.options;

			var bkmrk = {
				guid: p.guid,
				title: p.data.title,
				ll: {lat: (p.data.latE6/1E6), lng: (p.data.lngE6/1E6)},
			};

			window.plugin.destroyedLinks.portalsInfo[guid] = bkmrk;
			return true;

			var info = {
				guid: p.guid,
				image: p.data.image,
				latE6: p.data.latE6,
				lngE6: p.data.lngE6,
				team: p.data.team,
				title: p.data.title,
				resCount: p.data.resCount,
				health: p.data.health,
				level: p.data.level,
			};

			return bkmrk;
		// }else{
		// 	window.plugin.destroyedLinks.portalsInfo[guid] = {guid:guid, title: 'untitled', };
		// 	return true;
		}

		return false;
	}
	window.plugin.destroyedLinks.bkmrk.generateBkmrksJSON = function(){
		var list = window.plugin.destroyedLinks.portalsInfo;

		var objB = {};
		objB.maps = {idOthers:{label:'Others',state:1,bkmrk:{}}};
		objB.portals = {idOthers:{label:'Others',state:1,bkmrk:{}}};

		var idFolder = window.plugin.destroyedLinks.util.generateID();
		objB.portals[idFolder] = {
			label: '[Destroy Links simulator]',
			state: 1,
			bkmrk:{}
		};

		for(guid in list){
			var b = list[guid];
			var idBkmrk = window.plugin.destroyedLinks.util.generateID();

			objB.portals[idFolder].bkmrk[idBkmrk] = {
				guid: b.guid,
				label: b.title,
				latlng: b.ll.lat+','+b.ll.lng,
			};
		}

		return objB;
	}

	//-------------------------------------------------------------
	// ACTIONS
	//-------------------------------------------------------------
	window.plugin.destroyedLinks.action.destroyPortal = function(guid){
		if(guid === undefined){ var guid = window.selectedPortal; }

		// already marks as todestroy
		if(window.plugin.destroyedLinks.util.isGuidInArr(guid) > -1) return false;

		// If not is in the iitc portals data stop
		if(! window.portals[guid]) return false;

		window.plugin.destroyedLinks.data.addToList(guid);

		if(window.overlayStatus['Destroyed Links Simulator']){
			window.plugin.destroyedLinks.layer.hideLayer(guid);
		}

		window.plugin.destroyedLinks.ui.toggleButton(guid);
		window.plugin.destroyedLinks.ui.addMarker(guid);
		window.plugin.destroyedLinks.bkmrk.generateBookmarkedPortal(guid);

		// window.plugin.destroyedLinks.storage.save();
		window.plugin.destroyedLinks.ui.updateDialogMain();
		window.plugin.destroyedLinks.ui.updateDialogBkmrks();
		window.plugin.destroyedLinks.ui.updateCountToDestroy();

		//cross-link support
		window.plugin.destroyedLinks.cross.removeCrossPortal(guid);
	}
	window.plugin.destroyedLinks.action.regeneratePortal = function(guid){
		if(guid === undefined){ var guid = window.selectedPortal; }
		if(window.plugin.destroyedLinks.util.isGuidInArr(guid) === -1) return false;

		if(window.overlayStatus['Destroyed Links Simulator']){
			window.plugin.destroyedLinks.layer.showAllLayers();
			window.plugin.destroyedLinks.data.removeFromList(guid);
			window.plugin.destroyedLinks.layer.hideAllLayers();
		}else{
			window.plugin.destroyedLinks.data.removeFromList(guid);
		}

		window.plugin.destroyedLinks.bkmrk.removeFromObj(guid);
		window.plugin.destroyedLinks.ui.toggleButton(guid);
		window.plugin.destroyedLinks.ui.removeMarker(guid);
		// window.plugin.destroyedLinks.storage.save();
		window.plugin.destroyedLinks.ui.updateDialogMain();
		window.plugin.destroyedLinks.ui.updateDialogBkmrks();
		window.plugin.destroyedLinks.ui.updateCountToDestroy();

		//cross-link support
		window.plugin.destroyedLinks.cross.restoreCrossAll();
		window.plugin.destroyedLinks.cross.removeCrossAll();
	}
	window.plugin.destroyedLinks.action.regenerateAllPortals = function(){
		if(window.overlayStatus['Destroyed Links Simulator']){
			window.plugin.destroyedLinks.layer.showAllLayers();
			window.plugin.destroyedLinks.listDestroyed = [];
			window.plugin.destroyedLinks.portalsInfo = {};
			window.plugin.destroyedLinks.layer.hideAllLayers();
		}else{
			window.plugin.destroyedLinks.listDestroyed = [];
			window.plugin.destroyedLinks.portalsInfo = {};
		}

		window.plugin.destroyedLinks.ui.toggleButton();
		window.plugin.destroyedLinks.ui.removeAllMarkers();
		// window.plugin.destroyedLinks.storage.save();
		window.plugin.destroyedLinks.ui.updateDialogMain();
		window.plugin.destroyedLinks.ui.updateDialogBkmrks();
		window.plugin.destroyedLinks.ui.updateCountToDestroy();

		//cross-link support
		window.plugin.destroyedLinks.cross.restoreCrossAll();
	}
	window.plugin.destroyedLinks.action.convertInDraw = function(){
		if(window.plugin.drawToolsPlus !== undefined){
			for(guid in window.plugin.destroyedLinks.markerLayers){
				var mark = window.plugin.destroyedLinks.markerLayers[guid];

				var markClasses = mark.options.icon.options.className;
				var markColor = markClasses.split(' ')[1];
				var latLng = mark.getLatLng();

				var color = '';
				switch(markColor){
					case 'red':
						color = '#D81313';
						break;
					case 'green':
						color= '#139A13';
						break;
					case 'blue':
						color = '#134ED8';
						break;
				}

				var markExtra = {icon: window.plugin.drawTools.getMarkerIcon(color) };
				layer = L.marker(latLng, L.extend({}, window.plugin.drawTools.markerOptions, markExtra));

				window.registerMarkerForOMS(layer);
				window.plugin.drawTools.drawnItems.addLayer(layer);

				window.plugin.drawTools.save();
				if(layer instanceof L.Marker){
					window.registerMarkerForOMS(layer);
				}
				runHooks('pluginDrawTools',{event:'layerCreated',layer:layer});
			}
		}else{
			dialog({
				title: 'Destroyed Links Simulator',
				html: '<div class="dlsMsg">"<i>Draw Tools Plus</i>" plugin is required. You can find it <a href="https://tiny.cc/ZasoItems" target="_BLANK">here</a></div>',
				dialogClass: 'ui-dialog-dls',
				minWidth:200,
			});
		}
	}

	window.plugin.destroyedLinks.restoreLayersListener = function(){
		if(window.plugin.destroyedLinks.listDestroyed.length < 1){
			return false;
		}

		window.plugin.destroyedLinks.layer.showAllLayers();

		if(window.overlayStatus['Links']){
			for(lguid in window.links){
				var lay = window.links[lguid];
				var team = lay.options.data.team;

				if(
					(team === 'E' && !window.overlayStatus['Enlightened'])
					||
					(team === 'R' && !window.overlayStatus['Resistance'])
				){
					window.plugin.destroyedLinks.layer.hideLink(lguid);
				}
			}
		}else{
			window.plugin.destroyedLinks.layer.hideAllLinks();
		}

		if(window.overlayStatus['Fields']){
			for(fguid in window.fields){
				var lay = window.fields[fguid];
				var team = lay.options.data.team;

				if(
					(team === 'E' && !window.overlayStatus['Enlightened'])
					||
					(team === 'R' && !window.overlayStatus['Resistance'])
				){
					window.plugin.destroyedLinks.layer.hideField(fguid);
				}
			}
		}else{
			window.plugin.destroyedLinks.layer.hideAllFields();
		}
	}

	window.plugin.destroyedLinks.mapRefresh = function(){
		if(window.overlayStatus['Destroyed Links Simulator']){
			window.plugin.destroyedLinks.restoreLayersListener();
			window.plugin.destroyedLinks.layer.hideAllLayers();
			// cross-links suport
			window.plugin.destroyedLinks.cross.removeCrossAll();
		}
	}

	//-------------------------------------------------------------
	// MARKERS - Layer Group
	//-------------------------------------------------------------
	window.plugin.destroyedLinks.ui.addMarker = function(guid){
		if(guid === undefined){ var guid = window.selectedPortal; }

		var factionPlayer = window.PLAYER.team[0];
		var factionPortal = window.portals[guid].options.data.team;
		if(factionPlayer === 'E' && factionPortal === 'E'){ 
			var typeMarker = 'blue';
		}
		else if(factionPlayer === 'R' && factionPortal === 'R'){ 
			var typeMarker = 'green';
		}else{
			var typeMarker = 'red';
		}

		var ll = window.portals[guid].getLatLng();
		var markIMG = window.plugin.destroyedLinks.util.getMarkerUrl(typeMarker);

		var opt = {
			title: 'Portal Destroyed',
			icon: L.icon({
				iconUrl: markIMG,
				iconAnchor: [15,40],
				iconSize: [30,40],
				className: 'destroyPin '+typeMarker
			})
		};
		var mark = L.marker(ll, opt);

		mark.on('dblclick', function(e){
			window.plugin.destroyedLinks.action.regeneratePortal(guid);
		});

		// Spiderfy
		window.registerMarkerForOMS(mark);
		//window.oms.unspiderfy();
		mark.on('spiderfiedclick', function(){ renderPortalDetails(guid); });

		window.plugin.destroyedLinks.markerLayers[guid] = mark;
		mark.addTo(window.plugin.destroyedLinks.layerGroup);
	}
	window.plugin.destroyedLinks.ui.removeMarker = function(guid){
		if(guid === undefined){ var guid = window.selectedPortal; }

		var pLayer = window.plugin.destroyedLinks.markerLayers[guid];
		window.plugin.destroyedLinks.layerGroup.removeLayer(pLayer);
		delete window.plugin.destroyedLinks.markerLayers[guid];
	}
	window.plugin.destroyedLinks.ui.removeAllMarkers = function(){
		for(guid in window.plugin.destroyedLinks.markerLayers){
			window.plugin.destroyedLinks.ui.removeMarker(guid);
		}
	}

	//-------------------------------------------------------------
	// UI: Sidebar & Toolbox & Dialog
	//-------------------------------------------------------------
	window.plugin.destroyedLinks.ui.addToSidebar = function(){
		if(typeof(Storage) === "undefined") {
			alert('Your brwoser not support the local storage');
			return false;
		}
		var hid_1 = '';
		var hid_2 = 'hidden';
		var guid = window.selectedPortal;
		var is = window.plugin.destroyedLinks.util.isGuidInArr(guid);
		if(is >= 0){
			hid_1 = 'hidden';
			hid_2 = '';
		}

		var label = 'Destroy';
		var guid = window.selectedPortal;
		var factionPlayer = window.PLAYER.team[0];
		var factionPortal = window.portals[guid].options.data.team;

		if(factionPlayer === 'E' && factionPortal === 'E'){ 
			label = 'Ada';
		}
		else if(factionPlayer === 'R' && factionPortal === 'R'){ 
			label = 'Jarvis';
		}else if(factionPortal === 'N'){
			label = 'Is Neutral';
		}

		var actionHTML = '';
		actionHTML += '<div class="destroy_toggle">';
			actionHTML += '<a class="desOne '+hid_1+'" onclick="window.plugin.destroyedLinks.action.destroyPortal();return false;" title="Hide portal links and fields">'+label+'</a> ';
			actionHTML += '<a class="regOne '+hid_2+'" onclick="window.plugin.destroyedLinks.action.regeneratePortal();return false;" title="Restore portal links and fields ">Regenerate</a>';
			actionHTML += '<a class="regAll" onclick="window.plugin.destroyedLinks.action.regenerateAllPortals();return false;" title="Restore all links and fields">Reset All</a>';
			actionHTML += '<a class="convDr" onclick="window.plugin.destroyedLinks.action.convertInDraw();return false;" title="Convert all markers in Draw">Drawnize All</a>';
			actionHTML += '<div style="clear:both;"></div>';
		actionHTML += '</div>';
		$('#portaldetails > .imgpreview').after(actionHTML);
		window.plugin.destroyedLinks.ui.updateCountToDestroy();

		if(!window.overlayStatus['Destroyed Links Simulator']){
			$('.destroy_toggle').addClass('hidden');
		}else{
			$('.destroy_toggle').removeClass('hidden');
		}
	}

	window.plugin.destroyedLinks.ui.updateCountToDestroy = function(){
		var countToDestroy = window.plugin.destroyedLinks.util.countToDestroy();
		var count_html = (countToDestroy > 0)? ' ('+countToDestroy+')' : '';

		$('.regAll').html('Reset All'+count_html);
	}

	window.plugin.destroyedLinks.ui.toggleButton = function(guid){
		if(guid === undefined){ var guid = window.selectedPortal; }

		var is = window.plugin.destroyedLinks.util.isGuidInArr(guid);

		// not change the button if the portal destroy is not the portal selected (util for destroy by code)
		if(guid !== window.selectedPortal) return false;

		$('.destroy_toggle a.hidden').removeClass('hidden');
		if(is < 0){
			$('.destroy_toggle a.regOne').addClass('hidden');
		}else{
			$('.destroy_toggle a.desOne').addClass('hidden');
		}
	}

	window.plugin.destroyedLinks.ui.appendToToolbox = function(){
		$('#toolbox').append('<a onclick="window.plugin.destroyedLinks.ui.openDialogMain(); return false;">Destroy simulator</a>');
	}

	window.plugin.destroyedLinks.ui.openDialogMain = function(){
		var html = window.plugin.destroyedLinks.ui.getHTMLdialogMain();

		dialog({
			title: 'DLS - List',
			html: '<div class="dlsList">'+html+'</div>',
			dialogClass: 'ui-dialog-dls',
			minWidth: 300,
			buttons:{
				'BKMRKS': function(){
					window.plugin.destroyedLinks.ui.openDialogBkmrks();
				},
				// 'UPDATE': function(){
				// 	window.plugin.destroyedLinks.ui.updateDialogMain();
				// }
			}
		});
	}

	window.plugin.destroyedLinks.ui.getHTMLdialogMain = function(){
		var list = window.plugin.destroyedLinks.portalsInfo;

		var html = '';
		html += 'Portal(s) to destroy: '+window.plugin.destroyedLinks.util.countToDestroy();
		html += '<ol>';
		for(var guid in list){
			var v = list[guid];
			var ll = v.ll;
			var title = v.title;

			if(guid !== null){
				if(title !== 'untitled'){
					var label = title;
				}else{
					var p = window.portals[guid];
					var label = '[Title not avaible]';
				}
				html += '<li>';
					html += '<a class="btn btn-delete" onclick="window.plugin.destroyedLinks.action.regeneratePortal(\''+guid+'\');return false;">X</a> ';
					html += '<a onclick="window.zoomToAndShowPortal(\''+guid+'\', ['+ll.lat+','+ll.lng+']);return false;">'+label+'</a>';
				html += '</li>';
			}else{
				var label = '['+ll.lat+','+ll.lng+']';
				html += '<li><a onclick="map.setView(['+ll.lat+','+ll.lng+']);return false;">'+label+'</a></li>';
			}
		}
		html += '</ol>';

		return html;
	}

	window.plugin.destroyedLinks.ui.updateDialogMain = function(){
		var html = window.plugin.destroyedLinks.ui.getHTMLdialogMain();
		$('.dlsList').html(html);
	}

	window.plugin.destroyedLinks.ui.openDialogBkmrks = function(){
		var html = window.plugin.destroyedLinks.ui.getHTMLdialogBkmrks();

		dialog({
			title: 'DLS - Generate Bookmarks',
			html: '<div class="dlsBkmrks">'+html+'</div>',
			dialogClass: 'ui-dialog-dls',
			minWidth: 300,
			// buttons:{
			// 	'UPDATE': function(){
			// 		window.plugin.destroyedLinks.ui.updateDialogBkmrks();
			// 	}
			// }
		});
	}

	window.plugin.destroyedLinks.ui.getHTMLdialogBkmrks = function(){
		var bJSON = window.plugin.destroyedLinks.bkmrk.generateBkmrksJSON();
		return 'Portal(s) to destroy: '+window.plugin.destroyedLinks.util.countToDestroy()
				+'<textarea onclick="event.target.select();" readonly>'+JSON.stringify(bJSON)+'</textarea>';
	}

	window.plugin.destroyedLinks.ui.updateDialogBkmrks = function(){
		var html = window.plugin.destroyedLinks.ui.getHTMLdialogBkmrks();
		$('.dlsBkmrks').html(html);
	}

	//-------------------------------------------------------------
	// Append the stylesheet
	//-------------------------------------------------------------
	window.plugin.destroyedLinks.setupCSS = function(){
		$('<style>').prop('type', 'text/css').html(''
			+'.destroy_toggle{ display:block !important; width:96%; margin:7px auto 5px; }'
			+'.destroy_toggle a{ display:block; float:left; width:31.8%; border:1px solid #ffce00; text-align:center; background:rgba(0,0,0,.3); box-sizing:border-box; padding:2px 0; }'
			+'.destroy_toggle a.hidden{ display:none; }'
			+'.destroy_toggle a.regAll, .destroy_toggle a.convDr{ margin-left:2%; }'
			+'.destroy_toggle.hidden{display:none !important;}'

			+'.dlsBkmrks ul{margin:0;padding-left:15px;}'
			+'.dlsBkmrks textarea{resize:vertical;width:95%;height:46px;margin-bottom:15px;}'

			+'.ui-dialog-dls .ui-dialog-buttonpane .ui-dialog-buttonset button:first-child{ display:none; }'
			+'.ui-dialog-dls .ui-dialog-buttonpane .ui-dialog-buttonset button{ margin:0 3px; cursor:pointer; }'
			+'.ui-dialog-dls .btn.btn-delete{ color:#ff6666; padding:0 5px; border: 1px solid #ff6666; margin-right: 2px; }'
			+'.ui-dialog-dls .btn.btn-delete:hover{ color:#222; background:#ff6666; }'
			+'.ui-dialog-dls .dlsList li{ margin-bottom:3px; }'
		).appendTo('head');
	}

	//*****************************

	var setup = function(){
		// window.plugin.destroyedLinks.util.checkFriendPlugins();
		// window.plugin.destroyedLinks.storage.check();
		window.plugin.destroyedLinks.setupCSS();

		window.plugin.destroyedLinks.layerGroup = new L.LayerGroup();
		window.addLayerGroup('Destroyed Links Simulator', window.plugin.destroyedLinks.layerGroup, true);

		window.addHook('portalDetailsUpdated', window.plugin.destroyedLinks.ui.addToSidebar);
		window.addHook('mapDataRefreshEnd', window.plugin.destroyedLinks.mapRefresh);

		window.map.on('overlayadd overlayremove', function(e){
			if(e.name === 'Destroyed Links Simulator'){
				if(e.type === 'overlayadd'){
					$('.destroy_toggle').removeClass('hidden');
					window.plugin.destroyedLinks.cross.removeCrossAll();
				}
				else if(e.type === 'overlayremove'){
					$('.destroy_toggle').addClass('hidden');
					window.plugin.destroyedLinks.cross.restoreCrossAll();
				}
			}

			if(window.plugin.destroyedLinks.listDestroyed.length > 0){
				// crosslinks support
				if(e.name === 'Cross Links'){
					window.plugin.destroyedLinks.cross.removeCrossAll();
					if(e.type === 'overlayadd' && !window.overlayStatus['Destroyed Links Simulator']){
						window.plugin.destroyedLinks.cross.restoreCrossAll();
					}
				}

				if(e.name === 'Destroyed Links Simulator'){
					if(e.type === 'overlayadd'){
						window.plugin.destroyedLinks.layer.hideAllLayers();
					}else if(e.type === 'overlayremove'){
						window.plugin.destroyedLinks.restoreLayersListener();
					}
				}

				if(window.overlayStatus['Destroyed Links Simulator']){
					if(
						   e.name === 'Links'
						|| e.name === 'Fields'
						|| e.name === 'Resistance'
						|| e.name === 'Enlightened'
					){
						window.plugin.destroyedLinks.layer.hideAllLayers();
					}
				}
			}
		});

		window.plugin.destroyedLinks.ui.appendToToolbox();

		// this plugin also needs to create the draw-tools hook, in case it is initialised before draw-tools
		if(window.plugin.drawToolsPlus !== undefined && window.plugin.crossLinks != undefined){
			window.pluginCreateHook('pluginDrawTools');
			window.addHook('pluginDrawTools', window.plugin.destroyedLinks.cross.hookDrawTools);
		}
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

