// @author         3ch01c
// @name           Uniques
// @category       Misc
// @version        0.4.0
// @description    Allow manual entry of portals visited/captured, scoutControlled or droneVisited. Highlighters for all three help to identify new portals. Uniques uses the 'sync'-plugin to share between multiple browsers or desktop/mobile. COMM and portal details are analyzed to fill the fields automatically (but this will not catch every case).

//use own namespace for plugin
window.plugin.uniques = function() {};

//delay in ms
window.plugin.uniques.SYNC_DELAY = 5000;

// maps the JS property names to localStorage keys
window.plugin.uniques.FIELDS = {
	'uniques': 'plugin-uniques-data',
	'updateQueue': 'plugin-uniques-data-queue',
	'updatingQueue': 'plugin-uniques-data-updating-queue',
 	'missedLatLngs': 'plugin-uniques-missedLatLngs',
 	'parsedMsgs': 'plugin-uniques-parsedMsgs'
};

window.plugin.uniques.uniques = {};
window.plugin.uniques.updateQueue = {};
window.plugin.uniques.updatingQueue = {};
window.plugin.uniques.missedLatLngs = {};
window.plugin.uniques.parsedMsgs = {};

window.plugin.uniques.enableSync = false;

window.plugin.uniques.disabledMessage = null;
window.plugin.uniques.contentHTML = null;

window.plugin.uniques.isHighlightActive = false;

window.plugin.uniques.onPortalDetailsUpdated = function() {
	if(typeof(Storage) === "undefined") {
		$('#portaldetails > .imgpreview').after(plugin.uniques.disabledMessage);
		return;
	}

	var guid = window.selectedPortal,
		details = portalDetail.get(guid),
		nickname = window.PLAYER.nickname;
	if(details) {
		if(details.owner == nickname) {
			//FIXME: a virus flip will set the owner of the portal, but doesn't count as a unique capture
			plugin.uniques.updateCaptured(true);
			// no further logic required
		} else {
			function installedByPlayer(entity) {
				return entity && entity.owner == nickname;
			}

			if(details.resonators.some(installedByPlayer) || details.mods.some(installedByPlayer)) {
				plugin.uniques.updateVisited(true);
			}
		}
	}

	$('#portaldetails > .imgpreview').after(plugin.uniques.contentHTML);
	plugin.uniques.updateCheckedAndHighlight(guid);
}

window.plugin.uniques.onPublicChatDataAvailable = function(data) {
	var nick = window.PLAYER.nickname;
	var match = false;
	data.result.forEach(function(msg) {
		match = false;
		if (!window.plugin.uniques.parsedMsgs[msg[0]]){
			var plext = msg[2].plext,
				markup = plext.markup;

		if(plext.plextType == 'SYSTEM_BROADCAST'
		&& markup.length==5
		&& markup[0][0] == 'PLAYER'
		&& markup[0][1].plain == nick
		&& markup[1][0] == 'TEXT'
		&& markup[1][1].plain == ' deployed an '
		&& markup[2][0] == 'TEXT'
		&& markup[3][0] == 'TEXT'
		&& markup[3][1].plain == ' Resonator on '
		&& markup[4][0] == 'PORTAL') {
			// search for "x deployed an Ly Resonator on z"
			var portal = markup[4][1];
			match = true;
			plugin.uniques.setPortalAction(portal,'visited');
		} else if(plext.plextType == 'SYSTEM_BROADCAST'
		&& markup.length==3
		&& markup[0][0] == 'PLAYER'
		&& markup[0][1].plain == nick
		&& markup[1][0] == 'TEXT'
		&& markup[1][1].plain == ' deployed a Resonator on '
		&& markup[2][0] == 'PORTAL') {
			// search for "x deployed a Resonator on z"
			var portal = markup[2][1];
			match = true;
			plugin.uniques.setPortalAction(portal,'visited');
		} else if (plext.plextType == 'SYSTEM_BROADCAST'
		&& markup.length==3
		&& markup[0][0] == 'PLAYER'
		&& markup[0][1].plain == nick
		&& markup[1][0] == 'TEXT'
		&& markup[1][1].plain == ' deployed a Beacon on '
		&& markup[2][0] == 'PORTAL') {
			// search for "x deployed a Beacon on z"
			var portal = markup[2][1];
			match = true;
			plugin.uniques.setPortalAction(portal,'visited');
		} else if (plext.plextType == 'SYSTEM_BROADCAST'
		&& markup.length==3
		&& markup[0][0] == 'PLAYER'
		&& markup[0][1].plain == nick
		&& markup[1][0] == 'TEXT'
		&& markup[1][1].plain == ' deployed Fireworks on '
		&& markup[2][0] == 'PORTAL') {
			// search for "x deployed Fireworks on z"
			var portal = markup[2][1];
			match = true;
			plugin.uniques.setPortalAction(portal,'visited');
		} else if(plext.plextType == 'SYSTEM_BROADCAST'
		&& markup.length==3
		&& markup[0][0] == 'PLAYER'
		&& markup[0][1].plain == nick
		&& markup[1][0] == 'TEXT'
		&& markup[1][1].plain == ' captured '
		&& markup[2][0] == 'PORTAL') {
			// search for "x captured y"
			var portal = markup[2][1];
			match = true;
			plugin.uniques.setPortalAction(portal,'captured');
		} else if(plext.plextType == 'SYSTEM_BROADCAST'
		&& markup.length==5
		&& markup[0][0] == 'PLAYER'
		&& markup[0][1].plain == nick
		&& markup[1][0] == 'TEXT'
		&& markup[1][1].plain == ' linked '
		&& markup[2][0] == 'PORTAL'
		&& markup[3][0] == 'TEXT'
		&& markup[3][1].plain == ' to '
		&& markup[4][0] == 'PORTAL') {
			// search for "x linked y to z"
			var portal = markup[2][1];
			match = true;
			plugin.uniques.setPortalAction(portal,'visited');
		} else if(plext.plextType == 'SYSTEM_NARROWCAST'
		&& markup.length==6
		&& markup[0][0] == 'TEXT'
		&& markup[0][1].plain == 'Your '
		&& markup[1][0] == 'TEXT'
		&& markup[2][0] == 'TEXT'
		&& markup[2][1].plain == ' Resonator on '
		&& markup[3][0] == 'PORTAL'
		&& markup[4][0] == 'TEXT'
		&& markup[4][1].plain == ' was destroyed by '
		&& markup[5][0] == 'PLAYER') {
			// search for "Your Lx Resonator on y was destroyed by z"
			var portal = markup[3][1];
			match = true;
			plugin.uniques.setPortalAction(portal,'visited');
		} else if(plext.plextType == 'SYSTEM_NARROWCAST'
		&& markup.length==5
		&& markup[0][0] == 'TEXT'
		&& markup[0][1].plain == 'Your '
		&& markup[1][0] == 'TEXT'
		&& markup[2][0] == 'TEXT'
		&& markup[2][1].plain == ' Resonator on '
		&& markup[3][0] == 'PORTAL'
		&& markup[4][0] == 'TEXT'
		&& markup[4][1].plain == ' has decayed') {
			// search for "Your Lx Resonator on y has decayed"
			var portal = markup[3][1];
			match = true;
			plugin.uniques.setPortalAction(portal,'visited');
		} else if(plext.plextType == 'SYSTEM_NARROWCAST'
		&& markup.length==4
		&& markup[0][0] == 'TEXT'
		&& markup[0][1].plain == 'Your Portal '
		&& markup[1][0] == 'PORTAL'
		&& markup[2][0] == 'TEXT'
		&& (markup[2][1].plain == ' neutralized by ' || markup[2][1].plain == ' is under attack by ')
		&& markup[3][0] == 'PLAYER') {
		    // search for "Your Portal x neutralized by y"
		    // search for "Your Portal x is under attack by y"
			var portal = markup[1][1];
			match = true;
			plugin.uniques.setPortalAction(portal,'visited');
		} else if (plext.plextType == 'SYSTEM_NARROWCAST'
	  && markup.length==3
		&& markup[0][0] == 'TEXT'
		&& markup[0][1].plain == 'You claimed Scout Controller on '
		&& markup[1][0] == 'PORTAL') {
				// search for "You claimed Scout Controller on "
			var portal = markup[1][1];
			match = true;
			plugin.uniques.setPortalAction(portal,'scoutControlled');
		} else if (plext.plextType == 'SYSTEM_NARROWCAST'
		&& markup.length==3
		&& markup[0][0] == 'TEXT'
		&& markup[0][1].plain == 'You were displaced as Scout Controller on '
		&& markup[1][0] == 'PORTAL') {
        // search for "You were displaced as Scout Controller on"
			var portal = markup[1][1];
			match = true;
			plugin.uniques.setPortalAction(portal,'scoutControlled');
		}
		}
		if (match){
			window.plugin.uniques.parsedMsgs[msg[0]] = msg[1];
			window.plugin.uniques.storeLocal('parsedMsgs');
		}
	});
}

window.plugin.uniques.updateCheckedAndHighlight = function(guid) {
	runHooks('pluginUniquesUpdateUniques', { guid: guid });

	if (guid == window.selectedPortal) {

		var uniqueInfo = plugin.uniques.uniques[guid],
			visited = (uniqueInfo && uniqueInfo.visited) || false,
			captured = (uniqueInfo && uniqueInfo.captured) || false,
			scoutControlled = (uniqueInfo && uniqueInfo.scoutControlled) || false,
			droneVisited = (uniqueInfo && uniqueInfo.droneVisited) || false;
		$('#visited').prop('checked', visited);
		$('#captured').prop('checked', captured);
		$('#scoutControlled').prop('checked', scoutControlled);
		$('#droneVisited').prop('checked', droneVisited);
	}

	if (window.plugin.uniques.isHighlightActive) {
		if (portals[guid]) {
			window.setMarkerStyle (portals[guid], guid == selectedPortal);
		}
	}
}

window.plugin.uniques.setPortalAction = function(portal, action) {
	var latE6 = portal.latE6;
	var lngE6 = portal.lngE6;
	var guid = window.findPortalGuidByPositionE6(latE6, lngE6);
	var id = latE6 + "," + lngE6;

	if (guid) {
		var uniqueInfo = window.plugin.uniques.uniques[guid];
		if (!uniqueInfo) uniqueInfo = {};
				// merge ALL pending actions, then remove from missedLatLngs
		if (window.plugin.uniques.missedLatLngs[id]) {
			Object.assign(uniqueInfo,window.uniques.missedLatLngs[id].action);
			delete window.plugin.uniques.missedLatLngs[id];
			window.plugin.uniques.storeLocal('missedLatLngs');
		};
		uniqueInfo[action] = true;
		// special handling for captured
		if (action === 'captured') {
      uniqueInfo.visited = true;
    };
		window.plugin.uniques.uniques[guid] = uniqueInfo;
		window.plugin.uniques.storeLocal('uniques');
		// trigger highlighters
		plugin.uniques.updateCheckedAndHighlight(guid);
		// triger sync
		plugin.uniques.sync(guid);
	} else { //guid not found, so add to missedLatLngs
		if (!window.plugin.uniques.missedLatLngs[id]) {
			window.plugin.uniques.missedLatLngs[id] = {portal:portal,action:{}};
    };
		window.plugin.uniques.missedLatLngs[id].action[action] = true;
		if (action === 'captured') {
      window.plugin.uniques.missedLatLngs[id].action.visited = true;
    };
		window.plugin.uniques.storeLocal('missedLatLngs');
	}
}

window.plugin.uniques.updateVisited = function(visited, guid) {
	if (guid == undefined) guid = window.selectedPortal;

	var uniqueInfo = plugin.uniques.uniques[guid];
	if (!uniqueInfo) {
		plugin.uniques.uniques[guid] = uniqueInfo = {
			visited: false,
			captured: false
		};
	}

	if (visited == uniqueInfo.visited) return;

	if (visited) {
		uniqueInfo.visited = true;
	} else { // not visited --> not captured
		uniqueInfo.visited = false;
		uniqueInfo.captured = false;
	}

	plugin.uniques.updateCheckedAndHighlight(guid);
	plugin.uniques.sync(guid);
}

window.plugin.uniques.updateCaptured = function(captured, guid) {
	if (guid == undefined) guid = window.selectedPortal;

	var uniqueInfo = plugin.uniques.uniques[guid];
	if (!uniqueInfo) {
		plugin.uniques.uniques[guid] = uniqueInfo = {
			visited: false,
			captured: false
		};
	}

	if (captured == uniqueInfo.captured) return;

	if (captured) { // captured --> visited
		uniqueInfo.captured = true;
		uniqueInfo.visited = true;
	} else {
		uniqueInfo.captured = false;
	}

	plugin.uniques.updateCheckedAndHighlight(guid);
	plugin.uniques.sync(guid);
}

window.plugin.uniques.updateScoutControlled = function(scoutControlled, guid) {
	if (guid == undefined) guid = window.selectedPortal;

	var uniqueInfo = plugin.uniques.uniques[guid];
	if (!uniqueInfo) {
		plugin.uniques.uniques[guid] = uniqueInfo = {
			scoutControlled: false,
		};
	}

	if (scoutControlled == uniqueInfo.scoutControlled) return;

	if (scoutControlled) {
		uniqueInfo.scoutControlled = true;
	} else {
		uniqueInfo.scoutControlled = false;
	}

	plugin.uniques.updateCheckedAndHighlight(guid);
	plugin.uniques.sync(guid);
}

window.plugin.uniques.updateDroneVisited = function(droneVisited, guid) {
	if (guid == undefined) guid = window.selectedPortal;

	var uniqueInfo = plugin.uniques.uniques[guid];
	if (!uniqueInfo) {
		plugin.uniques.uniques[guid] = uniqueInfo = {
			droneVisited: false
		};
	}

	if (droneVisited == uniqueInfo.droneVisited) return;

	if (droneVisited) {
		uniqueInfo.droneVisited = true;
	} else {
		uniqueInfo.droneVisited = false;
	}

	plugin.uniques.updateCheckedAndHighlight(guid);
	plugin.uniques.sync(guid);
}

// stores the given GUID for sync
plugin.uniques.sync = function(guid) {
	plugin.uniques.updateQueue[guid] = true;
	plugin.uniques.storeLocal('uniques');
	plugin.uniques.storeLocal('updateQueue');
	plugin.uniques.syncQueue();
}

// sync the queue, but delay the actual sync to group a few updates in a single request
window.plugin.uniques.syncQueue = function() {
	if(!plugin.uniques.enableSync) return;

	clearTimeout(plugin.uniques.syncTimer);

	plugin.uniques.syncTimer = setTimeout(function() {
		plugin.uniques.syncTimer = null;

		$.extend(plugin.uniques.updatingQueue, plugin.uniques.updateQueue);
		plugin.uniques.updateQueue = {};
		plugin.uniques.storeLocal('updatingQueue');
		plugin.uniques.storeLocal('updateQueue');

		plugin.sync.updateMap('uniques', 'uniques', Object.keys(plugin.uniques.updatingQueue));
	}, plugin.uniques.SYNC_DELAY);
}

//Call after IITC and all plugin loaded
window.plugin.uniques.registerFieldForSyncing = function() {
	if(!window.plugin.sync) return;
	window.plugin.sync.registerMapForSync('uniques', 'uniques', window.plugin.uniques.syncCallback, window.plugin.uniques.syncInitialed);
}

//Call after local or remote change uploaded
window.plugin.uniques.syncCallback = function(pluginName, fieldName, e, fullUpdated) {
	if(fieldName === 'uniques') {
		plugin.uniques.storeLocal('uniques');
		// All data is replaced if other client update the data during this client
		// offline,
		// fire 'pluginUniquesRefreshAll' to notify a full update
		if(fullUpdated) {
			// a full update - update the selected portal sidebar
			if (window.selectedPortal) {
				plugin.uniques.updateCheckedAndHighlight(window.selectedPortal);
			}
			// and also update all highlights, if needed
			if (window.plugin.uniques.isHighlightActive) {
				resetHighlightedPortals();
			}

			window.runHooks('pluginUniquesRefreshAll');
			return;
		}

		if(!e) return;
		if(e.isLocal) {
			// Update pushed successfully, remove it from updatingQueue
			delete plugin.uniques.updatingQueue[e.property];
		} else {
			// Remote update
			delete plugin.uniques.updateQueue[e.property];
			plugin.uniques.storeLocal('updateQueue');
			plugin.uniques.updateCheckedAndHighlight(e.property);
			window.runHooks('pluginUniquesUpdateUniques', {guid: e.property});
		}
	}
}

//syncing of the field is initialed, upload all queued update
window.plugin.uniques.syncInitialed = function(pluginName, fieldName) {
	if(fieldName === 'uniques') {
		plugin.uniques.enableSync = true;
		if(Object.keys(plugin.uniques.updateQueue).length > 0) {
			plugin.uniques.syncQueue();
		}
	}
}

window.plugin.uniques.storeLocal = function(name) {
	var key = window.plugin.uniques.FIELDS[name];
	if(key === undefined) return;

	var value = plugin.uniques[name];

	if(typeof value !== 'undefined' && value !== null) {
		localStorage[key] = JSON.stringify(plugin.uniques[name]);
	} else {
		localStorage.removeItem(key);
	}
}

window.plugin.uniques.loadLocal = function(name) {
	var key = window.plugin.uniques.FIELDS[name];
	if(key === undefined) return;

	if(localStorage[key] !== undefined) {
		plugin.uniques[name] = JSON.parse(localStorage[key]);
  }
}

// transformData - function to transform storagedata still using "scouted and droned".
window.plugin.uniques.transformData = function () {
  var trans;
  for (var guid in window.plugin.uniques.uniques) {
    trans = window.plugin.uniques.uniques[guid];
    if (trans.scouted) {
      trans.scoutControlled = trans.scouted;
      delete trans.scouted;
    };
    if (trans.droned) {
      trans.droneVisited = trans.droned;
      delete trans.droned;
    };
  };

  for (var id in window.plugin.uniques.missedLatLngs) {
    
    trans = window.plugin.uniques.missedLatLngs[id].action
    if (trans.scouted) {
      trans.scoutControlled = trans.scouted;
      delete trans.scouted;
    };
    if (trans.droned) {
      trans.droneVisited = trans.droned;
      delete trans.droned;
    };
  };

  window.plugin.uniques.uniques['version.040']={};
  window.plugin.uniques.storeLocal('missedLatLngs');
  window.plugin.uniques.storeLocal('uniques');
};

/****************************************************************************************/
/** HIGHLIGHTERS ************************************************************************/
/****************************************************************************************/
// highlighter captured
window.plugin.uniques.highlighterCaptured = {
	highlight: function(data) {
		var guid = data.portal.options.ent[0];
		var uniqueInfo = window.plugin.uniques.uniques[guid];

		var style = {};

		if (uniqueInfo) {
			if (uniqueInfo.captured) {
				// captured (and, implied, visited too) - no highlights

			} else if (uniqueInfo.visited) {
				style.fillColor = 'yellow';
				style.fillOpacity = 0.6;
			} else {
				// we have an 'uniqueInfo' entry for the portal, but it's not set visited or captured?
				// could be used to flag a portal you don't plan to visit, so use a less opaque red
				style.fillColor = 'red';
				style.fillOpacity = 0.5;
			}
		} else {
			// no visit data at all
			style.fillColor = 'red';
			style.fillOpacity = 0.7;
		}

		data.portal.setStyle(style);
	},

	setSelected: function(active) {
		window.plugin.uniques.isHighlightActive = active;
	}
}

// highlighter scoutControlled
window.plugin.uniques.highlighterScoutControlled = {
	highlight: function(data) {
		var guid = data.portal.options.ent[0];
		var uniqueInfo = window.plugin.uniques.uniques[guid];

		var style = {};

		if (uniqueInfo && uniqueInfo.scoutControlled) { 
      // scoutControlled - no highlights
		} else {
				style.fillColor = 'red';
				style.fillOpacity = 0.7;
		}
		data.portal.setStyle(style);
	},

	setSelected: function(active) {
		window.plugin.uniques.isHighlightActive = active;
	}
}
// highlighter droneVisited
window.plugin.uniques.highlighterDroneVisited = {
	highlight: function(data) {
		var guid = data.portal.options.ent[0];
		var uniqueInfo = window.plugin.uniques.uniques[guid];

		var style = {};

		if (uniqueInfo && uniqueInfo.droneVisited) { 
      // droneVisited - no highlights
		} else {
				style.fillColor = 'red';
				style.fillOpacity = 0.7;
		}
		data.portal.setStyle(style);
	},

	setSelected: function(active) {
		window.plugin.uniques.isHighlightActive = active;
	}
}

window.plugin.uniques.setupCSS = function() {
	$("<style>")
	.prop("type", "text/css")
	.html('@include_string:uniques.css@')
	.appendTo("head");
}

window.plugin.uniques.setupContent = function() {
	plugin.uniques.contentHTML = '<div id="uniques-container">'
		+ '<label><input type="checkbox" id="visited" onclick="window.plugin.uniques.updateVisited($(this).prop(\'checked\'))"> Visited</label>'
		+ '<label><input type="checkbox" id="captured" onclick="window.plugin.uniques.updateCaptured($(this).prop(\'checked\'))"> Captured</label>'
		+ '<label><input type="checkbox" id="scoutControlled" onclick="window.plugin.uniques.updateScoutControlled($(this).prop(\'checked\'))"> Scout controlled</label>'
		+ '<label><input type="checkbox" id="droneVisited" onclick="window.plugin.uniques.updateDroneVisited($(this).prop(\'checked\'))"> Drone visited</label>'
		+ '</div>';
	plugin.uniques.disabledMessage = '<div id="uniques-container" class="help" title="Your browser does not support localStorage">Plugin Uniques disabled</div>';
}
// ***************************************************************************************
window.plugin.uniques.setupPortalsList = function() {

	window.addHook('pluginUniquesUpdateUniques', function(data) {
		var info = plugin.uniques.uniques[data.guid];
		if (!info) info = { visited: false, captured: false, scoutControlled: false, droneVisited: false	};

		$('[data-list-uniques="'+data.guid+'"].visited').prop('checked', !!info.visited);
		$('[data-list-uniques="'+data.guid+'"].captured').prop('checked', !!info.captured);
		$('[data-list-uniques="'+data.guid+'"].scoutControlled').prop('checked', !!info.scoutControlled);
		$('[data-list-uniques="'+data.guid+'"].droneVisited').prop('checked', !!info.droneVisited);
	});

	window.addHook('pluginUniquesRefreshAll', function() {
		$('[data-list-uniques]').each(function(i, element) {
			var guid = element.getAttribute("data-list-uniques");

			var info = plugin.uniques.uniques[guid];
			if (!info) info = { visited: false, captured: false, scoutControlled: false, droneVisited: false };

			var e = $(element);
			if (e.hasClass('visited')) e.prop('checked', !!info.visited);
			if (e.hasClass('captured')) e.prop('checked', !!info.captured);
			if (e.hasClass('scoutControlled')) e.prop('checked', !!info.scoutControlled);
			if (e.hasClass('droneVisited')) e.prop('checked', !!info.droneVisited);
		});
	});

	function uniqueValue(guid) {
		var info = plugin.uniques.uniques[guid];
		if (!info) return 0;
		if (info.visited === undefined) return 0;
		if (!info.visited) return 0;
		if (info.visited && info.captured) return 2;
		if (info.visited) return 1;
	}

	function scoutControlledValue(guid) {
		var info = plugin.uniques.uniques[guid];
		if (!info) return 0;
		if (info.scoutControlled === undefined ) return 0;
		if (info.scoutControlled === true) return 1;
	}

	function droneVisitedValue(guid) {
		var info = plugin.uniques.uniques[guid];
		if (!info) return 0;
		if (info.droneVisited === undefined ) return 0;
		if (info.droneVisited === true) return 1;
	}

	window.plugin.portalslist.fields.push({
		title: "V/C",
		value: function(portal) { return portal.options.guid; }, // we store the guid, but implement a custom comparator so the list does sort properly without closing and reopening the dialog
		sort: function(guidA, guidB) {
			return uniqueValue(guidA) - uniqueValue(guidB);
		},
		format: function(cell, portal, guid) {
			var info = plugin.uniques.uniques[guid];
			if (!info) info = { visited: false, captured: false, scoutControlled: false, droneVisited: false	};

			$(cell).addClass("portal-list-uniques");

			// for some reason, jQuery removes event listeners when the list is sorted. Therefore we use DOM's addEventListener
			$('<input>')
				.prop({
					type: "checkbox",
					className: "visited",
					title: "Portal visited?",
					checked: !!info.visited,
				})
				.attr("data-list-uniques", guid)
				.appendTo(cell)
				[0].addEventListener("change", function(ev) {
					window.plugin.uniques.updateVisited(this.checked, guid);
					ev.preventDefault();
					return false;
				}, false);
			$('<input>')
				.prop({
					type: "checkbox",
					className: "captured",
					title: "Portal captured?",
					checked: !!info.captured,
				})
				.attr("data-list-uniques", guid)
				.appendTo(cell)
				[0].addEventListener("change", function(ev) {
					window.plugin.uniques.updateCaptured(this.checked, guid);
					ev.preventDefault();
					return false;
				}, false);
			},
		},
//---------------------------------------------------------------------------
		{
      title: "S",
			value: function(portal) { return portal.options.guid; }, // we store the guid, but implement a custom comparator so the list does sort properly without closing and reopening the dialog
			sort:	function(guidA, guidB) {
				return scoutControlledValue(guidA) - scoutControlledValue(guidB);
			},
			format: function(cell, portal, guid) {
			var info = plugin.uniques.uniques[guid];
			if (!info) info = { visited: false, captured: false, scoutControlled: false, droneVisited: false	};

			$(cell).addClass("portal-list-uniques");

			// for some reason, jQuery removes event listeners when the list is sorted. Therefore we use DOM's addEventListener
			$('<input>')
				.prop({
					type: "checkbox",
					className: "scoutControlled",
					title: "Portal scoutControlled?",
					checked: !!info.scoutControlled,
				})
				.attr("data-list-uniques", guid)
				.appendTo(cell)
				[0].addEventListener("change", function(ev) {
					window.plugin.uniques.updateScoutControlled(this.checked, guid);
					ev.preventDefault();
					return false;
				}, false);
		},
	},
//---------------------------------------------------------------------------
		{
      title: "D",
			value: function(portal) { return portal.options.guid; }, // we store the guid, but implement a custom comparator so the list does sort properly without closing and reopening the dialog
			sort:	function(guidA, guidB) {
				return droneVisitedValue(guidA) - droneVisitedValue(guidB);
			},
			format: function(cell, portal, guid) {
			var info = plugin.uniques.uniques[guid];
			if (!info) info = { visited: false, captured: false, scoutControlled: false, droneVisited: false	};

			$(cell).addClass("portal-list-uniques");

			// for some reason, jQuery removes event listeners when the list is sorted. Therefore we use DOM's addEventListener
			$('<input>')
				.prop({
					type: "checkbox",
					className: "droneVisited",
					title: "Portal droneVisited?",
					checked: !!info.droneVisited,
				})
				.attr("data-list-uniques", guid)
				.appendTo(cell)
				[0].addEventListener("change", function(ev) {
					window.plugin.uniques.updateDroneVisited(this.checked, guid);
					ev.preventDefault();
					return false;
				}, false);
		},
	}
// --------------------------------------------------------------------------

	);
};

window.plugin.uniques.onMissionChanged = function(data) {
	if(!data.local) return;

	var mission = window.plugin.missions && window.plugin.missions.getMissionCache(data.mid, false);
	if(!mission) return;

	window.plugin.uniques.checkMissionWaypoints(mission);
};

window.plugin.uniques.onMissionLoaded = function(data) {
	// the mission has been loaded, but the dialog isn't visible yet.
	// we'll wait a moment so the mission dialog is opened behind the confirmation prompt
	setTimeout(function() {
		window.plugin.uniques.checkMissionWaypoints(data.mission);
	}, 0);
};

window.plugin.uniques.checkMissionWaypoints = function(mission) {
	if(!(window.plugin.missions && window.plugin.missions.checkedMissions[mission.guid])) return;

	if(!mission.waypoints) return;

	function isValidWaypoint(wp) {
		// might be hidden or field trip card
		if(!(wp && wp.portal && wp.portal.guid)) return false;

		// only use hack, deploy, link, field and upgrade; ignore photo and passphrase
		if(wp.objectiveNum <= 0 || wp.objectiveNum > 5) return false;

		return true;
	}
	function isVisited(wp) {
		var guid = wp.portal.guid,
			uniqueInfo = plugin.uniques.uniques[guid],
			visited = (uniqueInfo && uniqueInfo.visited) || false;

		return visited;
	}

	// check if all waypoints are already visited
	if(mission.waypoints.every(function(wp) {
		if(!isValidWaypoint(wp)) return true;
		return isVisited(wp);
	})) return;

	if(!confirm('The mission ' + mission.title + ' contains waypoints not yet marked as visited.\n\n' +
			'Do you want to set them to \'visited\' now?'))
		return;

	mission.waypoints.forEach(function(wp) {
		if(!isValidWaypoint(wp)) return;
		if(isVisited(wp)) return;

		plugin.uniques.setPortalAction(wp.portal.guid,'visited');
	});
};
/****************************************************************************************/
/** Im-/Export of uniques ***************************************************************/
/****************************************************************************************/
window.plugin.uniques.optExport = function() {
	var data = localStorage['plugin-uniques-data'];
	window.saveFile(data, 'IITC-uniques.json', 'application/json');
}
window.plugin.uniques.optImport = function() {
	L.FileListLoader.loadFiles({accept:'application/json'})
		.on('load',function (e) {
			try {
				var msgExit = 'Please only confirm this if you know what you are doing!\n'
				                    + 'Are you sure you want to save your Unique visits/captures back to IITC?';
				if (!confirm(msgExit)) {
				  return;
				}
				var data = JSON.parse(e.reader.result);

				if (Object.keys(data).length) {
				  window.plugin.uniques.uniques = data;
				}
				console.log('UNIQUES: reset and imported uniques.');
				confirm('Import Successful.');
				// to write back the data to localStorage
				window.plugin.uniques.storeLocal('uniques');
			} catch(e) {
				console.warn('UNIQUES: failed to import data: '+e);
			}
		});
}

/*****************************************************************************************/
/** UNIQUES Backlog to be processed whenever a portal's LatLonE6 can be resolved to GUID */
/*****************************************************************************************/
window.plugin.uniques.onPortalAdded = function(data) {
	var guid = data.portal.options.guid;
	var p = data.portal.options.data;
	var id = p.latE6 + "," + p.lngE6;

	//console.log("portal added: %s %s %o", guid, id, data);
	// check if portal is in missedLatLngs
	if (window.plugin.uniques.missedLatLngs[id]) {
		window.plugin.uniques.uniques[guid] = Object.assign (
			{},
			window.plugin.uniques.uniques[guid],
			window.plugin.uniques.missedLatLngs[id].action
		);
		window.plugin.uniques.storeLocal('uniques');
		delete window.plugin.uniques.missedLatLngs[id];
		window.plugin.uniques.storeLocal('missedLatLngs');
		$("#missedPL").html(window.plugin.uniques.genList());
	}
}

window.plugin.uniques.removeOldParsedMsgs = function() {
//	remove all timestamps older than 30 days
	var old = (Date.now() - (30*24*60*60*1000)); //30 days in miliseconds
	var count = 0;
	for (var item in window.plugin.uniques.parsedMsgs){
		if (item < old) {
			delete item;
			count++;
		}
	}
	console.log ('[uniques] removed %s old parsedMsgs', count);
}

window.plugin.uniques.genList = function (){
	var mLL = window.plugin.uniques.missedLatLngs;
	var list = '';
	for (var item in mLL) {
		var p = mLL[item].portal;
		list = list + '<a onclick="map.setView(['+p.latE6/1E6+','+p.lngE6/1E6+'],15);">'+p.name+'</a><br>';
	}
	return list
}

window.plugin.uniques.options = function (){
	aoPortals=window.plugin.uniques.uniques;
	visited=captured=scoutControlled=droneVisited=0;
	$.each(aoPortals,function(PUID){
		aPortal=window.plugin.uniques.uniques[PUID];
		if (aPortal.visited) visited++;
		if (aPortal.captured) captured++;
		if (aPortal.scoutControlled) scoutControlled++;
		if (aPortal.droneVisited) droneVisited++;
	});

	let list = 'Unique Portals Count:<br>visited: '+visited+' - captured: '+captured+'<br>scoutControlled: '+scoutControlled+' - droneVisited: '+droneVisited+'<br><hr>'
			+ 'Missed Portals: <br>Click on portals to move the map to resolve the backlogged actions for this portal.<br><br>'
			+ '<div id="missedPL" style="height:150px;overflow:auto">'
			+ window.plugin.uniques.genList()
			+ '</div><hr>'
			+ '<a onclick="window.plugin.uniques.optExport();return false" title="Export portals\' unique info to IITC.">Backup</a> / '
			+ '<a onclick="window.plugin.uniques.optImport();return false" title="Import portals\' unique info to IITC.">Restore</a> Uniques'
	var dialog = window.dialog ({
		title: "Uniques",
		html: list,
		maxHight: 300

	}).parent();

	return dialog;
}
/****************************************************************************************/
var setup = function() {
	// HOOKS:
	// - pluginUniquesUpdateUniques
	// - pluginUniquesRefreshAll

	window.plugin.uniques.setupCSS();
	window.plugin.uniques.setupContent();
	window.plugin.uniques.loadLocal('uniques');
	window.plugin.uniques.loadLocal('missedLatLngs');

  if (!window.plugin.uniques.uniques["version.040"]) {
    window.plugin.uniques.transformData();
  };
  
  window.plugin.uniques.loadLocal('parsedMsgs');

	window.plugin.uniques.removeOldParsedMsgs();

	window.addPortalHighlighter('Uniques: drone visited', window.plugin.uniques.highlighterDroneVisited);
	window.addPortalHighlighter('Uniques: scout controlled', window.plugin.uniques.highlighterScoutControlled);
	window.addPortalHighlighter('Uniques: visited/captured', window.plugin.uniques.highlighterCaptured);

	window.addHook('portalDetailsUpdated', window.plugin.uniques.onPortalDetailsUpdated);
	window.addHook('publicChatDataAvailable', window.plugin.uniques.onPublicChatDataAvailable);
	window.addHook('alertsChatDataAvailable', window.plugin.uniques.onPublicChatDataAvailable);
	window.addHook('portalAdded', window.plugin.uniques.onPortalAdded);
	window.plugin.uniques.registerFieldForSyncing();

	// to mark mission portals as visited
	window.addHook('plugin-missions-mission-changed', window.plugin.uniques.onMissionChanged);
	window.addHook('plugin-missions-loaded-mission', window.plugin.uniques.onMissionLoaded);

	// add controls to toolbox

	var link = $('<a title="Manage UNIQUES">Uniques</a>')
	  .click(window.plugin.uniques.options);
	$("#toolbox").append(link);

	if (window.plugin.portalslist) {
		window.plugin.uniques.setupPortalsList();
	}
}
