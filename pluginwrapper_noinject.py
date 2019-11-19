# NOT FOR RELEASE BUILDS!
# Useful for debugging scripts in Tampermonkey.
# To set breakpoints switch to Web Developer Tools' Debugger/Sources tab
# and find related script in Tampermonkey's list of `userscript.html?id=<guid>`

from pluginwrapper import start, setup

end = """
} // wrapper end
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
wrapper(info); // call wrapper function directly (Tampermonkey only!)

"""
