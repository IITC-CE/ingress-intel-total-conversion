import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC, L */
/* eslint-disable no-unused-expressions */

await import('../core/code/hooks.js');
await import('../core/code/settings.js');
await import('../core/code/settings_render.js');
await import('../core/code/settings_window.js');
await import('../core/code/ornaments.js');

const ornaments = window.ornaments;
const settings = IITC.settings;

// redraws are batched into a microtask; a macrotask lets it run before counting
const redraws = async () => {
  await new Promise((resolve) => setTimeout(resolve));
  return ornaments.reload.callCount;
};

describe('window.ornaments settings', () => {
  let page;
  let replacedRunHooks;

  before(() => {
    ornaments.registerSettings();
    page = IITC.settings._pages.ornaments;
  });

  beforeEach(() => {
    localStorage.clear();
    ornaments.excludedOrnaments = [];
    ornaments.knownOrnaments = {};
    ornaments._seen = new Set();
    ornaments.icon = {};
    ornaments._reloadQueued = false;
    ornaments._seenQueued = false;
    sinon.stub(ornaments, 'reload');
    replacedRunHooks = window.runHooks;
  });

  afterEach(() => {
    window.runHooks = replacedRunHooks;
    sinon.restore();
  });

  describe('migration', () => {
    it('moves the legacy prefixes and hidden flags to the settings, and records the ornaments seen', () => {
      localStorage.setItem('excludedOrnaments', '["ap","sc5"]');
      localStorage.setItem('knownOrnaments', '{"ap1":1,"pe":"true","sc5":null,"x":false}');

      const set = sinon.spy(settings, 'set');

      ornaments.migrate();

      expect(set.args.map(([key, , options]) => [key, options])).to.deep.equal([
        ['ornaments.excluded', { source: 'legacy' }],
        ['ornaments.hidden', { source: 'legacy' }],
      ]);
      expect(settings.get('ornaments.excluded')).to.equal('ap,sc5');
      expect(JSON.parse(localStorage.getItem('iitc-setting:ornaments.hidden'))).to.deep.equal({ ap1: true, pe: true });
      expect(JSON.parse(localStorage.getItem(ornaments.KNOWN_KEY))).to.deep.equal(['ap1', 'pe', 'sc5', 'x']);
      expect(localStorage.getItem('excludedOrnaments')).to.be.null;
      expect(localStorage.getItem('knownOrnaments')).to.be.null;
    });

    it('moves them once, and not again after the known ornaments are forgotten', () => {
      localStorage.setItem('excludedOrnaments', '["ap"]');
      ornaments.migrate();
      settings.reset('ornaments.excluded');
      const set = sinon.spy(settings, 'set');

      ornaments.migrate();
      expect(set.called).to.be.false;
      expect(settings.get('ornaments.excluded')).to.equal('');

      page.blocks.find((block) => block.type === 'action').action();
      ornaments.migrate();
      expect(settings.get('ornaments.excluded')).to.equal('');
    });

    it('leaves out legacy data it cannot read, with a warning', () => {
      const warn = sinon.stub(globalThis.log, 'warn');
      localStorage.setItem('excludedOrnaments', '{bad');
      localStorage.setItem('knownOrnaments', '[]');

      ornaments.migrate();

      expect(warn.calledTwice).to.be.true;
      expect(settings.get('ornaments.excluded')).to.equal('');
      expect(localStorage.getItem(ornaments.KNOWN_KEY)).to.equal('[]');
      expect(localStorage.getItem('excludedOrnaments')).to.be.null;
      expect(localStorage.getItem('knownOrnaments')).to.be.null;
    });

    it('splits prefixes on spaces and commas alike', () => {
      expect(ornaments.parsePrefixes(' ap sc5,,pe ')).to.deep.equal(['ap', 'sc5', 'pe']);
    });
  });

  describe('sync', () => {
    it('shares the excluded prefixes and the hidden ornaments, not the ornaments seen', () => {
      settings.set('ornaments.excluded', 'ap');
      settings.set('ornaments.hidden', { ap1: true });

      const shared = settings.export({ sync: true });

      expect(shared['ornaments.excluded']).to.equal('ap');
      expect(shared['ornaments.hidden']).to.deep.equal({ ap1: true });
      expect(settings._syncs('ornaments.hidden')).to.be.true;
    });
  });

  describe('load and save', () => {
    it('loads the prefixes, and the ornaments seen with the hidden ones', () => {
      localStorage.setItem(ornaments.KNOWN_KEY, '["sc5"]');
      settings.set('ornaments.hidden', { ap1: true });

      ornaments.load();

      expect(ornaments.excludedOrnaments).to.deep.equal([]);
      expect(ornaments.knownOrnaments).to.deep.equal({ sc5: false, ap1: true });
    });

    it('saves the prefixes, the hidden ornaments and the ornaments seen', async () => {
      ornaments.excludedOrnaments = ['ap'];
      ornaments.knownOrnaments = { sc5: true, x: false };

      ornaments.save();
      await redraws();

      expect(settings.get('ornaments.excluded')).to.equal('ap');
      expect(JSON.parse(localStorage.getItem('iitc-setting:ornaments.hidden'))).to.deep.equal({ sc5: true });
      expect(JSON.parse(localStorage.getItem(ornaments.KNOWN_KEY))).to.have.members(['sc5', 'x']);
    });

    it('records an ornament the first time it shows up on the map', async () => {
      const replaced = { Icon: L.Icon, portal: IITC.portal };
      L.Icon = class {};
      IITC.portal = { marker: { scale: () => 1 } };
      ornaments._portals = {};
      ornaments.layers = { Ornaments: {}, 'Excluded ornaments': {} };
      const portal = (guid) => ({ options: { guid, data: { ornaments: ['sc5'] } }, getLatLng: () => ({}) });
      try {
        ornaments.addPortal(portal('a'));
        ornaments.addPortal(portal('b'));
        await redraws();
      } finally {
        Object.assign(L, { Icon: replaced.Icon });
        IITC.portal = replaced.portal;
      }

      expect(ornaments.knownOrnaments).to.deep.equal({ sc5: false });
      expect(JSON.parse(localStorage.getItem(ornaments.KNOWN_KEY))).to.deep.equal(['sc5']);
    });
  });

  describe('settings page', () => {
    const repeat = () => page.blocks.find((block) => block.type === 'repeat');
    const hide = () => repeat().blocks[0];

    it('shows an ornament a prefix hides as hidden, and does not let it be shown', () => {
      ornaments.excludedOrnaments = ['ap'];

      expect(hide().value({ id: 'ap1' })).to.be.true;
      expect(hide().enabled({ id: 'ap1' })).to.be.false;
      expect(hide().value({ id: 'sc5' })).to.be.undefined;
      expect(hide().enabled({ id: 'sc5' })).to.be.true;
    });

    it('tells why the list is empty while no ornament was seen', () => {
      const hint = page.blocks.find((block) => block.type === 'text');
      ornaments.knownOrnaments = {};

      expect(hint.visible()).to.be.true;

      ornaments.knownOrnaments = { ap1: false };

      expect(hint.visible()).to.be.false;
    });

    it('forgets the ornaments seen and the hidden ones, and keeps the prefixes', async () => {
      ornaments._seen = new Set(['sc5']);
      localStorage.setItem(ornaments.KNOWN_KEY, '["sc5"]');
      settings.set('ornaments.excluded', 'pe');
      settings.set('ornaments.hidden', { ap1: true });

      page.blocks.find((block) => block.type === 'action').action();

      expect(ornaments.knownOrnaments).to.deep.equal({});
      expect(localStorage.getItem(ornaments.KNOWN_KEY)).to.equal('[]');
      expect(localStorage.getItem('iitc-setting:ornaments.hidden')).to.be.null;
      expect(settings.get('ornaments.excluded')).to.equal('pe');
      expect(await redraws()).to.be.at.least(1);
    });

    describe('in the open settings window', () => {
      let replaced;

      // the portals on the map, which a redraw of the ornaments adds again
      const onMap = [];
      const portal = (guid, ids) => ({ options: { guid, data: { ornaments: ids } }, getLatLng: () => ({}) });
      // the ornaments the page lists once its redraw, which follows the redraw of the ornaments, has run
      const listed = async () => {
        await redraws();
        await new Promise((resolve) => setTimeout(resolve));
        return [...settings._view.root.querySelectorAll('.iitc-settings-repeat tbody tr')].map((row) => row.cells[0].textContent);
      };

      beforeEach(() => {
        replaced = { Icon: L.Icon, portal: IITC.portal, utils: IITC.utils, dialog: window.dialog };
        L.Icon = class {};
        IITC.portal = { marker: { scale: () => 1 } };
        IITC.utils = { ...IITC.utils, isSmartphone: () => false };
        window.dialog = (options) => {
          document.body.append(options.html);
          return { options };
        };
        ornaments._portals = {};
        ornaments.layers = { Ornaments: {}, 'Excluded ornaments': {} };
        onMap.length = 0;
        // as the redraw, which takes the ornaments off the map and adds them again
        ornaments.reload.callsFake(() => {
          ornaments._portals = {};
          onMap.forEach((p) => ornaments.addPortal(p));
        });
        settings.open('ornaments');
      });

      afterEach(() => {
        const view = settings._view;
        view.root?.remove();
        view.dialog?.options.closeCallback();
        view.pageId = undefined;
        Object.assign(L, { Icon: replaced.Icon });
        IITC.portal = replaced.portal;
        IITC.utils = replaced.utils;
        window.dialog = replaced.dialog;
      });

      it('lists an ornament that shows up on the map', async () => {
        expect(await listed()).to.deep.equal([]);

        onMap.push(portal('a', ['sc5']));
        ornaments.addPortal(onMap[0]);

        expect(await listed()).to.deep.equal(['sc5']);
      });

      // with no ornament hidden, so no setting changes and only the ornaments seen redraw the page
      it('lists the ornaments on the map again after they are forgotten', async () => {
        onMap.push(portal('a', ['sc5']), portal('b', ['ap1']));
        onMap.forEach((p) => ornaments.addPortal(p));
        expect(await listed()).to.deep.equal(['ap1', 'sc5']);

        page.blocks.find((block) => block.type === 'action').action();

        expect(ornaments._seen.size).to.equal(0);
        expect(await listed()).to.deep.equal(['ap1', 'sc5']);
      });
    });

    it('opens in place of the dialog', () => {
      const open = sinon.stub();
      const replaced = settings.open;
      settings.open = open;
      try {
        ornaments.ornamentsOpt();
      } finally {
        settings.open = replaced;
      }
      expect(open.calledOnceWith('ornaments')).to.be.true;
    });
  });

  describe('changes', () => {
    it('applies new prefixes and redraws the ornaments', async () => {
      settings.set('ornaments.excluded', 'ap,pe', { source: 'remote' });

      expect(ornaments.excludedOrnaments).to.deep.equal(['ap', 'pe']);
      expect(await redraws()).to.equal(1);
    });

    it('does not redraw for prefixes that only differ as text', async () => {
      ornaments.excludedOrnaments = ['pe'];
      settings.set('ornaments.excluded', 'pe,');
      expect(await redraws()).to.equal(0);
    });

    it('applies new hidden flags as a copy and redraws the ornaments', async () => {
      const hidden = { ap1: true };

      settings.set('ornaments.hidden', hidden);

      expect(ornaments.knownOrnaments).to.deep.equal({ ap1: true });
      expect(ornaments.knownOrnaments).to.not.equal(hidden);
      expect(await redraws()).to.equal(1);
    });

    it('keeps the ornaments seen when the hidden flags change elsewhere, and lists hidden ones not seen here', () => {
      ornaments._seen = new Set(['newOne']);

      settings.set('ornaments.hidden', { ap1: true });
      expect(ornaments.knownOrnaments).to.deep.equal({ newOne: false, ap1: true });
      expect(
        page.blocks
          .find((block) => block.type === 'repeat')
          .over()
          .map((item) => item.id)
      ).to.deep.equal(['ap1', 'newOne']);

      settings.reset('ornaments.hidden');
      expect(ornaments.knownOrnaments).to.deep.equal({ newOne: false });
    });

    it('redraws once when a save changes both settings', async () => {
      ornaments.excludedOrnaments = ['ap'];
      ornaments.knownOrnaments = { sc5: true };

      ornaments.save();

      expect(await redraws()).to.equal(1);
    });

    it('redraws once when a backup restores both settings', async () => {
      settings.import({ 'ornaments.excluded': 'ap', 'ornaments.hidden': { sc5: true } });
      expect(await redraws()).to.equal(1);
    });

    it('redraws once when a save runs inside another save', async () => {
      let nested = false;
      // assigned rather than stubbed, since other specs may leave a sinon spy on window.runHooks
      window.runHooks = () => {
        if (nested) return;
        nested = true;
        ornaments.knownOrnaments = { pe: true };
        ornaments.save();
      };
      ornaments.excludedOrnaments = ['ap'];

      ornaments.save();

      expect(await redraws()).to.equal(1);
    });

    it('saves any truthy entry of knownOrnaments as hidden, as older builds read it', async () => {
      ornaments.knownOrnaments = { ap1: 1, sc5: 0 };

      ornaments.save();

      expect(settings.get('ornaments.hidden')).to.include({ ap1: true });
      expect(JSON.parse(localStorage.getItem('iitc-setting:ornaments.hidden'))).to.deep.equal({ ap1: true });
      expect(await redraws()).to.equal(1);
    });
  });

  it('lists the known ornaments sorted, with names from plugins where given', () => {
    ornaments.knownOrnaments = { sc5: false, ap1: true };
    ornaments.icon = { ap1: { name: 'Anomaly' } };
    const repeat = page.blocks.find((block) => block.type === 'repeat');

    expect(repeat.over()).to.deep.equal([
      { id: 'ap1', title: 'Anomaly (ap1)' },
      { id: 'sc5', title: 'sc5' },
    ]);
  });
});
