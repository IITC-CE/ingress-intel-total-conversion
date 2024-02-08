// @author         jaiperdu
// @name           Debug console tab
// @category       Debug
// @version        0.1.1
// @description    Add a debug console tab

/* exported setup, changelog --eslint */
/* global L */

var changelog = [
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
  args = Array.prototype.slice.call(args);
  var text = [];
  args.forEach(function (v) {
    if (typeof v !== 'string' && typeof v !== 'number') {
      var cache = [];
      v = JSON.stringify(v, function (key, value) {
        if (typeof value === 'object' && value !== null) {
          if (cache.indexOf(value) !== -1) {
            // Circular reference found, discard key
            return;
          }
          // Store value in our collection
          cache.push(value);
        }
        return value;
      });
      cache = null;
    }
    text.push(v);
  });
  text = text.join(' ');

  // Time
  var time = document.createElement('time');
  var d = new Date();
  time.textContent = d.toLocaleTimeString();
  time.title = d.toLocaleString();
  time.dataset.timestamp = d.getTime();

  // Type
  var type = document.createElement('mark');
  type.textContent = errorType;
  type.className = errorType;

  // Text
  var pre = document.createElement('pre');
  pre.textContent = text;

  // Check if the last message is visible
  var debugContainer = document.getElementById('chatdebug');
  var isAtBottom = debugContainer.scrollTop >= debugContainer.scrollTopMax;

  // Insert Row
  var table = document.querySelector('#chatdebug table');
  var row = table.insertRow();
  row.insertCell().append(time);
  row.insertCell().append(type);
  row.insertCell().append(pre);

  // Auto-scroll to bottom
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

  $('<style>').prop('type', 'text/css').html('@include_string:debug-console.css@').appendTo('head');

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
