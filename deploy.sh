#!/bin/bash

BUILDSTAMP=$(date -u +'%Y-%m-%d_%H-%M' -d"$(cat .build-timestamp)")
BUILDPATH="/home/modos189/web/iitc.modos189.ru/public_html/build"

ssh travis-ci-iitc@modos189.ru "mkdir -p $BUILDPATH/archive/$BUILDSTAMP"

rsync -ar --quiet $TRAVIS_BUILD_DIR/build/local/* travis-ci-iitc@modos189.ru:$BUILDPATH/archive/$BUILDSTAMP/
rsync -ar --quiet $TRAVIS_BUILD_DIR/build/mobile/IITC_Mobile-debug.apk travis-ci-iitc@modos189.ru:$BUILDPATH/archive/$BUILDSTAMP/

ssh travis-ci-iitc@modos189.ru "rm $BUILDPATH/test &&
ln -s $BUILDPATH/archive/$BUILDSTAMP $BUILDPATH/test &&
ls -trd $BUILDPATH/archive/* | head -n -30 | xargs --no-run-if-empty rm -r &&
bash /home/modos189/IITC-CE/website/update-test-builds.sh"