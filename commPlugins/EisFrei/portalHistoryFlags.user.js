// ==UserScript==
// @author          EisFrei
// @id              portalHistoryFlags@EisFrei
// @name            Portal History Flags
// @category        Layer
// @version         0.0.10
// @namespace       https://github.com/EisFrei/IngressPortalHistoryFlags
// @downloadURL     https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/EisFrei/portalHistoryFlags.user.js
// @updateURL       https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/EisFrei/portalHistoryFlags.meta.js
// @homepageURL     https://github.com/EisFrei/IngressPortalHistoryFlags
// @description     Shows Visited/Captured/Scouted status above portal markers
// @issueTracker    https://github.com/EisFrei/IngressPortalHistoryFlags/issues
// @include         https://intel.ingress.com/*
// @match           https://intel.ingress.com/*
// @grant           none
// ==/UserScript==


function wrapper(plugin_info) {

	// Make sure that window.plugin exists. IITC defines it as a no-op function,
	// and other plugins assume the same.
	if (typeof window.plugin !== "function") window.plugin = function () {};
	const KEY_SETTINGS = "plugin-portal-history-flags";

	window.plugin.PortalHistoryFlags = function () {};

	const thisPlugin = window.plugin.PortalHistoryFlags;
	// Name of the IITC build for first-party plugins
	plugin_info.buildName = "PortalHistoryFlags";

	// Datetime-derived version of the plugin
	plugin_info.dateTimeVersion = "202102070043";

	// ID/name of the plugin
	plugin_info.pluginId = "portalhistoryflags";


	function svgToIcon(str, s) {
		const url = ("data:image/svg+xml," + encodeURIComponent(str)).replace(/#/g, '%23');
		return new L.Icon({
			iconUrl: url,
			iconSize: [s, s],
			iconAnchor: [s / 2, s / 2],
			className: 'no-pointer-events', //allows users to click on portal under the unique marker
		})
	}

	thisPlugin.removePortalFromMap = function (data) {
		if (!data.portal._historyLayer) {
			return;
		}
		thisPlugin.layerGroup.removeLayer(data.portal._historyLayer);
	}

	thisPlugin.addToPortalMap = function (data) {
		if (data.portal.options.ent.length === 3 && data.portal.options.ent[2].length >= 19 && data.portal.options.ent[2][18] > 0) {
			data.portal.options.data.agentVisited = (data.portal.options.ent[2][18] & 0b1) === 1;
			data.portal.options.data.agentCaptured = (data.portal.options.ent[2][18] & 0b10) === 2;
			data.portal.options.data.agentScouted = (data.portal.options.ent[2][18] & 0b100) === 4;
		}
		//IITC.me support: getCurrentZoomTileParameters is iitc.app only; iitc.me function is: getMapZoomTileParameters
		var tileParams = window.getCurrentZoomTileParameters ? window.getCurrentZoomTileParameters() : window.getMapZoomTileParameters();
		if (tileParams.level === 0) {
			drawPortalFlags(data.portal);
		} else {
			thisPlugin.removePortalFromMap(data);
		}
	}

	thisPlugin.toggleDisplayMode = function () {
		dialog({
			html: `<div id="portal-history-settings">
<div>
  <select id="portal-history-settings--display-mode">
    <option value="received" ${thisPlugin.settings.drawMissing?'':'selected'}>Show uniques received</option>
    <option value="missing" ${thisPlugin.settings.drawMissing?'selected':''}>Show missing uniques</option>
  </select>
</div>
<div><label style="color:#9538ff;"><input type="checkbox" id="portal-history-settings--show-visited" ${thisPlugin.settings.showVisited?'checked':''}> Show visited</label></div>
<div><label style="color:#ff0000;"><input type="checkbox" id="portal-history-settings--show-captured" ${thisPlugin.settings.showCaptured?'checked':''}> Show captured</label></div>
<div><label style="color:#ff9c00;"><input type="checkbox" id="portal-history-settings--show-scouted" ${thisPlugin.settings.showScouted?'checked':''}> Show scouted</label></div>
</div>`,
			title: 'Portal History Settings',
			id: 'plugin-portal-history-flags',
			width: 'auto',
			closeCallback: function () {
				const elMode = document.getElementById('portal-history-settings--display-mode');
				const elVisited = document.getElementById('portal-history-settings--show-visited');
				const elCaptured = document.getElementById('portal-history-settings--show-captured');
				const elScouted = document.getElementById('portal-history-settings--show-scouted');

				thisPlugin.settings.drawMissing = elMode.value === 'missing';
				thisPlugin.settings.showVisited = elVisited.checked;
				thisPlugin.settings.showCaptured = elCaptured.checked;
				thisPlugin.settings.showScouted = elScouted.checked;

				localStorage[KEY_SETTINGS] = JSON.stringify(thisPlugin.settings);
				createIcons();
				drawAllFlags();
			}
		});
	}

	function drawPortalFlags(portal) {
		/*if (portal._historyLayer) {
		    portal._historyLayer.addTo(thisPlugin.layerGroup);
		    return;
		}*/

		const drawMissing = thisPlugin.settings.drawMissing;
		portal._historyLayer = new L.LayerGroup();
		if (drawMissing && !portal.options.data.agentVisited || !drawMissing && portal.options.data.agentVisited) {
			L.marker(portal._latlng, {
				icon: thisPlugin.iconVisited[portal.options.level],
				interactive: false,
				keyboard: false,
			}).addTo(portal._historyLayer);
		}
		if (drawMissing && !portal.options.data.agentCaptured || !drawMissing && portal.options.data.agentCaptured) {
			L.marker(portal._latlng, {
				icon: thisPlugin.iconCaptured[portal.options.level],
				interactive: false,
				keyboard: false,
			}).addTo(portal._historyLayer);
		}
		if (drawMissing && !portal.options.data.agentScouted || !drawMissing && portal.options.data.agentScouted) {
			L.marker(portal._latlng, {
				icon: thisPlugin.iconScouted[portal.options.level],
				interactive: false,
				keyboard: false,
			}).addTo(portal._historyLayer);
		}
		portal._historyLayer.addTo(thisPlugin.layerGroup);
	}

	function drawAllFlags() {
		thisPlugin.layerGroup.clearLayers();

		//IITC.me support: getCurrentZoomTileParameters is iitc.app only; iitc.me function is: getMapZoomTileParameters
		var tileParams = window.getCurrentZoomTileParameters ? window.getCurrentZoomTileParameters() : window.getMapZoomTileParameters();
		if (tileParams.level !== 0) {
			return;
		}

		for (let id in window.portals) {
			drawPortalFlags(window.portals[id]);
		}
	}

	function getSVGString(size, color, parts, offset) {
		const circumference = size * Math.PI;
		const arcOffset = circumference / parts * (parts - 1);
		const rotate = 360 / parts * offset;
		return `<svg width="${(size+4)}" height="${(size+4)}" xmlns="http://www.w3.org/2000/svg"><circle stroke="${color}" stroke-width="4" fill="transparent" cx="${(size+4)/2}" cy="${(size+4)/2}" r="${(size/2)}" stroke-dasharray="${circumference}" stroke-dashoffset="${arcOffset}" transform="rotate(${rotate}, ${((size+4)/2)}, ${((size+4)/2)})" /></svg>`;
	}

	function createIcons() {
		var LEVEL_TO_RADIUS = [7, 7, 7, 7, 8, 8, 9, 10, 11];
		thisPlugin.iconCaptured = {};
		thisPlugin.iconVisited = {};
		thisPlugin.iconScouted = {};
		const parts = thisPlugin.settings.showVisited + thisPlugin.settings.showCaptured + thisPlugin.settings.showScouted;
		LEVEL_TO_RADIUS.forEach((el, idx) => {
			let size = el * 2 + 8;
			let offset = 0;
			if (thisPlugin.settings.showVisited) {
				thisPlugin.iconVisited[idx] = svgToIcon(getSVGString(size, '#9538ff', parts, offset), size + 4);
				offset++;
			} else {
				thisPlugin.iconVisited[idx] = svgToIcon(getSVGString(size, 'transparent', parts, offset), size + 4);
			}

			if (thisPlugin.settings.showCaptured) {
				thisPlugin.iconCaptured[idx] = svgToIcon(getSVGString(size, '#ff0000', parts, offset), size + 4);
				offset++;
			} else {
				thisPlugin.iconCaptured[idx] = svgToIcon(getSVGString(size, 'transparent', parts, offset), size + 4);
			}

			if (thisPlugin.settings.showScouted) {
				thisPlugin.iconScouted[idx] = svgToIcon(getSVGString(size, '#ff9c00', parts, offset), size + 4);
			} else {
				thisPlugin.iconScouted[idx] = svgToIcon(getSVGString(size, 'transparent', parts, offset), size + 4);
			}
		});
	}

	function setup() {
		try {
			thisPlugin.settings = JSON.parse(localStorage[KEY_SETTINGS]);
		} catch (e) {
			thisPlugin.settings = {
				drawMissing: false,
				showVisited: true,
				showCaptured: true,
				showScouted: false,
			};
		}

		createIcons();
		thisPlugin.layerGroup = new L.LayerGroup();
		window.addLayerGroup('Portal History', thisPlugin.layerGroup, false);

		window.addHook('portalAdded', thisPlugin.addToPortalMap);
		window.addHook('portalRemoved', thisPlugin.removePortalFromMap);
		window.map.on('zoom', drawAllFlags);
		$('#toolbox').append('<a onclick="window.plugin.PortalHistoryFlags.toggleDisplayMode()">Portal History</a>');
	}
	setup.info = plugin_info; //add the script info data to the function as a property
	// if IITC has already booted, immediately run the 'setup' function
	if (window.iitcLoaded) {
		setup();
	} else {
		if (!window.bootPlugins) {
			window.bootPlugins = [];
		}
		window.bootPlugins.push(setup);
	}
}



(function () {
	const plugin_info = {};
	if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
		plugin_info.script = {
			version: GM_info.script.version,
			name: GM_info.script.name,
			description: GM_info.script.description
		};
	}
	// Greasemonkey. It will be quite hard to debug
	if (typeof unsafeWindow != 'undefined' || typeof GM_info == 'undefined' || GM_info.scriptHandler != 'Tampermonkey') {
		// inject code into site context
		const script = document.createElement('script');
		script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(plugin_info) + ');'));
		(document.body || document.head || document.documentElement).appendChild(script);
	} else {
		// Tampermonkey, run code directly
		wrapper(plugin_info);
	}
})();
