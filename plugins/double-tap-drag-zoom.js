// @author         modos189
// @name           Double-tap drag zoom
// @category       Controls
// @version        1.0.0
// @description    Enable double-tap-and-drag gesture to zoom the map on touch devices

/* exported setup, changelog --eslint */
/* global L -- eslint */

const changelog = [
  {
    version: '0.1.0',
    changes: ['Initial release'],
  },
];

const doubleTapDragZoom = {};
window.plugin.doubleTapDragZoom = doubleTapDragZoom;

doubleTapDragZoom.DOUBLE_TAP_TIMEOUT = 300; // ms between taps to count as double-tap
doubleTapDragZoom.DRAG_START_DELAY = 100; // ms delay before gesture activates, lets quick double-tap pass through as regular zoom
doubleTapDragZoom.MAX_TAP_DISTANCE = 40; // px max distance between first and second tap
doubleTapDragZoom.PIXELS_PER_ZOOM = 100; // px of drag per one zoom level

doubleTapDragZoom._firstTapPoint = null;
doubleTapDragZoom._lastTapTime = null;
doubleTapDragZoom._dragTimer = null;
doubleTapDragZoom._suppressDblClick = false;
doubleTapDragZoom._gesture = null; // non-null while drag-zoom gesture is in progress

doubleTapDragZoom._onTouchStart = (e) => {
  if (e.touches.length !== 1) return;
  const { DOUBLE_TAP_TIMEOUT, DRAG_START_DELAY, MAX_TAP_DISTANCE } = doubleTapDragZoom;
  const map = window.map;
  const now = Date.now();
  const point = map.mouseEventToContainerPoint(e.touches[0]);
  if (doubleTapDragZoom._lastTapTime !== null && now - doubleTapDragZoom._lastTapTime < DOUBLE_TAP_TIMEOUT) {
    if (doubleTapDragZoom._firstTapPoint.distanceTo(point) > MAX_TAP_DISTANCE) {
      // second tap too far - treat as a new first tap
      doubleTapDragZoom._registerFirstTap(point, now);
      return;
    }
    doubleTapDragZoom._lastTapTime = null;
    // stop Leaflet's drag before it pans the map during our gesture;
    // finishDrag clears document-level listeners and the Draggable._dragging lock
    map.dragging._draggable?.finishDrag(true);
    map.dragging.disable();
    doubleTapDragZoom._dragTimer = setTimeout(() => {
      doubleTapDragZoom._dragTimer = null;
      doubleTapDragZoom._suppressDblClick = true;
      doubleTapDragZoom._dragStart(point);
    }, DRAG_START_DELAY);
  } else {
    doubleTapDragZoom._registerFirstTap(point, now);
  }
};

doubleTapDragZoom._registerFirstTap = (point, now) => {
  doubleTapDragZoom._firstTapPoint = point;
  doubleTapDragZoom._lastTapTime = now;
  setTimeout(() => {
    if (doubleTapDragZoom._lastTapTime === now) doubleTapDragZoom._lastTapTime = null;
  }, doubleTapDragZoom.DOUBLE_TAP_TIMEOUT);
};

doubleTapDragZoom._dragStart = (tapPoint) => {
  const map = window.map;
  if (map._animatingZoom) return;
  doubleTapDragZoom._gesture = {
    tapPoint,
    startY: null, // set on first _dragMove to exclude movement during DRAG_START_DELAY
    startLatLng: map.containerPointToLatLng(tapPoint),
    startZoom: map.getZoom(),
    centerPoint: map.getSize()._divideBy(2),
    center: null,
    zoom: null,
    animRequest: null,
  };
  map._stop();
  map._moveStart(true, false);
};

doubleTapDragZoom._onTouchMove = (e) => {
  if (!doubleTapDragZoom._gesture) return;
  L.DomEvent.preventDefault(e);
  doubleTapDragZoom._dragMove(window.map.mouseEventToContainerPoint(e.touches[0]).y);
};

doubleTapDragZoom._dragMove = (currentY) => {
  const g = doubleTapDragZoom._gesture;
  const map = window.map;
  if (g.startY === null) {
    g.startY = currentY;
    return;
  }
  // drag down = zoom in: currentY > startY -> distance > 0 -> scale > 1
  const distance = currentY - g.startY;
  const scale = Math.pow(2, distance / doubleTapDragZoom.PIXELS_PER_ZOOM);
  g.zoom = map.getScaleZoom(scale, g.startZoom);
  // keep second-tap point fixed on screen as zoom changes
  const delta = g.tapPoint.subtract(g.centerPoint);
  g.center = map.unproject(map.project(g.startLatLng, g.zoom).subtract(delta), g.zoom);
  L.Util.cancelAnimFrame(g.animRequest);
  g.animRequest = L.Util.requestAnimFrame(() => map._move(g.center, g.zoom, { pinch: true, round: false }), null, true);
};

doubleTapDragZoom._onTouchEnd = () => {
  if (doubleTapDragZoom._dragTimer) {
    clearTimeout(doubleTapDragZoom._dragTimer);
    doubleTapDragZoom._dragTimer = null;
    window.map.dragging.enable();
  }
  if (doubleTapDragZoom._gesture) doubleTapDragZoom._dragEnd();
};

doubleTapDragZoom._dragEnd = () => {
  const g = doubleTapDragZoom._gesture;
  const map = window.map;
  doubleTapDragZoom._gesture = null;
  map.dragging.enable();
  if (!g.center) return;
  L.Util.cancelAnimFrame(g.animRequest);
  if (map.options.zoomAnimation) {
    map._animateZoom(g.center, map._limitZoom(g.zoom), true, map.options.zoomSnap);
  } else {
    map._resetView(g.center, map._limitZoom(g.zoom));
  }
};

doubleTapDragZoom._onDblClick = (e) => {
  if (!doubleTapDragZoom._suppressDblClick) return;
  doubleTapDragZoom._suppressDblClick = false;
  L.DomEvent.stopPropagation(e);
  L.DomEvent.preventDefault(e);
};

doubleTapDragZoom.setup = () => {
  if (!L.Browser.touch) return;
  const container = window.map._container;
  container.addEventListener('touchstart', doubleTapDragZoom._onTouchStart);
  container.addEventListener('touchmove', doubleTapDragZoom._onTouchMove, { passive: false });
  container.addEventListener('touchend', doubleTapDragZoom._onTouchEnd);
  container.addEventListener('touchcancel', doubleTapDragZoom._onTouchEnd);
  container.addEventListener('dblclick', doubleTapDragZoom._onDblClick, true);
};

const setup = doubleTapDragZoom.setup;
