import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

await import('../core/code/settings.js');
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
    ornaments.icon = {};
    ornaments._reloadQueued = false;
    sinon.stub(ornaments, 'reload');
    replacedRunHooks = window.runHooks;
  });

  afterEach(() => {
    window.runHooks = replacedRunHooks;
    sinon.restore();
  });

  describe('migration', () => {
    it('moves the legacy prefixes and hidden flags to the settings, and removes the legacy keys', () => {
      localStorage.setItem('excludedOrnaments', '["ap","sc5"]');
      localStorage.setItem('knownOrnaments', '{"ap1":1,"pe":"true","sc5":null}');

      const set = sinon.spy(settings, 'set');

      ornaments.migrate();

      expect(set.args.map(([key, , options]) => [key, options])).to.deep.equal([
        ['ornaments.excluded', { source: 'legacy' }],
        ['ornaments.hidden', { source: 'legacy' }],
      ]);
      expect(settings.get('ornaments.excluded')).to.equal('ap,sc5');
      // any truthy entry hid the ornament in older builds
      expect(settings.get('ornaments.hidden')).to.deep.equal({ ap1: true, pe: true, sc5: false });
      expect(localStorage.getItem('excludedOrnaments')).to.be.null;
      expect(localStorage.getItem('knownOrnaments')).to.be.null;
    });

    it('moves them once', () => {
      localStorage.setItem('excludedOrnaments', '["ap"]');
      ornaments.migrate();
      settings.reset('ornaments.excluded');
      const set = sinon.spy(settings, 'set');

      ornaments.migrate();

      expect(set.called).to.be.false;
      expect(settings.get('ornaments.excluded')).to.equal('');
    });

    it('reads an empty legacy list as no prefixes', () => {
      localStorage.setItem('excludedOrnaments', '[""]');
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
      expect(settings.get('ornaments.hidden')).to.deep.equal({});
      expect(localStorage.getItem('excludedOrnaments')).to.be.null;
      expect(localStorage.getItem('knownOrnaments')).to.be.null;
    });

    it('splits prefixes on spaces and commas alike', () => {
      expect(ornaments.parsePrefixes(' ap sc5,,pe ')).to.deep.equal(['ap', 'sc5', 'pe']);
    });
  });

  describe('sync', () => {
    it('shares the excluded prefixes', () => {
      settings.set('ornaments.excluded', 'ap');
      expect(settings.exportValues({ sync: true })['ornaments.excluded']).to.equal('ap');
    });

    it('keeps the hidden flags on this device', () => {
      settings.set('ornaments.hidden', { ap1: true });

      expect(settings.exportValues({ sync: true })).to.not.have.property('ornaments.hidden');
      expect(settings.set('ornaments.hidden', {}, { source: 'remote' })).to.be.false;
      expect(ornaments.knownOrnaments).to.deep.equal({ ap1: true });
    });
  });

  describe('load and save', () => {
    it('loads both settings, even when no prefixes were ever stored', () => {
      localStorage.setItem('iitc-setting:ornaments.hidden', '{"ap1":true}');

      ornaments.load();

      expect(ornaments.excludedOrnaments).to.deep.equal([]);
      expect(ornaments.knownOrnaments).to.deep.equal({ ap1: true });
    });

    it('saves both settings', () => {
      ornaments.excludedOrnaments = ['ap'];
      ornaments.knownOrnaments = { sc5: true };

      ornaments.save();

      expect(settings.get('ornaments.excluded')).to.equal('ap');
      expect(JSON.parse(localStorage.getItem('iitc-setting:ornaments.hidden'))).to.deep.equal({ sc5: true });
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

    it('forgets the known ornaments', async () => {
      settings.set('ornaments.hidden', { ap1: true });

      page.blocks.find((block) => block.type === 'action').action();

      expect(ornaments.knownOrnaments).to.deep.equal({});
      expect(settings.get('ornaments.hidden')).to.deep.equal({});
      expect(await redraws()).to.be.at.least(1);
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

    it('keeps ornaments seen this session when the hidden flags change elsewhere', () => {
      settings.set('ornaments.hidden', { ap1: true });
      ornaments.knownOrnaments.newOne = false;

      settings.set('ornaments.hidden', { ap1: false });
      expect(ornaments.knownOrnaments).to.deep.equal({ ap1: false, newOne: false });

      settings.set('ornaments.hidden', { ap1: true });
      ornaments.knownOrnaments.newOne = true;
      settings.reset('ornaments.hidden');
      expect(ornaments.knownOrnaments).to.deep.equal({ ap1: false, newOne: false });
    });

    it('redraws once when a save changes both settings', async () => {
      ornaments.excludedOrnaments = ['ap'];
      ornaments.knownOrnaments = { sc5: true };

      ornaments.save();

      expect(await redraws()).to.equal(1);
    });

    it('redraws once when a backup restores both settings', async () => {
      settings.importValues({ 'ornaments.excluded': 'ap', 'ornaments.hidden': { sc5: true } });
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

    it('redraws after a save even when a value is rejected', async () => {
      ornaments.knownOrnaments = { ap1: 1 };

      ornaments.save();

      expect(localStorage.getItem('iitc-setting:ornaments.hidden')).to.be.null;
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
