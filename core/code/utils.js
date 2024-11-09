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
 * Converts a UNIX timestamp to a human-readable string.
 * If the timestamp is from today, returns the time (HH:mm:ss format); otherwise, returns the date (YYYY-MM-DD).
 *
 * @memberof IITC.utils
 * @function unixTimeToString
 * @param {number|string} timestamp - The UNIX timestamp in milliseconds to convert.
 * @param {boolean} [full=false] - If true, returns both date and time in "YYYY-MM-DD <locale time>" format.
 * @returns {string|null} The formatted date and/or time string, or null if no timestamp provided.
 */
const unixTimeToString = (timestamp, full = false) => {
  if (!timestamp) return null;

  const dateObj = new Date(Number(timestamp));
  const today = new Date();

  // Check if the date is today
  const isToday = dateObj.getFullYear() === today.getFullYear() && dateObj.getMonth() === today.getMonth() && dateObj.getDate() === today.getDate();

  const time = timeWithSecondsFormatter.format(dateObj);
  const date = dateFormatter.format(dateObj);

  if (full) return `${date} ${time}`;
  return isToday ? time : date;
};

/**
 * Converts a UNIX timestamp to a precise date and time string in the local timezone.
 * Formatted in ISO-style YYYY-MM-DD hh:mm:ss.mmm - but using local timezone.
 *
 * @memberof IITC.utils
 * @function unixTimeToDateTimeString
 * @param {number} time - The UNIX timestamp to convert.
 * @param {boolean} [millisecond] - Whether to include millisecond precision.
 * @returns {string|null} The formatted date and time string.
 */
const unixTimeToDateTimeString = (time, millisecond) => {
  if (!time) return null;
  const date = new Date(Number(time));
  const pad = (num) => IITC.utils.zeroPad(num, 2);

  const dateString = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const timeString = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  const dateTimeString = `${dateString} ${timeString}`;
  return millisecond ? `${dateTimeString}.${IITC.utils.zeroPad(date.getMilliseconds(), 3)}` : dateTimeString;
};

/**
 * Converts a UNIX timestamp to a time string formatted as HH:mm.
 *
 * @memberof IITC.utils
 * @function unixTimeToHHmm
 * @param {number|string} time - The UNIX timestamp to convert.
 * @returns {string|null} Formatted time as HH:mm.
 */
const unixTimeToHHmm = (time) => {
  if (!time) return null;
  return timeFormatter.format(new Date(Number(time)));
};

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
 * Checks if the device is a touch-enabled device.
 * Alias for `L.Browser.touch()`
 *
 * @memberof IITC.utils
 * @function isTouchDevice
 * @returns {boolean} True if the device is touch-enabled, otherwise false.
 */
const isTouchDevice = () => L.Browser.touch;

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
 * @returns {string} The escaped string.
 */
const escapeHtml = function (str) {
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => escapeMap[char]);
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
 * @param {Array} blocks - Array of data blocks, where each block is an array with details for one row.
 * @returns {string} HTML string representing the constructed table.
 */
const genFourColumnTable = function (blocks) {
  const rows = blocks
    .map((detail, index) => {
      if (!detail) return '';
      const title = detail[2] ? ` title="${IITC.utils.escapeHtml(detail[2])}"` : '';

      if (index % 2 === 0) {
        // If index is even, start a new row and add <td> for data and <th> for header
        return `<tr><td${title}>${detail[1]}</td><th${title}>${detail[0]}</th>`;
      } else {
        // If index is odd, complete the row with <th> for header and <td> for data, then close </tr>
        return `<th${title}>${detail[0]}</th><td${title}>${detail[1]}</td></tr>`;
      }
    })
    .join('');

  // If total number of blocks is odd, add empty cells to complete the last row
  const isOdd = blocks.length % 2 === 1;
  return isOdd ? rows + '<td></td><td></td></tr>' : rows;
};

/**
 * Converts text with newlines (`\n`) and tabs (`\t`) into an HTML table.
 *
 * @memberof IITC.utils
 * @function textToTable
 * @param {string} text - The text to convert.
 * @returns {string} The resulting HTML table.
 */
const textToTable = function (text) {
  // If no tabs are present, replace newlines with <br> and return
  if (!text.includes('\t')) return text.replace(/\n/g, '<br>');

  // Split text into rows and columns, tracking the max column count
  const rows = text.split('\n').map((row) => row.split('\t'));
  const columnCount = Math.max(...rows.map((row) => row.length));

  // Build the table rows
  const tableRows = [];
  for (const row of rows) {
    let rowHtml = '<tr>';
    for (let k = 0; k < row.length; k++) {
      const cell = IITC.utils.escapeHtml(row[k]);
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
  return L.latLngBounds(window.clampLatLng(SW), window.clampLatLng(NE));
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

IITC.utils = {
  getURLParam,
  getCookie,
  setCookie,
  deleteCookie,
  formatNumber,
  zeroPad,
  unixTimeToString,
  unixTimeToDateTimeString,
  unixTimeToHHmm,
  formatInterval,
  formatDistance,
  isTouchDevice,
  scrollBottom,
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
};

// Set up synchronization between `window` and `IITC.utils` with new names
Object.entries(legacyFunctionMappings).forEach(([oldName, newName]) => {
  // Initialize IITC.utils[newName] if not already defined
  window.IITC.utils[newName] = window.IITC.utils[newName] || function () {};

  // Define a getter/setter on `window` to synchronize with `IITC.utils`
  Object.defineProperty(window, oldName, {
    get() {
      return window.IITC.utils[newName];
    },
    set(newFunc) {
      window.IITC.utils[newName] = newFunc;
    },
    configurable: true,
  });
});
