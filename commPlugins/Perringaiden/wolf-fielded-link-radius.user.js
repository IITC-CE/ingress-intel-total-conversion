// ==UserScript==
// @author         Perringaiden
// @id             wolf-fielded-link-radius@Perringaiden
// @name           Fielded Link Radius
// @category       Misc
// @version        0.3
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Perringaiden/wolf-fielded-link-radius.user.js
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Perringaiden/wolf-fielded-link-radius.meta.js
// @description    Defines the area inside which a portal can link under a field.
// @include        *://*.ingress.com/*
// @match          *://*.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {

    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    //PLUGIN START ////////////////////////////////////////////////////////

    //use own namespace for plugin
    window.plugin.wolfFieldedLinkRadius = function() {};

    // distance for the fielded link maximum.
    window.plugin.wolfFieldedLinkRadius.linkDistance = 500;

    // Provides a circle object storage array for adding and
    // removing specific circles from layers.  Keyed by GUID.
    window.plugin.wolfFieldedLinkRadius.portalCircles = {};

    /**
     * Indicates whether portals are displayed at the current level.  Simply using zoom level
     * does not factor in other tools that adjust display capabilities.
     */
    window.plugin.wolfFieldedLinkRadius.zoomLevelHasPortals = function() {
        return window.getMapZoomTileParameters(window.getDataZoomForMapZoom(window.map.getZoom())).hasPortals;
    };

    /**
     * Draw the circle for a specific portal.
     */
    window.plugin.wolfFieldedLinkRadius.drawLinkRange = function(guid) {
        // Gather the location of the portal, and generate a
        // centered on the lat/lng of the portal.
        var d = window.portals[guid];
        var coo = d._latlng;
        var latlng = new L.LatLng(coo.lat,coo.lng);
        var optCircle = {color:'red',opacity:0.7,fillColor:'purple',fillOpacity:0.1,weight:1,interactive:false,radius:window.plugin.wolfFieldedLinkRadius.linkDistance};
        var circle = new L.Circle(latlng, optCircle);


        // Add the circle to the circle display layer.
        circle.addTo(window.plugin.wolfFieldedLinkRadius.circleDisplayLayer);

        // Store a reference to the circle to allow removal.
        window.plugin.wolfFieldedLinkRadius.portalCircles[guid] = circle;
    }

    /**
     * Removes the circle for a specific portal.
     */
    window.plugin.wolfFieldedLinkRadius.removeLinkRange = function(guid) {
        var previousLayer = window.plugin.wolfFieldedLinkRadius.portalCircles[guid];


        if(previousLayer) {
            // Remove the circle from the layer.
            window.plugin.wolfFieldedLinkRadius.circleDisplayLayer.removeLayer(previousLayer);

            // Delete the circle from storage, so we don't build up
            // a big cache, and we don't have complex checking on adds.
            delete window.plugin.wolfFieldedLinkRadius.portalCircles[guid];
        }
    }

    /**
     * Adjusts the display when portal selection changes.
     */    
    window.plugin.wolfFieldedLinkRadius.portalSelected = function(guid){
        // clear all the previously added layers (if any).
        if (window.plugin.wolfFieldedLinkRadius.circleDisplayLayer) {
            window.plugin.wolfFieldedLinkRadius.circleDisplayLayer.clearLayers();
        }

        // If we have a selected portal, then display the circle if appropriate.
        if (guid.selectedPortalGuid) {
            window.plugin.wolfFieldedLinkRadius.drawLinkRange(guid.selectedPortalGuid);
        }


    }

    /**
     * Hides or shows the circle display layer as requested.
     */
    window.plugin.wolfFieldedLinkRadius.showOrHide = function() {

        if(window.plugin.wolfFieldedLinkRadius.zoomLevelHasPortals()) {
            // Add the circle layer back to the display layer if necessary, and remove the disabled mark.
            if(!window.plugin.wolfFieldedLinkRadius.displayLayer.hasLayer(window.plugin.wolfFieldedLinkRadius.circleDisplayLayer)) {
                window.plugin.wolfFieldedLinkRadius.displayLayer.addLayer(window.plugin.wolfFieldedLinkRadius.circleDisplayLayer);
                $('.leaflet-control-layers-list span:contains("Fielded Link Radius")').parent('label').removeClass('disabled').attr('title', '');
            }
        } else {
            // Remove the circle layer from the display layer if necessary, and add the disabled mark.
            if(window.plugin.wolfFieldedLinkRadius.displayLayer.hasLayer(window.plugin.wolfFieldedLinkRadius.circleDisplayLayer)) {
                window.plugin.wolfFieldedLinkRadius.displayLayer.removeLayer(window.plugin.wolfFieldedLinkRadius.circleDisplayLayer);
                $('.leaflet-control-layers-list span:contains("Fielded Link Radius")').parent('label').addClass('disabled').attr('title', 'Zoom in to show those.');
            }
        };
    }

    /**
      * Setup methods to initialize the plugin.
      */
    var setup = function() {
        // This layer is added to the layer chooser, to be toggled on/off, regardless of zoom.
        window.plugin.wolfFieldedLinkRadius.displayLayer = new L.LayerGroup();

        // This layer is added into the above layer, and removed from it when we zoom out too far.
        window.plugin.wolfFieldedLinkRadius.circleDisplayLayer = new L.LayerGroup();

        // Initially add the circle display layer into base display layer.  We will trigger an assessment below.
        window.plugin.wolfFieldedLinkRadius.displayLayer.addLayer(window.plugin.wolfFieldedLinkRadius.circleDisplayLayer);

        // Add the base layer to the main window.
        window.addLayerGroup('Fielded Link Radius', window.plugin.wolfFieldedLinkRadius.displayLayer, true);

        window.addHook('portalSelected',window.plugin.wolfFieldedLinkRadius.portalSelected);

        // Add a hook to trigger the showOrHide method when the map finishes zooming.
        map.on('zoomend', window.plugin.wolfFieldedLinkRadius.showOrHide);

        // Trigger an initial assessment of displaying the circleDisplayLayer.
        window.plugin.wolfFieldedLinkRadius.showOrHide();
    };

    setup.info = plugin_info; //add the script info data to the function as a property

    if(!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);

    // if IITC has already booted, immediately run the 'setup' function
    if(window.iitcLoaded && typeof setup === 'function') setup();
}; // wrapper end

//PLUGIN END ////////////////////////////////////////////////////////

var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
(document.body || document.head || document.documentElement).appendChild(script);
