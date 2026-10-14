import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

await import('../core/code/settings.js');
await import('../core/code/settings_render.js');

const settings = IITC.settings;

// every test declares its own page
let pageCount = 0;
const page = (blocks) => {
  const id = `render-page-${++pageCount}`;
  settings.register(id, { title: 'Test', blocks });
  return id;
};

// lets pending handlers and the redraw after them run
const settle = () => new Promise((resolve) => setTimeout(resolve));

// lets the files chosen be read: they are read in a task of their own after the press
const read = async () => {
  await settle();
  await settle();
};

const change = (input, value) => {
  if (input.type === 'checkbox') input.checked = value;
  else input.value = value;
  input.dispatchEvent(new document.defaultView.Event('change'));
};

const click = (button) => button.dispatchEvent(new document.defaultView.MouseEvent('click'));

const buttons = (container) => Object.fromEntries([...container.querySelectorAll('button')].map((button) => [button.textContent, button]));

describe('IITC.settings._renderPage', () => {
  let container;
  let replacedUtils;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.append(container);
    replacedUtils = IITC.utils;
    IITC.utils = { exportText: sinon.spy(), exportFile: sinon.spy(), importText: sinon.stub(), importFile: sinon.stub() };
  });

  afterEach(() => {
    container.remove();
    IITC.utils = replacedUtils;
    sinon.restore();
  });

  it('refuses a page that is not registered', () => {
    const warn = sinon.spy(globalThis.log, 'warn');
    expect(settings._renderPage('no-such-page', container)).to.be.false;
    expect(warn.calledWithMatch('no page "no-such-page"')).to.be.true;
  });

  describe('fields', () => {
    it('shows the current value of every field', () => {
      const id = page([
        { type: 'boolean', key: 'b', title: 'Flag', default: true },
        { type: 'number', key: 'n', title: 'Delay', default: 30 },
        { type: 'string', key: 's', title: 'Name', default: 'ap' },
        {
          type: 'select',
          key: 'sel',
          title: 'Mode',
          options: [
            { value: 1, label: 'One' },
            { value: 2, label: 'Two' },
          ],
          default: 2,
        },
        { type: 'color', key: 'c', title: 'Color', default: '#a24ac3' },
      ]);

      settings._renderPage(id, container);

      const [flag, delay, name, color] = container.querySelectorAll('input');
      expect(flag.checked).to.be.true;
      expect(delay.value).to.equal('30');
      expect(name.value).to.equal('ap');
      const select = container.querySelector('select');
      expect(select.options[select.selectedIndex].textContent).to.equal('Two');
      expect(color.value).to.equal('#a24ac3');
    });

    it('labels every field with its title', () => {
      const id = page([{ type: 'boolean', key: 'b', title: 'Flag', description: 'More about the flag' }]);

      settings._renderPage(id, container);

      const label = container.querySelector('label');
      expect(label.textContent).to.equal('FlagMore about the flag');
      expect(document.getElementById(label.htmlFor)).to.equal(container.querySelector('input'));
    });

    it('stores a changed value and draws the page again', async () => {
      const id = page([
        { type: 'boolean', key: 'b', title: 'Flag' },
        { type: 'text', text: () => (settings.get(`${id}.b`) ? 'on' : 'off') },
      ]);
      settings._renderPage(id, container);

      change(container.querySelector('input'), true);
      await settle();

      expect(settings.get(`${id}.b`)).to.be.true;
      expect(container.querySelector('.iitc-settings-text').textContent).to.equal('on');
    });

    it('shows a value that is not among the options as a disabled choice, so any option can be picked', () => {
      const id = page([{ type: 'select', key: 'sel', options: ['a', 'b'], default: 'none' }]);
      settings._renderPage(id, container);
      const select = container.querySelector('select');

      expect(select.options[select.selectedIndex].textContent).to.equal('none');
      expect(select.options[0].disabled).to.be.true;

      change(select, '0');
      expect(settings.get(`${id}.sel`)).to.equal('a');
    });

    it('draws the page when the options of a select fail', () => {
      sinon.stub(globalThis.log, 'warn');
      const id = page([
        {
          type: 'select',
          key: 'sel',
          options: () => {
            throw new Error('not loaded');
          },
        },
        { type: 'text', text: 'after' },
      ]);

      expect(settings._renderPage(id, container)).to.be.true;

      expect(container.querySelector('.iitc-settings-text').textContent).to.equal('after');
    });

    it('warns once about a field without a key', () => {
      const warn = sinon.spy(globalThis.log, 'warn');
      const id = page([{ type: 'boolean', title: 'Loose' }]);

      settings._renderPage(id, container);
      settings._renderPage(id, container);

      expect(warn.withArgs(sinon.match('has no key')).callCount).to.equal(1);
    });

    it('stores the value of the chosen option, whatever its type', () => {
      const id = page([
        {
          type: 'select',
          key: 'sel',
          options: [
            { value: 1, label: 'One' },
            { value: 2, label: 'Two' },
          ],
        },
      ]);
      settings._renderPage(id, container);

      change(container.querySelector('select'), '1');

      expect(settings.get(`${id}.sel`)).to.equal(2);
    });

    it('keeps a refused value in the field and tells why', () => {
      const id = page([{ type: 'number', key: 'n', min: 15, default: 30 }]);
      settings._renderPage(id, container);
      const input = container.querySelector('input');

      change(input, '10');

      expect(settings.get(`${id}.n`)).to.equal(30);
      expect(input.value).to.equal('10');
      expect(input.getAttribute('aria-invalid')).to.equal('true');
      expect(container.querySelector('.iitc-settings-error .iitc-settings-message-text').textContent).to.equal('less than 15');
      expect(container.querySelector('.iitc-settings-error').parentElement.className).to.equal('iitc-settings-row iitc-settings-number');
    });

    it('combines the color and its opacity into one value', () => {
      const id = page([{ type: 'color', key: 'c', alpha: true, default: '#a24ac380' }]);
      settings._renderPage(id, container);
      const [color, opacity] = container.querySelectorAll('input');
      expect(opacity.value).to.equal('50');

      change(opacity, '100');
      expect(settings.get(`${id}.c`)).to.equal('#a24ac3');

      change(container.querySelectorAll('input')[1], '0');
      expect(settings.get(`${id}.c`)).to.equal('#a24ac300');
      expect(color.value).to.equal('#a24ac3');
    });

    it('shows a derived value instead of the stored one', () => {
      const id = page([{ type: 'boolean', key: 'b', value: () => true, enabled: false }]);

      settings._renderPage(id, container);

      const input = container.querySelector('input');
      expect(input.checked).to.be.true;
      expect(input.disabled).to.be.true;
    });
  });

  describe('choice', () => {
    const projects = (blocks) =>
      page([
        {
          type: 'repeat',
          over: () => [
            { id: 'a', title: 'Paris' },
            { id: 'b', title: 'Rome' },
          ],
          blocks,
        },
      ]);
    const choose = (radio) => {
      radio.checked = true;
      radio.dispatchEvent(new document.defaultView.Event('change'));
    };

    it('draws a radio before the title of each item, in one group, and runs the action with the chosen item', async () => {
      const action = sinon.stub().returns('Switched');
      const id = projects([{ type: 'choice', title: 'In use', selected: (item) => item.id === 'a', action }]);
      settings._renderPage(id, container);
      const [paris, rome] = container.querySelectorAll('input[type="radio"]');

      expect(paris.checked).to.be.true;
      expect(rome.checked).to.be.false;
      expect(paris.name).to.equal(rome.name).and.not.be.empty;
      // before the title of its row, which labels it, and with no column of its own
      expect(rome.parentElement.tagName).to.equal('LABEL');
      expect(rome.parentElement.textContent).to.equal('Rome');
      expect(rome.parentElement.firstChild).to.equal(rome);
      expect(rome.closest('th')).to.not.be.null;
      expect(container.querySelectorAll('tbody tr:first-child > *')).to.have.length(1);
      expect(container.querySelector('thead')).to.be.null;

      choose(rome);
      await settle();
      await settle();

      expect(action.calledOnceWithExactly({ id: 'b', title: 'Rome' })).to.be.true;
      expect(localStorage.length).to.equal(0);
      expect(container.querySelector('.iitc-settings-message-text').textContent).to.equal('Switched');
      expect(container.querySelector('.iitc-settings-message').closest('th')).to.not.be.null;
    });

    it('shows the error the action throws, and the selected item again', async () => {
      const id = projects([
        {
          type: 'choice',
          selected: (item) => item.id === 'a',
          action: () => {
            throw new Error('Not now');
          },
        },
      ]);
      settings._renderPage(id, container);

      choose(container.querySelectorAll('input[type="radio"]')[1]);
      await settle();
      await settle();

      expect(container.querySelector('.iitc-settings-error .iitc-settings-message-text').textContent).to.equal('Not now');
      expect([...container.querySelectorAll('input[type="radio"]')].map((radio) => radio.checked)).to.deep.equal([true, false]);
    });

    it('runs the action after the pointer comes up', async () => {
      const action = sinon.spy();
      const id = projects([{ type: 'choice', selected: false, action }]);
      settings._renderPage(id, container);
      const [paris] = container.querySelectorAll('input[type="radio"]');

      paris.dispatchEvent(new document.defaultView.Event('pointerdown', { bubbles: true }));
      choose(paris);
      await settle();
      expect(action.called).to.be.false;
      expect(paris.isConnected).to.be.true;

      document.dispatchEvent(new document.defaultView.Event('pointerup'));
      await settle();
      await settle();
      expect(action.calledOnce).to.be.true;
    });

    it('warns about a choice with a key, which cannot hold a setting', () => {
      const warn = sinon.spy(globalThis.log, 'warn');

      page([{ type: 'choice', key: 'r', action: () => {} }]);

      expect(warn.calledWithMatch('cannot hold a setting')).to.be.true;
    });

    it('draws the first choice of a repeat only, and warns once about another', () => {
      const warn = sinon.spy(globalThis.log, 'warn');
      const id = projects([
        { type: 'choice', title: 'In use', selected: false, action: () => {} },
        { type: 'choice', title: 'Favourite', selected: false, action: () => {} },
      ]);

      settings._renderPage(id, container);
      settings._renderPage(id, container);

      expect(container.querySelectorAll('input[type="radio"]')).to.have.length(2);
      expect(container.querySelectorAll('tbody tr:first-child > *')).to.have.length(1);
      expect(warn.withArgs(sinon.match('"Favourite" is left out')).callCount).to.equal(1);
    });

    it('draws nothing for a choice outside a repeat, and warns once', () => {
      const warn = sinon.spy(globalThis.log, 'warn');
      const id = page([{ type: 'choice', title: 'Lonely', action: () => {} }]);

      settings._renderPage(id, container);
      settings._renderPage(id, container);

      expect(container.querySelector('input')).to.be.null;
      expect(warn.withArgs(sinon.match('works only inside a repeat')).callCount).to.equal(1);
    });
  });

  describe('display properties', () => {
    it('hides blocks that are not visible', () => {
      const id = page([
        { type: 'text', text: 'shown' },
        { type: 'text', text: 'hidden', visible: () => false },
      ]);

      settings._renderPage(id, container);

      expect([...container.querySelectorAll('.iitc-settings-text')].map((p) => p.textContent)).to.deep.equal(['shown']);
    });

    it('draws the other blocks when one of them fails', () => {
      const warn = sinon.spy(globalThis.log, 'warn');
      const id = page([
        {
          type: 'text',
          text: () => {
            throw new Error('boom');
          },
        },
        { type: 'text', text: 'after' },
      ]);

      settings._renderPage(id, container);

      expect(container.querySelector('.iitc-settings-text').textContent).to.equal('after');
      expect(warn.calledWithMatch('failed to draw')).to.be.true;
    });
  });

  describe('content', () => {
    it('draws headings, links and notices', () => {
      const id = page([
        { type: 'heading', title: 'Section' },
        { type: 'link', title: 'Homepage', url: 'https://iitc.app/' },
        { type: 'notice', text: 'Almost full', level: 'warning' },
      ]);

      settings._renderPage(id, container);

      expect(container.querySelector('h3').textContent).to.equal('Section');
      const link = container.querySelector('a');
      expect([link.textContent, link.href, link.target]).to.deep.equal(['Homepage', 'https://iitc.app/', '_blank']);
      expect(container.querySelector('.iitc-settings-notice-warning').textContent).to.equal('Almost full');
    });

    it('draws list entries with their badge, state, tooltip and collapsed entries', () => {
      const id = page([
        {
          type: 'list',
          items: [
            { title: 'Bookmarks', badge: '0.4', state: 'muted', tooltip: 'Save portals', items: [{ title: '0.4: fixes' }], collapsed: true },
            { title: 'Broken', state: 'error', sub: 'failed to start' },
          ],
        },
      ]);

      settings._renderPage(id, container);

      const [bookmarks, broken] = container.querySelector('.iitc-settings-list').children;
      expect(bookmarks.className).to.equal('iitc-settings-item-muted');
      // on the entry's own line only, so its nested entries do not show it
      expect(bookmarks.querySelector('.iitc-settings-list-head').title).to.equal('Save portals');
      expect(bookmarks.title).to.equal('');
      expect(bookmarks.querySelector('details li').title).to.equal('');
      expect(bookmarks.querySelector('summary .iitc-settings-list-head').textContent).to.equal('Bookmarks0.4');
      expect(bookmarks.querySelector('summary iitc-icon').getAttribute('fallback')).to.equal('▸');
      expect(bookmarks.querySelector('details li').textContent).to.equal('0.4: fixes');
      expect(broken.className).to.equal('iitc-settings-item-error');
      expect(broken.querySelector('.iitc-settings-sub').textContent).to.equal('failed to start');
    });

    it('nests lists no deeper than three levels', () => {
      const id = page([{ type: 'list', items: [{ title: '1', items: [{ title: '2', items: [{ title: '3', items: [{ title: '4' }] }] }] }] }]);

      settings._renderPage(id, container);

      expect(container.querySelectorAll('ul')).to.have.lengthOf(3);
    });
  });

  describe('repeat', () => {
    it('keeps the valid entries of the other items when one is changed, and stores no defaults', () => {
      sinon.stub(globalThis.log, 'warn');
      const id = page([
        {
          type: 'repeat',
          over: () => ['x', 'y', 'z'].map((item) => ({ id: item, title: item })),
          blocks: [{ type: 'select', key: 'mode', title: 'Mode', options: ['a', 'b'] }],
        },
      ]);
      localStorage.setItem(`iitc-setting:${id}.mode`, JSON.stringify({ x: 'b', y: 'removed' }));
      settings._renderPage(id, container);

      change(container.querySelectorAll('select')[2], '1');

      expect(JSON.parse(localStorage.getItem(`iitc-setting:${id}.mode`))).to.deep.equal({ x: 'b', z: 'b' });
      expect(settings.get(`${id}.mode`)).to.deep.equal({ x: 'b', y: 'a', z: 'b' });
    });

    it('shows the default of its item in a cell with no stored entry', () => {
      const id = page([
        {
          type: 'repeat',
          over: () => [
            { id: 'ENL', title: 'Enlightened' },
            { id: 'RES', title: 'Resistance' },
          ],
          blocks: [{ type: 'color', key: 'color', title: 'Color', default: (item) => (item.id === 'ENL' ? '#03dc03' : '#0088ff') }],
        },
      ]);
      settings.set(`${id}.color`, { RES: '#ffffff' });

      settings._renderPage(id, container);

      expect([...container.querySelectorAll('td input')].map((input) => input.value)).to.deep.equal(['#03dc03', '#ffffff']);
    });

    it('names the fields of a row after their column', () => {
      const id = page([{ type: 'repeat', over: () => [{ id: 'ap', title: 'Anomaly' }], blocks: [{ type: 'boolean', key: 'hidden', title: 'Hide' }] }]);

      settings._renderPage(id, container);

      expect(container.querySelector('td input').getAttribute('aria-label')).to.equal('Hide');
    });

    it('shows the text and the errors of actions in their cell', async () => {
      sinon.stub(globalThis.log, 'warn');
      IITC.utils.importText.resolves('data');
      const id = page([
        {
          type: 'repeat',
          over: () => [{ id: 'ap', title: 'Anomaly' }],
          blocks: [
            { type: 'action', title: 'Locate', action: (item) => `Found ${item.id}` },
            {
              type: 'import',
              title: 'Import',
              onData: () => {
                throw new Error('Not for this item');
              },
            },
          ],
        },
      ]);
      settings._renderPage(id, container);

      click(buttons(container).Locate);
      await settle();
      expect(container.querySelector('td .iitc-settings-message .iitc-settings-message-text').textContent).to.equal('Found ap');

      click(buttons(container).Paste);
      await settle();
      expect(container.querySelector('td .iitc-settings-error .iitc-settings-message-text').textContent).to.equal('Not for this item');
    });

    it('draws the other cells when one of them fails', () => {
      sinon.stub(globalThis.log, 'warn');
      const id = page([
        {
          type: 'repeat',
          over: () => [{ id: 'ap', title: 'Anomaly' }],
          blocks: [
            {
              type: 'select',
              key: 'mode',
              options: () => {
                throw new Error('not loaded');
              },
            },
            { type: 'boolean', key: 'hidden', title: 'Hide' },
          ],
        },
      ]);

      settings._renderPage(id, container);

      expect(container.querySelector('td input[type=checkbox]')).to.exist;
    });

    it('draws nothing without items, and no header over buttons', () => {
      const items = [];
      const id = page([
        { type: 'repeat', over: () => items, blocks: [{ type: 'action', title: 'Rename', action: () => {} }] },
        {
          type: 'repeat',
          over: () => [{ id: 'ap', title: 'Anomaly' }],
          blocks: [
            { type: 'boolean', key: 'hidden', title: 'Hide' },
            { type: 'action', title: 'Locate', action: () => {} },
          ],
        },
      ]);
      settings._renderPage(id, container);

      expect(container.querySelectorAll('table').length).to.equal(1);
      expect([...container.querySelectorAll('thead th')].map((th) => th.textContent)).to.deep.equal(['', 'Hide', '']);

      items.push({ id: 'f1', title: 'Home' });
      settings._renderPage(id, container);

      const [buttonsOnly] = container.querySelectorAll('table');
      expect(buttonsOnly.querySelector('thead')).to.be.null;
      expect(buttonsOnly.querySelector('tbody button').textContent).to.equal('Rename');
      // buttons keep to the end of the row, fields do not
      expect(buttonsOnly.querySelector('tbody td').className).to.equal('iitc-settings-cell-buttons');
      expect(container.querySelectorAll('table')[1].querySelector('tbody td').className).to.equal('');
    });

    it('draws a row per item and stores the entry of the changed item', () => {
      const id = page([
        {
          type: 'repeat',
          over: () => [
            { id: 'ap', title: 'Anomaly' },
            { id: 'sc', title: 'Scout' },
          ],
          blocks: [{ type: 'boolean', key: 'hidden', title: 'Hide', enabled: (item) => item.id !== 'sc' }],
        },
      ]);
      settings.set(`${id}.hidden`, { sc: true });
      settings._renderPage(id, container);

      const rows = container.querySelectorAll('tbody tr');
      expect([...rows].map((row) => row.querySelector('th').textContent)).to.deep.equal(['Anomaly', 'Scout']);
      expect(container.querySelector('thead').textContent).to.equal('Hide');
      expect(rows[1].querySelector('input').disabled).to.be.true;

      change(rows[0].querySelector('input'), true);

      expect(settings.get(`${id}.hidden`)).to.deep.equal({ sc: true, ap: true });
    });
  });

  describe('actions', () => {
    it('runs an action once while it is still running', async () => {
      let finish;
      const action = sinon.stub().returns(new Promise((resolve) => (finish = resolve)));
      const id = page([{ type: 'action', title: 'Sign in', action }]);
      settings._renderPage(id, container);

      buttons(container)['Sign in'].focus();

      click(buttons(container)['Sign in']);
      expect(buttons(container)['Sign in'].getAttribute('aria-disabled')).to.equal('true');
      expect(document.activeElement).to.equal(buttons(container)['Sign in']);
      click(buttons(container)['Sign in']);
      finish();
      await settle();

      expect(action.calledOnce).to.be.true;
      expect(buttons(container)['Sign in'].hasAttribute('aria-disabled')).to.be.false;
      expect(document.activeElement).to.equal(buttons(container)['Sign in']);
    });

    it('leaves another page alone when an action of the page drawn before finishes', async () => {
      let finish;
      const first = page([{ type: 'action', title: 'Slow', action: () => new Promise((resolve) => (finish = resolve)) }]);
      const second = page([{ type: 'action', title: 'Other', action: () => {} }]);
      settings._renderPage(first, container);

      click(buttons(container).Slow);
      settings._renderPage(second, container);
      finish('Done');
      await settle();
      settings._renderPage(second, container);

      expect(container.firstElementChild.dataset.page).to.equal(second);
      expect(container.querySelector('.iitc-settings-message')).to.be.null;
    });

    it('drops the messages of a page when another page is drawn', async () => {
      const first = page([{ type: 'action', title: 'Run', action: () => 'Done' }]);
      const second = page([{ type: 'action', title: 'Other', action: () => {} }]);
      settings._renderPage(first, container);
      click(buttons(container).Run);
      await settle();
      expect(container.querySelector('.iitc-settings-message .iitc-settings-message-text').textContent).to.equal('Done');

      settings._renderPage(second, container);

      expect(container.querySelector('.iitc-settings-message')).to.be.null;
    });

    it('draws the button of an action in the control, after its description', () => {
      const id = page([
        { type: 'action', title: 'Snap', description: 'Moves the points', action: () => {} },
        { type: 'action', title: 'Delete', action: () => {} },
      ]);
      settings._renderPage(id, container);

      const [described, bare] = container.querySelectorAll('.iitc-settings-action');
      expect([...described.children].map((child) => child.className)).to.deep.equal(['iitc-settings-label', 'iitc-settings-control']);
      expect(described.querySelector('.iitc-settings-label').textContent).to.equal('Moves the points');
      expect(described.querySelector('.iitc-settings-control button').textContent).to.equal('Snap');
      expect([...bare.children].map((child) => child.className)).to.deep.equal(['iitc-settings-control']);
    });

    it('shows the icon of an action in place of its text, which becomes the tooltip', () => {
      const id = page([{ type: 'action', title: 'Delete the project', button: 'Delete', icon: 'delete', action: () => {} }]);

      settings._renderPage(id, container);

      const button = container.querySelector('button');
      expect(button.className).to.equal('iitc-settings-icon-button');
      expect(button.title).to.equal('Delete');
      expect(button.getAttribute('aria-label')).to.equal('Delete');
      const icon = button.querySelector('iitc-icon');
      expect(icon.textContent).to.equal('delete');
      expect(icon.getAttribute('fallback')).to.equal('Delete');
    });

    it('draws the title of an action as its label when the button has a text of its own', () => {
      const id = page([{ type: 'action', title: 'Delete all items', description: 'Cannot be undone', button: 'Delete', action: () => {} }]);
      settings._renderPage(id, container);

      const row = container.querySelector('.iitc-settings-action');
      expect(row.querySelector('.iitc-settings-title').textContent).to.equal('Delete all items');
      expect(row.querySelector('.iitc-settings-description').textContent).to.equal('Cannot be undone');
      expect(row.querySelector('.iitc-settings-control button').textContent).to.equal('Delete');
    });

    it('runs an action and shows the text it returns', async () => {
      const action = sinon.stub().resolves('Position saved');
      const id = page([{ type: 'action', title: 'Save position', action }]);
      settings._renderPage(id, container);

      click(buttons(container)['Save position']);
      await settle();

      expect(action.calledOnce).to.be.true;
      expect(container.querySelector('.iitc-settings-message .iitc-settings-message-text').textContent).to.equal('Position saved');
      expect(container.querySelector('.iitc-settings-message iitc-icon').textContent).to.equal('check_circle');
      // under the row, so the button stays on the line of its label
      expect([...container.querySelector('.iitc-settings-action').children].map((child) => child.className)).to.deep.equal([
        'iitc-settings-control',
        'iitc-settings-message',
      ]);
    });

    it('shows the error an action throws', async () => {
      sinon.stub(globalThis.log, 'warn');
      const id = page([
        {
          type: 'action',
          title: 'Reset',
          action: () => {
            throw new Error('Nothing to reset');
          },
        },
      ]);
      settings._renderPage(id, container);

      click(buttons(container).Reset);
      await settle();

      expect(container.querySelector('.iitc-settings-message.iitc-settings-error .iitc-settings-message-text').textContent).to.equal('Nothing to reset');
      expect(container.querySelector('.iitc-settings-error iitc-icon').textContent).to.equal('error');
    });

    it('disables a block without its handler and warns once', () => {
      const warn = sinon.spy(globalThis.log, 'warn');
      const id = page([
        { type: 'action', title: 'Run' },
        { type: 'export', title: 'Export', filename: 'data.json' },
        { type: 'import', title: 'Import', accept: '.json' },
      ]);

      settings._renderPage(id, container);
      settings._renderPage(id, container);

      expect([...container.querySelectorAll('button')].every((button) => button.disabled)).to.be.true;
      expect(warn.callCount).to.equal(3);
      expect(warn.calledWithMatch('action block "Run" has no action function')).to.be.true;
    });

    it('reads files with onFiles alone, without a Paste button or a warning', () => {
      const warn = sinon.spy(globalThis.log, 'warn');
      const id = page([{ type: 'import', title: 'Import', onFiles: () => {}, accept: '.json' }]);
      settings._renderPage(id, container);

      expect(Object.keys(buttons(container))).to.deep.equal(['Choose file']);
      expect(buttons(container)['Choose file'].disabled).to.be.false;
      expect(warn.called).to.be.false;
    });

    it('exports text, and a file only when a file name is given', () => {
      const id = page([
        { type: 'export', title: 'Export items', data: () => '{}', filename: 'items.json', dataType: 'application/json' },
        { type: 'export', title: 'Export link', data: () => 'https://intel.ingress.com/' },
      ]);
      settings._renderPage(id, container);

      const [copyItems, save, copyLink] = container.querySelectorAll('button');
      expect([copyItems.textContent, save.textContent, copyLink.textContent]).to.deep.equal(['Copy', 'Save file', 'Copy']);

      click(copyItems);
      click(save);

      expect(IITC.utils.exportText.calledOnceWith('{}', { title: 'Export items' })).to.be.true;
      expect(IITC.utils.exportFile.calledOnceWith('{}', 'items.json', 'application/json')).to.be.true;
    });

    it('imports pasted text', async () => {
      const onData = sinon.spy();
      IITC.utils.importText.resolves('{"a":1}');
      const id = page([{ type: 'import', title: 'Import items', onData }]);
      settings._renderPage(id, container);

      expect(Object.keys(buttons(container))).to.deep.equal(['Paste']);
      click(buttons(container).Paste);
      await settle();

      expect(IITC.utils.importText.calledOnceWith({ title: 'Import items' })).to.be.true;
      expect(onData.calledOnceWith('{"a":1}', undefined)).to.be.true;
      expect(container.querySelector('.iitc-settings-message .iitc-settings-message-text').textContent).to.equal('Imported');
    });

    it('shows what onData reports instead of the plain message', async () => {
      IITC.utils.importText.resolves('{}');
      const id = page([{ type: 'import', title: 'Import', onData: () => 'Imported 2 of 3 settings.' }]);
      settings._renderPage(id, container);

      click(buttons(container).Paste);
      await settle();

      expect(container.querySelector('.iitc-settings-message .iitc-settings-message-text').textContent).to.equal('Imported 2 of 3 settings.');
    });

    it('does nothing when the paste dialog is closed', async () => {
      const onData = sinon.spy();
      IITC.utils.importText.resolves(undefined);
      const id = page([{ type: 'import', title: 'Import', onData }]);
      settings._renderPage(id, container);

      click(buttons(container).Paste);
      await settle();

      expect(onData.called).to.be.false;
      expect(container.querySelector('.iitc-settings-message')).to.be.null;
    });

    it('imports the one file read, and shows the error onData throws', async () => {
      sinon.stub(globalThis.log, 'warn');
      const onData = sinon.stub().throws(new Error('Not drawn items'));
      IITC.utils.importFile.resolves([{ name: 'b.json', text: 'bad' }]);
      const id = page([{ type: 'import', title: 'Import', onData, accept: '.json' }]);
      settings._renderPage(id, container);

      click(buttons(container)['Choose file']);
      await read();

      expect(IITC.utils.importFile.calledOnceWith({ accept: '.json', multiple: false })).to.be.true;
      expect(onData.firstCall.args.slice(0, 2)).to.deep.equal(['bad', 'b.json']);
      expect(container.querySelector('.iitc-settings-error .iitc-settings-message-text').textContent).to.equal('Not drawn items');
    });

    it('lets several files be chosen for onFiles, passes them at once, and nothing when none is picked', async () => {
      const onFiles = sinon.stub().returns('Imported 2 files');
      const files = [
        { name: 'a.json', text: 'a' },
        { name: 'b.json', text: 'b' },
      ];
      IITC.utils.importFile.resolves(files);
      const id = page([{ type: 'import', title: 'Import', onData: sinon.spy(), onFiles, accept: '.json' }]);
      settings._renderPage(id, container);

      click(buttons(container)['Choose file']);
      await read();
      expect(IITC.utils.importFile.calledOnceWith({ accept: '.json', multiple: true })).to.be.true;
      expect(onFiles.calledOnceWith(files)).to.be.true;
      expect(container.querySelector('.iitc-settings-message .iitc-settings-message-text').textContent).to.equal('Imported 2 files');

      IITC.utils.importFile.resolves([]);
      click(buttons(container)['Choose file']);
      await read();
      expect(onFiles.calledOnce).to.be.true;
      expect(container.querySelector('.iitc-settings-message')).to.be.null;
    });

    it('lets the file be chosen again after the choice is cancelled', async () => {
      IITC.utils.importFile.returns(new Promise(() => {}));
      const id = page([{ type: 'import', title: 'Import', onData: sinon.spy(), accept: '.json' }]);
      settings._renderPage(id, container);

      click(buttons(container)['Choose file']);
      await settle();
      click(buttons(container)['Choose file']);
      await settle();

      expect(IITC.utils.importFile.calledTwice).to.be.true;
      expect(buttons(container)['Choose file'].hasAttribute('aria-disabled')).to.be.false;
    });
  });

  describe('redraw', () => {
    it('leaves the page in place until the current task is done, so a click after a change still lands', async () => {
      const action = sinon.spy();
      const id = page([
        { type: 'string', key: 's' },
        { type: 'action', title: 'Run', action },
      ]);
      settings._renderPage(id, container);
      const button = buttons(container).Run;

      change(container.querySelector('input'), 'typed');

      expect(button.isConnected).to.be.true;
      click(button);
      await settle();
      expect(action.calledOnce).to.be.true;
      expect(settings.get(`${id}.s`)).to.equal('typed');
    });

    it('waits for the pointer to come up before drawing again', async () => {
      const id = page([
        { type: 'string', key: 's' },
        { type: 'boolean', key: 'b' },
      ]);
      settings._renderPage(id, container);
      const checkbox = container.querySelectorAll('input')[1];

      checkbox.dispatchEvent(new document.defaultView.Event('pointerdown', { bubbles: true }));
      change(container.querySelector('input'), 'typed');
      await settle();
      expect(checkbox.isConnected).to.be.true;

      document.dispatchEvent(new document.defaultView.Event('pointerup'));
      await settle();
      expect(checkbox.isConnected).to.be.false;
    });

    it('gives the focus to the control tabbed to after a change', async () => {
      const id = page([
        { type: 'string', key: 's' },
        { type: 'string', key: 't' },
      ]);
      settings._renderPage(id, container);
      const [first, second] = container.querySelectorAll('input');
      first.focus();

      change(first, 'typed');
      second.focus();
      await settle();

      expect(document.activeElement.dataset.focusId).to.equal('1');
    });

    it('draws once for several changes in one task', async () => {
      let draws = 0;
      const id = page([
        { type: 'string', key: 's' },
        {
          type: 'text',
          text: () => {
            draws++;
            return '';
          },
        },
      ]);
      settings._renderPage(id, container);
      draws = 0;

      change(container.querySelector('input'), 'a');
      change(container.querySelector('input'), 'b');
      await settle();

      expect(draws).to.equal(1);
    });

    it('keeps the focus and text typed but not applied yet', () => {
      const id = page([
        { type: 'boolean', key: 'b' },
        { type: 'string', key: 's', default: 'ap' },
      ]);
      settings._renderPage(id, container);
      const input = container.querySelectorAll('input')[1];
      input.focus();
      input.value = 'ap sc';
      input.setSelectionRange(2, 2);

      settings.set(`${id}.b`, true);
      settings._renderPage(id, container);

      const redrawn = container.querySelectorAll('input')[1];
      expect(redrawn).to.not.equal(input);
      expect(document.activeElement).to.equal(redrawn);
      expect(redrawn.value).to.equal('ap sc');
      expect(redrawn.selectionStart).to.equal(2);
    });

    it('shows a value changed elsewhere in a field that was not edited', () => {
      const id = page([{ type: 'string', key: 's', default: 'ap' }]);
      settings._renderPage(id, container);
      container.querySelector('input').focus();

      settings.set(`${id}.s`, 'sc');
      settings._renderPage(id, container);

      expect(container.querySelector('input').value).to.equal('sc');
    });
  });
});
