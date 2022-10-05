// @author         ZasoGD
// @name           Multi Projects Extension
// @category       Controls
// @version        0.1.1
// @description    Create separated projects in some plugins.

//
// How to implement MPE in your plugin: https://github.com/IITC-CE/ingress-intel-total-conversion/wiki/Multi-Projects-Extension
//

// use own namespace for plugin
window.plugin.mpe = function () { };
var mpe = window.plugin.mpe;


mpe.data = {};
mpe.storage = {};
mpe.obj = {};
mpe.data = {};
mpe.ui = {};
mpe.getHTML = {};
mpe.dialog = {};
mpe.action = {};

mpe.obj.projects = {};
mpe.obj.opt = { settings: { manager: [], sidebar: [] } };

// ------------------------------------------------------
// STORAGE
// ------------------------------------------------------
mpe.storage.NAME = 'plugin-mpe';
mpe.storage.save = function () {
  window.localStorage.setItem(mpe.storage.NAME, JSON.stringify(mpe.obj.opt));
};

mpe.storage.load = function () {
  mpe.obj.opt = JSON.parse(window.localStorage.getItem(mpe.storage.NAME));
};

mpe.storage.check = function () {
  if (window.localStorage.getItem(mpe.storage.NAME) === undefined) {
    mpe.obj.opt = { settings: { manager: [], sidebar: [] } };
    mpe.storage.save();
  }
  mpe.storage.load();
};

mpe.storage.addStorage = function (storage) {
  window.localStorage.setItem(storage, '');
};

mpe.storage.removeStorage = function (storage) {
  window.localStorage.removeItem(storage);
};

// ------------------------------------------------------
// DATA
// ------------------------------------------------------
// Format the string
mpe.data.isValidName = function (name) {
  name = name.toString();
  var pattern = new RegExp(/^[a-zA-Z0-9_\- ()[\]]*$/);
  return pattern.test(name);
};

mpe.data.nameToField = function (PJ, name) {
  var preKey = 'MPE_' + mpe.data.getPreKeyPj(PJ);
  var field = name;

  field = field.replace(/ /g, '___');
  field = preKey + field;
  return field;
};

mpe.data.fieldToName = function (PJ, field) {
  var preKey = 'MPE_' + mpe.data.getPreKeyPj(PJ);
  var name = field;

  name = name.replace(preKey, '');
  name = name.replace(/___/g, ' ');
  return name;
};

mpe.data.getCurrKeyPj = function (PJ) {
  return mpe.obj.projects[PJ].currKey;
};

mpe.data.getPreKeyPj = function (PJ) {
  return mpe.obj.projects[PJ].defaultKey;
};

mpe.data.getProjects = function (PJ) {
  return mpe.obj.projects[PJ].pj;
};

mpe.data.getProjectIndex = function (PJ) {
  var arrSidebar = mpe.obj.opt['settings']['sidebar'];
  return arrSidebar.indexOf(PJ);
};

mpe.data.isInSidebar = function (PJ) {
  return mpe.data.getProjectIndex(PJ) >= 0;
};


mpe.data.getManagerIndex = function (PJ) {
  var arrSidebar = mpe.obj.opt['settings']['manager'];
  return arrSidebar.indexOf(PJ);
};

mpe.data.isInManager = function (PJ) {
  return mpe.data.getManagerIndex(PJ) >= 0;
};

mpe.data.getFaClass = function (PJ) {
  return mpe.obj.projects[PJ].fa;
};
mpe.data.getTitle = function (PJ) {
  return mpe.obj.projects[PJ].title;
};


mpe.data.addStorageToPJ = function (PJ, storage) {
  mpe.obj.projects[PJ].pj.push(storage);
};
mpe.data.removeStorageFromPJ = function (PJ, storage) {
  var index = mpe.obj.projects[PJ].pj.indexOf(storage);
  if (index >= 0) { mpe.obj.projects[PJ].pj.splice(index, 1); }
};
mpe.data.setDefaultKey = function (PJ) {
  mpe.obj.projects[PJ].currKey = mpe.data.getPreKeyPj();
};
mpe.data.setKey = function (PJ, keyName) {
  mpe.obj.projects[PJ].currKey = keyName;
};

mpe.data.scanStorageForAll = function () {
  var list = mpe.obj.projects;
  for (var name in list) {
    mpe.data.scanStorageForOne(name);
  }
};
mpe.data.scanStorageForOne = function (name) {
  var PROJ = mpe.obj.projects[name];
  PROJ.pj = [];

  //        if(window.localStorage[PROJ.defaultKey] !== undefined){
  for (var field in window.localStorage) {
    if (field.includes('MPE_' + PROJ.defaultKey)) {
      PROJ.pj.push(field);
    }
  }
  //        }
};

// ------------------------------------------------------
// HTML and UI
// ------------------------------------------------------
mpe.getHTML.projectOptions = function (PJ) {
  var PROJ = mpe.obj.projects[PJ];
  var html = '';
  var active = PROJ.currKey === PROJ.defaultKey ? 'selected' : '';
  html += '<option ' + active + ' value="' + PROJ.defaultKey + '">Default Project</option>';

  for (var index in PROJ.pj) {
    var nameMultiStorage = PROJ.pj[index];
    var label = nameMultiStorage.replace('MPE_' + PROJ.defaultKey, '');

    active = PROJ.currKey === nameMultiStorage ? 'selected' : '';
    html += '<option ' + active + ' value="' + nameMultiStorage + '">' + mpe.data.fieldToName(PJ, label) + '</option>';
  }
  return html;
};

mpe.getHTML.project = function (PJ) {
  var PROJ = mpe.obj.projects[PJ];
  var listElem = '';
  var txtNew = '+';
  var txtDel = 'X';

  if (window.plugin.faIcon) {
    txtNew = '<i class="fa fa-plus"></i>';
    txtDel = '<i class="fa fa-trash"></i>';
  }

  listElem += '<div class="mpe manager ' + PJ + ' list-group-item" data-mpe="' + PJ + '">';
  listElem += '<h4>' + PROJ.title + '</h4>';
  listElem += '<a class="left" onclick="window.plugin.mpe.action.deleteProject(\'' + PJ + '\');return false;" title="Delete Current">' + txtDel + '</a>';
  listElem += '<a class="right" onclick="window.plugin.mpe.action.createNewProject(\'' + PJ + '\');return false;" title="Create New">' + txtNew + '</a>';
  listElem += '<select class="left" onchange="window.plugin.mpe.action.switchProject(\'' + PJ + '\', $(this).val());return false;">';

  listElem += mpe.getHTML.projectOptions(PJ);

  listElem += '</select>';
  listElem += '<div class="clear"></div>';
  listElem += '</div>';

  return listElem;
};
mpe.getHTML.projectsAll = function () {
  var html = '';

  for (var name in mpe.obj.projects) {
    html += mpe.getHTML.project(name);
  }
  return html;
};
mpe.getHTML.prjSett = function (PJ) {
  var PROJ = mpe.obj.projects[PJ];
  var listElem = '';

  var inManager = mpe.data.isInManager(PJ) ? 'checked' : '';
  var inSidebar = mpe.data.isInSidebar(PJ) ? 'checked' : '';

  listElem += '<div class="mpe settings ' + PJ + '" data-mpe="' + PJ + '">';
  listElem += '<h4>' + PROJ.title + '</h4>';
  listElem += '<div>';
  listElem += '<label><input type="checkbox" ' + inManager + ' onclick="window.plugin.mpe.action.toggleManager(\'' + PJ + '\');" />in Manager</label>';
  listElem += '<label><input type="checkbox" ' + inSidebar + ' onclick="window.plugin.mpe.action.toggleSidebar(\'' + PJ + '\');" />in Sidebar</label>';
  listElem += '</div>';
  listElem += '</div>';

  return listElem;
};
mpe.getHTML.prjSettAll = function () {
  var html = '';

  for (var type in mpe.obj.projects) {
    html += mpe.getHTML.prjSett(type);
  }
  return html;
};

mpe.ui.deleteOption = function (PJ, storageName) {
  var PROJ = mpe.obj.projects[PJ];
  if (storageName !== PROJ.defaultKey) {
    //            $('.mpeManager select.'+PJ+' option[value = "'+storageName+'"]').remove();
    $('.mpe[data-mpe="' + PJ + '"] select option[value = "' + storageName + '"]').remove();
  }
};
mpe.ui.appendOption = function (PJ, storageName) {
  var opt = '<option value="' + storageName + '">' + mpe.data.fieldToName(PJ, storageName) + '</option>';
  //        $('.mpeManager select.'+PJ+'').append(opt);
  $('.mpe[data-mpe="' + PJ + '"] select').append(opt);
};
mpe.ui.redrawHTMLOptions = function (PJ) {
  var html = mpe.getHTML.projectOptions(PJ);
  $('.mpe[data-mpe="' + PJ + '"] select').html(html);
};

mpe.ui.addControl = function () {
  $('#toolbox').append('<a class="list-group-item" onclick="window.plugin.mpe.dialog.openMain();return false;"><i class="fa fa-files-o"></i>MultiProjects</a>');
};
mpe.ui.appendContainerInSidebar = function () {
  if (!$('#multi-projects.mpeSidebar').length) {
    $('#sidebar').append('<div id="multi-projects" class="mpeSidebar list-group"></div>');
  }
};

// ------------------------------------------------------
// DIALOGS
// ------------------------------------------------------
mpe.dialog.openMain = function () {
  //        mpe.data.scanStorageForAll();
  var html = mpe.getHTML.projectsAll();

  window.dialog({
    title: 'Multi Projects Manager',
    html: '<div class="mpeManager">' + html + '</div>',
    dialogClass: 'ui-dialog-mpe',
    minWidth: 300,
    buttons: {
      SETTINGS: function () {
        mpe.dialog.openSettings();
      }
    }
  });

  var list = mpe.obj.projects;
  for (var name in list) {
    mpe.ui.toggleManager(name);
  }
};
mpe.dialog.openSettings = function () {
  window.dialog({
    title: 'Multi Projects Settings',
    html: '<div class="mpeSettings">' + mpe.getHTML.prjSettAll() + '</div>',
    dialogClass: 'ui-dialog-mpe',
    minWidth: 300
  });
};
mpe.dialog.insertNameNewProject = function () {
  var promptAction = prompt('Choose a Project Name.\nNB: you can use only a-z, A-Z, 0-9, "() []" and " "', '');

  if (promptAction !== null && promptAction !== '') {
    return promptAction;
  }
  return false;
};

// ------------------------------------------------------
// VISIBILITY OPT (IN MANAGER, IN SIDEBAR)
// ------------------------------------------------------
mpe.action.toggleSidebar = function (PJ) {
  mpe.data.toggleSidebar(PJ);
  mpe.storage.save();
  mpe.ui.toggleSidebar(PJ);
};
mpe.action.toggleManager = function (PJ) {
  mpe.data.toggleManager(PJ);
  mpe.storage.save();
  mpe.ui.toggleManager(PJ);
};

mpe.data.toggleSidebar = function (PJ) {
  var arrSidebar = mpe.obj.opt['settings']['sidebar'];

  var index = mpe.data.getProjectIndex(PJ);
  if (index >= 0) {
    arrSidebar.splice(index, 1);
    return false;
  } else {
    arrSidebar.push(PJ);
    return true;
  }
};
mpe.data.toggleManager = function (PJ) {
  var arrSidebar = mpe.obj.opt['settings']['manager'];

  var index = mpe.data.getManagerIndex(PJ);
  if (index >= 0) {
    arrSidebar.splice(index, 1);
    return false;
  } else {
    arrSidebar.push(PJ);
    return true;
  }
};

mpe.ui.toggleSidebar = function (PJ) {
  var entry = $('.mpeSidebar .mpe.' + PJ);

  if (!mpe.data.isInSidebar(PJ)) {
    entry.remove();
  } else if (entry.length === 0) {
    var icon = getProjectIcon(PJ);
    var newEntry = $(mpe.getHTML.project(PJ));
    newEntry.prepend(icon);
    $('.mpeSidebar').append(newEntry);
  }
};

function getProjectIcon(PJ) {
  var title = mpe.data.getTitle(PJ);

  if (window.plugin.faIcon) {
    var fa = mpe.data.getFaClass(PJ);
    fa = fa.length !== 0 ? fa : 'nofa';
    return '<i class="left fa ' + fa + '" title="' + title + '"></i>';
  } else {
    var short = title ? title.substr(0, 3) : 'n/a';
    return '<i class="left fa" title="' + title + '">' + short + '</i>';
  }
}

mpe.ui.toggleManager = function (PJ) {
  var elem = $('.mpeManager .mpe.' + PJ + '');

  if (mpe.data.isInManager(PJ)) {
    elem.hide();
  } else {
    elem.show();
  }
};

// ------------------------------------------------------
// ACTIONS
// ------------------------------------------------------
mpe.action.switchProject = function (PJ, storageKey) {
  var pj = mpe.obj.projects[PJ];
  var oldKey = pj.currKey;

  // change in obj
  mpe.data.setKey(PJ, storageKey);

  pj.func_pre();

  // change in plugin
  pj.func_setKey(storageKey);
  console.log('MULTI PROJECTS: switch "' + pj.title + '" storage to "' + storageKey + '".');

  pj.func_post();

  mpe.ui.redrawHTMLOptions(PJ);

  var data = {
    event: 'switch',
    data: {
      namespace: pj.namespace,
      title: pj.title,
      defaultStorage: pj.defaultKey,
      prevStorage: oldKey,
      currentStorage: storageKey
    }
  };

  window.runHooks('mpe', data);
};

mpe.action.createNewProject = function (PJ, label) {
  var name = (label !== undefined) ? label : mpe.dialog.insertNameNewProject();
  if (name === false || name === '') { return false; }

  var isValid = mpe.data.isValidName(name);
  if (isValid === true) {
    var storageName = mpe.data.nameToField(PJ, name);
    mpe.data.addStorageToPJ(PJ, storageName);
    //            mpe.ui.appendOption(PJ, newName);
    mpe.action.switchProject(PJ, storageName);
  } else {
    alert('Failed. Invalid Name');
  }
};
mpe.action.deleteProject = function (PJ, storage) {
  if (storage === undefined) {
    storage = mpe.data.getCurrKeyPj(PJ);
  }

  var PROJ = mpe.obj.projects[PJ];
  var title = PROJ.title;
  var label = mpe.data.fieldToName(PJ, storage);
  if (storage === PROJ.defaultKey) { label = 'Default Project'; }

  var promptAction = confirm('The "' + label + '" project data in "' + title + '" will be deleted. Are you sure?', '');
  if (promptAction) {
    //            mpe.ui.deleteOption(PJ, storage);
    mpe.data.removeStorageFromPJ(PJ, storage);
    mpe.storage.removeStorage(storage);

    //            mpe.data.setDefaultKey(PJ);

    // to switch to default_key and load the default storage
    var defaultKey = mpe.data.getPreKeyPj(PJ);
    mpe.action.switchProject(PJ, defaultKey);
  }
};

// ------------------------------------------------------

mpe.setMultiProjects = function (settings) {
  mpe.storage.load();
  mpe.ui.appendContainerInSidebar();

  if (
    settings.namespace &&
    settings.defaultKey &&
    settings.func_setKey &&
    settings.func_post
  ) {
    if (!settings.title) { settings.title = 'Untitled'; }
    if (!settings.fa) { settings.fa = ''; }
    if (!settings.func_pre) { settings.func_pre = ''; }

    var newMPE = {
      namespace: settings.namespace,
      title: settings.title,
      fa: settings.fa,
      defaultKey: settings.defaultKey,
      currKey: settings.defaultKey,
      func_setKey: settings.func_setKey,
      func_pre: settings.func_pre,
      func_post: settings.func_post,
      pj: []
    };

    mpe.obj.projects[settings.namespace] = newMPE;
    mpe.data.scanStorageForOne(settings.namespace);
    mpe.ui.toggleSidebar(settings.namespace);
  }
};

mpe.setupCSS = function () {
  $('<style>').prop('type', 'text/css').html(''
    + '.mpe, .mpe *{text-align:center;box-sizing:border-box;}'
    + '.mpe .left{float:left;}'
    + '.mpe .right{float:right;}'
    + '.mpe .clear{clear:both;}'
    + '.mpe .fa{line-height:20px;}'
    + '.ui-dialog .mpe{width:90%;margin:8px auto 8px;}'

    + '.mpe h4{margin:0 0 4px;font-size:15px;font-style:italic;}'
    + '.mpe select, .mpe a{border:1px solid #ffce00;padding:1px 4px 2px;background:rgba(8,48,78,.9);height:23px;color:#ffce00;}'
    + '.mpe select{width:72%;margin: 0 3%;}'
    + '.mpe a{width:11%;}'

    + '.ui-dialog-mpe button{margin-left:6px;padding:4px 8px 2px;}'
    + '.mpe.settings > div{border:1px solid #ffce00;padding:1px 5px 3px;background:rgba(8,48,78,.9);display:inline-block;}'
    + '.mpe.settings label{cursor:pointer;color:#ffce00;margin:0 2px 0px;}'
    + '.mpe.settings label input{margin:4px 4px;}'

    + '#sidebar .mpeSidebar{}'
    + '#sidebar .mpeSidebar .mpe{width:100%;padding:3px 4px;}'
    + '#sidebar .mpeSidebar .mpe h4{display:none;}'
    + '#sidebar .mpeSidebar .mpe > .fa{color:#ccc;width:8%;height:23px;margin-right:1%}'
    + '#sidebar .mpeSidebar .mpe > .fa.nofa:before{content:\'\0\';}'
    + '#sidebar .mpeSidebar .mpe a{}'
    + '#sidebar .mpeSidebar .mpe select{width:63%;}'
  ).appendTo('head');
};


var setup = function () {
  mpe.storage.check();
  mpe.setupCSS();
  mpe.ui.addControl();
  mpe.ui.appendContainerInSidebar();
};

setup.priority = 'high';
