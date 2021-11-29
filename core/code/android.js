/* global android -- eslint */

var isAndroid = typeof android !== 'undefined';
window.isAndroid = isAndroid;

window.runOnAndroidBeforeBoot = function () {
  if (!isAndroid) { return; }
};

window.runOnAndroidAfterBoot = function () {
  if (!isAndroid) { return; }

  if (android.bootFinished) { android.bootFinished(); }
};
