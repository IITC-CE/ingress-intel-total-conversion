// @author         fkloft
// @name           Layer count
// @category       Info
// @version        0.2.1
// @description    Allow users to count nested fields


// use own namespace for plugin
var layerCount = {};
window.plugin.layerCount = layerCount;

var tooltip;
function calculate (ev) {
  var point = ev.layerPoint;
  var fields = window.fields;
  var layersRes = 0, layersEnl = 0, layersDrawn = 0;

  for (var guid in fields) {
    var field = fields[guid];

    // we don't need to check the field's bounds first. pnpoly is pretty simple math.
    // Checking the bounds is about 50 times slower than just using pnpoly
    var rings = field._rings ? field._rings[0] : [];
    if (!rings.length) {
      for (var i = 0, len = field._latlngs.length; i < len; i++) {
        rings.push(window.map.latLngToLayerPoint(field._latlngs[i]));
      }
    }
    if (window.pnpoly(rings, point)) {
      if (field.options.team === TEAM_ENL) {
        layersEnl++;
      } else if (field.options.team === TEAM_RES) {
        layersRes++;
      }
    }
  }

  if (window.plugin.drawTools) {
    window.plugin.drawTools.drawnItems.eachLayer(function (layer) {
      if (layer instanceof L.GeodesicPolygon && layer._rings && window.pnpoly(layer._rings[0], point)) {
        layersDrawn++;
      }
    });
  }

  var content;
  if (layersRes !== 0 && layersEnl !== 0) {
    content = 'Res: ' + layersRes + ' + Enl: ' + layersEnl + ' = ' + (layersRes + layersEnl) + ' fields';
  } else if (layersRes !== 0) {
    content = 'Res: ' + layersRes + ' field(s)';
  } else if (layersEnl !== 0) {
    content = 'Enl: ' + layersEnl + ' field(s)';
  } else {
    content = 'No fields';
  }
  if (layersDrawn !== 0) {
    content += '; draw: ' + layersDrawn + ' polygon(s)';
  }
  tooltip.innerHTML = content;
}

function setup () {
  $('<style>').prop('type', 'text/css').html('@include_string:layer-count.css@').appendTo('head');

  var LayerCount = L.Control.extend({
    options: {
      position: 'topleft'
    },

    onAdd: function (map) {
      var button = document.createElement('a');
      button.className = 'leaflet-bar-part';
      button.addEventListener('click', function toggle () {
        var btn = this;
        if (btn.classList.contains('active')) {
          map.off('click', calculate);
          btn.classList.remove('active');
        } else {
          map.on('click', calculate);
          btn.classList.add('active');
          setTimeout(function () {
            tooltip.textContent = 'Click on map';
          }, 10);
        }
      }, false);
      button.title = 'Count nested fields';

      tooltip = document.createElement('div');
      tooltip.className = 'leaflet-control-layer-count-tooltip';
      button.appendChild(tooltip);

      var container = document.createElement('div');
      container.className = 'leaflet-control-layer-count leaflet-bar';
      container.appendChild(button);
      return container;
    },

    onRemove: function (map) {
      map.off('click', calculate);
    }
  });
  var ctrl = new LayerCount;
  ctrl.addTo(window.map);
}

/* exported setup */
