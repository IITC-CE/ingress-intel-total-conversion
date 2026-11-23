import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

await import('../core/code/utils.js');
await import('../core/code/popover.js');

const HOVER_DELAY = 300;

const pointerEvent = (type, init = {}) => {
  const { pointerType = 'mouse', ...rest } = init;
  const event = new document.defaultView.MouseEvent(type, { bubbles: true, cancelable: true, ...rest });
  event.pointerType = pointerType;
  return event;
};

const enter = (element, init) => element.dispatchEvent(pointerEvent('pointerover', init));
const leave = (element, init) => element.dispatchEvent(pointerEvent('pointerout', init));
const press = (element, init) => element.dispatchEvent(pointerEvent('pointerdown', init));
// focus of the keyboard, which matches :focus-visible
const focusIn = (element) => {
  element.matches = () => true;
  element.dispatchEvent(new document.defaultView.FocusEvent('focusin', { bubbles: true }));
};
const focusOut = (element, relatedTarget) => element.dispatchEvent(new document.defaultView.FocusEvent('focusout', { bubbles: true, relatedTarget }));
const key = (element, name) => element.dispatchEvent(new document.defaultView.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));

const popover = () => document.getElementById('iitc-popover');
const isShown = () => !!popover() && !popover().hidden;

const addElement = (html) => {
  document.body.insertAdjacentHTML('beforeend', html);
  return document.body.lastElementChild;
};

// the observer of a title runs as a microtask
const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('IITC.popover', () => {
  let clock;
  let epoch = 0;

  // the pointer rests on the element for as long as the popover takes to show
  const hover = (element) => {
    enter(element);
    clock.tick(HOVER_DELAY);
  };

  before(() => {
    globalThis.MutationObserver = document.defaultView.MutationObserver;
    IITC.popover.setup();
  });

  beforeEach(() => {
    // the clock of a test starts after the previous one, as the module compares times across tests
    epoch += 100000;
    clock = sinon.useFakeTimers({ now: epoch });
  });

  afterEach(() => {
    IITC.popover.close();
    leave(document.body);
    clock.restore();
    document.body.innerHTML = '';
  });

  describe('opened by the pointer', () => {
    it('shows the text of data-popover after the delay when the pointer rests on the element', () => {
      const cell = addElement('<div data-popover="Hello">x</div>');
      enter(cell);
      clock.tick(HOVER_DELAY - 1);
      expect(isShown()).to.be.false;

      clock.tick(1);
      expect(popover().textContent).to.equal('Hello');
    });

    it('closes when the pointer leaves, and does not open for a pointer that left before the delay', () => {
      const cell = addElement('<div data-popover="Hello">x</div>');
      hover(cell);
      leave(cell);
      expect(isShown()).to.be.false;

      enter(cell);
      clock.tick(HOVER_DELAY - 1);
      leave(cell);
      clock.tick(HOVER_DELAY);
      expect(isShown()).to.be.false;
    });

    it('stays while the pointer moves between the children of the element', () => {
      const cell = addElement('<div data-popover="Hello"><i>a</i><b>b</b></div>');
      const [a, b] = cell.children;
      enter(a);
      leave(a, { relatedTarget: b });
      enter(b);
      clock.tick(HOVER_DELAY);

      expect(isShown()).to.be.true;
    });

    it('marks the element as described by the popover while it shows, next to what describes it already', () => {
      const cell = addElement('<div data-popover="Hello" aria-describedby="hint">x</div>');
      hover(cell);
      expect(cell.getAttribute('aria-describedby')).to.equal(`hint ${popover().id}`);

      leave(cell);
      expect(cell.getAttribute('aria-describedby')).to.equal('hint');
    });

    it('shows nothing for an empty text', () => {
      const cell = addElement('<div data-popover="">x</div>');
      hover(cell);

      expect(isShown()).to.be.false;
    });

    it('opens at once for the next element when one has just closed', () => {
      const first = addElement('<div data-popover="One">x</div>');
      const second = addElement('<div data-popover="Two">y</div>');
      hover(first);
      leave(first, { relatedTarget: second });
      enter(second);
      clock.tick(0);

      expect(popover().textContent).to.equal('Two');
    });

    it('does not read the text as HTML', () => {
      const cell = addElement('<div data-popover="&lt;b&gt;bold&lt;/b&gt;">x</div>');
      hover(cell);

      expect(popover().textContent).to.equal('<b>bold</b>');
    });
  });

  describe('closing', () => {
    it('closes with Escape', () => {
      const cell = addElement('<div data-popover="Hello">x</div>');
      hover(cell);
      key(document.body, 'Escape');

      expect(isShown()).to.be.false;
    });

    it('closes when what holds the element scrolls, not for another scroll such as the chat', () => {
      const holder = addElement('<div><div data-popover="Hello">x</div></div>');
      const chat = addElement('<div>y</div>');
      hover(holder.firstElementChild);

      chat.dispatchEvent(new document.defaultView.Event('scroll'));
      popover().dispatchEvent(new document.defaultView.Event('scroll'));
      expect(isShown()).to.be.true;

      holder.dispatchEvent(new document.defaultView.Event('scroll'));
      expect(isShown()).to.be.false;
    });

    it('closes when the element is taken off the page, not when it is moved or something else changes', async () => {
      const holder = addElement('<div><div data-popover="Hello">x</div></div>');
      const cell = holder.firstElementChild;
      hover(cell);

      addElement('<p>other</p>');
      document.body.append(holder);
      await settle();
      expect(isShown()).to.be.true;

      holder.remove();
      await settle();
      expect(isShown()).to.be.false;
    });

    it('close(element) closes only the popover of that element', () => {
      const cell = addElement('<div data-popover="Hello">x</div>');
      const other = addElement('<p>other</p>');
      hover(cell);

      IITC.popover.close(other);
      expect(isShown()).to.be.true;

      IITC.popover.close(cell);
      expect(isShown()).to.be.false;
    });
  });

  describe('bind', () => {
    it('shows html as it is', () => {
      const element = addElement('<div>x</div>');
      IITC.popover.bind(element, { html: '<b>Rich</b>' });
      hover(element);

      expect(popover().innerHTML).to.equal('<b>Rich</b>');
    });

    it('asks a function for the content each time, and gives it the element', () => {
      const element = addElement('<div>x</div>');
      let count = 0;
      IITC.popover.bind(element, { text: (source) => `${source.localName} ${++count}` });

      hover(element);
      expect(popover().textContent).to.equal('div 1');
      leave(element);
      hover(element);
      expect(popover().textContent).to.equal('div 2');
    });

    it('adds the class for as long as the popover belongs to the element', () => {
      const element = addElement('<div>x</div>');
      const plain = addElement('<div data-popover="Plain">y</div>');
      IITC.popover.bind(element, { text: 'Bound', className: 'extra' });

      hover(element);
      expect(popover().classList.contains('extra')).to.be.true;

      leave(element);
      hover(plain);
      expect(popover().classList.contains('extra')).to.be.false;
      expect(popover().classList.contains('iitc-popover')).to.be.true;
    });

    it('is forgotten by unbind', () => {
      const element = addElement('<div>x</div>');
      IITC.popover.bind(element, { text: 'Bound' });
      IITC.popover.unbind(element);
      hover(element);

      expect(isShown()).to.be.false;
    });
  });

  describe('position', () => {
    const root = document.documentElement;
    const rectOf = (element, rect) => {
      element.getBoundingClientRect = () => ({ ...rect, width: rect.right - rect.left, height: rect.bottom - rect.top });
    };

    beforeEach(() => {
      Object.defineProperty(root, 'clientWidth', { value: 1000, configurable: true });
      Object.defineProperty(root, 'clientHeight', { value: 800, configurable: true });
    });

    afterEach(() => {
      delete root.clientWidth;
      delete root.clientHeight;
    });

    const placeOf = () => [parseInt(popover().style.left), parseInt(popover().style.top)];

    it('is centred under the element', () => {
      const cell = addElement('<div data-popover="Hello">x</div>');
      rectOf(cell, { left: 100, right: 200, top: 50, bottom: 70 });
      hover(cell);

      expect(placeOf()).to.deep.equal([150, 76]);
    });

    it('goes above the element when there is no room below', () => {
      const cell = addElement('<div data-popover="Hello">x</div>');
      rectOf(cell, { left: 100, right: 200, top: 750, bottom: 798 });
      hover(cell);

      expect(placeOf()[1]).to.equal(744);
    });

    it('stays inside the window', () => {
      const cell = addElement('<div data-popover="Hello">x</div>');
      rectOf(cell, { left: 990, right: 1010, top: 50, bottom: 70 });
      hover(cell);

      // the popover has no width here, so the right edge is the limit
      expect(placeOf()[0]).to.equal(996);
    });
  });

  describe('the element of the popover', () => {
    it('is made again when something removed it from the page', () => {
      const cell = addElement('<div data-popover="Hello">x</div>');
      hover(cell);
      popover().remove();
      leave(cell);

      hover(cell);
      expect(isShown()).to.be.true;
      expect(popover().textContent).to.equal('Hello');
    });

    describe('where the browser has popovers', () => {
      const proto = document.defaultView.HTMLElement.prototype;
      let showPopover;
      let hidePopover;

      beforeEach(() => {
        popover()?.remove();
        showPopover = sinon.spy();
        hidePopover = sinon.spy();
        proto.showPopover = showPopover;
        proto.hidePopover = hidePopover;
      });

      afterEach(() => {
        delete proto.showPopover;
        delete proto.hidePopover;
        popover()?.remove();
      });

      it('puts the popover in the top layer while it shows', () => {
        const cell = addElement('<div data-popover="Hello">x</div>');
        hover(cell);
        expect(popover().getAttribute('popover')).to.equal('manual');
        expect(showPopover.calledOnce).to.be.true;

        leave(cell);
        expect(hidePopover.calledOnce).to.be.true;
      });
    });
  });

  describe('for a title', () => {
    it('shows it in a popover that has the class of the old tooltip too', () => {
      const button = addElement('<button title="Hello">x</button>');
      hover(button);

      expect(popover().textContent).to.equal('Hello');
      expect(popover().classList.contains('ui-tooltip')).to.be.true;
    });

    it('takes the title away while the pointer is over the element, and gives it back after', () => {
      const button = addElement('<button title="Hello">x</button>');
      enter(button);
      expect(button.hasAttribute('title')).to.be.false;

      leave(button);
      expect(button.getAttribute('title')).to.equal('Hello');
      expect(isShown()).to.be.false;
    });

    it('takes the titles of the elements around away too, as the browser would show them, and still opens them', () => {
      const parent = addElement('<div title="Parent"><button title="Child">x</button></div>');
      const button = parent.firstElementChild;
      enter(button);
      expect(parent.hasAttribute('title')).to.be.false;

      leave(button, { relatedTarget: parent });
      expect(parent.getAttribute('title')).to.equal('Parent');
      hover(parent);
      expect(popover().textContent).to.equal('Parent');
    });

    it('reads a table for tabs, and any other title as HTML, as plugins put it there', () => {
      const plain = addElement('<div title="one\ntwo">x</div>');
      hover(plain);
      expect(popover().innerHTML).to.equal('one<br>two');
      leave(plain);

      const table = addElement('<div title="Range:\t10m\nBoost:\t2x">x</div>');
      hover(table);
      expect(Array.from(popover().querySelectorAll('td'), (cell) => cell.textContent)).to.deep.equal(['Range:', '10m', 'Boost:', '2x']);
      leave(table);

      const html = addElement('<div title="<div class=&quot;list&quot;><b>bold</b></div>">x</div>');
      hover(html);
      expect(popover().querySelector('.list b').textContent).to.equal('bold');
    });

    it('shows nothing for an empty title, which also hides the title of the parent', () => {
      const parent = addElement('<div title="Parent"><span title="">x</span></div>');
      hover(parent.firstElementChild);

      expect(isShown()).to.be.false;
      expect(parent.getAttribute('title')).to.equal('Parent');
    });

    it('shows the title of the nearest element that has one', () => {
      const parent = addElement('<div title="Parent"><span title="Child"><i>x</i></span></div>');
      hover(parent.querySelector('i'));

      expect(popover().textContent).to.equal('Child');
    });

    it('takes up a title written while the element is armed', async () => {
      const button = addElement('<button title="Old">x</button>');
      hover(button);

      button.setAttribute('title', 'New');
      await settle();

      expect(button.hasAttribute('title')).to.be.false;
      expect(popover().textContent).to.equal('New');
    });

    it('quiets with the press of a mouse, and does not bring the title back while the pointer stays', () => {
      const button = addElement('<button title="Hello">x</button>');
      hover(button);

      press(button);
      expect(isShown()).to.be.false;
      expect(button.hasAttribute('title')).to.be.false;

      clock.tick(HOVER_DELAY * 2);
      expect(isShown()).to.be.false;
    });

    it('shows for the focus of the keyboard, and is done with it when the focus leaves', () => {
      const button = addElement('<button title="Hello">x</button>');
      focusIn(button);
      clock.tick(HOVER_DELAY);
      expect(popover().textContent).to.equal('Hello');

      focusOut(button);
      expect(isShown()).to.be.false;
      expect(button.getAttribute('title')).to.equal('Hello');
    });

    it('shows for the focus of the keyboard while the pointer rests on another element', () => {
      const pointed = addElement('<button title="Pointed">x</button>');
      const focused = addElement('<button title="Focused">y</button>');
      hover(pointed);
      press(pointed);
      focusIn(focused);
      clock.tick(HOVER_DELAY);

      expect(popover().textContent).to.equal('Focused');
    });

    it('stays while the focus moves between the children of the element', () => {
      const list = addElement('<div title="Hello"><a href="#">1</a><a href="#">2</a></div>');
      const [first, second] = list.children;
      focusIn(first);
      clock.tick(HOVER_DELAY);
      focusOut(first, second);
      focusIn(second);

      expect(isShown()).to.be.true;
    });

    it('keeps the popover of a tap after the finger is lifted, and puts it away on a press elsewhere', () => {
      const button = addElement('<button title="Hello">x</button>');
      const other = addElement('<button>y</button>');
      enter(button, { pointerType: 'touch' });
      leave(button, { pointerType: 'touch' });
      clock.tick(HOVER_DELAY);
      expect(isShown()).to.be.true;

      press(other, { pointerType: 'touch' });
      expect(isShown()).to.be.false;
      expect(button.getAttribute('title')).to.equal('Hello');
    });

    it('is turned off for a disabled element and for the elements inside it', () => {
      const wrapper = addElement('<div><span title="Hello">x</span></div>');
      IITC.popover.bind(wrapper, { disabled: true });
      hover(wrapper.firstElementChild);

      expect(isShown()).to.be.false;
      expect(wrapper.firstElementChild.getAttribute('title')).to.equal('Hello');
    });
  });

  describe('through the jQuery tooltip of plugins', () => {
    it('opens after the delay, as the widget did, and closes and opens again by the methods of the widget', () => {
      const element = addElement('<div title="Now">x</div>');
      $(element).tooltip('open');
      expect(isShown()).to.be.false;
      clock.tick(HOVER_DELAY);
      expect(isShown()).to.be.true;

      $(element).tooltip('close');
      expect(isShown()).to.be.false;

      $(element).tooltip('open');
      clock.tick(HOVER_DELAY);
      expect(isShown()).to.be.true;
    });

    it('opens with the title a plugin sets and removes around open, on every hover', () => {
      const nick = addElement('<span>nick</span>');
      for (const text of ['level 8', 'level 9']) {
        enter(nick);
        $(nick).attr('title', text).tooltip('open').attr('title', null);
        clock.tick(HOVER_DELAY);
        expect(popover().textContent).to.equal(text);
        leave(nick);
      }
    });

    it('takes content and tooltipClass, and ignores the options it has no use for', () => {
      const element = addElement('<div>x</div>');
      $(element).tooltip({ content: '<i>Hi</i>', tooltipClass: 'mine', position: { my: 'center bottom' }, show: 100 });
      hover(element);

      expect(popover().innerHTML).to.equal('<i>Hi</i>');
      expect(popover().classList.contains('mine')).to.be.true;
    });

    it('asks a content function for the HTML, which it returns or hands to its callback later', () => {
      const element = addElement('<div>x</div>');
      const later = addElement('<p>y</p>');
      let respond;
      $(element).tooltip({
        content: function () {
          return `<u>${this.localName}</u>`;
        },
      });
      $(later).tooltip({
        content: (callback) => {
          respond = callback;
        },
      });

      hover(element);
      expect(popover().innerHTML).to.equal('<u>div</u>');
      leave(element);

      hover(later);
      expect(isShown()).to.be.false;
      respond('<s>p</s>');
      clock.runMicrotasks();
      expect(popover().innerHTML).to.equal('<s>p</s>');
    });

    it('turns the popover off and on again', () => {
      const element = addElement('<div title="Hi">x</div>');
      $(element).tooltip({ disabled: true });
      hover(element);
      expect(isShown()).to.be.false;

      $(element).tooltip('enable');
      hover(element);
      expect(isShown()).to.be.true;
    });

    it('keeps window.setupTooltips as the setup of IITC.popover', () => {
      expect(window.setupTooltips).to.equal(IITC.popover.setup);
    });
  });
});
