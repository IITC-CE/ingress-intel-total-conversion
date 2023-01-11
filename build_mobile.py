#!/usr/bin/env python3

"""Utility to build IITC-Mobile apk."""

import os
import shutil
from pathlib import Path

import build_plugin
import settings

defaults = {
    'mobile_source'   : None,  # default: '<build_source_dir>/mobile'
    'gradle_buildtype': 'debug',
    'gradle_options'  : '',
    'gradle_buildfile': None,  # default: '<mobile_source>/build.gradle'
    'gradle_distributiontypes': ['apk'],
    'ignore_patterns' : [      # exclude desktop-only plugins from mobile assets
        'scroll-wheel-zoom-disable*', '*.meta.js',
    ],
}
iitc_script = 'total-conversion-build.user.js'
buildtypes = {'debug', 'beta', 'release', 'copyonly'}
distributiontypes = {'apk', 'aab'}


def add_default_settings(build_source):
    for attr, default in defaults.items():
        if not hasattr(settings, attr):
            setattr(settings, attr, default)
    if settings.mobile_source:
        settings.mobile_source = Path(settings.mobile_source)
    else:
        assert build_source, 'Either mobile_source or build_source required'
        settings.mobile_source = build_source / 'mobile'


def exec_gradle(source, dist_ext):
    gradlew = source / 'gradlew'
    options = settings.gradle_options
    buildfile = settings.gradle_buildfile or source / 'build.gradle'
    buildtype = settings.gradle_buildtype
    build_file_name = f'app--{buildtype}.{dist_ext}'
    if buildtype not in buildtypes:
        raise UserWarning('gradle_buildtype value must be in: {}'.format(', '.join(buildtypes)))

    if dist_ext == 'apk':
        build_folder_name = 'apk'
        build_action = 'assemble' + buildtype.capitalize()
        build_file_name = f'app-{buildtype}.{dist_ext}'
    elif dist_ext == 'aab':
        build_folder_name = 'bundle'
        build_action = build_folder_name + buildtype.capitalize()
        build_file_name = 'app.' + dist_ext
    else:
        raise UserWarning(f'Unknown value in gradle_distributiontypes: {dist_ext}')

    status = os.system('{} {} -b {} {}'.format(gradlew, options, buildfile, build_action))
    try:
        if not os.WIFEXITED(status):
            raise UserWarning('gradlew exited abnormally')
    except AttributeError:  # Windows
        exit_code = status
    else:                   # Unix
        exit_code = os.WEXITSTATUS(status)

    if exit_code != 0:
        raise UserWarning(f'gradlew returned {exit_code}')

    return source / 'app/build/outputs' / build_folder_name / buildtype / build_file_name


def build_mobile(source, scripts_dir, out_dir=None, out_name=None):
    """Build IITC-Mobile apk/aab file, embedding scripts from given directory."""
    assets_dir = source / 'assets'
    if assets_dir.exists():
        shutil.rmtree(assets_dir)

    shutil.copytree(
        scripts_dir,
        assets_dir,
        ignore=shutil.ignore_patterns(*settings.ignore_patterns),
    )
    user_location_plug = source / 'plugins' / 'user-location.js'
    build_plugin.process_file(user_location_plug, assets_dir)

    if settings.gradle_buildtype == 'copyonly':
        return

    for dist_ext in settings.gradle_distributiontypes:
        if dist_ext not in distributiontypes:
            raise UserWarning('gradle_distributiontypes value must be in: {}'.format(', '.join(distributiontypes)))

        app = exec_gradle(source, dist_ext)
        out_appname = out_name or 'IITC_Mobile-{.build_name}.{}'.format(settings, dist_ext)
        out_dir = out_dir or scripts_dir
        shutil.copy(app, out_dir / out_appname)

        if dist_ext == 'apk':
            shutil.copy(app.with_name('version_fdroid.txt'), out_dir)


def iitc_build(iitc_source, build_outdir):
    add_default_settings(iitc_source)
    build_mobile(settings.mobile_source, build_outdir)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('build', type=str, nargs='?',
                        help='Specify build name')
    args = parser.parse_args()

    try:
        settings.load(args.build)
    except ValueError as err:
        parser.error(err)

    directory = Path(settings.build_target_dir)
    if not directory.is_dir():
        parser.error(f'Directory not found: {directory}')
    script_path = directory / iitc_script
    if not script_path.is_file():
        parser.error(f'Main script not found: {script_path}')

    add_default_settings(Path(settings.build_source_dir))
    try:
        build_mobile(settings.mobile_source, directory)
    except UserWarning as err:
        parser.error(f'mobile app failed to build\n{err}')
