/* global IITC -- eslint */

/**
 * @file General options of IITC, declared as the `iitc` page for options of several core modules.
 *       This file sorts right after options.js in the bundle, so the page exists before boot(), where
 *       core modules and plugin setups first read its values
 * @module options_general
 */

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
    },
    {
      type: 'boolean',
      key: 'toolboxShortcuts',
      title: 'Shortcuts to options pages in the toolbox',
      description: 'Buttons that open the pages of some plugins directly',
      default: true,
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
