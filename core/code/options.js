/* global IITC, log -- eslint */

/**
 * Options API
 *
 * Plugins declare their options as blocks with a `key`; the core stores them, applies defaults
 * and validates every value. Keys that were never declared still work through `get`/`set`,
 * without validation
 *
 * Every value is kept under `iitc-option:<key>`. Until its page is registered, a key is read and written
 * as undeclared, without validation
 *
 * @memberof IITC
 * @namespace options
 */

/**
 * @memberof IITC.options
 * @typedef {Object} OptionBlock
 * @property {string} type - Block type; `boolean`, `number`, `string`, `select` and `color` hold an option, and `repeat`
 *                          repeats its `blocks` for every item of `over`
 * @property {string} [title] - Label of the block
 * @property {string} [key] - Turns the block into an option, addressed as `<namespace>.<key>`
 * @property {*} [default] - Value used while nothing valid is stored
 * @property {number} [min] - Lowest allowed `number`
 * @property {number} [max] - Highest allowed `number`
 * @property {number} [step] - Allowed `number` increment, counted from `min` or 0
 * @property {Array|Function} [choices] - `select` choices: values or `{value, label}` objects
 * @property {boolean} [alpha] - Allows `color` values with an alpha channel (`#rrggbbaa`)
 * @property {Function} [validate] - Returns true, or an error message for a value that is not allowed
 * @property {Function} [onChange] - Called with `(value, oldValue, source)` after the value has changed
 * @property {boolean} [sync=true] - False keeps the option on this device: sync neither sends nor applies it,
 *                                   while a local backup still holds it
 * @property {Function} [over] - Items of a `repeat` block, returned as `[{id, title}]` with ids that stay the same between calls
 * @property {Array<IITC.options.OptionBlock>} [blocks] - Blocks of a `repeat` block; their options hold a map of item id to value
 */

/**
 * @memberof IITC.options
 * @typedef {Object} OptionsPage
 * @property {string} title - Page title
 * @property {string} [namespace] - Prefix of the page's option keys. Defaults to the page id
 * @property {Array<IITC.options.OptionBlock>} blocks - Page content
 */

const FIELD_TYPES = ['boolean', 'number', 'string', 'select', 'color'];

const TYPE_DEFAULTS = {
  boolean: false,
  number: 0,
  string: '',
  color: '#000000',
};

const STORAGE_PREFIX = 'iitc-option:';

// lookups take keys from plugins and imported files, so names like `constructor` must not hit Object.prototype
const pages = Object.create(null);
const definitions = Object.create(null);

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const choiceValues = (def) => {
  const choices = typeof def.choices === 'function' ? def.choices() : def.choices;
  return (choices ?? []).map((choice) => (isPlainObject(choice) ? choice.value : choice));
};

const defaultOf = (def) => {
  if (def.map) return {};
  if (def.default !== undefined) return def.default;
  if (def.type !== 'select') return TYPE_DEFAULTS[def.type];
  try {
    return choiceValues(def)[0];
  } catch (e) {
    log.warn(`options: choices of "${def.fullKey}" failed: ${e}`);
    return undefined;
  }
};

/**
 * Checks one value against an option's type and constraints
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
        if (!choiceValues(def).includes(value)) return 'not one of the choices';
      } catch (e) {
        log.warn(`options: choices of "${def.fullKey}" failed: ${e}`);
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
const readStored = (key, quiet = false) => {
  const storageKey = STORAGE_PREFIX + key;
  const stored = localStorage.getItem(storageKey);
  if (stored === null) return undefined;

  try {
    return JSON.parse(stored);
  } catch (e) {
    if (!quiet) log.warn(`options: cannot read "${storageKey}": ${e}`);
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
    log.error(`options: cannot store "${storageKey}": ${e}`);
    return false;
  }
  return true;
};

// runs the optionChanged hook, then the block's onChange
const notifyChange = (key, value, oldValue, source) => {
  window.runHooks('optionChanged', { key, value, oldValue, source });
  const onChange = definitions[key]?.onChange;
  if (!onChange) return;
  try {
    onChange(value, oldValue, source);
  } catch (e) {
    log.error(`options: onChange of "${key}" failed: ${e}`);
  }
};

/**
 * Collects the options declared by a page, including the ones inside `repeat` blocks
 *
 * @private
 * @param {string} namespace - Prefix of the page's keys
 * @param {Array<IITC.options.OptionBlock>} blocks - Blocks to scan
 * @param {boolean} [map=false] - Whether the blocks are repeated, so their options hold maps
 * @returns {Array<Object>} Option definitions
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
      log.warn(`options: block type "${block.type}" cannot hold an option ("${block.key}")`);
      continue;
    }

    const fullKey = `${namespace}.${block.key}`;
    result.push({ ...block, fullKey, map });
  }
  return result;
};

/**
 * Declares an options page and the options its blocks hold. Registering a page id again replaces the
 * earlier declaration and announces no change: a stored value the new declaration rejects reads as
 * the default
 *
 * @memberof IITC.options
 * @param {string} pageId - Unique page id, usually the plugin id
 * @param {IITC.options.OptionsPage} page - Page declaration
 * @returns {boolean} True if the page was registered
 *
 * @example
 * IITC.options.register('link-show-direction', {
 *   title: 'Link direction',
 *   blocks: [
 *     { type: 'boolean', key: 'drawtools', default: false, title: 'Apply to DrawTools',
 *       onChange: (value) => value ? animateLinks() : removeDrawToolsStyle() },
 *   ],
 * });
 */
const register = (pageId, page) => {
  if (typeof pageId !== 'string' || !pageId) {
    log.warn('options: page id is missing');
    return false;
  }
  if (!Array.isArray(page?.blocks)) {
    log.warn(`options: page "${pageId}" has no blocks`);
    return false;
  }

  for (const key of Object.keys(definitions)) {
    if (definitions[key].pageId === pageId) delete definitions[key];
  }

  const namespace = page.namespace ?? pageId;
  pages[pageId] = { ...page, namespace };
  const keys = [];
  for (const def of collectDefinitions(namespace, page.blocks)) {
    const existing = definitions[def.fullKey];
    if (existing) {
      log.warn(`options: "${def.fullKey}" is already declared by page "${existing.pageId}"`);
      continue;
    }
    definitions[def.fullKey] = { ...def, pageId };
    keys.push(def.fullKey);
  }

  // last, so optionsPageRegistered handlers (sync) see the page settled
  window.runHooks('optionsPageRegistered', { pageId, keys });
  return true;
};

/**
 * Turns the stored value of a declared option into its effective value
 *
 * @private
 * @param {string} key - Full option key
 * @param {*} stored - Value read from localStorage, undefined when there is none
 * @param {boolean} [quiet=false] - Skips the invalid-value warning
 * @returns {*} The stored value if it is valid, otherwise the default
 */
const resolve = (key, stored, quiet = false) => {
  const def = definitions[key];
  if (stored === undefined) return defaultOf(def);

  const result = validate(def, stored);
  if (result !== true) {
    if (!quiet) log.warn(`options: stored value of "${key}" is ignored: ${result}`);
    return defaultOf(def);
  }
  return stored;
};

/**
 * Returns the value of an option; a declared option falls back to its default when nothing valid
 * is stored
 *
 * @memberof IITC.options
 * @param {string} key - Option key, `<namespace>.<key>`
 * @param {*} [fallback] - Value for an undeclared key with nothing stored
 * @returns {*} The option value
 *
 * @example
 * const mode = IITC.options.get('link-show-direction.mode');
 */
const get = (key, fallback) => {
  const stored = readStored(key);
  if (!definitions[key]) return stored === undefined ? fallback : stored;
  return resolve(key, stored);
};

/**
 * Tells whether an option may travel to other devices: it is declared, and not with `sync: false`
 *
 * @private
 * @param {string} key - Option key, `<namespace>.<key>`
 * @returns {boolean} True for a declared option that syncs
 */
const syncs = (key) => definitions[key] !== undefined && definitions[key].sync !== false;

/**
 * Tells what localStorage holds for a key, without logging: nothing, a value that reads and passes
 * the declaration, or one that cannot be read or fails it (an old range, choices not loaded yet)
 *
 * @private
 * @param {string} key - Option key, `<namespace>.<key>`
 * @returns {'missing'|'valid'|'invalid'} The state of the stored value
 */
const storedState = (key) => {
  if (localStorage.getItem(STORAGE_PREFIX + key) === null) return 'missing';
  const stored = readStored(key, true);
  if (stored === undefined) return 'invalid';
  const def = definitions[key];
  return !def || validate(def, stored) === true ? 'valid' : 'invalid';
};

// values from another device apply only to declared options that do not belong to this device
const refusesRemote = (key, source) => {
  if (source !== 'remote') return false;
  if (syncs(key)) return false;
  log.warn(`options: "${key}" ${definitions[key] ? 'belongs to this device' : 'is not declared'} and ignores remote values`);
  return true;
};

/**
 * Stores the value of an option. Values of declared options are validated first;
 * the `optionChanged` hook and the block's `onChange` run when the value actually changes
 *
 * Storing `undefined` under an undeclared key removes the value, as `reset` does;
 * a declared option rejects it
 *
 * @memberof IITC.options
 * @param {string} key - Option key, `<namespace>.<key>`
 * @param {*} value - New value
 * @param {Object} [opts]
 * @param {string} [opts.source='local'] - Origin of the change, passed to the optionChanged hook; sync uses `remote`
 * @returns {boolean} False if the value is not allowed or could not be stored, or if a `remote` value
 *          targets an undeclared key or an option declared with `sync: false`
 *
 * @example
 * IITC.options.set('draw-tools.color', '#a24ac3');
 */
const set = (key, value, opts) => {
  const source = opts?.source ?? 'local';
  if (refusesRemote(key, source)) return false;
  const def = definitions[key];
  if (!def && value === undefined) {
    reset(key, { source });
    return true;
  }

  if (def) {
    const result = validate(def, value);
    if (result !== true) {
      log.warn(`options: value of "${key}" is rejected: ${result}`);
      return false;
    }
  }

  const stored = readStored(key);
  const oldValue = def ? resolve(key, stored, true) : stored;
  if (stored !== undefined && sameValue(value, stored)) return true;
  if (!writeStored(key, value)) return false;

  if (!sameValue(value, oldValue)) notifyChange(key, value, oldValue, source);
  return true;
};

/**
 * Removes the stored value, so a declared option returns to its default
 *
 * @memberof IITC.options
 * @param {string} key - Option key, `<namespace>.<key>`
 * @param {Object} [opts]
 * @param {string} [opts.source='local'] - Origin of the change, passed to the optionChanged hook; sync uses `remote`
 * @returns {boolean} False if a `remote` reset targets an undeclared key or an option declared with `sync: false`
 *
 * @example
 * IITC.options.reset('draw-tools.color');
 */
const reset = (key, opts) => {
  const source = opts?.source ?? 'local';
  if (refusesRemote(key, source)) return false;
  const def = definitions[key];
  const stored = readStored(key);
  const oldValue = def ? resolve(key, stored, true) : stored;
  localStorage.removeItem(STORAGE_PREFIX + key);

  const value = get(key);
  if (!sameValue(value, oldValue)) notifyChange(key, value, oldValue, source);
  return true;
};

/**
 * Collects the stored values of declared options; defaults are left out, so an import on another
 * device keeps that device's defaults. Values are not validated here: choices may still be loading,
 * and `import` checks every value anyway
 *
 * @alias IITC.options.exportValues
 * @param {Object} [opts]
 * @param {boolean} [opts.sync=false] - Leaves out options declared with `sync: false`, for sending to other devices
 * @returns {Object<string, *>} Values by option key
 *
 * @example
 * const backup = JSON.stringify(IITC.options.exportValues());
 */
const exportValues = (opts) => {
  const values = {};
  for (const key of Object.keys(definitions)) {
    if (opts?.sync && !syncs(key)) continue;
    const stored = readStored(key);
    if (stored !== undefined) values[key] = stored;
  }
  return values;
};

/**
 * Stores values produced by `export`. Each value goes through `set`, so it is validated
 * and announced like any other change. Keys no registered page declares are skipped, and so are
 * options declared with `sync: false` when the values come from another device (source `remote`)
 *
 * @alias IITC.options.importValues
 * @param {Object<string, *>} values - Values by option key
 * @param {Object} [opts]
 * @param {string} [opts.source='local'] - Origin of the values, passed to the optionChanged hook; sync uses `remote`
 * @returns {{applied: string[], rejected: string[], skipped: string[]}} Keys stored, keys whose value
 *          was not allowed or could not be stored, and keys left alone
 *
 * @example
 * const { rejected } = IITC.options.importValues(JSON.parse(backup));
 */
const importValues = (values, opts) => {
  const result = { applied: [], rejected: [], skipped: [] };
  if (!isPlainObject(values)) {
    log.warn('options: import expects an object of values by key');
    return result;
  }

  for (const [key, value] of Object.entries(values)) {
    const def = definitions[key];
    if (!def || (!syncs(key) && opts?.source === 'remote')) result.skipped.push(key);
    else if (set(key, value, opts)) result.applied.push(key);
    else result.rejected.push(key);
  }
  return result;
};

IITC.options = {
  register,
  get,
  set,
  reset,
  exportValues,
  importValues,
  _syncs: syncs,
  _storedState: storedState,
  _pages: pages,
  _definitions: definitions,
};
