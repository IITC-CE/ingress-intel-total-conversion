// @author         jaiperdu
// @name           Debug console tab
// @category       Debug
// @version        0.3.0
// @description    Add a debug console tab

/* exported setup, changelog --eslint */
/* global IITC, L */

var changelog = [
  {
    version: '0.3.0',
    changes: [
      'Fix auto-scroll to the bottom',
      'Do not let a failed log line break the code that logged it',
      'Show the message and stack of logged errors instead of {}',
      'Capture messages logged through ulog, not just console.* calls',
      'Add per-level filter buttons, with debug hidden by default; hidden levels are kept and can be shown again',
    ],
  },
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

// ulog level numbers, compared against the browser console threshold
var LEVELS = { error: 1, warn: 2, info: 3, log: 4, debug: 5, trace: 6 };
var ROW_TYPES = { error: 'error', warn: 'warning', info: 'info', log: 'log', debug: 'debug', trace: 'debug' };
// row type with the button label
var FILTERS = [
  { type: 'error', label: 'errors' },
  { type: 'warning', label: 'warnings' },
  { type: 'info', label: 'info' },
  { type: 'log', label: 'logs' },
  { type: 'debug', label: 'debug' },
];
var FILTER_KEY = 'plugin-debug-console-hidden';
var MAX_ROWS = 2000;

var nativeConsole;
// core logs its internal diagnostics at debug level, so start with that noise folded away
var hidden = { debug: true };

// DEBUGGING TOOLS ///////////////////////////////////////////////////
// meant to be used from browser debugger tools and the like.

debugTab.create = function () {
  IITC.chat.addChannel({
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

function saveFilters() {
  try {
    localStorage[FILTER_KEY] = JSON.stringify(
      FILTERS.filter(function (filter) {
        return hidden[filter.type];
      }).map(function (filter) {
        return filter.type;
      })
    );
  } catch {
    // the filter still applies, it just will not be remembered
  }
}

function loadFilters() {
  try {
    var stored = localStorage[FILTER_KEY];
    if (!stored) return;
    hidden = {};
    JSON.parse(stored).forEach(function (type) {
      hidden[type] = true;
    });
  } catch {
    // malformed state, keep the defaults
  }
}

function applyFilters(container) {
  FILTERS.forEach(function (filter) {
    container.classList.toggle('hide-' + filter.type, !!hidden[filter.type]);
  });
}

function buildFilterBar(container) {
  var bar = document.createElement('div');
  bar.className = 'debug-filters';
  if (IITC.utils.isSmartphone()) bar.classList.add('mobile');

  FILTERS.forEach(function (filter) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = filter.type;
    button.textContent = filter.label;
    button.title = 'Toggle ' + filter.label;
    button.classList.toggle('off', !!hidden[filter.type]);
    button.addEventListener('click', function () {
      hidden[filter.type] = !hidden[filter.type];
      button.classList.toggle('off', !!hidden[filter.type]);
      applyFilters(container);
      saveFilters();
    });
    bar.append(button);
  });

  container.insertBefore(bar, container.firstChild);
  applyFilters(container);
}

debugTab.renderLine = function (errorType, args) {
  // Convert arguments to an array
  args = Array.prototype.slice.call(args);
  var text = [];

  // JSON.stringify renders an Error as {}: name/message/stack are non-enumerable
  function errorToText(e) {
    var head = String(e);
    var stack = e.stack ? String(e.stack) : '';
    if (!stack) return head;
    // Chrome heads the stack with "Name: message"; Firefox and Safari list frames only
    return stack.indexOf(head) === 0 ? stack : head + '\n' + stack;
  }

  // Function to safely stringify objects with depth limitation
  function safeStringify(obj, depth = 5) {
    let cache = [];
    return JSON.stringify(obj, function (key, value) {
      if (value instanceof Error) {
        return errorToText(value);
      }
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
    if (v instanceof Error) {
      v = errorToText(v);
    } else if (typeof v !== 'string' && typeof v !== 'number') {
      // If v is not a string or number, attempt to stringify
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
  time.title = IITC.utils.unixTimeToDateTimeString(d.getTime(), true);
  time.dataset.timestamp = d.getTime();

  // Type element creation (for log type)
  var type = document.createElement('mark');
  type.textContent = errorType;
  type.className = errorType;

  // Text element creation (for the log message)
  var pre = document.createElement('pre');
  pre.textContent = text;

  var debugContainer = document.getElementById('chatdebug');
  if (!debugContainer.querySelector('.debug-filters')) buildFilterBar(debugContainer);
  var scrollBefore = IITC.utils.scrollBottom(debugContainer);

  // Insert a new row in the debug table
  var table = debugContainer.querySelector('table');
  var row = table.insertRow();
  row.className = errorType;
  row.insertCell().append(time);
  row.insertCell().append(type);
  row.insertCell().append(pre);

  while (table.rows.length > MAX_ROWS) {
    table.deleteRow(0);
  }

  IITC.chat.keepScrollPosition(debugContainer, scrollBefore, false);
};

debugTab.console = {};
debugTab.console.log = function () {
  debugTab.renderLine('log', arguments);
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
  nativeConsole = window.console;
  window.console = L.extend({}, window.console);

  function overwrite(which) {
    window.console[which] = function () {
      if (nativeConsole) {
        nativeConsole[which].apply(nativeConsole, arguments);
      }
      try {
        debugTab.console[which].apply(debugTab.console, arguments);
      } catch {
        // never break the caller: console.* is called from arbitrary code
      }
    };
  }

  overwrite('log');
  overwrite('warn');
  overwrite('error');
  overwrite('debug');
  overwrite('info');
}

// ulog binds whatever con() returns at logger creation, so a private sink gives this tab every
// level while the console keeps its threshold; assigning the level rebinds the existing loggers
function installLogSink() {
  if (!window.log) return;

  var consoleLevel = window.log.level;
  // ?debug=<module> raises the level for a single module, which a flat threshold cannot express
  if (consoleLevel < LEVELS.debug && (/[?&]debug=/.test(location.search) || localStorage.debug)) {
    consoleLevel = LEVELS.debug;
  }

  var sink = {};
  Object.keys(LEVELS).forEach(function (method) {
    sink[method] = function () {
      try {
        debugTab.renderLine(ROW_TYPES[method], arguments);
      } catch {
        // never break the caller: log.* is called from arbitrary code
      }
      if (nativeConsole && LEVELS[method] <= consoleLevel) {
        (nativeConsole[method] || nativeConsole.log).apply(nativeConsole, arguments);
      }
    };
  });

  window.log.con = function () {
    return sink;
  };
  window.log.level = 'trace';
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
  IITC.chat.show('debug');
};

function setup() {
  window.plugin.debug = debugTab;
  loadFilters();
  debugTab.create();
  overwriteNative();
  installLogSink();

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
