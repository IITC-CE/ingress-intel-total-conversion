// ==UserScript==
// @author         Kofirs2634 aka Nerotu
// @id             portals_gallery_script@nerotu
// @name           Portals Gallery
// @description    Creates the gallery of portals that can be used to solve the First Saturday passcode.
// @category       Info
// @version        1.2.1
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/nerotu/portals_gallery_script.user.js
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/nerotu/portals_gallery_script.meta.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

// PLUGIN START ////////////////////////////////////////////////////////
// use own namespace for plugin
window.plugin.portalsGallery = () => {};
window.plugin.portalsGallery.storage = [];
window.plugin.portalsGallery.sortmode = 't';
window.plugin.portalsGallery.imagesPerRow = 3;
/**
 * Collects the data of rendered portals
 * @public
 */
window.plugin.portalsGallery.collect = () => {
    var self = window.plugin.portalsGallery;
    self.storage = [];
    for (var i in window.portals) {
        var path = portals[i].options.data;
        if (path.title && path.image) self.storage.push({ n: path.title, p: { lt: path.latE6 / 1e6, ln: path.lngE6 / 1e6 }, u: path.image, g: portals[i].options.guid })
    }
}

/**
 * Opens the gallery dialog box
 * @public
 */
window.plugin.portalsGallery.open = () => {
    var self = window.plugin.portalsGallery;

    if ('iitc_gallery_row_length' in localStorage) {
        let rowLength = localStorage['iitc_gallery_row_length']
        if (rowLength === undefined || rowLength === 'undefined' || rowLength === null || rowLength === "null" || rowLength === ""){
            rowLength = 3;
            localStorage['iitc_gallery_row_length'] = rowLength;
        }
        window.plugin.portalsGallery.imagesPerRow = localStorage['iitc_gallery_row_length'];
    } else {
        console.log("not found in local storage")
        localStorage['iitc_gallery_row_length'] = window.plugin.portalsGallery.imagesPerRow;
    }

    self.collect();
    const width = (self.imagesPerRow * 250) + 150;
    dialog({
        html: '<div id="gallery-cnt"></div>',
        title: 'Portals Gallery',
        dialogClass: 'gallery-dialog',
        width: width,
        position: { my: 'left top', at: 'left+50 top+50'}
    });
    $('#gallery-cnt')
        .append($('<div>', { id: 'gallery-cnt-div', class: 'controls' })
            .append($('<label>', { text: 'Search query: ' }).append($('<input>', { type: 'search', id: 'gallery-search' })))
            .append($('<label>', { text: 'Sort by: ' }).append($('<select>', { id: 'gallery-sort' })
                .append($('<option>', { value: 't', text: 'title' }))
                .append($('<option>', { value: 'd', text: 'distance' }))
            ))
            .append($('<label>', { class: 'sort-distance', text: 'Distance relative ' }).append($('<input>', { id: 'sort-coords', type: 'search', placeholder: 'latitiude,longitude' })))
            .append($('<label>', { text: 'Images per row: ' }).append($('<select>', { id: 'row-length' })
            ))
        )
        .append($('<div>', { class: 'results' }))
        .append($('<div>', { id: 'gallery' }));

    for (let i = 3; i < 9; i++) {
        let option;
        if (i == self.imagesPerRow) {
            option = `<option selected=selected>${i}</option>`
        } else {
            option = `<option>${i}</option>`
        }
        $('#row-length').append(option);
    }

    makeTable(self.storage);

    $('#gallery-search').bind('input paste', () => self.doSearch(self.storage));
    $('#sort-coords').bind('input paste', () => makeTable(self.storage))
    $('#gallery-sort').bind('change', e => {
        self.sortmode = $(e.target).val();
        makeTable(self.storage);
    })
    $('#row-length').bind('change', e => {
        self.imagesPerRow = $(e.target).val();
        makeTable(self.storage);
        $('#gallery-cnt')[0].parentElement.parentElement.style["width"] = `${(self.imagesPerRow * 250) + 150}px`;
        localStorage['iitc_gallery_row_length'] = self.imagesPerRow;
    })
}

/**
 * Searches the matching to the query titles in the list of rendered portals
 * @public
 * @param {object[]} array An array of rendered portals - `window.plugin.portalsGallery.storage`
 */
window.plugin.portalsGallery.doSearch = (array) => {
    var query = $('#gallery-search').val(),
        result;
    if (!query) result = array;
    else result = array.filter(e => e.n.match(new RegExp(query, 'i')))
    makeTable(result)
}

/**
 * Generates a table of portals' photos, names, and coordinates
 * @private
 * @param {object[]} array An array of rendered portals - `window.plugin.portalsGallery.storage`
 */
function makeTable(array) {
    var self = window.plugin.portalsGallery;
    $('#gallery').empty();

    if (self.sortmode == 't') array = byTitle(array)
    else if (self.sortmode == 'd') array = byDistance(array)

    var rows = Math.ceil(array.length / self.imagesPerRow);
    if (array.length) $('.results').text(`The gallery shows ${array.length} portals`)
    else $('.results').text('There\'re no portals in the gallery')
    for (var i = 0; i < rows; i++) {
        $('#gallery').append($('<div>', { class: 'gallery-row', id: `gallery-row-${i}` }))
        for (var j = 0; j < self.imagesPerRow; j++) {
            var p = array[i * self.imagesPerRow + j];
            if (!p) return;
            const renderPortalLink = document.createElement('a');
            const guid = p.g;
            renderPortalLink.textContent = `${p.n}`;
            renderPortalLink.addEventListener('click', function(e) {
                window.renderPortalDetails(guid);
            });
            $(`#gallery-row-${i}`).append($('<div>')
                .append($('<img>', { src: p.u, width: 250, class: 'gallery-img' }))
                .append($('<span>', { class: 'gallery-coords', text: getCoords(p) }))
                .append(renderPortalLink)
            )
        }
    }
}

/**
 * Calculates the distance between two points as if the Earth would be flat.
 * Not very accurate, but small. Yes, I'm lazy
 * @private
 * @param {...[number, number]} points Takes any number of arrays with points' coordinates (`p` object in `window.plugin.portalsGallery.storage`) but uses only two first
 * @returns A distance between two points
 */
function distance(...points) {
    return Math.sqrt((points[0][0] - points[1][0]) ** 2 + (points[0][1] - points[1][1]) ** 2);
}

/**
 * Gets an array containing a latitude and a longitude of a portal
 * @param {object} portal An object of portal - one item of `window.plugin.portalsGallery.storage`
 * @returns {number[]} An array with latitude as first element and logitude as second
 */
function getCoords(portal) {
    return [portal.p.lt, portal.p.ln]
}

/**
 * Sorts the list of rendered portals by its names in alphabetic order
 * @private
 * @param {object[]} array An array of rendered portals - `window.plugin.portalsGallery.storage`
 * @returns {object[]} A sorted array of portals
 */
function byTitle(array) {
    return array.sort((a, b) => a.n.charCodeAt() - b.n.charCodeAt())
}

/**
 * Sorts the list of rendered portals by its distance to the specified point in descending order
 * @private
 * @param {object[]} array An array of rendered portals - `window.plugin.portalsGallery.storage`
 * @returns {object[]} A sorted array of portals
 */
function byDistance(array) {
    var result = [], raw = [],
        base = $('#sort-coords').val().split(',');
    if (!base[0] || !base[1]) base = [0, 0];
    array.forEach((e, n) => {
        raw.push([n, distance(base, getCoords(e))])
    })
    raw.sort((a, b) => a[1] - b[1]).forEach(e => {
        result.push(array[e[0]])
    })
    return result
}

/**
 * Appends the styles of the plugin to the `<head>` tag
 * @private
 */
function appendStyles() {
    $('head').append($('<style>', {
        id: 'portals-gallery-css', text: '.gallery-row {' +
            'display: flex;' +
            'justify-content: space-evenly;' +
            'align-items: baseline;' +
            'margin-bottom: 25px;' +
            '} .gallery-row > div {' +
            'max-width: 250px;' +
            'display: flex;' +
            'flex-direction: column;' +
            'align-items: center;' +
            '} .gallery-img {' +
            'display: block;' +
            'margin-bottom: 5px;' +
            '} .gallery-link {' +
            'display: block;' +
            'text-align: center;' +
            '} .sort-distance { display: block }' +
            '.gallery-dialog {max-width: 80%;}'
    }))
}

/**
 * Creates the button opening the gallery modal in the IITC's toolbox
 * @private
 */
function appendButton() {
    var self = window.plugin.portalsGallery;
    $('#toolbox').append($('<a>', { title: 'Open the gallery', text: 'Gallery' }).click(self.open))
}

var setup = function() {
    if (!Object.keys(window.portals).length) {
        var waitPortals = setInterval(() => {
            if (Object.keys(window.portals).length) {
                appendButton();
                appendStyles();
                clearInterval(waitPortals)
            }
        }, 1000)
    }
}

// PLUGIN END //////////////////////////////////////////////////////////
setup.info = plugin_info; //add the script info data to the function as a property
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);

// EOF
