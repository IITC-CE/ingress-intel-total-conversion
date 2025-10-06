// @author         cradle
// @name           User Location
// @category       Tweaks
// @version        0.3.0
// @description    Show user location marker on map

/* exported setup, changelog --eslint */
/* global L -- eslint */

const changelog = [
  {
    version: '0.3.0',
    changes: ['Add browser geolocation and compass support'],
  },
];

window.plugin.userLocation = function () {};

window.plugin.userLocation.follow = false;
window.plugin.userLocation.user = { latlng: null, direction: null };

window.plugin.userLocation.browser = {
  watchId: null,
  isActive: false,
};

window.plugin.userLocation.setup = function () {
  window.pluginCreateHook('pluginUserLocation');

  $('<style>').prop('type', 'text/css').html('@include_string:user-location.css@').appendTo('head');

  const cssClass = window.PLAYER.team === 'RESISTANCE' ? 'res' : 'enl';

  const latlng = new L.LatLng(0, 0);

  const icon = new L.DivIcon({
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

  // Initialize browser geolocation if available
  window.plugin.userLocation.initBrowserGeolocation().then();

  // HOOK: fired when the marker is drawn the first time
  window.runHooks('pluginUserLocation', { event: 'setup', data: window.plugin.userLocation.user });
};

// Capability detection
window.plugin.userLocation.hasGeolocation = () => navigator?.geolocation?.watchPosition;
window.plugin.userLocation.hasOrientation = () => window.DeviceOrientationEvent;

// Browser geolocation initialization
window.plugin.userLocation.initBrowserGeolocation = async function () {
  if (window.isApp || !window.plugin.userLocation.hasGeolocation()) {
    return;
  }

  // Request orientation permission for iOS 13+ if needed
  if (window.plugin.userLocation.hasOrientation() && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      await DeviceOrientationEvent.requestPermission();
    } catch {
      console.warn('IITC User Location: Orientation permission denied');
    }
  }

  // Reset orientation and start geolocation
  window.plugin.userLocation.onOrientationChange(null);
  window.plugin.userLocation.startBrowserGeolocation();
};

window.plugin.userLocation.startBrowserGeolocation = function () {
  if (window.plugin.userLocation.browser.isActive) return;

  const options = {
    enableHighAccuracy: true,
    timeout: 6000,
    maximumAge: 3000,
  };

  // Start position tracking
  window.plugin.userLocation.browser.watchId = navigator.geolocation.watchPosition(
    window.plugin.userLocation.onBrowserLocationSuccess,
    window.plugin.userLocation.onBrowserLocationError,
    options
  );

  // Start orientation tracking
  if (window.plugin.userLocation.hasOrientation()) {
    const eventType = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(eventType, window.plugin.userLocation.onBrowserOrientationChange, true);
  }

  window.plugin.userLocation.browser.isActive = true;
};

// Geolocation callbacks
window.plugin.userLocation.onBrowserLocationSuccess = function (position) {
  const { latitude: lat, longitude: lng } = position.coords;
  window.plugin.userLocation.onLocationChange(lat, lng);
};

window.plugin.userLocation.onBrowserLocationError = function (error) {
  console.warn('IITC User Location: Browser geolocation error:', error);
};

window.plugin.userLocation.onBrowserOrientationChange = function (event) {
  const { type, alpha, webkitCompassHeading, absolute } = event;

  let heading = null;

  // Priority: deviceorientationabsolute → webkitCompassHeading → absolute fallback
  if (type === 'deviceorientationabsolute' && alpha !== null) {
    heading = 360 - alpha;
  } else if (webkitCompassHeading !== undefined) {
    heading = webkitCompassHeading;
  } else if (absolute === true && alpha !== null) {
    heading = 360 - alpha;
  }

  if (heading !== null) {
    // Simple normalization to 0-360 range
    heading = heading % 360;
    window.plugin.userLocation.onOrientationChange(heading);
  }
};

window.plugin.userLocation.onZoomEnd = function () {
  const { circle, locationLayer } = window.plugin.userLocation;
  const shouldShow = window.map.getZoom() >= 16 && !L.Path.CANVAS;

  if (shouldShow && !locationLayer.hasLayer(circle)) {
    locationLayer.addLayer(circle);
  } else if (!shouldShow && locationLayer.hasLayer(circle)) {
    locationLayer.removeLayer(circle);
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

  const bounds = new L.LatLngBounds([lat - latAccuracy, lng - lngAccuracy], [lat + latAccuracy, lng + lngAccuracy]);

  // an extremely close view is pretty pointless (especially with maps that support zoom level 20+)
  // so limit to 17 (enough to see all portals)
  const zoom = persistentZoom ? window.map.getZoom() : Math.min(window.map.getBoundsZoom(bounds), 17);

  if (window.map.getCenter().distanceTo(latlng) < 10) {
    window.plugin.userLocation.follow = true;
    window.app?.setFollowMode?.(true);
  }

  window.map.setView(latlng, zoom);
};

window.plugin.userLocation.onLocationChange = function (lat, lng) {
  if (!window.plugin.userLocation.marker) return;

  const latlng = new L.LatLng(lat, lng);
  const { user, marker, circle } = window.plugin.userLocation;

  user.latlng = latlng;
  marker.setLatLng(latlng);
  circle.setLatLng(latlng);

  // Update distance to portal plugin if available
  if (window.plugin.distanceToPortal) {
    window.plugin.distanceToPortal.currentLoc = latlng;
    window.plugin.distanceToPortal.updateDistance();
  }

  // Follow mode logic
  if (window.plugin.userLocation.follow) {
    // move map if marker moves more than 35% from the center
    // 100% - 2*15% = 70% → 35% from center in either direction
    const bounds = window.map.getBounds().pad(-0.15);
    if (!bounds.contains(latlng)) {
      window.map.setView(latlng);
    }
  }

  // HOOK: fired when the marker location is changed
  window.runHooks('pluginUserLocation', { event: 'onLocationChange', data: user });
};

window.plugin.userLocation.onOrientationChange = function (direction) {
  const { marker, user } = window.plugin.userLocation;
  if (!marker) return;

  user.direction = direction;

  const icon = marker._icon;
  if (!icon) return;

  const container = $('.container', icon);

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
  window.runHooks('pluginUserLocation', { event: 'onOrientationChange', data: user });
};

window.plugin.userLocation.getUser = function () {
  return window.plugin.userLocation.user;
};

const setup = window.plugin.userLocation.setup;
