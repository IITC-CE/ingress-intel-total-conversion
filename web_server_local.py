#!/usr/bin/env python3

"""Utility to start local webserver for specified build name."""

import argparse
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, test
from pathlib import Path

import settings

parser = argparse.ArgumentParser(description=__doc__)

parser.add_argument('build', type=str, nargs='?',
                    help='Specify build name')
parser.add_argument('--port', default=8000, type=int,
                    help='Specify alternate port [default: %(default)s]')
if sys.version_info < (3,7):
    parser.error('Python at least version 3.7 required')

args = parser.parse_args()

try:
    settings.load(args.build)
except ValueError as err:
    parser.error(err)

directory = Path(settings.build_target_dir)
if not directory.is_dir():
    parser.error(f'Directory not found: {directory}')

handler_class = partial(SimpleHTTPRequestHandler, directory=directory)
print(f'Update channel: {settings.build_name}')
test(HandlerClass=handler_class, port=args.port, bind='localhost')
