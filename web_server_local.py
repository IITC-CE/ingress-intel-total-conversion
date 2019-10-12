#!/usr/bin/env python

"""Utility to start local webserver for specified build target."""

import argparse
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, test

parser = argparse.ArgumentParser(description=__doc__)

parser.add_argument('buildname', type=str, nargs='?',
                    help='Specify build name')
parser.add_argument('--port', default=8000, type=int,
                    help='Specify alternate port [default: %(default)s]')

if sys.version_info < (3,7):
    parser.error('Python at least version 3.7 required')

args = parser.parse_args()

if not args.buildname:
    try:
        from localbuildsettings import defaultBuild
    except ImportError:
        parser.error('the following arguments are required: buildname')
    print('using defaults from localbuildsettings...')
    args.buildname = defaultBuild

directory = os.path.join(os.getcwd(), 'build', args.buildname)
if not os.path.isdir(directory):
    parser.error('Directory not found: {0}'.format(directory))

handler_class = partial(SimpleHTTPRequestHandler, directory=directory)
print('Update channel: {0}'.format(args.buildname))
test(HandlerClass=handler_class, port=args.port, bind='localhost')
