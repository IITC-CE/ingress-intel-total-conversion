/* global log -- eslint */

/**
 * @file This file contains functions related to the handling of passcode redeeming in Ingress.
 * @module redeeming
 */

/**
 * Provides a scale factor for short names of various Ingress items used in passcode rewards.
 *
 * @constant
 * @name REDEEM_SHORT_NAMES
 * @type {Object}
 */
window.REDEEM_SHORT_NAMES = {
  'portal shield': 'S',
  'force amp': 'FA',
  'link amp': 'LA',
  heatsink: 'H',
  multihack: 'M',
  turret: 'T',
  'unusual object': 'U',
  resonator: 'R',
  'xmp burster': 'X',
  'power cube': 'C',
  media: 'M',
  'ultra strike': 'US',
};

/**
 * HTTP status codes and corresponding messages returned by the redemption API.
 *
 * @constant
 * @name REDEEM_STATUSES
 * @type {Object}
 */
window.REDEEM_STATUSES = {
  429: 'You have been rate-limited by the server. Wait a bit and try again.',
  500: 'Internal server error',
};

/**
 * Handles the response from the passcode redeeming API.
 *
 * @function handleRedeemResponse
 * @param {Object} data - The data returned by the API.
 * @param {string} textStatus - The status of the response.
 * @param {jqXHR} jqXHR - The jQuery wrapped XMLHttpRequest object.
 */
window.handleRedeemResponse = function (data, textStatus, jqXHR) {
  var passcode = jqXHR.passcode;

  if (data.error) {
    log.error('Error redeeming passcode "' + passcode + '": ' + data.error);
    window.dialog({
      title: 'Error: ' + passcode,
      html: '<strong>' + data.error + '</strong>',
    });
    return;
  }
  if (!data.rewards) {
    log.error('Error redeeming passcode "' + passcode + '": ', data);
    window.dialog({
      title: 'Error: ' + passcode,
      html: '<strong>An unexpected error occured</strong>',
    });
    return;
  }

  if (data.playerData) {
    window.PLAYER = data.playerData;
    window.setupPlayerStat();
  }

  var format = 'long';
  try {
    format = localStorage['iitc-passcode-format'];
  } catch {
    /* empty */
  }

  var formatHandlers = {
    short: window.formatPasscodeShort,
    long: window.formatPasscodeLong,
  };
  if (!formatHandlers[format]) format = 'long';

  var html = formatHandlers[format](data.rewards);

  var buttons = {};
  Object.keys(formatHandlers).forEach(function (label) {
    if (label === format) return;

    buttons[label.toUpperCase()] = function () {
      $(this).dialog('close');
      localStorage['iitc-passcode-format'] = label;
      window.handleRedeemResponse(data, textStatus, jqXHR);
    };
  });

  // Display it
  window.dialog({
    title: 'Passcode: ' + passcode,
    html: html,
    buttons: buttons,
  });
};

/**
 * Formats passcode reward data into a long, detailed html string.
 *
 * @function formatPasscodeLong
 * @param {Object} data - The reward data.
 * @returns {string} Formatted string representing the detailed rewards.
 */
window.formatPasscodeLong = function (data) {
  var html = '<p><strong>Passcode confirmed. Acquired items:</strong></p><ul class="redeemReward">';

  if (data.other) {
    data.other.forEach(function (item) {
      html += '<li>' + window.escapeHtmlSpecialChars(item) + '</li>';
    });
  }

  if (0 < data.xm) html += '<li>' + window.escapeHtmlSpecialChars(data.xm) + ' XM</li>';
  if (0 < data.ap) html += '<li>' + window.escapeHtmlSpecialChars(data.ap) + ' AP</li>';

  if (data.inventory) {
    data.inventory.forEach(function (type) {
      type.awards.forEach(function (item) {
        html += '<li>' + item.count + 'x ';

        var l = item.level;
        if (0 < l) {
          l = parseInt(l);
          html += '<span class="itemlevel" style="color:' + window.COLORS_LVL[l] + '">L' + l + '</span> ';
        }

        html += window.escapeHtmlSpecialChars(type.name) + '</li>';
      });
    });
  }

  html += '</ul>';
  return html;
};

/**
 * Formats passcode reward data into a short, concise html string.
 *
 * @function formatPasscodeShort
 * @param {Object} data - The reward data.
 * @returns {string} Formatted string representing the concise rewards.
 */
window.formatPasscodeShort = function (data) {
  let awards = [];
  if (data.other) {
    awards = data.other.map(window.escapeHtmlSpecialChars);
  }

  if (0 < data.xm) awards.push(window.escapeHtmlSpecialChars(data.xm) + ' XM');
  if (0 < data.ap) awards.push(window.escapeHtmlSpecialChars(data.ap) + ' AP');

  if (data.inventory) {
    data.inventory.forEach(function (type) {
      type.awards.forEach(function (item) {
        var str = '';
        if (item.count > 1) str += item.count + '&nbsp;';

        if (window.REDEEM_SHORT_NAMES[type.name.toLowerCase()]) {
          var shortName = window.REDEEM_SHORT_NAMES[type.name.toLowerCase()];

          let l = item.level;
          if (0 < l) {
            l = parseInt(l);
            str += '<span class="itemlevel" style="color:' + window.COLORS_LVL[l] + '">' + shortName + l + '</span>';
          } else {
            str += shortName;
          }
        } else {
          // no short name known
          let l = item.level;
          if (0 < l) {
            l = parseInt(l);
            str += '<span class="itemlevel" style="color:' + window.COLORS_LVL[l] + '">L' + l + '</span> ';
          }
          str += type.name;
        }

        awards.push(str);
      });
    });
  }

  return '<p class="redeemReward">' + awards.join(', ') + '</p>';
};

/**
 * Sets up the redeem functionality, binding to UI elements.
 *
 * @function setupRedeem
 */
window.setupRedeem = function () {
  $('#redeem').keypress(function (e) {
    if ((e.keyCode ? e.keyCode : e.which) !== 13) return;

    var passcode = $(this).val();
    passcode = passcode.replace(/[^\x20-\x7E]+/g, ''); // removes non-printable characters
    if (!passcode) return;

    var jqXHR = window.postAjax('redeemReward', { passcode: passcode }, window.handleRedeemResponse, function (response) {
      var extra = '';
      if (response.status) {
        extra = (window.REDEEM_STATUSES[response.status] || 'The server indicated an error.') + ' (HTTP ' + response.status + ')';
      } else {
        extra = 'No status code was returned.';
      }
      window.dialog({
        title: 'Request failed: ' + passcode,
        html: '<strong>The HTTP request failed.</strong> ' + extra,
      });
    });
    jqXHR.passcode = passcode;
  });
};
