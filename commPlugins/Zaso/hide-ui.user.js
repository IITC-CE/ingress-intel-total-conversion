// ==UserScript==
// @author         Zaso
// @name           Hide UI Zaso
// @category       Controls
// @version        0.1.4.20200528.070838
// @description    Hide all UI for screenshot.
// @id             hide-ui@Zaso
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/hide-ui.user.js
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/hide-ui.meta.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'ZasoItems';
plugin_info.dateTimeVersion = '2020-05-28-070838';
plugin_info.pluginId = 'hide-ui';
//END PLUGIN AUTHORS NOTE

// PLUGIN START ////////////////////////////////////////////////////////
// History
// 0.1.5 avoid default event for [ALT-h] (@mvolfik)
// 0.1.4 Headers changed. Ready for IITC-CE
// 0.1.3 Original sript


  // Don't use "hide UI" to avoid being overwritten by plugins with the same name
  window.plugin.hideUIzaso = {};

  window.plugin.hideUIzaso.setupCSS = function(){
    $('<style>').prop('type', 'text/css').html(''
      +'body.hideAllUI > *, '
      +'body.hideAllUI .leaflet-control{display:none !important;}'
      +'body.hideAllUI #map{display:block !important;}'
    ).appendTo('head');
  }

  window.plugin.hideUIzaso.toggle = function(){
    $('body').toggleClass('hideAllUI');
    if($('body').hasClass('hideAllUI')){
      map.closePopup();
    }
  }

  window.plugin.hideUIzaso.addShortcut = function(){
    document.addEventListener('keydown', function(e){
      // pressed alt+h
      if(e.keyCode === 72 && !e.shiftKey && !e.ctrlKey && e.altKey && !e.metaKey){
        window.plugin.hideUIzaso.toggle();
        e.preventDefault();
      }
    }, false);
  }

  var setup = function(){
    window.plugin.hideUIzaso.setupCSS();
    window.plugin.hideUIzaso.addShortcut();
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

