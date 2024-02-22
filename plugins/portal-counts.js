// @author         yenky
// @name           Portal count
// @category       Info
// @version        0.2.4
// @description    Display a list of all localized portals by level and faction.

/* global IITC -- eslint */
/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '0.2.4',
    changes: ['IITC.toolbox API is used to create plugin buttons'],
  },
];

// use own namespace for plugin
window.plugin.portalcounts = {
  BAR_TOP: 20,
  BAR_HEIGHT: 180,
  BAR_WIDTH: 25,
  BAR_PADDING: 5,
  RADIUS_INNER: 70,
  RADIUS_OUTER: 100,
  nozeroes: true
};

window.plugin.portalcounts.withPlayerFactionStyles = function (factionFunction) {
  window.TEAM_TO_CSS.forEach((teamStyle, index) => {
    // skip neutral faction
    if (index === window.TEAM_NONE) return true;
    factionFunction(teamStyle, index);
  });
};

window.plugin.portalcounts.createTableHtml = function () {
  var self = window.plugin.portalcounts;
  var tableHtml = '<table><tr><th></th>';
  self.withPlayerFactionStyles((teamStyle, index) => {
    tableHtml += `<th class="${teamStyle}">${window.TEAM_NAMES[index]}</th>`;
  });
  tableHtml += '</tr>';

  for (var level = window.MAX_PORTAL_LEVEL; level > 0; level--) {
    var rowTitle = 'Level ' + level;
    var levelData = self.portalDataByLevel[level];
    tableHtml += '<tr' + (levelData.count ? '' : ' class="zeroes"') + '>';
    tableHtml += `<td class="L${level}">${rowTitle}</td>`;
    self.withPlayerFactionStyles((teamStyle, index) => {
      tableHtml += `<td class="${teamStyle}">${levelData.teamCount[index]}</td>`;
    });
    tableHtml += '</tr>';
  }

  var neutralData = self.portalDataByLevel[0];
  tableHtml += '<tr' + (neutralData.count - neutralData.teamCount[window.TEAM_NONE] ? '' : ' class="zeroes"') + '>';
  tableHtml += `<td class="L0">Placeholders</td>`;
  self.withPlayerFactionStyles((teamStyle, index) => {
    tableHtml += `<td class="${teamStyle}">${neutralData.teamCount[index]}</td>`;
  });
  tableHtml += '</tr>';

  tableHtml += '<tr><th>Total:</th>';
  self.withPlayerFactionStyles((styleName, teamIndex) => {
    tableHtml += `<td class="${styleName}">${self.portalDataByTeam[teamIndex].count}</td>`;
  });
  tableHtml += '</tr>';
  tableHtml += `<tr><td>Neutral:</td><td colspan="${window.TEAM_NAMES.length - 1}">${self.portalDataByTeam[window.TEAM_NONE].count}</td></tr></table>`;
  return tableHtml;
};

window.plugin.portalcounts.appendOuterPieLayer = function (parent, originAngle, team, total) {
  var self = window.plugin.portalcounts;
  var startAngle = originAngle;
  self.portalDataByTeam[team].levelCount.forEach((value, index) => {
    var endAngle = startAngle + value / total;
    self.makeRing(startAngle, endAngle, index).appendTo(parent);
    startAngle = endAngle;
  });
};

window.plugin.portalcounts.createPieChart = function (total) {
  var self = window.plugin.portalcounts;
  // pie graph
  var g = $('<g>').attr(
    'transform',
    self.format('translate(%s,%s)', (window.TEAM_NAMES.length + 1) * (self.BAR_WIDTH + self.BAR_PADDING) + self.RADIUS_OUTER, self.RADIUS_OUTER)
  );

  // inner parts - factions
  var startAngle = 0;
  window.COLORS.forEach((value, index) => {
    var endAngle = startAngle + self.portalDataByTeam[index].count / total;
    self.makePie(startAngle, endAngle, value, window.TEAM_NAMES[index]).appendTo(g);
    self.appendOuterPieLayer(g, startAngle, index, total);

    startAngle = endAngle;
  });
  // // black line from center to top
  // $('<line>')
  // .attr({
  //   x1            : self.resP < self.enlP ? 0.5 : -0.5,
  //   y1            : 0,
  //   x2            : self.resP < self.enlP ? 0.5 : -0.5,
  //   y2            : -self.RADIUS_OUTER,
  //   stroke        : '#000',
  //   'stroke-width': 1
  // })
  // .appendTo(g);
  //
  // // if there are no neutral portals, draw a black line between res and enl
  // if(self.neuP == 0) {
  //   var x = Math.sin((0.5 - self.resP / total) * 2 * Math.PI) * self.RADIUS_OUTER;
  //   var y = Math.cos((0.5 - self.resP / total) * 2 * Math.PI) * self.RADIUS_OUTER;
  //
  //   $('<line>')
  //   .attr({
  //     x1            : self.resP < self.enlP ? 0.5 : -0.5,
  //     y1            : 0,
  //     x2            : x,
  //     y2            : y,
  //     stroke        : '#000',
  //     'stroke-width': 1
  //   })
  //   .appendTo(g);
  // }

  return g;
};

window.plugin.portalcounts.createSvgHtml = function (total) {
  var self = window.plugin.portalcounts;

  const pieDiameter = 2 * self.RADIUS_OUTER;
  const totalWidth = (window.TEAM_NAMES.length + 1) * (self.BAR_WIDTH + self.BAR_PADDING) + pieDiameter;
  const bestHeight = Math.max(self.BAR_HEIGHT, pieDiameter);
  var svg = $('<svg width="' + totalWidth + '" height="' + bestHeight + '">').css('margin-top', 10);
  var all = Object.keys(self.portalDataByLevel).map((value, index) => {
    return self.portalDataByLevel[index].count;
  });

  // bar graphs
  self.makeBar(all, 'All', '#FFFFFF', 0).appendTo(svg);
  self.withPlayerFactionStyles((styleName, team) => {
    self
      .makeBar(self.portalDataByTeam[team].levelCount, window.TEAM_NAMES[team], window.COLORS[team], team * (self.BAR_WIDTH + self.BAR_PADDING))
      .appendTo(svg);
  });

  self.createPieChart(total).appendTo(svg);

  return svg;
};

// count portals for each level available on the map
window.plugin.portalcounts.getPortals = function () {
  // console.log('** getPortals');
  var self = window.plugin.portalcounts;
  var displayBounds = window.map.getBounds();

  self.portalDataByLevel = [...Array(window.MAX_PORTAL_LEVEL + 1).keys()].reduce((p, c) => {
    p[c] = {
      count: 0,
      teamCount: Array(window.TEAM_TO_CSS.length).fill(0),
    };
    return p;
  }, []);

  self.portalDataByTeam = window.TEAM_TO_CSS.reduce((p, c, i) => {
    p[i] = {
      count: 0,
      levelCount: Array(window.MAX_PORTAL_LEVEL + 1).fill(0),
    };
    return p;
  }, []);

  var total = 0;
  $.each(window.portals, function (i, portal) {
    var level = portal.options.level;
    var team = portal.options.team;
    // just count portals in viewport
    if (!displayBounds.contains(portal.getLatLng())) return true;

    total++;

    var levelData = self.portalDataByLevel[level];
    levelData.count++;
    levelData.teamCount[team]++;

    var teamData = self.portalDataByTeam[team];
    teamData.count++;
    teamData.levelCount[level]++;
  });

  var counts = '';
  if (total > 0) {
    counts += self.createTableHtml();
    counts += $('<div>').append(self.createSvgHtml(total)).html();
  } else {
    counts += '<p>No Portals in range!</p>';
  }

  if (!window.getDataZoomTileParameters().hasPortals) {
    counts += '<p class="help"><b>Warning</b>: Portal counts is inaccurate when zoomed to link-level</p>';
  }

  var title = total + ' ' + (total == 1 ? 'portal' : 'portals');

  if (window.useAppPanes()) {
    $('<div id="portalcounts" class="mobile">'
    + '<div class="ui-dialog-titlebar"><span class="ui-dialog-title ui-dialog-title-active">' + title + '</span></div>'
    + counts
    + '</div>').appendTo(document.body);
  } else {
    dialog({
      html: '<div id="portalcounts">' + counts + '</div>',
      title: 'Portal counts: ' + title,
      id: 'plugin-portal-counts',
      width: 'auto'
    });
  }
  if (window.plugin.portalcounts.nozeroes) {
    $('#portalcounts').addClass('nozeroes');
  }
  $('#portalcounts svg').click(function () {
    $('#portalcounts').toggleClass('nozeroes');
  });
}

window.plugin.portalcounts.makeBar = function(portals, text, color, shift) {
  var self = window.plugin.portalcounts;
  var g = $('<g>').attr('transform', 'translate('+shift+',0)');
  var sum = portals.reduce(function(a,b){ return a+b });
  var top = self.BAR_TOP;

  if(sum != 0) {
    for(var i=portals.length-1;i>=0;i--) {
      if(!portals[i])
        continue;
      var height = self.BAR_HEIGHT * portals[i] / sum;
      $('<rect>')
        .attr({
          x: 0,
          y: top,
          width: self.BAR_WIDTH,
          height: height,
          fill: window.COLORS_LVL[i],
          title: 'L' + i,
        })
        .appendTo(g);
      top += height;
    }
  }

  $('<text>')
    .html(
      text
        .replaceAll(/[^a-z]/gi, '')
        .substring(0, 3)
        .toLowerCase()
        .capitalize()
    )
    .attr({
      x: self.BAR_WIDTH * 0.5,
      y: self.BAR_TOP * 0.75,
      fill: color,
      'text-anchor': 'middle',
      title: text,
    })
    .appendTo(g);

  return g;
};

window.plugin.portalcounts.makePie = function (startAngle, endAngle, color, teamName) {
  if(startAngle == endAngle)
    return $([]); // return empty element query

  var self = window.plugin.portalcounts;
  var large_arc = (endAngle - startAngle) > 0.5 ? 1 : 0;

  var labelAngle = (endAngle + startAngle) / 2;
  var label = Math.round((endAngle - startAngle) * 100) + '%';

  startAngle = 0.5 - startAngle;
  endAngle   = 0.5 - endAngle;
  labelAngle = 0.5 - labelAngle;

  var p1x = Math.sin(startAngle * 2 * Math.PI) * self.RADIUS_INNER;
  var p1y = Math.cos(startAngle * 2 * Math.PI) * self.RADIUS_INNER;
  var p2x = Math.sin(endAngle   * 2 * Math.PI) * self.RADIUS_INNER;
  var p2y = Math.cos(endAngle   * 2 * Math.PI) * self.RADIUS_INNER;
  var lx  = Math.sin(labelAngle * 2 * Math.PI) * self.RADIUS_INNER / 1.5;
  var ly  = Math.cos(labelAngle * 2 * Math.PI) * self.RADIUS_INNER / 1.5;

  // for a full circle, both coordinates would be identical, so no circle would be drawn
  if(startAngle == 0.5 && endAngle == -0.5)
    p2x -= 1E-5;

  var text = $('<text>')
    .attr({
      'text-anchor': 'middle',
      'dominant-baseline' :'central',
      x: lx,
      y: ly,
      title: teamName,
    })
    .html(label);

  var path = $('<path>').attr({
    fill: color,
    d: self.format('M %s,%s A %s,%s 0 %s 1 %s,%s L 0,0 z', p1x, p1y, self.RADIUS_INNER, self.RADIUS_INNER, large_arc, p2x, p2y),
    title: teamName,
  });

  return path.add(text); // concat path and text
};

window.plugin.portalcounts.makeRing = function (startAngle, endAngle, level) {
  var self = window.plugin.portalcounts;
  var large_arc = (endAngle - startAngle) > 0.5 ? 1 : 0;

  startAngle = 0.5 - startAngle;
  endAngle   = 0.5 - endAngle;

  var p1x = Math.sin(startAngle * 2 * Math.PI) * self.RADIUS_OUTER;
  var p1y = Math.cos(startAngle * 2 * Math.PI) * self.RADIUS_OUTER;
  var p2x = Math.sin(endAngle   * 2 * Math.PI) * self.RADIUS_OUTER;
  var p2y = Math.cos(endAngle   * 2 * Math.PI) * self.RADIUS_OUTER;
  var p3x = Math.sin(endAngle   * 2 * Math.PI) * self.RADIUS_INNER;
  var p3y = Math.cos(endAngle   * 2 * Math.PI) * self.RADIUS_INNER;
  var p4x = Math.sin(startAngle * 2 * Math.PI) * self.RADIUS_INNER;
  var p4y = Math.cos(startAngle * 2 * Math.PI) * self.RADIUS_INNER;

  // for a full circle, both coordinates would be identical, so no circle would be drawn
  if(startAngle == 0.5 && endAngle == -0.5) {
    p2x -= 1E-5;
    p3x -= 1E-5;
  }

  return $('<path>').attr({
    fill: window.COLORS_LVL[level],
    d:
      self.format('M %s,%s ', p1x, p1y) +
      self.format('A %s,%s 0 %s 1 %s,%s ', self.RADIUS_OUTER, self.RADIUS_OUTER, large_arc, p2x, p2y) +
      self.format('L %s,%s ', p3x, p3y) +
      self.format('A %s,%s 0 %s 0 %s,%s ', self.RADIUS_INNER, self.RADIUS_INNER, large_arc, p4x, p4y) +
      'Z',
    title: 'L' + level,
  });
};

window.plugin.portalcounts.format = function(str) {
  var re = /%s/;
  for(var i = 1; i < arguments.length; i++) {
    str = str.replace(re, arguments[i]);
  }
  return str;
}

window.plugin.portalcounts.onPaneChanged = function(pane) {
  if(pane == 'plugin-portalcounts')
    window.plugin.portalcounts.getPortals();
  else
    $('#portalcounts').remove()
};

var setup =  function() {
  if (window.useAppPanes()) {
    app.addPane('plugin-portalcounts', 'Portal counts', 'ic_action_data_usage');
    addHook('paneChanged', window.plugin.portalcounts.onPaneChanged);
  } else {
    IITC.toolbox.addButton({
      label: 'Portal counts',
      title: 'Display a summary of portals in the current view',
      action: window.plugin.portalcounts.getPortals,
    });
  }

  $('head').append('<style>' +
    '#portalcounts.mobile {background: transparent; border: 0 none !important; height: 100% !important; width: 100% !important; left: 0 !important; top: 0 !important; position: absolute; overflow: auto; z-index: 9000 !important; }' +
    '#portalcounts table {margin-top:5px; border-collapse: collapse; empty-cells: show; width:100%; clear: both;}' +
    '#portalcounts table td, #portalcounts table th {border-bottom: 1px solid #0b314e; padding:3px; color:white; background-color:#1b415e}' +
    '#portalcounts table tr.res th {  background-color: #005684; }' +
    '#portalcounts table tr.enl th {  background-color: #017f01; }' +
    '#portalcounts table th { text-align: center;}' +
    '#portalcounts table td { text-align: center;}' +
    '#portalcounts table td.L0 { background-color: #000000 !important;}' +
    '#portalcounts table td.L1 { background-color: #FECE5A !important;}' +
    '#portalcounts table td.L2 { background-color: #FFA630 !important;}' +
    '#portalcounts table td.L3 { background-color: #FF7315 !important;}' +
    '#portalcounts table td.L4 { background-color: #E40000 !important;}' +
    '#portalcounts table td.L5 { background-color: #FD2992 !important;}' +
    '#portalcounts table td.L6 { background-color: #EB26CD !important;}' +
    '#portalcounts table td.L7 { background-color: #C124E0 !important;}' +
    '#portalcounts table td.L8 { background-color: #9627F4 !important;}' +
    '#portalcounts table td:nth-child(1) { text-align: left;}' +
    '#portalcounts table th:nth-child(1) { text-align: left;}' +
    '#portalcounts table th:nth-child(1) { text-align: left;}' +
    '#portalcounts.nozeroes table tr.zeroes { display: none;}' +
    '</style>');
}
