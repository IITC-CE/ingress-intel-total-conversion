/* global IITC, log -- eslint */

/**
 * @file This file provides functions and utilities specifically for the smartphone layout of IITC.
 * @module smartphone
 */

/**
 * Determines if the user's device is a smartphone.
 * Note it should not detect tablets because their display is large enough to use the desktop version.
 * The stock intel site allows forcing mobile/full sites with a vp=m or vp=f parameter. This function supports the same.
 *
 * @function isSmartphone
 * @returns {boolean} True if the user's device is a smartphone, false otherwise.
 */
window.isSmartphone = function () {
  // this check is also used in main.js. Note it should not detect
  // tablets because their display is large enough to use the desktop
  // version.

  // The stock intel site allows forcing mobile/full sites with a vp=m or vp=f
  // parameter - let's support the same. (stock only allows this for some
  // browsers - e.g. android phone/tablet. let's allow it for all, but
  // no promises it'll work right)
  var viewParam = window.getURLParam('vp');
  if (viewParam === 'm') return true;
  if (viewParam === 'f') return false;

  return !!(navigator.userAgent.match(/Android.*Mobile/) || navigator.userAgent.match(/iPhone|iPad|iPod/i));
};

/**
 * Placeholder for smartphone specific manipulations.
 * This function does not implement any logic by itself.
 *
 * @function smartphone
 */
window.smartphone = function () {};

/**
 * Performs initial setup tasks for IITC on smartphones before the IITC boot process.
 * This includes adding smartphone-specific stylesheets
 * and modifying some of the setup functions for mobile compatibility.
 *
 * @function runOnSmartphonesBeforeBoot
 */
window.runOnSmartphonesBeforeBoot = function () {
  if (!window.isSmartphone()) return;
  log.warn('running smartphone pre boot stuff');

  // add smartphone stylesheet
  var style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(document.createTextNode('@include_string:smartphone.css@'));
  document.head.appendChild(style);

  // don’t need many of those
  window.setupStyles = function () {
    $('head').append(
      '<style>' +
        [
          '#largepreview.enl img { border:2px solid ' + window.COLORS[window.TEAM_ENL] + '; } ',
          '#largepreview.res img { border:2px solid ' + window.COLORS[window.TEAM_RES] + '; } ',
          '#largepreview.none img { border:2px solid ' + window.COLORS[window.TEAM_NONE] + '; } ',
        ].join('\n') +
        '</style>'
    );
  };

  window.smartphone.mapButton = $('<a>map</a>').click(function () {
    window.show('map');
    $('#map').css({ visibility: 'visible', opacity: '1' });
    $('#updatestatus').show();
    $('#chatcontrols a.active').removeClass('active');
    $("#chatcontrols a:contains('map')").addClass('active');
  });

  window.smartphone.sideButton = $('<a>info</a>').click(function () {
    window.show('info');
    $('#scrollwrapper').show();
    window.resetScrollOnNewPortal();
    $('#chatcontrols a.active').removeClass('active');
    $("#chatcontrols a:contains('info')").addClass('active');
  });

  $('#chatcontrols').append(window.smartphone.mapButton).append(window.smartphone.sideButton);

  if (!window.useAppPanes()) {
    document.body.classList.add('show_controls');
  }

  window.addHook('portalDetailsUpdated', function () {
    var x = $('.imgpreview img').removeClass('hide');

    if (!x.length) {
      $('.fullimg').remove();
      return;
    }

    if ($('.fullimg').length) {
      $('.fullimg').replaceWith(x.addClass('fullimg'));
    } else {
      x.addClass('fullimg').appendTo('#sidebar');
    }
  });
};

/**
 * Performs setup tasks for IITC on smartphones after the IITC boot process.
 * This includes initializing mobile info display, adjusting UI elements for mobile compatibility,
 * and setting event handlers for mobile-specific interactions.
 *
 * @function runOnSmartphonesAfterBoot
 */
window.runOnSmartphonesAfterBoot = function () {
  if (!window.isSmartphone()) return;
  log.warn('running smartphone post boot stuff');

  window.show('map');

  // add a div/hook for updating mobile info
  $('#updatestatus').prepend('<div id="mobileinfo" onclick="show(\'info\')"></div>');
  window.addHook('portalSelected', (data) => IITC.statusbar.portal.update(data));
  // init msg of status bar. hint for the user that a tap leads to the info screen
  IITC.statusbar.portal.update();

  // replace img full view handler
  $('#portaldetails')
    .off('click', '.imgpreview')
    .on('click', '.imgpreview', function (e) {
      if (e.currentTarget === e.target) {
        // do not fire on #level
        $('.ui-tooltip').remove();
        var newTop = $('.fullimg').position().top + $('#sidebar').scrollTop();
        $('#sidebar').animate({ scrollTop: newTop }, 200);
      }
    });
};
