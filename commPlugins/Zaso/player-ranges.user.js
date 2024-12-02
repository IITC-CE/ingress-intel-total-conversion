// ==UserScript==
// @author         Zaso
// @name           Player Ranges
// @category       Layer
// @version        0.3.1.20210103.154230
// @description    Add one or more player markers and his ranges (hack/deploy range and xmp ranges) on the map.
// @id             player-ranges@Zaso
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/player-ranges.user.js
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/player-ranges.meta.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'ZasoItems';
plugin_info.dateTimeVersion = '2021-01-03-154230';
plugin_info.pluginId = 'player-ranges';
//END PLUGIN AUTHORS NOTE



// PLUGIN START ////////////////////////////////////////////////////////
// History
// 0.3.1 Headers changed. Ready for IITC-CE
// 0.3.0 Original sript


	// use own namespace for plugin
	window.plugin.playerRanges = function(){};

	window.plugin.playerRanges.storage = {};
	window.plugin.playerRanges.obj = {};
	window.plugin.playerRanges.data = {};
	window.plugin.playerRanges.ui = {};
	window.plugin.playerRanges.getHtml = {};
	window.plugin.playerRanges.layer = {};
	window.plugin.playerRanges.action = {};
	window.plugin.playerRanges.control = {};
	window.plugin.playerRanges.mpe = {};
	window.plugin.playerRanges.override = {};
	window.plugin.playerRanges.userLocation = {};
	window.plugin.playerRanges.dialog = {};
	window.plugin.playerRanges.hook = {};

//	window.plugin.playerRanges.obj.rangeVal = [window.HACK_RANGE, 42, 48, 58, 72, 90, 112, 138, 168];
	window.plugin.playerRanges.obj.rangeVal = [40, 42, 48, 58, 72, 90, 112, 138, 168];
	window.plugin.playerRanges.obj.rangeRecharge = [0, 250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000, 3250, 3500, 3750, 4000];
	window.plugin.playerRanges.obj.rangeName = ['hack', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'mark', 'recharge', 'jolly'];
	window.plugin.playerRanges.obj.settings = {dashArr:[7,7], weight:1.5, opacity:0.7 }
	window.plugin.playerRanges.obj.main = {opt:{hack:1,L1:1,L2:1,L3:1,L4:1,L5:1,L6:1,L7:1,L8:1,recharge:0,label:1,jolly:0}, markers:{}};

	window.plugin.playerRanges.obj.layerGroup = {};
	window.plugin.playerRanges.obj.playersLayers = {};
	window.plugin.playerRanges.obj.rangesLayers = {};

	//======================================================================
	// STORAGE FUNCTIONS
	//======================================================================
	window.plugin.playerRanges.storage.NAME = 'plugin-playerRanges';
	window.plugin.playerRanges.storage.save = function(){
		window.localStorage[window.plugin.playerRanges.storage.NAME] = JSON.stringify(window.plugin.playerRanges.obj.main);
	}
	window.plugin.playerRanges.storage.load = function(){
		window.plugin.playerRanges.obj.main = JSON.parse(window.localStorage[window.plugin.playerRanges.storage.NAME]);
	}
	window.plugin.playerRanges.storage.get = function(){
		return window.localStorage[window.plugin.playerRanges.storage.NAME];
	}
	window.plugin.playerRanges.storage.reset = function(){
		window.plugin.playerRanges.obj.main = {opt:{hack:1,L1:1,L2:1,L3:1,L4:1,L5:1,L6:1,L7:1,L8:1,recharge:0,label:1,jolly:0}, markers:{}};
		window.plugin.playerRanges.storage.save();
	}
	window.plugin.playerRanges.storage.check = function(){
		if(!window.localStorage[window.plugin.playerRanges.storage.NAME]){
			window.plugin.playerRanges.storage.reset();
		}
		window.plugin.playerRanges.storage.load();

		if(window.plugin.playerRanges.obj.main.opt === undefined){
			window.plugin.playerRanges.storage.isOldVersion();
		}
		if(window.plugin.playerRanges.obj.main.opt.recharge === undefined){
			window.plugin.playerRanges.obj.main.opt.recharge = 0;
			window.plugin.playerRanges.storage.save();
		}
	}
	window.plugin.playerRanges.storage.isOldVersion = function(){
		window.plugin.playerRanges.storage.reset();
	}

	//======================================================================
	// DATA
	//======================================================================
	window.plugin.playerRanges.data.generateID = function(){
		return 'uuid-'+((new Date).getTime().toString(16)+Math.floor(1E7*Math.random()).toString(16));
	}
	window.plugin.playerRanges.data.getMyFaction = function(){
		return window.PLAYER.team;
	}
	window.plugin.playerRanges.data.validateName = function(name){
		var name = name.toString();
		var pattern = new RegExp(/^[a-zA-Z0-9_\-\ \(\)\[\]]/);
		for(i=0; i<name.length; i++){
			if(!pattern.test(name[i])){
				return false;
			}
		}
		return true;
	}

	window.plugin.playerRanges.data.getPlayers = function(){
		return window.plugin.playerRanges.obj.main.markers;
	}
	window.plugin.playerRanges.data.getPlayer = function(idPlayer){
		var players = window.plugin.playerRanges.data.getPlayers();
		var player = players[idPlayer];
		return (player)? player : false;
	}
	window.plugin.playerRanges.data.getIDplayersByLabel = function(label){
		var players = window.plugin.playerRanges.data.getPlayers();
		var withLabelInserted = [];

		for(idPlayer in players){
			var player = players[idPlayer];
			var labelPlayer = player.label;
			if(labelPlayer === label){
				withLabelInserted.push(idPlayer);
			}
		}
		return withLabelInserted;
	}

	window.plugin.playerRanges.data.setPlayerLabel = function(idPlayer, label){
		var player = window.plugin.playerRanges.data.getPlayer(idPlayer);
		player.label = label;
	}
	window.plugin.playerRanges.data.getPlayerLabel = function(idPlayer){
		var player = window.plugin.playerRanges.data.getPlayer(idPlayer);
		return (player)? player.label : false;
	}

	window.plugin.playerRanges.data.setPlayerLevel = function(idPlayer, level = 0){
		var player = window.plugin.playerRanges.data.getPlayer(idPlayer);

		if(level >= 0 && level <= 16){
			player.level = Number(level);
		}else{
			player.level = 0;
		}
	}
	window.plugin.playerRanges.data.getPlayerLevel = function(idPlayer){
		var player = window.plugin.playerRanges.data.getPlayer(idPlayer);
		return (player)? player.level : false;
	}

	window.plugin.playerRanges.data.setPlayerJolly = function(idPlayer, jolly = 0){
		var player = window.plugin.playerRanges.data.getPlayer(idPlayer);
		player.jolly = (jolly >= 0)? Number(jolly) : 0;
	}
	window.plugin.playerRanges.data.getPlayerJolly = function(idPlayer){
		var player = window.plugin.playerRanges.data.getPlayer(idPlayer);
		return (player)? player.jolly : false;
	}

	window.plugin.playerRanges.data.getRangeNameByIndex = function(rangeIndex){
		if(rangeIndex == 10){ return 'recharge'; }
		else if(rangeIndex == 11){ return 'jolly'; }
		else if(rangeIndex == 12){ return 'label'; }
		var rangeName = window.plugin.playerRanges.obj.rangeName[rangeIndex];
		return (rangeName)? rangeName : false;
	}
	window.plugin.playerRanges.data.getRangeIndexByName = function(rangeName){
		if(rangeIndex == 'recharge'){ return 10; }
		else if(rangeIndex == 'jolly'){ return 11; }
		else if(rangeIndex == 'label'){ return 12; }
		var rangeIndex = window.plugin.playerRanges.obj.rangeName.indexOf(rangeName);
		return (rangeIndex > -1)? rangeIndex : false;
	}

	window.plugin.playerRanges.data.getRangeValByIndex = function(rangeIndex){
		var rangeVal = window.plugin.playerRanges.obj.rangeVal[rangeIndex];
		return (rangeVal)? rangeVal : false;
	}
	window.plugin.playerRanges.data.getRangeValByName = function(rangeName){
		var rangeIndex = window.plugin.playerRanges.data.getRangeIndexByName(rangeName);
		var rangeVal = window.plugin.playerRanges.obj.rangeVal[rangeIndex];
		return (rangeVal)? rangeVal : false;
	}
	window.plugin.playerRanges.data.getRangeRecharge = function(playerLevel){
		if(playerLevel == 0) return 0;

		if(playerLevel >= 1 && playerLevel <= 16){
			return window.plugin.playerRanges.obj.rangeRecharge[playerLevel];
			// return 250*1000*playerLevel;
		}
		return false;
	}
	window.plugin.playerRanges.data.getMyRangeRecharge = function(){
		var playerLevel = parseInt(window.PLAYER.verified_level);
		return window.plugin.playerRanges.data.getRangeRecharge(playerLevel);
	}

	window.plugin.playerRanges.data.setRangeStatus = function(rangeName, status){
		var ranges = window.plugin.playerRanges.data.getRangeStatusByName(rangeName);
		var range = ranges[rangeName];

		if(status === undefined){
			var currRangeStatus = window.plugin.playerRanges.data.getRangeStatusByName(rangeName);
			resp = (currRangeStatus === true)? 0 : 1;
		}else{
			resp = (status === false)? 0 : 1;
		}

		window.plugin.playerRanges.obj.main.opt[rangeName] = resp;

		return resp;
	}
	window.plugin.playerRanges.data.getRangesStatus = function(){
		return window.plugin.playerRanges.obj.main.opt;
	}
	window.plugin.playerRanges.data.getRangeStatusByIndex = function(rangeIndex){
		var rangeName = window.plugin.playerRanges.data.getRangeNameByIndex(rangeIndex);
		var isEnabled = window.plugin.playerRanges.data.getRangeStatusByName(rangeName);
		return isEnabled;
	}
	window.plugin.playerRanges.data.getRangeStatusByName = function(rangeName){
		var rangesStatus = window.plugin.playerRanges.data.getRangesStatus();
		var rangeStatus = rangesStatus[rangeName];
		var isEnabled = (rangeStatus == 1)? true : false;
		return isEnabled;
	}
	window.plugin.playerRanges.data.getInvertRangeStatus = function(rangeName){
		var currRangeStatus = window.plugin.playerRanges.data.getRangeStatusByName(rangeName);
		return !currRangeStatus;
	}

	window.plugin.playerRanges.data.setPlayerCoord = function(idPlayer, latlng){
		try{
			var player = window.plugin.playerRanges.data.getPlayer(idPlayer);
			player.ll = latlng;
			return true;
		}catch(e){
			return false;
		}
	}
	window.plugin.playerRanges.data.getPlayerCoord = function(idPlayer){
		var player = window.plugin.playerRanges.data.getPlayer(idPlayer);
		return player.ll;
	}

	window.plugin.playerRanges.data.addPlayer = function(idPlayer, latlng, label = '', level = undefined, jolly = undefined){
		var obj = {
			ll: latlng,
			label: (label === undefined)? '' : label
		};

		if(level !== undefined && $.isNumeric(level) && level >= 0 && level <= 16){
			obj.level = Number(level);
		}else{
			obj.level = 0;
		}

		if(jolly !== undefined && $.isNumeric(jolly) && jolly > -1){
			obj.jolly = Number(jolly);
		}

		window.plugin.playerRanges.obj.main.markers[idPlayer] = obj;
	}
	window.plugin.playerRanges.data.deletePlayer = function(idPlayer){
		delete window.plugin.playerRanges.obj.main.markers[idPlayer];
	}

	//======================================================================
	// LAYERS
	//======================================================================
	window.plugin.playerRanges.layer.boot = function(){
		// Create the main layer
		window.plugin.playerRanges.obj.layerGroup = new L.LayerGroup();
		window.plugin.playerRanges.obj.rangesLayers = {};

		for(var index in window.plugin.playerRanges.obj.rangeName){
			var rangeName = window.plugin.playerRanges.data.getRangeNameByIndex(index);
			var rangeStatus = window.plugin.playerRanges.data.getRangeStatusByName(rangeName);
			window.plugin.playerRanges.obj.rangesLayers[rangeName] = new L.LayerGroup();
		}

		// Append the main layer to the map
		window.addLayerGroup('Player Ranges', window.plugin.playerRanges.obj.layerGroup, true);

		window.plugin.playerRanges.layer.restoreRangesLayersVisibility();
	}

	window.plugin.playerRanges.layer.salvaDaParteIlLayer = function(idPlayer, rangeName, layer){
		window.plugin.playerRanges.obj.playersLayers[idPlayer][rangeName] = layer;
		window.plugin.playerRanges.obj.rangesLayers[rangeName].addLayer(layer);
		return layer;
	}

	window.plugin.playerRanges.layer.getPlayerLayers = function(idPlayer){
		return window.plugin.playerRanges.obj.playersLayers[idPlayer];
	}
	window.plugin.playerRanges.layer.getPlayerLayer = function(idPlayer, rangeName){
		if(idPlayer === undefined){
			return window.plugin.playerRanges.obj.rangesLayers[rangeName];
		}else{
			return window.plugin.playerRanges.obj.rangesLayers[rangeName][idPlayer];
		}
	}

	window.plugin.playerRanges.layer.drawPlayer = function(idPlayer){
		window.plugin.playerRanges.obj.playersLayers[idPlayer] = {};

		window.plugin.playerRanges.layer.drawMarkerPlayer(idPlayer);
		window.plugin.playerRanges.layer.drawAllRangesPlayer(idPlayer);

		window.plugin.playerRanges.ui.appendPlayerToDialogList(idPlayer);
	}
	window.plugin.playerRanges.layer.removePlayerLayers = function(idPlayer){
		var playerLayers = window.plugin.playerRanges.layer.getPlayerLayers(idPlayer);
		for(rangeName in playerLayers){
			var layer = playerLayers[rangeName];
			window.plugin.playerRanges.obj.rangesLayers[rangeName].removeLayer(layer);
		}
		delete window.plugin.playerRanges.obj.playersLayers[idPlayer];
	}
	window.plugin.playerRanges.layer.setPlayerLatLng = function(idPlayer, newLL){
		var playerLayers = window.plugin.playerRanges.layer.getPlayerLayers(idPlayer);
		for(rangeName in playerLayers){
			var layer = playerLayers[rangeName];
			layer.setLatLng(newLL);
		}
	}
	window.plugin.playerRanges.layer.setPlayerLabel = function(idPlayer, newLabel){
		var playerLayers = window.plugin.playerRanges.layer.getPlayerLayers(idPlayer);
		$(playerLayers.mark._icon).find('span').text(newLabel);
	}

	window.plugin.playerRanges.layer.setPlayerRecharge = function(idPlayer, newLevel){
		var lays = window.plugin.playerRanges.layer.getPlayerLayers(idPlayer);
		lays.recharge.setRadius(window.plugin.playerRanges.data.getRangeRecharge(newLevel));
	}

	window.plugin.playerRanges.layer.setPlayerJolly = function(idPlayer, newJolly){
		var lays = window.plugin.playerRanges.layer.getPlayerLayers(idPlayer);
		lays.jolly.setRadius(newJolly);
	}

	window.plugin.playerRanges.layer.drawAllPlayers = function(){
		var players = window.plugin.playerRanges.data.getPlayers();
		for(idPlayer in players){
			window.plugin.playerRanges.layer.drawPlayer(idPlayer);
		}
	}
	window.plugin.playerRanges.layer.cleanAllPlayers = function(){
		var players = window.plugin.playerRanges.data.getPlayers();
		for(idPlayer in players){
			window.plugin.playerRanges.layer.removePlayerLayers(idPlayer);
		}
	}

	window.plugin.playerRanges.layer.drawMarkerPlayer = function(idPlayer){
		var player = window.plugin.playerRanges.data.getPlayer(idPlayer);

		var latlng = player.ll;
		var label = player.label;
		var factionClass = window.plugin.playerRanges.data.getMyFaction();

		// Arrow Marker ---------- start
		var icc = new L.divIcon({
			iconSize: new L.Point(19, 25),
			className:'playerRanges playerIcon '+factionClass,
			html: '<span>'+label+'</span>'
		});

		var mark = new L.Marker(latlng, {icon:icc, draggable:true});
		// Arrow Marker ---------- end

		window.plugin.playerRanges.layer.salvaDaParteIlLayer(idPlayer, 'mark', mark);
		window.plugin.playerRanges.layer.setEventsOnMarkerPlayer(idPlayer, mark);
	}
	window.plugin.playerRanges.layer.drawAllRangesPlayer = function(idPlayer){
		var player = window.plugin.playerRanges.data.getPlayer(idPlayer);
		var latlng = player.ll;

		var playerRangesLayers = new Array();
		var optWeight = window.plugin.playerRanges.obj.settings.weight;
		var optOpacity = window.plugin.playerRanges.obj.settings.opacity;

		// Hack Range
		playerRangesLayers[0] = new L.geodesicCircle(
			latlng,
			window.plugin.playerRanges.data.getRangeValByIndex(0),
			{
				weight: optWeight,
				opacity: optOpacity,
				clickable: false,
				fill: false,
				color: window.ACCESS_INDICATOR_COLOR,
			}
		);

		// XMP Range
		for(var i=1; i<=8; i++){
			playerRangesLayers[i] = new L.geodesicCircle(
				latlng,
				window.plugin.playerRanges.data.getRangeValByIndex(i),
				{
					weight: optWeight,
					opacity: optOpacity,
					clickable: false,
					fill: false,
					color: window.COLORS_LVL[i],
					dashArray: window.plugin.playerRanges.obj.settings.dashArr
				}
			);
		}

		// Recharge Range
		var rangeRechargeVal = (player.level === undefined)?
				window.plugin.playerRanges.data.getMyRangeRecharge() :
				window.plugin.playerRanges.data.getRangeRecharge(player.level);

		playerRangesLayers[9] = new L.geodesicCircle(
			latlng,
			rangeRechargeVal,
			{
				weight: optWeight,
				opacity: optOpacity,
				clickable: false,
				fill: false,
				color: window.ACCESS_INDICATOR_COLOR,
			}
		);

		// Jolly Range
		playerRangesLayers[10] = new L.geodesicCircle(
			latlng,
			((player.jolly === undefined || player.jolly < 0)? 0 : player.jolly),
			{
				weight: optWeight,
				opacity: optOpacity,
				dashArray: [8, 6, 2, 6, 2, 6],
				clickable: false,
				fill: false,
				color: 'red',
			}
		);

		// Add elements to the layers
		for(var i=1; i<=8; i++){
			var rangeName = window.plugin.playerRanges.data.getRangeNameByIndex(i);
			var layer = playerRangesLayers[i];

			window.plugin.playerRanges.layer.salvaDaParteIlLayer(idPlayer, rangeName, layer);
		}
		window.plugin.playerRanges.layer.salvaDaParteIlLayer(idPlayer, 'hack', playerRangesLayers[0]);
		window.plugin.playerRanges.layer.salvaDaParteIlLayer(idPlayer, 'recharge', playerRangesLayers[9]);
		window.plugin.playerRanges.layer.salvaDaParteIlLayer(idPlayer, 'jolly', playerRangesLayers[10]);
	}

	window.plugin.playerRanges.layer.setEventsOnMarkerPlayer = function(idPlayer, mark){
		// Remove the elements from the layers
		mark.on('dblclick', function(e){
			window.plugin.playerRanges.action.deletePlayer(idPlayer);
		});

		// Save the new player position
		mark.on('dragend', function(e){
			var newLL = e.target._latlng;
			window.plugin.playerRanges.action.dragEndPlayer(idPlayer, newLL);
		});

		// Repositions the ranges when the arrow is dragged
		mark.on('drag', function(e){
			var newLL = e.target._latlng;
			window.plugin.playerRanges.action.dragPlayer(idPlayer, newLL);
		});
		/*
		// Repositions the arrow when the map is zoomed
		map.on('zoomend', function(e){
			pLayer_range[9].setLatLng(pLayer_range[0].getLatLng());
		});
		*/
	}

	window.plugin.playerRanges.layer.setRangeLayerVisibility = function(rangeName, status){
		if(status === undefined){
			var status = window.plugin.playerRanges.data.getInvertRangeStatus(rangeName);
		}

		if(status === true){
			window.plugin.playerRanges.layer.addRangeLayer(rangeName);
		}else if(status === false){
			window.plugin.playerRanges.layer.removeRangeLayer(rangeName);
		}
	}
	window.plugin.playerRanges.layer.restoreRangesLayersVisibility = function(){
		var rangesStatus = window.plugin.playerRanges.data.getRangesStatus();

		for(rangeName in rangesStatus){
			var rangeStatus = window.plugin.playerRanges.data.getRangeStatusByName(rangeName);
			window.plugin.playerRanges.layer.setRangeLayerVisibility(rangeName, rangeStatus);
		}

		window.plugin.playerRanges.layer.setRangeLayerVisibility('mark', true);
	}
	window.plugin.playerRanges.layer.addRangeLayer = function(rangeName){
		if(rangeName == 'label'){
			$('body').removeClass('hideLabelPlayersRanges');
			window.plugin.playerRanges.hook.runChangeRangeVisibility('label', true);
			return;
		}

		var rangeLayer = window.plugin.playerRanges.obj.rangesLayers[rangeName];
		var hasLayer = window.plugin.playerRanges.obj.layerGroup.hasLayer(rangeLayer);
		if(!hasLayer){
			window.plugin.playerRanges.obj.layerGroup.addLayer(rangeLayer);
			window.plugin.playerRanges.hook.runChangeRangeVisibility(rangeName, true);
		}
	}
	window.plugin.playerRanges.layer.removeRangeLayer = function(rangeName){
		if(rangeName == 'label'){
			$('body').addClass('hideLabelPlayersRanges');
			window.plugin.playerRanges.hook.runChangeRangeVisibility('label', false);
			return;
		}

		var rangeLayer = window.plugin.playerRanges.obj.rangesLayers[rangeName];
		var hasLayer = window.plugin.playerRanges.obj.layerGroup.hasLayer(rangeLayer);
		if(hasLayer){
			window.plugin.playerRanges.obj.layerGroup.removeLayer(rangeLayer);
			window.plugin.playerRanges.hook.runChangeRangeVisibility(rangeName, false);
		}
	}

	//======================================================================
	// CSS AND CONTROL FUNCTIONS
	//======================================================================

	window.plugin.playerRanges.ui.setupCSS = function(){
		$("<style>").prop("type", "text/css").html(''
			+'.playerIcon,.playerRangesButton,.setRangesButton{'
				+'background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACYAAAAtCAMAAAD1JOlfAAAApVBMVEV0dHRNTU3i4uITExMBAQH9/f2oqKgVa5cKCgr+/v4NDQ3///+3t7cWcqITZI4VcJ8DeQAvLy8MTwt3d3cDfQDu7u4NDQ0BAQH///9oaGgCcAADewAUaZQCdgATZpEVbZsCcgABXwAWdKQ+Pj4oYEwxMTFylp8BAQEAAAADkAAZhbwDiQADgwD///8DpwAXfK8EtAADmgAdl9YbjsofoeQhrvYEvQA8FIAAAAAAKXRSTlOknJaVa4SLhdRW8Guy4CTFxbYdbPghvEE55lnkZ6NEo3019ekP/QX+AIHvNbUAAAJHSURBVHgBZNLNroMgEIZhd66sxriq4F8IKYAganv/l3Y+jkqFsmqaJ/MmzmSv8/HnK32chJ+BjdUP68pfRvWYst4+UsZaNaTNyeYpe2rRpk0ri5RR5dJqLzfbxYw1wikaKTbJTfYRQ9MZ0fI7I3Zb5cQjVglnnI4+XSnXHdU7qxthlrj6mMBWVG9sUM58jGhY1NzfqLIbqzDsE1fRfL9RJV82agybFyeqb9MPmzGu/DI0l3meUa0vloPhL1+9GG99c/bVa2G88M05VLOribeYUO180z9UL0bR9MyPq8OiDoZxj4MxNDFqWT74dEeVT2jC/LP8YH5RizHOGFTb0NzXdVt3VIuDoWmcUEoAnmfS+0Vt0srtWBiYPw6nNB1awGNhDE2gnhSAvgqGptAVhrChUeL/TIgFKjGE55OVsuBgldDtuSQPfbWUtujOvwBRzeoGKLyaaorjKMjtVHrbv7LnwKKjHSkjJLrPv+bopkViEAbAcOoXqr3YorbHwWry/3/hpjMsSFvYPc57DA+JIMMO9K++n72UKsdfTGUbY/ayP4Ep5/XNpDfauSBiLg+q1mpOpqxIxHUH+c5q2/XGrKPhY+XctEX1wGpaY4FSEytEXIiMvaq1tuZbyyAnoiMzk0QJj5vi6m4gMlN4xhf9clVs9lknmCSf/LR0PK5qn0NwRLBavoW+ecSjtH5T23sEqZYudHBBi27hrn5/Afzrs6PLuA1sVMwSoDqfVHJ0NLQPihltc0RrvYVBceJUA6PktDFC83AshWHwA4y5+fTEG+/4AAAAAElFTkSuQmCC);'
				+'background-repeat:no-repeat;'
				+'outline:none !important;'
			+'}'
			+'.playerIcon.ENLIGHTENED{background-position:left top;}'
			+'.playerIcon.RESISTANCE{background-position:right top;}'

			+'.playerIcon span{display:block;position:relative;color:#fff;line-height:13px;text-align:center;width:77px;min-width:80px;top:29px;left:50%;transform:translateX(-50%);text-shadow:0px 0px 3px #000,0px 0px 3px #000,0px 0px 5px #000,0px 0px 7px #000,0px 0px 9px #000,0px 0px 11px #000;pointer-events:none;}'
			+'body.hideLabelPlayersRanges .playerIcon span{display:none;}'

			+'.playerRangesButton{background-position:6px -25px !important;}'
			+'.setRangesButton{background-position:-18px -25px !important;border-radius:0 0 4px 4px;}'

			+'.rangesList{display:none;position:absolute;background:#fff;padding:7px;left:35px;top:27px;z-index:1000;}'
			+'.rangesList{width:160px !important;-webkit-column-count:2;-moz-column-count:2;column-count:2;-webkit-column-rule:1px outset #ddd;-moz-column-rule:1px outset #ddd;column-rule:1px outset #ddd;}'
			+'.rangesList.open{display:block;}'

			+'.rangesList label{width:100%;display:inline-block !important;color:#000;font-size:12px;cursor:pointer;}'
			+'.rangesList input{height:auto;margin-left:0;cursor:pointer;}'
			+'.rangesList a, .rangesList a:hover{background:#000;color:#fff;margin:4px 0 0;padding:1px;border:0;border-radius:0 !important;width:100%;height:auto;display:inline-block;line-height:normal;text-align:center;cursor:pointer;}'

			+'.playerInList{margin:8px 0 0;}'
			+'.playerInList a{display:inline-block;border:1px solid #ffce00;background:rgba(0,0,0,.3);padding:4px 2px 5px;cursor:pointer;}'
			+'.playerInList a:hover{text-decoration:none;}'
			+'.playerInList .removeBtn{width:10%;text-align:center;margin-right:3%;}'
			+'.playerInList .editBtn{width:10%;text-align:center;margin-left:3%;}'
			+'.playerInList .gotoBtn{width:66%;text-indent:6px;}'

			+'.prPlayerDetails select{ background-color:rgba(0,0,0,.3); color:#ffce00; border:none; }'
			+'.prPlayerDetails select option{ background-color:rgb(21,44,65); }'

			+'.ui-dialog-prPlayerDetails .ui-dialog-buttonset button{ margin-left:7px; }'
			+'.ui-dialog-prPlayerDetails .ui-dialog-buttonset button:first{ margin-left:0; }'
			+'.ui-dialog-prList .ui-dialog-buttonset button{ margin-left:7px; }'
			+'.ui-dialog-prList .ui-dialog-buttonset button:first{ margin-left:0; }'

			+'.playerRanges-export textarea{ min-height:100px; resize:vertical; }'
		).appendTo("head");
	}

	//************

	window.plugin.playerRanges.dialog.chooseName = function(){
		var promptAction = prompt('Choose a label for the player marker.\nNB: you can use only a-z, A-Z, 0-9, "() []" and " "', '');
		return promptAction;
	}
	window.plugin.playerRanges.dialog.openListPlayers = function(){
		dialog({
			title: 'Player Ranges - List',
			html: '<div class="playerRanges prList"></div>',
			dialogClass: 'ui-dialog-prList',
			minWidth: 300,
			buttons:{
				'EXPORT': function(){
					window.plugin.playerRanges.dialog.export();
				},
				'IMPORT': function(){
					window.plugin.playerRanges.dialog.import();
				},
				'MERGE': function(){
					window.plugin.playerRanges.dialog.merge();
				},
			}
		});

		window.plugin.playerRanges.ui.appendAllPlayersToDialogList();
	}

	window.plugin.playerRanges.getHtml.playerInList = function(idPlayer){
		var player = window.plugin.playerRanges.data.getPlayer(idPlayer);
		if(!player) return '';

		var label = (player.label === '')? 'Unnamed' : player.label;
		var html = '';

		html += '<div data-player="'+idPlayer+'" class="playerRanges playerInList">';
			html += '<a class="removeBtn" onclick="window.plugin.playerRanges.action.deletePlayer(\''+idPlayer+'\');return false;" title="Delete this player">X</a>';
			html += '<a class="gotoBtn" onclick="window.plugin.playerRanges.action.goToPlayer(\''+idPlayer+'\');return false;" title="Go to...">'+label+'</a>';
			html += '<a class="editBtn" onclick="window.plugin.playerRanges.dialog.openPlayerForm(\''+idPlayer+'\');return false;" title="Edit"><i class="fa fa-pencil"></i></a>';
		html += '</div>';

		return html;
	}
	window.plugin.playerRanges.getHtml.playersInList = function(){
		var players = window.plugin.playerRanges.data.getPlayers();
		var html = '';

		for(idPlayer in players){
			html += window.plugin.playerRanges.getHtml.playerInList(idPlayer);
		}

		return html;
	}

	window.plugin.playerRanges.getHtml.playerFormTemplate = function(){
		var html = '';
		html += '';
		html += '<label for="player-label">Player label</label> ';
		html += '<input name="player-label" placeholder="Insert label for marker" value="" />';
		html += '<br/><br/>';

		html += '<label for="player-ll">Player LatLng</label> ';
		html += '<input name="player-ll" placeholder="Insert ll for marker" value="" />';
		html += '<br/><br/>';

		html += '<label for="player-level">Player level</label> ';
		html += '<select name="player-level" placeholder="Select player level">';
		for(var lvl=0; lvl<=16; lvl++) html += '<option value="'+lvl+'">'+lvl+'</option>';
		html += '</select>';
		html += '<br/><br/>';

		html += '<label for="player-jolly">Jolly ranges [meters] (eg. operative range)</label> ';
		html += '<input type="number" min="0" name="player-jolly" placeholder="Insert meters" value="" />';
		html += '<br/><br/>';

		return html;
	}

	window.plugin.playerRanges.dialog.openPlayerForm = function(idPlayer){
		var player = window.plugin.playerRanges.data.getPlayer(idPlayer);
		if(player === false) return alert('Player not found');

		dialog({
			title: 'Player Ranges - Player Details',
			html: '<div class="playerRanges prPlayerDetails" data-pr-pl-dt="'+idPlayer+'"></div>',
			dialogClass: 'ui-dialog-prPlayerDetails',
			minWidth: 300,
			buttons: {
				'SAVE': function(){
					var d = $(this).find('.playerRanges.prPlayerDetails');

					var newLabel  = d.find('[name="player-label"]').val();
					var newLatLng = d.find('[name="player-ll"]').val();
					var newLevel  = d.find('[name="player-level"]').val();
					var newJolly  = d.find('[name="player-jolly"]').val();

					window.plugin.playerRanges.action.setPlayerLatLng(idPlayer, L.latLng(newLatLng.split(',')));
					window.plugin.playerRanges.data.setPlayerLabel(idPlayer, newLabel);
					window.plugin.playerRanges.layer.setPlayerLabel(idPlayer, newLabel);

					window.plugin.playerRanges.data.setPlayerLevel(idPlayer, newLevel);
					window.plugin.playerRanges.layer.setPlayerRecharge(idPlayer, newLevel);

					window.plugin.playerRanges.data.setPlayerJolly(idPlayer, newJolly);
					window.plugin.playerRanges.layer.setPlayerJolly(idPlayer, newJolly);

					window.plugin.playerRanges.storage.save();

					window.plugin.playerRanges.ui.updateAllPlayersToDialogList();
					// window.plugin.playerRanges.action.goToPlayer(idPlayer);

				}
			}
		});

		var div = $('.playerRanges.prPlayerDetails[data-pr-pl-dt="'+idPlayer+'"]');
		div.html(window.plugin.playerRanges.getHtml.playerFormTemplate());

		div.find('[name="player-label"]').val(player.label);
		div.find('[name="player-ll"]').val(player.ll.lat.toFixed(6)+','+player.ll.lng.toFixed(6));

		if(player.level !== undefined){
			div.find('[name="player-level"] option[value="'+player.level+'"]').prop('selected', true);
		}else{
			div.find('[name="player-level"] option[value="0"]').prop('selected', true);
		}

		if(player.jolly !== undefined && player.jolly > 0){
			div.find('[name="player-jolly"]').val(player.jolly);
		}
	}


	window.plugin.playerRanges.dialog.export = function(){
		var strData = window.plugin.playerRanges.storage.get();

		if(typeof android !== 'undefined' && android && android.shareString){
			return android.shareString(strData);
		} else {
			var html = '';
			html += '<p>';
				html += '<a onclick="$(\'.playerRanges textarea\').select();">Select all</a>';
				html += ' and press CTRL+C to copy it.'
			html += '</p>';
			html += '<textarea style="width:90%;" readonly>'+strData+'</textarea>';

			dialog({
				title: 'Player Ranges - Export',
				html: '<div class="playerRanges playerRanges-export">'+html+'</div>',
				dialogClass: 'ui-dialog-pr',
				minWidth: 300,	
			});
		}
	}
	window.plugin.playerRanges.dialog.import = function(){
		var backup = JSON.parse(JSON.stringify(window.plugin.playerRanges.storage.get()));

		var promptAction = prompt('Press CTRL+V to paste it.', '');
		if(promptAction !== null && promptAction !== ''){
			if(JSON.parse(promptAction).opt !== undefined && JSON.parse(promptAction).markers !== undefined){
				try{
					var data = JSON.parse(promptAction); // try to parse JSON first

					window.plugin.playerRanges.resetAll();
					window.localStorage[window.plugin.playerRanges.storage.NAME] = JSON.stringify(data);
					window.plugin.playerRanges.storage.load();
					window.plugin.playerRanges.mpe.rebootMPE();

					alert('Import successful.');
				}catch(e){
					alert('Import failed.');
				}
			}else{
				alert('Import failed.<br/>Attention: your PlayerRanges data is wrong.');
			}
		}
	}
	window.plugin.playerRanges.dialog.merge = function(){
		var backup = JSON.parse(window.plugin.playerRanges.storage.get());

		var promptAction = prompt('Press CTRL+V to paste it.', '');
		if(promptAction !== null && promptAction !== ''){
			if(JSON.parse(promptAction).opt !== undefined && JSON.parse(promptAction).markers !== undefined){
				try{
					var data = JSON.parse(promptAction); // try to parse JSON first

					for(mark in data.markers){
						backup.markers[mark] = data.markers[mark];
					}
					data = backup;
			
					window.plugin.playerRanges.resetAll();
					window.localStorage[window.plugin.playerRanges.storage.NAME] = JSON.stringify(data);
					window.plugin.playerRanges.storage.load();
					window.plugin.playerRanges.mpe.rebootMPE();

					alert('Import successful.');
				}catch(e){
					alert('Import failed.');
				}
			}else{
				alert('Import failed.<br/>Attention: your PlayerRanges data is wrong.');
			}
		}
	}

	window.plugin.playerRanges.dialog.resetAll = function(){
		var promptAction = confirm('All data will be deleted. Are you sure?', '');
		if(promptAction){
			window.plugin.playerRanges.resetAll();
			alert('Successfully reset.');
		}
	}
	window.plugin.playerRanges.resetAll = function(){
		window.plugin.playerRanges.layer.cleanAllPlayers();
		window.plugin.playerRanges.storage.reset();
		window.plugin.playerRanges.mpe.rebootMPE();
	}



	window.plugin.playerRanges.ui.appendPlayerToDialogList = function(idPlayer){
		var html = window.plugin.playerRanges.getHtml.playerInList(idPlayer);

		$('.playerRanges.prList').each(function(){
			if($(this).children('div[data-player="'+idPlayer+'"]').length == 0){
				$(this).append(html);
			}
		});
	}
	window.plugin.playerRanges.ui.appendAllPlayersToDialogList = function(){
		var players = window.plugin.playerRanges.data.getPlayers();
		for(idPlayer in players){
			window.plugin.playerRanges.ui.appendPlayerToDialogList(idPlayer);
		}
	}
	window.plugin.playerRanges.ui.updateAllPlayersToDialogList = function(){
		$('.playerRanges.prList').empty();
		window.plugin.playerRanges.ui.appendAllPlayersToDialogList();
	}


	window.plugin.playerRanges.ui.removePlayerFromList = function(idPlayer){
		$('div.playerRanges.playerInList[data-player="'+idPlayer+'"]').remove();
	}
	window.plugin.playerRanges.ui.removeAllPlayersFromList = function(){
		$('div.playerRanges.playerInList').remove();
	}

	//************

	window.plugin.playerRanges.control.addControl = function(){
		L.Control.PlayerRangeControl = L.Control.extend({
			options:{position: 'topleft'},

			onAdd:function(map){
				var controlDiv = L.DomUtil.create('div', 'leaflet-playerranges playerRanges');
				var controlSubDIV = L.DomUtil.create('div', 'leaflet-bar', controlDiv);

				var butt_1 = L.DomUtil.create('a', 'playerRanges playerRangesButton', controlSubDIV);
				butt_1.title = 'Click this: add a player marker.\n\nDoubleClick on a marker: remove a marker.';

				var butt_2 = L.DomUtil.create('a', 'playerRanges setRangesButton', controlSubDIV);
				butt_2.title = 'Click to set the ranges.';

				var checkList = L.DomUtil.create('div', 'playerRanges rangesList leaflet-bar', controlSubDIV);

				var arrBtn = [butt_1, butt_2];
				for(bt in arrBtn){
					L.DomEvent
						.addListener(arrBtn[bt], 'click', L.DomEvent.stopPropagation)
						.addListener(arrBtn[bt], 'click', L.DomEvent.preventDefault)
						.addListener(arrBtn[bt], 'dblclick', L.DomEvent.stopPropagation)
						.addListener(arrBtn[bt], 'dblclick', L.DomEvent.preventDefault)
					;
				}
				L.DomEvent.addListener(checkList, 'dblclick', L.DomEvent.stopPropagation);
				L.DomEvent.addListener(checkList, 'dblclick', L.DomEvent.preventDefault);

				L.DomEvent.addListener(butt_1, 'click', function(){
					window.plugin.playerRanges.action.addNewPlayerViaPrompt();
				});
				L.DomEvent.addListener(butt_2, 'click', function(){
					window.plugin.playerRanges.action.toggleSubControl();
				});
				return controlDiv;
			}
		});
		L.control.playerRangesControl = function(options){ return new L.Control.PlayerRangeControl(options); };
		map.addControl(new L.control.playerRangesControl());
	}

	window.plugin.playerRanges.action.toggleSubControl = function(status){
		if(status === 0){
			$('.rangesList').removeClass('open');
		}else if(status === 1){
			$('.rangesList').addClass('open');
		}else{
			$('.rangesList').toggleClass('open');
		}

		if($('.rangesList').hasClass('open') == false){
			$('.rangesList').html('');
		}else{
			$('.rangesList').html(window.plugin.playerRanges.getHtml.controlListRanges());
		}

		// set Y position
		var pxTop = $('.leaflet-playerranges').offset().top;
		var hBox = $('.leaflet-playerranges .rangesList').height();
		var hMap = $('#map').height();
		var operazione = hMap-(hBox+pxTop)-30;
		if(operazione > 0){ $('.leaflet-playerranges .rangesList').css('top', 27); }
		else{ $('.leaflet-playerranges .rangesList').css('top', -86); }
	}
	window.plugin.playerRanges.getHtml.controlListRanges = function(){
		var html = '';

		var labelIsEnabled = window.plugin.playerRanges.data.getRangeStatusByName('label');
		attrChecked = (labelIsEnabled)? 'checked' : '';
		html += '<label class="check"><input type="checkbox" onchange="window.plugin.playerRanges.action.toggleRangeLayerVisibility(\'label\'); return false;" '+attrChecked+' /> Label</label>'

		var hackIsEnabled = window.plugin.playerRanges.data.getRangeStatusByName('hack');
		attrChecked = (hackIsEnabled)? 'checked' : '';
		html += '<label class="check"><input type="checkbox" onchange="window.plugin.playerRanges.action.toggleRangeLayerVisibility(\'hack\'); return false;" '+attrChecked+' /> Hack</label>';

		var hackIsEnabled = window.plugin.playerRanges.data.getRangeStatusByName('recharge');
		attrChecked = (hackIsEnabled)? 'checked' : '';
		html += '<label class="check"><input type="checkbox" onchange="window.plugin.playerRanges.action.toggleRangeLayerVisibility(\'recharge\'); return false;" '+attrChecked+' /> Recharge</label>';

		for(var i = 1; i<=8; i++){
			var rangeIsEnabled = window.plugin.playerRanges.data.getRangeStatusByName('L'+i);
			attrChecked = (rangeIsEnabled)? 'checked' : '';
			html += '<label class="check"><input type="checkbox" onchange="window.plugin.playerRanges.action.toggleRangeLayerVisibility(\'L'+i+'\'); return false;" '+attrChecked+' /> XMP L'+i+'</label>';
		}

		var jollyIsEnabled = window.plugin.playerRanges.data.getRangeStatusByName('jolly');
		attrChecked = (jollyIsEnabled)? 'checked' : '';
		html += '<label class="check"><input type="checkbox" onchange="window.plugin.playerRanges.action.toggleRangeLayerVisibility(\'jolly\'); return false;" '+attrChecked+' /> Jolly</label>';

		html += '<a onclick="window.plugin.playerRanges.dialog.openListPlayers();">List</a>';

		return html;
	}

	window.plugin.playerRanges.control.initControl = function(){
		window.plugin.playerRanges.control.addControl();

		//hide the controls when the layer is off, show it when on
		map.on('layeradd', function(obj){
			if(obj.layer === window.plugin.playerRanges.obj.layerGroup){
				window.plugin.playerRanges.control.restoreVibility();
			}
		});
		map.on('layerremove', function(obj){
			if(obj.layer === window.plugin.playerRanges.obj.layerGroup){
				window.plugin.playerRanges.control.restoreVibility();
			}
		});
	}
	window.plugin.playerRanges.control.restoreVibility = function(){
		var selector = $('.playerRanges.leaflet-playerranges');

		if(map.hasLayer(window.plugin.playerRanges.obj.layerGroup)){
			selector.show();
		}else{
			selector.hide();
		}
	}

	//======================================================================
	// HOOK
	//======================================================================
	window.plugin.playerRanges.hook.init = function(){
		// Avoid error if this plugin load first
		if($.inArray('pluginPlayerRanges', window.VALID_HOOKS) < 0) window.VALID_HOOKS.push('pluginPlayerRanges');
	}
	window.plugin.playerRanges.hook.runChangeRangeVisibility = function(rangeName, status){
		window.runHooks('pluginPlayerRanges', {event: 'onChangeRangeVisibility', data:{ name:rangeName, status:status}});
	}

	//======================================================================
	// ACTIONS
	//======================================================================
	window.plugin.playerRanges.action.addNewPlayerViaPrompt = function(){
		var idPlayer = window.plugin.playerRanges.data.generateID();
		var label = window.plugin.playerRanges.dialog.chooseName();

		if(label !== null){
			var resp = window.plugin.playerRanges.data.validateName(label);
			if(resp){
				window.plugin.playerRanges.action.addNewPlayer(idPlayer, label);
			}else{
				alert('Invalid name.');
			}
		}
	}
	window.plugin.playerRanges.action.addNewPlayer = function(idPlayer, label){
		var latlng = map.getCenter();
		window.plugin.playerRanges.data.addPlayer(idPlayer, latlng, label);
		window.plugin.playerRanges.layer.drawPlayer(idPlayer);
		window.plugin.playerRanges.storage.save();
	}
	window.plugin.playerRanges.action.deletePlayer = function(idPlayer){
		window.plugin.playerRanges.layer.removePlayerLayers(idPlayer);
		window.plugin.playerRanges.ui.removePlayerFromList(idPlayer);
		window.plugin.playerRanges.data.deletePlayer(idPlayer);
		window.plugin.playerRanges.storage.save();
	}

	window.plugin.playerRanges.action.setPlayerLatLng = function(idPlayer, newLL){
		window.plugin.playerRanges.data.setPlayerCoord(idPlayer, newLL);
		window.plugin.playerRanges.layer.setPlayerLatLng(idPlayer, newLL);
		window.plugin.playerRanges.action.dragEndPlayer(idPlayer, newLL);
	}
	window.plugin.playerRanges.action.dragEndPlayer = function(idPlayer, newLL){
		window.plugin.playerRanges.data.setPlayerCoord(idPlayer, newLL);
		window.plugin.playerRanges.storage.save();
	}
	window.plugin.playerRanges.action.dragPlayer = function(idPlayer, newLL){
		window.plugin.playerRanges.layer.setPlayerLatLng(idPlayer, newLL);
	}
	window.plugin.playerRanges.action.goToPlayer = function(idPlayer){
		var latlng = window.plugin.playerRanges.data.getPlayerCoord(idPlayer);
		map.setView(latlng);
	}

	window.plugin.playerRanges.action.setRangeLayerVisibility = function(rangeName, status){
		if(status === undefined){
			var status = window.plugin.playerRanges.data.getInvertRangeStatus(rangeName);
		}

		window.plugin.playerRanges.data.setRangeStatus(rangeName, status);
		window.plugin.playerRanges.layer.setRangeLayerVisibility(rangeName, status);
		window.plugin.playerRanges.storage.save();
	}
	window.plugin.playerRanges.action.toggleRangeLayerVisibility = function(rangeName){
		window.plugin.playerRanges.action.setRangeLayerVisibility(rangeName);
	}

	// ---------------------------------------------------------------------------------
	// MULTI PROJECTS EXTENSION
	// ---------------------------------------------------------------------------------
	window.plugin.playerRanges.mpe.rebootMPE = function(){
		window.plugin.playerRanges.layer.cleanAllPlayers();
		window.plugin.playerRanges.storage.check();
		window.plugin.playerRanges.layer.drawAllPlayers();

		if($('.rangesList').hasClass('open')){
			window.plugin.playerRanges.action.toggleSubControl(1);
		}
		window.plugin.playerRanges.layer.restoreRangesLayersVisibility();
	}
	window.plugin.playerRanges.mpe.initMPE = function(){
		if(window.plugin.mpe !== undefined){
			window.plugin.mpe.setMultiProjects({
				namespace: 'playerRanges',
				title: 'Player Ranges',
				fa: 'fa-play-circle-o fa-rotate-270',
				defaultKey: 'plugin-playerRanges',
				func_setKey: function(newKey){
					window.plugin.playerRanges.storage.NAME = newKey;
				},
				func_pre: function(){},
				func_post: function(){
					window.plugin.playerRanges.mpe.rebootMPE();
				}
			});
		}
	}

	// ---------------------------------------------------------------------------------
	// USERLOCATION IITCM
	// ---------------------------------------------------------------------------------
	window.plugin.playerRanges.userLocation.init = function(){
		if(window.plugin.userLocation === undefined) return false;

		window.pluginCreateHook('pluginUserLocation');

		window.plugin.playerRanges.override.userLocation();

		window.addHook('pluginUserLocation', window.plugin.playerRanges.userLocation.onChangeUserLocation);
		window.addHook('pluginPlayerRanges', window.plugin.playerRanges.userLocation.onChangeRangeVisibility);

		window.plugin.playerRanges.userLocation.addMyRanges();
	}

	window.plugin.playerRanges.userLocation.addMyRanges = function(){
		window.plugin.playerRanges.obj.playersLayers['userLocation'] = {};

		var optWeight = window.plugin.playerRanges.obj.settings.weight;
		var optOpacity = window.plugin.playerRanges.obj.settings.opacity;
		var optDashArr = window.plugin.playerRanges.obj.settings.dashArr;

		var latlng = window.plugin.userLocation.circle.getLatLng();

		for(i=1; i<=8; i++){
			var xmpLayer = new L.geodesicCircle(
				latlng,
				window.plugin.playerRanges.data.getRangeValByIndex(i),
				{
					weight: optWeight,
					opacity: optOpacity,
					clickable: false,
					fill: false,
					color: window.COLORS_LVL[i],
					dashArray: optDashArr
				}
			);

			window.plugin.playerRanges.obj.playersLayers['userLocation']['L'+i] = xmpLayer;
			var rangeStatus = window.plugin.playerRanges.data.getRangeStatusByIndex(i);
			if(rangeStatus){
				xmpLayer.addTo(window.plugin.userLocation.locationLayer);
			}
		}

		// Recharge Layer --- start
		var rechargeLayer = new L.geodesicCircle(
			latlng,
			window.plugin.playerRanges.data.getMyRangeRecharge(),
			{
				weight: optWeight,
				opacity: optOpacity,
				clickable: false,
				fill: false,
				color: window.ACCESS_INDICATOR_COLOR,
			}
		);

		window.plugin.playerRanges.obj.playersLayers['userLocation']['recharge'] = rechargeLayer;
		var rangeStatus = window.plugin.playerRanges.data.getRangeStatusByName('recharge');
		if(rangeStatus){
			rechargeLayer.addTo(window.plugin.userLocation.locationLayer);
		}
		// Recharge Layer --- close

		window.plugin.playerRanges.userLocation.restoreRangesLayersVisibility();
	}

	window.plugin.playerRanges.userLocation.restoreRangesLayersVisibility = function(){
		var userLocationLayers = window.plugin.playerRanges.obj.playersLayers['userLocation'];

		for(rangeName in userLocationLayers){
			var layer = userLocationLayers[rangeName];
			var hasLayer = window.plugin.userLocation.locationLayer.hasLayer(layer);

			if(status === true){
				if(!hasLayer){
					window.plugin.userLocation.locationLayer.addLayer(layer);
				}
			}else if(status === false){
				if(hasLayer){
					window.plugin.userLocation.locationLayer.removeLayer(layer);
				}
			}
		}
	}

	window.plugin.playerRanges.userLocation.onChangeUserLocation = function(data){
		if(data.event === 'fakeFirstSetup'){
			window.plugin.playerRanges.userLocation.addMyRanges();
		}

		if(data.event === 'onLocationChange'){
			var latlng = data.data.latlng;
			var userLocationLayers = window.plugin.playerRanges.obj.playersLayers['userLocation'];

			for(userRangeName in userLocationLayers){
				var layer = userLocationLayers[userRangeName];
				layer.setLatLng(latlng);
			}
		}
	}
	window.plugin.playerRanges.userLocation.onChangeRangeVisibility = function(data){
		if(data.event === 'onChangeRangeVisibility'){
			var rangeName = data.data.name;
			var status = data.data.status;

			if(rangeName !== 'hack' || rangeName !== 'label'){
				var userLocationLayers = window.plugin.playerRanges.obj.playersLayers['userLocation'];
				var layer = userLocationLayers[rangeName];
				var hasLayer = window.plugin.userLocation.locationLayer.hasLayer(layer);

				if(status === true){
					if(!hasLayer){
						window.plugin.userLocation.locationLayer.addLayer(layer);
					}
				}else if(status === false){
					if(hasLayer){
						window.plugin.userLocation.locationLayer.removeLayer(layer);
					}
				}
			}
		}
	}

	window.plugin.playerRanges.override.userLocation = function(){
		window.plugin.userLocation.locate = function(lat, lng, accuracy, persistentZoom){
			if(window.plugin.userLocation.follow) {
				window.plugin.userLocation.follow = false;
				if(typeof android !== 'undefined' && android && android.setFollowMode)
					android.setFollowMode(window.plugin.userLocation.follow);
				return;
			}

			var latlng = new L.LatLng(lat, lng);

			var latAccuracy = 180 * accuracy / 40075017;
			var lngAccuracy = latAccuracy / Math.cos(L.LatLng.DEG_TO_RAD * lat);

			var zoom = window.map.getBoundsZoom(L.latLngBounds(
				[lat - latAccuracy, lng - lngAccuracy],
				[lat + latAccuracy, lng + lngAccuracy]));

			// an extremely close view is pretty pointless (especially with maps that support zoom level 20+)
			// so limit to 17 (enough to see all portals)
			zoom = (persistentZoom) ? map.getZoom() : Math.min(zoom,17);

			if(window.map.getCenter().distanceTo(latlng) < 10) {
				window.plugin.userLocation.follow = true;
				if(typeof android !== 'undefined' && android && android.setFollowMode)
					android.setFollowMode(window.plugin.userLocation.follow);
			}

			window.map.setView(latlng, zoom);
		}

		window.plugin.userLocation.onZoomEnd = function() {
			if(window.map.getZoom() < 16 || L.Path.CANVAS) {
				if (window.plugin.userLocation.locationLayer.hasLayer(window.plugin.userLocation.circle))
					window.plugin.userLocation.locationLayer.removeLayer(window.plugin.userLocation.circle);
			} else {
				if (!window.plugin.userLocation.locationLayer.hasLayer(window.plugin.userLocation.circle))
					window.plugin.userLocation.locationLayer.addLayer(window.plugin.userLocation.circle);
			}

			window.runHooks('pluginUserLocation', {event: 'fakeFirstSetup', data:{ latlng:window.plugin.userLocation.circle.getLatLng() }});
		}

		window.plugin.userLocation.onLocationChange = function(lat, lng){
			if(!window.plugin.userLocation.marker) return;

			var latlng = new L.LatLng(lat, lng);
			window.plugin.userLocation.marker.setLatLng(latlng);
			window.plugin.userLocation.circle.setLatLng(latlng);
			window.runHooks('pluginUserLocation', {event: 'onLocationChange', data:{ latlng:latlng }});

			if(window.plugin.distanceToPortal){
				window.plugin.distanceToPortal.currentLoc = latlng;
				window.plugin.distanceToPortal.updateDistance();
			}

			if(window.plugin.userLocation.follow){
				// move map if marker moves more than 35% from the center
				// 100% - 2*15% = 70% → 35% from center in either direction
				if(map.getBounds().pad(-0.15).contains(latlng))
					return;

				window.map.setView(latlng);
			}
		}
	}

	//======================================================================

	var setup = function(){
		window.plugin.playerRanges.storage.check();
		window.plugin.playerRanges.ui.setupCSS();
		window.plugin.playerRanges.hook.init();
		window.plugin.playerRanges.control.initControl();
		window.plugin.playerRanges.layer.boot();
		window.plugin.playerRanges.layer.drawAllPlayers();

		window.plugin.playerRanges.userLocation.init();

		window.plugin.playerRanges.mpe.initMPE();
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

