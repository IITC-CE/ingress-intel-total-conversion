// ==UserScript==
// @author         GMOogway
// @id             local-storage-manager@GMOogway
// @name           Local Storage Manager
// @category       Controls
// @version        0.1.0.20190214
// @description    [local-2019-02-14] LocalStorageManager plugin by GMOogway.
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/GMOogway/local-storage-manager.user.js
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/GMOogway/local-storage-manager.meta.js
// @namespace      https://github.com/GMOogway/iitc-plugins
// @include        https://intel.ingress.com/*
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==



function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'local';
plugin_info.dateTimeVersion = '20190214';
plugin_info.pluginId = 'LocalStorageManager';
//END PLUGIN AUTHORS NOTE

// PLUGIN START ////////////////////////////////////////////////////////
// use own namespace for plugin
window.plugin.LocalStorageManager = function() {};

window.plugin.LocalStorageManager.IS_DEBUG = false;

window.plugin.LocalStorageManager.getDateTime = function() {
  var date=new Date();
  var year=date.getFullYear();
  var month=date.getMonth()+1;
  var day=date.getDate();
  var hour="00"+date.getHours();
    hour=hour.substr(hour.length-2);
  var minute="00"+date.getMinutes();
    minute=minute.substr(minute.length-2);
  var second="00"+date.getSeconds();
    second=second.substr(second.length-2);
  var week=date.getDay();
  switch(week)
  {
    case 1:week="Monday ";break;
    case 2:week="Tuesday ";break;
    case 3:week="Wednesday ";break;
    case 4:week="Thursday ";break;
    case 5:week="Friday ";break;
    case 6:week="Saturday ";break;
    case 0:week="Sunday ";break;
    default:week="";break;
  }
  return (year+"/"+month+"/"+day+"/"+" "+week+" "+hour+":"+minute+":"+second);
}

window.plugin.LocalStorageManager.debug = function(msg) {
  if (window.plugin.LocalStorageManager.IS_DEBUG){
    console.log(' ');
    console.log('**********  ' + window.plugin.LocalStorageManager.getDateTime() + '  **********');
    console.log(msg);
    console.log('*************************************************************************');
    console.log(' ');

  }
}

window.plugin.LocalStorageManager.setupContent = function() {
  plugin.LocalStorageManager.htmlCallSetBox = '<a onclick="window.plugin.LocalStorageManager.manualOpt();return false;">LocalStorageManager Opt</a>';
  var actions = '';
  actions += '<a onclick="window.plugin.LocalStorageManager.optAdd();return false;">Add</a>';
  actions += '<a onclick="window.plugin.LocalStorageManager.optDelete();return false;">Delete</a>';
  actions += '<a onclick="window.plugin.LocalStorageManager.optView();return false;">View</a>';
  actions += '<a onclick="window.plugin.LocalStorageManager.optImport();return false;">Import</a>'
  actions += '<a onclick="window.plugin.LocalStorageManager.optExport();return false;">Export</a>';
  plugin.LocalStorageManager.htmlSetbox = '<div id="LocalStorageManagerSetbox">' + actions + '</div>';
}

window.plugin.LocalStorageManager.optAdd = function() {
  var addKey = prompt('Input the key.', '');
  if (addKey == null || addKey == '') {
    return;
  }
  var addValue = prompt('Input the value.', '');
  if (addValue == null || addValue == '') {
    return;
  }
  try{
    localStorage[addKey] = addValue;
    window.plugin.LocalStorageManager.optAlert('<span style="color: #f88">Add successful.</span>');
  }catch(e){
    window.plugin.LocalStorageManager.optAlert('<span style="color: #f88">Add failed: ' + e + '</span>');
  }
}

window.plugin.LocalStorageManager.optDelete = function() {
  var deleteKey = prompt('Input the key.', '');
  if (deleteKey == null || deleteKey == '') {
    return;
  }
  try{
    var data = JSON.stringify(localStorage)
    var key;
    for (key in localStorage){
      if (deleteKey == key){
        delete localStorage[key];
      }
    }
    window.plugin.LocalStorageManager.optAlert('<span style="color: #f88">Delete successful.</span>');
  }catch(e){
    window.plugin.LocalStorageManager.optAlert('<span style="color: #f88">Delete failed: ' + e + '</span>');
  }
}

window.plugin.LocalStorageManager.optImport = function() {
  var data = prompt('Press CTRL+V to paste it.', '');
  if (data == null || data == '') {
    return;
  }
  try{
    var key;
    for (key in localStorage){
      delete localStorage[key];
    }
    var json = JSON.parse(data);
    for(key in json){
      localStorage[key] = json[key];
    }
    window.plugin.LocalStorageManager.optAlert('<span style="color: #f88">Import successful.</span>');
  }catch(e){
    window.plugin.LocalStorageManager.optAlert('<span style="color: #f88">Import failed: ' + e + '</span>');
  }
}

window.plugin.LocalStorageManager.optExport = function() {
  try{
    var data = JSON.stringify(localStorage);
    dialog({
      html: '<p><a onclick="$(\'.ui-dialog-LocalStorageManager-copy textarea\').select();">Select all</a> and press CTRL+C to copy it.</p><textarea readonly>' + data + '</textarea>',
      dialogClass: 'ui-dialog-LocalStorageManager-copy',
      id: 'plugin-LocalStorageManager-export',
      title: 'LocalStorageManager Export'
    });
    var json = JSON.parse(data);
    for(var key in json){
      window.plugin.LocalStorageManager.debug(key);
      window.plugin.LocalStorageManager.debug(json[key]);
    }
    window.plugin.LocalStorageManager.optAlert('<span style="color: #f88">Export successful.</span>');
  }catch(e){
    window.plugin.LocalStorageManager.optAlert('<span style="color: #f88">Export failed: ' + e + '</span>');
  }
}

window.plugin.LocalStorageManager.optView = function() {
  var html = '';
  var json = JSON.parse(JSON.stringify(localStorage));
  window.plugin.LocalStorageManager.debug(json);
  for(var key in json){
    html += '<strong style="color: #fff;">' + key + '</strong><br/>' + json[key].substr(0, 40) + '<br />';
  }
  dialog({
    html: html,
    dialogClass: 'ui-dialog',
    id: 'plugin-LocalStorageManager-View',
    title: 'LocalStorageManager View'
  });
}

window.plugin.LocalStorageManager.optAlert = function(message, ms) {
  $('.ui-dialog .ui-dialog-buttonset').prepend('<p class="alert" style="float:left;margin-top:4px;">' + message + '</p>');
  if (ms === undefined){
    $('.alert').delay(2000).fadeOut();
  }else{
    $('.alert').delay(ms).fadeOut();
  }
}

window.plugin.LocalStorageManager.manualOpt = function() {
  dialog({
    html: plugin.LocalStorageManager.htmlSetbox,
    dialogClass: 'ui-dialog',
    id: 'plugin-LocalStorageManager-options',
    title: 'LocalStorageManager Options'
  });
}

window.plugin.LocalStorageManager.setupCSS = function() {
  $('<style>').prop('type', 'text/css').html('\
    #LocalStorageManagerSetbox a{\
	    display:block;\
	    color:#ffce00;\
	    border:1px solid #ffce00;\
	    padding:3px 0;\
	    margin:10px auto;\
	    width:80%;\
	    text-align:center;\
	    background:rgba(8,48,78,.9);\
    }\
    #LocalStorageManagerSetbox a.disabled,\
    #LocalStorageManagerSetbox a.disabled:hover{\
	    color:#666;\
	    border-color:#666;\
	    text-decoration:none;\
    }\
    .ui-dialog-LocalStorageManager-copy textarea{\
	    width:96%;\
	    height:120px;\
	    resize:vertical;\
    }\
  ').appendTo('head');
}

var setup = function() {
  window.plugin.LocalStorageManager.setupCSS();
  window.plugin.LocalStorageManager.setupContent();
  $('#toolbox').append(window.plugin.LocalStorageManager.htmlCallSetBox);
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
