#!/usr/bin/env python3

"""Utility to generate the bundled Material Symbols icon font.

Reads the icon list from core/icons/icons.txt and writes the subset it names as
woff2 for the userscript, which inlines it. The mobile app gets the complete
family as truetype instead, so that its icons do not depend on the list, and
because it cannot load woff2. Google serves that one as a static outlined
instance, so only the woff2 can draw an icon filled.

Run manually after editing the icon list and commit the regenerated woff2. The
app font is refetched too, but follows Material Symbols releases rather than the
list, so most runs leave it byte for byte unchanged.

The regular build never touches the network: the font is inlined into the
script from the committed file.

Icon names are kept as ligatures inside the font, so markup uses the very same
names Google documents::

    <i class="icon">close</i>
"""

import re
import urllib.request
from pathlib import Path

ICONS_DIR = Path(__file__).with_name('core') / 'icons'
ICONS_LIST = ICONS_DIR / 'icons.txt'
ICONS_FONT = ICONS_DIR / 'icons.woff2'
MOBILE_FONT = Path(__file__).with_name('mobile') / 'app/src/main/res/font/iitc_icons.ttf'

FAMILY = 'Material Symbols Outlined'
AXES = 'FILL@0..1'  # the axis a woff2 keeps, letting font-variation-settings fill an icon
CSS_API = 'https://fonts.googleapis.com/css2'
CODEPOINTS = ('https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/'
              'MaterialSymbolsOutlined%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints')

# the format served depends on the user agent: a browser gets woff2, anything else ttf
USER_AGENT = ('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) '
              'Chrome/120.0.0.0 Safari/537.36')


def fetch(url, user_agent=USER_AGENT):
    request = urllib.request.Request(url, headers={'User-Agent': user_agent} if user_agent else {})
    with urllib.request.urlopen(request) as response:
        return response.read()


def read_list():
    """Return sorted unique icon names from the list file."""
    names = set()
    for line in ICONS_LIST.read_text(encoding='utf-8-sig').splitlines():
        name = line.split('#', 1)[0].strip()
        if name:
            names.add(name)
    if not names:
        raise UserWarning(f'no icon names found in {ICONS_LIST}')
    return sorted(names)


def check_names(names):
    """Reject unknown names: the fonts API silently ignores them."""
    known = {line.split()[0] for line in fetch(CODEPOINTS).decode().splitlines() if line.strip()}
    unknown = [name for name in names if name not in known]
    if unknown:
        raise UserWarning('unknown icon names: ' + ', '.join(unknown))


def fetch_font(names, user_agent):
    url = f'{CSS_API}?family={FAMILY.replace(" ", "+")}:{AXES}'
    if names:
        url += f'&icon_names={",".join(names)}'
    css = fetch(url, user_agent).decode()
    match = re.search(r'src: url\((\S+?)\)', css)
    if not match:
        raise UserWarning(f'no font url in the stylesheet served for {url}')
    return fetch(match.group(1), user_agent)


def icons_build():
    names = read_list()
    check_names(names)
    for target, subset, user_agent in ((ICONS_FONT, names, USER_AGENT), (MOBILE_FONT, None, None)):
        font = fetch_font(subset, user_agent)
        target.write_bytes(font)
        print(f'{target}: {len(subset) if subset else "all"} icons, {len(font)} bytes')


if __name__ == '__main__':
    try:
        icons_build()
    except UserWarning as err:
        raise SystemExit(f'{Path(__file__).name}: {err}')
