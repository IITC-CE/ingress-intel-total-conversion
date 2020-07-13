#!/usr/bin/env python3

"""IITC main build script."""

import os
import shutil
from pathlib import Path
from runpy import run_path

import build_plugin
import settings


def run_python(cmd):
    if not cmd.is_file():  # try script path instead cwd
        original = cmd
        cmd = Path(__file__).with_name(cmd)
        if not cmd.is_file():
            raise UserWarning(f'no such file: {original}')
    return run_path(str(cmd))


def run_system(cmd):
    status = os.system(cmd)
    try:
        exit_code = os.WEXITSTATUS(status) if os.WIFEXITED(status) else -1
    except AttributeError:  # Windows
        exit_code = status
    if exit_code != 0:
        raise UserWarning(f'execution failed: {cmd}')


def run_cmds(cmds, source, target):
    for cmd in (cmds or []):
        if callable(cmd):
            cmd(source, target)
        elif Path(cmd).suffix == '.py':
            module = run_python(Path(cmd))
            if 'iitc_build' in module:
                module['iitc_build'](source, target)
        else:
            run_system(cmd.format(
                settings, settings, settings,  # just in case, to be able to access any 3 attributes directly
                source=source,
                target=target,
                settings=settings,
            ))


def iitc_build(source, outdir, deps_list=None):
    run_cmds(settings.pre_build, source, outdir)

    iitc_script = 'core/total-conversion-build.js'
    build_plugin.process_file(source / iitc_script, outdir, deps_list=deps_list)

    outdir.joinpath('plugins').mkdir(parents=True, exist_ok=True)
    for filename in source.joinpath('plugins').glob('*.js'):
        build_plugin.process_file(
            filename,
            outdir / 'plugins',
            dist_path='plugins',
            deps_list=deps_list
        )

    run_cmds(settings.post_build, source, outdir)


def clean(directory):
    if directory.exists():
        shutil.rmtree(directory)


def backup(directory):
    if directory.exists():
        bak = directory.with_name(directory.name + '~')
        clean(bak)
        directory.replace(bak)


def backup_and_run(deps_list=None):
    source = Path(settings.build_source_dir)
    target = Path(settings.build_target_dir)
    workdir = target.with_name('~')
    clean(workdir)
    workdir.mkdir(parents=True)

    iitc_build(source, workdir, deps_list=deps_list)

    backup(target)
    workdir.replace(target)


def on_event(cmd):
    if not cmd:
        return
    elif callable(cmd):
        cmd()
    else:
        os.system(cmd)


def timestamp(watch_list, basetime):
    return sum(
        basetime-p.stat().st_mtime if p.exists() else 0
        for p in watch_list
    )


def watch(build_cb, *args, interval=1, **kwargs):
    """Initiate rebuild on source files changes.

    build_cb - building function, to be called on sources changes.

    interval - optional keyword argument, defines period (in seconds) between checks.

    Any other subsequent positional and/or keyword arguments will be passed to build_cb.

    Every found dependancy (to be watched for changes) build_cb must append
    to deps_list, which is passed to it as additional keyword argument.
    """
    from time import ctime, sleep, time
    from traceback import print_exc

    basetime = None
    last_stamp = None
    watch_list = None
    while True:
        if watch_list is not None and last_stamp == timestamp(watch_list, basetime):
            try:
                sleep(interval)
            except KeyboardInterrupt:
                print('Keyboard interrupt received, exiting.')
                break
            else:
                continue
        basetime = time()
        print('\nrebuild started [{}]'.format(ctime(basetime)))
        watch_list = []
        try:
            build_cb(*args, deps_list=watch_list, **kwargs)
        except Exception:
            print_exc()
            on_event(settings.on_fail)
        else:
            on_event(settings.on_success)
        if not watch_list:
            raise Exception('watch list is empty')
        last_stamp = timestamp(watch_list, basetime)


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
        print('IITC build: {.build_name} (watch mode)'.format(settings))
        watch(backup_and_run, interval=settings.watch_interval)
    else:
        print('IITC build: {.build_name}'.format(settings))
        try:
            backup_and_run()
        except UserWarning as err:
            parser.error(err)
