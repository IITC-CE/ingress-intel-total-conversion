// ==UserScript==
// @author         Zaso
// @name           Logs Diary
// @category       Misc
// @version        0.0.2.20200216.174029
// @description    Storage favorite logs.
// @id             logs-diary@Zaso
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/logs-diary.user.js
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/logs-diary.meta.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'ZasoItems';
plugin_info.dateTimeVersion = '2020-02-16-174029';
plugin_info.pluginId = 'logs-diary';
//END PLUGIN AUTHORS NOTE



// PLUGIN START ////////////////////////////////////////////////////////
// History
// 0.0.2 Headers changed. Ready for IITC-CE
// 0.0.1 Original sript


	// use own namespace for plugin
	window.plugin.logsDiary = function(){};

	window.plugin.logsDiary.obj = {};
	window.plugin.logsDiary.storage = {};
	window.plugin.logsDiary.data = {};
	window.plugin.logsDiary.ui = {};
	window.plugin.logsDiary.action = {};

	window.plugin.logsDiary.obj.log = {};

    //FIX-CHAT-------------------
	window.plugin.logsDiary.data.fixChatFunction = function(){
        window.chat.renderData = function(data, element, likelyWereOldMsgs){
            var elm = $('#'+element);
            if(elm.is(':hidden')) return;

            // discard guids and sort old to new
            //TODO? stable sort, to preserve server message ordering? or sort by GUID if timestamps equal?
            var vals = $.map(data, function(v, k) { return [v]; });
            vals = vals.sort(function(a, b) { return a[0]-b[0]; });

            // render to string with date separators inserted
            var msgs = '';
            var prevTime = null;
            $.each(vals, function(ind, msg){
                var nextTime = new Date(msg[0]).toLocaleDateString();
                    var guid = msg[4];
                    var heart = window.plugin.logsDiary.ui.getToggleHTML(guid);
                    var htmlEdited = msg[2].replace('<tr><td>', window.plugin.logsDiary.ui.getRowStartHTML(guid)+heart);

                if(prevTime && prevTime !== nextTime)
                    msgs += chat.renderDivider(nextTime);
    //            msgs += msg[2];
                msgs += htmlEdited;
                prevTime = nextTime;
            });

            var scrollBefore = scrollBottom(elm);
            elm.html('<table>' + msgs + '</table>');
            chat.keepScrollPosition(elm, scrollBefore, likelyWereOldMsgs);
        }
        window.chat.writeDataToHash = function(newData, storageHash, isPublicChannel, isOlderMsgs){
            $.each(newData.result, function(ind, json){
                // avoid duplicates
                if(json[0] in storageHash.data) return true;

                var isSecureMessage = false;
                var msgToPlayer = false;

                var time = json[1];
                var team = json[2].plext.team === 'RESISTANCE' ? TEAM_RES : TEAM_ENL;
                var auto = json[2].plext.plextType !== 'PLAYER_GENERATED';
                var systemNarrowcast = json[2].plext.plextType === 'SYSTEM_NARROWCAST';

                //track oldest + newest timestamps
                if (storageHash.oldestTimestamp === -1 || storageHash.oldestTimestamp > time) storageHash.oldestTimestamp = time;
                if (storageHash.newestTimestamp === -1 || storageHash.newestTimestamp < time) storageHash.newestTimestamp = time;

                //remove "Your X on Y was destroyed by Z" from the faction channel

                var msg = '', nick = '';
                $.each(json[2].plext.markup, function(ind, markup) {
                    switch(markup[0]) {
                        case 'SENDER': // user generated messages
                            nick = markup[1].plain.slice(0, -2); // cut “: ” at end
                            break;

                        case 'PLAYER': // automatically generated messages
                            nick = markup[1].plain;
                            team = markup[1].team === 'RESISTANCE' ? TEAM_RES : TEAM_ENL;
                            if(ind > 0) msg += nick; // don’t repeat nick directly
                            break;

                        case 'TEXT':
                            msg += $('<div/>').text(markup[1].plain).html().autoLink();
                            break;

                        case 'AT_PLAYER':
                            var thisToPlayer = (markup[1].plain == ('@'+window.PLAYER.nickname));
                            var spanClass = thisToPlayer ? "pl_nudge_me" : (markup[1].team + " pl_nudge_player");
                            var atPlayerName = markup[1].plain.replace(/^@/, "");
                            msg += $('<div/>').html($('<span/>')
                                                    .attr('class', spanClass)
                                                    .attr('onclick',"window.chat.nicknameClicked(event, '"+atPlayerName+"')")
                                                    .text(markup[1].plain)).html();
                            msgToPlayer = msgToPlayer || thisToPlayer;
                            break;

                        case 'PORTAL':
                            var latlng = [markup[1].latE6/1E6, markup[1].lngE6/1E6];
                            var perma = '/intel?ll='+latlng[0]+','+latlng[1]+'&z=17&pll='+latlng[0]+','+latlng[1];
                            var js = 'window.selectPortalByLatLng('+latlng[0]+', '+latlng[1]+');return false';

                            msg += '<a onclick="'+js+'"'
                                + ' title="'+markup[1].address+'"'
                                + ' href="'+perma+'" class="help">'
                                + window.chat.getChatPortalName(markup[1])
                                + '</a>';
                            break;

                        case 'SECURE':
                            //NOTE: we won't add the '[secure]' string here - it'll be handled below instead
                            isSecureMessage = true;
                            break;

                        default:
                            //handle unknown types by outputting the plain text version, marked with it's type
                            msg += $('<div/>').text(markup[0]+':<'+markup[1].plain+'>').html();
                            break;
                    }
                });


    //            //skip secure messages on the public channel
    //            if (isPublicChannel && isSecureMessage) return true;

    //            //skip public messages (e.g. @player mentions) on the secure channel
    //            if ((!isPublicChannel) && (!isSecureMessage)) return true;


                //NOTE: these two are redundant with the above two tests in place - but things have changed...
                //from the server, private channel messages are flagged with a SECURE string '[secure] ', and appear in
                //both the public and private channels
                //we don't include this '[secure]' text above, as it's redundant in the faction-only channel
                //let's add it here though if we have a secure message in the public channel, or the reverse if a non-secure in the faction one
                if (!auto && !(isPublicChannel===false) && isSecureMessage) msg = '<span style="color: #f88; background-color: #500;">[faction]</span> ' + msg;
                //and, add the reverse - a 'public' marker to messages in the private channel
                if (!auto && !(isPublicChannel===true) && (!isSecureMessage)) msg = '<span style="color: #ff6; background-color: #550">[public]</span> ' + msg;

                // format: timestamp, autogenerated, HTML message
    //            storageHash.data[json[0]] = [json[1], auto, chat.renderMsg(msg, nick, time, team, msgToPlayer, systemNarrowcast, json[0]), nick];

                var guid = json[0];
                var htmlLOG = chat.renderMsg(msg, nick, time, team, msgToPlayer, systemNarrowcast, guid);
                storageHash.data[json[0]] = [json[1], auto, htmlLOG, nick, guid];
            });
        }
    };

    //---------------------------

	window.plugin.logsDiary.storage.NAME = 'plugin-logs-diary';
	window.plugin.logsDiary.storage.save = function(){
		window.localStorage[window.plugin.logsDiary.storage.NAME] = JSON.stringify(window.plugin.logsDiary.obj.log);
	}
	window.plugin.logsDiary.storage.load = function(){
		window.plugin.logsDiary.obj.log = JSON.parse(window.localStorage[window.plugin.logsDiary.storage.NAME]);
	}
	window.plugin.logsDiary.storage.check = function(){
		if(window.localStorage[window.plugin.logsDiary.storage.NAME] === undefined){
			window.localStorage[window.plugin.logsDiary.storage.NAME] = '{}';
		}
		window.plugin.logsDiary.storage.load();
	}
	window.plugin.logsDiary.storage.reset = function(){
		window.localStorage[window.plugin.logsDiary.storage.NAME] = '{}';
        window.plugin.logsDiary.storage.check();
        $('.logsDiaryDialog').html(window.plugin.logsDiary.ui.getAllLogsSavedHTML());
	}

	window.plugin.logsDiary.data.fixOldStorage = function(){
        var list = window.plugin.logsDiary.obj.log;
        for(guid in list){
            var elem = list[guid];
            if(elem.length < 4){
                elem[2] = '';
                elem[3] = '';
            }
        }
        window.plugin.logsDiary.storage.save();
    }

    //---------------------------

	window.plugin.logsDiary.data.timestampToYMD = function(timestamp){
        var date    = new Date(timestamp);
        var year    = date.getFullYear();
        var month   = window.zeroPad(date.getMonth()+1, 2);
        var day     = window.zeroPad(date.getDate(), 2);
        var hour    = window.zeroPad(date.getHours(), 2);
        var minute  = window.zeroPad(date.getMinutes(), 2);
        var seconds = window.zeroPad(date.getSeconds(), 2);

        return day+'/'+month+'/'+year;
    }
	window.plugin.logsDiary.data.getSortLogsSaved = function(){
        var list = window.plugin.logsDiary.obj.log;
        var sortable = [];

        for(var guid in list){
            var arr = JSON.parse(JSON.stringify(list[guid]));
            arr.push(guid);
            sortable.push([list[guid][0], arr]);
        }
        sortable.sort(function(a, b) {return a[0] - b[0]});

        return sortable;
    }

	window.plugin.logsDiary.data.replaceString = function(guid, html){
        str1a = '<tr>';
        str1b = '</tr>';
        str2a = '<span class="invisep">&lt;</span>';
        str2b = '<span class="invisep">&gt;</span>';
        html = html.replace(str1a, '');
        html = html.replace(str1b, '');
        html = html.replace(str2a, '');
        html = html.replace(str2b, '');

        return html;
    }
	window.plugin.logsDiary.data.isSaved = function(guid){
        return (window.plugin.logsDiary.obj.log[guid] === undefined)? false : true;
    }

	window.plugin.logsDiary.data.setHeart = function(guid, status){
        var isSaved = (status === undefined)? window.plugin.logsDiary.data.isSaved(guid) : !status;

        if(isSaved == true){
            var log = window.plugin.logsDiary.obj.log[guid];
            var timestamp = log[0];

            delete window.plugin.logsDiary.obj.log[guid];
        }else{
            var tab = [];
            if(chat._public.data[guid] !== undefined){ tab.push('_public'); }
            if(chat._faction.data[guid] !== undefined){ tab.push('_faction'); }
            if(chat._alerts.data[guid] !== undefined){ tab.push('_alerts'); }

            if(tab.length > 0){
                var obj = chat[tab[0]].data[guid];
                var date = obj[0];
                var html = window.plugin.logsDiary.data.replaceString(guid, obj[2]);
                var player = obj[3];
                var public = obj[1];

                window.plugin.logsDiary.obj.log[guid] = [date, html, player, public];
            }
        }

    }
	window.plugin.logsDiary.ui.setHeart = function(guid){
        var isSaved = window.plugin.logsDiary.data.isSaved(guid);
        if(isSaved == false){
            $('tr[data-log="'+guid+'"] .logsDiary').removeClass('saved');
            $('.logsDiaryDialog tr[data-log="'+guid+'"]').remove();
        }else{
            $('tr[data-log="'+guid+'"] .logsDiary').addClass('saved');
        }
    }

    window.plugin.logsDiary.ui.getAllLogsSavedHTML = function(){
        var list = window.plugin.logsDiary.data.getSortLogsSaved();

        var html = '';
        var day24h = 0;
        for(i in list){
            var log = list[i][1];
            var date = log[0];
            var text = log[1];
            var owner = log[2];
            var isFaction = log[3];
            var guid = log[4];

            var heart = window.plugin.logsDiary.ui.getToggleHTML(guid);
            var checkDate = parseInt((date/1000)/(24*60*60));

            if(checkDate > day24h){
                formatDate = window.plugin.logsDiary.data.timestampToYMD(date);
                html += '<tr><td colspan="4"><summary>── '+formatDate+' ──────────────────────────────────────────</summary></td></tr>';
                day24h = checkDate;
            }
            html += window.plugin.logsDiary.ui.getRowStartHTML(guid)+heart+'</td>'+text+'</tr>';
        }

        return '<table>'+html+'</table>';
    }
    window.plugin.logsDiary.ui.getRowStartHTML = function(guid){
        return '<tr data-log="'+guid+'"><td>';
    }
    window.plugin.logsDiary.ui.getToggleHTML = function(guid){
        var isSaved = (window.plugin.logsDiary.data.isSaved(guid))? ' saved' : '';
        var heart = '<span class="logsDiary'+isSaved+'" onclick="window.plugin.logsDiary.action.toggle(\''+guid+'\');return false;" title="Save/unsave this log">&#10084;</span>';
        return heart;
    }

    window.plugin.logsDiary.ui.openDialog = function(){
        var html = window.plugin.logsDiary.ui.getAllLogsSavedHTML();

        dialog({
            title: 'Logs Diary',
            html: '<div class="logsDiaryDialog">'+html+'</div>',
            width: 650,
			dialogClass: 'ui-dialog-logsDiary',
			buttons:{
				'REFRESH': function(){
                    $('.logsDiaryDialog').html(window.plugin.logsDiary.ui.getAllLogsSavedHTML());
                    window.plugin.logsDiary.action.supportEmoji();
				},
				'UNSAVE ALL': function(){
                    var prompt = window.confirm('Are you sure to delete all saved logs?', '');
                    if(prompt === true){
                        window.plugin.logsDiary.storage.reset();
                    }
				}
			}
        });
        window.plugin.logsDiary.action.supportEmoji();
    }

	window.plugin.logsDiary.action.toggle = function(guid){
        window.plugin.logsDiary.data.setHeart(guid);
        window.plugin.logsDiary.ui.setHeart(guid);
        window.plugin.logsDiary.storage.save();
    }
	window.plugin.logsDiary.action.supportEmoji = function(){
        if(window.plugin.emojiChat !== undefined){
            $('.logsDiaryDialog table tbody tr').each(function(i){
                var selector = $(this).children('td:nth-child(4)');
                window.plugin.emojiChat.action.emojify(selector);
            });
        }
    }

    //---------------------------

	window.plugin.logsDiary.setupCSS = function(){
		$('<style>').prop('type', 'text/css').html(''
			+'.ui-dialog-logsDiary .ui-dialog-buttonset button{ margin-left:5px; }'
			+'span.logsDiary{color:#bbb;cursor:pointer;padding:0px 3px;float:left;}'
			+'span.logsDiary.saved{color:#f77;}'
			+'#chat td:first-child, #chatinput td:first-child{width:60px;}'
			+'.logsDiaryDialog .system_narrowcast{color:#f66 !important;}'
			+'.logsDiaryDialog table tr td:nth-child(2){width:40px;}'
			+'.logsDiaryDialog table tr td .emj{position:relative;margin-top:-20px;top:5px;}'
		).appendTo('head');
	}

	var setup = function(){
        window.plugin.logsDiary.data.fixChatFunction();

        window.plugin.logsDiary.setupCSS();
		window.plugin.logsDiary.storage.check();
        window.plugin.logsDiary.data.fixOldStorage();

        $('#toolbox').append('<a onclick="window.plugin.logsDiary.ui.openDialog();return false;"><i class="fa fa-book"></i>Logs Diary</a>');
	}

// PLUGIN END //////////////////////////////////////////////////////////


setup.info = plugin_info; //add the script info data to the function as a property
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);

