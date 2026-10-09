#!/usr/bin/env python3

"""Utility to build iitc plugin for given source file name."""

import base64
import json
import os
import re
import subprocess
import sys
import tempfile
from functools import partial
from importlib import import_module
from mimetypes import guess_type
from pathlib import Path
from typing import Iterable

import settings


_css_tempdir = None
_processed_css = {}


def get_module(name):
    sys.path.insert(0, '')  # temporary include cwd in modules search paths
    module = import_module(name)
    sys.path.pop(0)
    return module


def fill_meta(source, plugin_name, dist_path):
    meta = ['// ==UserScript==']
    keys = set()

    def append_line(key, value):
        if key not in keys:
            meta.append(f'// @{key:<14} {value}')

    is_main = False
    for line in source.splitlines():
        text = line.lstrip()
        rem = text[:2]
        if rem != '//':
            raise UserWarning(f'{plugin_name}: wrong line in metablock: {line}')
        text = text[2:].strip()
        try:
            key, value = text.split(None, 1)
        except ValueError:
            if text == '==UserScript==':
                raise UserWarning(f'{plugin_name}: wrong metablock detected')
        else:
            if key[0] == '@':
                key = key[1:]
            else:  # continue previous line
                meta[-1] += ' ' + text
                continue

            keys.add(key)
            if key == 'version':
                if not re.match(r'^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$', value):
                    print(f'{plugin_name}: wrong version format: {value}')  # expected: major.minor.patch
                elif settings.version_timestamp:  # append timestamp only for well-formed version
                    line = line.replace(value, '{ver}.{timestamp}'.format(ver=value, timestamp=settings.build_timestamp()))
            elif key == 'name':
                if value == 'IITC: Ingress intel map total conversion':
                    is_main = True
                else:
                    line = line.replace(value, 'IITC plugin: ' + value)
        meta.append(line)

    append_line('id', plugin_name)
    append_line('namespace', settings.namespace)

    if settings.url_dist_base:
        path = [settings.url_dist_base]
        if dist_path:
            path.append(dist_path)
        path.append(plugin_name)
        path = '/'.join(path)
        if settings.update_file in {'.user.js', '.meta.js'}:
            append_line('updateURL', path + settings.update_file)
        append_line('downloadURL', path + '.user.js')

    if keys.isdisjoint({'match', 'include'}):
        if isinstance(settings.match, str):
            settings.match = [settings.match]
        for m in settings.match:
            append_line('match', m)

    if settings.url_icon_base:
        append_line('icon', settings.url_icon_base.format(plugin_name))
    if settings.url_icon_64_base:
        append_line('icon64', settings.url_icon_64_base.format(plugin_name))

    append_line('grant', 'none')
    meta.append('// ==/UserScript==\n')
    return '\n'.join(meta), is_main


def multi_line(text):
    return ('\n' + text).replace('\\', r'\\').replace('\n', '\\\n').replace("'", r"\'")


def log_dependency(filename, deps_list=None):
    if deps_list is not None:
        deps_list.append(filename)


def readtext(filename):
    log_dependency(filename)
    return filename.read_text(encoding='utf-8-sig')


def readbytes(filename):
    log_dependency(filename)
    return filename.read_bytes()


def load_image(filename):
    mtype, _ = guess_type(str(filename))  # todo: after Python 3.8 mimetypes accepts PathLike too
    assert mtype, f'Failed to guess mimetype: {filename}'
    return 'data:{};base64,{}'.format(
        mtype,
        base64.b64encode(readbytes(filename)).decode('utf8'),
    )


def wrap_iife(filename):
    return """
// *** module: {.name} ***
(function () {{
var log = ulog('{.stem}');
{content}

}})();
""".format(filename, filename, content=readtext(filename))


def bundle_code(_, path=None):
    files = (path / 'code').glob('*.js')
    return '\n'.join(map(wrap_iife, sorted(files)))


def imgrepl(match, path=None):
    filename = match.group('filename')
    # skip absolut path files
    if re.match(r'^(?:[a-z][a-z0-9+.-]*:|//|/)', filename, re.IGNORECASE):
        return match.group(0)

    fullname = path / filename
    if not fullname.is_file():
        return match.group(0)
    return load_image(fullname)


def prepare_css(sources: Iterable[Path], deps_list=None):
    global _css_tempdir, _processed_css

    finish_css()
    source_root = settings.build_source_dir
    css_files = {}
    include_pattern = re.compile(r'@include_css:([\w./-]+)@')
    for source in sources:
        include_root = source.parent.parent if source.parent.name == 'code' else source.parent
        for include in include_pattern.findall(source.read_text(encoding='utf-8-sig')):
            filename = (include_root / include).resolve()
            if not filename.is_file():
                raise UserWarning(f'CSS file not found: {filename}')
            css_files[filename] = None

    if not css_files:
        return

    cli = source_root / 'node_modules' / '.bin' / 'lightningcss'
    if sys.platform == 'win32':
        cli = source_root / 'node_modules' / 'lightningcss-cli' / 'lightningcss.exe'
    if not cli.is_file():
        raise UserWarning('Lightning CSS CLI requires npm dependencies; run npm install')

    basenames = [filename.name for filename in css_files]
    if len(basenames) != len(set(basenames)):
        raise UserWarning('Lightning CSS CLI output filenames must be unique')

    env = None
    if settings.css_sourcemap:
        # parallel bundling misnumbers map sources, see parcel-bundler/lightningcss#1167
        env = {**os.environ, 'RAYON_NUM_THREADS': '1'}

    _css_tempdir = tempfile.TemporaryDirectory(prefix='iitc-lightningcss-')
    output_dir = Path(_css_tempdir.name)
    result = subprocess.run(
        [
            str(cli),
            '--bundle',
            # url() inlining would shift columns of single-line minified CSS
            '--sourcemap' if settings.css_sourcemap else '--minify',
            '--browserslist',
            '--output-dir',
            str(output_dir),
            *(str(filename) for filename in css_files),
        ],
        cwd=source_root,
        env=env,
        capture_output=True,
        check=False,
    )
    if result.returncode:
        finish_css()
        raise UserWarning(f'Lightning CSS processing failed:\n{result.stderr.decode()}')

    _processed_css = {filename: output_dir / filename.name for filename in css_files}
    for filename in css_files:
        if deps_list is not None:
            deps_list.append(filename)
            deps_list.extend(css_imports(filename))
    if deps_list is not None:
        deps_list.append(source_root / 'package.json')


def css_imports(filename):
    """Yield files bundled into given CSS file via @import (recursively)."""
    for imported in re.findall(r'@import\s+[\'"](.+?)[\'"]', filename.read_text(encoding='utf-8-sig')):
        imported = filename.parent / imported
        yield imported
        yield from css_imports(imported)


def finish_css():
    global _css_tempdir, _processed_css

    if _css_tempdir is not None:
        _css_tempdir.cleanup()
    _css_tempdir = None
    _processed_css = {}


def process_css(filename):
    log_dependency(filename)
    try:
        processed = _processed_css[filename.resolve()]
    except KeyError:
        raise UserWarning(f'CSS was not prepared for build: {filename}') from None
    css = processed.read_text(encoding='utf-8')
    sourcemap = processed.with_name(processed.name + '.map')
    if sourcemap.is_file():
        css = inline_sourcemap(css, sourcemap)
    return css


def inline_sourcemap(css, sourcemap):
    """Embed source map into CSS, with sources under iitc:///."""
    data = json.loads(sourcemap.read_text(encoding='utf-8'))
    data['sources'] = [f'iitc:///{Path(source).as_posix()}' for source in data['sources']]
    encoded = base64.b64encode(json.dumps(data, separators=(',', ':')).encode()).decode()
    css = re.sub(r'\s*/\*# sourceMappingURL=[^*]*\*/\s*$', '', css)
    return f'{css}\n/*# sourceMappingURL=data:application/json;base64,{encoded} */\n'


def expand_template(match, path=None):
    quote = "'%s'"
    kw, filename = match.groups()
    if not filename:
        value = getattr(settings, kw)
        if callable(value):
            value = value()
        return quote % value

    fullname = path / filename
    if kw == 'include_raw':
        return """// *** included: {filename} ***
{content}

""".format(filename=filename, content=readtext(fullname))
    elif kw == 'include_string':
        return quote % multi_line(readtext(fullname))
    elif kw == 'include_img':
        return quote % load_image(fullname)
    elif kw == 'include_css':
        pattern = r'(?<=url\()["\']?(?P<filename>[^)#]+?)["\']?(?=\))'
        css = re.sub(pattern, partial(imgrepl, path=fullname.parent), process_css(fullname))
        return quote % multi_line(css)


def process_file(source, out_dir, dist_path=None, deps_list=None):
    """Generate .user.js (and optionally .meta.js) from given source file.

    Resulted file(s) put into out_dir (if specified, otherwise - use current).

    dist_path component is for adding to @downloadURL/@updateURL.
    """
    global log_dependency
    log_dependency = partial(log_dependency, deps_list=deps_list)
    try:
        meta, script = readtext(source).split('\n\n', 1)
    except ValueError:
        raise Exception(f'{source}: wrong input: empty line expected after metablock')
    except (OSError, IOError) as e:
        print(f"{source}: {type(e).__name__}: {e}")
        return

    plugin_name = source.stem
    meta, is_main = fill_meta(meta, plugin_name, dist_path)
    settings.plugin_id = plugin_name

    path = source.parent  # used as root for all (relative) paths
    script = re.sub(r"\(?'@bundle_code@'\)?;", partial(bundle_code, path=path), script)
    try:
        script_before_wrapper, script = script.split('\n/*wrapped-from-here*/\n', 1)
    except ValueError:
        script_before_wrapper = ''

    wrapper = get_module(settings.plugin_wrapper)
    template = r"'@(\w+)(?::([\w./-]+))?@'"  # to find '@keyword[:path]@' patterns
    repl = partial(expand_template, path=path)
    data = [
        meta,
        script_before_wrapper,
        re.sub(template, repl, wrapper.start),
        re.sub(template, repl, script),
        wrapper.setup if not is_main else '',  # it's for plugins only
        wrapper.end,
    ]

    (out_dir / (plugin_name + '.user.js')).write_text(''.join(data), encoding='utf8')
    if settings.url_dist_base and settings.update_file == '.meta.js':
        (out_dir / (plugin_name + '.meta.js')).write_text(meta, encoding='utf8')


def plugin_build(source, out_dir, deps_list=None):
    """Build single plugin, with timestamps generated for this build."""
    settings.generate_timestamps()
    source_files = [source, *sorted((source.parent / 'code').glob('*.js'))]
    prepare_css(source_files, deps_list=deps_list)
    try:
        process_file(source, out_dir, deps_list=deps_list)
    finally:
        finish_css()


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('build', type=str, nargs='?',
                        help='Specify build name')
    parser.add_argument('source', type=Path,
                        help='Specify source file name')
    parser.add_argument('--out-dir', type=Path, nargs='?',
                        help='Specify out directory')
    parser.add_argument('--watch', action='store_true',
                        help='auto-rebuild on sources changes')
    args = parser.parse_args()

    try:
        settings.load(args.build)
    except ValueError as err:
        parser.error(err)

    if not args.source.is_file():
        parser.error('Source file not found: {.source}'.format(args))

    args.out_dir = args.out_dir or Path(settings.build_target_dir)
    if not args.out_dir.is_dir():
        parser.error('Out directory not found: {.out_dir}'.format(args))

    target = args.out_dir / (args.source.stem + '.user.js')
    if target.is_file() and target.samefile(args.source):
        parser.error('Target cannot be same as source: {.source}'.format(args))

    if args.watch or settings.watch_mode:
        from build import watch
        print('Plugin build: {.build_name} (watch mode)\n'
              ' source: {.source}\n'
              ' target: {}'.format(settings, args, target))
        watch(plugin_build, args.source, args.out_dir, interval=settings.watch_interval)
    else:
        try:
            plugin_build(args.source, args.out_dir)
        except UserWarning as err:
            parser.error(err)
        print(target)
