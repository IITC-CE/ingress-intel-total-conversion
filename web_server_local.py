#!/usr/bin/env python

"""Utility to start local webserver for specified build target."""

import os
import sys
from functools import partial

# argv[0] = program, argv[1] = buildname, len=2
if len(sys.argv) == 1: # load defaultBuild from settings file
    try:
        from localbuildsettings import defaultBuild as buildName
    except ImportError:
        sys.stderr.write('Usage: %s buildname [--port=8000]' % os.path.basename(sys.argv[0]))
        sys.exit(2)
else: # build name from command line
    buildName = sys.argv[1]

directory = os.path.join(os.getcwd(), 'build', buildName)
if not os.path.isdir(directory):
    sys.stderr.write('Directory not found: %s' % directory)
    sys.exit(1)

startWebServerPort = 8000
if len(sys.argv) >= 3:
    port = sys.argv[2].split('=')
    if len(port) == 2:
        startWebServerPort = int(port[1])

if sys.version_info < (3,7):
    sys.stderr.write('Error: Python at least version 3.7 required')
    sys.exit(2)

from http.server import test, SimpleHTTPRequestHandler
handler_class = partial(SimpleHTTPRequestHandler, directory=directory)
print('Update channel: %s' % buildName)
test(HandlerClass=handler_class, port=startWebServerPort, bind='localhost')
