#!/usr/bin/env python3

"""Utility to build iitc plugin for given source file name."""

import base64
import re
import sys
from functools import partial
from importlib import import_module
from mimetypes import guess_type
from pathlib import Path

import settings


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
            key = key[1:]
            keys.add(key)
            if key == 'version':
                if not re.match(r'^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$', value):
                    print(f'{plugin_name}: wrong version format: {value}')  # expected: major.minor.patch
                elif settings.version_timestamp:  # append timestamp only for well-formed version
                    line = line.replace(value, '{ver}.{.build_timestamp}'.format(settings, ver=value))
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
        append_line('match', settings.match)

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
    if filename.startswith("data:"):
        return filename

    fullname = path / filename
    return load_image(fullname)


def expand_variables(match):
    quote = "'%s'"
    kw = match.groups()[0]
    return quote % getattr(settings, kw)


def expand_template(match, path=None):
    quote = "'%s'"
    kw, filename = match.groups()
    fullname = path / filename

    if kw == 'import':
        return """// *** included: {filename} ***
{content}

""".format(filename=filename, content=readtext(fullname))
    elif kw == 'importString':
        return quote % multi_line(readtext(fullname))
    elif kw == 'importImage':
        return quote % load_image(fullname)
    elif kw == 'importCSS':
        pattern = r'(?<=url\()["\']?(?P<filename>[^)#]+?)["\']?(?=\))'
        css = re.sub(pattern, partial(imgrepl, path=fullname.parent), readtext(fullname))
        return """// *** included: {filename} ***
;(function() {{ var style = document.createElement('style');
style.appendChild(document.createTextNode('{content}'));
document.head.appendChild(style);
}})();
""".format(filename=filename, content=multi_line(css))
    else:
        raise Exception(f'Error: function {kw} unknown')


def errorOut(match):
    kw = match.groups()[0]
    print(f"Error: file still contains @{kw}@")


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
    plugin_name = source.stem
    meta, is_main = fill_meta(meta, plugin_name, dist_path)
    settings.plugin_id = plugin_name

    path = source.parent  # used as root for all (relative) paths
    script = re.sub(r"IITCTool.importCode\s*\(\s*\)\s*;?", partial(bundle_code, path=path), script)
    try:
        script_before_wrapper, script = script.split('\n/*wrapped-from-here*/\n', 1)
    except ValueError:
        script_before_wrapper = ''

    wrapper = get_module(settings.plugin_wrapper)
    templateVariables = r"'@(\w+)@'"  # to find '@keyword[:path]@' patterns
    replaceVariables = partial(expand_variables)
    templateFunctions = r"IITCTool.(\w+)\s*\(\s*['\"](.*?)['\"]\s*\)\s*;?"  # to find "IITCTool.function()" patterns
    replaceFunctions = partial(expand_template, path=path)

    head = re.sub(templateVariables, replaceVariables, wrapper.start)
    code = re.sub(templateFunctions, replaceFunctions, script)
    code = re.sub(templateVariables, replaceVariables, code)
    re.sub(r"'@(.*)@'", errorOut, code)

    data = [
        meta,
        script_before_wrapper,
        head,
        code,
        wrapper.setup if not is_main else '',  # it's for plugins only
        wrapper.end,
    ]

    (out_dir / (plugin_name + '.user.js')).write_text(''.join(data), encoding='utf8')
    if settings.url_dist_base and settings.update_file == '.meta.js':
        (out_dir / (plugin_name + '.meta.js')).write_text(meta, encoding='utf8')


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
        watch(process_file, args.source, args.out_dir, interval=settings.watch_interval)
    else:
        try:
            process_file(args.source, args.out_dir)
        except UserWarning as err:
            parser.error(err)
        print(target)
