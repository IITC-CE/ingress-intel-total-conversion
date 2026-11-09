// @author         jonatkins
// @name           Stamen.com map layers
// @category       Map Tiles
// @version        0.3.0
// @description    Add the Stamen map layers, hosted by Stadia Maps.

/* exported setup, changelog --eslint */
/* global IITC, L -- eslint */

const changelog = [
  {
    version: '0.3.0',
    changes: [
      'Fix the layers failing to load after Stamen shut down its tile servers',
      'Tiles now come from Stadia Maps',
      'Add the Terrain and Toner Dark layers',
      'Request high density tiles on retina displays',
      'Fix the Watercolor zoom limit',
      'Report the layers as light or dark for theme switching',
    ],
  },
  {
    version: '0.2.5',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.2.4',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.2.3',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
const mapStamen = {};

// Stadia Maps hosts the Stamen styles and serves them to registered accounts only
// https://docs.stadiamaps.com/authentication
// this is the key IITC comes with; a key of the user's own on the API keys page replaces it
mapStamen.apiKey = '51a526b0-a035-4b6b-9c35-778bdff3095d';

// `{r}` is filled with `@2x` on retina displays, where Stadia renders the tile at double resolution
mapStamen.tileServer = 'https://tiles.stadiamaps.com/tiles/{layer}/{z}/{x}/{y}{r}.{type}';

mapStamen.attribution = [
  '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> ',
  '&copy; <a href="https://stamen.com/">Stamen Design</a> ',
  '&copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> ',
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
].join('');

// watercolor is painted straight from OpenStreetMap, without the OpenMapTiles schema the other styles use
mapStamen.watercolorAttribution = [
  '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> ',
  '&copy; <a href="https://stamen.com/">Stamen Design</a> ',
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
].join('');

mapStamen.options = {
  minZoom: 0,
  maxZoom: 21,
  // Stadia renders one level past this, but each level costs four times the tiles, so the last one is upscaled
  maxNativeZoom: 20,
  type: 'png',
  attribution: mapStamen.attribution,
};

mapStamen.sets = {
  Toner: { isDark: false },
  'Toner Background': { isDark: false },
  'Toner Lite': { isDark: false },
  'Toner Dark': { isDark: true },
  Terrain: { isDark: true },
  // transparent layers. could be useful over satellite imagery or similar
  // 'Toner Lines': { isDark: false },
  // 'Toner Labels': { isDark: false },
  // 'Terrain Lines': { isDark: false },
  // 'Terrain Labels': { isDark: false },
  Watercolor: {
    type: 'jpg',
    maxNativeZoom: 16,
    attribution: mapStamen.watercolorAttribution,
    isDark: true,
  },
};

function setup() {
  const layers = [];
  // address of the tiles, with the key of the user or else the one IITC comes with
  const url = () => {
    const key = IITC.options.get('api-keys.stadia').trim() || mapStamen.apiKey;
    return key ? `${mapStamen.tileServer}?api_key=${encodeURIComponent(key)}` : mapStamen.tileServer;
  };

  IITC.options.extend('api-keys', 'basemap-stamen', {
    title: 'Stadia Maps',
    namespace: 'api-keys',
    blocks: [
      {
        type: 'string',
        key: 'stadia',
        title: 'API key',
        description: 'For the Stamen layers. Empty uses the key IITC comes with',
        onChange: () => layers.forEach((layer) => layer.setUrl(url())),
      },
      { type: 'link', title: 'Get a key', url: 'https://client.stadiamaps.com/signup/' },
    ],
  });

  for (const [name, set] of Object.entries(mapStamen.sets)) {
    const layer = `stamen_${name.replace(/ /g, '_').toLowerCase()}`;
    const options = { ...mapStamen.options, ...set, layer };
    const tileLayer = L.tileLayer(url(), options);
    layers.push(tileLayer);
    window.layerChooser.addBaseLayer(tileLayer, `Stamen ${name}`, { isDark: options.isDark });
  }
}
