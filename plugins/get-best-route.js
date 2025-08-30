// @author         yavidor
// @name           Noder
// @category       Misc
// @version        0.0.1
// @description    Does Neders

/* exported setup, changelog --eslint */

/* global IITC, L -- eslint */

/**
 * @typedef {Object} Portal
 * @property {L.latLng} coordinates
 * @property {boolean} visited - Whether the node is already in the route
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
window.plugin.travelingAgent = {};

/**
 * @param {string} id The ID of the bookmark
 */
function getBookmarkById(id) {
  return JSON.parse(localStorage[window.plugin.bookmarks.KEY_STORAGE]).portals[id];
}

/**
 * @param {Portal[]} portals
 * @returns {Portal[]} Portals that have not been visited
 */
function getUnvisited(portals) {
  return portals.filter(function ({ visited }) {
    return visited === false;
  });
}

/**
 * @param {Portal} origin
 * @param {Portal[]} neighbors
 * @returns {Portal} The closest neighbor
 */
function getNearestNeighbor(origin, neighbors) {
  return getUnvisited(neighbors).sort((a, b) => origin.coordinates.distanceTo(a.coordinates) - origin.coordinates.distanceTo(b.coordinates))[0];
}

/**
 * @param {Portal[]} nodes - The nodes to construct the route with
 */
function TSP(nodes) {
  console.log(nodes.map((x) => `${x.coordinates.lat}, ${x.coordinates.lng}`));
  const route = [nodes[0]];
  let current = route[0];
  while (getUnvisited(nodes).length > 1) {
    current.visited = true;
    const nearestNeighbor = getNearestNeighbor(current, nodes);
    console.log(nearestNeighbor);
    route.push(nearestNeighbor);
    current = nearestNeighbor;
  }
  route.push(route[0]);
  console.log(nodes);
  return route.map((x) => x?.name).join('->');
}

window.plugin.travelingAgent.draw = function () {
  $('#bookmarkInDrawer a.bookmarkLabel.selected').each(function (_, element) {
    console.log(element.innerText);
    console.log($(element).data('id'));
    const bookmarkContent = getBookmarkById($(element).data('id')).bkmrk;
    /**
     * @type {Portal[]}
     */
    const portals = [];
    for (const { label, latlng } of Object.values(bookmarkContent)) {
      const parsedLatLng = latlng.split(',');
      portals.push({ name: label, coordinates: L.latLng(parsedLatLng), visited: false });
    }
    console.log(TSP(portals));
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
    id: 'hello_world',
    title: 'What',
    buttons: {
      DRAW: function () {
        window.plugin.travelingAgent.draw();
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
  window.plugin.travelingAgent.setupCSS();
  IITC.toolbox.addButton({
    label: 'Draw Route',
    action: window.plugin.travelingAgent.openDialog,
    title: 'Draw the (approximate) best route between every portal in a bookmark',
  });
}
