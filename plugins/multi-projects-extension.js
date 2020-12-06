// @author         ZasoGD
// @name           Multi Projects Extension
// @category       Control
// @version        0.0.7
// @description    Create separated projects in some plugins.

//
// How to implement MPE in your plugin: https://github.com/IITC-CE/ingress-intel-total-conversion/wiki/Multi-Projects-Extension
//

// use own namespace for plugin
window.plugin.mpe = function() {};

window.plugin.mpe.data = {};
window.plugin.mpe.storage = {};
window.plugin.mpe.obj = {};
window.plugin.mpe.data = {};
window.plugin.mpe.ui = {};
window.plugin.mpe.getHTML = {};
window.plugin.mpe.dialog = {};
window.plugin.mpe.action = {};

window.plugin.mpe.obj.projects = {};
window.plugin.mpe.obj.opt = {settings:{manager:[], sidebar:[]}};

//------------------------------------------------------
// STORAGE
//------------------------------------------------------
window.plugin.mpe.storage.NAME = 'plugin-mpe';
window.plugin.mpe.storage.saveStorage = function(){
  window.localStorage[window.plugin.mpe.storage.NAME] = JSON.stringify(window.plugin.mpe.obj.opt);
}
window.plugin.mpe.storage.loadStorage = function(){
  window.plugin.mpe.obj.opt = JSON.parse(window.localStorage[window.plugin.mpe.storage.NAME]);
}
window.plugin.mpe.storage.checkStorage = function(){
  if(window.localStorage[window.plugin.mpe.storage.NAME] === undefined){
    window.plugin.mpe.obj.opt = {settings:{manager:[], sidebar:[]}};
    window.plugin.mpe.storage.saveStorage();
  }
  window.plugin.mpe.storage.loadStorage();
}

window.plugin.mpe.storage.addStorage = function(storage){
  window.localStorage[storage] = '';
}
window.plugin.mpe.storage.removeStorage = function(storage){
  delete window.localStorage[storage];
}

//------------------------------------------------------
// DATA
//------------------------------------------------------
// Format the string
window.plugin.mpe.data.validateName = function(name){
  var name = name.toString();
  var pattern = new RegExp(/^[a-zA-Z0-9_\-\ \(\)\[\]]/);
  for(var i=0; i<name.length; i++){
    if(!pattern.test(name[i])){
      return false;
    }
  }
  return true;
}
window.plugin.mpe.data.nameToField = function(PJ, name){
  var preKey = 'MPE_'+window.plugin.mpe.data.getPreKeyPj(PJ);
  var field = name;

  field = field.replace(/ /g, '___');
  field = preKey+field;
  return field;
}
window.plugin.mpe.data.fieldToName = function(PJ, field){
  var preKey = 'MPE_'+window.plugin.mpe.data.getPreKeyPj(PJ);
  var name = field;

  name = name.replace(preKey, '');
  name = name.replace(/___/g, ' ');
  return name;
}

window.plugin.mpe.data.getCurrKeyPj = function(PJ){
  return window.plugin.mpe.obj.projects[PJ].currKey;
}
window.plugin.mpe.data.getPreKeyPj = function(PJ){
  return window.plugin.mpe.obj.projects[PJ].defaultKey;
}
window.plugin.mpe.data.getProjects = function(PJ){
  return window.plugin.mpe.obj.projects[PJ].pj;
}

window.plugin.mpe.data.isInSidebar = function(PJ){
  var arrSidebar = window.plugin.mpe.obj.opt['settings']['sidebar'];
  var index = arrSidebar.indexOf(PJ);
  if(index >= 0){
    return index;
  }
  return -1;
}
window.plugin.mpe.data.isInManager = function(PJ){
  var arrSidebar = window.plugin.mpe.obj.opt['settings']['manager'];
  var index = arrSidebar.indexOf(PJ);
  if(index >= 0){
    return index;
  }
  return -1;
}

window.plugin.mpe.data.getFaClass = function(PJ){
  return window.plugin.mpe.obj.projects[PJ].fa;
}
window.plugin.mpe.data.getTitle = function(PJ){
  return window.plugin.mpe.obj.projects[PJ].title;
}


window.plugin.mpe.data.addStorageToPJ = function(PJ, storage){
  window.plugin.mpe.obj.projects[PJ].pj.push(storage);
}
window.plugin.mpe.data.removeStorageFromPJ = function(PJ, storage){
  var index = window.plugin.mpe.obj.projects[PJ].pj.indexOf(storage);
  if(index >= 0){ window.plugin.mpe.obj.projects[PJ].pj.splice(index, 1); }
}
window.plugin.mpe.data.setDefaultKey = function(PJ){
  window.plugin.mpe.obj.projects[PJ].currKey = window.plugin.mpe.data.getPreKeyPj();
}
window.plugin.mpe.data.setKey = function(PJ, keyName){
  window.plugin.mpe.obj.projects[PJ].currKey = keyName;
}

window.plugin.mpe.data.scanStorageForAll = function(){
  var list = window.plugin.mpe.obj.projects;
  for(var name in list){
    window.plugin.mpe.data.scanStorageForOne(name);
  }
}
window.plugin.mpe.data.scanStorageForOne = function(name){
  var PROJ = window.plugin.mpe.obj.projects[name];
  PROJ.pj = [];

  //        if(window.localStorage[PROJ.defaultKey] !== undefined){
  for(var field in window.localStorage){
    if(field.includes('MPE_'+PROJ.defaultKey)){
      PROJ.pj.push(field);
    }
  }
  //        }
}

//------------------------------------------------------
// HTML and UI
//------------------------------------------------------
window.plugin.mpe.getHTML.projectOptions = function(PJ){
  var PROJ = window.plugin.mpe.obj.projects[PJ];
  var html = '';
  var active = '';
  if(PROJ.currKey === PROJ.defaultKey){ active = 'selected'; }
  html += '<option '+active+' value="'+PROJ.defaultKey+'">Default Project</option>';

  for(var index in PROJ.pj){
    var nameMultiStorage = PROJ.pj[index];
    var label = nameMultiStorage.replace('MPE_'+PROJ.defaultKey, '');

    var active = '';
    if(PROJ.currKey === nameMultiStorage){ active = 'selected'; }
    html += '<option '+active+' value="'+nameMultiStorage+'">'+window.plugin.mpe.data.fieldToName(PJ, label)+'</option>';
  }
  return html;
}
window.plugin.mpe.getHTML.project = function(PJ){
  var PROJ = window.plugin.mpe.obj.projects[PJ];
  var listElem = '';
  var txtNew = '+';
  var txtDel = 'X';

  if(window.plugin.faIcon){
    txtNew = '<i class="fa fa-plus"></i>';
    txtDel = '<i class="fa fa-trash"></i>';
  }

  listElem += '<div class="mpe manager '+PJ+' list-group-item" data-mpe="'+PJ+'">';
  listElem += '<h4>'+PROJ.title+'</h4>';
  listElem += '<a class="left" onclick="window.plugin.mpe.action.deleteProject(\''+PJ+'\');return false;" title="Delete Current">'+txtDel+'</a>';
  listElem += '<a class="right" onclick="window.plugin.mpe.action.createNewProject(\''+PJ+'\');return false;" title="Create New">'+txtNew+'</a>';
  listElem += '<select class="left" onchange="window.plugin.mpe.action.switchProject(\''+PJ+'\', $(this).val());return false;">';

  listElem += window.plugin.mpe.getHTML.projectOptions(PJ);

  listElem += '</select>';
  listElem += '<div class="clear"></div>';
  listElem += '</div>';

  return listElem;
}
window.plugin.mpe.getHTML.projectsAll = function(){
  var html = '';

  for(var name in window.plugin.mpe.obj.projects){
    html += window.plugin.mpe.getHTML.project(name);
  }
  return html;
}
window.plugin.mpe.getHTML.prjSett = function(PJ){
  var PROJ = window.plugin.mpe.obj.projects[PJ];
  var listElem = '';
  var txtNew = '+';
  var txtDel = 'X';

  var inManager = (window.plugin.mpe.data.isInManager(PJ) < 0)? 'checked' : '';
  var inSidebar = (window.plugin.mpe.data.isInSidebar(PJ) >= 0)? 'checked' : '';

  if(window.plugin.faIcon){
    txtNew = '<i class="fa fa-plus"></i>';
    txtDel = '<i class="fa fa-trash"></i>';
  }

  listElem += '<div class="mpe settings '+PJ+'" data-mpe="'+PJ+'">';
  listElem += '<h4>'+PROJ.title+'</h4>';
  listElem += '<div>';
  listElem += '<label><input type="checkbox" '+inManager+' onclick="window.plugin.mpe.action.toggleManager(\''+PJ+'\');" />in Manager</label>';
  listElem += '<label><input type="checkbox" '+inSidebar+' onclick="window.plugin.mpe.action.toggleSidebar(\''+PJ+'\');" />in Sidebar</label>';
  //                listElem += '<div class="clear"></div>';
  listElem += '</div>';
  listElem += '</div>';

  return listElem;
}
window.plugin.mpe.getHTML.prjSettAll = function(){
  var html = '';

  for(var type in window.plugin.mpe.obj.projects){
    html += window.plugin.mpe.getHTML.prjSett(type);
  }
  return html;
}

window.plugin.mpe.ui.deleteOption = function(PJ, storageName){
  var PROJ = window.plugin.mpe.obj.projects[PJ];
  if(storageName !== PROJ.defaultKey){
    //            $('.mpeManager select.'+PJ+' option[value = "'+storageName+'"]').remove();
    $('.mpe[data-mpe="'+PJ+'"] select option[value = "'+storageName+'"]').remove();
  }
}
window.plugin.mpe.ui.appendOption = function(PJ, storageName){
  var opt = '<option value="'+storageName+'">'+window.plugin.mpe.data.fieldToName(PJ, storageName)+'</option>';
  //        $('.mpeManager select.'+PJ+'').append(opt);
  $('.mpe[data-mpe="'+PJ+'"] select').append(opt);
}
window.plugin.mpe.ui.redrawHTMLOptions = function(PJ){
  var PROJ = window.plugin.mpe.obj.projects[PJ];
  var html = window.plugin.mpe.getHTML.projectOptions(PJ);
  $('.mpe[data-mpe="'+PJ+'"] select').html(html);
}

window.plugin.mpe.ui.addControl = function(){
  $('#toolbox').append('<a class="list-group-item" onclick="window.plugin.mpe.dialog.openMain();return false;"><i class="fa fa-files-o"></i>MultiProjects</a>');
}
window.plugin.mpe.ui.appendContainerInSidebar = function(){
  if(!$('#multi-projects.mpeSidebar').length){
    $('#sidebar').append('<div id="multi-projects" class="mpeSidebar list-group"></div>');
  }
}

//------------------------------------------------------
// DIALOGS
//------------------------------------------------------
window.plugin.mpe.dialog.openMain = function(){
  //        window.plugin.mpe.data.scanStorageForAll();
  var html = window.plugin.mpe.getHTML.projectsAll();

  dialog({
    title: 'Multi Projects Manager',
    html: '<div class="mpeManager">'+html+'</div>',
    dialogClass: 'ui-dialog-mpe',
    minWidth: 300,
    buttons:{
      'SETTINGS': function(){
        window.plugin.mpe.dialog.openSettings();
      }
    }
  });

  var list = window.plugin.mpe.obj.projects;
  for(var name in list){
    window.plugin.mpe.ui.toggleManager(name);
  }
}
window.plugin.mpe.dialog.openSettings = function(){
  dialog({
    title: 'Multi Projects Settings',
    html: '<div class="mpeSettings">'+window.plugin.mpe.getHTML.prjSettAll()+'</div>',
    dialogClass: 'ui-dialog-mpe',
    minWidth: 300
  });
}
window.plugin.mpe.dialog.insertNameNewProject = function(){
  var promptAction = prompt('Choose a Project Name.\nNB: you can use only a-z, A-Z, 0-9, "() []" and " "', '');

  if(promptAction !== null && promptAction !== ''){
    return promptAction;
  }
  return false;
}

//------------------------------------------------------
// VISIBILITY OPT (IN MANAGER, IN SIDEBAR)
//------------------------------------------------------
window.plugin.mpe.action.toggleSidebar = function(PJ){
  window.plugin.mpe.data.toggleSidebar(PJ);
  window.plugin.mpe.storage.saveStorage();
  window.plugin.mpe.ui.toggleSidebar(PJ);
}
window.plugin.mpe.action.toggleManager = function(PJ){
  window.plugin.mpe.data.toggleManager(PJ);
  window.plugin.mpe.storage.saveStorage();
  window.plugin.mpe.ui.toggleManager(PJ);
}

window.plugin.mpe.data.toggleSidebar = function(PJ){
  var arrSidebar = window.plugin.mpe.obj.opt['settings']['sidebar'];

  var index = window.plugin.mpe.data.isInSidebar(PJ);
  if(index >= 0){
    arrSidebar.splice(index, 1);
    return false;
  }else{
    arrSidebar.push(PJ);
    return true;
  }
}
window.plugin.mpe.data.toggleManager = function(PJ){
  var arrSidebar = window.plugin.mpe.obj.opt['settings']['manager'];

  var index = window.plugin.mpe.data.isInManager(PJ);
  if(index >= 0){
    arrSidebar.splice(index, 1);
    return false;
  }else{
    arrSidebar.push(PJ);
    return true;
  }
}

window.plugin.mpe.ui.toggleSidebar = function(PJ){
  var s = '.mpeSidebar .mpe.'+PJ;
  var elem = $(s);
  var fa = window.plugin.mpe.data.getFaClass(PJ);
  fa = (fa.length !== 0)? fa : 'nofa';

  var title = window.plugin.mpe.data.getTitle(PJ);

  if(window.plugin.mpe.data.isInSidebar(PJ) >= 0){
    if(!elem.length){
      $('.mpeSidebar').append(window.plugin.mpe.getHTML.project(PJ));
      $(s).prepend('<i class="left fa '+fa+'" title="'+title+'"></i>');
    }
  }else{
    elem.remove();
  }
}
window.plugin.mpe.ui.toggleManager = function(PJ){
  var elem = $('.mpeManager .mpe.'+PJ+'');

  var isHidden = window.plugin.mpe.data.isInManager(PJ);
  if(isHidden >= 0){
    elem.hide();
  }else{
    elem.show();
  }
}

//------------------------------------------------------
// ACTIONS
//------------------------------------------------------
window.plugin.mpe.action.switchProject = function(PJ, storageKey){
  var pj = window.plugin.mpe.obj.projects[PJ];
  var oldKey = pj.currKey;

  //change in obj
  window.plugin.mpe.data.setKey(PJ, storageKey);

  pj.func_pre();

  //change in plugin
  pj.func_setKey(storageKey);
  console.log('MULTI PROJECTS: switch "'+pj.title+'" storage to "'+storageKey+'".');

  pj.func_post();

  window.plugin.mpe.ui.redrawHTMLOptions(PJ);

  data = {
    event: 'switch',
    data: {
      namespace: pj.namespace,
      title: pj.title,
      defaultStorage: pj.defaultKey,
      prevStorage: oldKey,
      currentStorage: storageKey
    }
  }

  window.runHooks('mpe', data);
}

window.plugin.mpe.action.createNewProject = function(PJ, label){
  var name = (label !== undefined)? label : window.plugin.mpe.dialog.insertNameNewProject();
  if(name === false || name === ''){ return false; }

  var isValid = window.plugin.mpe.data.validateName(name);
  if(isValid === true){
    var storageName = window.plugin.mpe.data.nameToField(PJ, name);
    window.plugin.mpe.data.addStorageToPJ(PJ, storageName);
    //            window.plugin.mpe.ui.appendOption(PJ, newName);
    window.plugin.mpe.action.switchProject(PJ, storageName);
  }else{
    alert('Failed. Invalid Name');
  }
}
window.plugin.mpe.action.deleteProject = function(PJ, storage){
  if(storage === undefined){
    var storage = window.plugin.mpe.data.getCurrKeyPj(PJ);
  }

  var PROJ = window.plugin.mpe.obj.projects[PJ];
  var title = PROJ.title;
  var label = window.plugin.mpe.data.fieldToName(PJ, storage);
  if(storage === PROJ.defaultKey){ label = 'Default Project'; }

  var promptAction = confirm('The "'+label+'" project data in "'+title+'" will be deleted. Are you sure?', '');
  if(promptAction){
    //            window.plugin.mpe.ui.deleteOption(PJ, storage);
    window.plugin.mpe.data.removeStorageFromPJ(PJ, storage);
    window.plugin.mpe.storage.removeStorage(storage);

    //            window.plugin.mpe.data.setDefaultKey(PJ);

    //to switch to default_key and load the default storage
    var defaultKey = window.plugin.mpe.data.getPreKeyPj(PJ);
    window.plugin.mpe.action.switchProject(PJ, defaultKey);
  }
}

//------------------------------------------------------

window.plugin.mpe.setMultiProjects = function(settings){
  window.plugin.mpe.storage.loadStorage();
  window.plugin.mpe.ui.appendContainerInSidebar();

  if(
    settings.namespace &&
    settings.defaultKey &&
    settings.func_setKey &&
    settings.func_post
  ){
    if(!settings.title){ settings.title = 'Untitled'; }
    if(!settings.fa){ settings.fa = ''; }
    if(!settings.func_pre){ settings.func_pre = ''; }

    var newMPE = {
      namespace: settings.namespace,
      title: settings.title,
      fa: settings.fa,
      defaultKey: settings.defaultKey,
      currKey: settings.defaultKey,
      func_setKey: settings.func_setKey,
      func_pre: settings.func_pre,
      func_post: settings.func_post,
      pj:[]
    };

    window.plugin.mpe.obj.projects[settings.namespace] = newMPE;
    window.plugin.mpe.data.scanStorageForOne(settings.namespace);
    window.plugin.mpe.ui.toggleSidebar(settings.namespace);
  }
}

window.plugin.mpe.setupCSS = function(){
  $("<style>").prop("type", "text/css").html(''
  +'.mpe, .mpe *{text-align:center;box-sizing:border-box;}'
  +'.mpe .left{float:left;}'
  +'.mpe .right{float:right;}'
  +'.mpe .clear{clear:both;}'
  +'.mpe .fa{line-height:20px;}'
  +'.ui-dialog .mpe{width:90%;margin:8px auto 8px;}'

  +'.mpe h4{margin:0 0 4px;font-size:15px;font-style:italic;}'
  +'.mpe select, .mpe a{border:1px solid #ffce00;padding:1px 4px 2px;background:rgba(8,48,78,.9);height:23px;color:#ffce00;}'
  +'.mpe select{width:72%;margin: 0 3%;}'
  +'.mpe a{width:11%;}'

  +'.ui-dialog-mpe button{margin-left:6px;padding:4px 8px 2px;}'
  +'.mpe.settings > div{border:1px solid #ffce00;padding:1px 5px 3px;background:rgba(8,48,78,.9);display:inline-block;}'
  +'.mpe.settings label{cursor:pointer;color:#ffce00;margin:0 2px 0px;}'
  +'.mpe.settings label input{margin:4px 4px;}'

  +'#sidebar .mpeSidebar{}'
  +'#sidebar .mpeSidebar .mpe{width:100%;padding:3px 4px;}'
  +'#sidebar .mpeSidebar .mpe h4{display:none;}'
  +'#sidebar .mpeSidebar .mpe > .fa{color:#ccc;width:8%;height:23px;margin-right:1%}'
  +'#sidebar .mpeSidebar .mpe > .fa.nofa:before{content:\'\0\';}'
  +'#sidebar .mpeSidebar .mpe a{}'
  +'#sidebar .mpeSidebar .mpe select{width:63%;}'
  ).appendTo("head");
}


var setup = function(){
  window.pluginCreateHook('mpe');

  window.plugin.mpe.storage.checkStorage();
  window.plugin.mpe.setupCSS();
  window.plugin.mpe.ui.addControl();
  window.plugin.mpe.ui.appendContainerInSidebar();
}

setup.priority = 'high';