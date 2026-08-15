/* global IITC */

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
 * Marks a pane or chat channel as the active tab in the chat controls.
 *
 * @function setActiveTab
 * @param {string} id - The ID of the pane.
 */
function setActiveTab(id) {
  document.querySelector('#chatcontrols .active')?.classList.remove('active');
  document.querySelector(`#chatcontrols a[data-channel='${id}']`)?.classList.add('active');
}

/**
 * Shows the elements a pane consists of and marks its tab in the chat controls.
 * A comm channel is handed over to IITC.chat, which renders and marks it itself.
 *
 * @function applyPane
 * @param {string} id - The ID of the pane to apply.
 */
function applyPane(id) {
  if (IITC.chat.getChannelDesc(id)) {
    IITC.chat.show(id);
    return;
  }

  switch (id) {
    case 'map':
      $('#map').css({ visibility: 'visible', opacity: '1' });
      IITC.statusbar.show();
      $('#portal_highlight_select').show();
      $('#farm_level_select').show();
      setActiveTab(id);
      break;
    case 'info':
      $('#scrollwrapper').show();
      IITC.portal.display.resetScroll();
      setActiveTab(id);
      break;
  }
}

/**
 * Shows a specified pane and hides others.
 *
 * @function show
 * @param {string} id - The ID of the pane to show.
 */
window.show = function (id) {
  const changed = window.currentPane !== id;
  window.currentPane = id;

  if (changed) {
    window.hideall();
    window.runHooks('paneChanged', id);
  }

  applyPane(id);
};

/**
 * Hides all panes and related elements.
 *
 * @function hideall
 */
window.hideall = function () {
  $('#chatcontrols, #chat, #chatinput, #sidebartoggle, #scrollwrapper, #portal_highlight_select').hide();
  IITC.statusbar.hide();
  $('#farm_level_select').hide();
  $('#map').css({ visibility: 'hidden', opacity: '0' });
  $('.ui-tooltip').remove();
};
