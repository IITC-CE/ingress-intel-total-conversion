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


window.ornaments = {

  OVERLAY_SIZE: 60,
  OVERLAY_OPACITY: 0.6,
  iconUrls: [],
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
    this._excluded = layerGroup(); //to keep excluded ornaments in an own layer
    
    window.layerChooser.addOverlay(this._layer, 'Ornaments');
    window.layerChooser.addOverlay(this._beacons, 'Beacons');
    window.layerChooser.addOverlay(this._frackers, 'Frackers');
    window.layerChooser.addOverlay(this._scout, 'Scouting');
    window.layerChooser.addOverlay(this._battle, 'Battle');
    window.layerChooser.addOverlay(this._excluded, 'Excluded'); //just for testing

    $('#toolbox').append('<a onclick="window.ornaments.ornamentsOpt();return false;" accesskey="o" title="Edit ornament exclusions [o]">Ornaments Opt</a>');

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

        if (!this.knownOrnaments[ornament]) {this.knownOrnaments[ornament]=false};

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

        if (typeof (window.ornaments.iconUrls[ornament]) !== 'undefined') {
          opacity = 1;
          iconUrl = window.ornaments.iconUrls[ornament];
          anchor = [size / 2, size];
        }

        var exclude = false;
        if (this.excludedOrnaments && this.excludedOrnaments!= [""]) {
          exclude = this.excludedOrnaments.some( function(pattern) {
                return ornament.startsWith(pattern)
          });
        }
        exclude += window.ornaments.knownOrnaments[ornament];
        if (exclude){ 
//          opacity = 0;
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
          layer: layer,
        }).addTo(layer);

      }, this);
    }
  },

  removePortal: function (portal) {
    var guid = portal.options.guid;
    if (this._portals[guid]) {
//      console.log(window.ornaments._portals[guid], guid);
      this._portals[guid].forEach(function (marker) {
        marker.options.layer.removeLayer(marker);
      });
      delete this._portals[guid];
    }
  },

  load: function () {
    var dataStr;
    try {
      dataStr = localStorage['excludedOrnaments'];
      if (dataStr === undefined) return;
      this.excludedOrnaments = JSON.parse(dataStr);
    } catch(e) {
    console.warn('ornaments: failed to load data from localStorage: '+e);
    };
    try {
      dataStr = localStorage['knownOrnaments'];
      console.log(dataStr);
      if (dataStr === undefined) {
        this.knownOrnaments = {

// commented out for testing. esp. "bb_s" and "sc5_p" should be easy to find on the map.
// these Ornaments should be listed in the ornaments dialog.
/*           "ap1":false,
             "ap2":false,
             "ap3":false,
             "ap4":false,
             "ap5":false,
             "ap6":false,
             "ap7":false,
             "ap8":false,
             "ap9":false,
             "sc5_p":false,
             "bb_s":false,
             "peFRACK":false,
             "peNIA":false,
             "peNEMESIS":false,
             "peTOASTY":false,
             "peFW_ENL":false,
             "peFW_RES":false,
**********************/
             "peBB_BATTLE_RARE":false,
             "peBB_BATTLE":false,
             "peBN_BLM":false,
             "peBN_ENL_WINNER-60":false,
             "peBN_RES_WINNER-60":false,
             "peBN_TIED_WINNER-60":false,
             "peBR_REWARD-10_125_38":false,
             "peBR_REWARD-10_150_75":false,
             "peBR_REWARD-10_175_113":false,
             "peBR_REWARD-10_200_150":false,
             "peBR_REWARD-10_225_188":false,
             "peBR_REWARD-10_250_225":false,
             "peLOOK":false
        };
        this.save;
        return;
      }
      this.knownOrnaments = JSON.parse(dataStr);
    } catch(e) {
    console.warn('ornaments: failed to load data from localStorage: '+e);
    }
    
  },

  save: function () {
    localStorage['excludedOrnaments'] = JSON.stringify(this.excludedOrnaments);
    localStorage['knownOrnaments'] = JSON.stringify(this.knownOrnaments);
  },

  ornamentsOpt: function () {
    var eO = window.ornaments.excludedOrnaments.toString();
    var text ='';
    for (var name in window.ornaments.knownOrnaments) {
      var checked = window.ornaments.knownOrnaments[name] ?  ' checked' : '';
      text += '<label><input id="chk_orn_' + name + '" type="checkbox" ' + checked + '>' + name + '</label><br>';
    }
    var html = '<div class="ornamentsOpts">'
             + 'Hide Ornaments from IITC that start with:<br>'
             + '<input type="text" value="'+eO +'" id="ornaments_E"></input><br>'
             + '(separator: space or comma allowed)<hr>'
             + '<b>known Ornaments, check to hide:</b><br>'
             + text
             + '</div>';

    dialog({
      html:html,
      id:'ornamentsOpt',
      title:'Ornament excludes',
      buttons: {
        'OK': function() {
          // process the input from the input
          window.ornaments.excludedOrnaments = $("#ornaments_E").val().split(/[\s,]+/);
          window.ornaments.excludedOrnaments = window.ornaments.excludedOrnaments.filter(function (name) { return name !== ""; })

          // process the input from the checkboxes
          for (var name in window.ornaments.knownOrnaments) {
            var input = document.getElementById("chk_orn_"+name);
            window.ornaments.knownOrnaments[name] = input ? input.checked : false; // <- default value if the input is not found for unexpected reason
          }
          window.ornaments.save();
          // reload markers addPortal also calls removePortal
          for (var guid in window.ornaments._portals) {
            window.ornaments.addPortal(window.portals[guid])
          };

          $(this).dialog('close');
        }
      }
    });
  }
};
