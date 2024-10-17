/**
 * @file Namespace for chat-related functionalities.
 *
 * @module chat
 */
var chat = function () {};
window.chat = chat;

// List of functions to track for synchronization between chat and comm
const legacyFunctions = [
  'genPostData',
  'updateOldNewHash',
  'parseMsgData',
  'writeDataToHash',
  'renderText',
  'getChatPortalName',
  'renderPortal',
  'renderFactionEnt',
  'renderPlayer',
  'renderMarkupEntity',
  'renderMarkup',
  'renderTimeCell',
  'renderNickCell',
  'renderMsgCell',
  'renderMsgRow',
  'renderDivider',
  'renderData',
];
const newCommApi = [
  '_genPostData',
  '_updateOldNewHash',
  'parseMsgData',
  '_writeDataToHash',
  'renderText',
  'getChatPortalName',
  'renderPortal',
  'renderFactionEnt',
  'renderPlayer',
  'renderMarkupEntity',
  'renderMarkup',
  'renderTimeCell',
  'renderNickCell',
  'renderMsgCell',
  'renderMsgRow',
  'renderDivider',
  'renderData',
];

// Function to map legacy function names to their new names in comm
function mapLegacyFunctionNameToCommApi(functionName) {
  const index = legacyFunctions.indexOf(functionName);
  return index !== -1 ? newCommApi[index] : functionName;
}

// Create a proxy for chat to ensure backward compatibility of migrated functions from chat to comm
window.chat = new Proxy(window.chat, {
  get(target, prop, receiver) {
    if (prop in target) {
      // Return the property from chat if it's defined
      return target[prop];
    } else if (legacyFunctions.includes(prop)) {
      // Map the legacy function name to its new name in comm and return the corresponding function
      const commProp = mapLegacyFunctionNameToCommApi(prop);
      return window.IITC.comm[commProp];
    }
    // Return default value if the property is not found
    return Reflect.get(target, prop, receiver);
  },
  set(target, prop, value) {
    if (legacyFunctions.includes(prop)) {
      // Map the legacy function name to its new name in comm and synchronize the function between chat and comm
      const commProp = mapLegacyFunctionNameToCommApi(prop);
      window.IITC.comm[commProp] = value;
    }
    // Update or add the property in chat
    target[prop] = value;
    return true; // Indicates that the assignment was successful
  },
});

//
// common
//

/**
 * Adds a nickname to the chat input.
 *
 * @function addNickname
 * @param {string} nick - The nickname to add.
 */
chat.addNickname = function (nick) {
  var c = document.getElementById('chattext');
  c.value = [c.value.trim(), nick].join(' ').trim() + ' ';
  c.focus();
};

/**
 * Handles click events on nicknames in the chat.
 *
 * @function nicknameClicked
 * @param {Event} event - The click event.
 * @param {string} nickname - The clicked nickname.
 * @returns {boolean} Always returns false.
 */
chat.nicknameClicked = function (event, nickname) {
  // suppress @ if coming from chat
  if (nickname.startsWith('@')) {
    nickname = nickname.slice(1);
  }
  var hookData = { event: event, nickname: nickname };

  if (window.runHooks('nicknameClicked', hookData)) {
    chat.addNickname('@' + nickname);
  }

  event.preventDefault();
  event.stopPropagation();
  return false;
};

//
// Channels
//

// WORK IN PROGRESS
// 'all' 'faction' and 'alerts' channels are hard coded in several places (including mobile app)
// dont change those channels since they refer to stock channels
// you can add channels from another source provider (message relay, logging from plugins...)

/**
 * Hold channel description
 *
 * See comm.js for examples
 * @typedef {Object} ChannelDescription
 * @property {string} id - uniq id, matches 'tab' parameter for server requests
 * @property {string} name - visible name
 * @property {string} [inputPrompt] - (optional) string for the input prompt
 * @property {string} [inputClass] - (optional) class to apply to #chatinput
 * @property {ChannelSendMessageFn} [sendMessage] - (optional) function to send the message
 * @property {ChannelRequestFn} [request] - (optional) function to call to request new message
 * @property {ChannelRenderFn} [render] - (optional) function to render channel content,, called on tab change
 * @property {boolean} [localBounds] - (optional) if true, reset on view change
 */
/**
 * @callback ChannelSendMessageFn
 * @param {string} id - channel id
 * @param {string} message - input message
 * @returns {void}
 */
/**
 * @callback ChannelRequestFn
 * @param {string} id - channel id
 * @param {boolean} getOlderMsgs - true if request data from a scroll to top
 * @param {boolean} isRetry
 * @returns {void}
 */
/**
 * @callback ChannelRenderFn
 * @param {string} id - channel id
 * @param {boolean} oldMsgsWereAdded - true if data has been added at the top (to preserve scroll position)
 * @returns {void}
 */

/**
 * Holds channels infos.
 *
 * @type {ChannelDescription[]}
 * @memberof module:chat
 */
chat.channels = [];

/**
 * Gets the name of the active chat tab.
 *
 * @function getActive
 * @returns {string} The name of the active chat tab.
 */
chat.getActive = function () {
  return $('#chatcontrols .active').data('channel');
};

/**
 * Converts a chat tab name to its corresponding channel object.
 *
 * @function getChannelDesc
 * @param {string} tab - The name of the chat tab.
 * @returns {ChannelDescription} The corresponding channel name ('faction', 'alerts', or 'all').
 */
chat.getChannelDesc = function (tab) {
  var channelObject = null;
  chat.channels.forEach(function (entry) {
    if (entry.id === tab) channelObject = entry;
  });
  return channelObject;
};

/**
 * Allows plugins to request and monitor COMM data streams in the background. This is useful for plugins
 * that need to process COMM data even when the user is not actively viewing the COMM channels.
 * It tracks the requested channels for each plugin instance and updates the global state accordingly.
 *
 * @function backgroundChannelData
 * @param {string} instance - A unique identifier for the plugin or instance requesting background COMM data.
 * @param {string} channel - The name of the COMM channel ('all', 'faction', or 'alerts').
 * @param {boolean} flag - Set to true to request data for the specified channel, false to stop requesting.
 */
chat.backgroundChannelData = function (instance, channel, flag) {
  // first, store the state for this instance
  if (!chat.backgroundInstanceChannel) chat.backgroundInstanceChannel = {};
  if (!chat.backgroundInstanceChannel[instance]) chat.backgroundInstanceChannel[instance] = {};
  chat.backgroundInstanceChannel[instance][channel] = flag;

  // now, to simplify the request code, merge the flags for all instances into one
  // 1. clear existing overall flags
  chat.backgroundChannels = {};
  // 2. for each instance monitoring COMM...
  $.each(chat.backgroundInstanceChannel, function (instance) {
    // 3. and for each channel monitored by this instance...
    $.each(chat.backgroundInstanceChannel[instance], function (channel, flag) {
      // 4. if it's monitored, set the channel flag
      if (flag) chat.backgroundChannels[channel] = true;
    });
  });
};

/**
 * Requests chat messages for the currently active chat tab and background channels.
 * It calls the appropriate request function based on the active tab or background channels.
 *
 * @function request
 */
chat.request = function () {
  var channel = chat.getActive();
  chat.channels.forEach(function (entry) {
    if (channel === entry.id || (chat.backgroundChannels && chat.backgroundChannels[entry.id])) {
      if (entry.request) entry.request(entry.id, false);
    }
  });
};

/**
 * Checks if the currently selected chat tab needs more messages.
 * This function is triggered by scroll events and loads older messages when the user scrolls to the top.
 *
 * @function needMoreMessages
 */
chat.needMoreMessages = function () {
  var activeTab = chat.getActive();
  var channel = chat.getChannelDesc(activeTab);
  if (!channel || !channel.request) return;

  var activeChat = $('#chat > :visible');
  if (activeChat.length === 0) return;

  var hasScrollbar = window.scrollBottom(activeChat) !== 0 || activeChat.scrollTop() !== 0;
  var nearTop = activeChat.scrollTop() <= window.CHAT_REQUEST_SCROLL_TOP;
  if (hasScrollbar && !nearTop) return;

  channel.request(channel.id, false);
};

/**
 * Chooses and activates a specified chat tab.
 * Also triggers an early refresh of the chat data when switching tabs.
 *
 * @function chooseTab
 * @param {string} tab - The name of the chat tab to activate ('all', 'faction', or 'alerts').
 */
chat.chooseTab = function (tab) {
  if (
    chat.channels.every(function (entry) {
      return entry.id !== tab;
    })
  ) {
    var tabsAvalaible = chat.channels
      .map(function (entry) {
        return '"' + entry.id + '"';
      })
      .join(', ');
    log.warn('chat tab "' + tab + '" requested - but only ' + tabsAvalaible + ' are valid - assuming "all" wanted');
    tab = 'all';
  }

  var oldTab = chat.getActive();

  localStorage['iitc-chat-tab'] = tab;

  var oldChannel = chat.getChannelDesc(oldTab);
  var channel = chat.getChannelDesc(tab);

  var chatInput = $('#chatinput');
  if (oldChannel && oldChannel.inputClass) chatInput.removeClass(oldChannel.inputClass);
  if (channel.inputClass) chatInput.addClass(channel.inputClass);

  var mark = $('#chatinput mark');
  mark.text(channel.inputPrompt || '');

  $('#chatcontrols .active').removeClass('active');
  $("#chatcontrols a[data-channel='" + tab + "']").addClass('active');

  if (tab !== oldTab) window.startRefreshTimeout(0.1 * 1000); // only chat uses the refresh timer stuff, so a perfect way of forcing an early refresh after a tab change

  $('#chat > div').hide();

  var elm = $('#chat' + tab);
  elm.show();

  if (channel.render) channel.render(tab);

  if (elm.data('needsScrollTop')) {
    elm.data('ignoreNextScroll', true);
    elm.scrollTop(elm.data('needsScrollTop'));
    elm.data('needsScrollTop', null);
  }
};

/**
 * Toggles the chat window between expanded and collapsed states.
 * When expanded, the chat window covers a larger area of the screen.
 * This function also ensures that the chat is scrolled to the bottom when collapsed.
 *
 * @function toggle
 */
chat.toggle = function () {
  var c = $('#chat, #chatcontrols');
  if (c.hasClass('expand')) {
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
 * Displays the chat interface and activates a specified chat tab.
 *
 * @function show
 * @param {string} name - The name of the chat tab to show and activate.
 */
chat.show = function (name) {
  if (window.isSmartphone()) {
    $('#updatestatus').hide();
  } else {
    $('#updatestatus').show();
  }
  $('#chat, #chatinput').show();

  chat.chooseTab(name);
};

/**
 * Chat tab chooser handler.
 * This function is triggered by a click event on the chat tab. It reads the tab name from the event target
 * and activates the corresponding chat tab.
 *
 * @function chooser
 * @param {Event} event - The event triggered by clicking a chat tab.
 */
chat.chooser = function (event) {
  var t = $(event.target);
  var tab = t.data('channel');
  chat.chooseTab(tab);
};

/**
 * Maintains the scroll position of a chat box when new messages are added.
 * This function is designed to keep the scroll position fixed when old messages are loaded, and to automatically scroll
 * to the bottom when new messages are added if the user is already at the bottom of the chat.
 *
 * @function keepScrollPosition
 * @param {jQuery} box - The jQuery object of the chat box.
 * @param {number} scrollBefore - The scroll position before new messages were added.
 * @param {boolean} isOldMsgs - Indicates if the added messages are older messages.
 */
chat.keepScrollPosition = function (box, scrollBefore, isOldMsgs) {
  // If scrolled down completely, keep it that way so new messages can
  // be seen easily. If scrolled up, only need to fix scroll position
  // when old messages are added. New messages added at the bottom don’t
  // change the view and enabling this would make the chat scroll down
  // for every added message, even if the user wants to read old stuff.

  if (box.is(':hidden') && !isOldMsgs) {
    box.data('needsScrollTop', 99999999);
    return;
  }

  if (scrollBefore === 0 || isOldMsgs) {
    box.data('ignoreNextScroll', true);
    box.scrollTop(box.scrollTop() + (window.scrollBottom(box) - scrollBefore));
  }
};

/**
 * Create and insert into the DOM/Mobile app the channel tab
 *
 * @function createChannelTab
 * @memberof chat
 * @param {ChannelDescription} channelDesc - channel description
 * @static
 */
function createChannelTab(channelDesc) {
  var chatControls = $('#chatcontrols');
  var chatDiv = $('#chat');
  var accessLink = L.Util.template('<a data-channel="{id}" accesskey="{index}" title="[{index}]">{name}</a>', channelDesc);
  $(accessLink).appendTo(chatControls).click(chat.chooser);

  var channelDiv = L.Util.template('<div id="chat{id}"><table></table></div>', channelDesc);
  var elm = $(channelDiv).appendTo(chatDiv);
  if (channelDesc.request) {
    elm.scroll(function () {
      var t = $(this);
      if (t.data('ignoreNextScroll')) return t.data('ignoreNextScroll', false);
      if (t.scrollTop() < window.CHAT_REQUEST_SCROLL_TOP) channelDesc.request(channelDesc.id, true);
      if (window.scrollBottom(t) === 0) channelDesc.request(channelDesc.id, false);
    });
  }

  // pane
  if (window.useAndroidPanes()) {
    // exlude hard coded panes
    if (channelDesc.id !== 'all' && channelDesc.id !== 'faction' && channelDesc.id !== 'alerts') {
      app.addPane(channelDesc.id, channelDesc.name, 'ic_action_view_as_list');
    }
  }
}

var isTabsSetup = false;
/**
 * Add to the channel list a new channel description
 *
 * If tabs are already created, a tab is created for this channel as well
 *
 * @function addChannel
 * @param {ChannelDescription} channelDesc - channel description
 */
chat.addChannel = function (channelDesc) {
  // deny reserved name
  if (channelDesc.id === 'info' || channelDesc.id === 'map') {
    log.warn('could not add channel "' + channelDesc.id + '": reserved');
    return false;
  }
  if (chat.getChannelDesc(channelDesc.id)) {
    log.warn('could not add channel "' + channelDesc.id + '": already exist');
    return false;
  }

  chat.channels.push(channelDesc);
  channelDesc.index = chat.channels.length;

  if (isTabsSetup) createChannelTab(channelDesc);

  return true;
};

//
// setup
//

/**
 * Sets up all channels starting from intel COMM
 *
 * @function setupTabs
 */
chat.setupTabs = function () {
  isTabsSetup = true;

  // insert at the begining the comm channels
  chat.channels.splice(0, 0, ...IITC.comm.channels);

  chat.channels.forEach(function (entry, i) {
    entry.index = i + 1;
    createChannelTab(entry);
  });

  // legacy compatibility
  chat._public = IITC.comm._channelsData.all;
  chat._faction = IITC.comm._channelsData.faction;
  chat._alerts = IITC.comm._channelsData.alerts;

  /**
   * Initiates a request for public chat data.
   *
   * @function requestPublic
   * @param {boolean} getOlderMsgs - Whether to retrieve older messages.
   * @param {boolean} [isRetry=false] - Whether the request is a retry.
   */
  chat.requestPublic = function (getOlderMsgs, isRetry) {
    return IITC.comm.requestChannel('all', getOlderMsgs, isRetry);
  };

  /**
   * Requests faction chat messages.
   *
   * @function requestFaction
   * @param {boolean} getOlderMsgs - Flag to determine if older messages are being requested.
   * @param {boolean} [isRetry=false] - Flag to indicate if this is a retry attempt.
   */
  chat.requestFaction = function (getOlderMsgs, isRetry) {
    return IITC.comm.requestChannel('faction', getOlderMsgs, isRetry);
  };

  /**
   * Initiates a request for alerts chat data.
   *
   * @function requestAlerts
   * @param {boolean} getOlderMsgs - Whether to retrieve older messages.
   * @param {boolean} [isRetry=false] - Whether the request is a retry.
   */
  chat.requestAlerts = function (getOlderMsgs, isRetry) {
    return IITC.comm.requestChannel('alerts', getOlderMsgs, isRetry);
  };

  /**
   * Renders public chat in the UI.
   *
   * @function renderPublic
   * @param {boolean} oldMsgsWereAdded - Indicates if older messages were added to the chat.
   */
  chat.renderPublic = function (oldMsgsWereAdded) {
    return IITC.comm.renderChannel('all', oldMsgsWereAdded);
  };

  /**
   * Renders faction chat.
   *
   * @function renderFaction
   * @param {boolean} oldMsgsWereAdded - Indicates if old messages were added in the current rendering.
   */
  chat.renderFaction = function (oldMsgsWereAdded) {
    return IITC.comm.renderChannel('faction', oldMsgsWereAdded);
  };

  /**
   * Renders alerts chat in the UI.
   *
   * @function renderAlerts
   * @param {boolean} oldMsgsWereAdded - Indicates if older messages were added to the chat.
   */
  chat.renderAlerts = function (oldMsgsWereAdded) {
    return IITC.comm.renderChannel('allerts', oldMsgsWereAdded);
  };
};

/**
 * Sets up the chat interface.
 *
 * @function setup
 */
chat.setup = function () {
  chat.setupTabs();

  if (localStorage['iitc-chat-tab']) {
    chat.chooseTab(localStorage['iitc-chat-tab']);
  }

  $('#chatcontrols, #chat, #chatinput').show();

  $('#chatcontrols a:first').click(chat.toggle);

  $('#chatinput').click(function () {
    $('#chatinput input').focus();
  });

  chat.setupTime();
  chat.setupPosting();

  window.requests.addRefreshFunction(chat.request);

  var cls = PLAYER.team === 'RESISTANCE' ? 'res' : 'enl';
  $('#chatinput mark').addClass(cls);

  $(document).on('click', '.nickname', function (event) {
    return chat.nicknameClicked(event, $(this).text());
  });
};

/**
 * Sets up the time display in the chat input box.
 * This function updates the time displayed next to the chat input field every minute to reflect the current time.
 *
 * @function setupTime
 */
chat.setupTime = function () {
  var inputTime = $('#chatinput time');
  var updateTime = function () {
    if (window.isIdle()) return;
    var d = new Date();
    var h = d.getHours() + '';
    if (h.length === 1) h = '0' + h;
    var m = d.getMinutes() + '';
    if (m.length === 1) m = '0' + m;
    inputTime.text(h + ':' + m);
    // update ON the minute (1ms after)
    setTimeout(updateTime, (60 - d.getSeconds()) * 1000 + 1);
  };
  updateTime();
  window.addResumeFunction(updateTime);
};

//
// posting
//

/**
 * Handles tab completion in chat input.
 *
 * @function handleTabCompletion
 */
chat.handleTabCompletion = function () {
  var el = $('#chatinput input');
  var curPos = el.get(0).selectionStart;
  var text = el.val();
  var word = text
    .slice(0, curPos)
    .replace(/.*\b([a-z0-9-_])/, '$1')
    .toLowerCase();

  var list = $('#chat > div:visible mark');
  list = list.map(function (ind, mark) {
    return $(mark).text();
  });
  list = window.uniqueArray(list);

  var nick = null;
  for (var i = 0; i < list.length; i++) {
    if (!list[i].toLowerCase().startsWith(word)) continue;
    if (nick && nick !== list[i]) {
      log.warn('More than one nick matches, aborting. (' + list[i] + ' vs ' + nick + ')');
      return;
    }
    nick = list[i];
  }
  if (!nick) {
    return;
  }

  var posStart = curPos - word.length;
  var newText = text.substring(0, posStart);
  var atPresent = text.substring(posStart - 1, posStart) === '@';
  newText += (atPresent ? '' : '@') + nick + ' ';
  newText += text.substring(curPos);
  el.val(newText);
};

/**
 * Posts a chat message to the currently active chat tab.
 *
 * @function postMsg
 */
chat.postMsg = function () {
  var c = chat.getActive();
  var channel = chat.getChannelDesc(c);

  var msg = $.trim($('#chatinput input').val());
  if (!msg || msg === '') return;

  if (channel.sendMessage) {
    $('#chatinput input').val('');
    return channel.sendMessage(c, msg);
  }
};

/**
 * Sets up the chat message posting functionality.
 *
 * @function setupPosting
 */
chat.setupPosting = function () {
  if (!window.isSmartphone()) {
    $('#chatinput input').keydown(function (event) {
      try {
        var kc = event.keyCode ? event.keyCode : event.which;
        if (kc === 13) {
          // enter
          chat.postMsg();
          event.preventDefault();
        } else if (kc === 9) {
          // tab
          event.preventDefault();
          chat.handleTabCompletion();
        }
      } catch (e) {
        log.error(e);
        // if (e.stack) { console.error(e.stack); }
      }
    });
  }

  $('#chatinput').submit(function (event) {
    event.preventDefault();
    chat.postMsg();
  });
};

/**
 * Legacy function for rendering chat messages. Used for backward compatibility with plugins.
 *
 * @deprecated
 * @function renderMsg
 * @param {string} msg - The chat message.
 * @param {string} nick - The nickname of the player who sent the message.
 * @param {number} time - The timestamp of the message.
 * @param {string} team - The team of the player who sent the message.
 * @param {boolean} msgToPlayer - Flag indicating if the message is directed to the player.
 * @param {boolean} systemNarrowcast - Flag indicating if the message is a system narrowcast.
 * @returns {string} The HTML string representing a chat message row.
 */
chat.renderMsg = function (msg, nick, time, team, msgToPlayer, systemNarrowcast) {
  // Imitating data usually derived from processing raw chat data
  var fakeData = {
    guid: 'legacyguid-' + Math.random(),
    time: time,
    public: !systemNarrowcast,
    secure: systemNarrowcast,
    alert: msgToPlayer,
    msgToPlayer: msgToPlayer,
    type: systemNarrowcast ? 'SYSTEM_NARROWCAST' : 'PLAYER_GENERATED',
    narrowcast: systemNarrowcast,
    auto: false, // Assuming the message is player-generated if it's not a system broadcast
    team: team,
    player: {
      name: nick,
      team: team,
    },
    markup: [
      ['TEXT', { plain: msg }], // A simple message with no special markup
    ],
  };

  // Use existing IITC functions to render a chat message row
  return IITC.comm.renderMsgRow(fakeData);
};

/**
 * Legacy function for converts a chat tab name to its corresponding COMM channel name.
 * Used for backward compatibility with plugins.
 *
 * @deprecated
 * @function tabToChannel
 * @param {string} tab - The name of the chat tab.
 * @returns {string} The corresponding channel name ('faction', 'alerts', or 'all').
 */
chat.tabToChannel = function (tab) {
  if (tab === 'faction') return 'faction';
  if (tab === 'alerts') return 'alerts';
  return 'all';
};

/* global log, PLAYER, L, IITC, app */
