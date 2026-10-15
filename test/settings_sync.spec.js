import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

window.plugin = window.plugin || {};
await import('../core/code/hooks.js');
// taken before any test runs, so no spy another spec leaves on window.runHooks gets in the way
const realRunHooks = window.runHooks;
await import('../core/code/settings.js');
await import('../core/code/settings_general.js');
await import('../core/code/settings_sync.js');

const settings = IITC.settings;
const sync = settings._sync;
const syncPlugin = sync.syncPlugin;

// lets queued uploads and deferred reconciles run
const flush = () => new Promise((resolve) => setTimeout(resolve));

const later = () => Date.now() + 60000;
const earlier = () => Date.now() - 60000;

// options of test-sync-checks.level, as if loaded later
let levels = [];

describe('settings replication', () => {
  let replacedRunHooks;

  before(() => {
    settings.register('test-sync-checks', {
      blocks: [
        { type: 'number', key: 'range', max: 10 },
        { type: 'string', key: 'filled', validate: (value) => value !== '' || 'empty' },
        { type: 'select', key: 'level', options: () => levels },
      ],
    });
    settings.register('test-sync', {
      blocks: [
        { type: 'string', key: 'shared' },
        { type: 'string', key: 'other' },
        { type: 'string', key: 'local', sync: false },
      ],
    });
  });

  beforeEach(() => {
    localStorage.clear();
    levels = [];
    syncPlugin.started = false;
    syncPlugin.queued = new Set();
    syncPlugin.scheduled = false;
    syncPlugin.store.settings = {};
    // delivers the settings hooks as this module subscribes to them; assigned rather than stubbed,
    // since other specs may leave a sinon spy on window.runHooks
    replacedRunHooks = window.runHooks;
    window.runHooks = (event, data) => {
      if (event === 'settingChanged') sync.onSettingChanged(data);
      if (event === 'settingsPageRegistered') sync.onPageRegistered(data);
      return true;
    };
  });

  afterEach(async () => {
    await flush();
    window.runHooks = replacedRunHooks;
    sinon.restore();
  });

  it('is on by default and stays a choice of this device', () => {
    expect(settings.get('iitc.syncSettings')).to.be.true;
    expect(settings._syncs('iitc.syncSettings')).to.be.false;
  });

  describe('model', () => {
    // the shared records the file holds
    let file;
    let replacedSync;

    // one exchange with the file: apply what is newer there, then write back what this device should send
    const exchange = (keys) => {
      const sent = sync.reconcile(keys);
      Object.assign(file, sync.records(sent));
      return sent;
    };

    // a Sync plugin that has taken the map and holds the file, without uploads of its own
    beforeEach(() => {
      file = undefined;
      replacedSync = window.plugin.sync;
      window.plugin.sync = {
        registerMapForSync: sinon.spy(),
        isInitialized: () => false,
        getFileMap: () => file,
        updateMap: sinon.spy(),
      };
      syncPlugin.started = true;
    });

    afterEach(() => {
      window.plugin.sync = replacedSync;
    });

    describe('times', () => {
      it('records the time of a change made here before the file is loaded', () => {
        settings.set('test-sync.shared', 'a');
        expect(sync.loadTimes()['test-sync.shared']).to.be.closeTo(Date.now(), 1000);
      });

      it('records no time for settings of this device, plugin state and values received', () => {
        settings.set('test-sync.local', 'b');
        settings.set('test-free.state', 'c');
        settings.set('test-sync.shared', 'remote', { source: 'remote' });
        settings.set('test-sync.other', 'old build', { source: 'legacy' });
        expect(sync.loadTimes()).to.deep.equal({});
      });

      it('reads stored times that are not a map of whole numbers as none', () => {
        localStorage.setItem(sync.TIMES_KEY, '5');
        expect(sync.loadTimes()).to.deep.equal({});

        localStorage.setItem(sync.TIMES_KEY, '{"test-sync.shared":"5","test-sync.other":7}');
        expect(sync.loadTimes()).to.deep.equal({ 'test-sync.other': 7 });

        sync.setTime('test-sync.shared', 9);
        expect(sync.loadTimes()['test-sync.shared']).to.equal(9);
      });
    });

    describe('records', () => {
      it('holds the stored values that may leave the device', () => {
        settings.set('test-sync.shared', 'a');
        settings.set('test-sync.local', 'b');
        settings.set('test-free.state', 'c');

        const all = sync.records();

        expect(Object.keys(all)).to.deep.equal(['test-sync.shared']);
        expect(all['test-sync.shared']).to.include({ value: 'a' });
      });

      it('leaves out stored values their declarations reject', () => {
        localStorage.setItem('iitc-setting:test-sync-checks.range', '500');
        expect(sync.records()).to.not.have.property('test-sync-checks.range');
      });

      it('holds a reset as a tombstone', () => {
        settings.set('test-sync.shared', 'a');
        settings.reset('test-sync.shared');
        expect(sync.records(['test-sync.shared'])['test-sync.shared']).to.include({ deleted: true });
      });

      it('holds a value set back to its default as a tombstone', () => {
        settings.set('test-sync.shared', 'a');
        settings.set('test-sync.shared', '');
        expect(sync.records(['test-sync.shared'])['test-sync.shared']).to.include({ deleted: true });
      });
    });

    describe('reconciling', () => {
      it('does nothing while turned off', () => {
        settings.set('test-sync.shared', 'mine');
        settings.set('iitc.syncSettings', false);
        file = { 'test-sync.other': { value: 'theirs', updated: later() } };

        expect(exchange()).to.deep.equal([]);
        expect(settings.get('test-sync.other')).to.equal('');
      });

      it('does not read the file before the Sync plugin has taken the map', () => {
        syncPlugin.started = false;
        file = { 'test-sync.other': { value: 'theirs', updated: later() } };

        expect(sync.reconcile()).to.deep.equal([]);
        expect(settings.get('test-sync.other')).to.equal('');
      });

      it('does nothing without shared records', () => {
        settings.set('test-sync.shared', 'mine');
        expect(sync.reconcile()).to.deep.equal([]);
      });

      it('applies a newer value from another device without sending it back', () => {
        settings.set('test-sync.shared', 'mine');
        file = { 'test-sync.shared': { value: 'theirs', updated: later() } };

        expect(exchange()).to.deep.equal([]);
        expect(settings.get('test-sync.shared')).to.equal('theirs');
      });

      it('keeps a newer change made here and sends it again', () => {
        settings.set('test-sync.shared', 'mine');
        file = { 'test-sync.shared': { value: 'theirs', updated: earlier() } };

        exchange();

        expect(settings.get('test-sync.shared')).to.equal('mine');
        expect(file['test-sync.shared']).to.include({ value: 'mine' });
      });

      it('does not reset a value that an outdated copy of the records left out', () => {
        settings.set('test-sync.shared', 'mine');
        // another device wrote its older copy, which never had this key
        file = { 'test-sync.other': { value: 'theirs', updated: later() } };

        exchange();

        expect(settings.get('test-sync.shared')).to.equal('mine');
        expect(file['test-sync.shared']).to.include({ value: 'mine' });
      });

      it('applies a reset made while this device was closed', () => {
        settings.set('test-sync.shared', 'mine');
        file = { 'test-sync.shared': { deleted: true, updated: later() } };

        exchange();

        expect(localStorage.getItem('iitc-setting:test-sync.shared')).to.be.null;
      });

      it('keeps nothing for a shared value equal to the default, and sends nothing back', () => {
        settings.set('test-sync.shared', 'mine');
        // sent by a device that keeps values equal to the default
        file = { 'test-sync.shared': { value: '', updated: later() } };

        expect(exchange()).to.deep.equal([]);
        expect(localStorage.getItem('iitc-setting:test-sync.shared')).to.be.null;
        expect(exchange()).to.deep.equal([]);
      });

      it('keeps a reset made here over an older value', () => {
        settings.set('test-sync.shared', 'mine');
        settings.reset('test-sync.shared');
        file = { 'test-sync.shared': { value: 'old', updated: earlier() } };

        exchange();

        expect(localStorage.getItem('iitc-setting:test-sync.shared')).to.be.null;
        expect(file['test-sync.shared']).to.include({ deleted: true });
      });

      it('leaves settings of this device alone, in the records too', () => {
        const record = { value: 'theirs', updated: later() };
        file = { 'test-sync.local': record };

        exchange();

        expect(settings.get('test-sync.local')).to.equal('');
        expect(file['test-sync.local']).to.equal(record);
      });

      it('leaves keys not declared yet for later', () => {
        file = { 'test-sync-late.x': { value: 'theirs', updated: later() } };
        exchange();

        settings.register('test-sync-late', { blocks: [{ type: 'string', key: 'x' }] });
        expect(settings.get('test-sync-late.x')).to.equal('');

        exchange(['test-sync-late.x']);
        expect(settings.get('test-sync-late.x')).to.equal('theirs');
      });

      it('works only on the keys asked for', () => {
        settings.set('test-sync.shared', 'mine');
        file = { 'test-sync.other': { value: 'theirs', updated: later() } };

        expect(exchange(['test-sync.other'])).to.deep.equal([]);
        expect(settings.get('test-sync.other')).to.equal('theirs');
        expect(file).to.not.have.property('test-sync.shared');
      });

      it('takes the shared value for a key stored here before syncing', () => {
        settings.set('test-sync.shared', 'mine');
        localStorage.removeItem(sync.TIMES_KEY);
        file = { 'test-sync.shared': { value: 'theirs', updated: 0 } };

        expect(exchange()).to.deep.equal([]);
        expect(settings.get('test-sync.shared')).to.equal('theirs');
      });

      it('keeps following the shared records for a key it never changed', () => {
        file = { 'test-sync.shared': { value: 'first', updated: 0 } };
        exchange();
        expect(sync.loadTimes()).to.not.have.property('test-sync.shared');

        file = { 'test-sync.shared': { value: 'second', updated: 0 } };
        exchange();
        expect(settings.get('test-sync.shared')).to.equal('second');
      });

      it('keeps a change made here after a record from a clock that runs ahead', () => {
        const ahead = later();
        file = { 'test-sync.shared': { value: 'theirs', updated: ahead } };
        exchange();

        settings.set('test-sync.shared', 'mine');
        exchange();

        expect(file['test-sync.shared'].updated).to.be.above(ahead);
        expect(settings.get('test-sync.shared')).to.equal('mine');
      });

      it('tries a rejected value again on the next reconcile', () => {
        file = { 'test-sync-checks.level': { value: '8', updated: later() } };

        exchange();
        expect(settings.get('test-sync-checks.level')).to.equal(undefined);

        levels = ['1', '8'];
        exchange();
        expect(settings.get('test-sync-checks.level')).to.equal('8');
      });

      it('restores the time it had after a value is rejected', () => {
        const known = earlier();
        sync.setTime('test-sync-checks.level', known);
        file = { 'test-sync-checks.level': { value: '8', updated: later() } };

        exchange();

        expect(sync.loadTimes()['test-sync-checks.level']).to.equal(known);
      });

      it('gives a change after a rejected newer record a later time than that record', () => {
        const ahead = later();
        levels = ['1', '2'];
        file = { 'test-sync-checks.level': { value: '8', updated: ahead } };
        exchange();

        settings.set('test-sync-checks.level', '2');

        expect(sync.loadTimes()['test-sync-checks.level']).to.be.above(ahead);
      });

      it('keeps the time of a change that an applied value made', () => {
        settings.register('test-sync-chain', {
          blocks: [
            { type: 'string', key: 'a', onChange: () => settings.set('test-sync-chain.b', 'derived') },
            { type: 'string', key: 'b' },
          ],
        });
        file = { 'test-sync-chain.a': { value: 'theirs', updated: later() } };

        exchange();

        expect(sync.loadTimes()).to.have.property('test-sync-chain.b');
        expect(file['test-sync-chain.b']).to.include({ value: 'derived' });
      });

      it('lets a change that onChange makes in reply win on every device', () => {
        settings.register('test-sync-clamp', {
          blocks: [{ type: 'number', key: 'n', onChange: (value) => value > 5 && settings.set('test-sync-clamp.n', 5) }],
        });
        const ahead = later();
        file = { 'test-sync-clamp.n': { value: 9, updated: ahead } };

        exchange();

        expect(settings.get('test-sync-clamp.n')).to.equal(5);
        expect(file['test-sync-clamp.n'].value).to.equal(5);
        expect(file['test-sync-clamp.n'].updated).to.be.above(ahead);
      });

      it('changes nothing for records this device sent', () => {
        settings.set('test-sync.shared', 'mine');
        file = {};
        exchange();

        expect(exchange()).to.deep.equal([]);
        expect(settings.get('test-sync.shared')).to.equal('mine');
      });

      it('ignores records with a time that is not a safe whole number', () => {
        for (const updated of [2 ** 53, -1, 1.5, '5']) {
          file = { 'test-sync.shared': { value: `at ${updated}`, updated } };
          exchange();
          expect(settings.get('test-sync.shared')).to.equal('');
        }
      });

      it('ignores a record too late to leave room for a later change', () => {
        file = { 'test-sync.shared': { value: 'last', updated: 2 ** 52 } };
        exchange();
        expect(settings.get('test-sync.shared')).to.equal('');
      });

      it('sends a change made after the latest record the records may hold with a later time', () => {
        const latest = 2 ** 52 - 1;
        file = { 'test-sync.shared': { value: 'theirs', updated: latest } };
        exchange();

        settings.set('test-sync.shared', 'mine');
        exchange();

        expect(file['test-sync.shared']).to.deep.equal({ value: 'mine', updated: latest + 1 });
      });

      it('does not send a stored value its declaration rejects, nor a reset in its place', () => {
        localStorage.setItem('iitc-setting:test-sync-checks.range', '500');
        sync.setTime('test-sync-checks.range', Date.now());
        file = {};

        exchange();

        expect(file).to.not.have.property('test-sync-checks.range');
      });

      it('sends neither the value nor a reset for a stored value it cannot read', () => {
        localStorage.setItem('iitc-setting:test-sync.shared', '{broken');
        sync.setTime('test-sync.shared', Date.now());
        file = {};

        exchange();

        expect(file).to.not.have.property('test-sync.shared');
      });

      it('takes the shared value over a stored value its declaration rejects', () => {
        localStorage.setItem('iitc-setting:test-sync-checks.range', '500');
        sync.setTime('test-sync-checks.range', Date.now());
        file = { 'test-sync-checks.range': { value: 7, updated: earlier() } };

        exchange();

        expect(settings.get('test-sync-checks.range')).to.equal(7);
      });

      it('does not send a rejected stored value that equals the default', () => {
        localStorage.setItem('iitc-setting:test-sync-checks.filled', '""');
        sync.setTime('test-sync-checks.filled', Date.now());
        file = {};

        exchange();

        expect(file).to.not.have.property('test-sync-checks.filled');
      });

      it('lets a value moved from an older build give way to the records, and sends it where they lack it', () => {
        settings.set('test-sync.shared', 'old build', { source: 'legacy' });
        settings.set('test-sync.other', 'old build', { source: 'legacy' });
        file = { 'test-sync.shared': { value: 'theirs', updated: earlier() } };

        exchange();

        expect(settings.get('test-sync.shared')).to.equal('theirs');
        expect(file['test-sync.other']).to.include({ value: 'old build' });
      });

      it('sends values stored before syncing that the records lack', () => {
        settings.set('test-sync.shared', 'mine');
        localStorage.removeItem(sync.TIMES_KEY);
        file = {};

        exchange();

        expect(file['test-sync.shared']).to.include({ value: 'mine' });
      });

      it('does not bring back a key reset on another device on the first exchange', () => {
        settings.set('test-sync.shared', 'mine');
        localStorage.removeItem(sync.TIMES_KEY);
        file = { 'test-sync.shared': { deleted: true, updated: earlier() } };

        expect(exchange()).to.deep.equal([]);
        expect(localStorage.getItem('iitc-setting:test-sync.shared')).to.be.null;
      });
    });
  });

  describe('Sync plugin', () => {
    // the Drive file as the fake plugin holds it, and whether it is loaded
    let fileMap;
    let initialized;
    let registered;
    let replacedSync;

    // what the plugin does on a load: take the file, replace the field when another client wrote it, call back
    const load = (map) => {
      fileMap = structuredClone(map);
      syncPlugin.store.settings = structuredClone(map);
      initialized = true;
      window.plugin.sync.updateMap.resetHistory();
      registered.initializedCallback();
    };

    // a load of a file this client wrote last: the field stays as it is
    const loadOwn = () => {
      initialized = true;
      window.plugin.sync.updateMap.resetHistory();
      registered.initializedCallback();
    };

    beforeEach(() => {
      fileMap = {};
      initialized = false;
      registered = undefined;
      window.iitcLoaded = true;
      replacedSync = window.plugin.sync;
      window.plugin.sync = {
        registerMapForSync: sinon.spy((pluginName, fieldName, callback, initializedCallback, mapOptions) => {
          registered = { pluginName, fieldName, initializedCallback, holder: mapOptions.holder };
          // a new file starts with the field
          fileMap = structuredClone(mapOptions.holder[fieldName]);
        }),
        isInitialized: () => initialized,
        getFileMap: () => (initialized ? structuredClone(fileMap) : undefined),
        updateMap: sinon.spy((pluginName, fieldName, keys) => {
          for (const key of keys) fileMap[key] = registered.holder[fieldName][key];
        }),
      };
    });

    afterEach(() => {
      delete window.iitcLoaded;
      window.plugin.sync = replacedSync;
    });

    describe('start', () => {
      it('registers iitc[settings], kept outside window.plugin', () => {
        syncPlugin.start();

        expect(window.plugin.sync.registerMapForSync.calledOnceWith('iitc', 'settings')).to.be.true;
        expect(registered.holder).to.equal(syncPlugin.store);
      });

      it('starts a new file with the stored values that may leave the device', () => {
        settings.set('test-sync.shared', 'a');
        settings.set('test-sync.local', 'b');

        syncPlugin.start();

        expect(Object.keys(fileMap)).to.deep.equal(['test-sync.shared']);
      });

      it('waits for IITC to load, for the plugin and for the setting to be on', () => {
        delete window.iitcLoaded;
        syncPlugin.start();
        window.iitcLoaded = true;
        settings.set('iitc.syncSettings', false);
        syncPlugin.start();
        window.plugin.sync = undefined;
        settings.set('iitc.syncSettings', true);

        expect(syncPlugin.started).to.be.false;
      });

      it('tries again after the plugin fails to register the map', () => {
        window.plugin.sync.registerMapForSync = sinon.stub().throws(new Error('setup failed'));
        syncPlugin.start();
        expect(syncPlugin.started).to.be.false;

        window.plugin.sync.registerMapForSync = sinon.spy();
        syncPlugin.start();
        expect(syncPlugin.started).to.be.true;
      });

      it('starts when the Sync plugin is loaded after IITC', () => {
        realRunHooks('pluginSyncReady');
        expect(syncPlugin.started).to.be.true;
      });

      it('leaves the start to iitcLoaded when the Sync plugin is ready earlier', () => {
        delete window.iitcLoaded;
        realRunHooks('pluginSyncReady');
        expect(syncPlugin.started).to.be.false;

        window.iitcLoaded = true;
        realRunHooks('iitcLoaded');
        expect(syncPlugin.started).to.be.true;
      });

      it('starts when the setting is turned on', () => {
        settings.set('iitc.syncSettings', false);
        syncPlugin.start();
        expect(syncPlugin.started).to.be.false;

        settings.set('iitc.syncSettings', true);
        expect(syncPlugin.started).to.be.true;
      });
    });

    describe('sending', () => {
      beforeEach(() => {
        syncPlugin.start();
        load({});
      });

      it('sends a change made here with its time', async () => {
        settings.set('test-sync.shared', 'a');
        await flush();

        expect(fileMap['test-sync.shared'].value).to.equal('a');
        expect(fileMap['test-sync.shared'].updated).to.be.closeTo(Date.now(), 1000);
      });

      it('sends a reset as a tombstone', async () => {
        settings.set('test-sync.shared', 'a');
        await flush();
        settings.reset('test-sync.shared');
        await flush();
        expect(fileMap['test-sync.shared']).to.include({ deleted: true });
      });

      it('sends the changes of one task in one upload', async () => {
        settings.import({ 'test-sync.shared': 'a', 'test-sync.other': 'b' }, { source: 'backup' });
        settings.set('test-sync.shared', 'c');
        await flush();

        expect(window.plugin.sync.updateMap.calledOnce).to.be.true;
        expect(window.plugin.sync.updateMap.firstCall.args[2]).to.have.members(['test-sync.shared', 'test-sync.other']);
        expect(fileMap['test-sync.shared']).to.include({ value: 'c' });
      });

      it('sends nothing queued when turned off before the upload', async () => {
        settings.set('test-sync.shared', 'a');
        settings.set('iitc.syncSettings', false);
        await flush();

        expect(window.plugin.sync.updateMap.called).to.be.false;
      });

      it('keeps settings of this device, plugin state and values it received to itself', async () => {
        settings.set('test-sync.local', 'b');
        settings.set('test-free.state', 'c');
        settings.set('test-sync.shared', 'remote', { source: 'remote' });
        settings.set('test-sync.other', 'old build', { source: 'legacy' });
        await flush();

        expect(window.plugin.sync.updateMap.called).to.be.false;
      });

      it('sends what changed while turned off once turned on again', async () => {
        settings.set('iitc.syncSettings', false);
        settings.set('test-sync.shared', 'offline');
        await flush();
        expect(window.plugin.sync.updateMap.called).to.be.false;

        settings.set('iitc.syncSettings', true);
        expect(fileMap['test-sync.shared']).to.include({ value: 'offline' });
      });

      it('holds changes while signed out and sends them after signing in', async () => {
        initialized = false;
        settings.set('test-sync.shared', 'signed out');
        await flush();
        expect(window.plugin.sync.updateMap.called).to.be.false;

        loadOwn();
        expect(fileMap['test-sync.shared']).to.include({ value: 'signed out' });
      });
    });

    describe('loading', () => {
      beforeEach(() => {
        syncPlugin.start();
      });

      it('sends a change made before the file loaded once it has', async () => {
        settings.set('test-sync.shared', 'early');
        await flush();
        expect(window.plugin.sync.updateMap.called).to.be.false;

        load({});
        expect(fileMap['test-sync.shared']).to.include({ value: 'early' });
      });

      it('applies a newer value from another client without sending it back', () => {
        load({ 'test-sync.shared': { value: 'theirs', updated: later() } });

        expect(settings.get('test-sync.shared')).to.equal('theirs');
        expect(window.plugin.sync.updateMap.called).to.be.false;
      });

      it('sends a change missed by a file this client wrote last', async () => {
        load({});
        settings.set('test-sync.shared', 'sent');
        await flush();
        initialized = false;
        settings.set('test-sync.shared', 'offline');
        await flush();
        // the field already holds the new record from an earlier send attempt of this session
        syncPlugin.store.settings = sync.records();

        loadOwn();

        expect(fileMap['test-sync.shared']).to.include({ value: 'offline' });
      });

      it('changes nothing on a load of a file this client wrote last', async () => {
        load({});
        settings.set('test-sync.shared', 'mine');
        await flush();

        loadOwn();

        expect(window.plugin.sync.updateMap.called).to.be.false;
      });

      it('applies values to a page declared after they arrived, once its setup is done', async () => {
        load({ 'test-sync-later.x': { value: 'theirs', updated: later() } });

        settings.register('test-sync-later', { blocks: [{ type: 'string', key: 'x' }] });
        expect(settings.get('test-sync-later.x')).to.equal('');

        await flush();
        expect(settings.get('test-sync-later.x')).to.equal('theirs');
      });

      it('applies values to a section added to a page, whether the page is registered or not', async () => {
        load({ 'test-sync-section.x': { value: 'theirs', updated: later() } });

        settings.extend('test-sync-unregistered', 'test-sync-section', { blocks: [{ type: 'string', key: 'x' }] });
        expect(settings.get('test-sync-section.x')).to.equal('');

        await flush();
        expect(settings.get('test-sync-section.x')).to.equal('theirs');
      });

      it('does nothing while turned off', () => {
        settings.set('iitc.syncSettings', false);
        load({ 'test-sync.shared': { value: 'theirs', updated: later() } });
        expect(settings.get('test-sync.shared')).to.equal('');
      });
    });
  });
});
