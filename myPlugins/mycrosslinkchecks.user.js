// ==UserScript==
// @id crosslinkPortalIdentifier
// @name IITC Plugin: crosslinkPortalIdentifier
// @category MyPlugins
// @version 0.0.1
// @namespace https://tempuri.org/iitc/hello
// @description IITC Plugin: crosslinkPortalIdentifier
// @author DiabloEnMusica
// @match https://intel.ingress.com/*
// @grant none
// ==/UserScript==
pluginName="crosslinkPortalIdentifier";
// Wrapper function that will be stringified and injected
// into the document. Because of this, normal closure rules
// do not apply here.
function wrapper( plugin_info ) {
	if ( typeof window.plugin!=='function' ) window.plugin=function() { };
	plugin_info.buildName='';
	plugin_info.dateTimeVersion='2024-02-02-180000';
	plugin_info.pluginId='57CellsFieldPlanner';
	// PLUGIN START
	console.log( 'Field Planner | loading plugin' )
	var changelog=changeLog;
	let self=window.plugin.homogeneousFields=function() { };
	// helper function to convert portal ID to portal object
		// from another plugin, may not need..
	function portalIdToObject( portalId ) {
		let portals=window.portals; // IITC global object that contains all portal data
		let portal=portals[ portalId ]? portals[ portalId ].options.data:null;
		// Convert portal to the structure expected by populatePortalData
		if ( portal ) {
			let lat=parseFloat( portal.latE6/1e6 );
			let lng=parseFloat( portal.lngE6/1e6 );
			return {
				id: portalId, // ID of the portal
				name: portal.title, // title of the portal
				latLng: new L.latLng( lat, lng ), // use LatLng Class to stay more flexible
			};
		}
		return null;
	}	

	// self.getDrawlayer() retrieves the layer containing drawn links.
	// Then compares the provided latLngs with the lat/lng coordinates of links in the drawlayer.
	// If a match is found, it sets linkexists to true.
	// Return Value:
	// Returns true if the coordinates belong to a drawn link, otherwise false.
	var crosslinkGuids=Object.keys( window.plugin.quickdrawlinks.crosslinkLayerGuids );
	var portalToLinksMap={}; // Map to track portals and their connected links
	const self=window.plugin.quickdrawlinks;

	crosslinkGuids.forEach( guid => {
		var crosslinkData=window.plugin.quickdrawlinks.crosslinkLayerGuids[ guid ];

		if ( crosslinkData&&typeof crosslinkData.getLatLngs==="function" ) {
			var latLngs=crosslinkData.getLatLngs(); // Get coordinates of the link
			var isDrawnLink=self.linkexists( latLngs ); // Use the linkexists function

			if ( isDrawnLink ) {
				console.log( `Skipping drawn link: ${guid}` );
				return; // Skip processing for drawn links
			}

			if ( latLngs.length===2 ) {
				// Find portals at both ends of the link
				var portal1=Object.values( window.portals ).find(
					portal => portal.getLatLng().lat===latLngs[ 0 ].lat&&portal.getLatLng().lng===latLngs[ 0 ].lng
				);
				var portal2=Object.values( window.portals ).find(
					portal => portal.getLatLng().lat===latLngs[ 1 ].lat&&portal.getLatLng().lng===latLngs[ 1 ].lng
				);

				// Map portals to links
				[ portal1, portal2 ].forEach( portal => {
					if ( portal ) {
						var portalGuid=portal.options.guid;
						if ( !portalToLinksMap[ portalGuid ] ) {
							portalToLinksMap[ portalGuid ]={ portal, links: [] };
						}
						portalToLinksMap[ portalGuid ].links.push( guid ); // Add the link GUID to this portal
					}
				} );

				console.log( {
					GUID: guid,
					Type: "Existing Link", // Only processing existing links here
					Portal1: portal1
						? {
							Name: portal1.options.data.title||"Unknown",
							GUID: portal1.options.guid,
							Latitude: portal1.getLatLng().lat,
							Longitude: portal1.getLatLng().lng
						}
						:"Portal 1 not found",
					Portal2: portal2
						? {
							Name: portal2.options.data.title||"Unknown",
							GUID: portal2.options.guid,
							Latitude: portal2.getLatLng().lat,
							Longitude: portal2.getLatLng().lng
						}
						:"Portal 2 not found"
				} );
			} else {
				console.log( `Unexpected number of coordinates for GUID: ${guid}` );
			}
		} else {
			console.log( `Lat/Lng data not available for GUID: ${guid}` );
		}
	} );

	// Identify duplicate portals (shared by more than one link)
	var duplicatePortals=Object.values( portalToLinksMap ).filter(
		entry => entry.links.length>1
	);

	// Log the duplicate portals and their associated links
	console.log( "Duplicate Portals with Associated Links:", duplicatePortals );

	

	// //   OLD SCRIPT FOR REF
	
	// crosslinkGuids.forEach( guid => {
	// 	var crosslinkData=window.plugin.quickdrawlinks.crosslinkLayerGuids[ guid ];

	// 	if ( crosslinkData&&typeof crosslinkData.getLatLngs==="function" ) {
	// 		var latLngs=crosslinkData.getLatLngs(); // Get coordinates of the link
	// 		var isDrawnLink=self.linkexists( latLngs ); // Use the linkexists function

	// 		if ( latLngs.length===2 ) {
	// 			var portal1=Object.values( window.portals ).find(
	// 				portal => portal.getLatLng().lat===latLngs[ 0 ].lat&&portal.getLatLng().lng===latLngs[ 0 ].lng
	// 			);
	// 			var portal2=Object.values( window.portals ).find(
	// 				portal => portal.getLatLng().lat===latLngs[ 1 ].lat&&portal.getLatLng().lng===latLngs[ 1 ].lng
	// 			);

	// 			console.log( {
	// 				GUID: guid,
	// 				Type: isDrawnLink? "Drawn Link":"Existing Link",
	// 				Portal1: portal1
	// 					? {
	// 						Name: portal1.options.data.title||"Unknown",
	// 						GUID: portal1.options.guid,
	// 						Latitude: portal1.getLatLng().lat,
	// 						Longitude: portal1.getLatLng().lng
	// 					}
	// 					:"Portal 1 not found",
	// 				Portal2: portal2
	// 					? {
	// 						Name: portal2.options.data.title||"Unknown",
	// 						GUID: portal2.options.guid,
	// 						Latitude: portal2.getLatLng().lat,
	// 						Longitude: portal2.getLatLng().lng
	// 					}
	// 					:"Portal 2 not found"
	// 			} );
	// 		} else {
	// 			console.log( `Unexpected number of coordinates for GUID: ${guid}` );
	// 		}
	// 	} else {
	// 		console.log( `Lat/Lng data not available for GUID: ${guid}` );
	// 	}
	// } );


	// inject code into site context
	var script=document.createElement( 'script' );
	var info={};
	if ( typeof GM_info!=='undefined'&&GM_info&&GM_info.script ) info.script={ version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
	script.appendChild( document.createTextNode( '('+wrapper+')('+JSON.stringify( info )+');' ) );
	( document.body||document.head||document.documentElement ).appendChild( script );
