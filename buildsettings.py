"""Config file for builds.

if you want to have custom builds, copy this file to "localbuildsettings.py" and make changes there.
"""

localfile = 'localbuildsettings.py'

defaults = {  # common for all build targets

    'url_dist_base': None,             # network location, used for @updateURL and @downloadURL fields
    'update_file': None,               # how to use @updateURL
                                       # - '.meta.js': generate .meta.js
                                       # - '.user.js': use main script
                                       # - None: do not use the field

    'version_timestamp': False,        # add extra component to version field (to force update)

    # these settings should be modified when developing own fork of this project
    'namespace': 'https://github.com/IITC-CE/ingress-intel-total-conversion',
    'url_homepage': 'https://iitc.app/',
    'url_tg': 'https://t.me/iitc_news',

    # these settings should not be touched unless intel url(s) changed
    'match': ['https://intel.ingress.com/*', 'https://intel-x.ingress.com/*'],

    'plugin_wrapper': 'pluginwrapper', # use wrapper from pluginwrapper.py

    'pre_build': [],                   # list of commands to execute before build run
    'post_build': [],                  # ...                         after build succeed

    # watch mode settings:
    'watch_mode': False,               # otherwise can be activated with --watch commandline argument
    'watch_interval': 1,               # (seconds)
    'on_fail': lambda: print('\a'),    # function (or string for os.system)
    'on_success': lambda: print('Build succeeded'),

    # Path to plugin icons. For example: `http://localhost/icons/{}.png`
    'url_icon_base': None,
    # The path to the icons of the plugins with the size of 64 pixels. For example: `http://localhost/icons/{}-64.png`
    'url_icon_64_base': None,

    # other:
    # runtime settings set in settings.py also can be overriden
    # - 'build_source_dir'
    # - 'build_target_dir'
    # - ...
}

builds = {  # every build entry extends common defaults

    # default settings
    'local': {},

    # specify localhost as base for scripts (auto)updating
    # useful for developers
    'dev': {
        'url_dist_base': 'http://localhost:8000',
        'update_file': '.user.js',
        'version_timestamp': True,
    },

    # default entry that also builds the mobile .apk
    # requires: Java JDK, android-sdk
    'mobile': {
        'post_build': ['build_mobile.py'],
    },


    # publish your own fork of the project, and host it on your own web site
    # 'myfork': {
    #    'url_homepage': 'https://www.example.com/iitc',
    #    'url_dist_base': 'https://download.example.com/iitc',
    #    'update_file': '.meta.js',
    # },
}

# default_build - the name of the build settings to use if none is specified on the build.py command line
# (change it in localbuildsettings.py)
default_build = None
