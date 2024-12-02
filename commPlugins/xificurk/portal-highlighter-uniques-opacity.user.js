// ==UserScript==
// @author          xificurk
// @id              portal-highlighter-uniques-opacity@xificurk
// @name            Highlight unique visits/captures using opacity
// @category        Highlighter
// @version         0.2.1.20230304.150308
// @namespace       https://github.com/xificurk/iitc-plugins
// @updateURL       https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/xificurk/portal-highlighter-uniques-opacity.meta.js
// @downloadURL     https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/xificurk/portal-highlighter-uniques-opacity.user.js
// @description     [xificurk-2023-03-04-150308] Use stroke and fill opacity to denote player's unique visits and captures. Requires uniques plugin.
// @issueTracker    https://github.com/xificurk/iitc-plugins/issues
// @homepageURL     https://github.com/xificurk/iitc-plugins
// @preview         https://raw.githubusercontent.com/xificurk/iitc-plugins/master/images/portal-highlighter-uniques-opacity.png
// @include         https://intel.ingress.com/*
// @include         http://intel.ingress.com/*
// @include         https://*.ingress.com/intel*
// @include         http://*.ingress.com/intel*
// @include         https://*.ingress.com/mission/*
// @include         http://*.ingress.com/mission/*
// @match           https://intel.ingress.com/*
// @match           http://intel.ingress.com/*
// @match           https://*.ingress.com/intel*
// @match           http://*.ingress.com/intel*
// @match           https://*.ingress.com/mission/*
// @match           http://*.ingress.com/mission/*
// @grant           none
// ==/UserScript==



function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'xificurk';
plugin_info.dateTimeVersion = '20230304.150308';
plugin_info.pluginId = 'portal-highlighter-uniques-opacity';
//END PLUGIN AUTHORS NOTE


//PLUGIN START ////////////////////////////////////////////////////////


//use own namespace for plugin
window.plugin.portalHighlighterUniquesOpacity = function () {};


window.plugin.portalHighlighterUniquesOpacity.highlight = function(data, styles) {
  var portalData = data.portal.options.ent[2]
  var uniqueInfo = null;

  if (portalData[18]) {
    uniqueInfo = {
      captured: ((portalData[18] & 0b10) !== 0),
      visited: ((portalData[18] & 0b11) !== 0)
    };
  }

  var style = {};

  if(uniqueInfo) {
    if(uniqueInfo.captured) {
      // captured (and, implied, visited too) - hide
      style = styles.captured;

    } else if(uniqueInfo.visited) {
      style = styles.visited;
    }
  } else {
    // no visit data at all
    style = styles.unvisited;
  }

  data.portal.setStyle(style);
}


window.plugin.portalHighlighterUniquesOpacity.highlighter = {
  highlight: function(data) {
    window.plugin.portalHighlighterUniquesOpacity.highlight(
      data,
      {
        captured: {
          fillOpacity: 0,
          opacity: 0.25,
        },
        visited: {
          fillOpacity: 0.2,
          opacity: 1,
        },
        unvisited: {
          fillOpacity: 0.8,
          opacity: 1,
        },
      }
    );
  }
}

window.plugin.portalHighlighterUniquesOpacity.highlighterInverted = {
    highlight: function(data) {
      window.plugin.portalHighlighterUniquesOpacity.highlight(
        data,
        {
          captured: {
            fillOpacity: 0.8,
            opacity: 1,
          },
          visited: {
            fillOpacity: 0.2,
            opacity: 1,
          },
          unvisited: {
            fillOpacity: 0,
            opacity: 0.25,
          },
        }
      );
    }
}


var setup = function() {
  window.addPortalHighlighter('Uniques (opacity)', window.plugin.portalHighlighterUniquesOpacity.highlighter);
  window.addPortalHighlighter('Uniques (opacity inverted)', window.plugin.portalHighlighterUniquesOpacity.highlighterInverted);
}

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


