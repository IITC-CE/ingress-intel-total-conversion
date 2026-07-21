/* global L */
import { JSDOM } from 'jsdom';
import { jQueryFactory } from 'jquery/factory';

class Map {
  addTo() {}
  addLayer() {}
  removeLayer() {}
  setView() {}
  fitBounds() {}
}

// real jsdom DOM bound to the same window as jQuery, so specs build/inspect it natively;
// the url backs document.location / baseURI used when building permalinks
const { window: domWindow } = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'https://intel.ingress.com/intel' });
globalThis.document = domWindow.document;
globalThis.$ = jQueryFactory(domWindow);

// keep a simple string-backed cookie the utils specs rely on (jsdom's real document.cookie
// drops expires/path on read and ignores empty-string resets)
let cookieJar = '';
Object.defineProperty(globalThis.document, 'cookie', {
  get: () => cookieJar,
  set: (value) => {
    cookieJar = value;
  },
  configurable: true,
});

globalThis.window = {
  location: { protocol: 'https:' },
  map: new Map(),
  runHooks: () => {},
  dialog: () => {},
  isSmartphone: () => false,

  // game constants, mirrored from core/total-conversion-build.js (all indexed by numeric team id where relevant)
  TEAM_NONE: 0,
  TEAM_RES: 1,
  TEAM_ENL: 2,
  TEAM_MAC: 3,
  TEAM_CODES: ['N', 'R', 'E', 'M'],
  TEAM_CODENAMES: ['NEUTRAL', 'RESISTANCE', 'ENLIGHTENED', 'MACHINA'],
  TEAM_SHORTNAMES: ['NEU', 'RES', 'ENL', 'MAC'],
  TEAM_TO_CSS: ['none', 'res', 'enl', 'mac'],
  COLORS: ['#FF6600', '#0088FF', '#03DC03', '#FF0028'],
  COLORS_LVL: ['#000', '#FECE5A', '#FFA630', '#FF7315', '#E40000', '#FD2992', '#EB26CD', '#C124E0', '#9627F4'],
  COLORS_MOD: { VERY_RARE: '#F781FF', RARE: '#B68BFF', COMMON: '#49EBC3' },
  OCTANTS: ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'],
  OCTANTS_ARROW: ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘'],
  RESO_NRG: [0, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000],
  MAX_RESO_PER_PLAYER: [0, 8, 4, 4, 4, 2, 2, 1, 1],
  LINK_RANGE_MAC: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900],
  DESTROY_RESONATOR: 75,
  DESTROY_LINK: 187,
  DESTROY_FIELD: 750,
  CAPTURE_PORTAL: 500,
  DEPLOY_RESONATOR: 125,
  COMPLETION_BONUS: 250,
  UPGRADE_ANOTHERS_RESONATOR: 65,
  FACTION_HACK_COOLDOWN: 180,
  BASE_HACK_COOLDOWN: 300,
  BASE_HACK_COUNT: 4,
  HACK_RANGE: 40,
  RANGE_INDICATOR_COLOR: 'red',
  ACCESS_INDICATOR_COLOR: 'orange',
  DEFAULT_PORTAL_IMG: 'default.png',
  PLAYER: { level: 8, nickname: 'me', team: 'ENLIGHTENED' },

  // numeric team id, matching IITC.utils.getTeamId
  teamStringToId: (input) => {
    const team = typeof input === 'string' ? input : input && input.team;
    const id = globalThis.window.TEAM_CODENAMES.indexOf(team);
    return id >= 0 ? id : globalThis.window.TEAM_NONE;
  },
};

// ulog stub (each bundled core module receives a `log` instance)
globalThis.log = { log() {}, debug() {}, info() {}, warn() {}, error() {} };

// browser storage stub
globalThis.localStorage = {};

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
  circle: () => ({ addTo() {} }),
  geodesicCircle: () => ({ addTo() {} }),
  DivIcon: {
    ColoredSvg: class {},
  },
  divIcon: {
    coloredSvg: () => new L.DivIcon.ColoredSvg(),
  },
};
globalThis.L.extend = (dest, ...sources) => Object.assign(dest, ...sources);
globalThis.L.Browser = { mobile: false };
globalThis.L.Util = { template: (str, data) => str.replace(/\{(\w+)\}/g, (_, key) => data[key]) };
globalThis.L.CircleMarker = {
  prototype: {
    initialize() {},
    setStyle() {
      return this;
    },
  },
  // mirror of Leaflet's Class.extend: copies prototype props and hoists `statics` onto the constructor
  extend(props) {
    function Ctor(...args) {
      if (typeof this.initialize === 'function') this.initialize(...args);
    }
    Ctor.prototype = Object.create(L.CircleMarker.prototype);
    Object.assign(Ctor.prototype, props);
    if (props.statics) Object.assign(Ctor, props.statics);
    return Ctor;
  },
};

// String.prototype.capitalize polyfill (from utils_polyfills.js, which pulls in browser globals we don't mock)
if (!String.prototype.capitalize) {
  Object.defineProperty(String.prototype, 'capitalize', {
    value: function () {
      return this.charAt(0).toUpperCase() + this.slice(1).toLowerCase();
    },
  });
}

// iitc
globalThis.IITC = {
  search: {
    Query: {},
  },
  comm: {},
  utils: {},
};
// mirror of `window.IITC = IITC` from core/total-conversion-build.js (utils.js and friends read window.IITC)
globalThis.window.IITC = globalThis.IITC;

// mirror of IITC.registerLegacyAliases from core/total-conversion-build.js
globalThis.IITC.registerLegacyAliases = function (namespace, mappings) {
  Object.entries(mappings).forEach(([oldName, newName]) => {
    namespace[newName] = namespace[newName] || function () {};

    Object.defineProperty(globalThis.window, oldName, {
      get() {
        return namespace[newName];
      },
      set(newFunc) {
        namespace[newName] = newFunc;
      },
      configurable: true,
    });
  });
};

globalThis.IITC.search.QueryResultsView = class {
  constructor(term, confirmed) {
    this.term = term;
    this.confirmed = confirmed;
  }
  renderResults() {}
};
