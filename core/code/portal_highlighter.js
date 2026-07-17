/* global IITC -- eslint */

/**
 * Namespace for portal highlighters: registering, switching and applying portal highlight styles.
 *
 * @memberof IITC.portal
 * @namespace highlighter
 */

// an object mapping highlighter names to the object containing callback functions
window._highlighters = null;

// the name of the current highlighter
window._current_highlighter = localStorage.portal_highlighter;

window._no_highlighter = 'No Highlights';

/**
 * Adds a new portal highlighter to map. The highlighter is a function that will be called for each portal.
 *
 * @memberof IITC.portal.highlighter
 * @param {string} name - The name of the highlighter.
 * @param {Function} data - The callback function for the highlighter.
 *                          This function receives data about the portal and decides how to highlight it.
 */
const add = function (name, data) {
  if (window._highlighters === null) {
    window._highlighters = {};
  }

  // old-format highlighters just passed a callback function. this is the same as just a highlight method
  if (!data.highlight) {
    data = { highlight: data };
  }

  window._highlighters[name] = data;

  if (window.isApp && window.app.addPortalHighlighter) window.app.addPortalHighlighter(name);

  if (window._current_highlighter === undefined) {
    window._current_highlighter = name;
  }

  if (window._current_highlighter === name) {
    if (window.isApp && window.app.setActiveHighlighter) window.app.setActiveHighlighter(name);

    // call the setSelected callback
    if (window._highlighters[window._current_highlighter].setSelected) {
      window._highlighters[window._current_highlighter].setSelected(true);
    }
  }
  IITC.portal.highlighter.updateControl();
};

/**
 * Updates the portal highlighter dropdown list, recreating the dropdown list of available highlighters.
 *
 * @memberof IITC.portal.highlighter
 */
const updateControl = function () {
  if (window.isApp && window.app.addPortalHighlighter) {
    document.getElementById('portal_highlight_select')?.remove();
    return;
  }

  if (window._highlighters !== null) {
    let select = document.getElementById('portal_highlight_select');
    if (!select) {
      select = document.createElement('select');
      select.id = 'portal_highlight_select';
      select.addEventListener('change', function () {
        IITC.portal.highlighter.change(this.value);
      });
      document.body.append(select);

      const topLeft = document.querySelector('.leaflet-top.leaflet-left');
      if (topLeft) topLeft.style.paddingTop = '20px';
      const scaleLine = document.querySelector('.leaflet-control-scale-line');
      if (scaleLine) scaleLine.style.marginTop = '25px';
    }
    select.innerHTML = '';

    const addOption = (value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.append(option);
    };

    addOption(window._no_highlighter);
    Object.keys(window._highlighters)
      .sort()
      .forEach((name) => addOption(name));

    select.value = window._current_highlighter;
  }
};

/**
 * Changes the current portal highlights based on the selected highlighter.
 *
 * @memberof IITC.portal.highlighter
 * @param {string} name - The name of the highlighter to be applied.
 */
const change = function (name) {
  // first call any previous highlighter select callback
  if (window._current_highlighter && window._highlighters[window._current_highlighter] && window._highlighters[window._current_highlighter].setSelected) {
    window._highlighters[window._current_highlighter].setSelected(false);
  }

  window._current_highlighter = name;
  if (window.isApp && window.app.setActiveHighlighter) window.app.setActiveHighlighter(name);

  // now call the setSelected callback for the new highlighter
  if (window._current_highlighter && window._highlighters[window._current_highlighter] && window._highlighters[window._current_highlighter].setSelected) {
    window._highlighters[window._current_highlighter].setSelected(true);
  }

  IITC.portal.highlighter.resetAll();
  localStorage.portal_highlighter = name;
};

/**
 * Applies the currently active highlighter to a specific portal.
 * This function is typically called for each portal on the map.
 *
 * @memberof IITC.portal.highlighter
 * @param {Object} p - The portal object to be highlighted.
 */
const highlight = function (p) {
  if (window._highlighters !== null && window._highlighters[window._current_highlighter] !== undefined) {
    return window._highlighters[window._current_highlighter].highlight({ portal: p });
  }
};

/**
 * Resets the highlighting of all portals, returning them to their default style.
 *
 * @memberof IITC.portal.highlighter
 */
const resetAll = function () {
  Object.entries(window.portals).forEach(([guid, portal]) => {
    IITC.portal.marker.setStyle(portal, guid === window.selectedPortal);
  });
};

IITC.portal.highlighter = {
  add,
  updateControl,
  change,
  highlight,
  resetAll,
};

// Map of legacy global names to their new names within IITC.portal.highlighter
const legacyHighlighterMappings = {
  addPortalHighlighter: 'add',
  updatePortalHighlighterControl: 'updateControl',
  changePortalHighlights: 'change',
  highlightPortal: 'highlight',
  resetHighlightedPortals: 'resetAll',
};

IITC.registerLegacyAliases(IITC.portal.highlighter, legacyHighlighterMappings);
