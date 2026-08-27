import { describe, it, before, after, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

await import('../core/code/utils.js');
await import('../core/code/comm.js');
await import('../core/code/statusbar.js');
await import('../core/code/chat.js');

const chat = window.chat;

describe('window.chat legacy proxy -> IITC.comm', () => {
  it('maps migrated render functions to IITC.comm', () => {
    expect(chat.renderData).to.equal(IITC.comm.renderData);
    expect(chat.renderMsgRow).to.equal(IITC.comm.renderMsgRow);
    expect(chat.renderPortal).to.equal(IITC.comm.renderPortal);
    expect(chat.getChatPortalName).to.equal(IITC.comm.getChatPortalName);
  });

  it('maps renamed legacy names onto their underscored IITC.comm counterparts', () => {
    expect(chat.genPostData).to.equal(IITC.comm._genPostData);
    expect(chat.writeDataToHash).to.equal(IITC.comm._writeDataToHash);
    expect(chat.updateOldNewHash).to.equal(IITC.comm._updateOldNewHash);
    expect(chat.parseMsgData).to.equal(IITC.comm.parseMsgData);
  });

  it('syncs assignments back through to IITC.comm', () => {
    const original = IITC.comm.renderData;
    const replacement = () => 'x';
    try {
      chat.renderData = replacement;
      expect(IITC.comm.renderData).to.equal(replacement);
      expect(chat.renderData).to.equal(replacement);
    } finally {
      chat.renderData = original;
    }
  });
});

describe('chat.addChannel / getChannelDesc', () => {
  beforeEach(() => {
    chat.channels.length = 0;
  });

  it('adds a channel and looks it up by id', () => {
    const desc = { id: 'custom', name: 'Custom' };
    expect(chat.addChannel(desc)).to.be.true;
    expect(chat.getChannelDesc('custom')).to.equal(desc);
    expect(chat.channels).to.have.length(1);
  });

  it('refuses the reserved ids info and map', () => {
    expect(chat.addChannel({ id: 'info', name: 'Info' })).to.be.false;
    expect(chat.addChannel({ id: 'map', name: 'Map' })).to.be.false;
    expect(chat.channels).to.have.length(0);
  });

  it('refuses a duplicate id', () => {
    chat.addChannel({ id: 'dup', name: 'One' });
    expect(chat.addChannel({ id: 'dup', name: 'Two' })).to.be.false;
    expect(chat.channels).to.have.length(1);
  });

  it('creates the message container before the tabs are set up', () => {
    document.body.innerHTML = '<div id="chatcontrols"><a></a></div><div id="chat"></div>';

    chat.addChannel({ id: 'debug', name: 'Debug' });

    // debug-console writes into its channel from a boot plugin, before chat.setup() runs
    expect(document.getElementById('chatdebug')).to.exist;
    expect(document.querySelector('#chatdebug table')).to.exist;
    // the tab itself is deferred, so that comm channels keep the first slots
    expect(document.querySelector('#chatcontrols a[data-channel="debug"]')).to.not.exist;
  });

  it('does not mistake an unrelated element for the container', () => {
    document.body.innerHTML = '<div id="chatcontrols"><a></a></div><div id="chat"></div><form id="chatinput"></form>';

    // 'chat' + id collides with the static markup for these two
    chat.addChannel({ id: 'controls', name: 'Controls' });
    chat.addChannel({ id: 'input', name: 'Input' });

    expect(document.querySelector('#chat > [id="chatcontrols"]')).to.exist;
    expect(document.querySelector('#chat > [id="chatinput"]')).to.exist;
  });

  it('tolerates a missing chat panel', () => {
    document.body.innerHTML = '';

    // only reachable while the tabs are not set up, hence ahead of the setupTabs specs
    expect(() => chat.addChannel({ id: 'early', name: 'Early' })).to.not.throw();
    expect(chat.getChannelDesc('early')).to.exist;
  });
});

describe('chat.backgroundChannelData', () => {
  beforeEach(() => {
    chat.backgroundInstanceChannel = {};
    chat.backgroundChannels = {};
  });

  it('merges enabled channel flags across instances', () => {
    chat.backgroundChannelData('plugin.a', 'all', true);
    chat.backgroundChannelData('plugin.b', 'faction', true);
    expect(chat.backgroundChannels).to.deep.equal({ all: true, faction: true });
  });

  it('drops a channel once its flag is cleared', () => {
    chat.backgroundChannelData('plugin.a', 'all', true);
    chat.backgroundChannelData('plugin.a', 'all', false);
    expect(chat.backgroundChannels.all).to.be.undefined;
  });
});

describe('chat.addNickname / nicknameClicked', () => {
  beforeEach(() => {
    document.body.innerHTML = '<textarea id="chattext"></textarea>';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    sinon.restore();
  });

  it('appends a nickname to the chat input', () => {
    chat.addNickname('@Bob');
    chat.addNickname('@Alice');
    expect(document.getElementById('chattext').value).to.equal('@Bob @Alice ');
  });

  it('strips a leading @ and inserts the nick when the hook allows it', () => {
    sinon.stub(window, 'runHooks').returns(true);
    const event = { preventDefault: sinon.spy(), stopPropagation: sinon.spy() };

    const result = chat.nicknameClicked(event, '@Bob');

    expect(window.runHooks.calledWith('nicknameClicked', sinon.match({ nickname: 'Bob' }))).to.be.true;
    expect(document.getElementById('chattext').value).to.equal('@Bob ');
    expect(event.preventDefault.calledOnce).to.be.true;
    expect(result).to.be.false;
  });

  it('does not insert the nick when the hook is cancelled', () => {
    sinon.stub(window, 'runHooks').returns(false);
    const event = { preventDefault: sinon.spy(), stopPropagation: sinon.spy() };

    chat.nicknameClicked(event, 'Bob');

    expect(document.getElementById('chattext').value).to.equal('');
    expect(event.preventDefault.calledOnce).to.be.true;
  });
});

describe('chat legacy helpers', () => {
  it('tabToChannel maps tabs to channel ids', () => {
    expect(chat.tabToChannel('faction')).to.equal('faction');
    expect(chat.tabToChannel('alerts')).to.equal('alerts');
    expect(chat.tabToChannel('anything-else')).to.equal('all');
  });

  it('renderMsg renders a legacy message row through IITC.comm.renderMsgRow', () => {
    const html = chat.renderMsg('hello world', 'Bob', 1700000000000, 2, false, false);
    expect(html).to.match(/^<tr data-guid="legacyguid-/); // legacy synthetic guid + real row wrapping
    expect(html).to.contain('Bob');
    expect(html).to.contain('hello world');
  });
});

describe('chat.setupTabs / chooseTab', () => {
  before(() => {
    document.body.innerHTML = '<div id="chatcontrols"></div><div id="chat"></div><div id="chatinput"><mark></mark></div>';
    chat.channels.length = 0;
    chat.addChannel({ id: 'debug', name: 'Debug' });
    chat.setupTabs();
  });

  after(() => {
    document.body.innerHTML = '';
    chat.channels.length = 0;
  });

  it('prepends the stock comm channels', () => {
    expect(chat.getChannelDesc('all')).to.be.ok;
    expect(chat.getChannelDesc('faction')).to.be.ok;
    expect(chat.getChannelDesc('alerts')).to.be.ok;
  });

  it('reuses the container a plugin channel created before the tabs existed', () => {
    expect(document.querySelectorAll('#chatdebug')).to.have.length(1);
    expect(document.querySelector('#chatcontrols a[data-channel="debug"]')).to.exist;
  });

  it('wires the legacy per-channel data references', () => {
    expect(chat._public).to.equal(IITC.comm._channelsData.all);
    expect(chat._faction).to.equal(IITC.comm._channelsData.faction);
    expect(chat._alerts).to.equal(IITC.comm._channelsData.alerts);
  });

  it('creates request wrappers that delegate to IITC.comm.requestChannel', () => {
    const requestChannel = sinon.stub(IITC.comm, 'requestChannel');
    try {
      chat.requestPublic(false);
      chat.requestFaction(true);
      chat.requestAlerts(false);
      expect(requestChannel.getCall(0).args).to.deep.equal(['all', false, undefined]);
      expect(requestChannel.getCall(1).args).to.deep.equal(['faction', true, undefined]);
      expect(requestChannel.getCall(2).args).to.deep.equal(['alerts', false, undefined]);
    } finally {
      requestChannel.restore();
    }
  });

  it('creates render wrappers that delegate to IITC.comm.renderChannel', () => {
    const renderChannel = sinon.stub(IITC.comm, 'renderChannel');
    try {
      chat.renderPublic(true);
      chat.renderFaction(false);
      chat.renderAlerts(true);
      expect(renderChannel.getCall(0).args).to.deep.equal(['all', true]);
      expect(renderChannel.getCall(1).args).to.deep.equal(['faction', false]);
      expect(renderChannel.getCall(2).args).to.deep.equal(['alerts', true]);
    } finally {
      renderChannel.restore();
    }
  });

  it('chooseTab activates the tab, stores it and updates the input prompt', () => {
    chat.chooseTab('faction');

    expect(chat.getActive()).to.equal('faction');
    expect(localStorage['iitc-chat-tab']).to.equal('faction');
    expect(document.querySelector('#chatinput mark').textContent).to.equal('tell faction:');
    expect(document.querySelector("#chatcontrols a[data-channel='faction']").classList.contains('active')).to.be.true;
  });
});

describe('chat.request', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    chat.channels.length = 0;
    chat.backgroundChannels = {};
  });

  it('requests the active channel and any background channels only', () => {
    document.body.innerHTML = '<div id="chatcontrols"><a class="active" data-channel="all"></a></div>';
    const active = { id: 'all', request: sinon.spy() };
    const background = { id: 'faction', request: sinon.spy() };
    const idle = { id: 'alerts', request: sinon.spy() };
    chat.channels.length = 0;
    chat.channels.push(active, background, idle);
    chat.backgroundChannels = { faction: true };

    chat.request();

    expect(active.request.calledWith('all', false)).to.be.true;
    expect(background.request.calledWith('faction', false)).to.be.true;
    expect(idle.request.called).to.be.false;
  });
});

describe('chat.postMsg', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    chat.channels.length = 0;
  });

  it('sends the trimmed input to the active channel and clears it', () => {
    document.body.innerHTML = '<div id="chatcontrols"><a class="active" data-channel="all"></a></div><div id="chatinput"><input value="  hello  "></div>';
    const channel = { id: 'all', sendMessage: sinon.spy() };
    chat.channels.length = 0;
    chat.channels.push(channel);

    chat.postMsg();

    expect(channel.sendMessage.calledWith('all', 'hello')).to.be.true;
    expect(document.querySelector('#chatinput input').value).to.equal('');
  });

  it('does nothing for a blank message', () => {
    document.body.innerHTML = '<div id="chatcontrols"><a class="active" data-channel="all"></a></div><div id="chatinput"><input value="   "></div>';
    const channel = { id: 'all', sendMessage: sinon.spy() };
    chat.channels.length = 0;
    chat.channels.push(channel);

    chat.postMsg();

    expect(channel.sendMessage.called).to.be.false;
  });
});

describe('chat.toggle', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('toggles the expand class on the panel and the leaflet controls', () => {
    document.body.innerHTML = '<div id="chatcontrols"></div><div id="chat"></div><div class="leaflet-control"></div>';

    chat.toggle();
    expect(document.getElementById('chat').classList.contains('expand')).to.be.true;
    expect(document.querySelector('.leaflet-control').classList.contains('chat-expand')).to.be.true;

    chat.toggle();
    expect(document.getElementById('chat').classList.contains('expand')).to.be.false;
    expect(document.querySelector('.leaflet-control').classList.contains('chat-expand')).to.be.false;
  });
});

describe('chat.chooser', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    sinon.restore();
  });

  it('activates the tab from the event target on desktop', () => {
    document.body.innerHTML = '<a id="tab" data-channel="faction"></a>';
    const chooseTab = sinon.stub(chat, 'chooseTab');

    chat.chooser({ target: document.getElementById('tab') });

    expect(chooseTab.calledWith('faction')).to.be.true;
  });

  it('shows the app pane on a smartphone without app panes', () => {
    document.body.innerHTML = '<a id="tab" data-channel="faction"></a>';
    sinon.stub(IITC.utils, 'isSmartphone').returns(true);
    sinon.stub(window, 'useAppPanes').returns(false);
    const show = sinon.stub(window, 'show');

    chat.chooser({ target: document.getElementById('tab') });

    expect(show.calledWith('faction')).to.be.true;
  });
});

describe('chat.needMoreMessages', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    chat.channels.length = 0;
    sinon.restore();
  });

  it('requests the active channel when its visible tab is scrolled to the top', () => {
    document.body.innerHTML = '<div id="chatcontrols"><a class="active" data-channel="all"></a></div><div id="chat"><div id="chatall"></div></div>';
    sinon.stub(IITC.utils, '_isVisible').returns(true); // jsdom has no layout, so the :visible equivalent needs a stub
    const channel = { id: 'all', request: sinon.spy() };
    chat.channels.push(channel);

    chat.needMoreMessages();

    expect(channel.request.calledWith('all', false)).to.be.true;
  });

  it('does nothing when no channel tab is visible', () => {
    document.body.innerHTML = '<div id="chatcontrols"><a class="active" data-channel="all"></a></div><div id="chat"><div id="chatall"></div></div>';
    const channel = { id: 'all', request: sinon.spy() };
    chat.channels.push(channel);

    chat.needMoreMessages();

    expect(channel.request.called).to.be.false;
  });

  it('does nothing when there is no active tab', () => {
    document.body.innerHTML = '<div id="chatcontrols"></div><div id="chat"><div id="chatall"></div></div>';
    sinon.stub(IITC.utils, '_isVisible').returns(true);
    const channel = { id: 'all', request: sinon.spy() };
    chat.channels.push(channel);

    chat.needMoreMessages();

    expect(channel.request.called).to.be.false;
  });
});

describe('chat.handleTabCompletion', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    sinon.restore();
  });

  const setup = (inputValue, caret) => {
    document.body.innerHTML =
      '<div id="chat"><div id="chatall"><mark>Alice</mark><mark>Alan</mark><mark>Bob</mark></div></div><div id="chatinput"><input></div>';
    sinon.stub(IITC.utils, '_isVisible').returns(true); // gather nicks from the (jsdom-invisible) visible tab
    const input = document.querySelector('#chatinput input');
    input.value = inputValue;
    input.setSelectionRange(caret, caret);
    return input;
  };

  it('completes a unique nickname prefix and prepends @', () => {
    const input = setup('bo', 2);

    chat.handleTabCompletion();

    expect(input.value).to.equal('@Bob ');
  });

  it('keeps an existing @ instead of doubling it', () => {
    const input = setup('@bo', 3);

    chat.handleTabCompletion();

    expect(input.value).to.equal('@Bob ');
  });

  it('leaves the input untouched when the prefix is ambiguous', () => {
    const input = setup('al', 2);

    chat.handleTabCompletion();

    expect(input.value).to.equal('al');
  });
});

describe('chat.channelState', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('stores and reads flags on the native store', () => {
    document.body.innerHTML = '<div id="chatall"></div>';
    const state = chat.channelState(document.getElementById('chatall'));

    expect(state.ignoreNextScroll).to.be.undefined;
    state.ignoreNextScroll = true;
    expect(state.ignoreNextScroll).to.be.true;
  });

  it('returns the same store for the same element', () => {
    document.body.innerHTML = '<div id="chatall"></div>';
    const el = document.getElementById('chatall');

    expect(chat.channelState(el)).to.equal(chat.channelState(el));
  });

  it('mirrors writes into jQuery .data() so legacy plugins can still read them', () => {
    document.body.innerHTML = '<div id="chatall"></div>';
    const el = document.getElementById('chatall');

    chat.channelState(el).needsClearing = true;

    expect($(el).data('needsClearing')).to.be.true;
  });

  it('falls back to a jQuery .data() value written by a legacy plugin', () => {
    document.body.innerHTML = '<div id="chatall"></div>';
    const el = document.getElementById('chatall');
    $(el).data('ignoreNextScroll', true);

    expect(chat.channelState(el).ignoreNextScroll).to.be.true;
  });
});

describe('chat.keepScrollPosition', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    sinon.restore();
  });

  it('defers scrolling via needsScrollTop when the box is hidden and messages are new', () => {
    document.body.innerHTML = '<div id="chatall"></div>';
    sinon.stub(IITC.utils, '_isVisible').returns(false);
    const el = document.getElementById('chatall');

    chat.keepScrollPosition(el, 0, false);

    expect(chat.channelState(el).needsScrollTop).to.equal(99999999);
  });

  it('marks the next scroll to be ignored when at the bottom', () => {
    document.body.innerHTML = '<div id="chatall"></div>';
    sinon.stub(IITC.utils, '_isVisible').returns(true);
    const el = document.getElementById('chatall');

    chat.keepScrollPosition(el, 0, false);

    expect(chat.channelState(el).ignoreNextScroll).to.be.true;
  });

  it('accepts a jQuery object as the box for legacy callers', () => {
    document.body.innerHTML = '<div id="chatall"></div>';
    sinon.stub(IITC.utils, '_isVisible').returns(true);
    const el = document.getElementById('chatall');

    chat.keepScrollPosition($(el), 0, false);

    expect(chat.channelState(el).ignoreNextScroll).to.be.true;
  });
});
