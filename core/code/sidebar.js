window.setupLargeImagePreview = function () {
  $('#portaldetails').on('click', '.imgpreview', function (e) {
    var img = this.querySelector('img');
    //dialogs have 12px padding around the content
    var dlgWidth = Math.max(img.naturalWidth+24,500);
    // This might be a case where multiple dialogs make sense, for example
    // someone might want to compare images of multiple portals.  But
    // usually we only want to show one version of each image.
    // To support that, we'd need a unique key per portal.  Example, guid.
    // So that would have to be in the html fetched into details.

    var preview = new Image(img.width, img.height);
    preview.src = img.src;
    preview.style = 'margin: auto; display: block';
    var title = e.delegateTarget.querySelector('.title').innerText;
    dialog({
      html: preview,
      title: title,
      id: 'iitc-portal-image',
      width: dlgWidth,
    });
  });
}

window.setupStyles = function() {
  $('head').append('<style>' +
    [ '#largepreview.enl img { border:2px solid '+COLORS[TEAM_ENL]+'; } ',
      '#largepreview.res img { border:2px solid '+COLORS[TEAM_RES]+'; } ',
      '#largepreview.none img { border:2px solid '+COLORS[TEAM_NONE]+'; } ',
      '#chatcontrols { bottom: '+(CHAT_SHRINKED+22)+'px; }',
      '#chat { height: '+CHAT_SHRINKED+'px; } ',
      '.leaflet-right { margin-right: '+(SIDEBAR_WIDTH+1)+'px } ',
      '#updatestatus { width:'+(SIDEBAR_WIDTH+2)+'px;  } ',
      '#sidebar { width:'+(SIDEBAR_WIDTH + HIDDEN_SCROLLBAR_ASSUMED_WIDTH + 1 /*border*/)+'px;  } ',
      '#sidebartoggle { right:'+(SIDEBAR_WIDTH+1)+'px;  } ',
      '#scrollwrapper  { width:'+(SIDEBAR_WIDTH + 2*HIDDEN_SCROLLBAR_ASSUMED_WIDTH)+'px; right:-'+(2*HIDDEN_SCROLLBAR_ASSUMED_WIDTH-2)+'px } ',
      '#sidebar > * { width:'+(SIDEBAR_WIDTH+1)+'px;  }'].join("\n")
    + '</style>');
}

window.setupIcons = function() {
  $(['<svg>',
      // Material Icons

      // portal_detail_display.js
      '<symbol id="ic_place_24px" viewBox="0 0 24 24">',
        '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/>',
      '</symbol>',
    '</svg>'].join('\\n')).appendTo('body');
}


// renders player details into the website. Since the player info is
// included as inline script in the original site, the data is static
// and cannot be updated.
window.setupPlayerStat = function() {
  // stock site updated to supply the actual player level, AP requirements and XM capacity values
  var level = PLAYER.verified_level;
  PLAYER.level = level; //for historical reasons IITC expects PLAYER.level to contain the current player level

  var n = window.PLAYER.nickname;
  PLAYER.nickMatcher = new RegExp('\\b('+n+')\\b', 'ig');

  var ap = parseInt(PLAYER.ap);
  var thisLvlAp = parseInt(PLAYER.min_ap_for_current_level);
  var nextLvlAp = parseInt(PLAYER.min_ap_for_next_level);

  if (nextLvlAp) {
    var lvlUpAp = digits(nextLvlAp-ap);
    var lvlApProg = Math.round((ap-thisLvlAp)/(nextLvlAp-thisLvlAp)*100);
  } // else zero nextLvlAp - so at maximum level(?)

  var xmMax = parseInt(PLAYER.xm_capacity);
  var xmRatio = Math.round(PLAYER.energy/xmMax*100);

  var cls = PLAYER.team === 'RESISTANCE' ? 'res' : 'enl';


  var t = 'Level:\t' + level + '\n'
        + 'XM:\t' + PLAYER.energy + ' / ' + xmMax + '\n'
        + 'AP:\t' + digits(ap) + '\n'
        + (nextLvlAp > 0 ? 'level up in:\t' + lvlUpAp + ' AP' : 'Maximum level reached(!)')
        + '\n\Invites:\t'+PLAYER.available_invites
        + '\n\nNote: your player stats can only be updated by a full reload (F5)';

  $('#playerstat').html(''
    + '<h2 title="'+t+'">'+level+'&nbsp;'
    + '<div id="name">'
    + '<span class="'+cls+'">'+PLAYER.nickname+'</span>'
    + '<a href="https://intel.ingress.com/logout" id="signout">sign out</a>'
    + '</div>'
    + '<div id="stats">'
    + '<sup>XM: '+xmRatio+'%</sup>'
    + '<sub>' + (nextLvlAp > 0 ? 'level: '+lvlApProg+'%' : 'max level') + '</sub>'
    + '</div>'
    + '</h2>'
  );
}

window.setupSidebarToggle = function() {
  $('#sidebartoggle').on('click', function() {
    var toggle = $('#sidebartoggle');
    var sidebar = $('#scrollwrapper');
    if(sidebar.is(':visible')) {
      sidebar.hide();
      $('.leaflet-right').css('margin-right','0');
      toggle.html('<span class="toggle open"></span>');
      toggle.css('right', '0');
    } else {
      sidebar.show();
      window.resetScrollOnNewPortal();
      $('.leaflet-right').css('margin-right', SIDEBAR_WIDTH+1+'px');
      toggle.html('<span class="toggle close"></span>');
      toggle.css('right', SIDEBAR_WIDTH+1+'px');
    }
    $('.ui-tooltip').remove();
  });
}

// fixed Addons ****************************************************************

window.aboutIITC = function () {
  // Plugins metadata come from 2 sources:
  // - buildName, pluginId, dateTimeVersion: inserted in plugin body by build script
  //   (only standard plugins)
  // - script.name/version/description: from GM_info object, passed to wrapper
  //   `script` may be not available if userscript manager does not provede GM_info
  //   (atm: IITC-Mobile for iOS)
  var pluginsInfo = window.bootPlugins.info;
  var iitc = script_info;
  var iitcVersion = (iitc.script && iitc.script.version || iitc.dateTimeVersion) + ' [' + iitc.buildName + ']';
  function prepData (info,idx) { // try to gather plugin metadata from both sources
    var data = {
      build: info.buildName,
      name: info.pluginId,
      date: info.dateTimeVersion,
      error: info.error
    };
    var script = info.script;
    if (script) {
      if (typeof script.name === 'string') { // cut non-informative name part
        data.name = script.name.replace(/^IITC plugin: /,'');
      }
      data.version = script.version;
      data.description = script.description;
    }
    if (!data.name) {
      if (iitc.script) { // check if GM_info is available
        data.name = '[unknown plugin: index ' + idx + ']';
        data.description = "this plugin does not have proper wrapper; report to it's author";
      } else { // userscript manager fault
        data.name = '[3rd-party plugin: index ' + idx + ']';
      }
    }
    return data;
  }
  var extra = iitc.script && iitc.script.version.match(/^\d+\.\d+\.\d+(\..+)$/);
  extra = extra && extra[1];
  function formatVerInfo (p) {
    if (p.version && extra) {
      var cutPos = p.version.length-extra.length;
      // cut extra version component (timestamp) if it is equal to main script's one
      if (p.version.substring(cutPos) === extra) {
        p.version = p.version.substring(0,cutPos);
      }
    }
    p.version = p.version || p.date;
    if (p.version) {
      var tooltip = [];
      if (p.build) { tooltip.push('[' + p.build + ']'); }
      if (p.date && p.date !== p.version) { tooltip.push(p.date); }
      return L.Util.template(' - <code{title}>{version}</code>', {
        title: tooltip[0] ? ' title="' + tooltip.join(' ') + '"' : '',
        version: p.version
      });
    }
  }
  var plugins = pluginsInfo.map(prepData)
    .sort(function (a,b) { return a.name > b.name ? 1 : -1; })
    .map(function (p) {
      p.style = '';
      p.description = p.description || '';
      if (p.error) {
        p.style += 'text-decoration:line-through;';
        p.description = p.error;
      } else if (p.build === iitc.buildName && p.date === iitc.dateTimeVersion) { // is standard plugin
        p.style += 'color:darkgray;';
      }
      p.verinfo = formatVerInfo(p) || '';
      return L.Util.template('<li style="{style}" title="{description}">{name}{verinfo}</li>', p);
    })
    .join('\n');

  var html = ''
  + '<div><b>About IITC</b></div> '
  + '<div>Ingress Intel Total Conversion</div> '
  + '<hr>'
  + '<div>'
  + '  <a href="'+'@url_homepage@'+'" target="_blank">IITC Homepage</a> |' +
    '  <a href="'+'@url_tg@'+'" target="_blank">Telegram channel</a><br />'
  + '   On the script’s homepage you can:'
  + '   <ul>'
  + '     <li>Find Updates</li>'
  + '     <li>Get Plugins</li>'
  + '     <li>Report Bugs</li>'
  + '     <li>Contribute!</li>'
  + '   </ul>'
  + '</div>'
  + '<hr>'
  + '<div>Version: ' + iitcVersion + '</div>';

  if (window.isAndroid && android.getVersionName) {
    html += '<div>IITC Mobile ' + android.getVersionName() + '</div>';
  }
  if (plugins) {
    html += '<div><p>Plugins:</p><ul>' + plugins + '</ul></div>';
  }

  dialog({
    title: 'IITC ' + iitcVersion,
    id: 'iitc-about',
    html: html,
    width: 'auto',
    dialogClass: 'ui-dialog-aboutIITC'
  });
}

function setPermaLink () {
  this.href = window.makePermalink(null, true);
}

window.setupAddons = function () {
  $('<a>')
    .html('Permalink')
    .attr({
      id: 'permalink',
      title: 'URL link to this map view'
    })
    .on({
      mouseover: setPermaLink,
      click: setPermaLink
    })
    .appendTo('#toolbox');

  $('<a>')
    .html('About IITC')
    .attr('id', 'about-iitc')
    .css('cursor', 'help')
    .click(aboutIITC)
    .appendTo('#toolbox');

  window.artifact.setup();

  window.RegionScoreboard.setup();
};
