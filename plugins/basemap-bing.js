// @author         johnd0e
// @name           Bing maps
// @category       Map Tiles
// @version        0.4.0
// @description    Add the bing.com map layers.

/* exported setup, changelog --eslint */
/* global L -- eslint */

const changelog = [
  {
    version: '0.4.0',
    changes: [
      'Fix the layers failing to load after Bing shut down free API keys',
      'Dark layer is now the road map recolored, as Bing no longer serves its dark imagery set',
      'Zoom levels above the available imagery are upscaled instead of detected per location',
      'Request high density tiles on retina displays',
    ],
  },
  {
    version: '0.3.4',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.3.3',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.3.2',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
const mapBing = {};

mapBing.tileServer = 'https://{subdomain}.ssl.ak.dynamic.tiles.virtualearth.net/comp/ch/{quadkey}';

// recoloring of the road map, since the imagery sets are limited to what the tile server renders
// https://learn.microsoft.com/en-us/bingmaps/styling/map-style-sheet-entries
mapBing.darkStyle = [
  'g|landColor:1B1B1B',
  'me|lbc:CFCFCF;loc:141414',
  'ar|fc:1F1F1F',
  'vg|fc:16281C',
  'wt|fc:0C1A2A;lbc:6E93B8',
  'str|fc:262626',
  'trs|fc:3A3A3A',
  'rd|fc:3A3A3A;sc:1F1F1F',
  'cah|fc:4A4A4A;sc:1F1F1F',
  'hg|fc:454545;sc:1F1F1F',
  'mr|fc:404040;sc:1F1F1F',
  'ard|fc:3C3C3C;sc:1F1F1F',
  'st|fc:333333;sc:1F1F1F',
  'rl|fc:2E2E2E',
  'pl|sc:4A4A4A',
].join('_');

mapBing.sets = {
  Road: {
    imageUrl: `${mapBing.tileServer}?mkt={culture}&it=G,L&shading=hill&og=2735&n=z`,
    maxTileZoom: 20,
    isDark: false,
  },
  Dark: {
    imageUrl: `${mapBing.tileServer}?mkt={culture}&it=G,L&shading=hill&og=2735&n=z&st=${mapBing.darkStyle}`,
    maxTileZoom: 20,
    isDark: true,
  },
  Aerial: {
    imageUrl: `${mapBing.tileServer}?it=A&og=2735&n=z`,
    maxTileZoom: 19,
    isDark: true,
  },
  Hybrid: {
    imageUrl: `${mapBing.tileServer}?mkt={culture}&it=A,G,L&og=2735&n=z`,
    maxTileZoom: 19,
    isDark: true,
  },
};

mapBing.options = {
  subdomains: ['t0', 't1', 't2', 't3'],
  detectRetina: true,
};

function setup() {
  setupBingLeaflet();
  useStaticTileUrls();
  applyTileZoomLimits();

  for (const [name, set] of Object.entries(mapBing.sets)) {
    const options = { ...mapBing.options, ...set };
    window.layerChooser.addBaseLayer(L.bingLayer(options), `Bing ${name}`, { isDark: options.isDark });
  }
}

function setupBingLeaflet() {
  try {
    // https://github.com/shramov/leaflet-plugins/blob/master/layer/tile/Bing.js
    '@include_raw:external/Bing.js@'; // eslint-disable-line
  } catch (e) {
    console.error('Bing.js loading failed');
    throw e;
  }
}

// The Imagery Metadata service that supplies the tile url templates requires an API key,
// and Bing rejects the free ones, so the templates are kept in `mapBing.sets` instead
function useStaticTileUrls() {
  L.BingLayer.include({
    loadMetadata: function () {
      if (this.metaRequested) {
        return;
      }
      this.metaRequested = true;
      const { imageUrl, retinaDpi, detectRetina, zoomOffset } = this.options;
      this._providers = [];
      this._attributions = [];
      this._url = retinaDpi && detectRetina && zoomOffset ? `${imageUrl}&dpi=${retinaDpi}` : imageUrl;
      this.fire('load');
      if (this._map) {
        this._update();
      }
    },
  });
}

// `maxTileZoom` is the deepest level Bing renders, while `maxNativeZoom` is compared against
// the map zoom; on retina displays `detectRetina` requests one level deeper and lowers
// `maxZoom` by the same offset, so both limits are restated once the offset is known
function applyTileZoomLimits() {
  L.BingLayer.addInitHook(function () {
    const { options } = this;
    const zoomOffset = options.zoomOffset || 0;
    options.maxZoom += zoomOffset;
    options.maxNativeZoom = options.maxTileZoom - zoomOffset;
  });
}
