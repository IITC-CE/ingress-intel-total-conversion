import { describe, it, before, after, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

await import('../core/code/utils.js');
await import('../core/code/_deprecated.js');
await import('../core/code/sidebar.js');

// a Leaflet control stub and the DOM helpers the sidebar toggle uses
const withLeafletControls = () => {
  let replaced;
  before(() => {
    replaced = globalThis.L;
    globalThis.L = {
      ...replaced,
      DomUtil: {
        create: (tag, className, parent) => {
          const element = document.createElement(tag);
          if (className) element.className = className;
          parent?.append(element);
          return element;
        },
      },
      DomEvent: {
        on: (element, type, handler) => element.addEventListener(type, handler),
        preventDefault: (event) => event.preventDefault(),
        disableClickPropagation() {},
      },
      Control: {
        extend: (proto) =>
          class {
            addTo() {
              document.body.append(proto.onAdd());
              return this;
            }
          },
      },
    };
  });
  after(() => {
    globalThis.L = replaced;
  });
};

describe('portal image click', () => {
  withLeafletControls();

  before(() => {
    // collaborators setupSidebar pulls in on its way to the image handler
    window.addHook = window.addHook || (() => {});
    window.setupPlayerStat = window.setupPlayerStat || (() => {});
    window.artifact = window.artifact || { setup: () => {} };
    window.RegionScoreboardSetup = window.RegionScoreboardSetup || (() => {});
    IITC.toolbox = IITC.toolbox || { addButton: () => {} };
    IITC.portal = IITC.portal || {};
    IITC.portal.display = IITC.portal.display || {};
    IITC.portal.display.resetScroll = IITC.portal.display.resetScroll || (() => {});
  });

  beforeEach(() => {
    document.body.innerHTML =
      '<div id="sidebar">' +
      '<div id="portaldetails"><h3 id="portaltitle"><span class="value">My Portal</span></h3></div>' +
      '<img class="fullimg" src="portal.png">' +
      '</div>';
    // the delegated handler lives on #portaldetails, so it has to be re-attached to the rebuilt DOM
    window.setupSidebar();
  });

  afterEach(() => sinon.restore());

  const renderPreview = ({ withHiddenImage }) => {
    const hidden = withHiddenImage ? '<img class="hide" src="portal.png">' : '';
    document.getElementById('portaldetails').insertAdjacentHTML('beforeend', `<div class="imgpreview"><span id="level">8</span>${hidden}</div>`);
  };

  it('opens the image dialog on the desktop, including a click on the level marker', () => {
    const dialog = sinon.stub(window, 'dialog');
    renderPreview({ withHiddenImage: true });

    $('.imgpreview').trigger('click');
    expect(dialog.calledOnce).to.be.true;
    // the title comes from innerText, which jsdom does not implement, so only the rest is asserted
    expect(dialog.firstCall.args[0]).to.include({ id: 'iitc-portal-image' });
    expect(dialog.firstCall.args[0].html.src).to.contain('portal.png');

    $('#level').trigger('click');
    expect(dialog.calledTwice).to.be.true;
  });

  // jsdom implements no scrolling at all, so the element carries no scrollTo of its own
  const spyOnSidebarScroll = () => {
    const scrollTo = sinon.spy();
    document.getElementById('sidebar').scrollTo = scrollTo;
    return scrollTo;
  };

  // a smartphone renders no hidden image inside the preview, so the branch has to be taken
  // before the dialog path reads it
  it('scrolls the sidebar to the full image on a smartphone instead of opening a dialog', () => {
    sinon.stub(IITC.utils, 'isSmartphone').returns(true);
    const dialog = sinon.stub(window, 'dialog');
    const scrollTo = spyOnSidebarScroll();
    renderPreview({ withHiddenImage: false });

    $('.imgpreview').trigger('click');

    expect(dialog.called).to.be.false;
    expect(scrollTo.calledOnce).to.be.true;
    expect(scrollTo.firstCall.args[0]).to.include({ behavior: 'smooth' });
    expect(scrollTo.firstCall.args[0]).to.have.property('top');
  });

  it('ignores a click on the level marker on a smartphone', () => {
    sinon.stub(IITC.utils, 'isSmartphone').returns(true);
    const scrollTo = spyOnSidebarScroll();
    renderPreview({ withHiddenImage: false });

    $('#level').trigger('click');

    expect(scrollTo.called).to.be.false;
  });

  it('does nothing on a smartphone when the sidebar carries no full image', () => {
    sinon.stub(IITC.utils, 'isSmartphone').returns(true);
    document.querySelector('#sidebar > .fullimg').remove();
    const scrollTo = spyOnSidebarScroll();
    renderPreview({ withHiddenImage: false });

    expect(() => $('.imgpreview').trigger('click')).to.not.throw();
    expect(scrollTo.called).to.be.false;
  });
});

describe('sidebar toggle', () => {
  withLeafletControls();

  beforeEach(() => {
    document.body.className = '';
    document.body.innerHTML = '<div id="scrollwrapper"><div id="sidebar"><div id="portaldetails"></div></div></div>';
  });

  afterEach(() => sinon.restore());

  const icon = () => document.querySelector('#sidebartoggle iitc-icon');

  it('hides and shows the sidebar', () => {
    const resetScroll = sinon.spy(IITC.portal.display, 'resetScroll');
    window.setupSidebar();
    const sidebar = document.getElementById('scrollwrapper');
    // jsdom lays nothing out, so the sidebar counts as visible by its client rects
    sinon.stub(sidebar, 'getClientRects').callsFake(() => (sidebar.style.display === 'none' ? [] : [{}]));
    expect(document.body.classList.contains('sidebar-open')).to.be.true;
    expect(icon().textContent).to.equal('chevron_right');

    document.getElementById('sidebartoggle').click();
    expect(sidebar.style.display).to.equal('none');
    expect(document.body.classList.contains('sidebar-open')).to.be.false;
    expect(icon().textContent).to.equal('chevron_left');
    expect(icon().getAttribute('fallback')).to.equal('◀');

    document.getElementById('sidebartoggle').click();
    expect(sidebar.style.display).to.equal('');
    expect(document.body.classList.contains('sidebar-open')).to.be.true;
    expect(icon().textContent).to.equal('chevron_right');
    expect(resetScroll.calledOnce).to.be.true;
  });

  it('answers the jQuery click of a plugin', () => {
    window.setupSidebar();
    sinon.stub(document.getElementById('scrollwrapper'), 'getClientRects').returns([{}]);

    $('#sidebartoggle').click();
    expect(document.body.classList.contains('sidebar-open')).to.be.false;
  });

  it('adds no toggle on a smartphone', () => {
    sinon.stub(IITC.utils, 'isSmartphone').returns(true);
    window.setupSidebar();
    expect(document.getElementById('sidebartoggle')).to.be.null;
    expect(document.body.classList.contains('sidebar-open')).to.be.true;
  });
});
