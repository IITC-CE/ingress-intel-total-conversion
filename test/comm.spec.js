import { describe, it, before, beforeEach, afterEach, after } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC, map */
/* eslint-disable no-unused-expressions */

// Imported at top level (not in a before hook) and in production order so IITC.comm is set
// by comm.js before comm_declarative_message_filter.spec attaches the filter to it
// (a before hook would run after that spec's top-level import
// and wipe IITC.comm.declarativeMessageFilter).
// utils.js provides the real time formatters, portal_display.js the real makePermalink,
// statusbar.js the real IITC.statusbar that requestChannel refreshes when idle.
await import('../core/code/utils.js');
// chat.js defines IITC.chat, which comm.js uses for channelState/keepScrollPosition
await import('../core/code/chat.js');
await import('../core/code/comm.js');
await import('../core/code/portal.js');
await import('../core/code/portal_display.js');
await import('../core/code/statusbar.js');

describe('IITC.comm.parseMsgData', () => {
  it('parses a player-generated public message', () => {
    const raw = [
      'guid-1',
      1700000000000,
      {
        plext: {
          plextType: 'PLAYER_GENERATED',
          team: 'RESISTANCE',
          categories: 1, // public
          markup: [
            ['SENDER', { plain: 'Alice: ', team: 'RESISTANCE' }],
            ['TEXT', { plain: 'hello world' }],
          ],
        },
      },
    ];

    const parsed = IITC.comm.parseMsgData(raw);
    expect(parsed).to.include({
      guid: 'guid-1',
      time: 1700000000000,
      public: true,
      secure: false,
      alert: false,
      msgToPlayer: false,
      type: 'PLAYER_GENERATED',
      narrowcast: false,
      auto: false,
      team: 1,
    });
    expect(parsed.player).to.deep.equal({ name: 'Alice', team: 1 });
  });

  it('decodes category bitmask and auto/narrowcast for system messages', () => {
    const raw = [
      'guid-2',
      1700000001000,
      {
        plext: {
          plextType: 'SYSTEM_NARROWCAST',
          team: 'ENLIGHTENED',
          categories: 6, // secure (2) + alert (4)
          markup: [['PLAYER', { plain: 'Bob', team: 'ENLIGHTENED' }]],
        },
      },
    ];

    const parsed = IITC.comm.parseMsgData(raw);
    expect(parsed).to.include({
      public: false,
      secure: true,
      alert: true,
      msgToPlayer: true,
      narrowcast: true,
      auto: true,
    });
    expect(parsed.player).to.deep.equal({ name: 'Bob', team: 2 });
  });
});

describe('IITC.comm rendering primitives', () => {
  let origHHmm;
  let origDateTime;

  beforeEach(() => {
    // stub only the non-deterministic deps: the real time formatters are locale/TZ-dependent and
    // would make snapshots environment-flaky. makePermalink is deterministic here (fixed jsdom url)
    // so renderPortal uses the real one imported above.
    origHHmm = window.unixTimeToHHmm;
    origDateTime = window.unixTimeToDateTimeString;
    window.unixTimeToHHmm = () => '12:34';
    window.unixTimeToDateTimeString = () => '2026-01-02 12:34:56.789';
  });

  afterEach(() => {
    window.unixTimeToHHmm = origHHmm;
    window.unixTimeToDateTimeString = origDateTime;
  });

  it('renderText escapes plain text', () => {
    expect(IITC.comm.renderText({ plain: 'a<b>c' })).to.equal('a&lt;b&gt;c');
  });

  it('renderText wraps team-coloured text in a span', () => {
    expect(IITC.comm.renderText({ plain: 'x', team: 'RESISTANCE' })).to.equal('<span class="res">x</span>');
  });

  it('renderPortal builds a portal link', () => {
    const portal = { latE6: 37000000, lngE6: -122000000, address: '123 St', name: 'My Portal' };
    expect(IITC.comm.renderPortal(portal)).to.equal(
      '<a onclick="IITC.portal.selectByLatLng(37, -122);return false" title="123 St" href="/intel?pll=37,-122" class="bidi-isolate help">My Portal</a>'
    );
  });

  it('renderFactionEnt renders the team name in a coloured span', () => {
    expect(IITC.comm.renderFactionEnt({ team: 'ENLIGHTENED' })).to.equal('<span class="enl">Enlightened</span>');
  });

  it('renderPlayer renders nick variants', () => {
    expect(IITC.comm.renderPlayer({ plain: 'Alice', team: 'RESISTANCE' })).to.equal('<span class="nickname RESISTANCE pl_nudge_player">Alice</span>');
    expect(IITC.comm.renderPlayer({ plain: 'me', team: 'RESISTANCE' })).to.equal('<span class="nickname pl_nudge_me">me</span>');
    expect(IITC.comm.renderPlayer({ plain: '@Bob', team: 'ENLIGHTENED' }, true)).to.equal('<span class="nickname ENLIGHTENED pl_nudge_player">@Bob</span>');
    expect(IITC.comm.renderPlayer({ plain: 'Carol: ', team: 'RESISTANCE' }, false, true)).to.equal(
      '<span class="nickname RESISTANCE pl_nudge_player">Carol</span>'
    );
  });

  it('renderMarkup skips SENDER and a leading PLAYER entity', () => {
    expect(
      IITC.comm.renderMarkup([
        ['SENDER', { plain: 'Alice: ', team: 'RESISTANCE' }],
        ['TEXT', { plain: 'hi' }],
      ])
    ).to.equal('hi');
    expect(
      IITC.comm.renderMarkup([
        ['PLAYER', { plain: 'X', team: 'RESISTANCE' }],
        ['TEXT', { plain: '!' }],
      ])
    ).to.equal('!');
  });

  it('renderTimeCell fills the time template with an escaped title', () => {
    expect(IITC.comm.renderTimeCell(1700000000000, 'foo')).to.equal(
      '<td><time class="foo" title="2026-01-02 12:34:56&lt;small class=&quot;milliseconds&quot;&gt;.789&lt;/small&gt;" data-timestamp="1700000000000">12:34</time></td>'
    );
  });

  it('renderNickCell / renderMsgCell / renderDivider fill their templates', () => {
    expect(IITC.comm.renderNickCell('Bob', 'nickname res')).to.equal(
      '<td><span class="invisep">&lt;</span><mark class="nickname res">Bob</mark><span class="invisep">&gt;</span></td>'
    );
    expect(IITC.comm.renderMsgCell('hello', 'system_narrowcast')).to.equal('<td class="system_narrowcast">hello</td>');
    expect(IITC.comm.renderDivider('Jan 2')).to.equal('<tr class="divider"><td><hr></td><td>Jan 2</td><td><hr></td></tr>');
  });

  it('renderMsgRow assembles a full public message row', () => {
    const data = {
      guid: 'g1',
      time: 1700000000000,
      msgToPlayer: false,
      player: { name: 'Alice', team: 1 },
      narrowcast: false,
      auto: false,
      public: true,
      secure: false,
      markup: [
        ['SENDER', { plain: 'Alice: ', team: 'RESISTANCE' }],
        ['TEXT', { plain: 'hi' }],
      ],
    };
    expect(IITC.comm.renderMsgRow(data)).to.equal(
      '<tr data-guid="g1" class="public">' +
        '<td><time class="" title="2026-01-02 12:34:56&lt;small class=&quot;milliseconds&quot;&gt;.789&lt;/small&gt;" data-timestamp="1700000000000">12:34</time></td>' +
        '<td><span class="invisep">&lt;</span><mark class="nickname res">Alice</mark><span class="invisep">&gt;</span></td>' +
        '<td class="">hi</td>' +
        '</tr>'
    );
  });

  it('assembles a secure narrowcast row addressed to the current player', () => {
    const data = {
      guid: 'g2',
      time: 1700000000000,
      msgToPlayer: true, // -> pl_nudge_date time class
      player: { name: 'me', team: 2 }, // self -> pl_nudge_me; enl css
      narrowcast: true, // -> system_narrowcast msg class
      auto: false,
      public: false,
      secure: true, // -> faction row class
      markup: [['TEXT', { plain: 'yo' }]],
    };
    expect(IITC.comm.renderMsgRow(data)).to.equal(
      '<tr data-guid="g2" class="faction">' +
        '<td><time class="pl_nudge_date" title="2026-01-02 12:34:56&lt;small class=&quot;milliseconds&quot;&gt;.789&lt;/small&gt;" data-timestamp="1700000000000">12:34</time></td>' +
        '<td><span class="invisep">&lt;</span><mark class="nickname enl pl_nudge_me">me</mark><span class="invisep">&gt;</span></td>' +
        '<td class="system_narrowcast">yo</td>' +
        '</tr>'
    );
  });
});

describe('IITC.comm template overridability', () => {
  it('honours a plugin override using the legacy {{ }} placeholder syntax', () => {
    const original = IITC.comm.dividerTemplate;
    IITC.comm.dividerTemplate = '<tr class="sep"><td>{{ text }}</td></tr>';
    try {
      expect(IITC.comm.renderDivider('X')).to.equal('<tr class="sep"><td>X</td></tr>');
    } finally {
      IITC.comm.dividerTemplate = original;
    }
  });

  it('exposes {{ datetime }} as an extension placeholder in the time cell', () => {
    const original = IITC.comm.timeCellTemplate;
    const origDateTime = window.unixTimeToDateTimeString;
    window.unixTimeToDateTimeString = () => '2026-01-02 12:34:56.789';
    IITC.comm.timeCellTemplate = '<td data-dt="{{ datetime }}">{{ time }}</td>';
    try {
      expect(IITC.comm.renderTimeCell(1700000000000, '')).to.contain('data-dt="2026-01-02 12:34:56.789"');
    } finally {
      IITC.comm.timeCellTemplate = original;
      window.unixTimeToDateTimeString = origDateTime;
    }
  });
});

describe('IITC.comm.getChatPortalName / portalNameTransformations', () => {
  it('rewrites US Post Office to a USPS name from the address', () => {
    expect(IITC.comm.getChatPortalName({ name: 'US Post Office', address: '500 Main St, Town' })).to.equal('USPS: 500 Main St');
  });

  it('applies plugin-added transformations', () => {
    IITC.comm.portalNameTransformations.push((markup) => `[${markup.name}]`);
    try {
      expect(IITC.comm.getChatPortalName({ name: 'Foo', address: '' })).to.equal('[Foo]');
    } finally {
      IITC.comm.portalNameTransformations.pop();
    }
  });
});

describe('IITC.comm.transformMessage / messageTransformFunctions', () => {
  it('collapses <faction> + " Link " into the following text entity', () => {
    const data = {
      markup: [
        ['SENDER', { plain: 'A: ' }],
        ['TEXT', { plain: 'x' }],
        ['PORTAL', { name: 'P' }],
        ['FACTION', { team: 'RESISTANCE' }],
        ['TEXT', { plain: ' Link ' }],
      ],
    };
    const out = IITC.comm.transformMessage(data);
    expect(out).to.have.length(4);
    expect(out[3]).to.deep.equal(['TEXT', { plain: ' Link ', team: 'RESISTANCE' }]);
  });

  it('does not mutate the original message data', () => {
    const data = {
      markup: [
        ['TEXT', { plain: 'Agent ' }],
        ['PLAYER', { plain: 'Bob', team: 'ENLIGHTENED' }],
      ],
    };
    const out = IITC.comm.transformMessage(data);
    expect(out).to.have.length(0); // "Agent <player>" prefix skipped
    expect(data.markup).to.have.length(2); // original untouched
  });
});

describe('IITC.comm._updateOldNewHash', () => {
  it('tracks oldest and newest timestamps/GUIDs (descending order)', () => {
    const storage = { oldestTimestamp: -1, newestTimestamp: -1 };
    const data = {
      result: [
        ['newGuid', 200],
        ['oldGuid', 100],
      ],
    };
    IITC.comm._updateOldNewHash(data, storage, false, false);
    expect(storage.newestTimestamp).to.equal(200);
    expect(storage.newestGUID).to.equal('newGuid');
    expect(storage.oldestTimestamp).to.equal(100);
    expect(storage.oldestGUID).to.equal('oldGuid');
  });

  it('swaps first/last for ascending-order data', () => {
    const storage = { oldestTimestamp: -1, newestTimestamp: -1 };
    const data = {
      result: [
        ['oldGuid', 100],
        ['newGuid', 200],
      ],
    };
    IITC.comm._updateOldNewHash(data, storage, false, true);
    expect(storage.newestTimestamp).to.equal(200);
    expect(storage.newestGUID).to.equal('newGuid');
    expect(storage.oldestTimestamp).to.equal(100);
    expect(storage.oldestGUID).to.equal('oldGuid');
  });

  it('keeps the newest GUID when an older-messages batch does not change the newest timestamp', () => {
    const storage = { oldestTimestamp: -1, newestTimestamp: 200, newestGUID: 'keep' };
    const data = {
      result: [
        ['top', 200],
        ['bottom', 150],
      ],
    };
    IITC.comm._updateOldNewHash(data, storage, true, false);
    expect(storage.newestGUID).to.equal('keep'); // not clobbered (same newest time, older fetch)
    expect(storage.oldestTimestamp).to.equal(150);
    expect(storage.oldestGUID).to.equal('bottom');
  });

  it('keeps the oldest GUID when a newer-messages batch does not change the oldest timestamp', () => {
    const storage = { oldestTimestamp: 100, oldestGUID: 'keep', newestTimestamp: -1 };
    const data = {
      result: [
        ['top', 150],
        ['bottom', 100],
      ],
    };
    IITC.comm._updateOldNewHash(data, storage, false, false);
    expect(storage.oldestGUID).to.equal('keep'); // not clobbered (same oldest time, newer fetch)
    expect(storage.newestTimestamp).to.equal(150);
    expect(storage.newestGUID).to.equal('top');
  });
});

describe('IITC.comm._writeDataToHash', () => {
  it('renders rows, keeps order and de-duplicates by GUID', () => {
    const storage = { data: {}, guids: [], oldestTimestamp: -1, newestTimestamp: -1 };
    const mkPlext = (guid, time) => [
      guid,
      time,
      { plext: { plextType: 'PLAYER_GENERATED', team: 'RESISTANCE', categories: 1, markup: [['TEXT', { plain: 'm' }]] } },
    ];
    const data = { result: [mkPlext('a', 100), mkPlext('b', 200)] };

    IITC.comm._writeDataToHash(data, storage, false, true);
    expect(storage.guids).to.deep.equal(['a', 'b']);
    expect(storage.data.a[0]).to.equal(100); // timestamp
    expect(storage.data.a[3]).to.equal(''); // nick (no SENDER/PLAYER)
    expect(typeof storage.data.a[2]).to.equal('string'); // rendered row

    // writing the same GUIDs again must not duplicate
    IITC.comm._writeDataToHash(data, storage, false, true);
    expect(storage.guids).to.deep.equal(['a', 'b']);
  });
});

describe('IITC.comm.renderData', () => {
  let origVisible;

  beforeEach(() => {
    origVisible = IITC.utils._isVisible;
    IITC.utils._isVisible = () => true; // jsdom has no layout; force visible to exercise the body
    document.body.innerHTML = '<div id="chatall"></div>';
  });

  afterEach(() => {
    IITC.utils._isVisible = origVisible;
    document.body.innerHTML = '';
    sinon.restore();
  });

  it('early-returns without rendering when the target element is not visible', () => {
    IITC.utils._isVisible = () => false;
    const data = { a: [100, false, '<tr>A</tr>', 'nick', {}] };
    IITC.comm.renderData(data, 'chatall', false, ['a']);
    expect(document.getElementById('chatall').innerHTML).to.equal('');
  });

  it('renders rows into a table in the given GUID order', () => {
    sinon.stub(IITC.comm.declarativeMessageFilter, 'filterMessage').returns(false);
    const data = {
      a: [100, false, '<tr data-guid="a"><td>A</td></tr>', 'nick', {}],
      b: [200, false, '<tr data-guid="b"><td>B</td></tr>', 'nick', {}],
    };
    IITC.comm.renderData(data, 'chatall', false, ['a', 'b']);
    const html = document.getElementById('chatall').innerHTML;
    expect(html).to.match(/^<table>.*<\/table>$/s);
    expect(html.indexOf('data-guid="a"')).to.be.lessThan(html.indexOf('data-guid="b"'));
  });

  it('sorts by timestamp and inserts a date divider across a day boundary when no GUID order is given', () => {
    sinon.stub(IITC.comm.declarativeMessageFilter, 'filterMessage').returns(false);
    const day1 = new Date('2026-01-01T10:00:00Z').getTime();
    const day2 = new Date('2026-01-02T10:00:00Z').getTime();
    const data = {
      // deliberately out of insertion order to prove the legacy timestamp sort
      later: [day2, false, '<tr data-guid="later"><td>L</td></tr>', 'nick', {}],
      earlier: [day1, false, '<tr data-guid="earlier"><td>E</td></tr>', 'nick', {}],
    };
    IITC.comm.renderData(data, 'chatall', false);
    const html = document.getElementById('chatall').innerHTML;
    expect(html.indexOf('earlier')).to.be.lessThan(html.indexOf('later'));
    expect(html).to.contain('class="divider"');
  });
});

describe('IITC.comm._genPostData', () => {
  let origClamp;
  const bounds = {
    pad() {
      return bounds;
    },
    contains: () => true,
    getNorthEast: () => ({ lat: 1, lng: 2 }),
    getSouthWest: () => ({ lat: -3, lng: -4 }),
    toBBoxString: () => '0,0,1,1',
  };

  let origGetBounds;

  before(() => {
    origClamp = window.clampLatLngBounds;
    origGetBounds = map.getBounds;
    window.clampLatLngBounds = (b) => b;
    map.getBounds = () => bounds;
  });

  after(() => {
    window.clampLatLngBounds = origClamp;
    map.getBounds = origGetBounds;
  });

  it('throws when passed the removed isFaction boolean flag', () => {
    expect(() => IITC.comm._genPostData(true, false)).to.throw(/API changed/);
  });

  it('builds the bounding box and tab for a newer-messages request', () => {
    const data = IITC.comm._genPostData('all', false);
    expect(data).to.include({
      minLatE6: -3000000,
      minLngE6: -4000000,
      maxLatE6: 1000000,
      maxLngE6: 2000000,
      minTimestampMs: -1,
      maxTimestampMs: -1,
      tab: 'all',
    });
  });

  it('requests older messages from the stored oldest continuation', () => {
    IITC.comm._channelsData.faction = { data: {}, guids: [], oldestTimestamp: 100, oldestGUID: 'OG', newestTimestamp: 200, newestGUID: 'NG' };
    const data = IITC.comm._genPostData('faction', true);
    expect(data.maxTimestampMs).to.equal(100);
    expect(data.plextContinuationGuid).to.equal('OG');
    expect(data.minTimestampMs).to.equal(-1);
    expect(data.tab).to.equal('faction');
  });

  it('requests newer messages in ascending order once a newest timestamp is known', () => {
    IITC.comm._channelsData.faction = { data: {}, guids: [], oldestTimestamp: -1, newestTimestamp: 200, newestGUID: 'NG' };
    const data = IITC.comm._genPostData('faction', false);
    expect(data.minTimestampMs).to.equal(200);
    expect(data.plextContinuationGuid).to.equal('NG');
    expect(data.ascendingTimestampOrder).to.be.true;
  });
});

describe('IITC.comm.sendChatMessage', () => {
  afterEach(() => sinon.restore());

  it('posts to sendPlext with the map centre coordinates', () => {
    const postAjax = sinon.stub(window, 'postAjax');
    IITC.comm.sendChatMessage('all', 'hello');
    expect(postAjax.calledOnce).to.be.true;
    const [action, payload] = postAjax.firstCall.args;
    expect(action).to.equal('sendPlext');
    expect(payload).to.deep.equal({ message: 'hello', latE6: 0, lngE6: 0, tab: 'all' });
  });

  it('ignores channels other than all/faction', () => {
    const postAjax = sinon.stub(window, 'postAjax');
    IITC.comm.sendChatMessage('alerts', 'nope');
    expect(postAjax.called).to.be.false;
  });
});

describe('IITC.comm.requestChannel', () => {
  let origClamp;
  let origGetBounds;
  const bounds = {
    pad() {
      return bounds;
    },
    contains: () => true,
    getNorthEast: () => ({ lat: 1, lng: 2 }),
    getSouthWest: () => ({ lat: -3, lng: -4 }),
    toBBoxString: () => '0,0,1,1',
  };

  before(() => {
    origClamp = window.clampLatLngBounds;
    origGetBounds = map.getBounds;
    window.clampLatLngBounds = (b) => b;
    map.getBounds = () => bounds;
  });

  after(() => {
    window.clampLatLngBounds = origClamp;
    map.getBounds = origGetBounds;
  });

  beforeEach(() => {
    // give renderChannel a layout-less element (IITC.utils._isVisible → false in jsdom) so renderData early-returns
    document.body.innerHTML = '<div id="chatall"></div>';
    IITC.comm._channelsData.all = undefined;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    sinon.restore();
  });

  it('fetches plexts, stores them and fires the data-available hooks', () => {
    const runHooks = sinon.stub(window, 'runHooks');
    const sample = {
      result: [['a', 100, { plext: { plextType: 'PLAYER_GENERATED', team: 'RESISTANCE', categories: 1, markup: [['TEXT', { plain: 'm' }]] } }]],
    };
    const postAjax = sinon.stub(window, 'postAjax').callsFake((action, d, success) => success(sample));

    IITC.comm.requestChannel('all', false);

    expect(postAjax.calledOnce).to.be.true;
    expect(postAjax.firstCall.args[0]).to.equal('getPlexts');
    expect(IITC.comm._channelsData.all.data).to.have.property('a');
    expect(runHooks.calledWith('publicChatDataAvailable')).to.be.true; // 'all' maps to the legacy hook name
    expect(runHooks.calledWith('commDataAvailable')).to.be.true;
  });

  it('skips the request and refreshes the status bar when idle', () => {
    sinon.stub(window, 'isIdle').returns(true);
    const update = sinon.stub(IITC.statusbar.map, 'update');
    const postAjax = sinon.stub(window, 'postAjax');

    IITC.comm.requestChannel('all', false);

    expect(update.calledOnce).to.be.true;
    expect(postAjax.called).to.be.false;
  });
});
