Boot
====

Functions
---------

These were found in `code/boot.js`, and govern the initialisation process of
IITC. The header for the file says:

::

  /// SETUP /////////////////////////////////////////////////////////////
  // these functions set up specific areas after the boot function
  // created a basic framework. All of these functions should only ever
  // be run once.

.. function:: window.setupLargeImagePreview()

  Sets up event listeners for large portal image view. This is the dialogue
  you get when you click on the portal photo in the sidebar.

.. function:: window.setupLayerChooserSelectOne()

    Adds listeners to the layer chooser such that a long press hides
    all custom layers except the long pressed one.

  Actually, it seems you can also use meta-click, ctrl-click, shift-click
  or alt-click to trigger this behaviour.

.. function:: window.setupLayerChooserStatusRecorder()

  Sets up the :data:`~window.overlayStatus` dict from what layers are visible
  on the map, and sets up event listeners that update this dict based on
  layers being hidden and removed from the Leaflet map.

  **Note:** This does not actually modify the dict directly, but rather it uses
  the :function:`~window.updateDisplayedLayerGroup(name, display)` function.

.. function:: window.updateDisplayedLayerGroup(name, display)

  Update layerGroups display status to window.overlayStatus and localStorage
  'ingress.intelmap.layergroupdisplayed'

.. function:: window.layerChooserSetDisabledStates()

  Enables/disables portal layers in the selector based on zoom level.

.. function:: window.setupStyles()

  Adds IITC's CSS to ``<head>``.

.. function:: createDefaultBaseMapLayers()

  |privfn|

  Sets up the default basemap tiles: MapQuest, CartoDB, Google Ingress,
  Google Roads, Google Satellite, Google Hybrid and Google Terrain.

.. function:: window.setupMap()

  Sets up the Leaflet map. Note that there is a TODO entry there to
  move IITC's DOM into Leaflet control areas (it is currently just
  overlaying the map div completely).

  This also sets up a few interesting event listeners. First,
  when the user moves the map, all requests that go through
  :data:`window.requests` are aborted, and the refresh timeout is cleared.
  Second, it calls :function:`~window.layerChooserSetDisabledStates()` on zoom
  end. Finally, it sets up the map data requester and starts refreshing.

.. function:: window.setMapBaseLayer()

  Adds a basemap (tile layer) to the Leaflet map. As documented in source,
  this is done separately from :function:`~window.setupMap()` to allow plugins
  to add their own tile layers (ie. Stamen tiles, OSM tiles).

.. function:: window.setupPlayerStat()

  Renders player details into the website. Since the player info is
  included as inline script in the original site, the data is static
  and cannot be updated.
  for historical reasons IITC expects :data:`~window.PLAYER`.``level`` to
  contain the current player level.

.. function:: window.setupSidebarToggle()

  Sets up the sidebar toggle button.

.. function:: window.setupTooltips()

  Sets up the tooltips and the ``window.tooltipClearerHasBeenSetup`` flag.

.. function:: window.setupTaphold()

  Container for the `Taphold jQuery plugin <https://github.com/richadams/jquery-taphold>`_.

.. function:: window.setupQRLoadLib()

  Container for the `qrcode jQuery plugin <https://larsjung.de/jquery-qrcode/>`_.

.. function:: window.setupLayerChooserApi()

  Sets up the layer chooser API. In particular, it helps unify the HTML layer
  chooser and the IITCm Android app layer chooser (which is a native component).

.. function:: window.layerChooser.getLayers()

  :returns: Layer settings grouped by ``baseLayers`` and ``overlayLayers``

  Gets the available layers. Both layer arrays contain objects like
  ``{ active: bool, layerId: int, name: string }``

.. function:: window.layerChooser.showLayer(id[, show])

  :param int id: The layer ID
  :param bool show: Pass ``false`` to hide the layer

  Shows or hides the basemap or overlay layer with id ``id``.

.. function:: window.boot()

  Main boot function. This also boots the plugins using the plugin API.
  It also maintains a blacklist of plugins that, if present, will prevent
  a normal startup of the plugin system (ie. none of ``window.bootPlugins``
  functions will be called).
