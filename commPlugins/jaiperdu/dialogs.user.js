// 
// ==UserScript==
// @author         jaiperdu
// @name           Dialog List
// @category       Misc
// @version        0.1.0
// @description    List open dialogs in the sidebar
// @id             dialogs@jaiperdu
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/jaiperdu/dialogs.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/jaiperdu/dialogs.user.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {

// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

const W = window;
let DIALOGS = {};

function itemOnClick(ev) {
  const id = ev.target.closest("tr").dataset.id;
  const dialog = $(DIALOGS[id]);
  dialog.dialog("moveToTop");
}

function itemOnClose(ev) {
  const id = ev.target.closest("tr").dataset.id;
  const dialog = $(DIALOGS[id]);
  dialog.dialog("close");
}

function dialogListItem(id) {
  const dialog = $(DIALOGS[id]);
  const option = dialog.dialog("option");
  const text = option.title;
  const tr = document.createElement("tr");
  tr.dataset.id = id;
  const title = document.createElement("td");
  tr.appendChild(title);
  title.textContent = text;
  if (!dialog.is(":hidden")) title.classList.add("ui-dialog-title-inactive");
  title.addEventListener("click", itemOnClick);
  const closeButton = document.createElement("td");
  tr.appendChild(closeButton);
  closeButton.textContent = "X";
  closeButton.addEventListener("click", itemOnClose);

  return tr;
}

function updateList() {
  const list = document.getElementById("dialog-list");
  list.textContent = "";
  Object.keys(DIALOGS).forEach((id) => {
    list.appendChild(dialogListItem(id));
  });
}

const dialogMonitor = {
  set: function (obj, prop, valeur) {
    obj[prop] = valeur;
    updateList();
    return true;
  },
  deleteProperty: function (obj, prop) {
    delete obj[prop];
    updateList();
    return true;
  },
};

function setup () {
  DIALOGS = W.DIALOGS = new Proxy(W.DIALOGS, dialogMonitor);

  $("<style>")
    .prop("type", "text/css")
    .html(
      `
#dialog-list {
  padding: 3px;
}
#dialog-list tr:nth-last-child(n+2) td {
  border-bottom: 1px white dotted;
}
#dialog-list tr td:first-child {
  width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#dialog-list tr td:first-child:hover {
  color: #03fe03; /*bookmark hover*/
}
#dialog-list tr td:last-child {
  color: red;
  font-weight: bold;
}`
    )
    .appendTo("head");

  const sidebar = document.getElementById("sidebar");
  const dialogList = document.createElement("div");
  sidebar.appendChild(dialogList);
  dialogList.id = "dialog-list";
}

if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();

setup.info = plugin_info; //add the script info data to the function as a property
}

// inject code into site context
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };

var script = document.createElement('script');
// if on last IITC mobile, will be replaced by wrapper(info)
var mobile = `script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);`;
// detect if mobile
if (mobile.startsWith('script')) {
  script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
  script.appendChild(document.createTextNode('//# sourceURL=iitc:///plugins/dialogs.js'));
  (document.body || document.head || document.documentElement).appendChild(script);
} else {
  // mobile string
  wrapper(info);
}
