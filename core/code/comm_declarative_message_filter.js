/* global IITC */

/**
 * Declarative message filter for COMM API
 *
 * @memberof IITC.comm
 * @namespace declarativeMessageFilter
 */

IITC.comm.declarativeMessageFilter = {
  _rules: {},

  /**
   * Adds a new filtering rule with a given ID.
   *
   * @param {string} id The ID of the rule to add.
   * @param {Object} rule The rule to add.
   *
   * @example
   * // Hide all messages from Resistance team
   * IITC.comm.declarativeMessageFilter.addRule({
   *   id: "hideResistanceTeam1",
   *   conditions: [
   *     { field: "player.team", value: "Resistance" },
   *   ]
   * });
   *
   * @example
   * // Hide all messages except those from the Resistance team using the inverted rule
   * IITC.comm.declarativeMessageFilter.addRule({
   *   id: "hideExceptResistanceTeam",
   *   conditions: [
   *     { field: "player.team", value: "Resistance", invert: true },
   *   ]
   * });
   *
   * @example
   * // Hide messages that look like spam
   * IITC.comm.declarativeMessageFilter.addRule({
   *   id: "hideSpam",
   *   conditions: [
   *     { field: "markup[4][1].plain", condition: /ingress-(shop|store)|(store|shop)-ingress/i },
   *   ]
   * });
   */
  addRule: (id, rule) => {
    if (IITC.comm.declarativeMessageFilter._rules[id]) {
      console.warn(`Rule with ID '${id}' already exists. Overwriting.`);
    }
    IITC.comm.declarativeMessageFilter._rules[id] = rule;
  },

  /**
   * Removes a filtering rule by its ID.
   *
   * @param {string} id The ID of the rule to remove.
   */
  removeRule: (id) => {
    if (IITC.comm.declarativeMessageFilter._rules[id]) {
      delete IITC.comm.declarativeMessageFilter._rules[id];
    } else {
      console.error(`No rule found with ID '${id}'.`);
    }
  },

  /**
   * Gets a rule by its ID.
   *
   * @param {string} id The ID of the rule to get.
   * @returns {Object|null} The rule object, or null if not found.
   */
  getRuleById: (id) => {
    return IITC.comm.declarativeMessageFilter._rules[id] || null;
  },

  /**
   * Gets all current filtering rules.
   *
   * @returns {Object} The current set of filtering rules.
   */
  getAllRules: () => {
    return IITC.comm.declarativeMessageFilter._rules;
  },

  /**
   * Extracts the value from the message object by a given path.
   *
   * @param {Object} object The message object.
   * @param {String} path Path to the property in dot notation.
   * @returns {*} The value of the property at the specified path or undefined if the path is not valid.
   */
  getMessageValueByPath: (object, path) => {
    const parts = path.replace(/\[(\w+)]/g, '.$1').split('.');
    let current = object;

    for (const part of parts) {
      if (part in current) {
        current = current[part];
      } else {
        return undefined; // Path is not valid
      }
    }
    return current;
  },

  /**
   * Checks if the message matches a single rule.
   *
   * @param {Object} message The message to check.
   * @param {Object} rule The rule to match against.
   * @returns {boolean} True if the message matches the rule, false otherwise.
   */
  matchesRule: (message, rule) => {
    return rule.conditions.every((condition) => {
      const messageValue = IITC.comm.declarativeMessageFilter.getMessageValueByPath(message, condition.field);
      let result;

      if ('value' in condition) {
        result = messageValue === condition.value;
      } else if ('pattern' in condition) {
        const regex = new RegExp(condition.pattern);
        result = regex.test(messageValue);
      } else {
        return false; // If the condition does not contain 'value' or 'pattern', we consider that the message does not match the rule
      }

      // Invert the result if the condition is inverted
      if (condition.invert) {
        return !result;
      }
      return result;
    });
  },

  /**
   * Checks if a message matches any of the current filtering rules.
   *
   * @param {Object} message The message to check.
   * @returns {boolean} True if the message matches any rule, false otherwise.
   */
  filterMessage: (message) => {
    const rules = IITC.comm.declarativeMessageFilter.getAllRules();
    for (const ruleId in rules) {
      if (IITC.comm.declarativeMessageFilter.matchesRule(message, rules[ruleId])) {
        return true;
      }
    }
    return false;
  },
};
