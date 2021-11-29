#!/bin/bash

if [[ "$TRAVIS_COMMIT_MESSAGE" != *"[Release]"* || "$BUILD_TYPE" == "release" ]]
then
  bundle exec fastlane deploy_$BUILD_TYPE;
fi