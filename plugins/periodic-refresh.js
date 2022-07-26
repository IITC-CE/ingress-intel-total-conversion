// @author         jonatkins
// @name           Periodic refresh
// @category       Tweaks
// @version        0.1.1
// @description    For use for unattended display screens only, this plugin causes idle mode to be left once per hour.

/* exported setup --eslint */
/* global idleReset */
// use own namespace for plugin
var periodicRefresh = {};
window.plugin.periodicRefresh = periodicRefresh;

periodicRefresh.refreshMinutes = 60;

function wakeup () {
  console.log('periodicRefresh: timer fired - leaving idle mode');
  idleReset();
}

function setup () {
  setInterval (wakeup, periodicRefresh.refreshMinutes*60*1000 );
}
