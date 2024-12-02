// ==UserScript==
// @author         Tarsi210
// @id             draw-best-link-star@Tarsi210
// @name           Draw Best Link Star
// @category       Info
// @version        0.0.8
// @namespace      https://www.nathanpralle.com
// @description    Build the best link star in an area.
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Tarsi210/draw-best-link-star.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Tarsi210/draw-best-link-star.user.js
// @depends        draw-tools@breunigs
// @include        https://intel.ingress.com/*
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==



function wrapper(plugin_info) {
	// ensure plugin framework is there, even if iitc is not yet loaded
	if(typeof window.plugin !== 'function') window.plugin = function() {};

	// PLUGIN START ////////////////////////////////////////////////////////

	// use own namespace for plugin
	window.plugin.drawBestLinkStar = function() {};

   	window.plugin.drawBestLinkStar.setupCallback = function() {
        $('#toolbox').append(' <a onclick="window.plugin.drawBestLinkStar.showModal(window.plugin.drawBestLinkStar.build)" title="Draw link star based on central portal given">Draw Best Link Star</a>');
	};

    function createModal() {
        const modal = document.createElement('div');
        modal.id = 'linkStarModal';
        modal.style.display = 'none';
        modal.style.position = 'fixed';
        modal.style.zIndex = '1000';
        modal.style.left = '10%';
        modal.style.top = '10%';
        modal.style.backgroundColor = '#fff';
        modal.style.padding = '20px';
        modal.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        modal.style.borderRadius = '10px';

        const modalContent = `
            <div id="linkStarModalContent">
				<table>
                    <TR>
						<TD align="right"><label for="targetPortal"><font color="#000">Target Portal:</label></TD>
						<TD><div id="linkStarModalTargetPortal"><font color="#0000FF">Auto-Select Best Portal</font></div></TD>
					</TR>
					<TR>
						<TD align="right"><label for="searchRadius"><font color="#000">Search Radius (meters):</label></TD>
						<TD><input style="color:#0000FF" type="number" id="searchRadius" name="searchRadius" value="1000"></TD>
					</TR>
					<TR>
						<TD align="right"><label for="maxPortals"><font color="#000">Maximum number of portals:</label></TD>
						<TD><input style="color:#0000FF" type="number" id="maxPortals" name="maxPortals" value="100"></TD>
					</TR>
					<TR>
						<TD align="right"><label for="ignoreCrossedLinks"><font color="#000">Ignore crossed links:</label></TD>
						<TD><input type="checkbox" id="ignoreCrossedLinks" name="ignoreCrossedLinks" checked></TD>
					</TR>
					<TR>
						<TD  align="left" COLSPAN="2"><button id="submitButton">Submit</button></TD>
					</TR>
				</TABLE>
            </div>
        `;
        modal.innerHTML = modalContent;
        document.body.appendChild(modal);
    }

    function createResultsModal() {
        const resultsmodal = document.createElement('div');
        resultsmodal.id = 'linkStarResultsModal';
        resultsmodal.style.display = 'none';
        resultsmodal.style.position = 'fixed';
        resultsmodal.style.zIndex = '1000';
        resultsmodal.style.left = '10%';
        resultsmodal.style.top = '10%';
        resultsmodal.style.backgroundColor = '#fff';
        resultsmodal.style.padding = '20px';
        resultsmodal.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        resultsmodal.style.borderRadius = '10px';

        const modalContent = `<div id="linkStarResultsModalContent"></div><BR><button id="linkStarCloseButton">CLOSE</button>`;
        resultsmodal.innerHTML = modalContent;
        document.body.appendChild(resultsmodal);
    }

    window.plugin.drawBestLinkStar.showModal=function(callback) {
        const modal = document.getElementById('linkStarModal');
        const submitButton = document.getElementById('submitButton');
		const linkStarModalTargetPortal=document.getElementById('linkStarModalTargetPortal');
        submitButton.onclick = () => {
            const searchRadius = parseInt(document.getElementById('searchRadius').value, 10);
            const maxLinks = parseInt(document.getElementById('maxPortals').value, 10);
            const ignoreCrossedLinks = document.getElementById('ignoreCrossedLinks').checked;

            if (isNaN(searchRadius) || isNaN(maxLinks) || searchRadius <= 0 || maxLinks <= 0) {
                alert("Invalid input. Please enter positive numbers.");
                return;
            }
            modal.style.display = 'none';
            callback({
                searchRadius,
                maxLinks,
                ignoreCrossedLinks
            });

        };
        let bestPortal = getSelectedPortal(); // Use selected portal if available
		if (bestPortal) {
			const portalName = bestPortal.options.data.title;
			const portalUrl = `https://intel.ingress.com/?pll=${bestPortal.getLatLng().lat},${bestPortal.getLatLng().lng}`;
			const newContent = `<a style="color:#0000FF" href="${portalUrl}">${portalName}</a>`;
			linkStarModalTargetPortal.innerHTML = newContent;
		}
        modal.style.display = 'block';
    }

    function showResultsModal(content) {
        const resultsmodal = document.getElementById('linkStarResultsModal');
        const resultscontent = document.getElementById('linkStarResultsModalContent');
        const closeButton = document.getElementById('linkStarCloseButton');
        resultscontent.innerHTML = content;
        closeButton.onclick = () => {
            resultsmodal.style.display = 'none';
        };
        resultsmodal.style.display = 'block';
    }

	//Find all portals that are visible
	function getVisiblePortals() {
		const bounds = map.getBounds();
		const visiblePortals = [];
		for (const guid in window.portals) {
			const portal = window.portals[guid];
			if (bounds.contains(portal.getLatLng())) {
				visiblePortals.push(portal);
			}
		}
		return visiblePortals;
	}

	function getSelectedPortal() {
		const selectedPortal = window.selectedPortal;
		if (selectedPortal) {
			return window.portals[selectedPortal];
		}
		return null;
	}

	//Find the best portal to use for the center
	function findBestPortal(visiblePortals, radius) {
		let bestPortal = null;
		let bestScore = 0;
		let bestMaxDistance = Infinity;
		visiblePortals.forEach(portal => {
			const portalLatLng = portal.getLatLng();
			const nearbyPortals = [];
			for (const guid in window.portals) {
				if (guid !== portal.options.guid) {
					const otherPortal = window.portals[guid];
					const distance = portalLatLng.distanceTo(otherPortal.getLatLng());
					if (distance <= radius) {
						nearbyPortals.push(otherPortal);
					}
				}
			}
			const maxDistance = Math.max(...nearbyPortals.map(p => portalLatLng.distanceTo(p.getLatLng())));
			const score = nearbyPortals.length;
			if (score > bestScore || (score === bestScore && maxDistance < bestMaxDistance)) {
				bestPortal = portal;
				bestScore = score;
				bestMaxDistance = maxDistance;
			}
		});
		return bestPortal;
	}
    function calculateDistanceMatrix(portals) {
        const distances = [];
        for (let i = 0; i < portals.length; i++) {
            distances[i] = [];
            for (let j = 0; j < portals.length; j++) {
                distances[i][j] = portals[i].getLatLng().distanceTo(portals[j].getLatLng());
            }
        }
        return distances;
    }

    function findOptimalPath(distanceMatrix) {
        const n = distanceMatrix.length;
        const visited = new Array(n).fill(false);
        const path = [0]; // Start from the first portal
        visited[0] = true;

        for (let i = 1; i < n; i++) {
            let last = path[path.length - 1];
            let nearest = -1;
            let nearestDistance = Infinity;
            for (let j = 0; j < n; j++) {
                if (!visited[j] && distanceMatrix[last][j] < nearestDistance) {
                    nearest = j;
                    nearestDistance = distanceMatrix[last][j];
                }
            }
            path.push(nearest);
            visited[nearest] = true;
        }

        return path;
    }

    function doLinesIntersect(line1, line2) {
        const [p1, p2] = line1;
        const [q1, q2] = line2;

        function ccw(A, B, C) {
            return (C.lat - A.lat) * (B.lng - A.lng) > (B.lat - A.lat) * (C.lng - A.lng);
        }

        return (ccw(p1, q1, q2) !== ccw(p2, q1, q2)) && (ccw(p1, p2, q1) !== ccw(p1, p2, q2));
    }

    function isLinkCrossingAnyExistingLinks(link) {
        const existingLinks = window.links;
        for (const guid in existingLinks) {
            const existingLink = existingLinks[guid];
            const latLngs = existingLink.getLatLngs();
            const existingLine = [latLngs[0], latLngs[1]];

            if (doLinesIntersect(link, existingLine)) {
                return true;
            }
        }
        return false;
    }

    function isPossibleLinkCrossingAnyExistingLinks(portalALatLngs,portalBLatLngs) {
        const existingLinks = window.links;
        for (const guid in existingLinks) {
            const existingLink = existingLinks[guid];
            const latLngs = existingLink.getLatLngs();
            const existingLine = [latLngs[0],latLngs[1]];

            if (doLinesIntersect([portalALatLngs,portalBLatLngs], existingLine)) {
                return true;
            }
        }
        return false;
    }


	function generateCSV(portals,path,bestPortal,distanceMatrix) {
		let csvContent = "data:text/csv;charset=utf-8,\"Name\",\"Lat\",\"Lng\",\"URL\",\"Distance to Next (meters)\"\n";
		path.forEach((index, i) => {
			const portal = portals[index];
			const portalLatLng = portal.getLatLng();
			const portalUrl = `https://intel.ingress.com/?pll=${portalLatLng.lat},${portalLatLng.lng}`;
            let portalName="No Name Loaded";
            if(portal.options.data.title){
                portalName = portal.options.data.title.replace(/"/g, '""'); // Escape double quotes
            }
			const nextIndex = path[(i + 1) % path.length];
			const distanceToNext = distanceMatrix[index][nextIndex].toFixed(2); // Distance to the next portal
			csvContent += `"${portalName}","${portalLatLng.lat}","${portalLatLng.lng}","${portalUrl}","${distanceToNext}"\n`;
		});

		const encodedUri = encodeURI(csvContent);
		const link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", `${bestPortal.options.data.title} Link Star Plan.csv`);
		document.body.appendChild(link);
		return link;
	}


    function calculateTotalDistance(path, distanceMatrix) {
        let totalDistance = 0;
        for (let i = 0; i < path.length - 1; i++) {
            totalDistance += distanceMatrix[path[i]][path[i + 1]];
        }
        totalDistance += distanceMatrix[path[path.length - 1]][path[0]]; // Return to start
        return totalDistance;
    }

	//Build the link star
	window.plugin.drawBestLinkStar.build = function(config){
        if (!window.plugin.drawTools) {
            alert("DrawTools plugin is required!");
            return;
        }
		const { searchRadius, maxLinks, ignoreCrossedLinks } = config;
		const visiblePortals = getVisiblePortals();
		if (visiblePortals.length === 0) {
			alert("No visible portals found.   Try changing your zoom level or you didn't loading finish first.");
			return;
		}
        const totalVisiblePortals = visiblePortals.length;
		let userSelectedPortal = 0;
		let bestPortal = getSelectedPortal(); // Use selected portal if available
		if (!bestPortal) {
			bestPortal = findBestPortal(visiblePortals, searchRadius);
		}
		else{
			userSelectedPortal=1;
		}
		if (!bestPortal) {
			alert("No suitable portal found (or selected) for creating a link star.");
			return;
		}
		const bestPortalLatLng = bestPortal.getLatLng();

		// Collect nearby portals for the best portal
		const nearbyPortals = [];
		for (const guid in window.portals) {
			if (guid !== bestPortal.options.guid) {
				const portal = window.portals[guid];
				const distance = bestPortalLatLng.distanceTo(portal.getLatLng());
                const crossesLine = isPossibleLinkCrossingAnyExistingLinks(bestPortalLatLng,portal.getLatLng());
				if (distance <= searchRadius && (!crossesLine || ignoreCrossedLinks)){
					nearbyPortals.push(portal);
				}
			}
		}

		// Limit to the maximum number of links
		nearbyPortals.sort((a, b) => bestPortalLatLng.distanceTo(a.getLatLng()) - bestPortalLatLng.distanceTo(b.getLatLng()));
		const selectedPortals = nearbyPortals.slice(0, maxLinks);
        // Use DrawTools to draw the links
        const drawData = [];
        selectedPortals.forEach(portal => {
            const link = {
                type: 'polyline',
                latLngs: [
                    [bestPortalLatLng.lat, bestPortalLatLng.lng],
                    [portal.getLatLng().lat, portal.getLatLng().lng]
                ],
                color: '#A020F0' //Optional: Set link color to red
            };
            const linkLatLngs = [
                { lat: bestPortalLatLng.lat, lng: bestPortalLatLng.lng },
                { lat: portal.getLatLng().lat, lng: portal.getLatLng().lng }
            ];

            if (!isLinkCrossingAnyExistingLinks(linkLatLngs) || ignoreCrossedLinks) {
                drawData.push(link);
            }
        });

		// Add links to DrawTools
		window.plugin.drawTools.drawnItems.clearLayers();
		drawData.forEach(link => {
			const layer = L.polyline(link.latLngs, { color: link.color || '#A020F0' });
			window.plugin.drawTools.drawnItems.addLayer(layer);
		});

        // Calculate the optimal path
        const distanceMatrix = calculateDistanceMatrix(selectedPortals);
        const optimalPath = findOptimalPath(distanceMatrix);
        const totalDistance = calculateTotalDistance(optimalPath, distanceMatrix)/1000;
		const totalMiles = totalDistance * 0.621371;

        // Generate CSV
        const csvLink = generateCSV(selectedPortals, optimalPath,bestPortal,distanceMatrix);

        const portalName = bestPortal.options.data.title;
		const portalUrl = `https://intel.ingress.com/?pll=${bestPortal.getLatLng().lat},${bestPortal.getLatLng().lng}`;
		let message = '';
        if(userSelectedPortal){
			message = `
				<div>
					<font color="#000"><b>Choosing portals within ${searchRadius} meters of Selected Portal:</b><BR>`;
		}
		else{
			message = `
				<div>
					<font color="#000"><b>Best Target Portal with radius of ${searchRadius} meters:</b><BR>`;
		}
		message+=`&nbsp;&nbsp;&nbsp;<a style="color:#0000FF" href="${portalUrl}" target="_blank">${portalName}</a><BR>
                <font color="#000">${drawData.length} of possible ${maxLinks} links in the radius (${totalVisiblePortals} visible portals)<BR>
                Total Travel Distance: ${totalDistance.toFixed(1)} km (${totalMiles.toFixed(1)} miles)<BR>
                &nbsp;&nbsp;&nbsp;<a style="color:#0000FF" href="${csvLink.href}" download="${csvLink.download}">Download portal visit order (CSV)</a><BR>
            </div>
        `;
        showResultsModal(message);
	}

	//Run setup
	var setup = function() {
		window.plugin.drawBestLinkStar.setupCallback();
		if (window.plugin.drawTools === undefined) {
			alert("'Draw Best Link Star' requires 'draw-tools'");
			return;
		}
		// this plugin also needs to create the draw-tools hook, in case it is initialised before draw-tools
		window.pluginCreateHook('pluginDrawTools');
		// Add a button to trigger the link star creation
		const button = document.createElement('button');
		button.textContent = 'Draw Best Link Star';
		button.style.position = 'fixed';
		button.style.top = '1%';
		button.style.left = '10%';
		button.style.zIndex = '9999';
		button.onclick = () => window.plugin.drawBestLinkStar.showModal(window.plugin.drawBestLinkStar.build);
		document.body.appendChild(button);

		// Initialize modal dialog for input
		createModal();
        createResultsModal();
	};
	// PLUGIN END //////////////////////////////////////////////////////////

	setup.info = plugin_info; //add the script info data to the function as a property
	if(!window.bootPlugins){
		window.bootPlugins = [];
	}
	window.bootPlugins.push(setup);

	// if IITC has already booted, immediately run the 'setup' function
	if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end

// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script){
	info.script = {
		version: GM_info.script.version,
		name: GM_info.script.name,
		description: GM_info.script.description
	};
}
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);
