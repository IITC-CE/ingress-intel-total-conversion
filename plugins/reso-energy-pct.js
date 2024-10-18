// @author         xelio
// @name           Reso energy % in portal details
// @category       Portal Info
// @version        0.1.4
// @description    Show resonator energy percentage on resonator energy bar in portal details panel.

/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '0.1.4',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.1.3',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
window.plugin.resoEnergyPctInPortalDetail = function() {};

window.plugin.resoEnergyPctInPortalDetail.updateMeter = function(data) {
  $("span.meter-level")
    .css({
      "word-spacing": "-1px",
      "text-align": "left",
      "font-size": "90%",
      "padding-left": "2px",
    })
    .each(function() {
      var matchResult = $(this).parent().attr('title').match(/\((\d*\%)\)/);
      if(matchResult) {
        var html = $(this).html() + '<div style="position:absolute;right:0;top:0">' + matchResult[1] + '</div>';
        $(this).html(html);
      }
    });
}

var setup =  function() {
  window.addHook('portalDetailsUpdated', window.plugin.resoEnergyPctInPortalDetail.updateMeter);
}
