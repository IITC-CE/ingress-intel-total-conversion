// @author         vita10gy
// @name           Highlight portals that need recharging
// @category       Highlighter
// @version        0.1.2
// @description    Use the portal fill color to denote if the portal needs recharging and how much.
//                 Yellow: above 85%. Orange: above 70%. Red: above 15%. Magenta: below 15%.

/* exported setup --eslint */
/* global L, TEAM_NONE*/
// use own namespace for plugin
var highlightNeedsRecharge = {};
window.plugin.highlightNeedsRecharge = highlightNeedsRecharge;

highlightNeedsRecharge.conditions = [85, 70, 60, 45, 30, 15, 0];

highlightNeedsRecharge.styles = {
  common: {
  },
  cond85: {
    fillColor: 'yellow',
    fillOpacity: 0.5
  },
  cond70: {
    fillColor: 'orange',
    fillOpacity: 0.5
  },
  cond60: {
    fillColor: 'darkorange',
    fillOpacity: 0.5
  },
  cond45: {
    fillColor: 'red',
    fillOpacity: 0.4
  },
  cond30: {
    fillColor: 'red',
    fillOpacity: 0.6
  },
  cond15: {
    fillColor: 'red',
    fillOpacity: 0.8
  },
  cond0: {
    fillColor: 'magenta',
    fillOpacity: 1.0
  }
};

highlightNeedsRecharge.highlight = function(data) {
  var d = data.portal.options.data;
  var health = d.health;

  if (health !== undefined && data.portal.options.team !== TEAM_NONE && health < 100) {
    var params = L.extend ({},
      highlightNeedsRecharge.styles.common,
      highlightNeedsRecharge.styles[
        'cond'+ highlightNeedsRecharge.conditions.find(function (cond) {return cond < health;})
      ]
    );

    data.portal.setStyle(params);
  }
};

function setup () {
  window.addPortalHighlighter('Needs Recharge (Health)', highlightNeedsRecharge.highlight);
}
