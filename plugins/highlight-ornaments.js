// @author         jonatkins
// @name           Highlight portals with ornaments
// @category       Highlighter
// @version        0.2.2
// @description    Use the portal fill color to denote portals with additional 'ornament' markers.
//                 e.g. Anomaly portals

/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '0.2.2',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var highlightOrnaments = {};
window.plugin.highlightOrnaments = highlightOrnaments;

highlightOrnaments.styles = {
  common: {
    fillColor: 'red',
    fillOpacity: 0.75
  }
};

function ornamentshighlight (data) {
  var d = data.portal.options.data;
  if (d.ornaments && d.ornaments.length > 0) {

    // TODO? match specific cases of ornament name and/or portals with multiple ornaments, and highlight in different colours?

    var params = highlightOrnaments.styles.common;
    data.portal.setStyle(params);
  }
}

function setup () {
  window.addPortalHighlighter('Ornaments (anomaly portals)', ornamentshighlight);
}
