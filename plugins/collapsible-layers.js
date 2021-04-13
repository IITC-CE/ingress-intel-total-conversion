// @author         johnd0e
// @name           Collapsible portal levels / ornaments
// @category       Layer
// @version        0.1.0
// @description    Replace mutliple overlays with single layerChooser entry; togglable on faction layers longclick


// use own namespace for plugin
var collapsibleLayers = {};
window.plugin.collapsibleLayers = collapsibleLayers;

collapsibleLayers.initial = true; // collapsed

function setup () {
  var CollapsibleLayers = L.LayerGroup.extend({
    initialize: function (match, options) {
      options = options || {};
      L.LayerGroup.prototype.initialize.call(this, null, options);

      this._name = options.name || match;
      this._ctrl = window.layerChooser;
      this._allLayers = [];
      if (match) { this.addLayers(match); }
    },

    addLayers: function (match) {
      this._allLayers = this._ctrl._layers.filter(function (data) {
        return data.overlay && data.name.endsWith(match);
      }).concat(this._allLayers);
      return this;
    },

    bindTo: function () { //??
      Array.prototype.forEach.call(arguments, function (name) {
        this._ctrl.getLayer(name).on('longclick', function (e) {
          e.preventDefault();
          this.toggle();
        }, this);
      }, this);
      return this;
    },

    _collapse:  function () {
      var disabled = [];
      this._allLayers.forEach(function (data) {
        this._ctrl.removeLayer(data.layer, {keepOnMap: true});
        if (data.layer._map) {
          this.addLayer(data.layer);
        } else {
          disabled.push(data);
        }
      }, this);

      if (disabled.length === this._allLayers.length) {
        disabled.forEach(function (data) {
          this.addLayer(data.layer);
        }, this);
        disabled.length = 0;
        disabled.all = true;
      }

      var label;
      if (disabled.length) {
        var enableAll = function (e) {
          e.preventDefault();
          var map = e.control._map;
          disabled.forEach(function (data) {
            map.addLayer(data.layer);
            this.addLayer(data.layer);
          }, this);
          /*??
          disabled.forEach(function (data) {
            map.addLayer(data.layer);
            this.addLayer(data.layer);
            e.control._storeOverlayState(data.name, true);
          }, this);
          */
          // restore name
          e.control.setLabel(this, this._name);
        };
        this.once('longclick', enableAll);
        this.once('expand', function () {
          this.off('longclick', enableAll);
        });
        label =  this._name + ' [' + disabled.length + ']';
        label = '<i>' + label + '</i>';
      }
      this._ctrl.addOverlay(this, label ||  this._name, {
        enable: !disabled.all,
        permanent: false,
        sortPriority: this.options.sortPriority
      });
      return this.fire('collapse');
    },

    _expand:  function () {
      this._allLayers.forEach(function (data) {
        this._ctrl.addOverlay(data.layer, data.name, {default: data.layer._map});
      }, this);
      this._layers = {};
      this._ctrl.removeLayer(this);
      return this.fire('expand');
    },

    toggle: function (collapse) {
      if (!arguments.length) {
        collapse = !this._ctrl.getLayer(this); // layer not in chooser
      }
      return this[collapse ? '_collapse' : '_expand']();
    },

  });

  collapsibleLayers.portals = new CollapsibleLayers('Portals', {
    sortPriority: -1000
  })
    .bindTo('Resistance', 'Enlightened')
    .toggle(collapsibleLayers.initial);

  collapsibleLayers.ornaments = new CollapsibleLayers('Ornaments', {
    sortPriority: 1000
  })
    .addLayers('Beacons')
    .addLayers('Frackers')
    .addLayers('Artifacts')
    .bindTo('Resistance', 'Enlightened')
    .toggle(collapsibleLayers.initial);
}

/* exported setup */
