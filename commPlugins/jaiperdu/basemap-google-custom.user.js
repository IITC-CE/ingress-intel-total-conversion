// ==UserScript==
// @author         jaiperdu
// @name           Custom Google map
// @category       Map Tiles
// @version        0.1.2
// @description    Add a customizable Version of Google map tiles as a base layer.
// @id             basemap-google-custom@jaiperdu
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/jaiperdu/basemap-google-custom.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/jaiperdu/basemap-google-custom.user.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'lejeu';
plugin_info.dateTimeVersion = '2022-06-30-074250';
plugin_info.pluginId = 'basemap-google-custom';
//END PLUGIN AUTHORS NOTE


// use own namespace for plugin
const customGMaps = function() {};
window.plugin.customGMaps = customGMaps;

customGMaps.styles = [];
customGMaps.STYLES_KEY = "plugin-custom-gmaps-styles";

customGMaps.addLayer = function() {
  const options = {
    maxZoom: 21,
    styles: customGMaps.styles
  };

  customGMaps.baseLayer = L.gridLayer.googleMutant(options);

  layerChooser.addBaseLayer(customGMaps.baseLayer, "Google Custom");
};

customGMaps.changeStyle = function(styles) {
  customGMaps.baseLayer.addTo(map);
  customGMaps.baseLayer._mutant.setOptions({ styles: styles });
  customGMaps.styles = styles;
  localStorage[customGMaps.STYLES_KEY] = JSON.stringify(styles);
};

customGMaps.getAllCurrentStyles = function () {
  const styles = new Map();
  for (const l of layerChooser._layers) {
    const name = l.name;
    const layer = l.layer;
    if (layer instanceof L.GridLayer.GoogleMutant) {
      if (layer.options.styles !== undefined)
        styles.set(name, layer.options.styles);
    } else if (layer._layers) {
      const layers = layer._layers;
      for (const i in layers) {
        const layer = layers[i];
        if (layer instanceof L.GridLayer.GoogleMutant) {
          if (layer.options.styles !== undefined)
            styles.set(name + '#' + i, layer.options.styles);
        }
      }
    }
  }
  return styles;
};

customGMaps.showDialog = function() {
  const div = document.createElement('div');

  const selectStyle = document.createElement('select');
  const styles = customGMaps.getAllCurrentStyles();
  for (const [name, styles] of customGMaps.getAllCurrentStyles()) {
    const option = document.createElement('option');
    option.textContent = name;
    option.value = name;
    selectStyle.appendChild(option);
  }
  selectStyle.value = "Google Custom";
  div.appendChild(selectStyle);

  const styleInput = document.createElement('textarea');
  styleInput.value = JSON.stringify(customGMaps.styles, null, 2);
  div.appendChild(styleInput);

  const desc = document.createElement('div');
  desc.innerHTML = "You can use the <a 'href=https://mapstyle.withgoogle.com/'>Styling wizard</a> from Google to import/export a style and paste it in the above area";
  div.appendChild(desc);

  selectStyle.addEventListener('change', function() {
    const value = selectStyle.value;
    const style = styles.get(value);
    console.log(style);
    if (style) {
      styleInput.value = JSON.stringify(style, null, 2);
    }
  });

  const buttons = {
    "OK": function () {
      try {
        const styles = JSON.parse(styleInput.value);
        customGMaps.changeStyle(styles);
        $(this).dialog('close');
      } catch(e) {
        console.error(e);
        alert("Couldn't parse the style");
      }
    },
    "Cancel": function () {
      $(this).dialog('close');
    }
  }

  dialog({
    id: 'plugin-custom-gmaps',
    html: div,
    title: 'Change Google Maps style',
    width: 'auto',
    buttons: buttons
  });
};

var setup = function() {
  $("<style>")
    .prop("type", "text/css")
    .html("#dialog-lugin-custom-gmaps select { display: block }\
           #dialog-plugin-custom-gmaps textarea { width: 100%; min-height:250px; font-family: monospace }")
  .appendTo("head");

  customGMaps.styles = JSON.parse(localStorage[customGMaps.STYLES_KEY] || '[]');

  $('#toolbox').append(' <a onclick="window.plugin.customGMaps.showDialog()">Custom GMaps Style</a>');

  customGMaps.addLayer();
}

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

