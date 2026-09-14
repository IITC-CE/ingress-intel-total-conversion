/* global IITC, log -- eslint */

/**
 * Namespace for the smartphone layout of IITC.
 *
 * It holds no public API: the boot hooks below are internal, and are only reachable across modules
 * because the bundle wraps every file in its own scope.
 *
 * @memberof IITC
 * @namespace smartphone
 */

/**
 * Legacy namespace of the smartphone layout. IITC itself no longer reads it, it survives as the
 * home of `mapButton` and `sideButton` for plugins that click them to switch panes.
 *
 * @deprecated call `window.show('map')` or `window.show('info')` to switch panes, and take the
 * button itself from `document.querySelector('#chatcontrols a[data-channel="map"]')` if needed.
 */
window.smartphone = function () {};

/**
 * Creates one of the pane buttons shown in the chat controls.
 *
 * Bound through jQuery, not addEventListener: plugins switch panes by trigger `click` on the
 * jQuery object `window.smartphone` publishes, and that runs jQuery-registered handlers only.
 *
 * @function createPaneButton
 * @param {string} pane - The pane it opens, used as both label and channel id.
 * @returns {jQuery} The button.
 */
function createPaneButton(pane) {
  return $('<a>')
    .attr('data-channel', pane)
    .text(pane)
    .on('click', () => window.show(pane));
}

/**
 * Performs initial setup tasks for IITC on smartphones before the IITC boot process.
 * Adds the smartphone stylesheet and the map/info pane buttons the mobile layout switches between.
 *
 * Called once from `boot`.
 *
 * @memberof IITC.smartphone
 * @private
 */
const _runBeforeBoot = function () {
  if (!IITC.utils.isSmartphone()) return;
  log.debug('running smartphone pre boot stuff');

  // add smartphone stylesheet
  const style = document.createElement('style');
  style.textContent = '@include_string:smartphone.css@';
  document.head.append(style);

  window.smartphone.mapButton = createPaneButton('map');
  window.smartphone.sideButton = createPaneButton('info');
  $('#chatcontrols').append(window.smartphone.mapButton, window.smartphone.sideButton);

  if (!window.useAppPanes()) {
    document.body.classList.add('show-controls');
  }
};

/**
 * Performs setup tasks for IITC on smartphones after the IITC boot process.
 * Opens the map pane, which is the view the mobile layout starts on.
 *
 * Called once from `boot`.
 *
 * @memberof IITC.smartphone
 * @private
 */
const _runAfterBoot = function () {
  if (!IITC.utils.isSmartphone()) return;
  log.debug('running smartphone post boot stuff');

  window.show('map');
};

IITC.smartphone = {
  _runBeforeBoot,
  _runAfterBoot,
};
