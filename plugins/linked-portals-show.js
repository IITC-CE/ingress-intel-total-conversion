// @author         fstopienski
// @name           Linked portals
// @category       Portal Info
// @version        0.3.3
// @description    Try to show the linked portals (image, name and link direction) in portal detail view and jump to linked portal on click.  Some details may not be available if the linked portal is not in the current view.


// use own namespace for plugin
var showLinkedPortal = {};
window.plugin.showLinkedPortal = showLinkedPortal;

showLinkedPortal.previewOptions = {
  color: '#C33',
  opacity: 1,
  weight: 5,
  fill: false,
  dashArray: '1,6',
  radius: 18,
};

showLinkedPortal.noimage = false;
showLinkedPortal.imageInTooltip = true;
showLinkedPortal.doubleTapToGo = true;

showLinkedPortal.makePortalLinkContent = function (div,guid,data,length,is_outgoing) { // eslint-disable-line no-unused-vars
  var lengthFull = digits(Math.round(length)) + 'm';
  var lengthShort = length < 100000 ? lengthFull : digits(Math.round(length/1000)) + 'km';
  $('<div>').addClass('info')
    .html(lengthShort)
    .appendTo(div);

  $('<div>').addClass('title')
    .html(data.title || 'Go to portal')
    .appendTo(div);

  if (data.image) {
    $('<img>').attr({
      src: fixPortalImageUrl(data.image),
      class: 'minImg',
      alt: data.title,
    }).appendTo(div);
  }
};

showLinkedPortal.getPortalLinkTooltip = function (div,guid,data,length,is_outgoing) {
  var lengthFull = digits(Math.round(length)) + 'm';
  var tooltip = $('<div>').append(
    $('<div>').attr('style', 'font-weight:bold').text(data.title || 'Go to portal'),
    $('<div>').text(is_outgoing ? '↴ outgoing link' : '↳ incoming link'),
    $('<div>').html(lengthFull));
  if (showLinkedPortal.imageInTooltip && data.image) {
    $('<img>')
      .attr('src', fixPortalImageUrl(data.image))
      .addClass('minImg')
      .appendTo(tooltip);
  }
  return tooltip.html();
};

var lastPortal;
showLinkedPortal.makePortalLinkInfo = function (div,guid,data,length,is_outgoing) { // eslint-disable-line no-unused-vars
  if (div) {
    div.empty().removeClass('outOfRange');
  } else {
    div = $('<div>');
    if (guid === lastPortal) {
      div.addClass('lastportal');
    }
  }
  if (!data.title) {
    div.addClass('outOfRange');
  }
  showLinkedPortal.makePortalLinkContent.apply(this, arguments);
  return div.attr('title', showLinkedPortal.getPortalLinkTooltip.apply(this, arguments));
};

showLinkedPortal.portalDetail = function (data) {
  showLinkedPortal.removePreview();

  var portalLinks = getPortalLinks(data.guid);
  var length = portalLinks.in.length + portalLinks.out.length;

  var c = 1;

  var $showLinkedPortalContainer = $('<div>',{id:'showLinkedPortal'}).appendTo('.imgpreview');
  if (showLinkedPortal.noimage) {
    $showLinkedPortalContainer.addClass('noimage');
  }

  function renderLinkedPortal(linkGuid) {
    if (c > 16) return;

    var key = this.toString(); // passed by Array.prototype.forEach
    var direction = (key === 'd' ? 'outgoing' : 'incoming');
    var link = window.links[linkGuid].options.data;
    var guid = link[key + 'Guid'];
    var lat = link[key + 'LatE6']/1E6;
    var lng = link[key + 'LngE6']/1E6;

    var length = L.latLng(link.oLatE6/1E6, link.oLngE6/1E6).distanceTo([link.dLatE6/1E6, link.dLngE6/1E6]);
    var data = (portals[guid] && portals[guid].options.data) || portalDetail.get(guid) || {};

    showLinkedPortal.makePortalLinkInfo(null,guid,data,length,direction==='outgoing')
      .addClass('link link' + c + ' ' + direction)
      .attr({
        'data-guid': guid,
        'data-lat': lat,
        'data-lng': lng,
        'data-length': length,
      })
      .appendTo($showLinkedPortalContainer);

    c++;
  }

  portalLinks.out.forEach(renderLinkedPortal, 'd');
  portalLinks.in.forEach(renderLinkedPortal, 'o');

  if (length > 16) {
    $('<div>')
      .addClass('overflow')
      .text(length-16 + ' more')
      .appendTo($showLinkedPortalContainer);
  }

  $showLinkedPortalContainer
    .on('click', '.link:not(".outOfRange")', showLinkedPortal.renderPortalDetails)
    .on('click', '.link.outOfRange', showLinkedPortal.requestPortalData)
    .on('taphold', '.link', showLinkedPortal.showLinkOnMap)
    .on('mouseover', '.link.outOfRange', showLinkedPortal.requestPortalData)
    .on('mouseover', '.link', showLinkedPortal.showPreview)
    .on('mouseout', '.link', showLinkedPortal.removePreview);

  $('.imgpreview')
    .on('taphold', { delay: 1100 }, function () {
      showLinkedPortal.noimage = !showLinkedPortal.noimage;
      $showLinkedPortalContainer.toggleClass('noimage');
    });
};

showLinkedPortal.renderPortalDetails = function (ev) {
  function isTouch (event) {
    return event.pointerType === 'touch' ||
           event.sourceCapabilities && event.sourceCapabilities.firesTouchEvents;
  }
  var event = ev.originalEvent;
  if (showLinkedPortal.doubleTapToGo && isTouch(event) && event.detail !== 2) {
    return;
  }

  showLinkedPortal.removePreview();

  var element = $(this);
  var guid = element.attr('data-guid');
  var lat = element.attr('data-lat');
  var lng = element.attr('data-lng');

  var position = L.latLng(lat, lng);
  if (!map.getBounds().contains(position)) {
    map.panInside(position);
  }
  if (portals[guid]) {
    renderPortalDetails(guid);
  } else {
    zoomToAndShowPortal(guid, position);
  }
};

showLinkedPortal.requestPortalData = function() {
  var element = $(this);
  var guid = element.attr('data-guid');
  var length = element.attr('data-length');
  var is_outgoing = element.hasClass('outgoing');
  portalDetail.request(guid).done(function(data) {
    showLinkedPortal.makePortalLinkInfo(element,guid,data,length,is_outgoing);
    // update tooltip
    var tooltipId = element.attr('aria-describedby');
    if (tooltipId) {
      $('#' + tooltipId).html(element.attr('title'));
    }
  });
};

showLinkedPortal.showLinkOnMap = function() {
  // close portal info in order to preview link on map
  if (isSmartphone()) { show('map'); }
  if (!showLinkedPortal.preview) {
    showLinkedPortal.showPreview.apply(this, arguments);
  }

  var element = $(this);
  var guid = element.attr('data-guid');
  var lat = element.attr('data-lat');
  var lng = element.attr('data-lng');

  var position = L.latLng(lat, lng);
  if (!map.getBounds().contains(position)) {
    var targetBounds = [position, portals[selectedPortal].getLatLng()];
    map.fitBounds(targetBounds, { padding: [15, 15], maxZoom: map.getZoom() });
  }
};

showLinkedPortal.showPreview = function() {
  showLinkedPortal.removePreview();

  var element = $(this);
  var lat = element.attr('data-lat');
  var lng = element.attr('data-lng');

  var remote = L.latLng(lat, lng);
  var local = portals[selectedPortal].getLatLng();

  showLinkedPortal.preview = L.layerGroup().addTo(map);

  L.circleMarker(remote, showLinkedPortal.previewOptions)
    .addTo(showLinkedPortal.preview);

  L.geodesicPolyline([local, remote], showLinkedPortal.previewOptions)
    .addTo(showLinkedPortal.preview);
};

showLinkedPortal.removePreview = function() {
  if (showLinkedPortal.preview) {
    map.removeLayer(showLinkedPortal.preview);
  }
  showLinkedPortal.preview = null;
};

function setup () {
  window.addHook('portalSelected', function (data) {
    var sel = data.selectedPortalGuid;
    var unsel = data.unselectedPortalGuid;
    lastPortal = sel !== unsel ? unsel : lastPortal;
  });

  window.addHook('portalDetailsUpdated', showLinkedPortal.portalDetail);
  $('<style>').prop('type', 'text/css').html('@include_string:linked-portals-show.css@').appendTo('head');
}
/* exported setup */
