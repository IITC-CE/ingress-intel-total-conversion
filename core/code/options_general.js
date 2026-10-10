/* global IITC -- eslint */

/**
 * @file General options of IITC, declared as the `iitc` page. A module that owns a whole page
 *       declares it itself; this file declares the shared page for options of several core modules,
 *       and those modules only read and write the values. This file sorts right after options.js
 *       in the bundle, so the page exists before boot(), where core modules and plugin setups first
 *       read its values
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
