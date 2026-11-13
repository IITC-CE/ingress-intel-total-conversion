/**
 * @file Misc polyfills
 *
 * @module utils_polyfills
 */

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
    value: function (search, rawPos) {
      var pos = rawPos > 0 ? rawPos | 0 : 0;
      return this.substring(pos, pos + search.length) === search;
    },
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
    value: function (predicate) {
      // 1. Let O be ? ToObject(this value).
      if (this === null) {
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
    writable: true,
  });
}

// https://developer.mozilla.org/en-US/docs/Web/API/Element/closest#polyfill
if (!Element.prototype.matches) {
  Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
}

if (!Element.prototype.closest) {
  Element.prototype.closest = function (s) {
    var el = this;

    do {
      if (Element.prototype.matches.call(el, s)) return el;
      el = el.parentElement || el.parentNode;
    } while (el !== null && el.nodeType === 1);
    return null;
  };
}

// https://github.com/KhaledElAnsari/String.prototype.padStart/blob/master/index.js
if (!String.prototype.padStart) {
  String.prototype.padStart = function (targetLength, padString) {
    targetLength = Math.floor(targetLength) || 0;
    if (targetLength < this.length) return String(this);

    padString = padString ? String(padString) : ' ';

    var pad = '';
    var len = targetLength - this.length;
    var i = 0;
    while (pad.length < len) {
      if (!padString[i]) {
        i = 0;
      }
      pad += padString[i];
      i++;
    }

    return pad + String(this).slice(0);
  };
}

// Android System WebView before 93
if (!Object.hasOwn) {
  Object.defineProperty(Object, 'hasOwn', {
    value: (object, key) => Object.prototype.hasOwnProperty.call(object, key),
    configurable: true,
    writable: true,
  });
}

// Android System WebView before 85
if (!String.prototype.replaceAll) {
  Object.defineProperty(String.prototype, 'replaceAll', {
    value: function (search, replacement) {
      if (search instanceof RegExp) {
        if (!search.global) throw new TypeError('replaceAll must be called with a global RegExp');
        return this.replace(search, replacement);
      }
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return this.replace(new RegExp(escaped, 'g'), replacement);
    },
    configurable: true,
    writable: true,
  });
}

// Android System WebView before 86
[Element, Document, DocumentFragment].forEach((type) => {
  if (type.prototype.replaceChildren) return;
  Object.defineProperty(type.prototype, 'replaceChildren', {
    value: function (...nodes) {
      while (this.lastChild) this.removeChild(this.lastChild);
      this.append(...nodes);
    },
    configurable: true,
    writable: true,
  });
});

// Android System WebView before 98
// Copies plain data: primitives, plain objects, arrays, Date, RegExp, Map and Set, keeping shared and
// circular references; any other object comes back as a plain object of its own enumerable properties
if (typeof window.structuredClone !== 'function') {
  window.structuredClone = (value) => {
    const copies = new Map();
    const clone = (item) => {
      if (typeof item === 'function' || typeof item === 'symbol') {
        throw new DOMException(`${String(item)} could not be cloned.`, 'DataCloneError');
      }
      if (item === null || typeof item !== 'object') return item;
      if (copies.has(item)) return copies.get(item);

      let copy;
      if (item instanceof Date) copy = new Date(item.getTime());
      else if (item instanceof RegExp) copy = new RegExp(item.source, item.flags);
      else if (item instanceof Map) copy = new Map();
      else if (item instanceof Set) copy = new Set();
      else if (Array.isArray(item)) copy = new Array(item.length);
      else copy = {};
      copies.set(item, copy);

      if (item instanceof Map) item.forEach((entry, key) => copy.set(clone(key), clone(entry)));
      else if (item instanceof Set) item.forEach((entry) => copy.add(clone(entry)));
      else if (!(item instanceof Date || item instanceof RegExp)) {
        Object.keys(item).forEach((key) => (copy[key] = clone(item[key])));
      }
      return copy;
    };
    return clone(value);
  };
}
