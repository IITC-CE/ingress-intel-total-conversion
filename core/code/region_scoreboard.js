window.RegionScoreboard = (function() {

  var mainDialog;
  var regionScore;
  var timer;

  function RegionScore(serverResult) {
    this.ori_data = serverResult;
    this.topAgents = serverResult.topAgents;
    this.regionName = serverResult.regionName;
    this.gameScore = serverResult.gameScore;

    this.median=[-1,-1,-1];
    this.CP_COUNT = 35;
    this.CP_DURATION = 5*60*60*1000;
    this.CYCLE_DURATION = this.CP_DURATION * this.CP_COUNT;

    this.checkpoints = [];

    this.hasNoTopAgents = function() {
      return this.topAgents.length===0;
    };

    this.getAvgScore = function(faction) {
      return parseInt(this.gameScore[ faction===TEAM_ENL? 0:1 ]);
    };

    this.getAvgScoreMax = function() {
      return Math.max(this.getAvgScore(TEAM_ENL), this.getAvgScore(TEAM_RES), 1);
    };

    this.getCPScore = function(cp) {
      return this.checkpoints[cp];
    };

    this.getScoreMax = function(min_value) {
      var max = min_value || 0;
      for (var i=1; i<this.checkpoints.length; i++) {
        var cp = this.checkpoints[i];
        max = Math.max(max,cp[0],cp[1]);
      }
      return max;
    };

    this.getCPSum = function() {
      var sums=[0,0];
      for (var i=1; i<this.checkpoints.length; i++) {
        sums[0] += this.checkpoints[i][0];
        sums[1] += this.checkpoints[i][1];
      }

      return sums;
    };


    this.getAvgScoreAtCP = function(faction, cp_idx) {
      var idx = faction===TEAM_RES? 1:0;

      var score = 0;
      var count = 0;
      var cp_len = Math.min(cp_idx,this.checkpoints.length);

      for (var i=1; i<=cp_len; i++) {
        if (this.checkpoints[i] !== undefined) {
          score += this.checkpoints[i][idx];
          count++;
        }
      }

      if (count < cp_idx) {
        score += this.getScoreMedian(faction)*(cp_idx-count);
      }

      return Math.floor(score / cp_idx);
    };


    this.getScoreMedian = function(faction) {
      if (this.median[faction]<0) {
        var idx = faction===TEAM_RES? 1:0;
        var values = this.checkpoints.map( function(val) { return val[idx];} );
        values = values.filter(function(n) { return n !== undefined; });
        this.median[faction] = this.findMedian(values);
      }

      return this.median[faction];
    };

    this.findMedian = function(values) {
      var len = values.length;
      var rank = Math.floor((len-1)/2);

      if (len===0) return 0;

      var l=0, m=len-1;
      var b,i,j,x;
      while (l<m) {
        x=values[rank];
        i=l;
        j=m;
        do {
          while (values[i]<x) i++;
          while (x<values[j]) j--;
          if (i<=j) {
            b = values[i];
            values[i] = values[j];
            values[j] = b;
            i++ ; j-- ;
          }
        } while (i<=j);
        if (j<rank) l=i ;
        if (rank<i) m=j ;
      }
      return values[rank];
    };

    this.getLastCP = function() {
      if (this.checkpoints.length===0) return 0;
      return this.checkpoints.length-1;
    };

    this.getCycleEnd = function() {
      return this.getCheckpointEnd(this.CP_COUNT);
    };

    this.getCheckpointEnd = function(cp) {
      return new Date(this.cycleStartTime.getTime() + this.CP_DURATION * cp);
    };

    for (var i=0; i<serverResult.scoreHistory.length; i++) {
      var h = serverResult.scoreHistory[i];
      this.checkpoints[parseInt(h[0])] = [parseInt(h[1]), parseInt(h[2])];
    }

    this.cycleStartTime = new Date(Math.floor(Date.now() / this.CYCLE_DURATION) * this.CYCLE_DURATION);
  }


  function showDialog() {
    var latLng = map.getCenter();

    var latE6 = Math.round(latLng.lat*1E6);
    var lngE6 = Math.round(latLng.lng*1E6);

    showRegion(latE6, lngE6);
  }


  /*
    function showScoreOf (region) {
      const latlng = regionToLatLong(region);
      const latE6 = Math.round(latLng.lat*1E6);
      const lngE6 = Math.round(latLng.lng*1E6);
      showRegion(latE6,lngE6);
    }
    */


  function showRegion(latE6,lngE6) {
    var text = 'Loading regional scores...';
    if (window.useAndroidPanes()) {
      var style = 'position: absolute; top: 0; width: 100%; max-width: 412px';
      mainDialog = $('<div>',{style: style}).html(text).appendTo(document.body);
    } else {
      mainDialog = dialog({
        title: 'Region scores',
        html: text,
        width: 450,
        height: 340,
        closeCallback: onDialogClose
      });
    }

    window.postAjax('getRegionScoreDetails', {latE6:latE6, lngE6:lngE6},
      onRequestSuccess,
      onRequestFailure);
  }

  function onRequestFailure() {
    mainDialog.html('Failed to load region scores - try again');
  }

  function onRequestSuccess(data) {
    if (data.result === undefined) {
      return onRequestFailure();
    }

    regionScore = new RegionScore(data.result);
    updateDialog();
    startTimer();
  }


  function updateDialog(logscale) {

    mainDialog.html(
      '<div class="cellscore">' +
        '<b>Region scores for ' + regionScore.regionName + '</b>' +
        '<div class="historychart">' + createResults() + RegionScoreboard.HistoryChart.create(regionScore, logscale) + '</div>' +
        '<b>Checkpoint overview</b><div>' + createHistoryTable() + '</div>' +
        '<b>Top agents</b><div>' + createAgentTable() + '</div>' +
      '</div>' +
      createTimers() );

    setupToolTips();

    var tooltip = createResultTooltip();
    $('#overview', mainDialog).tooltip({
      content: convertTextToTableMagic(tooltip)
    });

    $('.cellscore', mainDialog).accordion({
      header: 'b',
      heightStyle: 'fill'
    });

    $('input.logscale', mainDialog).change(function() {
      var input = $(this);
      updateDialog(input.prop('checked'));
    });
  }


  function setupToolTips() {
    $('g.checkpoint', mainDialog).each(function(i, elem) {
      elem = $(elem);

      function formatScore(idx, score_now, score_last) {
        if (!score_now[idx])  return '';
        var res = digits(score_now[idx]);
        if (score_last && score_last[idx]) {
          var delta = score_now[idx]-score_last[idx];
          res += '\t(';
          if (delta>0) res += '+';
          res += digits(delta) + ')';
        }
        return res;
      }

      var tooltip;
      var cp = parseInt(elem.attr('data-cp'));
      if (cp) {
        var score_now = regionScore.getCPScore(cp);
        var score_last = regionScore.getCPScore(cp-1);
        var enl_str = score_now ? '\nEnl:\t' + formatScore(0,score_now,score_last) : '';
        var res_str = score_now ? '\nRes:\t' + formatScore(1,score_now,score_last) : '';

        tooltip = 'CP:\t' + cp + '\t-\t' + formatDayHours(regionScore.getCheckpointEnd(cp)) +
                  '\n<hr>' + enl_str + res_str;
      }

      elem.tooltip({
        content: convertTextToTableMagic(tooltip),
        position: {my: 'center bottom', at: 'center top-10'},
        tooltipClass: 'checkpointtooltip',
        show: 100
      });
    });
  }


  function onDialogClose() {
    stopTimer();
  }


  function createHistoryTable() {

    var _invert = PLAYER.team === 'RESISTANCE';
    function order (_1, _2) {
      return (_invert ? [_2, _1] : [_1, _2]).join('');
    }
    var enl = { class: window.TEAM_TO_CSS[window.TEAM_ENL], name: window.TEAM_NAMES[window.TEAM_ENL]};
    var res = { class: window.TEAM_TO_CSS[window.TEAM_RES], name: window.TEAM_NAMES[window.TEAM_RES]};

    var table = '<table class="checkpoint_table"><thead>' +
      '<tr><th>CP</th><th>Time</th>' + order('<th>'+enl.name+'</th>','<th>'+res.name+'</th>') + '</tr>';

    var total = regionScore.getCPSum();
    table += '<tr class="cp_total"><th></th><th></th>' +
      order(
      '<th class="' + enl.class + '">' + digits(total[0]) + '</th>',
      '<th class="' + res.class + '">' + digits(total[1]) + '</th>'
      ) + '</tr></thead>';

    for (var cp=regionScore.getLastCP(); cp>0; cp--) {
      var score = regionScore.getCPScore(cp);
      var class_e = score[0] > score[1] ? ' class="' + enl.class + '"' : '';
      var class_r = score[1] > score[0] ? ' class="' + res.class + '"' : '';

      table += '<tr>' +
        '<td>' + cp + '</td>' +
        '<td>' + formatDayHours(regionScore.getCheckpointEnd(cp)) + '</td>' +
        order(
        '<td' + class_e + '>' + digits(score[0]) + '</td>',
        '<td' + class_r + '>' + digits(score[1]) + '</td>'
        ) + '</tr>';
    }

    table += '</table>';
    return table;
  }


  function createAgentTable() {
    var agentTable = '<table><tr><th>#</th><th>Agent</th></tr>';

    for (var i=0; i<regionScore.topAgents.length; i++) {
      var agent = regionScore.topAgents[i];
      agentTable += '<tr>' +
        '<td>' + (i+1) + '</td>' +
        '<td class="nickname ' + (agent.team==='RESISTANCE'?'res':'enl') + '">' + agent.nick + '</td></tr>';
    }

    if (regionScore.hasNoTopAgents()) {
      agentTable += '<tr><td colspan="2"><i>no top agents</i></td></tr>';
    }
    agentTable += '</table>';

    return agentTable;
  }


  function createResults() {

    var maxAverage = regionScore.getAvgScoreMax();
    var order = (PLAYER.team === 'RESISTANCE' ? [TEAM_RES,TEAM_ENL]:[TEAM_ENL,TEAM_RES]);

    var result = '<table id="overview" title="">';
    for (var t=0; t<2; t++) {
      var faction = order[t];
      var team = window.TEAM_NAMES[faction];
      var teamClass = window.TEAM_TO_CSS[faction];
      var teamCol = COLORS[faction];
      var barSize = Math.round(regionScore.getAvgScore(faction)/maxAverage*100);
      result += '<tr><th class="' + teamClass + '">' + team + '</th>' +
        '<td class="' + teamClass + '">' + digits(regionScore.getAvgScore(faction)) + '</td>' +
        '<td style="width:100%"><div style="background:' + teamCol + '; width: ' + barSize + '%; height: 1.3ex; border: 2px outset ' + teamCol + '; margin-top: 2px"> </td>' +
        '<td class="' + teamClass + '"><small>( ' + digits(regionScore.getAvgScoreAtCP(faction,35)) + ' )</small></td>' +
        '</tr>';
    }

    return result + '</table>';
  }

  function createResultTooltip() {

    var e_res = regionScore.getAvgScoreAtCP(TEAM_RES,regionScore.CP_COUNT);
    var e_enl = regionScore.getAvgScoreAtCP(TEAM_ENL,regionScore.CP_COUNT);
    var loosing_faction = e_res<e_enl ? TEAM_RES : TEAM_ENL;

    var order = (loosing_faction === TEAM_ENL ? [TEAM_RES,TEAM_ENL]:[TEAM_ENL,TEAM_RES]);

    function percentToString(score,total) {
      if (total===0) return '50%';
      return (Math.round( score/total * 10000 )/100) + '%';
    }

    function currentScore() {
      var res='Current:\n';
      var total = regionScore.getAvgScore(TEAM_RES) + regionScore.getAvgScore(TEAM_ENL);
      for (var t=0; t<2; t++) {
        var faction = order[t];
        var score = regionScore.getAvgScore(faction);
        res += window.TEAM_NAMES[faction] + '\t' +
            digits(score) + '\t' +
            percentToString(score,total) + '\n';
      }

      return res;
    }

    function estimatedScore() {
      var res ='<hr>Estimated:\n';
      var total = e_res + e_enl;
      for (var t=0; t<2; t++) {
        var faction = order[t];
        var score = regionScore.getAvgScoreAtCP(faction,regionScore.CP_COUNT);
        res += window.TEAM_NAMES[faction] + '\t' +
            digits(score) + '\t' +
            percentToString(score,total) + '\n';
      }

      return res;
    }

    function requiredScore() {
      var res='';
      var required_mu = Math.abs(e_res-e_enl) * regionScore.CP_COUNT + 1;
      res += '<hr>\n';
      res += window.TEAM_NAMES[loosing_faction] + ' requires:\t' + digits(Math.ceil(required_mu)) + ' \n';
      res += 'Checkpoint(s) left:\t' + (regionScore.CP_COUNT-regionScore.getLastCP()) + ' \n';

      return res;
    }

    return currentScore() + estimatedScore() + requiredScore();
  }


  function createTimers() {
    var nextcp = regionScore.getCheckpointEnd( regionScore.getLastCP() + 1 );
    var endcp = regionScore.getCycleEnd();

    return '<div class="checkpoint_timers"><table><tr>' +
        '<td>Next CP at: ' + formatHours(nextcp) + ' (in <span id="cycletimer"></span>)</td>' +
        '<td>Cycle ends: ' + formatDayHours(endcp) + '</td>' +
      '</tr></table></div>';
  }

  function startTimer() {
    stopTimer();

    timer = window.setInterval(onTimer, 1000);
    onTimer();
  }

  function stopTimer() {
    if (timer) {
      window.clearInterval(timer);
      timer = undefined;
    }
  }

  function onTimer() {
    var d = regionScore.getCheckpointEnd(regionScore.getLastCP() + 1) - (new Date());
    $('#cycletimer',mainDialog).html(formatMinutes( Math.max(0,Math.floor(d/1000))) );
  }

  function formatMinutes(sec) {
    var hours   = Math.floor(sec / 3600);
    var minutes = Math.floor((sec % 3600) / 60);
    sec = sec % 60;

    var time='';
    time += hours + ':';
    if (minutes<10) time += '0';
    time += minutes;
    time += ':';
    if (sec<10) time += '0';
    time += sec;
    return time;
  }

  function formatHours(time) {
    return ('0' + time.getHours()).slice(-2) + ':00';
  }
  function formatDayHours(time) {
    return ('0' + time.getDate()).slice(-2) + '.' + ('0' + (time.getMonth() + 1)).slice(-2) + ' ' + ('0' + time.getHours()).slice(-2) + ':00';
  }

  function setup() {
    if (window.useAndroidPanes()) {
      android.addPane('regionScoreboard', 'Region scores', 'ic_action_view_as_list');
      addHook('paneChanged', function (pane) {
        if (pane === 'regionScoreboard') {
          showDialog();
        } else if (mainDialog) {
          mainDialog.remove();
        }
      });
    } else {
      $('<a>')
        .html('Region scores')
        .attr('title','View regional scoreboard')
        .click(showDialog)
        .appendTo('#toolbox');
    }
  }

  return {
    setup: setup,
    showDialog: showDialog
  };

}());


RegionScoreboard.HistoryChart = (function() {
  var regionScore;
  var scaleFct;
  var logscale;
  var svgTickText;

  function create(_regionScore,logscale) {
    regionScore = _regionScore;

    var max = regionScore.getScoreMax(10); //NOTE: ensure a min of 10 for the graph
    max *= 1.09;      // scale up maximum a little, so graph isn't squashed right against upper edge
    setScaleType(max,logscale);

    svgTickText = [];

    // svg area 400x130. graph area 350x100, offset to 40,10
    var svg = '<div><svg width="400" height="133" style="margin-left: 10px;">' +
      svgBackground() +
      svgAxis(max) +
      svgAveragePath() +
      svgFactionPath() +
      svgCheckPointMarkers() +
      svgTickText.join('') +
      '<foreignObject height="18" width="60" y="113" x="0" class="node"><label title="Logarithmic scale">' +
      '<input type="checkbox" class="logscale"' + (logscale?' checked':'') + '/>' +
      'log</label></foreignObject>' +
      '</svg></div>';

    return svg;
  }

  function svgFactionPath() {

    var svgPath = '';

    for (var t=0; t<2; t++) {

      var col = getFactionColor(t);
      var teamPaths = [];

      for (var cp=1; cp<=regionScore.getLastCP(); cp++) {

        var score = regionScore.getCPScore(cp);
        if (score !== undefined) {
          var x = cp * 10 + 40;
          teamPaths.push(x + ',' + scaleFct(score[t]));
        }
      }

      if (teamPaths.length > 0) {
        svgPath += '<polyline points="' + teamPaths.join(' ') + '" stroke="' + col + '" fill="none" />';
      }
    }

    return svgPath;
  }

  function svgCheckPointMarkers() {

    var markers = '';

    var col1 = getFactionColor(0);
    var col2 = getFactionColor(1);

    for (var cp=1; cp<=regionScore.CP_COUNT; cp++) {
      var scores = regionScore.getCPScore(cp);

      markers +=
        '<g title="dummy" class="checkpoint" data-cp="' + cp + '">' +
        '<rect x="' + (cp*10+35) + '" y="10" width="10" height="100" fill="black" fill-opacity="0" />';

      if (scores) {
        markers +=
          '<circle cx="' + (cp*10+40) + '" cy="' + scaleFct(scores[0]) + '" r="3" stroke-width="1" stroke="' + col1 + '" fill="' + col1 + '" fill-opacity="0.5" />' +
          '<circle cx="' + (cp*10+40) + '" cy="' + scaleFct(scores[1]) + '" r="3" stroke-width="1" stroke="' + col2 + '" fill="' + col2 + '" fill-opacity="0.5" />';
      }

      markers += '</g>';
    }

    return markers;
  }

  function svgBackground() {
    return '<rect x="0" y="1" width="400" height="132" stroke="#FFCE00" fill="#08304E" />';
  }

  function svgAxis(max) {
    return '<path d="M40,110 L40,10 M40,110 L390,110" stroke="#fff" />' + createTicks(max);
  }

  function createTicks(max) {
    var ticks = createTicksHorz();

    function addVTick(i) {
      var y = scaleFct(i);

      ticks.push('M40,' + y + ' L390,' + y);
      svgTickText.push('<text x="35" y="' + y + '" font-size="12" font-family="Roboto, Helvetica, sans-serif" text-anchor="end" fill="#fff">' + formatNumber(i) + '</text>');
    }

    // vertical
    // first we calculate the power of 10 that is smaller than the max limit
    var vtickStep = Math.pow(10,Math.floor(Math.log10(max)));
    if (logscale) {
      for (var i=0; i<4; i++) {

        addVTick(vtickStep);
        vtickStep /= 10;
      }
    } else {
      // this could be between 1 and 10 grid lines - so we adjust to give nicer spacings
      if (vtickStep < (max/5)) {
        vtickStep *= 2;
      } else if (vtickStep > (max/2)) {
        vtickStep /= 2;
      }

      for (var ti=vtickStep; ti<=max; ti+=vtickStep) {
        addVTick(ti);
      }
    }

    return ('<path d="' + ticks.join(' ') + '" stroke="#fff" opacity="0.3" />');
  }

  function createTicksHorz() {
    var ticks = [];
    for (var i=5; i<=35; i+=5) {
      var x = i * 10 + 40;
      ticks.push('M' + x + ',10 L' + x + ',110');
      svgTickText.push('<text x="' + x + '" y="125" font-size="12" font-family="Roboto, Helvetica, sans-serif" text-anchor="middle" fill="#fff">' + i + '</text>');
    }

    return ticks;
  }

  function svgAveragePath() {
    var path='';
    for (var faction=1; faction<3; faction++) {
      var col = COLORS[faction];

      var points=[];
      for (var cp=1; cp<=regionScore.CP_COUNT; cp++) {
        var score = regionScore.getAvgScoreAtCP(faction, cp);

        var x = cp * 10 + 40;
        var y = scaleFct(score);
        points.push(x + ',' + y);
      }

      path += '<polyline points="' + points.join(' ') + '" stroke="' + col + '" stroke-dasharray="3,2" opacity="0.8" fill="none"/>';
    }

    return path;
  }

  function setScaleType(max,useLogScale) {

    logscale = useLogScale;
    if (useLogScale) {
      if (!Math.log10)
        Math.log10 = function(x) { return Math.log(x) / Math.LN10; };

      // 0 cannot be displayed on a log scale, so we set the minimum to 0.001 and divide by lg(0.001)=-3
      scaleFct = function(y) { return Math.round(10 - Math.log10(Math.max(0.001,y/max)) / 3 * 100); };
    } else {
      scaleFct = function(y) { return Math.round(110-y/max*100); };
    }
  }

  function getFactionColor(t) {
    return (t===0 ? COLORS[TEAM_ENL] : COLORS[TEAM_RES]);
  }

  function formatNumber(num) {
    return (num>=1000000000 ? (num/1000000000) + 'B' :
      num>=1000000 ? (num/1000000) + 'M' :
        num>=1000 ? (num/1000) + 'k' :
          num);
  }

  return {
    create: create
  };

}());
