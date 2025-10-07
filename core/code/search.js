/* global IITC -- eslint */

/**
 * Provides functionality for the search system within the application.
 *
 * You can implement your own result provider by listening to the search hook:
 * ```window.addHook('search', function(query) {});```.
 *
 * @example
 * // Adding a search result
 * window.addHook('search', function(query) {
 *   query.addResult({
 *     title: 'My Result',
 *     position: new L.LatLng(0, 0)
 *   });
 * });
 *
 *  @namespace IITC.search
 *  @memberof IITC
 */

/**
 * @memberOf IITC.search
 * @typedef {Object} SearchQuery
 * @property {string} term - The term for which the user has searched.
 * @property {boolean} confirmed - Indicates if the user has pressed enter after searching.
 *           You should not search online or do heavy processing unless the user has confirmed the search term.
 * @property {IITC.search.Query.addResult} addResult - Method to add a result to the query.
 * @property {IITC.search.Query.addPortalResult} addPortalResult - Method to add a portal to the query.
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

/*
 * @deprecated - use query.addPortalResult
 */
window.search.addSearchResult = function (query, data, guid) {
  query.addPortalResult(data, guid);
};
