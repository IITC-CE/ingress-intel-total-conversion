import { describe, it, after, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { readFileSync } from 'node:fs';

/* global IITC */
/* eslint-disable no-unused-expressions */

window.plugin = window.plugin || {};
await import('../../core/code/settings.js');
await import('../../plugins/multi-projects-extension.js');

const mpe = window.plugin.mpe;
const settings = IITC.settings;

describe('multi-projects-extension settings page', () => {
  let replaced;

  const page = () => settings._pages[mpe.PAGE_ID];
  const block = (title, index = 0) => page().blocks.filter((candidate) => candidate.title === title)[index];

  const register = (namespace) =>
    mpe.setMultiProjects({
      namespace,
      title: `${namespace} title`,
      defaultKey: `key-${namespace}`,
      func_setKey: sinon.spy(),
      func_post: sinon.spy(),
    });

  after(() => {
    delete settings._pages[mpe.PAGE_ID];
  });

  beforeEach(() => {
    localStorage.clear();
    replaced = { runHooks: window.runHooks, iitcLoaded: window.iitcLoaded, refresh: settings.refresh, confirm: globalThis.confirm };
    window.runHooks = sinon.spy();
    window.iitcLoaded = true;
    settings.refresh = sinon.spy();
    sinon.stub(console, 'log');
    mpe.obj.projects = {};
    mpe.isReady = true;
    mpe.storage.checkStorage();
    mpe.registerSettings();
  });

  afterEach(() => {
    Object.assign(window, { runHooks: replaced.runHooks, iitcLoaded: replaced.iitcLoaded });
    settings.refresh = replaced.refresh;
    globalThis.confirm = replaced.confirm;
    sinon.restore();
  });

  it('tells that no plugin has projects until one registers', () => {
    expect(block(undefined).visible).to.be.true;

    register('bookmarks');

    expect(block(undefined).visible).to.be.false;
  });

  it('adds a section for each plugin in the order they register', () => {
    register('bookmarks');
    register('drawTools');

    const headings = page()
      .blocks.filter((candidate) => candidate.type === 'heading')
      .map((heading) => heading.title);
    expect(headings).to.deep.equal(['bookmarks title', 'drawTools title']);
  });

  describe('projects', () => {
    let projects;
    let promptText;

    const list = () => projects.over();
    const inner = (type) => projects.blocks.find((candidate) => candidate.type === type);

    beforeEach(() => {
      replaced.utils = IITC.utils;
      promptText = sinon.stub();
      IITC.utils = { promptText };
      localStorage.setItem('MPE_key-bookmarksParis___north', '{}');
      register('bookmarks');
      projects = page().blocks.find((candidate) => candidate.type === 'repeat');
    });

    afterEach(() => {
      IITC.utils = replaced.utils;
    });

    it('lists the projects of the plugin, the one in use chosen', () => {
      expect(list()).to.deep.equal([
        { id: 'key-bookmarks', title: 'Default project' },
        { id: 'MPE_key-bookmarksParis___north', title: 'Paris north' },
      ]);
      expect(list().map((project) => inner('choice').selected(project))).to.deep.equal([true, false]);
    });

    it('switches to the chosen project', () => {
      const [, paris] = list();

      inner('choice').action(paris);

      expect(inner('choice').selected(paris)).to.be.true;
      expect(mpe.obj.projects.bookmarks.func_setKey.calledWith(paris.id)).to.be.true;
      expect(settings.refresh.calledWith(mpe.PAGE_ID)).to.be.true;
    });

    it('creates a project with the name entered, and switches to it', async () => {
      promptText.resolves('Rome');

      expect(await block('New project').action()).to.equal('Created "Rome"');

      expect(mpe.data.getProjects('bookmarks')).to.include('MPE_key-bookmarksRome');
      expect(mpe.data.getCurrKeyPj('bookmarks')).to.equal('MPE_key-bookmarksRome');
    });

    it('creates nothing when the name dialog is closed', async () => {
      promptText.resolves(undefined);

      expect(await block('New project').action()).to.be.undefined;

      expect(mpe.data.getProjects('bookmarks')).to.have.length(1);
    });

    it('lets the name dialog refuse an empty, an invalid or an existing name', async () => {
      promptText.resolves(undefined);
      await block('New project').action();
      const { validate } = promptText.firstCall.args[0];

      expect(validate('')).to.equal('Enter a name');
      expect(validate('R@me')).to.match(/^Invalid name/);
      expect(validate('Paris north')).to.equal('"Paris north" already exists');
      expect(validate('Rome')).to.be.true;
      expect(() => mpe.action.createProject('bookmarks', ' Paris north ')).to.throw('"Paris north" already exists');
    });

    it('clears the default project instead of deleting it', () => {
      const [standard, paris] = list();
      const action = inner('action');
      expect([action.title(standard), action.icon(standard)]).to.deep.equal(['Clear', 'delete_sweep']);
      expect([action.title(paris), action.icon(paris)]).to.deep.equal(['Delete', 'delete']);
      localStorage.setItem('key-bookmarks', '{"portals":{}}');
      globalThis.confirm = () => true;

      expect(action.action(standard)).to.equal('Cleared');

      expect(localStorage.getItem('key-bookmarks')).to.be.null;
      expect(list().map((project) => project.id)).to.deep.equal(['key-bookmarks', paris.id]);
      expect(mpe.data.getCurrKeyPj('bookmarks')).to.equal('key-bookmarks');
      expect(mpe.obj.projects.bookmarks.func_post.called).to.be.true;
    });

    it('uses only icons of the bundled font', () => {
      const bundled = readFileSync(new URL('../../core/icons/icons.txt', import.meta.url), 'utf8')
        .split('\n')
        .map((line) => line.replace(/#.*/, '').trim())
        .filter(Boolean);
      const icons = [page().shortcut.icon, ...list().map((project) => inner('action').icon(project))];

      expect(bundled).to.include.members(icons);
    });

    it('deletes a project once confirmed, keeping the one in use', () => {
      const [, paris] = list();

      globalThis.confirm = () => false;
      expect(inner('action').action(paris)).to.be.undefined;
      expect(mpe.data.getProjects('bookmarks')).to.have.length(1);

      globalThis.confirm = () => true;
      expect(inner('action').action(paris)).to.equal('Deleted');

      expect(mpe.data.getProjects('bookmarks')).to.be.empty;
      expect(localStorage.getItem(paris.id)).to.be.null;
      expect(mpe.data.getCurrKeyPj('bookmarks')).to.equal('key-bookmarks');
      expect(mpe.obj.projects.bookmarks.func_setKey.called).to.be.false;
      // so sync of the plugin data learns that the project is gone
      expect(window.runHooks.calledWithMatch('mpe', { event: 'delete', data: { namespace: 'bookmarks', deletedStorage: paris.id } })).to.be.true;
    });

    it('switches to the default project when the one in use is deleted', () => {
      const [, paris] = list();
      inner('choice').action(paris);
      globalThis.confirm = () => true;

      inner('action').action(paris);

      expect(mpe.data.getCurrKeyPj('bookmarks')).to.equal('key-bookmarks');
      expect(window.runHooks.calledWithMatch('mpe', { event: 'switch', data: { prevStorage: paris.id, currentStorage: 'key-bookmarks' } })).to.be.true;
    });
  });

  it('shows a plugin in the sidebar by its setting', () => {
    register('bookmarks');
    expect(mpe.data.isInSidebar('bookmarks')).to.be.false;

    settings.set('mpe.sidebar_bookmarks', true);

    expect(mpe.data.isInSidebar('bookmarks')).to.be.true;
  });

  it('moves the sidebar flag of a plugin from plugin-mpe to its setting, and drops the manager list', () => {
    localStorage.setItem('plugin-mpe', JSON.stringify({ settings: { manager: ['bookmarks'], sidebar: ['bookmarks', 'other'], current: {} } }));
    mpe.storage.checkStorage();

    register('bookmarks');

    expect(settings.get('mpe.sidebar_bookmarks')).to.be.true;
    expect(JSON.parse(localStorage.getItem('plugin-mpe'))).to.deep.equal({ settings: { sidebar: ['other'], current: {} } });
  });
});
