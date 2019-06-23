#!/usr/bin/env python

import os
import sys

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


if __name__ == '__main__':
    print('Update channel "%s" opened. Start a web server on port %i' % (buildName, startWebServerPort))

    os.chdir(os.path.join(os.getcwd(), 'build', buildName))

    try:
        # Python 2
        from SimpleHTTPServer import test
        sys.argv[1] = startWebServerPort
        test()
    except ImportError:
        # Python 3
        from http.server import test, SimpleHTTPRequestHandler
        test(HandlerClass=SimpleHTTPRequestHandler, port=startWebServerPort)