/* Filters API

Filters work by exclusion, following the old layer system.
A feature that matches a filter is removed from the map.
A filter applies to a combinaison of portal/link/field and is described by
 - data properties that must (all) match
 - or a predicate for complex filter

  { portal: true, link: true, data: { team: 'E' }}
      filters any ENL portal/link

  [{ link: true, data: { oGuid: "some guid" }}, { link: true, data: { dGuid: "some guid" }}]
      filters any links on portal with guid "some guid"

  { field: true, pred: function (f) { return f.options.timestamp < Date.parse('2021-10-31'); } }
      filters any fields made before Halloween 2021
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

function simpleFilter(type, entity, filter) {
  // type must match
  if (!filter[type]) return false;
  // use predicate if available
  if (typeof filter.pred === "function") return filter.pred(entity);
  // if no constraint, match
  if (!filter.data) return true;
  // else must match all constraints
  for (var prop in filter.data)
    if (entity.options.data[prop] !== filter.data[prop]) return false;
  return true;
}

function arrayFilter(type, entity, filters) {
  if (!Array.isArray(filters)) filters = [filters];
  filters = filters.flat();
  for (let i = 0; i < filters.length; i++)
    if (simpleFilter(type, entity, filters[i]))
      return true;
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
  for (var guid in window.portals) {
    var p = window.portals[guid];
    if (IITC.filters.filterPortal(p)) p.remove();
    else p.addTo(window.map);
  }
  for (var guid in window.links) {
    var link = window.links[guid];
    if (IITC.filters.filterLink(link)) link.remove();
    else link.addTo(window.map);
  }
  for (var guid in window.fields) {
    var field = window.fields[guid];
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

  onAdd: function (map) {
    IITC.filters.remove(this.options.name);
    IITC.filters.filterEntities();
  },

  onRemove: function (map) {
    IITC.filters.set(this.options.name, this.options.filter);
    IITC.filters.filterEntities();
  },
});