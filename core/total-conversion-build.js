// @author         jonatkins
// @name           IITC: Ingress intel map total conversion
// @version        0.37.1
// @description    Total conversion for the ingress intel map.
// @run-at         document-end

// create IITC scope
var IITC = {};
window.IITC = IITC;

window.script_info = plugin_info;
window.script_info.changelog = [
  {
    version: '0.38.0',
    changes: ['Function marked deprecated: portalApGainMaths, getPortalApGain, potentialPortalLevel, findPortalLatLng'],
  },
  {
    version: '0.37.1',
    changes: ['New machina ranges according to latest research - https://linktr.ee/machina.research'],
  },
  {
    version: '0.37.0',
    changes: ['Keep COMM message team in parsed data as player.team may differ from team'],
  },
  {
    version: '0.36.1',
    changes: ['Revert sorted sidebar links'],
  },
  {
    version: '0.36.0',
    changes: [
      'Ability to define and display changelog',
      'Improved info panel styling',
      'Timestamp added to link and field data',
      'Added scanner link to info panel',
      'Sorted sidebar links',
      'Added window.formatDistance function for global use, which was previously in the bookmarks plugin',
    ],
  },
];

/**
 * PLAYER
 * @namespace player
 */

/**
 * window.PLAYER
 * Represents the current player's status in the game. This object is defined by stock and is static,
 * meaning it requires a page reload to update. The PLAYER object stores various pieces of information
 * about the player, which are detailed below.
 *
 * Additional properties (`nickMatcher` and `level`) added by IITC in {@link sidebar.setupPlayerStat}
 *
 * @property {string} ap - The amount of AP (Access Points) the player currently has.
 * @property {number} available_invites - The number of invitations the player can send.
 * @property {number} energy - The amount of XM (Exotic Matter) the player currently holds.
 * @property {number} min_ap_for_current_level - The AP required for the player's current level, used for tracking level progress.
 * @property {number} min_ap_for_next_level - The AP required for the next level, used for tracking level progress.
 * @property {string} nickname - The agent name of the player.
 * @property {string} team - The faction of the player, which can be either "ENLIGHTENED" or "RESISTANCE".
 * @property {number} verified_level - Current player level.
 *
 * Additional properties
 * @property {RegExp} nickMatcher - A regular expression used to match the player's agent name in chat. Added by IITC.
 * @property {number} level - Backwards compatibility property, equivalent to `verified_level`. Added by IITC.
 *
 * @typedef {Object} PLAYER
 * @memberof player
 */

// REPLACE ORIG SITE ///////////////////////////////////////////////////
if (document.documentElement.getAttribute('itemscope') !== null) {
  throw new Error('Ingress Intel Website is down, not a userscript issue.');
}
window.iitcBuildDate = '@build_date@';

// disable vanilla JS
window.onload = function() {};
document.body.onload = function() {};

//originally code here parsed the <Script> tags from the page to find the one that defined the PLAYER object
//however, that's already been executed, so we can just access PLAYER - no messing around needed!

if (!window.PLAYER || !PLAYER.nickname) {
  // page doesn’t have a script tag with player information.
  if (document.getElementById('header_email')) {
    // however, we are logged in.
    // it used to be regularly common to get temporary 'account not enabled' messages from the intel site.
    // however, this is no longer common. more common is users getting account suspended/banned - and this
    // currently shows the 'not enabled' message. so it's safer to not repeatedly reload in this case
    // //setTimeout('location.reload();', 3*1000);
    throw new Error("Logged in but page doesn't have player data");
  }
  // FIXME: handle nia takedown in progress

  // add login form stylesheet
  var style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(document.createTextNode('@include_string:login.css@'));
  document.head.appendChild(style);

  throw new Error("Couldn't retrieve player data. Are you logged in?");
}

// player information is now available in a hash like this:
// window.PLAYER = {"ap": "123", "energy": 123, "available_invites": 123, "nickname": "somenick", "team": "ENLIGHTENED||RESISTANCE"};

// remove complete page. We only wanted the user-data and the page’s
// security context so we can access the API easily. Setup as much as
// possible without requiring scripts.
document.head.innerHTML = ''
  + '<title>Ingress Intel Map</title>'
  + '<style>'+'@include_string:style.css@'+'</style>'
  + '<style>'+'@include_css:external/leaflet.css@'+'</style>'
  + '<style>'+'@include_css:external/jquery-ui-1.12.1-resizable.css@'+'</style>'
//note: smartphone.css injection moved into code/smartphone.js
  + '<link rel="stylesheet" type="text/css" href="//fonts.googleapis.com/css?family=Roboto:100,100italic,300,300italic,400,400italic,500,500italic,700,700italic&subset=latin,cyrillic-ext,greek-ext,greek,vietnamese,latin-ext,cyrillic"/>';

// remove body element entirely to remove event listeners
document.body = document.createElement('body');
document.body.innerHTML = ''
  + '<div id="map">Loading, please wait</div>'
  + '<div id="chatcontrols" style="display:none">'
  + '<a accesskey="0" title="[0]"><span class="toggle"></span></a>'
  + '<a accesskey="1" title="[1]">all</a>'
  + '<a accesskey="2" title="[2]" class="active">faction</a>'
  + '<a accesskey="3" title="[3]">alerts</a>'
  + '</div>'
  + '<div id="chat" style="display:none">'
  + '  <div id="chatfaction"></div>'
  + '  <div id="chatall"></div>'
  + '  <div id="chatalerts"></div>'
  + '</div>'
  + '<form id="chatinput" style="display:none"><table><tr>'
  + '  <td><time></time></td>'
  + '  <td><mark>tell faction:</mark></td>'
  + '  <td><input id="chattext" type="text" maxlength="256" accesskey="c" title="[c]" /></td>'
  + '</tr></table></form>'
  + '<a id="sidebartoggle" accesskey="i" title="Toggle sidebar [i]"><span class="toggle close"></span></a>'
  + '<div id="scrollwrapper">' // enable scrolling for small screens
  + '  <div id="sidebar" style="display: none">'
  + '    <div id="playerstat">t</div>'
  + '    <div id="gamestat">&nbsp;loading global control stats</div>'
  + '    <div id="searchwrapper">'
  + '      <button title="Current location" id="buttongeolocation"><img src="'+'@include_img:images/current-location.png@'+'" alt="Current location"/></button>'
  + '      <input id="search" placeholder="Search location…" type="search" accesskey="f" title="Search for a place [f]"/>'
  + '    </div>'
  + '    <div id="portaldetails"></div>'
  + '    <input id="redeem" placeholder="Redeem code…" type="text"/>'
  + '    <div id="toolbox"></div>'
  + '    <div id="toolbox_component"></div>'
  + '  </div>'
  + '</div>'
  + '<div id="updatestatus"><div id="innerstatus"></div></div>'
  // avoid error by stock JS
  + '<div id="play_button"></div>'
  + '<div id="header"><div id="nav"></div></div>';

/* ****************************************************************************************************************** */

/**
 * CONFIG OPTIONS
 * @namespace config_options
 */

/**
 * Controls how often the map should refresh, in seconds, default 30.
 * @type {number}
 * @memberof config_options
 */
window.REFRESH = 30;

/**
 * Controls the extra refresh delay per zoom level, in seconds, default 5.
 * @type {number}
 * @memberof config_options
 */
window.ZOOM_LEVEL_ADJ = 5;

/**
 * Wait this long before refreshing the view after the map has been moved, in seconds, default 2.5
 * @type {number}
 * @memberof config_options
 */
window.ON_MOVE_REFRESH = 2.5;

/**
 * Limit on refresh time since previous refresh, limiting repeated move refresh rate, in seconds, default 10
 * @type {number}
 * @memberof config_options
 */
window.MINIMUM_OVERRIDE_REFRESH = 10;

/**
 * Controls how long to wait between refreshing the global score, in seconds, default 15*60 (15 mins)
 * @type {number}
 * @memberof config_options
 */
window.REFRESH_GAME_SCORE = 15 * 60;

/**
 * The maximum idle time in seconds before the map stops updating, in seconds, default 15*60 (15 mins)
 * @type {number}
 * @memberof config_options
 */
window.MAX_IDLE_TIME = 15 * 60;

/**
 * How much space to leave for scrollbars, in pixels, default 20.
 * @type {number}
 * @memberof config_options
 */
window.HIDDEN_SCROLLBAR_ASSUMED_WIDTH = 20;

/**
 * How wide should the sidebar be, in pixels, default 300.
 * @type {number}
 * @memberof config_options
 */
window.SIDEBAR_WIDTH = 300;

/**
 * Controls requesting chat data based on the pixel distance from the line currently in view
 * and the top of history, in pixels, default 200
 * @type {number}
 * @memberof config_options
 */
window.CHAT_REQUEST_SCROLL_TOP = 200;

/**
 * Controls height of chat when chat is collapsed, in pixels, default 60
 * @type {number}
 * @memberof config_options
 */
window.CHAT_SHRINKED = 60;

/**
 * What colour should the selected portal be, string(css hex code), default ‘#f0f’ (hot pink)
 * @type {string}
 * @memberof config_options
 */
window.COLOR_SELECTED_PORTAL = '#f0f';

/**
 * Defines the color values associated with different teams, used in various elements such as portals, player names, etc.
 * The colors are represented in a CSS hex code format.
 * The array format represents: [none, res, enl, mac].
 * @type {string[]}
 * @memberof config_options
 */
window.COLORS = ['#FF6600', '#0088FF', '#03DC03', '#FF0028'];

/**
 * Colour values for levels, consistent with Ingress, with index 0 being white for neutral portals.
 * @type {string[]}
 * @memberof config_options
 */
window.COLORS_LVL = ['#000', '#FECE5A', '#FFA630', '#FF7315', '#E40000', '#FD2992', '#EB26CD', '#C124E0', '#9627F4'];

/**
 * Colour values for displaying mods, consistent with Ingress. Very Rare also used for AXA shields and Ultra Links.
 * @type {object}
 * @property {string} VERY_RARE=#b08cff
 * @property {string} RARE=#73a8ff
 * @property {string} COMMON=#8cffbf
 * @memberof config_options
 */
window.COLORS_MOD = { VERY_RARE: '#b08cff', RARE: '#73a8ff', COMMON: '#8cffbf' };

/**
 * What colour should the hacking range circle be (the small circle that appears around a selected portal,
 * marking a ~40 metre radius), string(css colour value), default ‘orange’
 * @type {string}
 * @memberof config_options
 */
window.ACCESS_INDICATOR_COLOR = 'orange';

/**
 * What colour should the linkable range circle be, string(css colour value), default ‘red’
 * @type {string}
 * @memberof config_options
 */
window.RANGE_INDICATOR_COLOR = 'red';

/**
 * Min zoom for intel map - should match that used by stock intel, default 3
 * @type {number}
 * @memberof config_options
 */
window.MIN_ZOOM = 3;

/**
 * Used when zoom level is not specified explicitly (must contain all the portals)
 * @type {number}
 * @memberof config_options
 */
window.DEFAULT_ZOOM = 15;

/**
 * URL of the default image for the portal
 * @type {string}
 * @memberof config_options
 */
window.DEFAULT_PORTAL_IMG = '//commondatastorage.googleapis.com/ingress.com/img/default-portal-image.png';

/**
 * URL to call the Nominatim geocoder service, string.
 * @type {string}
 * @memberof config_options
 */
window.NOMINATIM = '//nominatim.openstreetmap.org/search?format=json&polygon_geojson=1&q=';

/* ****************************************************************************************************************** */

/**
 * INGRESS CONSTANTS
 * http://decodeingress.me/2012/11/18/ingress-portal-levels-and-link-range/
 * @namespace ingress_constants
 */

/**
 * Resonator energy per level, 1-based array, XM
 * @type {number[]}
 * @const
 * @memberof ingress_constants
 */
window.RESO_NRG = [0, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000];

/**
 * Maximum radius around a portal from which the portal is hackable, metres.
 * @type {number}
 * @const
 * @memberof ingress_constants
 */
window.HACK_RANGE = 40;

/**
 * The maximum radius around the portal from which the Machine can link
 * @type {number[]}
 * @const
 * @memberof ingress_constants
 */
window.LINK_RANGE_MAC = [0, 200, 250, 350, 400, 500, 600, 700, 1000, 1000]; // in meters

/**
 * Resonator octant cardinal directions
 * @type {string[]}
 * @const
 * @memberof ingress_constants
 */
window.OCTANTS = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'];

/**
 * Resonator octant arrows
 * @type {string[]}
 * @const
 * @memberof ingress_constants
 */
window.OCTANTS_ARROW = ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘'];

/**
 * AP for destroying portal
 * @type {number}
 * @const
 * @memberof ingress_constants
 */
window.DESTROY_RESONATOR = 75;

/**
 * AP for destroying link
 * @type {number}
 * @const
 * @memberof ingress_constants
 */
window.DESTROY_LINK = 187;

/**
 * AP for destroying field
 * @type {number}
 * @const
 * @memberof ingress_constants
 */
window.DESTROY_FIELD = 750;

/**
 * AP for capturing a portal
 * @type {number}
 * @const
 * @memberof ingress_constants
 */
window.CAPTURE_PORTAL = 500;

/**
 * AP for deploying a resonator
 * @type {number}
 * @const
 * @memberof ingress_constants
 */
window.DEPLOY_RESONATOR = 125;

/**
 * AP for deploying all resonators on portal
 * @type {number}
 * @const
 * @memberof ingress_constants
 */
window.COMPLETION_BONUS = 250;

/**
 * AP for upgrading another's resonator
 * @type {number}
 * @const
 * @memberof ingress_constants
 */
window.UPGRADE_ANOTHERS_RESONATOR = 65;

/**
 * Maximum portal level.
 * @type {number}
 * @const
 * @memberof ingress_constants
 */
window.MAX_PORTAL_LEVEL = 8;

/**
 * How many resonators of a given level can one deploy; 1-based array where the index is the resonator level.
 * @type {number[]}
 * @const
 * @memberof ingress_constants
 */
window.MAX_RESO_PER_PLAYER = [0, 8, 4, 4, 4, 2, 2, 1, 1];

/**
 * The base value of how long you need to wait between portal hacks, in seconds.
 * @type {number}
 * @const
 * @memberof ingress_constants
 */
window.BASE_HACK_COOLDOWN = 300; // 5 mins - 300 seconds

/**
 * Base value, how many times at most you can hack the portal.
 * @type {number}
 * @const
 * @memberof ingress_constants
 */
window.BASE_HACK_COUNT = 4;

/* ****************************************************************************************************************** */

/**
 * OTHER MORE-OR-LESS CONSTANTS
 * @namespace other_constants
 */

/**
 * @type {number}
 * @const
 * @memberof other_constants
 */
window.TEAM_NONE = 0;

/**
 * @type {number}
 * @const
 * @memberof other_constants
 */
window.TEAM_RES = 1;

/**
 * @type {number}
 * @const
 * @memberof other_constants
 */
window.TEAM_ENL = 2;

/**
 * @type {number}
 * @const
 * @memberof other_constants
 */
window.TEAM_MAC = 3;

/**
 * @type {string[]}
 * @const
 * @memberof other_constants
 */
window.TEAM_TO_CSS = ['none', 'res', 'enl', 'mac'];

/**
 * @type {string[]}
 * @const
 * @memberof other_constants
 */
window.TEAM_NAMES = ['Neutral', 'Resistance', 'Enlightened', '__MACHINA__'];

/**
 * @type {string[]}
 * @const
 * @memberof other_constants
 */
window.TEAM_CODES = ['N', 'R', 'E', 'M'];

/**
 * @type {string[]}
 * @const
 * @memberof other_constants
 */
window.TEAM_CODENAMES = ['NEUTRAL', 'RESISTANCE', 'ENLIGHTENED', 'MACHINA'];
window.TEAM_SHORTNAMES = ['NEU', 'RES', 'ENL', 'MAC'];

/**
 * @type {string}
 * @const
 * @memberof other_constants
 */
window.TEAM_NAME_NONE = window.TEAM_NAMES[window.TEAM_NONE];

/**
 * @type {string}
 * @const
 * @memberof other_constants
 */
window.TEAM_NAME_RES = window.TEAM_NAMES[window.TEAM_RES];

/**
 * @type {string}
 * @const
 * @memberof other_constants
 */
window.TEAM_NAME_ENL = window.TEAM_NAMES[window.TEAM_ENL];

/**
 * @type {string}
 * @const
 * @memberof other_constants
 */
window.TEAM_NAME_MAC = window.TEAM_NAMES[window.TEAM_MAC];

/**
 * @type {string}
 * @const
 * @memberof other_constants
 */
window.TEAM_CODE_NONE = window.TEAM_CODES[window.TEAM_NONE];

/**
 * @type {string}
 * @const
 * @memberof other_constants
 */
window.TEAM_CODE_RES = window.TEAM_CODES[window.TEAM_RES];

/**
 * @type {string}
 * @const
 * @memberof other_constants
 */
window.TEAM_CODE_ENL = window.TEAM_CODES[window.TEAM_ENL];

/**
 * @type {string}
 * @const
 * @memberof other_constants
 */
window.TEAM_CODE_MAC = window.TEAM_CODES[window.TEAM_MAC];

/* ****************************************************************************************************************** */

/**
 * Global variables used for storage. Most likely READ ONLY. Proper ay would be to encapsulate them in an anonymous
 * function and write getters/setters, but if you are careful enough, this works.
 * @namespace storage_variables
 */

/**
 * Stores the id of the timeout that kicks off the next refresh (ie value returned by ``setTimeout()``)
 * @type {number|undefined}
 * @memberof storage_variables
 */
window.refreshTimeout = undefined;

/**
 * Portal GUID if the original URL had it.
 * @type {string|null}
 * @memberof storage_variables
 */
window.urlPortal = null;

/**
 * Portal lng/lat if the orignial URL had it.
 * @type {object|null}
 * @memberof storage_variables
 */
window.urlPortalLL = null;

/**
 * Stores the GUID of the selected portal, or is `null` if there is none.
 * @type {string|null}
 * @memberof storage_variables
 */
window.selectedPortal = null;

/**
 * Reference to the linking range indicator of the selected portal. This is a Leaflet layer.
 * @type {object|null}
 * @memberof storage_variables
 */
window.portalRangeIndicator = null;

/**
 * Reference to the hacking range indicator of the selected portal. This is a Leaflet layer.
 * @type {object|null}
 * @memberof storage_variables
 */
window.portalAccessIndicator = null;

// var portalsLayers, linksLayer, fieldsLayer;
var portalsFactionLayers, linksFactionLayers, fieldsFactionLayers;

/**
 * References to Leaflet objects representing portals, indexed by entity ID.
 * This object stores the mapping in the format `{ id1: feature1, ... }`.
 * Note: While these are Leaflet objects, not all may be added to the map due to render limits.
 * @type {Object.<string, object>}
 * @memberof storage_variables
 */
window.portals = {};

/**
 * References to Leaflet objects representing links, indexed by entity ID.
 * This object stores the mapping in the format `{ id1: feature1, ... }`.
 * Note: While these are Leaflet objects, not all may be added to the map due to render limits.
 * @type {Object.<string, object>}
 * @memberof storage_variables
 */
window.links = {};

/**
 * References to Leaflet objects representing fields, indexed by entity ID.
 * This object stores the mapping in the format `{ id1: feature1, ... }`.
 * Note: While these are Leaflet objects, not all may be added to the map due to render limits.
 * @type {Object.<string, object>}
 * @memberof storage_variables
 */
window.fields = {};

/**
 * @class L
 * @description Root class for all Leaflet-related functionalities, extended with custom methods and properties.
 */

// plugin framework. Plugins may load earlier than iitc, so don’t
// overwrite data
if (typeof window.plugin !== 'function') window.plugin = function() {};

var ulog = (function (module) {
  '@include_raw:external/ulog.min.js@';
  return module;
}({})).exports;

'@bundle_code@';

/* exported ulog, portalsFactionLayers, linksFactionLayers, fieldsFactionLayers -- eslint */
