#!/usr/bin/env python3

"""Helper utility to make Tampermonkey read userscripts from local disk.

Generates zipfile with bundle of script stubs without real code,
linking to actual userscripts location using @require directive.
Resulting file can be directly imported by Tampermonkey
(see Dashboard/Utilities/Zip/Import).

'Allow access to file URLs' toggle must be active on Tampermonkey extension page.
(open context menu on TM icon and choose 'Manage extensions' command)

Note:
Currently file access is working in Chrome only.
https://github.com/Tampermonkey/tampermonkey/issues/347#issuecomment-428460292
"""

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

import settings


def get_meta_from(source):
    with source.open(encoding='utf-8-sig') as script:
        meta = []
        line = script.readline()
        if line != '// ==UserScript==\n':
            raise UserWarning(f'{source}: Metablock not found')
        meta.append(line)
        for line in script:
            try:
                rem, key, _ = line.strip().split(maxsplit=2)
            except ValueError:
                pass
            else:
                if rem == '//' and key in ('@updateURL', '@downloadURL'):
                    continue
            meta.append(line)
            if line == '// ==/UserScript==\n':
                file_uri = source.resolve().as_uri()  # file:///c:/Windows
                meta.insert(-1, f'// @require        {file_uri}\n')
                return ''.join(meta)

        raise UserWarning(f'{source}: Metablock ending not found')


def make_zip(source, target=None):
    target = target or source / 'tampermonkey_iitc_dev_bundle.zip'
    with ZipFile(target, 'w', compression=ZIP_DEFLATED) as tm_bundle:
        print(f'writing {target}...')
        for userscript in source.rglob('*.user.js'):
            tm_bundle.writestr(userscript.name, get_meta_from(userscript))


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
        make_zip(source)
    except UserWarning as err:
        parser.error(err)
