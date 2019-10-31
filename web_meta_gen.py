#!/usr/bin/env python

"""Utility to generate meta.json for IITC-Button (https://github.com/IITC-CE/IITC-Button).

Can be run manually, or integrated with build process using localbuildsettings.py.
Sample content for localbuildsettings.py::

    builds = {
        'iitcbutton': {
            'post_build': ['web_meta_gen.py']
        },
    }
"""

import fnmatch
import io
import json
import os
from functools import partial

import settings


def parse_user_script(filename):
    data = {}
    with io.open(filename, 'r', encoding='utf-8-sig') as script:
        line = script.readline()
        if line != '// ==UserScript==\n':
            raise UserWarning('{}: Metablock not found'.format(filename))
        for line in script:
            if line == '// ==/UserScript==\n':
                return data
            try:
                rem, key, value = line.strip().split(None, 2)
            except ValueError:
                continue
            if rem == '//' and key[0] == '@':
                data[key[1:]] = value

        raise UserWarning('{}: Metablock ending not found'.format(filename))


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


def gen_meta(source, target=None):
    print('Generating meta for build: {.build_name}'.format(settings))
    build_dir = partial(os.path.join, source)
    plugins_dir = partial(os.path.join, build_dir('plugins'))
    target = target or build_dir('meta.json')

    meta = {}
    for filename in fnmatch.filter(os.listdir(plugins_dir()), '*.user.js'):
        info = parse_user_script(plugins_dir(filename))
        add_to_meta(meta, info, filename)

    iitc = parse_user_script(build_dir('total-conversion-build.user.js'))
    data = {
        'categories': meta,
        'iitc_version': iitc['version'],
    }
    with io.open(target, 'w', encoding='utf8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def iitc_build(source, outdir):
    gen_meta(outdir)


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)

    parser.add_argument('build', type=str, nargs='?',
                        help='Specify build name')
    args = parser.parse_args()

    try:
        settings.load(args.build)
    except ValueError as err:
        parser.error(err)

    source = settings.build_target_dir
    if not os.path.isdir(source):
        parser.error('Directory not found: {}'.format(source))

    try:
        gen_meta(source)
    except UserWarning as err:
        parser.error(err)
