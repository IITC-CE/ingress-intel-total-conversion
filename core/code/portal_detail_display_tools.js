/**
 * @file Hand any of these functions the details-hash of a portal, and they
 * will return pretty, displayable HTML or parts thereof.
 * @module portal_detail_display_tools
 */

/**
 * Provides historical details about a portal including visitation, capture, and scout control status.
 *
 * @function getPortalHistoryDetails
 * @param {Object} d - The portal detail object containing the history properties.
 * @returns {string} HTML string representing the historical details of the portal.
 */
window.getPortalHistoryDetails = function (d) {
  if (!d.history) {
    return '<div id="historydetails" class="missing">History missing</div>';
  }
  var classParts = {};
  ['visited', 'captured', 'scoutControlled'].forEach(function (k) {
    classParts[k] = d.history[k] ? 'class="completed"' : "";
  });

  return L.Util.template('<div id="historydetails">History: '
  + '<span id="visited" {visited}>visited</span> | '
  + '<span id="captured" {captured}>captured</span> | '
  + '<span id="scout-controlled" {scoutControlled}>scout controlled</span>'
  + '</div>', classParts);
}

/**
 * Returns displayable text and link about portal range including base range, link amp boost, and total range.
 *
 * @function getRangeText
 * @param {Object} d - The portal detail object containing range information.
 * @returns {Array} An array containing the range label, HTML content, and a tooltip title.
 */
window.getRangeText = function(d) {
  var range = getPortalRange(d);

  var title = 'Base range:\t' + digits(Math.floor(range.base))+'m'
    + '\nLink amp boost:\t×'+range.boost
    + '\nRange:\t'+digits(Math.floor(range.range))+'m';

  if(!range.isLinkable) title += '\nPortal is missing resonators,\nno new links can be made';

  return [
    'range',
    '<a onclick="window.rangeLinkClick()"' +
      (range.isLinkable ? '' : ' style="text-decoration:line-through;"') +
      '>' +
      window.formatDistance(range.range) +
      '</a>',
    title,
  ];
}

/**
 * Given portal details, returns HTML code to display mod details.
 *
 * @function getModDetails
 * @param {Object} d - The portal detail object containing mod information.
 * @returns {string} HTML string representing the mod details of the portal.
 */
window.getModDetails = function(d) {
  var mods = [];
  var modsTitle = [];
  var modsColor = [];
  $.each(d.mods, function(ind, mod) {
    var modName = '';
    var modTooltip = '';
    var modColor = '#000';

    if (mod) {
      // all mods seem to follow the same pattern for the data structure
      // but let's try and make this robust enough to handle possible future differences

      modName = mod.name || '(unknown mod)';

      if (mod.rarity) {
        modName = mod.rarity.capitalize().replace(/_/g,' ') + ' ' + modName;
      }

      modTooltip = modName + '\n';
      if (mod.owner) {
        modTooltip += 'Installed by: '+ mod.owner + '\n';
      }

      if (mod.stats) {
        modTooltip += 'Stats:';
        for (var key in mod.stats) {
          if (!mod.stats.hasOwnProperty(key)) continue;
          var val = mod.stats[key];

          // if (key === 'REMOVAL_STICKINESS' && val == 0) continue;  // stat on all mods recently - unknown meaning, not displayed in stock client

          // special formatting for known mod stats, where the display of the raw value is less useful
          if      (key === 'HACK_SPEED')            val = (val/10000)+'%'; // 500000 = 50%
          else if (key === 'HIT_BONUS')             val = (val/10000)+'%'; // 300000 = 30%
          else if (key === 'ATTACK_FREQUENCY')      val = (val/1000) +'x'; // 2000 = 2x
          else if (key === 'FORCE_AMPLIFIER')       val = (val/1000) +'x'; // 2000 = 2x
          else if (key === 'LINK_RANGE_MULTIPLIER') val = (val/1000) +'x'; // 2000 = 2x
          else if (key === 'LINK_DEFENSE_BOOST')    val = (val/1000) +'x'; // 1500 = 1.5x
          else if (key === 'REMOVAL_STICKINESS' && val > 100) val = (val/10000)+'%'; // an educated guess
          // else display unmodified. correct for shield mitigation and multihack - unknown for future/other mods

          modTooltip += '\n+' +  val + ' ' + key.capitalize().replace(/_/g,' ');
        }
      }

      if (mod.rarity) {
        modColor = COLORS_MOD[mod.rarity];
      } else {
        modColor = '#fff';
      }
    }

    mods.push(modName);
    modsTitle.push(modTooltip);
    modsColor.push(modColor);
  });


  var t = '';
  for (var i=0; i<mods.length; i++) {
    t += '<span'+(modsTitle[i].length ? ' title="'+modsTitle[i]+'"' : '')+' style="color:'+modsColor[i]+'">'+mods[i]+'</span>'
  }
  // and add blank entries if we have less than 4 mods (as the server no longer returns all mod slots, but just the filled ones)
  for (var i=mods.length; i<4; i++) {
    t += '<span style="color:#000"></span>'
  }

  return t;
}

/**
 * Generates text representing the current and total energy of a portal.
 *
 * @function getEnergyText
 * @param {Object} d - The portal detail object containing energy information.
 * @returns {Array} An array containing the energy label, formatted energy values, and a tooltip title.
 */
window.getEnergyText = function(d) {
  var currentNrg = getCurrentPortalEnergy(d);
  var totalNrg = getTotalPortalEnergy(d);
  var title = currentNrg + ' / ' + totalNrg;
  var fill = prettyEnergy(currentNrg) + ' / ' + prettyEnergy(totalNrg)
  return ['energy', fill, title];
}

/**
 * Generates HTML details for resonators deployed on a portal.
 *
 * @function getResonatorDetails
 * @param {Object} d - The portal detail object containing resonator information.
 * @returns {string} HTML string representing the resonator details of the portal.
 */
window.getResonatorDetails = function(d) {
  var resoDetails = [];
  // octant=slot: 0=E, 1=NE, 2=N, 3=NW, 4=W, 5=SW, 6=S, SE=7
  // resos in the display should be ordered like this:
  //   N    NE         Since the view is displayed in rows, they
  //  NW    E          need to be ordered like this: N NE NW E W SE SW S
  //   W    SE         i.e. 2 1 3 0 4 7 5 6
  //  SW    S
  // note: as of 2014-05-23 update, this is not true for portals with empty slots!

  var processResonatorSlot = function(reso,slot) {
    var lvl=0, nrg=0, owner=null;

    if (reso) {
      lvl = parseInt(reso.level);
      nrg = parseInt(reso.energy);
      owner = reso.owner;
    }

    resoDetails.push(renderResonatorDetails(slot, lvl, nrg, owner));
  };


  // if all 8 resonators are deployed, we know which is in which slot

  if (d.resonators.length == 8) {
    // fully deployed - we can make assumptions about deployment slots
    $.each([2, 1, 3, 0, 4, 7, 5, 6], function(ind, slot) {
      processResonatorSlot(d.resonators[slot],slot);
    });
  } else {
    // partially deployed portal - we can no longer find out which resonator is in which slot
    for(var ind=0; ind<8; ind++) {
      processResonatorSlot(ind < d.resonators.length ? d.resonators[ind] : null, null);
    }

  }

  return '<table id="resodetails">' + genFourColumnTable(resoDetails) + '</table>';

}

/**
 * Helper function that renders the HTML for a given resonator.
 *
 * @function renderResonatorDetails
 * @param {number} slot - The slot number where the resonator is deployed. Starts with 0 (east) and rotates clockwise.
 *                        So, last one is 7 (southeast).
 * @param {number} level - The level of the resonator.
 * @param {number} nrg - The energy of the resonator.
 * @param {string|null} nick - The nickname of the owner of the resonator, or null if not applicable.
 * @returns {Array} An array containing the HTML content of the resonator and the owner's nickname.
 */
window.renderResonatorDetails = function(slot, level, nrg, nick) {
  if(OCTANTS[slot] === 'N')
    var className = 'meter north';
  else
    var className = 'meter';

  var max = RESO_NRG[level];
  var fillGrade = level > 0 ? nrg/max*100 : 0;

  var inf = (level > 0 ? 'energy:\t' + nrg   + ' / ' + max + ' (' + Math.round(fillGrade) + '%)\n'
                        +'level:\t'  + level + '\n'
                        +'owner:\t'  + nick  + '\n'
                       : '')
          + (slot !== null ? 'octant:\t' + OCTANTS[slot] + ' ' + OCTANTS_ARROW[slot]:'');

  var style = fillGrade ? 'width:'+fillGrade+'%; background:'+COLORS_LVL[level]+';':'';

  var color = (level < 3 ? "#9900FF" : "#FFFFFF");

  var lbar = level > 0 ? '<span class="meter-level" style="color: ' + color + ';"> L ' + level + ' </span>' : '';

  var fill  = '<span style="'+style+'"></span>';

  var meter = '<span class="' + className + '" title="'+inf+'">' + fill + lbar + '</span>';

  nick = nick ? '<span class="nickname">'+nick+'</span>' : null;
  return [meter, nick || ''];
}

/**
 * Calculates the AP gain from destroying and then capturing a portal by deploying resonators.
 *
 * @function getAttackApGainText
 * @param {Object} d - The portal detail object containing portal information.
 * @param {number} fieldCount - The number of fields linked to the portal.
 * @param {number} linkCount - The number of links connected to the portal.
 * @returns {Array} An array containing the label 'AP Gain', total AP gain, and a breakdown tooltip.
 */
window.getAttackApGainText = function(d,fieldCount,linkCount) {
  var breakdown = getAttackApGain(d,fieldCount,linkCount);
  var totalGain = breakdown.enemyAp;

  var t = '';
  if (teamStringToId(PLAYER.team) == teamStringToId(d.team)) {
    totalGain = breakdown.friendlyAp;
    t += 'Friendly AP:\t' + breakdown.friendlyAp + '\n';
    t += '  Deploy ' + breakdown.deployCount + ', ';
    t += 'Upgrade ' + breakdown.upgradeCount + '\n';
    t += '\n';
  }
  t += 'Enemy AP:\t' + breakdown.enemyAp + '\n';
  t += '  Destroy AP:\t' + breakdown.destroyAp + '\n';
  t += '  Capture AP:\t' + breakdown.captureAp + '\n';

  return ['AP Gain', digits(totalGain), t];
}

/**
 * Provides details about the hack count and cooldown time of a portal.
 *
 * @function getHackDetailsText
 * @param {Object} d - The portal detail object containing hack information.
 * @returns {Array} An array containing the label 'hacks', short hack info, and a detailed tooltip.
 */
window.getHackDetailsText = function(d) {
  var hackDetails = getPortalHackDetails(d);

  var shortHackInfo = hackDetails.hacks+' @ '+formatInterval(hackDetails.cooldown);

  var title = 'Hacks available every 4 hours\n'
            + 'Hack count:\t'+hackDetails.hacks+'\n'
            + 'Cooldown time:\t'+formatInterval(hackDetails.cooldown)+'\n'
            + 'Burnout time:\t'+formatInterval(hackDetails.burnout);

  return ['hacks', shortHackInfo, title];
}

/**
 * Generates text representing the total mitigation provided by shields and links on a portal.
 *
 * @function getMitigationText
 * @param {Object} d - The portal detail object containing mitigation information.
 * @param {number} linkCount - The number of links connected to the portal.
 * @returns {Array} An array containing the label 'shielding', short mitigation info, and a detailed tooltip.
 */
window.getMitigationText = function(d,linkCount) {
  var mitigationDetails = getPortalMitigationDetails(d,linkCount);

  var mitigationShort = mitigationDetails.total;
  if (mitigationDetails.excess) mitigationShort += ' (+'+mitigationDetails.excess+')';

  var title = 'Total shielding:\t'+(mitigationDetails.shields+mitigationDetails.links)+'\n'
            + '- active:\t'+mitigationDetails.total+'\n'
            + '- excess:\t'+mitigationDetails.excess+'\n'
            + 'From\n'
            + '- shields:\t'+mitigationDetails.shields+'\n'
            + '- links:\t'+mitigationDetails.links+' ('+mitigationDetails.linkDefenseBoost+'x)';

  return ['shielding', mitigationShort, title];
}
