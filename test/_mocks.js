/* global L */
class Map {
  addTo() {}
  addLayer() {}
  removeLayer() {}
  setView() {}
}

// global objects
globalThis.document = {};
globalThis.window = {
  location: {},
  map: new Map(),
  runHooks: () => {},
  isSmartphone: () => false,
  TEAM_SHORTNAMES: { NEUTRAL: 'NEU', ENLIGHTENED: 'ENL' },
  COLORS: { NEUTRAL: '#CCC', ENLIGHTENED: '#008000' },
  teamStringToId: (team) => (team === 'ENLIGHTENED' ? 'ENLIGHTENED' : 'NEUTRAL'),
};

// leaflet
globalThis.L = {
  LatLng: class {},
  latLng: (lat, lng) => new L.LatLng(lat, lng),
  LayerGroup: class {
    addTo() {}
  },
  layerGroup: () => new L.LayerGroup(),
  Marker: class {
    addTo() {}
  },
  marker: () => new L.Marker(),
  DivIcon: {
    ColoredSvg: class {},
  },
};

// iitc
globalThis.IITC = {
  search: {
    Query: {},
  },
  comm: {},
  utils: {},
};

globalThis.IITC.search.QueryResultsView = class {
  constructor(term, confirmed) {
    this.term = term;
    this.confirmed = confirmed;
  }
  renderResults() {}
};
