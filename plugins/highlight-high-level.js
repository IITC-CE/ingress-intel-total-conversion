// @author         jonatkins
// @name           Highlight high level portals
// @category       Highlighter
// @version        0.2.0
// @description    Use the portal fill color to denote high level portals: Purple L8, Red L7, Orange L6

/* exported setup --eslint */
/* global L */
// use own namespace for plugin

var highLevel = {};
window.plugin.highlightHighLevel = highLevel;

highLevel.styles = {
  common: {
    fillOpacity: 0.7
  },
  level6: {
    fillColor: 'orange'
  },
  level7: {
    fillColor: 'red'
  },
  level8: {
    fillColor: 'magenta'
  }
};

highLevel.highlight = function (data) {
  var portal_level = data.portal.options.data.level;
  if (portal_level === undefined) return;           // continue on 0..8
  var newStyle= L.extend ( {},
    highLevel.styles.common,
    highLevel.styles['level'+portal_level]
  );

  if (newStyle.fillColor) {
    data.portal.setStyle(newStyle);
  }
};

function setup () {
  window.addPortalHighlighter('Higher Level Portals', highLevel.highlight);
}
