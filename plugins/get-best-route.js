// @author         yavidor
// @name           Traveling Agent
// @category       Misc
// @version        0.0.2
// @description    Calculates the best route between the player's location and a series of portals

/* exported setup, changelog --eslint */

/* global IITC, L -- eslint */

/**
 * @typedef {Object} Portal
 * @property {L.LatLng} coordinates
 * @property {string} name
 */

var changelog = [
  {
    version: '0.0.1',
    changes: ['Nothing yet'],
  },
  {
    version: '0.0.2',
    changes: ['Calculates route through google maps API', "Set player's location", 'Draw route', 'Return sorted list of portals'],
  },
];

// use own namespace for plugin
const pluginName = 'getRoutes';
const playerLocationKey = 'traveling-agent-player-location';
window.plugin.travelingAgent = {};

window.plugin.travelingAgent.createLayer = function () {
  window.plugin.travelingAgent.routeLayer = new L.LayerGroup();
  window.layerChooser.addOverlay(window.plugin.travelingAgent.routeLayer, 'Portal Routes');

  window.map.on('layerremove', function (obj) {
    if (obj.layer === window.plugin.travelingAgent.routeLayer) {
      window.plugin.travelingAgent.routeLayer.clearLayers();
    }
  });
};

window.plugin.travelingAgent.setLocation = function () {
  if (window.plugin.travelingAgent.locationMarker) {
    window.plugin.travelingAgent.routeLayer.removeLayer(window.plugin.travelingAgent.locationMarker);
    window.plugin.travelingAgent.locationMarker = null;
  }

  window.plugin.travelingAgent.playerLocation = window.map.getCenter();

  window.plugin.travelingAgent.locationMarker = L.marker(window.plugin.travelingAgent.playerLocation, {
    icon: L.divIcon.coloredSvg('#4FA3AB'),
    draggable: true,
    title: 'Drag to change current location',
  });
  localStorage[playerLocationKey] = JSON.stringify({
    lat: window.plugin.travelingAgent.playerLocation.lat,
    lng: window.plugin.travelingAgent.playerLocation.lng,
  });

  window.plugin.travelingAgent.locationMarker.on('drag', function () {
    window.plugin.travelingAgent.playerLocation = L.latLng(window.plugin.travelingAgent.locationMarker.getLatLng());
    localStorage[playerLocationKey] = JSON.stringify({
      lat: window.plugin.travelingAgent.playerLocation.lat,
      lng: window.plugin.travelingAgent.playerLocation.lng,
    });
  });
  window.plugin.travelingAgent.routeLayer.addLayer(window.plugin.travelingAgent.locationMarker);
  window.plugin.travelingAgent.draw();
};

/**
 * @param {string} id The ID of the bookmark
 */
function getBookmarkById(id) {
  return JSON.parse(localStorage[window.plugin.bookmarks.KEY_STORAGE]).portals[id];
}

function drawLayer(steps) {
  window.plugin.travelingAgent.routeLayer.clearLayers();
  window.plugin.travelingAgent.routePolyline = L.geodesicPolyline(steps, { name: 'routePolyline', ...window.plugin.drawTools.lineOptions });
  window.plugin.travelingAgent.routeLayer.addLayer(window.plugin.travelingAgent.routePolyline);
}

/**
 * @param {Portal[]} nodes
 */
async function getBestRoute(nodes) {
  const service = new window.google.maps.DirectionsService();
  const origin = new window.google.maps.LatLng({ lat: nodes[0].coordinates.lat, lng: nodes[0].coordinates.lng });
  const request = {
    origin: origin,
    destination: origin,
    waypoints: nodes.slice(1).map((x) => {
      return { location: new window.google.maps.LatLng({ lat: x.coordinates.lat, lng: x.coordinates.lng }), stopover: true };
    }),
    optimizeWaypoints: true,
    travelMode: window.google.maps.TravelMode.DRIVING,
    unitSystem: window.google.maps.UnitSystem.METRIC,
    avoidHighways: false,
    avoidTolls: false,
  };
  window.plugin.drawTools.setDrawColor('#FF0000');
  const results = await service.route(request);
  console.log(results);
  const routeLayer = results.routes[0].overview_path.map((x) => L.latLng(x.lat(), x.lng()));
  if (window.plugin.travelingAgent.routePolyline !== undefined && window.plugin.travelingAgent.routePolyline !== null) {
    window.plugin.travelingAgent.routeLayer.removeLayer(window.plugin.travelingAgent.routePolyline);
  }
  drawLayer(routeLayer);
  window.plugin.drawTools.setDrawColor('#a24ac3');
  console.log('Hello');
  /**
   * @type {Portal[]}
   */
  const path = [nodes[0]];
  console.log(path, 'Hello');
  results.routes[0].waypoint_order.forEach((wayPointIndex) => path.push(nodes[wayPointIndex + 1]));
  alert(path.map((step, index) => `${index}: ${step.name}`).join('\n'));
  return path;
}

window.plugin.travelingAgent.draw = function () {
  if (window.plugin.travelingAgent.playerLocation === null) {
    alert('Player location not set');
    window.plugin.travelingAgent.setLocation();
    return;
  }
  $('#bookmarkInDrawer a.bookmarkLabel.selected').each(async function (_, element) {
    console.log(element.innerText);
    const bookmarkContent = getBookmarkById($(element).data('id')).bkmrk;
    /**
     * @type {Portal[]}
     */
    const portals = [{ name: 'Player Location', coordinates: window.plugin.travelingAgent.playerLocation }];
    for (const { label, latlng } of Object.values(bookmarkContent)) {
      const parsedLatLng = latlng.split(',');
      portals.push({ name: label, coordinates: L.latLng(parsedLatLng) });
    }
    const googlePortals = await getBestRoute(portals);
    console.log(googlePortals);
  });
};

window.plugin.travelingAgent.dialogLoadList = function () {
  var portalsList = JSON.parse(localStorage[window.plugin.bookmarks.KEY_STORAGE]);
  var element = '';
  var elementTemp = '';
  var elemGenericFolder = '';

  // For each folder
  var list = portalsList.portals;
  for (var idFolders in list) {
    var folders = list[idFolders];

    var folderLabel = `<a class="bookmarkLabel" data-id="${idFolders}" onclick="$(this).toggleClass('selected');$('.bookmarkLabel').not(this).removeClass('selected')">${folders['label']}</a>`;

    elementTemp = `<div class="bookmarkFolder" id="${idFolders}">${folderLabel}</div>`;

    if (idFolders !== window.plugin.bookmarks.KEY_OTHER_BKMRK) {
      element += elementTemp;
    } else {
      elemGenericFolder += elementTemp;
    }
  }
  element += elemGenericFolder;
  return `<div id="bookmarkInDrawer">${element}</div>`;
};

window.plugin.travelingAgent.openDialog = function () {
  window.dialog({
    html: window.plugin.travelingAgent.dialogLoadList,
    dialogClass: 'ui-dialog-autodrawer',
    id: 'TSP_dialog',
    title: 'There and Back Again',
    buttons: {
      DRAW: function () {
        window.plugin.travelingAgent.draw();
      },
      'SET LOCATION & DRAW': function () {
        window.plugin.travelingAgent.setLocation();
      },
    },
  });
};

window.plugin.travelingAgent.setupCSS = function () {
  $('<style>').prop('type', 'text/css').html('@include_css:get-best-route.css@').appendTo('head');
};

function setup() {
  if (window.plugin.bookmarks === undefined) {
    alert(`'${pluginName}' requires 'bookmarks'`);
    return;
  }
  if (window.plugin.drawTools === undefined) {
    alert(`'${pluginName}' requires 'drawTools'`);
    return;
  }
  window.plugin.travelingAgent.createLayer();
  try {
    window.plugin.travelingAgent.playerLocation = L.latLng(JSON.parse(localStorage[playerLocationKey]));
    window.plugin.travelingAgent.locationMarker = L.marker(window.plugin.travelingAgent.playerLocation, {
      icon: L.divIcon.coloredSvg('#4FA3AB'),
      draggable: true,
      title: 'Drag to change current location',
    });
    window.plugin.travelingAgent.routeLayer.addLayer(window.plugin.travelingAgent.locationMarker);
    window.plugin.travelingAgent.locationMarker.on('drag', function () {
      window.plugin.travelingAgent.playerLocation = L.latLng(window.plugin.travelingAgent.locationMarker.getLatLng());
      localStorage[playerLocationKey] = JSON.stringify({
        lat: window.plugin.travelingAgent.playerLocation.lat,
        lng: window.plugin.travelingAgent.playerLocation.lng,
      });
    });
    console.log(window.plugin.travelingAgent.playerLocation);
  } catch (e) {
    console.error(e);
    window.plugin.travelingAgent.playerLocation = null;
  }
  window.plugin.travelingAgent.setupCSS();
  IITC.toolbox.addButton({
    label: 'Draw Route',
    action: window.plugin.travelingAgent.openDialog,
    title: 'Draw the (approximate) best route between every portal in a bookmark',
  });
}
