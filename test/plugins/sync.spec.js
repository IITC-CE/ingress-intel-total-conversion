import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { readFile } from 'node:fs/promises';

/* eslint-disable no-unused-expressions */

window.plugin = window.plugin || {};
await import('../../plugins/sync.js');

const sync = window.plugin.sync;
const source = await readFile(new URL('../../plugins/sync.js', import.meta.url), 'utf8');
const OWN_UUID = 'this-client';

describe('sync of a registered map', () => {
  let file;
  let saved;

  // registers a map, with the Drive file replaced by `file`: undefined while it does not exist yet
  const register = (pluginName, fieldName, mapOptions) => {
    sync.registerMapForSync(pluginName, fieldName, null, null, mapOptions);
    const registered = sync.registeredPluginsFields.get(pluginName, fieldName);
    registered.dataStorage = {
      saveFile: (data) => {
        saved = structuredClone(data);
        file = structuredClone(data);
      },
      readFile: (initializeFile, onFileLoaded) => (file === undefined ? initializeFile() : onFileLoaded(structuredClone(file))),
    };
    return registered;
  };

  beforeEach(() => {
    // the timers of later loads never run
    sinon.useFakeTimers();
    file = undefined;
    saved = undefined;
    sync.uuid = OWN_UUID;
    sync.logger = { log() {} };
    const maps = {};
    sync.registeredPluginsFields = {
      pluginsfields: maps,
      waitingInitialize: {},
      add: (registered) => {
        maps[registered.pluginName] = { ...maps[registered.pluginName], [registered.fieldName]: registered };
      },
      get: (pluginName, fieldName) => maps[pluginName]?.[fieldName],
    };
    delete window.plugin['test-sync'];
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('holder', () => {
    it('keeps the map in plugin[pluginName] by default', () => {
      window.plugin['test-sync'] = { data: { a: 1 } };
      const registered = register('test-sync', 'data');

      registered.loadDocument();

      expect(saved.map).to.deep.equal({ a: 1 });
    });

    it('reads plugin[pluginName] anew when the plugin replaces it after registering', () => {
      window.plugin['test-sync'] = { data: {} };
      file = { map: {}, 'last-update-uuid': OWN_UUID };
      register('test-sync', 'data').loadDocument();

      window.plugin['test-sync'] = { data: { a: 1 } };
      sync.updateMap('test-sync', 'data', ['a']);

      expect(saved.map).to.deep.equal({ a: 1 });
    });

    it('starts a new file with the map of the holder', () => {
      const holder = { data: { a: 1 } };
      const registered = register('test-sync', 'data', { holder });

      registered.loadDocument();

      expect(saved.map).to.deep.equal({ a: 1 });
    });

    it('sends updates from the holder', () => {
      const holder = { data: {} };
      file = { map: {}, 'last-update-uuid': OWN_UUID };
      const registered = register('test-sync', 'data', { holder });
      registered.loadDocument();

      holder.data.a = 2;
      sync.updateMap('test-sync', 'data', ['a']);

      expect(saved.map).to.deep.equal({ a: 2 });
    });

    it('replaces the map of the holder when another client wrote the file', () => {
      const holder = { data: { mine: 1 } };
      file = { map: { theirs: 2 }, 'last-update-uuid': 'other-client' };
      const registered = register('test-sync', 'data', { holder });

      registered.loadDocument();

      expect(holder.data).to.deep.equal({ theirs: 2 });
    });
  });

  describe('isInitialized', () => {
    it('is false for a map that is not registered or not loaded yet', () => {
      expect(sync.isInitialized('test-sync', 'data')).to.be.false;
      register('test-sync', 'data', { holder: { data: {} } });
      expect(sync.isInitialized('test-sync', 'data')).to.be.false;
    });

    it('is true once the file is loaded, and false again after a sign-out', () => {
      file = { map: {}, 'last-update-uuid': OWN_UUID };
      register('test-sync', 'data', { holder: { data: {} } }).loadDocument();
      expect(sync.isInitialized('test-sync', 'data')).to.be.true;

      sync.stopAllIntervals();
      expect(sync.isInitialized('test-sync', 'data')).to.be.false;
    });
  });

  describe('getFileMap', () => {
    it('is undefined until the file is loaded', () => {
      register('test-sync', 'data', { holder: { data: {} } });
      expect(sync.getFileMap('test-sync', 'data')).to.be.undefined;
    });

    it('returns the file when this client wrote it last, not the holder', () => {
      const holder = { data: { a: 'changed here' } };
      file = { map: { a: 'sent' }, 'last-update-uuid': OWN_UUID };

      register('test-sync', 'data', { holder }).loadDocument();

      expect(holder.data).to.deep.equal({ a: 'changed here' });
      expect(sync.getFileMap('test-sync', 'data')).to.deep.equal({ a: 'sent' });
    });

    it('shows what this client sent', () => {
      const holder = { data: {} };
      file = { map: {}, 'last-update-uuid': OWN_UUID };
      register('test-sync', 'data', { holder }).loadDocument();

      holder.data.a = 1;
      sync.updateMap('test-sync', 'data', ['a']);

      expect(sync.getFileMap('test-sync', 'data')).to.deep.equal({ a: 1 });
    });

    it('returns a copy', () => {
      file = { map: { a: { b: 1 } }, 'last-update-uuid': OWN_UUID };
      register('test-sync', 'data', { holder: { data: {} } }).loadDocument();

      sync.getFileMap('test-sync', 'data').a.b = 2;

      expect(sync.getFileMap('test-sync', 'data')).to.deep.equal({ a: { b: 1 } });
    });
  });

  it('starts over from an empty map when the file holds something else', () => {
    const holder = { data: {} };
    file = { map: null, 'last-update-uuid': OWN_UUID };
    register('test-sync', 'data', { holder }).loadDocument();

    holder.data.a = 1;
    sync.updateMap('test-sync', 'data', ['a']);

    expect(saved.map).to.deep.equal({ a: 1 });
  });

  describe('registration before setup', () => {
    let replacedSync;
    let replacedRunHooks;

    beforeEach(() => {
      replacedSync = window.plugin.sync;
      replacedRunHooks = window.runHooks;
      // setup announces pluginSyncReady; other plugins loaded in this process would register on it
      window.runHooks = () => true;
    });

    afterEach(() => {
      window.plugin.sync = replacedSync;
      window.runHooks = replacedRunHooks;
    });

    it('keeps the holder of a map registered before setup', () => {
      // a fresh copy of the plugin, whose setup has not run yet
      const setup = new Function(`${source}\nreturn setup;`)();
      const fresh = window.plugin.sync;
      const holder = { data: {} };
      fresh.registerMapForSync('test-sync', 'data', null, null, { holder });

      const added = [];
      fresh.Logger = function () {};
      fresh.loadUUID = () => {};
      fresh.setupCSS = () => {};
      fresh.setupDialog = () => {};
      fresh.Authorizer = function () {};
      fresh.RegisteredPluginsFields = function () {
        return { add: (registered) => added.push(registered) };
      };
      sinon.stub($, 'getScript').returns({ done() {} });
      setup();

      expect(added).to.have.lengthOf(1);
      expect(added[0].getHolder()).to.equal(holder);
    });
  });
});
