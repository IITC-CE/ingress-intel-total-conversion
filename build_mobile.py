#!/usr/bin/env python

"""Utility to build IITC-Mobile apk."""

import os
import shutil

import build_plugin
import settings

defaults = {
    'mobile_source'   : None,  # default: '<build_source_dir>/mobile'
    'gradle_buildtype': 'debug',
    'gradle_options'  : '',
    'gradle_buildfile': None,  # default: '<mobile_source>/build.gradle'
    'ignore_patterns' : [      # exclude desktop-only plugins from mobile assets
        'scroll-wheel-zoom-disable*', '*.meta.js',
    ],
}
iitc_script = 'total-conversion-build.user.js'
buildtypes = {'debug', 'release'}


def add_default_settings(build_source):
    for attr, default in defaults.items():
        if not hasattr(settings, attr):
            setattr(settings, attr, default)
    if not settings.mobile_source:
        assert build_source, 'Either mobile_source or build_source required'
        settings.mobile_source = os.path.join(build_source, 'mobile')


def exec_gradle(source):
    gradlew = os.path.join(source, 'gradlew')
    options = settings.gradle_options
    buildfile = settings.gradle_buildfile or os.path.join(source, 'build.gradle')
    buildtype = settings.gradle_buildtype
    if buildtype not in buildtypes:
        raise UserWarning('gradle_buildtype value must be in: {}'.format(', '.join(buildtypes)))
    build_action = 'assemble' + buildtype.capitalize()
    status = os.system('{} {} -b {} {}'.format(gradlew, options, buildfile, build_action))
    try:
        if not os.WIFEXITED(status):
            raise UserWarning('gradlew exited abnormally')
    except AttributeError:  # Windows
        exit_code = status
    else:                   # Unix
        exit_code = os.WEXITSTATUS(status)

    if exit_code != 0:
        raise UserWarning('gradlew returned {}'.format(exit_code))

    return os.path.join(source, 'app', 'build', 'outputs', 'apk', buildtype, 'app-{}.apk'.format(buildtype))


def build_mobile(source, scripts_dir, out_dir=None, out_name='IITC_Mobile.apk'):
    """Build IITC-Mobile apk file, embedding scripts from given directory."""
    assets_dir = os.path.join(source, 'assets')
    if os.path.exists(assets_dir):
        shutil.rmtree(assets_dir)
    os.makedirs(assets_dir)

    user_location_plug = os.path.join(source, 'plugins', 'user-location.js')
    build_plugin.process_file(user_location_plug, assets_dir)
    shutil.copy(os.path.join(scripts_dir, iitc_script), assets_dir)
    shutil.copytree(
        os.path.join(scripts_dir, 'plugins'),
        os.path.join(assets_dir, 'plugins'),
        ignore=shutil.ignore_patterns(*settings.ignore_patterns),
    )
    shutil.copy(
        exec_gradle(source),
        os.path.join(out_dir or scripts_dir, out_name),
    )


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

    directory = settings.build_target_dir
    if not os.path.isdir(directory):
        parser.error('Directory not found: {}'.format(directory))
    script_path = os.path.join(directory, iitc_script)
    if not os.path.isfile(script_path):
        parser.error('Main script not found: {}'.format(script_path))

    add_default_settings(settings.build_source_dir)
    try:
        build_mobile(settings.mobile_source, directory)
    except UserWarning as err:
        parser.error('mobile app failed to build\n{}'.format(err))
