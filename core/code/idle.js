/* global log -- eslint */

/**
 * @file Contains functions and logic to handle the idle state of the user.
 * @module idle
 */

/**
 * Total time of user inactivity in seconds.
 *
 * @name idleTime
 * @type {number}
 */
window.idleTime = 0;
window._idleTimeLimit = window.MAX_IDLE_TIME;

var IDLE_POLL_TIME = 10;

var idlePoll = function () {
  var wasIdle = window.isIdle();
  window.idleTime += IDLE_POLL_TIME;

  var hidden = document.hidden || document.webkitHidden || document.mozHidden || document.msHidden || false;
  if (hidden) {
    window._idleTimeLimit = window.REFRESH; // set a small time limit before entering idle mode
  }
  if (!wasIdle && window.isIdle()) {
    log.log('idlePoll: entering idle mode');
  }
};

setInterval(idlePoll, IDLE_POLL_TIME * 1000);

/**
 * Resets the idle timer. This function is called when the user becomes active after being idle.
 *
 * @function idleReset
 */
window.idleReset = function () {
  // update immediately when the user comes back
  if (window.isIdle()) {
    log.log('idleReset: leaving idle mode');
    window.idleTime = 0;
    $.each(window._onResumeFunctions, function (ind, f) {
      f();
    });
  }
  window.idleTime = 0;
  window._idleTimeLimit = window.MAX_IDLE_TIME;
};

/**
 * Sets the idle state immediately, regardless of the actual idle time.
 *
 * @function idleSet
 */
window.idleSet = function () {
  var wasIdle = window.isIdle();

  window._idleTimeLimit = 0; // a zero time here will cause idle to start immediately

  if (!wasIdle && window.isIdle()) {
    log.log('idleSet: entering idle mode');
  }
};

// only reset idle on mouse move where the coordinates are actually different.
// some browsers send the event when not moving!
var _lastMouseX = -1,
  _lastMouseY = -1;
var idleMouseMove = function (e) {
  var dX = _lastMouseX - e.clientX;
  var dY = _lastMouseY - e.clientY;
  var deltaSquared = dX * dX + dY * dY;
  // only treat movements over 3 pixels as enough to reset us
  if (deltaSquared > 3 * 3) {
    _lastMouseX = e.clientX;
    _lastMouseY = e.clientY;
    window.idleReset();
  }
};

/**
 * Initializes the idle handling setup, attaching necessary event listeners.
 *
 * @function setupIdle
 */
window.setupIdle = function () {
  $('body').keypress(window.idleReset);
  $('body').mousemove(idleMouseMove);
};

/**
 * Checks if the user is currently idle.
 *
 * @function isIdle
 * @returns {boolean} True if the user is idle, false otherwise.
 */
window.isIdle = function () {
  return window.idleTime >= window._idleTimeLimit;
};

window._onResumeFunctions = [];

/**
 * Registers a function to be called when the user resumes from being idle.
 *
 * @function addResumeFunction
 * @param {Function} f The function to be executed on resume.
 */
window.addResumeFunction = function (f) {
  window._onResumeFunctions.push(f);
};
