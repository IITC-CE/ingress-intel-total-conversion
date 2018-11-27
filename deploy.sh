#!/bin/bash

rsync -ar --delete-after --quiet $TRAVIS_BUILD_DIR/build/local/* travis-ci-iitc@modos189.ru:/home/modos189/web/iitc.modos189.ru/public_html/build/test/

rsync -ar --delete-after --quiet $TRAVIS_BUILD_DIR/build/mobile/IITC_Mobile-debug.apk travis-ci-iitc@modos189.ru:/home/modos189/web/iitc.modos189.ru/public_html/build/test/

ssh travis-ci-iitc@modos189.ru 'bash /home/modos189/IITC-CE/website/update-test-builds.sh'