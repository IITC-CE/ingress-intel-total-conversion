/* Filters API

Filters API is a mechanism to hide intel entities using their properties (faction,
health, timestamp...). It provides two level APIs: a set of named filters that
apply globally (any entity matching one of the filters will be hidden), and low
level API to test an entity against a filter for generic purpose.
This comes with a Leaflet layer system following the old layer system, the filter
is disabled when the layer is added to the map and is enabled when removed.

A filter applies to a combinaison of portal/link/field and is described by
 - data properties that must (all) match
 - or a predicate for complex filter

  { portal: true, link: true, data: { team: 'E' }}
      filters any ENL portal/link

  [{ link: true, data: { oGuid: "some guid" }}, { link: true, data: { dGuid: "some guid" }}]
      filters any links on portal with guid "some guid"

  { field: true, pred: function (f) { return f.options.timestamp < Date.parse('2021-10-31'); } }
      filters any fields made before Halloween 2021

Data properties can be specified as value, or as a complex expression (required
for array data properties). A complex expression is a 2-array, first element is
an operator, second is the argument of the operator for the property.
The operators are:
 - ['eq', value] : this is equivalent to type directly `value`
 - ['not', ]
 - ['or', [exp1, exp2,...]]: the expression matches if one of the exp1.. matches
 - ['and', [exp1, exp2...]]: matches if all exp1 matches (useful for array
  properties)
 - ['some', exp]: when the property is an array, matches if one of the element
  matches `exp`
 - ['every', exp]: all elements must match `exp`
 - ['<', number]: for number comparison (and <= > >=)

Examples:
  { portal: true, data:  ['not', { history: { scoutControlled: false }, ornaments:
  ['some', 'sc5_p'] }] }
      filters all portals but the one never scout controlled that have a scout
      volatile ornament

  { portal: true, data: ['not', { resonators: ['every', { owner: 'some agent' } ] } ] }
      filters all portals that have resonators not owned from 'some agent'
      (note: that would need to load portal details)

  { portal: true, data: { level: ['or', [1,4,5]], health: ['>', 85] } }
      filters all portals with level 1,4 or 5 and health over 85

  { portal: true, link: true, field: true, options: { timestamp: ['<',
  Date.now() - 3600000] } }
      filters all entities with no change since 1 hour (from the creation of
      the filter)
*/

IITC.filters = {};
/**
 * @type {Object.<string, FilterDesc>}
 */
IITC.filters._filters = {};

/**
 * @callback FilterPredicate
 * @param {Object} ent - IITC entity
 * @returns {boolean}
 */

/**
 * @typedef FilterDesc
 * @type {object}
 * @property {boolean} filterDesc.portal         apply to portal
 * @property {boolean} filterDesc.link           apply to link
 * @property {boolean} filterDesc.field          apply to field
 * @property {object} [filterDesc.data]          entity data properties that must match
 * @property {object} [filterDesc.options]       entity options that must match
 * @property {FilterPredicate} [filterDesc.pred] predicate on the entity
 */

/**
 * @param {string} name                              filter name
 * @param {FilterDesc | FilterDesc[]} filterDesc     filter description (OR)
 */
IITC.filters.set = function (name, filterDesc) {
  IITC.filters._filters[name] = filterDesc;
};

IITC.filters.has = function (name) {
  return name in IITC.filters._filters;
};

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
 *
 * @param {"portal"|"link"|"field"} type Type of the entity
 * @param {object} entity Portal/link/field to test
 * @param {FilterDesc} filter Filter
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
 *
 * @param {object} portal Portal to test
 * @returns {boolean} `true` if the the portal matches one of the filters
 */
IITC.filters.filterPortal = function (portal) {
  return arrayFilter('portal', portal, Object.values(IITC.filters._filters));
};

/**
 *
 * @param {object} link Link to test
 * @returns {boolean} `true` if the the link matches one of the filters
 */
IITC.filters.filterLink = function (link) {
  return arrayFilter('link', link, Object.values(IITC.filters._filters));
};

/**
 *
 * @param {object} field Field to test
 * @returns {boolean} `true` if the the field matches one of the filters
 */
IITC.filters.filterField = function (field) {
  return arrayFilter('field', field, Object.values(IITC.filters._filters));
};

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
 * @class FilterLayer
 * @description Layer abstraction to control with the layer chooser a filter.
 *              The filter is disabled on layer add, and enabled on layer remove.
 * @extends L.Layer
 * @param {{name: string, filter: FilterDesc}} options
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

/* global IITC, L */
