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
   * @returns {HTMLElement} - The container element for the results.
   */
  createContainer() {
    const container = document.createElement('div');
    container.classList.add('searchquery');
    return container;
  }

  /**
   * Creates and appends a header to the container based on the search term.
   *
   * @memberof IITC.search.QueryResultsView
   * @returns {HTMLElement} - The header element displaying the search term or a loading message.
   */
  createHeader() {
    const header = document.createElement('h3');
    let headerText;

    if (this.confirmed) {
      headerText = this.term;
    } else {
      if (this.term.length > 16) {
        const start = this.term.slice(0, 8);
        const end = this.term.slice(-8);
        headerText = `${start}…${end} (Return to load more)`;
      } else {
        headerText = `${this.term} (Return to load more)`;
      }
    }

    header.textContent = headerText;
    this.container.appendChild(header);
    return header;
  }

  /**
   * Creates and appends an initial list element to display the search results.
   *
   * @memberof IITC.search.QueryResultsView
   * @returns {HTMLElement} - The list element for displaying the results.
   */
  createList() {
    const list = document.createElement('ul');
    const initialItem = document.createElement('li');
    initialItem.textContent = this.confirmed ? 'No local results, searching online...' : 'No local results.';
    list.appendChild(initialItem);
    this.container.appendChild(list);
    return list;
  }

  /**
   * Renders the search results within the list container and sets up event interactions.
   *
   * @memberof IITC.search.QueryResultsView
   * @param {Array<Object>} results - An array of search result objects to display.
   * @param {Function} onResultInteraction - A callback function for handling interaction events on results.
   */
  renderResults(results, onResultInteraction) {
    this.clearList();

    if (results.length === 0) {
      const noResultsItem = document.createElement('li');
      noResultsItem.textContent = 'No results found.';
      this.list.appendChild(noResultsItem);
    } else {
      results.forEach((result) => {
        const item = this.createListItem(result);
        item.addEventListener('click', (ev) => onResultInteraction(result, ev));
        item.addEventListener('dblclick', (ev) => onResultInteraction(result, ev));
        item.addEventListener('mouseover', (ev) => onResultInteraction(result, ev));
        item.addEventListener('mouseout', (ev) => onResultInteraction(result, ev));
        this.list.appendChild(item);
      });
    }
  }

  /**
   * Creates and returns a list item for an individual search result.
   *
   * @memberof IITC.search.QueryResultsView
   * @param {Object} result - The search result object with properties such as title, description, and icon.
   * @returns {HTMLElement} - The list item element representing the search result.
   */
  createListItem(result) {
    const item = document.createElement('li');
    item.tabIndex = 0;

    const link = document.createElement('a');
    link.innerHTML = result.title;

    if (result.icon) {
      link.style.backgroundImage = `url("${result.icon}")`;
      item.style.listStyle = 'none';
    }

    item.appendChild(link);

    if (result.description) {
      const description = document.createElement('em');
      description.innerHTML = result.description;
      item.appendChild(document.createElement('br'));
      item.appendChild(description);
    }

    return item;
  }

  /**
   * Appends the results container to a specified selector on the page.
   *
   * @memberof IITC.search.QueryResultsView
   * @param {string} selector - The selector string for the target container.
   */
  renderIn(selector) {
    const target = document.querySelector(selector);
    if (target) target.appendChild(this.container);
  }

  /**
   * Removes the results container from the page.
   *
   * @memberof IITC.search.QueryResultsView
   */
  remove() {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  /**
   * Clears all items from the results list.
   *
   * @memberof IITC.search.QueryResultsView
   */
  clearList() {
    this.list.innerHTML = '';
  }
}

IITC.search.QueryResultsView = QueryResultsView;
