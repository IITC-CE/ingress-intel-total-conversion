/* global IITC -- eslint */

/**
 * @file The `api-keys` page, where the user enters keys of the services that IITC and plugins load maps
 *       and data from. The page holds no fields of its own: the core and every plugin that uses a service
 *       extend it with a section named after the service, under the `api-keys` namespace, so each key reads
 *       as `api-keys.<service>` whichever plugin declared it
 */

IITC.options.register('api-keys', {
  title: 'API keys',
  blocks: [
    {
      type: 'text',
      text: 'Keys of the services that map layers and plugins use. A key of your own has its own request limit, not shared with other IITC users',
    },
  ],
});
