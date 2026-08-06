/* global IITC, log -- eslint */

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
    IITC.statusbar.show();
    $('#chatcontrols a.active').removeClass('active');
    $("#chatcontrols a:contains('map')").addClass('active');
  });

  window.smartphone.sideButton = $('<a>info</a>').click(function () {
    window.show('info');
    $('#scrollwrapper').show();
    IITC.portal.display.resetScroll();
    $('#chatcontrols a.active').removeClass('active');
    $("#chatcontrols a:contains('info')").addClass('active');
  });

  $('#chatcontrols').append(window.smartphone.mapButton).append(window.smartphone.sideButton);

  if (!window.useAppPanes()) {
    document.body.classList.add('show-controls');
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
