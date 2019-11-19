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
    return run_path(cmd)


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
        path = Path(cmd)
        if callable(cmd):
            cmd(source, target)
        elif path.suffix == '.py':
            module = run_python(path)
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
    build_plugin.process_file(source / iitc_script, outdir)

    outdir.joinpath('plugins').mkdir(parents=True, exist_ok=True)
    for filename in source.joinpath('plugins').glob('*.js'):
        build_plugin.process_file(filename, outdir / 'plugins', dist_path='plugins')

    run_cmds(settings.post_build, source, outdir)


def clean(directory):
    if directory.exists():
        shutil.rmtree(directory)


def backup(directory):
    if directory.exists():
        bak = directory.with_name(directory.name + '~')
        clean(bak)
        directory.replace(bak)


def backup_and_run():
    source = Path(settings.build_source_dir)
    target = Path(settings.build_target_dir)
    workdir = target.with_name('~')
    clean(workdir)
    workdir.mkdir(parents=True)

    iitc_build(source, workdir)

    backup(target)
    workdir.replace(target)


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
    while True:
        timestamp = max(p.stat().st_mtime for p in watch_list)
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
        except Exception:
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
        sources_root = Path(settings.build_source_dir).resolve()
        watch_list = [sources_root / path for path in settings.sources]

        target_root = Path(settings.build_target_dir).resolve()
        if (target_root in watch_list) or (target_root.parent in watch_list):
            parser.error(f'specified target location would cause endless cycle: {target_root}')

        print('IITC build: {.build_name} (watch mode)'.format(settings))
        watch(watch_list, backup_and_run, settings.watch_interval)
    else:
        print('IITC build: {.build_name}'.format(settings))
        try:
            backup_and_run()
        except UserWarning as err:
            parser.error(err)
