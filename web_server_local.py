#!/usr/bin/env python

"""Utility to start local webserver for specified build target."""

import os
import sys

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

from http.server import HTTPServer, SimpleHTTPRequestHandler
class HTTPServerExt(HTTPServer):
    """HTTPServer extended with additional named argument: base_path, which is the path you want to serve requests from."""
    def __init__(self, server_address, RequestHandlerClass=SimpleHTTPRequestHandler, base_path=None):
        self.base_path = base_path
        super().__init__(server_address, RequestHandlerClass)

    def finish_request(self, request, client_address):
        self.RequestHandlerClass(request, client_address, self, directory=self.base_path)

httpd = HTTPServerExt(('localhost', startWebServerPort), base_path=directory)
print('Update channel: %s\nServing at port %i' % (buildName, startWebServerPort))
try:
    httpd.serve_forever()
except KeyboardInterrupt:
    print('\nKeyboard interrupt received, exiting.')
    sys.exit(0)
