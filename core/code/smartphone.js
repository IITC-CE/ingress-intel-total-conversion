/* global log -- eslint */

/**
 * @file This file provides functions and utilities specifically for the smartphone layout of IITC.
 * @module smartphone
 */

/**
 * Placeholder for smartphone specific manipulations.
 * This function does not implement any logic by itself.
 *
 * @function smartphone
 */
window.smartphone = function () {};

/**
 * Performs initial setup tasks for IITC on smartphones before the IITC boot process.
 * Adds the smartphone stylesheet and the map/info pane buttons the mobile layout switches between.
 *
 * @function runOnSmartphonesBeforeBoot
 */
window.runOnSmartphonesBeforeBoot = function () {
  if (!window.isSmartphone()) return;
  log.debug('running smartphone pre boot stuff');

  // add smartphone stylesheet
  var style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(document.createTextNode('@include_string:smartphone.css@'));
  document.head.appendChild(style);

  window.smartphone.mapButton = $('<a data-channel="map">map</a>').click(function () {
    window.show('map');
  });

  window.smartphone.sideButton = $('<a data-channel="info">info</a>').click(function () {
    window.show('info');
  });

  $('#chatcontrols').append(window.smartphone.mapButton).append(window.smartphone.sideButton);

  if (!window.useAppPanes()) {
    document.body.classList.add('show-controls');
  }
};

/**
 * Performs setup tasks for IITC on smartphones after the IITC boot process.
 * Opens the map pane, which is the view the mobile layout starts on.
 *
 * @function runOnSmartphonesAfterBoot
 */
window.runOnSmartphonesAfterBoot = function () {
  if (!window.isSmartphone()) return;
  log.debug('running smartphone post boot stuff');

  window.show('map');
};
