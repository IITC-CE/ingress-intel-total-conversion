/* global IITC -- eslint */

/**
 * Represents the view for displaying search query results in the IITC search module.
 *
 * @memberof IITC.search
 * @class
 */
class QueryResultsView {
  /**
   * Initializes the query results view, setting up the display elements for the search term.
   *
   * @constructor
   * @param {string} term - The search term.
   * @param {boolean} confirmed - Indicates if the search is confirmed (e.g., by pressing Enter).
   */
  constructor(term, confirmed) {
    this.term = term;
    this.confirmed = confirmed;
    this.container = this.createContainer();
    this.header = this.createHeader();
    this.list = this.createList();
  }

  /**
   * Creates and returns the main container element for the query results.
   *
   * @memberof IITC.search.QueryResultsView
   * @returns {jQuery} - The jQuery container element for the results.
   */
  createContainer() {
    const container = $('<div>').addClass('searchquery');
    container.accordion({ collapsible: true, heightStyle: 'content' });
    return container;
  }

  /**
   * Creates and appends a header to the container based on the search term.
   *
   * @memberof IITC.search.QueryResultsView
   * @returns {jQuery} - The jQuery header element displaying the search term or a loading message.
   */
  createHeader() {
    const headerText = this.confirmed
      ? this.term
      : `${this.term.length > 16 ? this.term.substr(0, 8) + '…' + this.term.substr(this.term.length - 8, 8) : this.term} (Return to load more)`;
    return $('<h3>').text(headerText).appendTo(this.container);
  }

  /**
   * Creates and appends an initial list element to display the search results.
   *
   * @memberof IITC.search.QueryResultsView
   * @returns {jQuery} - The jQuery list element for displaying the results.
   */
  createList() {
    const list = $('<ul>').appendTo(this.container);
    list.append($('<li>').text(this.confirmed ? 'No local results, searching online...' : 'No local results.'));
    return list;
  }

  /**
   * Renders the search results within the list container and sets up event interactions.
   *
   * @memberof IITC.search.QueryResultsView
   * @param {Array<Object>} results - An array of search result objects to display.
   * @param {Function} - onResultInteraction - A callback function for handling interaction events on results.
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

  /**
   * Creates and returns a list item for an individual search result.
   *
   * @memberof IITC.search.QueryResultsView
   * @param {Object} result - The search result object with properties such as title, description, and icon.
   * @returns {jQuery} - The jQuery list item element representing the search result.
   */
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

  /**
   * Appends the results container to a specified selector on the page.
   *
   * @memberof IITC.search.QueryResultsView
   * @param {string} selector - The selector string for the target container.
   */
  renderIn(selector) {
    this.container.appendTo(selector);
  }

  /**
   * Removes the results container from the page.
   *
   * @memberof IITC.search.QueryResultsView
   */
  remove() {
    this.container.remove();
  }

  /**
   * Clears all items from the results list.
   *
   * @memberof IITC.search.QueryResultsView
   */
  clearList() {
    this.list.empty();
  }
}

IITC.search.QueryResultsView = QueryResultsView;
