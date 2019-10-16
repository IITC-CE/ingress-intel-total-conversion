window.isSmartphone = function() {
  // this check is also used in main.js. Note it should not detect
  // tablets because their display is large enough to use the desktop
  // version.

  // The stock intel site allows forcing mobile/full sites with a vp=m or vp=f
  // parameter - let's support the same. (stock only allows this for some
  // browsers - e.g. android phone/tablet. let's allow it for all, but
  // no promises it'll work right)
  var viewParam = getURLParam('vp');
  if (viewParam == 'm') return true;
  if (viewParam == 'f') return false;

  return navigator.userAgent.match(/Android.*Mobile/)
  || navigator.userAgent.match(/iPhone|iPad|iPod/i);
}

window.smartphone = function() {};

window.runOnSmartphonesBeforeBoot = function() {
  if(!isSmartphone()) return;
  console.warn('running smartphone pre boot stuff');

  // add smartphone stylesheet
  headHTML = document.getElementsByTagName('head')[0].innerHTML;
  headHTML += '<style>@@INCLUDESTRING:mobile/smartphone.css@@</style>';
  document.getElementsByTagName('head')[0].innerHTML = headHTML;

  // don’t need many of those
  window.setupStyles = function() {
    $('head').append('<style>' +
      [ '#largepreview.enl img { border:2px solid '+COLORS[TEAM_ENL]+'; } ',
        '#largepreview.res img { border:2px solid '+COLORS[TEAM_RES]+'; } ',
        '#largepreview.none img { border:2px solid '+COLORS[TEAM_NONE]+'; } '].join("\n")
      + '</style>');
  }

  window.smartphone.mapButton = $('<a>map</a>').click(function() {
    $('#map').css({'visibility': 'visible', 'opacity': '1'});
    $('#updatestatus').show();
    $('#chatcontrols a .active').removeClass('active');
    $("#chatcontrols a:contains('map')").addClass('active');
  });

  window.smartphone.sideButton = $('<a>info</a>').click(function() {
    $('#scrollwrapper').show();
    window.resetScrollOnNewPortal();
    $('.active').removeClass('active');
    $("#chatcontrols a:contains('info')").addClass('active');
  });

  $('#chatcontrols').append(smartphone.mapButton).append(smartphone.sideButton);

  window.addHook('portalDetailsUpdated', function(data) {
    var x = $('.imgpreview img').removeClass('hide');

    if(!x.length) {
      $('.fullimg').remove();
      return;
    }

    if($('.fullimg').length) {
      $('.fullimg').replaceWith(x.addClass('fullimg'));
    } else {
      x.addClass('fullimg').appendTo('#sidebar');
    }
  });
}

window.smartphoneInfo = function(data) {
  var guid = data.selectedPortalGuid;
  if(!window.portals[guid]) return;

  var data = window.portals[selectedPortal].options.data;
  if(typeof data.title === 'undefined') return;

  var details = window.portalDetail.get(guid);

  var lvl = data.level;
  if(data.team === "N" || data.team === "NEUTRAL")
    var t = '<span class="portallevel">L0</span>';
  else
    var t = '<span class="portallevel" style="background: '+COLORS_LVL[lvl]+';">L' + lvl + '</span>';

  var percentage = data.health;
  if(details) {
    var totalEnergy = getTotalPortalEnergy(details);
    if(getTotalPortalEnergy(details) > 0) {
      percentage = Math.floor(getCurrentPortalEnergy(details) / totalEnergy * 100);
    }
  }
  t += ' ' + percentage + '% ';
  t += data.title;

  if(details) {
    var l,v,max,perc;
    var eastAnticlockwiseToNorthClockwise = [2,1,0,7,6,5,4,3];

    for(var ind=0;ind<8;ind++)
    {
      if (details.resonators.length == 8) {
        var slot = eastAnticlockwiseToNorthClockwise[ind];
        var reso = details.resonators[slot];
      } else {
        var slot = null;
        var reso = ind < details.resonators.length ? details.resonators[ind] : null;
      }

      var className = TEAM_TO_CSS[getTeam(details)];
      if(slot !== null && OCTANTS[slot] === 'N')
        className += ' north'
      if(reso) {
        l = parseInt(reso.level);
        v = parseInt(reso.energy);
        max = RESO_NRG[l];
        perc = v/max*100;
      } else {
        l = 0;
        v = 0;
        max = 0;
        perc = 0;
      }

      t += '<div class="resonator '+className+'" style="border-top-color: '+COLORS_LVL[l]+';left: '+(100*ind/8.0)+'%;">';
      t += '<div class="filllevel" style="width:'+perc+'%;"></div>';
      t += '</div>'
    }
  }

  $('#mobileinfo').html(t);
}

window.runOnSmartphonesAfterBoot = function() {
  if(!isSmartphone()) return;
  console.warn('running smartphone post boot stuff');

  window.show('map');

  // add a div/hook for updating mobile info
  $('#updatestatus').prepend('<div id="mobileinfo" onclick="show(\'info\')"></div>');
  window.addHook('portalSelected', window.smartphoneInfo);
  // init msg of status bar. hint for the user that a tap leads to the info screen
  $('#mobileinfo').html('<div style="text-align: center"><b>tap here for info screen</b></div>');

  // replace img full view handler
  $('#portaldetails')
    .off('click', '.imgpreview')
    .on('click', '.imgpreview', function(e) {
      if (e.currentTarget === e.target) { // do not fire on #level
        $('.ui-tooltip').remove();
        var newTop = $('.fullimg').position().top + $("#sidebar").scrollTop();
        $("#sidebar").animate({ scrollTop: newTop }, 200);
      }
    });

  // make buttons in action bar flexible
  var l = $('#chatcontrols a:visible');
  l.css('width', 100/l.length + '%');

  // notify android that a select spinner is enabled.
  // this disables javascript injection on android side.
  // if android is not notified, the spinner closes on the next JS call
  if (typeof android !== 'undefined' && android && android.spinnerEnabled) {
    $("body").on("click", "select", function() {
      android.spinnerEnabled(true);
    });
  }

  if(typeof android !== 'undefined' && android && android.setPermalink) {
    window.map.on('moveend', window.setAndroidPermalink);
    addHook('portalSelected', window.setAndroidPermalink);
  }


  // for some reason, leaflet misses the WebView size being set at startup on IITC Mobile
  // create a short timer that checks for this issue
  setTimeout (function() { map.invalidateSize(); }, 0.2*1000);

}

window.setAndroidPermalink = function() {
  var p = window.selectedPortal && window.portals[window.selectedPortal];
  var href = $('<a>')
    .prop('href',  window.makePermalink(p && p.getLatLng(), true))
    .prop('href'); // to get absolute URI
  android.setPermalink(href);
}

window.useAndroidPanes = function() {
  // isSmartphone is important to disable panes in desktop mode
  return (typeof android !== 'undefined' && android && android.addPane && window.isSmartphone());
}

if(typeof android !== 'undefined' && android && android.getFileRequestUrlPrefix) {
  window.requestFile = function(callback) {
    do {
      var funcName = "onFileSelected" + parseInt(Math.random()*0xFFFF).toString(16);
    } while(window[funcName] !== undefined)

    window[funcName] = function(filename, content) {
      callback(decodeURIComponent(filename), atob(content));
    };
    var script = document.createElement('script');
    script.src = android.getFileRequestUrlPrefix() + funcName;
    (document.body || document.head || document.documentElement).appendChild(script);
  };
}

