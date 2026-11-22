/* global IITC */

/**
 * Popovers with the details of interface elements, in place of the tooltips of the browser
 *
 * The content comes from, in this order:
 *
 * - options given with {@link IITC.popover.bind};
 * - the `data-popover` attribute: plain text laid out by {@link IITC.utils.textToTable}, where newlines are line breaks
 *   and tabs make a table;
 * - the `title` attribute: tabs make a table, and any other title is HTML, as plugins wrote it for jQuery UI tooltip
 *
 * While an element is armed, its title and those of the elements around it are taken away, so the browser shows none
 * of its own
 *
 * @memberof IITC
 * @namespace popover
 *
 * @example <caption>Plain text in the markup</caption>
 * <span data-popover="Deployed by the owner of the portal">8</span>
 *
 * @example <caption>A table: tabs split the cells, newlines the rows</caption>
 * cell.dataset.popover = 'Range:\t2.5 km\nLinks:\t3';
 * // the same in the markup
 * <td data-popover="Range:&#9;2.5 km&#10;Links:&#9;3">…</td>
 *
 * @example <caption>HTML made when the popover opens</caption>
 * IITC.popover.bind(button, { html: () => `<b>${count}</b> portals`, className: 'my-plugin-popover' });
 */

const POPOVER_ID = 'iitc-popover';
const DELAY = 300;
// no delay for the next element right after a popover closed
const CHAIN = 200;
const GAP = 6;
const MARGIN = 4;

/**
 * Options of a popover bound to an element; a function is called each time the popover opens, with the element
 *
 * @memberof IITC.popover
 * @typedef {Object} Options
 * @property {string|function(Element): string} [text] - Plain text, laid out like `data-popover`
 * @property {string|function(Element): string} [html] - HTML, inserted as it is; takes the place of `text`
 * @property {string} [className] - Extra class of the popover while it shows this element
 * @property {boolean} [disabled] - No popover for the element and for the elements inside it
 */

// element -> options given to IITC.popover.bind
const bindings = new WeakMap();

let installed = false;
let popoverElement = null;
let closedAt = -Infinity;

// The armed element: `kind` is what keeps it ('hover', 'touch' or 'focus'), `text` and `ancestors` are the titles
// taken away, `html` is content handed later by a jQuery tooltip content function
let state = null;

const isDisabled = (element) => {
  for (let node = element; node; node = node.parentElement) {
    if (bindings.get(node)?.disabled) return true;
  }
  return false;
};

// Finds the element a popover belongs to, going up from the element under the pointer; the nearest element with
// a title decides, as in the browser, and an empty title means no popover
const findTrigger = (target) => {
  for (let node = target; node; node = node.parentElement) {
    if (state && node === state.trigger) return node;
    const options = bindings.get(node);
    if (!options?.html && !options?.text && !options?.disabled && !node.hasAttribute('data-popover')) {
      const title = state?.ancestors.get(node) ?? node.getAttribute('title');
      if (title === null) continue;
      if (title === '') return null;
    }
    return isDisabled(node) ? null : node;
  }
  return null;
};

const read = (value, trigger) => (typeof value === 'function' ? value.call(trigger, trigger) : value);

// Tabs make a table, any other title is HTML, which plugins rely on
const titleToHtml = (text) => (text.includes('\t') ? IITC.utils.textToTable(text) : text.replace(/\n/g, '<br>'));

const restoreTitle = (element, text) => {
  if (text !== null && !element.hasAttribute('title')) element.setAttribute('title', text);
};

// Adds the popover to the elements that describe the trigger, or takes it away, keeping the others
const setDescribedBy = (trigger, on) => {
  const ids = (trigger.getAttribute('aria-describedby') ?? '').split(' ').filter((id) => id && id !== POPOVER_ID);
  if (on) ids.push(POPOVER_ID);
  if (ids.length) trigger.setAttribute('aria-describedby', ids.join(' '));
  else trigger.removeAttribute('aria-describedby');
};

// Takes up a title written while the element is armed, as a plugin does after a request
const takeTitle = (armed) => {
  const { trigger } = armed;
  if (!trigger.hasAttribute('title')) return;
  armed.text = trigger.getAttribute('title');
  trigger.removeAttribute('title');
  if (armed.shown) render(armed);
};

// Starts the state for an element and takes its title away; returns null when there is nothing to show
const create = (trigger) => {
  const options = bindings.get(trigger);
  const text = trigger.getAttribute('title');
  // an element bound without content, or one whose title is blank
  if (!text && !options?.html && !options?.text && !trigger.getAttribute('data-popover')) return null;

  trigger.removeAttribute('title');
  const next = { trigger, kind: 'hover', shown: false, timer: null, text, html: null, observer: null, ancestors: new Map() };
  next.observer = new MutationObserver(() => state === next && takeTitle(next));
  next.observer.observe(trigger, { attributes: true, attributeFilter: ['title'] });

  // the browser shows the title of an element around in place of the one it does not find
  for (let node = trigger.parentElement; node; node = node.parentElement) {
    if (!node.hasAttribute('title')) continue;
    next.ancestors.set(node, node.getAttribute('title'));
    node.removeAttribute('title');
  }

  state = next;
  return next;
};

// Made again when something removed it from the page, as plugins clearing `.ui-tooltip` do
const getElement = () => {
  if (popoverElement?.isConnected) return popoverElement;

  popoverElement = document.createElement('div');
  popoverElement.id = POPOVER_ID;
  popoverElement.setAttribute('role', 'tooltip');
  popoverElement.hidden = true;
  // the top layer keeps it above dialogs; `manual`, as closing is done here
  if (popoverElement.showPopover) popoverElement.setAttribute('popover', 'manual');
  document.body.append(popoverElement);
  return popoverElement;
};

// Under the element, or above it when there is no room, and inside the window
const place = (trigger) => {
  const element = popoverElement;
  // measured at 0,0 to get its natural width
  element.style.left = '0px';
  element.style.top = '0px';
  const { width, height } = element.getBoundingClientRect();
  const { clientWidth, clientHeight } = document.documentElement;
  const rect = trigger.getBoundingClientRect();

  let top = rect.bottom + GAP;
  if (top + height + MARGIN > clientHeight) top = rect.top - GAP - height;
  const left = Math.max(MARGIN, Math.min(rect.left + rect.width / 2 - width / 2, clientWidth - width - MARGIN));
  element.style.left = `${left}px`;
  element.style.top = `${Math.max(MARGIN, top)}px`;
};

const render = (armed) => {
  const { trigger } = armed;
  const options = bindings.get(trigger);

  let html = armed.html ?? read(options?.html, trigger);
  if (!html) {
    const text = read(options?.text, trigger) ?? trigger.getAttribute('data-popover');
    if (text) html = IITC.utils.textToTable(text, []);
  }
  if (!html && armed.text) html = titleToHtml(armed.text);
  if (!html) {
    hide();
    return;
  }

  const element = getElement();
  element.className = ['iitc-popover', 'ui-tooltip', options?.className].filter(Boolean).join(' ');
  element.innerHTML = html;
  setDescribedBy(trigger, true);

  if (element.hidden) {
    element.hidden = false;
    element.showPopover?.();
  }
  armed.shown = true;
  place(trigger);
};

// Closes the popover; the element stays armed, so the browser shows no title of its own while the pointer is there
const hide = () => {
  if (!state) return;
  clearTimeout(state.timer);
  state.timer = null;
  if (!state.shown) return;

  state.shown = false;
  setDescribedBy(state.trigger, false);
  closedAt = Date.now();
  // a removed popover is closed already
  if (popoverElement.isConnected) popoverElement.hidePopover?.();
  popoverElement.hidden = true;
};

// Closes the popover and gives the titles back
const dispose = () => {
  if (!state) return;
  const armed = state;
  hide();
  armed.observer?.disconnect();
  state = null;
  restoreTitle(armed.trigger, armed.text);
  armed.ancestors.forEach((text, element) => restoreTitle(element, text));
};

const schedule = (armed, delay) => {
  clearTimeout(armed.timer);
  armed.timer = setTimeout(() => {
    armed.timer = null;
    if (state !== armed) return;
    if (armed.trigger.isConnected) render(armed);
    else dispose();
  }, delay);
};

const hoverDelay = () => (Date.now() - closedAt < CHAIN ? 0 : DELAY);

// Opens the popover of an element after the delay, as the pointer resting on it does
const showSoon = (element) => {
  if (state?.trigger === element) {
    takeTitle(state);
  } else {
    dispose();
    if (!create(element)) return;
  }
  if (!state.shown && !state.timer) schedule(state, hoverDelay());
};

// Shows content that a jQuery tooltip content function hands to its callback
const answer = (element, html) => {
  const armed = state;
  if (armed?.trigger !== element) return;
  armed.html = html;
  // after the render that called the function, which may be under way
  queueMicrotask(() => state === armed && render(armed));
};

const onPointerOver = (event) => {
  const trigger = findTrigger(event.target);
  if (state && state.trigger === trigger) return;
  // a finger lifts right after the tap, and focus has its own end: neither is a pointer that left the element
  if (!trigger && (state?.kind === 'touch' || state?.kind === 'focus')) return;

  dispose();
  if (!trigger) return;

  const armed = create(trigger);
  if (!armed) return;
  if (event.pointerType === 'touch') armed.kind = 'touch';
  schedule(armed, hoverDelay());
};

const onPointerOut = (event) => {
  if (state?.kind !== 'hover' || state.trigger.contains(event.relatedTarget)) return;
  dispose();
};

const onPointerDown = (event) => {
  if (!state || popoverElement?.contains(event.target)) return;

  if (state.trigger.contains(event.target)) {
    // the press of a mouse quiets the popover; the tap of a finger that opens it comes with this press
    if (state.kind !== 'touch') hide();
    return;
  }
  dispose();
};

const onKeyDown = (event) => {
  if (event.key === 'Escape') hide();
};

const onFocusIn = (event) => {
  try {
    if (!event.target.matches(':focus-visible')) return;
  } catch {
    // Chrome 85 has no :focus-visible
  }

  const trigger = findTrigger(event.target);
  if (!trigger || state?.trigger === trigger) return;
  dispose();
  const armed = create(trigger);
  if (!armed) return;
  armed.kind = 'focus';
  schedule(armed, DELAY);
};

const onFocusOut = (event) => {
  if (state?.kind === 'focus' && !state.trigger.contains(event.relatedTarget)) dispose();
};

// Only a scroll of what holds the element closes it, not a chat that scrolls
const onScroll = (event) => {
  if (state && event.target.contains?.(state.trigger)) hide();
};

/**
 * Starts opening popovers for the whole page; calling it again changes nothing
 *
 * @memberof IITC.popover
 */
const setup = () => {
  if (installed) return;
  installed = true;

  // ahead of the handlers that stop the events
  const options = { capture: true };
  document.addEventListener('pointerover', onPointerOver, options);
  document.addEventListener('pointerout', onPointerOut, options);
  document.addEventListener('pointerdown', onPointerDown, options);
  document.addEventListener('keydown', onKeyDown, options);
  document.addEventListener('focusin', onFocusIn, options);
  document.addEventListener('focusout', onFocusOut, options);
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
  document.defaultView.addEventListener('resize', hide);
};

/**
 * Gives an element a popover whose content comes from the options, in place of the `data-popover` attribute
 * or the title
 *
 * @memberof IITC.popover
 * @param {Element} element - Element the popover belongs to
 * @param {IITC.popover.Options} options - Content and the rest; merged into what was bound before
 */
const bind = (element, options) => {
  bindings.set(element, { ...bindings.get(element), ...options });
};

/**
 * Forgets what {@link IITC.popover.bind} set for the element
 *
 * @memberof IITC.popover
 * @param {Element} element - Element given to `bind`
 */
const unbind = (element) => {
  close(element);
  bindings.delete(element);
};

/**
 * Closes the popover that is open
 *
 * @memberof IITC.popover
 * @param {Element} [element] - Close only if the popover belongs to this element
 */
const close = (element) => {
  if (!state || (element && state.trigger !== element)) return;
  hide();
};

IITC.popover = { setup, bind, unbind, close };

IITC.registerLegacyAliases(IITC.popover, { setupTooltips: 'setup' });

/**
 * Keeps the `$.fn.tooltip` calls of plugins working. Options other than `content`, `tooltipClass` and `disabled`
 * are ignored. A `content` function gets the element as `this`, and returns the HTML or hands it to its callback.
 *
 * @alias IITC.popover~tooltip
 * @private
 * @deprecated use {@link IITC.popover}
 * @param {Object|string} [arg] - Options, or the name of a method
 * @returns {jQuery} The same jQuery collection
 */
$.fn.tooltip = function (arg) {
  return this.each((index, element) => {
    if (typeof arg === 'string') {
      // after the delay, as plugins call it from their own mouseenter
      if (arg === 'open') showSoon(element);
      else if (arg === 'close') close(element);
      else if (arg === 'destroy') unbind(element);
      else if (arg === 'enable') bind(element, { disabled: false });
      else if (arg === 'disable') bind(element, { disabled: true });
      return;
    }
    const { content, tooltipClass, disabled } = arg ?? {};
    const options = {};
    if (typeof content === 'function') options.html = (target) => content.call(target, (html) => answer(target, html));
    else if (content !== undefined) options.html = content;
    if (tooltipClass !== undefined) options.className = tooltipClass;
    if (disabled !== undefined) options.disabled = disabled;
    bind(element, options);
  });
};
