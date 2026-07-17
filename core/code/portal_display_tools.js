/* global IITC, L -- eslint */

/**
 * Namespace with helpers that turn portal detail data into displayable HTML or parts thereof.
 *
 * @memberof IITC.portal.display
 * @namespace tools
 */

/**
 * Template shown when a portal has no history data
 * @type {String}
 * @memberof IITC.portal.display.tools
 */
let historyMissingTemplate = '<div id="historydetails" class="missing">History missing</div>';

/**
 * Template of the portal history block (visited / captured / scout controlled)
 * @type {String}
 * @memberof IITC.portal.display.tools
 */
let historyTemplate =
  '<div id="historydetails">History: ' +
  '<span id="visited" {visited}>visited</span> | ' +
  '<span id="captured" {captured}>captured</span> | ' +
  '<span id="scout-controlled" {scoutControlled}>scout controlled</span>' +
  '</div>';

/**
 * Template of the clickable portal range link
 * @type {String}
 * @memberof IITC.portal.display.tools
 */
let rangeLinkTemplate = '<a onclick="window.rangeLinkClick()"{strike}>{distance}</a>';

/**
 * Template of a single portal mod entry ({titleAttr} is a pre-built ` title="..."` attribute or empty)
 * @type {String}
 * @memberof IITC.portal.display.tools
 */
let modTemplate = '<span{titleAttr} style="color:{color}">{name}</span>';

/**
 * Template of an empty mod slot
 * @type {String}
 * @memberof IITC.portal.display.tools
 */
let modEmptyTemplate = '<span style="color:#000"></span>';

/**
 * Template of a resonator meter cell
 * @type {String}
 * @memberof IITC.portal.display.tools
 */
let resonatorMeterTemplate = '<span class="{className}" title="{inf}">{fill}{lbar}</span>';

/**
 * Template of the resonator fill bar
 * @type {String}
 * @memberof IITC.portal.display.tools
 */
let resonatorFillTemplate = '<span style="{style}"></span>';

/**
 * Template of the resonator level label
 * @type {String}
 * @memberof IITC.portal.display.tools
 */
let resonatorLevelTemplate = '<span class="meter-level" style="color: {color};"> L {level} </span>';

/**
 * Template wrapping the resonator details table
 * @type {String}
 * @memberof IITC.portal.display.tools
 */
let resoDetailsTemplate = '<table id="resodetails">{rows}</table>';

/**
 * Template of a player nickname span
 * @type {String}
 * @memberof IITC.portal.display.tools
 */
let nicknameTemplate = '<span class="nickname">{nick}</span>';

/**
 * Template of the map-service links dialog shown by showPosLinks
 * ({text:'...'} is a literal script object, only lat/lng/encodedName are placeholders)
 * @type {String}
 * @memberof IITC.portal.display.tools
 */
let posLinksTemplate =
  '<div style="text-align: center;">' +
  '<div id="qrcode"></div>' +
  "<script>$('#qrcode').qrcode({text:'GEO:{lat},{lng}'});</script>" +
  '<a href="https://maps.google.com/maps?ll={lat},{lng}&q={lat},{lng}%20({encodedName})">Google Maps</a>; ' +
  '<a href="https://www.bing.com/maps/?v=2&cp={lat}~{lng}&lvl=16&sp=Point.{lat}_{lng}_{encodedName}___">Bing Maps</a>; ' +
  '<a href="https://www.openstreetmap.org/?mlat={lat}&mlon={lng}&zoom=16">OpenStreetMap</a>' +
  '<br /><span>{lat},{lng}</span></div>';

/**
 * Provides historical details about a portal including visitation, capture, and scout control status.
 *
 * @memberof IITC.portal.display.tools
 * @param {Object} d - The portal detail object containing the history properties.
 * @returns {string} HTML string representing the historical details of the portal.
 */
const getHistoryDetails = function (d) {
  if (!d.history) {
    return IITC.portal.display.tools.historyMissingTemplate;
  }
  const classParts = {};
  ['visited', 'captured', 'scoutControlled'].forEach((k) => {
    classParts[k] = d.history[k] ? 'class="completed"' : '';
  });

  return L.Util.template(IITC.portal.display.tools.historyTemplate, classParts);
};

/**
 * Returns displayable text and link about portal range including base range, link amp boost, and total range.
 *
 * @memberof IITC.portal.display.tools
 * @param {Object} d - The portal detail object containing range information.
 * @returns {Array} An array containing the range label, HTML content, and a tooltip title.
 */
const getRangeText = function (d) {
  const range = IITC.portal.getRange(d);

  let title = `Base range:\t${window.digits(Math.floor(range.base))}m\nLink amp boost:\t×${range.boost}\nRange:\t${window.digits(Math.floor(range.range))}m`;

  if (!range.isLinkable) title += '\nPortal is missing resonators,\nno new links can be made';

  const link = L.Util.template(IITC.portal.display.tools.rangeLinkTemplate, {
    strike: range.isLinkable ? '' : ' style="text-decoration:line-through;"',
    distance: window.formatDistance(range.range),
  });

  return ['range', link, title];
};

/**
 * Given portal details, returns HTML code to display mod details.
 *
 * @memberof IITC.portal.display.tools
 * @param {Object} d - The portal detail object containing mod information.
 * @returns {string} HTML string representing the mod details of the portal.
 */
const getModDetails = function (d) {
  const mods = [];
  const modsTitle = [];
  const modsColor = [];
  d.mods.forEach((mod) => {
    let modName = '';
    let modTooltip = '';
    let modColor = '#000';

    if (mod) {
      // all mods seem to follow the same pattern for the data structure
      // but let's try and make this robust enough to handle possible future differences

      modName = mod.name || '(unknown mod)';

      if (mod.rarity) {
        modName = mod.rarity.capitalize().replace(/_/g, ' ') + ' ' + modName;
      }

      modTooltip = modName + '\n';
      if (mod.owner) {
        modTooltip += 'Installed by: ' + mod.owner + '\n';
      }

      if (mod.stats) {
        modTooltip += 'Stats:';
        for (const key in mod.stats) {
          if (!Object.hasOwn(mod.stats, key)) continue;
          let val = mod.stats[key];

          // if (key === 'REMOVAL_STICKINESS' && val == 0) continue;  // stat on all mods recently - unknown meaning, not displayed in stock client

          // special formatting for known mod stats, where the display of the raw value is less useful
          if (key === 'HACK_SPEED')
            val = val / 10000 + '%'; // 500000 = 50%
          else if (key === 'HIT_BONUS')
            val = val / 10000 + '%'; // 300000 = 30%
          else if (key === 'ATTACK_FREQUENCY')
            val = val / 1000 + 'x'; // 2000 = 2x
          else if (key === 'FORCE_AMPLIFIER')
            val = val / 1000 + 'x'; // 2000 = 2x
          else if (key === 'LINK_RANGE_MULTIPLIER')
            val = val / 1000 + 'x'; // 2000 = 2x
          else if (key === 'LINK_DEFENSE_BOOST')
            val = val / 1000 + 'x'; // 1500 = 1.5x
          else if (key === 'REMOVAL_STICKINESS' && val > 100) val = val / 10000 + '%'; // an educated guess
          // else display unmodified. correct for shield mitigation and multihack - unknown for future/other mods

          modTooltip += '\n+' + val + ' ' + key.capitalize().replace(/_/g, ' ');
        }
      }

      if (mod.rarity) {
        modColor = window.COLORS_MOD[mod.rarity];
      } else {
        modColor = '#fff';
      }
    }

    mods.push(modName);
    modsTitle.push(modTooltip);
    modsColor.push(modColor);
  });

  let t = '';
  for (let i = 0; i < mods.length; i++) {
    t += L.Util.template(IITC.portal.display.tools.modTemplate, {
      titleAttr: modsTitle[i].length ? ' title="' + modsTitle[i] + '"' : '',
      color: modsColor[i],
      name: mods[i],
    });
  }
  // and add blank entries if we have less than 4 mods (as the server no longer returns all mod slots, but just the filled ones)
  for (let i = mods.length; i < 4; i++) {
    t += IITC.portal.display.tools.modEmptyTemplate;
  }

  return t;
};

/**
 * Generates text representing the current and total energy of a portal.
 *
 * @memberof IITC.portal.display.tools
 * @param {Object} d - The portal detail object containing energy information.
 * @returns {Array} An array containing the energy label, formatted energy values, and a tooltip title.
 */
const getEnergyText = function (d) {
  const currentNrg = IITC.portal.getCurrentEnergy(d);
  const totalNrg = IITC.portal.getTotalEnergy(d);
  const title = currentNrg + ' / ' + totalNrg;
  const fill = window.prettyEnergy(currentNrg) + ' / ' + window.prettyEnergy(totalNrg);
  return ['energy', fill, title];
};

/**
 * Generates HTML details for resonators deployed on a portal.
 *
 * @memberof IITC.portal.display.tools
 * @param {Object} d - The portal detail object containing resonator information.
 * @returns {string} HTML string representing the resonator details of the portal.
 */
const getResonatorDetails = function (d) {
  const resoDetails = [];
  // octant=slot: 0=E, 1=NE, 2=N, 3=NW, 4=W, 5=SW, 6=S, SE=7
  // resos in the display should be ordered like this:
  //   N    NE         Since the view is displayed in rows, they
  //  NW    E          need to be ordered like this: N NE NW E W SE SW S
  //   W    SE         i.e. 2 1 3 0 4 7 5 6
  //  SW    S
  // note: as of 2014-05-23 update, this is not true for portals with empty slots!

  const processResonatorSlot = (reso, slot) => {
    let lvl = 0,
      nrg = 0,
      owner = null;

    if (reso) {
      lvl = parseInt(reso.level);
      nrg = parseInt(reso.energy);
      owner = reso.owner;
    }

    resoDetails.push(IITC.portal.display.tools.renderResonatorDetails(slot, lvl, nrg, owner));
  };

  // if all 8 resonators are deployed, we know which is in which slot

  if (d.resonators.length === 8) {
    // fully deployed - we can make assumptions about deployment slots
    [2, 1, 3, 0, 4, 7, 5, 6].forEach((slot) => {
      processResonatorSlot(d.resonators[slot], slot);
    });
  } else {
    // partially deployed portal - we can no longer find out which resonator is in which slot
    for (let ind = 0; ind < 8; ind++) {
      processResonatorSlot(ind < d.resonators.length ? d.resonators[ind] : null, null);
    }
  }

  return L.Util.template(IITC.portal.display.tools.resoDetailsTemplate, { rows: window.genFourColumnTable(resoDetails) });
};

/**
 * Helper function that renders the HTML for a given resonator.
 *
 * @memberof IITC.portal.display.tools
 * @param {number} slot - The slot number where the resonator is deployed. Starts with 0 (east) and rotates clockwise.
 *                        So, last one is 7 (southeast).
 * @param {number} level - The level of the resonator.
 * @param {number} nrg - The energy of the resonator.
 * @param {string|null} nick - The nickname of the owner of the resonator, or null if not applicable.
 * @returns {Array} An array containing the HTML content of the resonator and the owner's nickname.
 */
const renderResonatorDetails = function (slot, level, nrg, nick) {
  const className = window.OCTANTS[slot] === 'N' ? 'meter north' : 'meter';

  const max = window.RESO_NRG[level];
  const fillGrade = level > 0 ? (nrg / max) * 100 : 0;

  const inf =
    (level > 0 ? 'energy:\t' + nrg + ' / ' + max + ' (' + Math.round(fillGrade) + '%)\n' + 'level:\t' + level + '\n' + 'owner:\t' + nick + '\n' : '') +
    (slot !== null ? 'octant:\t' + window.OCTANTS[slot] + ' ' + window.OCTANTS_ARROW[slot] : '');

  const style = fillGrade ? 'width:' + fillGrade + '%; background:' + window.COLORS_LVL[level] + ';' : '';

  const color = level < 3 ? '#9900FF' : '#FFFFFF';

  const lbar = level > 0 ? L.Util.template(IITC.portal.display.tools.resonatorLevelTemplate, { color: color, level: level }) : '';

  const fill = L.Util.template(IITC.portal.display.tools.resonatorFillTemplate, { style: style });

  const meter = L.Util.template(IITC.portal.display.tools.resonatorMeterTemplate, { className: className, inf: inf, fill: fill, lbar: lbar });

  nick = nick ? L.Util.template(IITC.portal.display.tools.nicknameTemplate, { nick: nick }) : null;
  return [meter, nick || ''];
};

/**
 * Calculates the AP gain from destroying and then capturing a portal by deploying resonators.
 *
 * @memberof IITC.portal.display.tools
 * @param {Object} d - The portal detail object containing portal information.
 * @param {number} fieldCount - The number of fields linked to the portal.
 * @param {number} linkCount - The number of links connected to the portal.
 * @returns {Array} An array containing the label 'AP Gain', total AP gain, and a breakdown tooltip.
 */
const getAttackApGainText = function (d, fieldCount, linkCount) {
  const breakdown = IITC.portal.getAttackApGain(d, fieldCount, linkCount);
  let totalGain = breakdown.enemyAp;

  let t = '';
  if (window.teamStringToId(window.PLAYER.team) === window.teamStringToId(d.team)) {
    totalGain = breakdown.friendlyAp;
    t += 'Friendly AP:\t' + breakdown.friendlyAp + '\n';
    t += '  Deploy ' + breakdown.deployCount + ', ';
    t += 'Upgrade ' + breakdown.upgradeCount + '\n';
    t += '\n';
  }
  t += 'Enemy AP:\t' + breakdown.enemyAp + '\n';
  t += '  Destroy AP:\t' + breakdown.destroyAp + '\n';
  t += '  Capture AP:\t' + breakdown.captureAp + '\n';

  return ['AP Gain', window.digits(totalGain), t];
};

/**
 * Provides details about the hack count and cooldown time of a portal.
 *
 * @memberof IITC.portal.display.tools
 * @param {Object} d - The portal detail object containing hack information.
 * @returns {Array} An array containing the label 'hacks', short hack info, and a detailed tooltip.
 */
const getHackDetailsText = function (d) {
  const hackDetails = IITC.portal.getHackDetails(d);

  const shortHackInfo = hackDetails.hacks + ' @ ' + window.formatInterval(hackDetails.cooldown);

  const title =
    `Hacks available every 4 hours\n` +
    `Hack count:\t${hackDetails.hacks}\n` +
    `Cooldown time:\t${window.formatInterval(hackDetails.cooldown)}\n` +
    `Burnout time:\t${window.formatInterval(hackDetails.burnout)}`;

  return ['hacks', shortHackInfo, title];
};

/**
 * Generates text representing the total mitigation provided by shields and links on a portal.
 *
 * @memberof IITC.portal.display.tools
 * @param {Object} d - The portal detail object containing mitigation information.
 * @param {number} linkCount - The number of links connected to the portal.
 * @returns {Array} An array containing the label 'shielding', short mitigation info, and a detailed tooltip.
 */
const getMitigationText = function (d, linkCount) {
  const mitigationDetails = IITC.portal.getMitigationDetails(d, linkCount);

  let mitigationShort = mitigationDetails.total;
  if (mitigationDetails.excess) mitigationShort += ' (+' + mitigationDetails.excess + ')';

  const title =
    `Total shielding:\t${mitigationDetails.shields + mitigationDetails.links}\n` +
    `- active:\t${mitigationDetails.total}\n` +
    `- excess:\t${mitigationDetails.excess}\n` +
    `From\n` +
    `- shields:\t${mitigationDetails.shields}\n` +
    `- links:\t${mitigationDetails.links} (${mitigationDetails.linkDefenseBoost}x)`;

  return ['shielding', mitigationShort, title];
};

/**
 * Displays a dialog with links to show the specified location on various map services.
 *
 * @memberof IITC.portal.display.tools
 * @param {number} lat - Latitude of the location.
 * @param {number} lng - Longitude of the location.
 * @param {string} name - Name of the location.
 */
const showPosLinks = function (lat, lng, name) {
  const html = L.Util.template(IITC.portal.display.tools.posLinksTemplate, {
    lat: lat,
    lng: lng,
    encodedName: encodeURIComponent(name),
  });
  window.dialog({
    html: html,
    title: name,
    id: 'poslinks',
  });
};

IITC.portal.display.tools = {
  getHistoryDetails,
  getRangeText,
  getModDetails,
  getEnergyText,
  getResonatorDetails,
  renderResonatorDetails,
  getAttackApGainText,
  getHackDetailsText,
  getMitigationText,
  showPosLinks,
  // overridable HTML templates
  historyMissingTemplate,
  historyTemplate,
  rangeLinkTemplate,
  modTemplate,
  modEmptyTemplate,
  resonatorMeterTemplate,
  resonatorFillTemplate,
  resonatorLevelTemplate,
  resoDetailsTemplate,
  nicknameTemplate,
  posLinksTemplate,
};

// Map of legacy global names to their new names within IITC.portal.display.tools
const legacyToolsMappings = {
  getPortalHistoryDetails: 'getHistoryDetails',
  getRangeText: 'getRangeText',
  getModDetails: 'getModDetails',
  getEnergyText: 'getEnergyText',
  getResonatorDetails: 'getResonatorDetails',
  renderResonatorDetails: 'renderResonatorDetails',
  getAttackApGainText: 'getAttackApGainText',
  getHackDetailsText: 'getHackDetailsText',
  getMitigationText: 'getMitigationText',
  showPortalPosLinks: 'showPosLinks',
};

IITC.registerLegacyAliases(IITC.portal.display.tools, legacyToolsMappings);
