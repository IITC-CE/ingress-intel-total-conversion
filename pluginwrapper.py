# plugin wrapper code snippets. handled as macros, to ensure that
# indentation caused by the wrapper function doesn't apply to the plugin code body

# putting everything in a wrapper function that in turn is placed in a
# script tag on the website allows us to execute in the site's context
# instead of in the Greasemonkey/Extension/etc. context.

# a cut-down version of GM_info is passed as a parameter to the script
# (not the full GM_info - it contains the ENTIRE script source!)

start = """
var wrapper = function (plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
window.plugin = window.plugin || function () {};

// PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
// (leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = '@build_name@';
plugin_info.dateTimeVersion = '@build_date@';
plugin_info.pluginId = '@plugin_id@';
// END PLUGIN AUTHORS NOTE

"""

setup = """
if (typeof setup !== 'function') {
  var setup = {}; plugin_info.error = 'setup is not a function';
}
setup.info = plugin_info;
(window.bootPlugins = window.bootPlugins || []).push(setup);
if (window.iitcLoaded) { setup(); }
"""

end = """
} // wrapper end
var plugin_info = (typeof GM_info === 'undefined') ? {} : (function (s) {
  ['version','name','description'].forEach(function (k) { s[k] = GM_info.script[k]; });
  return {scriptMetaStr:GM_info.scriptMetaStr, script:s};
}({}));
if (typeof unsafeWindow === 'undefined' || unsafeWindow === window) { return wrapper(plugin_info); }
// inject code into site context
var script = document.createElement('script');
script.append('('+ wrapper +')('+JSON.stringify(plugin_info)+');');
document.body.appendChild(script).remove();

"""