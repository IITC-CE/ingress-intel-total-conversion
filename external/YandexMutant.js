// Based on https://github.com/shramov/leaflet-plugins
// GridLayer like https://avinmathew.com/leaflet-and-google-maps/ , but using MutationObserver instead of jQuery


// 🍂class GridLayer.YandexMutant
// 🍂extends GridLayer
L.GridLayer.YandexMutant = L.GridLayer.extend({
	options: {
		minZoom: 0,
		maxZoom: 23,
		attribution: '',	// The mutant container will add its own attribution anyways.
		opacity: 1,
		noWrap: false,
		// 🍂option type: String
		// Yandex map type. Valid values see in `possibleShortMapTypes`.
		type: 'yandex#map',
		maxNativeZoom: 18
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

		this._boundOnMutatedImage = this._onMutatedImage.bind(this);
	},

	onAdd: function (map) {
		L.GridLayer.prototype.onAdd.call(this, map);
		this._initMutantContainer();

		this._YAPIPromise.then(function () {
			this._ready = true;
			this._map = map;

			this._initMutant();

			map.on('viewreset', this._reset, this);
			if (this.options.updateWhenIdle) {
				map.on('moveend', this._update, this);
			} else {
				map.on('move', this._update, this);
			}
			map.on('zoomend', this._handleZoomAnim, this);
			map.on('resize', this._resize, this);

			//handle layer being added to a map for which there are no Google tiles at the given zoom
			google.maps.event.addListenerOnce(this._mutant, 'idle', function () {
				this._checkZoomLevels();
				this._mutantIsReady = true;
			}.bind(this));

			//20px instead of 1em to avoid a slight overlap with google's attribution
			map._controlCorners.bottomright.style.marginBottom = '20px';
			map._controlCorners.bottomleft.style.marginBottom = '20px';

			this._reset();
			this._update();
		}.bind(this));
	},

	onRemove: function (map) {
		L.GridLayer.prototype.onRemove.call(this, map);
		this._observer.disconnect();
		map._container.removeChild(this._mutantContainer);

		google.maps.event.clearListeners(map, 'idle');
		google.maps.event.clearListeners(this._mutant, 'idle');
		map.off('viewreset', this._reset, this);
		map.off('move', this._update, this);
		map.off('moveend', this._update, this);
		map.off('zoomend', this._handleZoomAnim, this);
		map.off('resize', this._resize, this);

		if (map._controlCorners) {
			map._controlCorners.bottomright.style.marginBottom = '0em';
			map._controlCorners.bottomleft.style.marginBottom = '0em';
		}
	},

	getAttribution: function () {
		return this.options.attribution;
	},

	setElementSize: function (e, size) {
		e.style.width = size.x + 'px';
		e.style.height = size.y + 'px';
	},


	_initMutantContainer: function () {
		if (!this._mutantContainer) {
			this._mutantContainer = L.DomUtil.create('div', 'leaflet-yandex-mutant leaflet-top leaflet-left');
			this._mutantContainer.id = '_MutantContainer_' + L.Util.stamp(this._mutantContainer);
			this._mutantContainer.style.zIndex = '300'; //leaflet map pane at 400, controls at 1000
			this._mutantContainer.style.pointerEvents = 'none';

			L.DomEvent.off(this._mutantContainer);

		}
		this._map.getContainer().appendChild(this._mutantContainer);

		this.setOpacity(this.options.opacity);
		this.setElementSize(this._mutantContainer, this._map.getSize());

		this._attachObserver(this._mutantContainer);
	},

	_initMutant: function () {
		if (!this._ready || !this._mutantContainer) return;

		if (this._mutant) {
			// reuse old _mutant, just make sure it has the correct size
			this._resize();
			return;
		}

		this._mutantCenter = [0, 0];

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

		google.maps.event.addListenerOnce(map, 'idle', function () {
			var nodes = this._mutantContainer.querySelectorAll('a');
			for (var i = 0; i < nodes.length; i++) {
				nodes[i].style.pointerEvents = 'auto';
			}
		}.bind(this));

		// 🍂event spawned
		// Fired when the mutant has been created.
		this.fire('spawned', {mapObject: map});
	},

	_attachObserver: function _attachObserver (node) {
// 		console.log('Gonna observe', node);

		if (!this._observer)
			this._observer = new MutationObserver(this._onMutations.bind(this));

		// pass in the target node, as well as the observer options
		this._observer.observe(node, { childList: true, subtree: true });

		// if we are reusing an old _mutantContainer, we must manually detect
		// all existing tiles in it
		Array.prototype.forEach.call(
			node.querySelectorAll('img'),
			this._boundOnMutatedImage
		);
	},

	_onMutations: function _onMutations (mutations) {
		for (var i = 0; i < mutations.length; ++i) {
			var mutation = mutations[i];
			for (var j = 0; j < mutation.addedNodes.length; ++j) {
				var node = mutation.addedNodes[j];

				if (node instanceof HTMLImageElement) {
					this._onMutatedImage(node);
				} else if (node instanceof HTMLElement) {
					Array.prototype.forEach.call(
						node.querySelectorAll('img'),
						this._boundOnMutatedImage
					);

					// Check for, and remove, the "Google Maps can't load correctly" div.
					// You *are* loading correctly, you dumbwit.
					if (node.style.backgroundColor === 'white') {
						L.DomUtil.remove(node);
					}

					// Check for, and remove, the "For development purposes only" divs on the aerial/hybrid tiles.
					if (node.textContent.indexOf('For development purposes only') === 0) {
						L.DomUtil.remove(node);
					}

					// Check for, and remove, the "Sorry, we have no imagery here"
					// empty <div>s. The [style*="text-align: center"] selector
					// avoids matching the attribution notice.
					// This empty div doesn't have a reference to the tile
					// coordinates, so it's not possible to mark the tile as
					// failed.
					Array.prototype.forEach.call(
						node.querySelectorAll('div[draggable=false][style*="text-align: center"]'),
						L.DomUtil.remove
					);
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
// 		if (imgNode.src) {
// 			console.log('caught mutated image: ', imgNode.src);
// 		}

		var coords;
		var match = imgNode.src.match(this._roadRegexp);
		var sublayer = 0;

		if (match) {
			coords = {
				z: match[1],
				x: match[2],
				y: match[3]
			};
			if (this._imagesPerTile > 1) {
				imgNode.style.zIndex = 1;
				sublayer = 1;
			}
		} else {
			match = imgNode.src.match(this._satRegexp);
			if (match) {
				coords = {
					x: match[1],
					y: match[2],
					z: match[3]
				};
			}
// 			imgNode.style.zIndex = 0;
			sublayer = 0;
		}

		if (coords) {
			var tileKey = this._tileCoordsToKey(coords);
			imgNode.style.position = 'absolute';
			imgNode.style.visibility = 'hidden';

			var key = tileKey + '/' + sublayer;
			// console.log('mutation for tile', key)
			//store img so it can also be used in subsequent tile requests
			this._freshTiles[key] = imgNode;

			if (key in this._tileCallbacks && this._tileCallbacks[key]) {
// console.log('Fullfilling callback ', key);
				//fullfill most recent tileCallback because there maybe callbacks that will never get a
				//corresponding mutation (because map moved to quickly...)
				this._tileCallbacks[key].pop()(imgNode);
				if (!this._tileCallbacks[key].length) { delete this._tileCallbacks[key]; }
			} else {
				if (this._tiles[tileKey]) {
					//we already have a tile in this position (mutation is probably a google layer being added)
					//replace it
					var c = this._tiles[tileKey].el;
					var oldImg = (sublayer === 0) ? c.firstChild : c.firstChild.nextSibling;
					var cloneImgNode = this._clone(imgNode);
					c.replaceChild(cloneImgNode, oldImg);
				}
			}
		} else if (imgNode.src.match(this._staticRegExp)) {
			imgNode.style.visibility = 'hidden';
		}
	},


	createTile: function (coords, done) {
		var key = this._tileCoordsToKey(coords);

		var tileContainer = L.DomUtil.create('div');
		tileContainer.dataset.pending = this._imagesPerTile;
		done = done.bind(this, null, tileContainer);

		for (var i = 0; i < this._imagesPerTile; i++) {
			var key2 = key + '/' + i;
			if (key2 in this._freshTiles) {
				var imgNode = this._freshTiles[key2];
				tileContainer.appendChild(this._clone(imgNode));
				tileContainer.dataset.pending--;
// 				console.log('Got ', key2, ' from _freshTiles');
			} else {
				this._tileCallbacks[key2] = this._tileCallbacks[key2] || [];
				this._tileCallbacks[key2].push( (function (c/*, k2*/) {
					return function (imgNode) {
						c.appendChild(this._clone(imgNode));
						c.dataset.pending--;
						if (!parseInt(c.dataset.pending)) { done(); }
// 						console.log('Sent ', k2, ' to _tileCallbacks, still ', c.dataset.pending, ' images to go');
					}.bind(this);
				}.bind(this))(tileContainer/*, key2*/) );
			}
		}

		if (!parseInt(tileContainer.dataset.pending)) {
			L.Util.requestAnimFrame(done);
		}
		return tileContainer;
	},

	_clone: function (imgNode) {
		var clonedImgNode = imgNode.cloneNode(true);
		clonedImgNode.style.visibility = 'visible';
		return clonedImgNode;
	},

	_checkZoomLevels: function () {
		//setting the zoom level on the Google map may result in a different zoom level than the one requested
		//(it won't go beyond the level for which they have data).
		var zoomLevel = this._map.getZoom();
		var gMapZoomLevel = this._mutant.getZoom();
		if (!zoomLevel || !gMapZoomLevel) return;


		if ((gMapZoomLevel !== zoomLevel) || //zoom levels are out of sync, Google doesn't have data
			(gMapZoomLevel > this.options.maxNativeZoom)) { //at current location, Google does have data (contrary to maxNativeZoom)
			//Update maxNativeZoom
			this._setMaxNativeZoom(gMapZoomLevel);
		}
	},

	_setMaxNativeZoom: function (zoomLevel) {
		if (zoomLevel != this.options.maxNativeZoom) {
			this.options.maxNativeZoom = zoomLevel;
			this._resetView();
		}
	},

	_reset: function () {
		this._initContainer();
	},

	_update: function () {
		// zoom level check needs to happen before super's implementation (tile addition/creation)
		// otherwise tiles may be missed if maxNativeZoom is not yet correctly determined
		if (this._mutant) {
			var center = this._map.getCenter();
			var _center = [center.lat, center.lng];

			this._mutant.setCenter(_center);
			var zoom = this._map.getZoom();
			var fractionalLevel = zoom !== Math.round(zoom);
			var mutantZoom = this._mutant.getZoom();

			//ignore fractional zoom levels
			if (!fractionalLevel && (zoom != mutantZoom)) {
				this._mutant.setZoom(zoom);

				if (this._mutantIsReady) this._checkZoomLevels();
				//else zoom level check will be done later by 'idle' handler
			}
		}

		L.GridLayer.prototype._update.call(this);
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
		if (!this._mutant) return;
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
		if (!this._mutant) return;

		//give time for animations to finish before checking it tile should be pruned
		setTimeout(this._pruneTile.bind(this, key), 1000);


		return L.GridLayer.prototype._removeTile.call(this, key);
	},

	_pruneTile: function (key) {
		var yZoom = this._mutant.getZoom();
		var tileZoom = key.split(':')[2];
		var yMapBounds = L.latLngBounds(this._mutant.getBounds());

		for (var i=0; i<this._imagesPerTile; i++) {
			var key2 = key + '/' + i;
			if (key2 in this._freshTiles) {
				var tileBounds = this._map && this._keyToBounds(key);
				var stillVisible = this._map && tileBounds.overlaps(yMapBounds) && (tileZoom == yZoom);

				if (!stillVisible) delete this._freshTiles[key2];
//				console.log('Prunning of ', key, (!stillVisible))
			}
		}
	}
});


// 🍂factory gridLayer.yandexMutant(options)
// Returns a new `GridLayer.YandexMutant` given its options
L.gridLayer.yandexMutant = function (options) {
	return new L.GridLayer.YandexMutant(options);
};
