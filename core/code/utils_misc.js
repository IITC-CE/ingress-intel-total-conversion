/**
 * @file Misc utils
 *
 * @module utils_misc
 */

/**
 * Retrieves a parameter from the URL query string.
 *
 * @function getURLParam
 * @param {string} param - The name of the parameter to retrieve.
 * @returns {string} The value of the parameter, or an empty string if not found.
 */
window.getURLParam = function(param) {
  var items = window.location.search.substr(1).split('&');
  if (items == "") return "";

  for (var i=0; i<items.length; i++) {
    var item = items[i].split('=');

    if (item[0] == param) {
      var val = item.length==1 ? '' : decodeURIComponent (item[1].replace(/\+/g,' '));
      return val;
    }
  }

  return '';
}

/**
 * Reads a cookie by name.
 * @see http://stackoverflow.com/a/5639455/1684530
 *
 * @function readCookie
 * @param {string} name - The name of the cookie to read.
 * @returns {string} The value of the cookie, or undefined if not found.
 */
window.readCookie = function(name){
  var C, i, c = document.cookie.split('; ');
  var cookies = {};
  for(i=c.length-1; i>=0; i--){
    C = c[i].split('=');
    cookies[C[0]] = unescape(C[1]);
  }
  return cookies[name];
}

/**
 * Writes a cookie with a specified name and value.
 *
 * @function writeCookie
 * @param {string} name - The name of the cookie.
 * @param {string} val - The value of the cookie.
 */
window.writeCookie = function(name, val) {
  var d = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = name + "=" + val + '; expires='+d+'; path=/';
}

/**
 * Erases a cookie with a specified name.
 *
 * @function eraseCookie
 * @param {string} name - The name of the cookie to erase.
 */
window.eraseCookie = function(name) {
  document.cookie = name + '=; expires=Thu, 1 Jan 1970 00:00:00 GMT; path=/';
}

/**
 * Adds thousand separators to a given number.
 * @see http://stackoverflow.com/a/1990590/1684530
 *
 * @function digits
 * @param {number} d - The number to format.
 * @returns {string} The formatted number with thousand separators.
 */
window.digits = function(d) {
  // U+2009 - Thin Space. Recommended for use as a thousands separator...
  // https://en.wikipedia.org/wiki/Space_(punctuation)#Table_of_spaces
  return (d+"").replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1&#8201;");
}

/**
 * Pads a number with zeros up to a specified length.
 *
 * @function zeroPad
 * @param {number} number - The number to pad.
 * @param {number} pad - The desired length of the output string.
 * @returns {string} The padded number as a string.
 */
window.zeroPad = function(number,pad) {
  number = number.toString();
  var zeros = pad - number.length;
  return Array(zeros>0?zeros+1:0).join("0") + number;
}

/**
 * Converts a UNIX timestamp to a human-readable string.
 * If the timestamp is from today, returns the time (HH:mm:ss format); otherwise, returns the date (YYYY-MM-DD).
 *
 * @function unixTimeToString
 * @param {number} time - The UNIX timestamp to convert.
 * @param {boolean} [full] - If true, returns both date and time.
 * @returns {string|null} The formatted date and/or time.
 */
window.unixTimeToString = function(time, full) {
  if(!time) return null;
  var d = new Date(typeof time === 'string' ? parseInt(time) : time);
  var time = d.toLocaleTimeString();
//  var time = zeroPad(d.getHours(),2)+':'+zeroPad(d.getMinutes(),2)+':'+zeroPad(d.getSeconds(),2);
  var date = d.getFullYear()+'-'+zeroPad(d.getMonth()+1,2)+'-'+zeroPad(d.getDate(),2);
  if(typeof full !== 'undefined' && full) return date + ' ' + time;
  if(d.toDateString() == new Date().toDateString())
    return time;
  else
    return date;
}

/**
 * Converts a UNIX timestamp to a precise date and time string in the local timezone.
 * Formatted in ISO-style YYYY-MM-DD hh:mm:ss.mmm - but using local timezone
 *
 * @function unixTimeToDateTimeString
 * @param {number} time - The UNIX timestamp to convert.
 * @param {boolean} [millisecond] - Whether to include millisecond precision.
 * @returns {string|null} The formatted date and time string.
 */
window.unixTimeToDateTimeString = function(time, millisecond) {
  if(!time) return null;
  var d = new Date(typeof time === 'string' ? parseInt(time) : time);
  return d.getFullYear()+'-'+zeroPad(d.getMonth()+1,2)+'-'+zeroPad(d.getDate(),2)
    +' '+zeroPad(d.getHours(),2)+':'+zeroPad(d.getMinutes(),2)+':'+zeroPad(d.getSeconds(),2)+(millisecond?'.'+zeroPad(d.getMilliseconds(),3):'');
}

/**
 * Converts a UNIX timestamp to a time string formatted as HH:mm.
 *
 * @function unixTimeToHHmm
 * @param {number|string} time - The UNIX timestamp to convert.
 * @returns {string|null} Formatted time as HH:mm.
 */
window.unixTimeToHHmm = function(time) {
  if(!time) return null;
  var d = new Date(typeof time === 'string' ? parseInt(time) : time);
  var h = '' + d.getHours(); h = h.length === 1 ? '0' + h : h;
  var s = '' + d.getMinutes(); s = s.length === 1 ? '0' + s : s;
  return  h + ':' + s;
}

/**
 * Formats an interval of time given in seconds into a human-readable string.
 *
 * @function formatInterval
 * @param {number} seconds - The interval in seconds.
 * @param {number} [maxTerms] - The maximum number of time units to include.
 * @returns {string} The formatted time interval.
 */
window.formatInterval = function(seconds,maxTerms) {

  var d = Math.floor(seconds / 86400);
  var h = Math.floor((seconds % 86400) / 3600);
  var m = Math.floor((seconds % 3600) / 60);
  var s = seconds % 60;

  var terms = [];
  if (d > 0) terms.push(d+'d');
  if (h > 0) terms.push(h+'h');
  if (m > 0) terms.push(m+'m');
  if (s > 0 || terms.length==0) terms.push(s+'s');

  if (maxTerms) terms = terms.slice(0,maxTerms);

  return terms.join(' ');
}

/**
 * Formats a distance in meters, converting to kilometers if the distance is over 10,000 meters.
 *
 * @function formatDistance
 * @param {number} distance - The distance in meters.
 * @returns {string} The formatted distance.
 */
window.formatDistance = function (distance) {
  return window.digits(distance > 10000 ? (distance / 1000).toFixed(2) + 'km' : Math.round(distance) + 'm');
};

/**
 * Changes the coordinates and map scale to show the range for portal links.
 *
 * @function rangeLinkClick
 */
window.rangeLinkClick = function() {
  if(window.portalRangeIndicator)
    window.map.fitBounds(window.portalRangeIndicator.getBounds());
  if(window.isSmartphone())
    window.show('map');
}

/**
 * Displays a dialog with links to show the specified location on various map services.
 *
 * @function showPortalPosLinks
 * @param {number} lat - Latitude of the location.
 * @param {number} lng - Longitude of the location.
 * @param {string} name - Name of the location.
 */
window.showPortalPosLinks = function(lat, lng, name) {
  var encoded_name = encodeURIComponent(name);
  var qrcode = '<div id="qrcode"></div>';
  var script = '<script>$(\'#qrcode\').qrcode({text:\'GEO:'+lat+','+lng+'\'});</script>';
  var gmaps = '<a href="https://maps.google.com/maps?ll='+lat+','+lng+'&q='+lat+','+lng+'%20('+encoded_name+')">Google Maps</a>';
  var bingmaps = '<a href="https://www.bing.com/maps/?v=2&cp='+lat+'~'+lng+'&lvl=16&sp=Point.'+lat+'_'+lng+'_'+encoded_name+'___">Bing Maps</a>';
  var osm = '<a href="https://www.openstreetmap.org/?mlat='+lat+'&mlon='+lng+'&zoom=16">OpenStreetMap</a>';
  var latLng = '<span>' + lat + ',' + lng +'</span>';
  dialog({
    html: '<div style="text-align: center;">' + qrcode + script + gmaps + '; ' + bingmaps + '; ' + osm + '<br />' + latLng + '</div>',
    title: name,
    id: 'poslinks'
  });
}

/**
 * Checks if the device is a touch-enabled device.
 *
 * @function isTouchDevice
 * @returns {boolean} True if the device is touch-enabled, otherwise false.
 */
window.isTouchDevice = function() {
  return 'ontouchstart' in window // works on most browsers
      || 'onmsgesturechange' in window; // works on ie10
};

// !!deprecated
// to be ovewritten in app.js
window.androidCopy = function(text) {
  return true; // i.e. execute other actions
}

/**
 * Calculates the number of pixels left to scroll down before reaching the bottom of an element.
 *
 * @function scrollBottom
 * @param {string|jQuery} elm - The element to calculate the scroll bottom for.
 * @returns {number} The number of pixels from the bottom.
 */
window.scrollBottom = function(elm) {
  if(typeof elm === 'string') elm = $(elm);
  return elm.get(0).scrollHeight - elm.innerHeight() - elm.scrollTop();
}

/**
 * Zooms the map to a specific portal and shows its details if available.
 *
 * @function zoomToAndShowPortal
 * @param {string} guid - The globally unique identifier of the portal.
 * @param {L.LatLng} latlng - The latitude and longitude of the portal.
 */
window.zoomToAndShowPortal = function(guid, latlng) {
  map.setView(latlng, DEFAULT_ZOOM);
  // if the data is available, render it immediately. Otherwise defer
  // until it becomes available.
  if(window.portals[guid])
    renderPortalDetails(guid);
  else
    urlPortal = guid;
}

/**
 * Selects a portal by its latitude and longitude.
 *
 * @function selectPortalByLatLng
 * @param {number|Array|L.LatLng} lat - The latitude of the portal
 *                                      or an array or L.LatLng object containing both latitude and longitude.
 * @param {number} [lng] - The longitude of the portal.
 */
window.selectPortalByLatLng = function(lat, lng) {
  if(lng === undefined && lat instanceof Array) {
    lng = lat[1];
    lat = lat[0];
  } else if(lng === undefined && lat instanceof L.LatLng) {
    lng = lat.lng;
    lat = lat.lat;
  }
  for(var guid in window.portals) {
    var latlng = window.portals[guid].getLatLng();
    if(latlng.lat == lat && latlng.lng == lng) {
      renderPortalDetails(guid);
      return;
    }
  }

  // not currently visible
  urlPortalLL = [lat, lng];
  map.setView(urlPortalLL, DEFAULT_ZOOM);
};

/**
 * Escapes special characters in a string for use in JavaScript.
 * (for strings passed as parameters to html onclick="..." for example)
 *
 * @function escapeJavascriptString
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
window.escapeJavascriptString = function(str) {
  return (str+'').replace(/[\\"']/g,'\\$&');
}

/**
 * Escapes HTML special characters in a string.
 *
 * @function escapeHtmlSpecialChars
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
window.escapeHtmlSpecialChars = function(str) {
  var div = document.createElement('div');
  var text = document.createTextNode(str);
  div.appendChild(text);
  return div.innerHTML;
}

/**
 * Formats energy of portal.
 *
 * @function prettyEnergy
 * @param {number} nrg - The energy value to format.
 * @returns {string} The formatted energy value.
 */
window.prettyEnergy = function(nrg) {
  return nrg> 1000 ? Math.round(nrg/1000) + ' k': nrg;
}

/**
 * Converts a list of items into a unique array, removing duplicates.
 *
 * @function uniqueArray
 * @param {Array} arr - The array to process.
 * @returns {Array} A new array containing only unique elements.
 */
window.uniqueArray = function(arr) {
  return $.grep(arr, function(v, i) {
    return $.inArray(v, arr) === i;
  });
}

/**
 * Generates a four-column HTML table from an array of data blocks.
 *
 * @param {Array} blocks - Array of data blocks, where each block is an array with details for one row.
 * @returns {string} HTML string representing the constructed table.
 */
window.genFourColumnTable = function(blocks) {
  var t = $.map(blocks, function(detail, index) {
    if(!detail) return '';
    var title = detail[2] ? ' title="'+escapeHtmlSpecialChars(detail[2]) + '"' : '';
    if(index % 2 === 0)
      return '<tr><td'+title+'>'+detail[1]+'</td><th'+title+'>'+detail[0]+'</th>';
    else
      return '    <th'+title+'>'+detail[0]+'</th><td'+title+'>'+detail[1]+'</td></tr>';
  }).join('');
  if(t.length % 2 === 1) t + '<td></td><td></td></tr>';
  return t;
}

/**
 * Converts text with newlines (`\n`) and tabs (`\t`) into an HTML table.
 *
 * @function convertTextToTableMagic
 * @param {string} text - The text to convert.
 * @returns {string} The resulting HTML table.
 */
window.convertTextToTableMagic = function(text) {
  // check if it should be converted to a table
  if(!text.match(/\t/)) return text.replace(/\n/g, '<br>');

  var data = [];
  var columnCount = 0;

  // parse data
  var rows = text.split('\n');
  $.each(rows, function(i, row) {
    data[i] = row.split('\t');
    if(data[i].length > columnCount) columnCount = data[i].length;
  });

  // build the table
  var table = '<table>';
  $.each(data, function(i, row) {
    table += '<tr>';
    $.each(data[i], function(k, cell) {
      var attributes = '';
      if(k === 0 && data[i].length < columnCount) {
        attributes = ' colspan="'+(columnCount - data[i].length + 1)+'"';
      }
      table += '<td'+attributes+'>'+cell+'</td>';
    });
    table += '</tr>';
  });
  table += '</table>';
  return table;
}

/**
 * Clamps a given value between a minimum and maximum value.
 *
 * @private
 * @function clamp
 * @param {number} n - The value to clamp.
 * @param {number} max - The maximum allowed value.
 * @param {number} min - The minimum allowed value.
 * @returns {number} The clamped value.
 */
function clamp(n, max, min) {
  if (n === 0) return 0;
  return n > 0 ? Math.min(n, max) : Math.max(n, min);
}

var MAX_LATITUDE = 85.051128; // L.Projection.SphericalMercator.MAX_LATITUDE

/**
 * Clamps a latitude and longitude to the maximum and minimum valid values.
 *
 * @function clampLatLng
 * @param {L.LatLng} latlng - The latitude and longitude to clamp.
 * @returns {Array<number>} The clamped latitude and longitude.
 */
window.clampLatLng = function (latlng) {
  // Ingress accepts requests only for this range
  return [
    clamp(latlng.lat, MAX_LATITUDE, -MAX_LATITUDE),
    clamp(latlng.lng, 179.999999, -180)
  ];
}

/**
 * Clamps a latitude and longitude bounds to the maximum and minimum valid values.
 *
 * @function clampLatLngBounds
 * @param {L.LatLngBounds} bounds - The bounds to clamp.
 * @returns {L.LatLngBounds} The clamped bounds.
 */
window.clampLatLngBounds = function (bounds) {
  var SW = bounds.getSouthWest(), NE = bounds.getNorthEast();
  return L.latLngBounds(clampLatLng(SW), clampLatLng(NE));
}

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
 * @param {Array<L.LatLng>} polygon - The vertices of the polygon.
 * @param {L.LatLng} point - The point to test.
 * @returns {boolean} True if the point is inside the polygon, false otherwise.
 */
window.pnpoly = function (polygon, point) {
  var inside = 0;
  // j records previous value. Also handles wrapping around.
  for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    inside ^= polygon[i].y > point.y !== polygon[j].y > point.y &&
              point.x - polygon[i].x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y);
  }
  // Let's make js as magical as C. Yay.
  return !!inside;
};

/**
 * Creates a link to open a specific portal in Ingress Prime.
 *
 * @function makePrimeLink
 * @param {string} guid - The globally unique identifier of the portal.
 * @param {number} lat - The latitude of the portal.
 * @param {number} lng - The longitude of the portal.
 * @returns {string} The Ingress Prime link for the portal
 */
window.makePrimeLink = function (guid, lat, lng) {
  return `https://link.ingress.com/?link=https%3A%2F%2Fintel.ingress.com%2Fportal%2F${guid}&apn=com.nianticproject.ingress&isi=576505181&ibi=com.google.ingress&ifl=https%3A%2F%2Fapps.apple.com%2Fapp%2Fingress%2Fid576505181&ofl=https%3A%2F%2Fintel.ingress.com%2Fintel%3Fpll%3D${lat}%2C${lng}`;
};

/**
 * Generates a permalink URL based on the specified latitude and longitude and additional options.
 *
 * @param {L.LatLng} [latlng] - The latitude and longitude for the permalink.
 *                              Can be omitted to create mapview-only permalink.
 * @param {Object} [options] - Additional options for permalink generation.
 * @param {boolean} [options.includeMapView] - Include current map view in the permalink.
 * @param {boolean} [options.fullURL] - Generate a fully qualified URL (default: relative link).
 * @returns {string} The generated permalink URL.
 */
window.makePermalink = function (latlng, options) {
  options = options || {};

  function round (l) { // ensures that lat,lng are with same precision as in stock intel permalinks
    return Math.floor(l*1e6)/1e6;
  }
  var args = [];
  if (!latlng || options.includeMapView) {
    var c = window.map.getCenter();
    args.push(
      'll='+[round(c.lat),round(c.lng)].join(','),
      'z='+window.map.getZoom()
    );
  }
  if (latlng) {
    if ('lat' in latlng) { latlng = [latlng.lat, latlng.lng]; }
    args.push('pll='+latlng.join(','));
  }
  var url = '';
  if (options.fullURL) {
    url += new URL(document.baseURI).origin;
  }
  url += '/';
  return url + '?' + args.join('&');
};

if (!String.prototype.capitalize) {
  Object.defineProperty(String.prototype, 'capitalize', {
    value: function () {
      return this.charAt(0).toUpperCase() + this.slice(1).toLowerCase();
    },
  });
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith#polyfill
if (!String.prototype.startsWith) {
  Object.defineProperty(String.prototype, 'startsWith', {
    value: function(search, rawPos) {
      var pos = rawPos > 0 ? rawPos|0 : 0;
      return this.substring(pos, pos + search.length) === search;
    }
  });
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc#polyfill
// (required for KitKat support)
if (!Math.trunc) {
  Math.trunc = function (v) {
    return v < 0 ? Math.ceil(v) : Math.floor(v);
  };
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find#polyfill
// https://tc39.github.io/ecma262/#sec-array.prototype.find
if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, 'find', {
    value: function(predicate) {
      // 1. Let O be ? ToObject(this value).
      if (this == null) {
        throw TypeError('"this" is null or not defined');
      }

      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If IsCallable(predicate) is false, throw a TypeError exception.
      if (typeof predicate !== 'function') {
        throw TypeError('predicate must be a function');
      }

      // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
      var thisArg = arguments[1];

      // 5. Let k be 0.
      var k = 0;

      // 6. Repeat, while k < len
      while (k < len) {
        // a. Let Pk be ! ToString(k).
        // b. Let kValue be ? Get(O, Pk).
        // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
        // d. If testResult is true, return kValue.
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return kValue;
        }
        // e. Increase k by 1.
        k++;
      }

      // 7. Return undefined.
      return undefined;
    },
    configurable: true,
    writable: true
  });
}

// https://developer.mozilla.org/en-US/docs/Web/API/Element/closest#polyfill
if (!Element.prototype.matches) {
  Element.prototype.matches =
    Element.prototype.msMatchesSelector ||
    Element.prototype.webkitMatchesSelector;
}

if (!Element.prototype.closest) {
  Element.prototype.closest = function(s) {
    var el = this;

    do {
      if (Element.prototype.matches.call(el, s)) return el;
      el = el.parentElement || el.parentNode;
    } while (el !== null && el.nodeType === 1);
    return null;
  };
}
