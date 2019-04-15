#!/usr/bin/env python

import re
import io
import sys
import os
import json
from time import sleep
from threading import Thread

# load settings file
from buildsettings import buildSettings

# load option local settings file
try:
    from localbuildsettings import buildSettings as localBuildSettings

    buildSettings.update(localBuildSettings)
except ImportError:
    pass

# load default build
try:
    from localbuildsettings import defaultBuild
except ImportError:
    defaultBuild = None

buildName = defaultBuild
startWebServerPort = 8000

# build name from command line
if len(sys.argv) == 2:  # argv[0] = program, argv[1] = buildname, len=2
    buildName = sys.argv[1]
elif len(sys.argv) == 3 and sys.argv[2].startswith('--port'):  # argv[0] = program, argv[1] = buildname, argv[2] = port, len=3
    buildName = sys.argv[1]
    startWebServer = True
    port = sys.argv[2].split('=')
    if len(port) == 2:
        startWebServerPort = int(port[1])

if buildName is None or buildName not in buildSettings:
    print("Usage: web-meta-run.py buildname")
    print("or")
    print("Usage: web-meta-run.py buildname --port=8000")
    print(" available build names: %s" % ', '.join(buildSettings.keys()))
    sys.exit(1)


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
        'filename': filename.replace(".meta.js", ".user.js"),
        'desc': info['@description'],
    })
    return meta


def readfile(fn):
    with io.open(fn, 'r', encoding='utf8') as f:
        return f.read()


def update_meta():
    build_timestamp = ''
    folder = "build/%s/" % buildName

    while 1:
        new_build_timestamp = readfile(folder + ".build-timestamp")
        if build_timestamp != new_build_timestamp:

            build_timestamp = new_build_timestamp
            print("Last generation of categories: %s" % build_timestamp)

            info = parse_user_script(readfile(folder + "total-conversion-build.user.js"))
            iitc_version = info['@version']

            plugins = os.listdir(folder + "plugins")
            plugins = filter(lambda x: x.endswith('.meta.js'), plugins)
            meta = {}
            for filename in plugins:
                script = readfile(folder + "plugins/" + filename)
                meta = add_plugin_to_meta(meta, filename, script)

            data = {
                buildName+'_plugins': meta,
                buildName+'_iitc_version': iitc_version
            }

            with open(buildName+'.json', 'w') as fp:
                json.dump(data, fp)

        sleep(5)


if __name__ == '__main__':
    worker = Thread(target=update_meta, daemon=True)
    worker.start()

    print('Update channel "%s" opened. Start a web server on port %i' % (buildName, startWebServerPort))

    try:
        # Python 2
        from SimpleHTTPServer import test
        sys.argv[1] = startWebServerPort
        test()
    except ImportError:
        # Python 3
        from http.server import test, SimpleHTTPRequestHandler
        test(HandlerClass=SimpleHTTPRequestHandler, port=startWebServerPort)