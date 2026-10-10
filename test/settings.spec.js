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
        { type: 'action', key: 'run', label: 'Run', action: () => {} },
      ]);
      expect(Object.keys(settings._definitions).filter((key) => key.startsWith(`${id}.`))).to.be.empty;
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

    it('overwrites an invalid stored value with one equal to the default', () => {
      const id = page([{ type: 'number', key: 'n', default: 30, max: 100 }]);
      localStorage.setItem(`iitc-setting:${id}.n`, '500');

      expect(settings.set(`${id}.n`, 30)).to.be.true;
      expect(localStorage.getItem(`iitc-setting:${id}.n`)).to.equal('30');
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
    it('runs the settingChanged hook, then onChange, with the new and the old value', () => {
      const onChange = sinon.spy();
      const hook = onHook('settingChanged');
      const id = page([{ type: 'number', key: 'n', default: 30, onChange }]);

      settings.set(`${id}.n`, 60);

      expect(hook.calledOnceWithExactly({ key: `${id}.n`, value: 60, oldValue: 30 })).to.be.true;
      expect(onChange.calledOnceWithExactly(60, 30)).to.be.true;
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

    it('stays silent when the value does not change', () => {
      const onChange = sinon.spy();
      const hook = onHook('settingChanged');
      const id = page([{ type: 'number', key: 'n', default: 30, onChange }]);

      settings.set(`${id}.n`, 30);
      settings.set(`${id}.n`, 30);

      expect(onChange.called).to.be.false;
      expect(hook.called).to.be.false;
      expect(localStorage.getItem(`iitc-setting:${id}.n`)).to.equal('30');
    });

    it('notifies a reset that returns the value to its default', () => {
      const onChange = sinon.spy();
      const id = page([{ type: 'number', key: 'n', default: 30, onChange }]);
      settings.set(`${id}.n`, 60);

      settings.reset(`${id}.n`);

      expect(onChange.lastCall.args).to.deep.equal([30, 60]);
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

    it('stores a map changed in place after get', () => {
      const id = page([{ type: 'repeat', over: () => [], blocks: [{ type: 'boolean', key: 'hidden' }] }]);
      settings.set(`${id}.hidden`, { ap1: false });

      const hidden = settings.get(`${id}.hidden`);
      hidden.ap1 = true;
      expect(settings.get(`${id}.hidden`)).to.deep.equal({ ap1: false });

      settings.set(`${id}.hidden`, hidden);
      expect(settings.get(`${id}.hidden`)).to.deep.equal({ ap1: true });
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

      expect(onChange.calledOnceWithExactly(45, 30)).to.be.true;
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

    it('ignores input that is not an object of values', () => {
      expect(settings.import(['a'])).to.deep.equal({ applied: [], rejected: [], skipped: [] });
    });
  });
});
