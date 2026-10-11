import { describe, it, before, after, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

await import('../core/code/hooks.js');
await import('../core/code/settings.js');

const settings = IITC.settings;

// other specs replace window.runHooks with spies and leave them behind, so the real hook
// functions are kept from the import and put back for the duration of these tests
const realHooks = { runHooks: window.runHooks, addHook: window.addHook, removeHook: window.removeHook };
let replacedHooks;

// hook handlers added through onHook are removed after each test
let hooked = [];
const onHook = (event, handler = sinon.spy()) => {
  window.addHook(event, handler);
  hooked.push([event, handler]);
  return handler;
};

// every test declares its own page, so registrations from other tests never collide
let pageCount = 0;
const page = (blocks, extra = {}) => {
  const id = `test-page-${++pageCount}`;
  settings.register(id, { title: 'Test', blocks, ...extra });
  return id;
};

describe('IITC.settings', () => {
  before(() => {
    replacedHooks = { runHooks: window.runHooks, addHook: window.addHook, removeHook: window.removeHook };
    Object.assign(window, realHooks);
  });

  after(() => {
    Object.assign(window, replacedHooks);
  });

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    hooked.forEach(([event, handler]) => window.removeHook(event, handler));
    hooked = [];
    sinon.restore();
  });

  describe('register', () => {
    it('declares keyed blocks under the page id', () => {
      const id = page([{ type: 'boolean', key: 'flag', default: true }]);
      expect(settings._definitions[`${id}.flag`]).to.include({ type: 'boolean', pageId: id });
    });

    it('uses the namespace instead of the page id when one is given', () => {
      page([{ type: 'boolean', key: 'flag' }], { namespace: 'custom-ns' });
      expect(settings.get('custom-ns.flag')).to.equal(false);
    });

    it('ignores blocks without a key and blocks that cannot hold a value', () => {
      const id = page([
        { type: 'heading', title: 'Section' },
        { type: 'action', key: 'run', title: 'Run', action: () => {} },
      ]);
      expect(Object.keys(settings._definitions).filter((key) => key.startsWith(`${id}.`))).to.be.empty;
    });

    it('accepts every block type without a warning', () => {
      const warn = sinon.spy(globalThis.log, 'warn');
      page([
        { type: 'boolean', key: 'b' },
        { type: 'number', key: 'n' },
        { type: 'string', key: 's' },
        { type: 'select', key: 'sel', options: ['a'] },
        { type: 'color', key: 'c' },
        { type: 'action', title: 'Run', action: () => {} },
        { type: 'export', title: 'Export', data: () => '', filename: 'data.json' },
        { type: 'import', title: 'Import', onData: () => {}, accept: '.json' },
        { type: 'heading', title: 'Section' },
        { type: 'text', text: 'About IITC' },
        { type: 'link', title: 'Homepage', url: 'https://iitc.app' },
        { type: 'list', items: [{ title: 'Plugin', badge: '1.0', state: 'muted' }] },
        { type: 'notice', text: 'Storage is almost full', level: 'warning' },
        {
          type: 'repeat',
          over: () => [],
          blocks: [
            { type: 'boolean', key: 'r' },
            { type: 'choice', selected: false, action: () => {} },
          ],
        },
      ]);
      expect(warn.called).to.be.false;
    });

    it('skips a block of an unknown type with a warning, also inside a repeat', () => {
      const warn = sinon.spy(globalThis.log, 'warn');
      const id = page([
        { type: 'toggle', key: 'a' },
        {
          type: 'repeat',
          over: () => [],
          blocks: [
            { type: 'checkbox', key: 'b' },
            { type: 'boolean', key: 'c' },
          ],
        },
      ]);
      expect(warn.calledWithMatch(`unknown block type "toggle" in "${id}"`)).to.be.true;
      expect(warn.calledWithMatch(`unknown block type "checkbox" in "${id}"`)).to.be.true;
      expect(Object.keys(settings._definitions).filter((key) => key.startsWith(`${id}.`))).to.deep.equal([`${id}.c`]);
    });

    it('replaces the declaration when the same page registers again', () => {
      settings.register('test-reregister', { blocks: [{ type: 'boolean', key: 'old' }] });
      settings.register('test-reregister', { blocks: [{ type: 'boolean', key: 'new' }] });
      expect(settings._definitions['test-reregister.old']).to.be.undefined;
      expect(settings._definitions['test-reregister.new']).to.exist;
    });

    it('keeps the first declaration of a key claimed by two pages', () => {
      settings.register('test-owner-a', { namespace: 'shared-ns', blocks: [{ type: 'number', key: 'n', default: 1 }] });
      settings.register('test-owner-b', { namespace: 'shared-ns', blocks: [{ type: 'number', key: 'n', default: 2 }] });
      expect(settings.get('shared-ns.n')).to.equal(1);
    });

    it('rejects a page without an id or blocks', () => {
      expect(settings.register('', { blocks: [] })).to.be.false;
      expect(settings.register('test-no-blocks', { title: 'Empty' })).to.be.false;
    });
  });

  describe('get', () => {
    it('returns the declared default while nothing is stored', () => {
      const id = page([{ type: 'number', key: 'n', default: 30 }]);
      expect(settings.get(`${id}.n`)).to.equal(30);
    });

    it('falls back to a default for the type', () => {
      const id = page([
        { type: 'boolean', key: 'b' },
        { type: 'string', key: 's' },
        { type: 'select', key: 'sel', options: [{ value: 'first', label: 'First' }, 'second'] },
      ]);
      expect(settings.get(`${id}.b`)).to.equal(false);
      expect(settings.get(`${id}.s`)).to.equal('');
      expect(settings.get(`${id}.sel`)).to.equal('first');
    });

    it('returns the default when the stored value is not valid', () => {
      const id = page([{ type: 'number', key: 'n', default: 30, max: 100 }]);
      localStorage.setItem(`iitc-setting:${id}.n`, '500');
      expect(settings.get(`${id}.n`)).to.equal(30);
    });

    it('returns the default when the stored value is not JSON', () => {
      const id = page([{ type: 'string', key: 's', default: 'x' }]);
      localStorage.setItem(`iitc-setting:${id}.s`, '{broken');
      expect(settings.get(`${id}.s`)).to.equal('x');
    });

    it('picks up a value written to localStorage by someone else', () => {
      const id = page([{ type: 'string', key: 's' }]);
      settings.set(`${id}.s`, 'mine');
      localStorage.setItem(`iitc-setting:${id}.s`, '"theirs"');
      expect(settings.get(`${id}.s`)).to.equal('theirs');
    });

    it('returns the fallback for an undeclared key with nothing stored', () => {
      expect(settings.get('test-undeclared.key', 42)).to.equal(42);
    });

    it('treats names of Object.prototype members as ordinary undeclared keys', () => {
      expect(settings.get('toString', 5)).to.equal(5);
      expect(settings.set('constructor', 'value')).to.be.true;
      expect(settings.get('constructor')).to.equal('value');
    });
  });

  describe('set', () => {
    it('stores the value as JSON under the prefixed key', () => {
      const id = page([{ type: 'number', key: 'n' }]);
      expect(settings.set(`${id}.n`, 15)).to.be.true;
      expect(localStorage.getItem(`iitc-setting:${id}.n`)).to.equal('15');
      expect(settings.get(`${id}.n`)).to.equal(15);
    });

    it('stores an undeclared key without validation', () => {
      expect(settings.set('test-free.state', { folder: 'a' })).to.be.true;
      expect(settings.get('test-free.state')).to.deep.equal({ folder: 'a' });
    });

    it('removes an invalid stored value when given the default', () => {
      const id = page([{ type: 'number', key: 'n', default: 30, max: 100 }]);
      localStorage.setItem(`iitc-setting:${id}.n`, '500');

      expect(settings.set(`${id}.n`, 30)).to.be.true;
      expect(localStorage.getItem(`iitc-setting:${id}.n`)).to.be.null;
    });

    it('keeps no value equal to the default, as if the setting was never changed', () => {
      const id = page([
        { type: 'number', key: 'n', default: 30 },
        { type: 'string', key: 's' },
        { type: 'select', key: 'sel', options: ['a', 'b'] },
      ]);
      const changed = onHook('settingChanged');

      settings.set(`${id}.n`, 50);
      expect(settings.set(`${id}.n`, 30)).to.be.true;
      settings.set(`${id}.s`, '');
      settings.set(`${id}.sel`, 'a');

      expect(localStorage.getItem(`iitc-setting:${id}.n`)).to.be.null;
      expect(localStorage.getItem(`iitc-setting:${id}.s`)).to.be.null;
      expect(localStorage.getItem(`iitc-setting:${id}.sel`)).to.be.null;
      expect(changed.args.map(([data]) => [data.key, data.value, data.oldValue])).to.deep.equal([
        [`${id}.n`, 50, 30],
        [`${id}.n`, 30, 50],
      ]);
    });

    it('compares with the default in the stored form', () => {
      const id = page([{ type: 'number', key: 'm', default: 0 }]);

      settings.set(`${id}.m`, -0);
      expect(localStorage.getItem(`iitc-setting:${id}.m`)).to.be.null;
    });

    it('removes a map that holds no entries, and keeps entries equal to the default of an entry', () => {
      const id = page([{ type: 'repeat', over: () => [], blocks: [{ type: 'boolean', key: 'on' }] }]);

      settings.set(`${id}.on`, { a: false });
      expect(localStorage.getItem(`iitc-setting:${id}.on`)).to.equal('{"a":false}');
      settings.set(`${id}.on`, {});
      expect(localStorage.getItem(`iitc-setting:${id}.on`)).to.be.null;
    });

    it('stores a value of a select whose options cannot be read, having no default to compare with', () => {
      const id = page([
        {
          type: 'select',
          key: 'sel',
          options: () => {
            throw new Error('no options yet');
          },
        },
      ]);
      sinon.stub(globalThis.log, 'warn');

      expect(settings.set(`${id}.sel`, 'x')).to.be.true;
      expect(localStorage.getItem(`iitc-setting:${id}.sel`)).to.equal('"x"');
    });

    it('removes an undeclared value when given undefined', () => {
      settings.set('test-free.gone', 'here');
      expect(settings.set('test-free.gone', undefined)).to.be.true;
      expect(localStorage.getItem('iitc-setting:test-free.gone')).to.be.null;
    });

    it('rejects undefined for a declared setting and keeps its value', () => {
      const id = page([{ type: 'color', key: 'color' }]);
      settings.set(`${id}.color`, '#a24ac3');
      expect(settings.set(`${id}.color`, undefined)).to.be.false;
      expect(settings.get(`${id}.color`)).to.equal('#a24ac3');
    });

    it('rejects a value that cannot be serialized', () => {
      expect(settings.set('test-free.callback', () => {})).to.be.false;
      expect(localStorage.getItem('iitc-setting:test-free.callback')).to.be.null;

      const id = page([
        {
          type: 'select',
          key: 'sel',
          options: () => {
            throw new Error('no options yet');
          },
        },
      ]);
      expect(settings.set(`${id}.sel`, undefined)).to.be.false;
      expect(localStorage.getItem(`iitc-setting:${id}.sel`)).to.be.null;
    });

    it('does not warn about the invalid value it overwrites', () => {
      const id = page([{ type: 'number', key: 'n', default: 30, max: 100 }]);
      localStorage.setItem(`iitc-setting:${id}.n`, '500');
      const warn = sinon.spy(globalThis.log, 'warn');

      settings.set(`${id}.n`, 50);
      localStorage.setItem(`iitc-setting:${id}.n`, '500');
      settings.reset(`${id}.n`);

      expect(warn.called).to.be.false;
    });

    it('reads a value back as it is stored', () => {
      const value = { folder: 'a', callback: () => {} };
      expect(settings.set('test-free.state', value)).to.be.true;
      expect(settings.get('test-free.state')).to.deep.equal({ folder: 'a' });
    });

    it('returns false when the storage is full', () => {
      const id = page([{ type: 'string', key: 's', default: 'kept' }]);
      sinon.stub(Object.getPrototypeOf(localStorage), 'setItem').throws(new Error('QuotaExceededError'));
      expect(settings.set(`${id}.s`, 'lost')).to.be.false;
      expect(settings.get(`${id}.s`)).to.equal('kept');
    });

    describe('validation', () => {
      const rejects = (block, value) => {
        const id = page([{ key: 'v', ...block }]);
        expect(settings.set(`${id}.v`, value), JSON.stringify(value)).to.be.false;
        expect(localStorage.getItem(`iitc-setting:${id}.v`)).to.be.null;
      };
      const accepts = (block, value) => {
        const id = page([{ key: 'v', ...block }]);
        expect(settings.set(`${id}.v`, value), JSON.stringify(value)).to.be.true;
      };

      it('checks the type', () => {
        rejects({ type: 'boolean' }, 'true');
        rejects({ type: 'number' }, '5');
        rejects({ type: 'number' }, NaN);
        rejects({ type: 'string' }, 5);
        rejects({ type: 'color' }, 'red');
        accepts({ type: 'color' }, '#A24AC3');
      });

      it('checks the range and the step of a number', () => {
        const block = { type: 'number', min: 15, max: 300, step: 5 };
        rejects(block, 10);
        rejects(block, 305);
        rejects(block, 17);
        accepts(block, 20);
        accepts({ type: 'number', step: 0.1 }, 0.3);
      });

      it('accepts only the values of select options', () => {
        const options = [{ value: 'long', label: 'Detailed' }, 'short'];
        rejects({ type: 'select', options }, 'Detailed');
        accepts({ type: 'select', options }, 'long');
        accepts({ type: 'select', options: () => ['dynamic'] }, 'dynamic');
      });

      it('accepts an alpha channel only when the color allows it', () => {
        rejects({ type: 'color' }, '#a24ac380');
        accepts({ type: 'color', alpha: true }, '#a24ac380');
      });

      it('treats a throwing check as an invalid value', () => {
        rejects(
          {
            type: 'number',
            validate: () => {
              throw new Error('boom');
            },
          },
          5
        );
      });

      it('applies the validate function', () => {
        const id = page([{ type: 'number', key: 'v', validate: (v) => v % 5 === 0 || 'multiple of five' }]);
        const warn = sinon.spy(globalThis.log, 'warn');
        expect(settings.set(`${id}.v`, 7)).to.be.false;
        expect(warn.lastCall.args[0]).to.contain('multiple of five');
        expect(settings.set(`${id}.v`, 10)).to.be.true;
      });
    });
  });

  describe('check', () => {
    it('tells why a value is not allowed, without storing anything', () => {
      const id = page([{ type: 'number', key: 'n', min: 15 }]);
      expect(settings.check(`${id}.n`, 10)).to.equal('less than 15');
      expect(settings.check(`${id}.n`, 20)).to.be.true;
      expect(localStorage.getItem(`iitc-setting:${id}.n`)).to.be.null;
    });

    it('allows any value for an undeclared key', () => {
      expect(settings.check('test-undeclared.anything', { a: 1 })).to.be.true;
    });
  });

  describe('stored form', () => {
    // JSON keeps -0 as 0, so the two are the same value
    const number = () => page([{ type: 'number', key: 'v', default: 5 }]);

    it('changes nothing for a value stored in the same form as the one already there', () => {
      const id = number();
      settings.set(`${id}.v`, 0);
      const changed = onHook('settingChanged');
      const setItem = sinon.spy(document.defaultView.Storage.prototype, 'setItem');

      expect(settings.set(`${id}.v`, -0)).to.be.true;

      expect(setItem.called).to.be.false;
      expect(changed.called).to.be.false;
    });

    it('reports a change with the value as get returns it', () => {
      const id = number();
      const changed = onHook('settingChanged');

      settings.set(`${id}.v`, -0);

      expect(Object.is(settings.get(`${id}.v`), 0)).to.be.true;
      expect(changed.calledOnce).to.be.true;
      expect(Object.is(changed.firstCall.args[0].value, 0)).to.be.true;
      expect(changed.firstCall.args[0].oldValue).to.equal(5);
    });

    it('compares imported and remote values in their stored form', () => {
      const id = number();
      settings.set(`${id}.v`, 0);
      const changed = onHook('settingChanged');

      expect(settings.import({ [`${id}.v`]: -0 }).applied).to.deep.equal([`${id}.v`]);
      expect(settings.set(`${id}.v`, -0, { source: 'remote' })).to.be.true;
      expect(changed.called).to.be.false;

      settings.set(`${id}.v`, 7, { source: 'remote' });
      expect(changed.calledOnce).to.be.true;
      expect(changed.firstCall.args[0]).to.include({ value: 7, oldValue: 0, source: 'remote' });
    });
  });

  describe('reset', () => {
    it('removes the stored value so the default applies again', () => {
      const id = page([{ type: 'number', key: 'n', default: 30 }]);
      settings.set(`${id}.n`, 60);
      settings.reset(`${id}.n`);
      expect(localStorage.getItem(`iitc-setting:${id}.n`)).to.be.null;
      expect(settings.get(`${id}.n`)).to.equal(30);
    });
  });

  describe('change notification', () => {
    it('runs the settingChanged hook, then onChange, with the new value, the old value and the source', () => {
      const onChange = sinon.spy();
      const hook = onHook('settingChanged');
      const id = page([{ type: 'number', key: 'n', default: 30, onChange }]);

      settings.set(`${id}.n`, 60);

      expect(hook.calledOnceWithExactly({ key: `${id}.n`, value: 60, oldValue: 30, source: 'local' })).to.be.true;
      expect(onChange.calledOnceWithExactly(60, 30, 'local')).to.be.true;
      expect(hook.calledBefore(onChange)).to.be.true;
    });

    it('runs onChange when a settingChanged handler returns false', () => {
      const onChange = sinon.spy();
      const handler = onHook(
        'settingChanged',
        sinon.spy(() => false)
      );
      const id = page([{ type: 'number', key: 'n', default: 30, onChange }]);

      expect(settings.set(`${id}.n`, 60)).to.be.true;
      expect(handler.calledOnce).to.be.true;
      expect(onChange.calledOnce).to.be.true;
    });

    it('runs onChange when a settingChanged handler throws', () => {
      const onChange = sinon.spy();
      const handler = onHook(
        'settingChanged',
        sinon.spy(() => {
          throw new Error('boom');
        })
      );
      const id = page([{ type: 'number', key: 'n', default: 30, onChange }]);

      expect(settings.set(`${id}.n`, 60)).to.be.true;
      expect(handler.calledOnce).to.be.true;
      expect(onChange.calledOnce).to.be.true;
    });

    it('defaults the source when options are null', () => {
      const hook = onHook('settingChanged');
      const id = page([{ type: 'boolean', key: 'b' }]);

      settings.set(`${id}.b`, true, null);
      settings.reset(`${id}.b`, null);

      expect(hook.args.map(([event]) => event.source)).to.deep.equal(['local', 'local']);
    });

    it('keeps a setting that belongs to this device from remote set and reset', () => {
      const id = page([{ type: 'number', key: 'n', default: 30, sync: false }]);
      settings.set(`${id}.n`, 60);

      expect(settings.set(`${id}.n`, 90, { source: 'remote' })).to.be.false;
      expect(settings.reset(`${id}.n`, { source: 'remote' })).to.be.false;
      expect(settings.get(`${id}.n`)).to.equal(60);

      expect(settings.set(`${id}.n`, 90)).to.be.true;
      expect(settings.reset(`${id}.n`)).to.be.true;
      expect(settings.get(`${id}.n`)).to.equal(30);
    });

    it('ignores remote values for undeclared keys', () => {
      expect(settings.set('test-free.remote', 42, { source: 'remote' })).to.be.false;
      expect(localStorage.getItem('iitc-setting:test-free.remote')).to.be.null;

      settings.set('test-free.remote', 'local value');
      expect(settings.set('test-free.remote', undefined, { source: 'remote' })).to.be.false;
      expect(settings.get('test-free.remote')).to.equal('local value');
    });

    it('passes the source given to set and reset', () => {
      const onChange = sinon.spy();
      const id = page([{ type: 'number', key: 'n', default: 30, onChange }]);

      settings.set(`${id}.n`, 60, { source: 'remote' });
      settings.reset(`${id}.n`, { source: 'remote' });

      expect(onChange.args).to.deep.equal([
        [60, 30, 'remote'],
        [30, 60, 'remote'],
      ]);
    });

    it('stays silent when the value does not change', () => {
      const onChange = sinon.spy();
      const hook = onHook('settingChanged');
      const id = page([{ type: 'number', key: 'n', default: 30, onChange }]);

      settings.set(`${id}.n`, 30);
      settings.set(`${id}.n`, 30);

      expect(onChange.called).to.be.false;
      expect(hook.called).to.be.false;
      expect(localStorage.getItem(`iitc-setting:${id}.n`)).to.be.null;
    });

    it('notifies a reset that returns the value to its default', () => {
      const onChange = sinon.spy();
      const id = page([{ type: 'number', key: 'n', default: 30, onChange }]);
      settings.set(`${id}.n`, 60);

      settings.reset(`${id}.n`);

      expect(onChange.lastCall.args).to.deep.equal([30, 60, 'local']);
    });
  });

  describe('repeat', () => {
    it('keeps a map of item id to value and validates every entry', () => {
      const id = page([{ type: 'repeat', over: () => [], blocks: [{ type: 'boolean', key: 'hidden' }] }]);
      expect(settings.get(`${id}.hidden`)).to.deep.equal({});

      expect(settings.set(`${id}.hidden`, { ap1: true, sc5: false })).to.be.true;
      expect(JSON.parse(localStorage.getItem(`iitc-setting:${id}.hidden`))).to.deep.equal({ ap1: true, sc5: false });
      expect(settings.set(`${id}.hidden`, { ap1: 'yes' })).to.be.false;
      expect(settings.set(`${id}.hidden`, true)).to.be.false;
    });

    it('reads the valid entries of a map that holds an invalid one', () => {
      const id = page([{ type: 'repeat', over: () => [], blocks: [{ type: 'select', key: 'mode', options: ['a', 'b'] }] }]);
      localStorage.setItem(`iitc-setting:${id}.mode`, JSON.stringify({ x: 'a', y: 'removed', z: 'b' }));
      const warn = sinon.spy(globalThis.log, 'warn');

      expect(settings.get(`${id}.mode`)).to.deep.equal({ x: 'a', z: 'b' });
      expect(warn.calledWithMatch(`stored entry "y" of "${id}.mode" is ignored`)).to.be.true;
      expect(settings._storedState(`${id}.mode`)).to.equal('invalid');
    });

    it('keeps the valid entries when another entry is set', () => {
      const id = page([{ type: 'repeat', over: () => [], blocks: [{ type: 'select', key: 'mode', options: ['a', 'b'] }] }]);
      localStorage.setItem(`iitc-setting:${id}.mode`, JSON.stringify({ x: 'a', y: 'removed' }));

      expect(settings.set(`${id}.mode`, { ...settings.get(`${id}.mode`), z: 'b' })).to.be.true;

      expect(settings.get(`${id}.mode`)).to.deep.equal({ x: 'a', z: 'b' });
    });

    it('stores a map changed in place after get', () => {
      const id = page([{ type: 'repeat', over: () => [], blocks: [{ type: 'boolean', key: 'hidden' }] }]);
      settings.set(`${id}.hidden`, { ap1: false });

      const hidden = settings.get(`${id}.hidden`);
      hidden.ap1 = true;
      expect(settings.get(`${id}.hidden`)).to.deep.equal({ ap1: false });

      settings.set(`${id}.hidden`, hidden);
      expect(settings.get(`${id}.hidden`)).to.deep.equal({ ap1: true });
    });

    describe('defaults of the items', () => {
      const factions = () => [
        { id: 'ENL', title: 'Enlightened' },
        { id: 'RES', title: 'Resistance' },
      ];
      const colors = { ENL: '#03dc03', RES: '#0088ff' };

      it('gives every item of over without a stored entry its default, from a function of the item', () => {
        const id = page([{ type: 'repeat', over: factions, blocks: [{ type: 'color', key: 'color', default: (item) => colors[item.id] }] }]);
        localStorage.setItem(`iitc-setting:${id}.color`, JSON.stringify({ RES: '#ffffff', gone: '#000000' }));

        expect(settings.get(`${id}.color`)).to.deep.equal({ ENL: '#03dc03', RES: '#ffffff', gone: '#000000' });
        expect(settings.export()[`${id}.color`]).to.deep.equal({ RES: '#ffffff', gone: '#000000' });
      });

      it('uses the default of the type when the function fails', () => {
        const warn = sinon.spy(globalThis.log, 'warn');
        const id = page([
          {
            type: 'repeat',
            over: factions,
            blocks: [
              {
                type: 'color',
                key: 'color',
                default: () => {
                  throw new Error('no palette');
                },
              },
            ],
          },
        ]);

        expect(settings.get(`${id}.color`)).to.deep.equal({ ENL: '#000000', RES: '#000000' });
        expect(warn.calledWithMatch(`default of "${id}.color" failed`)).to.be.true;
      });

      it('returns the stored entries only when over fails', () => {
        const warn = sinon.spy(globalThis.log, 'warn');
        const over = () => {
          throw new Error('not loaded');
        };
        const id = page([{ type: 'repeat', over, blocks: [{ type: 'boolean', key: 'hidden', default: () => true }] }]);
        settings.set(`${id}.hidden`, { ap1: false });

        expect(settings.get(`${id}.hidden`)).to.deep.equal({ ap1: false });
        expect(warn.calledWithMatch(`items of the repeat of "${id}.hidden" failed`)).to.be.true;
      });

      it('takes a default function only inside a repeat', () => {
        const warn = sinon.spy(globalThis.log, 'warn');
        const id = page([{ type: 'number', key: 'n', default: () => 5 }]);

        expect(warn.calledWithMatch(`"${id}.n" takes a default function only inside a repeat`)).to.be.true;
        expect(settings.get(`${id}.n`)).to.equal(0);
      });

      it('announces no change when an entry is set to the default of its item', () => {
        const onChange = sinon.spy();
        const id = page([{ type: 'repeat', over: factions, blocks: [{ type: 'color', key: 'color', default: (item) => colors[item.id], onChange }] }]);

        settings.set(`${id}.color`, { ENL: '#03dc03' });
        expect(onChange.called).to.be.false;

        settings.set(`${id}.color`, { ENL: '#ffffff' });
        expect(onChange.lastCall.args.slice(0, 2)).to.deep.equal([
          { ENL: '#ffffff', RES: '#0088ff' },
          { ENL: '#03dc03', RES: '#0088ff' },
        ]);
      });
    });
  });

  describe('settingsPageRegistered hook', () => {
    it('reports the page and its keys once they can be read', () => {
      const seen = [];
      onHook('settingsPageRegistered', ({ pageId, keys }) => seen.push({ pageId, keys, values: keys.map((key) => settings.get(key)) }));

      settings.register('test-registered-hook', { blocks: [{ type: 'number', key: 'n', default: 7 }, { type: 'heading' }] });

      expect(seen).to.deep.equal([{ pageId: 'test-registered-hook', keys: ['test-registered-hook.n'], values: [7] }]);
    });

    it('announces no change when a new declaration of the page reads a value differently', () => {
      const onChange = sinon.spy();
      const hook = onHook('settingChanged');
      const declare = (options) => settings.register('test-redeclare', { blocks: [{ type: 'select', key: 'mode', options, default: 'a', onChange }] });
      declare(['a', 'b']);
      settings.set('test-redeclare.mode', 'b');
      onChange.resetHistory();
      hook.resetHistory();

      declare(['a', 'c']);

      expect(settings.get('test-redeclare.mode')).to.equal('a');
      expect(onChange.called).to.be.false;
      expect(hook.called).to.be.false;
      expect(localStorage.getItem('iitc-setting:test-redeclare.mode')).to.equal('"b"');
    });

    it('lets a settingsPageRegistered handler set values without reporting them twice', () => {
      const hook = onHook('settingChanged');
      let round = 0;
      onHook('settingsPageRegistered', ({ keys }) => {
        round++;
        keys.forEach((key) => settings.set(key, `remote ${round}`, { source: 'remote' }));
      });

      settings.register('test-register-set', { blocks: [{ type: 'string', key: 's' }] });
      settings.register('test-register-set', { blocks: [{ type: 'string', key: 's' }] });

      expect(hook.args.map(([event]) => [event.value, event.source])).to.deep.equal([
        ['remote 1', 'remote'],
        ['remote 2', 'remote'],
      ]);
    });
  });

  describe('export', () => {
    it('collects stored values of declared settings, without defaults or undeclared keys', () => {
      const id = page([
        { type: 'number', key: 'n', default: 30 },
        { type: 'string', key: 'unset', default: 'x' },
        { type: 'boolean', key: 'b' },
      ]);
      settings.set(`${id}.n`, 60);
      settings.set(`${id}.b`, true);
      settings.set('test-free.state', 'saved');

      const values = settings.export();

      expect(values[`${id}.n`]).to.equal(60);
      expect(values[`${id}.b`]).to.be.true;
      expect(values).to.not.have.property(`${id}.unset`);
      expect(values).to.not.have.property('test-free.state');
    });

    it('leaves out settings that belong to this device only when exporting for sync', () => {
      const id = page([{ type: 'boolean', key: 'local', sync: false }]);
      settings.set(`${id}.local`, true);

      expect(settings.export()[`${id}.local`]).to.be.true;
      expect(settings.export({ sync: true })).to.not.have.property(`${id}.local`);
    });

    it('keeps settings without a sync flag when exporting for sync', () => {
      const id = page([{ type: 'boolean', key: 'plain' }]);
      settings.set(`${id}.plain`, true);
      expect(settings.export({ sync: true })[`${id}.plain`]).to.be.true;
    });

    it('tells whether a stored value is missing, valid or invalid, without logging', () => {
      const id = page([{ type: 'number', key: 'n', max: 10 }]);
      const warn = sinon.spy(globalThis.log, 'warn');

      expect(settings._storedState(`${id}.n`)).to.equal('missing');
      localStorage.setItem(`iitc-setting:${id}.n`, '5');
      expect(settings._storedState(`${id}.n`)).to.equal('valid');
      localStorage.setItem(`iitc-setting:${id}.n`, '500');
      expect(settings._storedState(`${id}.n`)).to.equal('invalid');
      localStorage.setItem(`iitc-setting:${id}.n`, '{broken');
      expect(settings._storedState(`${id}.n`)).to.equal('invalid');
      expect(warn.called).to.be.false;
    });

    it('tells which keys are declared settings that sync', () => {
      const id = page([
        { type: 'boolean', key: 'shared' },
        { type: 'boolean', key: 'local', sync: false },
      ]);
      expect(settings._syncs(`${id}.shared`)).to.be.true;
      expect(settings._syncs(`${id}.local`)).to.be.false;
      expect(settings._syncs('test-free.state')).to.be.false;
    });

    it('keeps a stored value that the current options do not list yet', () => {
      let layers = [];
      const id = page([{ type: 'select', key: 'layer', options: () => layers }]);
      localStorage.setItem(`iitc-setting:${id}.layer`, '"satellite"');

      const backup = settings.export();
      expect(backup[`${id}.layer`]).to.equal('satellite');

      localStorage.clear();
      layers = ['roads', 'satellite'];
      expect(settings.import(backup).applied).to.include(`${id}.layer`);
    });
  });

  describe('import', () => {
    it('stores declared values and reports the rest', () => {
      const id = page([
        { type: 'number', key: 'n', max: 100 },
        { type: 'string', key: 's' },
      ]);

      const result = settings.import({ [`${id}.n`]: 500, [`${id}.s`]: 'text', 'test-missing-plugin.key': 1 });

      expect(result).to.deep.equal({ applied: [`${id}.s`], rejected: [`${id}.n`], skipped: ['test-missing-plugin.key'] });
      expect(settings.get(`${id}.s`)).to.equal('text');
      expect(localStorage.getItem('iitc-setting:test-missing-plugin.key')).to.be.null;
    });

    it('announces imported values like any other change', () => {
      const onChange = sinon.spy();
      const id = page([{ type: 'number', key: 'n', default: 30, onChange }]);

      settings.import({ [`${id}.n`]: 45 });

      expect(onChange.calledOnceWithExactly(45, 30, 'local')).to.be.true;
    });

    it('restores what export produced', () => {
      const id = page([{ type: 'repeat', over: () => [], blocks: [{ type: 'boolean', key: 'hidden' }] }]);
      settings.set(`${id}.hidden`, { ap1: true });
      const backup = JSON.parse(JSON.stringify(settings.export()));
      localStorage.clear();

      settings.import(backup);

      expect(settings.get(`${id}.hidden`)).to.deep.equal({ ap1: true });
    });

    it('skips keys named after Object.prototype members', () => {
      const values = { constructor: 1, toString: 1, ...JSON.parse('{"__proto__": 1}') };

      expect(settings.import(values)).to.deep.equal({ applied: [], rejected: [], skipped: ['constructor', 'toString', '__proto__'] });
    });

    it('restores settings that belong to this device from a local backup', () => {
      const id = page([{ type: 'boolean', key: 'local', sync: false }]);
      settings.set(`${id}.local`, true);
      const backup = settings.export();
      localStorage.clear();

      expect(settings.import(backup).applied).to.include(`${id}.local`);
      expect(settings.get(`${id}.local`)).to.be.true;
    });

    it('skips settings that belong to this device when the values come from another one', () => {
      const id = page([
        { type: 'boolean', key: 'local', sync: false },
        { type: 'repeat', over: () => [], blocks: [{ type: 'string', key: 'names', sync: false }] },
      ]);

      const result = settings.import({ [`${id}.local`]: true, [`${id}.names`]: { a: 'x' } }, { source: 'remote' });

      expect(result.skipped).to.deep.equal([`${id}.local`, `${id}.names`]);
      expect(settings.get(`${id}.local`)).to.be.false;
      expect(settings.get(`${id}.names`)).to.deep.equal({});
    });

    it('passes the source to the settingChanged hook', () => {
      const hook = onHook('settingChanged');
      const id = page([{ type: 'number', key: 'n' }]);

      settings.import({ [`${id}.n`]: 5 }, { source: 'remote' });

      expect(hook.firstCall.args[0].source).to.equal('remote');
    });

    it('ignores input that is not an object of values', () => {
      expect(settings.import(['a'])).to.deep.equal({ applied: [], rejected: [], skipped: [] });
    });
  });
});
