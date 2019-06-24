#!/usr/bin/env python

import glob
import time
import re
import io
import base64
import sys
import os
import shutil
import json

try:
    import urllib2
except ImportError:
    import urllib.request as urllib2

# load settings file
from buildsettings import buildSettings

# load option local settings file
try:
    from localbuildsettings import buildSettings as localBuildSettings
except ImportError:
    localBuildSettings = {}

# load default build
try:
    from localbuildsettings import defaultBuild
except ImportError:
    defaultBuild = None


# plugin wrapper code snippets. handled as macros, to ensure that
# 1. indentation caused by the "function wrapper()" doesn't apply to the plugin code body
# 2. the wrapper is formatted correctly for removal by the IITC Mobile android app
pluginWrapperStart = """
function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = '@@BUILDNAME@@';
plugin_info.dateTimeVersion = '@@DATETIMEVERSION@@';
plugin_info.pluginId = '@@PLUGINNAME@@';
//END PLUGIN AUTHORS NOTE

"""

pluginWrapperStartUseStrict = pluginWrapperStart.replace("{\n", "{\n\"use strict\";\n", 1)

pluginWrapperEnd = """
setup.info = plugin_info; //add the script info data to the function as a property
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);

"""


pluginMetaBlock = """// @updateURL      @@UPDATEURL@@
// @downloadURL    @@DOWNLOADURL@@
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @include        https://intel.ingress.com/*
// @match          https://intel.ingress.com/*
// @grant          none"""


def readfile(fn):
    with io.open(fn, 'r', encoding='utf8') as f:
        return f.read()


def loader_string(var):
    fn = var.group(1)
    return readfile(fn).replace('\\', '\\\\').replace('\n', '\\\n').replace('\'', '\\\'')


def loader_css(fn):
    return re.sub('(?<=url\()([^)#]+)(?=\))', loader_image, loader_string(fn))


def loader_raw(var):
    fn = var.group(1)
    return readfile(fn)


def loader_image(var):
    fn = var.group(1)
    return 'data:image/png;base64,' + base64.b64encode(open(fn, 'rb').read()).decode('utf8')


def loader_svg(var):
    return 'data:svg+xml;utf8,' + loader_string(var)


def load_code(ignore):
    return '\n\n;\n\n'.join(map(readfile, sorted(glob.glob('code/*.js'))))


def extract_userscript_meta(var):
    m = re.search(r"//[ \t]*==UserScript==\n.*?//[ \t]*==/UserScript==\n", var, re.MULTILINE | re.DOTALL)
    return m.group(0)


def do_replacements(script, update_url, download_url, plugin_name=None):
    script = re.sub('@@INJECTCODE@@', load_code, script)

    script = script.replace('@@METAINFO@@', pluginMetaBlock)
    script = script.replace('@@PLUGINSTART@@', pluginWrapperStart)
    script = script.replace('@@PLUGINSTART-USE-STRICT@@', pluginWrapperStartUseStrict)
    script = script.replace('@@PLUGINEND@@', pluginWrapperEnd)

    script = re.sub('@@INCLUDERAW:([0-9a-zA-Z_./-]+)@@', loader_raw, script)
    script = re.sub('@@INCLUDESTRING:([0-9a-zA-Z_./-]+)@@', loader_string, script)
    script = re.sub('@@INCLUDECSS:([0-9a-zA-Z_./-]+)@@', loader_css, script)
    script = re.sub('@@INCLUDEIMAGE:([0-9a-zA-Z_./-]+)@@', loader_image, script)
    script = re.sub('@@INCLUDESVG:([0-9a-zA-Z_./-]+)@@', loader_svg, script)

    script = script.replace('@@BUILDDATE@@', buildDate)
    script = script.replace('@@DATETIMEVERSION@@', dateTimeVersion)

    if resourceUrlBase:
        script = script.replace('@@RESOURCEURLBASE@@', resourceUrlBase)
    else:
        if '@@RESOURCEURLBASE@@' in script:
            raise Exception("Error: '@@RESOURCEURLBASE@@' found in script, but no replacement defined")

    script = script.replace('@@BUILDNAME@@', buildName)

    script = script.replace('@@UPDATEURL@@', update_url)
    script = script.replace('@@DOWNLOADURL@@', download_url)

    if plugin_name:
        script = script.replace('@@PLUGINNAME@@', plugin_name)

    return script


def save_script_and_meta(script, out_dir, filename):
    # copy from there instead of saving a new file

    fn = os.path.join(out_dir, filename)
    with io.open(fn, 'w', encoding='utf8') as f:
        f.write(script)

    metafn = fn.replace('.user.js', '.meta.js')
    if metafn != fn:
        with io.open(metafn, 'w', encoding='utf8') as f:
            meta = extract_userscript_meta(script)
            f.write(meta)


def parse_user_script(text):
    data = {}
    for line in text.split('\n'):
        if "==UserScript==" in line:
            continue
        if "==/UserScript==" in line:
            return data

        line = line.strip()
        sp = line.split()
        data[sp[1]] = ' '.join(sp[2:])


def get_iitc_version(script):
    info = parse_user_script(script)
    return info['@version']


def add_plugin_to_meta(meta, filename, script):
    info = parse_user_script(script)
    category = info.get('@category')
    if category:
        category = re.sub('[^A-z0-9 -]', '', category).strip()
    else:
        category = "Misc"

    if category not in meta:
        meta[category] = {
            'name': category,
            'desc': "",
            'plugins': []}

    meta[category]['plugins'].append({
        'name': info['@name'].replace("IITC plugin: ", "").replace("IITC Plugin: ", ""),
        'id': info['@id'],
        'version': info['@version'],
        'filename': filename,
        'desc': info['@description'],
    })
    return meta


def main():
    out_dir = os.path.join('build', buildName)
    
    # create the build output
    
    # first, delete any existing build - but keep it in a temporary folder for now
    old_dir = None
    if os.path.exists(out_dir):
        old_dir = out_dir + '~'
        if os.path.exists(old_dir):
            shutil.rmtree(old_dir)
        os.rename(out_dir, old_dir)
    
    # copy the 'dist' folder, if it exists
    if os.path.exists('dist'):
        # this creates the target directory (and any missing parent dirs)
        # FIXME? replace with manual copy, and any .css and .js files are parsed for replacement tokens?
        shutil.copytree('dist', out_dir)
    else:
        # no 'dist' folder - so create an empty target folder
        os.makedirs(out_dir)
    
    # run any preBuild commands
    for cmd in settings.get('preBuild', []):
        os.system(cmd)
    
    # load main.js, parse, and create main total-conversion-build.user.js
    main_script = readfile('main.js')
    
    download_url = distUrlBase and distUrlBase + '/total-conversion-build.user.js' or 'none'
    update_url = distUrlBase and distUrlBase + '/total-conversion-build.meta.js' or 'none'
    main_script = do_replacements(main_script, download_url, update_url)
    iitc_version = get_iitc_version(main_script)
    
    save_script_and_meta(main_script, out_dir, 'total-conversion-build.user.js')
    
    with io.open(os.path.join(out_dir, '.build-timestamp'), 'w') as f:
        f.write(u"" + time.strftime('%Y-%m-%d %H:%M:%S UTC', utcTime))
    
    # for each plugin, load, parse, and save output
    os.mkdir(os.path.join(out_dir, 'plugins'))
    
    meta = {}
    for fn in glob.glob("plugins/*.user.js"):
        script = readfile(fn)
    
        download_url = distUrlBase and distUrlBase + '/' + fn.replace("\\", "/") or 'none'
        update_url = distUrlBase and download_url.replace('.user.js', '.meta.js') or 'none'
        plugin_name = os.path.splitext(os.path.splitext(os.path.basename(fn))[0])[0]
        script = do_replacements(script, download_url, update_url, plugin_name)
        meta = add_plugin_to_meta(meta, plugin_name, script)
    
        save_script_and_meta(script, out_dir, fn)
    
    # if we're building mobile too
    if buildMobile:
        if buildMobile not in ['debug', 'release', 'copyonly']:
            raise Exception("Error: buildMobile must be 'debug' or 'release' or 'copyonly'")
    
        # compile the user location script
        fn = "user-location.user.js"
        script = readfile("mobile/plugins/" + fn)
        download_url = distUrlBase and distUrlBase + '/' + fn.replace("\\", "/") or 'none'
        update_url = distUrlBase and download_url.replace('.user.js', '.meta.js') or 'none'
        script = do_replacements(script, download_url, update_url, 'user-location')
    
        save_script_and_meta(script, out_dir, fn)
    
        # copy the IITC script into the mobile folder. create the folder if needed
        try:
            os.makedirs("mobile/assets")
        except OSError:
            pass
        shutil.copy(os.path.join(out_dir, "total-conversion-build.user.js"), "mobile/assets/total-conversion-build.user.js")
        # copy the user location script into the mobile folder.
        shutil.copy(os.path.join(out_dir, "user-location.user.js"), "mobile/assets/user-location.user.js")
        # also copy plugins
        try:
            shutil.rmtree("mobile/assets/plugins")
        except OSError:
            pass
        shutil.copytree(os.path.join(out_dir, "plugins"), "mobile/assets/plugins",
                        # do not include desktop-only plugins to mobile assets
                        ignore=shutil.ignore_patterns('*.meta.js',
                                                      'force-https*', 'speech-search*', 'basemap-cloudmade*',
                                                      'scroll-wheel-zoom-disable*'))
    
        if buildMobile != 'copyonly':
            # now launch 'ant' to build the mobile project
            buildAction = "assemble" + buildMobile.capitalize()
            retcode = os.system("mobile/gradlew %s -b %s %s" % (gradleOptions, gradleBuildFile, buildAction))
    
            if retcode != 0:
                print("Error: mobile app failed to build. gradlew returned %d" % retcode)
                exit(1)  # ant may return 256, but python seems to allow only values <256
            else:
                shutil.copy("mobile/app/build/outputs/apk/%s/app-%s.apk" % (buildMobile, buildMobile),
                            os.path.join(out_dir, "IITC_Mobile-%s.apk" % buildMobile))
    
    data = {
        'categories': meta,
        'iitc_version': iitc_version
    }
    with open(os.path.join(out_dir, 'meta.json'), 'w') as fp:
        json.dump(data, fp)
    
    # run any postBuild commands
    for cmd in settings.get('postBuild', []):
        os.system(cmd)


if __name__ == '__main__':

    buildSettings.update(localBuildSettings)
    buildName = defaultBuild

    # build name from command line
    if len(sys.argv) == 2:  # argv[0] = program, argv[1] = buildname, len=2
        buildName = sys.argv[1]

    if buildName is None or buildName not in buildSettings:
        print("Usage: build.py buildname")
        print(" available build names: %s" % ', '.join(buildSettings.keys()))
        sys.exit(1)

    settings = buildSettings[buildName]

    # set up vars used for replacements

    utcTime = time.gmtime()
    buildDate = time.strftime('%Y-%m-%d-%H%M%S', utcTime)
    # userscripts have specific specifications for version numbers - the above date format doesn't match
    dateTimeVersion = time.strftime('%Y%m%d.', utcTime) + time.strftime('%H%M%S', utcTime).lstrip('0')

    # extract required values from the settings entry
    resourceUrlBase = settings.get('resourceUrlBase')
    distUrlBase = settings.get('distUrlBase')
    buildMobile = settings.get('buildMobile')
    gradleOptions = settings.get('gradleOptions', '')
    gradleBuildFile = settings.get('gradleBuildFile', 'mobile/build.gradle')

    main()

# vim: ai si ts=4 sw=4 sts=4 et
