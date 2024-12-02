// ==UserScript==
// @author         3ch01c
// @id             barcodes@3ch01c
// @name           Replace player names with more easily remembered names
// @category       Portal Info
// @version        0.1.0.20170103
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/3ch01c/barcodes.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/3ch01c/barcodes.user.js
// @description    [3ch01c-2017-01-03] Show resonator energy percentage on resonator energy bar in portal detail panel.
// @include        https://*.ingress.com/intel*
// @include        http://*.ingress.com/intel*
// @include        https://*.ingress.com/mission/*
// @include        http://*.ingress.com/mission/*
// @match          https://*.ingress.com/intel*
// @match          http://*.ingress.com/intel*
// @match          https://*.ingress.com/mission/*
// @match          http://*.ingress.com/mission/*
// @grant          none
// ==/UserScript==



function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

// PLUGIN START ////////////////////////////////////////////////////////

// use own namespace for plugin
window.plugin.barcodes = function() {};
window.plugin.barcodes.nameMap = {
  "IIllIlIlIIlIIll": "SmurfStalkin",
  "IlIlIlIlIlIlllI": "BK2OI",
  "IllIIIllIIIIlII": "Krapos",
  "lIIllIIllIlIIlI": "Soulweeper",
  "IIIlIIIlllIIlII": "Heisenturd",
  "IIllIllIllIllI": "ProgrumUrrhurr",
  "IlIIIlIIlIIllll": "midnight1994",
  "lIIlIllIIIIllIl": "gotmystogan",
  "lIIIIIlIIlIIIIl": "akio",
  "llIlIIIlIlIlllI": "Harooukin",
  "IlllIIIIIllIlII": "catwoman",
  "IIllIIlIIllIllI": "FiverOhFive",
  "IllIIIIllIlIIll": "LIFS",
  "IIIlIIlIIIlIlII": "EP toad?",
  "lIIlllIllIIIIIl": "hammer",
  "IIlllIllIlIIllI": "play333",
  "lIlIIlIllIlIIll": "tvvsmom",
  "IIIllIllIllIllI": "227ths",
  "lIIllIlllIIIllI": "coldpizzarolls",
  "IlIlIIllIlIllll": "tvvsdad",
  "lIIlIllIlIIIlll": "nothingtheir",
  "IlllIlIIllIlIlI": "ab5543"
}
window.plugin.barcodes.barPatt = new RegExp("^[Il]{15}$");
/*
window.chat.nicknameClicked = function(event, nickname) {
  var hookData = { event: event, nickname: nickname };

  if (window.runHooks('nicknameClicked', hookData)) {
    if (window.plugin.barcodes.decode(nickname) !== nickname) {
      window.chat.addNickname('@' + nickname + " (" + window.plugin.barcodes.decode(nickname) + ")");
    }
    else {
      window.chat.addNickname('@' + nickname);
    }
  }

  event.preventDefault();
  event.stopPropagation();
  return false;
}
*/
window.plugin.barcodes.replaceNames = function(data) {
  var barPatt = window.plugin.barcodes.barPatt;
  console.log(this);
  $(".nickname, .pl_nudge_player").each(function(index, value){
    value = $(value);
    var nickname = value.text();
    if (barPatt.test(nickname)) nickname = window.plugin.barcodes.decode(nickname);
    value.text(nickname);
  });
  $(".pl_nudge_player").each(function(index, value){
    value = $(value);
    var nickname = value.text();
    nickname = nickname.substring(1,nickname.length);
    if (barPatt.test(nickname)) nickname = window.plugin.barcodes.decode(nickname);
    value.text("@" + nickname);
  });
}
window.plugin.barcodes.decode = function(barcode) {
  if (barcode in window.plugin.barcodes.nameMap){
    return window.plugin.barcodes.nameMap[barcode];
  }
  else {
    var s = "";
    for (i=0;i<3;i++){
      var b = barcode.slice((5*(i+1))-5,5*(i+1)).replace(/\I/g,'0').replace(/\l/g,'1');
      var d = parseInt(b, 2);
      s += String.fromCharCode(64 + d)
    }
    if (s.length === 3) return s;
    else return barcode;
  }
}

var setup =  function() {
  window.addHook('nicknameClicked', window.plugin.barcodes.replaceNames);
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
