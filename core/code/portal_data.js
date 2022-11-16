/// PORTAL DATA TOOLS ///////////////////////////////////////////////////
// misc functions to get portal info

// search through the links data for all that link from or to a portal. returns an object with separate lists of in
// and out links. may or may not be as accurate as the portal details, depending on how much data the API returns
window.getPortalLinks = function(guid) {

  var links = { in: [], out: [] };

  $.each(window.links, function(g,l) {
    var d = l.options.data;

    if (d.oGuid == guid) {
      links.out.push(g);
    }
    if (d.dGuid == guid) {
      links.in.push(g);
    }
  });

  return links;
}

window.getPortalLinksCount = function(guid) {
  var links = getPortalLinks(guid);
  return links.in.length+links.out.length;
}


// search through the fields for all that reference a portal
window.getPortalFields = function(guid) {
  var fields = [];

  $.each(window.fields, function(g,f) {
    var d = f.options.data;

    if ( d.points[0].guid == guid
      || d.points[1].guid == guid
      || d.points[2].guid == guid ) {

      fields.push(g);
    }
  });

  return fields;
}

window.getPortalFieldsCount = function(guid) {
  var fields = getPortalFields(guid);
  return fields.length;
};


  (function () {
    var cache = {};
    var cache_level = 0;
    var GC_LIMIT = 15000; // run garbage collector when cache has more that 5000 items
    var GC_KEEP = 10000; // keep the 4000 most recent items

  window.findPortalGuidByPositionE6 = function(latE6, lngE6) {
    var item = cache[latE6+","+lngE6];
    if(item) return item[0];

    // now try searching through currently rendered portals
    for(var guid in window.portals) {
      var data = window.portals[guid].options.data;
      if(data.latE6 == latE6 && data.lngE6 == lngE6) return guid;
    }

    // now try searching through fields
    for(var fguid in window.fields) {
      var points = window.fields[fguid].options.data.points;

      for(var i in points) {
        var point = points[i];
        if(point.latE6 == latE6 && point.lngE6 == lngE6) return point.guid;
      }
    }

    // and finally search through links
    for(var lguid in window.links) {
      var l = window.links[lguid].options.data;
      if(l.oLatE6 == latE6 && l.oLngE6 == lngE6) return l.oGuid;
      if(l.dLatE6 == latE6 && l.dLngE6 == lngE6) return l.dGuid;
    }

    return null;
  };

  window.pushPortalGuidPositionCache = function(guid, latE6, lngE6) {
    cache[latE6+","+lngE6] = [guid, Date.now()];
    cache_level += 1;

    if(cache_level > GC_LIMIT) {
      Object.keys(cache) // get all latlngs
        .map(function(latlng) { return [latlng, cache[latlng][1]]; })  // map them to [latlng, timestamp]
        .sort(function(a,b) { return b[1] - a[1]; }) // sort them
        .slice(GC_KEEP) // drop the MRU
        .forEach(function(item) { delete cache[item[0]] }); // delete the rest
      cache_level = Object.keys(cache).length
    }
  }
})();


