// ==UserScript==
// @author         Eccenux
// @id             short-portal-info@eccenux
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @name           Short portal info
// @category       Misc
// @version        0.3.4
// @description    [0.3.4] Shows small box with a basic portal information. This is similar to mobile info.
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/eccenux/short-portal-info.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/eccenux/short-portal-info.user.js
// @include        https://*.ingress.com/intel*
// @include        http://*.ingress.com/intel*
// @match          https://*.ingress.com/intel*
// @match          http://*.ingress.com/intel*
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};


//PLUGIN START ////////////////////////////////////////////////////////
/**
	CSS based on #mobileinfo CSS.
*/
var pluginCss = `
	#shortportalinfo,
	#innerstatus {
		padding: 4px 0;
	}
	#shortportalinfo {
		float: left;
		width: 50%;
		position: relative;
		box-sizing: border-box;
	}
	@media screen and (max-width: 650px) {
		#shortportalinfo {
			width: auto;
			max-width: 90vw;
			position: absolute;
			right: 0;
			top: -2em;
		}
	}
	#shortportalinfo .basicinfo {
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow: hidden;
		padding-left: .5em;
	}

	#updatestatus .mod-list:empty {
		display: none;
	}
	#updatestatus .mod-list {
		box-sizing: border-box;
	}
	@media screen and (min-width: 651px) {
		#updatestatus .mod-list {
			position: absolute;
			left: 0;
			top: calc(-2em - 2px);
			background-color: rgba(8, 48, 78, 0.9);
			border: 1px solid #20A8B1;
			border-bottom-style: none;
		}
	}
	@media screen and (max-width: 650px) {
		#updatestatus .mod-list {
			background-color: #262c32;
			padding: 1px;
		}
	}
	#updatestatus .mod-list span {
		background-color: rgba(60, 134, 191, 0.3);
		display: inline-block;
		border: 1px solid black;
		margin: 1px 2px;
		padding: 2px;
		box-sizing: border-box;
	}
	
	#shortportalinfo .portallevel {
		padding: 0 0.25em;
		color: #FFF;
		float: left;
	}

	#shortportalinfo .resonator {
		position: absolute;
		width: 12%; /* a little less that 1/8 to have a small distance */
		height: 100%;
		top: 0;
		border-top: 3px solid red;
		box-sizing: border-box;
		-moz-box-sizing: border-box;
		-webkit-box-sizing: border-box;
	}

	#shortportalinfo .resonator.north:before {
		content: "";
		background-color: red;
		border-radius: 100%;
		display: block;
		height: 6px;
		width: 6px;
		left: 50%;
		top: -3px; 
		margin-left: -3px;
		position: absolute;
		z-index: -1;
	}

	#shortportalinfo .filllevel {
		position: absolute;
		bottom: 0;
		height: 3px;
	}

	#shortportalinfo .enl .filllevel {
		background-color: #03fe03 !important;
	}

	#shortportalinfo .res .filllevel {
		background-color: #00c5ff !important;
	}
`;

/**
	Render portal for the short info.
*/
function renderPortalMobile(guid) {
	var details = window.portalDetail.get(guid);
	if (!details) {
		return '';
	}
	var html = '';
	var isNeutral = details.resCount == 0 ? true : false;
	if(!isNeutral) {
		html += renderMods(details);
	}
	return html;
}

/**
	Render portal for the short info.
*/
function renderPortal(guid) {
	var details = window.portalDetail.get(guid);
	if (!details) {
		return '';
	}

	console.log('details', details);

	var lvl = details.level;
	var isNeutral = details.resCount == 0 ? true : false;
	var html;
	if(isNeutral) {
		html = '<span class="portallevel">L0</span>';
	}
	else {
		html = '<span class="portallevel" style="background: '+COLORS_LVL[lvl]+';">L' + lvl + '</span>';
	}
	
	if(isNeutral) {
		html += `<div class="basicinfo">${details.title}</div>`;
	}
	else {
		html += `<div class="basicinfo">${details.health}% [${details.owner}] ${details.title}</div>`;
	}
	
	if(!isNeutral) {
		html += renderResonators(details);
		
		html += renderMods(details);
	}

	return html;
}

// name map + rarity groupping
var modNameMap = {
	withRarity : {
		'heat sink' : 'HS',
		'portal shield' : 'Sh',
		'multi-hack' : 'MH',
		'link amp' : 'LA',
	},
	singleRarity : {
		'aegis shield' : 'Aegis',
		'turret' : 'Turret',
		'force amp' : 'FAmp',
		'ito en transmuter (+)' : 'ITO+',
		'ito en transmuter (-)' : 'ITO-',
	},
};

/**
	Render portal mods.
*/
function renderMods(details) {
	if (!details.mods || details.mods.length < 1) {
		return '';
	}
	var html = '';
	for(var i = 0; i < details.mods.length; i++) {
		var mod = details.mods[i];
		if (!mod) {
			continue;
		}
		var lowName = mod.name.toLowerCase();
		
		// name and rarity group check
		var hasRarity = true;
		var shortName;
		if (lowName in modNameMap.withRarity) {
			shortName = modNameMap.withRarity[lowName];
		} else if (lowName in modNameMap.singleRarity) {
			shortName = modNameMap.singleRarity[lowName];
			hasRarity = false;
		} else {
			shortName = mod.name.replace(/[^A-Z]+/g, '');
		}
		var rarityLong = mod.rarity.toLowerCase().replace(/_/, ' ');
		html += `<span title="${mod.name} (${rarityLong}) [${mod.owner}]">${shortName}`;
		
		// rarity
		if (hasRarity) {
			// 'VERY_RARE' -> 'VR'
			var rarity = mod.rarity.replace(/([A-Z])[A-Z]+/g, '$1').replace(/[^A-Z]+/g, '');
			html += ` ${rarity}`;
		}
		html += '</span>';
	}

	return `<div class="mod-list">${html}</div>`;
}

/**
	Render portal resonators.
*/
function renderResonators(details) {
	var l,v,max,perc;
	var eastAnticlockwiseToNorthClockwise = [2,1,0,7,6,5,4,3];
	var teamClass = TEAM_TO_CSS[getTeam(details)];

	var html = '';
	for(var ind=0; ind<8; ind++)
	{
		if (details.resonators.length == 8) {
			var slot = eastAnticlockwiseToNorthClockwise[ind];
			var reso = details.resonators[slot];
		} else {
			var slot = null;
			var reso = ind < details.resonators.length ? details.resonators[ind] : null;
		}

		var className = teamClass;
		if(slot !== null && OCTANTS[slot] === 'N') {
			className += ' north'
		}
		if(reso) {
			l = parseInt(reso.level);
			v = parseInt(reso.energy);
			max = RESO_NRG[l];
			perc = v/max*100;
		} else {
			l = 0;
			v = 0;
			max = 0;
			perc = 0;
		}

		html += `
			<div class="resonator ${className}" style="border-top-color: ${COLORS_LVL[l]}; left: ${(100*ind/8.0)}%;">
				<div class="filllevel" style="width:${perc}%;"></div>
			</div>
		`;
	}
	
	return html;
}

/**
	Function to run when current portal change.
*/
function updatePortalInfo(data) {
	var guid = data.selectedPortalGuid;
    if(isSmartphone()) {
		var html = renderPortalMobile(guid);
        $('#shortportalinfo').html(html);
    } else {
        var html = renderPortal(guid);
        $('#shortportalinfo').html(html);
    }
}

//PLUGIN SETUP //////////////////////////////////////////////////////////

var setup = function() {
	//if(isSmartphone()) return;
	
	// html
    if(isSmartphone()) {
        $('#updatestatus').prepend('<div id="shortportalinfo"></div>');
    } else {
        $('#updatestatus').prepend('<div id="shortportalinfo"></div>').css('width', '550px');
        $('#shortportalinfo').click(function(){
            $('#sidebartoggle').click();
        });
    }

	// css
	var css = document.createElement("style");
	css.type = "text/css";
	css.innerHTML = pluginCss;
	document.body.appendChild(css);

	// hooks
	window.addHook('portalSelected', updatePortalInfo);
};

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


