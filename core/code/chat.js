/**
 * @file Namespace for chat-related functionalities.
 * @namespace window.chat
 */

window.chat = function () {};
var chat = window.chat;

/**
 * Handles tab completion in chat input.
 *
 * @function window.chat.handleTabCompletion
 */
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

/**
 * Generates post data for chat requests.
 *
 * @function window.chat.genPostData
 * @param {string} channel - The chat channel.
 * @param {Object} storageHash - Storage hash for the chat.
 * @param {boolean} getOlderMsgs - Flag to determine if older messages are being requested.
 * @returns {Object} The generated post data.
 */
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

/**
 * Requests faction chat messages.
 *
 * @function window.chat.requestFaction
 * @param {boolean} getOlderMsgs - Flag to determine if older messages are being requested.
 * @param {boolean} [isRetry=false] - Flag to indicate if this is a retry attempt.
 */
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

/**
 * Holds data related to faction chat.
 *
 * @memberof window.chat
 * @type {Object}
 */
window.chat._faction = {data:{}, guids: [], oldestTimestamp:-1, newestTimestamp:-1};

/**
 * Handles faction chat response.
 *
 * @function window.chat.handleFaction
 * @param {Object} data - Response data from server.
 * @param {boolean} olderMsgs - Indicates if older messages were requested.
 * @param {boolean} ascendingTimestampOrder - Indicates if messages are in ascending timestamp order.
 */
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
  chat.writeDataToHash(data, chat._faction, olderMsgs, ascendingTimestampOrder);
  var oldMsgsWereAdded = old !== chat._faction.oldestGUID;

  runHooks('factionChatDataAvailable', {raw: data, result: data.result, processed: chat._faction.data});

  window.chat.renderFaction(oldMsgsWereAdded);
}

/**
 * Renders faction chat.
 *
 * @function window.chat.renderFaction
 * @param {boolean} oldMsgsWereAdded - Indicates if old messages were added in the current rendering.
 */
window.chat.renderFaction = function(oldMsgsWereAdded) {
  chat.renderData(chat._faction.data, 'chatfaction', oldMsgsWereAdded, chat._faction.guids);
}


//
// all
//

window.chat._requestPublicRunning = false;

/**
 * Initiates a request for public chat data.
 *
 * @function window.chat.requestPublic
 * @param {boolean} getOlderMsgs - Whether to retrieve older messages.
 * @param {boolean} [isRetry=false] - Whether the request is a retry.
 */
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

/**
 * Holds data related to public chat.
 *
 * @memberof window.chat
 * @type {Object}
 */
window.chat._public = {data:{}, guids: [], oldestTimestamp:-1, newestTimestamp:-1};

/**
 * Handles the public chat data received from the server.
 *
 * @function window.chat.handlePublic
 * @param {Object} data - The public chat data.
 * @param {boolean} olderMsgs - Whether the received messages are older.
 * @param {boolean} ascendingTimestampOrder - Whether messages are in ascending timestamp order.
 */
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
  chat.writeDataToHash(data, chat._public, olderMsgs, ascendingTimestampOrder);
  var oldMsgsWereAdded = old !== chat._public.oldestGUID;

  runHooks('publicChatDataAvailable', {raw: data, result: data.result, processed: chat._public.data});

  window.chat.renderPublic(oldMsgsWereAdded);

}

/**
 * Renders public chat in the UI.
 *
 * @function window.chat.renderPublic
 * @param {boolean} oldMsgsWereAdded - Indicates if older messages were added to the chat.
 */
window.chat.renderPublic = function(oldMsgsWereAdded) {
  chat.renderData(chat._public.data, 'chatall', oldMsgsWereAdded, chat._public.guids);
}


//
// alerts
//

window.chat._requestAlertsRunning = false;

/**
 * Initiates a request for alerts chat data.
 *
 * @function window.chat.requestAlerts
 * @param {boolean} getOlderMsgs - Whether to retrieve older messages.
 * @param {boolean} [isRetry=false] - Whether the request is a retry.
 */
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

/**
 * Holds data related to alerts chat.
 *
 * @memberof window.chat
 * @type {Object}
 */
window.chat._alerts = {data:{}, guids: [], oldestTimestamp:-1, newestTimestamp:-1};

/**
 * Handles the alerts chat data received from the server.
 *
 * @function window.chat.handleAlerts
 * @param {Object} data - The alerts chat data.
 * @param {boolean} olderMsgs - Whether the received messages are older.
 * @param {boolean} ascendingTimestampOrder - Whether messages are in ascending timestamp order.
 */
window.chat.handleAlerts = function(data, olderMsgs, ascendingTimestampOrder) {
  chat._requestAlertsRunning = false;
  $("#chatcontrols a:contains('alerts')").removeClass('loading');

  if(!data || !data.result) {
    window.failedRequestCount++;
    return log.warn('alerts chat error. Waiting for next auto-refresh.');
  }

  if(data.result.length === 0) return;

  var old = chat._alerts.oldestTimestamp;
  chat.writeDataToHash(data, chat._alerts, olderMsgs, ascendingTimestampOrder);
  var oldMsgsWereAdded = old !== chat._alerts.oldestTimestamp;

  // hook for alerts - API change planned here for next refactor
  runHooks('alertsChatDataAvailable', {raw: data, result: data.result, processed: chat._alerts.data});

  window.chat.renderAlerts(oldMsgsWereAdded);
}

/**
 * Renders alerts chat in the UI.
 *
 * @function window.chat.renderAlerts
 * @param {boolean} oldMsgsWereAdded - Indicates if older messages were added to the chat.
 */
window.chat.renderAlerts = function(oldMsgsWereAdded) {
  chat.renderData(chat._alerts.data, 'chatalerts', oldMsgsWereAdded, chat._alerts.guids);
}



//
// common
//

/**
 * Adds a nickname to the chat input.
 *
 * @function window.chat.addNickname
 * @param {string} nick - The nickname to add.
 */
window.chat.addNickname= function(nick) {
  var c = document.getElementById("chattext");
  c.value = [c.value.trim(), nick].join(" ").trim() + " ";
  c.focus()
}

/**
 * Handles click events on nicknames in the chat.
 *
 * @function window.chat.nicknameClicked
 * @param {Event} event - The click event.
 * @param {string} nickname - The clicked nickname.
 * @returns {boolean} Always returns false.
 */
window.chat.nicknameClicked = function(event, nickname) {
  var hookData = { event: event, nickname: nickname };

  if (window.runHooks('nicknameClicked', hookData)) {
    window.chat.addNickname('@' + nickname);
  }

  event.preventDefault();
  event.stopPropagation();
  return false;
}

/**
 * Updates the oldest and newest message timestamps and GUIDs in the chat storage.
 *
 * @function window.chat.updateOldNewHash
 * @param {Object} newData - The new chat data received.
 * @param {Object} storageHash - The chat storage object.
 * @param {boolean} isOlderMsgs - Whether the new data contains older messages.
 * @param {boolean} isAscendingOrder - Whether the new data is in ascending order.
 */
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

/**
 * Parses chat message data into a more convenient format.
 *
 * @function window.chat.parseMsgData
 * @param {Object} data - The raw chat message data.
 * @returns {Object} The parsed chat message data.
 */
window.chat.parseMsgData = function (data) {
  var categories = data[2].plext.categories;
  var isPublic = (categories & 1) === 1;
  var isSecure = (categories & 2) === 2;
  var msgAlert = (categories & 4) === 4;

  var msgToPlayer = msgAlert && (isPublic || isSecure);

  var time = data[1];
  var team = window.teamStringToId(data[2].plext.team);
  var auto = data[2].plext.plextType !== 'PLAYER_GENERATED';
  var systemNarrowcast = data[2].plext.plextType === 'SYSTEM_NARROWCAST';

  var markup = data[2].plext.markup;

  var player = {
    name: '',
    team: team,
  };
  markup.forEach(function(ent) {
    switch (ent[0]) {
      case 'SENDER': // user generated messages
        player.name = ent[1].plain.replace(/: $/, ''); // cut “: ” at end
        break;

      case 'PLAYER': // automatically generated messages
        player.name = ent[1].plain;
        player.team = window.teamStringToId(ent[1].team);
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
    team: team,
    player: player,
    markup: markup,
  };
};

/**
 * Writes new chat data to the chat storage and manages the order of messages.
 *
 * @function window.chat.writeDataToHash
 * @param {Object} newData - The new chat data received.
 * @param {Object} storageHash - The chat storage object.
 * @param {boolean} isOlderMsgs - Whether the new data contains older messages.
 * @param {boolean} isAscendingOrder - Whether the new data is in ascending order.
 */
window.chat.writeDataToHash = function (newData, storageHash, isOlderMsgs, isAscendingOrder) {
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

/**
 * Renders text for the chat, converting plain text to HTML and adding links.
 *
 * @function window.chat.renderText
 * @param {Object} text - An object containing the plain text to render.
 * @returns {string} The rendered HTML string.
 */
window.chat.renderText = function (text) {
  let content;

  if (text.team) {
    let teamId = window.teamStringToId(text.team);
    if (teamId === window.TEAM_NONE) teamId = window.TEAM_MAC;
    const spanClass = window.TEAM_TO_CSS[teamId];
    content = $('<div>').append($('<span>', { class: spanClass, text: text.plain }));
  } else {
    content = $('<div>').text(text.plain);
  }

  return content.html().autoLink();
};

/**
 * Overrides portal names used repeatedly in chat, such as 'US Post Office', with more specific names.
 *
 * @function window.chat.getChatPortalName
 * @param {Object} markup - An object containing portal markup, including the name and address.
 * @returns {string} The processed portal name.
 */
window.chat.getChatPortalName = function (markup) {
  var name = markup.name;
  if (name === 'US Post Office') {
    var address = markup.address.split(',');
    name = 'USPS: ' + address[0];
  }
  return name;
};

/**
 * Renders a portal link for use in the chat.
 *
 * @function window.chat.renderPortal
 * @param {Object} portal - The portal data.
 * @returns {string} HTML string of the portal link.
 */
window.chat.renderPortal = function (portal) {
  var lat = portal.latE6/1E6, lng = portal.lngE6/1E6;
  var perma = window.makePermalink([lat,lng]);
  var js = 'window.selectPortalByLatLng('+lat+', '+lng+');return false';
  return '<a onclick="' + js + '"' + ' title="' + portal.address + '"' + ' href="' + perma + '" class="help">' + window.chat.getChatPortalName(portal) + '</a>';
};

/**
 * Renders a faction entity for use in the chat.
 *
 * @function window.chat.renderFactionEnt
 * @param {Object} faction - The faction data.
 * @returns {string} HTML string representing the faction.
 */
window.chat.renderFactionEnt = function (faction) {
  var teamId = window.teamStringToId(faction.team);
  var name = window.TEAM_NAMES[teamId];
  var spanClass = window.TEAM_TO_CSS[teamId];
  return $('<div>').html($('<span>')
    .attr('class', spanClass)
    .text(name)).html();
};

/**
 * Renders a player's nickname in chat.
 *
 * @function window.chat.renderPlayer
 * @param {Object} player - The player object containing nickname and team.
 * @param {boolean} at - Whether to prepend '@' to the nickname.
 * @param {boolean} sender - Whether the player is the sender of a message.
 * @returns {string} The HTML string representing the player's nickname in chat.
 */
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

/**
 * Renders a chat message entity based on its type.
 *
 * @function window.chat.renderMarkupEntity
 * @param {Array} ent - The entity array, where the first element is the type and the second element is the data.
 * @returns {string} The HTML string representing the chat message entity.
 */
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

/**
 * Renders the markup of a chat message, converting special entities like player names, portals, etc., into HTML.
 *
 * @function window.chat.renderMarkup
 * @param {Array} markup - The markup array of a chat message.
 * @returns {string} The HTML string representing the complete rendered chat message.
 */
window.chat.renderMarkup = function (markup) {
  var msg = '';

  markup.forEach(function (ent, ind) {
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

/**
 * Transforms a given markup array into an older, more straightforward format for easier understanding.
 *
 * @function window.chat.transformMessage
 * @param {Array} markup - An array representing the markup to be transformed.
 * @returns {Array} The transformed markup array with a simplified structure.
 */
function transformMessage(markup) {
  // Make a copy of the markup array to avoid modifying the original input
  let newMarkup = JSON.parse(JSON.stringify(markup));

  // Collapse <faction> + "Link"/"Field". Example: "Agent <player> destroyed the <faction> Link ..."
  if (newMarkup.length > 4) {
    if (newMarkup[3][0] === 'FACTION' && newMarkup[4][0] === 'TEXT' && (newMarkup[4][1].plain === ' Link ' || newMarkup[4][1].plain === ' Control Field @')) {
      newMarkup[4][1].team = newMarkup[3][1].team;
      newMarkup.splice(3, 1);
    }
  }

  // Skip "Agent <player>" at the beginning
  if (newMarkup.length > 1) {
    if (newMarkup[0][0] === 'TEXT' && newMarkup[0][1].plain === 'Agent ' && newMarkup[1][0] === 'PLAYER') {
      newMarkup.splice(0, 2);
    }
  }

  // Skip "<faction> agent <player>" at the beginning
  if (newMarkup.length > 2) {
    if (newMarkup[0][0] === 'FACTION' && newMarkup[1][0] === 'TEXT' && newMarkup[1][1].plain === ' agent ' && newMarkup[2][0] === 'PLAYER') {
      newMarkup.splice(0, 3);
    }
  }

  return newMarkup;
}

/**
 * Renders a cell in the chat table to display the time a message was sent.
 * Formats the time and adds it to a <time> HTML element with a tooltip showing the full date and time.
 *
 * @function window.chat.renderTimeCell
 * @param {number} time - The timestamp of the message.
 * @param {string} classNames - Additional class names to be added to the time cell.
 * @returns {string} The HTML string representing a table cell with the formatted time.
 */
window.chat.renderTimeCell = function (time, classNames) {
  const ta = window.unixTimeToHHmm(time);
  let tb = window.unixTimeToDateTimeString(time, true);
  // add <small> tags around the milliseconds
  tb = (tb.slice(0, 19) + '<small class="milliseconds">' + tb.slice(19) + '</small>').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return '<td><time class="' + classNames + '" title="' + tb + '" data-timestamp="' + time + '">' + ta + '</time></td>';
};

/**
 * Renders a cell in the chat table for a player's nickname.
 * Wraps the nickname in <mark> HTML element for highlighting.
 *
 * @function window.chat.renderNickCell
 * @param {string} nick - The nickname of the player.
 * @param {string} classNames - Additional class names to be added to the nickname cell.
 * @returns {string} The HTML string representing a table cell with the player's nickname.
 */
window.chat.renderNickCell = function (nick, classNames) {
  const i = ['<span class="invisep">&lt;</span>', '<span class="invisep">&gt;</span>'];
  return '<td>' + i[0] + '<mark class="' + classNames + '">' + nick + '</mark>' + i[1] + '</td>';
};

/**
 * Renders a cell in the chat table for a chat message.
 * The message is inserted as inner HTML of the table cell.
 *
 * @function window.chat.renderMsgCell
 * @param {string} msg - The chat message to be displayed.
 * @param {string} classNames - Additional class names to be added to the message cell.
 * @returns {string} The HTML string representing a table cell with the chat message.
 */
window.chat.renderMsgCell = function (msg, classNames) {
  return '<td class="' + classNames + '">' + msg + '</td>';
};

/**
 * Renders a row for a chat message including time, nickname, and message cells.
 *
 * @function window.chat.renderMsgRow
 * @param {Object} data - The data for the message, including time, player, and message content.
 * @returns {string} The HTML string representing a row in the chat table.
 */
window.chat.renderMsgRow = function (data) {
  var timeClass = data.msgToPlayer ? 'pl_nudge_date' : '';
  var timeCell = chat.renderTimeCell(data.time, timeClass);

  var nickClasses = ['nickname'];
  if (window.TEAM_TO_CSS[data.player.team]) {
    nickClasses.push(window.TEAM_TO_CSS[data.player.team]);
  }
  // highlight things said/done by the player in a unique colour
  // (similar to @player mentions from others in the chat text itself)
  if (data.player.name === window.PLAYER.nickname) {
    nickClasses.push('pl_nudge_me');
  }
  var nickCell = chat.renderNickCell(data.player.name, nickClasses.join(' '));

  const markup = transformMessage(data.markup);
  var msg = chat.renderMarkup(markup);
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

/**
 * Legacy function for rendering chat messages. Used for backward compatibility with plugins.
 *
 * @function window.chat.renderMsg
 * @param {string} msg - The chat message.
 * @param {string} nick - The nickname of the player who sent the message.
 * @param {number} time - The timestamp of the message.
 * @param {string} team - The team of the player who sent the message.
 * @param {boolean} msgToPlayer - Flag indicating if the message is directed to the player.
 * @param {boolean} systemNarrowcast - Flag indicating if the message is a system narrowcast.
 * @returns {string} The HTML string representing a chat message row.
 */
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

/**
 * Renders a divider row in the chat table.
 *
 * @function window.chat.renderDivider
 * @param {string} text - Text to display within the divider row.
 * @returns {string} The HTML string representing a divider row in the chat table.
 */
window.chat.renderDivider = function(text) {
  return '<tr class="divider"><td><hr></td><td>' + text + '</td><td><hr></td></tr>';
};

/**
 * Renders data from the data-hash to the element defined by the given ID.
 *
 * @function window.chat.renderData
 * @param {Object} data - Chat data to be rendered.
 * @param {string} element - ID of the DOM element to render the chat into.
 * @param {boolean} likelyWereOldMsgs - Flag indicating if older messages are likely to have been added.
 * @param {Array} sortedGuids - Sorted array of GUIDs representing the order of messages.
 */
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

/**
 * Gets the name of the active chat tab.
 *
 * @function window.chat.getActive
 * @returns {string} The name of the active chat tab.
 */
window.chat.getActive = function() {
  return $('#chatcontrols .active').text();
}

/**
 * Converts a chat tab name to its corresponding COMM channel name.
 *
 * @function window.chat.tabToChannel
 * @param {string} tab - The name of the chat tab.
 * @returns {string} The corresponding channel name ('faction', 'alerts', or 'all').
 */
window.chat.tabToChannel = function(tab) {
  if (tab == 'faction') return 'faction';
  if (tab == 'alerts') return 'alerts';
  return 'all';
};

/**
 * Toggles the chat window between expanded and collapsed states.
 * When expanded, the chat window covers a larger area of the screen.
 * This function also ensures that the chat is scrolled to the bottom when collapsed.
 *
 * @function window.chat.toggle
 */
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

/**
 * Allows plugins to request and monitor COMM data streams in the background. This is useful for plugins
 * that need to process COMM data even when the user is not actively viewing the COMM channels.
 * It tracks the requested channels for each plugin instance and updates the global state accordingly.
 *
 * @function window.chat.backgroundChannelData
 * @param {string} instance - A unique identifier for the plugin or instance requesting background COMM data.
 * @param {string} channel - The name of the COMM channel ('all', 'faction', or 'alerts').
 * @param {boolean} flag - Set to true to request data for the specified channel, false to stop requesting.
 */
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

/**
 * Requests chat messages for the currently active chat tab and background channels.
 * It calls the appropriate request function based on the active tab or background channels.
 *
 * @function window.chat.request
 */
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

/**
 * Checks if the currently selected chat tab needs more messages.
 * This function is triggered by scroll events and loads older messages when the user scrolls to the top.
 *
 * @function window.chat.needMoreMessages
 */
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

/**
 * Chooses and activates a specified chat tab.
 * Also triggers an early refresh of the chat data when switching tabs.
 *
 * @function window.chat.chooseTab
 * @param {string} tab - The name of the chat tab to activate ('all', 'faction', or 'alerts').
 */
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
  }
}

/**
 * Displays the chat interface and activates a specified chat tab.
 *
 * @function window.chat.show
 * @param {string} name - The name of the chat tab to show and activate.
 */
window.chat.show = function(name) {
    window.isSmartphone()
        ? $('#updatestatus').hide()
        : $('#updatestatus').show();
    $('#chat, #chatinput').show();

    window.chat.chooseTab(name);
}

/**
 * Chat tab chooser handler.
 * This function is triggered by a click event on the chat tab. It reads the tab name from the event target
 * and activates the corresponding chat tab.
 *
 * @function window.chat.chooser
 * @param {Event} event - The event triggered by clicking a chat tab.
 */
window.chat.chooser = function(event) {
  var t = $(event.target);
  var tab = t.text();
  window.chat.chooseTab(tab);
}

/**
 * Maintains the scroll position of a chat box when new messages are added.
 * This function is designed to keep the scroll position fixed when old messages are loaded, and to automatically scroll
 * to the bottom when new messages are added if the user is already at the bottom of the chat.
 *
 * @function window.chat.keepScrollPosition
 * @param {jQuery} box - The jQuery object of the chat box.
 * @param {number} scrollBefore - The scroll position before new messages were added.
 * @param {boolean} isOldMsgs - Indicates if the added messages are older messages.
 */
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

/**
 * Sets up the chat interface.
 *
 * @function window.chat.setup
 */
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

/**
 * Sets up the time display in the chat input box.
 * This function updates the time displayed next to the chat input field every minute to reflect the current time.
 *
 * @function window.chat.setupTime
 */
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

/**
 * Sets up the chat message posting functionality.
 *
 * @function window.chat.setupPosting
 */
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
      }
    });
  }

  $('#chatinput').submit(function(event) {
    event.preventDefault();
    chat.postMsg();
  });
}

/**
 * Posts a chat message to the currently active chat tab.
 *
 * @function window.chat.postMsg
 */
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
