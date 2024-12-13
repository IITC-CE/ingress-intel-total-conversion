/**
 * @file This file contains functions that handle the extraction and computation of raw data
 * from portal details for various purposes.
 * @module portal_info
 */

/**
 * Calculates the displayed level of a portal, which is always rounded down from the actual float value.
 *
 * @function getPortalLevel
 * @param {Object} d - The portal detail object containing resonator information.
 * @returns {number} The calculated portal level.
 */
window.getPortalLevel = function (d) {
  var lvl = 0;
  var hasReso = false;
  $.each(d.resonators, function (ind, reso) {
    if (!reso) return true;
    lvl += parseInt(reso.level);
    hasReso = true;
  });
  return hasReso ? Math.max(1, lvl / 8) : 0;
};

/**
 * Calculates the total energy capacity of a portal based on its resonators.
 *
 * @function getTotalPortalEnergy
 * @param {Object} d - The portal detail object containing resonator information.
 * @returns {number} The total energy capacity of the portal.
 */
window.getTotalPortalEnergy = function (d) {
  var nrg = 0;
  $.each(d.resonators, function (ind, reso) {
    if (!reso) return true;
    var level = parseInt(reso.level);
    var max = window.RESO_NRG[level];
    nrg += max;
  });
  return nrg;
};

// For backwards compatibility
window.getPortalEnergy = window.getTotalPortalEnergy;

/**
 * Calculates the current energy of a portal based on its resonators.
 *
 * @function getCurrentPortalEnergy
 * @param {Object} d - The portal detail object containing resonator information.
 * @returns {number} The current energy of the portal.
 */
window.getCurrentPortalEnergy = function (d) {
  var nrg = 0;
  $.each(d.resonators, function (ind, reso) {
    if (!reso) return true;
    nrg += parseInt(reso.energy);
  });
  return nrg;
};

/**
 * Calculates the health percentage of a portal based on its current and total energy.
 *
 * @function getPortalHealth
 * @param {Object} d - The portal detail object containing resonator information.
 * @returns {number} The portal health as a percentage (0-100).
 *                   Returns 0 if the portal has no total energy.
 */
window.getPortalHealth = function (d) {
  var max = window.getTotalPortalEnergy(d);
  var cur = window.getCurrentPortalEnergy(d);

  return max > 0 ? Math.floor((cur / max) * 100) : 0;
};

/**
 * Calculates the range of a portal for creating links. The range depends on portal level and any installed Link Amps.
 *
 * @function getPortalRange
 * @param {Object} d - The portal detail object containing details about the team and resonators.
 * @returns {Object} An object containing the base range (`base`), boost multiplier (`boost`),
 *                   total range after applying the boost (`range`),
 *                   and a boolean indicating if the portal is linkable (`isLinkable`).
 */
window.getPortalRange = function (d) {
  // formula by the great gals and guys at
  // http://decodeingress.me/2012/11/18/ingress-portal-levels-and-link-range/
  var range = {
    base: window.teamStringToId(d.team) === window.TEAM_MAC ? window.LINK_RANGE_MAC[d.level + 1] : 160 * Math.pow(window.getPortalLevel(d), 4),
    boost: window.getLinkAmpRangeBoost(d),
  };

  range.range = range.boost * range.base;
  range.isLinkable = d.resCount === 8;

  return range;
};

/**
 * Calculates the boost in link range provided by installed Link Amps.
 *
 * @function getLinkAmpRangeBoost
 * @param {Object} d - The portal detail object containing mod information.
 * @returns {number} The total boost factor for the link range.
 */
window.getLinkAmpRangeBoost = function (d) {
  if (window.teamStringToId(d.team) === window.TEAM_MAC) {
    return 1.0;
  }
  // additional range boost calculation

  // link amps scale: first is full, second a quarter, the last two an eighth
  var scale = [1.0, 0.25, 0.125, 0.125];

  var boost = 0.0; // initial boost is 0.0 (i.e. no boost over standard range)

  var linkAmps = window.getPortalModsByType(d, 'LINK_AMPLIFIER');

  linkAmps.forEach(function (mod, i) {
    // link amp stat LINK_RANGE_MULTIPLIER is 2000 for rare, and gives 2x boost to the range
    // and very-rare is 7000 and gives 7x the range
    var baseMultiplier = mod.stats.LINK_RANGE_MULTIPLIER / 1000;
    boost += baseMultiplier * scale[i];
  });

  return linkAmps.length > 0 ? boost : 1.0;
};

/**
 * Calculates the potential AP gain from attacking a portal.
 *
 * @function getAttackApGain
 * @param {Object} d - The portal detail object containing resonator and ownership information.
 * @param {number} fieldCount - The number of fields attached to the portal.
 * @param {number} linkCount - The number of links attached to the portal.
 * @returns {Object} An object detailing various components of AP gain, including totals for friendly and enemy factions.
 */
window.getAttackApGain = function (d, fieldCount, linkCount) {
  if (!fieldCount) fieldCount = 0;

  var resoCount = 0;
  var maxResonators = window.MAX_RESO_PER_PLAYER.slice(0);
  var curResonators = [0, 0, 0, 0, 0, 0, 0, 0, 0];

  for (let n = window.PLAYER.level + 1; n < 9; n++) {
    maxResonators[n] = 0;
  }
  $.each(d.resonators, function (ind, reso) {
    if (!reso) return true;
    resoCount += 1;
    var reslevel = parseInt(reso.level);
    if (reso.owner === window.PLAYER.nickname) {
      if (maxResonators[reslevel] > 0) {
        maxResonators[reslevel] -= 1;
      }
    } else {
      curResonators[reslevel] += 1;
    }
  });

  var resoAp = resoCount * window.DESTROY_RESONATOR;
  var linkAp = linkCount * window.DESTROY_LINK;
  var fieldAp = fieldCount * window.DESTROY_FIELD;
  var destroyAp = resoAp + linkAp + fieldAp;
  var captureAp = window.CAPTURE_PORTAL + 8 * window.DEPLOY_RESONATOR + window.COMPLETION_BONUS;
  var enemyAp = destroyAp + captureAp;
  var deployCount = 8 - resoCount;
  var completionAp = deployCount > 0 ? window.COMPLETION_BONUS : 0;
  var upgradeCount = 0;
  var upgradeAvailable = maxResonators[8];
  for (let n = 7; n >= 0; n--) {
    upgradeCount += curResonators[n];
    if (upgradeAvailable < upgradeCount) {
      upgradeCount -= upgradeCount - upgradeAvailable;
    }
    upgradeAvailable += maxResonators[n];
  }
  var friendlyAp = deployCount * window.DEPLOY_RESONATOR + upgradeCount * window.UPGRADE_ANOTHERS_RESONATOR + completionAp;
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
 * @function fixPortalImageUrl
 * @param {string} url - The original image URL.
 * @returns {string} The corrected image URL.
 */
window.fixPortalImageUrl = function (url) {
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
 * @function getPortalModsByType
 * @param {Object} d - The portal detail object containing mod information.
 * @param {string} type - The type of mods to filter (e.g., 'RES_SHIELD', 'LINK_AMPLIFIER').
 * @returns {Array} An array of mods matching the specified type.
 */
window.getPortalModsByType = function (d, type) {
  var mods = [];

  var typeToStat = {
    RES_SHIELD: 'MITIGATION',
    FORCE_AMP: 'FORCE_AMPLIFIER',
    TURRET: 'HIT_BONUS', // and/or ATTACK_FREQUENCY??
    HEATSINK: 'HACK_SPEED',
    MULTIHACK: 'BURNOUT_INSULATION',
    LINK_AMPLIFIER: 'LINK_RANGE_MULTIPLIER',
    ULTRA_LINK_AMP: 'OUTGOING_LINKS_BONUS', // and/or LINK_DEFENSE_BOOST??
  };

  var stat = typeToStat[type];

  $.each(d.mods || [], function (i, mod) {
    if (mod && Object.hasOwn(mod.stats, stat)) mods.push(mod);
  });

  // sorting mods by the stat keeps code simpler, when calculating combined mod effects
  mods.sort(function (a, b) {
    return b.stats[stat] - a.stats[stat];
  });

  return mods;
};

/**
 * Calculates the total mitigation provided by shields installed on a portal.
 *
 * @function getPortalShieldMitigation
 * @param {Object} d - The portal detail object containing mod information.
 * @returns {number} The total mitigation value from all shields installed on the portal.
 */
window.getPortalShieldMitigation = function (d) {
  var shields = window.getPortalModsByType(d, 'RES_SHIELD');

  var mitigation = 0;
  $.each(shields, function (i, s) {
    mitigation += parseInt(s.stats.MITIGATION);
  });

  return mitigation;
};

/**
 * Calculates the link defense boost provided by installed Ultra Link Amps.
 *
 * @function getPortalLinkDefenseBoost
 * @param {Object} d - The portal detail object containing mod information.
 * @returns {number} The total link defense boost factor.
 */
window.getPortalLinkDefenseBoost = function (d) {
  var ultraLinkAmps = window.getPortalModsByType(d, 'ULTRA_LINK_AMP');

  var linkDefenseBoost = 1;

  $.each(ultraLinkAmps, function (index, ultraLinkAmp) {
    linkDefenseBoost *= parseInt(ultraLinkAmp.stats.LINK_DEFENSE_BOOST) / 1000;
  });

  return Math.round(10 * linkDefenseBoost) / 10;
};

/**
 * Calculates the additional mitigation provided by links attached to a portal.
 *
 * @function getPortalLinksMitigation
 * @param {number} linkCount - The number of links attached to the portal.
 * @returns {number} The additional mitigation value provided by the links.
 */
window.getPortalLinksMitigation = function (linkCount) {
  var mitigation = Math.round((400 / 9) * Math.atan(linkCount / Math.E));
  return mitigation;
};

/**
 * Calculates detailed mitigation information for a portal, including contributions from shields and links.
 *
 * @function getPortalMitigationDetails
 * @param {Object} d - The portal detail object containing mod and resonator information.
 * @param {number} linkCount - The number of links attached to the portal.
 * @returns {Object} An object detailing various components of mitigation.
 */
window.getPortalMitigationDetails = function (d, linkCount) {
  var linkDefenseBoost = window.getPortalLinkDefenseBoost(d);

  var mitigation = {
    shields: window.getPortalShieldMitigation(d),
    links: window.getPortalLinksMitigation(linkCount) * linkDefenseBoost,
    linkDefenseBoost: linkDefenseBoost,
  };

  // mitigation is limited to 95% (as confirmed by Brandon Badger on G+)
  mitigation.total = Math.min(95, mitigation.shields + mitigation.links);

  var excess = mitigation.shields + mitigation.links - mitigation.total;
  mitigation.excess = Math.round(10 * excess) / 10;

  return mitigation;
};

/**
 * Calculates the maximum number of outgoing links that can be created from a portal.
 *
 * @function getMaxOutgoingLinks
 * @param {Object} d - The portal detail object containing mod information.
 * @returns {number} The maximum number of outgoing links.
 */
window.getMaxOutgoingLinks = function (d) {
  var linkAmps = window.getPortalModsByType(d, 'ULTRA_LINK_AMP');

  var links = 8;

  linkAmps.forEach(function (mod) {
    links += parseInt(mod.stats.OUTGOING_LINKS_BONUS);
  });

  return links;
};

/**
 * Calculates hack-related details of a portal, such as hack cooldown and burnout time.
 *
 * @function getPortalHackDetails
 * @param {Object} d - The portal detail object containing mod information.
 * @returns {Object} An object containing hack-related details like cooldown time, hack count, and burnout time.
 */
window.getPortalHackDetails = function (d) {
  var heatsinks = window.getPortalModsByType(d, 'HEATSINK');
  var multihacks = window.getPortalModsByType(d, 'MULTIHACK');

  // first mod of type is fully effective, the others are only 50% effective
  var effectivenessReduction = [1, 0.5, 0.5, 0.5];

  var cooldownTime = window.BASE_HACK_COOLDOWN;

  $.each(heatsinks, function (index, mod) {
    var hackSpeed = parseInt(mod.stats.HACK_SPEED) / 1000000;
    cooldownTime = Math.round(cooldownTime * (1 - hackSpeed * effectivenessReduction[index]));
  });

  var hackCount = window.BASE_HACK_COUNT; // default hacks

  $.each(multihacks, function (index, mod) {
    var extraHacks = parseInt(mod.stats.BURNOUT_INSULATION);
    hackCount = hackCount + extraHacks * effectivenessReduction[index];
  });

  return { cooldown: cooldownTime, hacks: hackCount, burnout: cooldownTime * (hackCount - 1) };
};

/**
 * Converts detailed portal information into a summary format similar to that seen in the map tile data.
 *
 * @function getPortalSummaryData
 * @param {Object} d - The detailed portal data.
 * @returns {Object} A summary of the portal data, including level, title, image, resonator count, health, and team.
 */
window.getPortalSummaryData = function (d) {
  // NOTE: the summary data reports unclaimed portals as level 1 - not zero as elsewhere in IITC
  var level = Math.floor(window.getPortalLevel(d));
  if (level === 0) level = 1; // niantic returns neutral portals as level 1, not 0 as used throughout IITC elsewhere

  var resCount = 0;
  if (d.resonators) {
    for (var x in d.resonators) {
      if (d.resonators[x]) resCount++;
    }
  }
  var maxEnergy = window.getTotalPortalEnergy(d);
  var curEnergy = window.getCurrentPortalEnergy(d);
  var health = maxEnergy > 0 ? Math.floor((curEnergy / maxEnergy) * 100) : 0;

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
 * @function getPortalAttackValues
 * @param {Object} d - The portal detail object containing mod information.
 * @returns {Object} An object containing attack values such as hit bonus, force amplifier, and attack frequency.
 */
window.getPortalAttackValues = function (d) {
  var forceamps = window.getPortalModsByType(d, 'FORCE_AMP');
  var turrets = window.getPortalModsByType(d, 'TURRET');

  // at the time of writing, only rare force amps and turrets have been seen in the wild, so there's a little guesswork
  // at how the stats work and combine
  // algorithm has been compied from getLinkAmpRangeBoost
  // FIXME: only extract stats and put the calculation in a method to be used for link range, force amplifier and attack
  // frequency
  // note: scanner shows rounded values (adding a second FA shows: 2.5x+0.2x=2.8x, which should be 2.5x+0.25x=2.75x)

  // amplifier scale: first is full, second a quarter, the last two an eighth
  var scale = [1.0, 0.25, 0.125, 0.125];

  var attackValues = {
    hit_bonus: 0,
    force_amplifier: 0,
    attack_frequency: 0,
  };

  forceamps.forEach(function (mod, i) {
    // force amp stat FORCE_AMPLIFIER is 2000 for rare, and gives 2x boost to the range
    var baseMultiplier = mod.stats.FORCE_AMPLIFIER / 1000;
    attackValues.force_amplifier += baseMultiplier * scale[i];
  });

  turrets.forEach(function (mod, i) {
    // turret stat ATTACK_FREQUENCY is 2000 for rare, and gives 2x boost to the range
    var baseMultiplier = mod.stats.ATTACK_FREQUENCY / 1000;
    attackValues.attack_frequency += baseMultiplier * scale[i];

    attackValues.hit_bonus += mod.stats.HIT_BONUS / 10000;
  });

  return attackValues;
};
