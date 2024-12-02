// ==UserScript==
// @author         jaiperdu
// @name           Ingress Icons
// @category       Appearance
// @version        0.1.2
// @description    Bring ameba64/ingress-items icons into IITC
// @id             ingress-icons@jaiperdu
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/jaiperdu/ingress-icons.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/jaiperdu/ingress-icons.user.js
// @preview        https://i.ibb.co/nsprM3s/IITC-Ingress-Icons-by-jaiperdu-desktop.jpg
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'lejeu';
plugin_info.dateTimeVersion = '2022-11-13-184151';
plugin_info.pluginId = 'ingress-icons';
//END PLUGIN AUTHORS NOTE

function getModList(d) {
  var mods = [];

  for (var i = 0; i < 4; i++) {
    var mod = d.mods[i];

    var item = {
      name: '',
      class: 'mod_free_slot',
      tooltip: '',
    };

    if (mod) {
      // all mods seem to follow the same pattern for the data structure
      // but let's try and make this robust enough to handle possible future differences

      item.name = mod.name || '(unknown mod)';

      item.class = mod.name
        .toLowerCase()
        .replace('(-)', 'minus')
        .replace('(+)', 'plus')
        .replace(/[^a-z]/g, '_');

      if (mod.rarity) {
        item.name = mod.rarity.capitalize().replace(/_/g, ' ') + ' ' + item.name;
        item.class = item.class + ' ' + mod.rarity.toLowerCase();
      }

      item.tooltip = item.name + '\n';
      if (mod.owner) {
        item.tooltip += 'Installed by: ' + mod.owner + '\n';
      }

      if (mod.stats) {
        item.tooltip += 'Stats:';
        for (var key in mod.stats) {
          if (!(key in mod.stats)) continue;
          var val = mod.stats[key];

          // if (key === 'REMOVAL_STICKINESS' && val == 0) continue;  // stat on all mods recently - unknown meaning, not displayed in stock client

          // special formatting for known mod stats, where the display of the raw value is less useful
          if      (key === 'HACK_SPEED')            val = (val/10000)+'%'; // 500000 = 50%
          else if (key === 'HIT_BONUS')             val = (val/10000)+'%'; // 300000 = 30%
          else if (key === 'ATTACK_FREQUENCY')      val = (val/1000) +'x'; // 2000 = 2x
          else if (key === 'FORCE_AMPLIFIER')       val = (val/1000) +'x'; // 2000 = 2x
          else if (key === 'LINK_RANGE_MULTIPLIER') val = (val/1000) +'x'; // 2000 = 2x
          else if (key === 'LINK_DEFENSE_BOOST')    val = (val/1000) +'x'; // 1500 = 1.5x
          else if (key === 'REMOVAL_STICKINESS' && val > 100) val = (val/10000)+'%'; // an educated guess
          // else display unmodified. correct for shield mitigation and multihack - unknown for future/other mods

          item.tooltip += '\n+' + val + ' ' + key.capitalize().replace(/_/g, ' ');
        }
      }
    }

    mods.push(item);
  }

  return mods;
}

function getModDetails(d) {
  var t = '';
  getModList(d).forEach(function (item) {
    t += '<span' + (item.tooltip.length ? ' title="' + item.tooltip + '"' : '') + ' class="' + item.class + '"></span>';
  });

  return t;
}

function updateMobile(data) {
  var el = $('#updatestatus .mods');
  if (el) el.remove();

  var guid = data.selectedPortalGuid;
  if (!window.portals[guid]) return;

  var details = window.portalDetail.get(guid);
  var t = '';
  if (details) {
    getModList(details).forEach(function (item) {
      t += '<div' + (item.tooltip.length ? ' title="' + item.tooltip + '"' : '') + ' class="' + item.class + '"></div>';
    });
  }

  $('#updatestatus').prepend('<div class="mods">' + t + '</div>');
}

function setup() {
  $('<style>').prop('type', 'text/css').html('\
#portaldetails .mods span {\
	background-size: cover;\
	width: 63px;\
	height: 68px;\
	margin: 0 3px;\
	background-color: inherit;\
	border: none;\
}\
\
.mods span, .mods .mod_free_slot {\
	background-image: url("https://raw.githubusercontent.com/ameba64/ingress-items/main/boxed/boxed_mod_free_slot.svg");\
}\
\
.mods .force_amp.rare {\
	background-image: url("https://raw.githubusercontent.com/ameba64/ingress-items/main/boxed/boxed_force_amp_rare.svg");\
}\
\
.mods .heat_sink.common {\
	background-image: url("https://raw.githubusercontent.com/ameba64/ingress-items/main/boxed/boxed_heat_sink_common.svg");\
}\
\
.mods .heat_sink.rare {\
	background-image: url("https://raw.githubusercontent.com/ameba64/ingress-items/main/boxed/boxed_heat_sink_rare.svg");\
}\
\
.mods .heat_sink.very_rare {\
	background-image: url("https://raw.githubusercontent.com/ameba64/ingress-items/main/boxed/boxed_heat_sink_very_rare.svg");\
}\
\
.mods .ito_en_transmuter_plus.very_rare {\
	background-image: url("https://raw.githubusercontent.com/ameba64/ingress-items/main/boxed/boxed_ito_en_transmuter_+_very_rare.svg");\
}\
\
.mods .ito_en_transmuter_minus.very_rare {\
	background-image: url("https://raw.githubusercontent.com/ameba64/ingress-items/main/boxed/boxed_ito_en_transmuter_-_very_rare.svg");\
}\
\
.mods .link_amp.rare {\
	background-image: url("https://raw.githubusercontent.com/ameba64/ingress-items/main/boxed/boxed_link_amp_rare.svg");\
}\
\
.mods .link_amp.very_rare {\
	background-image: url("https://raw.githubusercontent.com/ameba64/ingress-items/main/boxed/boxed_link_amp_very_rare.svg");\
}\
\
.mods .multi_hack.common {\
	background-image: url("https://raw.githubusercontent.com/ameba64/ingress-items/main/boxed/boxed_multi_hack_common.svg");\
}\
\
.mods .multi_hack.rare {\
	background-image: url("https://raw.githubusercontent.com/ameba64/ingress-items/main/boxed/boxed_multi_hack_rare.svg");\
}\
\
.mods .multi_hack.very_rare {\
	background-image: url("https://raw.githubusercontent.com/ameba64/ingress-items/main/boxed/boxed_multi_hack_very_rare.svg");\
}\
\
.mods .portal_shield.common {\
	background-image: url("https://raw.githubusercontent.com/ameba64/ingress-items/main/boxed/boxed_portal_shield_common.svg");\
}\
\
.mods .portal_shield.rare {\
	background-image: url("https://raw.githubusercontent.com/ameba64/ingress-items/main/boxed/boxed_portal_shield_rare.svg");\
}\
\
.mods .portal_shield.very_rare {\
	background-image: url("https://raw.githubusercontent.com/ameba64/ingress-items/main/boxed/boxed_portal_shield_very_rare.svg");\
}\
\
.mods .aegis_shield.very_rare {\
	background-image: url("https://raw.githubusercontent.com/ameba64/ingress-items/main/boxed/boxed_portal_shield_very_rare_aegis.svg");\
}\
\
.mods .softbank_ultra_link.very_rare {\
	background-image: url("https://raw.githubusercontent.com/ameba64/ingress-items/main/boxed/boxed_softbank_ultra_link_very_rare.svg");\
}\
\
.mods .turret.rare {\
	background-image: url("https://raw.githubusercontent.com/ameba64/ingress-items/main/boxed/boxed_turret_rare.svg ");\
}\
\
#updatestatus .mods div {\
  width: 25%;\
  height: 100%;\
  background-size: cover;\
  display: inline-block;\
}\
\
#updatestatus .mods {\
  width: 112px;\
  height: 30px;\
  margin: -30px 0px 0px calc(50% - 112px);\
  background: inherit;\
  border-radius: 4px;\
}').appendTo('head');

  window.getModDetails = getModDetails;
  if (window.isSmartphone()) window.addHook('portalSelected', updateMobile);
}

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

