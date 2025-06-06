// @author         cradle
// @name           User Location
// @category       Tweaks
// @version        0.2.3
// @description    Show user location marker on map

/* exported setup --eslint */
/* global L -- eslint */

window.plugin.userLocation = function () {};

window.plugin.userLocation.follow = false;
window.plugin.userLocation.user = { latlng: null, direction: null };

window.plugin.userLocation.setup = function () {
  window.pluginCreateHook('pluginUserLocation');

  $('<style>').prop('type', 'text/css').html('@include_string:user-location.css@').appendTo('head');

  const cssClass = window.PLAYER.team === 'RESISTANCE' ? 'res' : 'enl';

  const latlng = new L.LatLng(0, 0);

  const icon = L.divIcon({
    iconSize: L.point(32, 32),
    iconAnchor: L.point(16, 16),
    className: 'user-location',
    html: `<div class="container ${cssClass} circle"><div class="outer"></div><div class="inner"></div></div>`,
  });

  const marker = L.marker(latlng, {
    icon: icon,
    zIndexOffset: 300,
    interactive: false,
  });

  const circle = new L.Circle(latlng, 40, {
    stroke: true,
    color: '#ffb900',
    opacity: 0.5,
    fillOpacity: 0.25,
    fillColor: '#ffb900',
    weight: 1.5,
    interactive: false,
  });

  window.plugin.userLocation.locationLayer = new L.LayerGroup();

  marker.addTo(window.plugin.userLocation.locationLayer);
  window.plugin.userLocation.locationLayer.addTo(window.map);
  window.addLayerGroup('User location', window.plugin.userLocation.locationLayer, true);

  Object.assign(window.plugin.userLocation, {
    user: { latlng, direction: null },
    marker,
    circle,
    icon,
  });

  window.map.on('zoomend', window.plugin.userLocation.onZoomEnd);
  window.plugin.userLocation.onZoomEnd();

  // HOOK: fired when the marker is drawn the first time
  window.runHooks('pluginUserLocation', { event: 'setup', data: window.plugin.userLocation.user });
};

window.plugin.userLocation.onZoomEnd = function () {
  if (window.map.getZoom() < 16 || L.Path.CANVAS) {
    if (window.plugin.userLocation.locationLayer.hasLayer(window.plugin.userLocation.circle))
      window.plugin.userLocation.locationLayer.removeLayer(window.plugin.userLocation.circle);
  } else {
    if (!window.plugin.userLocation.locationLayer.hasLayer(window.plugin.userLocation.circle))
      window.plugin.userLocation.locationLayer.addLayer(window.plugin.userLocation.circle);
  }
};

window.plugin.userLocation.locate = function (lat, lng, accuracy, persistentZoom) {
  if (window.plugin.userLocation.follow) {
    window.plugin.userLocation.follow = false;
    window.app?.setFollowMode?.(false);
    return;
  }

  const latlng = new L.LatLng(lat, lng);

  const latAccuracy = (180 * accuracy) / 40075017;
  const lngAccuracy = latAccuracy / Math.cos((Math.PI / 180) * lat);

  let zoom = window.map.getBoundsZoom(L.latLngBounds([lat - latAccuracy, lng - lngAccuracy], [lat + latAccuracy, lng + lngAccuracy]));

  // an extremely close view is pretty pointless (especially with maps that support zoom level 20+)
  // so limit to 17 (enough to see all portals)
  zoom = persistentZoom ? window.map.getZoom() : Math.min(zoom, 17);

  if (window.map.getCenter().distanceTo(latlng) < 10) {
    window.plugin.userLocation.follow = true;
    window.app?.setFollowMode?.(true);
  }

  window.map.setView(latlng, zoom);
};

window.plugin.userLocation.onLocationChange = function (lat, lng) {
  if (!window.plugin.userLocation.marker) return;

  const latlng = new L.LatLng(lat, lng);
  window.plugin.userLocation.user.latlng = latlng;
  window.plugin.userLocation.marker.setLatLng(latlng);
  window.plugin.userLocation.circle.setLatLng(latlng);

  if (window.plugin.distanceToPortal) {
    window.plugin.distanceToPortal.currentLoc = latlng;
    window.plugin.distanceToPortal.updateDistance();
  }

  if (window.plugin.userLocation.follow) {
    // move map if marker moves more than 35% from the center
    // 100% - 2*15% = 70% → 35% from center in either direction
    if (window.map.getBounds().pad(-0.15).contains(latlng)) return;

    window.map.setView(latlng);
  }

  // HOOK: fired when the marker location is changed
  window.runHooks('pluginUserLocation', { event: 'onLocationChange', data: window.plugin.userLocation.user });
};

window.plugin.userLocation.onOrientationChange = function (direction) {
  if (!window.plugin.userLocation.marker) return;

  window.plugin.userLocation.user.direction = direction;

  if (!window.plugin.userLocation.marker._icon) return;

  const container = $('.container', window.plugin.userLocation.marker._icon);

  if (direction === null) {
    container.removeClass('arrow').addClass('circle').css({
      webkitTransform: '',
      transform: '',
    });
  } else {
    container
      .removeClass('circle')
      .addClass('arrow')
      .css({
        webkitTransform: `rotate(${direction}deg)`,
        transform: `rotate(${direction}deg)`,
      });
  }

  // HOOK: fired when the marker direction is changed
  window.runHooks('pluginUserLocation', { event: 'onOrientationChange', data: window.plugin.userLocation.user });
};

window.plugin.userLocation.getUser = function () {
  return window.plugin.userLocation.user;
};

const setup = window.plugin.userLocation.setup;
