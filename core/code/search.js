/* global IITC, L -- eslint */

/**
 * Provides functionality for the search system within the application.
 *
 * You can implement your own result provider by listening to the search hook:
 * ```window.addHook('search', function(query) {});```.
 *
 * The `query` object has the following members:
 * - `term`: The term for which the user has searched.
 * - `confirmed`: A boolean indicating if the user has pressed enter after searching.
 *   You should not search online or do heavy processing unless the user has confirmed the search term.
 * - `addResult(result)`: A method to add a result to the query.
 *
 * The `result` object can have the following members (`title` is required, as well as one of `position` and `bounds`):
 * - `title`: The label for this result. Will be interpreted as HTML, so make sure to escape properly.
 * - `description`: Secondary information for this result. Will be interpreted as HTML, so make sure to escape properly.
 * - `position`: A L.LatLng object describing the position of this result.
 * - `bounds`: A L.LatLngBounds object describing the bounds of this result.
 * - `layer`: An ILayer to be added to the map when the user selects this search result.
 *   Will be generated if not set. Set to `null` to prevent the result from being added to the map.
 * - `icon`: A URL to an icon to display in the result list. Should be 12x12 pixels.
 * - `onSelected(result, event)`: A handler to be called when the result is selected.
 *   May return `true` to prevent the map from being repositioned. You may reposition the map yourself or do other work.
 * - `onRemove(result)`: A handler to be called when the result is removed from the map
 *   (because another result has been selected or the search was cancelled by the user).
 *  @namespace IITC.search
 *  @memberof IITC
 */
IITC.search = {
  lastSearch: null,
};

/**
 * Initiates a search with the specified term and confirmation status.
 *
 * @function IITC.search.doSearch
 * @param {string} term - The search term.
 * @param {boolean} confirmed - Indicates if the search term is confirmed.
 */
IITC.search.doSearch = function (term, confirmed) {
  const searchTerm = term.trim();
  const searchCancelButton = document.querySelector('#searchcancel');

  if (searchCancelButton) {
    searchCancelButton.classList.toggle('visible', searchTerm.length > 0);
  }

  // Minimum 3 characters for automatic search
  if (searchTerm.length < 3 && !confirmed) return;

  // Avoid clearing last confirmed search
  const lastSearch = IITC.search.lastSearch;
  if (lastSearch?.confirmed && !confirmed) return;

  // Prevent repeat of identical query
  if (lastSearch?.confirmed === confirmed && lastSearch.term === searchTerm) return;

  if (lastSearch) lastSearch.hide();
  IITC.search.lastSearch = null;

  if (searchTerm === '') return;

  if (window.useAppPanes()) window.show('info');

  document.querySelectorAll('.ui-tooltip').forEach((tooltip) => tooltip.remove());

  IITC.search.lastSearch = new IITC.search.Query(searchTerm, confirmed);
  IITC.search.lastSearch.show();
};

/**
 * Sets up the search input field and button functionality.
 *
 * @function IITC.search.setup
 */
IITC.search.setup = function () {
  const searchInput = document.querySelector('#search');
  const searchCancelButton = document.querySelector('#searchcancel');
  const geoLocationButton = document.querySelector('#buttongeolocation');
  let searchTimer;

  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();

      const term = searchInput.value.trim();
      clearTimeout(searchTimer);
      IITC.search.doSearch(term, true);
    });

    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        const term = searchInput.value.trim();
        IITC.search.doSearch(term, false);
      }, 100);
    });
  }

  if (searchCancelButton) {
    searchCancelButton.classList.remove('visible');

    searchCancelButton.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
        searchCancelButton.classList.remove('visible');

        // Clear the current search
        clearTimeout(searchTimer);
        IITC.search.doSearch('', true);
      }
    });
  }

  if (geoLocationButton) {
    geoLocationButton.addEventListener('click', () => {
      window.map.locate({ setView: true, maxZoom: 13 });
    });
  }
};

/**
 * Adds a search result for a portal to the search query results.
 *
 * @function IITC.search.addSearchResult
 * @param {Object} query - The search query object to which the result will be added.
 * @param {Object} data - The data for the search result. This includes information such as title, team, level, health, etc.
 * @param {string} guid - GUID if the portal.
 */
IITC.search.addSearchResult = function (query, data, guid) {
  const team = window.teamStringToId(data.team);
  const color = team === window.TEAM_NONE ? '#CCC' : window.COLORS[team];
  const latLng = L.latLng(data.latE6 / 1e6, data.lngE6 / 1e6);

  query.addResult({
    title: data.title,
    description: `${window.TEAM_SHORTNAMES[team]}, L${data.level}, ${data.health}%, ${data.resCount} Resonators`,
    position: latLng,
    icon: `data:image/svg+xml;base64,${btoa('@include_string:images/icon-portal.svg@'.replace(/%COLOR%/g, color))}`,

    onSelected(result, event) {
      const { position } = result;

      if (event.type === 'dblclick') {
        window.zoomToAndShowPortal(guid, latLng);
      } else if (window.portals[guid]) {
        if (!window.map.getBounds().contains(position)) {
          window.map.setView(position);
        }
        window.renderPortalDetails(guid);
      } else {
        window.selectPortalByLatLng(latLng);
      }
      return true;
    },
  });
};

// Redirect all window.search access to IITC.search
Object.defineProperty(window, 'search', {
  get() {
    return IITC.search;
  },
  set(value) {
    IITC.search = value;
  },
  configurable: true,
});
