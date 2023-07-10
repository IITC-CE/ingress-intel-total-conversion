
// GAME STATUS ///////////////////////////////////////////////////////
// MindUnit display


window.updateGameScore = function(data) {
  if(!data) {
    // move the postAjax call onto a very short timer. this way, if it throws an exception, it won't prevent IITC booting
    setTimeout (function() { window.postAjax('getGameScore', {}, window.updateGameScore); }, 1);
    return;
  }

  if (data && data.result) {

    var e = parseInt(data.result[0]); //enlightened score in result[0]
    var r = parseInt(data.result[1]); //resistance score in result[1]
    var s = r+e;
    var rp = r/s*100, ep = e/s*100;
    r = digits(r), e = digits(e);
    var teamId = window.teamStringToId(window.PLAYER.team);
    var rs = '<span class="res" style="width:' + rp + '%;text-align: ' + (teamId === window.TEAM_RES ? 'right' : 'left') + ';">' + Math.round(rp) + '%</span>';
    var es = '<span class="enl" style="width:' + ep + '%;text-align: ' + (teamId === window.TEAM_ENL ? 'right' : 'left') + ';">' + Math.round(ep) + '%</span>';
    var gamestatElement = $('#gamestat');
    gamestatElement.html(teamId === window.TEAM_RES ? rs + es : es + rs).one('click', function () {
      window.updateGameScore();
    });
    // help cursor via “#gamestat span”
    var resMu = 'Resistance:\t' + r + ' MindUnits';
    var enlMu = 'Enlightened:\t' + e + ' MindUnits';
    gamestatElement.attr('title', teamId === window.TEAM_RES ? resMu + '\n' + enlMu : enlMu + '\n' + resMu);
  } else if (data && data.error) {
    log.warn('game score failed to load: '+data.error);
  } else {
    log.warn('game score failed to load - unknown reason');
  }

  // TODO: idle handling - don't refresh when IITC is idle!
  window.setTimeout('window.updateGameScore', REFRESH_GAME_SCORE*1000);
}
