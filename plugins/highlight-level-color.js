// @author         vita10gy
// @name           Highlight portals by level color
// @category       Highlighter
// @version        0.2.2
// @description    Use the portal fill color to denote the portal level by using the game level colors.

/* exported setup, changelog --eslint */
/* global COLORS_LVL */

var changelog = [
  {
    version: '0.2.2',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.2.1',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

function highlightLevelColor (data) {
  var portal_level = data.portal.options.data.level;
  if (portal_level !== undefined) {
    var opacity = .6;
    data.portal.setStyle({fillColor: COLORS_LVL[portal_level], fillOpacity: opacity});
  }
}

function setup () {
  window.addPortalHighlighter('Level Color', highlightLevelColor);
}
