import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC, L */
/* eslint-disable no-unused-expressions */

// the Leaflet classes utils_file.js extends at load time; specs replace the loader they use
L.Evented ??= {
  extend: (props) => {
    const Class = function () {};
    Object.assign(Class.prototype, props);
    return Class;
  },
};

await import('../core/code/utils.js');
await import('../core/code/utils_file.js');
await import('../core/code/_deprecated.js');

describe('IITC.utils export and import', () => {
  let dialog;
  let replaced;
  let replacedJQueryDialog;

  beforeEach(() => {
    replaced = { dialog: window.dialog, isApp: window.isApp, app: window.app, saveFile: window.saveFile };
    replacedJQueryDialog = $.fn.dialog;
    dialog = sinon.spy();
    window.dialog = dialog;
    window.isApp = false;
    window.app = undefined;
  });

  afterEach(() => {
    Object.assign(window, replaced);
    $.fn.dialog = replacedJQueryDialog;
    sinon.restore();
  });

  describe('exportText', () => {
    afterEach(() => {
      delete navigator.clipboard;
    });

    it('shares the text in the app', () => {
      window.isApp = true;
      window.app = { shareString: sinon.spy() };

      IITC.utils.exportText('data');

      expect(window.app.shareString.calledOnceWith('data')).to.be.true;
      expect(dialog.called).to.be.false;
    });

    it('shows the text in a dialog elsewhere', () => {
      IITC.utils.exportText('data', { title: 'Export drawn items' });

      const options = dialog.firstCall.args[0];
      expect(options.title).to.equal('Export drawn items');
      expect(options.html.value).to.equal('data');
      expect(options.html.readOnly).to.be.true;
    });

    it('copies the text to the clipboard', async () => {
      const writeText = sinon.stub().resolves();
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      IITC.utils.exportText('data');
      const button = document.createElement('button');

      dialog.firstCall.args[0].buttons.Copy({ currentTarget: button });
      await Promise.resolve();

      expect(writeText.calledOnceWith('data')).to.be.true;
      expect(button.textContent).to.equal('Copied');
    });

    it('leaves the text selected where the clipboard is not available', () => {
      IITC.utils.exportText('data');
      const textarea = dialog.firstCall.args[0].html;
      document.body.append(textarea);
      const button = document.createElement('button');

      dialog.firstCall.args[0].buttons.Copy({ currentTarget: button });

      expect(textarea.selectionStart).to.equal(0);
      expect(textarea.selectionEnd).to.equal(4);
      expect(button.textContent).to.equal('Press Ctrl+C');
      textarea.remove();
    });

    it('asks to copy by hand when the clipboard refuses', async () => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: sinon.stub().rejects(new Error('denied')) }, configurable: true });
      IITC.utils.exportText('data');
      const button = document.createElement('button');

      dialog.firstCall.args[0].buttons.Copy({ currentTarget: button });
      await new Promise((resolve) => setTimeout(resolve));

      expect(button.textContent).to.equal('Press Ctrl+C');
    });

    it('opens every export in the same dialog', () => {
      IITC.utils.exportText('a');
      IITC.utils.exportText('b');

      expect(dialog.firstCall.args[0].id).to.equal('iitc-export-text');
      expect(dialog.secondCall.args[0].id).to.equal('iitc-export-text');
    });
  });

  describe('importText', () => {
    it('resolves with the text on OK', async () => {
      $.fn.dialog = sinon.spy();
      const text = IITC.utils.importText({ title: 'Import drawn items' });
      const options = dialog.firstCall.args[0];
      options.html.querySelector('textarea').value = '  {"a":1}\n';

      options.buttons.OK.call(document.createElement('div'));

      expect(options.title).to.equal('Import drawn items');
      expect(await text).to.equal('{"a":1}');
      expect($.fn.dialog.calledOnceWith('close')).to.be.true;
    });

    it('resolves with undefined when the dialog is closed', async () => {
      const text = IITC.utils.importText();

      dialog.firstCall.args[0].closeCallback();

      expect(await text).to.be.undefined;
    });

    it('resolves with undefined when nothing was entered', async () => {
      $.fn.dialog = sinon.spy();
      const text = IITC.utils.importText();
      const options = dialog.firstCall.args[0];
      options.html.querySelector('textarea').value = ' \n';

      options.buttons.OK.call(document.createElement('div'));

      expect(await text).to.be.undefined;
    });

    it('opens every import in the same dialog', () => {
      IITC.utils.importText();
      IITC.utils.importText();

      expect(dialog.firstCall.args[0].id).to.equal('iitc-import-text');
      expect(dialog.secondCall.args[0].id).to.equal('iitc-import-text');
    });

    it('keeps the text when the dialog closes after OK', async () => {
      $.fn.dialog = sinon.spy();
      const text = IITC.utils.importText();
      const options = dialog.firstCall.args[0];
      options.html.querySelector('textarea').value = 'data';

      options.buttons.OK.call(document.createElement('div'));
      options.closeCallback();

      expect(await text).to.equal('data');
    });
  });

  describe('exportFile', () => {
    it('downloads the file in the browser', async () => {
      const blobs = [];
      sinon.stub(URL, 'createObjectURL').callsFake((blob) => {
        blobs.push(blob);
        return 'blob:items';
      });
      sinon.stub(URL, 'revokeObjectURL');
      const clicked = [];
      sinon.stub(document.defaultView.HTMLAnchorElement.prototype, 'click').callsFake(function () {
        clicked.push({ href: this.href, download: this.download });
      });

      IITC.utils.exportFile('data', 'items.json', 'application/json');

      expect(clicked).to.deep.equal([{ href: 'blob:items', download: 'items.json' }]);
      expect(blobs[0].type).to.equal('application/json');
      expect(await blobs[0].text()).to.equal('data');
      expect(URL.revokeObjectURL.calledOnceWith('blob:items')).to.be.true;
    });

    it('lets the app save the file, with defaults for what is not given', () => {
      window.app = { saveFile: sinon.spy() };

      IITC.utils.exportFile('data');

      expect(window.app.saveFile.calledOnceWith('', '*/*', 'data')).to.be.true;
    });

    it('is what the deprecated window.saveFile calls', () => {
      sinon.stub(IITC.utils, 'exportFile');

      window.saveFile('data', 'items.json', 'application/json');

      expect(IITC.utils.exportFile.calledOnceWith('data', 'items.json', 'application/json')).to.be.true;
    });
  });

  describe('importFile', () => {
    let replacedLoader;
    let loader;

    beforeEach(() => {
      replacedLoader = L.FileListLoader;
      const handlers = {};
      loader = {
        handlers,
        on(type, handler) {
          handlers[type] = handler;
          return this;
        },
      };
      L.FileListLoader = { loadFiles: sinon.stub().returns(loader) };
    });

    afterEach(() => {
      L.FileListLoader = replacedLoader;
    });

    it('resolves with the name and text of every file read', async () => {
      const files = IITC.utils.importFile({ accept: 'application/json', multiple: true });

      loader.handlers.load({ file: { name: 'a.json' }, reader: { result: '{}' } });
      loader.handlers.load({ file: { name: 'b.json' }, reader: { result: '[]' } });
      loader.handlers.loaded();

      expect(L.FileListLoader.loadFiles.calledOnceWith({ accept: 'application/json', multiple: true })).to.be.true;
      expect(await files).to.deep.equal([
        { name: 'a.json', text: '{}' },
        { name: 'b.json', text: '[]' },
      ]);
    });

    it('leaves accept out when no types are given', () => {
      IITC.utils.importFile();

      expect(L.FileListLoader.loadFiles.firstCall.args[0]).to.deep.equal({ multiple: false });
    });
  });
});
