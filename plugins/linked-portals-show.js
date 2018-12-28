// @author         fstopienski
// @name           Linked portals
// @category       Portal Info
// @version        0.3.3
// @description    Try to show the linked portals (image, name and link direction) in portal detail view and jump to linked portal on click.  Some details may not be available if the linked portal is not in the current view.


// use own namespace for plugin
window.plugin.showLinkedPortal = function () {
};

plugin.showLinkedPortal.previewOptions = {
  color: "#C33",
  opacity: 1,
  weight: 5,
  fill: false,
  dashArray: "1,6",
  radius: 18,
};

plugin.showLinkedPortal.makePortalLinkInfo = function (div,guid,data,length,is_outgoing) { // guid: potentially useful
  div = div ? div.empty().removeClass('outOfRange') : $('<div>')
  var lengthFull = digits(Math.round(length)) + 'm';
  var title = data && data.title || null;
  if (title) {
    div.append($('<img/>').attr({
      'src': fixPortalImageUrl(data.image),
      'class': 'minImg',
      'alt': title,
    }));
  } else {
    title = 'Go to portal';
    var lengthShort = length < 100000 ? lengthFull : digits(Math.round(length/1000)) + 'km';
    div
      .addClass('outOfRange')
      .append($('<span/>').html('Portal not loaded.<br>' + lengthShort));
  }
  div.attr('title', $('<div/>')
    .append($('<strong/>').text(title))
    .append($('<br/>'))
    .append($('<span/>').text(is_outgoing ? '↴ outgoing link' : '↳ incoming link'))
    .append($('<br/>'))
    .append($('<span/>').html(lengthFull))
    .html());
  return div;
};

window.plugin.showLinkedPortal.portalDetail = function (data) {
  plugin.showLinkedPortal.removePreview();

  var portalLinks = getPortalLinks(data.guid);
  var length = portalLinks.in.length + portalLinks.out.length

  var c = 1;

  $('<div>',{id:'showLinkedPortalContainer'}).appendTo('#portaldetails');

  function renderLinkedPortal(linkGuid) {
    if(c > 16) return;

    var key = this; // passed by Array.prototype.forEach
    var direction = (key=='d' ? 'outgoing' : 'incoming');
    var link = window.links[linkGuid].options.data;
    var guid = link[key + 'Guid'];
    var lat = link[key + 'LatE6']/1E6;
    var lng = link[key + 'LngE6']/1E6;

    var length = L.latLng(link.oLatE6/1E6, link.oLngE6/1E6).distanceTo([link.dLatE6/1E6, link.dLngE6/1E6]);
    var data = (portals[guid] && portals[guid].options.data) || portalDetail.get(guid) || null;

    plugin.showLinkedPortal.makePortalLinkInfo(null,guid,data,length,direction==='outgoing')
      .addClass('showLinkedPortalLink showLinkedPortalLink' + c + ' ' + direction)
      .attr({
        'data-guid': guid,
        'data-lat': lat,
        'data-lng': lng,
        'data-length': length,
      })
      .appendTo('#showLinkedPortalContainer');

    c++;
  }

  portalLinks.out.forEach(renderLinkedPortal, 'd');
  portalLinks.in.forEach(renderLinkedPortal, 'o');

  if(length > 16) {
    $('<div>')
      .addClass('showLinkedPortalLink showLinkedPortalOverflow')
      .text(length-16 + ' more')
      .appendTo('#showLinkedPortalContainer');
  }

  $('#showLinkedPortalContainer')
    .on('click', '.showLinkedPortalLink:not(".outOfRange")', plugin.showLinkedPortal.onLinkedPortalClick)
    .on('click', '.showLinkedPortalLink.outOfRange', plugin.showLinkedPortal.onOutOfRangePortalClick)
    .on('taphold', '.showLinkedPortalLink', { duration: 900 }, plugin.showLinkedPortal.onLinkedPortalTapHold)
    .on('mouseover', '.showLinkedPortalLink.outOfRange', plugin.showLinkedPortal.onOutOfRangePortalMouseOver)
    .on('mouseover', '.showLinkedPortalLink', plugin.showLinkedPortal.onLinkedPortalMouseOver)
    .on('mouseout', '.showLinkedPortalLink', plugin.showLinkedPortal.onLinkedPortalMouseOut);
}

plugin.showLinkedPortal.onLinkedPortalClick = function() {
  plugin.showLinkedPortal.removePreview();

  var element = $(this);
  var guid = element.attr('data-guid');
  var lat = element.attr('data-lat');
  var lng = element.attr('data-lng');

  if(!guid) return; // overflow

  var position = L.latLng(lat, lng);
  if(!map.getBounds().contains(position)) map.setView(position);
  if(portals[guid])
    renderPortalDetails(guid);
  else
    zoomToAndShowPortal(guid, position);
};

plugin.showLinkedPortal.onOutOfRangePortalClick = function() {
  var element = $(this);
  var guid = element.attr('data-guid');
  var length = element.attr('data-length');
  var is_outgoing = element.hasClass('outgoing');
  portalDetail.request(guid).done(function(data) {
    plugin.showLinkedPortal.makePortalLinkInfo(element,guid,data,length,is_outgoing);
  });
};

plugin.showLinkedPortal.onLinkedPortalTapHold = function() {
  // close portal info in order to preview link on map
  if(isSmartphone()) { show('map'); }
}

plugin.showLinkedPortal.onOutOfRangePortalMouseOver = plugin.showLinkedPortal.onOutOfRangePortalClick;

plugin.showLinkedPortal.onLinkedPortalMouseOver = function() {
  plugin.showLinkedPortal.removePreview();

  var element = $(this);
  var lat = element.attr('data-lat');
  var lng = element.attr('data-lng');

  if(!(lat && lng)) return; // overflow

  var remote = L.latLng(lat, lng);
  var local = portals[selectedPortal].getLatLng();

  plugin.showLinkedPortal.preview = L.layerGroup().addTo(map);

  L.circleMarker(remote, plugin.showLinkedPortal.previewOptions)
    .addTo(plugin.showLinkedPortal.preview);

  L.geodesicPolyline([local, remote], plugin.showLinkedPortal.previewOptions)
    .addTo(plugin.showLinkedPortal.preview);
};

plugin.showLinkedPortal.onLinkedPortalMouseOut = function() {
  plugin.showLinkedPortal.removePreview();
};

plugin.showLinkedPortal.removePreview = function() {
  if(plugin.showLinkedPortal.preview)
    map.removeLayer(plugin.showLinkedPortal.preview);
  plugin.showLinkedPortal.preview = null;
};

var setup = function () {
  window.addHook('portalDetailsUpdated', window.plugin.showLinkedPortal.portalDetail);
  $('<style>').prop('type', 'text/css').html('@include_string:linked-portals-show.css@').appendTo('head');
}
