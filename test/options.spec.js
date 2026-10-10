import { describe, it, before, after, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

await import('../core/code/hooks.js');
await import('../core/code/options.js');

const options = IITC.options;

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
  options.register(id, { title: 'Test', blocks, ...extra });
  return id;
};

describe('IITC.options', () => {
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
      expect(options._definitions[`${id}.flag`]).to.include({ type: 'boolean', pageId: id });
    });

    it('uses the namespace instead of the page id when one is given', () => {
      page([{ type: 'boolean', key: 'flag' }], { namespace: 'custom-ns' });
      expect(options.get('custom-ns.flag')).to.equal(false);
    });

    it('ignores blocks without a key and blocks that cannot hold a value', () => {
      const id = page([
        { type: 'heading', title: 'Section' },
        { type: 'action', key: 'run', label: 'Run', action: () => {} },
      ]);
      expect(Object.keys(options._definitions).filter((key) => key.startsWith(`${id}.`))).to.be.empty;
    });

    it('replaces the declaration when the same page registers again', () => {
      options.register('test-reregister', { blocks: [{ type: 'boolean', key: 'old' }] });
      options.register('test-reregister', { blocks: [{ type: 'boolean', key: 'new' }] });
      expect(options._definitions['test-reregister.old']).to.be.undefined;
      expect(options._definitions['test-reregister.new']).to.exist;
    });

    it('keeps the first declaration of a key claimed by two pages', () => {
      options.register('test-owner-a', { namespace: 'shared-ns', blocks: [{ type: 'number', key: 'n', default: 1 }] });
      options.register('test-owner-b', { namespace: 'shared-ns', blocks: [{ type: 'number', key: 'n', default: 2 }] });
      expect(options.get('shared-ns.n')).to.equal(1);
    });

    it('rejects a page without an id or blocks', () => {
      expect(options.register('', { blocks: [] })).to.be.false;
      expect(options.register('test-no-blocks', { title: 'Empty' })).to.be.false;
    });
  });

  describe('get', () => {
    it('returns the declared default while nothing is stored', () => {
      const id = page([{ type: 'number', key: 'n', default: 30 }]);
      expect(options.get(`${id}.n`)).to.equal(30);
    });

    it('falls back to a default for the type', () => {
      const id = page([
        { type: 'boolean', key: 'b' },
        { type: 'string', key: 's' },
        { type: 'select', key: 'sel', choices: [{ value: 'first', label: 'First' }, 'second'] },
      ]);
      expect(options.get(`${id}.b`)).to.equal(false);
      expect(options.get(`${id}.s`)).to.equal('');
      expect(options.get(`${id}.sel`)).to.equal('first');
    });

    it('returns the default when the stored value is not valid', () => {
      const id = page([{ type: 'number', key: 'n', default: 30, max: 100 }]);
      localStorage.setItem(`iitc-option:${id}.n`, '500');
      expect(options.get(`${id}.n`)).to.equal(30);
    });

    it('returns the default when the stored value is not JSON', () => {
      const id = page([{ type: 'string', key: 's', default: 'x' }]);
      localStorage.setItem(`iitc-option:${id}.s`, '{broken');
      expect(options.get(`${id}.s`)).to.equal('x');
    });

    it('picks up a value written to localStorage by someone else', () => {
      const id = page([{ type: 'string', key: 's' }]);
      options.set(`${id}.s`, 'mine');
      localStorage.setItem(`iitc-option:${id}.s`, '"theirs"');
      expect(options.get(`${id}.s`)).to.equal('theirs');
    });

    it('returns the fallback for an undeclared key with nothing stored', () => {
      expect(options.get('test-undeclared.key', 42)).to.equal(42);
    });

    it('treats names of Object.prototype members as ordinary undeclared keys', () => {
      expect(options.get('toString', 5)).to.equal(5);
      expect(options.set('constructor', 'value')).to.be.true;
      expect(options.get('constructor')).to.equal('value');
    });
  });

  describe('set', () => {
    it('stores the value as JSON under the prefixed key', () => {
      const id = page([{ type: 'number', key: 'n' }]);
      expect(options.set(`${id}.n`, 15)).to.be.true;
      expect(localStorage.getItem(`iitc-option:${id}.n`)).to.equal('15');
      expect(options.get(`${id}.n`)).to.equal(15);
    });

    it('stores an undeclared key without validation', () => {
      expect(options.set('test-free.state', { folder: 'a' })).to.be.true;
      expect(options.get('test-free.state')).to.deep.equal({ folder: 'a' });
    });

    it('overwrites an invalid stored value with one equal to the default', () => {
      const id = page([{ type: 'number', key: 'n', default: 30, max: 100 }]);
      localStorage.setItem(`iitc-option:${id}.n`, '500');

      expect(options.set(`${id}.n`, 30)).to.be.true;
      expect(localStorage.getItem(`iitc-option:${id}.n`)).to.equal('30');
    });

    it('removes an undeclared value when given undefined', () => {
      options.set('test-free.gone', 'here');
      expect(options.set('test-free.gone', undefined)).to.be.true;
      expect(localStorage.getItem('iitc-option:test-free.gone')).to.be.null;
    });

    it('rejects undefined for a declared option and keeps its value', () => {
      const id = page([{ type: 'color', key: 'color' }]);
      options.set(`${id}.color`, '#a24ac3');
      expect(options.set(`${id}.color`, undefined)).to.be.false;
      expect(options.get(`${id}.color`)).to.equal('#a24ac3');
    });

    it('rejects a value that cannot be serialized', () => {
      expect(options.set('test-free.callback', () => {})).to.be.false;
      expect(localStorage.getItem('iitc-option:test-free.callback')).to.be.null;

      const id = page([
        {
          type: 'select',
          key: 'sel',
          choices: () => {
            throw new Error('no choices yet');
          },
        },
      ]);
      expect(options.set(`${id}.sel`, undefined)).to.be.false;
      expect(localStorage.getItem(`iitc-option:${id}.sel`)).to.be.null;
    });

    it('does not warn about the invalid value it overwrites', () => {
      const id = page([{ type: 'number', key: 'n', default: 30, max: 100 }]);
      localStorage.setItem(`iitc-option:${id}.n`, '500');
      const warn = sinon.spy(globalThis.log, 'warn');

      options.set(`${id}.n`, 50);
      localStorage.setItem(`iitc-option:${id}.n`, '500');
      options.reset(`${id}.n`);

      expect(warn.called).to.be.false;
    });

    it('reads a value back as it is stored', () => {
      const value = { folder: 'a', callback: () => {} };
      expect(options.set('test-free.state', value)).to.be.true;
      expect(options.get('test-free.state')).to.deep.equal({ folder: 'a' });
    });

    it('returns false when the storage is full', () => {
      const id = page([{ type: 'string', key: 's', default: 'kept' }]);
      sinon.stub(Object.getPrototypeOf(localStorage), 'setItem').throws(new Error('QuotaExceededError'));
      expect(options.set(`${id}.s`, 'lost')).to.be.false;
      expect(options.get(`${id}.s`)).to.equal('kept');
    });

    describe('validation', () => {
      const rejects = (block, value) => {
        const id = page([{ key: 'v', ...block }]);
        expect(options.set(`${id}.v`, value), JSON.stringify(value)).to.be.false;
        expect(localStorage.getItem(`iitc-option:${id}.v`)).to.be.null;
      };
      const accepts = (block, value) => {
        const id = page([{ key: 'v', ...block }]);
        expect(options.set(`${id}.v`, value), JSON.stringify(value)).to.be.true;
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

      it('accepts only the values of select choices', () => {
        const choices = [{ value: 'long', label: 'Detailed' }, 'short'];
        rejects({ type: 'select', choices }, 'Detailed');
        accepts({ type: 'select', choices }, 'long');
        accepts({ type: 'select', choices: () => ['dynamic'] }, 'dynamic');
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
        expect(options.set(`${id}.v`, 7)).to.be.false;
        expect(warn.lastCall.args[0]).to.contain('multiple of five');
        expect(options.set(`${id}.v`, 10)).to.be.true;
      });
    });
  });

  describe('reset', () => {
    it('removes the stored value so the default applies again', () => {
      const id = page([{ type: 'number', key: 'n', default: 30 }]);
      options.set(`${id}.n`, 60);
      options.reset(`${id}.n`);
      expect(localStorage.getItem(`iitc-option:${id}.n`)).to.be.null;
      expect(options.get(`${id}.n`)).to.equal(30);
    });
  });

  describe('change notification', () => {
    it('runs the optionChanged hook, then onChange, with the new value, the old value and the source', () => {
      const onChange = sinon.spy();
      const hook = onHook('optionChanged');
      const id = page([{ type: 'number', key: 'n', default: 30, onChange }]);

      options.set(`${id}.n`, 60);

      expect(hook.calledOnceWithExactly({ key: `${id}.n`, value: 60, oldValue: 30, source: 'local' })).to.be.true;
      expect(onChange.calledOnceWithExactly(60, 30, 'local')).to.be.true;
      expect(hook.calledBefore(onChange)).to.be.true;
    });

    it('runs onChange when an optionChanged handler returns false', () => {
      const onChange = sinon.spy();
      const handler = onHook(
        'optionChanged',
        sinon.spy(() => false)
      );
      const id = page([{ type: 'number', key: 'n', default: 30, onChange }]);

      expect(options.set(`${id}.n`, 60)).to.be.true;
      expect(handler.calledOnce).to.be.true;
      expect(onChange.calledOnce).to.be.true;
    });

    it('runs onChange when an optionChanged handler throws', () => {
      const onChange = sinon.spy();
      const handler = onHook(
        'optionChanged',
        sinon.spy(() => {
          throw new Error('boom');
        })
      );
      const id = page([{ type: 'number', key: 'n', default: 30, onChange }]);

      expect(options.set(`${id}.n`, 60)).to.be.true;
      expect(handler.calledOnce).to.be.true;
      expect(onChange.calledOnce).to.be.true;
    });

    it('defaults the source when opts are null', () => {
      const hook = onHook('optionChanged');
      const id = page([{ type: 'boolean', key: 'b' }]);

      options.set(`${id}.b`, true, null);
      options.reset(`${id}.b`, null);

      expect(hook.args.map(([event]) => event.source)).to.deep.equal(['local', 'local']);
    });

    it('keeps an option that belongs to this device from remote set and reset', () => {
      const id = page([{ type: 'number', key: 'n', default: 30, sync: false }]);
      options.set(`${id}.n`, 60);

      expect(options.set(`${id}.n`, 90, { source: 'remote' })).to.be.false;
      expect(options.reset(`${id}.n`, { source: 'remote' })).to.be.false;
      expect(options.get(`${id}.n`)).to.equal(60);

      expect(options.set(`${id}.n`, 90)).to.be.true;
      expect(options.reset(`${id}.n`)).to.be.true;
      expect(options.get(`${id}.n`)).to.equal(30);
    });

    it('ignores remote values for undeclared keys', () => {
      expect(options.set('test-free.remote', 42, { source: 'remote' })).to.be.false;
      expect(localStorage.getItem('iitc-option:test-free.remote')).to.be.null;

      options.set('test-free.remote', 'local value');
      expect(options.set('test-free.remote', undefined, { source: 'remote' })).to.be.false;
      expect(options.get('test-free.remote')).to.equal('local value');
    });

    it('passes the source given to set and reset', () => {
      const onChange = sinon.spy();
      const id = page([{ type: 'number', key: 'n', default: 30, onChange }]);

      options.set(`${id}.n`, 60, { source: 'remote' });
      options.reset(`${id}.n`, { source: 'remote' });

      expect(onChange.args).to.deep.equal([
        [60, 30, 'remote'],
        [30, 60, 'remote'],
      ]);
    });

    it('stays silent when the value does not change', () => {
      const onChange = sinon.spy();
      const hook = onHook('optionChanged');
      const id = page([{ type: 'number', key: 'n', default: 30, onChange }]);

      options.set(`${id}.n`, 30);
      options.set(`${id}.n`, 30);

      expect(onChange.called).to.be.false;
      expect(hook.called).to.be.false;
      expect(localStorage.getItem(`iitc-option:${id}.n`)).to.equal('30');
    });

    it('notifies a reset that returns the value to its default', () => {
      const onChange = sinon.spy();
      const id = page([{ type: 'number', key: 'n', default: 30, onChange }]);
      options.set(`${id}.n`, 60);

      options.reset(`${id}.n`);

      expect(onChange.lastCall.args).to.deep.equal([30, 60, 'local']);
    });
  });

  describe('repeat', () => {
    it('keeps a map of item id to value and validates every entry', () => {
      const id = page([{ type: 'repeat', over: () => [], blocks: [{ type: 'boolean', key: 'hidden' }] }]);
      expect(options.get(`${id}.hidden`)).to.deep.equal({});

      expect(options.set(`${id}.hidden`, { ap1: true, sc5: false })).to.be.true;
      expect(JSON.parse(localStorage.getItem(`iitc-option:${id}.hidden`))).to.deep.equal({ ap1: true, sc5: false });
      expect(options.set(`${id}.hidden`, { ap1: 'yes' })).to.be.false;
      expect(options.set(`${id}.hidden`, true)).to.be.false;
    });

    it('stores a map changed in place after get', () => {
      const id = page([{ type: 'repeat', over: () => [], blocks: [{ type: 'boolean', key: 'hidden' }] }]);
      options.set(`${id}.hidden`, { ap1: false });

      const hidden = options.get(`${id}.hidden`);
      hidden.ap1 = true;
      expect(options.get(`${id}.hidden`)).to.deep.equal({ ap1: false });

      options.set(`${id}.hidden`, hidden);
      expect(options.get(`${id}.hidden`)).to.deep.equal({ ap1: true });
    });
  });

  describe('optionsPageRegistered hook', () => {
    it('reports the page and its keys once they can be read', () => {
      const seen = [];
      onHook('optionsPageRegistered', ({ pageId, keys }) => seen.push({ pageId, keys, values: keys.map((key) => options.get(key)) }));

      options.register('test-registered-hook', { blocks: [{ type: 'number', key: 'n', default: 7 }, { type: 'heading' }] });

      expect(seen).to.deep.equal([{ pageId: 'test-registered-hook', keys: ['test-registered-hook.n'], values: [7] }]);
    });

    it('announces no change when a new declaration of the page reads a value differently', () => {
      const onChange = sinon.spy();
      const hook = onHook('optionChanged');
      const declare = (choices) => options.register('test-redeclare', { blocks: [{ type: 'select', key: 'mode', choices, default: 'a', onChange }] });
      declare(['a', 'b']);
      options.set('test-redeclare.mode', 'b');
      onChange.resetHistory();
      hook.resetHistory();

      declare(['a', 'c']);

      expect(options.get('test-redeclare.mode')).to.equal('a');
      expect(onChange.called).to.be.false;
      expect(hook.called).to.be.false;
      expect(localStorage.getItem('iitc-option:test-redeclare.mode')).to.equal('"b"');
    });

    it('lets an optionsPageRegistered handler set values without reporting them twice', () => {
      const hook = onHook('optionChanged');
      let round = 0;
      onHook('optionsPageRegistered', ({ keys }) => {
        round++;
        keys.forEach((key) => options.set(key, `remote ${round}`, { source: 'remote' }));
      });

      options.register('test-register-set', { blocks: [{ type: 'string', key: 's' }] });
      options.register('test-register-set', { blocks: [{ type: 'string', key: 's' }] });

      expect(hook.args.map(([event]) => [event.value, event.source])).to.deep.equal([
        ['remote 1', 'remote'],
        ['remote 2', 'remote'],
      ]);
    });
  });

  describe('export', () => {
    it('collects stored values of declared options, without defaults or undeclared keys', () => {
      const id = page([
        { type: 'number', key: 'n', default: 30 },
        { type: 'string', key: 'unset', default: 'x' },
        { type: 'boolean', key: 'b' },
      ]);
      options.set(`${id}.n`, 60);
      options.set(`${id}.b`, true);
      options.set('test-free.state', 'saved');

      const values = options.exportValues();

      expect(values[`${id}.n`]).to.equal(60);
      expect(values[`${id}.b`]).to.be.true;
      expect(values).to.not.have.property(`${id}.unset`);
      expect(values).to.not.have.property('test-free.state');
    });

    it('leaves out options that belong to this device only when exporting for sync', () => {
      const id = page([{ type: 'boolean', key: 'local', sync: false }]);
      options.set(`${id}.local`, true);

      expect(options.exportValues()[`${id}.local`]).to.be.true;
      expect(options.exportValues({ sync: true })).to.not.have.property(`${id}.local`);
    });

    it('keeps options without a sync flag when exporting for sync', () => {
      const id = page([{ type: 'boolean', key: 'plain' }]);
      options.set(`${id}.plain`, true);
      expect(options.exportValues({ sync: true })[`${id}.plain`]).to.be.true;
    });

    it('tells whether a stored value is missing, valid or invalid, without logging', () => {
      const id = page([{ type: 'number', key: 'n', max: 10 }]);
      const warn = sinon.spy(globalThis.log, 'warn');

      expect(options._storedState(`${id}.n`)).to.equal('missing');
      localStorage.setItem(`iitc-option:${id}.n`, '5');
      expect(options._storedState(`${id}.n`)).to.equal('valid');
      localStorage.setItem(`iitc-option:${id}.n`, '500');
      expect(options._storedState(`${id}.n`)).to.equal('invalid');
      localStorage.setItem(`iitc-option:${id}.n`, '{broken');
      expect(options._storedState(`${id}.n`)).to.equal('invalid');
      expect(warn.called).to.be.false;
    });

    it('tells which keys are declared options that sync', () => {
      const id = page([
        { type: 'boolean', key: 'shared' },
        { type: 'boolean', key: 'local', sync: false },
      ]);
      expect(options._syncs(`${id}.shared`)).to.be.true;
      expect(options._syncs(`${id}.local`)).to.be.false;
      expect(options._syncs('test-free.state')).to.be.false;
    });

    it('keeps a stored value that the current choices do not list yet', () => {
      let layers = [];
      const id = page([{ type: 'select', key: 'layer', choices: () => layers }]);
      localStorage.setItem(`iitc-option:${id}.layer`, '"satellite"');

      const backup = options.exportValues();
      expect(backup[`${id}.layer`]).to.equal('satellite');

      localStorage.clear();
      layers = ['roads', 'satellite'];
      expect(options.importValues(backup).applied).to.include(`${id}.layer`);
    });
  });

  describe('import', () => {
    it('stores declared values and reports the rest', () => {
      const id = page([
        { type: 'number', key: 'n', max: 100 },
        { type: 'string', key: 's' },
      ]);

      const result = options.importValues({ [`${id}.n`]: 500, [`${id}.s`]: 'text', 'test-missing-plugin.key': 1 });

      expect(result).to.deep.equal({ applied: [`${id}.s`], rejected: [`${id}.n`], skipped: ['test-missing-plugin.key'] });
      expect(options.get(`${id}.s`)).to.equal('text');
      expect(localStorage.getItem('iitc-option:test-missing-plugin.key')).to.be.null;
    });

    it('announces imported values like any other change', () => {
      const onChange = sinon.spy();
      const id = page([{ type: 'number', key: 'n', default: 30, onChange }]);

      options.importValues({ [`${id}.n`]: 45 });

      expect(onChange.calledOnceWithExactly(45, 30, 'local')).to.be.true;
    });

    it('restores what export produced', () => {
      const id = page([{ type: 'repeat', over: () => [], blocks: [{ type: 'boolean', key: 'hidden' }] }]);
      options.set(`${id}.hidden`, { ap1: true });
      const backup = JSON.parse(JSON.stringify(options.exportValues()));
      localStorage.clear();

      options.importValues(backup);

      expect(options.get(`${id}.hidden`)).to.deep.equal({ ap1: true });
    });

    it('skips keys named after Object.prototype members', () => {
      const values = { constructor: 1, toString: 1, ...JSON.parse('{"__proto__": 1}') };

      expect(options.importValues(values)).to.deep.equal({ applied: [], rejected: [], skipped: ['constructor', 'toString', '__proto__'] });
    });

    it('restores options that belong to this device from a local backup', () => {
      const id = page([{ type: 'boolean', key: 'local', sync: false }]);
      options.set(`${id}.local`, true);
      const backup = options.exportValues();
      localStorage.clear();

      expect(options.importValues(backup).applied).to.include(`${id}.local`);
      expect(options.get(`${id}.local`)).to.be.true;
    });

    it('skips options that belong to this device when the values come from another one', () => {
      const id = page([
        { type: 'boolean', key: 'local', sync: false },
        { type: 'repeat', over: () => [], blocks: [{ type: 'string', key: 'names', sync: false }] },
      ]);

      const result = options.importValues({ [`${id}.local`]: true, [`${id}.names`]: { a: 'x' } }, { source: 'remote' });

      expect(result.skipped).to.deep.equal([`${id}.local`, `${id}.names`]);
      expect(options.get(`${id}.local`)).to.be.false;
      expect(options.get(`${id}.names`)).to.deep.equal({});
    });

    it('passes the source to the optionChanged hook', () => {
      const hook = onHook('optionChanged');
      const id = page([{ type: 'number', key: 'n' }]);

      options.importValues({ [`${id}.n`]: 5 }, { source: 'remote' });

      expect(hook.firstCall.args[0].source).to.equal('remote');
    });

    it('ignores input that is not an object of values', () => {
      expect(options.importValues(['a'])).to.deep.equal({ applied: [], rejected: [], skipped: [] });
    });
  });
});
