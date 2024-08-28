/* global IITC -- eslint */

/**
 * @file This file provides functions for working with the sidebar.
 * @module sidebar
 */

/**
 * Sets up the sidebar, including player stats, toggle button, large image preview, etc.
 *
 * @function setupSidebar
 */
window.setupSidebar = function () {
  window.setupStyles();
  setupIcons();
  window.setupPlayerStat();
  setupSidebarToggle();
  setupLargeImagePreview();
  setupAddons();
  $('#sidebar').show();
};

/**
 * Function to append IITC's custom CSS styles to the `<head>` element.
 * Overwritten in smartphone.js.
 *
 * @function setupStyles
 */
window.setupStyles = function () {
  $('head').append(
    '<style>' +
      [
        '#largepreview.enl img { border:2px solid ' + window.COLORS[window.TEAM_ENL] + '; } ',
        '#largepreview.res img { border:2px solid ' + window.COLORS[window.TEAM_RES] + '; } ',
        '#largepreview.none img { border:2px solid ' + window.COLORS[window.TEAM_NONE] + '; } ',
        '#chatcontrols { bottom: ' + (window.CHAT_SHRINKED + 22) + 'px; }',
        '#chat { height: ' + window.CHAT_SHRINKED + 'px; } ',
        '.leaflet-right { margin-right: ' + (window.SIDEBAR_WIDTH + 1) + 'px } ',
        '#updatestatus { width:' + (window.SIDEBAR_WIDTH + 2) + 'px;  } ',
        '#sidebar { width:' + (window.SIDEBAR_WIDTH + window.HIDDEN_SCROLLBAR_ASSUMED_WIDTH + 1) /* border*/ + 'px;  } ',
        '#sidebartoggle { right:' + (window.SIDEBAR_WIDTH + 1) + 'px;  } ',
        `#scrollwrapper  { width:${window.SIDEBAR_WIDTH + 2 * window.HIDDEN_SCROLLBAR_ASSUMED_WIDTH}px; right:-${
          2 * window.HIDDEN_SCROLLBAR_ASSUMED_WIDTH - 2
        }px } `,
        '#sidebar > * { width:' + (window.SIDEBAR_WIDTH + 1) + 'px;  }',
      ].join('\n') +
      '</style>'
  );
};

/**
 * Sets up custom icons by appending SVG definitions to the DOM.
 *
 * @function setupIcons
 */
function setupIcons() {
  $(
    [
      '<svg>',
      // Material Icons

      // portal_detail_display.js
      '<symbol id="ic_place_24px" viewBox="0 0 24 24">',
      '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/>',
      '</symbol>',
      '</svg>',
    ].join('\\n')
  ).appendTo('body');
}

/**
 * Renders player details into the website. Since the player info is
 * included as inline script in the original site, the data is static
 * and cannot be updated.
 *
 * @function setupPlayerStat
 */
window.setupPlayerStat = function () {
  // stock site updated to supply the actual player level, AP requirements and XM capacity values
  var level = window.PLAYER.verified_level;
  window.PLAYER.level = level; // for historical reasons IITC expects PLAYER.level to contain the current player level

  var n = window.PLAYER.nickname;
  window.PLAYER.nickMatcher = new RegExp('\\b(' + n + ')\\b', 'ig');

  var ap = parseInt(window.PLAYER.ap);
  var thisLvlAp = parseInt(window.PLAYER.min_ap_for_current_level);
  var nextLvlAp = parseInt(window.PLAYER.min_ap_for_next_level);

  if (nextLvlAp) {
    var lvlUpAp = window.digits(nextLvlAp - ap);
    var lvlApProg = Math.round(((ap - thisLvlAp) / (nextLvlAp - thisLvlAp)) * 100);
  } // else zero nextLvlAp - so at maximum level(?)

  var xmMax = parseInt(window.PLAYER.xm_capacity);
  var xmRatio = Math.round((window.PLAYER.energy / xmMax) * 100);

  var cls = window.PLAYER.team === 'RESISTANCE' ? 'res' : 'enl';

  var t =
    `Level:\t${level}\n` +
    `XM:\t${window.PLAYER.energy} / ${xmMax}\n` +
    `AP:\t${window.digits(ap)}\n` +
    (nextLvlAp > 0 ? `level up in:\t${lvlUpAp} AP` : 'Maximum level reached(!)') +
    `\nInvites:\t${window.PLAYER.available_invites}` +
    `\n\nNote: your player stats can only be updated by a full reload (F5)`;

  $('#playerstat').html(
    `<h2 title="${t}">
      ${level}
      <div id="name">
        <span class="playername ${cls}">${window.PLAYER.nickname}</span>
        <a href="https://intel.ingress.com/logout" id="signout">sign out</a>
      </div>
      <div id="stats">
        <sup>XM: ${xmRatio}%</sup>
        <sub>${nextLvlAp > 0 ? 'level: ' + lvlApProg + '%' : 'max level'}</sub>
      </div>
    </h2>`
  );
};

/**
 * Initializes the sidebar toggle functionality.
 *
 * @function setupSidebarToggle
 */
function setupSidebarToggle() {
  $('#sidebartoggle').on('click', function () {
    var toggle = $('#sidebartoggle');
    var sidebar = $('#scrollwrapper');
    if (sidebar.is(':visible')) {
      sidebar.hide();
      $('.leaflet-right').css('margin-right', '0');
      toggle.html('<span class="toggle open"></span>');
      toggle.css('right', '0');
    } else {
      sidebar.show();
      window.resetScrollOnNewPortal();
      $('.leaflet-right').css('margin-right', window.SIDEBAR_WIDTH + 1 + 'px');
      toggle.html('<span class="toggle close"></span>');
      toggle.css('right', window.SIDEBAR_WIDTH + 1 + 'px');
    }
    $('.ui-tooltip').remove();
  });
}

/**
 * Sets up event listeners for the large portal image view. This dialog is displayed
 * when a user clicks on the portal photo in the sidebar. It creates a new image
 * preview inside a dialog box.
 *
 * @function setupLargeImagePreview
 */
function setupLargeImagePreview() {
  $('#portaldetails').on('click', '.imgpreview', function (e) {
    var img = this.querySelector('img');
    // dialogs have 12px padding around the content
    var dlgWidth = Math.max(img.naturalWidth + 24, 500);
    // This might be a case where multiple dialogs make sense, for example
    // someone might want to compare images of multiple portals.  But
    // usually we only want to show one version of each image.
    // To support that, we'd need a unique key per portal.  Example, guid.
    // So that would have to be in the html fetched into details.

    var preview = new Image(img.width, img.height);
    preview.src = img.src;
    preview.style = 'margin: auto; display: block';
    var title = e.delegateTarget.querySelector('.title').innerText;
    window.dialog({
      html: preview,
      title: title,
      id: 'iitc-portal-image',
      width: dlgWidth,
    });
  });
}

// fixed Addons ****************************************************************

/**
 * Updates the permalink href attribute on mouseover and click events.
 *
 * @function setPermaLink
 */
function setPermaLink() {
  this.href = window.makePermalink(null, true);
}

/**
 * Sets up additional elements in the sidebar, such as permalink and about dialog.
 *
 * @function setupAddons
 */
function setupAddons() {
  IITC.toolbox.addButton({
    id: 'permalink',
    label: 'Permalink',
    title: 'URL link to this map view',
    action: setPermaLink,
    mouseover: setPermaLink,
  });

  IITC.toolbox.addButton({
    id: 'about-iitc',
    label: 'About IITC',
    action: window.aboutIITC,
    class: 'cursor_help',
  });

  window.artifact.setup();

  window.RegionScoreboardSetup();
}
