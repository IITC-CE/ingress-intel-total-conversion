// @author         jonatkins
// @name           Periodic refresh
// @category       Tweaks
// @version        0.1.0
// @description    For use for unattended display screens only, this plugin causes idle mode to be left once per hour.

// use own namespace for plugin
var periodicRefresh = {};
window.plugin.periodicRefresh = periodicRefresh;

var wakeup = function() {
  console.log('periodicRefresh: timer fired - leaving idle mode');
  idleReset();
}


var setup = function() {

  var refreshMinutes = 60;

  setInterval (wakeup, refreshMinutes*60*1000 );

};
