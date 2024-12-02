// ==UserScript==
// @author         Loskir
// @id             dt-replace-portal@Loskir
// @name           Draw Tools Replace Portal
// @description    Quickly replace one portal with another in Draw Tools
// @category       Info
// @version        1.0.7
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Loskir/dt-replace-portal.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Loskir/dt-replace-portal.user.js
// @depends        draw-tools@breunigs
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
  //PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
  //(leaving them in place might break the 'About IITC' page or break update checks)
  //plugin_info.buildName = 'iitc';
  //plugin_info.dateTimeVersion = '20170108.21732';
  //plugin_info.pluginId = 'dtreplace';
  //END PLUGIN AUTHORS NOTE

  // PLUGIN START ////////////////////////////////////////////////////////
  var firstPortalLink, secondPortalLink;

  var setup = (function (window, undefined) {
    'use strict';

    var plugin, actions,
      firstPortal, secondPortal;

    if (typeof window.plugin !== 'function') window.plugin = function () { };
    window.plugin.dtreplace = function () { };
    plugin = window.plugin.dtreplace;
    plugin.setup = setup;

    return plugin.setup;

    function toggleMenu() {
      if (actions.classList.contains("active"))
        actions.classList.remove("active");
      else
        actions.classList.add("active");
    }

    function clear() {
      firstPortal = false;
      secondPortal = false;
      if (firstPortalLink.classList.contains('highlighted')) firstPortalLink.classList.remove('highlighted');
      if (secondPortalLink.classList.contains('highlighted')) secondPortalLink.classList.remove('highlighted');
    }
    function selectFirstPortal() {
      log('First portal selected');

      firstPortal = getPortalSelected();
      if (!firstPortal) return;
      if (!firstPortalLink.classList.contains('highlighted')) firstPortalLink.classList.add('highlighted');
    }

    function selectSecondPortal() {
      log('Second portal selected');

      secondPortal = getPortalSelected();
      if (!secondPortal) return;
      if (!secondPortalLink.classList.contains('highlighted')) secondPortalLink.classList.add('highlighted');

      draw();
    }

    function draw() {
      const dt = window.plugin.drawTools
      
      if (!dt) {
        return alert('This plugin requires Draw Tools')
      }

      const fromLL = firstPortal.ll
      const toLL = secondPortal.ll

      dt.drawnItems.clearLayers()
      dt.import(JSON.parse(window.localStorage['plugin-draw-tools-layer']
        .replace(new RegExp(`"lat":${fromLL.lat},"lng":${fromLL.lng}`, 'g'), `"lat":${toLL.lat},"lng":${toLL.lng}`)))
      dt.save()

      firstPortal = null
      secondPortal = null
      firstPortalLink.classList.remove('highlighted')
      secondPortalLink.classList.remove('highlighted')
    }

    function getPortalSelected() {
      if (!(selectedPortal && portals[selectedPortal])) return;

      return {
        guid: selectedPortal,
        ll: portals[selectedPortal].getLatLng()
      };
    }

    function log(message) {
      console.log('Draw Tools Replace: ' + message);
    }

    function setup() {
      var parent, control, section, toolbar,
        button,
        clearLi, firstPortalLi, secondPortalLi, otherPortalLi,
        clearLink, /*firstPortalLink, secondPortalLink are visible globally*/ otherPortalLink;

      $('<style>').prop('type', 'text/css')
        .html('.leaflet-draw-actions.active{display: block;}.leaflet-control-dtreplace a.leaflet-dtreplace-edit-edit {background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCI+Cgk8ZyBzdHlsZT0iZmlsbDojMDAwMDAwO2ZpbGwtb3BhY2l0eTowLjQ7c3Ryb2tlOm5vbmUiPgoJCTxwYXRoIGQ9Ik0gNiwyNCAyNCwyNCAxNSw2IHoiLz4KCQk8cGF0aCBkPSJNIDYsMjQgMjQsMjQgMTUsMTIgeiIvPgoJCTxwYXRoIGQ9Ik0gNiwyNCAyNCwyNCAxNSwxOCB6Ii8+Cgk8L2c+Cjwvc3ZnPgo=");}')
        .appendTo('head');
      $('<style>').prop('type', 'text/css')
        .html('.dtreplace.highlighted{background-color:#008902}')
        .appendTo('head');

      button = document.createElement("a");
      button.className = "leaflet-dtreplace-edit-edit";
      button.addEventListener("click", toggleMenu, false);
      button.title = 'Draw tools: Replace portal';

      toolbar = document.createElement("div");
      toolbar.className = "leaflet-bar";
      toolbar.appendChild(button);

      clearLink = document.createElement("a");
      clearLink.innerText = "X";
      clearLink.title = 'Clear selected portals';
      clearLink.addEventListener("click", clear, false);
      clearLi = document.createElement("li");
      clearLi.appendChild(clearLink);

      firstPortalLink = document.createElement("a");
      firstPortalLink.className = "dtreplace";
      firstPortalLink.innerText = "1";
      firstPortalLink.title = 'Select first portal';
      firstPortalLink.addEventListener("click", selectFirstPortal, false);
      firstPortalLi = document.createElement("li");
      firstPortalLi.appendChild(firstPortalLink);

      secondPortalLink = document.createElement("a");
      secondPortalLink.className = "dtreplace";
      secondPortalLink.innerText = "2";
      secondPortalLink.title = 'Select second portal';
      secondPortalLink.addEventListener("click", selectSecondPortal, false);
      secondPortalLi = document.createElement("li");
      secondPortalLi.appendChild(secondPortalLink);

      actions = document.createElement("ul");
      actions.className = "leaflet-draw-actions leaflet-draw-actions-top";
      actions.appendChild(clearLi);
      actions.appendChild(firstPortalLi);
      actions.appendChild(secondPortalLi);

      section = document.createElement("div");
      section.className = "leaflet-draw-section";
      section.appendChild(toolbar);
      section.appendChild(actions);

      control = document.createElement("div");
      control.className = "leaflet-control-dtreplace leaflet-draw leaflet-control";
      control.appendChild(section);

      parent = $(".leaflet-top.leaflet-left", window.map.getContainer());
      parent.append(control);
    }
  })(window);
  // PLUGIN END //////////////////////////////////////////////////////////

  setup.info = plugin_info; //add the script info data to the function as a property
  if (!window.bootPlugins) window.bootPlugins = [];
  window.bootPlugins.push(setup);
  // if IITC has already booted, immediately run the 'setup' function
  if (window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end

// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
(document.body || document.head || document.documentElement).appendChild(script);

