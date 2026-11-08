/* global IITC -- eslint */

/**
 * @file General options of IITC, declared as the `iitc` page for options of several core modules.
 *       This file sorts after options.js in the bundle, so the page exists before boot(), where
 *       core modules and plugin setups first read its values
 */

// the text of a backup file: the stored values of all declared options
const backup = () => JSON.stringify(IITC.options.exportValues(), null, 2);

// stores the values of a backup, and tells what was left out
const restore = (text) => {
  let values;
  try {
    values = JSON.parse(text);
  } catch {
    values = undefined;
  }
  if (values === null || typeof values !== 'object' || Array.isArray(values)) throw new Error('This is not an options backup');

  const { applied, rejected, skipped } = IITC.options.importValues(values);
  const total = applied.length + rejected.length + skipped.length;
  let report = `Imported ${applied.length} of ${total} options.`;
  // options of plugins that are not installed here
  if (skipped.length) report += ` Not declared by any plugin here: ${skipped.join(', ')}.`;
  if (rejected.length) report += ` Not allowed or not stored: ${rejected.join(', ')}.`;
  return report;
};

IITC.options.register('iitc', {
  title: 'General',
  blocks: [
    {
      type: 'select',
      key: 'passcodeFormat',
      title: 'Passcode rewards',
      choices: [
        { value: 'long', label: 'Long' },
        { value: 'short', label: 'Short' },
      ],
      default: 'long',
    },
    {
      type: 'boolean',
      key: 'syncOptions',
      title: 'Sync IITC options',
      default: true,
      // whether this device takes part is the device's own choice
      sync: false,
      visible: () => Boolean(window.plugin?.sync),
    },
    {
      type: 'boolean',
      key: 'toolboxShortcuts',
      title: 'Shortcuts to options pages in the toolbox',
      description: 'Buttons that open the pages of some plugins directly',
      default: true,
    },
    {
      type: 'boolean',
      key: 'optionsPane',
      title: 'Options in a panel of the app',
      description: 'Otherwise a link in the toolbox opens them in a window over the map. The panel stays in the app menu until reload',
      default: true,
      visible: () => window.useAppPanes(),
    },
    { type: 'heading', title: 'Backup' },
    {
      type: 'export',
      title: 'Export options',
      description: 'Options changed from their defaults, as text or a file',
      data: backup,
      filename: 'IITC-options.json',
      dataType: 'application/json',
    },
    {
      type: 'import',
      title: 'Import options',
      description: 'From text or a file; options in the backup replace the ones here, and options it lacks stay as they are',
      onData: restore,
      accept: '.json,application/json',
    },
  ],
});

// options of older builds, kept as plain strings under keys of their own; each moves once, converted, and
// its key goes, so a value set back to the default later is not moved again
const LEGACY = [
  ['iitc-passcode-format', 'iitc.passcodeFormat', (format) => format],
  // 'true' records that the warning was dismissed for good
  ['pass-checking-intel-url', 'iitc.intelUrlWarning', (dismissed) => dismissed !== 'true'],
];
for (const [legacyKey, key, convert] of LEGACY) {
  const stored = localStorage.getItem(legacyKey);
  if (stored === null) continue;
  IITC.options.set(key, convert(stored), { source: 'legacy' });
  localStorage.removeItem(legacyKey);
}
