/* global IITC -- eslint */

/**
 * @file General settings of IITC, declared as the `iitc` page for settings of several core modules.
 *       This file sorts right after settings.js in the bundle, so the page exists before boot(), where
 *       core modules and plugin setups first read its values
 * @module settings_general
 */

// the text of a backup file: the stored values of all declared settings
const backup = () => JSON.stringify(IITC.settings.export(), null, 2);

// stores the values of a backup, and tells what was left out
const restore = (text) => {
  let values;
  try {
    values = JSON.parse(text);
  } catch {
    values = undefined;
  }
  if (values === null || typeof values !== 'object' || Array.isArray(values)) throw new Error('This is not a settings backup');

  const { applied, rejected, skipped } = IITC.settings.import(values);
  const total = applied.length + rejected.length + skipped.length;
  let report = `Imported ${applied.length} of ${total} settings.`;
  // settings of plugins that are not installed here
  if (skipped.length) report += ` Not declared by any plugin here: ${skipped.join(', ')}.`;
  if (rejected.length) report += ` Not allowed or not stored: ${rejected.join(', ')}.`;
  return report;
};

IITC.settings.register('iitc', {
  title: 'IITC',
  blocks: [
    {
      type: 'select',
      key: 'passcodeFormat',
      title: 'Passcode rewards',
      options: [
        { value: 'long', label: 'Long' },
        { value: 'short', label: 'Short' },
      ],
      default: 'long',
    },
    {
      type: 'boolean',
      key: 'intelUrlWarning',
      title: 'Warn when Intel is opened on a non-standard domain',
      default: true,
      // the domain warning concerns this browser, not the user's other devices
      sync: false,
    },
    {
      type: 'boolean',
      key: 'syncSettings',
      title: 'Sync IITC settings',
      default: true,
      // whether this device takes part is the device's own choice
      sync: false,
      visible: () => Boolean(window.plugin?.sync),
    },
    {
      type: 'boolean',
      key: 'toolboxShortcuts',
      title: 'Shortcuts to settings pages in the toolbox',
      description: 'Buttons that open the pages of some plugins directly',
      default: true,
    },
    { type: 'heading', title: 'Backup' },
    {
      type: 'export',
      title: 'Export settings',
      description: 'Settings changed from their defaults, as text or a file',
      data: backup,
      filename: 'IITC-settings.json',
      dataType: 'application/json',
    },
    {
      type: 'import',
      title: 'Import settings',
      description: 'From text or a file; settings in the backup replace the ones here, and settings it lacks stay as they are',
      onData: restore,
      accept: '.json,application/json',
    },
  ],
});

// settings of older builds, kept as plain strings under keys of their own; each moves once, as a value the
// declaration accepts, and its key goes, so a value set back to the default later is not moved again
const LEGACY = [
  ['iitc-passcode-format', 'iitc.passcodeFormat', (format) => format],
  // 'true' records that the warning was dismissed for good
  ['pass-checking-intel-url', 'iitc.intelUrlWarning', (dismissed) => dismissed !== 'true'],
];
for (const [legacyKey, key, convert] of LEGACY) {
  const stored = localStorage.getItem(legacyKey);
  if (stored === null) continue;
  IITC.settings.set(key, convert(stored), { source: 'legacy' });
  localStorage.removeItem(legacyKey);
}
