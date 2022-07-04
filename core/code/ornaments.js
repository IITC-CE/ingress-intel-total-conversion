// ORNAMENTS ///////////////////////////////////////////////////////

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

/* global L, dialog */

window.ornaments = {

  OVERLAY_SIZE: 60,
  OVERLAY_OPACITY: 0.6,
  iconUrls: [],
  icon:[],
  excludedOrnaments: [],
  knownOrnaments: {},

  setup: function () {
    this._portals = {};
    var layerGroup = L.layerGroup;
    if (window.map.options.preferCanvas && L.Browser.canvas && !window.DISABLE_CANVASICONLAYER) {
      layerGroup = L.canvasIconLayer;
      L.CanvasIconLayer.mergeOptions({ padding: L.Canvas.prototype.options.padding });
    }
    this.load();
    this._layer = layerGroup();
    this._beacons = layerGroup();
    this._frackers = layerGroup();
    this._scout = layerGroup();
    this._battle = layerGroup();
    this._excluded = layerGroup(); // to keep excluded ornaments in an own layer

    window.layerChooser.addOverlay(this._layer, 'Ornaments');
    window.layerChooser.addOverlay(this._beacons, 'Beacons');
    window.layerChooser.addOverlay(this._frackers, 'Frackers');
    window.layerChooser.addOverlay(this._scout, 'Scouting');
    window.layerChooser.addOverlay(this._battle, 'Battle');
    window.layerChooser.addOverlay(this._excluded, 'Excluded');

    $('<a>')
      .html('Ornaments Opt')
      .attr({
        id: 'ornaments-toolbox-link',
        title: 'Edit ornament exclusions',
        accesskey: 'o'
      })
      .click(window.ornaments.ornamentsOpt)
      .appendTo('#toolbox');
  },

  addPortal: function (portal) {
    this.removePortal(portal);
    var ornaments = portal.options.data.ornaments;
    if (ornaments && ornaments.length) {
      this._portals[portal.options.guid] = ornaments.map(function (ornament) {
        var layer = this._layer;
        var opacity = this.OVERLAY_OPACITY;
        var size = this.OVERLAY_SIZE;
        var anchor = [size / 2, size / 2];
        var iconUrl = '//commondatastorage.googleapis.com/ingress.com/img/map_icons/marker_images/' + ornament + '.png';

        if (!this.knownOrnaments[ornament]) {
          this.knownOrnaments[ornament]=false;
//          this.knownOrnaments.sort();
        }

        if (ornament.startsWith('pe')) {
          layer = ornament === 'peFRACK'
            ? this._frackers
            : this._beacons;
        }

        if (ornament.startsWith('sc')) {
          layer = this._scout;
        }

        if (ornament.startsWith('peB')) {
          layer = this._battle;
        }

        if (typeof (window.ornaments.icon[ornament]) !== 'undefined') {
          opacity = 1;
          if (window.ornaments.icon[ornament].url) {
            iconUrl = window.ornaments.icon[ornament].url;
            if (window.ornaments.icon[ornament].offset) {
              switch (window.ornaments.icon[ornament].offset) {
              case 1:
                anchor = [size / 2, size];
                break;
              case 0:
                anchor = [size / 2, size / 2];
                break;
              case -1:
                anchor = [size / 2, - size ];
              }
            }
          }
        }

        var exclude = false;
        if (this.excludedOrnaments && this.excludedOrnaments !== ['']) {
          exclude = this.excludedOrnaments.some( function(pattern) {
            return ornament.startsWith(pattern);
          });
        }
        exclude += window.ornaments.knownOrnaments[ornament];
        if (exclude){
          layer = this._excluded;
        }

        return L.marker(portal.getLatLng(), {
          icon: L.icon({
            iconUrl: iconUrl,
            iconSize: [size, size],
            iconAnchor: anchor, // https://github.com/IITC-CE/Leaflet.Canvas-Markers/issues/4
            className: 'no-pointer-events'
          }),
          interactive: false,
          keyboard: false,
          opacity: opacity,
          layer: layer
        }).addTo(layer);

      }, this);
    }
  },

  removePortal: function (portal) {
    var guid = portal.options.guid;
    if (this._portals[guid]) {
      this._portals[guid].forEach(function (marker) {
        marker.options.layer.removeLayer(marker);
      });
      delete this._portals[guid];
    }
  },
  initOrnaments: function () {
    this.knownOrnaments = {
// commented out for testing. esp. "bb_s" and "sc5_p" should be easy to find on the map.
// these Ornaments should be listed in the ornaments dialog.
/**********************
      // anomaly
      'ap1':false,
      'ap2':false,
      'ap3':false,
      'ap4':false,
      'ap5':false,
      'ap6':false,
      'ap7':false,
      'ap8':false,
      'ap9':false,
      // various beacons
      'peFRACK':false,
      'peNIA':false,
      'peNEMESIS':false,
      'peTOASTY':false,
      'peFW_ENL':false,
      'peFW_RES':false,
      // battle
      'peBB_BATTLE_RARE':false,
      'peBB_BATTLE':false,
      'peBN_BLM':false,
      'peBN_ENL_WINNER-60':false,
      'peBN_RES_WINNER-60':false,
      'peBN_TIED_WINNER-60':false,
      'peBR_REWARD-10_125_38':false,
      'peBR_REWARD-10_150_75':false,
      'peBR_REWARD-10_175_113':false,
      'peBR_REWARD-10_200_150':false,
      'peBR_REWARD-10_225_188':false,
      'peBR_REWARD-10_250_225':false,
      // shards
      'peLOOK':false
**********************/
      // scouting
      sc5_p:false,        // volatile scouting portal
      // battle
      bb_s:false,         // scheduled RareBattleBeacons
      // various beacons
      peFRACK:false,      // Fracker beacon
    };
    this.save();
  },

  load: function () {
    var dataStr;
    try {
      dataStr = localStorage['excludedOrnaments'];
      if (dataStr === undefined) { return; }
      this.excludedOrnaments = JSON.parse(dataStr);
    } catch (e) {
      console.warn('ornaments: failed to load excludedOrnaments from localStorage: '+e);
    }
    try {
      dataStr = localStorage['knownOrnaments'];
      if (dataStr === undefined) {
        this.initOrnaments ();
        return;
      }
      this.knownOrnaments = JSON.parse(dataStr);
    } catch (e) {
      console.warn('ornaments: failed to load data from localStorage: '+e);
    }

  },

  save: function () {
    localStorage['excludedOrnaments'] = JSON.stringify(this.excludedOrnaments);
    localStorage['knownOrnaments'] = JSON.stringify(this.knownOrnaments);
  },

  // reload: addPortal also calls removePortal
  reload: function () {
    for (var guid in window.ornaments._portals) {
      window.ornaments.addPortal(window.portals[guid]);
    }
  },

  ornamentsOpt: function () {
    var excludedIDs = window.ornaments.excludedOrnaments.toString();
    var text ='';
    var sortedIDs = Object.keys(window.ornaments.knownOrnaments).sort();

    sortedIDs.forEach ( function (ornamentCode) {
      var hidden = window.ornaments.excludedOrnaments.some( function(code) {
        return ornamentCode.startsWith(code);
      });
      var name = (window.ornaments.icon[ornamentCode] ? window.ornaments.icon[ornamentCode].name +' ('+ornamentCode+')' : ornamentCode);
      var checked = window.ornaments.knownOrnaments[ornamentCode] ?  ' checked' : '';
      text += '<label><input id="chk_orn_' + ornamentCode + '" type="checkbox" ' + checked;
      text += (hidden ? 'disabled':'');
      text += '>'+ name + '</label><br>';
    });

    var html = '<div class="ornamentsOpts">'
             + 'Hide Ornaments from IITC that start with:<br>'
             + '<input type="text" value="' + excludedIDs + '" id="ornaments_E"></input><br>'
             + '(separator: space or comma allowed)<hr>'
             + '<b>known Ornaments, check to hide:</b><br>'
             + text
             + '</div>';

    dialog({
      html:html,
      id:'ornamentsOpt',
      title:'Ornament excludes',
      buttons: {
        RESET : function () {
          $(this).dialog('close');
          window.ornaments.initOrnaments();
          window.ornaments.reload();
        },
        OK : function() {
          // process the input from the input
          window.ornaments.excludedOrnaments = $('#ornaments_E').val().split(/[\s,]+/);
          window.ornaments.excludedOrnaments = window.ornaments.excludedOrnaments.filter(function (ornamentCode) { return ornamentCode !== ''; });
          // process the input from the checkboxes
          for (var ornamentCode in window.ornaments.knownOrnaments) {
            var input = document.getElementById('chk_orn_'+ornamentCode);
            window.ornaments.knownOrnaments[ornamentCode] = input ? input.checked : false; // <- default value if the input is not found for unexpected reason
          }
          $(this).dialog('close');
          window.ornaments.save();
          window.ornaments.reload();

        }
      }
    });
  }
};
