window.chat = function() {};

//WORK IN PROGRESS - NOT YET USED!!
window.chat.commTabs = [
// channel: the COMM channel ('tab' parameter in server requests)
// name: visible name
// inputPrompt: string for the input prompt
// inputColor: (optional) color for input
// sendMessage: (optional) function to send the message (to override the default of sendPlext)
// globalBounds: (optional) if true, always use global latLng bounds
  {channel:'all', name:'All', inputPrompt: 'broadcast:', inputColor:'#f66'},
  {channel:'faction', name:'Aaction', inputPrompt: 'tell faction:'},
  {channel:'alerts', name:'Alerts', inputPrompt: 'tell Jarvis:', inputColor: '#666', globalBounds: true, sendMessage: function() {
    alert("Jarvis: A strange game. The only winning move is not to play. How about a nice game of chess?\n(You can't chat to the 'alerts' channel!)");
  }},
];


window.chat.handleTabCompletion = function() {
  var el = $('#chatinput input');
  var curPos = el.get(0).selectionStart;
  var text = el.val();
  var word = text.slice(0, curPos).replace(/.*\b([a-z0-9-_])/, '$1').toLowerCase();

  var list = $('#chat > div:visible mark');
  list = list.map(function(ind, mark) { return $(mark).text(); } );
  list = uniqueArray(list);

  var nick = null;
  for(var i = 0; i < list.length; i++) {
    if(!list[i].toLowerCase().startsWith(word)) continue;
    if(nick && nick !== list[i]) {
      log.warn('More than one nick matches, aborting. ('+list[i]+' vs '+nick+')');
      return;
    }
    nick = list[i];
  }
  if(!nick) {
    return;
  }

  var posStart = curPos - word.length;
  var newText = text.substring(0, posStart);
  var atPresent = text.substring(posStart-1, posStart) === '@';
  newText += (atPresent ? '' : '@') + nick + ' ';
  newText += text.substring(curPos);
  el.val(newText);
}

//
// clear management
//


window.chat._oldBBox = null;
window.chat.genPostData = function(channel, storageHash, getOlderMsgs) {
  if (typeof channel !== 'string') {
    throw new Error('API changed: isFaction flag now a channel string - all, faction, alerts');
  }

  var b = clampLatLngBounds(map.getBounds());

  // set a current bounding box if none set so far
  if (!chat._oldBBox) chat._oldBBox = b;

  // to avoid unnecessary chat refreshes, a small difference compared to the previous bounding box
  // is not considered different
  var CHAT_BOUNDINGBOX_SAME_FACTOR = 0.1;
  // if the old and new box contain each other, after expanding by the factor, don't reset chat
  if (!(b.pad(CHAT_BOUNDINGBOX_SAME_FACTOR).contains(chat._oldBBox) && chat._oldBBox.pad(CHAT_BOUNDINGBOX_SAME_FACTOR).contains(b))) {
    log.log('Bounding Box changed, chat will be cleared (old: '+chat._oldBBox.toBBoxString()+'; new: '+b.toBBoxString()+')');

    $('#chat > div').data('needsClearing', true);

    // need to reset these flags now because clearing will only occur
    // after the request is finished – i.e. there would be one almost
    // useless request.
    chat._faction.data = {};
    chat._faction.guids = [];
    chat._faction.oldestTimestamp = -1;
    chat._faction.newestTimestamp = -1;
    delete chat._faction.oldestGUID;
    delete chat._faction.newestGUID;

    chat._public.data = {};
    chat._public.guids = [];
    chat._public.oldestTimestamp = -1;
    chat._public.newestTimestamp = -1;
    delete chat._public.oldestGUID;
    delete chat._public.newestGUID;

    chat._alerts.data = {};
    chat._alerts.guids = [];
    chat._alerts.oldestTimestamp = -1;
    chat._alerts.newestTimestamp = -1;
    delete chat._alerts.oldestGUID;
    delete chat._alerts.newestGUID;

    chat._oldBBox = b;
  }

  var ne = b.getNorthEast();
  var sw = b.getSouthWest();
  var data = {
    minLatE6: Math.round(sw.lat*1E6),
    minLngE6: Math.round(sw.lng*1E6),
    maxLatE6: Math.round(ne.lat*1E6),
    maxLngE6: Math.round(ne.lng*1E6),
    minTimestampMs: -1,
    maxTimestampMs: -1,
    tab: channel,
  };

  if (getOlderMsgs) {
    // ask for older chat when scrolling up
    data = $.extend(data, {
      maxTimestampMs: storageHash.oldestTimestamp,
      plextContinuationGuid: storageHash.oldestGUID
    });
  } else {
    // ask for newer chat
    var min = storageHash.newestTimestamp;
    // the initial request will have both timestamp values set to -1,
    // thus we receive the newest 50. After that, we will only receive
    // messages with a timestamp greater or equal to min above.
    // After resuming from idle, there might be more new messages than
    // desiredNumItems. So on the first request, we are not really up to
    // date. We will eventually catch up, as long as there are less new
    // messages than 50 per each refresh cycle.
    // A proper solution would be to query until no more new results are
    // returned.
    // Currently this edge case is not handled. Let’s see if this is a
    // problem in crowded areas.
    $.extend(data, {
      minTimestampMs: min,
      plextContinuationGuid: storageHash.newestGUID
    });
    // when requesting with an actual minimum timestamp, request oldest rather than newest first.
    // this matches the stock intel site, and ensures no gaps when continuing after an extended idle period
    if (min > -1) $.extend(data, {ascendingTimestampOrder: true});
  }
  return data;
};



//
// faction
//

window.chat._requestFactionRunning = false;
window.chat.requestFaction = function(getOlderMsgs, isRetry) {
  if(chat._requestFactionRunning && !isRetry) return;
  if(isIdle()) return renderUpdateStatus();
  chat._requestFactionRunning = true;
  $("#chatcontrols a:contains('faction')").addClass('loading');

  var d = chat.genPostData('faction', chat._faction, getOlderMsgs);
  var r = window.postAjax(
    'getPlexts',
    d,
    function(data, textStatus, jqXHR) { chat.handleFaction(data, getOlderMsgs, d.ascendingTimestampOrder); },
    isRetry
      ? function() { window.chat._requestFactionRunning = false; }
      : function() { window.chat.requestFaction(getOlderMsgs, true) }
  );
}


window.chat._faction = {data:{}, guids: [], oldestTimestamp:-1, newestTimestamp:-1};
window.chat.handleFaction = function(data, olderMsgs, ascendingTimestampOrder) {
  chat._requestFactionRunning = false;
  $("#chatcontrols a:contains('faction')").removeClass('loading');

  if(!data || !data.result) {
    window.failedRequestCount++;
    return log.warn('faction chat error. Waiting for next auto-refresh.');
  }

  if (!data.result.length && !$('#chatfaction').data('needsClearing')) {
    // no new data and current data in chat._faction.data is already rendered
    return;
  }

  $('#chatfaction').data('needsClearing', null);

  var old = chat._faction.oldestGUID;
  chat.writeDataToHash(data, chat._faction, false, olderMsgs, ascendingTimestampOrder);
  var oldMsgsWereAdded = old !== chat._faction.oldestGUID;

  runHooks('factionChatDataAvailable', {raw: data, result: data.result, processed: chat._faction.data});

  window.chat.renderFaction(oldMsgsWereAdded);
}

window.chat.renderFaction = function(oldMsgsWereAdded) {
  chat.renderData(chat._faction.data, 'chatfaction', oldMsgsWereAdded, chat._faction.guids);
}


//
// all
//

window.chat._requestPublicRunning = false;
window.chat.requestPublic = function(getOlderMsgs, isRetry) {
  if(chat._requestPublicRunning && !isRetry) return;
  if(isIdle()) return renderUpdateStatus();
  chat._requestPublicRunning = true;
  $("#chatcontrols a:contains('all')").addClass('loading');

  var d = chat.genPostData('all', chat._public, getOlderMsgs);
  var r = window.postAjax(
    'getPlexts',
    d,
    function(data, textStatus, jqXHR) { chat.handlePublic(data, getOlderMsgs, d.ascendingTimestampOrder); },
    isRetry
      ? function() { window.chat._requestPublicRunning = false; }
      : function() { window.chat.requestPublic(getOlderMsgs, true) }
  );
}

window.chat._public = {data:{}, guids: [], oldestTimestamp:-1, newestTimestamp:-1};
window.chat.handlePublic = function(data, olderMsgs, ascendingTimestampOrder) {
  chat._requestPublicRunning = false;
  $("#chatcontrols a:contains('all')").removeClass('loading');

  if(!data || !data.result) {
    window.failedRequestCount++;
    return log.warn('public chat error. Waiting for next auto-refresh.');
  }

  if (!data.result.length && !$('#chatall').data('needsClearing')) {
    // no new data and current data in chat._public.data is already rendered
    return;
  }

  $('#chatall').data('needsClearing', null);

  var old = chat._public.oldestGUID;
  chat.writeDataToHash(data, chat._public, undefined, olderMsgs, ascendingTimestampOrder);   //NOTE: isPublic passed as undefined - this is the 'all' channel, so not really public or private
  var oldMsgsWereAdded = old !== chat._public.oldestGUID;

  runHooks('publicChatDataAvailable', {raw: data, result: data.result, processed: chat._public.data});

  window.chat.renderPublic(oldMsgsWereAdded);

}

window.chat.renderPublic = function(oldMsgsWereAdded) {
  chat.renderData(chat._public.data, 'chatall', oldMsgsWereAdded, chat._public.guids);
}


//
// alerts
//

window.chat._requestAlertsRunning = false;
window.chat.requestAlerts = function(getOlderMsgs, isRetry) {
  if(chat._requestAlertsRunning && !isRetry) return;
  if(isIdle()) return renderUpdateStatus();
  chat._requestAlertsRunning = true;
  $("#chatcontrols a:contains('alerts')").addClass('loading');

  var d = chat.genPostData('alerts', chat._alerts, getOlderMsgs);
  var r = window.postAjax(
    'getPlexts',
    d,
    function(data, textStatus, jqXHR) { chat.handleAlerts(data, getOlderMsgs, d.ascendingTimestampOrder); },
    isRetry
      ? function() { window.chat._requestAlertsRunning = false; }
      : function() { window.chat.requestAlerts(getOlderMsgs, true) }
  );
}


window.chat._alerts = {data:{}, guids: [], oldestTimestamp:-1, newestTimestamp:-1};
window.chat.handleAlerts = function(data, olderMsgs, ascendingTimestampOrder) {
  chat._requestAlertsRunning = false;
  $("#chatcontrols a:contains('alerts')").removeClass('loading');

  if(!data || !data.result) {
    window.failedRequestCount++;
    return log.warn('alerts chat error. Waiting for next auto-refresh.');
  }

  if(data.result.length === 0) return;

  var old = chat._alerts.oldestTimestamp;
  chat.writeDataToHash(data, chat._alerts, undefined, olderMsgs, ascendingTimestampOrder); //NOTE: isPublic passed as undefined - it's nether public or private!
  var oldMsgsWereAdded = old !== chat._alerts.oldestTimestamp;

  // hook for alerts - API change planned here for next refactor
  runHooks('alertsChatDataAvailable', {raw: data, result: data.result, processed: chat._alerts.data});

  window.chat.renderAlerts(oldMsgsWereAdded);
}

window.chat.renderAlerts = function(oldMsgsWereAdded) {
  chat.renderData(chat._alerts.data, 'chatalerts', oldMsgsWereAdded, chat._alerts.guids);
}



//
// common
//

window.chat.addNickname= function(nick) {
  var c = document.getElementById("chattext");
  c.value = [c.value.trim(), nick].join(" ").trim() + " ";
  c.focus()
}

window.chat.nicknameClicked = function(event, nickname) {
  var hookData = { event: event, nickname: nickname };

  if (window.runHooks('nicknameClicked', hookData)) {
    window.chat.addNickname('@' + nickname);
  }

  event.preventDefault();
  event.stopPropagation();
  return false;
}

window.chat.updateOldNewHash = function(newData, storageHash, isOlderMsgs, isAscendingOrder) {
  // track oldest + newest timestamps/GUID
  if (newData.result.length > 0) {
    var first = {
      guid: newData.result[0][0],
      time: newData.result[0][1]
    };
    var last = {
      guid: newData.result[newData.result.length-1][0],
      time: newData.result[newData.result.length-1][1]
    };
    if (isAscendingOrder) {
      var temp = first;
      first = last;
      last = temp;
    }
    if (storageHash.oldestTimestamp === -1 || storageHash.oldestTimestamp >= last.time) {
      if (isOlderMsgs || storageHash.oldestTimestamp !== last.time) {
        storageHash.oldestTimestamp = last.time;
        storageHash.oldestGUID = last.guid;
      }
    }
    if (storageHash.newestTimestamp === -1 || storageHash.newestTimestamp <= first.time) {
      if (!isOlderMsgs || storageHash.newestTimestamp !== first.time) {
        storageHash.newestTimestamp = first.time;
        storageHash.newestGUID = first.guid;
      }
    }
  }
};

window.chat.parseMsgData = function(data) {
  var categories = data[2].plext.categories;
  var isPublic = (categories & 1) === 1;
  var isSecure = (categories & 2) === 2;
  var msgAlert = (categories & 4) === 4;

  var msgToPlayer = msgAlert && (isPublic || isSecure);

  var time = data[1];
  var team = data[2].plext.team === 'RESISTANCE' ? TEAM_RES : TEAM_ENL;
  var auto = data[2].plext.plextType !== 'PLAYER_GENERATED';
  var systemNarrowcast = data[2].plext.plextType === 'SYSTEM_NARROWCAST';

  var markup = data[2].plext.markup;

  var nick = '';
  markup.forEach(function(ent) {
    switch (ent[0]) {
    case 'SENDER': // user generated messages
      nick = ent[1].plain.replace(/: $/, ''); // cut “: ” at end
      break;

    case 'PLAYER': // automatically generated messages
      nick = ent[1].plain;
      team = ent[1].team === 'RESISTANCE' ? TEAM_RES : TEAM_ENL;
      break;

    default:
      break;
    }
  });

  return {
    guid: data[0],
    time: time,
    public: isPublic,
    secure: isSecure,
    alert: msgAlert,
    msgToPlayer: msgToPlayer,
    type: data[2].plext.plextType,
    narrowcast: systemNarrowcast,
    auto: auto,
    player: {
      name: nick,
      team: team,
    },
    markup: markup,
  };
};

window.chat.writeDataToHash = function(newData, storageHash, isPublicChannel, isOlderMsgs, isAscendingOrder) {
  window.chat.updateOldNewHash(newData, storageHash, isOlderMsgs, isAscendingOrder);

  newData.result.forEach(function(json) {
    // avoid duplicates
    if (json[0] in storageHash.data) {
      return true;
    }

    var parsedData = chat.parseMsgData(json);

    // format: timestamp, autogenerated, HTML message, nick, additional data (parsed, plugin specific data...)
    storageHash.data[parsedData.guid] = [parsedData.time, parsedData.auto, chat.renderMsgRow(parsedData), parsedData.player.name, parsedData];
    if (isAscendingOrder) {
      storageHash.guids.push(parsedData.guid);
    } else {
      storageHash.guids.unshift(parsedData.guid);
    }
  });
};

//
// Rendering primitive for markup, chat cells (td) and chat row (tr)
//

window.chat.renderText = function (text) {
  return $('<div>').text(text.plain).html().autoLink();
};

// Override portal names that are used over and over, such as 'US Post Office'
window.chat.getChatPortalName = function(markup) {
  var name = markup.name;
  if (name === 'US Post Office') {
    var address = markup.address.split(',');
    name = 'USPS: ' + address[0];
  }
  return name;
};

window.chat.renderPortal = function (portal) {
  var lat = portal.latE6/1E6, lng = portal.lngE6/1E6;
  var perma = window.makePermalink([lat,lng]);
  var js = 'window.selectPortalByLatLng('+lat+', '+lng+');return false';
  return '<a onclick="'+js+'"'
    + ' title="'+portal.address+'"'
    + ' href="'+perma+'" class="help">'
    + window.chat.getChatPortalName(portal)
    + '</a>';
};

window.chat.renderFactionEnt = function (faction) {
  var name = faction.team === 'ENLIGHTENED' ? 'Enlightened' : 'Resistance';
  var spanClass = faction.team === 'ENLIGHTENED' ? TEAM_TO_CSS[TEAM_ENL] : TEAM_TO_CSS[TEAM_RES];
  return $('<div>').html($('<span>')
    .attr('class', spanClass)
    .text(name)).html();
};

window.chat.renderPlayer = function (player, at, sender) {
  var name = player.plain;
  if (sender) {
    name = player.plain.replace(/: $/, '');
  } else if (at) {
    name = player.plain.replace(/^@/, '');
  }
  var thisToPlayer = name === window.PLAYER.nickname;
  var spanClass = thisToPlayer ? 'pl_nudge_me' : (player.team + ' pl_nudge_player');
  return $('<div>').html($('<span>')
    .attr('class', spanClass)
    .attr('onclick',"window.chat.nicknameClicked(event, '"+name+"')")
    .text((at ? '@' : '') + name)).html();
};

window.chat.renderMarkupEntity = function (ent) {
  switch (ent[0]) {
  case 'TEXT':
    return chat.renderText(ent[1]);
  case 'PORTAL':
    return chat.renderPortal(ent[1]);
  case 'FACTION':
    return chat.renderFactionEnt(ent[1]);
  case 'SENDER':
    return chat.renderPlayer(ent[1], false, true);
  case 'PLAYER':
    return chat.renderPlayer(ent[1]);
  case 'AT_PLAYER':
    return chat.renderPlayer(ent[1], true);
  default:
  }
  return $('<div>').text(ent[0]+':<'+ent[1].plain+'>').html();
};

window.chat.renderMarkup = function (markup) {
  var msg = '';
  markup.forEach(function(ent, ind) {
    switch (ent[0]) {
    case 'SENDER':
    case 'SECURE':
      // skip as already handled
      break;

    case 'PLAYER': // automatically generated messages
      if (ind > 0) msg += chat.renderMarkupEntity(ent); // don’t repeat nick directly
      break;

    default:
      // add other enitities whatever the type
      msg += chat.renderMarkupEntity(ent);
      break;
    }
  });
  return msg;
};

window.chat.renderTimeCell = function(time, classNames) {
  var ta = unixTimeToHHmm(time);
  var tb = unixTimeToDateTimeString(time, true);
  // add <small> tags around the milliseconds
  tb = (tb.slice(0,19)+'<small class="milliseconds">'+tb.slice(19)+'</small>')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
  return '<td><time class="' + classNames + '" title="'+tb+'" data-timestamp="'+time+'">'+ta+'</time></td>';
};

window.chat.renderNickCell = function(nick, classNames) {
  var i = ['<span class="invisep">&lt;</span>', '<span class="invisep">&gt;</span>'];
  return '<td>'+i[0]+'<mark class="' + classNames + '">'+ nick+'</mark>'+i[1]+'</td>';
};

window.chat.renderMsgCell = function(msg, classNames) {
  return '<td class="' + classNames + '">'+msg+'</td>';
};

window.chat.renderMsgRow = function(data) {
  var timeClass = (data.msgToPlayer) ? 'pl_nudge_date' : '';
  var timeCell = chat.renderTimeCell(data.time, timeClass);

  var nickClasses = ['nickname'];
  if (data.player.team === TEAM_ENL || data.player.team === TEAM_RES) {
    nickClasses.push(TEAM_TO_CSS[data.player.team]);
  }
  // highlight things said/done by the player in a unique colour
  // (similar to @player mentions from others in the chat text itself)
  if (data.player.name === window.PLAYER.nickname) {
    nickClasses.push('pl_nudge_me');
  }
  var nickCell = chat.renderNickCell(data.player.name, nickClasses.join(' '));

  var msg = chat.renderMarkup(data.markup);
  var msgClass = data.narrowcast ? 'system_narrowcast' : '';
  var msgCell = chat.renderMsgCell(msg, msgClass);

  var className = '';
  if (!data.auto && data.public) {
    className = 'public';
  } else if (!data.auto && data.secure) {
    className = 'faction';
  }
  return '<tr data-guid="' + data.guid + '" class="' + className + '">' + timeCell + nickCell + msgCell + '</tr>';
};

// legacy rendering, not used internaly, but left there for backward compatibilty in case a plugin uses it directly
window.chat.renderMsg = function(msg, nick, time, team, msgToPlayer, systemNarrowcast) {
  var ta = unixTimeToHHmm(time);
  var tb = unixTimeToDateTimeString(time, true);
  // add <small> tags around the milliseconds
  tb = (tb.slice(0,19)+'<small class="milliseconds">'+tb.slice(19)+'</small>')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');

  // help cursor via “#chat time”
  var t = '<time title="'+tb+'" data-timestamp="'+time+'">'+ta+'</time>';
  if (msgToPlayer) {
    t = '<div class="pl_nudge_date">' + t + '</div><div class="pl_nudge_pointy_spacer"></div>';
  }
  if (systemNarrowcast) {
    msg = '<div class="system_narrowcast">' + msg + '</div>';
  }
  var color = COLORS[team];
  // highlight things said/done by the player in a unique colour (similar to @player mentions from others in the chat text itself)
  if (nick === window.PLAYER.nickname) {
    color = '#fd6';
  }
  var s = 'style="cursor:pointer; color:'+color+'"';
  var i = ['<span class="invisep">&lt;</span>', '<span class="invisep">&gt;</span>'];
  return '<tr><td>'+t+'</td><td>'+i[0]+'<mark class="nickname" ' + s + '>'+ nick+'</mark>'+i[1]+'</td><td>'+msg+'</td></tr>';
}

window.chat.renderDivider = function(text) {
  return '<tr class="divider"><td><hr></td><td>' + text + '</td><td><hr></td></tr>';
};

// renders data from the data-hash to the element defined by the given
// ID. Set 3rd argument to true if it is likely that old data has been
// added. Latter is only required for scrolling.
window.chat.renderData = function(data, element, likelyWereOldMsgs, sortedGuids) {
  var elm = $('#'+element);
  if (elm.is(':hidden')) {
    return;
  }

  // if sortedGuids is not specified (legacy), sort old to new
  // (disregarding server order)
  var vals = sortedGuids;
  if (vals === undefined) {
    vals = $.map(data, function(v, k) { return [[v[0], k]]; });
    vals = vals.sort(function(a, b) { return a[0]-b[0]; });
    vals = vals.map(function(v) { return v[1]; });
  }

  // render to string with date separators inserted
  var msgs = '';
  var prevTime = null;
  vals.forEach(function(guid) {
    var msg = data[guid];
    var nextTime = new Date(msg[0]).toLocaleDateString();
    if (prevTime && prevTime !== nextTime) {
      msgs += chat.renderDivider(nextTime);
    }
    msgs += msg[2];
    prevTime = nextTime;
  });

  var firstRender = elm.is(':empty');
  var scrollBefore = scrollBottom(elm);
  elm.html('<table>' + msgs + '</table>');

  if (firstRender) {
    elm.data('needsScrollTop', 99999999);
  } else {
    chat.keepScrollPosition(elm, scrollBefore, likelyWereOldMsgs);
  }

  if(elm.data('needsScrollTop')) {
    elm.data('ignoreNextScroll', true);
    elm.scrollTop(elm.data('needsScrollTop'));
    elm.data('needsScrollTop', null);
  }
};


window.chat.getActive = function() {
  return $('#chatcontrols .active').text();
}

window.chat.tabToChannel = function(tab) {
  if (tab == 'faction') return 'faction';
  if (tab == 'alerts') return 'alerts';
  return 'all';
};



window.chat.toggle = function() {
  var c = $('#chat, #chatcontrols');
  if(c.hasClass('expand')) {
    c.removeClass('expand');
    var div = $('#chat > div:visible');
    div.data('ignoreNextScroll', true);
    div.scrollTop(99999999); // scroll to bottom
    $('.leaflet-control').removeClass('chat-expand');
  } else {
    c.addClass('expand');
    $('.leaflet-control').addClass('chat-expand');
    chat.needMoreMessages();
  }
};


// called by plugins (or other things?) that need to monitor COMM data streams when the user is not viewing them
// instance: a unique string identifying the plugin requesting background COMM
// channel: either 'all', 'faction' or (soon) 'alerts' - others possible in the future
// flag: true for data wanted, false for not wanted
window.chat.backgroundChannelData = function(instance,channel,flag) {
  //first, store the state for this instance
  if (!window.chat.backgroundInstanceChannel) window.chat.backgroundInstanceChannel = {};
  if (!window.chat.backgroundInstanceChannel[instance]) window.chat.backgroundInstanceChannel[instance] = {};
  window.chat.backgroundInstanceChannel[instance][channel] = flag;

  //now, to simplify the request code, merge the flags for all instances into one
  // 1. clear existing overall flags
  window.chat.backgroundChannels = {};
  // 2. for each instance monitoring COMM...
  $.each(window.chat.backgroundInstanceChannel, function(instance,channels) {
    // 3. and for each channel monitored by this instance...
    $.each(window.chat.backgroundInstanceChannel[instance],function(channel,flag) {
      // 4. if it's monitored, set the channel flag
      if (flag) window.chat.backgroundChannels[channel] = true;
    });
  });

}


window.chat.request = function() {
  var channel = chat.tabToChannel(chat.getActive());
  if (channel == 'faction' || (window.chat.backgroundChannels && window.chat.backgroundChannels['faction'])) {
    chat.requestFaction(false);
  }
  if (channel == 'all' || (window.chat.backgroundChannels && window.chat.backgroundChannels['all'])) {
    chat.requestPublic(false);
  }
  if (channel == 'alerts' || (window.chat.backgroundChannels && window.chat.backgroundChannels['alerts'])) {
    chat.requestAlerts(false);
  }
}


// checks if there are enough messages in the selected chat tab and
// loads more if not.
window.chat.needMoreMessages = function() {
  var activeTab = chat.getActive();
  if (activeTab !== 'all' && activeTab !== 'faction' && activeTab !== 'alerts') {
    return;
  }

  var activeChat = $('#chat > :visible');
  if(activeChat.length === 0) return;

  var hasScrollbar = scrollBottom(activeChat) !== 0 || activeChat.scrollTop() !== 0;
  var nearTop = activeChat.scrollTop() <= CHAT_REQUEST_SCROLL_TOP;
  if(hasScrollbar && !nearTop) return;

  if(activeTab === 'faction') {
    chat.requestFaction(true);
  } else {
    chat.requestPublic(true);
  }
};


window.chat.chooseTab = function(tab) {
  if (tab != 'all' && tab != 'faction' && tab != 'alerts') {
    log.warn('chat tab "'+tab+'" requested - but only "all", "faction" and "alerts" are valid - assuming "all" wanted');
    tab = 'all';
  }

  var oldTab = chat.getActive();

  localStorage['iitc-chat-tab'] = tab;

  var mark = $('#chatinput mark');
  var input = $('#chatinput input');

  $('#chatcontrols .active').removeClass('active');
  $("#chatcontrols a:contains('" + tab + "')").addClass('active');

  if (tab != oldTab) startRefreshTimeout(0.1*1000); //only chat uses the refresh timer stuff, so a perfect way of forcing an early refresh after a tab change

  $('#chat > div').hide();

  var elm = $('#chat' + tab);
  elm.show();

  switch(tab) {
    case 'faction':
      input.css('color', '');
      mark.css('color', '');
      mark.text('tell faction:');

      chat.renderFaction(false);
      break;

    case 'all':
      input.css('cssText', 'color: #f66 !important');
      mark.css('cssText', 'color: #f66 !important');
      mark.text('broadcast:');

      chat.renderPublic(false);
      break;

    case 'alerts':
      mark.css('cssText', 'color: #bbb !important');
      input.css('cssText', 'color: #bbb !important');
      mark.text('tell Jarvis:');

      chat.renderAlerts(false);
      break;

    default:
      throw new Error('chat.chooser was asked to handle unknown button: ' + tt);
  }
}

window.chat.show = function(name) {
    window.isSmartphone()
        ? $('#updatestatus').hide()
        : $('#updatestatus').show();
    $('#chat, #chatinput').show();

    window.chat.chooseTab(name);
}

window.chat.chooser = function(event) {
  var t = $(event.target);
  var tab = t.text();
  window.chat.chooseTab(tab);
}

// contains the logic to keep the correct scroll position.
window.chat.keepScrollPosition = function(box, scrollBefore, isOldMsgs) {
  // If scrolled down completely, keep it that way so new messages can
  // be seen easily. If scrolled up, only need to fix scroll position
  // when old messages are added. New messages added at the bottom don’t
  // change the view and enabling this would make the chat scroll down
  // for every added message, even if the user wants to read old stuff.

  if(box.is(':hidden') && !isOldMsgs) {
    box.data('needsScrollTop', 99999999);
    return;
  }

  if(scrollBefore === 0 || isOldMsgs) {
    box.data('ignoreNextScroll', true);
    box.scrollTop(box.scrollTop() + (scrollBottom(box)-scrollBefore));
  }
}




//
// setup
//

window.chat.setup = function() {
  if (localStorage['iitc-chat-tab']) {
    chat.chooseTab(localStorage['iitc-chat-tab']);
 }

  $('#chatcontrols, #chat, #chatinput').show();

  $('#chatcontrols a:first').click(window.chat.toggle);
  $('#chatcontrols a').each(function(ind, elm) {
    if($.inArray($(elm).text(), ['all', 'faction', 'alerts']) !== -1)
      $(elm).click(window.chat.chooser);
  });


  $('#chatinput').click(function() {
    $('#chatinput input').focus();
  });

  window.chat.setupTime();
  window.chat.setupPosting();

  $('#chatfaction').scroll(function() {
    var t = $(this);
    if(t.data('ignoreNextScroll')) return t.data('ignoreNextScroll', false);
    if(t.scrollTop() < CHAT_REQUEST_SCROLL_TOP) chat.requestFaction(true);
    if(scrollBottom(t) === 0) chat.requestFaction(false);
  });

  $('#chatall').scroll(function() {
    var t = $(this);
    if(t.data('ignoreNextScroll')) return t.data('ignoreNextScroll', false);
    if(t.scrollTop() < CHAT_REQUEST_SCROLL_TOP) chat.requestPublic(true);
    if(scrollBottom(t) === 0) chat.requestPublic(false);
  });

  $('#chatalerts').scroll(function() {
    var t = $(this);
    if(t.data('ignoreNextScroll')) return t.data('ignoreNextScroll', false);
    if(t.scrollTop() < CHAT_REQUEST_SCROLL_TOP) chat.requestAlerts(true);
    if(scrollBottom(t) === 0) chat.requestAlerts(false);
  });

  window.requests.addRefreshFunction(chat.request);

  var cls = PLAYER.team === 'RESISTANCE' ? 'res' : 'enl';
  $('#chatinput mark').addClass(cls);

  $(document).on('click', '.nickname', function(event) {
    return window.chat.nicknameClicked(event, $(this).text());
  });
}


window.chat.setupTime = function() {
  var inputTime = $('#chatinput time');
  var updateTime = function() {
    if(window.isIdle()) return;
    var d = new Date();
    var h = d.getHours() + ''; if(h.length === 1) h = '0' + h;
    var m = d.getMinutes() + ''; if(m.length === 1) m = '0' + m;
    inputTime.text(h+':'+m);
    // update ON the minute (1ms after)
    setTimeout(updateTime, (60 - d.getSeconds()) * 1000 + 1);
  };
  updateTime();
  window.addResumeFunction(updateTime);
}


//
// posting
//


window.chat.setupPosting = function() {
  if (!isSmartphone()) {
    $('#chatinput input').keydown(function(event) {
      try {
        var kc = (event.keyCode ? event.keyCode : event.which);
        if(kc === 13) { // enter
          chat.postMsg();
          event.preventDefault();
        } else if (kc === 9) { // tab
          event.preventDefault();
          window.chat.handleTabCompletion();
        }
      } catch (e) {
        log.error(e);
        //if (e.stack) { console.error(e.stack); }
      }
    });
  }

  $('#chatinput').submit(function(event) {
    event.preventDefault();
    chat.postMsg();
  });
}


window.chat.postMsg = function() {
  var c = chat.getActive();
  if(c == 'alerts')
    return alert("Jarvis: A strange game. The only winning move is not to play. How about a nice game of chess?\n(You can't chat to the 'alerts' channel!)");

  // unknown tab, ignore
  if (c !== 'all' && c !== 'faction') {
    return;
  }

  var msg = $.trim($('#chatinput input').val());
  if(!msg || msg === '') return;

  var latlng = map.getCenter();

  var data = {message: msg,
              latE6: Math.round(latlng.lat*1E6),
              lngE6: Math.round(latlng.lng*1E6),
              tab: c};

  var errMsg = 'Your message could not be delivered. You can copy&' +
               'paste it here and try again if you want:\n\n' + msg;

  window.postAjax('sendPlext', data,
    function(response) {
      if(response.error) alert(errMsg);
      startRefreshTimeout(0.1*1000); //only chat uses the refresh timer stuff, so a perfect way of forcing an early refresh after a send message
    },
    function() {
      alert(errMsg);
    }
  );

  $('#chatinput input').val('');
}
