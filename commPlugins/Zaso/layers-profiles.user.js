// ==UserScript==
// @author         Zaso
// @name           Layers Profiles
// @category       Controls
// @version        0.1.4
// @description    Saves the current enabled layers (base, overlays and hightlighter). Restore it just a click.
// @id             layers-profiles@Zaso
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/layers-profiles.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/layers-profiles.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'ZasoItems';
plugin_info.dateTimeVersion = '2022-12-18-193146';
plugin_info.pluginId = 'layers-profiles';
//END PLUGIN AUTHORS NOTE



// PLUGIN START ////////////////////////////////////////////////////////
// History
// 0.1.4 fix Highlighters
// 0.1.3 fix Maps and Ornaments
// 0.1.2 headers chnaged. Ready for IITC-CE
// 0.1.1 Original script

// use own namespace for plugin
  window.plugin.layersProfiles = function(){};

  window.plugin.layersProfiles.storage = {};
  window.plugin.layersProfiles.ui = {};
  window.plugin.layersProfiles.dialog = {};
  window.plugin.layersProfiles.data = {};
  window.plugin.layersProfiles.util = {};
  window.plugin.layersProfiles.action = {};
  window.plugin.layersProfiles.layer = {};
  window.plugin.layersProfiles.obj = {};

  window.plugin.layersProfiles.obj.allLay = {b:{}, h:{}, o:{}};
  window.plugin.layersProfiles.obj.currLay = {b:{}, h:{}, o:{}};

  window.plugin.layersProfiles.obj.main = {
    settings:{b:false, h:false, o:true},
    profiles:{}
  };

  //----------------------------------------------------------------------------------
  // UTIL FUNCTIONS
  //----------------------------------------------------------------------------------
  window.plugin.layersProfiles.util.generateID = function(){
    return 'uuid-'+((new Date).getTime().toString(16)+Math.floor(1E7*Math.random()).toString(16));
  }
  window.plugin.layersProfiles.util.validateName = function(name){
    var name = name.toString();
    var pattern = new RegExp(/^[a-zA-Z0-9_\-\ \(\)\[\]]/);
    for(i=0; i<name.length; i++){
      if(!pattern.test(name[i])){
        return false;
      }
    }
    return name;
  }
  window.plugin.layersProfiles.util.getCheck = function(){
    return window.plugin.layersProfiles.obj.main.settings;
  }

  //----------------------------------------------------------------------------------
  // STORAGE FUNCTIONS
  //----------------------------------------------------------------------------------
  window.plugin.layersProfiles.storage.NAME = 'plugin-layers-profiles';
  window.plugin.layersProfiles.storage.load = function(){
    window.plugin.layersProfiles.obj.main = JSON.parse(window.localStorage[window.plugin.layersProfiles.storage.NAME]);
  }
  window.plugin.layersProfiles.storage.save = function(){
    window.localStorage[window.plugin.layersProfiles.storage.NAME] = JSON.stringify(window.plugin.layersProfiles.obj.main);
  }
  window.plugin.layersProfiles.storage.get = function(){
    return window.localStorage[window.plugin.layersProfiles.storage.NAME];
  }

  window.plugin.layersProfiles.storage.reset = function(){
    var obj = {settings:{b:0, h:0, o:1}, profiles:{}};

    window.localStorage[window.plugin.layersProfiles.storage.NAME] = JSON.stringify(obj);
    window.plugin.layersProfiles.storage.save();
    window.plugin.layersProfiles.storage.load();
  }
  window.plugin.layersProfiles.storage.check = function(){
    if(!window.localStorage[window.plugin.layersProfiles.storage.NAME]){
      window.plugin.layersProfiles.storage.reset();
      return false;
    }
    window.plugin.layersProfiles.storage.load();
    return true;
  }

  //----------------------------------------------------------------------------------
  // DATA FUNCTIONS
  //----------------------------------------------------------------------------------
  window.plugin.layersProfiles.data.setCheckBox = function(type, status){
    if(status === undefined){
      var status = !window.plugin.layersProfiles.obj.main.settings[type];
    }
    window.plugin.layersProfiles.obj.main.settings[type] = status;
    window.plugin.layersProfiles.storage.save();
  }
  window.plugin.layersProfiles.data.addNewConfig = function(ID, label, objLayers){
    var l = window.plugin.layersProfiles.util.validateName(label);
    if(l !== false){
      window.plugin.layersProfiles.obj.main.profiles[ID] = {
        label: label,
        config: objLayers
      }
      window.plugin.layersProfiles.storage.save();
    }else{
      window.plugin.layersProfiles.dialog.message('Failed. Name not correct.');
      return false;
    }
  }
  window.plugin.layersProfiles.data.deleteConfig = function(ID){
    delete window.plugin.layersProfiles.obj.main.profiles[ID];
  }

  //----------------------------------------------------------------------------------
  // LAYER FUNCTIONS
  //----------------------------------------------------------------------------------
  window.plugin.layersProfiles.layer.getAllO = function(){
    $.each(layerChooser._layers, function(index, chooserEntry){
      //If "true" is a overlayers
      if(chooserEntry.overlay === true){
//        var display = window.map.hasLayer(chooserEntry.layer);
        window.plugin.layersProfiles.obj.allLay.o[chooserEntry.name] = index;
      }
    });
    return window.plugin.layersProfiles.obj.allLay.o;
  }
  window.plugin.layersProfiles.layer.getAllB = function(){
    $.each(layerChooser._layers, function(index, chooserEntry){
      //If "undefined" or "false" is a baselayer
      if (!chooserEntry.overlay) {
//        var display = window.map.hasLayer(chooserEntry.layer);
        window.plugin.layersProfiles.obj.allLay.b[chooserEntry.name] = index;
      }
    });
    return window.plugin.layersProfiles.obj.allLay.b;
  }
  window.plugin.layersProfiles.layer.getAllH = function(){
    if (window._highlighters) {
      var arr = Object.keys(window._highlighters);
      for(var i = 0; i < arr.length; ++i){
        window.plugin.layersProfiles.obj.allLay.h[arr[i]] = 1;
      }
    }
    window.plugin.layersProfiles.obj.allLay.h['No Highlights'] = 1;
    return window.plugin.layersProfiles.obj.allLay.h;
  }
  window.plugin.layersProfiles.layer.getAll = function(){
//    console.log('#### LAYERS: '+window.layerGroupLength(window.layerChooser));
    window.plugin.layersProfiles.layer.getAllO();
    window.plugin.layersProfiles.layer.getAllB();
    window.plugin.layersProfiles.layer.getAllH();

//    console.log(window.plugin.layersProfiles.obj.allLay);
    return window.plugin.layersProfiles.obj.allLay;
  }

  window.plugin.layersProfiles.layer.getCurrH = function(){
//    return window._current_highlighter;
    //util: obj _highlighters
    window.plugin.layersProfiles.obj.currLay.h = window.localStorage['portal_highlighter'];
    return window.plugin.layersProfiles.obj.currLay.h;

  }
  window.plugin.layersProfiles.layer.getCurrB = function(){
    window.plugin.layersProfiles.obj.currLay.b = window.localStorage['iitc-base-map'];
    return window.plugin.layersProfiles.obj.currLay.b;
  }
  window.plugin.layersProfiles.layer.getCurrO = function(){
    var listOverlays = [];
    $.each(window.layerChooser._layers, function(index, chooserEntry){
      //If "true" is a overlayers
      if(chooserEntry.overlay === true){
        var displayed = window.map.hasLayer(chooserEntry.layer);
        if(displayed === true){
//          listOverlays[chooserEntry.name] = 1;
          listOverlays.push(chooserEntry.name);
        }
      }
    });
    window.plugin.layersProfiles.obj.currLay.o = listOverlays;
    return window.plugin.layersProfiles.obj.currLay.o;
  }
  window.plugin.layersProfiles.layer.getCurr = function(){
    var obj = {}
    var sett = window.plugin.layersProfiles.util.getCheck();

    if(sett.b === true){ obj.b = window.plugin.layersProfiles.layer.getCurrB(); }
    if(sett.h === true){ obj.h = window.plugin.layersProfiles.layer.getCurrH(); }
    if(sett.o === true){ obj.o = window.plugin.layersProfiles.layer.getCurrO(); }

    return obj;
//    return window.plugin.layersProfiles.obj.currLay;
  }

  window.plugin.layersProfiles.layer.disableAllOverlays = function(){
    var overlays = window.plugin.layersProfiles.obj.allLay.o;
    for(var lay in overlays){
      var idLeaft = overlays[lay];
      var layer = layerChooser._layers[idLeaft].layer;
      if(window.map.hasLayer(layer)){
        window.map.removeLayer(layer);
      }
    }
  }
  window.plugin.layersProfiles.layer.setH = function(name){
    if(window.plugin.layersProfiles.obj.allLay.h[name]){
      window.changePortalHighlights(name);
      window.updatePortalHighlighterControl();
      return true;
    }
    return false;
  }
  window.plugin.layersProfiles.layer.setB = function(name){
    var idNewBase = window.plugin.layersProfiles.obj.allLay.b[name];
    if(idNewBase !== undefined){
      window.layerChooser.showLayer(idNewBase, true);
      return true;
    }
    return false;
  }
  window.plugin.layersProfiles.layer.setO = function(arrName){
    var resp = true;
    window.plugin.layersProfiles.layer.disableAllOverlays();
    for(var indexO in arrName){
      var name = arrName[indexO];
      var idLayer = window.plugin.layersProfiles.obj.allLay.o[name];
      if(idLayer){
        window.layerChooser.showLayer(idLayer, true);
      }else{
        resp = false;
      }
    }
    return resp;
  }

  //----------------------------------------------------------------------------------
  // UI FUNCTIONS
  //----------------------------------------------------------------------------------
  window.plugin.layersProfiles.ui.htmlConfig = function(ID){
    var elem = window.plugin.layersProfiles.obj.main.profiles[ID];
    var html = '';
    html += '<div class="configLay" data-layer="'+ID+'">';
      html += '<a class="btn delete" onclick="window.plugin.layersProfiles.action.deleteConfig(\''+ID+'\');return false;">X</a>';
      html += '<a class="btn action" onclick="window.plugin.layersProfiles.action.applyConfig(\''+ID+'\');return false;">'+elem.label+'</a>';
      html += '<a class="btn info" onclick="window.plugin.layersProfiles.dialog.info(\''+ID+'\');return false;">i</a>';
    html += '</div>';
    return html;
  }
  window.plugin.layersProfiles.ui.appendConfig = function(ID){
    var html = window.plugin.layersProfiles.ui.htmlConfig(ID);
    $('#layersProfiles .configList').append(html);
  }
  window.plugin.layersProfiles.ui.deleteConfig = function(ID){
    $('#layersProfiles .configList .configLay[data-layer = "'+ID+'"]').remove()
  }
  window.plugin.layersProfiles.ui.setRedConfigStyle = function(ID){
    $('#layersProfiles .configList .configLay[data-layer = "'+ID+'"] a.info').addClass('red');
  }

  //----------------------------------------------------------------------------------
  // DIALOG FUNCTIONS
  //----------------------------------------------------------------------------------
  window.plugin.layersProfiles.dialog.openMain = function(){
    window.plugin.layersProfiles.layer.getAll();
    var html = '';

      var isCheckedB = '';
      var isCheckedH = '';
      var isCheckedO = '';

      if(window.plugin.layersProfiles.obj.main.settings.b === true){ isCheckedB = 'checked'; }
      if(window.plugin.layersProfiles.obj.main.settings.h === true){ isCheckedH = 'checked'; }
      if(window.plugin.layersProfiles.obj.main.settings.o === true){ isCheckedO = 'checked'; }

        html += '<div class="configNew">';
          html += '<label><input type="checkbox" onchange="window.plugin.layersProfiles.data.setCheckBox(\'h\');return false;" '+isCheckedH+' />Highlighter</label>';
          html += '<label><input type="checkbox" onchange="window.plugin.layersProfiles.data.setCheckBox(\'b\');return false;" '+isCheckedB+' />Base</label>';
          html += '<label><input type="checkbox" onchange="window.plugin.layersProfiles.data.setCheckBox(\'o\');return false;" '+isCheckedO+' />Overlays</label>';
          html += '<button onclick="window.plugin.layersProfiles.action.addNewConfig(); return false;">+</button>';
          html += '<div style="clear:both;"></div>';
        html += '</div>';
        html += '<div class="configList">';
          var list = '<p>Not saved Layers Config.</p>';
          for(ID in window.plugin.layersProfiles.obj.main.profiles){
            list = '';
            html += window.plugin.layersProfiles.ui.htmlConfig(ID);
          }
          html += list;
        html += '</div>';

    dialog({
      title: 'Layers Profiles',
      html: '<div id="layersProfiles">'+html+'</div>',
      dialogClass: 'ui-dialog-layerprofiles-main',
      minWidth: 300,
    });
  }
  window.plugin.layersProfiles.dialog.chooseNewLabel = function(){
    var promptAction = prompt('Choose a label.\nNB: you can use only a-z, A-Z, 0-9, "() []" and " "', '');

    if(promptAction !== null && promptAction !== ''){
      return promptAction;
    }else{
      window.plugin.layersProfiles.dialog.message('Failed. Choose a Name.');
      return false;
    }
  }

  window.plugin.layersProfiles.dialog.info = function(ID){
    var elem = window.plugin.layersProfiles.obj.main.profiles[ID];
    var txt = window.plugin.layersProfiles.scanConfig(ID);

    dialog({
      title: 'Layers Config - '+elem.label,
      html: txt,
      dialogClass: 'ui-dialog-layerprofiles-config',
      minWidth: 300,
    });
  }
  window.plugin.layersProfiles.dialog.message = function(txt){
    dialog({
      title: 'Layers Profiles - Message',
      html: txt,
      dialogClass: 'ui-dialog-layerprofiles-msg',
//      minWidth: 300,
    });
  }

  //----------------------------------------------------------------------------------
  // CSS AND CONTROL
  //----------------------------------------------------------------------------------
  window.plugin.layersProfiles.ui.setupCSS = function(){
    $('<style>').prop('type', 'text/css').html(''
      +'#layersProfiles, #layersProfiles *{box-sizing:border-box;font-size:12px;}'
      +'#layersProfiles a, #layersProfiles button{display:inline-block;padding:4px;text-align:center;}'

//      +'#layersProfiles label, #layersProfiles label input{display:inline-block;text-align:center;cursor:pointer;}'
//      +'#layersProfiles label{height:39px;width:25%;}'
//      +'#layersProfiles label input{width:100%;}'
//      +'#layersProfiles button{width:18%;height:39px;cursor:pointer;position:relative;top:-9px;margin-left:4%;}'

      +'#layersProfiles label, #layersProfiles label input{text-align:center;cursor:pointer;}'
      +'#layersProfiles label{width:29%;display:inline-block;}'
      +'#layersProfiles button{width:10%;min-width:0;cursor:pointer;border-width:1px;border:1px solid #fff;color:#fff;background:none;}'

      +'#layersProfiles .configList{margin-top:12px;}'
      +'#layersProfiles .configList .configLay{margin:7px 0 0;}'
      +'#layersProfiles p{margin:4px;font-size:12px;}'
      +'#layersProfiles a.btn{width:10%;margin:0 4px;border:1px solid #ffce00;background:rgba(8,48,78,.9);}'
      +'#layersProfiles a:hover{text-decoration:none;}'
      +'#layersProfiles a.action{width:70%;text-align:left;}'

      +'.ui-dialog-layerprofiles-config dl{margin-left:10px;}'
      +'.ui-dialog-layerprofiles-config dl dt{color:#ffce00;margin:9px 0 3px;}'
      +'.ui-dialog-layerprofiles-config dl dd{margin:2px 0 0 17px;list-style:disc;display:list-item;}'
      +'#layersProfiles .red, .ui-dialog-layerprofiles-config .red{border-color:#f44 !important;color:#f44 !important;}'
    ).appendTo('head');
  }

  window.plugin.layersProfiles.action.applyConfig = function(ID){
    var newConfig = window.plugin.layersProfiles.obj.main.profiles[ID].config;

    var respH = true;
    var respB = true;
    var respO = true;

    if(newConfig['h']){
      respH = window.plugin.layersProfiles.layer.setH(newConfig['h']);
    }

    if(newConfig['b']){
      respB = window.plugin.layersProfiles.layer.setB(newConfig['b']);
    }

    if(newConfig['o']){
      respO = window.plugin.layersProfiles.layer.setO(newConfig['o']);
    }

    if(respH === false || respB === false || respO === false){
      window.plugin.layersProfiles.ui.setRedConfigStyle(ID);
    }
  }
  window.plugin.layersProfiles.action.addNewConfig = function(){
    var ID = window.plugin.layersProfiles.util.generateID();
    var label = window.plugin.layersProfiles.dialog.chooseNewLabel();
    var objLayers = window.plugin.layersProfiles.layer.getCurr();

    if(label !== false){
      window.plugin.layersProfiles.data.addNewConfig(ID, label, objLayers);
      window.plugin.layersProfiles.ui.appendConfig(ID);
    }
  }
  window.plugin.layersProfiles.action.deleteConfig = function(ID){
    window.plugin.layersProfiles.data.deleteConfig(ID);
    window.plugin.layersProfiles.ui.deleteConfig(ID);
    window.plugin.layersProfiles.storage.save();
  }

  window.plugin.layersProfiles.scanConfig = function(ID){
    var config = window.plugin.layersProfiles.obj.main.profiles[ID].config;
    var classStyle = '';
    var styleRed = ' class="red" title="Plugin not installed or actived"';
    var html = '';

    if(config['h']){
      html += '<dt>Highligther:</dt>';
      if(!window.plugin.layersProfiles.obj.allLay.h[config.h]){
        classStyle = styleRed;
      }
      html += '<dd '+classStyle+'>'+config.h+';</dd>';
      classStyle = '';
    }

    if(config['b']){
      html += '<dt>Baselayer:</dt>';
      if(window.plugin.layersProfiles.obj.allLay.b[config.b] === undefined){ // baselayers' ids start from 0
        classStyle = styleRed;
      }
      html += '<dd '+classStyle+'>'+config.b+';</dd>';
      classStyle = '';
    }

    if(config['o']){
      html += '<dt>OverlayLayers:</dt>';
      for(var indexLay in config.o){
        var elem = config.o[indexLay];
        if(!window.plugin.layersProfiles.obj.allLay.o[elem]){
          classStyle = styleRed;
        }
        html += '<dd '+classStyle+'>'+elem+';</dd>';
        classStyle = '';
      }
    }

    html = '<dl>'+html+'</dl>';

    return html;
  }

  window.plugin.layersProfiles.ui.addControl = function(){
    $('#toolbox').append('<a class="list-group-item" onclick="window.plugin.layersProfiles.dialog.openMain();return false;"><i class="fa fa-address-book"></i>Layers Profiles</a>');
  }

  // *********************************************************************************

  var setup = function(){
    if(window.isSmartphone()){}

    window.plugin.layersProfiles.ui.setupCSS();
    window.plugin.layersProfiles.storage.check();
    window.plugin.layersProfiles.ui.addControl();

    window.plugin.layersProfiles.layer.getAll();
    window.addHook('iitcLoaded', window.plugin.layersProfiles.layer.getAll);
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

