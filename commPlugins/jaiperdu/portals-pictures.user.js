// 
// ==UserScript==
// @author         jaiperdu
// @name           Portals pictures
// @category       Info
// @version        0.1.4
// @description    Show portal pictures in a dialog
// @id             portals-pictures@jaiperdu
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/jaiperdu/portals-pictures.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/jaiperdu/portals-pictures.user.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {

// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

function recursiveAppend(element, children) {
  // cast to string to display "undefined" or "null"
  if (children === undefined || children === null) return;
  if (Array.isArray(children)) {
    for (const child of children) recursiveAppend(element, child);
  } else {
    element.append(children);
  }
}

function jsx(tagName, attrs) {
  if (typeof tagName === 'function') return tagName(attrs);
  const children = attrs.children;
  delete attrs.children;
  const rawHtml = attrs.rawHtml;
  delete attrs.rawHtml;
  const elem = document.createElement(tagName);
  // dataset
  if (attrs.dataset) {
    for (const key in attrs.dataset) elem.dataset[key] = attrs.dataset[key];
    delete attrs.dataset;
  }
  // events
  for (const key in attrs) {
    if (key.startsWith('on')) {
      elem.addEventListener(key.slice(2), attrs[key]);
      delete attrs[key];
    }
  }
  Object.assign(elem, attrs);
  if (rawHtml) {
    elem.innerHTML = rawHtml;
    return elem;
  }
  recursiveAppend(elem, children);
  return elem;
}

const jsxs = jsx;

const defaultImage = 'https://fevgames.net/wp-content/uploads/2018/11/FS-Onyx.png';
function onPortalDetailsUpdated(e) {
  const img = document.querySelector('.portal-pictures-image[data-guid="' + e.guid + '"]');
  if (img) {
    img.src = (e.portalData.image || defaultImage).replace('http:', '');
    img.title = e.portalData.title;
  }
}
function filterOnInput(ev) {
  ev.preventDefault();
  const f = ev.target.value.toLowerCase();
  for (const n of document.querySelectorAll('.portal-pictures-image')) {
    const title = n.title.toLowerCase();
    if (title.includes(f)) n.style.display = null;else n.style.display = 'none';
  }
}
function imgOnClick(ev) {
  const img = ev.target;
  img.dataset.count++;
  let prev = img.previousElementSibling;
  while (prev && prev.dataset.count - img.dataset.count < 0) prev = prev.previousElementSibling;
  if (prev) img.parentNode.insertBefore(img, prev.nextSibling);else img.parentNode.insertBefore(img, img.parentNode.firstElementChild);
  window.renderPortalDetails(img.dataset.guid);
  ev.preventDefault();
  return false;
}
function showDialog() {
  let portals = [];
  let bounds = window.map.getBounds();
  for (const portal of Object.values(window.portals)) {
    let ll = portal.getLatLng();
    if (bounds.contains(ll)) {
      portals.push(portal);
    }
  }
  const container = jsxs("div", {
    style: "max-width: 1000px",
    children: [jsx("input", {
      placeholder: "Filter by title",
      oninput: filterOnInput
    }), jsx("hr", {}), jsx("div", {
      children: portals.map(portal => jsx("img", {
        src: (portal.options.data.image || defaultImage).replace('http:', ''),
        title: portal.options.data.title,
        className: "imgpreview portal-pictures-image",
        dataset: {
          guid: portal.options.guid,
          count: 0
        },
        onclick: imgOnClick
      }))
    })]
  });
  window.dialog({
    id: 'plugin-portal-pictures',
    html: container,
    title: 'Show portal pictures',
    width: 'auto',
    closeCallback: () => {
      window.removeHook('portalDetailsUpdated', onPortalDetailsUpdated);
    }
  });
  window.addHook('portalDetailsUpdated', onPortalDetailsUpdated);
}
function setup () {
  window.plugin.portalPictures = {};
  window.plugin.portalPictures.showDialog = showDialog;
  $('<style>').html('.portal-pictures-image { padding: 1px }').appendTo('head');
  $('#toolbox').append(jsx("a", {
    onclick: showDialog,
    children: "Portal pictures"
  }));
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
  script.appendChild(document.createTextNode('//# sourceURL=iitc:///plugins/portals-pictures.js'));
  (document.body || document.head || document.documentElement).appendChild(script);
} else {
  // mobile string
  wrapper(info);
}
