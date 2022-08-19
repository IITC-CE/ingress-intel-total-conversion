// @author         vita10gy
// @name           Highlight portal weakness
// @category       Highlighter
// @version        0.8.0
// @description    Use the fill color of the portals to denote if the portal is weak. Stronger red indicates recharge required, missing resonators, or both.

/* exported setup --eslint */
/* global TEAM_NONE */

function weaknessHighlight (data) {

  if (data.portal.options.data.resCount !== undefined
      && data.portal.options.data.health !== undefined
      && data.portal.options.team !== TEAM_NONE) {
    var res_count = data.portal.options.data.resCount;
    var portal_health = data.portal.options.data.health;

    var strength = (res_count/8) * (portal_health/100);
    if (strength < 1) {
      var fill_opacity = (1-strength)*.85 + .15;
      var color = 'red';
      var params = {fillColor: color, fillOpacity: fill_opacity};

      // Hole per missing resonator
      if (res_count < 8) {
        var dash = new Array((8 - res_count) + 1).join('1,4,') + '100,0';
        params.dashArray = dash;
      }

      data.portal.setStyle(params);
    }
  }

}

function setup () {
  window.addPortalHighlighter('Portal Weakness', weaknessHighlight);
}
