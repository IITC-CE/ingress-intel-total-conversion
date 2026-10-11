import { describe, it, before, after, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

await import('../core/code/settings.js');
await import('../core/code/settings_render.js');
await import('../core/code/dialog_about.js');
await import('../core/code/_deprecated.js');

const settings = IITC.settings;

// the page's blocks with their display properties worked out, as the window draws them
const shown = () =>
  settings._pages.about.blocks.map((block) => {
    const result = { ...block };
    for (const name of ['text', 'items', 'visible']) {
      if (typeof block[name] === 'function') result[name] = block[name]();
    }
    return result;
  });

const plugins = () => shown().at(-1).items;

describe('About IITC page', () => {
  let replaced;

  before(() => {
    IITC.about.setup();
  });

  after(() => {
    delete settings._pages.about;
  });

  beforeEach(() => {
    replaced = { script_info: window.script_info, bootPlugins: window.bootPlugins, isApp: window.isApp, app: window.app };
    window.script_info = {
      buildName: 'release',
      dateTimeVersion: '20260101.000000',
      script: { version: '0.42.0.20260101.000000' },
      changelog: [{ version: '0.42.0', changes: ['Settings window'] }],
    };
    window.bootPlugins = [];
    window.bootPlugins.info = [];
    window.isApp = false;
  });

  afterEach(() => {
    Object.assign(window, replaced);
    sinon.restore();
  });

  it('has a toolbox shortcut named after the page', () => {
    expect(settings._pages.about.shortcut).to.deep.equal({ class: 'cursor_help' });
  });

  it('shows the IITC version and its changelog', () => {
    const [version, , , , , , changelog] = shown();

    expect(version.text).to.equal('Ingress Intel Total Conversion 0.42.0.20260101.000000 [release]');
    expect(changelog.items).to.deep.equal([{ title: 'Changelog', items: [{ title: '0.42.0', items: [{ title: 'Settings window' }] }], collapsed: true }]);
  });

  it('shows the version of the app only in the app', () => {
    expect(shown()[1].visible).to.be.false;

    window.isApp = true;
    window.app = { getVersionName: () => '0.42.0' };

    expect(shown()[1].visible).to.be.true;
    expect(shown()[1].text).to.equal('IITC Mobile 0.42.0');
  });

  it('warns when localStorage is almost full', () => {
    expect(shown()[2].visible).to.be.false;

    sinon.stub(globalThis.log, 'error');
    sinon.stub(document.defaultView.Storage.prototype, 'setItem').throws(new Error('QuotaExceededError'));

    expect(shown()[2].visible).to.be.true;
  });

  it('lists the plugins by name, standard ones as secondary and failed ones as such', () => {
    window.bootPlugins.info.push(
      {
        buildName: 'release',
        dateTimeVersion: '20260101.000000',
        script: { name: 'IITC plugin: Zoom', version: '0.1.0.20260101.000000', description: 'Zooms' },
        changelog: [{ version: '0.1.0', changes: ['First'] }],
      },
      { script: { name: 'IITC plugin: Broken', version: '1.0', description: 'Breaks' }, error: new Error('boom') },
      { script: { name: 'Another plugin', version: '2.0' } }
    );

    expect(plugins()).to.deep.equal([
      { title: 'Another plugin', badge: '2.0', tooltip: undefined, state: undefined, items: undefined, collapsed: true },
      { title: 'Broken', badge: '1.0', tooltip: 'Error: boom', state: 'error', items: undefined, collapsed: true },
      {
        title: 'Zoom',
        badge: '0.1.0',
        tooltip: 'Zooms\n[release] 20260101.000000',
        state: 'muted',
        items: [{ title: '0.1.0', items: [{ title: 'First' }] }],
        collapsed: true,
      },
    ]);
  });

  it('lists plugins that have not run their setup yet', () => {
    window.bootPlugins.push({ info: { script: { name: 'Late', version: '1' } } });

    expect(plugins().map((plugin) => plugin.title)).to.deep.equal(['Late']);
    expect(window.bootPlugins).to.be.empty;
  });

  it('names plugins without a proper wrapper by their position', () => {
    expect(IITC.about._convertPluginInfo({}, 3)).to.include({ name: '[unknown plugin: index 3]' });
    window.script_info.script = undefined;
    expect(IITC.about._convertPluginInfo({}, 3)).to.include({ name: '[3rd-party plugin: index 3]' });
  });

  it('draws without errors outside the app', () => {
    const warn = sinon.spy(globalThis.log, 'warn');
    window.bootPlugins.info.push({ script: { name: 'Zoom', version: '1' } });
    const container = document.createElement('div');
    document.body.append(container);

    settings._renderPage('about', container);

    expect(warn.called).to.be.false;
    expect(container.querySelector('.iitc-settings-text').textContent).to.equal('Ingress Intel Total Conversion 0.42.0.20260101.000000 [release]');
    expect(container.querySelectorAll('.iitc-settings-link')).to.have.lengthOf(2);
    container.remove();
  });

  it('is what the deprecated window.aboutIITC opens', () => {
    const open = sinon.stub();
    const replacedOpen = settings.open;
    settings.open = open;
    try {
      window.aboutIITC();
    } finally {
      settings.open = replacedOpen;
    }

    expect(open.calledOnceWith('about')).to.be.true;
  });
});
