// PORTAL DETAILS MAIN ///////////////////////////////////////////////
// main code block that renders the portal details in the sidebar and
// methods that highlight the portal in the map view.

window.resetScrollOnNewPortal = function() {
  if (selectedPortal !== window.renderPortalDetails.lastVisible) {
    // another portal selected so scroll position become irrelevant to new portal details
    $("#sidebar").scrollTop(0); // NB: this works ONLY when #sidebar:visible
  }
};

window.renderPortalDetails = function(guid) {
  selectPortal(window.portals[guid] ? guid : null);
  if ($('#sidebar').is(':visible')) {
    window.resetScrollOnNewPortal();
    window.renderPortalDetails.lastVisible = guid;
  }

  if (guid && !portalDetail.isFresh(guid)) {
    portalDetail.request(guid);
  }

  // TODO? handle the case where we request data for a particular portal GUID, but it *isn't* in
  // window.portals....

  if(!window.portals[guid]) {
    urlPortal = guid;
    $('#portaldetails').html('');
    if(isSmartphone()) {
      $('.fullimg').remove();
      $('#mobileinfo').html('<div style="text-align: center"><b>tap here for info screen</b></div>');
    }
    return;
  }

  var portal = window.portals[guid];
  var data = portal.options.data;
  var details = portalDetail.get(guid);
  var historyDetails = getPortalHistoryDetails(data);

  // details and data can get out of sync. if we have details, construct a matching 'data'
  if (details) {
    data = getPortalSummaryData(details);
  }


  var modDetails = details ? '<div class="mods">'+getModDetails(details)+'</div>' : '';
  var miscDetails = details ? getPortalMiscDetails(guid,details) : '';
  var resoDetails = details ? getResonatorDetails(details) : '';

//TODO? other status details...
  var statusDetails = details ? '' : '<div id="portalStatus">Loading details...</div>';

  var img = fixPortalImageUrl(details ? details.image : data.image);
  var title = (details && details.title) || (data && data.title) || 'null';

  var lat = data.latE6/1E6;
  var lng = data.lngE6/1E6;

  var imgTitle = title+'\n\nClick to show full image.';


  // portal level. start with basic data - then extend with fractional info in tooltip if available
  var levelInt = (teamStringToId(data.team) == TEAM_NONE) ? 0 : data.level;
  var levelDetails = levelInt;
  if (details) {
    levelDetails = getPortalLevel(details);
    if(levelDetails != 8) {
      if(levelDetails==Math.ceil(levelDetails))
        levelDetails += "\n8";
      else
        levelDetails += "\n" + (Math.ceil(levelDetails) - levelDetails)*8;
      levelDetails += " resonator level(s) needed for next portal level";
    } else {
      levelDetails += "\nfully upgraded";
    }
  }
  levelDetails = "Level " + levelDetails;


  var linkDetails = $('<div>', { class: 'linkdetails' });

  var posOnClick = window.showPortalPosLinks.bind(this,lat,lng,title);

  if (typeof android !== 'undefined' && android && android.intentPosLink) {
    // android devices. one share link option - and the android app provides an interface to share the URL,
    // share as a geo: intent (navigation via google maps), etc

    var shareLink = $('<a>').text('Share portal').click(posOnClick);
    linkDetails.append($('<aside>').append($('<div>').append(shareLink)));

  } else {
    // non-android - a permalink for the portal
    var permaHtml = $('<a>').attr({
      href: window.makePermalink([lat,lng]),
      title: 'Create a URL link to this portal'}
    ).text('Portal link');
    linkDetails.append($('<aside>').append($('<div>').append(permaHtml)));

    // and a map link popup dialog
    var mapHtml = $('<a>').attr({
      title: 'Link to alternative maps (Google, etc)'
    }).text('Map links').click(posOnClick);
    linkDetails.append($('<aside>').append($('<div>').append(mapHtml)));
  }

  $('#portaldetails')
    .html('') //to ensure it's clear
    .attr('class', TEAM_TO_CSS[teamStringToId(data.team)])
    .append(
      $('<h3>', { class:'title' })
        .text(title)
        .prepend(
          $('<svg><use xlink:href="#ic_place_24px"/><title>Click to move to portal</title></svg>')
            .attr({
              class: 'material-icons icon-button',
              style: 'float: left'
            })
            .click(function() {
              zoomToAndShowPortal(guid,[data.latE6/1E6,data.lngE6/1E6]);
              if (isSmartphone()) { show('map') };
            })),

      $('<span>').attr({
        class: 'close',
        title: 'Close [w]',
        accesskey: 'w'
      }).text('X')
        .click(function () {
          renderPortalDetails(null);
          if (isSmartphone()) { show('map') };
        }),

      // help cursor via ".imgpreview img"
      $('<div>')
        .attr({
          class: 'imgpreview',
          title: imgTitle,
          style: 'background-image: url("' + img + '")'
        })
        .append(
          $('<span>', { id: 'level', title: levelDetails })
            .text(levelInt),
          $('<img>', { class: 'hide', src:img })
        ),

      modDetails,
      miscDetails,
      resoDetails,
      statusDetails,
      linkDetails,
      historyDetails
    );

  // only run the hooks when we have a portalDetails object - most plugins rely on the extended data
  // TODO? another hook to call always, for any plugins that can work with less data?
  if (details) {
    runHooks('portalDetailsUpdated', {guid: guid, portal: portal, portalDetails: details, portalData: data});
  }
}

window.getPortalMiscDetails = function(guid,d) {

  var randDetails;

  if (d) {

    // collect some random data that’s not worth to put in an own method
    var linkInfo = getPortalLinks(guid);
    var maxOutgoing = getMaxOutgoingLinks(d);
    var linkCount = linkInfo.in.length + linkInfo.out.length;
    var links = {incoming: linkInfo.in.length, outgoing: linkInfo.out.length};

    var title = 'at most ' + maxOutgoing + ' outgoing links\n' +
                links.outgoing + ' links out\n' +
                links.incoming + ' links in\n' +
                '(' + (links.outgoing+links.incoming) + ' total)'
    var linksText = ['links', links.outgoing+' out / '+links.incoming+' in', title];

    var player = d.owner
      ? '<span class="nickname">' + d.owner + '</span>'
      : '-';
    var playerText = ['owner', player];


    var fieldCount = getPortalFieldsCount(guid);

    var fieldsText = ['fields', fieldCount];

    var apGainText = getAttackApGainText(d,fieldCount,linkCount);

    var attackValues = getPortalAttackValues(d);


    // collect and html-ify random data

    var randDetailsData = [
      // these pieces of data are only relevant when the portal is captured
      // maybe check if portal is captured and remove?
      // But this makes the info panel look rather empty for unclaimed portals
      playerText, getRangeText(d),
      linksText, fieldsText,
      getMitigationText(d,linkCount), getEnergyText(d),
      // and these have some use, even for uncaptured portals
      apGainText, getHackDetailsText(d),
    ];

    if(attackValues.attack_frequency != 0)
      randDetailsData.push([
        '<span title="attack frequency" class="text-overflow-ellipsis">attack frequency</span>',
        '×'+attackValues.attack_frequency]);
    if(attackValues.hit_bonus != 0)
      randDetailsData.push(['hit bonus', attackValues.hit_bonus+'%']);
    if(attackValues.force_amplifier != 0)
      randDetailsData.push([
        '<span title="force amplifier" class="text-overflow-ellipsis">force amplifier</span>',
        '×'+attackValues.force_amplifier]);

    randDetails = '<table id="randdetails">' + genFourColumnTable(randDetailsData) + '</table>';


    // artifacts - tacked on after (but not as part of) the 'randdetails' table
    // instead of using the existing columns....

    if (d.artifactBrief && d.artifactBrief.target && Object.keys(d.artifactBrief.target).length > 0) {
      var targets = Object.keys(d.artifactBrief.target);
//currently (2015-07-10) we no longer know the team each target portal is for - so we'll just show the artifact type(s) 
       randDetails += '<div id="artifact_target">Target portal: '+targets.map(function(x) { return x.capitalize(); }).join(', ')+'</div>';
    }

    // shards - taken directly from the portal details
    if (d.artifactDetail) {
      randDetails += '<div id="artifact_fragments">Shards: '+d.artifactDetail.displayName+' #'+d.artifactDetail.fragments.join(', ')+'</div>';
    }

  }

  return randDetails;
}


// draws link-range and hack-range circles around the portal with the
// given details. Clear them if parameter 'd' is null.
window.setPortalIndicators = function(p) {

  if(portalRangeIndicator) map.removeLayer(portalRangeIndicator);
  portalRangeIndicator = null;
  if(portalAccessIndicator) map.removeLayer(portalAccessIndicator);
  portalAccessIndicator = null;

  // if we have a portal...

  if(p) {
    var coord = p.getLatLng();

    // range is only known for sure if we have portal details
    // TODO? render a min range guess until details are loaded..?

    var d = portalDetail.get(p.options.guid);
    if (d) {
      var range = getPortalRange(d);
      portalRangeIndicator = (range.range > 0
          ? L.geodesicCircle(coord, range.range, {
              fill: false,
              color: RANGE_INDICATOR_COLOR,
              weight: 3,
              dashArray: range.isLinkable ? undefined : "10,10",
              interactive: false })
          : L.circle(coord, range.range, { fill: false, stroke: false, interactive: false })
        ).addTo(map);
    }

    portalAccessIndicator = L.circle(coord, HACK_RANGE,
      { fill: false, color: ACCESS_INDICATOR_COLOR, weight: 2, interactive: false }
    ).addTo(map);
  }

}

// highlights portal with given GUID. Automatically clears highlights
// on old selection. Returns false if the selected portal changed.
// Returns true if it's still the same portal that just needs an
// update.
window.selectPortal = function(guid) {
  var update = selectedPortal === guid;
  var oldPortalGuid = selectedPortal;
  selectedPortal = guid;

  var oldPortal = portals[oldPortalGuid];
  var newPortal = portals[guid];

  // Restore style of unselected portal
  if(!update && oldPortal) setMarkerStyle(oldPortal,false);

  // Change style of selected portal
  if(newPortal) {
    setMarkerStyle(newPortal, true);

    if (map.hasLayer(newPortal)) {
      newPortal.bringToFront();
    }
  }

  setPortalIndicators(newPortal);

  runHooks('portalSelected', {selectedPortalGuid: guid, unselectedPortalGuid: oldPortalGuid});
  return update;
}
