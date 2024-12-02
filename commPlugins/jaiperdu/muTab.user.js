// ==UserScript==
// @author         jaiperdu
// @name           MUs Tab
// @category       COMM
// @version        0.1.1
// @description    Add a MUs tab scoring the MU
// @id             muTab@jaiperdu
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/jaiperdu/muTab.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/jaiperdu/muTab.user.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'lejeu';
plugin_info.dateTimeVersion = '2023-10-19-070329';
plugin_info.pluginId = 'muTab';
//END PLUGIN AUTHORS NOTE

var musTab = {};

// musTab.commTab = {
// 	channel: 'mus',
// 	name: 'MUs',
// 	inputPrompt: '',
// 	sendMessage: () => true,
// 	request: (_, b) => chat.requestChannel('all', b),
// 	render: chat.renderChannel,
// 	localBounds: true,
// }

musTab.maxMus = 1;
musTab.maxDest = {
	ENLIGHTENED: 1,
	RESISTANCE: 1,
};
musTab.data = {}
musTab.ENLIGHTENED = {
	name: 'Enlightened',
	team: 'enl',
	totalMus: 0,
	destroyedMus: {
		ENLIGHTENED: 0,
		RESISTANCE: 0,
	},
};
musTab.RESISTANCE = {
	name: 'Resistance',
	team: 'res',
	totalMus: 0,
	destroyedMus: {
		ENLIGHTENED: 0,
		RESISTANCE: 0,
	},
}

musTab.addMus = function (guid, player, team, mus) {
	if (!(player.name in musTab.data))
		musTab.data[player.name] = {
			player: player,
			totalMus: 0,
			destroyedMus: {
				ENLIGHTENED: 0,
				RESISTANCE: 0,
			},
			mus: {},
		};
	var playerData = musTab.data[player.name];
	if (guid in playerData.mus);
	else {
		playerData.mus[guid] = mus;
		if (mus > 0) {
			playerData.totalMus += mus;
			if (playerData.totalMus > musTab.maxMus)
				musTab.maxMus = playerData.totalMus;
			musTab[player.team].totalMus += mus;
		} else {
			playerData.destroyedMus[team] -= mus;
			if (playerData.destroyedMus[team] > musTab.maxDest[team])
				musTab.maxDest[team] = playerData.destroyedMus[team];
			musTab[player.team].destroyedMus[team] -= mus;
		}
	}
};

musTab.delPlayer = function (name) {
	if (!(name in musTab.data)) return;
	var playerData = musTab.data[name];
	var teamData = musTab[playerData.player.team];
	teamData.totalMus -= playerData.totalMus;
	teamData.destroyedMus.ENLIGHTENED -= playerData.destroyedMus.ENLIGHTENED;
	teamData.destroyedMus.RESISTANCE -= playerData.destroyedMus.RESISTANCE;
	delete musTab.data[name];
};

musTab.newChatData = function (data) {
	// {raw: data, result: data.result, processed: chat._channels[channel].data}
	for (const row of data.result) {
		const guid = row[0];
		const parseData = data.processed[guid][4];
		const idMUs = row[2].plext.markup.findIndex((ent) => ent[0] == 'TEXT' && ent[1].plain === ' MUs');
		if (idMUs < 0) continue;
		const isCreateField = row[2].plext.markup[idMUs - 2][1].plain === ' +';
		const isDestroyField = row[2].plext.markup[idMUs - 2][1].plain === ' -';
		const mus = +row[2].plext.markup[idMUs - 1][1].plain;
		if (isCreateField) {
			const player = {
				name: parseData.player.name,
				team: window.TEAM_CODENAMES[parseData.player.team],
			}
			musTab.addMus(guid, player, player.team, mus);
		} else if (isDestroyField) {
			const player = {
				name: parseData.player.name,
				team: window.TEAM_CODENAMES[parseData.player.team],
			}
			const team = row[2].plext.markup[idMUs - 3][1].team;
			musTab.addMus(guid, player, team, -mus);
		}
	}
	musTab.render();
};

const template = '<tr class="{teamClass}"><td>{cross}</td><td>{name}</td><td><div class="meter"><span class="meter-bar" style="width:{totMUpercent}%">{totMU}</span></div></td><td><div class="meter"><span class="meter-bar enl" style="width:{destENLpercent}%">{destENL}</span></div></td><td><div class="meter"><span class="meter-bar res" style="width:{destRESpercent}%">{destRES}</span></div></td></tr>';

musTab.renderLine = function (data) {
	return L.Util.template(template, {
		teamClass: data.player.team === 'ENLIGHTENED' ? TEAM_TO_CSS[TEAM_ENL] : TEAM_TO_CSS[TEAM_RES],
		name: data.player.name,
		totMUpercent: Math.round(data.totalMus * 100 / musTab.maxMus),
		totMU: data.totalMus.toLocaleString('en-US'),
		destENLpercent: Math.round(data.destroyedMus.ENLIGHTENED * 100 / musTab.maxDest.ENLIGHTENED),
		destENL: data.destroyedMus.ENLIGHTENED.toLocaleString('en-US'),
		destRESpercent: Math.round(data.destroyedMus.RESISTANCE * 100 / musTab.maxDest.RESISTANCE),
		destRES: data.destroyedMus.RESISTANCE.toLocaleString('en-US'),
		cross: '<a data-name="' + data.player.name + '">❌</a>',
	});
};

musTab.render = function () {
	const elm = $('#chatmus');
	if (elm.is(':hidden')) return;

	const vals = Object.values(musTab.data).sort((a, b) => b.totalMus - a.totalMus);

	const maxFact = Math.max(musTab.ENLIGHTENED.totalMus, musTab.RESISTANCE.totalMus, 1);
	const maxDestEnl = Math.max(musTab.ENLIGHTENED.destroyedMus.ENLIGHTENED, musTab.RESISTANCE.destroyedMus.ENLIGHTENED, 1);
	const maxDestRes = Math.max(musTab.ENLIGHTENED.destroyedMus.RESISTANCE, musTab.RESISTANCE.destroyedMus.RESISTANCE, 1);

	// render to string with date separators inserted
	let msgs = '<tr><td></td><td></td><td>Total MUs</td><td colspan=2>Destroyed MUs</td></tr>';
	const facts = [musTab.ENLIGHTENED, musTab.RESISTANCE];
	if (window.PLAYER.team === "RESISTANCE") facts.reverse();
	for (const data of facts) {
		msgs += L.Util.template(template, {
			name: data.name,
			teamClass: data.team,
			totMUpercent: Math.round(data.totalMus * 100 / maxFact),
			totMU: data.totalMus.toLocaleString('en-US'),
			destENL: data.destroyedMus.ENLIGHTENED.toLocaleString('en-US'),
			destENLpercent: Math.round(data.destroyedMus.ENLIGHTENED * 100 / maxDestEnl),
			destRES: data.destroyedMus.RESISTANCE.toLocaleString('en-US'),
			destRESpercent: Math.round(data.destroyedMus.RESISTANCE * 100 / maxDestRes),
			cross: ''
		});
	}
	msgs += '<tr><td colspan=5><hr></td></tr>'
	vals.forEach(function (d) {
		msgs += musTab.renderLine(d);
	});

	elm.html('<table>' + msgs + '</table>');
}

musTab.create = function () {
	$('#chatcontrols').append('<a>MUs</a>');
	$('#chatcontrols a:last').click(musTab.toogle);
	$('#chat').append('<div style="display: none" id="chatmus"><table></table></div>');

	document.getElementById('chatmus').addEventListener('click', (ev) => {
		if (ev.target.dataset['name']) {
			musTab.delPlayer(ev.target.dataset['name']);
			musTab.render();
		}
	})

	if (useAndroidPanes()) {
		android.addPane('mus-tab', 'MUs', 'ic_action_view_as_list');
		window.addHook('paneChanged', function (id) {
			if (id == 'mus-tab') {
				musTab.toogle();
			}
		})
	}
};

musTab.toogle = function () {
	$('#chat, #chatinput').show();
	$('#chatinput mark').css('cssText', 'color: #bbb !important').text('');
	$('#chat > div').hide();
	$('#chatmus').show();
	$('#chatcontrols .active').removeClass('active');
	$("#chatcontrols a:contains('MUs')").addClass('active');
	musTab.render();
}


var setup = function () {
	$('<style>').html('#chatmus .meter .meter-bar { display: inline-block; } #chatmus .enl .meter-bar, #chatmus span.enl.meter-bar { background-color: green } #chatmus .res .meter-bar, #chatmus span.res.meter-bar { background-color: blue } #chatmus .meter-bar { text-shadow: 0.0em 0.0em 0.3em #808080; text-align: center; }').appendTo(document.head);
	window.plugin.musTab = musTab;
	musTab.create();
	window.addHook('publicChatDataAvailable', musTab.newChatData);
};
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

