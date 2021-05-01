// @author         jonatkins
// @name           Highlight inactive portals
// @category       Highlighter
// @version        0.1.0
// @description    Use the portal fill color to denote if the portal is unclaimed with no recent activity.
//                 Shades of red from one week to one month, then tinted to purple for longer.
//                 May also highlight captured portals that are stuck and fail to decay every 24 hours.

/* exported setup --eslint */
// use own namespace for plugin
var highlightInactive = {};
window.plugin.highlightInactive = highlightInactive;

highlightInactive.highlight = function(data) {

  if (data.portal.options.timestamp > 0) {
    var daysUnmodified = (new Date().getTime() - data.portal.options.timestamp) / (24*60*60*1000);
    if (daysUnmodified >= 7) {
      var fill_opacity = Math.min(1,((daysUnmodified-7)/24)*.85 + .15);
      var blue = Math.max(0,Math.min(255,Math.round((daysUnmodified-31)/62*255)));
      var colour = 'rgb(255,0,'+blue+')';
      var params = {fillColor: colour, fillOpacity: fill_opacity};
      data.portal.setStyle(params);
    }
  }

};

function setup () {
  window.addPortalHighlighter('Inactive Portals', highlightInactive.highlight);
}

