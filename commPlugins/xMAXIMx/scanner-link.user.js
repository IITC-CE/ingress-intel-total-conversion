// ==UserScript==
// @author         xMAXIMx
// @id             scanner-link@xMAXIMx
// @name           Scanner link
// @version        0.1
// @description    Adds scanner link to IITC
// @category       Info
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/xMAXIMx/scanner-link.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/xMAXIMx/scanner-link.user.js
// @include        *://*.ingress.com/*
// @match          *://*.ingress.com/*
// ==/UserScript==

function wrapper(plugin_info) {
  if(typeof window.plugin !== 'function') window.plugin = function(){};
  window.plugin.scannerLink = function () {};
  window.plugin.scannerLink.portalInfo = function () {$('.linkdetails').append('<aside><a id="scannerLink" target="_blank" href="https://link.ingress.com/?link=https%3A%2F%2Fintel.ingress.com%2Fportal%2F' + window.selectedPortal + '&apn=com.nianticproject.ingress&isi=576505181&ibi=com.google.ingress&ifl=https%3A%2F%2Fapps.apple.com%2Fapp%2Fingress%2Fid576505181&ofl=https%3A%2F%2Fintel.ingress.com%2Fintel%3Fpll%3D' + window.portals[window.selectedPortal]._latlng.lat + '%2C' + window.portals[window.selectedPortal]._latlng.lng + '">Scanner Link</a></aside>');};
  function setup() {window.addHook('portalDetailsUpdated', window.plugin.scannerLink.portalInfo);}
  setup.info = plugin_info;
  if (!window.bootPlugins) window.bootPlugins = [];
  window.bootPlugins.push(setup);
  if (window.iitcLoaded && typeof setup === 'function')setup();
}
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {info.script = {version: GM_info.script.version,name: GM_info.script.name,description: GM_info.script.description};}
var textContent = document.createTextNode('('+ wrapper +')('+ JSON.stringify(info) +')');
script.appendChild(textContent);
(document.body || document.head || document.documentElement).appendChild(script);
