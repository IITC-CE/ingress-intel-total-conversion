// @author         yavidor
// @name           Noder
// @category       Misc
// @version        0.0.1
// @description    Does Neders

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
];

// use own namespace for plugin
const pluginName = 'getRoutes';
const playerLocationKey = 'traveling-agent-player-location';
window.plugin.travelingAgent = {};

/**
 * @param {string} id The ID of the bookmark
 */
function getBookmarkById(id) {
  return JSON.parse(localStorage[window.plugin.bookmarks.KEY_STORAGE]).portals[id];
}

function drawLayer(steps) {
  const layer = L.geodesicPolyline(steps, window.plugin.drawTools.lineOptions);
  window.map.fire('draw:created', {
    layer: layer,
    layerType: 'polyline',
  });
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
  const routeLayer = results.routes[0].overview_path.map((x) => L.latLng(x.lat(), x.lng()));
  drawLayer(routeLayer);
  /**
   * @type {Portal[]}
   */
  const path = [nodes[0]];
  results.routes[0].waypoint_order.forEach((wayPointIndex) => path.push(nodes[wayPointIndex + 1]));
  return path;
}

window.plugin.travelingAgent.draw = function () {
  $('#bookmarkInDrawer a.bookmarkLabel.selected').each(async function (_, element) {
    console.log(element.innerText);
    console.log($(element).data('id'));
    const bookmarkContent = getBookmarkById($(element).data('id')).bkmrk;
    /**
     * @type {Portal[]}
     */
    const portals = [];
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
        console.log('NO');
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
  window.plugin.travelingAgent.playerLocation = L.latLng(JSON.parse(localStorage.getItem(playerLocationKey)));
  window.plugin.travelingAgent.setupCSS();
  IITC.toolbox.addButton({
    label: 'Draw Route',
    action: window.plugin.travelingAgent.openDialog,
    title: 'Draw the (approximate) best route between every portal in a bookmark',
  });
}
