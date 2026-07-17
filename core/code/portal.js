/* global IITC, L, log -- eslint */

/**
 * Namespace for working with portal data: link/field lookups, detail computations and selection helpers.
 *
 * @memberof IITC
 * @namespace portal
 */

// Pending portal selection, kept while waiting for the portal to appear on the map
let urlPortalLL;
let urlPortal;

/**
 * Search through the links data for all that link from and to a portal. Returns an object with separate lists of in
 * and out links. May or may not be as accurate as the portal details, depending on how much data the API returns.
 *
 * @memberof IITC.portal
 * @param {string} guid - The GUID of the portal to search for links.
 * @returns {Object} An object containing arrays of incoming ('in') and outgoing ('out') link GUIDs.
 */
const getLinks = function (guid) {
  const links = { in: [], out: [] };

  for (const [g, l] of Object.entries(window.links)) {
    const d = l.options.data;

    if (d.oGuid === guid) {
      links.out.push(g);
    }
    if (d.dGuid === guid) {
      links.in.push(g);
    }
  }

  return links;
};

/**
 * Counts the total number of links (both incoming and outgoing) for a specified portal.
 *
 * @memberof IITC.portal
 * @param {string} guid - The GUID of the portal.
 * @returns {number} The total number of links for the portal.
 */
const getLinksCount = function (guid) {
  const links = IITC.portal.getLinks(guid);
  return links.in.length + links.out.length;
};

/**
 * Searches through the fields for all fields that reference a specified portal.
 *
 * @memberof IITC.portal
 * @param {string} guid - The GUID of the portal to search for fields.
 * @returns {Array} An array containing the GUIDs of fields associated with the portal.
 */
const getFields = function (guid) {
  const fields = [];

  for (const [g, f] of Object.entries(window.fields)) {
    const d = f.options.data;

    if (d.points[0].guid === guid || d.points[1].guid === guid || d.points[2].guid === guid) {
      fields.push(g);
    }
  }

  return fields;
};

/**
 * Counts the total number of fields associated with a specified portal.
 *
 * @memberof IITC.portal
 * @param {string} guid - The GUID of the portal.
 * @returns {number} The total number of fields associated with the portal.
 */
const getFieldsCount = function (guid) {
  const fields = IITC.portal.getFields(guid);
  return fields.length;
};

/**
 * Finds a portal GUID by its position. Searches through currently rendered portals.
 * Note: this includes fields and links.
 *
 * @memberof IITC.portal
 * @param {number} latE6 - The latitude in E6 format.
 * @param {number} lngE6 - The longitude in E6 format.
 * @returns {string|null} The GUID of the portal at the specified location, or null if not found.
 */
const findGuidByPositionE6 = function (latE6, lngE6) {
  const portal = Object.values(window.portals).find((p) => p.options.data.latE6 === latE6 && p.options.data.lngE6 === lngE6);
  return portal?.options.data.guid ?? null;
};

/**
 * Calculates the resonator-based level of a portal.
 * This includes a decimal part and is not clamped to the minimum level of 1
 *
 * @memberof IITC.portal
 * @param {Object} d - The portal detail object containing resonator information.
 * @returns {number} The calculated portal level.
 */
const getLevel = function (d) {
  if (!d.resonators) return 0;
  return d.resonators.reduce((sum, reso) => sum + (parseInt(reso?.level) || 0), 0) / 8;
};

/**
 * Calculates the total energy capacity of a portal based on its resonators.
 *
 * @memberof IITC.portal
 * @param {Object} d - The portal detail object containing resonator information.
 * @returns {number} The total energy capacity of the portal.
 */
const getTotalEnergy = function (d) {
  let nrg = 0;
  d.resonators.forEach((reso) => {
    if (!reso) return;
    const level = parseInt(reso.level);
    const max = window.RESO_NRG[level];
    nrg += max;
  });
  return nrg;
};

/**
 * Calculates the current energy of a portal based on its resonators.
 *
 * @memberof IITC.portal
 * @param {Object} d - The portal detail object containing resonator information.
 * @returns {number} The current energy of the portal.
 */
const getCurrentEnergy = function (d) {
  let nrg = 0;
  d.resonators.forEach((reso) => {
    if (!reso) return;
    nrg += parseInt(reso.energy);
  });
  return nrg;
};

/**
 * Calculates the health percentage of a portal based on its current and total energy.
 *
 * @memberof IITC.portal
 * @param {Object} d - The portal detail object containing resonator information.
 * @returns {number} The portal health as a percentage (0-100).
 *                   Returns 0 if the portal has no total energy.
 */
const getHealth = function (d) {
  const max = IITC.portal.getTotalEnergy(d);
  const cur = IITC.portal.getCurrentEnergy(d);

  return max > 0 ? Math.floor((cur / max) * 100) : 0;
};

/**
 * Calculates the range of a portal for creating links. The range depends on portal level and any installed Link Amps.
 *
 * @memberof IITC.portal
 * @param {Object} d - The portal detail object containing details about the team and resonators.
 * @returns {Object} An object containing the base range (`base`), boost multiplier (`boost`),
 *                   total range after applying the boost (`range`),
 *                   and a boolean indicating if the portal is linkable (`isLinkable`).
 */
const getRange = function (d) {
  // formula by the great gals and guys at
  // http://decodeingress.me/2012/11/18/ingress-portal-levels-and-link-range/
  const range = {
    base: window.teamStringToId(d.team) === window.TEAM_MAC ? window.LINK_RANGE_MAC[d.level + 1] : 160 * Math.pow(IITC.portal.getLevel(d), 4),
    boost: IITC.portal.getLinkAmpRangeBoost(d),
  };

  range.range = range.boost * range.base;
  range.isLinkable = d.resCount === 8;

  return range;
};

/**
 * Calculates the boost in link range provided by installed Link Amps.
 *
 * @memberof IITC.portal
 * @param {Object} d - The portal detail object containing mod information.
 * @returns {number} The total boost factor for the link range.
 */
const getLinkAmpRangeBoost = function (d) {
  if (window.teamStringToId(d.team) === window.TEAM_MAC) {
    return 1.0;
  }
  // additional range boost calculation

  // link amps scale: first is full, second a quarter, the last two an eighth
  const scale = [1.0, 0.25, 0.125, 0.125];

  let boost = 0.0; // initial boost is 0.0 (i.e. no boost over standard range)

  const linkAmps = IITC.portal.getModsByType(d, 'LINK_AMPLIFIER');

  linkAmps.forEach((mod, i) => {
    // link amp stat LINK_RANGE_MULTIPLIER is 2000 for rare, and gives 2x boost to the range
    // and very-rare is 7000 and gives 7x the range
    const baseMultiplier = mod.stats.LINK_RANGE_MULTIPLIER / 1000;
    boost += baseMultiplier * scale[i];
  });

  return linkAmps.length > 0 ? boost : 1.0;
};

/**
 * Calculates the potential AP gain from attacking a portal.
 *
 * @memberof IITC.portal
 * @param {Object} d - The portal detail object containing resonator and ownership information.
 * @param {number} fieldCount - The number of fields attached to the portal.
 * @param {number} linkCount - The number of links attached to the portal.
 * @returns {Object} An object detailing various components of AP gain, including totals for friendly and enemy factions.
 */
const getAttackApGain = function (d, fieldCount, linkCount) {
  if (!fieldCount) fieldCount = 0;

  let resoCount = 0;
  const maxResonators = window.MAX_RESO_PER_PLAYER.slice(0);
  const curResonators = [0, 0, 0, 0, 0, 0, 0, 0, 0];

  for (let n = window.PLAYER.level + 1; n < 9; n++) {
    maxResonators[n] = 0;
  }
  d.resonators.forEach((reso) => {
    if (!reso) return;
    resoCount += 1;
    const reslevel = parseInt(reso.level);
    if (reso.owner === window.PLAYER.nickname) {
      if (maxResonators[reslevel] > 0) {
        maxResonators[reslevel] -= 1;
      }
    } else {
      curResonators[reslevel] += 1;
    }
  });

  const resoAp = resoCount * window.DESTROY_RESONATOR;
  const linkAp = linkCount * window.DESTROY_LINK;
  const fieldAp = fieldCount * window.DESTROY_FIELD;
  const destroyAp = resoAp + linkAp + fieldAp;
  const captureAp = window.CAPTURE_PORTAL + 8 * window.DEPLOY_RESONATOR + window.COMPLETION_BONUS;
  const enemyAp = destroyAp + captureAp;
  const deployCount = 8 - resoCount;
  const completionAp = deployCount > 0 ? window.COMPLETION_BONUS : 0;
  let upgradeCount = 0;
  let upgradeAvailable = maxResonators[8];
  for (let n = 7; n >= 0; n--) {
    upgradeCount += curResonators[n];
    if (upgradeAvailable < upgradeCount) {
      upgradeCount -= upgradeCount - upgradeAvailable;
    }
    upgradeAvailable += maxResonators[n];
  }
  const friendlyAp = deployCount * window.DEPLOY_RESONATOR + upgradeCount * window.UPGRADE_ANOTHERS_RESONATOR + completionAp;
  return {
    friendlyAp: friendlyAp,
    deployCount: deployCount,
    upgradeCount: upgradeCount,
    enemyAp: enemyAp,
    destroyAp: destroyAp,
    resoAp: resoAp,
    captureAp: captureAp,
  };
};

/**
 * Corrects the portal image URL to match the current protocol (http/https).
 *
 * @memberof IITC.portal
 * @param {string} url - The original image URL.
 * @returns {string} The corrected image URL.
 */
const fixImageUrl = function (url) {
  if (url) {
    if (window.location.protocol === 'https:') {
      url = url.replace(/^http:\/\//, '//');
    }
    return url;
  } else {
    return window.DEFAULT_PORTAL_IMG;
  }
};

/**
 * Returns a list of portal mods filtered by a specific type.
 *
 * @memberof IITC.portal
 * @param {Object} d - The portal detail object containing mod information.
 * @param {string} type - The type of mods to filter (e.g., 'RES_SHIELD', 'LINK_AMPLIFIER').
 * @returns {Array} An array of mods matching the specified type.
 */
const getModsByType = function (d, type) {
  const mods = [];

  const typeToStat = {
    RES_SHIELD: 'MITIGATION',
    FORCE_AMP: 'FORCE_AMPLIFIER',
    TURRET: 'HIT_BONUS', // and/or ATTACK_FREQUENCY??
    HEATSINK: 'HACK_SPEED',
    MULTIHACK: 'BURNOUT_INSULATION',
    LINK_AMPLIFIER: 'LINK_RANGE_MULTIPLIER',
    ULTRA_LINK_AMP: 'OUTGOING_LINKS_BONUS', // and/or LINK_DEFENSE_BOOST??
  };

  const stat = typeToStat[type];

  (d.mods || []).forEach((mod) => {
    if (mod && Object.hasOwn(mod.stats, stat)) mods.push(mod);
  });

  // sorting mods by the stat keeps code simpler, when calculating combined mod effects
  mods.sort((a, b) => b.stats[stat] - a.stats[stat]);

  return mods;
};

/**
 * Calculates the total mitigation provided by shields installed on a portal.
 *
 * @memberof IITC.portal
 * @param {Object} d - The portal detail object containing mod information.
 * @returns {number} The total mitigation value from all shields installed on the portal.
 */
const getShieldMitigation = function (d) {
  const shields = IITC.portal.getModsByType(d, 'RES_SHIELD');

  let mitigation = 0;
  shields.forEach((s) => {
    mitigation += parseInt(s.stats.MITIGATION);
  });

  return mitigation;
};

/**
 * Calculates the link defense boost provided by installed Ultra Link Amps.
 *
 * @memberof IITC.portal
 * @param {Object} d - The portal detail object containing mod information.
 * @returns {number} The total link defense boost factor.
 */
const getLinkDefenseBoost = function (d) {
  const ultraLinkAmps = IITC.portal.getModsByType(d, 'ULTRA_LINK_AMP');

  let linkDefenseBoost = 1;

  ultraLinkAmps.forEach((ultraLinkAmp) => {
    linkDefenseBoost *= parseInt(ultraLinkAmp.stats.LINK_DEFENSE_BOOST) / 1000;
  });

  return Math.round(10 * linkDefenseBoost) / 10;
};

/**
 * Calculates the additional mitigation provided by links attached to a portal.
 *
 * @memberof IITC.portal
 * @param {number} linkCount - The number of links attached to the portal.
 * @returns {number} The additional mitigation value provided by the links.
 */
const getLinksMitigation = function (linkCount) {
  const mitigation = Math.round((400 / 9) * Math.atan(linkCount / Math.E));
  return mitigation;
};

/**
 * Calculates detailed mitigation information for a portal, including contributions from shields and links.
 *
 * @memberof IITC.portal
 * @param {Object} d - The portal detail object containing mod and resonator information.
 * @param {number} linkCount - The number of links attached to the portal.
 * @returns {Object} An object detailing various components of mitigation.
 */
const getMitigationDetails = function (d, linkCount) {
  const linkDefenseBoost = IITC.portal.getLinkDefenseBoost(d);

  const mitigation = {
    shields: IITC.portal.getShieldMitigation(d),
    links: IITC.portal.getLinksMitigation(linkCount) * linkDefenseBoost,
    linkDefenseBoost: linkDefenseBoost,
  };

  // mitigation is limited to 95% (as confirmed by Brandon Badger on G+)
  mitigation.total = Math.min(95, mitigation.shields + mitigation.links);

  const excess = mitigation.shields + mitigation.links - mitigation.total;
  mitigation.excess = Math.round(10 * excess) / 10;

  return mitigation;
};

/**
 * Calculates the maximum number of outgoing links that can be created from a portal.
 *
 * @memberof IITC.portal
 * @param {Object} d - The portal detail object containing mod information.
 * @returns {number} The maximum number of outgoing links.
 */
const getMaxOutgoingLinks = function (d) {
  const linkAmps = IITC.portal.getModsByType(d, 'ULTRA_LINK_AMP');

  let links = 8;

  linkAmps.forEach((mod) => {
    links += parseInt(mod.stats.OUTGOING_LINKS_BONUS);
  });

  return links;
};

/**
 * Calculates hack-related details of a portal, such as hack cooldown and burnout time.
 *
 * @memberof IITC.portal
 * @param {Object} d - The portal detail object containing mod information.
 * @returns {Object} An object containing hack-related details like cooldown time, hack count, and burnout time.
 */
const getHackDetails = function (d) {
  const heatsinks = IITC.portal.getModsByType(d, 'HEATSINK');
  const multihacks = IITC.portal.getModsByType(d, 'MULTIHACK');

  // first mod of type is fully effective, the others are only 50% effective
  const effectivenessReduction = [1, 0.5, 0.5, 0.5];

  const isFriendly = window.teamStringToId(d.team) === window.teamStringToId(window.PLAYER.team);
  let cooldownTime = isFriendly ? window.FACTION_HACK_COOLDOWN : window.BASE_HACK_COOLDOWN;

  heatsinks.forEach((mod, index) => {
    const hackSpeed = parseInt(mod.stats.HACK_SPEED) / 1000000;
    cooldownTime = Math.round(cooldownTime * (1 - hackSpeed * effectivenessReduction[index]));
  });

  let hackCount = window.BASE_HACK_COUNT; // default hacks

  multihacks.forEach((mod, index) => {
    const extraHacks = parseInt(mod.stats.BURNOUT_INSULATION);
    hackCount = hackCount + extraHacks * effectivenessReduction[index];
  });

  return { cooldown: cooldownTime, hacks: hackCount, burnout: cooldownTime * (hackCount - 1) };
};

/**
 * Converts detailed portal information into a summary format similar to that seen in the map tile data.
 *
 * @memberof IITC.portal
 * @param {Object} d - The detailed portal data.
 * @returns {Object} A summary of the portal data, including level, title, image, resonator count, health, and team.
 */
const getSummaryData = function (d) {
  // NOTE: the summary data reports unclaimed portals as level 1 - not zero as elsewhere in IITC
  let level = Math.floor(IITC.portal.getLevel(d));
  if (level === 0) level = 1; // niantic returns neutral portals as level 1, not 0 as used throughout IITC elsewhere

  let resCount = 0;
  if (d.resonators) {
    for (const x in d.resonators) {
      if (d.resonators[x]) resCount++;
    }
  }
  const maxEnergy = IITC.portal.getTotalEnergy(d);
  const curEnergy = IITC.portal.getCurrentEnergy(d);
  const health = maxEnergy > 0 ? Math.floor((curEnergy / maxEnergy) * 100) : 0;

  return {
    level: level,
    title: d.title,
    image: d.image,
    resCount: resCount,
    latE6: d.latE6,
    health: health,
    team: d.team,
    lngE6: d.lngE6,
    type: 'portal',
  };
};

/**
 * Calculates various attack values of a portal, including hit bonus, force amplifier, and attack frequency.
 *
 * @memberof IITC.portal
 * @param {Object} d - The portal detail object containing mod information.
 * @returns {Object} An object containing attack values such as hit bonus, force amplifier, and attack frequency.
 */
const getAttackValues = function (d) {
  const forceamps = IITC.portal.getModsByType(d, 'FORCE_AMP');
  const turrets = IITC.portal.getModsByType(d, 'TURRET');

  // at the time of writing, only rare force amps and turrets have been seen in the wild, so there's a little guesswork
  // at how the stats work and combine
  // algorithm has been compied from getLinkAmpRangeBoost
  // FIXME: only extract stats and put the calculation in a method to be used for link range, force amplifier and attack
  // frequency
  // note: scanner shows rounded values (adding a second FA shows: 2.5x+0.2x=2.8x, which should be 2.5x+0.25x=2.75x)

  // amplifier scale: first is full, second a quarter, the last two an eighth
  const scale = [1.0, 0.25, 0.125, 0.125];

  const attackValues = {
    hit_bonus: 0,
    force_amplifier: 0,
    attack_frequency: 0,
  };

  forceamps.forEach((mod, i) => {
    // force amp stat FORCE_AMPLIFIER is 2000 for rare, and gives 2x boost to the range
    const baseMultiplier = mod.stats.FORCE_AMPLIFIER / 1000;
    attackValues.force_amplifier += baseMultiplier * scale[i];
  });

  turrets.forEach((mod, i) => {
    // turret stat ATTACK_FREQUENCY is 2000 for rare, and gives 2x boost to the range
    const baseMultiplier = mod.stats.ATTACK_FREQUENCY / 1000;
    attackValues.attack_frequency += baseMultiplier * scale[i];

    attackValues.hit_bonus += mod.stats.HIT_BONUS / 10000;
  });

  return attackValues;
};

/**
 * Zooms the map to a specific portal and shows its details if available.
 *
 * @memberof IITC.portal
 * @param {string} guid - The globally unique identifier of the portal.
 * @param {L.LatLng|number[]} latlng - The latitude and longitude of the portal.
 */
const zoomToAndShow = function (guid, latlng) {
  window.map.setView(latlng, window.DEFAULT_ZOOM);
  // if the data is available, render it immediately. Otherwise defer
  // until it becomes available.
  if (window.portals[guid]) window.renderPortalDetails(guid);
  else IITC.portal.selectWhenLoadedByGuid(guid);
};

/**
 * Selects a portal by its latitude and longitude.
 *
 * @memberof IITC.portal
 * @param {number|Array|L.LatLng} lat - The latitude of the portal
 *                                      or an array or L.LatLng object containing both latitude and longitude.
 * @param {number} [lng] - The longitude of the portal.
 */
const selectByLatLng = function (lat, lng) {
  if (lng === undefined && lat instanceof Array) {
    lng = lat[1];
    lat = lat[0];
  } else if (lng === undefined && lat instanceof L.LatLng) {
    lng = lat.lng;
    lat = lat.lat;
  }
  for (const guid in window.portals) {
    const latlng = window.portals[guid].getLatLng();
    if (latlng.lat === lat && latlng.lng === lng) {
      window.renderPortalDetails(guid);
      return;
    }
  }

  // not currently visible
  const ll = new L.LatLng(lat, lng);
  IITC.portal.selectWhenLoadedByLatLng(ll);
  window.map.setView(ll, window.DEFAULT_ZOOM);
};

/**
 * Select a portal when it appears on the map
 *
 * @memberof IITC.portal
 * @param {L.LatLng} latLng - the location of the portal
 */
const selectWhenLoadedByLatLng = (latLng) => {
  if (urlPortalLL === undefined) {
    window.addHook('portalAdded', testPortalLatLng);
  }

  urlPortalLL = latLng;
  window.urlPortalLL = latLng; // @deprecated
};

const testPortalLatLng = (data) => {
  if (data.portal.getLatLng().equals(urlPortalLL)) {
    log.log(`urlPortalLL ${urlPortalLL.toString()} matches portal GUID ${data.portal.options.guid}`);
    window.selectedPortal = data.portal.options.guid;
    window.renderPortalDetails(window.selectedPortal, true);
    urlPortalLL = undefined;
    window.urlPortalLL = undefined; // @deprecated
  }

  if (!urlPortalLL) window.removeHook('portalAdded', testPortalLatLng);
};

/**
 * Select a portal when it appears on the map
 *
 * @memberof IITC.portal
 * @param {string} guid - the guid of the portal
 */
const selectWhenLoadedByGuid = (guid) => {
  if (urlPortal === undefined) {
    window.addHook('portalAdded', testPortalGuid);
  }

  urlPortal = guid;
  window.urlPortal = guid; // @deprecated
};

const testPortalGuid = (data) => {
  if (data.portal.options.guid === urlPortal) {
    log.log(`urlPortal GUID ${window.urlPortal} found - selecting...`);
    window.selectedPortal = urlPortal;
    window.renderPortalDetails(window.selectedPortal, true);
    urlPortal = undefined;
    window.urlPortal = undefined; // @deprecated
  }

  if (!urlPortal) window.removeHook('portalAdded', testPortalGuid);
};

IITC.portal = {
  // Link/field data lookups
  getLinks,
  getLinksCount,
  getFields,
  getFieldsCount,
  findGuidByPositionE6,
  // Detail computations
  getLevel,
  getTotalEnergy,
  getCurrentEnergy,
  getHealth,
  getRange,
  getLinkAmpRangeBoost,
  getAttackApGain,
  fixImageUrl,
  getModsByType,
  getShieldMitigation,
  getLinkDefenseBoost,
  getLinksMitigation,
  getMitigationDetails,
  getMaxOutgoingLinks,
  getHackDetails,
  getSummaryData,
  getAttackValues,
  // Selection / navigation
  zoomToAndShow,
  selectByLatLng,
  selectWhenLoadedByLatLng,
  selectWhenLoadedByGuid,
};

// Map of legacy global names to their new names within IITC.portal
const legacyPortalMappings = {
  getPortalLinks: 'getLinks',
  getPortalLinksCount: 'getLinksCount',
  getPortalFields: 'getFields',
  getPortalFieldsCount: 'getFieldsCount',
  findPortalGuidByPositionE6: 'findGuidByPositionE6',
  getPortalLevel: 'getLevel',
  getTotalPortalEnergy: 'getTotalEnergy',
  getPortalEnergy: 'getTotalEnergy', // legacy alias of getTotalPortalEnergy
  getCurrentPortalEnergy: 'getCurrentEnergy',
  getPortalHealth: 'getHealth',
  getPortalRange: 'getRange',
  getLinkAmpRangeBoost: 'getLinkAmpRangeBoost',
  getAttackApGain: 'getAttackApGain',
  fixPortalImageUrl: 'fixImageUrl',
  getPortalModsByType: 'getModsByType',
  getPortalShieldMitigation: 'getShieldMitigation',
  getPortalLinkDefenseBoost: 'getLinkDefenseBoost',
  getPortalLinksMitigation: 'getLinksMitigation',
  getPortalMitigationDetails: 'getMitigationDetails',
  getMaxOutgoingLinks: 'getMaxOutgoingLinks',
  getPortalHackDetails: 'getHackDetails',
  getPortalSummaryData: 'getSummaryData',
  getPortalAttackValues: 'getAttackValues',
  zoomToAndShowPortal: 'zoomToAndShow',
  selectPortalByLatLng: 'selectByLatLng',
  selectPortalWhenLoadedByLatLng: 'selectWhenLoadedByLatLng',
  selectPortalWhenLoadedByGuid: 'selectWhenLoadedByGuid',
};

IITC.registerLegacyAliases(IITC.portal, legacyPortalMappings);
