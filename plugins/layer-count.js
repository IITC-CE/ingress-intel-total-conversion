// @author         fkloft
// @name           Layer count
// @category       Info
// @version        0.2.1
// @description    Allow users to count nested fields


// use own namespace for plugin
plugin.layerCount = {}

plugin.layerCount.onBtnClick = function(ev) {
  var btn = plugin.layerCount.button,
    tooltip = plugin.layerCount.tooltip,
    layer = plugin.layerCount.layer;

  if(btn.classList.contains("active")) {
    map.off("click", plugin.layerCount.calculate);
    btn.classList.remove("active");
  } else {
    map.on("click", plugin.layerCount.calculate);
    btn.classList.add("active");
    setTimeout(function(){
      tooltip.textContent = "Click on map";
    }, 10);
  }
};

plugin.layerCount.latLngE6ToGooglePoint = function(point) {
  return new google.maps.LatLng(point.latE6/1E6, point.lngE6/1E6);
}

plugin.layerCount.calculate = function(ev) {
  var point = ev.layerPoint;
  var fields = window.fields;
  var layersRes = layersEnl = layersDrawn = 0;

  for(var guid in fields) {
    var field = fields[guid];

    // we don't need to check the field's bounds first. pnpoly is pretty simple math.
    // Checking the bounds is about 50 times slower than just using pnpoly
    if(field._rings && window.pnpoly(field._rings[0], point)) {
      if(field.options.team == TEAM_ENL) {
        layersEnl++;
      } else if(field.options.team == TEAM_RES) {
        layersRes++;
      }
    }
  }

  if (window.plugin.drawTools) {
    plugin.drawTools.drawnItems.eachLayer(function (layer) {
      if (layer instanceof L.GeodesicPolygon && layer._rings && window.pnpoly(layer._rings[0], point)) {
        layersDrawn++;
      }
    });
  }

  if(layersRes != 0 && layersEnl != 0)
    var content = "Res: " + layersRes + " + Enl: " + layersEnl + " = " + (layersRes + layersEnl) + " fields";
  else if(layersRes != 0)
    var content = "Res: " + layersRes + " field(s)";
  else if(layersEnl != 0)
    var content = "Enl: " + layersEnl + " field(s)";
  else
    var content = "No fields";

  if (layersDrawn != 0)
    content += "; draw: " + layersDrawn + " polygon(s)";

  plugin.layerCount.tooltip.innerHTML = content;

  return false;
};

var setup = function() {
  $('<style>').prop('type', 'text/css').html('@include_string:layer-count.css@').appendTo('head');

  var parent = $(".leaflet-top.leaflet-left", window.map.getContainer());

  var button = document.createElement("a");
  button.className = "leaflet-bar-part";
  button.addEventListener("click", plugin.layerCount.onBtnClick, false);
  button.title = 'Count nested fields';

  var tooltip = document.createElement("div");
  tooltip.className = "leaflet-control-layer-count-tooltip";
  button.appendChild(tooltip);

  var container = document.createElement("div");
  container.className = "leaflet-control-layer-count leaflet-bar leaflet-control";
  container.appendChild(button);
  parent.append(container);

  plugin.layerCount.button = button;
  plugin.layerCount.tooltip = tooltip;
  plugin.layerCount.container = container;
}
