import { describe, it, before, after, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

await import('../core/code/hooks.js');
// taken before any test runs, so no spy another spec leaves on window.runHooks gets in the way
const realRunHooks = window.runHooks;
await import('../core/code/settings.js');
await import('../core/code/settings_general.js');
await import('../core/code/settings_render.js');
await import('../core/code/settings_window.js');

const settings = IITC.settings;
const view = settings._view;

// lets scheduled redraws run
const settle = () => new Promise((resolve) => setTimeout(resolve));

const click = (element) => element.dispatchEvent(new document.defaultView.MouseEvent('click'));

// the label text of a nav entry, without what the search found
const navTitles = () => [...view.root.querySelectorAll('.iitc-settings-page-title')].map((title) => title.textContent);
const navLink = (pageId) => view.root.querySelector(`.iitc-settings-page-link[data-page="${pageId}"]`);

describe('settings window', () => {
  let dialogs;
  let replaced;
  let replacedUtils;

  before(() => {
    settings.register('about', { title: 'About IITC', blocks: [{ type: 'text', text: 'Version 1' }] });
    settings.register('window-zeta', { title: 'Zeta', blocks: [{ type: 'boolean', key: 'flag', title: 'Show quokka portals' }] });
    settings.register('window-alpha', {
      title: 'Alpha',
      blocks: [
        { type: 'string', key: 'name', title: 'Name', description: 'Quokkas shown on the map' },
        { type: 'text', text: () => `Name is ${settings.get('window-alpha.name')}` },
        { type: 'text', text: 'Wombats: 42 seen' },
        { type: 'text', text: `Numbats ${'and more numbats '.repeat(10)}` },
      ],
    });
  });

  beforeEach(() => {
    localStorage.clear();
    dialogs = [];
    replaced = { dialog: window.dialog, runHooks: window.runHooks, show: window.show, currentPane: window.currentPane };
    window.runHooks = realRunHooks;
    replacedUtils = IITC.utils;
    IITC.utils = { ...IITC.utils, isSmartphone: () => false };
    window.dialog = (options) => {
      document.body.append(options.html);
      const dialog = { options, dialog: sinon.spy() };
      dialogs.push(dialog);
      return dialog;
    };
  });

  afterEach(() => {
    // closes the window as the dialog would
    if (view.dialog) {
      view.root?.remove();
      view.dialog.options.closeCallback();
    }
    view.root?.remove();
    view.root = null;
    view.pageId = undefined;
    view.query = '';
    if ('toolbox' in replaced) IITC.toolbox = replaced.toolbox;
    delete replaced.toolbox;
    Object.assign(window, replaced);
    IITC.utils = replacedUtils;
    sinon.restore();
  });

  // the pages and settings of this spec leave the process shared with the other specs
  const forget = (...pageIds) => {
    for (const pageId of pageIds) {
      delete settings._pages[pageId];
      document.getElementById(`settings-access-key-${pageId}`)?.remove();
      for (const key of Object.keys(settings._definitions)) {
        if (settings._definitions[key].pageId === pageId) delete settings._definitions[key];
      }
    }
  };

  after(() => {
    forget('about', 'window-zeta', 'window-alpha');
  });

  it('lists IITC and About first, then the other pages by title', () => {
    const ids = settings._pageIds();
    expect(ids.slice(0, 2)).to.deep.equal(['iitc', 'about']);
    expect(ids.indexOf('window-alpha')).to.be.below(ids.indexOf('window-zeta'));
  });

  it('opens a dialog on the first page, with the list in front in a narrow window', () => {
    expect(settings.open()).to.be.true;

    expect(dialogs).to.have.lengthOf(1);
    expect(dialogs[0].options.title).to.equal('Settings');
    // the OK button that closes the window, as in other dialogs
    expect(dialogs[0].options).to.not.have.property('buttons');
    expect(navTitles().slice(0, 2)).to.deep.equal(['IITC', 'About IITC']);
    expect(navLink('iitc').getAttribute('aria-current')).to.equal('page');
    expect(view.root.querySelector('.iitc-settings-page-heading').textContent).to.equal('IITC');
    expect(view.root.querySelector('.iitc-settings-content [data-page="iitc"]')).to.exist;
    expect(view.root.dataset.view).to.equal('list');
  });

  it('gives the dialog a fixed height, lower on a lower screen', () => {
    replaced.innerHeight = window.innerHeight;
    window.innerHeight = 900;
    settings.open();
    expect(dialogs[0].options.height).to.equal(560);

    view.root.remove();
    view.dialog.options.closeCallback();
    window.innerHeight = 400;
    settings.open();
    expect(dialogs[1].options.height).to.equal(384);
  });

  it('opens on a given page, in front of the list', () => {
    settings.open('window-alpha');

    expect(view.root.querySelector('.iitc-settings-page-heading').textContent).to.equal('Alpha');
    expect(view.root.dataset.view).to.equal('page');
  });

  it('refuses a page that is not registered', () => {
    sinon.stub(globalThis.log, 'warn');
    expect(settings.open('no-such-page')).to.be.false;
    expect(dialogs).to.be.empty;
  });

  it('shows the page chosen in the list, and goes back to the list', () => {
    settings.open();

    const zetaLink = navLink('window-zeta');
    click(zetaLink);
    expect(view.root.querySelector('.iitc-settings-page-heading').textContent).to.equal('Zeta');
    expect(navLink('window-zeta')).to.equal(zetaLink);
    expect(zetaLink.getAttribute('aria-current')).to.equal('page');
    expect(navLink('iitc').hasAttribute('aria-current')).to.be.false;
    expect(view.root.dataset.view).to.equal('page');

    click(view.root.querySelector('.iitc-settings-back'));
    expect(view.root.dataset.view).to.equal('list');
  });

  it('moves to another page in the open window instead of opening a second one', () => {
    settings.open();
    settings.open('window-zeta');

    expect(dialogs).to.have.lengthOf(1);
    expect(dialogs[0].dialog.calledWith('moveToTop')).to.be.true;
    expect(view.root.querySelector('.iitc-settings-page-heading').textContent).to.equal('Zeta');
  });

  it('shows another page from its top, and keeps the place on the same page', () => {
    settings.open();
    const content = view.root.querySelector('.iitc-settings-content');

    content.scrollTop = 50;
    click(navLink(view.pageId));
    expect(content.scrollTop).to.equal(50);

    click(navLink('window-zeta'));
    expect(content.scrollTop).to.equal(0);

    content.scrollTop = 50;
    settings.open('iitc');
    expect(content.scrollTop).to.equal(0);
  });

  it('opens again on the page chosen last', () => {
    settings.open('window-zeta');
    view.root.remove();
    view.dialog.options.closeCallback();

    settings.open();

    expect(view.root.querySelector('.iitc-settings-page-heading').textContent).to.equal('Zeta');
  });

  describe('search', () => {
    const type = (text) => {
      const input = view.root.querySelector('.iitc-settings-search');
      input.value = text;
      input.dispatchEvent(new document.defaultView.Event('input'));
    };

    it('lists the pages whose title or texts match, with what was found', () => {
      settings.open();

      type('QUOKKA');

      expect(navTitles()).to.deep.equal(['Alpha', 'Zeta']);
      expect(navLink('window-alpha').querySelector('.iitc-settings-found').textContent).to.equal('Quokkas shown on the map');

      type('about iitc');
      expect(navTitles()).to.deep.equal(['About IITC']);
      expect(navLink('about').querySelector('.iitc-settings-found')).to.be.null;
    });

    it('finds texts of the blocks, and shortens long ones', () => {
      settings.open();

      type('42 seen');
      expect(navLink('window-alpha').querySelector('.iitc-settings-found').textContent).to.equal('Wombats: 42 seen');

      type('numbats');
      const found = navLink('window-alpha').querySelector('.iitc-settings-found').textContent;
      expect(found).to.have.lengthOf(80);
      expect(found.endsWith('…')).to.be.true;
    });

    it('clears the search on Escape instead of closing the window', () => {
      settings.open();
      type('quokka');
      const input = view.root.querySelector('.iitc-settings-search');
      const closed = sinon.spy();
      view.root.parentElement.addEventListener('keydown', closed);

      input.dispatchEvent(new document.defaultView.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(input.value).to.equal('');
      expect(navTitles()).to.include('Zeta').and.include('IITC');
      expect(closed.called).to.be.false;

      input.dispatchEvent(new document.defaultView.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(closed.calledOnce).to.be.true;
      view.root.parentElement.removeEventListener('keydown', closed);
    });

    it('says when nothing matches', () => {
      settings.open();

      type('no such words');

      expect(view.root.querySelector('.iitc-settings-nothing').textContent).to.equal('Nothing found');
    });

    it('keeps the page shown while searching', () => {
      settings.open('window-zeta');

      type('alpha');

      expect(view.root.querySelector('.iitc-settings-page-heading').textContent).to.equal('Zeta');
    });
  });

  describe('focus', () => {
    let narrow;

    afterEach(() => {
      narrow?.remove();
      narrow = undefined;
    });

    // what the container query does to a narrow window
    const makeNarrow = () => {
      narrow = document.createElement('style');
      narrow.textContent = ".iitc-settings[data-view='page'] > .iitc-settings-nav, .iitc-settings[data-view='list'] > .iitc-settings-detail { display: none; }";
      document.head.append(narrow);
    };

    it('stays on the page chosen in the list, and on a page in the list when it is drawn again', () => {
      settings.open();
      navLink('window-zeta').focus();

      click(navLink('window-zeta'));
      expect(document.activeElement).to.equal(navLink('window-zeta'));

      // a page registered draws the list again
      settings.register('window-nav', { title: 'Nav', blocks: [] });
      forget('window-nav');
      expect(document.activeElement).to.equal(navLink('window-zeta'));
    });

    it('moves to the way back in a narrow window, and back to the page in the list', () => {
      makeNarrow();
      settings.open();
      navLink('window-zeta').focus();

      click(navLink('window-zeta'));
      expect(document.activeElement).to.equal(view.root.querySelector('.iitc-settings-back'));

      click(view.root.querySelector('.iitc-settings-back'));
      expect(document.activeElement).to.equal(navLink('window-zeta'));
    });
  });

  describe('updates', () => {
    it('draws the page again when a setting changes elsewhere', async () => {
      settings.open('window-alpha');

      settings.set('window-alpha.name', 'remote', { source: 'remote' });
      await settle();

      expect(view.root.querySelector('.iitc-settings-text').textContent).to.equal('Name is remote');
    });

    it('lists a page registered while the window is open', () => {
      settings.open();

      settings.register('window-late', { title: 'Late', blocks: [] });

      expect(navTitles()).to.include('Late');
      forget('window-late');
    });

    it('follows a new title of the page shown', () => {
      settings.register('window-renamed', { title: 'Old', blocks: [] });
      settings.open('window-renamed');

      settings.register('window-renamed', { title: 'New', blocks: [] });

      expect(view.root.querySelector('.iitc-settings-page-heading').textContent).to.equal('New');
      forget('window-renamed');
    });

    it('leaves the page alone when a setting of another page changes', async () => {
      settings.open('window-alpha');
      const drawn = view.root.querySelector('.iitc-settings-page');

      settings.set('window-zeta.flag', true, { source: 'remote' });
      await settle();

      expect(view.root.querySelector('.iitc-settings-page')).to.equal(drawn);
    });

    it('draws the shown page again on refresh after the current task, and only that page', async () => {
      settings.open('window-alpha');
      const drawn = view.root.querySelector('.iitc-settings-page');

      settings.refresh('window-zeta');
      await settle();
      expect(view.root.querySelector('.iitc-settings-page')).to.equal(drawn);

      settings.refresh('window-alpha');
      expect(view.root.querySelector('.iitc-settings-page')).to.equal(drawn);
      await settle();
      expect(view.root.querySelector('.iitc-settings-page')).to.not.equal(drawn);
    });
  });

  describe('toolbox shortcuts', () => {
    let replacedToolbox;

    beforeEach(() => {
      replacedToolbox = IITC.toolbox;
      const buttons = {};
      IITC.toolbox = {
        buttons,
        addButton: sinon.spy((button) => {
          buttons[button.id] = button;
        }),
        removeButton: (id) => delete buttons[id],
      };
    });

    afterEach(() => {
      IITC.toolbox = replacedToolbox;
      forget('window-shortcut', 'window-plain');
    });

    it('adds a button for a page that asks for one', () => {
      settings.register('window-shortcut', { title: 'Shortcut', shortcut: { label: 'Shortcut Opt' }, blocks: [] });
      settings.register('window-plain', { title: 'Plain', blocks: [] });

      expect(Object.keys(IITC.toolbox.buttons)).to.deep.equal(['settings-shortcut-window-shortcut']);
      const button = IITC.toolbox.buttons['settings-shortcut-window-shortcut'];
      expect(button).to.include({ label: 'Shortcut Opt' });

      button.action();
      expect(view.root.querySelector('.iitc-settings-page-heading').textContent).to.equal('Shortcut');
    });

    it('names the button after the page by default', () => {
      settings.register('window-shortcut', { title: 'Shortcut', shortcut: true, blocks: [] });

      expect(IITC.toolbox.buttons['settings-shortcut-window-shortcut'].label).to.equal('Shortcut');
    });

    it('passes the other arguments of the button through', () => {
      settings.register('window-shortcut', { title: 'Shortcut', shortcut: { class: 'cursor_help', icon: 'info', title: 'More' }, blocks: [] });

      expect(IITC.toolbox.buttons['settings-shortcut-window-shortcut']).to.include({ label: 'Shortcut', class: 'cursor_help', icon: 'info', title: 'More' });
    });

    it('updates a button that shows state on refresh, and only when it changes', () => {
      let failed = false;
      settings.register('window-shortcut', { title: 'Shortcut', shortcut: () => ({ class: failed ? 'error' : '' }), blocks: [] });
      expect(IITC.toolbox.buttons['settings-shortcut-window-shortcut'].class).to.equal('');

      IITC.toolbox.addButton.resetHistory();
      settings.refresh('window-shortcut');
      expect(IITC.toolbox.addButton.called).to.be.false;

      failed = true;
      settings.refresh('window-shortcut');
      expect(IITC.toolbox.buttons['settings-shortcut-window-shortcut'].class).to.equal('error');
      expect(IITC.toolbox.addButton.calledOnce).to.be.true;
    });

    it('drops the arguments a shortcut function no longer returns', () => {
      let titled = true;
      settings.register('window-shortcut', { title: 'Shortcut', shortcut: () => (titled ? { title: 'a' } : {}), blocks: [] });

      titled = false;
      settings.refresh('window-shortcut');

      expect(IITC.toolbox.buttons['settings-shortcut-window-shortcut']).to.not.have.property('title');
    });

    it('leaves out the button of a page whose shortcut fails', () => {
      sinon.stub(globalThis.log, 'warn');
      settings.register('window-shortcut', {
        title: 'Shortcut',
        shortcut: () => {
          throw new Error('not ready');
        },
        blocks: [],
      });

      expect(IITC.toolbox.buttons).to.not.have.property('settings-shortcut-window-shortcut');
    });

    it('removes and adds back the buttons with the setting', () => {
      settings.register('window-shortcut', { title: 'Shortcut', shortcut: true, blocks: [] });

      settings.set('iitc.toolboxShortcuts', false);
      expect(IITC.toolbox.buttons).to.be.empty;

      // pages of other specs in this process may come back too
      settings.set('iitc.toolboxShortcuts', true);
      expect(IITC.toolbox.buttons).to.have.property('settings-shortcut-window-shortcut');
    });

    it('puts the access key of the page on its button, and in the tooltip', () => {
      settings.register('window-shortcut', { title: 'Shortcut', accesskey: 's', shortcut: { title: 'More' }, blocks: [] });
      settings.register('window-plain', { title: 'Plain', accesskey: 'p', shortcut: true, blocks: [] });

      expect(IITC.toolbox.buttons['settings-shortcut-window-shortcut']).to.include({ accesskey: 's', title: 'More [s]' });
      expect(IITC.toolbox.buttons['settings-shortcut-window-plain']).to.include({ accesskey: 'p', title: '[p]' });
      expect(document.getElementById('settings-access-key-window-shortcut')).to.be.null;
    });

    it('keeps the access key of a page working without its button', () => {
      settings.register('window-shortcut', { title: 'Shortcut', accesskey: 's', shortcut: true, blocks: [] });
      settings.register('window-plain', { title: 'Plain', accesskey: 'p', blocks: [] });

      settings.set('iitc.toolboxShortcuts', false);
      const link = document.getElementById('settings-access-key-window-shortcut');
      expect(link.accessKey).to.equal('s');
      expect(link.closest('.iitc-settings-access-keys').getAttribute('aria-hidden')).to.equal('true');
      expect(document.getElementById('settings-access-key-window-plain').accessKey).to.equal('p');

      click(link);
      expect(view.root.querySelector('.iitc-settings-page-heading').textContent).to.equal('Shortcut');

      settings.set('iitc.toolboxShortcuts', true);
      expect(document.getElementById('settings-access-key-window-shortcut')).to.be.null;
      expect(IITC.toolbox.buttons['settings-shortcut-window-shortcut'].accesskey).to.equal('s');
    });

    it('tells the access key of a page in the list of pages', () => {
      settings.register('window-shortcut', { title: 'Shortcut', accesskey: 's', blocks: [] });
      settings.register('window-plain', { title: 'Plain', blocks: [] });

      settings.open('window-shortcut');

      expect(navLink('window-shortcut').title).to.equal('Access key [s]');
      expect(navLink('window-plain').hasAttribute('title')).to.be.false;
    });

    it('drops the hidden link when the page no longer has an access key', () => {
      settings.register('window-plain', { title: 'Plain', accesskey: 'p', blocks: [] });
      settings.register('window-plain', { title: 'Plain', blocks: [] });

      expect(document.getElementById('settings-access-key-window-plain')).to.be.null;
    });

    it('follows a new declaration of the page', () => {
      settings.register('window-shortcut', { title: 'Shortcut', shortcut: true, blocks: [] });
      settings.register('window-shortcut', { title: 'Renamed', shortcut: true, blocks: [] });
      expect(IITC.toolbox.buttons['settings-shortcut-window-shortcut'].label).to.equal('Renamed');

      settings.register('window-shortcut', { title: 'Renamed', blocks: [] });
      expect(IITC.toolbox.buttons).to.be.empty;
    });
  });

  describe('on a smartphone', () => {
    beforeEach(() => {
      IITC.utils.isSmartphone = () => true;
      window.show = sinon.spy((pane) => {
        window.currentPane = pane;
      });
    });

    it('opens the window as a dialog over the map, coming from another pane', () => {
      window.currentPane = 'info';

      settings.open('window-zeta');

      expect(window.show.calledOnceWith('map')).to.be.true;
      expect(dialogs).to.have.lengthOf(1);
      expect(view.root.dataset.view).to.equal('page');
    });

    it('leaves the search unfocused, so the keyboard stays closed', () => {
      // focuses the first field, as the dialog does
      const dialog = window.dialog;
      window.dialog = (options) => {
        const opened = dialog(options);
        options.html.querySelector('input').focus();
        return opened;
      };

      settings.open();
      expect(document.activeElement).to.not.equal(view.root.querySelector('.iitc-settings-search'));

      view.root.remove();
      view.dialog.options.closeCallback();
      IITC.utils.isSmartphone = () => false;
      settings.open();
      expect(document.activeElement).to.equal(view.root.querySelector('.iitc-settings-search'));
    });

    it('stays on the map when it is shown already', () => {
      window.currentPane = 'map';

      settings.open();

      expect(window.show.called).to.be.false;
      expect(dialogs).to.have.lengthOf(1);
    });
  });
});
