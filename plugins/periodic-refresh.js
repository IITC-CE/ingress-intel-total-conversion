// @author         jonatkins
// @name           Periodic refresh
// @category       Tweaks
// @version        0.1.2
// @description    For use for unattended display screens only, this plugin causes idle mode to be left once per hour.

/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '0.1.2',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.1.1',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

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
