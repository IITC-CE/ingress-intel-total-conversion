// 
// ==UserScript==
// @author         jaiperdu
// @name           Player Inventory
// @category       Info
// @version        0.4.4
// @description    View inventory and highlight portals with keys at any zoom. Can be used with the official plugins Keys and Keys on map to show the number of keys on the map.
// @id             player-inventory@jaiperdu
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/jaiperdu/player-inventory.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/jaiperdu/player-inventory.user.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {

// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

const playerInventory = {};
window.plugin.playerInventory = playerInventory;

let itemsMap = null;

function extractItemsMap() {
  const minified = new RegExp('^[a-zA-Z$][a-zA-Z$0-9]?$');
  for (var topLevel in window) {
    if (minified.test(topLevel)) {
      const topObject = window[topLevel];
      if (topObject && typeof topObject === 'object') {
        if ('EMITTER_A' in topObject) return topObject;
      }
    }
  }
}

function getItemsMap() {
  if (!itemsMap) itemsMap = extractItemsMap();
  return itemsMap || {};
}

function getItemName(t) {
  return getItemsMap()[t] || t;
}

const orderedTypes = ['PORTAL_LINK_KEY', 'EMITTER_A', 'EMP_BURSTER', 'ULTRA_STRIKE', 'FLIP_CARD', 'FLIP_CARD:ADA', 'FLIP_CARD:JARVIS', 'POWER_CUBE', 'BOOSTED_POWER_CUBE', 'BOOSTED_POWER_CUBE_K', 'RES_SHIELD', 'EXTRA_SHIELD', 'TURRET', 'FORCE_AMP', 'LINK_AMPLIFIER', 'ULTRA_LINK_AMP', 'HEATSINK', 'MULTIHACK', 'TRANSMUTER_ATTACK', 'TRANSMUTER_DEFENSE', 'MEDIA', 'CAPSULE', 'INTEREST_CAPSULE', 'KEY_CAPSULE', 'KINETIC_CAPSULE', 'DRONE', 'MYSTERIOUS_ITEM_PLACEHOLDER', 'PLAYER_POWERUP', 'PLAYER_POWERUP:APEX', 'PORTAL_POWERUP', 'PORTAL_POWERUP:FRACK', 'PORTAL_POWERUP:NEMESIS', 'PORTAL_POWERUP:TOASTY', 'PORTAL_POWERUP:EXO5', 'PORTAL_POWERUP:MAGNUSRE', 'PORTAL_POWERUP:VIANOIR', 'PORTAL_POWERUP:VIALUX', 'PORTAL_POWERUP:INITIO', 'PORTAL_POWERUP:AEGISNOVA', 'PORTAL_POWERUP:OBSIDIAN', 'PORTAL_POWERUP:NIA', 'PORTAL_POWERUP:ENL', 'PORTAL_POWERUP:RES', 'PORTAL_POWERUP:MEET', 'PORTAL_POWERUP:LOOK', 'PORTAL_POWERUP:BB_BATTLE', 'PORTAL_POWERUP:BB_BATTLE_RARE', 'PORTAL_POWERUP:FW_ENL', 'PORTAL_POWERUP:FW_RES', 'PORTAL_POWERUP:BN_BLM'];
function addIfMissing(type) {
  if (!orderedTypes.includes(type)) orderedTypes.push(type);
}

const dontCount = ['DRONE'];
const levelItemTypes = ['EMITTER_A', 'EMP_BURSTER', 'POWER_CUBE', 'ULTRA_STRIKE', 'MEDIA'];
class Inventory {
  constructor(name) {
    this.name = name;
    this.keys = new Map(); // guid => {counts: caps => count}
    this.medias = new Map();
    this.clear();
  }
  clearItem(type) {
    addIfMissing(type);
    this.items[type] = {
      type: type,
      name: getItemName(type),
      leveled: levelItemTypes.includes(type),
      counts: {},
      total: 0
    };
  }
  clear() {
    this.keys.clear();
    this.medias.clear();
    this.capsules = {};
    this.items = {};
    this.count = 0;
    this.keyLockersCount = 0;
  }
  getItem(type) {
    if (!(type in this.items)) this.clearItem(type);
    return this.items[type];
  }
  addCapsule(capsule) {
    const data = {
      name: capsule.name,
      size: capsule.size,
      type: capsule.type,
      keys: {},
      medias: {},
      items: {}
    };
    this.capsules[capsule.name] = data;
    if (capsule.type === 'KEY_CAPSULE') this.keyLockersCount += capsule.size;
    this.addItem(capsule);
    for (const item of capsule.content) {
      this.addItem(item);
      if (item.type === 'PORTAL_LINK_KEY') data.keys[item.guid] = item;else if (item.type === 'MEDIA') data.medias[item.mediaId] = item;else {
        const cat = data.items[item.type] || {
          repr: item,
          leveled: levelItemTypes.includes(item.type),
          count: {},
          type: item.type
        };
        cat.count[item.rarity || item.level] = item.count;
        data.items[item.type] = cat;
      }
    }
  }
  addItem(item) {
    const cat = this.getItem(item.type);
    const lr = '' + (cat.leveled ? item.level : item.rarity);
    if (!cat.counts[lr]) cat.counts[lr] = {};
    const count = cat.counts[lr];
    if (!item.capsule) item.capsule = this.name;
    if (!item.count) item.count = 1;
    count[item.capsule] = (count[item.capsule] || 0) + item.count;
    count.total = (count.total || 0) + item.count;
    cat.total += item.count;
    if (!dontCount.includes(item.type)) this.count += item.count;
    if (item.type === 'PORTAL_LINK_KEY') {
      this.addKey(item);
    } else if (item.type === 'MEDIA') {
      this.addMedia(item);
    }
  }
  countType(type, levelRarity) {
    const cat = this.getItem(type);
    if (levelRarity !== undefined) {
      return cat.counts[levelRarity] ? cat.counts[levelRarity].total : 0;
    }
    return cat.total;
  }
  addMedia(media) {
    if (!this.medias.has(media.mediaId)) this.medias.set(media.mediaId, {
      mediaId: media.mediaId,
      name: media.name,
      url: media.url,
      count: new Map(),
      total: 0
    });
    const current = this.medias.get(media.mediaId);
    const entry = current.count.get(media.capsule) || 0;
    current.count.set(media.capsule, entry + (media.count || 1));
    current.total += media.count || 1;
  }
  countKey(guid) {
    if (!this.keys.has(guid)) return 0;
    return this.keys.get(guid).total;
  }
  addKey(key) {
    if (!this.keys.has(key.guid)) this.keys.set(key.guid, {
      guid: key.guid,
      title: key.title,
      latLng: key.latLng,
      address: key.address,
      count: new Map(),
      total: 0
    });
    const current = this.keys.get(key.guid);
    const entry = current.count.get(key.capsule) || 0;
    current.count.set(key.capsule, entry + (key.count || 1));
    current.total += key.count || 1;
  }
  onHand() {
    const data = {
      name: this.name,
      size: 0,
      keys: {},
      medias: {},
      items: {}
    };
    for (const key of this.keys.values()) {
      const count = key.count.get(this.name);
      if (count) {
        // @ts-ignore: type/capsule missing
        data.keys[key.guid] = {
          guid: key.guid,
          title: key.title,
          latLng: key.latLng,
          address: key.address,
          count: key.count.get(this.name)
        };
        data.size += count;
      }
    }
    for (const type in this.items) {
      if (type === 'PORTAL_LINK_KEY') continue;
      const item = this.getItem(type);
      for (const k in item.counts) {
        const count = item.counts[k][this.name];
        if (count) {
          if (!data.items[type]) data.items[type] = {
            type: type,
            leveled: levelItemTypes.includes(type),
            count: {}
          };
          data.items[type].count[k] = count;
          data.size += count;
        }
      }
    }
    return data;
  }
}

function parsePortalLocation(location) {
  return location.split(',').map((a) => (Number.parseInt(a, 16) & -1) * 1e-6);
}

/*
{
  "modResource": {
    "displayName": "SoftBank Ultra Link",
    "stats": {
      "LINK_RANGE_MULTIPLIER": "5000",
      "LINK_DEFENSE_BOOST": "1500",
      "OUTGOING_LINKS_BONUS": "8",
      "REMOVAL_STICKINESS": "150000",
      ...

      "BURNOUT_INSULATION": "4",
      "HACK_SPEED": "200000",
      "ATTACK_FREQUENCY": "1500",
      "HIT_BONUS": "200000",
      "REMOVAL_STICKINESS": "200000",
      "XM_SPIN": "-1"
    },
    "rarity": "VERY_RARE",
    "resourceType": "ULTRA_LINK_AMP"
  }
}
*/
function parseMod(mod) {
  return {
    type: mod.modResource.resourceType,
    name: mod.modResource.displayName,
    rarity: mod.modResource.rarity,
  };
}

/*
{
  "resourceWithLevels": {
    "resourceType": "MEDIA",
    "level": 1
  },
  "imageByUrl": {
    "imageUrl": "http://lh3.googleusercontent.com/l62x6RqXSc0JZESahVtmbUOdLFDPAwVUaxx9kfOkAu98HA7bnU0mOftOV10qzgd_tO7dA_chiZHmG8YxfN0F"
  },
  "inInventory": {
    "playerId": "redacted",
    "acquisitionTimestampMs": "redacted"
  },
  "displayName": {
    "displayName": "Media"
  },
  "storyItem": {
    "primaryUrl": "https://youtu.be/4MyMpzkcYmk",
    "shortDescription": "UmbraDefeat",
    "mediaId": "4176",
    "hasBeenViewed": false,
    "releaseDate": "1571122800000"
  }
*/
function parseMedia(data, media) {
  data.mediaId = media.storyItem.mediaId;
  data.name = media.storyItem.shortDescription;
  data.url = media.storyItem.primaryUrl;
  return data;
}

/*
  {
    "resourceWithLevels": {
      "resourceType": "EMITTER_A",
      "level": 7
    }
  }
*/
function parseLevelItem(obj) {
  const data = {
    type: obj.resourceWithLevels.resourceType,
    level: obj.resourceWithLevels.level,
  };
  if (obj.storyItem) return parseMedia(data, obj);
  return data;
}

/*
{
  "resource": {
    "resourceType": "PORTAL_LINK_KEY",
    "resourceRarity": "VERY_COMMON"
  },
  "portalCoupler": {
    "portalGuid": "...",
    "portalLocation": "int32 hex,int32 hex",
    "portalImageUrl": "...",
    "portalTitle": "...",
    "portalAddress": "..."
  },
  "inInventory": {
    "playerId": "...",
    "acquisitionTimestampMs": "..."
  }
}
*/
function parsePortalKey(data, key) {
  data.guid = key.portalCoupler.portalGuid;
  data.title = key.portalCoupler.portalTitle;
  data.latLng = parsePortalLocation(key.portalCoupler.portalLocation);
  data.address = key.portalCoupler.portalAddress;
  return data;
}

/*
{
  "resource": {
    "resourceType": "FLIP_CARD",
    "resourceRarity": "VERY_RARE"
  },
  "flipCard": {
    "flipCardType": "JARVIS"
  }
}
*/
function parseFlipCard(data, flipcard) {
  data.type += ':' + flipcard.flipCard.flipCardType;
  return data;
}

/*
{
  "resource": {
    "resourceType": "PLAYER_POWERUP",
    "resourceRarity": "VERY_RARE"
  },
  "inInventory": {
    "playerId": "...",
    "acquisitionTimestampMs": "..."
  },
  "playerPowerupResource": {
    "playerPowerupEnum": "APEX"
  }
}
*/
function parsePlayerPowerUp(data, powerup) {
  data.type += ':' + powerup.playerPowerupResource.playerPowerupEnum;
  return data;
}

/*
{
  "resource": {
    "resourceType": "PORTAL_POWERUP",
    "resourceRarity": "VERY_RARE"
  },
  "timedPowerupResource": {
    "multiplier": 0,
    "designation": "NIA",
    "multiplierE6": 1000000
  }
}
*/
function parsePortalPowerUp(data, powerup) {
  data.type += ':' + powerup.timedPowerupResource.designation;
  return data;
}
/*
{
  "resource": {
    "resourceType": "INTEREST_CAPSULE",
    "resourceRarity": "VERY_RARE"
  },
  "moniker": {
    "differentiator": "12345678"
  },
  "container": {
    "currentCapacity": 100,
    "currentCount": 0,
    "stackableItems": [
      {
        "itemGuids": [...],
        "exampleGameEntity": ["...", 0, {
          <ITEMDATA>,
          "displayName": {
            "displayName": "Portal Shield",
            "displayDescription": "Mod which shields Portal from attacks."
          }
        }]
      },
    ]
  }
}
*/
function parseContainer(data, container) {
  data.name = container.moniker.differentiator;
  data.size = container.container.currentCount;
  data.content = [];
  for (const stackableItem of container.container.stackableItems) {
    const item = parseItem(stackableItem.exampleGameEntity);
    if (item) {
      item.count = stackableItem.itemGuids.length;
      item.capsule = data.name;
      data.content.push(item);
    }
  }
  return data;
}

function parseResource(obj) {
  const data = {
    type: obj.resource.resourceType,
    rarity: obj.resource.resourceRarity,
  };
  if (obj.flipCard) return parseFlipCard(data, obj);
  if (obj.container) return parseContainer(data, obj);
  if (obj.portalCoupler) return parsePortalKey(data, obj);
  if (obj.timedPowerupResource) return parsePortalPowerUp(data, obj);
  if (obj.playerPowerupResource) return parsePlayerPowerUp(data, obj);
  return data;
}
/*
[
  guid, timestamp?, item object
]
*/
function parseItem(item) {
  const obj = item[2];
  if (obj.resource) return parseResource(obj);
  if (obj.resourceWithLevels) return parseLevelItem(obj);
  if (obj.modResource) return parseMod(obj);
  // xxx: other types
}

function parseInventory(name, data) {
  const inventory = new Inventory(name);
  for (const entry of data) {
    const item = parseItem(entry);
    if (item) {
      if (item.type.includes('CAPSULE')) inventory.addCapsule(item);
      else inventory.addItem(item);
    }
  }
  return inventory;
}

const STORE_KEY = 'plugin-player-inventory';
const SETTINGS_KEY = 'plugin-player-inventory-settings';

function openIndexedDB() {
  const rq = window.indexedDB.open('player-inventory', 1);
  rq.onupgradeneeded = function (event) {
    const db = event.target.result;
    db.createObjectStore('inventory', { autoIncrement: true });
  };
  return rq;
}

/**
 *
 * @returns {Promise<{ date: string, raw: any }} Returns last saved inventory raw data
 */
function loadLastInventory() {
  return new Promise(loadFromIndexedDB);
}

function loadFromIndexedDB(resolve, reject) {
  if (!window.indexedDB) return loadFromLocalStorage(resolve, reject);
  const rq = openIndexedDB();
  rq.onerror = function () {
    loadFromLocalStorage(resolve, reject);
  };
  rq.onsuccess = function (event) {
    const db = event.target.result;
    const tx = db.transaction(['inventory'], 'readonly');
    const store = tx.objectStore('inventory');
    const rq = store.getAll();
    rq.onsuccess = function (event) {
      const r = event.target.result;
      if (r.length > 0) {
        const data = r[r.length - 1];
        resolve(data);
      } else {
        loadFromLocalStorage(resolve, reject);
      }
    };
    rq.onerror = function () {
      loadFromLocalStorage(resolve, reject);
    };
    db.close();
  };
}

function loadFromLocalStorage(resolve, reject) {
  const store = localStorage[STORE_KEY];
  if (store) {
    try {
      const data = JSON.parse(store);
      resolve(data);
    } catch (e) {
      console.log(e);
    }
  }
  reject('no inventory found');
}

function saveInventory(data) {
  return storeToIndexedDB(data);
}

function storeToIndexedDB(data) {
  if (!window.indexedDB) return storeToLocalStorage(data);
  const rq = openIndexedDB();
  rq.onerror = function () {
    storeToLocalStorage(data);
  };
  rq.onsuccess = function (event) {
    const db = event.target.result;
    const tx = db.transaction(['inventory'], 'readwrite');
    const store = tx.objectStore('inventory');
    store.clear().onsuccess = function () {
      store.add({
        raw: data,
        date: Date.now(),
      });
    };
    tx.oncomplete = function () {
      delete localStorage[STORE_KEY];
    };
    tx.onerror = function () {
      storeToLocalStorage(data);
    };
    db.close();
  };
}

function storeToLocalStorage(data) {
  const store = {
    raw: data,
    date: Date.now(),
  };
  localStorage[STORE_KEY] = JSON.stringify(store);
}

function loadSettings() {
  const settings = localStorage[SETTINGS_KEY];
  if (settings) {
    try {
      const data = JSON.parse(settings);
      return data;
    } catch (e) {
      console.log(e);
    }
  }
  return {};
}

function storeSettings(settings) {
  localStorage[SETTINGS_KEY] = JSON.stringify(settings);
}

function postAjax(action, data) {
  return new Promise(function (resolve, reject) {
    return window.postAjax(
      action,
      data,
      (ret) => resolve(ret),
      (_, textStatus, errorThrown) => reject(textStatus + ': ' + errorThrown)
    );
  });
}

function getSubscriptionStatus() {
  return postAjax('getHasActiveSubscription');
}

/**
 * @returns {{ result: any[] }}
 */
function getInventory() {
  return postAjax('getInventory', { lastQueryTimestamp: 0 });
}

function requestInventory() {
  return getSubscriptionStatus()
    .then((data) => {
      if (data.result) return getInventory();
      return Promise.reject('no core');
    })
    .then((data) => data.result);
}

function injectKeys(data) {
  if (!playerInventory.isHighlighActive) return;

  const bounds = window.map.getBounds();
  const entities = [];
  for (const [guid, key] of playerInventory.inventory.keys) {
    if (bounds.contains(key.latLng)) {
      // keep known team
      const team = window.portals[guid] ? window.portals[guid].options.ent[2][1] : 'N';
      const ent = [guid, 0, ['p', team, Math.round(key.latLng[0] * 1e6), Math.round(key.latLng[1] * 1e6)]];
      entities.push(ent);
    }
  }
  data.callback(entities);
}

function portalKeyHighlight(data) {
  const guid = data.portal.options.guid;
  if (playerInventory.inventory.keys.has(guid)) {
    const color = playerInventory.settings.highlightColor;
    // place holder
    if (data.portal.options.team !== window.TEAM_NONE && data.portal.options.level === 0) {
      data.portal.setStyle({
        color: color,
        weight: 2 * Math.sqrt(window.portalMarkerScale()),
        dashArray: '',
      });
    } else if (
      window.map.getZoom() < 15 &&
      data.portal.options.team === window.TEAM_NONE &&
      !window.portalDetail.isFresh(guid)
    )
      // injected without intel data
      data.portal.setStyle({ color: color, fillColor: 'gray' });
    else data.portal.setStyle({ color: color });
  }
}

function createPopup(guid) {
  const portal = window.portals[guid];
  const latLng = portal.getLatLng();
  // create popup only if the portal is in view
  if (window.map.getBounds().contains(latLng)) {
    const count = playerInventory.inventory.keys.get(guid).count;
    const text = Array.from(count)
      .map(([name, count]) => `<strong>${name}</strong>: ${count}`)
      .join('<br/>');

    L.popup()
      .setLatLng(latLng)
      .setContent('<div class="inventory-keys">' + text + '</div>')
      .openOn(window.map);
  }
}

function exportToKeys() {
  if (!window.plugin.keys) return;
  [window.plugin.keys.KEY, window.plugin.keys.UPDATE_QUEUE].forEach(mapping => {
    const data = {};
    for (const [guid, key] of playerInventory.inventory.keys) {
      data[guid] = key.total;
    }
    window.plugin.keys[mapping.field] = data;
    window.plugin.keys.storeLocal(mapping);
  });
  window.runHooks('pluginKeysRefreshAll');
  window.plugin.keys.delaySync();
}

var css_248z = ".inventory-box .container {\n  width: max-content;\n}\n\n.inventory-box .ui-accordion-header {\n  color: #ffce00;\n  background: rgba(0, 0, 0, 0.7);\n}\n\n.inventory-box .ui-accordion-header,\n.inventory-box .ui-accordion-content {\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  margin-top: -1px;\n  display: block;\n  line-height: 1.4rem;\n}\n\n.inventory-box .ui-accordion-header:before {\n  font-size: 18px;\n  margin-right: 2px;\n  content: '⊞';\n}\n\n.inventory-box .ui-accordion-header-active:before {\n  content: '⊟';\n}\n\n.inventory-box table {\n  width: 100%;\n}\n\n.inventory-box table tr {\n  background: rgba(0, 0, 0, 0.3);\n}\n\n.inventory-box table tr:nth-child(2n + 1) {\n  background: rgba(0, 0, 0, 0.6);\n}\n\n.inventory-box .sum tr th {\n  white-space: nowrap;\n  width: max-content;\n}\n\n.inventory-box .sum tr:nth-child(2n) th {\n  text-decoration: underline dotted;\n  font-weight: normal;\n}\n\n.inventory-box .sum tr {\n  text-align: center;\n}\n\n.inventory-box .all tr td:nth-child(2),\n.inventory-box .keys tr td:nth-child(2),\n.inventory-box .medias tr td:nth-child(2),\n.inventory-box .capsule tr td:nth-child(2) {\n  text-align: center;\n}\n\n.inventory-box .all tr td:last-child,\n.inventory-box .keys tr td:last-child,\n.inventory-box .medias tr td:last-child,\n.inventory-box .capsule tr td:last-child {\n  text-align: left;\n}\n\n.inventory-box .all tr td:first-child,\n.inventory-box .keys tr td:first-child,\n.inventory-box .medias tr td:first-child,\n.inventory-box .capsule tr td:first-child {\n  text-align: right;\n  width: 2em;\n}\n\n.inventory-box td {\n  padding-left: 0.3rem;\n  padding-right: 0.3rem;\n}\n\n.inventory-box .sum tr td span {\n  white-space: nowrap;\n}\n\n#dialog-inventory.inventory-box {\n  padding-right: 16px;\n}\n\n.inventory-box.mobile {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  overflow: auto;\n  padding: 0;\n}\n.inventory-box.mobile .container {\n  width: unset;\n}\n\n.inventory-box.mobile button {\n  width: 100%;\n}\n\n.inventory-box .edit-name-icon {\n  margin-top: -18px;\n  position: absolute;\n  right: 20px;\n}\n\n.inventory-box .edit-name-input {\n  display: none;\n  width: 100%;\n}\n\n/* popup */\n.inventory-keys {\n  width: max-content;\n}\n\n#dialog-inventory-opt .container {\n  display: grid;\n  grid-template-columns: auto auto;\n  grid-gap: 0.5em;\n}\n\n#dialog-inventory-opt button {\n  grid-column: 1/3;\n  padding: 0.3rem 1em;\n}\n\n#dialog-inventory-opt input {\n  margin-left: auto;\n  margin-top: auto;\n  margin-bottom: auto;\n}\n\n#dialog-inventory-opt input[type=color] {\n  height: 100%;\n}\n\n#dialog-inventory-names textarea.container {\n  width: 100%;\n  height: 100%;\n}\n\n#randdetails .inventory-details {\n  vertical-align: top;\n}\n";

function shortenRarity(v) {
  return v.split('_').map(a => a[0]).join('');
}
function localeCompare(a, b) {
  if (typeof a !== 'string') a = '';
  if (typeof b !== 'string') b = '';
  return a.localeCompare(b);
}

function setupCSS() {
  let colorStyle = '';
  if (playerInventory.settings.lvlColorEnable) {
    window.COLORS_LVL.forEach((c, i) => {
      colorStyle += `.level_L${i}{ color: ${c} }`;
    });
    for (const r in window.COLORS_MOD) {
      colorStyle += `.rarity_${shortenRarity(r)} { color: ${window.COLORS_MOD[r]} }`;
    }
  }
  const style = document.head.querySelector('#player-inventory-css') || document.createElement('style');
  style.id = 'player-inventory-css';
  style.textContent = css_248z + colorStyle;
  document.head.append(style);
}

function handleInventory(data) {
  if (data.length > 0) {
    playerInventory.inventory = parseInventory('⌂', data);
    playerInventory.lastRefresh = Date.now();
    saveInventory(data);
    window.runHooks('pluginInventoryRefresh', {
      inventory: playerInventory.inventory
    });
    autoRefresh();
  } else {
    return Promise.reject('empty');
  }
}
function refreshInventory(auto) {
  clearTimeout(playerInventory.autoRefreshTimer);
  requestInventory().then(handleInventory).catch(e => {
    if (e === 'no core') {
      alert('You need to subscribe to C.O.R.E. to get your inventory from Intel Map.');
    } else {
      if (!auto) {
        if (e === 'empty') {
          alert('Inventory empty, probably hitting rate limit, try again later');
        } else {
          alert('Inventory: Last refresh failed. ' + e);
        }
        autoRefresh();
      }
    }
  });
}
function refreshIfOld() {
  const delay = playerInventory.lastRefresh + playerInventory.settings.autoRefreshDelay * 60 * 1000 - Date.now();
  if (delay <= 0) return refreshInventory(true);
}
function autoRefresh() {
  if (!playerInventory.settings.autoRefreshActive) return;
  playerInventory.autoRefreshTimer = setTimeout(() => refreshInventory(true), playerInventory.settings.autoRefreshDelay * 60 * 1000);
}
function stopAutoRefresh() {
  clearTimeout(playerInventory.autoRefreshTimer);
}

function Fragment(attrs) {
  const fragment = document.createDocumentFragment();
  recursiveAppend(fragment, attrs.children);
  return fragment;
}

function recursiveAppend(element, children) {
  // cast to string to display "undefined" or "null"
  if (children === undefined || children === null) return;
  if (Array.isArray(children)) {
    for (const child of children) recursiveAppend(element, child);
  } else {
    element.append(children);
  }
}

function jsx(tagName, attrs) {
  if (typeof tagName === 'function') return tagName(attrs);
  const children = attrs.children;
  delete attrs.children;
  const rawHtml = attrs.rawHtml;
  delete attrs.rawHtml;
  const elem = document.createElement(tagName);
  // dataset
  if (attrs.dataset) {
    for (const key in attrs.dataset) elem.dataset[key] = attrs.dataset[key];
    delete attrs.dataset;
  }
  // events
  for (const key in attrs) {
    if (key.startsWith('on')) {
      elem.addEventListener(key.slice(2), attrs[key]);
      delete attrs[key];
    }
  }
  Object.assign(elem, attrs);
  if (rawHtml) {
    elem.innerHTML = rawHtml;
    return elem;
  }
  recursiveAppend(elem, children);
  return elem;
}

const jsxs = jsx;

function ItemRow (props) {
  const {
    item,
    lvl,
    count
  } = props;
  const lr = item.leveled ? 'L' + lvl : shortenRarity(lvl);
  const className = (item.leveled ? 'level_' : 'rarity_') + lr;
  const name = getItemName(item.type);
  return jsxs("tr", {
    className: className,
    children: [jsx("td", {
      children: count
    }), jsx("td", {
      children: lr
    }), jsx("td", {
      children: name
    })]
  });
}

function createAllTable({
  inventory
}) {
  const table = jsx("table", {});
  for (const type of orderedTypes) {
    const total = inventory.countType(type);
    if (total === 0) continue;
    const item = inventory.getItem(type);
    for (const i in item.counts) {
      const num = inventory.countType(type, i);
      if (num > 0) {
        table.append(jsx(ItemRow, {
          item: item,
          count: num,
          lvl: i
        }));
      }
    }
  }
  return table;
}

const C_R_VR = ['COMMON', 'RARE', 'VERY_RARE'];
function AllSumTable ({
  inventory
}) {
  const total = inventory.getItem('PORTAL_LINK_KEY').total;
  const inventoryCount = total ? inventory.getItem('PORTAL_LINK_KEY').counts['VERY_COMMON'][inventory.name] || 0 : 0;
  const otherCount = total - inventoryCount - inventory.keyLockersCount;
  let beacon = 0;
  for (const type in inventory.items) {
    if (type.startsWith('PORTAL_POWERUP')) {
      switch (type) {
        case 'PORTAL_POWERUP:FRACK':
        case 'PORTAL_POWERUP:BB_BATTLE_RARE':
        case 'PORTAL_POWERUP:BB_BATTLE':
        case 'PORTAL_POWERUP:FW_ENL':
        case 'PORTAL_POWERUP:FW_RES':
          break;
        default:
          beacon += inventory.countType(type);
      }
    }
  }
  return jsxs("div", {
    children: [jsxs("table", {
      children: [jsxs("tr", {
        children: [jsx("th", {
          children: "Portal Keys"
        }), jsx("th", {
          children: "\u2302"
        }), jsx("th", {
          children: "Lockers"
        }), jsx("th", {
          children: "Other"
        })]
      }), jsxs("tr", {
        children: [jsx("th", {
          children: total
        }), jsx("td", {
          children: inventoryCount
        }), jsx("td", {
          children: inventory.keyLockersCount
        }), jsx("td", {
          children: otherCount
        })]
      })]
    }), jsx("table", {
      children: [['EMITTER_A', 'R'], ['EMP_BURSTER', 'B'], ['ULTRA_STRIKE', 'US'], ['POWER_CUBE', 'PC']].map(([type, short]) => jsxs(Fragment, {
        children: [jsxs("tr", {
          children: [jsx("th", {
            children: getItemName(type)
          }), [1, 2, 3, 4, 5, 6, 7, 8].map(i => jsx("th", {
            className: 'level_L' + i,
            children: short + i
          }))]
        }), jsxs("tr", {
          children: [jsx("th", {
            children: inventory.countType(type)
          }), [1, 2, 3, 4, 5, 6, 7, 8].map(i => jsx("td", {
            children: inventory.countType(type, i)
          }))]
        })]
      }))
    }), jsxs("table", {
      children: [jsxs("tr", {
        children: [jsx("th", {
          children: "Hypercube"
        }), jsx("th", {
          children: "ADA Refactor"
        }), jsx("th", {
          children: "JARVIS Virus"
        })]
      }), jsxs("tr", {
        children: [jsx("td", {
          children: inventory.countType('BOOSTED_POWER_CUBE') + inventory.countType('BOOSTED_POWER_CUBE_K')
        }), jsx("td", {
          children: inventory.countType('FLIP_CARD:ADA')
        }), jsx("td", {
          children: inventory.countType('FLIP_CARD:JARVIS')
        })]
      })]
    }), jsxs("table", {
      children: [jsxs("tr", {
        children: [jsx("th", {
          children: "Shield"
        }), jsx("th", {
          className: "rarity_C",
          children: "C"
        }), jsx("th", {
          className: "rarity_R",
          children: "R"
        }), jsx("th", {
          className: "rarity_VR",
          children: "VR"
        }), jsx("th", {
          className: "rarity_VR",
          children: "Aegis"
        })]
      }), jsxs("tr", {
        children: [jsx("th", {
          children: inventory.countType('RES_SHIELD') + inventory.countType('EXTRA_SHIELD')
        }), C_R_VR.map(k => jsx("td", {
          children: inventory.countType('RES_SHIELD', k)
        })), jsx("td", {
          children: inventory.countType('EXTRA_SHIELD')
        })]
      })]
    }), jsxs("table", {
      children: [jsxs("tr", {
        children: [jsx("th", {
          children: "Turret"
        }), jsx("th", {
          children: "Force Amp"
        }), jsx("th", {
          children: "Link Amp"
        }), inventory.countType('LINK_AMPLIFIER', 'VERY_RARE') ? jsx("th", {
          className: "rarity_VR",
          children: "LA VR"
        }) : null, jsx("th", {
          children: "Ultra Link"
        }), jsx("th", {
          children: "ITO +"
        }), jsx("th", {
          children: "ITO -"
        })]
      }), jsxs("tr", {
        children: [jsx("td", {
          children: inventory.countType('TURRET')
        }), jsx("td", {
          children: inventory.countType('FORCE_AMP')
        }), jsx("td", {
          children: inventory.countType('LINK_AMPLIFIER', 'RARE')
        }), inventory.countType('LINK_AMPLIFIER', 'VERY_RARE') ? jsx("td", {
          children: inventory.countType('LINK_AMPLIFIER', 'VERY_RARE')
        }) : null, jsx("td", {
          children: inventory.countType('ULTRA_LINK_AMP')
        }), jsx("td", {
          children: inventory.countType('TRANSMUTER_DEFENSE')
        }), jsx("td", {
          children: inventory.countType('TRANSMUTER_ATTACK')
        })]
      })]
    }), jsxs("table", {
      children: [jsxs("tr", {
        children: [jsx("th", {
          children: "HeatSink"
        }), jsx("th", {
          className: "rarity_C",
          children: "C"
        }), jsx("th", {
          className: "rarity_R",
          children: "R"
        }), jsx("th", {
          className: "rarity_VR",
          children: "VR"
        }), jsx("th", {
          children: "MultiHack"
        }), jsx("th", {
          className: "rarity_C",
          children: "C"
        }), jsx("th", {
          className: "rarity_R",
          children: "R"
        }), jsx("th", {
          className: "rarity_VR",
          children: "VR"
        })]
      }), jsxs("tr", {
        children: [jsx("th", {
          children: inventory.countType('HEATSINK')
        }), C_R_VR.map(k => jsx("td", {
          children: inventory.countType('HEATSINK', k)
        })), jsx("th", {
          children: inventory.countType('MULTIHACK')
        }), C_R_VR.map(k => jsx("td", {
          children: inventory.countType('MULTIHACK', k)
        }))]
      })]
    }), jsxs("table", {
      children: [jsxs("tr", {
        children: [jsx("th", {
          children: "Capsule"
        }), jsx("th", {
          children: "Quantum"
        }), jsx("th", {
          children: "KeyLocker"
        }), jsx("th", {
          children: "Kinetic"
        }), jsx("th", {
          children: "Media"
        })]
      }), jsxs("tr", {
        children: [jsx("td", {
          children: inventory.countType('CAPSULE')
        }), jsx("td", {
          children: inventory.countType('INTEREST_CAPSULE')
        }), jsx("td", {
          children: inventory.countType('KEY_CAPSULE')
        }), jsxs("td", {
          children: [jsx("span", {
            className: "rarity_C",
            children: inventory.countType('KINETIC_CAPSULE', 'COMMON')
          }), ' + ', jsx("span", {
            className: "rarity_R",
            children: inventory.countType('KINETIC_CAPSULE', 'RARE')
          })]
        }), jsx("td", {
          children: inventory.countType('MEDIA')
        })]
      })]
    }), jsxs("table", {
      children: [jsxs("tr", {
        children: [jsx("th", {
          children: "Apex"
        }), jsx("th", {
          children: "Fracker"
        }), jsx("th", {
          className: "rarity_R",
          children: "BB R"
        }), jsx("th", {
          className: "rarity_VR",
          children: "BB VR"
        }), jsx("th", {
          children: "Beacon"
        }), jsx("th", {
          children: "FW ENL"
        }), jsx("th", {
          children: "FW RES"
        })]
      }), jsxs("tr", {
        children: [jsx("td", {
          children: inventory.countType('PLAYER_POWERUP:APEX')
        }), jsx("td", {
          children: inventory.countType('PORTAL_POWERUP:FRACK')
        }), jsx("td", {
          children: inventory.countType('PORTAL_POWERUP:BB_BATTLE_RARE')
        }), jsx("td", {
          children: inventory.countType('PORTAL_POWERUP:BB_BATTLE')
        }), jsx("td", {
          children: beacon
        }), jsx("td", {
          children: inventory.countType('PORTAL_POWERUP:FW_ENL')
        }), jsx("td", {
          children: inventory.countType('PORTAL_POWERUP:FW_RES')
        })]
      })]
    })]
  });
}

function KeyMediaRow ({
  item,
  children
}) {
  const details = Array.from(item.count).map(([name, count]) => `${name}: ${count}`).join(', ');
  return jsxs("tr", {
    children: [jsx("td", {
      children: jsx("a", {
        title: details,
        children: item.total
      })
    }), jsx("td", {
      children: children
    })]
  });
}

function PortalKeyLink ({
  item
}) {
  const latLng = [item.latLng[0].toFixed(6), item.latLng[1].toFixed(6)];
  return jsx("a", {
    title: item.address,
    href: window.makePermalink(latLng),
    onclick: function (event) {
      event.preventDefault();
      window.renderPortalDetails(item.guid);
      window.selectPortalByLatLng(latLng);
    },
    ondblclick: function (event) {
      event.preventDefault();
      window.renderPortalDetails(item.guid);
      window.zoomToAndShowPortal(item.guid, latLng);
    },
    children: item.title
  });
}

function KeysTable ({
  inventory
}) {
  const keys = [...inventory.keys.values()].sort((a, b) => localeCompare(a.title, b.title));
  return jsx("table", {
    children: keys.map(key => jsx(KeyMediaRow, {
      item: key,
      children: jsx(PortalKeyLink, {
        item: key
      })
    }))
  });
}

function MediaTable ({
  inventory
}) {
  const medias = [...inventory.medias.values()].sort((a, b) => localeCompare(a.name, b.name));
  return jsx("table", {
    children: medias.map(media => jsx(KeyMediaRow, {
      item: media,
      children: jsx("a", {
        href: media.url,
        children: media.name
      })
    }))
  });
}

function CapsuleTable ({
  capsule
}) {
  const keys = Object.values(capsule.keys).sort((a, b) => localeCompare(a.title, b.title));
  const medias = Object.values(capsule.medias).sort((a, b) => localeCompare(a.name, b.name));
  return jsxs("table", {
    children: [keys.map(item => jsxs("tr", {
      children: [jsx("td", {
        children: item.count
      }), capsule.type !== 'KEY_CAPSULE' ? jsx("td", {}) : null, jsx("td", {
        children: jsx(PortalKeyLink, {
          item: item
        })
      })]
    })), medias.map(item => jsxs("tr", {
      className: "level_L1",
      children: [jsx("td", {
        children: item.count
      }), jsx("td", {
        children: "M"
      }), jsx("td", {
        children: jsx("a", {
          href: item.url,
          children: item.name
        })
      })]
    })), orderedTypes.map(type => {
      const item = capsule.items[type];
      if (item) {
        return Object.keys(item.count).map(i => jsx(ItemRow, {
          count: item.count[i],
          item: item,
          lvl: i
        }));
      }
    })]
  });
}

function InventoryTables ({
  inventory
}) {
  const inventoryCount = inventory.count - inventory.keyLockersCount;
  const keyInInventory = inventory.keys.size > 0 ? inventory.getItem('PORTAL_LINK_KEY').counts['VERY_COMMON'][inventory.name] || 0 : 0;
  const container = jsxs("div", {
    className: "container",
    children: [jsx("b", {
      children: `Summary I:${inventoryCount - keyInInventory} K:${keyInInventory} T:${inventoryCount}/2500 KL:${inventory.keyLockersCount}`
    }), jsx("div", {
      className: "sum",
      children: jsx(AllSumTable, {
        inventory: inventory
      })
    }), jsx("b", {
      children: "Details"
    }), jsx("div", {
      className: "all",
      children: jsx(createAllTable, {
        inventory: inventory
      })
    })]
  });
  if (inventory.keys.size > 0) {
    container.append(jsxs(Fragment, {
      children: [jsx("b", {
        children: "Keys"
      }), jsx("div", {
        className: "medias",
        children: jsx(KeysTable, {
          inventory: inventory
        })
      })]
    }));
  }
  if (inventory.medias.size > 0) {
    container.append(jsxs(Fragment, {
      children: [jsx("b", {
        children: "Medias"
      }), jsx("div", {
        className: "all",
        children: jsx(MediaTable, {
          inventory: inventory
        })
      })]
    }));
  }
  const onHand = inventory.onHand();
  container.append(jsxs(Fragment, {
    children: [jsxs("b", {
      children: ["On Hand (", onHand.size, ")"]
    }), jsx("div", {
      className: "capsule",
      children: jsx(CapsuleTable, {
        capsule: onHand
      })
    })]
  }));
  const mapping = playerInventory.settings.capsuleNameMap;
  const capsulesName = Object.keys(inventory.capsules).sort((a, b) => {
    if (mapping[a] && !mapping[b]) return -1;
    if (!mapping[a] && mapping[b]) return 1;
    a = mapping[a] || a;
    b = mapping[b] || b;
    return localeCompare(a, b);
  });
  const keyLockers = capsulesName.filter(name => inventory.capsules[name].type === 'KEY_CAPSULE');
  const quantums = capsulesName.filter(name => inventory.capsules[name].type === 'INTEREST_CAPSULE');
  const commonCapsules = capsulesName.filter(name => inventory.capsules[name].type === 'CAPSULE');
  for (const names of [keyLockers, quantums, commonCapsules]) {
    for (const name of names) {
      const capsule = inventory.capsules[name];
      if (capsule.size > 0) {
        const displayName = mapping[name] ? `${mapping[name]} [${name}]` : name;
        const typeName = getItemName(capsule.type);
        const size = capsule.size;
        const head = jsx("b", {
          children: `${typeName}: ${displayName} (${size})`
        });
        container.append(jsxs(Fragment, {
          children: [head, jsxs("div", {
            className: "capsule",
            children: [jsxs("div", {
              children: [jsx("a", {
                className: "edit-name-icon",
                title: "Change capsule name",
                onclick: ev => {
                  const input = ev.target.nextElementSibling;
                  input.style.display = input.style.display === 'unset' ? null : 'unset';
                },
                children: "\u270F\uFE0F"
              }), jsx("input", {
                className: "edit-name-input",
                value: mapping[name] || '',
                placeholder: "Enter capsule name",
                oninput: ev => {
                  mapping[name] = ev.target.value;
                  storeSettings(playerInventory.settings);
                  const displayName = mapping[name] ? `${mapping[name]} [${name}]` : name;
                  head.textContent = `${typeName}: ${displayName} (${size})`;
                }
              })]
            }), jsx(CapsuleTable, {
              capsule: capsule
            })]
          })]
        }));
      }
    }
  }
  return container;
}

function Options () {
  const container = jsxs("div", {
    className: "container",
    children: [jsx("label", {
      htmlFor: "plugin-player-inventory-popup-enable",
      children: "Keys popup"
    }), jsx("input", {
      type: "checkbox",
      checked: playerInventory.settings.popupEnable,
      id: "plugin-player-inventory-popup-enable",
      onchange: ev => {
        playerInventory.settings.popupEnable = ev.target.checked === 'true' || (ev.target.checked === 'false' ? false : ev.target.checked);
        storeSettings(playerInventory.settings);
      }
    }), jsx("label", {
      htmlFor: "plugin-player-inventory-autorefresh-enable",
      children: "Auto-refresh"
    }), jsx("input", {
      type: "checkbox",
      checked: playerInventory.settings.autoRefreshActive,
      id: "plugin-player-inventory-autorefresh-enable",
      onchange: ev => {
        playerInventory.settings.autoRefreshActive = ev.target.checked === 'true' || (ev.target.checked === 'false' ? false : ev.target.checked);
        if (playerInventory.settings.autoRefreshActive) {
          autoRefresh();
        } else {
          stopAutoRefresh();
        }
        storeSettings(playerInventory.settings);
      }
    }), jsx("label", {
      children: "Refresh delay (min)"
    }), jsx("input", {
      type: "number",
      checked: playerInventory.settings.autoRefreshDelay,
      onchange: ev => {
        playerInventory.settings.autoRefreshDelay = +ev.target.value > 0 ? +ev.target.value : 1;
        ev.target.value = playerInventory.settings.autoRefreshDelay;
        storeSettings(playerInventory.settings);
      }
    }), jsx("button", {
      onclick: displayNameMapping,
      children: "Set Capsule names"
    }), window.plugin.keys && jsxs(Fragment, {
      children: [jsx("label", {
        htmlFor: "plugin-player-inventory-autosync-enable",
        children: "Auto-sync with Keys"
      }), jsx("input", {
        type: "checkbox",
        checked: playerInventory.settings.autoSyncKeys,
        id: "plugin-player-inventory-autosync-enable",
        onchange: ev => {
          playerInventory.settings.autoSyncKeys = ev.target.checked === 'true' || (ev.target.checked === 'false' ? false : ev.target.checked);
          storeSettings(playerInventory.settings);
        }
      }), jsx("button", {
        onclick: exportToKeys,
        children: "Export to keys plugin"
      })]
    }), jsx("button", {
      onclick: exportToClipboard,
      children: "Export keys to clipboard"
    }), jsx("label", {
      htmlFor: "plugin-player-inventory-keys-sidebar-enable",
      children: "Keys in sidebar"
    }), jsx("input", {
      type: "checkbox",
      checked: playerInventory.settings.keysSidebarEnable,
      id: "plugin-player-inventory-keys-sidebar-enable",
      onchange: ev => {
        playerInventory.settings.keysSidebarEnable = ev.target.checked === 'true' || (ev.target.checked === 'false' ? false : ev.target.checked);
        storeSettings(playerInventory.settings);
      }
    }), jsx("label", {
      htmlFor: "plugin-player-inventory-lvlcolor-enable",
      children: "Level/rarity colors"
    }), jsx("input", {
      type: "checkbox",
      checked: playerInventory.settings.lvlColorEnable,
      id: "plugin-player-inventory-keys-lvlcolor-enable",
      onchange: ev => {
        playerInventory.settings.lvlColorEnable = ev.target.checked === 'true' || (ev.target.checked === 'false' ? false : ev.target.checked);
        setupCSS();
        storeSettings(playerInventory.settings);
      }
    }), jsx("label", {
      children: "Highlighter Color"
    }), jsx("input", {
      type: "color",
      value: playerInventory.settings.highlightColor,
      onchange: ev => {
        playerInventory.settings.highlightColor = ev.target.value || '#ff0000';
        storeSettings(playerInventory.settings);
        // @ts-ignore
        window.resetHighlightedPortals();
      }
    })]
  });
  return container;
}
function exportToClipboard() {
  const data = [];
  for (const key of playerInventory.inventory.keys.values()) {
    for (const [capsule, num] of key.count) {
      data.push([key.title, key.latLng[0].toFixed(6), key.latLng[1].toFixed(6), capsule, num].join('\t'));
    }
  }
  const shared = data.join('\n');
  const content = jsx("textarea", {
    onclick: () => {
      content.select();
    },
    children: shared
  });
  if (typeof android !== 'undefined' && android && android.shareString) android.shareString(shared);else {
    window.dialog({
      title: 'Keys',
      html: content,
      width: 'auto',
      height: 'auto'
    });
  }
}
function displayNameMapping() {
  const capsules = playerInventory.inventory.capsules;
  const mapping = playerInventory.settings.capsuleNameMap;
  const capsulesName = Object.keys(capsules).sort();
  const text = [];
  for (const name of capsulesName) {
    if (mapping[name]) text.push(`${name}: ${mapping[name]}`);
  }
  const container = jsx("textarea", {
    className: "container",
    placeholder: "AAAAAAAA: Name of AAAAAAAA\\nBBBBBBBB: Name of BBBBBBBB\\n...",
    value: text.join('\n')
  });
  window.dialog({
    title: 'Inventory Capsule Names',
    id: 'inventory-names',
    html: container,
    buttons: [{
      text: 'Set',
      click: () => {
        const lines = container.value.trim().split('\n');
        for (const line of lines) {
          const m = line.trim().match(/^([0-9A-F]{8})\s*:\s*(.*)$/);
          if (m) {
            mapping[m[1]] = m[2];
          }
        }
        storeSettings(playerInventory.settings);
      }
    }, {
      text: 'Close',
      click: function () {
        $(this).dialog('close');
      }
    }]
  });
}

function buildInventoryHTML(inventory) {
  const container = jsx(InventoryTables, {
    inventory: inventory
  });
  $(container).accordion({
    header: 'b',
    heightStyle: 'fill',
    collapsible: true
  });
  return container;
}
function fillPane(inventory) {
  const oldContainer = playerInventory.pane.querySelector('.container');
  if (oldContainer) playerInventory.pane.removeChild(oldContainer);
  playerInventory.pane.appendChild(buildInventoryHTML(inventory));
}
function getTitle() {
  let title = 'Inventory';
  if (playerInventory.lastRefresh) {
    title = title + ' (' + new Date(playerInventory.lastRefresh).toLocaleTimeString() + ')';
  }
  return title;
}
function displayInventory(inventory) {
  const container = buildInventoryHTML(inventory);
  playerInventory.dialog = window.dialog({
    title: getTitle(),
    id: 'inventory',
    html: container,
    width: 'auto',
    height: '560',
    classes: {
      'ui-dialog-content': 'inventory-box'
    },
    buttons: {
      Refresh: () => refreshInventory(),
      Options: displayOpt
    }
  });
  refreshIfOld();
}
function displayOpt() {
  const container = jsx(Options, {});
  window.dialog({
    title: 'Inventory Opt',
    id: 'inventory-opt',
    html: container,
    width: 'auto',
    height: 'auto'
  });
}
function setupDisplay() {
  playerInventory.dialog = null;
  if (window.useAndroidPanes()) {
    android.addPane('playerInventory', 'Inventory', 'ic_action_view_as_list');
    window.addHook('paneChanged', function (pane) {
      if (pane === 'playerInventory') {
        refreshIfOld();
        playerInventory.pane.style.display = '';
      } else if (playerInventory.pane) {
        playerInventory.pane.style.display = 'none';
      }
    });
    playerInventory.pane = jsx("div", {
      className: "inventory-box mobile",
      id: "pane-inventory",
      children: jsx("button", {
        onclick: () => refreshInventory(),
        children: "Refresh"
      })
    });
    playerInventory.pane.style.display = 'none';
    document.body.append(playerInventory.pane);
    document.getElementById('toolbox').append(jsx("a", {
      title: "Inventory options",
      onclick: displayOpt,
      children: "Inventory Opt"
    }));
  } else {
    document.getElementById('toolbox').append(jsx("a", {
      title: "Show inventory",
      onclick: () => displayInventory(playerInventory.inventory),
      children: "Inventory"
    }));
  }
}

// iitc setup
function setup () {
  // Dummy inventory
  playerInventory.inventory = new Inventory();
  playerInventory.isHighlighActive = false;
  playerInventory.lastRefresh = Date.now();
  playerInventory.autoRefreshTimer = null;
  playerInventory.settings = {
    autoRefreshActive: false,
    popupEnable: true,
    autoRefreshDelay: 30,
    autoSyncKeys: false,
    keysSidebarEnable: false,
    capsuleNameMap: {},
    lvlColorEnable: true,
    highlightColor: '#ff0000'
  };
  $.extend(playerInventory.settings, loadSettings());
  setupCSS();
  setupDisplay();
  playerInventory.requestInventory = requestInventory;
  playerInventory.highlighter = {
    highlight: portalKeyHighlight,
    setSelected: function (selected) {
      playerInventory.isHighlighActive = selected;
    }
  };
  window.addPortalHighlighter('Inventory keys', playerInventory.highlighter);
  window.addHook('pluginInventoryRefresh', data => {
    if (playerInventory.settings.autoSyncKeys) {
      exportToKeys();
    }
    if (playerInventory.dialog) {
      playerInventory.dialog.html(buildInventoryHTML(data.inventory));
      playerInventory.dialog.dialog('option', 'title', getTitle());
    }
    if (playerInventory.pane) {
      fillPane(data.inventory);
      const button = playerInventory.pane.querySelector('button');
      if (button) button.textContent = 'Refresh (' + new Date(playerInventory.lastRefresh).toLocaleTimeString() + ')';
    }
  });
  window.addHook('mapDataEntityInject', injectKeys);
  window.addHook('portalSelected', data => {
    // {selectedPortalGuid: guid, unselectedPortalGuid: oldPortalGuid}
    if (!playerInventory.settings.popupEnable) return;
    if (data.selectedPortalGuid && data.selectedPortalGuid !== data.unselectedPortalGuid) {
      const total = playerInventory.inventory.countKey(data.selectedPortalGuid);
      if (total > 0) {
        createPopup(data.selectedPortalGuid);
      }
    }
  });
  window.addHook('portalDetailsUpdated', data => {
    // {guid: guid, portal: portal, portalDetails: details, portalData: data}
    if (!playerInventory.settings.keysSidebarEnable) return;
    const total = playerInventory.inventory.countKey(data.guid);
    if (total > 0) {
      const key = playerInventory.inventory.keys.get(data.guid);
      const mapping = playerInventory.settings.capsuleNameMap;
      const capsules = Array.from(key.count.keys()).map(name => jsx("div", {
        title: mapping[name] ? `${mapping[name]} [${name}]` : name,
        children: mapping[name] ? `${mapping[name]}` : name
      }));
      document.getElementById('randdetails').append(jsxs("tr", {
        className: "inventory-details",
        children: [jsx("td", {
          children: total
        }), jsx("td", {
          children: "Keys"
        }), jsx("td", {
          children: "Capsules"
        }), jsx("td", {
          children: capsules
        })]
      }));
    }
  });
  loadLastInventory().then(data => {
    playerInventory.inventory = parseInventory('⌂', data.raw);
    playerInventory.lastRefresh = data.date;
    autoRefresh();
    window.runHooks('pluginInventoryRefresh', {
      inventory: playerInventory.inventory
    });
  });
}

if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();

setup.info = plugin_info; //add the script info data to the function as a property
}

// inject code into site context
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };

var script = document.createElement('script');
// if on last IITC mobile, will be replaced by wrapper(info)
var mobile = `script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);`;
// detect if mobile
if (mobile.startsWith('script')) {
  script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
  script.appendChild(document.createTextNode('//# sourceURL=iitc:///plugins/player-inventory.js'));
  (document.body || document.head || document.documentElement).appendChild(script);
} else {
  // mobile string
  wrapper(info);
}
