// @author         jaiperdu
// @name           Debug console tab
// @category       Debug
// @version        0.2.0
// @description    Add a debug console tab

/* exported setup, changelog --eslint */
/* global L */

var changelog = [
  {
    version: '0.2.0',
    changes: [
      'Use channel new API',
      'Handle multiline messages',
      'Handle errors when serializing logged objects',
      'Version upgrade due to a change in the wrapper: plugin icons are now vectorized',
    ],
  },
  {
    version: '0.1.1',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

var debugTab = {};

// DEBUGGING TOOLS ///////////////////////////////////////////////////
// meant to be used from browser debugger tools and the like.

debugTab.create = function () {
  window.chat.addChannel({
    id: 'debug',
    name: 'Debug',
    inputPrompt: 'debug:',
    inputClass: 'debug',
    sendMessage: function (_, msg) {
      var result;
      try {
        result = eval('(' + msg + ')');
      } catch (e) {
        if (e.stack) {
          console.error(e.stack);
        }
        throw e; // to trigger native error message
      }
      if (result !== undefined) {
        console.log(result);
      }
    },
  });
};

debugTab.renderLine = function (errorType, args) {
  // Convert arguments to an array
  args = Array.prototype.slice.call(args);
  var text = [];

  // Function to safely stringify objects with depth limitation
  function safeStringify(obj, depth = 5) {
    let cache = [];
    return JSON.stringify(obj, function (key, value) {
      if (typeof value === 'object' && value !== null) {
        // Detect circular references or if the depth exceeds the limit
        if (cache.indexOf(value) !== -1 || cache.length > depth) {
          return '[Circular]'; // Return a placeholder for circular references
        }
        // Store object in cache for future reference
        cache.push(value);
      }
      return value;
    });
  }

  args.forEach(function (v) {
    // If v is not a string or number, attempt to stringify
    if (typeof v !== 'string' && typeof v !== 'number') {
      try {
        v = safeStringify(v);
      } catch {
        // In case of error, return error message with the object's string representation
        v = 'error rendering: ' + String(v);
      }
    }
    // Add the value to the text array
    text.push(v);
  });

  // Join text array into a single string with spaces between values
  text = text.join(' ');

  // Time element creation
  var time = document.createElement('time');
  var d = new Date();
  time.textContent = d.toLocaleTimeString();
  time.title = d.toLocaleString();
  time.dataset.timestamp = d.getTime();

  // Type element creation (for log type)
  var type = document.createElement('mark');
  type.textContent = errorType;
  type.className = errorType;

  // Text element creation (for the log message)
  var pre = document.createElement('pre');
  pre.textContent = text;

  // Check if the last message is visible (scroll position)
  var debugContainer = document.getElementById('chatdebug');
  var isAtBottom = debugContainer.scrollTop >= debugContainer.scrollTopMax;

  // Insert a new row in the debug table
  var table = document.querySelector('#chatdebug table');
  var row = table.insertRow();
  row.insertCell().append(time);
  row.insertCell().append(type);
  row.insertCell().append(pre);

  // Auto-scroll to the bottom if the user was at the bottom
  if (isAtBottom) debugContainer.scrollTo(0, debugContainer.scrollTopMax);
};

debugTab.console = {};
debugTab.console.log = function () {
  debugTab.renderLine('notice', arguments);
};

debugTab.console.warn = function () {
  debugTab.renderLine('warning', arguments);
};

debugTab.console.error = function () {
  debugTab.renderLine('error', arguments);
};

debugTab.console.debug = function () {
  debugTab.renderLine('debug', arguments);
};

debugTab.console.info = function () {
  debugTab.renderLine('info', arguments);
};

function overwriteNative() {
  var nativeConsole = window.console;
  window.console = L.extend({}, window.console);

  function overwrite(which) {
    window.console[which] = function () {
      if (nativeConsole) {
        nativeConsole[which].apply(nativeConsole, arguments);
      }
      debugTab.console[which].apply(debugTab.console, arguments);
    };
  }

  overwrite('log');
  overwrite('warn');
  overwrite('error');
  overwrite('debug');
  overwrite('info');
}

// Old API utils
debugTab.renderDetails = function () {
  debugTab.console.log('portals: ' + Object.keys(window.portals).length);
  debugTab.console.log('links:   ' + Object.keys(window.links).length);
  debugTab.console.log('fields:  ' + Object.keys(window.fields).length);
};

debugTab.printStackTrace = function () {
  var e = new Error('dummy');
  debugTab.console.error(e.stack);
  return e.stack;
};

debugTab.show = function () {
  window.chat.show('debug');
};

function setup() {
  window.plugin.debug = debugTab;
  debugTab.create();
  overwriteNative();

  $('<style>').prop('type', 'text/css').text('@include_string:debug-console.css@').appendTo('head');

  // emulate old API
  window.debug = function () {};
  window.debug.renderDetails = debugTab.renderDetails;
  window.debug.printStackTrace = debugTab.printStackTrace;
  window.debug.console = function () {};
  window.debug.console.show = debugTab.show;
  window.debug.console.renderLine = function (text, errorType) {
    return debugTab.renderLine(errorType, [text]);
  };
  window.debug.console.log = debugTab.console.log;
  window.debug.console.warn = debugTab.console.warn;
  window.debug.console.error = debugTab.console.error;
}

setup.priority = 'boot';
