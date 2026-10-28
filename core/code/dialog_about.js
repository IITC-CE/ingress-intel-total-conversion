/* global IITC, log -- eslint */

/**
 * @file The 'About IITC' page of the settings window: versions, links, the changelog and the list
 *       of plugins with their changelogs. Plugins that failed to start are marked as such, and the
 *       standard ones, built together with IITC, are shown as secondary
 * @module dialog_about
 */

/**
 * Plugin information as the page lists it
 *
 * @private
 * @typedef {Object} PluginInfo
 * @property {string} name - Name without the 'IITC plugin:' prefix
 * @property {string} [version] - Version, without the build timestamp it shares with IITC
 * @property {string} [details] - Build name and date, when they say more than the version
 * @property {string} [description]
 * @property {*} [error] - What stopped the plugin's setup
 * @property {boolean} standard - Built together with this IITC
 * @property {Array} [changelog] - Entries `{version, changes}`
 */

/**
 * Retrieves the IITC version string
 *
 * @private
 * @returns {string} The IITC version string
 */
const getIITCVersion = () => {
  const iitc = window.script_info;
  return `${iitc.script?.version || iitc.dateTimeVersion} [${iitc.buildName}]`;
};

// the build timestamp ending the IITC version ('.20240101.000000'), shared by the standard plugins
const getIITCVersionAddition = () => window.script_info.script?.version.match(/^\d+\.\d+\.\d+(\..+)$/)?.[1];

/**
 * Turns the information a plugin was loaded with into what the page shows
 *
 * @private
 * @param {Object} info - Plugin information from boot
 * @param {number} index - Position of the plugin in the boot order
 * @returns {PluginInfo}
 */
const convertPluginInfo = (info, index) => {
  // Plugins metadata come from 2 sources:
  // - buildName, pluginId, dateTimeVersion: inserted in plugin body by build script
  //   (only standard plugins)
  // - script.name/version/description: from GM_info object, passed to wrapper
  //   `script` may be not available if userscript manager does not provide GM_info
  //   (atm: IITC-Mobile for iOS)
  const script = info.script;
  let name = typeof script?.name === 'string' ? script.name.replace(/^IITC[\s-]+plugin:\s+/i, '') : info.pluginId;
  let description = script?.description;
  if (!name) {
    if (window.script_info.script) {
      // GM_info is available, so the plugin lacks the wrapper
      name = `[unknown plugin: index ${index}]`;
      description = "this plugin does not have proper wrapper; report to it's author";
    } else {
      // userscript manager fault
      name = `[3rd-party plugin: index ${index}]`;
    }
  }

  let version = script?.version;
  const extra = getIITCVersionAddition();
  // the timestamp all standard plugins share with IITC says nothing
  if (version && extra && version.endsWith(extra)) version = version.slice(0, -extra.length);
  version = version || info.dateTimeVersion;
  const details = [info.buildName && `[${info.buildName}]`, info.dateTimeVersion !== version && info.dateTimeVersion].filter(Boolean).join(' ');

  return {
    name,
    version,
    details: details || undefined,
    description,
    error: info.error,
    standard: info.buildName === window.script_info.buildName && info.dateTimeVersion === window.script_info.dateTimeVersion,
    changelog: info.changelog,
  };
};

// changelog entries as list entries, versions holding their changes
const changelogItems = (changelog) =>
  (changelog ?? []).map((entry) => ({ title: String(entry.version), items: (entry.changes ?? []).map((change) => ({ title: String(change) })) }));

/**
 * Lists the plugins loaded, by name
 *
 * @private
 * @returns {Array<Object>} Entries of a `list` block
 */
const pluginItems = () => {
  const pluginsInfo = window.bootPlugins.info;
  // plugins that have not run their setup yet are listed as they are
  while (window.bootPlugins[0]) {
    pluginsInfo.push(window.bootPlugins.shift().info || {});
  }

  return pluginsInfo
    .map(convertPluginInfo)
    .sort((a, b) => (a.name > b.name ? 1 : -1))
    .map((plugin) => {
      const state = plugin.error ? 'error' : plugin.standard ? 'muted' : undefined;
      const tooltip = [plugin.error ? String(plugin.error) : plugin.description, plugin.details].filter(Boolean).join('\n');
      return {
        title: plugin.name,
        badge: plugin.version,
        tooltip: tooltip || undefined,
        state,
        items: plugin.changelog ? changelogItems(plugin.changelog) : undefined,
        collapsed: true,
      };
    });
};

/**
 * Checks if the browser's local storage is running short on available space.
 * This function tries to write a specific amount of data to the local storage and captures any errors.
 * If an error occurs, it is an indication that the local storage has limited free space left.
 *
 * @private
 * @returns {boolean} Returns `true` if the local storage is running short on space, otherwise `false`.
 */
const isShortOnLocalStorage = () => {
  const MINIMUM_FREE_SPACE = 100000;
  try {
    localStorage.setItem('_MEM_CHECK_', '#'.repeat(MINIMUM_FREE_SPACE));
  } catch (e) {
    log.error('out of localstorage space', e);
    return true;
  }

  localStorage.removeItem('_MEM_CHECK_');
  return false;
};

/**
 * Declares the `about` page of the settings window; called at boot
 *
 * @memberof IITC.about
 */
const setup = () => {
  IITC.settings.register('about', {
    title: 'About IITC',
    shortcut: { class: 'cursor_help' },
    blocks: [
      { type: 'text', text: () => `Ingress Intel Total Conversion ${getIITCVersion()}` },
      {
        type: 'text',
        // called also while the block is hidden
        text: () => `IITC Mobile ${window.app?.getVersionName?.()}`,
        visible: () => Boolean(window.isApp && window.app?.getVersionName),
      },
      {
        type: 'notice',
        level: 'warning',
        text: 'You are running low on LocalStorage memory. Please free some space to prevent data loss.',
        visible: isShortOnLocalStorage,
      },
      { type: 'link', title: 'IITC Homepage', url: '@url_homepage@' },
      { type: 'link', title: 'Telegram channel', url: '@url_tg@' },
      { type: 'text', text: 'On the homepage you can find updates, get plugins, report bugs and contribute.' },
      { type: 'list', items: () => [{ title: 'Changelog', items: changelogItems(window.script_info.changelog), collapsed: true }] },
      { type: 'heading', title: 'Plugins' },
      { type: 'list', items: pluginItems },
    ],
  });
};

/**
 * The 'About IITC' page
 *
 * @memberof IITC
 * @namespace about
 */
IITC.about = { setup, _convertPluginInfo: convertPluginInfo };
