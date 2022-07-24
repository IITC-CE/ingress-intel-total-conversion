// @author         johtata
// @name           Ornament icons extended
// @category       Layer
// @version        0.1.0
// @description    Additonal icons and names for beacons

// peNIA, peNEMESIS, peVIALUX, peVIANOIR, peAEIGSNOVA, etc.

// use own namespace for plugin
window.plugin.ornamentIconsExt = function () {};

window.plugin.ornamentIconsExt.jsonUrl = 'https://iitc.app/extras/ornaments/definitions_ext.json';

// append or overwrite external definitions
window.plugin.ornamentIconsExt.setIcons = function(externalIconDefinitions) {
  const localIconDefinitions = {
    // no local definitions here
  };
  window.ornaments.icon = {...window.ornaments.icon, ...externalIconDefinitions, ...localIconDefinitions};
}

function setup () {
  fetch(window.plugin.ornamentIconsExt.jsonUrl).then(response => {
    response.json().then(data => {
      window.plugin.ornamentIconsExt.setIcons(data.ornaments);
    })
  });
}
/* exported setup */
