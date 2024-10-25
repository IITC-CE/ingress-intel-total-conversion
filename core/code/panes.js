/**
 * @file Manages the display of different panes of the IITC interface.
 * @module panes
 */

/**
 * Tracks the currently active pane.
 * @type {string}
 * @member currentPane
 */
window.currentPane = '';

/**
 * Shows a specified pane and hides others.
 *
 * @function show
 * @param {string} id - The ID of the pane to show.
 */
window.show = function (id) {
  if (window.currentPane === id) return;
  window.currentPane = id;
  window.hideall();

  window.runHooks('paneChanged', id);

  // look for comm tab first
  if (window.chat.getChannelDesc(id)) window.chat.show(id);
  else {
    switch (id) {
      case 'map':
        window.smartphone.mapButton.click();
        $('#portal_highlight_select').show();
        $('#farm_level_select').show();
        break;
      case 'info':
        window.smartphone.sideButton.click();
        break;
    }
  }
};

/**
 * Hides all panes and related elements.
 *
 * @function hideall
 */
window.hideall = function () {
  $('#chatcontrols, #chat, #chatinput, #sidebartoggle, #scrollwrapper, #updatestatus, #portal_highlight_select').hide();
  $('#farm_level_select').hide();
  $('#map').css({ visibility: 'hidden', opacity: '0' });
  $('.ui-tooltip').remove();
};
