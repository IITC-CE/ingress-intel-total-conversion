// Based on https://gitlab.com/IvanSanchez/Leaflet.GridLayer.GoogleMutant
// and on https://github.com/shramov/leaflet-plugins
// GridLayer like https://avinmathew.com/leaflet-and-google-maps/ , but using MutationObserver instead of jQuery



// 🍂class GridLayer.GoogleMutant
// 🍂extends GridLayer
L.GridLayer.YandexMutant = L.GridLayer.extend({
	includes: L.Mixin.Events,

	options: {
		minZoom: 0,
		maxZoom: 18,
		// The mutant container will add its own attribution anyways.
		attribution: '',	
		opacity: 1,
		traffic: false,
		noWrap: false,
		type: 'yandex#map'
	},

	possibleShortMapTypes: {
		schemaMap: 'map',
		satelliteMap: 'satellite',
		hybridMap: 'hybrid',
		publicMap: 'publicMap',
		publicMapInHybridView: 'publicMapHybrid'
	},
	
	_getPossibleMapType: function (mapType) {
		var result = 'yandex#map';
		if (typeof mapType !== 'string') {
			return result;
		}
		for (var key in this.possibleShortMapTypes) {
			if (mapType === this.possibleShortMapTypes[key]) {
				result = 'yandex#' + mapType;
				break;
			}
			if (mapType === ('yandex#' + this.possibleShortMapTypes[key])) {
				result = mapType;
			}
		}
		return result;
	},
	
	initialize: function (options) {
		if (options && options.type) {
			options.type = this._getPossibleMapType(options.type);
		}
		L.GridLayer.prototype.initialize.call(this, options);

		this._ready = !!window.ymaps && !!window.ymaps.Map;
		
		this._YAPIPromise = this._ready ? Promise.resolve(window.ymaps) : new Promise(function (resolve, reject) {
			var checkCounter = 0;
			var intervalId = null;
			intervalId = setInterval(function () {
				if (checkCounter >= 10) {
					clearInterval(intervalId);
					return reject(new Error('window.ymaps not found after 10 attempts'));
				}
				if (!!window.ymaps) {
					clearInterval(intervalId);
					if (ymaps.Map === undefined) {
						return ymaps.load(['package.map'], resolve, ymaps);
					}
					else {
						return resolve(window.ymaps);
					}
				}
				checkCounter++;
			}, 500);
		});

		// Couple data structures indexed by tile key
		this._tileCallbacks = {};	// Callbacks for promises for tiles that are expected
		this._freshTiles = {};	// Tiles from the mutant which haven't been requested yet

		this._imagesPerTile = 1;
		this.createTile = this._createSingleTile;
	},

	onAdd: function (map) {
		L.GridLayer.prototype.onAdd.call(this, map);
		this._initMutantContainer();

		this._YAPIPromise.then(function () {
			this._ready = true;
			this._map = map;
			
			this._initMutant();
			
			map.on('viewreset', this._reset, this);
			map.on('move', this._update, this);
			map.on('zoomend', this._handleZoomAnim, this);
			map.on('resize', this._resize, this);
			
			map._controlCorners.bottomright.style.marginBottom = '4em';

			this._reset();
			this._update();
		}.bind(this));
	},

	onRemove: function (map) {
		L.GridLayer.prototype.onRemove.call(this, map);
		map._container.removeChild(this._mutantContainer);
		this._mutantContainer = undefined;

		map.off('viewreset', this._reset, this);
		map.off('move', this._update, this);
		map.off('zoomend', this._handleZoomAnim, this);
		map.off('resize', this._resize, this);

		map._controlCorners.bottomright.style.marginBottom = '0em';
	},

	getAttribution: function () {
		return this.options.attribution;
	},

	setOpacity: function (opacity) {
		this.options.opacity = opacity;
		if (opacity < 1) {
			L.DomUtil.setOpacity(this._mutantContainer, opacity);
		}
	},

	setElementSize: function (e, size) {
		e.style.width = size.x + 'px';
		e.style.height = size.y + 'px';
	},

	_initMutantContainer: function () {
		if (!this._mutantContainer) {
			this._mutantContainer = L.DomUtil.create('div', 'leaflet-yandex-mutant leaflet-top leaflet-left');
			this._mutantContainer.id = '_MutantContainer_' + L.Util.stamp(this._mutantContainer);
			this._mutantContainer.style.zIndex = 'auto';
			this._mutantContainer.style.pointerEvents = 'none';

			this._map.getContainer().appendChild(this._mutantContainer);
		}

		this.setOpacity(this.options.opacity);
		this.setElementSize(this._mutantContainer, this._map.getSize());

		this._attachObserver(this._mutantContainer);
	},

	_initMutant: function () {
		if (!this._ready || !this._mutantContainer) return;
		this._mutantCenter = [0, 0];

		// If traffic layer is requested check if control.TrafficControl is ready
		if (this.options.traffic) {
			if (ymaps.control === undefined ||
					ymaps.control.TrafficControl === undefined) {
				return ymaps.load(['package.traffic', 'package.controls'],
					this._initMutant, this);
			}
		}
		
		var map = new ymaps.Map(this._mutantContainer, {
			center: this._mutantCenter,
			zoom: 0,
			type: this.options.type,
			behaviors: [],
			controls: []
		}, {
			autoFitToViewport: 'none',
			exitFullscreenByEsc: false,
			yandexMapDisablePoiInteractivity: true
		});

		if (this.options.traffic) {
			map.controls.add(new ymaps.control.TrafficControl({shown: true}));
		}

		if (this.options.type === 'yandex#null') {
			this.options.type = new ymaps.MapType('null', []);
			map.container.getElement().style.background = 'transparent';
		}
		map.setType(this.options.type);
		
		this._mutant = map;

		// 🍂event spawned
		// Fired when the mutant has been created.
		this.fire('spawned', {mapObject: map});
	},

	_attachObserver: function _attachObserver (node) {
		var observer = new MutationObserver(this._onMutations.bind(this));

		// pass in the target node, as well as the observer options
		observer.observe(node, { childList: true, subtree: true });
	},

	_onMutations: function _onMutations (mutations) {
		for (var i = 0; i < mutations.length; ++i) {
			var mutation = mutations[i];
			for (var j = 0; j < mutation.addedNodes.length; ++j) {
				var node = mutation.addedNodes[j];

				if (node instanceof HTMLImageElement) {
					this._onMutatedImage(node);
				} else if (node instanceof HTMLElement) {
					Array.prototype.forEach.call(node.querySelectorAll('img'), this._onMutatedImage.bind(this));
				}
			}
		}
	},

	// Only images which 'src' attrib match this will be considered for moving around.
	// Looks like some kind of string-based protobuf, maybe??
	// Only the roads (and terrain, and vector-based stuff) match this pattern
	_roadRegexp: /!1i(\d+)!2i(\d+)!3i(\d+)!/,

	// On the other hand, raster imagery matches this other pattern
	_satRegexp: /x=(\d+)&y=(\d+)&z=(\d+)/,

	// On small viewports, when zooming in/out, a static image is requested
	// This will not be moved around, just removed from the DOM.
	_staticRegExp: /StaticMapService\.GetMapImage/,

	_onMutatedImage: function _onMutatedImage (imgNode) {
		var coords;
		var match = imgNode.src.match(this._roadRegexp);
		var sublayer, parent;

		if (match) {
			coords = {
				z: match[1],
				x: match[2],
				y: match[3]
			};
			if (this._imagesPerTile > 1) { imgNode.style.zIndex = 1; }
			sublayer = 1;
		} else {
			match = imgNode.src.match(this._satRegexp);
			if (match) {
				coords = {
					x: match[1],
					y: match[2],
					z: match[3]
				};
			}
			sublayer = 0;
		}

		if (coords) {
			var key = this._tileCoordsToKey(coords);
			if (this._imagesPerTile > 1) { key += '/' + sublayer; }
			if (key in this._tileCallbacks && this._tileCallbacks[key]) {
// console.log('Fullfilling callback ', key);
				this._tileCallbacks[key].pop()(imgNode);
				if (!this._tileCallbacks[key].length) { delete this._tileCallbacks[key]; }
			} else {
// console.log('Caching for later', key);
				parent = imgNode.parentNode;
				if (parent) {
					parent.removeChild(imgNode);
					parent.removeChild = L.Util.falseFn;
// 					imgNode.parentNode.replaceChild(L.DomUtil.create('img'), imgNode);
				}
				if (key in this._freshTiles) {
					this._freshTiles[key].push(imgNode);
				} else {
					this._freshTiles[key] = [imgNode];
				}
			}
		} else if (imgNode.src.match(this._staticRegExp)) {
			parent = imgNode.parentNode;
			if (parent) {
				// Remove the image, but don't store it anywhere.
				// Image needs to be replaced instead of removed, as the container
				// seems to be reused.
				imgNode.parentNode.replaceChild(L.DomUtil.create('img'), imgNode);
			}
		}
	},

	// This will be used as this.createTile for 'map', 'satellite'
	_createSingleTile: function createTile (coords, done) {
		var key = this._tileCoordsToKey(coords);
// console.log('Need:', key);

		if (key in this._freshTiles) {
			var tile = this._freshTiles[key].pop();
			if (!this._freshTiles[key].length) { delete this._freshTiles[key]; }
			L.Util.requestAnimFrame(done);
// 			console.log('Got ', key, ' from _freshTiles');
			return tile;
		} else {
			var tileContainer = L.DomUtil.create('div');
			this._tileCallbacks[key] = this._tileCallbacks[key] || [];
			this._tileCallbacks[key].push( (function (c/*, k*/) {
				return function (imgNode) {
					var parent = imgNode.parentNode;
					if (parent) {
						parent.removeChild(imgNode);
						parent.removeChild = L.Util.falseFn;
// 						imgNode.parentNode.replaceChild(L.DomUtil.create('img'), imgNode);
					}
					c.appendChild(imgNode);
					done();
// 					console.log('Sent ', k, ' to _tileCallbacks');
				}.bind(this);
			}.bind(this))(tileContainer/*, key*/) );

			return tileContainer;
		}
	},

	_checkZoomLevels: function () {
		//setting the zoom level on the Google map may result in a different zoom level than the one requested
		//(it won't go beyond the level for which they have data).
		// verify and make sure the zoom levels on both Leaflet and Google maps are consistent
		if ((this._map.getZoom() !== undefined) && (this._mutant.getZoom() !== this._map.getZoom())) {
			//zoom levels are out of sync. Set the leaflet zoom level to match the google one
			this._map.setZoom(this._mutant.getZoom());
		}
	},

	_reset: function () {
		this._initContainer();
	},

	_update: function () {
		L.GridLayer.prototype._update.call(this);
		if (!this._mutant) return;

		var center = this._map.getCenter();
		var _center = [center.lat, center.lng];

		this._mutant.setCenter(_center);
		var zoom = this._map.getZoom();
		if (zoom !== undefined) {
			this._mutant.setZoom(Math.round(this._map.getZoom()));
		}
	},

	_resize: function () {
		var size = this._map.getSize();
		if (this._mutantContainer.style.width === size.x &&
			this._mutantContainer.style.height === size.y)
			return;
		this.setElementSize(this._mutantContainer, size);
		if (!this._mutant) return;
		this._mutant.container.fitToViewport();
	},

	_handleZoomAnim: function () {
		var center = this._map.getCenter();
		var _center = [center.lat, center.lng];

		this._mutant.setCenter(_center);
		this._mutant.setZoom(Math.round(this._map.getZoom()));
	},

	// Agressively prune _freshtiles when a tile with the same key is removed,
	// this prevents a problem where Leaflet keeps a loaded tile longer than
	// YMaps, so that YMaps makes two requests but Leaflet only consumes one,
	// polluting _freshTiles with stale data.
	_removeTile: function (key) {
		if (this._imagesPerTile > 1) {
			for (var i=0; i<this._imagesPerTile; i++) {
				var key2 = key + '/' + i;
				if (key2 in this._freshTiles) { delete this._freshTiles[key2]; }
// 				console.log('Pruned spurious hybrid _freshTiles');
			}
		} else {
			if (key in this._freshTiles) {
				delete this._freshTiles[key];
// 				console.log('Pruned spurious _freshTiles', key);
			}
		}

		return L.GridLayer.prototype._removeTile.call(this, key);
	}
});


// 🍂factory gridLayer.googleMutant(options)
// Returns a new `GridLayer.GoogleMutant` given its options
L.gridLayer.yandexMutant = function (options) {
	return new L.GridLayer.YandexMutant(options);
};
