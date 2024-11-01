/* global L -- eslint */

/**
 * Provides functionality for the search system within the application.
 *
 * You can implement your own result provider by listening to the search hook:
 * ```window.addHook('search', function(query) {});```.
 *
 * The `query` object has the following members:
 * - `term`: The term for which the user has searched.
 * - `confirmed`: A boolean indicating if the user has pressed enter after searching.
 *   You should not search online or do heavy processing unless the user has confirmed the search term.
 * - `addResult(result)`: A method to add a result to the query.
 *
 * The `result` object can have the following members (`title` is required, as well as one of `position` and `bounds`):
 * - `title`: The label for this result. Will be interpreted as HTML, so make sure to escape properly.
 * - `description`: Secondary information for this result. Will be interpreted as HTML, so make sure to escape properly.
 * - `position`: A L.LatLng object describing the position of this result.
 * - `bounds`: A L.LatLngBounds object describing the bounds of this result.
 * - `layer`: An ILayer to be added to the map when the user selects this search result.
 *   Will be generated if not set. Set to `null` to prevent the result from being added to the map.
 * - `icon`: A URL to an icon to display in the result list. Should be 12x12 pixels.
 * - `onSelected(result, event)`: A handler to be called when the result is selected.
 *   May return `true` to prevent the map from being repositioned. You may reposition the map yourself or do other work.
 * - `onRemove(result)`: A handler to be called when the result is removed from the map
 *   (because another result has been selected or the search was cancelled by the user).
 *  @namespace window.search
 */
window.search = {
  lastSearch: null,
};

/**
 * Represents a search query.
 *
 * @memberof window.search
 * @class
 * @name window.search.Query
 */
class Query {
  /**
   * Initializes the search query, setting up the DOM elements and triggering the 'search' hook.
   *
   * @function
   * @param {string} term - The search term.
   * @param {boolean} confirmed - Indicates if the search is confirmed (e.g., by pressing Enter).
   */
  constructor(term, confirmed) {
    this.term = term;
    this.confirmed = confirmed;
    this.results = [];
    this.container = $('<div>').addClass('searchquery');

    this.header = $('<h3>')
      .text(
        this.confirmed
          ? this.term
          : (this.term.length > 16 ? this.term.substr(0, 8) + '…' + this.term.substr(this.term.length - 8, 8) : this.term) + ' (Return to load more)'
      )
      .appendTo(this.container);

    this.list = $('<ul>')
      .appendTo(this.container)
      .append($('<li>').text(this.confirmed ? 'No local results, searching online...' : 'No local results.'));

    this.container.accordion({
      collapsible: true,
      heightStyle: 'content',
    });

    window.runHooks('search', this);
  }

  /**
   * Displays the search query results in the search wrapper.
   *
   * @function
   */
  show() {
    this.container.appendTo('#searchwrapper');
  }

  /**
   * Hides the search query results and cleans up.
   *
   * @function
   */
  hide() {
    this.container.remove();
    this.removeSelectedResult();
    this.removeHoverResult();
  }

  /**
   * Adds a search result to this query.
   *
   * @function
   * @param {Object} result - The search result object to add.
   */
  addResult(result) {
    if (this.results.length === 0) {
      // remove 'No results'
      this.list.empty();
    }

    this.results.push(result);
    var item = $('<li>')
      .appendTo(this.list)
      .attr('tabindex', '0')
      .on(
        'click dblclick',
        function (ev) {
          this.onResultSelected(result, ev);
        }.bind(this)
      )
      .on(
        'mouseover',
        function (ev) {
          this.onResultHoverStart(result, ev);
        }.bind(this)
      )
      .on(
        'mouseout',
        function (ev) {
          this.onResultHoverEnd(result, ev);
        }.bind(this)
      )
      .keypress(function (ev) {
        if ((ev.keyCode || ev.charCode || ev.which) === 32) {
          ev.preventDefault();
          ev.type = 'click';
          $(this).trigger(ev);
          return;
        }
        if ((ev.keyCode || ev.charCode || ev.which) === 13) {
          ev.preventDefault();
          ev.type = 'dblclick';
          $(this).trigger(ev);
          return;
        }
      });

    var link = $('<a>').append(result.title).appendTo(item);

    if (result.icon) {
      link.css('background-image', 'url("' + result.icon + '")');
      item.css('list-style', 'none');
    }

    if (result.description) {
      item.append($('<br>')).append($('<em>').append(result.description));
    }
  }

  /**
   * Creates and returns a layer for the given search result, which could be markers or shapes on the map.
   *
   * @function
   * @param {Object} result - The search result object.
   * @returns {L.Layer} The layer created for this result.
   */
  resultLayer(result) {
    if (result.layer !== null && !result.layer) {
      result.layer = L.layerGroup();

      if (result.position) {
        L.marker(result.position, {
          icon: L.divIcon.coloredSvg('red'),
          title: result.title,
        }).addTo(result.layer);
      }

      if (result.bounds) {
        L.rectangle(result.bounds, {
          title: result.title,
          interactive: false,
          color: 'red',
          fill: false,
        }).addTo(result.layer);
      }
    }
    return result.layer;
  }

  /**
   * Handles the selection of a search result, including map view adjustments and layer management.
   *
   * @function
   * @param {Object} result - The selected search result object.
   * @param {Event} ev - The event associated with the selection.
   */
  onResultSelected(result, ev) {
    this.removeHoverResult();
    this.removeSelectedResult();
    this.selectedResult = result;

    if (result.onSelected) {
      if (result.onSelected(result, ev)) return;
    }

    if (ev.type === 'dblclick') {
      if (result.position) {
        window.map.setView(result.position, window.DEFAULT_ZOOM);
      } else if (result.bounds) {
        window.map.fitBounds(result.bounds, { maxZoom: window.DEFAULT_ZOOM });
      }
    } else {
      // ev.type != 'dblclick'
      if (result.bounds) {
        window.map.fitBounds(result.bounds, { maxZoom: window.DEFAULT_ZOOM });
      } else if (result.position) {
        window.map.setView(result.position);
      }
    }

    result.layer = this.resultLayer(result);

    if (result.layer) window.map.addLayer(result.layer);

    if (window.isSmartphone()) window.show('map');
  }

  /**
   * Removes the currently selected search result from the map and performs cleanup.
   *
   * @function
   */
  removeSelectedResult() {
    if (this.selectedResult) {
      if (this.selectedResult.layer) window.map.removeLayer(this.selectedResult.layer);
      if (this.selectedResult.onRemove) this.selectedResult.onRemove(this.selectedResult);
    }
  }

  /**
   * Handles the start of a hover over a search result. Adds the layer for the result to the map if not already selected.
   *
   * @function
   * @param {Object} result - The search result object being hovered over.
   */
  onResultHoverStart(result) {
    this.removeHoverResult();
    this.hoverResult = result;

    if (result === this.selectedResult) return;

    result.layer = this.resultLayer(result);

    if (result.layer) window.map.addLayer(result.layer);
  }

  /**
   * Removes the hover result layer from the map unless it's the selected result.
   *
   * @function
   */
  removeHoverResult() {
    if (this.hoverResult !== this.selectedResult) {
      if (this.hoverResult) {
        if (this.hoverResult.layer) {
          window.map.removeLayer(this.hoverResult.layer);
        }
      }
    }
    this.hoverResult = null;
  }

  /**
   * Handles the end of a hover over a search result. Removes the hover result layer from the map.
   */
  onResultHoverEnd() {
    this.removeHoverResult();
  }
}

window.search.Query = Query;

/**
 * Initiates a search with the specified term and confirmation status.
 *
 * @function window.search.doSearch
 * @param {string} term - The search term.
 * @param {boolean} confirmed - Indicates if the search term is confirmed.
 */
window.search.doSearch = function (term, confirmed) {
  term = term.trim();

  // minimum 3 characters for automatic search
  if (term.length < 3 && !confirmed) return;

  // don't clear last confirmed search
  if (window.search.lastSearch && window.search.lastSearch.confirmed && !confirmed) return;

  // don't make the same query again
  if (window.search.lastSearch && window.search.lastSearch.confirmed === confirmed && window.search.lastSearch.term === term) return;

  if (window.search.lastSearch) window.search.lastSearch.hide();
  window.search.lastSearch = null;

  // clear results
  if (term === '') return;

  if (window.useAppPanes()) window.show('info');

  $('.ui-tooltip').remove();

  window.search.lastSearch = new window.search.Query(term, confirmed);
  window.search.lastSearch.show();
};

/**
 * Sets up the search input field and button functionality.
 *
 * @function window.search.setup
 */
window.search.setup = function () {
  $('#search')
    .keypress(function (e) {
      if ((e.keyCode ? e.keyCode : e.which) !== 13) return;
      e.preventDefault();

      var term = $(this).val();

      clearTimeout(window.search.timer);
      window.search.doSearch(term, true);
    })
    .on('keyup keypress change paste', function () {
      clearTimeout(window.search.timer);
      window.search.timer = setTimeout(
        function () {
          var term = $(this).val();
          window.search.doSearch(term, false);
        }.bind(this),
        500
      );
    });
  $('#buttongeolocation').click(function () {
    window.map.locate({ setView: true, maxZoom: 13 });
  });
};

/**
 * Adds a search result for a portal to the search query results.
 *
 * @function window.search.addSearchResult
 * @param {Object} query - The search query object to which the result will be added.
 * @param {Object} data - The data for the search result. This includes information such as title, team, level, health, etc.
 * @param {string} guid - GUID if the portal.
 */
window.search.addSearchResult = function (query, data, guid) {
  var team = window.teamStringToId(data.team);
  var color = team === window.TEAM_NONE ? '#CCC' : window.COLORS[team];
  var latLng = L.latLng(data.latE6 / 1e6, data.lngE6 / 1e6);
  query.addResult({
    title: data.title,
    description: window.TEAM_SHORTNAMES[team] + ', L' + data.level + ', ' + data.health + '%, ' + data.resCount + ' Resonators',
    position: latLng,
    icon: 'data:image/svg+xml;base64,' + btoa('@include_string:images/icon-portal.svg@'.replace(/%COLOR%/g, color)),
    onSelected: function (result, event) {
      if (event.type === 'dblclick') {
        window.zoomToAndShowPortal(guid, latLng);
      } else if (window.portals[guid]) {
        if (!window.map.getBounds().contains(result.position)) {
          window.map.setView(result.position);
        }
        window.renderPortalDetails(guid);
      } else {
        window.selectPortalByLatLng(latLng);
      }
      return true; // prevent default behavior
    },
  });
};

// search for portals
window.addHook('search', function (query) {
  var term = query.term.toLowerCase();

  $.each(window.portals, function (guid, portal) {
    var data = portal.options.data;
    if (!data.title) return;

    if (data.title.toLowerCase().indexOf(term) !== -1) {
      window.search.addSearchResult(query, data, guid);
    }
  });
});

// search for locations
// TODO: recognize 50°31'03.8"N 7°59'05.3"E and similar formats
window.addHook('search', function (query) {
  var locations = query.term.replaceAll(/%2C/gi, ',').match(/[+-]?\d+\.\d+, ?[+-]?\d+\.\d+/g);
  var added = {};
  if (!locations) return;
  locations.forEach(function (location) {
    var pair = location.split(',').map(function (s) {
      return parseFloat(s.trim()).toFixed(6);
    });
    var ll = pair.join(',');
    var latlng = L.latLng(
      pair.map(function (s) {
        return parseFloat(s);
      })
    );
    if (added[ll]) return;
    added[ll] = true;

    query.addResult({
      title: ll,
      description: 'geo coordinates',
      position: latlng,
      onSelected: function (result) {
        for (var guid in window.portals) {
          var p = window.portals[guid].getLatLng();
          if (p.lat.toFixed(6) + ',' + p.lng.toFixed(6) === ll) {
            window.renderPortalDetails(guid);
            return;
          }
        }

        window.urlPortalLL = [result.position.lat, result.position.lng];
      },
    });
  });
});

// search on OpenStreetMap
window.addHook('search', function (query) {
  if (!query.confirmed) return;

  // Viewbox search orders results so they're closer to the viewbox
  var mapBounds = window.map.getBounds();
  var viewbox =
    '&viewbox=' + mapBounds.getSouthWest().lng + ',' + mapBounds.getSouthWest().lat + ',' + mapBounds.getNorthEast().lng + ',' + mapBounds.getNorthEast().lat;

  var resultCount = 0;
  var resultMap = {};
  function onQueryResult(isViewboxResult, data) {
    resultCount += data.length;
    if (isViewboxResult) {
      // Search for things outside the viewbox
      $.getJSON(window.NOMINATIM + encodeURIComponent(query.term) + viewbox, onQueryResult.bind(null, false));
      if (resultCount === 0) {
        return;
      }
    } else {
      if (resultCount === 0) {
        query.addResult({
          title: 'No results on OpenStreetMap',
          icon: '//www.openstreetmap.org/favicon.ico',
          onSelected: function () {
            return true;
          },
        });
        return;
      }
    }

    data.forEach(function (item) {
      if (resultMap[item.place_id]) {
        return;
      } // duplicate
      resultMap[item.place_id] = true;

      var result = {
        title: item.display_name,
        description: 'Type: ' + item.type,
        position: L.latLng(parseFloat(item.lat), parseFloat(item.lon)),
        icon: item.icon,
      };

      if (item.geojson) {
        result.layer = L.geoJson(item.geojson, {
          interactive: false,
          color: 'red',
          opacity: 0.7,
          weight: 2,
          fill: false,
          pointToLayer: function (featureData, latLng) {
            return L.marker(latLng, {
              icon: L.divIcon.coloredSvg('red'),
              title: item.display_name,
            });
          },
        });
      }

      var b = item.boundingbox;
      if (b) {
        var southWest = new L.LatLng(b[0], b[2]),
          northEast = new L.LatLng(b[1], b[3]);
        result.bounds = new L.LatLngBounds(southWest, northEast);
      }

      query.addResult(result);
    });
  }

  // Bounded search allows amenity-only searches (e.g. "amenity=toilet") via special phrases
  // http://wiki.openstreetmap.org/wiki/Nominatim/Special_Phrases/EN
  var bounded = '&bounded=1';

  $.getJSON(window.NOMINATIM + encodeURIComponent(query.term) + viewbox + bounded, onQueryResult.bind(null, true));
});

// search on guid
window.addHook('search', function (query) {
  const guid_re = /[0-9a-f]{32}\.[0-9a-f]{2}/;
  const res = query.term.match(guid_re);
  if (res) {
    const guid = res[0];
    const data = window.portalDetail.get(guid);
    if (data) window.search.addSearchResult(query, data, guid);
    else {
      window.portalDetail.request(guid).then(function (data) {
        window.search.addSearchResult(query, data, guid);
      });
    }
  }
});
