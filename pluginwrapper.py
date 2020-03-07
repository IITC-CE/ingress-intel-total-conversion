# plugin wrapper code snippets

# a cut-down version of GM_info is passed as a parameter to the script
# (not the full GM_info - it contains the ENTIRE script source!)

start = """
var plugin_info = (typeof GM_info === 'undefined') ? {} : (function (s) {
  ['version','name','description'].forEach(function (k) { s[k] = GM_info.script[k]; });
  return {scriptMetaStr:GM_info.scriptMetaStr, script:s};
}({}));

// PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
// (leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = '@build_name@';
plugin_info.dateTimeVersion = '@build_date@';
plugin_info.pluginId = '@plugin_id@';
// END PLUGIN AUTHORS NOTE

window = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
// ensure plugin framework is there, even if iitc is not yet loaded
window.plugin = window.plugin || function () {};

"""

setup = """

if (typeof setup !== 'function') {
  var setup = {}; plugin_info.error = 'setup is not a function';
}
setup.info = plugin_info;
(window.bootPlugins = window.bootPlugins || []).push(setup);
if (window.iitcLoaded) { setup(); }
"""

end = ''
