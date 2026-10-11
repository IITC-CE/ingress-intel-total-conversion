import { describe, it, before, after, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

window.plugin = window.plugin || {};
await import('../../core/code/settings.js');
await import('../../plugins/bookmarks.js');

const bookmarks = window.plugin.bookmarks;
const settings = IITC.settings;

describe('bookmarks settings page', () => {
  let page;
  let replaced;

  const block = (title) => page.blocks.find((candidate) => candidate.title === title);

  before(() => {
    bookmarks.registerSettings();
    page = IITC.settings._pages.bookmarks;
  });

  after(() => {
    delete settings._pages.bookmarks;
  });

  beforeEach(() => {
    localStorage.clear();
    replaced = { confirm: globalThis.confirm, prompt: globalThis.prompt, runHooks: window.runHooks, utils: IITC.utils, isApp: window.isApp };
    window.runHooks = sinon.spy();
    window.isApp = false;
    bookmarks.KEY_STORAGE = 'plugin-bookmarks';
    sinon.stub(bookmarks, 'refreshBkmrks');
    sinon.stub(console, 'log');
    sinon.stub(console, 'warn');
  });

  afterEach(() => {
    globalThis.confirm = replaced.confirm;
    globalThis.prompt = replaced.prompt;
    window.runHooks = replaced.runHooks;
    window.isApp = replaced.isApp;
    IITC.utils = replaced.utils;
    sinon.restore();
  });

  it('exports the bookmarks with non-ASCII characters escaped', () => {
    localStorage.setItem('plugin-bookmarks', '{"maps":{"idOthers":{"label":"Café"}}}');

    expect(block('Export bookmarks').data()).to.equal('{"maps":{"idOthers":{"label":"Caf\\u00e9"}}}');
    expect(block('Export bookmarks')).to.include({ filename: 'IITC-bookmarks.json' });
  });

  it('replaces the bookmarks with imported ones', () => {
    expect(block('Import bookmarks').onData('{"maps":{},"portals":{}}')).to.equal('Imported bookmarks');

    expect(localStorage.getItem('plugin-bookmarks')).to.equal('{"maps":{},"portals":{}}');
    expect(bookmarks.refreshBkmrks.calledOnce).to.be.true;
    expect(window.runHooks.calledWith('pluginBkmrksEdit', { target: 'all', action: 'import' })).to.be.true;
  });

  it('refuses text that is not bookmarks and keeps the bookmarks', () => {
    localStorage.setItem('plugin-bookmarks', '{}');

    for (const text of ['not json', '"abc"', '[1]', '{"maps":{}}', '{"maps":{},"portals":[]}']) {
      expect(() => block('Import bookmarks').onData(text), text).to.throw('These are not bookmarks');
    }
    expect(localStorage.getItem('plugin-bookmarks')).to.equal('{}');
  });

  it('imports a picked file, and nothing when none is picked', async () => {
    IITC.utils = { importFile: sinon.stub().resolves([{ name: 'b.json', text: '{"maps":{},"portals":{}}' }]) };
    expect(await bookmarks.optImport()).to.equal('Imported bookmarks');
    expect(localStorage.getItem('plugin-bookmarks')).to.equal('{"maps":{},"portals":{}}');

    IITC.utils = { importFile: sinon.stub().resolves([]) };
    expect(await bookmarks.optImport()).to.be.undefined;
  });

  it('deletes all bookmarks only when confirmed', () => {
    sinon.stub(bookmarks, 'createStorage');
    sinon.stub(bookmarks, 'loadStorage');
    localStorage.setItem('plugin-bookmarks', '{}');

    globalThis.confirm = () => false;
    expect(block('Delete all bookmarks').action()).to.be.undefined;
    expect(localStorage.getItem('plugin-bookmarks')).to.equal('{}');

    globalThis.confirm = () => true;
    expect(block('Delete all bookmarks').action()).to.equal('Deleted all bookmarks');
    expect(localStorage.getItem('plugin-bookmarks')).to.be.null;
  });

  describe('folders', () => {
    beforeEach(() => {
      bookmarks.currentProject = {
        maps: { idOthers: { label: 'Others' }, f1: { label: 'Home' } },
        portals: { idOthers: { label: 'Others' }, f2: { label: 'Farm' } },
      };
      sinon.stub(bookmarks, 'saveStorage');
    });

    it('lists the folders of both kinds, without the one for bookmarks outside folders', () => {
      expect(page.blocks.find((candidate) => candidate.type === 'repeat').over()).to.deep.equal([
        { id: 'maps/f1', title: 'Home (maps)', type: 'maps', folderId: 'f1' },
        { id: 'portals/f2', title: 'Farm (portals)', type: 'portals', folderId: 'f2' },
      ]);
    });

    it('tells how to add a folder while there is none', () => {
      const hint = page.blocks.find((candidate) => candidate.type === 'text');

      expect(hint.visible()).to.be.false;

      bookmarks.currentProject = { maps: { idOthers: { label: 'Others' } }, portals: { idOthers: { label: 'Others' } } };

      expect(hint.visible()).to.be.true;
    });

    it('shows folder names as typed, though they are stored escaped', () => {
      bookmarks.currentProject.maps.f1.label = bookmarks.escapeHtml('Tom & Jerry <b> "x" \'y\' a/b c\\d');

      expect(bookmarks.folders()[0].title).to.equal('Tom & Jerry <b> "x" \'y\' a/b c\\d (maps)');
    });

    it('draws the page again when the bookmarks are saved', () => {
      bookmarks.saveStorage.restore();
      const refresh = sinon.stub();
      const replacedRefresh = settings.refresh;
      settings.refresh = refresh;
      try {
        bookmarks.saveStorage();
      } finally {
        settings.refresh = replacedRefresh;
      }
      expect(refresh.calledOnceWith('bookmarks')).to.be.true;
    });

    it('renames a folder to the name given', () => {
      const rename = page.blocks.find((candidate) => candidate.type === 'repeat').blocks[0];

      globalThis.prompt = () => '';
      expect(rename.action({ type: 'portals', folderId: 'f2' })).to.be.undefined;

      globalThis.prompt = () => 'Farm <b>';
      expect(rename.action({ type: 'portals', folderId: 'f2' })).to.equal('Renamed');
      expect(bookmarks.currentProject.portals.f2.label).to.equal('Farm &lt;b&gt;');
      expect(bookmarks.saveStorage.calledOnce).to.be.true;
    });
  });

  it('offers the box position only on the desktop', () => {
    const boxBlocks = page.blocks.filter((candidate) => candidate.title?.includes('box'));
    expect(boxBlocks.every((candidate) => candidate.visible())).to.be.true;

    window.isApp = true;
    expect(boxBlocks.every((candidate) => candidate.visible() === false)).to.be.true;
  });

  it('opens in place of the dialog', () => {
    const open = sinon.stub();
    const replacedOpen = settings.open;
    settings.open = open;
    try {
      bookmarks.manualOpt();
    } finally {
      settings.open = replacedOpen;
    }
    expect(open.calledOnceWith('bookmarks')).to.be.true;
  });
});
