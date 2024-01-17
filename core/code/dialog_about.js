/* global script_info, app, log, L */
/**
 * @file This file contains functions related to the 'About IITC' dialog.
 * @module dialog_about
 */

/**
 * Displays the 'About IITC' dialog.
 * This dialog includes the IITC version, a list of loaded plugins, and other relevant information.
 *
 * @function
 */
window.aboutIITC = function() {
  var html = createDialogContent();

  dialog({
    title: 'IITC ' + getIITCVersion(),
    id: 'iitc-about',
    html: html,
    width: 'auto',
    dialogClass: 'ui-dialog-aboutIITC'
  });
}

/**
 * Creates the content for the 'About IITC' dialog.
 *
 * @function
 * @returns {string} HTML content for the about dialog.
 */
function createDialogContent() {
  var html = `<div><b>About IITC</b></div>
              <div>Ingress Intel Total Conversion</div>
              <hr>
              <div>
               <a href="${'@url_homepage@'}" target="_blank">IITC Homepage</a> |
               <a href="${'@url_tg@'}" target="_blank">Telegram channel</a><br />
               On the script’s homepage you can:
               <ul>
                 <li>Find Updates</li>
                 <li>Get Plugins</li>
                 <li>Report Bugs</li>
                 <li>Contribute!</li>
               </ul>
              </div>
              <hr>
              <div>Version: ${getIITCVersion()} ${createChangelog(window.script_info)}</div>`;

  if (isShortOnLocalStorage()) {
    html += '<div class="warning">You are running low on LocalStorage memory.<br/>Please free some space to prevent data loss.</div>';
  }

  if (window.isApp && app.getVersionName) {
    html += '<div>IITC Mobile ' + app.getVersionName() + '</div>';
  }

  var plugins = getPlugins();
  if (plugins) {
    html += '<div><p>Plugins:</p><ul>' + plugins + '</ul></div>';
  }

  return html;
}

/**
 * Retrieves a list of plugins currently loaded in IITC. The list includes plugin names, versions, and descriptions.
 *
 * @function
 * @returns {string} Formatted list of plugins in HTML.
 */
function getPlugins() {
  var pluginsInfo = window.bootPlugins.info;

  while (window.bootPlugins[0]) {
    var plugin = window.bootPlugins.shift();
    pluginsInfo.push(plugin.info || {});
  }

  var extra = getIITCVersionAddition();

  var plugins = pluginsInfo.map(convertPluginInfo)
    .sort(function (a, b) { return a.name > b.name ? 1 : -1; })
    .map(function (p) { return pluginInfoToString(p, extra); })
    .join('\n');

  return plugins;
}

/**
 * Converts plugin information into a structured object for easier processing.
 *
 * @function
 * @param {Object} info - The plugin information object.
 * @param {number} index - The index of the plugin in the array.
 * @returns {Object} Structured plugin information.
 */
function convertPluginInfo(info, index) {
  // Plugins metadata come from 2 sources:
  // - buildName, pluginId, dateTimeVersion: inserted in plugin body by build script
  //   (only standard plugins)
  // - script.name/version/description: from GM_info object, passed to wrapper
  //   `script` may be not available if userscript manager does not provede GM_info
  //   (atm: IITC-Mobile for iOS)
  var result = {
    build: info.buildName,
    changelog: info.changelog,
    id: info.pluginId,
    name: info.pluginId,
    date: info.dateTimeVersion,
    error: info.error,
    version: undefined,
    description: undefined
  };

  var script = info.script;
  if (script) {
    if (typeof script.name === 'string') {
      result.name = script.name.replace(/^IITC[\s-]+plugin:\s+/i, ''); // cut non-informative name part
    }
    result.version = script.version;
    result.description = script.description;
  }

  if (!result.name) {
    if (script_info.script) { // check if GM_info is available
      result.name = '[unknown plugin: index ' + index + ']';
      result.description = "this plugin does not have proper wrapper; report to it's author";
    } else { // userscript manager fault
      result.name = '[3rd-party plugin: index ' + index + ']';
    }
  }

  return result;
}

/**
 * Creates a changelog section for a given plugin.
 *
 * @function
 * @param {Object} plugin - The plugin for which to create the changelog.
 * @returns {string} HTML string representing the changelog.
 */
function createChangelog(plugin) {
  var id = 'plugin-changelog-' + plugin.id;
  return (
    `<a onclick="$('#${id}').toggle()">changelog</a>` +
    `<ul id="${id}" style="display: none;">` +
    plugin.changelog
      .map(function (logEntry) {
        return (
          '<li>' +
          logEntry.version +
          '<ul>' +
          logEntry.changes
            .map(function (change) {
              return `<li>${change}</li>`;
            })
            .join('') +
          '</ul></li>'
        );
      })
      .join('') +
    '</ul>'
  );
}

/**
 * Converts plugin information into a string format suitable for display in the 'About IITC' dialog.
 *
 * @function
 * @param {Object} p - The plugin information object.
 * @param {string} extra - Additional version information.
 * @returns {string} Formatted plugin information string.
 */
function pluginInfoToString(p, extra) {
  var info = {
    changelog: '',
    class: '',
    description: p.description || '',
    name: p.name,
    verinfo: formatVerInfo(p, extra)
  };

  if (isStandardPlugin(p)) {
    info.class += 'plugin-is-standard';
  }

  if (p.error) {
    info.class += ' plugin-error';
    info.description = p.error;
  }

  if (p.changelog) {
    info.changelog = createChangelog(p);
  }

  return L.Util.template('<li class="{class}" title="{description}">{name}{verinfo} {changelog}</li>', info);
}

/**
 * Checks if a given plugin is a standard plugin based on the build name and date.
 * Standard plugins are those that match the build and date of the main IITC script.
 *
 * @function
 * @param {Object} plugin - The plugin object to check.
 * @returns {boolean} True if the plugin is standard, false otherwise.
 */
function isStandardPlugin(plugin) {
  return (plugin.build === script_info.buildName && plugin.date === script_info.dateTimeVersion);
}

/**
 * Retrieves the IITC version string.
 *
 * @function
 * @returns {string} The IITC version string.
 */
function getIITCVersion() {
  var iitc = script_info;
  return (iitc.script && iitc.script.version || iitc.dateTimeVersion) + ' [' + iitc.buildName + ']';
}

/**
 * Extracts the additional version information from the IITC script version.
 *
 * @function
 * @returns {string} The additional version information, if any.
 */
function getIITCVersionAddition() {
  var extra = script_info.script && script_info.script.version.match(/^\d+\.\d+\.\d+(\..+)$/);
  return extra && extra[1];
}

/**
 * Formats version information for plugins and the main script.
 * If an 'extra' parameter is provided and matches the end of the version string, it is removed.
 * This is used to cut off a common timestamp appended to versions.
 * The function also prepares a tooltip showing the build number and date, if available.
 *
 * @function formatVerInfo
 * @param {Object} p - The plugin or script object containing version information.
 * @param {string} [extra] - An optional extra string to be removed from the version information.
 * @returns {string} Formatted version string with optional HTML tooltip.
 */
function formatVerInfo(p, extra) {
  if (p.version && extra) {
    var cutPos = p.version.length - extra.length;
    // cut extra version component (timestamp) if it is equal to main script's one
    if (p.version.substring(cutPos) === extra) {
      p.version = p.version.substring(0,cutPos);
    }
  }

  p.version = p.version || p.date;
  if (p.version) {
    var tooltip = [];
    if (p.build) { tooltip.push('[' + p.build + ']'); }
    if (p.date && p.date !== p.version) { tooltip.push(p.date); }
    return L.Util.template(' - <code{title}>{version}</code>', {
      title: tooltip[0] ? ' title="' + tooltip.join(' ') + '"' : '',
      version: p.version
    });
  }

  return '';
}

/**
 * Checks if the browser's local storage is running short on available space.
 * This function tries to write a specific amount of data to the local storage and captures any errors.
 * If an error occurs, it is an indication that the local storage has limited free space left.
 *
 * @function
 * @returns {boolean} Returns `true` if the local storage is running short on space, otherwise `false`.
 */
function isShortOnLocalStorage() {
  var MINIMUM_FREE_SPACE = 100000;
  try {
    localStorage.setItem('_MEM_CHECK_', '#'.repeat(MINIMUM_FREE_SPACE));
  } catch (e) {
    log.error('out of localstorage space', e);
    return true;
  }

  localStorage.removeItem('_MEM_CHECK_');
  return false;
}
