// ==UserScript==
// @author         DanielOnDiordna
// @name           Maps Route Planner
// @category       Navigate
// @version        3.0.0.20240307.220600
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/maps-route-planner.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/maps-route-planner.user.js
// @description    [danielondiordna-3.0.0.20240307.220600] Plan a route with multiple portals and open Google Maps (max 9 waypoints) or Apple Maps (iOS 16+ supports waypoints) to start your navigation.
// @id             maps-route-planner@DanielOnDiordna
// @namespace      https://softspot.nl/ingress/
// @homepageURL    https://softspot.nl/ingress/plugins/documentation/iitc-plugin-maps-route-planner.user.js.html
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.mapsrouteplanner = function() {};
    var self = window.plugin.mapsrouteplanner;
    self.id = 'mapsrouteplanner';
    self.title = 'Maps Route Planner';
    self.version = '3.0.0.20240307.220600';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 3.0.0.20240307.220600
- added support for Apple Maps, which supports waypoint since iOS 16+
- added a row highlighter for the selected portal in the dialogs
- shrunk the base64 google maps icon from 130x130 pixels to 16x16
- replaced jquery methods with vanilla javascript methods

version 2.1.1.20230307.232000
- fixed storing origin setting

version 2.1.0.20230108.201200
- maps button will now setup a route to a single portal when no route is planned

version 2.0.1.20220516.085200
- modified file export format from application/json to text/plain
- modified file import accept to text/*,application/json
- added some space between menu buttons

version 2.0.0.20220515.230000
- moved the waypoints editor to a separate menu
- added icons to the About text
- added notification titles to the controls button to select a portal, add or remove a waypoint
- added total waypoints indicator in the controls
- added row animation when moving waypoints up or down
- total incidator opens the waypoint editor menu
- changed the main menu layout to make things easier to use
- edit waypoints menu opens at to the top of the screen so when minimized it is easier to see the map
- added an option to show or hide characters on the waypoints
- added transfer menu, with waypoints copy/paste buttons and waypoints file import/export buttons
- added travelmode options

version 1.1.1.20220409.003100
- fixed clear all waypoints to actually store empty waypoints

version 1.1.0.20220409.000700
- added clickable waypoint names to select the portals
- added an edit checkbox to toggle up/down and delete buttons
- added move up/down buttons to order the waypoints list
- added more about information
- added a zoom all button
- changed the route color to light blue

version 1.0.0.20220407.231800
- first release
- controls buttons
- dialog menu
- create maps link
- copy link to clipboard
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;
    self.localstoragesettings = self.pluginname + '-settings';
    self.localstoragewaypoints = self.pluginname + '-wayppoints';

    self.maxwaypoints = 9;
    self.waypoints = {};
    self.waypointsroutelayer = undefined;

    self.settings = {
        origin: 'mylocation',
        routebackgroundcolor: '#1866d2',
        routeforegroundcolor: '#afcbfa',
        showchars: true,
        travelmode: '',
        showgooglemapsbutton: true,
        showapplemapsbutton: false
    };

    let iconplus = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAMAAADXqc3KAAAAWlBMVEUAAABAQEA8QEM8QEM9QEM8QEM8QEQ+QEM9QEM8QEM7QEM9QEI8QEM4QEA6QEA6QEI9QEI8QEI8QEQ8QEI7QEQ7QEI9QEQ7QEI7QEM6QEU8QEI8QEM8QEI8QEQtKiW6AAAAHnRSTlMAEG+v3//PX1Dv34+/IDBg339/73Bwj9+wMM+QgIDjtixxAAAApklEQVR4AZ3PBZLEQAwEwbZnysyM/3/moRaOIQMVYv1bEDoPkYv1VpJisjepHIqwlKq6gVZXHf0gM/ZMMjV9pauqJ9Erz2s9vPaQBtYw6z6hglHPHPHbxMiiZxHV20RJdosxFnyf8JRvR61stnx8m6ht+UjxNuHtzKC3FkuE2F9KSFddrSmxzE46yoQph65OyOJKKsMCdt2pG0yf6K3abeBdGOi/HgG26wa33olV8gAAAABJRU5ErkJggg==";
    let iconmin = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAMAAADXqc3KAAAASFBMVEUAAABAQEA8QEM8QEM9QEM8QEM+QEM6QEI8QEM7QEM9QEI8QEM4QEA6QEA9QEI9QEQ8QEI7QEQ7QEI7QEI4QEg7QEM6QEU8QEMGGXchAAAAGHRSTlMAEG+v3/9fYO/fj78gMN+P73Bw3yCwMJBqLeWcAAAAuklEQVR4AZ1RBxKEIBBDJHSw6/9feuqa61MNPdk6qNtodGsA09of3nkQ4UuKQNJZqeIq0H3y/aCIsX8rDn15W5UellcD2tMHvqHDdOxzmrmphFGEFlZeYZ4NkrgsjHRmyBXBYMrnFUEE4NhEEf7N8JgNEGYyDJUvfqqXsiIw+SjJp5yrJHdMPsorp8xNGXbY9Kyb0Jh4c/Drm189HQ5s8C8f7bHxKgqCLUcOnUCecBVE//eH19fqRt3FDujJB6LV1n2XAAAAAElFTkSuQmCC";
    let icongooglemaps = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAB3RJTUUH6AMHCjghutVYVQAAAAlwSFlzAAAewQAAHsEBw2lUUwAAAARnQU1BAACxjwv8YQUAAABFUExURf////b790i1ZF25dP///Xa4UPvEAPzGDj+zYEa1Zu1XSCyF7exRSVaV9lqY6FaU90mydfLCvyyF67LN82id8UeO6R6A7BFsVj8AAABjSURBVHjabY/bDoAgCEAJLUrDyrL//9TI5XXxADtnjAvAf+hwB12x894zX5mPyMxnEsZYCxvzXsQqmR0WQZItJqENkazALIDeWCoBPcNEgjhXl43YNECcqBuhUHXvYccwfPUBAtgCzufE2bMAAAAASUVORK5CYII="; // 16x16
    let iconapplemaps = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAB3RJTUUH6AMEFRwW9k9XXwAAAAlwSFlzAAAewQAAHsEBw2lUUwAAAARnQU1BAACxjwv8YQUAAAMaSURBVHjaVZNdaFxFFMd/M/fe/W67STRhDVKoUZKWYgOuVOoHFlNtrFUkRVGKIoJgwBcpFppSpUEQfFPoi/oi4pMILakY8UVLxURo81xSMNhukrZu3Oxu9u69M+O5d1H0cM/DzNzzm//5GIXYBxunJ7BqdkztGZ+79KL37XU/2eZAxTB96HtuqhUer00Qhl3alYaZ9y9eQbuZM+WzP/inbp861I3NHCg/0gZrFHGUxmNjiJ2hZtYJskEKGOjcrXUxeLgTb108efvks/qdzLuzu9WDfscYutYg/2OinsuSyFoacZta8SbOObbqIU+7w3IY+F3jZv08ufHngqOMqjFqdlWCnAS7fxVEQmmLpB/9n3h52xSdZkj2RoHj5eOsZdfGdSI9IY94IzzqH8BKsO3ankeWTmxoCWC58wcXivNkS9lUSbjRpbzW56fB8qWbVm4zkWIg0HiKHiCKaHa7co/il3iJlWCdI4MH2RXeSxzGqObVWy7aWcBIDbRWrEZ5rt7RGKvY229Zsuf5auM8SohKzv+xvM4xnBnCDy6t45ZF1v4BFsMdvDanuKsAxQCu1TWfPnWU8fwyl1tLKSRRkljbNKlHLbSVm93vm7gtj9cvKDbaML0PTlTlpw68/Z3mjfI0h3NP0I0lJRP/zwVgU/kLpsSdTchKPV4agyMj0B/0IJdXcrzZN8XHgyeo6MG0M4knbU8BiQqNS3v//P2wGcL1P+HVPb158OTMWcfu7H18Nvw+r+yYRKURyEAKwIm0qtlgKA8PVeDJz+HgFzDaL7XwZL0zTruUpJ9RAW/1H+PcPTPsygyjGh8uRrExftTncW1iH8e+8ak1e5Xuy8GXUyGPZL/Gbn+BIMgIRKWeWOTiWDXO/rpgnKtGUpB4dBvBMw/w21pW3gBUh7r4tTPk6h/hb3+MqHIOJ2n8xxa1JDAjzNjXHr7RdFoNxnKr7M2vErX+wqeJvCOC8GeKK1WC+ickD0ZSimXwZnT59P55z+lJT6mFIAiiYqFgS6WSeNEWigWbyXhWBsxqpaxyHZu79V6UvzG1IHuT5XJp/m8iDZjJpoey7gAAAABJRU5ErkJggg=="; // 16x16
    let iconmenu = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAB3RJTUUH5QgWEyMyp0FY2wAAAAlwSFlzAAALEwAACxMBAJqcGAAAAARnQU1BAACxjwv8YQUAAAKoSURBVHja7Zo/SFxBEMb3GQvFIpoY6yjcgdgmRVKYwlJBSaugYKmNNsYEDAmIYmMEa4OgpYWo2AkKVlqr3IFa+zcWEpvk+Y1vrzm5Y+e4ZVZvfjDsO7hl5/vuvd3ZfWeMoiiKoiiKolQkEefLqVQqymQycTqdfoGPs4hexCthDVeIZcQIcvuH3KJsNht7MSCOY4MBXuNyEdEpLDyfDUQ/TLiMIndZ3DuAfvnVAMXnWEd04w7479qhijnAbMDiiS6bozNcA/qkFZY7R64B9dLqHGjwacCJtDoHjn0aMIm4k1ZYhL82Rz8GYIlZQDMjrbIIM8jxN6cDuw4gUAuMoPmCaJJWbDlDTEH8rwdRHusAugtyJjSieW/CqAT3kNeFzcugDnDuXM0djQYg7ICbwuIf5aUoPFhzAEHzAJGbC0Ih9whwnn+2AfniMWgdmhph7XfI57ZUE9iTIInHQK24HEe0I14KG3CDfHZMsgwecifDUs4DOnC5EoDwR0YgPsOELZ91QJtJ9txvpdUW4BTRiUfgwLUDdy8wH7B4Y3Ob53TgGvBRWmG5c+Qa8OzgGrArnXC5c+QaMGySiSZUTmyOfgzAEkOz66BJlpzQ+EO5US3A6cQqhKjIoHUW7QeTnAd8MvL1AP0Y2yYphI68FkLPsRSu+M2QUumUNAcQoT4ChPftsB3wDZp3JoxD0X3kdZ5vhAulHouPohkzYR2LT8OEhxej3rbD9jzgBy4npBUX4CdM+O7zPICqQNpuSq/9haBXY0OYA5zfDnH3Al8DFk/UIr5xOnANaJZW6ECLTwOupdU5cOXTgCVpdeXOkWsAvRVel1ZYhDXEqDcDsMTQv6/6AzWBxA/YHP0YQH9CxAD0jHUj5hCX0qptDpRLD+VGOUonpCiKoiiKoihPgHtXV96aolVzHAAAAABJRU5ErkJggg==";

    self.restoresettings = function() {
        // read stored data in a very safe way:
        function isObject(element) {
            return (typeof element == 'object' && element instanceof Object && !(element instanceof Array));
        }

        function parseSettings(source,target) {
            if (!isObject(source) || !isObject(target)) return;

            for (const key in target) {
                if (key in source) {
                    if (isObject(target[key])) {
                        parseSettings(source[key],target[key]);
                    } else if (typeof source[key] == typeof target[key]) { // only accept settings from default settings template of same type
                        target[key] = source[key];
                    }
                }
            }
        }

        try {
            if (Object.keys(localStorage).includes(self.localstoragesettings)) {
                let storedsettings = JSON.parse(localStorage.getItem(self.localstoragesettings));
                parseSettings(storedsettings,self.settings);
            }
        } catch(e) {
            localStorage.removeItem(self.localstoragesettings);
            return false;
        }
    };
    self.storesettings = function() {
        try {
            return localStorage.setItem(self.localstoragesettings, JSON.stringify(self.settings));
        } catch(error) {
            alert(self.title + " - store settings failed\n" + error.toString());
        }
    };

    self.restoreWaypoints = function() {
        // read stored data in a very safe way:
        try {
            if (Object.keys(localStorage).includes(self.localstoragewaypoints)) {
                let data = localStorage.getItem(self.localstoragewaypoints);
                self.import(data);
            }
        } catch(error) {
            alert(self.title + " - Restore waypoints failed\n" + error.toString());
        }
    };
    self.storeWaypoints = function() {
        try {
            return localStorage.setItem(self.localstoragewaypoints, JSON.stringify(self.waypoints));
        } catch(error) {
            alert(self.title + " - Store waypoints failed\n" + error.toString());
        }
    };

    self.import = function(data) {
        if (!data) return;
        try {
            let waypoints = JSON.parse(data);
            if (typeof waypoints == 'object' && !(waypoints instanceof Array)) {
                self.waypoints = {};
                for (const guid in waypoints) {
                    if (waypoints[guid]?.latlng?.lat && waypoints[guid]?.latlng?.lng && waypoints[guid]?.name) {
                        self.waypoints[guid] = {
                            latlng: {
                                lat: waypoints[guid].latlng.lat,
                                lng: waypoints[guid].latlng.lng
                            },
                            name: waypoints[guid].name
                        }
                    }
                }
            }
        } catch(error) {
            alert(self.title + " - Import waypoints failed\n" + error.toString());
        }
    }

    self.drawRoute = function() {
        // remove existing route:
		self.waypointsroutelayer.eachLayer(function(layer) {
			self.waypointsroutelayer.removeLayer(layer);
		}, this);

        // backgroundpath:
        let backgroundcolor = self.settings.routebackgroundcolor;
        let latlngs = [];

        for (let guid in self.waypoints) {
            let waypoint = self.waypoints[guid];
            let ll = [waypoint.latlng.lat, waypoint.latlng.lng];
            latlngs.push(ll);

            let backgroundmarker = window.L.circleMarker(ll, {
                radius: (latlngs.length == 1 ? 12.0 : 9.0), // make the first one larger
                weight: 1,
                opacity: 1,
                color: backgroundcolor,
                fillColor: backgroundcolor,
                fillOpacity: 1.0,
                dashArray: null,
                background: true,
                interactive: false
            });
            self.waypointsroutelayer.addLayer(backgroundmarker);
        }

        let backgroundline = window.L.geodesicPolyline(latlngs, {
            color: backgroundcolor,
            opacity: 1,
            weight: 10,
            background: true,
            interactive: false,
            dashArray: undefined
        });
        self.waypointsroutelayer.addLayer(backgroundline);

        // foregroundpath:
        let foregroundcolor = self.settings.routeforegroundcolor;
        latlngs = [];
        for (let guid in self.waypoints) {
            let waypoint = self.waypoints[guid];
            let ll = [waypoint.latlng.lat, waypoint.latlng.lng];
            latlngs.push(ll);

			let foregroundmarker = window.L.circleMarker(ll, {
					radius: (latlngs.length == 1 ? 10.0 : 7.0), // make the first one larger
					weight: 1,
					opacity: 1,
					color: foregroundcolor,
					fill: true,
					fillColor: foregroundcolor,
					fillOpacity: 1.0,
					dashArray: null,
					background: false,
					interactive: false
				});
			self.waypointsroutelayer.addLayer(foregroundmarker);
		}

		let foregroundline = window.L.geodesicPolyline(latlngs, {
			color: foregroundcolor,
			opacity: 1,
			weight: 5,
			background: false,
			interactive: false,
			dashArray: undefined
		});
		self.waypointsroutelayer.addLayer(foregroundline);

        if (self.settings.showchars) {
            let charcnt = 'A'.charCodeAt(0);
            for (let guid in self.waypoints) {
                let waypoint = self.waypoints[guid];
                let ll = [waypoint.latlng.lat, waypoint.latlng.lng];

                let icon = new window.L.DivIcon({
                    html: String.fromCharCode(charcnt),
                    className: self.id + '-waypoint-numbers',
                    iconSize: [22,22]
                });
                charcnt++;
                window.L.marker(ll, {
                    icon: icon,
                    interactive: false,
                    keyboard: false,
                    width: '35px'
                }).addTo(self.waypointsroutelayer);
            }
        }
    };

    self.getGoogleMapsLink = function() {
        let link = "https://www.google.com/maps/dir/?api=1"; // maps.google.com did not work on android
        let latlngwaypoints = [];
        for (let guid in self.waypoints) {
            let latlng = self.waypoints[guid].latlng;
            latlngwaypoints.push(latlng.lat + "," + latlng.lng);
        }
        if (!latlngwaypoints.length && window.selectedPortal) {
            let latlng = window.portals[window.selectedPortal].getLatLng();
            latlngwaypoints.push(latlng.lat + "," + latlng.lng);
        }
        if (latlngwaypoints.length > 0) {
            link += '&destination=' + latlngwaypoints.pop(); // only=first=last
        }
        if (latlngwaypoints.length > 0 && self.settings.origin == 'firstportal') {
            link += '&origin=' + latlngwaypoints.shift();
        }
        if (self.settings.travelmode) {
            link += '&travelmode=' + self.settings.travelmode;
        }
        if (latlngwaypoints.length > 0) {
            link += '&waypoints=' + latlngwaypoints.join('|').replaceAll(',','%2C').replaceAll('|','%7C');
        }
        return link;
    };
    self.getAppleMapsLink = function() {
        let link = "https://maps.apple.com/?";

        let latlngwaypoints = [];
        for (let guid in self.waypoints) {
            let latlng = self.waypoints[guid].latlng;
            latlngwaypoints.push(`daddr=${latlng.lat},${latlng.lng}`);
        }
        if (!latlngwaypoints.length && window.selectedPortal) {
            let latlng = window.portals[window.selectedPortal].getLatLng();
            latlngwaypoints.push(`daddr=${latlng.lat},${latlng.lng}`);
        }
        // dirflg d (by car) w (by foot) r (by public transit)
        if (self.settings.travelmode) { // driving,walking,bicycling,transit
            link += 'dirflg=' + self.settings.travelmode.substr(0,1);
        }
        if (latlngwaypoints.length > 0 && self.settings.origin == 'firstportal') {
            if (link.substr(-1) != '?') link += '&';
            link += latlngwaypoints.shift().replace('daddr','saddr');
        }
        if (latlngwaypoints.length > 0) {
            if (link.substr(-1) != '?') link += '&';
            link += latlngwaypoints.join('&');
        }
        return link;
    };

    self.highlightDialogPortal = function(data) {
        let waypointsdiv = document.querySelector(`div[name=${self.id}-waypoints-div]`) || document.querySelector(`div[name=${self.id}-waypoints-edit-div]`);
        if (!waypointsdiv) return;
        waypointsdiv.querySelector(`.${self.id}-selectedportalrow`)?.classList.remove(`${self.id}-selectedportalrow`); // remove formatting if any found
        if (window.selectedPortal) waypointsdiv.querySelector(`a[guid="${window.selectedPortal}"]`)?.classList.add(`${self.id}-selectedportalrow`); // add formatting if guid found
    };

    self.updateMenu = function() {
        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        self.animating = false;
        async function swaptopbottom(topelement,bottomelement,delay) {
            self.animating = true;
            console.log(topelement,bottomelement);
            // animate movement
            let elementWidth = topelement.clientWidth - 6;
            let rowHeight = topelement.clientHeight + 4;
            let animationLength = delay;
            topelement.setAttribute('style', `width:${elementWidth}px; transform: translate(0px, ${rowHeight}px); transition: transform ${animationLength}ms`);
            bottomelement.setAttribute('style', `width:${elementWidth}px; transform: translate(0px, -${rowHeight}px); transition: transform ${animationLength}ms`);

            await sleep(delay);
            self.animating = false;
        };

        let waypointsdiv = document.querySelector(`div[name=${self.id}-waypoints-div]`) || document.querySelector(`div[name=${self.id}-waypoints-edit-div]`);
        let editmodus = document.querySelector(`div[name=${self.id}-waypoints-edit-div]`);
        if (waypointsdiv) {
            while (waypointsdiv.childElementCount > 0) { // clear old rows
                waypointsdiv.childNodes[0].remove();
            }
            let charcnt = 'A'.charCodeAt(0);
            let cnt = 0;
            for (let guid in self.waypoints) {
                let portalrow = waypointsdiv.appendChild(document.createElement('div'));
                portalrow.className = `${self.id}-waypoints-row`;
                portalrow.setAttribute('guid',guid);

                if (editmodus) {
                    let upbutton = portalrow.appendChild(document.createElement('input'));
                    upbutton.type = 'button';
                    upbutton.value = '↑';
                    if (cnt == 0) upbutton.disabled = true;
                    let downbutton = portalrow.appendChild(document.createElement('input'));
                    downbutton.type = 'button';
                    downbutton.value = '↓';
                    if (cnt + 1 == Object.keys(self.waypoints).length) downbutton.disabled = true;

                    upbutton.addEventListener('click',async function(e) {
                        if (self.animating) return;
                        this.classList.add(`${self.id}-buttonclicked`);

                        // move selected guid up:
                        let selectedguid = guid;
                        if (!(selectedguid in self.waypoints)) return; // something went wrong!
                        let waypointkeys = Object.keys(self.waypoints);
                        let guidindex = waypointkeys.indexOf(selectedguid);
                        if (guidindex-1 < 0) return; // already the top guid
                        let targetguid = waypointkeys[guidindex-1]; // needed for the animation
                        waypointkeys[guidindex-1] = waypointkeys.splice(guidindex, 1, waypointkeys[guidindex-1])[0];
                        let source = {...self.waypoints};
                        self.waypoints = {};
                        for (let guid of waypointkeys) {
                            self.waypoints[guid] = source[guid];
                        }
                        self.storeWaypoints();
                        self.updateControls();
                        self.drawRoute();

                        // animate rows:
                        let thisrow = waypointsdiv.querySelector(`a[guid="${selectedguid}"]`);
                        let previousrow = waypointsdiv.querySelector(`a[guid="${targetguid}"]`);
                        await swaptopbottom(previousrow,thisrow,600);

                        self.updateMenu();
                    },false);

                    downbutton.addEventListener('click',async function(e) {
                        if (self.animating) return;
                        this.classList.add(`${self.id}-buttonclicked`);

                        // move selected guid down:
                        let selectedguid = guid;
                        if (!(selectedguid in self.waypoints)) return; // something went wrong!
                        let waypointkeys = Object.keys(self.waypoints);
                        let guidindex = waypointkeys.indexOf(selectedguid);
                        if (guidindex+1 >= waypointkeys.length) return; // already the bottom guid
                        let targetguid = waypointkeys[guidindex+1]; // needed for the animation
                        waypointkeys[guidindex+1] = waypointkeys.splice(guidindex, 1, waypointkeys[guidindex+1])[0];
                        let source = {...self.waypoints};
                        self.waypoints = {};
                        for (let guid of waypointkeys) {
                            self.waypoints[guid] = source[guid];
                        }
                        self.storeWaypoints();
                        self.updateControls();
                        self.drawRoute();

                        // animate rows:
                        let thisrow = waypointsdiv.querySelector(`a[guid="${selectedguid}"]`);
                        let nextrow = waypointsdiv.querySelector(`a[guid="${targetguid}"]`);
                        await swaptopbottom(thisrow,nextrow,600);

                        self.updateMenu();
                    },false);
                }

                let waypointchar = portalrow.appendChild(document.createElement('span'));
                waypointchar.className = `${self.id}-waypoints-row-char`;
                waypointchar.innerText = String.fromCharCode(charcnt);
                let a = portalrow.appendChild(document.createElement('a'));
                a.className = `${self.id}-waypoints-row-link`;
                a.setAttribute('href','#');
                a.setAttribute('guid',guid);
                a.innerText = self.waypoints[guid].name;
                a.addEventListener('click',function(e) {
                    e.preventDefault();
                    let position = new window.L.LatLng(self.waypoints[guid].latlng.lat,self.waypoints[guid].latlng.lng);
                    if (guid in window.portals) {
                        if (!window.map.getBounds().contains(position)) window.map.setView(position);
                        window.renderPortalDetails(guid);
                    } else {
                        window.selectPortalByLatLng(position);
                    }
                    return false;
                },false);

                if (editmodus) {
                    let deletebutton = portalrow.appendChild(document.createElement('input'));
                    deletebutton.type = 'button';
                    deletebutton.value = 'X';
                    deletebutton.addEventListener('click',function(e) {
                        if (!confirm('Are you sure you want to delete waypoint ' + waypointchar.innerText + "?\n\n" + self.waypoints[guid].name)) return;
                        delete(self.waypoints[guid]);
                        self.storeWaypoints();
                        self.updateMenu();
                        self.updateControls();
                        self.drawRoute();
                    },false);
                }

                charcnt++;
                cnt++;
            }
            if (!cnt) {
                let portalrow = waypointsdiv.appendChild(document.createElement('div'));
                portalrow.innerHTML = 'There are no waypoints defined.<br>\nSelect a portal and mark as a waypoint from the controls toolbar.';
            }
            self.highlightDialogPortal();
        }
    };

    self.about = function() {
        let container = document.createElement('div');
        container.innerHTML = `
        <input type="hidden" autofocus>
        <p>Thank you for using the ${self.title} plugin.<br>
        With this plugin you can plan a route with multiple portals and open Google Maps to start your navigation.</p>
        <p>Start by selecting your first destination portal. Click the <img src="${iconplus}" width="16" height="16" style="background-color: white;"> on the control buttons toolbar. A route marker will be drawn.<br>
        Select your next destination portal and click the <img src="${iconplus}" width="16" height="16" style="background-color: white;"> button again. A route will be drawn.<br>
        Click the <img src="${iconmin}" width="16" height="16" style="background-color: white;"> button to remove a selected waypoint.<br>
        Continue with more portals, up to ${self.maxwaypoints} portals.<br>
        Click on the <img src="${icongooglemaps}" width="16" height="16" style="background-color: white;"> Maps marker to open the route in Google Maps</p>
        Click on the <img src="${iconapplemaps}" width="16" height="16" style="background-color: white;"> Maps marker to open the route in Apple Maps. Be aware that routes with waypoints are only support from iOS 16 and up!</p>
        <p>From the menu you can edit the waypoints list. You can move waypoints up or down, or delete a single waypoint. You can also clear all waypoints.</p>
        <p>You can also share the Maps URL to share or store for later use.</p>
        <p>Share this plugin with this link: <a href="https://softspot.nl/ingress/#iitc-plugin-maps-route-planner.user.js" target="_blank">Softspot IITC plugins</a> to get the latest version.</p>
        <div style="margin-top: 14px; font-style: italic; font-size: smaller;">${self.title} version ${self.version} by ${self.author}</div>
        `;
        window.dialog({
            html: container,
            id: self.pluginname + '-dialog',
            dialogClass: 'ui-dialog-' + self.pluginname,
            title: self.title + ' - About',
            width: 'auto'
        }).dialog('option', 'buttons', {
            '< Main menu': function() { self.menu(); },
            'Changelog': function() { alert(self.changelog); },
            'Close': function() { $(this).dialog('close'); }
        });
    };

    self.timestamp = function() {
        function leadingzero(value) {
            return ('0' + value).slice(-2);
        }
        let d = new Date();
        return d.getFullYear() + leadingzero(d.getDate()) + leadingzero(d.getMonth()) + '_' + leadingzero(d.getHours()) + leadingzero(d.getMinutes());
    };

    self.transfermenu = function() {
        let container = document.createElement('div');
        container.className = self.id + '-transfer-menu';
        container.innerHTML = `
        <input type="hidden" autofocus>
        <input type="button" name="share-googlemaps-button" value="Share Google Maps URL"><br>
        <input type="button" name="share-applemaps-button" value="Share Apple Maps URL"><br>
        <input type="button" name="copy-button" value="Export waypoints (copy)"><br>
        <input type="button" name="paste-button" value="Import waypoints (paste)"><br>
        <input type="button" name="export-button" value="Save waypoints to file"><br>
        <input type="button" name="import-button" value="Import waypoints from file"><br>
        <input type="button" name="zoom-button" value="Zoom to waypoints"><br>
        <input type="button" name="edit-button" value="Edit waypoints"><br>
        <input type="button" name="clear-button" value="Clear all waypoints">
        <div style="margin-top: 14px; font-style: italic; font-size: smaller;">${self.title} version ${self.version} by ${self.author}</div>
        `;

        container.querySelector(`input[name=share-googlemaps-button]`).addEventListener('click',function(e) {
            let link = self.getGoogleMapsLink();
            if (typeof android !== 'undefined' && android?.shareString) {
                return android.shareString(link);
            } else if (navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(link).then(() => {
                    alert('Google Maps URL copied to clipboard');
                }).catch(() => {
                    alert("I'm sorry, link copy failed (does not work on mobile)");
                });
            } else {
                alert("I'm sorry, link copy not available");
            }
        },false);
        container.querySelector(`input[name=share-applemaps-button]`).addEventListener('click',function(e) {
            let link = self.getAppleMapsLink();
            if (typeof android !== 'undefined' && android?.shareString) {
                return android.shareString(link);
            } else if (navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(link).then(() => {
                    alert('Apple Maps URL copied to clipboard');
                }).catch(() => {
                    alert("I'm sorry, link copy failed (does not work on mobile)");
                });
            } else {
                alert("I'm sorry, link copy not available");
            }
        },false);
        container.querySelector(`input[name=copy-button]`).addEventListener('click',function(e) {
            let data = JSON.stringify(self.waypoints);
            if (typeof android !== 'undefined' && android?.shareString) {
                return android.shareString(data);
            } else if (navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(data).then(() => {
                    alert('Waypoints JSON data copied to clipboard');
                }).catch(() => {
                    alert("I'm sorry, copy failed (does not work on mobile)");
                });
            } else {
                alert("I'm sorry, copy not available");
            }
        },false);
        container.querySelector(`input[name=paste-button]`).addEventListener('click',function(e) {
            let data = prompt("Paste waypoints JSON data:");
            if (!data) return;
            self.import(data);
            self.storeWaypoints();
            self.updateControls();
            self.drawRoute();
        },false);
        container.querySelector(`input[name=export-button]`).addEventListener('click',function(e) {
            let filename = "IITC-" + self.id + '_waypointsdata_' + self.timestamp() + ".json";
            var data = JSON.stringify(self.waypoints);
            if (typeof window.saveFile == 'function') { // iitc-ce method
                window.saveFile(data, filename, "text/plain"); // "application/json"
            } else if (!window.isSmartphone()) { // pc method
                let a = document.createElement('a');
                a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(data); // text/json
                a.download = filename;
                a.click();
            } else if (typeof android !== 'undefined' && android && android.saveFile) { // iitc-me method
                android.saveFile(filename, "text/plain", data); // application/json
            } else {
                alert("I'm sorry, save not available");
            }
        },false);
        container.querySelector(`input[name=import-button]`).addEventListener('click',function(e) {
            window.L.FileListLoader.loadFiles({accept:'application/json,text/plain'}) // application/json
                .on('load',function (e) {
                try {
                    self.import(e.reader.result);
                    self.storeWaypoints();
                    self.updateControls();
                    self.drawRoute();
                } catch(e) {
                    alert("I'm sorry, file import failed");
                }
            });
        },false);
        container.querySelector(`input[name=zoom-button]`).addEventListener('click',function(e) {
            if (!Object.keys(self.waypoints).length) return;
            window.map.fitBounds(self.waypointsroutelayer.getBounds());
        },false);
        container.querySelector(`input[name=edit-button]`).addEventListener('click',function(e) {
            self.waypointsmenu();
        },false);
        container.querySelector(`input[name=clear-button]`).addEventListener('click',function(e) {
            if (Object.keys(self.waypoints).length == 0) return;
            if (!confirm('Are you sure you want to clear all (' + Object.keys(self.waypoints).length + ') waypoints?')) return;
            self.waypoints = {};
            self.storeWaypoints();
            self.updateControls();
            self.drawRoute();
        },false);

        window.dialog({
            html: container,
            id: self.pluginname + '-dialog',
            dialogClass: 'ui-dialog-' + self.pluginname,
            title: self.title + ' - Transfer',
            width: 'auto'
        }).dialog('option', 'buttons', {
            '< Main menu': function() { self.menu(); },
            'Close': function() { $(this).dialog('close'); }
        });
    };

    self.waypointsmenu = function() {
        let container = document.createElement('div');
        container.innerHTML = `
        <input type="hidden" autofocus>
        Change order or delete waypoints:<br>
        <div name="${self.id}-waypoints-edit-div"></div>
        <input type="button" name="reverse-button" value="Reverse route">
        <input type="button" name="zoom-button" value="Zoom to waypoints"><br>
        <input type="button" name="clear-button" value="Clear all waypoints">
        <div style="margin-top: 14px; font-style: italic; font-size: smaller;">${self.title} version ${self.version} by ${self.author}</div>
        `;

        container.querySelector(`input[name=reverse-button]`).addEventListener('click',function(e) {
            if (Object.keys(self.waypoints).length == 0) return;

            let waypointkeys = Object.keys(self.waypoints);
            waypointkeys = waypointkeys.reverse();
            let source = {...self.waypoints};
            self.waypoints = {};
            for (let guid of waypointkeys) {
                self.waypoints[guid] = source[guid];
            }

            self.storeWaypoints();
            self.updateMenu();
            self.updateControls();
            self.drawRoute();
        },false);
        container.querySelector(`input[name=zoom-button]`).addEventListener('click',function(e) {
            if (!Object.keys(self.waypoints).length) return;
            window.map.fitBounds(self.waypointsroutelayer.getBounds());
        },false);
        container.querySelector(`input[name=clear-button]`).addEventListener('click',function(e) {
            if (Object.keys(self.waypoints).length == 0) return;
            if (!confirm('Are you sure you want to clear all (' + Object.keys(self.waypoints).length + ') waypoints?')) return;
            self.waypoints = {};
            self.storeWaypoints();
            self.updateMenu();
            self.updateControls();
            self.drawRoute();
        },false);

        let position = { my: "center", at: "top" };
        window.dialog({
            html: container,
            id: self.pluginname + '-dialog',
            dialogClass: 'ui-dialog-' + self.pluginname,
            title: self.title + ' - Edit waypoints',
            width: 'auto',
            position: position
        }).dialog('option', 'buttons', {
            '< Main menu': function() { self.menu(); },
            'Close': function() { $(this).dialog('close'); }
        });

        self.updateMenu();
        self.drawRoute(); // brings route to top
    }

    self.menu = function() {
        let container = document.createElement('div');
        container.className = self.id + '-main-menu';
        container.innerHTML = `
        <input type="hidden" autofocus>
        Mark portals as waypoints to prepare a route (use max ${self.maxwaypoints} waypoints).<br>
        Waypoints:
        <div name="${self.id}-waypoints-div"></div>
        <input type="button" name="zoom-button" value="Zoom to waypoints"> <input type="button" name="edit-button" value="Edit waypoints"><br>
        <label><input type="checkbox" name="showgooglemapsbutton-checkbox">Show Google Maps control button</label><br>
        <input type="button" name="link-google-button" style="background-image: url(${icongooglemaps}); background-size: 16px; background-repeat: no-repeat; cursor: pointer; padding-left: 16px; vertical-align: middle;" value="Open waypoints route in Google Maps"> <input type="button" name="share-google-button" value="Share Google Maps URL"><br>
        <label><input type="checkbox" name="showapplemapsbutton-checkbox">Show Apple Maps control button</label><br>
        <input type="button" name="link-apple-button" style="background-image: url(${iconapplemaps}); background-size: 16px; background-repeat: no-repeat; cursor: pointer; padding-left: 16px; vertical-align: middle;" value="Open waypoints route in Apple Maps"> <input type="button" name="share-apple-button" value="Share Apple Maps URL"><br>
        Travelmode: <select name="travelmode-select"></select><br>
        <label><input type="radio" name="origin-radio" value="mylocation">Use your location as origin (default)</label><br>
        <label><input type="radio" name="origin-radio" value="firstportal">Use first portal as origin (maps preview modus)</label><br>
        <label><input type="checkbox" name="showchars-checkbox">Show alphabetical characters on waypoints</label><br>
        <div style="margin-top: 14px; font-style: italic; font-size: smaller;">${self.title} version ${self.version} by ${self.author}</div>
        `;

        let travelmodeselect = container.querySelector(`select[name=travelmode-select]`);
        for (const travelmode of ['','driving','walking','bicycling','transit']) {
            let option = travelmodeselect.appendChild(document.createElement('option'));
            option.value = travelmode;
            option.text = (!travelmode?'use relevant mode':travelmode);
            option.selected = (option.value == self.settings.travelmode);
        }
        travelmodeselect.addEventListener('change', function(e) {
            e.preventDefault();
            self.settings.travelmode = this.value;
            self.storesettings();
        },false);

        container.querySelector(`input[name=origin-radio][value='${self.settings.origin}']`).checked = true;
        container.querySelectorAll(`input[name=origin-radio]`).forEach((el)=>{
            el.addEventListener('click',function(e) {
                self.settings.origin = this.value;
                self.storesettings();
                self.updateMenu();
            },false)});
        container.querySelector(`input[name=zoom-button]`).addEventListener('click',function(e) {
            if (!Object.keys(self.waypoints).length) return;
            window.map.fitBounds(self.waypointsroutelayer.getBounds());
        },false);
        container.querySelector(`input[name=edit-button]`).addEventListener('click',function(e) {
            self.waypointsmenu();
        },false);
        container.querySelector(`input[name=share-google-button]`).addEventListener('click',function(e) {
            let link = self.getGoogleMapsLink();
            if (typeof android !== 'undefined' && android?.shareString) {
                return android.shareString(link);
            } else if (navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(link).then(() => {
                    alert('Google Maps URL copied to clipboard');
                }).catch(() => {
                    alert("I'm sorry, link copy failed (does not work on mobile)");
                });
            } else {
                alert("I'm sorry, link copy not available");
            }
        },false);
        container.querySelector(`input[name=link-google-button]`).addEventListener('click',function(e) {
            let link = self.getGoogleMapsLink();
            window.open(link,'_blank');
        },false);
        container.querySelector(`input[name=share-apple-button]`).addEventListener('click',function(e) {
            let link = self.getAppleMapsLink();
            if (typeof android !== 'undefined' && android?.shareString) {
                return android.shareString(link);
            } else if (navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(link).then(() => {
                    alert('Apple Maps URL copied to clipboard');
                }).catch(() => {
                    alert("I'm sorry, link copy failed (does not work on mobile)");
                });
            } else {
                alert("I'm sorry, link copy not available");
            }
        },false);
        container.querySelector(`input[name=link-apple-button]`).addEventListener('click',function(e) {
            let link = self.getAppleMapsLink();
            window.open(link,'_blank');
        },false);

        container.querySelector(`input[name=showchars-checkbox]`).checked = self.settings.showchars;
        container.querySelector(`input[name=showchars-checkbox]`).addEventListener('change',function(e) {
            self.settings.showchars = this.checked;
            self.storesettings();
            self.drawRoute();
        },false);

        container.querySelector(`input[name=showgooglemapsbutton-checkbox]`).checked = self.settings.showgooglemapsbutton;
        container.querySelector(`input[name=showgooglemapsbutton-checkbox]`).addEventListener('change',function(e) {
            self.settings.showgooglemapsbutton = this.checked;
            self.storesettings();
            if (self.settings.showgooglemapsbutton) {
                document.querySelector(`a.googlemapsbutton`).classList.remove(`${self.id}-hidden`);
            } else {
                document.querySelector(`a.googlemapsbutton`).classList.add(`${self.id}-hidden`);
            }
        },false);
        container.querySelector(`input[name=showapplemapsbutton-checkbox]`).checked = self.settings.showapplemapsbutton;
        container.querySelector(`input[name=showapplemapsbutton-checkbox]`).addEventListener('change',function(e) {
            self.settings.showapplemapsbutton = this.checked;
            self.storesettings();
            if (self.settings.showapplemapsbutton) {
                document.querySelector(`a.applemapsbutton`).classList.remove(`${self.id}-hidden`);
            } else {
                document.querySelector(`a.applemapsbutton`).classList.add(`${self.id}-hidden`);
            }
        },false);

        window.dialog({
            html: container,
            id: self.pluginname + '-dialog',
            dialogClass: 'ui-dialog-' + self.pluginname,
            title: self.title,
            width: 'auto'
        }).dialog('option', 'buttons', {
            'Transfer' : function() { self.transfermenu(); },
            'Edit waypoints' : function() { self.waypointsmenu(); },
            'About': function() { self.about(); },
            'Close': function() { $(this).dialog('close'); }
        });

        self.updateMenu();
    };

    self.updateControls = function() {
        function setnewClass(el,newclass) {
            if (!el) return false;
            if (el.classList.contains(newclass)) return false;
            el.classList.remove(`${self.id}-maxwaypoints`);
            el.classList.remove(`${self.id}-selectportal`);
            el.classList.remove(`${self.id}-selectedwaypoint`);
            el.classList.remove(`${self.id}-newwaypoint`);
            el.classList.add(newclass);
            return true;
        }

        let waypointcontrol = document.querySelector(`.${self.id}-togglewaypoint`);
        if (document.querySelector(`.${self.id}-togglewaypoint`)) {
            if (!window.selectedPortal) {
                if (Object.keys(self.waypoints).length >= self.maxwaypoints) {
                    if (setnewClass(waypointcontrol,`${self.id}-maxwaypoints`)) {
                        waypointcontrol.setAttribute('title','Maximum waypoints');
                        document.querySelector(`.${self.id}-togglewaypoint > img`)?.setAttribute('src',iconplus);
                    }
                } else {
                    if (setnewClass(waypointcontrol,`${self.id}-selectportal`)) {
                        waypointcontrol.setAttribute('title','Select a portal first!');
                        document.querySelector(`.${self.id}-togglewaypoint > img`)?.setAttribute('src',iconplus);
                    }
                }
            } else if (window.selectedPortal in self.waypoints) {
                if (setnewClass(waypointcontrol,`${self.id}-selectedwaypoint`)) {
                    waypointcontrol.setAttribute('title','Remove waypoint');
                    document.querySelector(`.${self.id}-togglewaypoint > img`)?.setAttribute('src',iconmin);
                }
            } else if (Object.keys(self.waypoints).length >= self.maxwaypoints) {
                if (setnewClass(waypointcontrol,`${self.id}-maxwaypoints`)) {
                    waypointcontrol.setAttribute('title','Maximum waypoints');
                    document.querySelector(`.${self.id}-togglewaypoint > img`)?.setAttribute('src',iconplus);
                }
            } else {
                if (setnewClass(waypointcontrol,`${self.id}-newwaypoint`)) {
                    waypointcontrol.setAttribute('title','Add waypoint');
                    document.querySelector(`.${self.id}-togglewaypoint > img`)?.setAttribute('src',iconplus);
                }
            }
            document.querySelector(`.${self.id}-total`).innerText = Object.keys(self.waypoints).length;
        }
    }

    self.updateRouteForgroundColor = function() {
        // prepared this function, just in case there is a color picker implemented to change the routeforegroundcolor
        self.stylesheet.innerHTML = self.stylesheet.innerHTML.replace(new RegExp(`\n\.${self.id}-selectedwaypoint \{.*?\}`, 's'),`
.${self.id}-selectedwaypoint {
   background-color: ${self.settings.routeforegroundcolor}!important;
}`);
    };

    self.setup = function() {
        self.restoresettings();
        self.storesettings();

        self.stylesheet = document.body.appendChild(document.createElement('style'));
        self.stylesheet.innerHTML = `
#dialog-plugin-${self.id}-dialog label {
    user-select: none;
    cursor: pointer;
}
.${self.id}-transfer-menu {
    text-align: center;
}
.${self.id}-transfer-menu input[type=button] {
    min-width: 200px;
    margin-top: 5px;
    margin-bottom: 5px;
}
.${self.id}-main-menu input[type=button] {
    margin-top: 5px;
    margin-bottom: 5px;
}
.${self.id}-waypoint-numbers {
    font-size: 16px;
    color: #000000;
    font-family: monospace;
    font-weight: bold;
    text-align: center;
    pointer-events: none;
    -webkit-text-size-adjust:none;
    white-space: nowrap;
}
.${self.id}-waypoints-row {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    margin: 4px 0px 4px 0px;
}
.${self.id}-waypoints-row-char {
    margin: 0 5px;
    width: 13px;
    text-align: center;
    padding: 3px;
}
.${self.id}-waypoints-row-link {
    width: 250px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    padding: 3px;
}
.${self.id}-waypoints-row input[type=button] {
    margin-left: 4px;
}
.${self.id}-hidden {
    display: none!important;
}
.${self.id}-maxwaypoints {
   background-color: red!important;
}
.${self.id}-selectportal {
   background-color: #aaaaaa!important;
}
.${self.id}-selectedwaypoint {
   background-color: ${self.settings.routeforegroundcolor}!important;
}
.${self.id}-newwaypoint {
   background-color: white!important;
}
a.${self.id}-selectedportalrow {
   background-color: black;
}
.${self.id}-buttonclicked {
   background-color: #afcbfa!important;
}
`;

        let toolboxlink = document.getElementById('toolbox').appendChild(document.createElement('a'));
        toolboxlink.textContent = self.title;
        toolboxlink.addEventListener('click', function(e) {
            e.preventDefault();
            self.menu();
        }, false);

        self.waypointsroutelayer = new window.L.FeatureGroup();
        window.addLayerGroup(self.title, self.waypointsroutelayer,true);

        self.restoreWaypoints();
        self.drawRoute();

        function addClickFunctionToObject(obj,fn) {
            function detectMultipleClicks(obj) {
                // prevent double execution for single click event (happens on iOS devices with touch events)
                let clickdelay = 200; // ms
                let timestamp = window.event?.timeStamp || new Date().getTime();
                let elapsed = obj._lastclick && (timestamp - obj._lastclick);
                if (elapsed < clickdelay) return true;
                obj._lastclick = timestamp;
                return false;
            }
            window.L.DomEvent
                .on(obj, 'click', window.L.DomEvent.stopPropagation)
                .on(obj, 'click', window.L.DomEvent.preventDefault)
                .on(obj, 'click', function() { if (!detectMultipleClicks(obj)) fn(); })
                .on(obj, 'dblclick', window.L.DomEvent.stopPropagation);
        }
        let controlButtons = window.L.Control.extend({
            options: {
                position: 'topleft'
            },
            onAdd: function (map) {
                let container = document.createElement('div');
                container.className = self.id + '-controlbuttons leaflet-bar';
                if (!window.map.hasLayer(self.waypointsroutelayer)) container.style.display = 'none';

                let googlemapsbutton = container.appendChild(document.createElement('a'));
                googlemapsbutton.className = self.id + "-logo";
                googlemapsbutton.classList.add('googlemapsbutton');
                if (!self.settings.showgooglemapsbutton) googlemapsbutton.classList.add(`${self.id}-hidden`);
                let googlemapsbuttonicon = googlemapsbutton.appendChild(document.createElement('img'));
                // logo icon
                googlemapsbuttonicon.src = icongooglemaps;
                googlemapsbuttonicon.width = 16;
                googlemapsbuttonicon.height = 16;
                googlemapsbuttonicon.style.marginTop = (window.isSmartphone() ? '7px' : '5px');
                addClickFunctionToObject(googlemapsbutton,function() {
                    window.open(self.getGoogleMapsLink(),'_blank','_blank');
                });

                let applemapsbutton = container.appendChild(document.createElement('a'));
                applemapsbutton.className = self.id + "-logo";
                applemapsbutton.classList.add('applemapsbutton');
                if (!self.settings.showapplemapsbutton) applemapsbutton.classList.add(`${self.id}-hidden`);
                let applemapsbuttonicon = applemapsbutton.appendChild(document.createElement('img'));
                // logo icon
                applemapsbuttonicon.src = iconapplemaps;
                applemapsbuttonicon.width = 16;
                applemapsbuttonicon.height = 16;
                applemapsbuttonicon.style.marginTop = (window.isSmartphone() ? '7px' : '5px');
                addClickFunctionToObject(applemapsbutton,function() {
                    window.open(self.getAppleMapsLink(),'_blank');
                });

                let togglebutton = container.appendChild(document.createElement('a'));
                togglebutton.className = self.id + "-togglewaypoint";
                let togglebuttonicon = togglebutton.appendChild(document.createElement('img'));
                // + icon
                togglebuttonicon.src = iconplus;
                togglebuttonicon.width = 16;
                togglebuttonicon.height = 16;
                togglebuttonicon.style.marginTop = (window.isSmartphone() ? '7px' : '5px');
                addClickFunctionToObject(togglebutton,function() {
                    if (!window.selectedPortal || !(window.selectedPortal in window.portals)) return;
                    if (!(window.selectedPortal in self.waypoints)) {
                        if (Object.keys(self.waypoints).length >= self.maxwaypoints) {
                            alert('Maximum of ' + self.maxwaypoints + ' waypoints reached. You can not add this portal as a waypoint.');
                            return;
                        }
                        let waypointportal = window.portals[window.selectedPortal];
                        self.waypoints[window.selectedPortal] = {
                            latlng: {
                                lat: waypointportal.getLatLng().lat,
                                lng: waypointportal.getLatLng().lng
                            },
                            name: waypointportal.options.data.title || 'waypoint'
                        };
                    } else {
                        delete(self.waypoints[window.selectedPortal]);
                    }
                    self.storeWaypoints();
                    self.updateMenu();
                    self.updateControls();
                    self.drawRoute();
                });

                let totalbutton = container.appendChild(document.createElement('a'));
                totalbutton.className = self.id + "-total";
                totalbutton.innerText = Object.keys(self.waypoints).length;
                addClickFunctionToObject(totalbutton,function() {
                    self.waypointsmenu();
                });

                let menubutton = container.appendChild(document.createElement('a'));
                menubutton.className = self.id + "-menu";
                let menubuttonicon = menubutton.appendChild(document.createElement('img'));
                menubuttonicon.src = iconmenu;
                menubuttonicon.width = 16;
                menubuttonicon.height = 16;
                menubuttonicon.style.marginTop = (window.isSmartphone() ? '7px' : '5px');
                addClickFunctionToObject(menubutton,function() {
                    self.menu();
                });

                return container;
            }
        });
        window.map.addControl(new controlButtons());
        self.updateControls();

        window.addHook('portalSelected', self.updateControls);
        window.addHook('portalSelected', self.highlightDialogPortal);
        window.addHook('portalDetailLoaded', function(data) {
            if (data.success && data.guid in self.waypoints && self.waypoints[data.guid].name != data.details.title) {
                self.waypoints[data.guid].name = data.details.title;
                self.storeWaypoints();
                self.updateMenu();
            }
        });

        window.map.on('layeradd', function(obj) { // show controls
            if (obj.layer === self.waypointsroutelayer) {
                $(`.${self.id}-controlbuttons`).show();
            }
        });
        window.map.on('layerremove', function(obj) { // hide controls
            if (obj.layer === self.waypointsroutelayer) {
                $(`.${self.id}-controlbuttons`).hide();
            }
        });

        console.log(`IITC plugin loaded: ${self.title} version ${self.version}`);
    };

    var setup = function() {
        (window.iitcLoaded?self.setup():window.addHook('iitcLoaded',self.setup));
    };

    // Added to support About IITC details and changelog:
    plugin_info.script.version = plugin_info.script.version.replace(/\.\d{8}\.\d{6}$/,'');
    plugin_info.buildName = 'softspot.nl';
    plugin_info.dateTimeVersion = self.version.replace(/^.*(\d{4})(\d{2})(\d{2})\.(\d{6})/,'$1-$2-$3-$4');
    plugin_info.pluginId = self.id;
    let changelog = [{version:'This is a <a href="https://softspot.nl/ingress/" target="_blank">softspot.nl</a> plugin by ' + self.author,changes:[]},...self.changelog.replace(/^.*?version /s,'').split(/\nversion /).map((v)=>{v=v.split(/\n/).map((l)=>{return l.replace(/^- /,'')}).filter((l)=>{return l != "";}); return {version:v.shift(),changes:v}})];

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
