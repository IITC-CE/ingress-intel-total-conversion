// @author         johtata
// @name           ornament icons basic
// @category       Layer
// @version        0.1.0
// @description    Add own icons and names for ornaments


/**********************
// Added as part of the Ingress #Helios in 2014, ornaments
// are additional image overlays for portals.
// currently there are 6 known types of ornaments: ap$x$suffix
// - cluster portals (without suffix)
// - volatile portals (_v)
// - meeting points (_start)
// - finish points (_end)
//
// Beacons and Frackers were introduced at the launch of the Ingress
// ingame store on November 1st, 2015
// - Beacons (pe$TAG - $NAME) ie: 'peNIA - NIANTIC'
// - Frackers ('peFRACK')
// (there are 7 different colors for each of them)
//
// Ornament IDs are dynamic. NIANTIC might change them at any time without prior notice.
// New ornamnent IDs found on the map will be recorded and saved to knownOrnaments from
// which the Ornaments dialog will be filled with checked checkboxes.
// To exclude a set of ornaments, even if they have not yet shown up on the map, the user
// can add an entry to excludedOrnaments, which will compared (startsWith) to all known and
// future IDs. example: "ap" to exclude all Ornaments for anomalies (ap1, ap2, ap2_v)

      Known ornaments (as of July 2022)
      // anomaly
      ap1, ap2, ap3, ap4, ap5, ap6, ap7, ap8, ap9
      & variations with _v, _end, _start
      // various beacons
      peFRACK, peNIA, peNEMESIS, peTOASTY, peFW_ENL, peFW_RES, peBN_BLM
      // battle beacons
      peBB_BATTLE_RARE, peBB_BATTLE,
      // battle winner beacons
      peBN_ENL_WINNER, peBN_RES_WINNER, peBN_TIED_WINNER,
      peBN_ENL_WINNER-60, peBN_RES_WINNER-60, peBN_TIED_WINNER-60,
      // battle rewards CAT 1-6
      peBR_REWARD-10_125_38, peBR_REWARD-10_150_75, peBR_REWARD-10_175_113,
      peBR_REWARD-10_200_150, peBR_REWARD-10_225_188, peBR_REWARD-10_250_225,
      // shards
      peLOOK
      // scouting
      sc5_p        // volatile scouting portal
      // battle
      bb_s         // scheduled RareBattleBeacons
      // various beacons
      peFRACK      // Fracker beacon

  The icon object holds optional definitions for the ornaments an beacons. 
  'ornamentID' : {
    name: 'meaningful name',     // shows up in dialog
    layer: 'name for the Layer', // shows up in layerchooser, optional, if not set
                                 // ornament will be in "Ornaments"
    url: 'url',                  // from which the image will be taken, optional,
                                 // 84x84px is default, if not set, stock images will be
                                 // used
    offset: [1|0|-1]             // 1 to place above, 0 to center on or -1 to place below
                                 // the portal marker, optional, will only be used if url
                                 // is set. 0 (center) is default
    opacity: 0..1                // optional, default is 0.6
  }

**********************/

// use own namespace for plugin
window.plugin.ornamentIcons = function () {};

window.plugin.ornamentIcons.jsonUrl = 'https://iitc.app/extras/ornaments.json';

window.plugin.ornamentIcons.setLocalIcons = function() {
   var localIconDefinitions= {
    // give a name, leave layer to default, url and offset ("1" to place above the portal, "-1" to place below)
    'peTOASTY':{
      name:'TOASTY',
      // layer: undefined, 
      offset: 1,
      url: '@include_img:images/ornament-TOASTY.png@'
    }
  };
  Object.assign (window.ornaments.icon, localIconDefinitions);
}

function setup () {
  fetch(window.plugin.ornamentIcons.jsonUrl).then(response => {
    response.json().then(data => {
      Object.assign (window.ornaments.icon,data.ornaments);
      window.plugin.ornamentIcons.setLocalIcons; // append or overwrite external definitions
    })
  });

}
/* exported setup */
