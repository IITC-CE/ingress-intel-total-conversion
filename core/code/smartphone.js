/* global log -- eslint */

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
 * Updates the mobile information bar with portal details when a portal is selected.
 * This function is hooked to the 'portalSelected' event and is specific to the smartphone layout.
 *
 * @function smartphoneInfo
 * @param {Object} selectedPortalData - The object containing details about the selected portal.
 */
window.smartphoneInfo = function (selectedPortalData) {
  var guid = selectedPortalData.selectedPortalGuid;
  if (!window.portals[guid]) return;

  var data = window.portals[window.selectedPortal].options.data;
  if (typeof data.title === 'undefined') return;

  var details = window.portalDetail.get(guid);

  var lvl = data.level;
  let t;
  if (data.team === 'N' || data.team === 'NEUTRAL') t = '<span class="portallevel">L0</span>';
  else t = '<span class="portallevel" style="background: ' + window.COLORS_LVL[lvl] + ';">L' + lvl + '</span>';

  var percentage = data.health;
  if (details) {
    var totalEnergy = window.getTotalPortalEnergy(details);
    if (window.getTotalPortalEnergy(details) > 0) {
      percentage = Math.floor((window.getCurrentPortalEnergy(details) / totalEnergy) * 100);
    }
  }
  t += ' ' + percentage + '% ';
  t += data.title;

  if (details) {
    var l, v, max, perc;
    var eastAnticlockwiseToNorthClockwise = [2, 1, 0, 7, 6, 5, 4, 3];

    for (var ind = 0; ind < 8; ind++) {
      let slot, reso;
      if (details.resonators.length === 8) {
        slot = eastAnticlockwiseToNorthClockwise[ind];
        reso = details.resonators[slot];
      } else {
        slot = null;
        reso = ind < details.resonators.length ? details.resonators[ind] : null;
      }

      var className = window.TEAM_TO_CSS[window.getTeam(details)];
      if (slot !== null && window.OCTANTS[slot] === 'N') className += ' north';
      if (reso) {
        l = parseInt(reso.level);
        v = parseInt(reso.energy);
        max = window.RESO_NRG[l];
        perc = (v / max) * 100;
      } else {
        l = 0;
        v = 0;
        max = 0;
        perc = 0;
      }

      t += '<div class="resonator ' + className + '" style="border-top-color: ' + window.COLORS_LVL[l] + ';left: ' + (100 * ind) / 8.0 + '%;">';
      t += '<div class="filllevel" style="width:' + perc + '%;"></div>';
      t += '</div>';
    }
  }

  $('#mobileinfo').html(t);
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
  window.addHook('portalSelected', window.smartphoneInfo);
  // init msg of status bar. hint for the user that a tap leads to the info screen
  $('#mobileinfo').html('<div style="text-align: center"><b>tap here for info screen</b></div>');

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
