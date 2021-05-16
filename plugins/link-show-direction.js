// @author         jonatkins
// @name           Direction of links on map
// @category       Tweaks
// @version        0.2.2
// @description    Show the direction of links on the map by adding short dashes to the line at the origin portal.


/* exported setup --eslint */
/* global L, dialog, addHook, map, links */
// use own namespace for plugin
var linkShowDirection = {};
window.plugin.linkShowDirection = linkShowDirection;

// exposed
// linkShowDirection.showDialog = showDialog;

var ANIMATE_UPDATE_TIME = 1000; // 1000ms = 1s

// Hack:
// 100000 - a large enough number to be the equivalent of 100%, which is not supported Leaflet when displaying with canvas
var styles = {
  'Disabled': [null],
  'Static *': [
    '30,5,15,5,15,5,2,5,2,5,2,5,2,5,30,0',
  ],
  'Static near origin': [
    '10,5,5,5,5,5,5,5,100000',
  ],
  'Animate near origin': [
    '10,5,5,5,5,5,5,5,100000',
    '12,5,5,5,5,5,5,3,100000',
    '14,5,5,5,5,5,5,1,100000',
    '10,1,5,5,5,5,5,5,100000',
    '10,3,5,5,5,5,5,5,100000',
  ],
  'Animate full link': [
    '4,6,4,6,4,6,4,6',
    '0,2,4,6,4,6,4,4',
    '0,4,4,6,4,6,4,2',
    '0,6,4,6,4,6,4,0',
    '2,6,4,6,4,6,2,0',
  ]
};
var dashArray = null;
var activeFrame = 0;
var moving = false;
var activeStyle = '';


function animateLinks () {
  var frames = styles[activeStyle];
  if (!frames) frames = [null];

  if (!moving) {
    var frame = activeFrame;
    frame = (frame + 1) % frames.length;
    activeFrame = frame;

    dashArray = frames[frame];
    addAllLinkStyles();
  }

  if (frames.length < 2) return; // no animation needed

  // browsers don't render the SVG style changes until after the timer function has finished.
  // this means if we start the next timeout in here a lot of the delay time will be taken by the browser itself
  // re-rendering the screen. in the worst case, the timer will run out before the render completes, and fire immediately
  // this would mean the user has no chance to interact with IITC
  // to prevent this, create a short timer that then sets the timer for the next frame. if the browser is slow to render,
  // the short timer should fire later, at which point the desired ANIMATE_UPDATE_TIME timer is started
  clearTimeout(timer);
  var timer = setTimeout(function() {
    clearTimeout(timer);
    timer = setTimeout(
      animateLinks,
      ANIMATE_UPDATE_TIME);
  }, 10);
}

function addAllLinkStyles () {
  $.each(links,function(guid,link) { addLinkStyle(link); });

  if (window.plugin.drawTools && localStorage['plugin-linkshowdirection-drawtools'] === 'true') {
    window.plugin.drawTools.drawnItems.eachLayer(function(layer) {
      if (layer instanceof L.GeodesicPolyline) {
        addLinkStyle(layer);
      }
    });
  }
}

function addLinkStyle (link) {
  link.setStyle({dashArray: dashArray});
}

function removeDrawToolsStyle () {
  if (!window.plugin.drawTools) return;

  window.plugin.drawTools.drawnItems.eachLayer(function(layer) {
    if (layer instanceof L.GeodesicPolyline) {
      layer.setStyle({dashArray: null});
    }
  });
}

var showDialog = function () {
  var div = document.createElement('div');

  $.each(styles, function(style) {
    var label = div.appendChild(document.createElement('label'));
    var input = label.appendChild(document.createElement('input'));
    input.type = 'radio';
    input.name = 'plugin-link-show-direction';
    input.value = style;
    if (style === activeStyle) {
      input.checked = true;
    }

    input.addEventListener('click', function() {
      activeStyle = style;
      localStorage['plugin-linkshowdirection-mode'] = style;
      animateLinks();
    }, false);

    label.appendChild(document.createTextNode(' ' + style));

    div.appendChild(document.createElement('br'));
  });

  div.appendChild(document.createTextNode(
    ' * Static: six segments will indicate each link\'s direction. ' +
    'Two long segments are on the origin\'s side, follow by four short segments on the destination\'s side.'));

  if (window.plugin.drawTools) {
    div.appendChild(document.createElement('br'));

    var label = div.appendChild(document.createElement('label'));
    var input = label.appendChild(document.createElement('input'));
    input.type = 'checkbox';
    input.checked = localStorage['plugin-linkshowdirection-drawtools'] === 'true';

    input.addEventListener('click', function() {
      localStorage['plugin-linkshowdirection-drawtools'] = input.checked.toString();

      if (input.checked) {
        animateLinks();
      } else {
        removeDrawToolsStyle();
      }
    }, false);

    label.appendChild(document.createTextNode(' Apply to DrawTools'));
  }

  dialog({
    id: 'plugin-link-show-direction',
    html: div,
    title: 'Show link direction',
  });
};

function setup () {
  $('#toolbox').append(' <a>LinkDirection Opt</a>').on('click', showDialog);
  addHook('linkAdded', function(data) { addLinkStyle(data.link); });

  try {
    activeStyle = localStorage['plugin-linkshowdirection-mode'];
  } catch (e) {
    console.warn(e);
    activeStyle = 'Disabled';
  }

  animateLinks();

  // set up move start/end handlers to pause animations while moving
  map.on('movestart', function() { moving = true; });
  map.on('moveend', function() { moving = false; });
}
