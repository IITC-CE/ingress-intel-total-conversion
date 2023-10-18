// @author         johnd0e
// @name           Privacy view on Intel
// @category       Misc
// @version        1.1.1
// @description    Hide info from intel which shouldn't leak to players of the other faction.

/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '1.1.1',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var privacyView = {};
window.plugin.privacyView = privacyView;
privacyView.activate = true;

function setup () {
  $('<style>')
    .html(
      '.privacy_active #playerstat,' +
      '.privacy_active #chatinput,' +
      '.privacy_active #chatcontrols > a:not(#privacytoggle),' +
      '.privacy_active #chat { display: none; }' +
      '.privacy_active #chatcontrols { bottom: 0; top: auto }' +
      '.privacy_active .leaflet-left .leaflet-control {margin-left: 10px}')
    .appendTo('head');

  var ctrl = $('<a id="privacytoggle" accesskey="9">')
    .click(function () {
      var active = document.body.classList.toggle('privacy_active');
      this.innerHTML = active ? 'Privacy active' : 'Privacy inactive';
      if (!active) { // refresh chat
        window.startRefreshTimeout(0.1*1000);
      }
    });

  if (window.isSmartphone()) {
    ctrl.appendTo('#toolbox');
  } else {
    ctrl
      .attr('title','[9]')
      .prependTo('#chatcontrols');
  }

  if (privacyView.activate) { ctrl.click(); }
}
