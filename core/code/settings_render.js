/* global IITC, log -- eslint */

/**
 * @file Draws a settings page from its blocks. The page is drawn again as a whole after every change made
 *       on it, so a block whose title, visibility or value depends on other settings follows them without
 *       any binding. Focus, the text cursor and text typed but not applied yet survive the redraw
 * @module settings_render
 */

// the lists of About and the changelogs nest no deeper
const LIST_DEPTH = 3;

// properties shown on the page; any of them may be a function of the repeated item
const DISPLAY_PROPERTIES = ['title', 'description', 'button', 'icon', 'text', 'url', 'level', 'items', 'visible', 'enabled', 'value', 'selected'];

// handler a block cannot work without, by type
const HANDLERS = { choice: 'action', action: 'action', export: 'data', import: 'onData' };

// declared blocks already warned about, so a redraw does not repeat the warning
const reported = new WeakSet();

// the declared block behind an evaluated copy
const DECLARED = Symbol('declared');

// ids that tie labels to their fields
let lastId = 0;

// the name of the group of radios a declared choice draws
const choiceGroups = new WeakMap();

/**
 * What a container remembers between drawings
 *
 * @private
 * @typedef {Object} ContainerState
 * @property {string} pageId - Page drawn last
 * @property {Map<string, Object>} messages - Texts left by actions of that page, by control id
 * @property {Set<string>} pending - Actions still running, as `<pageId>#<control id>`
 * @property {boolean} scheduled - A redraw is waiting
 * @property {boolean} pointerDown - A mouse button or a finger is down in the container
 * @property {Function} [afterPointer] - The redraw waiting for the pointer to come up
 */
const states = new WeakMap();

const stateOf = (container) => {
  let state = states.get(container);
  if (state) return state;
  state = { pageId: undefined, messages: new Map(), pending: new Set(), scheduled: false, pointerDown: false };
  states.set(container, state);
  // a redraw between the press and the release would take the pressed control away, and its click with it
  container.addEventListener('pointerdown', () => {
    state.pointerDown = true;
    const released = () => {
      state.pointerDown = false;
      const redraw = state.afterPointer;
      state.afterPointer = undefined;
      // after the click that follows the release
      if (redraw) setTimeout(redraw);
    };
    const doc = container.ownerDocument;
    doc.addEventListener('pointerup', released, { once: true, capture: true });
    doc.addEventListener('pointercancel', released, { once: true, capture: true });
  });
  return state;
};

const warnOnce = (block, message) => {
  const declared = block[DECLARED] ?? block;
  if (reported.has(declared)) return;
  reported.add(declared);
  log.warn(message);
};

const el = (tag, props = {}, ...children) => {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (name === 'className') element.className = value;
    else if (name === 'dataset') Object.assign(element.dataset, value);
    else if (name in element) element[name] = value;
    else element.setAttribute(name, value === true ? '' : value);
  }
  element.append(...children.filter((child) => child !== undefined && child !== null && child !== false));
  return element;
};

// a line telling how an action or a change went, with an icon of success or of failure
const note = (text, error, role = 'status') =>
  el(
    'div',
    { className: error ? 'iitc-settings-message iitc-settings-error' : 'iitc-settings-message', role },
    el('iitc-icon', { fallback: error ? '!' : '✓' }, error ? 'error' : 'check_circle'),
    el('span', { className: 'iitc-settings-message-text' }, text)
  );

const asText = (value) => (value === undefined || value === null ? '' : String(value));

// the block with its display properties worked out for this drawing
const evaluate = (block, item) => {
  const result = { ...block, [DECLARED]: block };
  for (const name of DISPLAY_PROPERTIES) {
    if (typeof block[name] === 'function') result[name] = block[name](item);
  }
  return result;
};

const handlerOf = (block) => {
  const name = HANDLERS[block.type];
  if (!name || typeof block[name] === 'function') return block[name];
  warnOnce(block, `settings: ${block.type} block "${block.title}" has no ${name} function`);
  return undefined;
};

/**
 * One drawing of a page into a container, or of a section an extension adds to the page
 *
 * @private
 */
class PageView {
  constructor(pageId, container, section = undefined) {
    this.pageId = pageId;
    this.container = container;
    this.page = IITC.settings._pages[pageId];
    this.state = stateOf(container);
    // a section has keys of its own, and control ids apart from the ones of the page's blocks
    this.namespace = section ? section.namespace : this.page.namespace;
    this.prefix = section ? `+${encodeURIComponent(section.id)}/` : '';
  }

  // whether the container still shows this page
  get current() {
    return this.container.isConnected && this.state.pageId === this.pageId;
  }

  redraw() {
    if (this.current) renderPage(this.pageId, this.container);
  }

  // runs after the current task, and after the click when the pointer is down, so the control pressed or
  // tabbed to stays in place
  later(run) {
    if (!this.state.pointerDown) {
      setTimeout(run);
      return;
    }
    const before = this.state.afterPointer;
    this.state.afterPointer = before
      ? () => {
          before();
          run();
        }
      : run;
  }

  // a redraw after the current task, and after the click; changes before it share one redraw
  scheduleRedraw() {
    if (this.state.scheduled) return;
    this.state.scheduled = true;
    this.later(() => {
      this.state.scheduled = false;
      this.redraw();
    });
  }

  // runs the handler of an action and waits for it, then leaves the text it returns or the error it throws
  // next to the control and redraws; the control stays disabled meanwhile
  async act(id, handler) {
    const pending = `${this.pageId}#${id}`;
    if (this.state.pending.has(pending)) return;
    this.state.pending.add(pending);
    this.state.messages.clear();
    this.redraw();
    let message;
    try {
      const text = await handler();
      if (typeof text === 'string' && text) message = { text };
    } catch (e) {
      log.warn(`settings: action on page "${this.pageId}" failed`, e);
      message = { text: e?.message ?? String(e), error: true };
    } finally {
      this.state.pending.delete(pending);
    }
    if (!this.current) return;
    if (message) this.state.messages.set(id, message);
    this.redraw();
  }

  isPending(id) {
    return this.state.pending.has(`${this.pageId}#${id}`);
  }

  // texts left by actions of the control `id`
  notes(id) {
    return [...this.state.messages].filter(([key]) => key === id || key.startsWith(`${id}:`)).map(([, message]) => note(message.text, message.error));
  }

  // full key and shown value of a field; inside a repeat the value is the item's entry of `map`
  field(block, item, map) {
    const key = `${this.namespace}.${block.key}`;
    if (block.value !== undefined) return { key, value: block.value };
    if (!item) return { key, value: IITC.settings.get(key) };
    return { key, value: map?.[item.id] ?? IITC.settings._entryDefault(key, item) };
  }

  // stores a value a field was changed to; a refused value stays in the field with the reason under its row
  change(block, item, value, input) {
    this.state.messages.clear();
    const key = `${this.namespace}.${block.key}`;
    const next = item ? { ...IITC.settings._entries(key), [item.id]: value } : value;
    const check = IITC.settings.check(key, next);
    if (check !== true || !IITC.settings.set(key, next)) {
      input.setAttribute('aria-invalid', 'true');
      const box = input.closest('.iitc-settings-row, td') ?? input.parentElement;
      box.querySelector('.iitc-settings-error')?.remove();
      box.append(note(check === true ? 'The value could not be stored' : check, true, 'alert'));
      return;
    }
    this.scheduleRedraw();
  }

  // a running action keeps its button focusable, marked as unavailable; act ignores it meanwhile
  // with an icon, the text is the tooltip, and shows in place of the icon while the icon font is missing
  button(id, text, enabled, handler, icon) {
    return el(
      'button',
      {
        type: 'button',
        className: icon && 'iitc-settings-icon-button',
        title: icon && text,
        'aria-label': icon && text,
        dataset: { focusId: id },
        disabled: !enabled || !handler,
        'aria-disabled': this.isPending(id) && 'true',
        onclick: () => this.act(id, handler),
      },
      icon ? el('iitc-icon', { fallback: text }, icon) : text
    );
  }

  control(block, item, id, map) {
    const enabled = block.enabled !== false;
    switch (block.type) {
      case 'boolean':
      case 'number':
      case 'string':
      case 'select':
      case 'color':
        return this.input(block, item, id, enabled, map);
      case 'action': {
        const action = handlerOf(block);
        // without a text of its own the button carries the title
        const text = asText(block.button ?? block.title);
        return this.button(id, text, enabled, action && (() => action(item)), block.icon);
      }
      case 'choice':
        return this.choice(block, item, id, enabled);
      case 'export': {
        const data = handlerOf(block);
        const title = asText(block.title);
        return el(
          'span',
          { className: 'iitc-settings-buttons' },
          this.button(`${id}:copy`, 'Copy', enabled, data && (() => IITC.utils.exportText(data(item), { title }))),
          block.filename && this.button(`${id}:save`, 'Save file', enabled, data && (() => IITC.utils.exportFile(data(item), block.filename, block.dataType)))
        );
      }
      case 'import': {
        const onFiles = typeof block.onFiles === 'function' ? block.onFiles : undefined;
        // a block that reads files with onFiles needs no onData, and has no Paste button without it
        const onData = onFiles && typeof block.onData !== 'function' ? undefined : handlerOf(block);
        const title = asText(block.title);
        // the text onData returns tells what was imported
        const report = (text) => (typeof text === 'string' && text ? text : 'Imported');
        const paste = async () => {
          const text = await IITC.utils.importText({ title });
          if (text === undefined) return undefined;
          return report(await onData(text, undefined, item));
        };
        const read = async (files) => report(onFiles ? await onFiles(files, item) : await onData(files[0].text, files[0].name, item));
        // the button waits only for reading the files: importFile never settles when no file is chosen.
        // Read later, once the press that opened the file dialog is done
        const open = () => {
          IITC.utils.importFile({ accept: block.accept, multiple: Boolean(onFiles) }).then((files) => {
            if (files.length) this.later(() => this.act(`${id}:open`, () => read(files)));
          });
        };
        return el(
          'span',
          { className: 'iitc-settings-buttons' },
          (onData || !onFiles) && this.button(`${id}:paste`, 'Paste', enabled, onData && paste),
          block.accept && this.button(`${id}:open`, 'Choose file', enabled, (onFiles || onData) && open)
        );
      }
      default:
        return undefined;
    }
  }

  input(block, item, id, enabled, map) {
    if (block.key === undefined) {
      warnOnce(block, `settings: ${block.type} block "${block.title}" on page "${this.pageId}" has no key`);
      return undefined;
    }
    const { key, value } = this.field(block, item, map);
    // fields in a repeat have no label of their own
    const name = item ? asText(block.title) : undefined;
    const common = { dataset: { focusId: id }, disabled: !enabled, title: name, 'aria-label': name };
    const commit = (input, next) => this.change(block, item, next, input);

    switch (block.type) {
      case 'boolean': {
        const input = el('input', { ...common, type: 'checkbox', checked: value === true });
        input.addEventListener('change', () => commit(input, input.checked));
        return input;
      }
      case 'number': {
        const input = el('input', { ...common, type: 'number', min: block.min, max: block.max, step: block.step ?? 'any' });
        input.defaultValue = String(value ?? '');
        input.addEventListener('change', () => commit(input, input.value.trim() === '' ? NaN : Number(input.value)));
        return input;
      }
      case 'string': {
        const input = el('input', { ...common, type: 'text' });
        input.defaultValue = String(value ?? '');
        input.addEventListener('change', () => commit(input, input.value));
        return input;
      }
      case 'select': {
        const list = IITC.settings._options(key);
        const known = list.some((option) => option.value === value);
        // the index stands for the value, so values of any type survive the round trip through the DOM;
        // a value that is not among the options shows as such, so choosing any option is a change
        const select = el(
          'select',
          common,
          !known && el('option', { value: '', disabled: true, selected: true }, String(value ?? '')),
          ...list.map((option, index) => el('option', { value: String(index), selected: option.value === value }, asText(option.label)))
        );
        select.addEventListener('change', () => commit(select, list[Number(select.value)]?.value));
        return select;
      }
      case 'color': {
        const rgb = typeof value === 'string' ? value.slice(0, 7) : '#000000';
        const input = el('input', { ...common, type: 'color', value: rgb });
        if (!block.alpha) {
          input.addEventListener('change', () => commit(input, input.value));
          return input;
        }
        // the alpha channel as a percentage next to the color, both forming one value
        const alpha = typeof value === 'string' && value.length === 9 ? Math.round((parseInt(value.slice(7), 16) / 255) * 100) : 100;
        const opacity = el('input', {
          dataset: { focusId: `${id}:alpha` },
          disabled: !enabled,
          type: 'range',
          min: 0,
          max: 100,
          value: alpha,
          title: 'Opacity',
          'aria-label': 'Opacity',
        });
        const combined = () => {
          const byte = Math.round((Number(opacity.value) / 100) * 255);
          return byte === 255 ? input.value : input.value + byte.toString(16).padStart(2, '0');
        };
        input.addEventListener('change', () => commit(input, combined()));
        opacity.addEventListener('change', () => commit(opacity, combined()));
        return el('span', { className: 'iitc-settings-color' }, input, opacity);
      }
    }
    return undefined;
  }

  // a radio before the title of the item, checked on the selected one; choosing another runs the action
  // after the click, as a change does, since the action redraws the page
  choice(block, item, id, enabled) {
    if (!item) {
      warnOnce(block, `settings: choice block "${block.title}" on page "${this.pageId}" works only inside a repeat`);
      return undefined;
    }
    const action = handlerOf(block);
    const declared = block[DECLARED];
    if (!choiceGroups.has(declared)) choiceGroups.set(declared, `iitc-settings-choice-${++lastId}`);
    // named by the label of its row
    const input = el('input', {
      type: 'radio',
      name: choiceGroups.get(declared),
      checked: block.selected === true,
      disabled: !enabled || !action,
      dataset: { focusId: id },
    });
    input.addEventListener('change', () => this.later(() => this.act(id, () => action(item))));
    return input;
  }

  list(items, depth) {
    return el(
      'ul',
      { className: 'iitc-settings-list' },
      ...(items ?? []).map((entry) => {
        // the tooltip belongs to the entry's own line, not to its nested entries
        const head = el(
          'div',
          { className: 'iitc-settings-list-head', title: entry.tooltip },
          el('span', { className: 'iitc-settings-list-title' }, String(entry.title ?? '')),
          entry.badge !== undefined && el('span', { className: 'iitc-settings-badge' }, String(entry.badge))
        );
        const sub = entry.sub !== undefined && el('div', { className: 'iitc-settings-sub' }, String(entry.sub));
        const nested = entry.items?.length && depth < LIST_DEPTH ? this.list(entry.items, depth + 1) : undefined;
        const className = entry.state ? `iitc-settings-item-${entry.state}` : undefined;
        if (nested && entry.collapsed) {
          const summary = el('summary', {}, el('iitc-icon', { fallback: '▸' }, 'chevron_right'), head);
          return el('li', { className }, el('details', {}, summary, sub, nested));
        }
        return el('li', { className }, head, sub, nested);
      })
    );
  }

  // the block as a row of the page; undefined for a block that is not shown or fails to draw
  row(declared, index) {
    const id = this.prefix + index;
    try {
      return this.buildRow(declared, id);
    } catch (e) {
      log.warn(`settings: block ${id} of page "${this.pageId}" failed to draw`, e);
      return undefined;
    }
  }

  buildRow(declared, id) {
    const block = evaluate(declared);
    if (block.visible === false) return undefined;

    const title = asText(block.title);
    const description = block.description !== undefined && el('div', { className: 'iitc-settings-description' }, asText(block.description));

    switch (block.type) {
      case 'heading':
        return el('h3', { className: 'iitc-settings-heading' }, title);
      case 'text':
        return el('p', { className: 'iitc-settings-text' }, asText(block.text));
      case 'link':
        return el('a', { className: 'iitc-settings-link', href: block.url, target: '_blank', rel: 'noopener', dataset: { focusId: id } }, title);
      case 'notice':
        return el('div', { className: `iitc-settings-notice iitc-settings-notice-${block.level ?? 'info'}` }, asText(block.text));
      case 'list':
        return this.list(block.items, 1);
      case 'repeat':
        return this.repeat(declared, id);
    }

    const control = this.control(block, undefined, id);
    if (!control) return undefined;
    if (block.type === 'action' && block.button === undefined) {
      // the button carries the title, so only the description is left on the label side
      return el(
        'div',
        { className: 'iitc-settings-row iitc-settings-action' },
        description && el('div', { className: 'iitc-settings-label' }, description),
        el('div', { className: 'iitc-settings-control' }, control),
        ...this.notes(id)
      );
    }
    // a field gets its title as a label, so clicking the title reaches the field
    const field = control.matches('input, select') ? control : control.querySelector('input, select');
    if (field) field.id = `iitc-settings-field-${++lastId}`;
    const label = el(
      field ? 'label' : 'div',
      { className: 'iitc-settings-label', htmlFor: field?.id },
      el('span', { className: 'iitc-settings-title' }, title),
      description
    );
    return el(
      'div',
      { className: `iitc-settings-row iitc-settings-${block.type}`, dataset: block.key ? { key: `${this.namespace}.${block.key}` } : {} },
      label,
      el('div', { className: 'iitc-settings-control' }, control),
      // under the label and the control, so they stay on one line
      ...this.notes(id)
    );
  }

  cell(inner, item, id, maps) {
    // buttons keep to the end of the row, the title taking the room left
    const props = { className: HANDLERS[inner.type] ? 'iitc-settings-cell-buttons' : undefined };
    try {
      const block = evaluate(inner, item);
      if (block.visible === false) return el('td', props);
      return el('td', props, this.control(block, item, id, maps.get(inner)), ...this.notes(id));
    } catch (e) {
      log.warn(`settings: block ${id} of page "${this.pageId}" failed to draw`, e);
      return el('td', props);
    }
  }

  // the radio of the choice of a repeat for one item; nothing while the choice is hidden or fails
  radio(inner, item, id) {
    try {
      const block = evaluate(inner, item);
      if (block.visible === false) return undefined;
      return this.choice(block, item, id, block.enabled !== false);
    } catch (e) {
      log.warn(`settings: block ${id} of page "${this.pageId}" failed to draw`, e);
      return undefined;
    }
  }

  repeat(block, id) {
    const items = block.over?.() ?? [];
    // headers without rows tell nothing
    if (!items.length) return undefined;
    const blocks = block.blocks ?? [];
    // each map is read once for all items
    const maps = new Map(blocks.filter((inner) => inner.key !== undefined).map((inner) => [inner, IITC.settings.get(`${this.namespace}.${inner.key}`)]));
    const choices = blocks.filter((inner) => inner.type === 'choice');
    for (const extra of choices.slice(1)) warnOnce(extra, `settings: a repeat on page "${this.pageId}" takes one choice; "${extra.title}" is left out`);
    const choiceId = (item) => `${id}/${item.id}/${blocks.indexOf(choices[0])}`;
    const columns = blocks.map((inner, innerIndex) => [inner, innerIndex]).filter(([inner]) => inner.type !== 'choice');
    const rows = items.map((item) => {
      const cells = columns.map(([inner, innerIndex]) => this.cell(inner, item, `${id}/${item.id}/${innerIndex}`, maps));
      const title = String(item.title ?? item.id);
      // the radio of the choice stands before the title of its row, which is its label; the messages of its
      // action follow the title
      const radio = choices.length ? this.radio(choices[0], item, choiceId(item)) : undefined;
      const head = radio ? el('label', { className: 'iitc-settings-choice' }, radio, title) : title;
      return el('tr', {}, el('th', { scope: 'row' }, head, ...(choices.length ? this.notes(choiceId(item)) : [])), ...cells);
    });
    // a button carries its own text, so its column needs no header; a table of buttons has no header row
    const headers = columns.map(([inner]) => (HANDLERS[inner.type] || typeof inner.title === 'function' ? '' : asText(inner.title)));
    const head = headers.some(Boolean) && el('thead', {}, el('tr', {}, el('th'), ...headers.map((header) => el('th', { scope: 'col' }, header))));
    return el('table', { className: 'iitc-settings-repeat' }, head, el('tbody', {}, ...rows));
  }

  draw() {
    const rows = this.page.blocks.map((block, index) => this.row(block, index));
    // sections of extensions follow the page's own blocks, each under its title
    for (const section of IITC.settings._sections(this.pageId)) {
      const view = new PageView(this.pageId, this.container, section);
      rows.push(
        el('h3', { className: 'iitc-settings-heading', dataset: { extension: section.id } }, section.title),
        ...section.blocks.map((block, index) => view.row(block, index))
      );
    }
    return el('div', { className: 'iitc-settings-page', dataset: { page: this.pageId } }, ...rows);
  }
}

// the focused control of the container, to give the focus back after a redraw
const saveFocus = (container) => {
  const active = container.ownerDocument.activeElement;
  if (!active || !container.contains(active) || !active.dataset?.focusId) return undefined;
  const state = { id: active.dataset.focusId };
  if (active.tagName === 'INPUT' && (active.type === 'text' || active.type === 'number')) {
    // text typed but not applied yet
    if (active.value !== active.defaultValue) state.value = active.value;
    try {
      state.selection = [active.selectionStart, active.selectionEnd];
    } catch {
      // number inputs have no selection
    }
  }
  return state;
};

const restoreFocus = (container, state) => {
  if (!state) return;
  const target = [...container.querySelectorAll('[data-focus-id]')].find((element) => element.dataset.focusId === state.id);
  if (!target) return;
  if (state.value !== undefined) target.value = state.value;
  target.focus();
  if (state.selection?.[0] !== null && state.selection?.[0] !== undefined) {
    try {
      target.setSelectionRange(...state.selection);
    } catch {
      // the control no longer takes a selection
    }
  }
};

/**
 * Draws a settings page into a container, replacing what the container holds. Changes made on the page
 * draw it again; a change made elsewhere needs another call
 *
 * @private
 * @param {string} pageId - Id of a registered page
 * @param {HTMLElement} container - Element to draw into
 * @returns {boolean} False when no such page is registered
 */
const renderPage = (pageId, container) => {
  if (!IITC.settings._pages[pageId]) {
    log.warn(`settings: no page "${pageId}" to draw`);
    return false;
  }
  const state = stateOf(container);
  // the focus and the messages belong to the page drawn before
  const samePage = state.pageId === pageId;
  if (!samePage) state.messages.clear();
  state.pageId = pageId;
  const focus = samePage ? saveFocus(container) : undefined;
  container.replaceChildren(new PageView(pageId, container).draw());
  restoreFocus(container, focus);
  return true;
};

// for the settings window: draws the page a container shows again after the current task, and after
// the click when the pointer is down, as after a change made on the page
const redrawLater = (container) => {
  const pageId = states.get(container)?.pageId;
  if (pageId) new PageView(pageId, container).scheduleRedraw();
};

IITC.settings._renderPage = renderPage;
IITC.settings._redrawLater = redrawLater;
// shared with the settings window
IITC.settings._el = el;
