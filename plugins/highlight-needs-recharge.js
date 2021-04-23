// @author         vita10gy
// @name           Highlight portals that need recharging
// @category       Highlighter
// @version        0.1.2
// @description    Use the portal fill color to denote if the portal needs recharging and how much. Yellow: above 85%. Orange: above 50%. Red: above 15%. Magenta: below 15%.


// use own namespace for plugin
var highlightNeedsRecharge = {};
window.plugin.highlightNeedsRecharge = highlightNeedsRecharge;

highlightNeedsRecharge.highlight = function(data) {
  var d = data.portal.options.data;
  var health = d.health;

  if(health !== undefined && data.portal.options.team != TEAM_NONE && health < 100) {
    var color,fill_opacity;
    if (health > 95) {
      color = 'yellow';
      fill_opacity = (1-health/100)*.50 + .50;
    } else if (health > 75) {
      color = 'DarkOrange';
      fill_opacity = (1-health/100)*.50 + .50;
    } else if (health > 15) {
      color = 'red';
      fill_opacity = (1-health/100)*.75 + .25;
    } else {
      color = 'magenta';
      fill_opacity = (1-health/100)*.75 + .25;
    }

    var params = {fillColor: color, fillOpacity: fill_opacity};
    data.portal.setStyle(params);
  }
}

var setup =  function() {
  window.addPortalHighlighter('Needs Recharge (Health)', highlightNeedsRecharge.highlight);
}
