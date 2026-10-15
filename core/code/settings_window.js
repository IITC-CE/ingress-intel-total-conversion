/* global IITC, log -- eslint */

/**
 * @file The settings window: the list of settings pages next to the page chosen, and a search over
 *       the titles and texts of all pages. A narrow window shows the list or the page, with a way back.
 *       The window is a dialog over the map, on a smartphone too, so a change shows on the map at once.
 *       The page shown follows changes of its own settings made elsewhere, such as values arriving
 *       through sync
 * @module settings_window
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

const el = (...args) => IITC.settings._el(...args);

/**
 * Ids of the registered pages in the order the window lists them
 *
 * @private
 * @returns {string[]}
 */
const pageIds = () => {
  const pages = IITC.settings._pages;
  const rank = (id) => (FIRST_PAGES.includes(id) ? FIRST_PAGES.indexOf(id) : FIRST_PAGES.length);
  return Object.keys(pages).sort((a, b) => rank(a) - rank(b) || String(pages[a].title ?? a).localeCompare(String(pages[b].title ?? b)));
};

const titleOf = (pageId) => String(IITC.settings._pages[pageId]?.title ?? pageId);

// texts of the blocks, the ones inside a repeat too
const blockTexts = (blocks) =>
  (blocks ?? []).flatMap((block) => {
    const own = SEARCHED.filter((name) => typeof block?.[name] === 'string').map((name) => block[name]);
    return block?.type === 'repeat' ? [...own, ...blockTexts(block.blocks)] : own;
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
  const sections = IITC.settings._sections(pageId).flatMap((section) => [section.title, ...blockTexts(section.blocks)]);
  const found = [...blockTexts(IITC.settings._pages[pageId].blocks), ...sections].filter((text) => text.toLowerCase().includes(needle));
  if (found.length) return found;
  return titleOf(pageId).toLowerCase().includes(needle) ? [] : null;
};

const shorten = (text) => (text.length > FOUND_LENGTH ? `${text.slice(0, FOUND_LENGTH - 1)}…` : text);

const isOpen = () => view.root !== null && view.root.isConnected;

const part = (className) => view.root.querySelector(`.${className}`);

const content = () => part('iitc-settings-content');

const navLink = (pageId) => [...view.root.querySelectorAll('.iitc-settings-page-link')].find((link) => link.dataset.page === pageId);

const isHidden = (element) => element.ownerDocument.defaultView.getComputedStyle(element).display === 'none';

// the tooltip of a page in the list, telling its access key
const accessKeyHint = (pageId) => {
  const accesskey = IITC.settings._pages[pageId]?.accesskey;
  return accesskey ? `Access key [${accesskey}]` : undefined;
};

// draws the list again; the focus stays on the page it was on
const drawNav = () => {
  const list = part('iitc-settings-pages');
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
            className: 'iitc-settings-page-link',
            dataset: { page: pageId },
            title: accessKeyHint(pageId),
            'aria-current': pageId === view.pageId && 'page',
            onclick: () => choose(pageId),
          },
          el('span', { className: 'iitc-settings-page-title' }, titleOf(pageId)),
          // what the search found on the page
          found.length > 0 && el('span', { className: 'iitc-settings-found' }, found.slice(0, 3).map(shorten).join(' · '))
        )
      )
    );
  list.replaceChildren(...entries);
  if (!entries.length) list.append(el('li', { className: 'iitc-settings-nothing' }, 'Nothing found'));
  if (focused !== undefined) navLink(focused)?.focus();
};

const drawPage = () => {
  part('iitc-settings-page-heading').textContent = view.pageId ? titleOf(view.pageId) : '';
  if (view.pageId) IITC.settings._renderPage(view.pageId, content());
  else content().replaceChildren();
};

// shows a page; in a narrow window it takes the place of the list, and the focus moves to the way back
const choose = (pageId) => {
  const another = pageId !== view.pageId;
  view.pageId = pageId;
  view.root.dataset.view = 'page';
  drawNav();
  drawPage();
  // another page starts at its top
  if (another) content().scrollTop = 0;
  const nav = part('iitc-settings-nav');
  if (nav.contains(document.activeElement) && isHidden(nav)) part('iitc-settings-back').focus();
};

// the window, showing the page in a narrow window too when `showPage` is set
const build = (showPage) => {
  const searchInput = el('input', {
    type: 'search',
    className: 'iitc-settings-search',
    placeholder: 'Search',
    value: view.query,
    'aria-label': 'Search settings',
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
      className: 'iitc-settings-back',
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
    { className: 'iitc-settings', dataset: { view: showPage ? 'page' : 'list' } },
    el('nav', { className: 'iitc-settings-nav' }, searchInput, el('ul', { className: 'iitc-settings-pages' })),
    el(
      'section',
      { className: 'iitc-settings-detail' },
      el('div', { className: 'iitc-settings-detail-head' }, back, el('h2', { className: 'iitc-settings-page-heading' })),
      el('div', { className: 'iitc-settings-content' })
    )
  );
  drawNav();
  drawPage();
  return view.root;
};

// a page to show: the one chosen last while it is still registered, or the first
const currentPage = () => (IITC.settings._pages[view.pageId] ? view.pageId : pageIds()[0]);

const openDialog = (showPage) => {
  view.dialog = window.dialog({
    id: 'iitc-settings',
    title: 'Settings',
    html: build(showPage),
    width: 700,
    height: Math.min(HEIGHT, window.innerHeight - 16),
    closeCallback: () => {
      view.root = null;
      view.dialog = null;
    },
  });
  // the dialog focuses the search as its first field; on a smartphone that would open the keyboard over the window
  const search = part('iitc-settings-search');
  if (IITC.utils.isSmartphone() && document.activeElement === search) search.blur();
};

/**
 * Opens the settings window, on a given page or on the page chosen last
 *
 * A toolbox button to a settings page comes from the page's `shortcut`, which the user can turn off
 * with the other shortcuts; `IITC.toolbox.addButton` is for a plugin's own dialogs that are not part
 * of the settings, such as lists and other views of map data
 *
 * @memberof IITC.settings
 * @param {string} [pageId] - Page to show
 * @returns {boolean} False when no such page is registered
 *
 * @example
 * // a toolbox button that opens the page
 * IITC.settings.register('my-plugin', { title: 'My plugin', shortcut: true, blocks });
 * // the page opened from the plugin's own code, such as a link in its dialog
 * IITC.settings.open('my-plugin');
 */
const open = (pageId) => {
  if (pageId !== undefined && !IITC.settings._pages[pageId]) {
    log.warn(`settings: no page "${pageId}" to open`);
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
 * Draws the page shown in the settings window again, after the current task and after the click when
 * the pointer is down, and updates the toolbox shortcut of the page. Changes of the page's own settings and
 * of the sections extensions add to it redraw it already; a page that also shows other state calls this when
 * that state changes
 *
 * @memberof IITC.settings
 * @param {string} [pageId] - Redraws only if this page is shown; all shortcuts are updated without it
 */
const refresh = (pageId) => {
  (pageId === undefined ? Object.keys(IITC.settings._pages) : [pageId]).forEach(updateShortcut);
  if (!isOpen() || (pageId !== undefined && pageId !== view.pageId)) return;
  IITC.settings._redrawLater(content());
};

// a change made on the page redraws it already; this follows changes made elsewhere, such as by sync, of the
// settings the page and the sections extensions add to it declare. Settings of other pages are left to
// refresh, so an open select is not closed by unrelated changes
const onSettingChanged = ({ key }) => {
  if (isOpen() && IITC.settings._pages[view.pageId] && IITC.settings._definitions[key]?.pageId === view.pageId) IITC.settings._redrawLater(content());
};

const onPageRegistered = ({ pageId }) => {
  if (!isOpen()) return;
  drawNav();
  if (pageId !== view.pageId) return;
  part('iitc-settings-page-heading').textContent = titleOf(pageId);
  IITC.settings._redrawLater(content());
};

const shortcutId = (pageId) => `settings-shortcut-${pageId}`;

// the shortcut arguments each button was drawn with, so a refresh that changes nothing leaves the toolbox alone
const drawnShortcuts = new Map();

// the arguments of a page's toolbox button, or undefined when the page has none
const shortcutOf = (pageId) => {
  const page = IITC.settings._pages[pageId];
  if (!page?.shortcut || IITC.settings.get('iitc.toolboxShortcuts') === false) return undefined;
  let options = page.shortcut;
  try {
    if (typeof options === 'function') options = options();
  } catch (e) {
    log.warn(`settings: shortcut of page "${pageId}" failed`, e);
    return undefined;
  }
  options = { label: titleOf(pageId), ...(typeof options === 'object' ? options : {}) };
  if (!page.accesskey) return options;
  const hint = `[${page.accesskey}]`;
  return { ...options, accesskey: page.accesskey, title: options.title ? `${options.title} ${hint}` : hint };
};

// the access keys of pages without a toolbox button, on links that are not seen but still take the key
const accessKeyLinks = () => {
  let links = document.getElementById('iitc-settings-access-keys');
  if (!links) {
    links = el('div', { id: 'iitc-settings-access-keys', className: 'iitc-settings-access-keys', 'aria-hidden': 'true' });
    document.body.append(links);
  }
  return links;
};

// keeps the access key of a page working while the page has no toolbox button
const updateAccessKey = (pageId, hasButton) => {
  const accesskey = IITC.settings._pages[pageId]?.accesskey;
  const link = document.getElementById(`settings-access-key-${pageId}`);
  if (hasButton || !accesskey) {
    link?.remove();
    return;
  }
  if (link) {
    link.accessKey = accesskey;
    return;
  }
  accessKeyLinks().append(el('a', { id: `settings-access-key-${pageId}`, accessKey: accesskey, tabIndex: -1, onclick: () => open(pageId) }));
};

// adds, updates or removes the toolbox button of a page, as its declaration and iitc.toolboxShortcuts say;
// the access key of the page moves to a hidden link when there is no button
const updateShortcut = (pageId) => {
  const options = IITC.toolbox ? shortcutOf(pageId) : undefined;
  updateAccessKey(pageId, Boolean(options));
  if (!IITC.toolbox) return;
  const id = shortcutId(pageId);
  const exists = Boolean(IITC.toolbox.buttons[id]);
  if (!options) {
    if (exists) IITC.toolbox.removeButton(id);
    drawnShortcuts.delete(id);
    return;
  }
  const drawn = JSON.stringify(options);
  if (exists && drawnShortcuts.get(id) === drawn) return;
  drawnShortcuts.set(id, drawn);
  // added anew, since updateButton keeps arguments that a shortcut function no longer returns
  if (exists) IITC.toolbox.removeButton(id);
  IITC.toolbox.addButton({ ...options, id, action: () => open(pageId) });
};

/**
 * Adds the way to the settings window: a toolbox button
 *
 * @private
 */
const setupWindow = () => {
  IITC.toolbox.addButton({
    id: 'settings-toolbox-link',
    label: 'Settings',
    title: 'IITC and plugin settings',
    action: () => open(),
  });
};

Object.assign(IITC.settings, { open, refresh, _pageIds: pageIds, _setupWindow: setupWindow, _view: view });

// handlers return nothing: a false would stop the remaining hook handlers
window.addHook('settingChanged', (event) => {
  onSettingChanged(event);
  if (event.key === 'iitc.toolboxShortcuts') Object.keys(IITC.settings._pages).forEach(updateShortcut);
});
window.addHook('settingsPageRegistered', (event) => {
  onPageRegistered(event);
  updateShortcut(event.pageId);
});
