// 
// ==UserScript==
// @author          Artoria2e5
// @name            Highlight almost-8 portals
// @category        Highlighter
// @version         0.1.2
// @id              highlight-7miss1@Artoria2e5
// @description     Find portals that are 1/2/3 resonators to level 8. Makes its own requests; use with caution.
// @namespace       https://github.com/IITC-CE/ingress-intel-total-conversion
// @downloadURL     https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Artoria2e5/highlight-7miss1.user.js
// @updateURL       https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Artoria2e5/highlight-7miss1.meta.js
// @icon            https://cdn.jsdelivr.net/gh/Artoria2e5/misc@master/ingress/highlight-7miss1.svg
// @screenshot      https://cdn.jsdelivr.net/gh/Artoria2e5/misc@master/ingress/highlight-7miss1.png
// @homepageURL     https://github.com/Artoria2e5/misc/issues
// @antiFeatures    scraper
// @match           https://intel.ingress.com/*
// @match           https://intel-x.ingress.com/*
// @grant           none
// ==/UserScript==


/* exported setup, changelog --eslint */
/* global L */
function wrapper(plugin_info) {
	// ensure plugin framework is there, even if iitc is not yet loaded
	if (typeof window.plugin !== "function") window.plugin = function () {};

	//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
	//(leaving them in place might break the 'About IITC' page or break update checks)
	/*
	plugin_info.buildName = 'local';
	plugin_info.dateTimeVersion = '2024-04-04-045100';
	plugin_info.pluginId = 'highlight-7miss1';
	*/
	//END PLUGIN AUTHORS NOTE

	const changelog = [
		{
			version: "0.0.1",
			changes: ["New"],
		},
		{
			version: "0.0.2",
			changes: ["Always use cache regardless of freshness -- should reduce request count."],
		},
		{
			version: "0.0.3",
			changes: [
				"Exclude self deployed portals.",
				"Exclude Machina from requests.",
				"Include portals with level equal to resCount.",
				"Change color scheme (SunsetDark).",
				"Remove debug prints.",
			],
		},
		{
			version: "0.0.4",
			changes: [
				"Add dashed stroke for the colorblind.",
				"Change color scheme again (Plasma).",
				"Fill with grey and dash when own L8 reso present.",
				"Do not exclude own non-L8 reso.",
			],
		},
		{
			version: "0.0.5",
			changes: [
				"Tweak color scheme again to maximize chroma.",
				"Generate correct dash count for L5, L6."
			],
		},
		{
			version: "0.1.0",
			changes: [
				"Add icon and other metadata.",
				"Migrate to jsDelivr URLs in metadata.",
				"Do not use const on global scope -- script and info are supposed to be shadowed. Might fix iOS!",
			],
		},
		{
			version: "0.1.1",
			changes: [
				"Make lineCap actually work (spelling, sigh). No more rounded ends.",
				"Properly clear dashArrayMemo.",
			],
		},
		{
			version: "0.1.2",
			changes: [
				"Make a request queue that fires every 20 ms. Seems to kill the 502s, mostly.",
				"Call .bringToFront() on the portal after highlighting.",
				"Add 13387-byte screenshot."
			]
		}
	];

	// use own namespace for plugin
	const self = {};
	window.plugin.highlightSevenMissOne = self;

	// chosen by python-colorspace `sequential_hcl("Plasma").colors(7)[1::2]`
	self.styles = {
		common: {
			fillOpacity: 0.85,
			lineCap: "butt",
		},
		// Modified by: setting oklch L to 45, then maximize chroma
		// chroma-maximization code: https://gist.github.com/Artoria2e5/9c7ba0bcda480b5bc2ae0b0ffe0bfb91
		sev_miss_1: { fillColor: "#8400a1" },
		// chroma-maximized too
		sev_miss_2: { fillColor: "#ef0069" },
		sev_miss_3: { fillColor: "#ECC000" },
		hasOwn: { fillColor: "#808080" },
	};

	self.dashArrayMemo = {
		scale: -1,
	};

	self.makeDashArray = (scale, dashes, level = 7) => {
		const cacheKey = level < 7 ? -dashes : dashes;
		if (self.dashArrayMemo.scale === scale) {
			if (cacheKey in self.dashArrayMemo)
				return self.dashArrayMemo[cacheKey];
		} else {
			self.dashArrayMemo = { scale };
		}

		const LEVEL_TO_RADIUS = [7, 7, 7, 7, 8, 8, 9, 10, 11];
		// 2pi ~= 6.3
		const circ = LEVEL_TO_RADIUS[level] * 6.3 * scale;
		const unit = circ / dashes / 3;
		const da = (self.dashArrayMemo[cacheKey] = `${unit * 2}, ${unit}`);
		return da;
	};

	self.checkDetail = (portal, details) => {
		if (details === undefined) {
			return;
		}
		const reso = details.resonators;

		const reso8 = reso.filter((x) => x.level === 8);
		const reso_sum = reso8.length;
		const has_own = reso8.some((x) => x.owner === PLAYER.nickname);
		const reso_needed = 8 - reso_sum;

		if (reso_needed > 3) return;

		portal.setStyle(
			L.extend(
				{},
				self.styles.common,
				has_own ? self.styles.hasOwn : self.styles["sev_miss_" + reso_needed],
				{ dashArray: self.makeDashArray(window.portalMarkerScale(), reso_sum, details.level) }
			)
		);

		portal.bringToFront();
	};

	self.requestInflight = {};
	self.requestQueue = [];

	setInterval(() => {
		if (self.requestQueue.length === 0) return;
		const guid = self.requestQueue.shift();
		const cb = self.requestInflight[guid];
		window.portalDetail
			.request(guid)
			.then((details) => {
				delete self.requestInflight[guid];
				cb(details);
			})
			.catch(() => {
				self.requestQueue.push(guid);
			});
	}, 20);

	self.requestDetail = (guid, cb) => {
		if (guid in self.requestInflight) {
			return;
		}
		self.requestInflight[guid] = cb;
		self.requestQueue.push(guid);
	};
	
	self.highlight = (data) => {
		const { data: { team, level, resCount }, guid } = data.portal.options;
		if (team === "M") return;
		if (level === 8) return;
		if (!(level === 7 || (level >= 5 && level === resCount)))
			return;

		// Accept old data (false). Only request when completely missing (undefined).
		if (window.portalDetail.isFresh(guid) === undefined) {
			self.requestDetail(guid, (details) => {
				self.checkDetail(data.portal, details);
			});
		}
		self.checkDetail(data.portal, window.portalDetail.get(guid));
	};

	const setup = self.setup = () => {
		window.addPortalHighlighter("Almost-8 Portals", self.highlight);
	};

	setup.info = plugin_info; //add the script info data to the function as a property
	if (typeof changelog !== "undefined") setup.info.changelog = changelog;
	if (!window.bootPlugins) window.bootPlugins = [];
	window.bootPlugins.push(setup);
	// if IITC has already booted, immediately run the 'setup' function
	if (window.iitcLoaded && typeof setup === "function") setup();
} // wrapper end

// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
(document.body || document.head || document.documentElement).appendChild(script);
