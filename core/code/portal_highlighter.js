/**
 * @file These functions handle portal highlighters
 * @module portal_highlighter
 */

// an object mapping highlighter names to the object containing callback functions
window._highlighters = null;

// the name of the current highlighter
window._current_highlighter = localStorage.portal_highlighter;

window._no_highlighter = 'No Highlights';

/**
 * Adds a new portal highlighter to map. The highlighter is a function that will be called for each portal.
 *
 * @function addPortalHighlighter
 * @param {string} name - The name of the highlighter.
 * @param {Function} data - The callback function for the highlighter.
 *                          This function receives data about the portal and decides how to highlight it.
 */
window.addPortalHighlighter = function (name, data) {
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
  window.updatePortalHighlighterControl();
};

/**
 * Updates the portal highlighter dropdown list, recreating the dropdown list of available highlighters.
 *
 * @function updatePortalHighlighterControl
 */
window.updatePortalHighlighterControl = function () {
  if (window.isApp && window.app.addPortalHighlighter) {
    $('#portal_highlight_select').remove();
    return;
  }

  if (window._highlighters !== null) {
    if ($('#portal_highlight_select').length === 0) {
      $('body').append("<select id='portal_highlight_select'></select>");
      $('#portal_highlight_select').change(function () {
        window.changePortalHighlights($(this).val());
      });
      $('.leaflet-top.leaflet-left').css('padding-top', '20px');
      $('.leaflet-control-scale-line').css('margin-top', '25px');
    }
    $('#portal_highlight_select').html('');
    $('#portal_highlight_select').append($('<option>').attr('value', window._no_highlighter).text(window._no_highlighter));
    var h_names = Object.keys(window._highlighters).sort();

    $.each(h_names, function (i, name) {
      $('#portal_highlight_select').append($('<option>').attr('value', name).text(name));
    });

    $('#portal_highlight_select').val(window._current_highlighter);
  }
};

/**
 * Changes the current portal highlights based on the selected highlighter.
 *
 * @function changePortalHighlights
 * @param {string} name - The name of the highlighter to be applied.
 */
window.changePortalHighlights = function (name) {
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

  window.resetHighlightedPortals();
  localStorage.portal_highlighter = name;
};

/**
 * Applies the currently active highlighter to a specific portal.
 * This function is typically called for each portal on the map.
 *
 * @function highlightPortal
 * @param {Object} p - The portal object to be highlighted.
 */
window.highlightPortal = function (p) {
  if (window._highlighters !== null && window._highlighters[window._current_highlighter] !== undefined) {
    return window._highlighters[window._current_highlighter].highlight({ portal: p });
  }
};

/**
 * Resets the highlighting of all portals, returning them to their default style.
 *
 * @function resetHighlightedPortals
 */
window.resetHighlightedPortals = function () {
  $.each(window.portals, function (guid, portal) {
    window.setMarkerStyle(portal, guid === window.selectedPortal);
  });
};
