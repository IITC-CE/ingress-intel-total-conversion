#!/usr/bin/env python3

"""IITC main build script."""

import glob
import os
import shutil
from runpy import run_path

import build_plugin
import settings


def run_python(cmd):
    if not os.path.isfile(cmd) and not os.path.isabs(cmd):
        path = os.path.dirname(__file__)  # try script path instead cwd
        if path and not os.path.samefile(os.curdir, path):
            fullpath = os.path.join(path, cmd)
            if os.path.isfile(fullpath):
                cmd = fullpath
    if not os.path.isfile(cmd):
        raise UserWarning('no such file: {}'.format(cmd))
    return run_path(cmd)


def run_system(cmd):
    status = os.system(cmd)
    try:
        exit_code = os.WEXITSTATUS(status) if os.WIFEXITED(status) else -1
    except AttributeError:  # Windows
        exit_code = status
    if exit_code != 0:
        raise UserWarning('execution failed: {}'.format(cmd))


def run_cmds(cmds, source, target):
    for cmd in (cmds or []):
        if callable(cmd):
            cmd(source, target)
        elif os.path.splitext(cmd)[1] == '.py':
            module = run_python(cmd)
            if 'iitc_build' in module:
                module['iitc_build'](source, target)
        else:
            run_system(cmd.format(
                settings, settings, settings,  # just in case, to be able to access any 3 attributes directly
                source=source,
                target=target,
                settings=settings,
            ))


def iitc_build(source, outdir):
    run_cmds(settings.pre_build, source, outdir)

    iitc_script = 'total-conversion-build.js'
    build_plugin.process_file(os.path.join(source, iitc_script), outdir)

    plugins_outdir = os.path.join(outdir, 'plugins')
    if not os.path.isdir(plugins_outdir):
        os.mkdir(plugins_outdir)
    for filename in glob.glob(os.path.join(source, 'plugins', '*.js')):
        build_plugin.process_file(filename, plugins_outdir, dist_path='plugins')

    run_cmds(settings.post_build, source, outdir)


def clean(directory):
    if os.path.exists(directory):
        shutil.rmtree(directory)


def backup(directory):
    if os.path.exists(directory):
        bak = directory + '~'
        clean(bak)
        os.rename(directory, bak)


def backup_and_run():
    target_parent = os.path.join(settings.build_target_dir, os.pardir)
    workdir = os.path.join(os.path.normpath(target_parent), '~')
    clean(workdir)
    os.makedirs(workdir)

    iitc_build(settings.build_source_dir, workdir)

    outdir = settings.build_target_dir
    backup(outdir)
    os.rename(workdir, outdir)


def on_event(cmd):
    if not cmd:
        return
    elif callable(cmd):
        cmd()
    else:
        os.system(cmd)


def watch(watch_list, run, interval):
    from time import ctime, sleep
    from traceback import print_exc

    last_modified = 0
    while 1:
        timestamp = max(map(os.path.getmtime, watch_list))
        if timestamp == last_modified:
            try:
                sleep(interval)
            except KeyboardInterrupt:
                print('Keyboard interrupt received, exiting.')
                break
            else:
                continue
        last_modified = timestamp
        print('\nrebuild started [{}]'.format(ctime(last_modified)))
        try:
            run()
        except Exception as err:
            print_exc()
            on_event(settings.on_fail)
        else:
            on_event(settings.on_success)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('build', type=str, nargs='?',
                        help='Specify build name')
    parser.add_argument('--watch', action='store_true',
                        help='auto-rebuild on sources changes')
    args = parser.parse_args()

    try:
        settings.load(args.build)
    except ValueError as err:
        parser.error(err)

    if args.watch or settings.watch_mode:
        sources_root = os.path.abspath(settings.build_source_dir)
        watch_list = {sources_root}
        watch_list.update([os.path.join(sources_root, path) for path in settings.sources])

        target_root = os.path.abspath(settings.build_target_dir)
        target_parent = os.path.normpath(os.path.join(target_root, os.pardir))
        if {target_root, target_parent}.intersection(watch_list):
            # !!this check is not perfect: it does not consider case-insensitive file system
            parser.error('specified target location would cause endless cycle: {}'.format(target_root))

        print('IITC build: {} (watch mode)'.format(settings.build_name))
        watch(watch_list, backup_and_run, settings.watch_interval)
    else:
        print('IITC build: {}'.format(settings.build_name))
        try:
            backup_and_run()
        except UserWarning as err:
            parser.error(err)
