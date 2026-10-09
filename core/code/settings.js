/* global IITC, log -- eslint */

/**
 * Settings API
 *
 * Plugins declare their settings as blocks with a `key`; the core stores them, applies defaults
 * and validates every value. Keys that were never declared still work through `get`/`set`,
 * without validation
 *
 * Every value is kept under `iitc-setting:<key>`. Until its page is registered, a key is read and written
 * as undeclared, without validation
 *
 * @memberof IITC
 * @namespace settings
 */

/**
 * @memberof IITC.settings
 * @typedef {Object} SettingBlock
 * @property {string} type - Block type; `boolean`, `number`, `string`, `select` and `color` hold a setting, and `repeat`
 *                          repeats its `blocks` for every item of `over`
 * @property {string} [title] - Label of the block
 * @property {string} [key] - Turns the block into a setting, addressed as `<namespace>.<key>`
 * @property {*} [default] - Value used while nothing valid is stored
 * @property {number} [min] - Lowest allowed `number`
 * @property {number} [max] - Highest allowed `number`
 * @property {number} [step] - Allowed `number` increment, counted from `min` or 0
 * @property {Array|Function} [options] - `select` choices: values or `{value, label}` objects
 * @property {boolean} [alpha] - Allows `color` values with an alpha channel (`#rrggbbaa`)
 * @property {Function} [validate] - Returns true, or an error message for a value that is not allowed
 * @property {Function} [onChange] - Called with `(value, oldValue)` after the value has changed
 * @property {Function} [over] - Items of a `repeat` block, returned as `[{id, title}]` with ids that stay the same between calls
 * @property {Array<IITC.settings.SettingBlock>} [blocks] - Blocks of a `repeat` block; their settings hold a map of item id to value
 */

/**
 * @memberof IITC.settings
 * @typedef {Object} SettingsPage
 * @property {string} title - Page title
 * @property {string} [namespace] - Prefix of the page's setting keys. Defaults to the page id
 * @property {Array<IITC.settings.SettingBlock>} blocks - Page content
 */

const FIELD_TYPES = ['boolean', 'number', 'string', 'select', 'color'];

const TYPE_DEFAULTS = {
  boolean: false,
  number: 0,
  string: '',
  color: '#000000',
};

const STORAGE_PREFIX = 'iitc-setting:';

// lookups take keys from plugins and imported files, so names like `constructor` must not hit Object.prototype
const pages = Object.create(null);
const definitions = Object.create(null);

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const optionValues = (def) => {
  const options = typeof def.options === 'function' ? def.options() : def.options;
  return (options ?? []).map((option) => (isPlainObject(option) ? option.value : option));
};

const defaultOf = (def) => {
  if (def.map) return {};
  if (def.default !== undefined) return def.default;
  if (def.type !== 'select') return TYPE_DEFAULTS[def.type];
  try {
    return optionValues(def)[0];
  } catch (e) {
    log.warn(`settings: options of "${def.fullKey}" failed: ${e}`);
    return undefined;
  }
};

/**
 * Checks one value against a setting's type and constraints
 *
 * @private
 * @returns {true|string} True, or the reason the value is not allowed
 */
const validateValue = (def, value) => {
  switch (def.type) {
    case 'boolean':
      if (typeof value !== 'boolean') return 'not a boolean';
      break;
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) return 'not a number';
      if (def.min !== undefined && value < def.min) return `less than ${def.min}`;
      if (def.max !== undefined && value > def.max) return `greater than ${def.max}`;
      if (def.step) {
        const steps = (value - (def.min ?? 0)) / def.step;
        if (Math.abs(steps - Math.round(steps)) > 1e-9) return `not a multiple of ${def.step}`;
      }
      break;
    case 'string':
      if (typeof value !== 'string') return 'not a string';
      break;
    case 'select':
      try {
        if (!optionValues(def).includes(value)) return 'not one of the options';
      } catch (e) {
        log.warn(`settings: options of "${def.fullKey}" failed: ${e}`);
      }
      break;
    case 'color': {
      const pattern = def.alpha ? /^#[0-9a-f]{6}([0-9a-f]{2})?$/i : /^#[0-9a-f]{6}$/i;
      if (typeof value !== 'string' || !pattern.test(value)) return 'not a color';
      break;
    }
  }

  if (def.validate) {
    const result = def.validate(value);
    if (result !== true) return typeof result === 'string' ? result : 'rejected by validate';
  }
  return true;
};

// like validateValue, entry by entry for `repeat` maps
const validate = (def, value) => {
  // a throwing check (validate, broken pattern) counts as an invalid value
  const check = (entry) => {
    try {
      return validateValue(def, entry);
    } catch (e) {
      return `check failed: ${e}`;
    }
  };

  if (!def.map) return check(value);
  if (!isPlainObject(value)) return 'not a map';
  for (const [id, entry] of Object.entries(value)) {
    const result = check(entry);
    if (result !== true) return `${id}: ${result}`;
  }
  return true;
};

// parsed stored value, read anew on every call so callers may change it; undefined when missing or
// unreadable; no defaults or validation
const readStored = (key) => {
  const storageKey = STORAGE_PREFIX + key;
  const stored = localStorage.getItem(storageKey);
  if (stored === null) return undefined;

  try {
    return JSON.parse(stored);
  } catch (e) {
    log.warn(`settings: cannot read "${storageKey}": ${e}`);
    return undefined;
  }
};

// encodes and stores a value; false when it cannot be serialized or stored
const writeStored = (key, value) => {
  const storageKey = STORAGE_PREFIX + key;
  try {
    const stored = JSON.stringify(value);
    if (stored === undefined) throw new TypeError('the value cannot be serialized');
    localStorage.setItem(storageKey, stored);
  } catch (e) {
    log.error(`settings: cannot store "${storageKey}": ${e}`);
    return false;
  }
  return true;
};

// runs the settingChanged hook, then the block's onChange
const notifyChange = (key, value, oldValue) => {
  window.runHooks('settingChanged', { key, value, oldValue });
  const onChange = definitions[key]?.onChange;
  if (!onChange) return;
  try {
    onChange(value, oldValue);
  } catch (e) {
    log.error(`settings: onChange of "${key}" failed: ${e}`);
  }
};

/**
 * Collects the settings declared by a page, including the ones inside `repeat` blocks
 *
 * @private
 * @param {string} namespace - Prefix of the page's keys
 * @param {Array<IITC.settings.SettingBlock>} blocks - Blocks to scan
 * @param {boolean} [map=false] - Whether the blocks are repeated, so their settings hold maps
 * @returns {Array<Object>} Setting definitions
 */
const collectDefinitions = (namespace, blocks, map = false) => {
  const result = [];
  for (const block of blocks ?? []) {
    if (block.type === 'repeat') {
      result.push(...collectDefinitions(namespace, block.blocks, true));
      continue;
    }
    if (block.key === undefined) continue;
    if (!FIELD_TYPES.includes(block.type)) {
      log.warn(`settings: block type "${block.type}" cannot hold a setting ("${block.key}")`);
      continue;
    }

    const fullKey = `${namespace}.${block.key}`;
    result.push({ ...block, fullKey, map });
  }
  return result;
};

/**
 * Declares a settings page and the settings its blocks hold. Registering a page id again replaces the
 * earlier declaration and announces no change: a stored value the new declaration rejects reads as
 * the default
 *
 * @memberof IITC.settings
 * @param {string} pageId - Unique page id, usually the plugin id
 * @param {IITC.settings.SettingsPage} page - Page declaration
 * @returns {boolean} True if the page was registered
 *
 * @example
 * IITC.settings.register('link-show-direction', {
 *   title: 'Link direction',
 *   blocks: [
 *     { type: 'boolean', key: 'drawtools', default: false, title: 'Apply to DrawTools',
 *       onChange: (value) => value ? animateLinks() : removeDrawToolsStyle() },
 *   ],
 * });
 */
const register = (pageId, page) => {
  if (typeof pageId !== 'string' || !pageId) {
    log.warn('settings: page id is missing');
    return false;
  }
  if (!Array.isArray(page?.blocks)) {
    log.warn(`settings: page "${pageId}" has no blocks`);
    return false;
  }

  for (const key of Object.keys(definitions)) {
    if (definitions[key].pageId === pageId) delete definitions[key];
  }

  const namespace = page.namespace ?? pageId;
  pages[pageId] = { ...page, namespace };
  for (const def of collectDefinitions(namespace, page.blocks)) {
    const existing = definitions[def.fullKey];
    if (existing) {
      log.warn(`settings: "${def.fullKey}" is already declared by page "${existing.pageId}"`);
      continue;
    }
    definitions[def.fullKey] = { ...def, pageId };
  }
  return true;
};

/**
 * Turns the stored value of a declared setting into its effective value
 *
 * @private
 * @param {string} key - Full setting key
 * @param {*} stored - Value read from localStorage, undefined when there is none
 * @param {boolean} [quiet=false] - Skips the invalid-value warning
 * @returns {*} The stored value if it is valid, otherwise the default
 */
const resolve = (key, stored, quiet = false) => {
  const def = definitions[key];
  if (stored === undefined) return defaultOf(def);

  const result = validate(def, stored);
  if (result !== true) {
    if (!quiet) log.warn(`settings: stored value of "${key}" is ignored: ${result}`);
    return defaultOf(def);
  }
  return stored;
};

/**
 * Returns the value of a setting; a declared setting falls back to its default when nothing valid
 * is stored
 *
 * @memberof IITC.settings
 * @param {string} key - Setting key, `<namespace>.<key>`
 * @param {*} [fallback] - Value for an undeclared key with nothing stored
 * @returns {*} The setting value
 *
 * @example
 * const mode = IITC.settings.get('link-show-direction.mode');
 */
const get = (key, fallback) => {
  const stored = readStored(key);
  if (!definitions[key]) return stored === undefined ? fallback : stored;
  return resolve(key, stored);
};

/**
 * Stores the value of a setting. Values of declared settings are validated first;
 * the `settingChanged` hook and the block's `onChange` run when the value actually changes
 *
 * Storing `undefined` under an undeclared key removes the value, as `reset` does;
 * a declared setting rejects it
 *
 * @memberof IITC.settings
 * @param {string} key - Setting key, `<namespace>.<key>`
 * @param {*} value - New value
 * @returns {boolean} False if the value is not allowed or could not be stored
 *
 * @example
 * IITC.settings.set('draw-tools.color', '#a24ac3');
 */
const set = (key, value) => {
  const def = definitions[key];
  if (!def && value === undefined) {
    reset(key);
    return true;
  }

  if (def) {
    const result = validate(def, value);
    if (result !== true) {
      log.warn(`settings: value of "${key}" is rejected: ${result}`);
      return false;
    }
  }

  const stored = readStored(key);
  const oldValue = def ? resolve(key, stored, true) : stored;
  if (stored !== undefined && sameValue(value, stored)) return true;
  if (!writeStored(key, value)) return false;

  if (!sameValue(value, oldValue)) notifyChange(key, value, oldValue);
  return true;
};

/**
 * Removes the stored value, so a declared setting returns to its default
 *
 * @memberof IITC.settings
 * @param {string} key - Setting key, `<namespace>.<key>`
 *
 * @example
 * IITC.settings.reset('draw-tools.color');
 */
const reset = (key) => {
  const def = definitions[key];
  const stored = readStored(key);
  const oldValue = def ? resolve(key, stored, true) : stored;
  localStorage.removeItem(STORAGE_PREFIX + key);

  const value = get(key);
  if (!sameValue(value, oldValue)) notifyChange(key, value, oldValue);
};

IITC.settings = {
  register,
  get,
  set,
  reset,
  _pages: pages,
  _definitions: definitions,
};
