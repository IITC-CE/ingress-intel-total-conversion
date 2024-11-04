/* global IITC, L -- eslint */

/**
 * @memberOf IITC.search.Query
 * @typedef {Object} SearchResult
 * @property {string} title - The label for this result (HTML-formatted).
 * @property {string} [description] - Secondary information for this result (HTML-formatted).
 * @property {L.LatLng} [position] - Position of this result.
 * @property {L.LatLngBounds} [bounds] - Bounds of this result.
 * @property {L.Layer|null} [layer] - Layer to be added to the map on result selection.
 * @property {string} [icon] - URL to a 12x12px icon for the result list.
 * @property {IITC.search.Query.onSelectedCallback} [onSelected] - Handler called when result is selected.
 *           May return `true` to prevent the map from being repositioned.
 *           You may reposition the map yourself or do other work.
 * @property {IITC.search.Query.onRemoveCallback} [onRemove] - Handler called when result is removed from map.
 *           (because another result has been selected or the search was cancelled by the user).
 */

/**
 * @memberOf IITC.search.Query
 * @callback onSelectedCallback
 * @param {IITC.search.Query.SearchResult} result - The selected search result.
 * @param {Event} event - The event that triggered the selection.
 * @returns {boolean} - Returns true to prevent map repositioning.
 */

/**
 * @memberOf IITC.search.Query
 * @callback onRemoveCallback
 * @param {IITC.search.Query.SearchResult} result - The search result that is being removed.
 * @returns {void} - No return value.
 */

/**
 * Represents a search query within the IITC search module, managing query state, results, and UI rendering.
 *
 * This class provides functionality to handle search operations such as displaying and interacting with results,
 * including selection, hover actions, and map adjustments. Hooks for custom search actions are triggered when
 * a new search query is initialized.
 *
 * @memberof IITC.search
 * @class
 */
class Query {
  /**
   * Initializes the search query, setting up UI elements and triggering the 'search' hook.
   *
   * @constructor
   * @param {string} term - The search term.
   * @param {boolean} confirmed - Indicates if the search is confirmed (e.g., by pressing Enter).
   */
  constructor(term, confirmed) {
    this.term = term;
    this.confirmed = confirmed;
    this.results = [];
    this.resultsView = new IITC.search.QueryResultsView(term, confirmed);

    window.runHooks('search', this);
  }

  /**
   * Displays the search query results in the specified resultsView container.
   *
   * @memberof IITC.search.Query
   * @function show
   * @private
   */
  show() {
    this.resultsView.renderIn('#searchwrapper');
  }

  /**
   * Hides and removes the current search results, clearing selection and hover states.
   *
   * @memberof IITC.search.Query
   * @function show
   * @private
   */
  hide() {
    this.resultsView.remove();
    this.removeSelectedResult();
    this.removeHoverResult();
  }

  /**
   * Adds a search result to the query and triggers re-rendering of the results list.
   *
   * @memberof IITC.search.Query
   * @function addResult
   * @param {IITC.search.Query.SearchResult} result - The search result to add, including title, position, and interactions.
   */
  addResult(result) {
    this.results.push(result);
    this.renderResults();
  }

  /**
   * Adds a search result for a portal to the search query results.
   *
   * @memberof IITC.search.Query
   * @function addPortalResult
   * @param {Object} data - The portal data for the search result. This includes information such as title, team, level, health, etc.
   * @param {string} guid - GUID if the portal.
   */
  addPortalResult(data, guid) {
    const team = window.teamStringToId(data.team);
    const color = team === window.TEAM_NONE ? '#CCC' : window.COLORS[team];
    const latLng = L.latLng(data.latE6 / 1e6, data.lngE6 / 1e6);

    this.addResult({
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
  }

  /**
   * Handles keyboard interactions for selecting a result with Enter or Space keys.
   *
   * @memberof IITC.search.Query
   * @function handleKeyPress
   * @param {Event} ev - The keyboard event.
   * @param {Object} result - The result being interacted with.
   * @private
   */
  handleKeyPress(ev, result) {
    if (ev.key === ' ' || ev.key === 'Enter') {
      ev.preventDefault();
      const type = ev.key === ' ' ? 'click' : 'dblclick';
      this.onResultSelected(result, { ...ev, type });
    }
  }

  /**
   * Renders all search results through the resultsView class and sets up event handling for each result.
   *
   * @memberof IITC.search.Query
   * @function renderResults
   * @private
   */
  renderResults() {
    this.resultsView.renderResults(this.results, (result, event) => this.handleResultInteraction(result, event));
  }

  /**
   * Manages interactions with search results, such as clicks, hovers, and keyboard events.
   *
   * @memberof IITC.search.Query
   * @function handleResultInteraction
   * @param {Object} result - The result being interacted with.
   * @param {Event} event - The event associated with the interaction.
   * @private
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
      case 'keydown':
        this.handleKeyPress(event, result);
        break;
    }
  }

  /**
   * Creates and returns a map layer for the given search result, which could include markers or shapes.
   *
   * @memberof IITC.search.Query
   * @function resultLayer
   * @param {Object} result - The search result object.
   * @returns {L.Layer} - The generated layer for the result.
   * @private
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
   * Handles the selection of a search result, adjusting the map view and adding its layer to the map.
   *
   * @memberof IITC.search.Query
   * @function onResultSelected
   * @param {Object} result - The selected search result object.
   * @param {Event} event - The event associated with the selection.
   * @private
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
   * Removes the currently selected search result from the map and performs necessary cleanup.
   *
   * @memberof IITC.search.Query
   * @function removeSelectedResult
   * @private
   */
  removeSelectedResult() {
    if (this.selectedResult) {
      if (this.selectedResult.layer) window.map.removeLayer(this.selectedResult.layer);
      if (this.selectedResult.onRemove) this.selectedResult.onRemove(this.selectedResult);
    }
  }

  /**
   * Starts a hover interaction on a search result, displaying its layer on the map.
   *
   * @memberof IITC.search.Query
   * @function onResultHoverStart
   * @param {Object} result - The result being hovered over.
   * @private
   */
  onResultHoverStart(result) {
    this.removeHoverResult();
    this.hoverResult = result;

    if (result === this.selectedResult) return;

    result.layer = this.resultLayer(result);

    if (result.layer) window.map.addLayer(result.layer);
  }

  /**
   * Ends a hover interaction by removing the hover layer from the map if it is not selected.
   *
   * @memberof IITC.search.Query
   * @function removeHoverResult
   * @private
   */
  removeHoverResult() {
    if (this.hoverResult && this.hoverResult.layer && this.hoverResult !== this.selectedResult) {
      window.map.removeLayer(this.hoverResult.layer);
    }
    this.hoverResult = null;
  }

  /**
   * Handles the end of a hover event, removing the hover layer from the map.
   *
   * @memberof IITC.search.Query
   * @function onResultHoverEnd
   * @private
   */
  onResultHoverEnd() {
    this.removeHoverResult();
  }
}

IITC.search.Query = Query;
