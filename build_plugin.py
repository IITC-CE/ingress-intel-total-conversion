#!/usr/bin/env python

"""Utility to build iitc plugin for given source file name."""

import base64
import glob
import io
import os
import re
import sys
from importlib import import_module  # Python >= 2.7
from mimetypes import guess_type

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
            meta.append('// @{:<14} {}'.format(key, value))

    is_main = False
    for line in source.splitlines():
        text = line.lstrip()
        rem = text[:2]
        if rem != '//':
            raise UserWarning('{}: wrong line in metablock: {}'.format(plugin_name, line))
        text = text[2:].strip()
        try:
            key, value = text.split(None, 1)
        except ValueError:
            if text == '==UserScript==':
                raise UserWarning('{}: wrong metablock detected'.format(plugin_name))
        else:
            key = key[1:]
            keys.add(key)
            if key == 'version':
                if settings.version_timestamp and not re.search(r'[^\d.]', value):
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


def readtext(filename):
    with io.open(filename, 'r', encoding='utf-8-sig') as src:
        return src.read()


def readbytes(filename):
    with io.open(filename, 'rb') as src:
        return src.read()


def load_image(filename):
    mtype, _ = guess_type(filename)
    assert mtype, 'Failed to guess mimetype: {}'.format(filename)
    return 'data:{};base64,{}'.format(
        mtype,
        base64.b64encode(readbytes(filename)).decode('utf8'),
    )


def wrap_iife(fullname):
    filename = os.path.basename(fullname)
    name, _ = os.path.splitext(filename)
    return u"""
// *** module: {filename} ***
(function () {{
var log = ulog('{name}');
{content}

}})();
""".format(filename=filename, name=name, content=readtext(fullname))


current_path = None


def bundle_code(_):
    files = os.path.join(current_path, 'code', '*.js')
    return '\n'.join(map(wrap_iife, sorted(glob.glob(files))))


def getabs(filename, base):
    if os.path.isabs(filename):
        return filename
    return os.path.join(base, filename)


def imgrepl(match):
    fullname = getabs(match.group('filename'), current_path)
    return load_image(fullname)


def expand_template(match):
    quote = "'%s'"
    kw, filename = match.groups()
    if not filename:
        return quote % getattr(settings, kw)

    fullname = getabs(filename, current_path)
    if kw == 'include_raw':
        return u"""// *** included: {filename} ***
{content}

""".format(filename=filename, content=readtext(fullname))
    elif kw == 'include_string':
        return quote % multi_line(readtext(fullname))
    elif kw == 'include_img':
        return quote % load_image(fullname)
    elif kw == 'include_css':
        pattern = r'(?<=url\()["\']?(?P<filename>[^)#]+?)["\']?(?=\))'
        css = re.sub(pattern, imgrepl, readtext(fullname))
        return quote % multi_line(css)


def split_filename(path):
    filename = os.path.basename(path)
    return filename.split('.')[0]


def write_userscript(data, plugin_name, ext, directory=None):
    filename = plugin_name + ext
    filename = os.path.join(directory, filename) if directory else filename
    with io.open(filename, 'w', encoding='utf8') as userscript:
        userscript.write(data)


def process_file(source, out_dir, dist_path=None, name=None):
    """Generate .user.js (and optionally .meta.js) from given source file.

    Resulted file(s) put into out_dir (if specified, otherwise - use current).

    dist_path component is for adding to @downloadURL/@updateURL.
    """
    global current_path  # to pass value to repl-functions
    current_path = settings.build_source_dir  # used as root for all (relative) paths
                                              # todo: evaluate relatively to processed file (with os.path.dirname)
    try:
        meta, script = readtext(source).split('\n\n', 1)
    except ValueError:
        raise Exception('{}: wrong input: empty line expected after metablock'.format(source))
    plugin_name = name or split_filename(source)
    meta, is_main = fill_meta(meta, plugin_name, dist_path)
    settings.plugin_id = plugin_name

    script = re.sub(r"'@bundle_code@';", bundle_code, script)
    wrapper = get_module(settings.plugin_wrapper)
    template = r"'@(\w+)(?::([\w./-]+))?@'"  # to find '@keyword[:path]@' patterns
    data = [
        meta,
        re.sub(template, expand_template, wrapper.start),
        re.sub(template, expand_template, script),
        wrapper.setup,
        wrapper.end,
    ]
    if is_main:
        data.pop(3)  # remove wrapper.setup (it's for plugins only)
    write_userscript(''.join(data), plugin_name, '.user.js', out_dir)

    if settings.url_dist_base and settings.update_file == '.meta.js':
        write_userscript(meta, plugin_name, '.meta.js', out_dir)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('build', type=str, nargs='?',
                        help='Specify build name')
    parser.add_argument('source', type=str,
                        help='Specify source file name')
    parser.add_argument('--out-dir', type=str, nargs='?',
                        help='Specify out directory')
    args = parser.parse_args()

    try:
        settings.load(args.build)
    except ValueError as err:
        parser.error(err)

    if not os.path.isfile(args.source):
        parser.error('Source file not found: {.source}'.format(args))

    out_dir = args.out_dir or settings.build_target_dir
    if not os.path.isdir(out_dir):
        parser.error('Out directory not found: {}'.format(out_dir))

    target = os.path.join(out_dir, split_filename(args.source) + '.user.js')
    if os.path.isfile(target) and os.path.samefile(args.source, target):
        parser.error('Target cannot be same as source: {.source}'.format(args))

    try:
        process_file(args.source, out_dir)
    except UserWarning as err:
        parser.error(err)

    print(target)
