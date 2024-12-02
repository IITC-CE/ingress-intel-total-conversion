// ==UserScript==
// @author         VE6SRV
// @id             DroneRange@VE6SRV
// @name           dronerange
// @category       Layer
// @version        0.1
// @namespace      https://github.com/VE6SRV/iitc-plugins
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/VE6SRV/DroneRange.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/VE6SRV/DroneRange.user.js
// @homepageURL    https://gitbub.com/VE6SRV/iitc-plugins
// @description    Shows drone flight distance between portals
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

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'dronerange';
plugin_info.dateTimeVersion = '20200608000000';
plugin_info.pluginId = 'DroneRange';
//END PLUGIN AUTHORS NOTE



// PLUGIN START ///////////////////////////////////////////////////////

  // use own namespace for plugin
  window.plugin.dronerange = function() {};
  window.plugin.dronerange.droneLayers = {};
  window.plugin.dronerange.MIN_MAP_ZOOM = 13;

  window.plugin.dronerange.portalAdded = function(data) {
    data.portal.on('add', function() {
      window.plugin.dronerange.draw(this.options.guid, this.options.team);
    });

    data.portal.on('remove', function() {
      window.plugin.dronerange.remove(this.options.guid, this.options.team);
    });
  }

  window.plugin.dronerange.remove = function(guid, faction) {
    var previousLayer = window.plugin.dronerange.droneLayers[guid];
    if(previousLayer) {
      window.plugin.dronerange.droneCircleHolderGroup.removeLayer(previousLayer);
      delete window.plugin.dronerange.droneLayers[guid];
    }
  }

  window.plugin.dronerange.draw = function(guid, faction) {
    var d = window.portals[guid];


    var coo = d._latlng;
    var latlng = new L.LatLng(coo.lat,coo.lng);
    var portalLevel = d.options.level;
    var optCircle = {color:'black',opacity:0.7,fillColor:'black',fillOpacity:0.1,weight:1,clickable:false, dashArray: [10,6]};
    var range = 300;
    var circle = new L.Circle(latlng, range, optCircle);
    circle.addTo(window.plugin.dronerange.droneCircleHolderGroup);
    window.plugin.dronerange.droneLayers[guid] = circle;
    }


  window.plugin.dronerange.showOrHide = function() {
    if(map.getZoom() >= window.plugin.dronerange.MIN_MAP_ZOOM) {
      // show the layer
      if(!window.plugin.dronerange.droneLayerHolderGroup.hasLayer(window.plugin.dronerange.droneCircleHolderGroup)) {
        window.plugin.dronerange.droneLayerHolderGroup.addLayer(window.plugin.dronerange.droneCircleHolderGroup);
        $('.leaflet-control-layers-list span:contains("DroneRange")').parent('label').removeClass('disabled').attr('title', '');
      }
    } else {
      // hide the layer
      if(window.plugin.dronerange.droneLayerHolderGroup.hasLayer(window.plugin.dronerange.droneCircleHolderGroup)) {
        window.plugin.dronerange.droneLayerHolderGroup.removeLayer(window.plugin.dronerange.droneCircleHolderGroup);
        $('.leaflet-control-layers-list span:contains("DroneRange")').parent('label').addClass('disabled').attr('title', 'Zoom in to show those.');
      }
    }
  }

  var setup =  function() {
    // this layer is added to the layer chooser, to be toggled on/off
    window.plugin.dronerange.droneLayerHolderGroup = new L.LayerGroup();
    // this layer is added into the above layer, and removed from it when we zoom out too far
    window.plugin.dronerange.droneCircleHolderGroup = new L.LayerGroup();
    window.plugin.dronerange.droneLayerHolderGroup.addLayer(window.plugin.dronerange.droneCircleHolderGroup);
    window.addLayerGroup('DroneRange', window.plugin.dronerange.droneLayerHolderGroup, true);
    window.addHook('portalAdded', window.plugin.dronerange.portalAdded);
    map.on('zoomend', window.plugin.dronerange.showOrHide);
    window.plugin.dronerange.showOrHide();
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
