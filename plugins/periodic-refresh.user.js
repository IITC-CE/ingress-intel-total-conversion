// ==UserScript==
// @id             iitc-plugin-periodic-refresh
// @name           IITC plugin: Periodic refresh
// @category       Tweaks
// @version        0.1.0.@@DATETIMEVERSION@@
// @description    For use for unattended display screens only, this plugin causes idle mode to be left once per hour.
// @@METAINFO@@
// ==/UserScript==

// @@PLUGINSTART@@ //

window.plugin.periodicRefresh = function() {};

window.plugin.periodicRefresh.wakeup = function() {
  console.log('periodicRefresh: timer fired - leaving idle mode');
  idleReset();
}


window.plugin.periodicRefresh.setup = function() {

  var refreshMinutes = 60;

  setInterval ( window.plugin.periodicRefresh.wakeup, refreshMinutes*60*1000 );

};

var setup = window.plugin.periodicRefresh.setup;

// @@PLUGINEND@@ //
