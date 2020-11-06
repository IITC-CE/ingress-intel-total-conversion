// @author         jonatkins
// @name           Cache viewed portals on map
// @category       Cache
// @version        0.1.0
// @description    Cache the details of recently viewed portals and use this to populate the map when possible


// use own namespace for plugin
window.plugin.cachePortalDetailsOnMap = function() {};

window.plugin.cachePortalDetailsOnMap.MAX_AGE = 12*60*60;  //12 hours max age for cached data

window.plugin.cachePortalDetailsOnMap.portalDetailLoaded = function(data) {
  if (data.success) {
    window.plugin.cachePortalDetailsOnMap.cache[data.guid] = { loadtime: Date.now(), ent: data.ent };
  }
};

window.plugin.cachePortalDetailsOnMap.entityInject = function(data) {
  var maxAge = Date.now() - window.plugin.cachePortalDetailsOnMap.MAX_AGE*1000;

  var ents = [];
  for (var guid in window.plugin.cachePortalDetailsOnMap.cache) {
    if (window.plugin.cachePortalDetailsOnMap.cache[guid].loadtime < maxAge) {
      delete window.plugin.cachePortalDetailsOnMap.cache[guid];
    } else {
      ents.push(window.plugin.cachePortalDetailsOnMap.cache[guid].ent);
    }
  }
  data.callback(ents);
};

// extend portal's GUID lookup to search in cached portals as well
window.cachePortalDetailsOnMap.findPortalGuidByCacheE6 = function(latE6, lngE6) {
  let guid = window.cachePortalDetailsOnMap.findPortalGuidByPositionE6old(latE6, lngE6);

  // PLUGIN: cache > cache
  if (guid == null) {
    const cache = window.plugin.cachePortalDetailsOnMap;
    if (cache && cache.cache) {
      for (let g in cache.cache) {
        let p = cache.cache[g];
        if (latE6 == p.ent[2][2] && lngE6 == p.ent[2][3]) {
//        console.log("newFindPortalGuidByPositionE6 matched in cache! %s %s -> [%s] = %o", latE6, lngE6, g, p);
          guid = g;
          break;
        }
      }
    }
  }
  return guid;
};

window.cachePortalDetailsOnMap.searchInit = function () {
    window.cachePortalDetailsOnMap.findPortalGuidByPositionE6old = window.findPortalGuidByPositionE6;
    window.findPortalGuidByPositionE6 = window.cachePortalDetailsOnMap.findPortalGuidByCacheE6;
};

window.plugin.cachePortalDetailsOnMap.setup  = function() {

  window.plugin.cachePortalDetailsOnMap.cache = {};
  window.plugin.cachePortaldetailsOnMap.searchInit;

  addHook('portalDetailLoaded', window.plugin.cachePortalDetailsOnMap.portalDetailLoaded);
  addHook('mapDataEntityInject', window.plugin.cachePortalDetailsOnMap.entityInject);
};

var setup =  window.plugin.cachePortalDetailsOnMap.setup;
