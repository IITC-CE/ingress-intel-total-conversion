// ==UserScript==
// @author         633KYN35D with significant code from EisFrei
// @id             inventoryParser@633KYN35D
// @name           Inventory Parser
// @category       Info
// @version        0.0.5
// @namespace      https://github.com/633KYN35D/iitc-inventory-parser
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/633KYN35D/inventoryParser.user.js
// @homepageURL    https://github.com/633KYN35D/iitc-inventory-parser/
// @description    Parse Inventory from Ingress
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/633KYN35D/inventoryParser.meta.js
// @include        https://intel.ingress.com/*
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {

    // Make sure that window.plugin exists. IITC defines it as a no-op function,
    // and other plugins assume the same.
    if (typeof window.plugin !== "function") window.plugin = function () {
    };
    const KEY_SETTINGS = "plugin-inventory-parser";
    const displayNames = {
        FRACK: 'Portal Fracker',
        FW_RES: 'Fireworks - Resistance',
        FW_ENL: 'Fireworks - Enlightened',
        BN_BLM: 'Beacon - Black Lives Matter',
        ENL: 'Beacon - Enlightened',
        RES: 'Beacon - Resistance',
        MEET: 'Beacon - Meetup',
        NIA: 'Beacon - Niantic',
        TOASTY: 'Beacon - Toast',
        TARGET: 'Beacon - Target'
    };
    window.plugin.inventoryParser = function () {
    };
    const thisPlugin = window.plugin.inventoryParser;
    // Name of the IITC build for first-party plugins
    plugin_info.buildName = "inventoryParser";

    // Datetime-derived version of the plugin
    plugin_info.dateTimeVersion = "202102101447";

    // ID/name of the plugin
    plugin_info.pluginId = "inventoryParser";

    function checkSubscription(callback) {
        var versionStr = niantic_params.CURRENT_VERSION;
        var post_data = JSON.stringify({
            v: versionStr
        });
        var result = $.ajax({
            url: '/r/getHasActiveSubscription',
            type: 'POST',
            data: post_data,
            context: {},
            dataType: 'json',
            success: [(data) => callback(null, data)],
            error: [(data) => callback(data)],
            contentType: 'application/json; charset=utf-8',
            beforeSend: function (req) {
                req.setRequestHeader('accept', '*/*');
                req.setRequestHeader('X-CSRFToken', readCookie('csrftoken'));
            }
        });
        return result;
    }


    function addItemToCount(item, countMap, incBy, moniker) {
        var keyLoc = (moniker === undefined) ? 'general' : moniker;
        if (item[2] && item[2].resource && item[2].flipCard) {
            const key = `${item[2].resource.resourceType} ${item[2].flipCard.flipCardType}`;
            if (!countMap[key]) {
                countMap[key] = item[2].resource;
                countMap[key].count = 0;
                countMap[key].details = {};
            }
            countMap[key].displayName = (en[item[2].flipCard.flipCardType] !== undefined) ? en[item[2].flipCard.flipCardType] : item[2].flipCard.flipCardType;
            countMap[key].flipCardType = item[2].flipCard.flipCardType;
            countMap[key].count += incBy;
            if (!countMap[key].details[keyLoc]) countMap[key].details[keyLoc] = 0;
            countMap[key].details[keyLoc] += incBy;
        } else if (item[2] && item[2].resource) {
            var key = `${item[2].resource.resourceType} ${item[2].resource.resourceRarity}`;
            var displayName = (en[item[2].resource.resourceType] !== undefined) ? en[item[2].resource.resourceType] : item[2].resource.resourceType;
            if (item[2].resource.resourceType === "PLAYER_POWERUP") {
                key = item[2].playerPowerupResource.playerPowerupEnum;
                displayName = (en[item[2].playerPowerupResource.playerPowerupEnum] !== undefined) ? en[item[2].playerPowerupResource.playerPowerupEnum] : item[2].playerPowerupResource.playerPowerupEnum;
            }
            if (item[2].resource.resourceType === "PORTAL_POWERUP") {
                key = item[2].timedPowerupResource.designation;
                displayName = (en[item[2].timedPowerupResource.designation] !== undefined) ? en[item[2].timedPowerupResource.designation] : item[2].timedPowerupResource.designation;
            }
            if (!countMap[key]) {
                countMap[key] = item[2].resource;
                countMap[key].count = 0;
                countMap[key].details = {};
            }
            countMap[key].displayName = (displayNames[displayName] !== undefined) ? displayNames[displayName] : displayName;
            countMap[key].count += incBy;
            if (!countMap[key].details[keyLoc]) countMap[key].details[keyLoc] = 0;
            countMap[key].details[keyLoc] += incBy;
        } else if (item[2] && item[2].resourceWithLevels) {
            const key = `${item[2].resourceWithLevels.resourceType} ${item[2].resourceWithLevels.level}`;
            if (!countMap[key]) {
                countMap[key] = item[2].resourceWithLevels;
                countMap[key].count = 0;
                countMap[key].details = {};
            }
            countMap[key].displayName = (en[item[2].resourceWithLevels.resourceType] !== undefined) ? en[item[2].resourceWithLevels.resourceType] : item[2].resourceWithLevels.resourceType;
            countMap[key].count += incBy;
            if (!countMap[key].details[keyLoc]) countMap[key].details[keyLoc] = 0;
            countMap[key].details[keyLoc] += incBy;
        } else if (item[2] && item[2].modResource) {
            const key = `${item[2].modResource.resourceType} ${item[2].modResource.rarity}`;
            if (!countMap[key]) {
                countMap[key] = item[2].modResource;
                countMap[key].count = 0;
                countMap[key].details = {};
            }
            countMap[key].displayName = (en[item[2].modResource.resourceType] !== undefined) ? en[item[2].modResource.resourceType] : item[2].modResource.resourceType;
            countMap[key].count += incBy;
            if (!countMap[key].details[keyLoc]) countMap[key].details[keyLoc] = 0;
            countMap[key].details[keyLoc] += incBy;
        } else {
            console.log(item);
        }
    }

    function svgToIcon(str, s) {
        const url = ("data:image/svg+xml," + encodeURIComponent(str)).replace(/#/g, '%23');
        return new L.Icon({
            iconUrl: url,
            iconSize: [s, s],
            iconAnchor: [s / 2, s / 2],
            className: 'no-pointer-events', //allows users to click on portal under the unique marker
        })
    }

    function createIcons() {
        thisPlugin.keyIcon = svgToIcon(`<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-key" width="44" height="44" viewBox="0 0 24 24" stroke-width="2" stroke="#ffffff" fill="none" stroke-linecap="round" stroke-linejoin="round">
<circle cx="8" cy="15" r="4" />
<line x1="10.85" y1="12.15" x2="19" y2="4" />
<line x1="18" y1="5" x2="20" y2="7" />
<line x1="15" y1="8" x2="17" y2="10" />
</svg>`, 15);
    }

    function prepareItemCounts(data) {
        if (!data || !data.result) {
            return [];
        }
        const countMap = {};
        data.result.forEach((item) => {
            addItemToCount(item, countMap, 1);
            if (item[2].container) {
                item[2].container.stackableItems.forEach((item2) => {
                    addItemToCount(item2.exampleGameEntity, countMap, item2.itemGuids.length, item[2].moniker.differentiator);
                });
            }
        });
        const countList = Object.values(countMap);
        countList.sort((a, b) => {
            if (a.resourceType === b.resourceType) {
                if(a.level !== undefined || b.level !== undefined) {
                    if (a.level === undefined || b.level === undefined || a.level === b.level) {
                        return 0;
                    }
                    return a.level > b.level ? 1 : -1;
                }
                if(a.rarity !== undefined || b.rarity !== undefined) {
                    if (a.rarity === undefined || b.rarity === undefined || a.rarity === b.level) {
                        return 0;
                    }
                    return a.rarity > b.rarity ? 1 : -1;
                }
                return 0;
            }
            return a.resourceType > b.resourceType ? 1 : -1;
        });
        return countList;
    }

    thisPlugin.reSortKeys = function (element) {
        var index = $(element).data('index');
        var asc = ($(element).data('asc') === 'asc');
        thisPlugin.sortKeyList(index, asc);
        $('#inventoryList').html(displayInventoryHtml());
        $('#inventoryList table th[data-index="' + index + '"]').attr('data-asc', (asc) ? 'desc' : 'asc');
    }
    thisPlugin.sortKeyList = function (index, asc) {
        if (asc === undefined) {
            asc = true;
        }
        thisPlugin.keyCount.sort((a, b) => {
            var position;
            switch (index) {
                case 'name':
                    if (a.portalCoupler.portalTitle === b.portalCoupler.portalTitle) {
                        position = 0;
                    }
                    position = a.portalCoupler.portalTitle.toLowerCase() > b.portalCoupler.portalTitle.toLowerCase() ? 1 : -1;
                    break;
                case 'distance':
                    if (a.distance === b.distance) {
                        position = 0;
                    }
                    position = a.distance > b.distance ? 1 : -1;
                    break;
                case 'count':
                    if (a.count === b.count) {
                        position = 0;
                    }
                    position = a.count > b.count ? 1 : -1;
                    break;
            }
            if (asc === false && position !== 0) {
                position = (position === 1) ? -1 : 1;
            }
            return position;
        });
    }

    function HexToSignedFloat(num) {
        let int = parseInt(num, 16);
        if ((int & 0x80000000) === -0x80000000) {
            int = -1 * (int ^ 0xffffffff) + 1;
        }
        return int / 10e5;
    }

    function addKeyToCount(item, countMap, incBy, moniker) {
        if (item[2] && item[2].resource && item[2].resource.resourceType && item[2].resource.resourceType === 'PORTAL_LINK_KEY') {
            const key = `${item[2].portalCoupler.portalGuid}`;
            if (!countMap[key]) {
                countMap[key] = item[2];
                countMap[key].count = 0;
                countMap[key].capsules = [];
                countMap[key].details = {};
            }
            if (countMap[key].distance === undefined) {
                var portLoc = item[2].portalCoupler.portalLocation.split(',');
                countMap[key].distance = thisPlugin.getKmDistance(thisPlugin.currentLoc.lat, thisPlugin.currentLoc.lng, HexToSignedFloat(portLoc[0]), HexToSignedFloat(portLoc[1]));
            }
            var keyLoc = "general";
            if (moniker) {
                if (countMap[key].capsules.indexOf(moniker) === -1) {
                    countMap[key].capsules.push(moniker);
                }
                keyLoc = moniker;
            }
            if (!countMap[key].details[keyLoc]) {
                countMap[key].details[keyLoc] = 0;
            }
            countMap[key].details[keyLoc] += incBy;
            countMap[key].count += incBy;
        }
    }

    function prepareKeyCounts(data) {
        if (!data || !data.result) {
            return [];
        }
        const countMap = {};
        data.result.forEach((item) => {
            addKeyToCount(item, countMap, 1);
            if (item[2].container) {
                item[2].container.stackableItems.forEach((item2) => {
                    addKeyToCount(item2.exampleGameEntity, countMap, item2.itemGuids.length, item[2].moniker.differentiator);
                });
            }
        });
        const countList = Object.values(countMap);
        countList.sort((a, b) => {
            if (a.portalCoupler.portalTitle === b.portalCoupler.portalTitle) {
                return 0;
            }
            return a.portalCoupler.portalTitle.toLowerCase() > b.portalCoupler.portalTitle.toLowerCase() ? 1 : -1;
        });
        return countList;
    }

    function displayInventoryHtml() {
        return `<table id="inventoryGear">
<thead><tr><th class="">Item</th><th class="">Rarity</th><th class="">Count</th></tr></thead><tbody>
${thisPlugin.itemCount.map((el) => {
            return `<tr><td>${el.displayName}</td><td>${el.resourceRarity || el.rarity || el.level}</td><td>${el.count}</td></tr>`;
        }).join('')}
</tbody></table><hr/><table id="inventoryKeys"><thead><tr>
<th class="" data-index="distance" data-asc="asc" onclick="window.plugin.inventoryParser.reSortKeys(this)">Distance</th>
<th class="" data-index="name" data-asc="asc" onclick="window.plugin.inventoryParser.reSortKeys(this)">Portal</th>
<th class="">Capsules</th>
<th class="" data-index="count" data-asc="asc" onclick="window.plugin.inventoryParser.reSortKeys(this)">Count</th></tr></thead><tbody>
${thisPlugin.keyCount.map((el) => {
            return `<tr>
<td>${el.distance}</td>
<td><a href="#" onclick="zoomToAndShowPortal('${el.portalCoupler.portalGuid}',[${el.portalCoupler.portalLocation.split(',').map(e => {
                return HexToSignedFloat(e);
            }).join(',')}])">${el.portalCoupler.portalTitle}</a></td>
<td>${el.capsules.join(', ')}</td>
<td>${el.count}</td>
</tr>`;
        }).join('')}
</tbody></table><hr>
<button type="button" class="ui-button" onclick="window.plugin.inventoryParser.downloadKeys()">Download Key Inventory</button>
<button type="button" class="ui-button"  onclick="window.plugin.inventoryParser.downloadGear()">Download Gear Inventory</button>`
    }

    function displayInventory() {
        dialog({
            html: '<div id="inventoryList">' + displayInventoryHtml() + '</div>',
            title: 'Inventory',
            id: 'inventoryList',
            width: 'auto'
        });
    }

    function preparePortalKeyMap() {
        const keyMap = {};
        thisPlugin.keyCount.forEach((k) => {
            keyMap[k.portalCoupler.portalGuid] = k;
        });
        return keyMap;
    }

    function prepareData(data) {
        thisPlugin.itemCount = prepareItemCounts(data);
        thisPlugin.keyCount = prepareKeyCounts(data);
        thisPlugin.keyMap = preparePortalKeyMap();
    }

    function loadInventory() {

        if (!thisPlugin.currentLoc) {
            thisPlugin.currentLoc = map.getCenter();
        }
        try {
            const localData = JSON.parse(localStorage[KEY_SETTINGS]);
            if (localData && localData.expires > Date.now()) {
                prepareData(localData.data);
                return;
            }
        } catch (e) {
        }

        checkSubscription((err, data) => {
            if (data && data.result === true) {
                window.postAjax('getInventory', {
                    "lastQueryTimestamp": 0
                }, (data, textStatus, jqXHR) => {
                    localStorage[KEY_SETTINGS] = JSON.stringify({
                        data: data,
                        expires: Date.now() + 5 * 60 * 1000 // request data only once per five minutes, or we might hit a rate limit
                    });
                    prepareData(data);
                }, (data, textStatus, jqXHR) => {
                    console.error(data);
                });
            }
        });
    };

    function portalDetailsUpdated(p) {
        if (!thisPlugin.keyMap) {
            return;
        }
        const countData = thisPlugin.keyMap[p.guid];
        if (countData) {
            $(`<tr><td>${countData.count}</td><th>Keys</th><th></th><td></td></tr>`)
                .appendTo($('#randdetails tbody'));
        }
    }

    function addKeyToLayer(data) {
        const tileParams = window.getCurrentZoomTileParameters ? window.getCurrentZoomTileParameters() : window.getMapZoomTileParameters();
        if (tileParams.level !== 0) {
            return;
        }

        if (thisPlugin.keyMap && thisPlugin.keyMap[data.portal.options.guid] && !data.portal._keyMarker) {
            data.portal._keyMarker = L.marker(data.portal._latlng, {
                icon: thisPlugin.keyIcon,
                interactive: false,
                keyboard: false,
            }).addTo(thisPlugin.layerGroup);
        }
    }

    function removeKeyFromLayer(data) {
        if (data.portal._keyMarker) {
            thisPlugin.layerGroup.removeLayer(data.portal._keyMarker);
            delete data.portal._keyMarker;
        }
    }

    function checkShowAllIcons(data) {
        const tileParams = window.getCurrentZoomTileParameters ? window.getCurrentZoomTileParameters() : window.getMapZoomTileParameters();
        if (tileParams.level !== 0) {
            thisPlugin.layerGroup.clearLayers();
            for (let id in window.portals) {
                delete window.portals[id]._keyMarker;
            }
        } else {
            for (let id in window.portals) {
                addKeyToLayer({
                    portal: window.portals[id]
                });
            }
        }
    }

    thisPlugin.downloadKeys = function () {
        var dataArray = [];
        $.each(thisPlugin.keyMap, function (idx, portal) {
            var portKey = portal.portalCoupler;
            portKey.portalLocation = portKey.portalLocation.split(',').map(e => {
                return HexToSignedFloat(e);
            }).join(',')
            $.each(portal.details, function (cap, count) {
                portKey.capsule = (cap === 'general') ? '' : cap;
                portKey.count = count;
                dataArray.push(portKey);
            });
        });
        thisPlugin.downloadCSV(dataArray);
    };

    thisPlugin.downloadGear = function () {
        var dataArray = [];
        $.each(thisPlugin.itemCount, function (idx, item) {
            var itemLine = {}
            itemLine.resourceType = item.resourceType;
            itemLine.displayName = item.displayName;
            itemLine.level = (item.level !== undefined) ? item.level : '';
            itemLine.rarity = (item.resourceRarity !== undefined) ? item.resourceRarity : '';
            if (item.flipCardType !== undefined) {
                itemLine.resourceType = item.flipCardType;
            }
            $.each(item.details, function (cap, count) {
                itemLine.capsule = (cap === 'general') ? '' : cap;
                itemLine.count = count;
                dataArray.push(itemLine);
            });
        });
        thisPlugin.downloadCSV(dataArray);
    };

    thisPlugin.downloadCSV = function (dataArray) {
        var csvArray = [];
        var csvCols = [];
        $.each(dataArray, function (idx, row) {
            var csvRow = [];
            if (csvArray.length === 0) {
                $.each(row, function (col, val) {
                    csvCols.push(col);
                    csvRow.push(col);
                });
                csvArray.push(csvRow.join("\t"));
                csvRow = [];
            }
            $.each(csvCols, function (idxCol, colmn) {
                csvRow.push(row[colmn]);
            });
            csvArray.push(csvRow.join("\t"));
            csvRow = [];
        });
        var csvData = csvArray.join("\n");
        var link = document.createElement("a");
        link.download = 'inventory.csv';
        link.href = "data:text/csv," + escape(csvData);
        link.click();
    };

    thisPlugin.getKmDistance = function (lat1, lon1, lat2, lon2) {
        var R = 6371000; // radius of the earth in meters, https://en.wikipedia.org/wiki/Earth_radius
        var dLat = (lat2 - lat1) * Math.PI / 180; // Convert degrees to radians
        var dLon = (lon2 - lon1) * Math.PI / 180; // Convert degrees to radians
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = (R * c) / 100;
        d = Math.round(d) / 10;
        /*
        Math.round((6371000 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))))/100)/10;
        */
        // Distance in kilometers, rounded to 1 decimal.
        return d
    }

    function setup() {
        loadInventory();
        $('<a href="#">')
            .text('Inventory')
            .click(displayInventory)
            .appendTo($('#toolbox'));
        window.addHook('portalDetailsUpdated', portalDetailsUpdated);
        window.addHook('portalAdded', addKeyToLayer);
        window.addHook('portalRemoved', removeKeyFromLayer);
        window.map.on('zoom', checkShowAllIcons);
    }

    function delaySetup() {
        thisPlugin.layerGroup = new L.LayerGroup();
        window.addLayerGroup('Portal keys', thisPlugin.layerGroup, false);
        createIcons();

        setTimeout(setup, 1000); // delay setup and thus requesting data, or we might encounter a server error
    }

    delaySetup.info = plugin_info; //add the script info data to the function as a property

    if (window.iitcLoaded) {
        delaySetup();
    } else {
        if (!window.bootPlugins) {
            window.bootPlugins = [];
        }
        window.bootPlugins.push(delaySetup);
    }


}


(function () {
    const plugin_info = {};
    if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
        plugin_info.script = {
            version: GM_info.script.version,
            name: GM_info.script.name,
            description: GM_info.script.description
        };
    }
    // Greasemonkey. It will be quite hard to debug
    if (typeof unsafeWindow != 'undefined' || typeof GM_info == 'undefined' || GM_info.scriptHandler != 'Tampermonkey') {
        // inject code into site context
        const script = document.createElement('script');
        script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(plugin_info) + ');'));
        (document.body || document.head || document.documentElement).appendChild(script);
    } else {
        // Tampermonkey, run code directly
        wrapper(plugin_info);
    }
})();
