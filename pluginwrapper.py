# plugin wrapper code snippets. handled as macros, to ensure that
# 1. indentation caused by the "function wrapper()" doesn't apply to the plugin code body
# 2. the wrapper is formatted correctly for removal by the IITC Mobile android app

# putting everything in a wrapper function that in turn is placed in a
# script tag on the website allows us to execute in the site's context
# instead of in the Greasemonkey/Extension/etc. context.

# a cut-down version of GM_info is passed as a parameter to the script
# (not the full GM_info - it contains the ENTIRE script source!)

start = """
function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = '@build_name@';
plugin_info.dateTimeVersion = '@build_date@';
plugin_info.pluginId = '@plugin_id@';
//END PLUGIN AUTHORS NOTE

"""


setup = """
setup.info = plugin_info; //add the script info data to the function as a property
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();"""

end = """
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);

"""
