/* global IITC, log -- eslint */

/**
 * @file Replication of settings between devices through the file `iitc[settings]` of the Sync plugin, while
 *       `iitc.syncSettings` is on. Each synced key is shared as `{ value, updated }`, or
 *       `{ deleted: true, updated }` once reset, so a reset reaches devices that were closed. The newer
 *       record of a key wins in both directions, and a value stored without a time gives way to any shared
 *       record. Changes are timed before the file is loaded too, and sent once it is
 * @module settings_sync
 */

// localStorage key of the times of the last change of each synced key on this device
const TIMES_KEY = 'iitc-settings-sync-times';

// the file of the Sync plugin that holds the shared records
const PLUGIN = 'iitc';
const FIELD = 'settings';

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

// a usable time here: a whole number that + 1 still increases exactly
const isTime = (time) => Number.isSafeInteger(time) && time >= 0 && time < Number.MAX_SAFE_INTEGER;

// a usable time in the shared records, with room for the + 1 of a change made after it
const isFileTime = (time) => Number.isSafeInteger(time) && time >= 0 && time < 2 ** 52;

// the Sync plugin taking the records
const syncPlugin = {
  // the holder of the synced map; the plugin replaces the field when another client wrote the file
  store: { [FIELD]: {} },
  started: false,
  // keys changed here, sent together once the current task is done
  queued: new Set(),
  scheduled: false,

  enabled: () => IITC.settings.get('iitc.syncSettings') === true,

  // installed in a version that can keep the map outside window.plugin; IITC has loaded, so a new file
  // starts with the pages of all plugins
  available: () => window.iitcLoaded === true && typeof window.plugin?.sync?.getFileMap === 'function',

  // the synced map is loaded and not stopped by a sign-out
  ready() {
    return this.started && this.enabled() && window.plugin.sync.isInitialized(PLUGIN, FIELD);
  },

  start() {
    if (this.started || !this.enabled() || !this.available()) return;
    // what a newly created file starts with
    this.store[FIELD] = records();
    try {
      window.plugin.sync.registerMapForSync(PLUGIN, FIELD, null, () => this.reconcile(), { holder: this.store });
    } catch (e) {
      // the plugin failed to register the map; turning the setting off and on again tries once more
      log.warn('settings: the Sync plugin could not take the settings', e);
      return;
    }
    this.started = true;
  },

  // an import or a page of changes in one task becomes one upload of the file
  queue(key) {
    if (!this.ready()) return;
    this.queued.add(key);
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => this.flush());
  },

  flush() {
    this.scheduled = false;
    const keys = [...this.queued];
    this.queued.clear();
    if (this.ready()) this.send(keys);
  },

  send(keys) {
    for (const key of keys) this.queued.delete(key);
    const sent = records(keys);
    if (!Object.keys(sent).length) return;
    Object.assign(this.store[FIELD], sent);
    window.plugin.sync.updateMap(PLUGIN, FIELD, Object.keys(sent));
  },

  // runs after every load of the synced map; with keys, only for those
  reconcile(keys) {
    if (this.ready()) this.send(reconcile(keys));
  },
};

// the shared records, or undefined until the Sync plugin has taken the map and loaded the file
const fileRecords = () => {
  if (!syncPlugin.started) return undefined;
  const records = window.plugin.sync.getFileMap(PLUGIN, FIELD);
  return isObject(records) ? records : undefined;
};

const fileTime = (records, key) => {
  const updated = records && Object.hasOwn(records, key) ? records[key]?.updated : undefined;
  return isFileTime(updated) ? updated : undefined;
};

const loadTimes = () => {
  let times;
  try {
    times = JSON.parse(localStorage.getItem(TIMES_KEY));
  } catch {
    return {};
  }
  if (!isObject(times)) return {};
  return Object.fromEntries(Object.entries(times).filter(([, time]) => isTime(time)));
};

// reads, updates and stores at once, so a time recorded by a nested change is never overwritten;
// undefined forgets the time
const setTime = (key, time) => {
  const times = loadTimes();
  if (time === undefined) delete times[key];
  else times[key] = time;
  localStorage.setItem(TIMES_KEY, JSON.stringify(times));
};

// the record of a key as this device holds it, or undefined when it holds nothing it may send:
// a stored value that cannot be read or fails its declaration (an old range, options still
// loading) would only be rejected elsewhere, and it is not a reset either
const localRecord = (key, times) => {
  const updated = times[key] ?? 0;
  const state = IITC.settings._storedState(key);
  if (state === 'missing') return { deleted: true, updated };
  if (state === 'valid') return { value: IITC.settings.get(key), updated };
  return undefined;
};

// the records this device holds for the keys, all stored values that may leave the device by default,
// leaving out keys it holds nothing to send for
const records = (keys = Object.keys(IITC.settings.exportValues({ sync: true }))) => {
  const times = loadTimes();
  return Object.fromEntries(keys.map((key) => [key, localRecord(key, times)]).filter(([, record]) => record));
};

// applies the shared records newer than what this device holds, and returns the keys the shared records
// lack or hold older than this device, to be sent; with keys, only for those. Does nothing while
// `iitc.syncSettings` is off
const reconcile = (keys) => {
  const remote = fileRecords();
  if (!remote || IITC.settings.get('iitc.syncSettings') !== true) return [];
  const wanted = (key) => !keys || keys.includes(key);

  for (const [key, record] of Object.entries(remote)) {
    // a key not declared here yet is reconciled when its page registers
    if (!wanted(key) || !IITC.settings._syncs(key) || !isFileTime(record?.updated)) continue;
    const time = loadTimes()[key];
    // a stored value this device cannot use gives way to the shared record, whatever its time
    const known = IITC.settings._storedState(key) === 'invalid' ? undefined : time;
    if (known !== undefined && record.updated <= known) continue;
    // set first, so a change that onChange makes in reply gets a later time and wins everywhere;
    // a record from before syncing (time 0) leaves no time, so the shared records keep leading the key
    setTime(key, record.updated > 0 ? record.updated : undefined);
    const applied = record.deleted ? IITC.settings.reset(key, { source: 'remote' }) : IITC.settings.set(key, record.value, { source: 'remote' });
    // a rejected value, say for options not loaded yet, is tried again on the next reconcile
    if (!applied) setTime(key, time);
  }

  const times = loadTimes();
  const local = new Set([...Object.keys(IITC.settings.exportValues({ sync: true })), ...Object.keys(times).filter((key) => IITC.settings._syncs(key))]);
  return [...local].filter((key) => {
    const shared = fileTime(remote, key);
    return wanted(key) && (shared === undefined || (times[key] ?? -Infinity) > shared);
  });
};

// a change made on this device gets its time and goes out with the next upload; values applied from the
// shared records are not changes made here, and values moved from an older build get no time, so they
// give way to the shared records
const onSettingChanged = ({ key, value, source }) => {
  if (key === 'iitc.syncSettings') {
    if (value !== true) return;
    if (syncPlugin.started) syncPlugin.reconcile();
    else syncPlugin.start();
    return;
  }
  if (source === 'remote' || source === 'legacy' || !IITC.settings._syncs(key)) return;
  // later than the record it replaces and than the shared one, even when this device's clock lags
  const shared = fileTime(fileRecords(), key);
  setTime(key, Math.max(Date.now(), (loadTimes()[key] ?? 0) + 1, (shared ?? 0) + 1));
  syncPlugin.queue(key);
};

// the shared records of the keys a page or an extension declares, after the current task, so the plugin
// that registers finishes its setup before onChange runs
const onPageRegistered = ({ keys }) => {
  queueMicrotask(() => syncPlugin.reconcile(keys));
};

// for tests
IITC.settings._sync = { TIMES_KEY, records, reconcile, onSettingChanged, onPageRegistered, loadTimes, setTime, syncPlugin };

// handlers return nothing: a false would stop the remaining hook handlers
window.addHook('settingChanged', onSettingChanged);
window.addHook('settingsPageRegistered', onPageRegistered);
window.addHook('iitcLoaded', () => {
  syncPlugin.start();
});
// the Sync plugin loaded after IITC
window.addHook('pluginSyncReady', () => {
  syncPlugin.start();
});
