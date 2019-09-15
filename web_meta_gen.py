#!/usr/bin/env python

"""Utility to generate meta.json for IITC-Button (https://github.com/IITC-CE/IITC-Button).

Can be run manually, or integrated with build process using localbuildsettings.py.
Sample content for localbuildsettings.py::

    buildSettings = {
        'iitcbutton': {
            'postBuild': ['web_meta_gen']
        },
    }
"""

import fnmatch
import io
import json
import os
from functools import partial


def parse_user_script(text):
    data = {}
    for line in text.splitlines():
        if '==UserScript==' in line:
            continue
        if '==/UserScript==' in line:
            return data

        try:
            rem, key, value = line.strip().split(maxsplit=2)
        except ValueError:
            continue
        if rem == '//' and key[0] == '@':
            data[key[1:]] = value


def add_to_meta(meta, info, filename):
    data = {
        # mandatory fields
        'filename': filename,
        'id': info['id'],  # todo: https://github.com/IITC-CE/IITC-Button/issues/17
        'name': info['name'].replace('IITC plugin: ', ''),
    }
    # optional fields
    for key in ('namespace', 'description', 'version'):
        value = info.get(key)
        if value:
            data[key] = value

    category = info.get('category', 'Misc')
    if category not in meta:
        meta[category] = {'name': category, 'plugins': []}
    meta[category]['plugins'].append(data)


def readfile(fn):
    return io.open(fn, 'r', encoding='utf8').read()


def gen_meta(buildname, directory=None):
    print('Generating meta for build: ' + buildname)
    directory = directory or os.path.join(os.getcwd(), 'build', buildname)
    build_dir = partial(os.path.join, directory)
    plugins_dir = partial(os.path.join, build_dir('plugins'))

    meta = {}
    for filename in fnmatch.filter(os.listdir(plugins_dir()), '*.meta.js'):
        info = parse_user_script(readfile(plugins_dir(filename)))
        add_to_meta(meta, info, filename.replace('.meta.js', '.user.js'))

    iitc = parse_user_script(readfile(build_dir('total-conversion-build.user.js')))
    data = {
        'categories': meta,
        'iitc_version': iitc['version'],
    }
    with open(build_dir('meta.json'), 'w') as fp:
        json.dump(data, fp)


def iitc_build(buildname, settings):
    gen_meta(buildname)


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)

    parser.add_argument('buildname', type=str, nargs='?',
                        help='Specify build name')
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
        parser.error('Directory not found: ' + directory)

    gen_meta(args.buildname)
