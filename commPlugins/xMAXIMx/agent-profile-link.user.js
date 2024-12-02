// ==UserScript==
// @author         xMAXIMx
// @id             agent-profile-link@xMAXIMx
// @name           Agent profile link
// @description    Adds agent profile link in search bar of IITC
// @version        0.1
// @category       Info
// @namespace      https://zxc.one
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/xMAXIMx/agent-profile-link.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/xMAXIMx/agent-profile-link.user.js
// @include        *://*.ingress.com/*
// @match          *://*.ingress.com/*
// ==/UserScript==

function wrapper(plugin_info) {
  const nickRegex = /^[a-zA-Z0-9_]+$/gm;
  if(typeof window.plugin !== 'function') window.plugin = function(){};
  window.plugin.agentProfileLink = function () {};
  window.plugin.agentProfileLink.copyLink = function (link){if (typeof android !== "undefined") {androidCopy(link);}else{navigator.clipboard.writeText(link);}}
  window.plugin.agentProfileLink.onSearch = function (query) {
    let n;let resultInfo;let title;var trackerPlugin = '';let aclr;
    while ((n = nickRegex.exec(query.term)) !== null) {if (n.index === nickRegex.lastIndex) {nickRegex.lastIndex++;}if (n.length > 0){
      if (typeof window.plugin.playerTracker === "function"){trackerPlugin = 'playerTracker';}
      else if(typeof window.plugin.playerTrackerWithNames === "function"){trackerPlugin = 'playerTrackerWithNames';}
      else if(typeof window.plugin.muTracker === "function"){trackerPlugin = 'muTracker';}
      if (trackerPlugin != '' && n[0] in window.plugin[trackerPlugin].stored){title = '<mark class="nickname help ' + (window.plugin[trackerPlugin].stored[n[0]].team == 'RESISTANCE' ? 'res' : 'enl') + '">' + n[0] + '</mark><mark style="color: white;">\'s profile links:</mark>';}
      else{title = '<mark style="color: white;">' + n[0] + '\'s profile links:</mark>';}
      let userLink = `https://link.ingress.com/?link=https%3A%2F%2Fintel.ingress.com%2Fagent%2F${n[0]}&apn=com.nianticproject.ingress&isi=576505181&ibi=com.google.ingress&ifl=https%3A%2F%2Fapps.apple.com%2Fapp%2Fingress%2Fid576505181&ofl=https%3A%2F%2Fwww.ingress.com%2F`;
      let userLinks = `<span class="ui-dialog-content"><table><tr><td><a target="_blank" href="${userLink}"><button class="ui-dialog-buttonset button" style="width: 100%;border-radius:5px;" id="agentLinkOpen">ᅠOPENᅠ</button></a></td><td> ⧸ </td><td><button class="ui-dialog-buttonset" style="width: 100%;border-radius:5px;" id="agentLinkCopy" target="_blank" onclick="window.plugin.agentProfileLink.copyLink('${userLink}')">ᅠCOPYᅠ</button></td></tr></table></span>`
      query.addResult({title: title,description: userLinks});
    }}
  };
  function setup() {window.addHook('search', window.plugin.agentProfileLink.onSearch);}
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
