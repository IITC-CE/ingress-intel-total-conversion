/* global IITC, L */

/** # Filters API

  @memberof IITC
  @namespace filters
*/

IITC.filters = {};
/**
 * @type {Object.<string, IITC.filters.FilterDesc>}
 */
IITC.filters._filters = {};

/**
 * @memberof IITC.filters
 * @callback FilterPredicate
 * @param {Object} ent - IITC entity
 * @returns {boolean}
 */

/**
 * @memberof IITC.filters
 * @typedef FilterDesc
 * @type {object}
 * @property {boolean} filterDesc.portal         apply to portal
 * @property {boolean} filterDesc.link           apply to link
 * @property {boolean} filterDesc.field          apply to field
 * @property {object} [filterDesc.data]          entity data properties that must match
 * @property {object} [filterDesc.options]       entity options that must match
 * @property {IITC.filters.FilterPredicate} [filterDesc.pred] predicate on the entity
 */

/**
 * Sets or updates a filter with a given name. If a filter with the same name already exists, it is overwritten.
 *
 * @param {string} name                              filter name
 * @param {IITC.filters.FilterDesc | IITC.filters.FilterDesc[]} filterDesc     filter description (OR)
 */
IITC.filters.set = function (name, filterDesc) {
  IITC.filters._filters[name] = filterDesc;
};

/**
 * Checks if a filter with the specified name exists.
 *
 * @param {string} name - The name of the filter to check.
 * @returns {boolean} True if the filter exists, false otherwise.
 */
IITC.filters.has = function (name) {
  return name in IITC.filters._filters;
};

/**
 * Removes a filter with the specified name.
 *
 * @param {string} name - The name of the filter to be removed.
 * @returns {boolean} True if the filter was successfully deleted, false otherwise.
 */
IITC.filters.remove = function (name) {
  return delete IITC.filters._filters[name];
};

function compareValue(constraint, value) {
  if (constraint instanceof Array) return false;
  // array must be handled by "some" or "every"
  if (value instanceof Array) return false;
  if (constraint instanceof Object) {
    if (!(value instanceof Object)) return false;
    // implicit AND on object properties
    for (const prop in constraint) {
      if (!genericCompare(constraint[prop], value[prop])) {
        return false;
      }
    }
    return true;
  }
  return constraint === value;
}

function compareNumber(constraint, value) {
  if (typeof value !== 'number') return false;
  if (typeof constraint[1] !== 'number') return false;
  const v = constraint[1];
  switch (constraint[0]) {
    case '==':
      return value === v;
    case '<':
      return value < v;
    case '<=':
      return value <= v;
    case '>':
      return value > v;
    case '>=':
      return value >= v;
  }
  return false;
}

function genericCompare(constraint, object) {
  if (constraint instanceof Array) {
    if (constraint.length !== 2) return false;
    const [op, args] = constraint;
    switch (op) {
      case 'eq':
        return compareValue(args, object);
      case 'or':
        if (args instanceof Array) {
          for (const arg of args) {
            if (genericCompare(arg, object)) {
              return true;
            }
          }
        }
        return false;
      case 'and':
        if (args instanceof Array) {
          for (const arg of args) {
            if (!genericCompare(arg, object)) {
              return false;
            }
          }
        }
        return true;
      case 'some':
        if (object instanceof Array) {
          for (const obj of object) {
            if (genericCompare(args, obj)) {
              return true;
            }
          }
        }
        return false;
      case 'every':
        if (object instanceof Array) {
          for (const obj of object) {
            if (!genericCompare(args, obj)) {
              return false;
            }
          }
        }
        return true;
      case 'not':
        return !genericCompare(args, object);
      case '==':
      case '<':
      case '<=':
      case '>':
      case '>=':
        return compareNumber(constraint, object);
      default:
      // unknown op
    }
    return false;
  }
  return compareValue(constraint, object);
}

/**
 * Tests whether a given entity matches a specified filter.
 *
 * @param {"portal"|"link"|"field"} type Type of the entity
 * @param {object} entity Portal/link/field to test
 * @param {IITC.filters.FilterDesc} filter Filter
 * @returns {boolean} `true` if the the `entity` of type `type` matches the `filter`
 */
IITC.filters.testFilter = function (type, entity, filter) {
  // type must match
  if (!filter[type]) return false;
  // use predicate if available
  if (typeof filter.pred === 'function') return filter.pred(entity);
  // if doesn't match data constraint
  if (filter.data && !genericCompare(filter.data, entity.options.data)) return false;
  // if doesn't match options
  if (filter.options && !genericCompare(filter.options, entity.options)) {
    return false;
  }
  // else it matches
  return true;
};

function arrayFilter(type, entity, filters) {
  if (!Array.isArray(filters)) filters = [filters];
  filters = filters.flat();
  for (let i = 0; i < filters.length; i++) {
    if (IITC.filters.testFilter(type, entity, filters[i])) {
      return true;
    }
  }
  return false;
}

/**
 * Tests whether a given portal matches any of the currently active filters.
 *
 * @param {object} portal Portal to test
 * @returns {boolean} `true` if the the portal matches one of the filters
 */
IITC.filters.filterPortal = function (portal) {
  return arrayFilter('portal', portal, Object.values(IITC.filters._filters));
};

/**
 * Tests whether a given link matches any of the currently active filters.
 *
 * @param {object} link Link to test
 * @returns {boolean} `true` if the the link matches one of the filters
 */
IITC.filters.filterLink = function (link) {
  return arrayFilter('link', link, Object.values(IITC.filters._filters));
};

/**
 * Tests whether a given field matches any of the currently active filters.
 *
 * @param {object} field Field to test
 * @returns {boolean} `true` if the the field matches one of the filters
 */
IITC.filters.filterField = function (field) {
  return arrayFilter('field', field, Object.values(IITC.filters._filters));
};

/**
 * Applies all existing filters to the entities (portals, links, and fields) on the map.
 * Entities that match any of the active filters are removed from the map; others are added or remain on the map.
 */
IITC.filters.filterEntities = function () {
  for (const guid in window.portals) {
    const p = window.portals[guid];
    if (IITC.filters.filterPortal(p)) p.remove();
    else p.addTo(window.map);
  }
  for (const guid in window.links) {
    const link = window.links[guid];
    if (IITC.filters.filterLink(link)) link.remove();
    else link.addTo(window.map);
  }
  for (const guid in window.fields) {
    const field = window.fields[guid];
    if (IITC.filters.filterField(field)) field.remove();
    else field.addTo(window.map);
  }
};

/**
 * @memberof IITC.filters
 * @class FilterLayer
 * @description Layer abstraction to control with the layer chooser a filter.
 *              The filter is disabled on layer add, and enabled on layer remove.
 * @extends L.Layer
 * @param {Object} options - Configuration options for the filter layer
 * @param {string} options.name - The name of the filter
 * @param {IITC.filters.FilterDesc} options.filter - The filter description
 */
IITC.filters.FilterLayer = L.Layer.extend({
  options: {
    name: null,
    filter: {},
  },

  initialize: function (options) {
    L.setOptions(this, options);
    IITC.filters.set(this.options.name, this.options.filter);
  },

  onAdd: function () {
    IITC.filters.remove(this.options.name);
    IITC.filters.filterEntities();
  },

  onRemove: function () {
    IITC.filters.set(this.options.name, this.options.filter);
    IITC.filters.filterEntities();
  },
});
