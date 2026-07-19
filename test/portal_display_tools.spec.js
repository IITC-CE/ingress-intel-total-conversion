import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

/* global IITC */
/* eslint-disable no-unused-expressions */

// digits() renders thousands with a thin space (U+2009); spell it out so golden strings stay readable
const TS = ' ';

// Builds a resonator array of the given per-slot levels (energy defaults to the level cap)
function resonators(levels, owner = 'me') {
  return levels.map((level) => (level === null ? null : { level, energy: window.RESO_NRG[level], owner }));
}

before(async () => {
  // real helper implementations (digits, formatDistance, formatInterval, prettyEnergy, genFourColumnTable, escapeHtml)
  await import('../core/code/utils.js');
  await import('../core/code/portal.js');
  await import('../core/code/portal_display.js');
  await import('../core/code/portal_display_tools.js');
});

describe('IITC.portal.display.tools namespace', () => {
  it('keeps every legacy window.* global working as an alias', () => {
    const aliases = {
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
    Object.entries(aliases).forEach(([oldName, newName]) => {
      expect(window[oldName], oldName).to.be.a('function');
      expect(window[oldName], oldName).to.equal(IITC.portal.display.tools[newName]);
    });
  });
});

// A fully-deployed L8 enlightened portal, reused by several golden-master checks
const fullPortal = () => ({ team: 'ENLIGHTENED', level: 8, resCount: 8, resonators: resonators([8, 8, 8, 8, 8, 8, 8, 8]), mods: [], owner: 'me' });

// The meter markup for a level-8 resonator in a given octant (or a blank slot when octant is null)
const meter = (className, octant, arrow) =>
  `<span class="${className}" title="energy:\t6000 / 6000 (100%)\nlevel:\t8\nowner:\tme\noctant:\t${octant} ${arrow}">` +
  '<span style="width:100%; background:#9627F4;"></span><span class="meter-level" style="color: #FFFFFF;"> L 8 </span></span>';
const nick = '<span class="nickname">me</span>';

describe('IITC.portal.display.tools.getHistoryDetails', () => {
  it('reports missing history', () => {
    expect(IITC.portal.display.tools.getHistoryDetails({})).to.equal('<div id="historydetails" class="missing">History missing</div>');
  });

  it('marks completed history states', () => {
    const html = IITC.portal.display.tools.getHistoryDetails({ history: { visited: true, captured: false, scoutControlled: false } });
    expect(html).to.equal(
      '<div id="historydetails">History: <span id="visited" class="completed">visited</span> | <span id="captured" >captured</span> | <span id="scout-controlled" >scout controlled</span></div>'
    );
  });
});

describe('IITC.portal.display.tools.getRangeText', () => {
  it('returns the label, clickable range link and tooltip', () => {
    expect(IITC.portal.display.tools.getRangeText(fullPortal())).to.deep.equal([
      'range',
      '<a onclick="IITC.portal.display.rangeLinkClick()">655km</a>',
      `Base range:\t655${TS}360m\nLink amp boost:\t×1\nRange:\t655${TS}360m`,
    ]);
  });

  it('strikes through the link and adds a note when the portal is not linkable', () => {
    const d = { team: 'ENLIGHTENED', level: 4, resCount: 4, resonators: resonators([8, 8, 8, 8]), mods: [] };
    const [, html, title] = IITC.portal.display.tools.getRangeText(d);
    expect(html).to.include('style="text-decoration:line-through;"');
    expect(title).to.include('Portal is missing resonators');
  });
});

describe('IITC.portal.display.tools.getModDetails', () => {
  it('renders a rare mod with tooltip stats and pads to four slots', () => {
    const html = IITC.portal.display.tools.getModDetails({
      mods: [{ name: 'Portal Shield', rarity: 'RARE', owner: 'me', stats: { MITIGATION: 30, REMOVAL_STICKINESS: 0 } }, null],
    });
    expect(html).to.equal(
      '<span title="Rare Portal Shield\nInstalled by: me\nStats:\n+30 Mitigation\n+0 Removal stickiness" style="color:#B68BFF">Rare Portal Shield</span>' +
        '<span style="color:#000"></span><span style="color:#000"></span><span style="color:#000"></span>'
    );
  });

  it('renders four empty slots for a portal without mods', () => {
    expect(IITC.portal.display.tools.getModDetails({ mods: [] })).to.equal(
      '<span style="color:#000"></span><span style="color:#000"></span><span style="color:#000"></span><span style="color:#000"></span>'
    );
  });
});

describe('IITC.portal.display.tools.getEnergyText', () => {
  it('returns pretty and exact energy figures', () => {
    expect(IITC.portal.display.tools.getEnergyText(fullPortal())).to.deep.equal(['energy', '48k / 48k', '48000 / 48000']);
  });
});

describe('IITC.portal.display.tools.getResonatorDetails', () => {
  it('lays a fully-deployed portal out in octant order (N NE NW E W SE SW S)', () => {
    const html = IITC.portal.display.tools.getResonatorDetails({ resonators: resonators([8, 8, 8, 8, 8, 8, 8, 8]) });
    expect(html).to.equal(
      '<table id="resodetails">' +
        `<tr><td>${nick}</td><th>${meter('meter north', 'N', '↑')}</th><th>${meter('meter', 'NE', '↗')}</th><td>${nick}</td></tr>` +
        `<tr><td>${nick}</td><th>${meter('meter', 'NW', '↖')}</th><th>${meter('meter', 'E', '→')}</th><td>${nick}</td></tr>` +
        `<tr><td>${nick}</td><th>${meter('meter', 'W', '←')}</th><th>${meter('meter', 'SE', '↘')}</th><td>${nick}</td></tr>` +
        `<tr><td>${nick}</td><th>${meter('meter', 'SW', '↙')}</th><th>${meter('meter', 'S', '↓')}</th><td>${nick}</td></tr>` +
        '</table>'
    );
  });

  it('renders partially-deployed portals without octant assignment', () => {
    const html = IITC.portal.display.tools.getResonatorDetails({ resonators: resonators([8, 7]) });
    // first two slots carry data (no octant line), the remaining six are empty meters
    expect(html).to.include('title="energy:\t6000 / 6000 (100%)\nlevel:\t8\nowner:\tme\n"');
    expect(html).to.include('title="energy:\t5000 / 5000 (100%)\nlevel:\t7\nowner:\tme\n"');
    expect(html.match(/<span class="meter" title=""><span style=""><\/span><\/span>/g)).to.have.length(6);
  });
});

describe('IITC.portal.display.tools.renderResonatorDetails', () => {
  it('renders a deployed north resonator with meter and nickname', () => {
    expect(IITC.portal.display.tools.renderResonatorDetails(2, 8, 6000, 'me')).to.deep.equal([meter('meter north', 'N', '↑'), nick]);
  });

  it('renders an empty slot as a blank meter with no nickname', () => {
    expect(IITC.portal.display.tools.renderResonatorDetails(null, 0, 0, null)).to.deep.equal([
      '<span class="meter" title=""><span style=""></span></span>',
      '',
    ]);
  });
});

describe('IITC.portal.display.tools.getAttackApGainText', () => {
  it('returns AP gain label, value and a friendly/enemy breakdown', () => {
    expect(IITC.portal.display.tools.getAttackApGainText(fullPortal(), 2, 3)).to.deep.equal([
      'AP Gain',
      '0',
      'Friendly AP:\t0\n  Deploy 0, Upgrade 0\n\nEnemy AP:\t4411\n  Destroy AP:\t2661\n  Capture AP:\t1750\n',
    ]);
  });
});

describe('IITC.portal.display.tools.getHackDetailsText', () => {
  it('returns hack label, short info and tooltip', () => {
    expect(IITC.portal.display.tools.getHackDetailsText(fullPortal())).to.deep.equal([
      'hacks',
      '4 @ 3m',
      'Hacks available every 4 hours\nHack count:\t4\nCooldown time:\t3m\nBurnout time:\t9m',
    ]);
  });
});

describe('IITC.portal.display.tools.getMitigationText', () => {
  it('returns shielding label, total and a shields/links breakdown', () => {
    const d = { team: 'ENLIGHTENED', mods: [{ name: 'Portal Shield', rarity: 'RARE', owner: 'me', stats: { MITIGATION: 30 } }] };
    expect(IITC.portal.display.tools.getMitigationText(d, 2)).to.deep.equal([
      'shielding',
      58,
      'Total shielding:\t58\n- active:\t58\n- excess:\t0\nFrom\n- shields:\t30\n- links:\t28 (1x)',
    ]);
  });
});

describe('IITC.portal.display.tools.showPosLinks', () => {
  it('opens a dialog with map-service links for the location', () => {
    const dialog = sinon.stub(window, 'dialog');
    IITC.portal.display.tools.showPosLinks(1.5, 2.5, 'My Portal');
    expect(dialog.calledOnce).to.be.true;
    expect(dialog.firstCall.args[0]).to.deep.equal({
      html:
        '<div style="text-align: center;"><div id="qrcode"></div>' +
        "<script>$('#qrcode').qrcode({text:'GEO:1.5,2.5'});</script>" +
        '<a href="https://maps.google.com/maps?ll=1.5,2.5&q=1.5,2.5%20(My%20Portal)">Google Maps</a>; ' +
        '<a href="https://www.bing.com/maps/?v=2&cp=1.5~2.5&lvl=16&sp=Point.1.5_2.5_My%20Portal___">Bing Maps</a>; ' +
        '<a href="https://www.openstreetmap.org/?mlat=1.5&mlon=2.5&zoom=16">OpenStreetMap</a>' +
        '<br /><span>1.5,2.5</span></div>',
      title: 'My Portal',
      id: 'poslinks',
    });
    dialog.restore();
  });
});
