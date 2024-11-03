#!/usr/bin/env python3

"""Module to get settings for given iitc build name.

Defaults are taken from buildsettings.py, and extended with
values from localbuildsettings.py (if exists).
"""

import time

_build_date = None
_build_timestamp = None


def generate_timestamps():
    """Generate build date and timestamp in desired formats."""
    global _build_date, _build_timestamp

    utc = time.gmtime()
    _build_date = time.strftime('%Y-%m-%d-%H%M%S', utc)
    _build_timestamp = time.strftime('%Y%m%d.%H%M%S', utc)


def load(build_name, localfile=None):
    """Load settings for given iitc build name."""
    import buildsettings as config
    from pathlib import Path
    from runpy import run_path

    try:
        localsettings = run_path(localfile or config.localfile)
    except FileNotFoundError:
        if localfile:  # ignore for default file
            raise      # but raise for explicitely specified
        localfile = None
    else:
        localfile = localfile or config.localfile
        config.defaults.update(localsettings.get('defaults', {}))
        config.builds.update(localsettings.get('builds', {}))
        config.default_build = localsettings.get('default_build', None)

    build_name = build_name or config.default_build
    if not build_name:
        raise ValueError('build name not specified')
    if build_name not in config.builds:
        raise ValueError(
            'name not found in settings: {0}\n'
            '(available build names: {1})'
            .format(build_name, ', '.join(config.builds.keys())),
        )

    mod = vars(__import__(__name__))
    mod.pop('load')
    mod['build_name'] = build_name
    mod['build_date'] = lambda: _build_date
    mod['build_timestamp'] = lambda: _build_timestamp
    base = Path(localfile or __file__).parent
    mod['build_source_dir'] = base
    mod['build_target_dir'] = base / 'build' / build_name
    mod.update(config.defaults)
    mod.update(config.builds[build_name])
    mod['localfile'] = Path(localfile) if localfile else None


if __name__ == '__main__':
    import argparse
    from pprint import pprint

    import settings

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('build', type=str, nargs='?',
                        help='Specify build name')
    args = parser.parse_args()

    try:
        settings.load(args.build)
    except ValueError as err:
        parser.error(err)
    print('settings for build: {.build_name}'.format(settings))
    pprint({key: value for key, value in vars(settings).items()
           if not key.startswith('__')})  # skip private attributes
