/* global log, L, IITC, app */

/**
 * Chat-panel UI framework: tabs, input, scrolling and the channel-registration API.
 * The COMM data layer lives in comm.js
 *
 * @memberof IITC
 * @namespace chat
 */

// Create the IITC.chat namespace holding the chat-panel UI framework
IITC.chat = {};
const chat = IITC.chat;

/**
 * Template of a channel tab link shown in the chat controls.
 *
 * @type {string}
 * @memberof IITC.chat
 */
chat.channelTabTemplate = '<a data-channel="{id}" accesskey="{index}" title="[{index}]">{name}</a>';

/**
 * Template of a channel message container appended to the chat panel.
 *
 * @type {string}
 * @memberof IITC.chat
 */
chat.channelContainerTemplate = '<div id="chat{id}"><table></table></div>';

//
// common
//

/**
 * Adds a nickname to the chat input.
 *
 * @memberof IITC.chat
 * @param {string} nick - The nickname to add.
 */
chat.addNickname = (nick) => {
  const c = document.getElementById('chattext');
  c.value = `${[c.value.trim(), nick].join(' ').trim()} `;
  c.focus();
};

/**
 * Handles click events on nicknames in the chat.
 *
 * @memberof IITC.chat
 * @param {Event} event - The click event.
 * @param {string} nickname - The clicked nickname.
 * @returns {boolean} Always returns false.
 */
chat.nicknameClicked = (event, nickname) => {
  // suppress @ if coming from chat
  if (nickname.startsWith('@')) {
    nickname = nickname.slice(1);
  }
  const hookData = { event: event, nickname: nickname };

  if (window.runHooks('nicknameClicked', hookData)) {
    chat.addNickname(`@${nickname}`);
  }

  event.preventDefault();
  event.stopPropagation();
  return false;
};

// Per-channel-element UI flags (needsScrollTop, ignoreNextScroll, needsClearing)
const _channelState = new WeakMap();

/**
 * Returns the per-channel-element UI flag store for the given channel DOM element.
 * The native WeakMap store is the source of truth, but writes are mirrored into `$(el).data(key)`
 * and reads fall back to it, so legacy plugins that access these flags via jQuery `.data()`
 * keep working.
 *
 * @memberof IITC.chat
 * @param {HTMLElement} el - The channel DOM element.
 * @returns {Object} A proxy exposing the element's UI flags.
 */
chat.channelState = (el) => {
  let state = _channelState.get(el);
  if (!state) {
    state = new Proxy(
      {},
      {
        get(target, key) {
          if (key in target) return target[key];
          return $(el).data(key);
        },
        set(target, key, value) {
          target[key] = value;
          $(el).data(key, value);
          return true;
        },
      }
    );
    _channelState.set(el, state);
  }
  return state;
};

//
// Channels
//

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
 * @memberof IITC.chat
 */
chat.channels = [];

/**
 * Gets the name of the active chat tab.
 *
 * @memberof IITC.chat
 * @returns {string} The name of the active chat tab.
 */
chat.getActive = () => {
  return document.querySelector('#chatcontrols .active')?.dataset.channel;
};

/**
 * Converts a chat tab name to its corresponding channel object.
 *
 * @memberof IITC.chat
 * @param {string} tab - The name of the chat tab.
 * @returns {ChannelDescription} The corresponding channel name ('faction', 'alerts', or 'all').
 */
chat.getChannelDesc = (tab) => {
  return chat.channels.find((entry) => entry.id === tab) || null;
};

/**
 * Allows plugins to request and monitor COMM data streams in the background. This is useful for plugins
 * that need to process COMM data even when the user is not actively viewing the COMM channels.
 * It tracks the requested channels for each plugin instance and updates the global state accordingly.
 *
 * @memberof IITC.chat
 * @param {string} instance - A unique identifier for the plugin or instance requesting background COMM data.
 * @param {string} channel - The name of the COMM channel ('all', 'faction', or 'alerts').
 * @param {boolean} flag - Set to true to request data for the specified channel, false to stop requesting.
 */
chat.backgroundChannelData = (instance, channel, flag) => {
  // first, store the state for this instance
  if (!chat.backgroundInstanceChannel) chat.backgroundInstanceChannel = {};
  if (!chat.backgroundInstanceChannel[instance]) chat.backgroundInstanceChannel[instance] = {};
  chat.backgroundInstanceChannel[instance][channel] = flag;

  // now, to simplify the request code, merge the flags for all instances into one
  // 1. clear existing overall flags
  chat.backgroundChannels = {};
  // 2. for each instance monitoring COMM...
  Object.keys(chat.backgroundInstanceChannel).forEach((instance) => {
    // 3. and for each channel monitored by this instance...
    Object.keys(chat.backgroundInstanceChannel[instance]).forEach((channel) => {
      // 4. if it's monitored, set the channel flag
      if (chat.backgroundInstanceChannel[instance][channel]) chat.backgroundChannels[channel] = true;
    });
  });
};

/**
 * Requests chat messages for the currently active chat tab and background channels.
 * It calls the appropriate request function based on the active tab or background channels.
 *
 * @memberof IITC.chat
 */
chat.request = () => {
  const channel = chat.getActive();
  chat.channels.forEach((entry) => {
    if (channel === entry.id || (chat.backgroundChannels && chat.backgroundChannels[entry.id])) {
      if (entry.request) entry.request(entry.id, false);
    }
  });
};

/**
 * Checks if the currently selected chat tab needs more messages.
 * This function is triggered by scroll events and loads older messages when the user scrolls to the top.
 *
 * @memberof IITC.chat
 */
chat.needMoreMessages = () => {
  const activeTab = chat.getActive();
  const channel = chat.getChannelDesc(activeTab);
  if (!channel || !channel.request) return;

  const activeChat = Array.from(document.querySelectorAll('#chat > *')).find((el) => IITC.utils._isVisible(el));
  if (!activeChat) return;

  const hasScrollbar = window.scrollBottom(activeChat) !== 0 || activeChat.scrollTop !== 0;
  const nearTop = activeChat.scrollTop <= window.CHAT_REQUEST_SCROLL_TOP;
  if (hasScrollbar && !nearTop) return;

  channel.request(channel.id, false);
};

/**
 * Chooses and activates a specified chat tab.
 * Also triggers an early refresh of the chat data when switching tabs.
 *
 * @memberof IITC.chat
 * @param {string} tab - The name of the chat tab to activate ('all', 'faction', or 'alerts').
 */
chat.chooseTab = (tab) => {
  if (chat.channels.every((entry) => entry.id !== tab)) {
    const tabsAvalaible = chat.channels.map((entry) => `"${entry.id}"`).join(', ');
    log.warn(`chat tab "${tab}" requested - but only ${tabsAvalaible} are valid - assuming "all" wanted`);
    tab = 'all';
  }

  const oldTab = chat.getActive();

  localStorage['iitc-chat-tab'] = tab;

  const oldChannel = chat.getChannelDesc(oldTab);
  const channel = chat.getChannelDesc(tab);

  const chatInput = document.getElementById('chatinput');
  if (oldChannel && oldChannel.inputClass) chatInput.classList.remove(oldChannel.inputClass);
  if (channel.inputClass) chatInput.classList.add(channel.inputClass);

  chatInput.querySelector('mark').textContent = channel.inputPrompt || '';

  document.querySelector('#chatcontrols .active')?.classList.remove('active');
  document.querySelector(`#chatcontrols a[data-channel='${tab}']`)?.classList.add('active');

  if (tab !== oldTab) window.startRefreshTimeout(0.1 * 1000); // only chat uses the refresh timer stuff, so a perfect way of forcing an early refresh after a tab change

  document.querySelectorAll('#chat > div').forEach((div) => {
    div.style.display = 'none';
  });

  const elm = document.getElementById(`chat${tab}`);
  elm.style.display = '';

  if (channel.render) channel.render(tab);

  const state = chat.channelState(elm);
  if (state.needsScrollTop) {
    state.ignoreNextScroll = true;
    elm.scrollTop = state.needsScrollTop;
    state.needsScrollTop = null;
  }
};

/**
 * Toggles the chat window between expanded and collapsed states.
 * When expanded, the chat window covers a larger area of the screen.
 * This function also ensures that the chat is scrolled to the bottom when collapsed.
 *
 * @memberof IITC.chat
 */
chat.toggle = () => {
  const chatEl = document.getElementById('chat');
  const chatControls = document.getElementById('chatcontrols');
  if (chatEl.classList.contains('expand') || chatControls.classList.contains('expand')) {
    chatEl.classList.remove('expand');
    chatControls.classList.remove('expand');
    const div = Array.from(document.querySelectorAll('#chat > div')).find((el) => IITC.utils._isVisible(el));
    if (div) {
      chat.channelState(div).ignoreNextScroll = true;
      div.scrollTop = 99999999; // scroll to bottom
    }
    document.querySelectorAll('.leaflet-control').forEach((el) => {
      el.classList.remove('chat-expand');
    });
  } else {
    chatEl.classList.add('expand');
    chatControls.classList.add('expand');
    document.querySelectorAll('.leaflet-control').forEach((el) => {
      el.classList.add('chat-expand');
    });
    chat.needMoreMessages();
  }
};

/**
 * Displays the chat interface and activates a specified chat tab.
 *
 * @memberof IITC.chat
 * @param {string} name - The name of the chat tab to show and activate.
 */
chat.show = (name) => {
  if (window.isSmartphone()) {
    IITC.statusbar.hide();
  } else {
    IITC.statusbar.show();
  }
  document.getElementById('chat').style.display = '';
  document.getElementById('chatinput').style.display = '';

  chat.chooseTab(name);
};

/**
 * Chat tab chooser handler.
 * This function is triggered by a click event on the chat tab. It reads the tab name from the event target
 * and activates the corresponding chat tab.
 *
 * @memberof IITC.chat
 * @param {Event} event - The event triggered by clicking a chat tab.
 */
chat.chooser = (event) => {
  const tab = event.target.dataset.channel;

  if (window.isSmartphone() && !window.useAppPanes()) {
    window.show(tab);
  } else {
    chat.chooseTab(tab);
  }
};

/**
 * Maintains the scroll position of a chat box when new messages are added.
 * This function is designed to keep the scroll position fixed when old messages are loaded, and to automatically scroll
 * to the bottom when new messages are added if the user is already at the bottom of the chat.
 *
 * @memberof IITC.chat
 * @param {HTMLElement|jQuery} box - The chat box element (a jQuery object is also accepted for legacy callers).
 * @param {number} scrollBefore - The scroll position before new messages were added.
 * @param {boolean} isOldMsgs - Indicates if the added messages are older messages.
 */
chat.keepScrollPosition = (box, scrollBefore, isOldMsgs) => {
  // If scrolled down completely, keep it that way so new messages can
  // be seen easily. If scrolled up, only need to fix scroll position
  // when old messages are added. New messages added at the bottom don’t
  // change the view and enabling this would make the chat scroll down
  // for every added message, even if the user wants to read old stuff.

  const elm = box instanceof jQuery ? box[0] : box;
  const state = chat.channelState(elm);

  if (!IITC.utils._isVisible(elm) && !isOldMsgs) {
    state.needsScrollTop = 99999999;
    return;
  }

  if (scrollBefore === 0 || isOldMsgs) {
    state.ignoreNextScroll = true;
    elm.scrollTop = elm.scrollTop + (window.scrollBottom(elm) - scrollBefore);
  }
};

/**
 * Create and insert into the DOM/Mobile app the channel tab
 *
 * @param {ChannelDescription} channelDesc - channel description
 * @static
 */
function createChannelTab(channelDesc) {
  const chatControls = document.getElementById('chatcontrols');
  const chatDiv = document.getElementById('chat');
  const accessLink = L.Util.template(chat.channelTabTemplate, channelDesc);
  chatControls.insertAdjacentHTML('beforeend', accessLink);
  chatControls.lastElementChild.addEventListener('click', chat.chooser);

  const channelDiv = L.Util.template(chat.channelContainerTemplate, channelDesc);
  chatDiv.insertAdjacentHTML('beforeend', channelDiv);
  const elm = chatDiv.lastElementChild;
  if (channelDesc.request) {
    elm.addEventListener('scroll', () => {
      const state = chat.channelState(elm);
      if (state.ignoreNextScroll) {
        state.ignoreNextScroll = false;
        return;
      }
      if (elm.scrollTop < window.CHAT_REQUEST_SCROLL_TOP) channelDesc.request(channelDesc.id, true);
      if (window.scrollBottom(elm) === 0) channelDesc.request(channelDesc.id, false);
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

let isTabsSetup = false;
/**
 * Add to the channel list a new channel description
 *
 * If tabs are already created, a tab is created for this channel as well
 *
 * @memberof IITC.chat
 * @param {ChannelDescription} channelDesc - channel description
 */
chat.addChannel = (channelDesc) => {
  // deny reserved name
  if (channelDesc.id === 'info' || channelDesc.id === 'map') {
    log.warn(`could not add channel "${channelDesc.id}": reserved`);
    return false;
  }
  if (chat.getChannelDesc(channelDesc.id)) {
    log.warn(`could not add channel "${channelDesc.id}": already exist`);
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
 * @memberof IITC.chat
 */
chat.setupTabs = () => {
  isTabsSetup = true;

  // insert at the begining the comm channels
  chat.channels.splice(0, 0, ...IITC.comm.channels);

  chat.channels.forEach((entry, i) => {
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
   * @memberof IITC.chat
   * @param {boolean} getOlderMsgs - Whether to retrieve older messages.
   * @param {boolean} [isRetry=false] - Whether the request is a retry.
   */
  chat.requestPublic = (getOlderMsgs, isRetry) => {
    return IITC.comm.requestChannel('all', getOlderMsgs, isRetry);
  };

  /**
   * Requests faction chat messages.
   *
   * @memberof IITC.chat
   * @param {boolean} getOlderMsgs - Flag to determine if older messages are being requested.
   * @param {boolean} [isRetry=false] - Flag to indicate if this is a retry attempt.
   */
  chat.requestFaction = (getOlderMsgs, isRetry) => {
    return IITC.comm.requestChannel('faction', getOlderMsgs, isRetry);
  };

  /**
   * Initiates a request for alerts chat data.
   *
   * @memberof IITC.chat
   * @param {boolean} getOlderMsgs - Whether to retrieve older messages.
   * @param {boolean} [isRetry=false] - Whether the request is a retry.
   */
  chat.requestAlerts = (getOlderMsgs, isRetry) => {
    return IITC.comm.requestChannel('alerts', getOlderMsgs, isRetry);
  };

  /**
   * Renders public chat in the UI.
   *
   * @memberof IITC.chat
   * @param {boolean} oldMsgsWereAdded - Indicates if older messages were added to the chat.
   */
  chat.renderPublic = (oldMsgsWereAdded) => {
    return IITC.comm.renderChannel('all', oldMsgsWereAdded);
  };

  /**
   * Renders faction chat.
   *
   * @memberof IITC.chat
   * @param {boolean} oldMsgsWereAdded - Indicates if old messages were added in the current rendering.
   */
  chat.renderFaction = (oldMsgsWereAdded) => {
    return IITC.comm.renderChannel('faction', oldMsgsWereAdded);
  };

  /**
   * Renders alerts chat in the UI.
   *
   * @memberof IITC.chat
   * @param {boolean} oldMsgsWereAdded - Indicates if older messages were added to the chat.
   */
  chat.renderAlerts = (oldMsgsWereAdded) => {
    return IITC.comm.renderChannel('alerts', oldMsgsWereAdded);
  };
};

/**
 * Sets up the chat interface.
 *
 * @memberof IITC.chat
 */
chat.setup = () => {
  chat.setupTabs();

  if (localStorage['iitc-chat-tab']) {
    chat.chooseTab(localStorage['iitc-chat-tab']);
  }

  ['chatcontrols', 'chat', 'chatinput'].forEach((id) => {
    document.getElementById(id).style.display = '';
  });

  document.querySelector('#chatcontrols a').addEventListener('click', chat.toggle);

  document.getElementById('chatinput').addEventListener('click', () => {
    document.querySelector('#chatinput input').focus();
  });

  chat.setupTime();
  chat.setupPosting();

  window.requests.addRefreshFunction(chat.request);

  const cls = window.PLAYER.team === 'RESISTANCE' ? 'res' : 'enl';
  document.querySelector('#chatinput mark').classList.add(cls);

  document.addEventListener('click', (event) => {
    const nickname = event.target.closest('.nickname');
    if (nickname) return chat.nicknameClicked(event, nickname.textContent);
  });
};

/**
 * Sets up the time display in the chat input box.
 * This function updates the time displayed next to the chat input field every minute to reflect the current time.
 *
 * @memberof IITC.chat
 */
chat.setupTime = () => {
  const inputTime = document.querySelector('#chatinput time');
  const updateTime = () => {
    if (window.isIdle()) return;
    const d = new Date();
    let h = `${d.getHours()}`;
    if (h.length === 1) h = `0${h}`;
    let m = `${d.getMinutes()}`;
    if (m.length === 1) m = `0${m}`;
    inputTime.textContent = `${h}:${m}`;
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
 * @memberof IITC.chat
 */
chat.handleTabCompletion = () => {
  const el = document.querySelector('#chatinput input');
  const curPos = el.selectionStart;
  const text = el.value;
  const word = text
    .slice(0, curPos)
    .replace(/.*\b([a-z0-9-_])/, '$1')
    .toLowerCase();

  let list = [];
  document.querySelectorAll('#chat > div').forEach((div) => {
    if (!IITC.utils._isVisible(div)) return;
    div.querySelectorAll('mark').forEach((mark) => {
      list.push(mark.textContent);
    });
  });
  list = window.uniqueArray(list);

  let nick = null;
  for (let i = 0; i < list.length; i++) {
    if (!list[i].toLowerCase().startsWith(word)) continue;
    if (nick && nick !== list[i]) {
      log.warn(`More than one nick matches, aborting. (${list[i]} vs ${nick})`);
      return;
    }
    nick = list[i];
  }
  if (!nick) {
    return;
  }

  const posStart = curPos - word.length;
  let newText = text.substring(0, posStart);
  const atPresent = text.substring(posStart - 1, posStart) === '@';
  newText += `${atPresent ? '' : '@'}${nick} `;
  newText += text.substring(curPos);
  el.value = newText;
};

/**
 * Posts a chat message to the currently active chat tab.
 *
 * @memberof IITC.chat
 */
chat.postMsg = () => {
  const c = chat.getActive();
  const channel = chat.getChannelDesc(c);

  const input = document.querySelector('#chatinput input');
  const msg = (input.value || '').trim();
  if (!msg || msg === '') return;

  if (channel.sendMessage) {
    input.value = '';
    return channel.sendMessage(c, msg);
  }
};

/**
 * Sets up the chat message posting functionality.
 *
 * @memberof IITC.chat
 */
chat.setupPosting = () => {
  if (!window.isSmartphone()) {
    document.querySelector('#chatinput input').addEventListener('keydown', (event) => {
      try {
        const kc = event.keyCode ? event.keyCode : event.which;
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

  document.getElementById('chatinput').addEventListener('submit', (event) => {
    event.preventDefault();
    chat.postMsg();
  });
};

/**
 * Legacy function for rendering chat messages. Used for backward compatibility with plugins.
 *
 * @deprecated
 * @memberof IITC.chat
 * @param {string} msg - The chat message.
 * @param {string} nick - The nickname of the player who sent the message.
 * @param {number} time - The timestamp of the message.
 * @param {string} team - The team of the player who sent the message.
 * @param {boolean} msgToPlayer - Flag indicating if the message is directed to the player.
 * @param {boolean} systemNarrowcast - Flag indicating if the message is a system narrowcast.
 * @returns {string} The HTML string representing a chat message row.
 */
chat.renderMsg = (msg, nick, time, team, msgToPlayer, systemNarrowcast) => {
  // Imitating data usually derived from processing raw chat data
  const fakeData = {
    guid: `legacyguid-${Math.random()}`,
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
 * @memberof IITC.chat
 * @param {string} tab - The name of the chat tab.
 * @returns {string} The corresponding channel name ('faction', 'alerts', or 'all').
 */
chat.tabToChannel = (tab) => {
  if (tab === 'faction') return 'faction';
  if (tab === 'alerts') return 'alerts';
  return 'all';
};

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
window.chat = new Proxy(chat, {
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
      // Map the legacy function name to its new name in comm and redirect the assignment there,
      // so IITC.chat (the proxy target) never gains its own copy of a comm-owned function
      const commProp = mapLegacyFunctionNameToCommApi(prop);
      window.IITC.comm[commProp] = value;
      return true;
    }
    // Update or add the property in chat
    target[prop] = value;
    return true; // Indicates that the assignment was successful
  },
});
