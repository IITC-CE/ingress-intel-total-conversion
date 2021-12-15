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

showLinkedPortal.makePortalLinkContent = function ($div, info, data) {
  var lengthFull = digits(Math.round(info.length)) + 'm';
  var lengthShort = info.length < 100000
    ? lengthFull
    : digits(Math.round(info.length/1000)) + 'km';
  $('<div>').addClass('info')
    .html(lengthShort)
    .appendTo($div);

  $('<div>').addClass('title')
    .html(data.title || 'Go to portal')
    .appendTo($div);

  if (data.image) {
    $('<img>').attr({
      src: fixPortalImageUrl(data.image),
      class: 'minImg',
      alt: data.title,
    }).appendTo($div);
  }
};

showLinkedPortal.getPortalLinkTooltip = function ($div, info, data) {
  var lengthFull = digits(Math.round(info.length)) + 'm';
  var tooltip = $('<div>').append(
    $('<div>').attr('style', 'font-weight:bold').text(data.title || 'Go to portal'),
    $('<div>').text(info.direction === 'outgoing' ? '↴ outgoing link' : '↳ incoming link'),
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
showLinkedPortal.makePortalLinkInfo = function ($div, info, data) {
  if ($div[0].childNodes.length) {
    $div.empty().removeClass('outOfRange');
  } else {
    if (info.guid === lastPortal) {
      $div.addClass('lastportal');
    }
  }
  if (!data.title) {
    $div.addClass('outOfRange');
  }
  showLinkedPortal.makePortalLinkContent.apply(this, arguments);
  $div.attr('title', showLinkedPortal.getPortalLinkTooltip.apply(this, arguments));
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
    var info = {
      guid: guid,
      lat: lat,
      lng: lng,
      length: length,
      direction: direction,
    };
    var $div = $('<div>')
      .addClass('link link' + c + ' ' + direction)
      .data(info);
    var data = (portals[guid] && portals[guid].options.data) || portalDetail.get(guid) || {};
    showLinkedPortal.makePortalLinkInfo($div, info, data);
    $div.appendTo($showLinkedPortalContainer);

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

  var info = $(this).data();

  var position = L.latLng(info.lat, info.lng);
  if (!map.getBounds().contains(position)) {
    map.panInside(position);
  }
  if (portals[info.guid]) {
    renderPortalDetails(info.guid);
  } else {
    zoomToAndShowPortal(info.guid, position);
  }
};

showLinkedPortal.requestPortalData = function() {
  var $element = $(this);
  var info = $element.data();
  portalDetail.request(info.guid).done(function(data) {
    showLinkedPortal.makePortalLinkInfo($element, info, data);
    // update tooltip
    var tooltipId = $element.attr('aria-describedby');
    if (tooltipId) {
      $('#' + tooltipId).html($element.attr('title'));
    }
  });
};

showLinkedPortal.showLinkOnMap = function() {
  // close portal info in order to preview link on map
  if (isSmartphone()) { show('map'); }
  if (!showLinkedPortal.preview) {
    showLinkedPortal.showPreview.apply(this, arguments);
  }

  var info = $(this).data();
  var position = L.latLng(info.lat, info.lng);
  if (!map.getBounds().contains(position)) {
    var targetBounds = [position, portals[selectedPortal].getLatLng()];
    map.fitBounds(targetBounds, { padding: [15, 15], maxZoom: map.getZoom() });
  }
};

showLinkedPortal.showPreview = function() {
  showLinkedPortal.removePreview();

  var info = $(this).data();
  var remote = L.latLng(info.lat, info.lng);
  var local = portals[selectedPortal].getLatLng();

  showLinkedPortal.preview = L.layerGroup().addTo(map);

  L.circleMarker(remote, showLinkedPortal.previewOptions)
    .addTo(showLinkedPortal.preview);

  L.geodesicPolyline([local, remote], showLinkedPortal.previewOptions)
    .addTo(showLinkedPortal.preview);
};

showLinkedPortal.removePreview = function() {
  if (showLinkedPortal.preview) {
    showLinkedPortal.preview.remove();
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
