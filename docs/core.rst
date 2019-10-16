Core
====

IITC defines some top-level variables in *main.js* that its internal modules
and first-party plugins use for configuration

Constants
---------

.. data:: window.PLAYER

  Defined by stock. Static (needs page reload to update).
  Stores information about the current player:

  * ``ap``: AP the player has (string)
  * ``available_invites``: Number of invitations this player can send
  * ``energy``: XM the player currently holds
  * ``min_ap_for_current_level``: AP required for the player's level (used for level progress)
  * ``min_ap_for_next_level``: AP required for the next level (used for level progress)
  * ``nickname``: The actual agent name
  * ``team``: Player faction. Can be "ENLIGHTENED" or "RESISTANCE"
  * ``verified_level``: Current player level

  IITC adds a few things in :function:`~window.setupPlayerStat()`:

  * ``nickMatcher``: RegExp used to match the player's agent name in chat
  * ``level``: Backwards compatibility, same as ``verified_level``.

.. data:: window.REFRESH

  Controls how often the map should refresh, in seconds, default 30.

.. data:: window.ZOOM_LEVEL_ADJ

  Controls the extra refresh delay per zoom level, in seconds, default 5.

.. data:: window.ON_MOVE_REFRESH

  Wait this long before refreshing the view after the map has been moved,
  in seconds, default 2.5

.. data:: window.MINIMUM_OVERRIDE_REFRESH

  “limit on refresh time since previous refresh, limiting repeated move
  refresh rate” (?), in seconds, default 10

.. data:: window.REFRESH_GAME_SCORE

  Controls how long to wait between refreshing the global score,
  in seconds, default 15*60 (15 mins)

.. data:: window.MAX_IDLE_TIME

  Controls how long, at most, can the map be inactive before refreshing,
  in secods, default 15*60 (15 mins)

.. data:: window.HIDDEN_SCROLLBAR_ASSUMED_WIDTH

  How much space to leave for scrollbars, in pixels, default 20.

.. data:: window.SIDEBAR_WIDTH

  How wide should the sidebar be, in pixels, default 300.

.. data:: window.CHAT_REQUEST_SCROLL_TOP

  Controls requesting chat data if chat is expanded based on the pixel distance
  from the line currently in view and the top of history, in pixels, default 200

.. data:: window.CHAT_SHRINKED

  Controls height of chat when chat is collapsed, in pixels, default 60

.. data:: window.FIELD_MU_DISPLAY_POINT_TOLERANCE

  Point tolerance(?) for displaying MUs, in unknown units, default 60

.. data:: window.COLOR_SELECTED_PORTAL

  What colour should the selected portal be, string(css hex code),
  default ‘#f0f’ (hot pink)

.. data:: window.COLORS

  ::

    ['#FF6600', '#0088FF', '#03DC03']; // none, res, enl

  Colour values for teams used in portals, player names, etc.

.. data:: window.COLORS_LVL

  ::

    ['#000', '#FECE5A', '#FFA630', '#FF7315', '#E40000', '#FD2992', '#EB26CD', '#C124E0', '#9627F4']

  Colour values for levels, consistent with Ingress, with index 0 being
  white for neutral portals.

.. data:: window.COLORS_MOD

  ::

    {VERY_RARE: '#b08cff', RARE: '#73a8ff', COMMON: '#8cffbf'}

  Colour values for displaying mods, consistent with Ingress.
  Very Rare also used for AXA shields and Ultra Links.

.. data:: window.MOD_TYPE

  ::

    {RES_SHIELD:'Shield', MULTIHACK:'Multi-hack', FORCE_AMP:'Force Amp', HEATSINK:'Heat Sink', TURRET:'Turret', LINK_AMPLIFIER: 'Link Amp'}

  Mod type dict for displaying mod names.

.. data:: window.ACCESS_INDICATOR_COLOR

  What colour should the hacking range circle be (the small circle that appears
  around a selected portal, marking a ~40 metre radius),
  string(css colour value), default ‘orange’

.. data:: window.RANGE_INDICATOR_COLOR

  What colour should the linkable range circle be, string(css colour value),
  default ‘red’

.. data:: window.MIN_ZOOM

  “min zoom for intel map - should match that used by stock intel”,
  in (leaflet zoom levels?), default 3

.. data:: window.NOMINATIM

  ::

    '//nominatim.openstreetmap.org/search?format=json&polygon_geojson=1&q='

  URL to call the Nominatim geocoder service, string.

.. data:: window.RESO_NRG

  Resonator energy per level, 1-based array, XM

.. data:: window.HACK_RANGE

  Maximum radius around a portal from which the portal is hackable, metres.

.. data:: window.OCTANTS

  ::

    ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE']

  Resonator octant cardinal directions

.. data:: window.OCTANT_ARROW

  ::

    ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘']

  Resonator octant arrows

.. data:: window.DESTROY_RESONATOR
          window.DESTROY_LINK
          window.DESTROY_FIELD
          window.CAPTURE_PORTAL
          window.DEPLOY_RESONATOR
          window.COMPLETION_BONUS
          window.UPGRADE_ANOTHERS_RESONATOR

  AP values for performing in-game actions. :data:`~window.COMPLETION_BONUS`: refers to
  the extra AP for deploying the last resonator on a portal.

.. data:: window.MAX_PORTAL_LEVEL

  Maximum portal level.

.. data:: window.MAX_RESO_PER_PLAYER

  ::

    [0, 8, 4, 4, 4, 2, 2, 1, 1]

  How many resonators of a given level can one deploy; 1-based array where the
  index is the resonator level.

.. data:: window.TEAM_NONE
          window.TEAM_RES
          window.TEAM_ENL

  Faction. NONE is 0, RES is 1, ENL is 2.

.. data:: window.TEAM_TO_CSS

  ::

    ['none', 'res', 'enl']

  Maps team to its CSS class. Presumably to be used like
  ``TEAM_TO_CSS[TEAM_ENL]``.


Variables
---------

.. data:: window.refreshTimeout

  Stores the id of the timeout that kicks off the next refresh
  (ie value returned by ``setTimeout()``)

.. data:: window.urlPortal

  Portal GUID if the original URL had it.

.. data:: window.urlPortalLL

  Portal lng/lat if the orignial URL had it.

.. data:: window.selectedPortal

  Stores the ID of the selected portal, or is ``null`` if there is none.

.. data:: window.portalRangeIndicator

  Reference to the linking range indicator of the selected portal. This is a
  Leaflet layer.

.. data:: window.portalAccessIndicator

  Reference to the hacking range indicator of the selected portal. This is a
  Leaflet layer.

.. data:: window.mapRunsUserAction

  Bool, true if the map is currently being moved. More precisely, this is true
  between the ``movestart`` and ``moveend`` events of the Leaflet map.

.. data:: window.portals
          window.links
          window.fields

  References to Leaflet objects for portals, links, and fields. These are
  indexed by the entity ID in an object, ie. ``{ id1: feature1, ...}``

  **Note:** Although these will be Leaflet objects, not all may be added to the
  map if render limits are reached.

.. data:: window.overlayStatus

  An object, where the keys are layer names and their values are bools true if
  the layer is enabled. Should mirror the layer selector UI.

  **Note:** The variable comment states that "you should use
  :function:`~window.isLayerGroupDisplayed(name)` to check the [layer] status"

.. function:: window.isLayerGroupDisplayed(name)

  Read layerGroup status from :data:`~window.overlayStatus` if it was added to map,
  read from cookie if it has not added to map yet.
  ``return 'defaultDisplay'`` if both ``overlayStatus`` and cookie didn't have the record

.. function:: window.plugin()

  A noop function/namespace/"plugin framework".

.. data:: window.bootPlugins

  A list of hooks that should be called after IITC has finished booting.
  Mostly used to initialise plugins. **Note:** These will not run if some
  blacklisted plugins are detected.
