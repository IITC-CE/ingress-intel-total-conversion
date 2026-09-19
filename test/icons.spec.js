import { describe, it, before, afterEach } from 'mocha';
import { expect } from 'chai';
import { JSDOM } from 'jsdom';

/* eslint-disable no-unused-expressions */

// icons.js registers on a document of its own, so the other specs keep rendering plain markup
const { window: iconWindow } = new JSDOM();
const { document: iconDocument } = iconWindow;

before(async () => {
  globalThis.HTMLElement = iconWindow.HTMLElement;
  window.customElements = iconWindow.customElements;
  await import('../core/code/icons.js');
  delete globalThis.HTMLElement;
  delete window.customElements;
});

afterEach(() => {
  iconDocument.body.innerHTML = '';
});

const render = (html) => {
  iconDocument.body.innerHTML = html;
  return iconDocument.body.firstElementChild;
};

describe('<iitc-icon>', () => {
  it('is registered as a custom element', () => {
    expect(iconWindow.customElements.get('iitc-icon')).to.be.a('function');
  });

  it('hides an unlabelled icon from assistive technology', () => {
    const icon = render('<iitc-icon>star</iitc-icon>');
    expect(icon.getAttribute('aria-hidden')).to.equal('true');
    expect(icon.hasAttribute('role')).to.be.false;
    expect(icon.hasAttribute('aria-label')).to.be.false;
  });

  it('exposes a label as the accessible name of an image', () => {
    const icon = render('<iitc-icon label="Remove" fallback="X">close</iitc-icon>');
    expect(icon.getAttribute('role')).to.equal('img');
    expect(icon.getAttribute('aria-label')).to.equal('Remove');
    expect(icon.hasAttribute('aria-hidden')).to.be.false;
  });

  it('follows a label set or removed later', () => {
    const icon = render('<iitc-icon>close</iitc-icon>');
    icon.setAttribute('label', 'Close');
    expect(icon.getAttribute('aria-label')).to.equal('Close');
    expect(icon.hasAttribute('aria-hidden')).to.be.false;

    icon.removeAttribute('label');
    expect(icon.getAttribute('aria-hidden')).to.equal('true');
    expect(icon.hasAttribute('aria-label')).to.be.false;
  });

  it('applies to an icon created before it is attached', () => {
    const icon = iconDocument.createElement('iitc-icon');
    icon.setAttribute('label', 'Close');
    icon.textContent = 'close';
    iconDocument.body.append(icon);
    expect(icon.getAttribute('role')).to.equal('img');
    expect(icon.getAttribute('aria-label')).to.equal('Close');
  });
});
