import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

before(async () => {
  await import('../core/code/portal.js');
  await import('../core/code/portal_marker.js'); // resetAll delegates to IITC.portal.marker.setStyle
  await import('../core/code/portal_highlighter.js');
});

afterEach(() => sinon.restore());

describe('IITC.portal.highlighter namespace', () => {
  it('keeps every legacy window.* global working as an alias', () => {
    const aliases = {
      addPortalHighlighter: 'add',
      updatePortalHighlighterControl: 'updateControl',
      changePortalHighlights: 'change',
      highlightPortal: 'highlight',
      resetHighlightedPortals: 'resetAll',
    };
    Object.entries(aliases).forEach(([oldName, newName]) => {
      expect(window[oldName], oldName).to.be.a('function');
      expect(window[oldName], oldName).to.equal(IITC.portal.highlighter[newName]);
    });
  });
});

describe('IITC.portal.highlighter.highlight', () => {
  it('applies the active highlighter to a portal', () => {
    const active = { highlight: sinon.stub().returns('styled') };
    window._highlighters = { Active: active };
    window._current_highlighter = 'Active';

    const portal = { options: { guid: 'g' } };
    expect(IITC.portal.highlighter.highlight(portal)).to.equal('styled');
    expect(active.highlight.calledWith({ portal })).to.be.true;
  });

  it('returns undefined when no highlighter is active', () => {
    window._highlighters = null;
    expect(IITC.portal.highlighter.highlight({})).to.be.undefined;
  });
});

describe('IITC.portal.highlighter.add', () => {
  it('registers a highlighter and defaults the current selection', () => {
    window._highlighters = null;
    window._current_highlighter = undefined;
    sinon.stub(IITC.portal.highlighter, 'updateControl');

    const cb = () => {};
    IITC.portal.highlighter.add('Test', { highlight: cb });

    expect(window._highlighters.Test).to.deep.equal({ highlight: cb });
    expect(window._current_highlighter).to.equal('Test');
    expect(IITC.portal.highlighter.updateControl.calledOnce).to.be.true;
  });

  it('wraps an old-format callback highlighter', () => {
    window._highlighters = null;
    window._current_highlighter = 'Other';
    sinon.stub(IITC.portal.highlighter, 'updateControl');

    const fn = () => {};
    IITC.portal.highlighter.add('Legacy', fn);

    expect(window._highlighters.Legacy).to.deep.equal({ highlight: fn });
  });
});

describe('IITC.portal.highlighter.change', () => {
  it('switches highlighter, fires setSelected callbacks and persists the choice', () => {
    const prev = { highlight: () => {}, setSelected: sinon.spy() };
    const next = { highlight: () => {}, setSelected: sinon.spy() };
    window._highlighters = { Prev: prev, Next: next };
    window._current_highlighter = 'Prev';
    sinon.stub(IITC.portal.highlighter, 'resetAll');

    IITC.portal.highlighter.change('Next');

    expect(prev.setSelected.calledWith(false)).to.be.true;
    expect(next.setSelected.calledWith(true)).to.be.true;
    expect(window._current_highlighter).to.equal('Next');
    expect(globalThis.localStorage.portal_highlighter).to.equal('Next');
    expect(IITC.portal.highlighter.resetAll.calledOnce).to.be.true;
  });
});

describe('IITC.portal.highlighter.resetAll', () => {
  it('restyles every portal, marking only the selected one', () => {
    window.portals = { a: {}, b: {}, sel: {} };
    window.selectedPortal = 'sel';
    const setStyle = sinon.stub(IITC.portal.marker, 'setStyle');

    IITC.portal.highlighter.resetAll();

    expect(setStyle.callCount).to.equal(3);
    expect(setStyle.calledWith(window.portals.a, false)).to.be.true;
    expect(setStyle.calledWith(window.portals.b, false)).to.be.true;
    expect(setStyle.calledWith(window.portals.sel, true)).to.be.true;
  });
});

describe('IITC.portal.highlighter.updateControl', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.isApp = false;
  });

  it('builds a select listing "No Highlights" plus every highlighter, sorted by name', () => {
    window._highlighters = { Zebra: {}, Alpha: {} };
    window._current_highlighter = 'Alpha';

    IITC.portal.highlighter.updateControl();

    expect(document.body.innerHTML).to.equal(
      '<select id="portal_highlight_select">' +
        '<option value="No Highlights">No Highlights</option>' +
        '<option value="Alpha">Alpha</option>' +
        '<option value="Zebra">Zebra</option>' +
        '</select>'
    );
    // the active highlighter is reflected as the select value (a property, not serialized markup)
    expect(document.getElementById('portal_highlight_select').value).to.equal('Alpha');
  });

  it('adds no control when no highlighters are registered', () => {
    window._highlighters = null;
    IITC.portal.highlighter.updateControl();
    expect(document.body.innerHTML).to.equal('');
  });

  it('rebuilds the options without creating a second select on repeated calls', () => {
    window._highlighters = { A: {} };
    window._current_highlighter = 'A';

    IITC.portal.highlighter.updateControl();
    IITC.portal.highlighter.updateControl();

    expect(document.body.innerHTML).to.equal(
      '<select id="portal_highlight_select">' + '<option value="No Highlights">No Highlights</option>' + '<option value="A">A</option>' + '</select>'
    );
  });
});
