// @author         johnd0e
// @name           Privacy view on Intel
// @category       Misc
// @version        1.2.1
// @description    Hide info from intel which shouldn't leak to players of the other faction.

/* global IITC -- eslint */
/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '1.2.1',
    changes: ['Fix plugin on mobile'],
  },
  {
    version: '1.2.0',
    changes: ['IITC.toolbox API is used to create plugin buttons and refactoring'],
  },
  {
    version: '1.1.1',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var privacyView = {};
window.plugin.privacyView = privacyView;
privacyView.activate = true;
privacyView.is_active = false;
privacyView.text = {
  true: 'Privacy active',
  false: 'Privacy inactive',
};

privacyView.toggle = () => {
  privacyView.is_active = !privacyView.is_active;
  document.body.classList.toggle('privacy_active', privacyView.is_active);
  if (window.isSmartphone()) {
    IITC.toolbox.updateButton('privacytoggle', { label: privacyView.text[privacyView.is_active] });
  } else {
    $('#privacytoggle').text(privacyView.is_active ? 'Privacy active' : 'Privacy inactive');
    if (!privacyView.is_active) {
      // refresh chat
      window.startRefreshTimeout(0.1 * 1000);
    }
  }
};

function setup() {
  $('<style>')
    .html(
      '.privacy_active #playerstat,' +
        '.privacy_active #chatinput,' +
        '.privacy_active #chatcontrols > a:not(#privacytoggle),' +
        '.privacy_active #chat { display: none; }' +
        '.privacy_active #chatcontrols { bottom: 0; top: auto }' +
        '.privacy_active .leaflet-left .leaflet-control {margin-left: 10px}'
    )
    .appendTo('head');

  if (window.isSmartphone()) {
    IITC.toolbox.addButton({
      id: 'privacytoggle',
      label: 'Permalink',
      title: '[9]',
      action: privacyView.toggle,
      accesskey: '9',
    });
  } else {
    $('<a id="privacytoggle" accesskey="9">')
      .click(function () {
        window.plugin.privacyView.toggle();
      })
      .attr('title', '[9]')
      .prependTo('#chatcontrols');
  }

  if (privacyView.activate) {
    privacyView.toggle();
  }
}
