/* global IITC, L -- eslint */

/**
 * Namespace for IITC utils
 *
 * @memberof IITC
 * @namespace utils
 */

// The sv-SE locale is one of the closest to the ISO format among all locales
const timeWithSecondsFormatter = new Intl.DateTimeFormat('sv-SE', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('sv-SE', {
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('sv-SE', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Retrieves a parameter from the URL query string.
 *
 * @memberof IITC.utils
 * @function getURLParam
 * @param {string} param - The name of the parameter to retrieve.
 * @returns {string} The value of the parameter, or an empty string if not found.
 */
const getURLParam = (param) => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param) || '';
};

/**
 * Retrieves the value of a cookie by name.
 *
 * @memberof IITC.utils
 * @function getCookie
 * @param {string} name - The name of the cookie to retrieve.
 * @returns {string|undefined} The value of the cookie, or undefined if not found.
 */
const getCookie = (name) => {
  const cookies = document.cookie.split('; ').reduce((acc, cookie) => {
    const [key, value] = cookie.split('=');
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});

  return cookies[name];
};

/**
 * Sets a cookie with a specified name and value, with a default expiration of 10 years.
 *
 * @memberof IITC.utils
 * @function setCookie
 * @param {string} name - The name of the cookie.
 * @param {string} value - The value of the cookie.
 * @param {number} [days=3650] - Optional: the number of days until the cookie expires (default is 10 years).
 */
const setCookie = (name, value, days = 3650) => {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
};

/**
 * Deletes a cookie by name.
 *
 * @memberof IITC.utils
 * @function deleteCookie
 * @param {string} name - The name of the cookie to delete.
 */
const deleteCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

/**
 * Formats a number with thousand separators (thin spaces).
 * see https://en.wikipedia.org/wiki/Space_(punctuation)#Table_of_spaces
 *
 * @memberof IITC.utils
 * @function formatNumber
 * @param {number} num - The number to format.
 * @returns {string} The formatted number with thousand separators.
 */
const formatNumber = (num) => {
  if (num === null || num === undefined) return '';
  // Convert number to string and use a thin space (U+2009) as thousand separator
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
};

/**
 * Pads a number with zeros up to a specified length.
 *
 * @memberof IITC.utils
 * @function zeroPad
 * @param {number} number - The number to pad.
 * @param {number} length - The desired length of the output string.
 * @returns {string} The padded number as a string.
 */
const zeroPad = (number, length) => number.toString().padStart(length, '0');

/**
 * Checks whether two dates fall on the same day in the local timezone
 *
 * @memberof IITC.utils
 * @inner
 * @private
 * @param {Date} a
 * @param {Date} b
 * @returns {boolean}
 */
const isSameDay = (a, b) => a.toDateString() === b.toDateString();

const TIMESTAMP_DATES = ['always', 'other-day', 'never'];
const TIMESTAMP_PRECISIONS = ['days', 'minutes', 'seconds', 'milliseconds'];

/**
 * Formats a UNIX timestamp as an ISO-like date and time in the local timezone,
 * such as "2023-10-15 13:05", "13:05:07" or "2023-10-15 13:05:07.123"
 *
 * @memberof IITC.utils
 * @param {number|string|Date} timestamp - The UNIX timestamp in milliseconds
 * @param {Object} [options]
 * @param {'always'|'other-day'|'never'} [options.date='other-day'] - When to put the date YYYY-MM-DD
 *   before the time: always, only when the timestamp falls on another day than `now`, or never
 * @param {'days'|'minutes'|'seconds'|'milliseconds'} [options.precision='minutes'] - The smallest unit shown,
 *   `days` gives the date alone and needs `date: 'always'`
 * @param {number|string|Date} [options.now=Date.now()] - The current UNIX timestamp in milliseconds
 * @returns {string|null} The formatted timestamp, or null when the timestamp is not given or not valid
 * @throws {RangeError} On an unknown option value, or `precision: 'days'` without `date: 'always'`
 * @example
 * IITC.utils.formatTimestamp(time); // "13:05" today, "2023-10-14 13:05" on another day
 * IITC.utils.formatTimestamp(time, { date: 'never' }); // "13:05"
 * IITC.utils.formatTimestamp(time, { date: 'always', precision: 'days' }); // "2023-10-14"
 * IITC.utils.formatTimestamp(time, { date: 'always', precision: 'milliseconds' }); // "2023-10-14 13:05:07.123"
 */
const formatTimestamp = (timestamp, { date = 'other-day', precision = 'minutes', now = Date.now() } = {}) => {
  if (!TIMESTAMP_DATES.includes(date)) throw new RangeError(`Unknown date option: ${date}`);
  if (!TIMESTAMP_PRECISIONS.includes(precision)) throw new RangeError(`Unknown precision option: ${precision}`);
  if (precision === 'days' && date !== 'always') throw new RangeError(`Precision 'days' needs date 'always', not '${date}'`);

  if (!timestamp) return null;
  const dateObj = new Date(Number(timestamp));
  if (Number.isNaN(dateObj.getTime())) return null;

  const dateString = dateFormatter.format(dateObj);
  if (precision === 'days') return dateString;

  let timeString = (precision === 'minutes' ? timeFormatter : timeWithSecondsFormatter).format(dateObj);
  // sv-SE separates fractions of a second with a comma, while toISOString and RFC 3339 use a dot
  if (precision === 'milliseconds') timeString += `.${zeroPad(dateObj.getMilliseconds(), 3)}`;

  const showDate = date === 'always' || (date === 'other-day' && !isSameDay(dateObj, new Date(Number(now))));
  return showDate ? `${dateString} ${timeString}` : timeString;
};

/**
 * Converts a UNIX timestamp to a human-readable string.
 * If the timestamp is from today, returns the time (HH:mm:ss format); otherwise, returns the date (YYYY-MM-DD).
 *
 * @memberof IITC.utils
 * @function unixTimeToString
 * @deprecated Use {@link IITC.utils.formatTimestamp}
 * @param {number|string} timestamp - The UNIX timestamp in milliseconds to convert.
 * @param {boolean} [full=false] - If true, returns both date and time in "YYYY-MM-DD <locale time>" format.
 * @returns {string|null} The formatted date and/or time string, or null if no timestamp provided.
 */
const unixTimeToString = (timestamp, full = false) => {
  if (full) return formatTimestamp(timestamp, { date: 'always', precision: 'seconds' });
  const isToday = isSameDay(new Date(Number(timestamp)), new Date());
  return formatTimestamp(timestamp, isToday ? { date: 'never', precision: 'seconds' } : { date: 'always', precision: 'days' });
};

/**
 * Converts a UNIX timestamp to a precise date and time string in the local timezone.
 * Formatted in ISO-style YYYY-MM-DD hh:mm:ss.mmm - but using local timezone.
 *
 * @memberof IITC.utils
 * @function unixTimeToDateTimeString
 * @deprecated Use {@link IITC.utils.formatTimestamp} with `{ date: 'always', precision: 'seconds' }` or `'milliseconds'`
 * @param {number} time - The UNIX timestamp to convert.
 * @param {boolean} [millisecond] - Whether to include millisecond precision.
 * @returns {string|null} The formatted date and time string.
 */
const unixTimeToDateTimeString = (time, millisecond) => formatTimestamp(time, { date: 'always', precision: millisecond ? 'milliseconds' : 'seconds' });

/**
 * Converts a UNIX timestamp to a time string formatted as HH:mm.
 *
 * @memberof IITC.utils
 * @function unixTimeToHHmm
 * @deprecated Use {@link IITC.utils.formatTimestamp} with `{ date: 'never' }`
 * @param {number|string} time - The UNIX timestamp to convert.
 * @returns {string|null} Formatted time as HH:mm.
 */
const unixTimeToHHmm = (time) => formatTimestamp(time, { date: 'never' });

/**
 * Formats an interval of time given in seconds into a human-readable string.
 *
 * @memberof IITC.utils
 * @function formatInterval
 * @param {number} seconds - The interval in seconds.
 * @param {number} [maxTerms] - The maximum number of time units to include.
 * @returns {string} The formatted time interval.
 */
const formatInterval = (seconds, maxTerms) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  // Collect terms if they have a non-zero value
  const terms = [days ? `${days}d` : null, hours ? `${hours}h` : null, minutes ? `${minutes}m` : null, secs ? `${secs}s` : null].filter(Boolean);

  // Limit terms to maxTerms if specified
  return (maxTerms ? terms.slice(0, maxTerms) : terms).join(' ') || '0s';
};

/**
 * Formats a distance in meters, converting to kilometers with appropriate precision
 * based on the distance range.
 *
 * For distances:
 * - Under 1000m: shows in meters, rounded to whole numbers
 * - 1000m to 9999m: shows in kilometers with 1 decimal place
 * - 10000m and above: shows in whole kilometers
 *
 * @memberof IITC.utils
 * @function formatDistance
 * @param {number} distance - The distance in meters.
 * @returns {string} The formatted distance.
 */
const formatDistance = (distance) => {
  if (distance === null || distance === undefined) return '';
  let value, unit;

  if (distance >= 10000) {
    // For 10km and above: show whole kilometers
    value = Math.round(distance / 1000);
    unit = 'km';
  } else if (distance >= 1000) {
    // For 1km to 9.9km: show kilometers with one decimal
    value = Math.round(distance / 100) / 10;
    unit = 'km';
  } else {
    // For under 1km: show in meters
    value = Math.round(distance);
    unit = 'm';
  }

  return `${IITC.utils.formatNumber(value)}${unit}`;
};

/**
 * Formats the time difference between two timestamps (in milliseconds) as a string.
 *
 * @memberof IITC.utils
 * @function formatAgo
 * @param {number} time - The past timestamp in milliseconds.
 * @param {number} now - The current timestamp in milliseconds.
 * @param {Object} [options] - Options for formatting.
 * @param {boolean} [options.showSeconds=false] - Whether to include seconds in the result.
 * @returns {string} The formatted time difference (e.g., "45s", "5m", "2h 45m", "1d 3h 45m")
 */
const formatAgo = (time, now, options = { showSeconds: false }) => {
  const secondsTotal = Math.floor(Math.max(0, (now - time) / 1000));

  // Calculate time units
  const days = Math.floor(secondsTotal / 86400);
  const hours = Math.floor((secondsTotal % 86400) / 3600);
  const minutes = Math.floor((secondsTotal % 3600) / 60);
  const seconds = secondsTotal % 60;

  const result = [];

  // Include units conditionally based on non-zero values
  if (days > 0) result.push(`${days}d`);
  if (hours > 0 || result.length !== 0) result.push(`${hours}h`);
  if (minutes > 0 || result.length !== 0) result.push(`${minutes}m`);
  if (options.showSeconds && (result.length === 0 || seconds > 0)) result.push(`${seconds}s`);

  // If no units were added, show "0" with the smallest available unit
  if (result.length === 0) {
    return options.showSeconds ? '0s' : '0m';
  }

  return result.join(' ');
};

/**
 * Checks if the device is a touch-enabled device.
 * Alias for `L.Browser.touch()`
 *
 * @memberof IITC.utils
 * @function isTouchDevice
 * @returns {boolean} True if the device is touch-enabled, otherwise false.
 */
const isTouchDevice = () => L.Browser.touch;

/**
 * Determines if the user's device is a smartphone.
 * Note it should not detect tablets because their display is large enough to use the desktop version.
 * The stock intel site allows forcing mobile/full sites with a vp=m or vp=f parameter. This function supports the same.
 *
 * @memberof IITC.utils
 * @returns {boolean} True if the user's device is a smartphone, false otherwise.
 */
const isSmartphone = () => {
  // stock only allows this for some browsers - e.g. android phone/tablet.
  // let's allow it for all, but no promises it'll work right
  const viewParam = IITC.utils.getURLParam('vp');
  if (viewParam === 'm') return true;
  if (viewParam === 'f') return false;

  // the two patterns differ in case sensitivity, so they must not be merged into a single regex
  const userAgent = navigator.userAgent;
  return /Android.*Mobile/.test(userAgent) || /iPhone|iPad|iPod/i.test(userAgent);
};

/**
 * Calculates the number of pixels left to scroll down before reaching the bottom of an element.
 *
 * @memberof IITC.utils
 * @function scrollBottom
 * @param {string|HTMLElement|jQuery} elm - The element or selector to calculate the scroll bottom for.
 * @returns {number} The number of pixels from the bottom.
 */
const scrollBottom = (elm) => {
  // Ensure elm is an HTMLElement: resolve selector strings or extract DOM element from jQuery object
  const element = typeof elm === 'string' ? document.querySelector(elm) : elm instanceof jQuery ? elm[0] : elm;
  return element.scrollHeight - element.clientHeight - element.scrollTop;
};

/**
 * Creates an element with the given properties and children
 *
 * @memberof IITC.utils
 * @param {string} tag - The tag name
 * @param {Object} [props] - `className`, `dataset` as an object, any property of the element such as `textContent`
 *   or `onclick`, and other names as attributes. A value of null, undefined or false is skipped, true makes an
 *   empty attribute
 * @param {...(Node|string|null|undefined|false)} children - Nodes and texts to append; null, undefined and false
 *   are skipped
 * @returns {HTMLElement} The element
 * @example
 * IITC.utils.createElement('a', { className: 'link', href: url, onclick: select }, name);
 * IITC.utils.createElement('span', { dataset: { time }, 'aria-hidden': true });
 */
const createElement = (tag, props = {}, ...children) => {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (name === 'className') element.className = value;
    else if (name === 'dataset') Object.assign(element.dataset, value);
    else if (name in element) element[name] = value;
    else element.setAttribute(name, value === true ? '' : value);
  }
  element.append(...children.filter((child) => child !== undefined && child !== null && child !== false));
  return element;
};

/**
 * Escapes special characters in a string for use in JavaScript.
 * (for strings passed as parameters to html onclick="..." for example)
 *
 * @memberof IITC.utils
 * @function escapeJS
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
const escapeJS = function (str) {
  return (str + '').replace(/[\\"']/g, '\\$&');
};

/**
 * Escapes HTML special characters in a string.
 *
 * @memberof IITC.utils
 * @function escapeHtml
 * @param {string} str - The string to escape.
 * @param {string[]} [allowedTags] - Optional array of allowed HTML tags that should not be escaped.
 * @returns {string} The escaped string.
 */
const escapeHtml = function (str, allowedTags = []) {
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  if (allowedTags.length === 0) {
    return str.replace(/[&<>"']/g, (char) => escapeMap[char]);
  }

  // Create pattern for allowed tags (opening with optional class attribute, closing, and self-closing)
  const allowedTagsPattern = new RegExp(`^<\\/?(?:${allowedTags.join('|')})(?:\\s+class="[^"]*")?>$`);

  // Split text by all HTML tags to process each part individually
  const parts = str.split(/(<[^>]*>)/g);

  return parts
    .map((part) => {
      // If part matches allowed tags pattern, keep as is
      if (allowedTagsPattern.test(part)) {
        return part;
      }
      // Otherwise, escape HTML
      return part.replace(/[&<>"']/g, (char) => escapeMap[char]);
    })
    .join('');
};

/**
 * Formats the energy of a portal, converting to "k" units if over 1000.
 *
 * @memberof IITC.utils
 * @function prettyEnergy
 * @param {number} nrg - The energy value to format.
 * @returns {string|number} The formatted energy value.
 */
const prettyEnergy = (nrg) => (nrg > 1000 ? `${Math.round(nrg / 1000)}k` : nrg);

/**
 * Converts a list of items into a unique array, removing duplicates.
 *
 * @memberof IITC.utils
 * @function uniqueArray
 * @param {Array} arr - The array to process.
 * @returns {Array} A new array containing only unique elements.
 */
const uniqueArray = function (arr) {
  return [...new Set(arr)];
};

/**
 * Generates a four-column HTML table from an array of data blocks.
 *
 * @memberof IITC.utils
 * @param {Array} blocks - Array of data blocks, each one `[header, data, details]`.
 * @returns {string} HTML string representing the constructed table.
 */
const genFourColumnTable = function (blocks) {
  const rows = blocks
    .map((detail, index) => {
      if (!detail) return '';
      // the details of a block open in a popover; the header takes the keyboard focus
      const popover = detail[2] ? ` data-popover="${IITC.utils.escapeHtml(detail[2])}"` : '';
      const header = popover ? `${popover} tabindex="0"` : '';

      if (index % 2 === 0) {
        // If index is even, start a new row and add <td> for data and <th> for header
        return `<tr><td${popover}>${detail[1]}</td><th${header}>${detail[0]}</th>`;
      } else {
        // If index is odd, complete the row with <th> for header and <td> for data, then close </tr>
        return `<th${header}>${detail[0]}</th><td${popover}>${detail[1]}</td></tr>`;
      }
    })
    .join('');

  // If total number of blocks is odd, add empty cells to complete the last row
  const isOdd = blocks.length % 2 === 1;
  return isOdd ? rows + '<td></td><td></td></tr>' : rows;
};

const TEXT_TO_TABLE_TAGS = ['hr', 'br', 'b', 'i', 'strong', 'em', 'span', 'mark'];

/**
 * Converts text with newlines (`\n`) and tabs (`\t`) into HTML: line breaks, or a table when the text has tabs.
 * The text is escaped, except for the allowed tags.
 *
 * @memberof IITC.utils
 * @function textToTable
 * @param {string} text - The text to convert.
 * @param {string[]} [allowedTags] - tags kept as HTML; by default `hr`, `br`, `b`, `i`, `strong`, `em`, `span` and
 *   `mark`, and an empty list for plain text
 * @returns {string} The resulting HTML.
 */
const textToTable = function (text, allowedTags = TEXT_TO_TABLE_TAGS) {
  // If no tabs are present, replace newlines with <br> and return
  if (!text.includes('\t')) return IITC.utils.escapeHtml(text, allowedTags).replace(/\n/g, '<br>');

  // Split text into rows and columns, tracking the max column count
  const rows = text.split('\n').map((row) => row.split('\t'));
  const columnCount = Math.max(...rows.map((row) => row.length));

  // Build the table rows
  const tableRows = [];
  for (const row of rows) {
    let rowHtml = '<tr>';
    for (let k = 0; k < row.length; k++) {
      const cell = IITC.utils.escapeHtml(row[k], allowedTags);
      const colspan = k === 0 && row.length < columnCount ? ` colspan="${columnCount - row.length + 1}"` : '';
      rowHtml += `<td${colspan}>${cell}</td>`;
    }
    rowHtml += '</tr>';
    tableRows.push(rowHtml);
  }

  // Combine all rows into a single table HTML
  return `<table>${tableRows.join('')}</table>`;
};

/**
 * Clamps a given value between a minimum and maximum value.
 * Simple implementation for internal use.
 *
 * @memberof IITC.utils
 * @private
 * @function clamp
 * @param {number} n - The value to clamp.
 * @param {number} max - The maximum allowed value.
 * @param {number} min - The minimum allowed value.
 * @returns {number} The clamped value.
 */
const clamp = function (n, max, min) {
  if (n === 0) return 0;
  return n > 0 ? Math.min(n, max) : Math.max(n, min);
};

/**
 * The maximum absolute latitude that can be represented in Web Mercator projection (EPSG:3857).
 * This value is taken from L.Projection.SphericalMercator.MAX_LATITUDE
 *
 * @memberof IITC.utils
 * @constant {Number}
 */
const MAX_LATITUDE = 85.051128;

/**
 * Clamps a latitude and longitude to the maximum and minimum valid values.
 *
 * @memberof IITC.utils
 * @function clampLatLng
 * @param {L.LatLng} latlng - The latitude and longitude to clamp.
 * @returns {Array<number>} The clamped latitude and longitude.
 */
const clampLatLng = function (latlng) {
  // Ingress accepts requests only for this range
  return [clamp(latlng.lat, MAX_LATITUDE, -MAX_LATITUDE), clamp(latlng.lng, 179.999999, -180)];
};

/**
 * Clamps a latitude and longitude bounds to the maximum and minimum valid values.
 *
 * @memberof IITC.utils
 * @function clampLatLngBounds
 * @param {L.LatLngBounds} bounds - The bounds to clamp.
 * @returns {L.LatLngBounds} The clamped bounds.
 */
const clampLatLngBounds = function (bounds) {
  var SW = bounds.getSouthWest(),
    NE = bounds.getNorthEast();
  return new L.LatLngBounds(window.clampLatLng(SW), window.clampLatLng(NE));
};

/**
 * Determines if a point is inside a polygon.
 *
 * @memberof IITC.utils
 * @param {Array<L.LatLng>} polygon - The vertices of the polygon.
 * @param {L.LatLng} point - The point to test.
 * @returns {boolean} True if the point is inside the polygon, false otherwise.
 */
const isPointInPolygon = (polygon, point) => {
  let inside = 0;
  // j records previous value. Also handles wrapping around.
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    inside ^=
      polygon[i].y > point.y !== polygon[j].y > point.y &&
      point.x - polygon[i].x < ((polygon[j].x - polygon[i].x) * (point.y - polygon[i].y)) / (polygon[j].y - polygon[i].y);
  }
  // Let's make js as magical as C. Yay.
  return !!inside;
};

/**
 * Converts a team string or object to a team ID.
 * Accepts either team string directly (e.g. "RESISTANCE", "R") or an object with team property.
 * Returns TEAM_NONE if no match found.
 *
 * @memberof IITC.utils
 * @function getTeamId
 * @param {(Object|string)} input - Input to convert to team ID
 * @param {string} [input.team] - Team string when input is an object
 * @returns {number} The team ID corresponding to the team string.
 */
const getTeamId = (input) => {
  const teamStr = typeof input === 'string' ? input : input?.team;
  if (window.TEAM_CODENAMES.includes(teamStr)) {
    return window.TEAM_CODENAMES.indexOf(teamStr);
  }
  if (window.TEAM_CODES.includes(teamStr)) {
    return window.TEAM_CODES.indexOf(teamStr);
  }
  return window.TEAM_NONE;
};

const SYSTEM_PLAYERS = ['__ADA__', '__JARVIS__', '__MACHINA__'];

/**
 * Checks if a player name is a special system account (e.g., `__JARVIS__`, `__ADA__`)
 * that shouldn't be listed as a regular player.
 *
 * @memberof IITC.utils
 * @param {string} name - The player name to check.
 * @returns {boolean} Returns `true` if the player name is a system account, otherwise `false`.
 */
const isSystemPlayer = (name) => SYSTEM_PLAYERS.includes(name);

/**
 * Checks whether a DOM element is currently visible, matching jQuery's ':visible' semantics
 * (the element occupies space in the layout). Uses an offset-based test rather than inspecting
 * the element's own `display`, so an element hidden through a `display:none` ancestor is correctly
 * reported as not visible.
 *
 * @memberof IITC.utils
 * @private
 * @param {Element} element - The DOM element to test.
 * @returns {boolean} True if the element is visible, false otherwise.
 */
const _isVisible = (element) => {
  return !!element && (element.offsetWidth > 0 || element.offsetHeight > 0 || element.getClientRects().length > 0);
};

IITC.utils = {
  getURLParam,
  getCookie,
  setCookie,
  deleteCookie,
  formatNumber,
  zeroPad,
  formatTimestamp,
  unixTimeToString,
  unixTimeToDateTimeString,
  unixTimeToHHmm,
  formatInterval,
  formatDistance,
  formatAgo,
  isTouchDevice,
  isSmartphone,
  scrollBottom,
  createElement,
  escapeJS,
  escapeHtml,
  prettyEnergy,
  uniqueArray,
  genFourColumnTable,
  textToTable,
  clamp,
  clampLatLng,
  clampLatLngBounds,
  isPointInPolygon,
  getTeamId,
  isSystemPlayer,
  _isVisible,
};

// Map of legacy function names to their new names (or the same name if not renamed)
const legacyFunctionMappings = {
  getURLParam: 'getURLParam',
  readCookie: 'getCookie',
  writeCookie: 'setCookie',
  eraseCookie: 'deleteCookie',
  digits: 'formatNumber',
  zeroPad: 'zeroPad',
  unixTimeToString: 'unixTimeToString',
  unixTimeToDateTimeString: 'unixTimeToDateTimeString',
  unixTimeToHHmm: 'unixTimeToHHmm',
  formatInterval: 'formatInterval',
  formatDistance: 'formatDistance',
  isTouchDevice: 'isTouchDevice',
  isSmartphone: 'isSmartphone',
  scrollBottom: 'scrollBottom',
  escapeJavascriptString: 'escapeJS',
  escapeHtmlSpecialChars: 'escapeHtml',
  prettyEnergy: 'prettyEnergy',
  uniqueArray: 'uniqueArray',
  genFourColumnTable: 'genFourColumnTable',
  convertTextToTableMagic: 'textToTable',
  clamp: 'clamp',
  clampLatLng: 'clampLatLng',
  clampLatLngBounds: 'clampLatLngBounds',
  pnpoly: 'isPointInPolygon',
  teamStringToId: 'getTeamId',
  isSystemPlayer: 'isSystemPlayer',
};

IITC.registerLegacyAliases(window.IITC.utils, legacyFunctionMappings);
