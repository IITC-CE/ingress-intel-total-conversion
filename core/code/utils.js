/* global IITC, L -- eslint */

/**
 * Namespace for IITC utils
 *
 * @memberof IITC
 * @namespace utils
 */

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
 * @param {number} pad - The desired length of the output string.
 * @returns {string} The padded number as a string.
 */
const zeroPad = function (number, pad) {
  number = number.toString();
  var zeros = pad - number.length;
  return Array(zeros > 0 ? zeros + 1 : 0).join('0') + number;
};

/**
 * Converts a UNIX timestamp to a human-readable string.
 * If the timestamp is from today, returns the time (HH:mm:ss format); otherwise, returns the date (YYYY-MM-DD).
 *
 * @memberof IITC.utils
 * @function unixTimeToString
 * @param {number} timestamp - The UNIX timestamp to convert.
 * @param {boolean} [full] - If true, returns both date and time.
 * @returns {string|null} The formatted date and/or time.
 */
const unixTimeToString = function (timestamp, full) {
  if (!timestamp) return null;
  var d = new Date(typeof timestamp === 'string' ? parseInt(timestamp) : timestamp);
  var time = d.toLocaleTimeString();
  //  var time = zeroPad(d.getHours(),2)+':'+zeroPad(d.getMinutes(),2)+':'+zeroPad(d.getSeconds(),2);
  var date = d.getFullYear() + '-' + window.zeroPad(d.getMonth() + 1, 2) + '-' + window.zeroPad(d.getDate(), 2);
  if (typeof full !== 'undefined' && full) return date + ' ' + time;
  if (d.toDateString() === new Date().toDateString()) return time;
  else return date;
};

/**
 * Converts a UNIX timestamp to a precise date and time string in the local timezone.
 * Formatted in ISO-style YYYY-MM-DD hh:mm:ss.mmm - but using local timezone
 *
 * @memberof IITC.utils
 * @function unixTimeToDateTimeString
 * @param {number} time - The UNIX timestamp to convert.
 * @param {boolean} [millisecond] - Whether to include millisecond precision.
 * @returns {string|null} The formatted date and time string.
 */
const unixTimeToDateTimeString = function (time, millisecond) {
  if (!time) return null;
  var d = new Date(typeof time === 'string' ? parseInt(time) : time);
  return (
    d.getFullYear() +
    '-' +
    window.zeroPad(d.getMonth() + 1, 2) +
    '-' +
    window.zeroPad(d.getDate(), 2) +
    ' ' +
    window.zeroPad(d.getHours(), 2) +
    ':' +
    window.zeroPad(d.getMinutes(), 2) +
    ':' +
    window.zeroPad(d.getSeconds(), 2) +
    (millisecond ? '.' + window.zeroPad(d.getMilliseconds(), 3) : '')
  );
};

/**
 * Converts a UNIX timestamp to a time string formatted as HH:mm.
 *
 * @memberof IITC.utils
 * @function unixTimeToHHmm
 * @param {number|string} time - The UNIX timestamp to convert.
 * @returns {string|null} Formatted time as HH:mm.
 */
const unixTimeToHHmm = function (time) {
  if (!time) return null;
  var d = new Date(typeof time === 'string' ? parseInt(time) : time);
  var h = '' + d.getHours();
  h = h.length === 1 ? '0' + h : h;
  var s = '' + d.getMinutes();
  s = s.length === 1 ? '0' + s : s;
  return h + ':' + s;
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
const formatInterval = function (seconds, maxTerms) {
  var d = Math.floor(seconds / 86400);
  var h = Math.floor((seconds % 86400) / 3600);
  var m = Math.floor((seconds % 3600) / 60);
  var s = seconds % 60;

  var terms = [];
  if (d > 0) terms.push(d + 'd');
  if (h > 0) terms.push(h + 'h');
  if (m > 0) terms.push(m + 'm');
  if (s > 0 || terms.length === 0) terms.push(s + 's');

  if (maxTerms) terms = terms.slice(0, maxTerms);

  return terms.join(' ');
};

/**
 * Formats a distance in meters, converting to kilometers if the distance is over 10,000 meters.
 *
 * @memberof IITC.utils
 * @function formatDistance
 * @param {number} distance - The distance in meters.
 * @returns {string} The formatted distance.
 */
const formatDistance = function (distance) {
  return window.digits(distance > 10000 ? (distance / 1000).toFixed(2) + 'km' : Math.round(distance) + 'm');
};

/**
 * Changes the coordinates and map scale to show the range for portal links.
 *
 * @memberof IITC.utils
 * @function rangeLinkClick
 */
const rangeLinkClick = function () {
  if (window.portalRangeIndicator) window.map.fitBounds(window.portalRangeIndicator.getBounds());
  if (window.isSmartphone()) window.show('map');
};

/**
 * Displays a dialog with links to show the specified location on various map services.
 *
 * @memberof IITC.utils
 * @function showPortalPosLinks
 * @param {number} lat - Latitude of the location.
 * @param {number} lng - Longitude of the location.
 * @param {string} name - Name of the location.
 */
const showPortalPosLinks = function (lat, lng, name) {
  var encoded_name = encodeURIComponent(name);
  var qrcode = '<div id="qrcode"></div>';
  var script = "<script>$('#qrcode').qrcode({text:'GEO:" + lat + ',' + lng + "'});</script>";
  var gmaps = '<a href="https://maps.google.com/maps?ll=' + lat + ',' + lng + '&q=' + lat + ',' + lng + '%20(' + encoded_name + ')">Google Maps</a>';
  var bingmaps =
    '<a href="https://www.bing.com/maps/?v=2&cp=' + lat + '~' + lng + '&lvl=16&sp=Point.' + lat + '_' + lng + '_' + encoded_name + '___">Bing Maps</a>';
  var osm = '<a href="https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lng + '&zoom=16">OpenStreetMap</a>';
  var latLng = '<span>' + lat + ',' + lng + '</span>';
  window.dialog({
    html: '<div style="text-align: center;">' + qrcode + script + gmaps + '; ' + bingmaps + '; ' + osm + '<br />' + latLng + '</div>',
    title: name,
    id: 'poslinks',
  });
};

/**
 * Checks if the device is a touch-enabled device.
 *
 * @memberof IITC.utils
 * @function isTouchDevice
 * @returns {boolean} True if the device is touch-enabled, otherwise false.
 */
const isTouchDevice = function () {
  return (
    'ontouchstart' in window || // works on most browsers
    'onmsgesturechange' in window
  ); // works on ie10
};

/**
 * Calculates the number of pixels left to scroll down before reaching the bottom of an element.
 *
 * @memberof IITC.utils
 * @function scrollBottom
 * @param {string|jQuery} elm - The element to calculate the scroll bottom for.
 * @returns {number} The number of pixels from the bottom.
 */
const scrollBottom = function (elm) {
  if (typeof elm === 'string') elm = $(elm);
  return elm.get(0).scrollHeight - elm.innerHeight() - elm.scrollTop();
};

/**
 * Zooms the map to a specific portal and shows its details if available.
 *
 * @memberof IITC.utils
 * @function zoomToAndShowPortal
 * @param {string} guid - The globally unique identifier of the portal.
 * @param {L.LatLng|number[]} latlng - The latitude and longitude of the portal.
 */
const zoomToAndShowPortal = function (guid, latlng) {
  window.map.setView(latlng, window.DEFAULT_ZOOM);
  // if the data is available, render it immediately. Otherwise defer
  // until it becomes available.
  if (window.portals[guid]) window.renderPortalDetails(guid);
  else window.urlPortal = guid;
};

/**
 * Selects a portal by its latitude and longitude.
 *
 * @memberof IITC.utils
 * @function selectPortalByLatLng
 * @param {number|Array|L.LatLng} lat - The latitude of the portal
 *                                      or an array or L.LatLng object containing both latitude and longitude.
 * @param {number} [lng] - The longitude of the portal.
 */
const selectPortalByLatLng = function (lat, lng) {
  if (lng === undefined && lat instanceof Array) {
    lng = lat[1];
    lat = lat[0];
  } else if (lng === undefined && lat instanceof L.LatLng) {
    lng = lat.lng;
    lat = lat.lat;
  }
  for (var guid in window.portals) {
    var latlng = window.portals[guid].getLatLng();
    if (latlng.lat === lat && latlng.lng === lng) {
      window.renderPortalDetails(guid);
      return;
    }
  }

  // not currently visible
  window.urlPortalLL = [lat, lng];
  window.map.setView(window.urlPortalLL, window.DEFAULT_ZOOM);
};

/**
 * Escapes special characters in a string for use in JavaScript.
 * (for strings passed as parameters to html onclick="..." for example)
 *
 * @memberof IITC.utils
 * @function escapeJavascriptString
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
const escapeJavascriptString = function (str) {
  return (str + '').replace(/[\\"']/g, '\\$&');
};

/**
 * Escapes HTML special characters in a string.
 *
 * @memberof IITC.utils
 * @function escapeHtmlSpecialChars
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
const escapeHtmlSpecialChars = function (str) {
  var div = document.createElement('div');
  var text = document.createTextNode(str);
  div.appendChild(text);
  return div.innerHTML;
};

/**
 * Formats energy of portal.
 *
 * @memberof IITC.utils
 * @function prettyEnergy
 * @param {number} nrg - The energy value to format.
 * @returns {string} The formatted energy value.
 */
const prettyEnergy = function (nrg) {
  return nrg > 1000 ? Math.round(nrg / 1000) + ' k' : nrg;
};

/**
 * Converts a list of items into a unique array, removing duplicates.
 *
 * @memberof IITC.utils
 * @function uniqueArray
 * @param {Array} arr - The array to process.
 * @returns {Array} A new array containing only unique elements.
 */
const uniqueArray = function (arr) {
  return $.grep(arr, function (v, i) {
    return $.inArray(v, arr) === i;
  });
};

/**
 * Generates a four-column HTML table from an array of data blocks.
 *
 * @memberof IITC.utils
 * @param {Array} blocks - Array of data blocks, where each block is an array with details for one row.
 * @returns {string} HTML string representing the constructed table.
 */
const genFourColumnTable = function (blocks) {
  let t = $.map(blocks, function (detail, index) {
    if (!detail) return '';
    const title = detail[2] ? ' title="' + window.escapeHtmlSpecialChars(detail[2]) + '"' : '';
    if (index % 2 === 0) {
      return '<tr><td' + title + '>' + detail[1] + '</td><th' + title + '>' + detail[0] + '</th>';
    } else {
      return '<th' + title + '>' + detail[0] + '</th><td' + title + '>' + detail[1] + '</td></tr>';
    }
  }).join('');

  // If the total number of rows is odd, add empty cells to complete the last row
  if (blocks.length % 2 === 1) {
    t += '<td></td><td></td></tr>';
  }

  return t;
};

/**
 * Converts text with newlines (`\n`) and tabs (`\t`) into an HTML table.
 *
 * @memberof IITC.utils
 * @function convertTextToTableMagic
 * @param {string} text - The text to convert.
 * @returns {string} The resulting HTML table.
 */
const convertTextToTableMagic = function (text) {
  // check if it should be converted to a table
  if (!text.match(/\t/)) return text.replace(/\n/g, '<br>');

  var data = [];
  var columnCount = 0;

  // parse data
  var rows = text.split('\n');
  $.each(rows, function (i, row) {
    data[i] = row.split('\t');
    if (data[i].length > columnCount) columnCount = data[i].length;
  });

  // build the table
  var table = '<table>';
  $.each(data, function (i) {
    table += '<tr>';
    $.each(data[i], function (k, cell) {
      var attributes = '';
      if (k === 0 && data[i].length < columnCount) {
        attributes = ' colspan="' + (columnCount - data[i].length + 1) + '"';
      }
      table += '<td' + attributes + '>' + cell + '</td>';
    });
    table += '</tr>';
  });
  table += '</table>';
  return table;
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

/*
pnpoly Copyright (c) 1970-2003, Wm. Randolph Franklin

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

  1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following
     disclaimers.
  2. Redistributions in binary form must reproduce the above copyright notice in the documentation and/or other
     materials provided with the distribution.
  3. The name of W. Randolph Franklin may not be used to endorse or promote products derived from this Software without
     specific prior written permission.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
/**
 * Determines if a point is inside a polygon.
 *
 * @memberof IITC.utils
 * @param {Array<L.LatLng>} polygon - The vertices of the polygon.
 * @param {L.LatLng} point - The point to test.
 * @returns {boolean} True if the point is inside the polygon, false otherwise.
 */
const pnpoly = function (polygon, point) {
  var inside = 0;
  // j records previous value. Also handles wrapping around.
  for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    inside ^=
      polygon[i].y > point.y !== polygon[j].y > point.y &&
      point.x - polygon[i].x < ((polygon[j].x - polygon[i].x) * (point.y - polygon[i].y)) / (polygon[j].y - polygon[i].y);
  }
  // Let's make js as magical as C. Yay.
  return !!inside;
};

/**
 * Creates a link to open a specific portal in Ingress Prime.
 *
 * @memberof IITC.utils
 * @function makePrimeLink
 * @param {string} guid - The globally unique identifier of the portal.
 * @param {number} lat - The latitude of the portal.
 * @param {number} lng - The longitude of the portal.
 * @returns {string} The Ingress Prime link for the portal
 */
const makePrimeLink = function (guid, lat, lng) {
  return `https://link.ingress.com/?link=https%3A%2F%2Fintel.ingress.com%2Fportal%2F${guid}&apn=com.nianticproject.ingress&isi=576505181&ibi=com.google.ingress&ifl=https%3A%2F%2Fapps.apple.com%2Fapp%2Fingress%2Fid576505181&ofl=https%3A%2F%2Fintel.ingress.com%2Fintel%3Fpll%3D${lat}%2C${lng}`;
};

/**
 * Generates a permalink URL based on the specified latitude and longitude and additional options.
 *
 * @memberof IITC.utils
 * @param {L.LatLng|number[]} [latlng] - The latitude and longitude for the permalink.
 *                              Can be omitted to create mapview-only permalink.
 * @param {Object} [options] - Additional options for permalink generation.
 * @param {boolean} [options.includeMapView] - Include current map view in the permalink.
 * @param {boolean} [options.fullURL] - Generate a fully qualified URL (default: relative link).
 * @returns {string} The generated permalink URL.
 */
const makePermalink = function (latlng, options) {
  options = options || {};

  function round(l) {
    // ensures that lat,lng are with same precision as in stock intel permalinks
    return Math.floor(l * 1e6) / 1e6;
  }
  var args = [];
  if (!latlng || options.includeMapView) {
    var c = window.map.getCenter();
    args.push('ll=' + [round(c.lat), round(c.lng)].join(','), 'z=' + window.map.getZoom());
  }
  if (latlng) {
    if ('lat' in latlng) {
      latlng = [latlng.lat, latlng.lng];
    }
    args.push('pll=' + latlng.join(','));
  }
  var url = '';
  if (options.fullURL) {
    url += new URL(document.baseURI).origin;
  }
  url += '/';
  return url + '?' + args.join('&');
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
  rangeLinkClick,
  showPortalPosLinks,
  isTouchDevice,
  scrollBottom,
  zoomToAndShowPortal,
  selectPortalByLatLng,
  escapeJavascriptString,
  escapeHtmlSpecialChars,
  prettyEnergy,
  uniqueArray,
  genFourColumnTable,
  convertTextToTableMagic,
  clamp,
  clampLatLng,
  clampLatLngBounds,
  pnpoly,
  makePrimeLink,
  makePermalink,
};

// List of functions to track for synchronization between window.* and IITC.utils.*
const legacyFunctions = [
  'getURLParam',
  'readCookie',
  'writeCookie',
  'eraseCookie',
  'digits',
  'zeroPad',
  'unixTimeToString',
  'unixTimeToDateTimeString',
  'unixTimeToHHmm',
  'formatInterval',
  'formatDistance',
  'rangeLinkClick',
  'showPortalPosLinks',
  'isTouchDevice',
  'scrollBottom',
  'zoomToAndShowPortal',
  'selectPortalByLatLng',
  'escapeJavascriptString',
  'escapeHtmlSpecialChars',
  'prettyEnergy',
  'uniqueArray',
  'genFourColumnTable',
  'convertTextToTableMagic',
  'clamp',
  'clampLatLng',
  'clampLatLngBounds',
  'pnpoly',
  'makePrimeLink',
  'makePermalink',
];

legacyFunctions.forEach((funcName) => {
  window.IITC.utils[funcName] = window.IITC.utils[funcName] || function () {};

  // Define a getter/setter on `window` to synchronize with `IITC.utils`
  Object.defineProperty(window, funcName, {
    get() {
      return window.IITC.utils[funcName];
    },
    set(newFunc) {
      window.IITC.utils[funcName] = newFunc;
    },
    configurable: true,
  });
});
