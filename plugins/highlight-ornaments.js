// @author         jonatkins
// @name           Highlight portals with ornaments
// @category       Highlighter
// @version        0.0.1
// @description    Use the portal fill color to denote portals with additional 'ornament' markers. e.g. Anomaly portals


// use own namespace for plugin
var highlightOrnaments = {};
window.plugin.highlightOrnaments = highlightOrnaments;

highlightOrnaments.highlight = function(data) {
  var d = data.portal.options.data;
  if(d.ornaments && d.ornaments.length > 0) {
    var fill_opacity = 0.75;
    var color = 'red';

    // TODO? match specific cases of ornament name and/or portals with multiple ornaments, and highlight in different colours?

    var params = {fillColor: color, fillOpacity: fill_opacity};
    data.portal.setStyle(params);
  }
}

var setup =  function() {
  window.addPortalHighlighter('Ornaments (anomaly portals)', highlightOrnaments.highlight);
}
