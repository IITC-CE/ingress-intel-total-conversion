// created to start cleaning up "window" interaction
//

window.currentPane = '';

var panes = {};

window.addMobilePane = function (id, title, icon, onFocus) {
  if (!window.useAppPanes()) return false;
  if (id in panes) return false;
  if (id !== 'all' && id !== 'faction' && id !== 'alerts' && id !== 'map' && id !== 'info')
    android.addPane(id, title, icon);
  panes[id] = onFocus;
  $('<div class="mobile-pane">')
    .attr("id", "pane-"+id)
    .appendTo(document.body)
    .hide();
  return true;
};

window.showPane = function (id) {
  if (!(id in panes)) id = 'map';

  if(window.currentPane == id) return;
  window.currentPane = id;

  $(".mobile-pane").hide();

  if (id === 'map') {
    window.smartphone.mapButton.click();
    $('#portal_highlight_select').show();
    return;
  }

  window.hideall();

  var onFocus = panes[id];

  if (onFocus) {
    var html = onFocus(id);
    $("#pane-" + id).html(html).show();
  } else {
    $("#pane-" + id).html('').show();
  }

  runHooks("paneChanged", id);
  android.switchToPane(id);
}

window.show = function(id) {
  if (window.useAppPanes()) {
    if (id in panes) {
      return window.showPane(id);
    }
    // if not using the new API
    $(".mobile-pane").hide();
  }

  if(window.currentPane == id) return;
  window.currentPane = id;
  window.hideall();

  runHooks("paneChanged", id);

  switch(id) {
    case 'all':
    case 'faction':
    case 'alerts':
      window.chat.show(id);
      break;
    case 'debug':
      window.debug.console.show();
      break;
    case 'map':
      window.smartphone.mapButton.click();
      $('#portal_highlight_select').show();
      $('#farm_level_select').show();
      break;
    case 'info':
      window.smartphone.sideButton.click();
      break;
  }
}

window.hideall = function() {
  $('#chatcontrols, #chat, #chatinput, #sidebartoggle, #scrollwrapper, #updatestatus, #portal_highlight_select').hide();
  $('#farm_level_select').hide();
  $('#map').css({'visibility': 'hidden', 'opacity': '0'});
  $('.ui-tooltip').remove();
}
