// @author         Costaspap
// @name           Localized scoreboard
// @version        0.3.1
// @category       Info
// @description    Display a scoreboard about all visible portals with statistics about both teams,like average portal level,link & field counts etc.


// A plug in by Costaspap and harisbitsakou

// use own namespace for plugin
var scoreboard = {};
window.plugin.scoreboard = scoreboard;

function getPortalsInfo (portals,bounds) {
  function init () {
    return {
      placeHolders: 0,
      total: 0,
      level8: 0,
      levels: 0,
      maxLevel: 0,
      health: 0
    };
  }
  var score = [init(),init(),init()];
  portals = portals.filter(function (portal) { // only consider portals in view
    return bounds.contains(portal.getLatLng());
  });
  portals.forEach(function (portal) {
    var info = portal.options;
    var teamN = info.team;
    var team = score[teamN];
    if (!info.data.title) {
      team.placeHolders++;
      return;
    }
    team.health += info.data.health;
    team.levels += info.level;
    if (info.level === 8) { team.level8++; }
    team.maxLevel = Math.max(team.maxLevel,info.level);
    team.total++;
  });

  if (portals.length) {
    [TEAM_RES,TEAM_ENL].forEach(function (teamN) {
      var team = score[teamN];
      team.health = team.total ? (team.health/team.total).toFixed(1)+'%' : '-';
      team.levels = team.total ? (team.levels/team.total).toFixed(1) : '-';
      team.level8 = team.level8 || '-';
      team.maxLevel = team.maxLevel || '-';
      team.total = team.placeHolders ? team.total + ' + ' + team.placeHolders : team.total;
    });
    return {
      enl: score[TEAM_ENL],
      res: score[TEAM_RES]
    };
  }
}

function getEntitiesCount (entities,bounds) {
  // only consider entities that start/end on-screen
  // todo: consider entities that have intersections with map bounds
  var total = entities.filter(function (ent) {
    return ent.getLatLngs().some(function (point) {
      return bounds.contains(point);
    });
  });
  var enl = total.reduce(function (n, l) {
    return (l.options.team === TEAM_ENL) ? n+1 : n;
  },0);
  return {
    enl: enl,
    res: total.length - enl
  };
}

function makeTable (portals,linksCount,fieldsCount) {

  var html = '';
  html += '<table>'
  + '<colgroup><col><col class="enl"><col class="res"></colgroup>'
  + '<tr>'
  + '<th>Metrics</th>'
  + '<th class="enl">Enlightened</th>'
  + '<th class="res">Resistance</th>'
  + '</tr>\n';

  html += '<tr><td>Portals</td>'
    +'<td>'+portals.enl.total+'</td>'
    +'<td>'+portals.res.total+'</td></tr>'
  +'<tr><td>avg Level</td>'
    +'<td>'+portals.enl.levels+'</td>'
    +'<td>'+portals.res.levels+'</td></tr>'
  + '<tr><td>avg Health</td>'
    +'<td>'+portals.enl.health+'</td>'
    +'<td>'+portals.res.health+'</td></tr>'
  +'<tr><td>Level 8</td>'
    +'<td>'+portals.enl.level8+'</td>'
    +'<td>'+portals.res.level8+'</td></tr>'
  +'<tr><td>Max Level</td>'
    +'<td>'+portals.enl.maxLevel+'</td>'
    +'<td>'+portals.res.maxLevel+'</td></tr>'
  +'<tr><td>Links</td>'
    +'<td>'+linksCount.enl+'</td>'
    +'<td>'+linksCount.res+'</td></tr>'
  +'<tr><td>Fields</td>'
    +'<td>'+fieldsCount.enl+'</td>'
    +'<td>'+fieldsCount.res+'</td></tr>';

  html += '</table>';
  return html;
}

function displayScoreboard () {
  function toArr (entities) {
    return Object.keys(entities).map(function (guid) {
      return entities[guid];
    });
  }
  var bounds = map.getBounds();
  var portals = getPortalsInfo(toArr(window.portals),bounds);
  var html = '';
  if (portals) {
    var linksCount = getEntitiesCount(toArr(window.links),bounds);
    var fieldsCount = getEntitiesCount(toArr(window.fields),bounds);
    html += makeTable(portals,linksCount,fieldsCount);
  } else {
    html += '<p>Nothing to show!<p>';
  }

  if (map.getZoom() < 15) {
    html += '<p class="disclaimer"><b>Zoom in for a more accurate scoreboard!</b></p>';
  }

  html = '<div id="scoreboard">' + html + '</div>';
  if (window.useAppPanes()) {
    $(html).addClass('mobile').appendTo(document.body);
  } else {
    dialog({
      html: html,
      dialogClass: 'ui-dialog-scoreboard',
      title: 'Scoreboard',
      id: 'Scoreboard'
    });
  }
}

function setup () {
  if (window.useAppPanes()) {
    app.addPane('plugin-Scoreboard', 'Scoreboard', 'ic_action_view_as_list_compact');
    addHook('paneChanged', function (pane) {
      if (pane === 'plugin-Scoreboard') {
        displayScoreboard();
      } else {
        $('#scoreboard').remove();
      }
    });
  } else {
    $('<a>')
      .html('Scoreboard')
      .attr('title','Display a dynamic scoreboard in the current view')
      .click(displayScoreboard)
      .appendTo('#toolbox');
  }

  $('<style>').html('\
    #scoreboard table { margin-top: 5px; border-collapse: collapse; width: 100%; background-color: #1b415e }\
    #scoreboard tr { border-bottom: 1px solid #0b314e; color: white; }\
    #scoreboard td, #scoreboard th { padding: 3px 10px; text-align: left; }\
    #scoreboard col.enl { background-color: #017f01; }\
    #scoreboard col.res { background-color: #005684; }\
    #scoreboard .disclaimer { margin-top: 10px; color: yellow; }\
    #scoreboard.mobile { position: absolute; top: 0; width: 100%; }\
    ').appendTo('head');
}
