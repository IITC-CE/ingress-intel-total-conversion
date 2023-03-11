#!/usr/bin/env python3

"""Utility to generate meta.json for IITC-Button (https://github.com/IITC-CE/IITC-Button).

Can be run manually, or integrated with build process using localbuildsettings.py.
Sample content for localbuildsettings.py::

    builds = {
        'iitcbutton': {
            'post_build': ['web_meta_gen.py']
        },
    }
"""

import json
from pathlib import Path

import settings


def parse_user_script(filename):
    data = {}
    with filename.open('r', encoding='utf-8-sig') as script:
        line = script.readline()
        if line != '// ==UserScript==\n':
            raise UserWarning(f'{filename}: Metablock not found')
        for line in script:
            if line == '// ==/UserScript==\n':
                return data
            try:
                rem, key, value = line.strip().split(None, 2)
            except ValueError:
                continue
            if rem == '//' and key[0] == '@':
                data[key[1:]] = value

        raise UserWarning(f'{filename}: Metablock ending not found')


def add_to_meta(meta, info, filename):
    data = {
        # mandatory fields
        'filename': filename,
        'id': info['id'],  # todo: https://github.com/IITC-CE/IITC-Button/issues/17
        'name': info['name'].replace('IITC plugin: ', ''),
    }
    # optional fields
    for key in ('author', 'description', 'namespace', 'version', 'icon', 'icon64'):
        value = info.get(key)
        if value:
            data[key] = value

    category = info.get('category', 'Misc')
    if category not in meta:
        meta[category] = {'name': category}
    if 'plugins' not in meta[category]:
        meta[category]['plugins'] = []
    meta[category]['plugins'].append(data)


def gen_meta(source, target=None, categories=None):
    print('Generating meta for build: {.build_name}'.format(settings))
    target = target or source / 'meta.json'

    meta = json.loads(categories.read_text(encoding='utf8')) if categories else {}
    for filename in (source / 'plugins').glob('*.user.js'):
        info = parse_user_script(filename)
        add_to_meta(meta, info, filename.name)

    iitc = parse_user_script(source / 'total-conversion-build.user.js')
    data = {
        'categories': meta,
        'iitc_version': iitc['version'],
    }
    target.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding='utf8',
    )


def iitc_build(_, outdir):
    gen_meta(outdir, categories=settings.build_source_dir / 'plugins/categories.json')


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

    source = Path(settings.build_target_dir)
    if not source.is_dir():
        parser.error(f'Directory not found: {source}')

    try:
        gen_meta(source, categories=settings.build_source_dir / 'plugins/categories.json')
    except UserWarning as err:
        parser.error(err)
