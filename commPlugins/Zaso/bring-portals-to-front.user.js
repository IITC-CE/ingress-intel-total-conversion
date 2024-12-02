// ==UserScript==
// @author         Zaso
// @name           Bring Portals To Front
// @category       Tweaks
// @version        0.0.2.20200216.174028
// @description    Bring the portals layers to front. Prevents that fields and drawn items cover them, making them unclickable.
// @id             bring-portals-to-front@Zaso
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/bring-portals-to-front.user.js
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/bring-portals-to-front.meta.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'ZasoItems';
plugin_info.dateTimeVersion = '2020-02-16-174028';
plugin_info.pluginId = 'bring-portals-to-front';
//END PLUGIN AUTHORS NOTE

// PLUGIN START ////////////////////////////////////////////////////////
// history
// 0.0.2 headers changed, ready for IITC-CE
// 0.0.1 Original Script

  // use own namespace for plugin
  window.plugin.bringPortalsToFront = function(){};

    window.plugin.bringPortalsToFront.bringTop = function(){
        window.Render.prototype.bringPortalsToFront();
    }

    window.plugin.bringPortalsToFront.drawToolsHook = function(data){
        if(data.event === 'layerCreated' || data.event === 'import'){
            window.plugin.bringPortalsToFront.bringTop();
        }
    }

//*****************************

  var setup = function(){
    window.map.on('overlayadd', function(e){
      if(e.name === 'Fields' || e.name === 'Drawn Items'){
                window.plugin.bringPortalsToFront.bringTop();
      }
    });

        window.pluginCreateHook('pluginDrawTools');
        window.addHook('pluginDrawTools', window.plugin.bringPortalsToFront.drawToolsHook);
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

