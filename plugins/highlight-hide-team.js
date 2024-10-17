// @author         vita10gy
// @name           Hide portal ownership
// @category       Highlighter
// @version        0.2.2
// @description    Show all portals as neutral, as if uncaptured. Great for creating plans.

/* exported setup, changelog --eslint */
/* global TEAM_NONE, getMarkerStyleOptions*/

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

function hideOwnership (data) {
  var params = getMarkerStyleOptions({team: TEAM_NONE, level: 0});
  data.portal.setStyle(params);
}

function setup () {
  window.addPortalHighlighter('Hide portal ownership', hideOwnership);
}
