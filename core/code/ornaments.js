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

/* global L, dialog, log */

window.ornaments = {

  OVERLAY_SIZE: 60,
  OVERLAY_OPACITY: 0.6,
  // The icon object holds optional definitions for the ornaments an beacons. The object shall
  // be filled from a plugin
  // 'ornamentID' : {
  //   name: 'meaningful name',     // shows up in dialog
  //   layer: 'name for the Layer', // shows up in layerchooser, optional, if not set
  //                                // ornament will be in "Ornaments"
  //   url: 'url',                  // from which the image will be taken, optional,
  //                                // 84x84px is default, if not set, stock images will be
  //                                // used
  //   offset: [dx,dy],             // optional, shift the ornament vertically or horizontally by
  //                                // dx (vertical)and dy )horizontal.
  //                                // [0, 0.5] to place right above the portal.
  //                                // default is [0, 0] to center
  //   opacity: 0..1                // optional, default is 0.6
  // }
  icon:{},
  excludedOrnaments: [],
  knownOrnaments: {},

  setup: function () {
    _portals = {};
    this.layerGroup = L.layerGroup;
    if (window.map.options.preferCanvas && L.Browser.canvas && !window.DISABLE_CANVASICONLAYER) {
      this.layerGroup = L.canvasIconLayer;
      L.CanvasIconLayer.mergeOptions({ padding: L.Canvas.prototype.options.padding });
    }
    this.load();

    this.layers = {};
    this.layers['Ornaments'] = window.ornaments.layerGroup();
    this.layers['Excluded ornaments'] = window.ornaments.layerGroup(); // to keep excluded ornaments in an own layer

    window.layerChooser.addOverlay(this.layers['Ornaments'], 'Ornaments');
    window.layerChooser.addOverlay(this.layers['Excluded ornaments'], 'Excluded ornaments', {default: false});

    $('<a>', {
      text:'Ornaments Opt',
      id: 'ornaments-toolbox-link',
      title: 'Edit ornament exclusions',
      accesskey: 'o',
      click: window.ornaments.ornamentsOpt})
      .appendTo('#toolbox');
  },
  createLayer: function (layerID) {
    window.ornaments.layers[layerID] = window.ornaments.layerGroup();
    window.layerChooser.addOverlay(window.ornaments.layers[layerID], layerID);
  },

  addPortal: function (portal) {
    this.removePortal(portal);
    var ornaments = portal.options.data.ornaments;
    if (ornaments && ornaments.length) {
      _portals[portal.options.guid] = ornaments.map(function (ornament) {
        var layer = this.layers['Ornaments'];
        var opacity = this.OVERLAY_OPACITY;
        var size = this.OVERLAY_SIZE * window.portalMarkerScale();
        var anchor = [size / 2, size / 2];
        var iconUrl = '//commondatastorage.googleapis.com/ingress.com/img/map_icons/marker_images/' + ornament + '.png';

        if (!this.knownOrnaments[ornament]) {
          this.knownOrnaments[ornament]=false;
        }

        if (ornament in this.icon) {
          if (this.icon[ornament].layer) {
            if (this.layers[this.icon[ornament].layer] === undefined){
              log.log ('Add missing layer: ',this.icon[ornament].layer);
              window.ornaments.createLayer(window.ornaments.icon[ornament].layer);
            }
            layer =  this.layers[window.ornaments.icon[ornament].layer];
          }
          if (window.ornaments.icon[ornament].url) {
            iconUrl = window.ornaments.icon[ornament].url;
            if (this.icon[ornament].offset) {
              var offset = this.icon[ornament].offset;
              anchor = [size * offset[0] + anchor[0], size * offset[1] + anchor[1]];
            }
            if (this.icon[ornament].opacity) {
              opacity = this.icon[ornament].opacity;
            }
          }
        }

        var exclude = false;
        if (this.excludedOrnaments && this.excludedOrnaments !== ['']) {
          exclude = this.excludedOrnaments.some( function(pattern) {
            return ornament.startsWith(pattern);
          });
        }
        exclude = exclude | this.knownOrnaments[ornament];
        if (exclude){
          layer = this.layers['Excluded ornaments'];
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
    if (_portals[guid]) {
      _portals[guid].forEach(function (marker) {
        marker.options.layer.removeLayer(marker);
      });
      delete _portals[guid];
    }
  },
  initOrnaments: function () {
    this.knownOrnaments = {};
    this.save();
  },

  load: function () {
    var dataStr;
    try {
      dataStr = localStorage.getItem('excludedOrnaments');
      if (!dataStr) { return; }
      this.excludedOrnaments = JSON.parse(dataStr);
    } catch (e) {
      log.warn('ornaments: failed to load excludedOrnaments from localStorage: '+e);
    }
    try {
      dataStr = localStorage.getItem('knownOrnaments');
      if (!dataStr) {
        this.initOrnaments ();
        return;
      }
      this.knownOrnaments = JSON.parse(dataStr);
    } catch (e) {
      log.warn('ornaments: failed to load data from localStorage: '+e);
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

  processInput: function () {
    window.ornaments.excludedOrnaments = $('#ornaments_E').val().split(/[\s,]+/);
    window.ornaments.excludedOrnaments = window.ornaments.excludedOrnaments.filter(function (ornamentCode) { return ornamentCode !== ''; });
    // process the input from the checkboxes
    for (var ornamentCode in window.ornaments.knownOrnaments) {
      var input = $('#chk_orn_'+ornamentCode);
      window.ornaments.knownOrnaments[ornamentCode] = input.is(':checked');
    }
  },

  ornamentsList: function() {
    var text ='';
    var sortedIDs = Object.keys(window.ornaments.knownOrnaments).sort();

    sortedIDs.forEach ( function (ornamentCode) {
      var hidden = window.ornaments.excludedOrnaments.some( function(code) {
        return ornamentCode.startsWith(code);
      });

      var name = (window.ornaments.icon[ornamentCode] ? window.ornaments.icon[ornamentCode].name +' ('+ornamentCode+')' : ornamentCode);
      var checked = (window.ornaments.knownOrnaments[ornamentCode]||hidden) ?  'checked ' : '';
      text += '<label><input id="chk_orn_' + ornamentCode + '" type="checkbox" ' + checked;
      text += ' onchange="window.ornaments.processInput();window.ornaments.save();window.ornaments.reload()"';
      text += (hidden ? 'disabled':'');
      text += '>'+ name + '</label><br>';
    });
    return text;
  },

  replaceOL: function () {
    document.getElementById('ornamentsList').innerHTML = window.ornaments.ornamentsList();
  },

  onChangeHandler: function () {
    window.ornaments.processInput();
    window.ornaments.replaceOL();
    window.ornaments.save();
    window.ornaments.reload();
  },

  ornamentsOpt: function () {
    var excludedIDs = window.ornaments.excludedOrnaments.join(',');
    var html = '<div class="ornamentsOpts">'
             + 'Hide Ornaments from IITC that start with:<br>'
             + '<input type="text" value="' + excludedIDs + '" id="ornaments_E"'
             + ' onchange="window.ornaments.onChangeHandler()"></input><br>'
             + '(separator: space or comma allowed)<hr>'
             + '<b>known Ornaments, check to hide:</b><br>'
             + '<div id="ornamentsList"> ' + window.ornaments.ornamentsList() + '</div>'
             + '</div>';

    dialog({
      html:html,
      id:'ornamentsOpt',
      title:'Ornament excludes',
      buttons: {
        RESET : function () {
          window.ornaments.initOrnaments();
          window.ornaments.reload();
          $(this).dialog('close');
        },
        OK : function() {
          // process the input from the input
          window.ornaments.processInput();
          window.ornaments.save();
          window.ornaments.reload();
          $(this).dialog('close');

        }
      }
    });
  }
};
