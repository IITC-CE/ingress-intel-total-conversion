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
 *  @namespace window.search
 */
IITC.search = {
  lastSearch: null,
};

class UI {
  constructor(term, confirmed) {
    this.term = term;
    this.confirmed = confirmed;
    this.container = this.createContainer();
    this.header = this.createHeader();
    this.list = this.createList();
  }

  createContainer() {
    const container = $('<div>').addClass('searchquery');
    container.accordion({ collapsible: true, heightStyle: 'content' });
    return container;
  }

  createHeader() {
    const headerText = this.confirmed
      ? this.term
      : `${this.term.length > 16 ? this.term.substr(0, 8) + '…' + this.term.substr(this.term.length - 8, 8) : this.term} (Return to load more)`;
    return $('<h3>').text(headerText).appendTo(this.container);
  }

  createList() {
    const list = $('<ul>').appendTo(this.container);
    list.append($('<li>').text(this.confirmed ? 'No local results, searching online...' : 'No local results.'));
    return list;
  }

  /**
   * Renders the list of results.
   * @param {Array} results - Array of result objects to display.
   * @param {Function} onResultInteraction - Callback for interaction events.
   */
  renderResults(results, onResultInteraction) {
    this.clearList();

    if (results.length === 0) {
      this.list.append($('<li>').text('No results found.'));
    } else {
      results.forEach((result) => {
        const item = this.createListItem(result);
        item.on('click dblclick mouseover mouseout', (ev) => onResultInteraction(result, ev));
        this.list.append(item);
      });
    }
  }

  createListItem(result) {
    const item = $('<li>').attr('tabindex', '0');
    const link = $('<a>').text(result.title).appendTo(item);

    if (result.icon) {
      link.css('background-image', `url("${result.icon}")`);
      item.css('list-style', 'none');
    }

    if (result.description) item.append($('<br>')).append($('<em>').append(result.description));
    return item;
  }

  renderIn(selector) {
    this.container.appendTo(selector);
  }

  remove() {
    this.container.remove();
  }

  clearList() {
    this.list.empty();
  }
}

/**
 * Represents a search query.
 *
 * @memberof window.search
 * @class
 * @name window.search.Query
 */
class Query {
  /**
   * Initializes the search query, setting up the DOM elements and triggering the 'search' hook.
   *
   * @function
   * @param {string} term - The search term.
   * @param {boolean} confirmed - Indicates if the search is confirmed (e.g., by pressing Enter).
   */
  constructor(term, confirmed) {
    this.term = term;
    this.confirmed = confirmed;
    this.results = [];
    this.ui = new UI(term, confirmed);

    window.runHooks('search', this);
  }

  /**
   * Displays the search query results in the search wrapper.
   *
   * @function
   */
  show() {
    this.ui.renderIn('#searchwrapper');
  }

  /**
   * Hides the search query results and cleans up.
   *
   * @function
   */
  hide() {
    this.ui.remove();
    this.removeSelectedResult();
    this.removeHoverResult();
  }

  /**
   * Adds a search result to this query and re-renders the list.
   *
   * @function
   * @param {Object} result - The search result object to add.
   */
  addResult(result) {
    this.results.push(result);
    this.renderResults();
  }

  handleKeyPress(ev, result) {
    if (ev.key === ' ' || ev.key === 'Enter') {
      ev.preventDefault();
      const type = ev.key === ' ' ? 'click' : 'dblclick';
      this.onResultSelected(result, { ...ev, type });
    }
  }

  /**
   * Passes results to UI for rendering and sets up interactions.
   */
  renderResults() {
    this.ui.renderResults(this.results, (result, event) => this.handleResultInteraction(result, event));
  }

  /**
   * Manages interactions with search results, such as selection and hover.
   * @param {Object} result - The search result object.
   * @param {Event} event - The event associated with the interaction.
   */
  handleResultInteraction(result, event) {
    switch (event.type) {
      case 'click':
      case 'dblclick':
        this.onResultSelected(result, event);
        break;
      case 'mouseover':
        this.onResultHoverStart(result);
        break;
      case 'mouseout':
        this.onResultHoverEnd();
        break;
      case 'keypress':
        this.handleKeyPress(event, result);
        break;
    }
  }

  /**
   * Creates and returns a layer for the given search result, which could be markers or shapes on the map.
   *
   * @function
   * @param {Object} result - The search result object.
   * @returns {L.Layer} The layer created for this result.
   */
  resultLayer(result) {
    if (!result.layer) {
      result.layer = L.layerGroup();

      if (result.position) {
        L.marker(result.position, {
          icon: L.divIcon.coloredSvg('red'),
          title: result.title,
        }).addTo(result.layer);
      }

      if (result.bounds) {
        L.rectangle(result.bounds, {
          title: result.title,
          interactive: false,
          color: 'red',
          fill: false,
        }).addTo(result.layer);
      }
    }
    return result.layer;
  }

  /**
   * Handles the selection of a search result, including map view adjustments and layer management.
   *
   * @function
   * @param {Object} result - The selected search result object.
   * @param {Event} event - The event associated with the selection.
   */
  onResultSelected(result, event) {
    this.removeHoverResult();
    this.removeSelectedResult();
    this.selectedResult = result;

    if (result.onSelected && result.onSelected(result, event)) return;

    const { position, bounds } = result;
    if (event.type === 'dblclick') {
      if (position) {
        window.map.setView(position, window.DEFAULT_ZOOM);
      } else if (bounds) {
        window.map.fitBounds(bounds, { maxZoom: window.DEFAULT_ZOOM });
      }
    } else {
      if (bounds) {
        window.map.fitBounds(bounds, { maxZoom: window.DEFAULT_ZOOM });
      } else if (position) {
        window.map.setView(position);
      }
    }

    result.layer = this.resultLayer(result);

    if (result.layer) window.map.addLayer(result.layer);
    if (window.isSmartphone()) window.show('map');
  }

  /**
   * Removes the currently selected search result from the map and performs cleanup.
   *
   * @function
   */
  removeSelectedResult() {
    if (this.selectedResult) {
      if (this.selectedResult.layer) window.map.removeLayer(this.selectedResult.layer);
      if (this.selectedResult.onRemove) this.selectedResult.onRemove(this.selectedResult);
    }
  }

  /**
   * Handles the start of a hover over a search result. Adds the layer for the result to the map if not already selected.
   *
   * @function
   * @param {Object} result - The search result object being hovered over.
   */
  onResultHoverStart(result) {
    this.removeHoverResult();
    this.hoverResult = result;

    if (result === this.selectedResult) return;

    result.layer = this.resultLayer(result);

    if (result.layer) window.map.addLayer(result.layer);
  }

  /**
   * Removes the hover result layer from the map unless it's the selected result.
   *
   * @function
   */
  removeHoverResult() {
    if (this.hoverResult && this.hoverResult.layer && this.hoverResult !== this.selectedResult) {
      window.map.removeLayer(this.hoverResult.layer);
    }
    this.hoverResult = null;
  }

  /**
   * Handles the end of a hover over a search result. Removes the hover result layer from the map.
   */
  onResultHoverEnd() {
    this.removeHoverResult();
  }
}

IITC.search.Query = Query;
IITC.search.UI = UI;

/**
 * Initiates a search with the specified term and confirmation status.
 *
 * @function window.search.doSearch
 * @param {string} term - The search term.
 * @param {boolean} confirmed - Indicates if the search term is confirmed.
 */
IITC.search.doSearch = function (term, confirmed) {
  term = term.trim();

  // minimum 3 characters for automatic search
  if (term.length < 3 && !confirmed) return;

  // don't clear last confirmed search
  if (IITC.search.lastSearch && IITC.search.lastSearch.confirmed && !confirmed) return;

  // don't make the same query again
  if (IITC.search.lastSearch && IITC.search.lastSearch.confirmed === confirmed && IITC.search.lastSearch.term === term) return;

  if (IITC.search.lastSearch) IITC.search.lastSearch.hide();
  IITC.search.lastSearch = null;

  // clear results
  if (term === '') return;

  if (window.useAppPanes()) window.show('info');

  $('.ui-tooltip').remove();

  IITC.search.lastSearch = new IITC.search.Query(term, confirmed);
  IITC.search.lastSearch.show();
};

/**
 * Sets up the search input field and button functionality.
 *
 * @function window.search.setup
 */
IITC.search.setup = function () {
  $('#search')
    .keypress(function (e) {
      if ((e.keyCode ? e.keyCode : e.which) !== 13) return;
      e.preventDefault();

      const term = $(this).val();

      clearTimeout(IITC.search.timer);
      IITC.search.doSearch(term, true);
    })
    .on('keyup keypress change paste', function () {
      clearTimeout(IITC.search.timer);
      IITC.search.timer = setTimeout(() => {
        const term = $(this).val();
        IITC.search.doSearch(term, false);
      }, 500);
    });
  $('#buttongeolocation').click(() => window.map.locate({ setView: true, maxZoom: 13 }));
};

/**
 * Adds a search result for a portal to the search query results.
 *
 * @function window.search.addSearchResult
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
      if (event.type === 'dblclick') {
        window.zoomToAndShowPortal(guid, latLng);
      } else if (window.portals[guid]) {
        if (!window.map.getBounds().contains(result.position)) {
          window.map.setView(result.position);
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
