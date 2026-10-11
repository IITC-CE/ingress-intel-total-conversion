/* global IITC, log -- eslint */

/**
 * Settings API
 *
 * Plugins declare their settings as blocks with a `key`; the core stores them, applies defaults
 * and validates every value. Blocks without a key are the rest of the page: actions and content.
 * Keys that were never declared still work through `get`/`set`, without validation
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
 * @property {string} type - Block type:
 *   - fields, each holding the setting its `key` names: `boolean`, `number`, `string`, `select`, `color`;
 *   - actions: `action` runs `action`, `export` hands over the text `data` returns, `import` passes text
 *     the user enters to `onData`, `choice` marks the `selected` item of a `repeat` and runs `action` with
 *     the item the user chooses; it is drawn as a radio before the title of each item;
 *   - content: `heading`, `text`, `link`, `list`, `notice`;
 *   - `repeat` repeats its `blocks` for every item of `over`
 *
 *   Display properties (`title`, `description`, `icon`, `text`, `url`, `level`, `items`, `visible`, `enabled`,
 *   `value`, `selected`) take a value or a function, called whenever the page is drawn; inside a `repeat` the
 *   function receives the item
 * @property {string|Function} [title] - Label of a field or an action, text of a `heading` or a `link`
 * @property {string|Function} [icon] - Icon an `action` button shows instead of its text, a Material Symbols
 *                                      name such as 'delete'; the text becomes the tooltip
 * @property {string|Function} [description] - Explanation shown under the title
 * @property {boolean|Function} [visible=true] - False hides the block
 * @property {boolean|Function} [enabled=true] - False shows the block without letting the user change or run it
 * @property {string} [key] - Name of the setting a field holds, addressed as `<namespace>.<key>`; every field has one
 * @property {*} [default] - Value used while nothing valid is stored
 * @property {*|Function} [value] - Value a field shows instead of the stored one, when it is derived from other
 *                                  settings (a flag that a broader rule already sets)
 * @property {number} [min] - Lowest allowed `number`
 * @property {number} [max] - Highest allowed `number`
 * @property {number} [step] - Allowed `number` increment, counted from `min` or 0
 * @property {Array|Function} [options] - `select` choices: values or `{value, label}` objects. A function must
 *                                        return all choices at once: a value missing from them is not allowed
 * @property {boolean} [alpha] - Allows `color` values with an alpha channel (`#rrggbbaa`)
 * @property {Function} [validate] - Returns true, or an error message for a value that is not allowed
 * @property {Function} [onChange] - Called with `(value, oldValue, source)` after the value has changed
 * @property {boolean} [sync=true] - False keeps the setting on this device: sync neither sends nor applies it,
 *                                   while a local backup still holds it
 * @property {Function} [action] - Runs when an `action` block is pressed, or a `choice` is made
 * @property {boolean|Function} [selected] - Whether the item is the chosen one, for a `choice`
 * @property {Function} [data] - Returns the text an `export` block hands over
 * @property {string} [filename] - Lets an `export` block also save `data` as a file of this name
 * @property {string} [dataType] - MIME type of that file
 * @property {Function} [onData] - Receives `(text, filename)` from an `import` block: the pasted text, or the
 *                                 file read; an error it throws is shown to the user
 * @property {string} [accept] - Lets an `import` block also read files of these types, as in the `accept`
 *                               attribute of a file input
 * @property {string|Function} [text] - Text of a `text` or a `notice` block
 * @property {string|Function} [url] - Address a `link` opens
 * @property {'info'|'warning'|'error'|Function} [level='info'] - Kind of a `notice`
 * @property {Array<IITC.settings.SettingsListItem>|Function} [items] - Entries of a `list`
 * @property {Function} [over] - Items of a `repeat` block, returned as `[{id, title}]` with ids that stay the same between calls
 * @property {Array<IITC.settings.SettingBlock>} [blocks] - Blocks of a `repeat` block; their settings hold a map of item id to value
 */

/**
 * @memberof IITC.settings
 * @typedef {Object} SettingsListItem
 * @property {string} title - Main text
 * @property {string} [sub] - Second line
 * @property {string} [badge] - Short text at the end of the line, such as a version
 * @property {string} [tooltip] - Text shown on hover
 * @property {'muted'|'error'} [state] - Shows the entry as secondary, or as failed
 * @property {Array<IITC.settings.SettingsListItem>} [items] - Nested entries
 * @property {boolean} [collapsed=false] - Hides the nested entries until the entry is opened
 */

/**
 * @memberof IITC.settings
 * @typedef {Object} SettingsPage
 * @property {string} title - Page title
 * @property {string} [namespace] - Prefix of the page's setting keys. Defaults to the page id
 * @property {Array<IITC.settings.SettingBlock>} blocks - Page content
 */

const FIELD_TYPES = ['boolean', 'number', 'string', 'select', 'color'];

const BLOCK_TYPES = [...FIELD_TYPES, 'action', 'choice', 'export', 'import', 'heading', 'text', 'link', 'list', 'notice', 'repeat'];

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

// like validateValue; a throwing validate counts as an invalid value
const validateEntry = (def, value) => {
  try {
    return validateValue(def, value);
  } catch (e) {
    return `check failed: ${e}`;
  }
};

// like validateEntry, entry by entry for `repeat` maps
const validate = (def, value) => {
  if (!def.map) return validateEntry(def, value);
  if (!isPlainObject(value)) return 'not a map';
  for (const [id, entry] of Object.entries(value)) {
    const result = validateEntry(def, entry);
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
    if (!quiet) log.warn(`settings: cannot read "${storageKey}": ${e}`);
    return undefined;
  }
};

// the string a value is kept as in localStorage; throws when it cannot be serialized
const encodeStored = (value) => {
  const stored = JSON.stringify(value);
  if (stored === undefined) throw new TypeError('the value cannot be serialized');
  return stored;
};

// the default of a declared setting in its stored form, undefined when it cannot be stored (a select
// whose options are not loaded yet)
const storedDefault = (key) => {
  try {
    return encodeStored(defaultOf(definitions[key]));
  } catch {
    return undefined;
  }
};

// stores an encoded value; false when localStorage refuses it
const writeStored = (storageKey, stored) => {
  try {
    localStorage.setItem(storageKey, stored);
  } catch (e) {
    log.error(`settings: cannot store "${storageKey}": ${e}`);
    return false;
  }
  return true;
};

// runs the settingChanged hook, then the block's onChange
const notifyChange = (key, value, oldValue, source) => {
  window.runHooks('settingChanged', { key, value, oldValue, source });
  const onChange = definitions[key]?.onChange;
  if (!onChange) return;
  try {
    onChange(value, oldValue, source);
  } catch (e) {
    log.error(`settings: onChange of "${key}" failed: ${e}`);
  }
};

/**
 * Collects the settings declared by a page, including the ones inside `repeat` blocks, and skips
 * blocks of unknown types with a warning
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
    if (!BLOCK_TYPES.includes(block?.type)) {
      log.warn(`settings: unknown block type "${block?.type}" in "${namespace}"`);
      continue;
    }
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
  const keys = [];
  for (const def of collectDefinitions(namespace, page.blocks)) {
    const existing = definitions[def.fullKey];
    if (existing) {
      log.warn(`settings: "${def.fullKey}" is already declared by page "${existing.pageId}"`);
      continue;
    }
    definitions[def.fullKey] = { ...def, pageId };
    keys.push(def.fullKey);
  }

  // last, so settingsPageRegistered handlers (sync) see the page settled
  window.runHooks('settingsPageRegistered', { pageId, keys });
  return true;
};

/**
 * Turns the stored value of a declared setting into its effective value
 *
 * @private
 * @param {string} key - Full setting key
 * @param {*} stored - Value read from localStorage, undefined when there is none
 * @param {boolean} [quiet=false] - Skips the invalid-value warning
 * @returns {*} The stored value if it is valid, otherwise the default; of a stored map, the valid entries
 */
const resolve = (key, stored, quiet = false) => {
  const def = definitions[key];
  if (stored === undefined) return defaultOf(def);

  // one entry that went bad (an option since removed) must not take the others with it
  if (def.map && isPlainObject(stored)) {
    const entries = Object.entries(stored).filter(([id, entry]) => {
      const result = validateEntry(def, entry);
      if (result !== true && !quiet) log.warn(`settings: stored entry "${id}" of "${key}" is ignored: ${result}`);
      return result === true;
    });
    return Object.fromEntries(entries);
  }

  const result = validate(def, stored);
  if (result !== true) {
    if (!quiet) log.warn(`settings: stored value of "${key}" is ignored: ${result}`);
    return defaultOf(def);
  }
  return stored;
};

/**
 * Returns the value of a setting; a declared setting falls back to its default when nothing valid
 * is stored, and a map of a `repeat` keeps only its valid entries
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
 * Tells whether a setting may travel to other devices: it is declared, and not with `sync: false`
 *
 * @private
 * @param {string} key - Setting key, `<namespace>.<key>`
 * @returns {boolean} True for a declared setting that syncs
 */
const syncs = (key) => definitions[key] !== undefined && definitions[key].sync !== false;

/**
 * Tells what localStorage holds for a key, without logging: nothing, a value that reads and passes
 * the declaration, or one that cannot be read or fails it (an old range, options not loaded yet)
 *
 * @private
 * @param {string} key - Setting key, `<namespace>.<key>`
 * @returns {'missing'|'valid'|'invalid'} The state of the stored value
 */
const storedState = (key) => {
  if (localStorage.getItem(STORAGE_PREFIX + key) === null) return 'missing';
  const stored = readStored(key, true);
  if (stored === undefined) return 'invalid';
  const def = definitions[key];
  return !def || validate(def, stored) === true ? 'valid' : 'invalid';
};

// values from another device apply only to declared settings that do not belong to this device
const refusesRemote = (key, source) => {
  if (source !== 'remote') return false;
  if (syncs(key)) return false;
  log.warn(`settings: "${key}" ${definitions[key] ? 'belongs to this device' : 'is not declared'} and ignores remote values`);
  return true;
};

/**
 * Stores the value of a setting. Values of declared settings are validated first; a value stored in the same
 * form as the one already there changes nothing, and a value stored in the same form as the default is
 * removed, as `reset` does. The `settingChanged` hook and the block's `onChange` run when the value
 * actually changes, and receive the value as `get` returns it
 *
 * Storing `undefined` under an undeclared key removes the value, as `reset` does;
 * a declared setting rejects it
 *
 * @memberof IITC.settings
 * @param {string} key - Setting key, `<namespace>.<key>`
 * @param {*} value - New value
 * @param {Object} [options]
 * @param {string} [options.source='local'] - Origin of the change, passed to the settingChanged hook; sync uses `remote`
 * @returns {boolean} False if the value is not allowed or could not be stored, or if a `remote` value
 *          targets an undeclared key or a setting declared with `sync: false`
 *
 * @example
 * IITC.settings.set('draw-tools.color', '#a24ac3');
 */
const set = (key, value, options) => {
  const source = options?.source ?? 'local';
  if (refusesRemote(key, source)) return false;
  const def = definitions[key];
  if (!def && value === undefined) {
    reset(key, { source });
    return true;
  }

  if (def) {
    const result = validate(def, value);
    if (result !== true) {
      log.warn(`settings: value of "${key}" is rejected: ${result}`);
      return false;
    }
  }

  const storageKey = STORAGE_PREFIX + key;
  let encoded;
  try {
    encoded = encodeStored(value);
  } catch (e) {
    log.error(`settings: cannot store "${storageKey}": ${e}`);
    return false;
  }
  // a value equal to the default is not kept, as if the setting was never changed
  if (def && encoded === storedDefault(key)) return reset(key, { source });
  if (encoded === localStorage.getItem(storageKey)) return true;

  const stored = readStored(key);
  const oldValue = def ? resolve(key, stored, true) : stored;
  if (!writeStored(storageKey, encoded)) return false;

  const current = readStored(key);
  const newValue = current === undefined ? value : current;
  if (!sameValue(newValue, oldValue)) notifyChange(key, newValue, oldValue, source);
  return true;
};

/**
 * Removes the stored value, so a declared setting returns to its default
 *
 * @memberof IITC.settings
 * @param {string} key - Setting key, `<namespace>.<key>`
 * @param {Object} [options]
 * @param {string} [options.source='local'] - Origin of the change, passed to the settingChanged hook; sync uses `remote`
 * @returns {boolean} False if a `remote` reset targets an undeclared key or a setting declared with `sync: false`
 *
 * @example
 * IITC.settings.reset('draw-tools.color');
 */
const reset = (key, options) => {
  const source = options?.source ?? 'local';
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
 * Collects the stored values of declared settings; defaults are left out, so an import on another
 * device keeps that device's defaults. Values are not validated here: options may still be loading,
 * and `import` checks every value anyway
 *
 * @alias IITC.settings.export
 * @param {Object} [options]
 * @param {boolean} [options.sync=false] - Leaves out settings declared with `sync: false`, for sending to other devices
 * @returns {Object<string, *>} Values by setting key
 *
 * @example
 * const backup = JSON.stringify(IITC.settings.export());
 */
const exportValues = (options) => {
  const values = {};
  for (const key of Object.keys(definitions)) {
    if (options?.sync && !syncs(key)) continue;
    const stored = readStored(key);
    if (stored !== undefined) values[key] = stored;
  }
  return values;
};

/**
 * Stores values produced by `export`. Each value goes through `set`, so it is validated
 * and announced like any other change. Keys no registered page declares are skipped, and so are
 * settings declared with `sync: false` when the values come from another device (source `remote`)
 *
 * @alias IITC.settings.import
 * @param {Object<string, *>} values - Values by setting key
 * @param {Object} [options]
 * @param {string} [options.source='local'] - Origin of the values, passed to the settingChanged hook; sync uses `remote`
 * @returns {{applied: string[], rejected: string[], skipped: string[]}} Keys stored, keys whose value
 *          was not allowed or could not be stored, and keys left alone
 *
 * @example
 * const { rejected } = IITC.settings.import(JSON.parse(backup));
 */
const importValues = (values, options) => {
  const result = { applied: [], rejected: [], skipped: [] };
  if (!isPlainObject(values)) {
    log.warn('settings: import expects an object of values by key');
    return result;
  }

  for (const [key, value] of Object.entries(values)) {
    const def = definitions[key];
    if (!def || (!syncs(key) && options?.source === 'remote')) result.skipped.push(key);
    else if (set(key, value, options)) result.applied.push(key);
    else result.rejected.push(key);
  }
  return result;
};

IITC.settings = {
  register,
  get,
  set,
  reset,
  export: exportValues,
  import: importValues,
  _syncs: syncs,
  _storedState: storedState,
  _pages: pages,
  _definitions: definitions,
};
