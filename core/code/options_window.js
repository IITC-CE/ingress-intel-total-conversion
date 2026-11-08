/* global IITC, L, log -- eslint */

/**
 * @file The options window: the list of options pages next to the page chosen, and a search over
 *       the titles and texts of all pages. A narrow window shows the list or the page, with a way back.
 *       The window is a dialog over the map, so a change shows on the map at once, or fills the pane
 *       of an app. The page shown follows changes of its own options made elsewhere, such as values arriving
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

const PANE_ID = 'options';
const LINK_ID = 'options-toolbox-link';

// the window's element and its dialog while it is open; the page and the query stay between openings
const view = {
  root: null,
  dialog: null,
  pageId: undefined,
  query: '',
  pane: null,
  paneAdded: false,
  mapButton: null,
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
  // the sections of extensions are searched with their titles
  const sections = IITC.options._sections(pageId).flatMap((section) => [section.title, ...blockTexts(section.blocks)]);
  const found = [...blockTexts(IITC.options._pages[pageId].blocks), ...sections].filter((text) => text.toLowerCase().includes(needle));
  if (found.length) return found;
  return titleOf(pageId).toLowerCase().includes(needle) ? [] : null;
};

const shorten = (text) => (text.length > FOUND_LENGTH ? `${text.slice(0, FOUND_LENGTH - 1)}…` : text);

const isOpen = () => view.root !== null && view.root.isConnected;

const part = (className) => view.root.querySelector(`.${className}`);

const content = () => part('iitc-options-content');

const navLink = (pageId) => [...view.root.querySelectorAll('.iitc-options-page-link')].find((link) => link.dataset.page === pageId);

const isHidden = (element) => element.ownerDocument.defaultView.getComputedStyle(element).display === 'none';

// the tooltip of a page in the list, telling its access key; none on a touch screen, where a tap that opens
// the page would show it
const accessKeyHint = (pageId) => {
  const accesskey = IITC.options._pages[pageId]?.accesskey;
  if (!accesskey || window.matchMedia?.('(hover: none)').matches) return undefined;
  return `Access key [${accesskey}]`;
};

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
            title: accessKeyHint(pageId),
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
  if (view.pageId) IITC.options._renderPage(view.pageId, content(), view.query);
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
  if (another) {
    // another page starts at its top, or at what the search found on it
    content().scrollTop = 0;
    content().querySelector('.iitc-options-match')?.scrollIntoView?.({ block: 'center' });
  }
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
  // the list and the page show what the query finds
  const searched = () => {
    drawNav();
    if (view.pageId) drawPage();
  };
  searchInput.addEventListener('input', () => {
    view.query = searchInput.value;
    searched();
  });
  // Escape clears the search first, and closes the window only from an empty field
  searchInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !searchInput.value) return;
    event.stopPropagation();
    searchInput.value = '';
    view.query = '';
    searched();
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

// no close button: the app leaves the pane by showing another
const openPane = (showPage) => {
  view.pane = el('div', { id: 'iitc-options-pane', className: 'iitc-options-pane' }, build(showPage));
  document.body.append(view.pane);
};

const closePane = () => {
  view.pane?.remove();
  view.pane = null;
  view.root = null;
};

const display = (pageId) => {
  const showPage = pageId !== undefined;

  if (isOpen()) {
    if (showPage) choose(pageId);
    view.dialog?.dialog?.('moveToTop');
  } else {
    // a wide window always shows a page next to the list
    view.pageId = pageId ?? currentPage();
    if (window.currentPane === PANE_ID) {
      openPane(showPage);
      return;
    }
    // on a smartphone the dialog shows over the map pane
    if (IITC.utils.isSmartphone() && window.currentPane !== 'map') window.show('map');
    openDialog(showPage);
  }
};

// the page open() asked for before it switched to the pane
let paneRequest;

const entry = () => {
  if (!window.useAppPanes()) return 'button';
  return IITC.options.get('iitc.optionsPane') ? 'pane' : 'toolbox';
};

/**
 * Opens the options window, on a given page or on the page chosen last
 *
 * A toolbox button to an options page comes from the page's `shortcut`, which the user can turn off
 * with the other shortcuts; `IITC.toolbox.addButton` is for a plugin's own dialogs that are not part
 * of the options, such as lists and other views of map data. In an app with panes the window is a pane
 * of the app, unless `iitc.optionsPane` is off
 *
 * @memberof IITC.options
 * @param {string} [pageId] - Page to show
 * @returns {boolean} False when no such page is registered
 *
 * @example
 * // a toolbox button that opens the page
 * IITC.options.register('my-plugin', { title: 'My plugin', shortcut: true, blocks });
 * // the page opened from the plugin's own code, such as a link in its dialog
 * IITC.options.open('my-plugin');
 */
const open = (pageId) => {
  if (pageId !== undefined && !IITC.options._pages[pageId]) {
    log.warn(`options: no page "${pageId}" to open`);
    return false;
  }
  if (entry() === 'pane' && window.currentPane !== PANE_ID) {
    // the window opens when the pane is shown
    paneRequest = { pageId };
    window.show(PANE_ID);
    return true;
  }
  display(pageId);
  return true;
};

/**
 * Draws the page shown in the options window again, after the current task and after the click when
 * the pointer is down, and updates the toolbox shortcut of the page. Changes of the page's own options and
 * of the sections extensions add to it redraw it already; a page that also shows other state calls this when
 * that state changes
 *
 * @memberof IITC.options
 * @param {string} [pageId] - Redraws only if this page is shown; all shortcuts are updated without it
 */
const refresh = (pageId) => {
  (pageId === undefined ? Object.keys(IITC.options._pages) : [pageId]).forEach(updateShortcut);
  if (!isOpen() || (pageId !== undefined && pageId !== view.pageId)) return;
  IITC.options._redrawLater(content());
};

// a change made on the page redraws it already; this follows changes made elsewhere, such as by sync, of the
// options the page and the sections extensions add to it declare. Options of other pages are left to
// refresh, so an open select is not closed by unrelated changes
const onOptionChanged = ({ key }) => {
  if (isOpen() && IITC.options._pages[view.pageId] && IITC.options._definitions[key]?.pageId === view.pageId) IITC.options._redrawLater(content());
};

const onPageRegistered = ({ pageId }) => {
  if (!isOpen()) return;
  drawNav();
  if (pageId !== view.pageId) return;
  part('iitc-options-page-heading').textContent = titleOf(pageId);
  IITC.options._redrawLater(content());
};

const shortcutId = (pageId) => `options-shortcut-${pageId}`;

// the shortcut arguments each button was drawn with, so a refresh that changes nothing leaves the toolbox alone
const drawnShortcuts = new Map();

// the arguments of a page's toolbox button, or undefined when the page has none
const shortcutOf = (pageId) => {
  const page = IITC.options._pages[pageId];
  if (!page?.shortcut || IITC.options.get('iitc.toolboxShortcuts') === false) return undefined;
  let args = page.shortcut;
  try {
    if (typeof args === 'function') args = args();
  } catch (e) {
    log.warn(`options: shortcut of page "${pageId}" failed`, e);
    return undefined;
  }
  args = { label: titleOf(pageId), ...(typeof args === 'object' ? args : {}) };
  if (!page.accesskey) return args;
  const hint = `[${page.accesskey}]`;
  return { ...args, accesskey: page.accesskey, title: args.title ? `${args.title} ${hint}` : hint };
};

// the access keys of pages without a toolbox button, on links that are not seen but still take the key
const accessKeyLinks = () => {
  let links = document.getElementById('iitc-options-access-keys');
  if (!links) {
    links = el('div', { id: 'iitc-options-access-keys', className: 'iitc-options-access-keys', 'aria-hidden': 'true' });
    document.body.append(links);
  }
  return links;
};

// keeps the access key of a page working while the page has no toolbox button
const updateAccessKey = (pageId, hasButton) => {
  const accesskey = IITC.options._pages[pageId]?.accesskey;
  const link = document.getElementById(`options-access-key-${pageId}`);
  if (hasButton || !accesskey) {
    link?.remove();
    return;
  }
  if (link) {
    link.accessKey = accesskey;
    return;
  }
  accessKeyLinks().append(el('a', { id: `options-access-key-${pageId}`, accessKey: accesskey, tabIndex: -1, onclick: () => open(pageId) }));
};

// adds, updates or removes the toolbox button of a page, as its declaration and iitc.toolboxShortcuts say;
// the access key of the page moves to a hidden link when there is no button
const updateShortcut = (pageId) => {
  const args = IITC.toolbox ? shortcutOf(pageId) : undefined;
  updateAccessKey(pageId, Boolean(args));
  if (!IITC.toolbox) return;
  const id = shortcutId(pageId);
  const exists = Boolean(IITC.toolbox.buttons[id]);
  if (!args) {
    if (exists) IITC.toolbox.removeButton(id);
    drawnShortcuts.delete(id);
    return;
  }
  const drawn = JSON.stringify(args);
  if (exists && drawnShortcuts.get(id) === drawn) return;
  drawnShortcuts.set(id, drawn);
  // added anew, since updateButton keeps arguments that a shortcut function no longer returns
  if (exists) IITC.toolbox.removeButton(id);
  IITC.toolbox.addButton({ ...args, id, action: () => open(pageId) });
};

const setMapButton = (wanted) => {
  if (!wanted) {
    view.mapButton?.remove();
    view.mapButton = null;
    return;
  }
  if (view.mapButton || !window.map || !globalThis.L?.Control) return;
  const Button = L.Control.extend({
    options: { position: 'topright' },
    onAdd: () => {
      // the pages, shown beside the button under a mouse; filled on the way in, so it has the pages of plugins
      const menu = el('div', { className: 'iitc-control-menu' });
      const fillMenu = () => {
        // drawn anew, the item in focus would lose it
        if (menu.contains(document.activeElement)) return;
        menu.replaceChildren(
          ...pageIds().map((pageId) =>
            el(
              'a',
              {
                href: '#',
                role: 'button',
                title: accessKeyHint(pageId),
                onclick: (event) => {
                  event.preventDefault();
                  open(pageId);
                },
              },
              titleOf(pageId)
            )
          )
        );
      };
      const container = el(
        'div',
        { className: 'iitc-control-button' },
        el(
          'a',
          {
            href: '#',
            role: 'button',
            title: 'IITC and plugin options',
            'aria-label': 'Options',
            onclick: (event) => {
              event.preventDefault();
              open();
            },
          },
          el('iitc-icon', { fallback: '⚙' }, 'tune')
        ),
        menu
      );
      for (const type of ['pointerenter', 'focusin']) container.addEventListener(type, fillMenu);
      L.DomEvent.disableClickPropagation(container);
      return container;
    },
  });
  view.mapButton = new Button().addTo(window.map);
};

/**
 * Shows the way to the window that `entry` names. An app cannot remove a pane, so it stays until
 * IITC is reloaded and still opens the window
 *
 * @private
 */
const updateEntry = () => {
  const mode = entry();
  if (IITC.toolbox) {
    const hasLink = Boolean(IITC.toolbox.buttons[LINK_ID]);
    if (mode === 'toolbox' && !hasLink) {
      IITC.toolbox.addButton({ id: LINK_ID, label: 'Options', title: 'IITC and plugin options', action: () => open() });
    } else if (mode !== 'toolbox' && hasLink) {
      IITC.toolbox.removeButton(LINK_ID);
    }
  }
  setMapButton(mode === 'button');
  if (mode === 'pane' && !view.paneAdded) {
    window.app.addPane(PANE_ID, 'Options', 'tune');
    view.paneAdded = true;
  }
};

Object.assign(IITC.options, { open, refresh, _pageIds: pageIds, _setupWindow: updateEntry, _view: view });

// handlers return nothing: a false would stop the remaining hook handlers
window.addHook('optionChanged', (event) => {
  onOptionChanged(event);
  if (event.key === 'iitc.toolboxShortcuts') Object.keys(IITC.options._pages).forEach(updateShortcut);
  if (event.key === 'iitc.optionsPane') updateEntry();
});
window.addHook('paneChanged', (pane) => {
  if (pane === PANE_ID) {
    const request = paneRequest;
    paneRequest = undefined;
    // a dialog left open from before the pane was chosen gives way to it
    if (isOpen() && !view.pane) view.dialog?.dialog?.('close');
    display(request?.pageId);
  } else if (view.pane) {
    closePane();
  }
});
window.addHook('optionsPageRegistered', (event) => {
  onPageRegistered(event);
  updateShortcut(event.pageId);
});
