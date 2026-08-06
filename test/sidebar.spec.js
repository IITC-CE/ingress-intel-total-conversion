import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

await import('../core/code/utils.js');
await import('../core/code/_deprecated.js');
await import('../core/code/sidebar.js');

describe('portal image click', () => {
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
