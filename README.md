ingress intel total conversion (IITC)
=====================================

Since the [breunigs](https://github.com/breunigs/ingress-intel-total-conversion) IITC branch was deleted and
[Jon Atkins](https://github.com/jonatkins) has moved away from development,
this repository was created by [modos189](https://github.com/modos189) to continue some development.

## Users

Just want to download/install IITC? Go to
https://iitc.modos189.ru/

For keeping up with the latest news, release announcements, etc, Follow IITC on Telegram channel
https://t.me/iitc_news

Want to report a bug? Post it to the issues page
https://github.com/IITC-CE/ingress-intel-total-conversion/issues

## Developers

This Github page is for those interested in developing IITC further.

### Quickstart

To build the browser scripts from source you will need Python (either a late version 2.x, or 3.0+). It should
build correctly on Linux and Windows (and, probably, Macs, FreeBSD, etc)

Fork this project, clone to your local machine.

Run the `build.py local` script to build the code.

If all goes well, output of the build will end up in `build/local` subfolder.

You can create a custom build settings file, `localbuildsettings.py` - look in the supplied
`buildsettings.py` for details.

#### Mobile

To build the mobile app, along with python, you will need

- The Java JDK (development kit - the runtime JRE is not enough)
- The Android SDK

Run `build.py mobile` to build IITC Mobile in debug mode.

#### Website

The source codes of the iitc.modos189.ru site are in a nearby repository:
https://github.com/IITC-CE/iitc.modos189.ru