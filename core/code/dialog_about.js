/* global script_info, app, log, L */

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

function createDialogContent() {
  var html = ''
    + '<div><b>About IITC</b></div> '
    + '<div>Ingress Intel Total Conversion</div> '
    + '<hr>'
    + '<div>'
    + '  <a href="'+'@url_homepage@'+'" target="_blank">IITC Homepage</a> |'
    + '  <a href="'+'@url_tg@'+'" target="_blank">Telegram channel</a><br />'
    + '   On the script’s homepage you can:'
    + '   <ul>'
    + '     <li>Find Updates</li>'
    + '     <li>Get Plugins</li>'
    + '     <li>Report Bugs</li>'
    + '     <li>Contribute!</li>'
    + '   </ul>'
    + '</div>'
    + '<hr>'
    + '<div>Version: ' + getIITCVersion() + '</div>';

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


function getPlugins() {
  var pluginsInfo = window.bootPlugins.info;

  var extra = getIITCVersionAddition();

  var plugins = pluginsInfo.map(convertPluginInfo)
    .sort(function (a, b) { return a.name > b.name ? 1 : -1; })
    .map(function (p) { return pluginInfoToString(p, extra); })
    .join('\n');

  return plugins;
}

function convertPluginInfo(info, index) {
  // Plugins metadata come from 2 sources:
  // - buildName, pluginId, dateTimeVersion: inserted in plugin body by build script
  //   (only standard plugins)
  // - script.name/version/description: from GM_info object, passed to wrapper
  //   `script` may be not available if userscript manager does not provede GM_info
  //   (atm: IITC-Mobile for iOS)
  var result = {
    build: info.buildName,
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

function pluginInfoToString(p, extra) {
  var info = {
    style: '',
    description: p.description || '',
    name: p.name,
    verinfo: formatVerInfo(p, extra)
  };

  if (isStandardPlugin(p)) {
    info.style += 'color:darkgray;';
  }

  if (p.error) {
    info.style += 'text-decoration:line-through;';
    info.description = p.error;
  }

  return L.Util.template('<li style="{style}" title="{description}">{name}{verinfo}</li>', info);
}


function isStandardPlugin(plugin) {
  return (plugin.build === script_info.buildName && plugin.date === script_info.dateTimeVersion);
}


function getIITCVersion() {
  var iitc = script_info;
  return (iitc.script && iitc.script.version || iitc.dateTimeVersion) + ' [' + iitc.buildName + ']';
}


function getIITCVersionAddition() {
  var extra = script_info.script && script_info.script.version.match(/^\d+\.\d+\.\d+(\..+)$/);
  return extra && extra[1];
}


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
