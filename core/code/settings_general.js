/* global IITC -- eslint */

/**
 * @file General settings of IITC, declared as the `iitc` page for settings of several core modules.
 *       This file sorts right after settings.js in the bundle, so the page exists before boot(), where
 *       core modules and plugin setups first read its values
 * @module settings_general
 */

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
