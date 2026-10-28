// @author         ZasoGD
// @name           Multi Projects Extension
// @category       Controls
// @version        0.2.0
// @description    Create separated projects in some plugins.

/* exported setup, changelog --eslint */
/* global IITC -- eslint */

var changelog = [
  {
    version: '0.2.0',
    changes: [
      'Register projects regardless of plugin load order',
      'Keep the selected project across reloads',
      'Ignore a scan for a project that is not registered',
      'Draw icons from the bundled font',
    ],
  },
  {
    version: '0.1.5',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.1.4',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.1.3',
    changes: ['IITC.toolbox API is used to create plugin buttons'],
  },
  {
    version: '0.1.2',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

//
// How to implement MPE in your plugin: https://github.com/IITC-CE/ingress-intel-total-conversion/wiki/Multi-Projects-Extension
//

// use own namespace for plugin
window.plugin.mpe = function () {};

window.plugin.mpe.data = {};
window.plugin.mpe.storage = {};
window.plugin.mpe.obj = {};
window.plugin.mpe.data = {};
window.plugin.mpe.ui = {};
window.plugin.mpe.getHTML = {};
window.plugin.mpe.dialog = {};
window.plugin.mpe.action = {};

window.plugin.mpe.obj.projects = {};
window.plugin.mpe.obj.opt = { settings: { sidebar: [] } };

const pendingProjects = [];
window.plugin.mpe.isReady = false;

// ------------------------------------------------------
// STORAGE
// ------------------------------------------------------
window.plugin.mpe.storage.NAME = 'plugin-mpe';
window.plugin.mpe.storage.saveStorage = function () {
  window.localStorage[window.plugin.mpe.storage.NAME] = JSON.stringify(window.plugin.mpe.obj.opt);
};
window.plugin.mpe.storage.loadStorage = function () {
  window.plugin.mpe.obj.opt = JSON.parse(window.localStorage[window.plugin.mpe.storage.NAME]);
  // the projects hidden in the manager dialog, which the settings page replaces
  delete window.plugin.mpe.obj.opt.settings.manager;
};
window.plugin.mpe.storage.checkStorage = function () {
  if (window.localStorage[window.plugin.mpe.storage.NAME] === undefined) {
    window.plugin.mpe.obj.opt = { settings: { sidebar: [] } };
    window.plugin.mpe.storage.saveStorage();
  }
  window.plugin.mpe.storage.loadStorage();
};

window.plugin.mpe.storage.addStorage = function (storage) {
  window.localStorage[storage] = '';
};
window.plugin.mpe.storage.removeStorage = function (storage) {
  delete window.localStorage[storage];
};

// ------------------------------------------------------
// DATA
// ------------------------------------------------------
// Format the string
window.plugin.mpe.data.validateName = function (rname) {
  var name = rname.toString();
  var pattern = new RegExp(/^[a-zA-Z0-9_\- ()[\]]/);
  for (var i = 0; i < name.length; i++) {
    if (!pattern.test(name[i])) {
      return false;
    }
  }
  return true;
};
window.plugin.mpe.data.nameToField = function (PJ, name) {
  var preKey = 'MPE_' + window.plugin.mpe.data.getPreKeyPj(PJ);
  var field = name;

  field = field.replace(/ /g, '___');
  field = preKey + field;
  return field;
};
window.plugin.mpe.data.fieldToName = function (PJ, field) {
  var preKey = 'MPE_' + window.plugin.mpe.data.getPreKeyPj(PJ);
  var name = field;

  name = name.replace(preKey, '');
  name = name.replace(/___/g, ' ');
  return name;
};

window.plugin.mpe.data.getCurrKeyPj = function (PJ) {
  return window.plugin.mpe.obj.projects[PJ].currKey;
};
window.plugin.mpe.data.getPreKeyPj = function (PJ) {
  return window.plugin.mpe.obj.projects[PJ].defaultKey;
};
window.plugin.mpe.data.getProjects = function (PJ) {
  return window.plugin.mpe.obj.projects[PJ].pj;
};

// the default project is the absence of an entry, so old storages need no migration
window.plugin.mpe.data.getSavedKeyPj = (PJ) => window.plugin.mpe.obj.opt.settings.current?.[PJ];
window.plugin.mpe.data.saveKeyPj = (PJ, storageKey) => {
  const { settings } = window.plugin.mpe.obj.opt;
  settings.current ??= {};

  if (storageKey === window.plugin.mpe.data.getPreKeyPj(PJ)) {
    delete settings.current[PJ];
  } else {
    settings.current[PJ] = storageKey;
  }
  window.plugin.mpe.storage.saveStorage();
};

window.plugin.mpe.data.isInSidebar = (PJ) => IITC.settings.get(`mpe.sidebar_${PJ}`) === true;

// the sidebar flags were kept in plugin-mpe: each moves to its setting once its plugin registers
window.plugin.mpe.data.migrateSidebar = (PJ) => {
  const { sidebar } = window.plugin.mpe.obj.opt.settings;
  if (!sidebar?.includes(PJ)) return;
  IITC.settings.set(`mpe.sidebar_${PJ}`, true);
  sidebar.splice(sidebar.indexOf(PJ), 1);
  window.plugin.mpe.storage.saveStorage();
};

window.plugin.mpe.data.getFaClass = function (PJ) {
  return window.plugin.mpe.obj.projects[PJ].fa;
};
window.plugin.mpe.data.getIcon = function (PJ) {
  return window.plugin.mpe.obj.projects[PJ].icon;
};
window.plugin.mpe.data.getTitle = function (PJ) {
  return window.plugin.mpe.obj.projects[PJ].title;
};

window.plugin.mpe.data.addStorageToPJ = function (PJ, storage) {
  window.plugin.mpe.obj.projects[PJ].pj.push(storage);
};
window.plugin.mpe.data.removeStorageFromPJ = function (PJ, storage) {
  var index = window.plugin.mpe.obj.projects[PJ].pj.indexOf(storage);
  if (index >= 0) {
    window.plugin.mpe.obj.projects[PJ].pj.splice(index, 1);
  }
};
window.plugin.mpe.data.setDefaultKey = function (PJ) {
  window.plugin.mpe.obj.projects[PJ].currKey = window.plugin.mpe.data.getPreKeyPj();
};
window.plugin.mpe.data.setKey = function (PJ, keyName) {
  window.plugin.mpe.obj.projects[PJ].currKey = keyName;
};

window.plugin.mpe.data.scanStorageForAll = function () {
  var list = window.plugin.mpe.obj.projects;
  for (var name in list) {
    window.plugin.mpe.data.scanStorageForOne(name);
  }
};
window.plugin.mpe.data.scanStorageForOne = function (name) {
  var PROJ = window.plugin.mpe.obj.projects[name];
  // not registered yet: setMultiProjects scans as soon as it is
  if (!PROJ) {
    return;
  }
  PROJ.pj = [];

  //        if(window.localStorage[PROJ.defaultKey] !== undefined){
  for (var field in window.localStorage) {
    if (field.includes('MPE_' + PROJ.defaultKey)) {
      PROJ.pj.push(field);
    }
  }
  //        }
  IITC.settings.refresh(window.plugin.mpe.PAGE_ID);
};

// ------------------------------------------------------
// HTML and UI
// ------------------------------------------------------
window.plugin.mpe.getHTML.projectOptions = function (PJ) {
  var PROJ = window.plugin.mpe.obj.projects[PJ];
  var html = '';
  var active = '';
  if (PROJ.currKey === PROJ.defaultKey) {
    active = 'selected';
  }
  html += `<option ${active} value="${PROJ.defaultKey}">Default Project</option>`;

  for (var index in PROJ.pj) {
    var nameMultiStorage = PROJ.pj[index];
    var label = nameMultiStorage.replace('MPE_' + PROJ.defaultKey, '');

    const selected = PROJ.currKey === nameMultiStorage ? 'selected' : '';
    html += `<option ${selected} value="${nameMultiStorage}">${window.plugin.mpe.data.fieldToName(PJ, label)}</option>`;
  }
  return html;
};
window.plugin.mpe.getHTML.project = function (PJ) {
  var PROJ = window.plugin.mpe.obj.projects[PJ];
  var listElem = '';
  var txtNew = '<iitc-icon fallback="+">add</iitc-icon>';
  var txtDel = '<iitc-icon fallback="X">delete</iitc-icon>';

  listElem += `<div class="mpe manager ${PJ} list-group-item" data-mpe="${PJ}">`;
  listElem += `<h4>${PROJ.title}</h4>`;
  listElem += `<a class="left" onclick="window.plugin.mpe.action.deleteProject('${PJ}');return false;" title="Delete Current">${txtDel}</a>`;
  listElem += `<a class="right" onclick="window.plugin.mpe.action.createNewProject('${PJ}');return false;" title="Create New">${txtNew}</a>`;
  listElem += `<select class="left" onchange="window.plugin.mpe.action.switchProject('${PJ}', $(this).val());return false;">`;

  listElem += window.plugin.mpe.getHTML.projectOptions(PJ);

  listElem += '</select>';
  listElem += '<div class="clear"></div>';
  listElem += '</div>';

  return listElem;
};
window.plugin.mpe.ui.deleteOption = function (PJ, storageName) {
  var PROJ = window.plugin.mpe.obj.projects[PJ];
  if (storageName !== PROJ.defaultKey) {
    //            $('.mpeManager select.'+PJ+' option[value = "'+storageName+'"]').remove();
    $(`.mpe[data-mpe="${PJ}"] select option[value = "${storageName}"]`).remove();
  }
};
window.plugin.mpe.ui.appendOption = function (PJ, storageName) {
  var opt = `<option value="${storageName}">${window.plugin.mpe.data.fieldToName(PJ, storageName)}</option>`;
  //        $('.mpeManager select.'+PJ+'').append(opt);
  $(`.mpe[data-mpe="${PJ}"] select`).append(opt);
};
window.plugin.mpe.ui.redrawHTMLOptions = function (PJ) {
  var html = window.plugin.mpe.getHTML.projectOptions(PJ);
  $(`.mpe[data-mpe="${PJ}"] select`).html(html);
};

window.plugin.mpe.ui.appendContainerInSidebar = function () {
  if (!$('#multi-projects.mpeSidebar').length) {
    $('#sidebar').append('<div id="multi-projects" class="mpeSidebar list-group"></div>');
  }
};

// ------------------------------------------------------
// DIALOGS
// ------------------------------------------------------
window.plugin.mpe.dialog.insertNameNewProject = function () {
  var promptAction = prompt('Choose a Project Name.\nNB: you can use only a-z, A-Z, 0-9, "() []" and " "', '');

  if (promptAction !== null && promptAction !== '') {
    return promptAction;
  }
  return false;
};

// ------------------------------------------------------
// VISIBILITY IN SIDEBAR
// ------------------------------------------------------
window.plugin.mpe.ui.toggleSidebar = function (PJ) {
  var entry = $('.mpeSidebar .mpe.' + PJ);

  if (!window.plugin.mpe.data.isInSidebar(PJ)) {
    entry.remove();
  } else if (entry.length === 0) {
    var icon = getProjectIcon(PJ);
    var newEntry = $(window.plugin.mpe.getHTML.project(PJ));
    newEntry.prepend(icon);
    $('.mpeSidebar').append(newEntry);
  }
};

function getProjectIcon(PJ) {
  var title = window.plugin.mpe.data.getTitle(PJ);

  var icon = window.plugin.mpe.data.getIcon(PJ);
  if (icon.length !== 0) {
    return '<iitc-icon class="left" title="' + title + '">' + icon + '</iitc-icon>';
  }

  if (window.plugin.faIcon) {
    var fa = window.plugin.mpe.data.getFaClass(PJ);
    fa = fa.length !== 0 ? fa : 'nofa';
    return '<i class="left fa ' + fa + '" title="' + title + '"></i>';
  }

  var short = title ? title.substr(0, 3) : 'n/a';
  return '<i class="left fa" title="' + title + '">' + short + '</i>';
}

// ------------------------------------------------------
// ACTIONS
// ------------------------------------------------------
window.plugin.mpe.action.switchProject = function (PJ, storageKey) {
  var pj = window.plugin.mpe.obj.projects[PJ];
  var oldKey = pj.currKey;

  // change in obj
  window.plugin.mpe.data.setKey(PJ, storageKey);
  window.plugin.mpe.data.saveKeyPj(PJ, storageKey);

  pj.func_pre();

  // change in plugin
  pj.func_setKey(storageKey);
  console.log(`MULTI PROJECTS: switch "${pj.title}" storage to "${storageKey}".`);

  pj.func_post();

  window.plugin.mpe.ui.redrawHTMLOptions(PJ);
  IITC.settings.refresh(window.plugin.mpe.PAGE_ID);

  const data = {
    event: 'switch',
    data: {
      namespace: pj.namespace,
      title: pj.title,
      defaultStorage: pj.defaultKey,
      prevStorage: oldKey,
      currentStorage: storageKey,
    },
  };

  window.runHooks('mpe', data);
};

window.plugin.mpe.action.createNewProject = function (PJ, label) {
  var name = label !== undefined ? label : window.plugin.mpe.dialog.insertNameNewProject();
  if (name === false || name === '') {
    return false;
  }

  try {
    window.plugin.mpe.action.createProject(PJ, name);
  } catch (e) {
    alert(`Failed. ${e.message}`);
  }
};

// true, or why a project cannot have this name
window.plugin.mpe.data.checkName = (PJ, name) => {
  if (name === '') return 'Enter a name';
  if (!window.plugin.mpe.data.validateName(name)) return 'Invalid name: use only a-z, A-Z, 0-9, _, -, (), [] and spaces';
  if (window.plugin.mpe.data.getProjects(PJ).includes(window.plugin.mpe.data.nameToField(PJ, name))) return `"${name}" already exists`;
  return true;
};

// creates the project and switches to it; throws for a name that cannot be used
window.plugin.mpe.action.createProject = (PJ, text) => {
  const name = text.trim();
  const check = window.plugin.mpe.data.checkName(PJ, name);
  if (check !== true) throw new Error(check);

  const storageName = window.plugin.mpe.data.nameToField(PJ, name);
  window.plugin.mpe.data.addStorageToPJ(PJ, storageName);
  window.plugin.mpe.action.switchProject(PJ, storageName);
};
window.plugin.mpe.action.deleteProject = function (PJ, storage) {
  if (storage === undefined) {
    storage = window.plugin.mpe.data.getCurrKeyPj(PJ);
  }

  var PROJ = window.plugin.mpe.obj.projects[PJ];
  var title = PROJ.title;
  var label = window.plugin.mpe.data.fieldToName(PJ, storage);
  if (storage === PROJ.defaultKey) {
    label = 'Default Project';
  }

  var promptAction = confirm(`The "${label}" project data in "${title}" will be deleted. Are you sure?`);
  if (promptAction) {
    //            window.plugin.mpe.ui.deleteOption(PJ, storage);
    window.plugin.mpe.data.removeStorageFromPJ(PJ, storage);
    window.plugin.mpe.storage.removeStorage(storage);

    //            window.plugin.mpe.data.setDefaultKey(PJ);

    if (storage === PROJ.currKey) {
      // to switch to default_key and load the default storage
      var defaultKey = window.plugin.mpe.data.getPreKeyPj(PJ);
      window.plugin.mpe.action.switchProject(PJ, defaultKey);
    } else {
      window.plugin.mpe.action.reportDelete(PJ, storage);
    }
  }
  return promptAction;
};

// a project other than the one in use is gone: the plugin keeps its project, and learns of the deletion
// through the same hook as of a switch, which is how sync of its data finds the projects that are gone
window.plugin.mpe.action.reportDelete = (PJ, storageKey) => {
  const pj = window.plugin.mpe.obj.projects[PJ];
  window.plugin.mpe.ui.redrawHTMLOptions(PJ);
  IITC.settings.refresh(window.plugin.mpe.PAGE_ID);
  window.runHooks('mpe', {
    event: 'delete',
    data: {
      namespace: pj.namespace,
      title: pj.title,
      defaultStorage: pj.defaultKey,
      prevStorage: pj.currKey,
      currentStorage: pj.currKey,
      deletedStorage: storageKey,
    },
  });
};

// ------------------------------------------------------

window.plugin.mpe.setMultiProjects = function (settings) {
  // setup may not have run yet: it replays whatever registered before it
  if (!window.plugin.mpe.isReady) {
    pendingProjects.push(settings);
    return;
  }

  window.plugin.mpe.storage.loadStorage();
  window.plugin.mpe.ui.appendContainerInSidebar();

  if (settings.namespace && settings.defaultKey && settings.func_setKey && settings.func_post) {
    if (!settings.title) {
      settings.title = 'Untitled';
    }
    if (!settings.icon) {
      settings.icon = '';
    }
    if (!settings.fa) {
      settings.fa = '';
    }
    if (!settings.func_pre) {
      settings.func_pre = () => {};
    }

    var newMPE = {
      namespace: settings.namespace,
      title: settings.title,
      icon: settings.icon,
      fa: settings.fa,
      defaultKey: settings.defaultKey,
      currKey: settings.defaultKey,
      func_setKey: settings.func_setKey,
      func_pre: settings.func_pre,
      func_post: settings.func_post,
      pj: [],
    };

    window.plugin.mpe.obj.projects[settings.namespace] = newMPE;
    window.plugin.mpe.registerSettings();
    window.plugin.mpe.data.migrateSidebar(settings.namespace);
    window.plugin.mpe.data.scanStorageForOne(settings.namespace);
    window.plugin.mpe.ui.toggleSidebar(settings.namespace);
    window.plugin.mpe.action.restoreProject(settings.namespace);
  }
};

// plugins always register on their default key, so an earlier choice is re-applied here
window.plugin.mpe.action.restoreProject = (PJ) => {
  // the switch runs plugin code that expects every plugin to be set up
  if (!window.iitcLoaded) {
    window.addHook('iitcLoaded', () => window.plugin.mpe.action.restoreProject(PJ));
    return;
  }

  const storageKey = window.plugin.mpe.data.getSavedKeyPj(PJ);
  if (storageKey === undefined || storageKey === window.plugin.mpe.data.getCurrKeyPj(PJ)) return;

  // the project may have been deleted in another tab
  if (!window.plugin.mpe.data.getProjects(PJ).includes(storageKey)) {
    window.plugin.mpe.data.saveKeyPj(PJ, window.plugin.mpe.data.getPreKeyPj(PJ));
    return;
  }

  window.plugin.mpe.action.switchProject(PJ, storageKey);
};

// ------------------------------------------------------
// SETTINGS
// ------------------------------------------------------
window.plugin.mpe.PAGE_ID = 'multi-projects-extension';

window.plugin.mpe.projectChoices = (PJ) => [
  { id: window.plugin.mpe.data.getPreKeyPj(PJ), title: 'Default project' },
  ...window.plugin.mpe.data.getProjects(PJ).map((storageKey) => ({ id: storageKey, title: window.plugin.mpe.data.fieldToName(PJ, storageKey) })),
];

// a section for every plugin registered so far, in the order they registered, so the blocks already drawn
// keep their place; the page is declared again as each plugin registers. The project in use stays in
// plugin-mpe, on this device only
window.plugin.mpe.registerSettings = () => {
  const projects = Object.keys(window.plugin.mpe.obj.projects);
  IITC.settings.register(window.plugin.mpe.PAGE_ID, {
    title: 'Multi Projects',
    namespace: 'mpe',
    shortcut: { label: 'MultiProjects', icon: 'folder_copy' },
    blocks: [
      { type: 'text', text: 'No plugin with projects is enabled. Bookmarks and Draw Tools have them', visible: projects.length === 0 },
      ...projects.flatMap((PJ) => {
        const isDefault = (project) => project.id === window.plugin.mpe.data.getPreKeyPj(PJ);
        return [
          { type: 'heading', title: window.plugin.mpe.data.getTitle(PJ) },
          {
            type: 'repeat',
            over: () => window.plugin.mpe.projectChoices(PJ),
            blocks: [
              {
                type: 'choice',
                title: 'In use',
                selected: (project) => project.id === window.plugin.mpe.data.getCurrKeyPj(PJ),
                action: (project) => window.plugin.mpe.action.switchProject(PJ, project.id),
              },
              {
                type: 'action',
                // the default project stays, emptied
                title: (project) => (isDefault(project) ? 'Clear' : 'Delete'),
                icon: (project) => (isDefault(project) ? 'delete_sweep' : 'delete'),
                action: (project) => {
                  if (!window.plugin.mpe.action.deleteProject(PJ, project.id)) return undefined;
                  return isDefault(project) ? 'Cleared' : 'Deleted';
                },
              },
            ],
          },
          {
            type: 'action',
            title: 'New project',
            action: async () => {
              const name = await IITC.utils.promptText({
                title: `New project in ${window.plugin.mpe.data.getTitle(PJ)}`,
                label: 'Letters, digits, spaces and _ - ( ) [ ]',
                validate: (text) => window.plugin.mpe.data.checkName(PJ, text),
              });
              if (name === undefined) return undefined;
              window.plugin.mpe.action.createProject(PJ, name);
              return `Created "${name}"`;
            },
          },
          {
            type: 'boolean',
            key: `sidebar_${PJ}`,
            title: 'Show in the sidebar',
            onChange: () => window.plugin.mpe.ui.toggleSidebar(PJ),
          },
        ];
      }),
    ],
  });
};

window.plugin.mpe.setupCSS = function () {
  $('<style>')
    .prop('type', 'text/css')
    .html(
      '' +
        '.mpe, .mpe *{text-align:center;box-sizing:border-box;}' +
        '.mpe .left{float:left;}' +
        '.mpe .right{float:right;}' +
        '.mpe .clear{clear:both;}' +
        '.mpe .fa, .mpe iitc-icon{line-height:1;}' +
        '.mpe h4{margin:0 0 4px;font-size:15px;font-style:italic;}' +
        '.mpe select, .mpe a{border:1px solid #ffce00;padding:1px 4px 2px;background:rgba(8,48,78,.9);min-height:23px;color:#ffce00;}' +
        '.mpe select{width:72%;margin: 0 3%;}' +
        '.mpe a{width:11%;display:flex;align-items:center;justify-content:center;}' +
        '#sidebar .mpeSidebar{}' +
        '#sidebar .mpeSidebar .mpe{width:100%;padding:3px 4px;}' +
        '#sidebar .mpeSidebar .mpe h4{display:none;}' +
        '#sidebar .mpeSidebar .mpe > .fa, #sidebar .mpeSidebar .mpe > iitc-icon{color:#ccc;width:8%;min-height:23px;margin-right:1%;display:flex;align-items:center;justify-content:center;}' +
        "#sidebar .mpeSidebar .mpe > .fa.nofa:before{content:'\0';}" +
        '#sidebar .mpeSidebar .mpe a{}' +
        '#sidebar .mpeSidebar .mpe select{width:63%;}'
    )
    .appendTo('head');
};

var setup = function () {
  window.plugin.mpe.storage.checkStorage();
  window.plugin.mpe.setupCSS();
  window.plugin.mpe.registerSettings();
  window.plugin.mpe.ui.appendContainerInSidebar();

  window.plugin.mpe.isReady = true;
  pendingProjects.splice(0).forEach((settings) => window.plugin.mpe.setMultiProjects(settings));

  // lets plugins that ran before MPE register their projects
  window.runHooks('pluginMpeReady');
};

setup.priority = 'highest';
