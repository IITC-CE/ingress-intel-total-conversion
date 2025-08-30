// @author         yavidor
// @name           Noder
// @category       Misc
// @version        0.0.1
// @description    Does Neders

/* exported setup, changelog --eslint */

/* global IITC -- eslint */

/**
 * @typedef {Object} Portal
 * @property {{lat: number, lng: number}} coordinates
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
 * @param {Portal} origin
 * @param {Portal[]} neighbors
 * @returns {Portal} The closest neighbor
 */
function getNearestNeighbor(origin, neighbors) {
  const validNeighbors = neighbors.filter(function ({ visited }) {
    return visited === false;
  });
  let closestNeighbor;
  let minDistance = Number.MAX_SAFE_INTEGER;
  for (const neighbor of validNeighbors) {
    if (origin.latlng.distanceTo(neighbor.latlng) < minDistance) {
      minDistance = origin.latlng.distanceTo(neighbor.latlng);
      closestNeighbor = neighbor;
    }
  }
  return closestNeighbor;
}

/**
 * @param {Portal[]} nodes - The nodes to construct the route with
 */
function TSP(nodes) {
  return getNearestNeighbor(nodes[0], nodes.slice(1));
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
      portals.push({ name: label, latlng: L.latlng(latlng), visited: false });
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
