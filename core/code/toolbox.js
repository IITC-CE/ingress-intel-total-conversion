/* global IITC */

/**
 * Toolbox API
 *
 * @memberof IITC
 * @namespace toolbox
 */

/**
 * @typedef {Object} ButtonArgs
 * @property {string} [id] - Optional. The ID of the button.
 * @property {string|undefined} label - The label text of the button.
 * @property {Function|undefined} action - The onclick action for the button.
 * @property {string|null} [class] - Optional. The class(es) for the button.
 * @property {string|null} [title] - Optional. The title (tooltip) for the button.
 * @property {string|null} [accessKey] - Optional. The access key for the button.
 * @property {Function|null} [mouseover] - Optional. The mouseover event for the button.
 * @property {string|null} [icon] - Optional. Icon name from FontAwesome for the button.
 */

IITC.toolbox = {
  buttons: {},
  _defaultSortMethod: (a, b) => a.label.localeCompare(b.label),
  sortMethod: (...args) => IITC.toolbox._defaultSortMethod(...args),

  /**
   * Adds a button to the toolbox.
   *
   * @param {ButtonArgs} buttonArgs - The arguments for the button.
   * @returns {string|null} The ID of the added button or null if required parameters are missing.
   *
   * @example
   * const buttonId = IITC.toolbox.addButton({
   *   label: 'AboutIITC',
   *   action: window.AboutIITC
   * });
   *
   * @example
   * const buttonId = IITC.toolbox.addButton({
   *   label: 'Test Button',
   *   action: () => alert('Clicked!')
   * });
   */
  addButton(buttonArgs) {
    if (!buttonArgs.label) {
      console.warn('Required parameter "label" are missing.');
      return null;
    }

    if (!buttonArgs.action) {
      console.warn('Required parameter "action" are missing.');
      return null;
    }

    let id = buttonArgs.id || `toolbox-btn-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    this.buttons[id] = buttonArgs;

    this._renderButton(id);
    this._applySort();

    return id;
  },

  /**
   * Updates an existing button in the toolbox.
   *
   * @param {string} buttonId - The ID of the button to update.
   * @param {ButtonArgs} newButtonArgs - The new arguments for the button.
   * @returns {boolean} True if the button is successfully updated, false otherwise.
   *
   * @example
   * const isUpdated = IITC.toolbox.updateButton(buttonId, { label: 'Updated Button', action: () => console.log('New Action') });
   */
  updateButton(buttonId, newButtonArgs) {
    if (this.buttons[buttonId]) {
      Object.assign(this.buttons[buttonId], newButtonArgs);
      this._renderButton(buttonId);
      this._applySort();
      return true;
    } else {
      console.warn(`Button with ID ${buttonId} not found.`);
      return false;
    }
  },

  /**
   * Removes a button from the toolbox.
   *
   * @param {string} buttonId - The ID of the button to remove.
   * @returns {boolean} True if the button is successfully removed, false otherwise.
   *
   * @example
   * const isRemoved = IITC.toolbox.removeButton(buttonId);
   */
  removeButton(buttonId) {
    if (this.buttons[buttonId]) {
      delete this.buttons[buttonId];
      const buttonElement = document.getElementById(buttonId);
      if (buttonElement) {
        buttonElement.remove();
      }
      this._applySort();
      return true;
    } else {
      console.warn(`Button with ID ${buttonId} not found for removal.`);
      return false;
    }
  },

  /**
   * Internal method to render a button.
   *
   * @private
   * @param {string} buttonId - The ID of the button to render.
   */
  _renderButton(buttonId) {
    const buttonData = this.buttons[buttonId];
    if (!buttonData) return; // The button with the given ID was not found

    let buttonElement = document.getElementById(buttonId) || document.createElement('a');
    buttonElement.id = buttonId;
    buttonElement.textContent = buttonData.label;
    buttonElement.onclick = buttonData.action;

    if (typeof buttonData.title === 'string') buttonElement.title = buttonData.title;
    if (typeof buttonData.class === 'string') buttonElement.className = buttonData.class;
    if (typeof buttonData.access_key === 'string') buttonElement.accessKey = buttonData.access_key;
    if (typeof buttonData.accesskey === 'string') buttonElement.accessKey = buttonData.accesskey;
    if (typeof buttonData.accessKey === 'string') buttonElement.accessKey = buttonData.accessKey;
    if (typeof buttonData.mouseover === 'function') buttonElement.onmouseover = buttonData.mouseover;

    if (typeof buttonData.icon === 'string') {
      const iconHTML = `<i class="fa ${buttonData.icon}"></i>`;
      buttonElement.innerHTML = iconHTML + buttonElement.innerHTML;
    }

    const toolbox_component = document.querySelector('#toolbox_component');
    if (!document.getElementById(buttonId)) {
      toolbox_component.appendChild(buttonElement);
    }
  },

  /**
   * Internal method to apply sorting to the buttons.
   *
   * @private
   */
  _applySort() {
    const toolbox_component = document.querySelector('#toolbox_component');
    const buttonElements = Array.from(toolbox_component.children);

    try {
      buttonElements.sort((a, b) => this.sortMethod(this.buttons[a.id], this.buttons[b.id]));
    } catch (e) {
      console.error('Sorting function produced error', e);
      buttonElements.sort((a, b) => this._defaultSortMethod(this.buttons[a.id], this.buttons[b.id]));
    }
    buttonElements.forEach((buttonElement) => toolbox_component.appendChild(buttonElement));
  },

  /**
   * Sets the sorting method for the toolbox buttons.
   *
   * @param {Function} sortMethod - The sorting method to be used.
   * @returns {void}
   *
   * @example
   * IITC.toolbox.setSortMethod((a, b) => a.label.localeCompare(b.label));
   */
  setSortMethod(sortMethod) {
    this.sortMethod = sortMethod;
    this._applySort();
  },

  /**
   * Internal method to synchronize the toolbox with the legacy toolbox.
   *
   * @private
   * @returns {void}
   */
  _syncWithLegacyToolbox() {
    // Select the old toolbox element
    const oldToolbox = document.querySelector('#toolbox');

    // Function to process an individual button
    const processButton = (node) => {
      // Check if the node is an 'A' tag (anchor/link, which represents a button)
      if (node.tagName === 'A') {
        let iconClass = null;
        // Find an icon element within the button, if it exists
        const iconElement = node.querySelector('i.fa');
        if (iconElement) {
          // Extract the icon class
          const iconClasses = Array.from(iconElement.classList).filter((cls) => cls.startsWith('fa-'));
          if (iconClasses.length > 0) iconClass = iconClasses[0];
        }

        // Prepare the button arguments for either updating or adding the button
        const buttonArgs = {
          id: node.id,
          label: node.textContent.trim(),
          action: () => node.click(),
          class: node.className,
          title: node.title,
          accessKey: node.accessKey,
          mouseover: node.mouseover,
          icon: iconClass,
        };

        // Update an existing button or add a new one
        buttonArgs['id'] = `legacy-toolbox-btn-${buttonArgs.id || buttonArgs.label}`;
        if (this.buttons[buttonArgs.id]) {
          this.updateButton(buttonArgs.id, buttonArgs);
        } else {
          this.addButton(buttonArgs);
        }
      }
    };

    // Initialize for existing buttons in the toolbox
    oldToolbox.querySelectorAll('a').forEach(processButton);

    // Mutation observer to watch for changes in the toolbox
    const observer = new MutationObserver((mutations) => {
      // Iterate through mutations
      mutations.forEach((mutation) => {
        // Process each added node and attribute changes
        mutation.addedNodes.forEach(processButton);
        if (mutation.type === 'attributes') {
          processButton(mutation.target);
        }
      });
    });

    // Start observing the toolbox for changes
    observer.observe(oldToolbox, { childList: true, subtree: true, attributes: true });
  },
};

IITC.toolbox._syncWithLegacyToolbox();
