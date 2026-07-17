/* global IITC, L -- eslint */

/**
 * Namespace that renders portal details in the sidebar and highlights the selected portal on the map.
 *
 * @memberof IITC.portal
 * @namespace display
 */

/**
 * Template of the "move to portal" icon shown next to the portal title
 * @type {String}
 * @memberof IITC.portal.display
 */
let moveToPortalIconTemplate = '<svg class="material-icons icon-button"><use xlink:href="#ic_place_24px"></use><title>Click to move to portal</title></svg>';

/**
 * Template wrapping the #randdetails table (owner, range, links, fields, shielding, energy, AP, hacks)
 * @type {String}
 * @memberof IITC.portal.display
 */
let randDetailsTemplate = '<table id="randdetails">{rows}</table>';

/**
 * Template of the artifact target portal note
 * @type {String}
 * @memberof IITC.portal.display
 */
let artifactTargetTemplate = '<div id="artifact_target">Target portal: {targets}</div>';

/**
 * Template of the artifact shards note
 * @type {String}
 * @memberof IITC.portal.display
 */
let artifactFragmentsTemplate = '<div id="artifact_fragments">Shards: {name} #{fragments}</div>';

/**
 * Template wrapping the portal mods block
 * @type {String}
 * @memberof IITC.portal.display
 */
let modsWrapperTemplate = '<div class="mods">{mods}</div>';

/**
 * Template shown while full portal details are still loading
 * @type {String}
 * @memberof IITC.portal.display
 */
let loadingStatusTemplate = '<div id="portalStatus">Loading details...</div>';

/**
 * Template of the container that holds the portal links (permalink, scanner, map links)
 * @type {String}
 * @memberof IITC.portal.display
 */
let linkDetailsTemplate = '<div class="linkdetails"></div>';

/**
 * Template of a label that truncates with an ellipsis (e.g. "attack frequency", "force amplifier")
 * @type {String}
 * @memberof IITC.portal.display
 */
let ellipsisLabelTemplate = '<span title="{label}" class="text-overflow-ellipsis">{label}</span>';

/**
 * Resets the scroll position of the sidebar when a new portal is selected.
 *
 * @memberof IITC.portal.display
 */
const resetScroll = function () {
  if (window.selectedPortal !== IITC.portal.display.renderDetails.lastVisible) {
    // another portal selected so scroll position become irrelevant to new portal details
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.scrollTop = 0; // NB: this works ONLY when #sidebar:visible
  }
};

/**
 * Generates and displays URLs related to the portal.
 * This includes a permalink for the portal, a link for Ingress Prime, and links to alternative maps.
 * Function is overwritten in `app.js`
 *
 * @memberof IITC.portal.display
 * @param {number} lat - The latitude of the portal.
 * @param {number} lng - The longitude of the portal.
 * @param {string} title - The title of the portal.
 * @param {string} guid - The GUID of the portal.
 */
const renderUrl = function (lat, lng, title, guid) {
  const linkDetails = document.querySelector('.linkdetails');

  const appendAside = (anchor) => {
    const aside = document.createElement('aside');
    aside.append(anchor);
    linkDetails.append(aside);
  };

  // a permalink for the portal
  const permaLink = document.createElement('a');
  permaLink.setAttribute('href', IITC.portal.display.makePermalink([lat, lng]));
  permaLink.setAttribute('title', 'Create a URL link to this portal');
  permaLink.textContent = 'Portal link';
  appendAside(permaLink);

  const scannerLink = document.createElement('a');
  scannerLink.setAttribute('href', IITC.portal.display.makePrimeLink(guid, lat, lng));
  scannerLink.setAttribute('title', 'Copy link to this portal for Ingress Prime');
  scannerLink.textContent = 'Copy scanner link';
  scannerLink.addEventListener('click', function (event) {
    navigator.clipboard.writeText(event.target.href).then();
    event.preventDefault();
    event.stopPropagation();
  });
  appendAside(scannerLink);

  // and a map link popup dialog
  const mapLink = document.createElement('a');
  mapLink.setAttribute('title', 'Link to alternative maps (Google, etc)');
  mapLink.textContent = 'Map links';
  mapLink.addEventListener('click', () => IITC.portal.display.tools.showPosLinks(lat, lng, title));
  appendAside(mapLink);
};

/**
 * Selects a portal, refresh its data and renders the details of the portal in the sidebar.
 *
 * @memberof IITC.portal.display
 * @param {string|null} guid - The globally unique identifier of the portal to display details for.
 * @param {boolean} [forceSelect=false] - If true, forces the portal to be selected even if it's already the current portal.
 */
const renderDetails = function (guid, forceSelect) {
  if (forceSelect || window.selectedPortal !== guid) {
    IITC.portal.display.select(guid && window.portals[guid] ? guid : null, 'renderPortalDetails');
  }

  const sidebar = document.getElementById('sidebar');
  // equivalent of jQuery ':visible'
  if (sidebar && (sidebar.offsetWidth > 0 || sidebar.offsetHeight > 0 || sidebar.getClientRects().length > 0)) {
    IITC.portal.display.resetScroll();
    IITC.portal.display.renderDetails.lastVisible = guid;
  }

  if (guid && !IITC.portal.details.isFresh(guid)) {
    IITC.portal.details.request(guid);
  }

  if (!guid || !window.portals[guid]) {
    IITC.portal.selectWhenLoadedByGuid(guid);
    const portalDetails = document.getElementById('portaldetails');
    if (portalDetails) portalDetails.innerHTML = '';
    IITC.statusbar.portal.update();
    if (window.isSmartphone()) {
      document.querySelectorAll('.fullimg').forEach((el) => el.remove());
    }
    return;
  }

  IITC.portal.display.renderToSidebar(window.portals[guid]);
};

/**
 * Renders the details of a portal in the sidebar.
 *
 * @memberof IITC.portal.display
 * @param {L.PortalMarker} portal - The portal marker object holding portal details.
 */
const renderToSidebar = function (portal) {
  const guid = portal.options.guid;
  const details = portal.getDetails();
  const hasFullDetails = portal.hasFullDetails();
  const historyDetails = IITC.portal.display.tools.getHistoryDetails(details);

  const modDetails = hasFullDetails ? L.Util.template(IITC.portal.display.modsWrapperTemplate, { mods: IITC.portal.display.tools.getModDetails(details) }) : '';
  const miscDetails = hasFullDetails ? IITC.portal.display.getMiscDetails(guid, details) : '';
  const resoDetails = hasFullDetails ? IITC.portal.display.tools.getResonatorDetails(details) : '';

  // TODO? other status details...
  const statusDetails = hasFullDetails ? '' : IITC.portal.display.loadingStatusTemplate;

  const img = IITC.portal.fixImageUrl(details.image);
  const title = details.title || 'null';

  const lat = details.latE6 / 1e6;
  const lng = details.lngE6 / 1e6;

  const imgTitle = title + '\n\nClick to show full image.';

  // portal level. start with basic data - then extend with fractional info in tooltip if available
  const levelInt = portal.options.level;
  let levelDetails = levelInt;
  if (hasFullDetails) {
    const portalLevel = IITC.portal.getLevel(details); // resonator-based fractional level
    levelDetails = portalLevel;
    if (levelInt !== 8) {
      const req_reso_levels = 8 * (levelInt + 1 - portalLevel);
      levelDetails += '\n' + req_reso_levels + ' resonator level(s) needed for next portal level';
    } else {
      levelDetails += '\nfully upgraded';
    }
  }
  levelDetails = 'Level ' + levelDetails;

  const portalDetails = document.getElementById('portaldetails');
  portalDetails.innerHTML = ''; // to ensure it's clear
  portalDetails.setAttribute('class', window.TEAM_TO_CSS[window.teamStringToId(details.team)]);

  // h3.title is kept for supporting plugins that reference it.
  const header = document.createElement('h3');
  header.setAttribute('id', 'portaltitle');
  header.setAttribute('class', 'title');
  header.innerHTML = IITC.portal.display.moveToPortalIconTemplate;
  header.firstElementChild.addEventListener('click', function () {
    IITC.portal.zoomToAndShow(guid, [details.latE6 / 1e6, details.lngE6 / 1e6]);
    if (window.isSmartphone()) {
      window.show('map');
    }
  });

  const titleValue = document.createElement('span');
  titleValue.setAttribute('class', 'value');
  titleValue.textContent = title;
  header.append(titleValue);

  const closeButton = document.createElement('span');
  closeButton.setAttribute('class', 'close');
  closeButton.setAttribute('title', 'Close [w]');
  closeButton.setAttribute('accesskey', 'w');
  closeButton.textContent = 'X';
  closeButton.addEventListener('click', function () {
    IITC.portal.display.renderDetails(null);
  });
  header.append(closeButton);

  // help cursor via ".imgpreview img"
  const imgPreview = document.createElement('div');
  imgPreview.setAttribute('class', 'imgpreview');
  imgPreview.setAttribute('title', imgTitle);
  imgPreview.setAttribute('style', 'background-image: url("' + img + '")');

  const levelSpan = document.createElement('span');
  levelSpan.setAttribute('id', 'level');
  levelSpan.setAttribute('title', levelDetails);
  levelSpan.textContent = levelInt;

  const fullImg = document.createElement('img');
  fullImg.setAttribute('class', 'hide');
  fullImg.setAttribute('src', img);

  imgPreview.append(levelSpan, fullImg);

  portalDetails.append(header, imgPreview);
  portalDetails.insertAdjacentHTML(
    'beforeend',
    modDetails + miscDetails + resoDetails + statusDetails + IITC.portal.display.linkDetailsTemplate + historyDetails
  );

  IITC.portal.display.renderUrl(lat, lng, title, guid);

  // only run the hooks when we have a portalDetails object - most plugins rely on the extended data
  // TODO? another hook to call always, for any plugins that can work with less data?
  if (hasFullDetails) {
    // compatibility
    const data = IITC.portal.getSummaryData(details);

    window.runHooks('portalDetailsUpdated', { guid: guid, portal: portal, portalDetails: details, portalData: data });

    IITC.portal.display.setIndicators(portal);
  }
};

/**
 * Gets miscellaneous details for a specified portal.
 *
 * @memberof IITC.portal.display
 * @param {string} guid - The GUID of the portal.
 * @param {Object} d - The portal detail object containing various properties of the portal.
 * @returns {string} HTML string representing the miscellaneous details of the portal.
 */
const getMiscDetails = function (guid, d) {
  let randDetails;

  if (d) {
    // collect some random data that’s not worth to put in an own method
    const linkInfo = IITC.portal.getLinks(guid);
    const maxOutgoing = IITC.portal.getMaxOutgoingLinks(d);
    const linkCount = linkInfo.in.length + linkInfo.out.length;
    const links = { incoming: linkInfo.in.length, outgoing: linkInfo.out.length };

    const title =
      `at most ${maxOutgoing} outgoing links\n` +
      `${links.outgoing} links out\n` +
      `${links.incoming} links in\n` +
      `(${links.outgoing + links.incoming} total)`;
    const linksText = ['links', links.outgoing + ' out / ' + links.incoming + ' in', title];

    const player = d.owner ? L.Util.template(IITC.portal.display.tools.nicknameTemplate, { nick: d.owner }) : '-';
    const playerText = ['owner', player];

    const fieldCount = IITC.portal.getFieldsCount(guid);

    const fieldsText = ['fields', fieldCount];

    const apGainText = IITC.portal.display.tools.getAttackApGainText(d, fieldCount, linkCount);

    const attackValues = IITC.portal.getAttackValues(d);

    // collect and html-ify random data

    const randDetailsData = [
      // these pieces of data are only relevant when the portal is captured
      // maybe check if portal is captured and remove?
      // But this makes the info panel look rather empty for unclaimed portals
      playerText,
      IITC.portal.display.tools.getRangeText(d),
      linksText,
      fieldsText,
      IITC.portal.display.tools.getMitigationText(d, linkCount),
      IITC.portal.display.tools.getEnergyText(d),
      // and these have some use, even for uncaptured portals
      apGainText,
      IITC.portal.display.tools.getHackDetailsText(d),
    ];

    if (attackValues.attack_frequency !== 0) {
      const label = L.Util.template(IITC.portal.display.ellipsisLabelTemplate, { label: 'attack frequency' });
      randDetailsData.push([label, '×' + attackValues.attack_frequency]);
    }
    if (attackValues.hit_bonus !== 0) {
      randDetailsData.push(['hit bonus', attackValues.hit_bonus + '%']);
    }
    if (attackValues.force_amplifier !== 0) {
      const label = L.Util.template(IITC.portal.display.ellipsisLabelTemplate, { label: 'force amplifier' });
      randDetailsData.push([label, '×' + attackValues.force_amplifier]);
    }

    randDetails = L.Util.template(IITC.portal.display.randDetailsTemplate, { rows: window.genFourColumnTable(randDetailsData) });

    // artifacts - tacked on after (but not as part of) the 'randdetails' table
    // instead of using the existing columns....

    if (d.artifactBrief && d.artifactBrief.target && Object.keys(d.artifactBrief.target).length > 0) {
      const targets = Object.keys(d.artifactBrief.target);
      // currently (2015-07-10) we no longer know the team each target portal is for - so we'll just show the artifact type(s)
      randDetails += L.Util.template(IITC.portal.display.artifactTargetTemplate, {
        targets: targets.map((x) => x.capitalize()).join(', '),
      });
    }

    // shards - taken directly from the portal details
    if (d.artifactDetail) {
      randDetails += L.Util.template(IITC.portal.display.artifactFragmentsTemplate, {
        name: d.artifactDetail.displayName,
        fragments: d.artifactDetail.fragments.join(', '),
      });
    }
  }

  return randDetails;
};

/**
 * The function adds circles indicating the hack range and link range of the portal.
 * If the portal object are null, the indicators are removed.
 *
 * @memberof IITC.portal.display
 * @param {Object} p - The portal object for which to set the indicators.
 */
const setIndicators = function (p) {
  if (window.portalRangeIndicator) window.map.removeLayer(window.portalRangeIndicator);
  window.portalRangeIndicator = null;
  if (window.portalAccessIndicator) window.map.removeLayer(window.portalAccessIndicator);
  window.portalAccessIndicator = null;

  // if we have a portal...

  if (p) {
    const coord = p.getLatLng();

    // range is only known for sure if we have portal details
    // TODO? render a min range guess until details are loaded..?

    const d = IITC.portal.details.get(p.options.guid);
    if (d) {
      const range = IITC.portal.getRange(d);
      window.portalRangeIndicator = (
        range.range > 0
          ? L.geodesicCircle(coord, range.range, {
              fill: false,
              color: window.RANGE_INDICATOR_COLOR,
              weight: 3,
              dashArray: range.isLinkable ? undefined : '10,10',
              interactive: false,
            })
          : L.circle(coord, range.range, { fill: false, stroke: false, interactive: false })
      ).addTo(window.map);
    }

    window.portalAccessIndicator = L.circle(coord, window.HACK_RANGE, {
      fill: false,
      color: window.ACCESS_INDICATOR_COLOR,
      weight: 2,
      interactive: false,
    }).addTo(window.map);
  }
};

/**
 * Highlights the selected portal on the map and clears the highlight from the previously selected portal.
 *
 * @memberof IITC.portal.display
 * @param {string} guid - The GUID of the portal to select.
 * @returns {boolean} True if the same portal is re-selected (just an update), false if a different portal is selected.
 */
const select = function (guid, event) {
  const update = window.selectedPortal === guid;
  const oldPortalGuid = window.selectedPortal;
  window.selectedPortal = guid;

  const oldPortal = window.portals[oldPortalGuid];
  const newPortal = window.portals[guid];

  // Restore style of unselected portal
  if (!update && oldPortal) oldPortal.setSelected(false);

  // Change style of selected portal
  if (newPortal) newPortal.setSelected(true);

  IITC.portal.display.setIndicators(newPortal);

  window.runHooks('portalSelected', {
    selectedPortalGuid: guid,
    unselectedPortalGuid: oldPortalGuid,
    event: event,
  });
  return update;
};

/**
 * Changes the coordinates and map scale to show the range for portal links.
 *
 * @memberof IITC.portal.display
 */
const rangeLinkClick = function () {
  if (window.portalRangeIndicator) window.map.fitBounds(window.portalRangeIndicator.getBounds());
  if (window.isSmartphone()) window.show('map');
};

/**
 * Creates a link to open a specific portal in Ingress Prime.
 *
 * It is using Firebase's Dynamic Links feature.
 * https://firebase.google.com/docs/dynamic-links/create-manually
 *
 * @memberof IITC.portal.display
 * @param {string} guid - The globally unique identifier of the portal.
 * @param {number} lat - The latitude of the portal.
 * @param {number} lng - The longitude of the portal.
 * @returns {string} The Ingress Prime link for the portal
 */
const makePrimeLink = function (guid, lat, lng) {
  const base = 'https://link.ingress.com/';
  const link = {
    link: `https://intel.ingress.com/portal/${guid}`,
  };
  const android = {
    apn: 'com.nianticproject.ingress',
  };
  const ios = {
    isi: '576505181',
    ibi: 'com.google.ingress',
    ifl: 'https://apps.apple.com/app/ingress/id576505181',
  };
  const other = {
    ofl: `https://intel.ingress.com/intel?pll=${lat},${lng}`,
  };
  const url = new URL(base);
  for (const [key, value] of Object.entries({ ...link, ...android, ...ios, ...other })) {
    url.searchParams.set(key, value);
  }
  return url.toString();
};

/**
 * Generates a permalink URL based on the specified latitude and longitude and additional options.
 *
 * @memberof IITC.portal.display
 * @param {L.LatLng|number[]} [latlng] - The latitude and longitude for the permalink.
 *                              Can be omitted to create mapview-only permalink.
 * @param {Object} [options] - Additional options for permalink generation.
 * @param {boolean} [options.includeMapView] - Include current map view in the permalink.
 * @param {boolean} [options.fullURL] - Generate a fully qualified URL (default: relative link).
 * @returns {string} The generated permalink URL.
 */
const makePermalink = function (latlng, options) {
  options = options || {};

  // ensures that lat,lng are with same precision as in stock intel permalinks
  const round = (l) => Math.floor(l * 1e6) / 1e6;

  const args = [];
  if (!latlng || options.includeMapView) {
    const c = window.map.getCenter();
    args.push('ll=' + [round(c.lat), round(c.lng)].join(','), 'z=' + window.map.getZoom());
  }
  if (latlng) {
    if ('lat' in latlng) {
      latlng = [latlng.lat, latlng.lng];
    }
    args.push('pll=' + latlng.join(','));
  }
  let url = '';
  if (options.fullURL) {
    url += new URL(document.baseURI).origin;
  }
  url += document.location.pathname;
  return url + '?' + args.join('&');
};

IITC.portal.display = {
  resetScroll,
  renderUrl,
  renderDetails,
  renderToSidebar,
  getMiscDetails,
  setIndicators,
  select,
  rangeLinkClick,
  makePrimeLink,
  makePermalink,
  // overridable HTML templates
  moveToPortalIconTemplate,
  randDetailsTemplate,
  artifactTargetTemplate,
  artifactFragmentsTemplate,
  modsWrapperTemplate,
  loadingStatusTemplate,
  linkDetailsTemplate,
  ellipsisLabelTemplate,
};

// Map of legacy global names to their new names within IITC.portal.display
const legacyDisplayMappings = {
  resetScrollOnNewPortal: 'resetScroll',
  renderPortalUrl: 'renderUrl',
  renderPortalDetails: 'renderDetails',
  renderPortalToSideBar: 'renderToSidebar',
  getPortalMiscDetails: 'getMiscDetails',
  setPortalIndicators: 'setIndicators',
  selectPortal: 'select',
  rangeLinkClick: 'rangeLinkClick',
  makePrimeLink: 'makePrimeLink',
  makePermalink: 'makePermalink',
};

IITC.registerLegacyAliases(IITC.portal.display, legacyDisplayMappings);
