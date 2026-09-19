/**
 * @file Defines <iitc-icon>, an icon of the bundled Material Symbols font named by its ligature
 *
 *     <iitc-icon>star</iitc-icon>
 *     <iitc-icon filled>star</iitc-icon>
 *     <iitc-icon label="Remove" fallback="X">close</iitc-icon>
 *
 * An icon is decorative unless it carries a label, which names it for assistive technology and
 * stands in for it when the font is unavailable, as does the fallback character given in its place.
 * Styles live in icons/icons.css and apply before the element is defined
 *
 * @module icons
 */

/**
 * Exposes the label attribute of an icon as its accessible name, or hides an unlabelled one
 * from assistive technology
 *
 * @class MaterialSymbolIcon
 */
class MaterialSymbolIcon extends HTMLElement {
  static get observedAttributes() {
    return ['label'];
  }

  connectedCallback() {
    this.updateAccessibility();
  }

  attributeChangedCallback() {
    this.updateAccessibility();
  }

  updateAccessibility() {
    const label = this.getAttribute('label');
    if (label) {
      this.setAttribute('role', 'img');
      this.setAttribute('aria-label', label);
      this.removeAttribute('aria-hidden');
    } else {
      this.removeAttribute('role');
      this.removeAttribute('aria-label');
      this.setAttribute('aria-hidden', 'true');
    }
  }
}

if (window.customElements && !window.customElements.get('iitc-icon')) {
  window.customElements.define('iitc-icon', MaterialSymbolIcon);
}
