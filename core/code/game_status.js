
// GAME STATUS ///////////////////////////////////////////////////////
// MindUnit display


window.updateGameScore = function (data) {
    if (!data) {
        // move the postAjax call onto a very short timer. this way, if it throws an exception, it won't prevent IITC booting
        setTimeout(function () { window.postAjax('getGameScore', {}, window.updateGameScore); }, 1);
        return;
    }

    if (data && data.result) {

        const enl_score = parseInt(data.result[0]);
        const res_score = parseInt(data.result[1]);
        const total_score = res_score + enl_score;
        let res_percent = res_score / total_score * 100;
        let enl_percent = enl_score / total_score * 100;
        if (total_score === 0) {
            res_percent = 50;
            enl_percent = 50;
        }
        const res_string = digits(res_score);
        const enl_string = digits(enl_score);
        var rs = '<span class="res" style="width:' + res_percent + '%;">' + Math.round(res_percent) + '%&nbsp;</span>';
        var es = '<span class="enl" style="width:' + enl_percent + '%;">&nbsp;' + Math.round(enl_percent) + '%</span>';
        $('#gamestat').html(rs + es).one('click', function () { window.updateGameScore() });
        // help cursor via “#gamestat span”
        $('#gamestat').attr('title', 'Resistance:\t' + res_string + ' MindUnits\nEnlightened:\t' + enl_string + ' MindUnits');
    } else if (data && data.error) {
        log.warn('game score failed to load: ' + data.error);
    } else {
        log.warn('game score failed to load - unknown reason');
    }

    // TODO: idle handling - don't refresh when IITC is idle!
    window.setTimeout('window.updateGameScore', REFRESH_GAME_SCORE * 1000);
}
