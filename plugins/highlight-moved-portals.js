// @author         screach
// @name           Highlight moved portals
// @category       Highlighter
// @version        0.1.1
// @description    Highlights portals with links with different location data

/* exported setup, changelog --eslint */
/* global L */

var changelog = [
  {
    version: '0.1.1',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
];

// use own namespace for plugin
var movedPortals = {};
window.plugin.portalHighlighterMovedPortals = movedPortals;

// exposed objects
movedPortals.styles = {
  fillOpacity: 1,
  fillColor: '#FF0000',
};

var getLinkData = (lguid) => {
  return window.links[lguid].options.data;
};

var toLatLng = (latE6, lngE6) => {
  return new L.LatLng(latE6 / 1e6, lngE6 / 1e6);
};

var getDLatLng = (lguid) => {
  var linkData = getLinkData(lguid);
  return toLatLng(linkData.dLatE6, linkData.dLngE6);
};

var getOLatLng = (lguid) => {
  var linkData = getLinkData(lguid);
  return toLatLng(linkData.oLatE6, linkData.oLngE6);
};

movedPortals.highlightMovedPortals = (data) => {
  var portalData = data.portal.options.data;
  var latLng = toLatLng(portalData.latE6, portalData.lngE6);

  var portalLinks = window.getPortalLinks(data.portal.options.guid);
  if (portalLinks.in.some((lguid) => !getDLatLng(lguid).equals(latLng)) || portalLinks.out.some((lguid) => !getOLatLng(lguid).equals(latLng))) {
    data.portal.setStyle(movedPortals.styles);
  }
};

var setup = () => {
  window.addPortalHighlighter('Moved portals', movedPortals.highlightMovedPortals);
};
