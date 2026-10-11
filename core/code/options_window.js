/* global IITC, log -- eslint */

/**
 * @file The options window: the list of options pages next to the page chosen, and a search over
 *       the titles and texts of all pages. A narrow window shows the list or the page, with a way back.
 *       The window is a dialog over the map, on a smartphone too, so a change shows on the map at once.
 *       The page shown follows changes of its own options made elsewhere, such as values arriving
 *       through sync
 * @module options_window
 */

// pages of IITC itself come first, the rest follow by title
const FIRST_PAGES = ['iitc', 'about'];

// texts of a block searched for a query; titles computed when drawn are left out
const SEARCHED = ['title', 'description', 'text'];

// longest text the search shows under a page
const FOUND_LENGTH = 80;

// height of the dialog, in pixels; a lower screen gets a lower dialog
const HEIGHT = 560;

// the window's element and its dialog while it is open; the page and the query stay between openings
const view = {
  root: null,
  dialog: null,
  pageId: undefined,
  query: '',
};

const el = (...args) => IITC.options._el(...args);

/**
 * Ids of the registered pages in the order the window lists them
 *
 * @private
 * @returns {string[]}
 */
const pageIds = () => {
  const pages = IITC.options._pages;
  const rank = (id) => (FIRST_PAGES.includes(id) ? FIRST_PAGES.indexOf(id) : FIRST_PAGES.length);
  return Object.keys(pages).sort((a, b) => rank(a) - rank(b) || String(pages[a].title ?? a).localeCompare(String(pages[b].title ?? b)));
};

const titleOf = (pageId) => String(IITC.options._pages[pageId]?.title ?? pageId);

// a block the page does not show; inside a repeat, `visible` as a function of the item counts as shown
const hidden = (block, inRepeat) => {
  if (typeof block?.visible !== 'function') return block?.visible === false;
  if (inRepeat) return false;
  try {
    return block.visible() === false;
  } catch {
    // drawing the page reports the error
    return false;
  }
};

// texts of the blocks shown, the ones inside a repeat too
const blockTexts = (blocks, inRepeat = false) =>
  (blocks ?? []).flatMap((block) => {
    if (hidden(block, inRepeat)) return [];
    const own = SEARCHED.filter((name) => typeof block?.[name] === 'string').map((name) => block[name]);
    return block?.type === 'repeat' ? [...own, ...blockTexts(block.blocks, true)] : own;
  });

/**
 * Finds the texts of a page that contain the query, ignoring case
 *
 * @private
 * @returns {string[]|null} Texts of the page's blocks that match, empty when only the page title does;
 *                          null when nothing on the page matches
 */
const search = (pageId, query) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const found = blockTexts(IITC.options._pages[pageId].blocks).filter((text) => text.toLowerCase().includes(needle));
  if (found.length) return found;
  return titleOf(pageId).toLowerCase().includes(needle) ? [] : null;
};

const shorten = (text) => (text.length > FOUND_LENGTH ? `${text.slice(0, FOUND_LENGTH - 1)}…` : text);

const isOpen = () => view.root !== null && view.root.isConnected;

const part = (className) => view.root.querySelector(`.${className}`);

const content = () => part('iitc-options-content');

const navLink = (pageId) => [...view.root.querySelectorAll('.iitc-options-page-link')].find((link) => link.dataset.page === pageId);

const isHidden = (element) => element.ownerDocument.defaultView.getComputedStyle(element).display === 'none';

// draws the list again; the focus stays on the page it was on
const drawNav = () => {
  const list = part('iitc-options-pages');
  const focused = list.contains(document.activeElement) ? document.activeElement.dataset.page : undefined;
  const entries = pageIds()
    .map((pageId) => [pageId, search(pageId, view.query)])
    .filter(([, found]) => found !== null)
    .map(([pageId, found]) =>
      el(
        'li',
        {},
        el(
          'button',
          {
            type: 'button',
            className: 'iitc-options-page-link',
            dataset: { page: pageId },
            'aria-current': pageId === view.pageId && 'page',
            onclick: () => choose(pageId),
          },
          el('span', { className: 'iitc-options-page-title' }, titleOf(pageId)),
          // what the search found on the page
          found.length > 0 && el('span', { className: 'iitc-options-found' }, found.slice(0, 3).map(shorten).join(' · '))
        )
      )
    );
  list.replaceChildren(...entries);
  if (!entries.length) list.append(el('li', { className: 'iitc-options-nothing' }, 'Nothing found'));
  if (focused !== undefined) navLink(focused)?.focus();
};

const drawPage = () => {
  part('iitc-options-page-heading').textContent = view.pageId ? titleOf(view.pageId) : '';
  if (view.pageId) IITC.options._renderPage(view.pageId, content());
  else content().replaceChildren();
};

// shows a page; in a narrow window it takes the place of the list, and the focus moves to the way back
const choose = (pageId) => {
  const another = pageId !== view.pageId;
  view.pageId = pageId;
  view.root.dataset.view = 'page';
  view.root.querySelectorAll('.iitc-options-page-link').forEach((link) => {
    if (link.dataset.page === pageId) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  drawPage();
  // another page starts at its top
  if (another) content().scrollTop = 0;
  const nav = part('iitc-options-nav');
  if (nav.contains(document.activeElement) && isHidden(nav)) part('iitc-options-back').focus();
};

// the window, showing the page in a narrow window too when `showPage` is set
const build = (showPage) => {
  const searchInput = el('input', {
    type: 'search',
    className: 'iitc-options-search',
    placeholder: 'Search',
    value: view.query,
    'aria-label': 'Search options',
  });
  searchInput.addEventListener('input', () => {
    view.query = searchInput.value;
    drawNav();
  });
  // Escape clears the search first, and closes the window only from an empty field
  searchInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !searchInput.value) return;
    event.stopPropagation();
    searchInput.value = '';
    view.query = '';
    drawNav();
  });

  const back = el(
    'button',
    {
      type: 'button',
      className: 'iitc-options-back',
      'aria-label': 'Back to the list of pages',
      onclick: () => {
        view.root.dataset.view = 'list';
        (navLink(view.pageId) ?? searchInput).focus();
      },
    },
    el('iitc-icon', {}, 'arrow_back')
  );

  view.root = el(
    'div',
    { className: 'iitc-options', dataset: { view: showPage ? 'page' : 'list' } },
    el('nav', { className: 'iitc-options-nav' }, searchInput, el('ul', { className: 'iitc-options-pages' })),
    el(
      'section',
      { className: 'iitc-options-detail' },
      el('div', { className: 'iitc-options-detail-head' }, back, el('h2', { className: 'iitc-options-page-heading' })),
      el('div', { className: 'iitc-options-content' })
    )
  );
  drawNav();
  drawPage();
  return view.root;
};

// a page to show: the one chosen last while it is still registered, or the first
const currentPage = () => (IITC.options._pages[view.pageId] ? view.pageId : pageIds()[0]);

const openDialog = (showPage) => {
  view.dialog = window.dialog({
    id: 'iitc-options',
    title: 'Options',
    html: build(showPage),
    width: 700,
    height: Math.min(HEIGHT, window.innerHeight - 16),
    closeCallback: () => {
      view.root = null;
      view.dialog = null;
    },
  });
  // the dialog focuses the search as its first field; on a smartphone that would open the keyboard over the window
  const search = part('iitc-options-search');
  if (IITC.utils.isSmartphone() && document.activeElement === search) search.blur();
};

/**
 * Opens the options window, on a given page or on the page chosen last
 *
 * @memberof IITC.options
 * @param {string} [pageId] - Page to show
 * @returns {boolean} False when no such page is registered
 *
 * @example
 * IITC.toolbox.addButton({ label: 'Draw tools', action: () => IITC.options.open('draw-tools') });
 */
const open = (pageId) => {
  if (pageId !== undefined && !IITC.options._pages[pageId]) {
    log.warn(`options: no page "${pageId}" to open`);
    return false;
  }
  const showPage = pageId !== undefined;

  if (isOpen()) {
    if (showPage) choose(pageId);
    view.dialog?.dialog?.('moveToTop');
  } else {
    // a wide window always shows a page next to the list
    view.pageId = pageId ?? currentPage();
    // on a smartphone the dialog shows over the map pane
    if (IITC.utils.isSmartphone() && window.currentPane !== 'map') window.show('map');
    openDialog(showPage);
  }
  return true;
};

/**
 * Draws the page shown in the options window again, after the current task and after the click when
 * the pointer is down. Changes of the page's own options redraw it already; a page that also shows
 * other state calls this when that state changes
 *
 * @memberof IITC.options
 * @param {string} [pageId] - Redraws only if this page is shown
 */
const refresh = (pageId) => {
  if (!isOpen() || (pageId !== undefined && pageId !== view.pageId)) return;
  IITC.options._redrawLater(content());
};

// a change made on the page redraws it already; this follows changes made elsewhere, such as by sync.
// Options of other pages are left to refresh, so an open select is not closed by unrelated changes
const onOptionChanged = ({ key }) => {
  const page = IITC.options._pages[view.pageId];
  if (isOpen() && page && key.startsWith(`${page.namespace}.`)) IITC.options._redrawLater(content());
};

const onPageRegistered = ({ pageId }) => {
  if (!isOpen()) return;
  drawNav();
  if (pageId !== view.pageId) return;
  part('iitc-options-page-heading').textContent = titleOf(pageId);
  IITC.options._redrawLater(content());
};

/**
 * Adds the way to the options window: a toolbox button
 *
 * @private
 */
const setupWindow = () => {
  IITC.toolbox.addButton({
    id: 'options-toolbox-link',
    label: 'Options',
    title: 'IITC and plugin options',
    action: () => open(),
  });
};

Object.assign(IITC.options, { open, refresh, _pageIds: pageIds, _setupWindow: setupWindow, _view: view });

// handlers return nothing: a false would stop the remaining hook handlers
window.addHook('optionChanged', (event) => {
  onOptionChanged(event);
});
window.addHook('optionsPageRegistered', (event) => {
  onPageRegistered(event);
});
