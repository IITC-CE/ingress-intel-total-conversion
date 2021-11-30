// @author         breunigs
// @name           Draw tools
// @category       Draw
// @version        0.8.0
// @description    Allow drawing things onto the current map so you may plan your next move. Supports Multi-Project-Extension.


// HOOK: pluginDrawTools
// custom hook for draw tools to share it's activity with other plugins

// use own namespace for plugin
window.plugin.drawTools = function() {};

window.plugin.drawTools.KEY_STORAGE = 'plugin-draw-tools-layer';

window.plugin.drawTools.merge = {};
window.plugin.drawTools.merge.status = true;
window.plugin.drawTools.merge.toggle = function() {
  var status = window.plugin.drawTools.merge.status;
  status = Boolean(!status);
  window.plugin.drawTools.merge.status = status;
 }

window.plugin.drawTools.getMarkerIcon = function(color) {
  if (!color) {
    console.warn('Color is not set (default #a24ac3 will be used)');
  }
  // todo: refactor to get rid of getMarkerIcon
  return L.divIcon.coloredSvg(color);
}

window.plugin.drawTools.currentColor = '#a24ac3';

window.plugin.drawTools.setOptions = function() {

  window.plugin.drawTools.lineOptions = {
    stroke: true,
    color: window.plugin.drawTools.currentColor,
    weight: 4,
    opacity: 0.5,
    fill: false,
    interactive: true
  };

  window.plugin.drawTools.polygonOptions = L.extend({}, window.plugin.drawTools.lineOptions, {
    fill: true,
    fillColor: null, // to use the same as 'color' for fill
    fillOpacity: 0.2,
    dashArray: ''
  });

  window.plugin.drawTools.editOptions = L.extend({}, window.plugin.drawTools.polygonOptions, {
    dashArray: '10,10'
  });
  delete window.plugin.drawTools.editOptions.color;

  window.plugin.drawTools.markerOptions = {
    icon: window.plugin.drawTools.currentMarker,
    zIndexOffset: 2000
  };

}

window.plugin.drawTools.setDrawColor = function(color) {
  window.plugin.drawTools.currentColor = color;
  window.plugin.drawTools.currentMarker = window.plugin.drawTools.getMarkerIcon(color);

  window.plugin.drawTools.lineOptions.color = color;
  window.plugin.drawTools.polygonOptions.color = color;
  window.plugin.drawTools.markerOptions.icon = window.plugin.drawTools.currentMarker;

  plugin.drawTools.drawControl.setDrawingOptions({
    polygon:  { shapeOptions: plugin.drawTools.polygonOptions, feet: false, nautic: false },
    polyline: { shapeOptions: plugin.drawTools.lineOptions, feet: false, nautic: false },
    circle:   { shapeOptions: plugin.drawTools.polygonOptions, feet: false, nautic: false },
    marker:   { icon:         plugin.drawTools.markerOptions.icon },
  });
}

// renders the draw control buttons in the top left corner
window.plugin.drawTools.addDrawControl = function() {
  var drawControl = new L.Control.Draw({
    draw: {
      rectangle: false,
      circlemarker: false,
      polygon: {
        shapeOptions: window.plugin.drawTools.polygonOptions,
        snapPoint: window.plugin.drawTools.getSnapLatLng,
      },

      polyline: {
        shapeOptions: window.plugin.drawTools.lineOptions,
        snapPoint: window.plugin.drawTools.getSnapLatLng,
      },

      circle: {
        shapeOptions: window.plugin.drawTools.polygonOptions,
        snapPoint: window.plugin.drawTools.getSnapLatLng,
      },

      // Options for marker (icon, zIndexOffset) are not set via shapeOptions,
      // so we have merge them here!
      marker: L.extend({}, window.plugin.drawTools.markerOptions, {
        snapPoint: window.plugin.drawTools.getSnapLatLng,
        repeatMode: true
      }),

    },

    edit: {
      featureGroup: window.plugin.drawTools.drawnItems,

      edit: {
        selectedPathOptions: window.plugin.drawTools.editOptions,
      },
    },

  });

  window.plugin.drawTools.drawControl = drawControl;

  map.addControl(drawControl);

  window.plugin.drawTools.setAccessKeys();
  for (var toolbarId in drawControl._toolbars) {
    if (drawControl._toolbars[toolbarId] instanceof L.Toolbar) {
      drawControl._toolbars[toolbarId].on('enable', function() {
        setTimeout(window.plugin.drawTools.setAccessKeys, 10);
      });
    }
  }
}

window.plugin.drawTools.setAccessKeys = function() {
  var expr = /\s*\[\w+\]$/;
  // there is no API to add accesskeys, so have to dig in the DOM
  // must be same order as in markup. Note that each toolbar has a container for save/cancel
  var accessKeys = [
    'l', 'p', 'o', 'm', // line, polygon, circle, marker
    'a',                // cancel (_abort)
    'e', 'd',           // edit, delete
    's', 'a',           // save, cancel
  ];
  var buttons = window.plugin.drawTools.drawControl._container.getElementsByTagName('a');
  for(var i=0;i<buttons.length;i++) {
    var button = buttons[i];

    var title = button.title;
    var index = title.search(expr);
    if(index !== -1) title = title.substr(0, index);

    if(!button.offsetParent) { // element hidden, delete accessKey (so other elements can use it)
      button.accessKey = '';
    } else if(accessKeys[i]) {
      button.accessKey = accessKeys[i];
      if(title === "") title = "[" + accessKeys[i] + "]";
      else title += " [" + accessKeys[i] + "]";
    }
    button.title = title;
  }
}


// given a point it tries to find the most suitable portal to
// snap to. It takes the CircleMarker’s radius and weight into account.
// Will return null if nothing to snap to or a LatLng instance.
window.plugin.drawTools.getSnapLatLng = function(unsnappedLatLng) {
  var containerPoint = map.latLngToContainerPoint(unsnappedLatLng);
  var candidates = [];
  $.each(window.portals, function(guid, portal) {
    var ll = portal.getLatLng();
    var pp = map.latLngToContainerPoint(ll);
    var size = portal.options.weight + portal.options.radius;
    var dist = pp.distanceTo(containerPoint);
    if(dist > size) return true;
    candidates.push([dist, ll]);
  });

  if(candidates.length === 0) return unsnappedLatLng;
  candidates = candidates.sort(function(a, b) { return a[0]-b[0]; });
  return new L.LatLng(candidates[0][1].lat, candidates[0][1].lng);  //return a clone of the portal location
}


window.plugin.drawTools.save = function() {
  var data = [];

  window.plugin.drawTools.drawnItems.eachLayer( function(layer) {
    var item = {};
    if (layer instanceof L.GeodesicCircle || layer instanceof L.Circle) {
      item.type = 'circle';
      item.latLng = layer.getLatLng();
      item.radius = layer.getRadius();
      item.color = layer.options.color;
    } else if (layer instanceof L.GeodesicPolygon || layer instanceof L.Polygon) {
      item.type = 'polygon';
      item.latLngs = layer.getLatLngs();
      item.color = layer.options.color;
    } else if (layer instanceof L.GeodesicPolyline || layer instanceof L.Polyline) {
      item.type = 'polyline';
      item.latLngs = layer.getLatLngs();
      item.color = layer.options.color;
    } else if (layer instanceof L.Marker) {
      item.type = 'marker';
      item.latLng = layer.getLatLng();
      item.color = layer.options.icon.options.color;
    } else {
      console.warn('Unknown layer type when saving draw tools layer');
      return; //.eachLayer 'continue'
    }

    data.push(item);
  });
  localStorage[window.plugin.drawTools.KEY_STORAGE] = JSON.stringify(data);

  console.log('draw-tools: saved to localStorage');
}

window.plugin.drawTools.load = function() {
  try {
    var dataStr = localStorage[window.plugin.drawTools.KEY_STORAGE];
    if (dataStr === undefined) return;

    var data = JSON.parse(dataStr);
    window.plugin.drawTools.import(data);

  } catch(e) {
    console.warn('draw-tools: failed to load data from localStorage: '+e);
  }
}

window.plugin.drawTools.import = function(data) {
  $.each(data, function(index,item) {
    var layer = null;
    var extraOpt = {};
    if (item.color) extraOpt.color = item.color;

    switch(item.type) {
      case 'polyline':
        layer = L.geodesicPolyline(item.latLngs, L.extend({},window.plugin.drawTools.lineOptions,extraOpt));
        break;
      case 'polygon':
        layer = L.geodesicPolygon(item.latLngs, L.extend({},window.plugin.drawTools.polygonOptions,extraOpt));
        break;
      case 'circle':
        layer = L.geodesicCircle(item.latLng, item.radius, L.extend({},window.plugin.drawTools.polygonOptions,extraOpt));
        break;
      case 'marker':
        var extraMarkerOpt = {};
        if (item.color) extraMarkerOpt.icon = window.plugin.drawTools.getMarkerIcon(item.color);
        layer = L.marker(item.latLng, L.extend({},window.plugin.drawTools.markerOptions,extraMarkerOpt));
        window.registerMarkerForOMS(layer);
        break;
      default:
        console.warn('unknown layer type "'+item.type+'" when loading draw tools layer');
        break;
    }
    if (layer) {
      window.plugin.drawTools.drawnItems.addLayer(layer);
    }
  });

  runHooks('pluginDrawTools', {event: 'import'});

}


//Draw Tools Options

// Manual import, export and reset data
window.plugin.drawTools.manualOpt = function() {
  var mergeStatusCheck = '';
  if(!window.plugin.drawTools.merge.status){
    mergeStatusCheck = 'checked';
  }

  var html = '<div class="drawtoolsStyles">'
           + '<input type="color" name="drawColor" id="drawtools_color"></input>'
//TODO: add line style choosers: thickness, maybe dash styles?
           + '</div>'
           + '<div class="drawtoolsSetbox">'
           + '<a onclick="window.plugin.drawTools.optCopy();" tabindex="0">Copy Drawn Items</a>'
           + '<a onclick="window.plugin.drawTools.optPaste();return false;" tabindex="0">Paste Drawn Items</a>'
           + '<a onclick="window.plugin.drawTools.optImport();return false;" tabindex="0">Import Drawn Items</a>'
           + '<a onclick="window.plugin.drawTools.optExport();return false;" tabindex="0">Export Drawn Items</a>'
           + '<a onclick="window.plugin.drawTools.optReset();return false;" tabindex="0">Reset Drawn Items</a>'
           + '<a onclick="window.plugin.drawTools.snapToPortals();return false;" tabindex="0">Snap to portals</a>'
           + '<center><label id="MergeToggle"><input type="checkbox" '+mergeStatusCheck+' name="merge" '
           +   'onchange="window.plugin.drawTools.merge.toggle();return false;" />Reset draws before paste or import</label></center>'
           + '</div>';

  dialog({
    html: html,
    id: 'plugin-drawtools-options',
    dialogClass: 'ui-dialog-drawtoolsSet',
    title: 'Draw Tools Options'
  });

  // need to initialise the 'spectrum' colour picker
  $('#drawtools_color').spectrum({
    flat: false,
    showInput: false,
    showButtons: false,
    showPalette: true,
    showPaletteOnly: false,
    showSelectionPalette: false,
    palette: [ ['#a24ac3','#514ac3','#4aa8c3','#51c34a'],
               ['#c1c34a','#c38a4a','#c34a4a','#c34a6f'],
               ['#000000','#666666','#bbbbbb','#ffffff']
    ],
    change: function(color) { window.plugin.drawTools.setDrawColor(color.toHexString()); },
//    move: function(color) { window.plugin.drawTools.setDrawColor(color.toHexString()); },
    color: window.plugin.drawTools.currentColor,
  });
}

window.plugin.drawTools.optAlert = function(message) {
  $('.ui-dialog-drawtoolsSet .ui-dialog-buttonset').prepend('<p class="drawtools-alert" style="float:left;margin-top:4px;">'+message+'</p>');
  $('.drawtools-alert').delay(2500).fadeOut();
}

window.plugin.drawTools.isEmpty = function() {
  var data = window.localStorage[window.plugin.drawTools.KEY_STORAGE];
  if (!data || data.length <= 2) {
    dialog({
      html: 'Error! The storage is empty or not exist. Before you try copy/export you draw something.',
      width: 250,
      dialogClass: 'ui-dialog-drawtools-message',
      title: 'Draw Tools Message'
    });
    return true
  }
}

window.plugin.drawTools.optCopy = function() {
  if (window.plugin.drawTools.isEmpty()) { return; }

  if (window.isAndroid && android.shareString) {
    android.shareString(window.localStorage[window.plugin.drawTools.KEY_STORAGE]);
  } else {
    var stockWarnings = {};
    var stockLinks = [];
    window.plugin.drawTools.drawnItems.eachLayer( function(layer) {
      if (layer instanceof L.GeodesicCircle || layer instanceof L.Circle) {
        stockWarnings.noCircle = true;
        return; //.eachLayer 'continue'
      } else if (layer instanceof L.GeodesicPolygon || layer instanceof L.Polygon) {
        stockWarnings.polyAsLine = true;
        // but we can export them
      } else if (layer instanceof L.GeodesicPolyline || layer instanceof L.Polyline) {
        // polylines are fine
      } else if (layer instanceof L.Marker) {
        stockWarnings.noMarker = true;
        return; //.eachLayer 'continue'
      } else {
        stockWarnings.unknown = true; //should never happen
        return; //.eachLayer 'continue'
      }
      // only polygons and polylines make it through to here
      var latLngs = layer.getLatLngs();
      // stock only handles one line segment at a time
      for (var i=0; i<latLngs.length-1; i++) {
        stockLinks.push([latLngs[i].lat,latLngs[i].lng,latLngs[i+1].lat,latLngs[i+1].lng]);
      }
      // for polygons, we also need a final link from last to first point
      if (layer instanceof L.GeodesicPolygon || layer instanceof L.Polygon) {
        stockLinks.push([latLngs[latLngs.length-1].lat,latLngs[latLngs.length-1].lng,latLngs[0].lat,latLngs[0].lng]);
      }
    });
    var stockUrl = window.makePermalink(null, {
      includeMapView: true,
      fullURL: true
    }) + '&pls='+stockLinks.map(function(link){return link.join(',');}).join('_');
    var stockWarnTexts = [];
    if (stockWarnings.polyAsLine) stockWarnTexts.push('Note: polygons are exported as lines');
    if (stockLinks.length>40) stockWarnTexts.push('Warning: Stock intel may not work with more than 40 line segments - there are '+stockLinks.length);
    if (stockWarnings.noCircle) stockWarnTexts.push('Warning: Circles cannot be exported to stock intel');
    if (stockWarnings.noMarker) stockWarnTexts.push('Warning: Markers cannot be exported to stock intel');
    if (stockWarnings.unknown) stockWarnTexts.push('Warning: UNKNOWN ITEM TYPE');

    var html = '<p><a onclick="$(\'.ui-dialog-drawtoolsSet-copy textarea\').select();">Select all</a> and press CTRL+C to copy it.</p>'
              +'<textarea readonly onclick="$(\'.ui-dialog-drawtoolsSet-copy textarea\').select();">'+window.localStorage[window.plugin.drawTools.KEY_STORAGE]+'</textarea>'
              +'<p>or, export as a link for the standard intel map (for non IITC users)</p>'
              +'<input onclick="event.target.select();" type="text" size="90" value="'+stockUrl+'"/>';
    if (stockWarnTexts.length>0) {
      html += '<ul><li>'+stockWarnTexts.join('</li><li>')+'</li></ul>';
    }

    dialog({
      html: html,
      width: 600,
      dialogClass: 'ui-dialog-drawtoolsSet-copy',
      id: 'plugin-drawtools-export',
      title: 'Draw Tools Export'
      });
  }
}

window.plugin.drawTools.optExport = function() {
  if (window.plugin.drawTools.isEmpty()) { return };

  var data = localStorage[window.plugin.drawTools.KEY_STORAGE];
  window.saveFile(data, 'IITC-drawn-items.json', 'application/json');
}

window.plugin.drawTools.optPaste = function() {
  var promptAction = prompt('Press CTRL+V to paste (draw-tools data or stock intel URL).', '');
  promptAction = promptAction && promptAction.trim();
  if (promptAction) {
    try {
      // first see if it looks like a URL-format stock intel link, and if so, try and parse out any stock drawn items
      // from the pls parameter

      // var intel = new RegExp('(https?://)?(www\\.)?ingress\\.com/intel.*[?&]pls=').exec(promptAction); // old url
      var matchIntel = new RegExp('(https://)?intel\\.ingress\\.com/.*[?&]pls=').exec(promptAction);
      if (matchIntel && matchIntel.index === 0) {
        //looks like a ingress URL that has drawn items...
        var items = promptAction.split(/[?&]/);
        var foundAt = -1;
        for (var i=0; i<items.length; i++) {
          if (items[i].substr(0,4) == "pls=") {
            foundAt = i;
          }
        }

        if (foundAt === -1) {
          throw new Error('No drawn items found in intel URL');
        }

        var newLines = [];
        var linesStr = items[foundAt].substr(4).split('_');
        for (var i=0; i<linesStr.length; i++) {
          var floats = linesStr[i].split(',').map(Number);
          if (floats.length !== 4) {
            throw new Error('URL item not a set of four floats');
          }
          for (var j=0; j<floats.length; j++) {
            if (isNaN(floats[j])) {
              throw new Error('URL item had invalid number');
            }
          }
          var layer = L.geodesicPolyline([[floats[0],floats[1]],[floats[2],floats[3]]], window.plugin.drawTools.lineOptions);
          newLines.push(layer);
        }

        // all parsed OK - clear and insert
        if (!window.plugin.drawTools.merge.status) {
          window.plugin.drawTools.drawnItems.clearLayers();
        }
        for (var i=0; i<newLines.length; i++) {
          window.plugin.drawTools.drawnItems.addLayer(newLines[i]);
        }
        runHooks('pluginDrawTools', {event: 'import'});

        console.log('DRAWTOOLS: '+(window.plugin.drawTools.merge.status?'':'reset and ')+'pasted drawn items from stock URL');
        window.plugin.drawTools.optAlert('Import Successful.');


      } else {
        if (window.plugin.drawTools.merge.status) {
          promptAction = (typeof(
            window.localStorage[window.plugin.drawTools.KEY_STORAGE]) !== 'undefined' &&
            window.localStorage[window.plugin.drawTools.KEY_STORAGE].length > 4
              ? window.localStorage[window.plugin.drawTools.KEY_STORAGE].slice(0,-1) + ',' + promptAction.slice(1)
              : promptAction);
        }
        var data;
          try{
            data = JSON.parse(promptAction);
          } catch(e) {
            // invalid json, filter out any leading or trailing text and try again
            var mutatedPromptAction = promptAction;
            if(!mutatedPromptAction.match(new RegExp('^\\[\\{'))) {
              mutatedPromptAction = mutatedPromptAction.slice(mutatedPromptAction.indexOf('[{'));
            }
            if(!mutatedPromptAction.match(new RegExp('\\}\\]$'))) {
              mutatedPromptAction = mutatedPromptAction.slice(0, mutatedPromptAction.lastIndexOf('}]') + 2);
            }
            data = JSON.parse(mutatedPromptAction); // throws a new exception if we still didn't get good data, which is handled by the outer enclosure
        }
        window.plugin.drawTools.drawnItems.clearLayers();
        window.plugin.drawTools.import(data);
        console.log('DRAWTOOLS: '+(window.plugin.drawTools.merge.status?'':'reset and ')+'pasted drawn items');
        window.plugin.drawTools.optAlert('Import Successful.');
      }

      // to write back the data to localStorage
      window.plugin.drawTools.save();
    } catch(e) {
      console.warn('DRAWTOOLS: failed to import data: '+e);
      window.plugin.drawTools.optAlert('<span style="color: #f88">Import failed</span>');
    }
  }
}

window.plugin.drawTools.optImport = function() {
  L.FileListLoader.loadFiles({accept:'application/json'})
    .on('load',function (e) {
      try {
        var data = JSON.parse(e.reader.result);
        if (!window.plugin.drawTools.merge.status) {
          window.plugin.drawTools.drawnItems.clearLayers();
        }
        window.plugin.drawTools.import(data);
        console.log('DRAWTOOLS: '+(window.plugin.drawTools.merge.status?'':'reset and ')+'imported drawn items');
        window.plugin.drawTools.optAlert('Import Successful.');

        // to write back the data to localStorage
        window.plugin.drawTools.save();
      } catch(e) {
        console.warn('DRAWTOOLS: failed to import data: '+e);
        window.plugin.drawTools.optAlert('<span style="color: #f88">Import failed</span>');
      }
    });
}

window.plugin.drawTools.optReset = function() {
  var promptAction = confirm('All drawn items will be deleted. Are you sure?', '');
  if(promptAction) {
    localStorage[window.plugin.drawTools.KEY_STORAGE] = '[]';
    window.plugin.drawTools.drawnItems.clearLayers();
    window.plugin.drawTools.load();
    console.log('DRAWTOOLS: reset all drawn items');
    window.plugin.drawTools.optAlert('Reset Successful. ');
    runHooks('pluginDrawTools', {event: 'clear'});
  }
}

window.plugin.drawTools.snapToPortals = function() {
  var dataParams = window.getCurrentZoomTileParameters();
  if (dataParams.level > 0) {
    if (!confirm('Not all portals are visible on the map. Snap to portals may move valid points to the wrong place. Continue?')) {
      return;
    }
  }

  if (mapDataRequest.status.short != 'done') {
    if (!confirm('Map data has not completely loaded, so some portals may be missing. Do you want to continue?')) {
      return;
    }
  }

  var visibleBounds = map.getBounds();

  // let's do all the distance calculations in screen space. 2d is much easier, should be faster, and is more than good enough
  // we'll pre-project all the on-screen portals too, to save repeatedly doing it
  var visiblePortals = {};
  $.each(window.portals, function(guid,portal) {
    var ll = portal.getLatLng();
    if (visibleBounds.contains(ll)) {
      visiblePortals[guid] = map.project(ll);
    }
  });

  if (Object.keys(visiblePortals).length == 0) {
    alert('Error: No portals visible in this view - nothing to snap points to!');
    return;
  }

  var findClosestPortalLatLng = function(latlng) {
    var testpoint = map.project(latlng);

    var minDistSquared = undefined;
    var minGuid = undefined;
    for (var guid in visiblePortals) {
      var p = visiblePortals[guid];
      var distSquared = (testpoint.x-p.x)*(testpoint.x-p.x) + (testpoint.y-p.y)*(testpoint.y-p.y);
      if (minDistSquared == undefined || minDistSquared > distSquared) {
        minDistSquared = distSquared;
        minGuid = guid;
      }
    }
    return minGuid ? portals[minGuid].getLatLng() : undefined; //should never hit 'undefined' case - as we abort when the list is empty
  };


  var changedCount = 0;
  var testCount = 0;

  window.plugin.drawTools.drawnItems.eachLayer(function(layer) {
    if (layer.getLatLng) {
      //circles and markers - a single point to snap
      var ll = layer.getLatLng();
      if (visibleBounds.contains(ll)) {
        testCount++;
        var newll = findClosestPortalLatLng(ll);
        if (!newll.equals(ll)) {
          layer.setLatLng(new L.LatLng(newll.lat,newll.lng));
          changedCount++;
        }
      }
    } else if (layer.getLatLngs) {
      var lls = layer.getLatLngs();
      var layerChanged = false;
      for (var i=0; i<lls.length; i++) {
        if (visibleBounds.contains(lls[i])) {
          testCount++;
          var newll = findClosestPortalLatLng(lls[i]);
          if (!newll.equals(lls[i])) {
            lls[i] = new L.LatLng(newll.lat,newll.lng);
            changedCount++;
            layerChanged = true;
          }
        }
      }
      if (layerChanged) {
        layer.setLatLngs(lls);
      }
    }
  });

  if(changedCount > 0) {
    runHooks('pluginDrawTools',{event:'layersSnappedToPortals'}); //or should we send 'layersEdited'? as that's effectively what's happened...
  }

  alert('Tested '+testCount+' points, and moved '+changedCount+' onto portal coordinates');

  window.plugin.drawTools.save();
}

window.plugin.drawTools.boot = function() {

  window.plugin.drawTools.currentMarker = window.plugin.drawTools.getMarkerIcon(window.plugin.drawTools.currentColor);

  window.plugin.drawTools.setOptions();

  //create a leaflet FeatureGroup to hold drawn items
  window.plugin.drawTools.drawnItems = new L.FeatureGroup();

  //load any previously saved items
  plugin.drawTools.load();

  //add the draw control - this references the above FeatureGroup for editing purposes
  plugin.drawTools.addDrawControl();
  window.plugin.drawTools.setDrawColor(window.plugin.drawTools.currentColor);

  //start off hidden. if the layer is enabled, the below layerChooser.addOverlay will add it, triggering a 'show'
  $('.leaflet-draw-section').hide();


  //hide the draw tools when the 'drawn items' layer is off, show it when on
  map.on('layeradd', function(obj) {
    if(obj.layer === window.plugin.drawTools.drawnItems) {
      $('.leaflet-draw-section').show();
    }
  });
  map.on('layerremove', function(obj) {
    if(obj.layer === window.plugin.drawTools.drawnItems) {
      $('.leaflet-draw-section').hide();
    }
  });

  //add the layer
  window.layerChooser.addOverlay(window.plugin.drawTools.drawnItems, 'Drawn Items');

  //place created items into the specific layer
  map.on('draw:created', function(e) {
    var type=e.layerType;
    var layer=e.layer;
    window.plugin.drawTools.drawnItems.addLayer(layer);
    window.plugin.drawTools.save();

    if(layer instanceof L.Marker) {
      window.registerMarkerForOMS(layer);
    }

    runHooks('pluginDrawTools',{event:'layerCreated',layer:layer});
  });

  map.on('draw:deleted', function(e) {
    window.plugin.drawTools.save();
    runHooks('pluginDrawTools',{event:'layersDeleted'});
  });

  map.on('draw:edited', function(e) {
    window.plugin.drawTools.save();
    runHooks('pluginDrawTools',{event:'layersEdited'});
  });
  //add options menu
  $('#toolbox').append('<a onclick="window.plugin.drawTools.manualOpt();return false;" accesskey="x" title="[x]">DrawTools Opt</a>');

  $('head').append('<style>' +
        '.drawtoolsSetbox > a { display:block; color:#ffce00; border:1px solid #ffce00; padding:3px 0; margin:10px auto; width:80%; text-align:center; background:rgba(8,48,78,.9); }'+
        '.ui-dialog-drawtoolsSet-copy textarea { width:96%; height:250px; resize:vertical; }'+
        '</style>');

}

// ---------------------------------------------------------------------------------
// MPE - MULTI PROJECTS EXTENSION
// ---------------------------------------------------------------------------------
window.plugin.drawTools.initMPE = function(){
  // Not launch the code if the MPE plugin there isn't.
  if(!window.plugin.mpe){ return; }

  // The MPE function to set a MultiProjects type
  window.plugin.mpe.setMultiProjects({
    namespace: 'drawTools',
    title: 'Draw Tools Layer',
    // Font awesome css class
    fa: 'fa-pencil',
    // Function to change a localstorage key
    func_setKey: function(newKey){
      window.plugin.drawTools.KEY_STORAGE = newKey;
    },
    // Native value of localstorage key
    defaultKey: 'plugin-draw-tools-layer',
    // This function is run before the localstorage key change
    func_pre: function(){},
    // This function is run after the localstorage key change
    func_post: function(){
      window.plugin.drawTools.drawnItems.clearLayers();
      window.plugin.drawTools.load();
      console.log('DRAWTOOLS: reset all drawn items (func_post)');

      if (window.plugin.crossLinks) {
        window.plugin.crossLinks.checkAllLinks();

        if (window.plugin.destroyedLinks) {
          window.plugin.destroyedLinks.cross.removeCrossAll();
        }
      }

      // Code to:
      // hide/remove elements from DOM, layers, variables, etc...
      // load data from window.localStorage[window.plugin.myPlugin.KEY_STORAGE]
      // show/add/draw elements in the DOM, layers, variables, etc...
    }
  });
}

function setup () {
  loadExternals();
  window.plugin.drawTools.boot();
  window.plugin.drawTools.initMPE();
}

function loadExternals () {
  try {
    // https://github.com/Leaflet/Leaflet.draw
    '@include_raw:external/leaflet.draw-src.js@';
    $('<style>').html('@include_css:external/leaflet.draw-src.css@').appendTo('head');

    $('<style>').html('@include_css:external/leaflet.draw-fix.css@').appendTo('head');

    '@include_raw:external/leaflet.draw-snap.js@';

    '@include_raw:external/leaflet.draw-geodesic.js@';

    // support Leaflet >= 1
    // https://github.com/Leaflet/Leaflet.draw/pull/911
    L.Draw.Polyline.prototype.options.shapeOptions.interactive = true;
    L.Draw.Polygon.prototype.options.shapeOptions.interactive = true;
    L.Draw.Rectangle.prototype.options.shapeOptions.interactive = true;
    L.Draw.CircleMarker.prototype.options.interactive = true;
    L.Draw.Circle.prototype.options.shapeOptions.interactive = true;

    // https://github.com/Leaflet/Leaflet.draw/issues/789
    // https://github.com/Leaflet/Leaflet.draw/issues/695
    L.Draw.Polyline.prototype._onTouch_original = L.Draw.Polyline.prototype._onTouch; // just in case
    L.Draw.Polyline.prototype._onTouch = L.Util.falseFn;

    // workaround for https://github.com/Leaflet/Leaflet.draw/issues/923
    map.addHandler('touchExtend', L.Map.TouchExtend);

    // disable tap handler as it conflicts with leaflet.draw
    // https://github.com/Leaflet/Leaflet/issues/6977
    // !Note: currently this may brake `contextmenu` handling on iOS
    map.tap = map.tap ? map.tap.disable() : false;

  } catch (e) {
    console.error('leaflet.draw-src.js loading failed');
    throw e;
  }

  try {
    // https://github.com/bgrins/spectrum
    '@include_raw:external/spectrum.js@';
    $('<style>').html('@include_string:external/spectrum.css@').appendTo('head');

  } catch (e) {
    console.error('spectrum.js loading failed');
    throw e;
  }
}
