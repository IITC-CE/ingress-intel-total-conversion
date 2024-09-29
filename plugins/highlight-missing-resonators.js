// @author         vita10gy
// @name           Highlight portals missing resonators
// @category       Highlighter
// @version        0.2.4
// @description    Use the portal fill color to denote if the portal is missing resonators.

/* exported setup, changelog --eslint */
/* global L -- eslint */

var changelog = [
  {
    version: '0.2.4',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.2.3',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.2.2',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var highlightMissingResonators = {};
window.plugin.highlightMissingResonators = highlightMissingResonators;

highlightMissingResonators.styles = {
  common: {
    fillColor: 'red',
  },
};

function missingResonators(data) {
  if (data.portal.options.team !== window.TEAM_NONE) {
    var res_count = data.portal.options.data.resCount;

    if (res_count !== undefined && res_count < 8) {
      var fill_opacity = ((8 - res_count) / 8) * 0.85 + 0.15;
      // Hole per missing resonator
      var dash = new Array(8 - res_count + 1).join('1,4,') + '100,0';

      var params = L.extend({}, highlightMissingResonators.styles.common, { fillOpacity: fill_opacity, dashArray: dash });

      data.portal.setStyle(params);
    }
  }
}

function setup() {
  window.addPortalHighlighter('Portals Missing Resonators', missingResonators);
}
