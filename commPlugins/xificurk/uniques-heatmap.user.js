// ==UserScript==
// @author          xificurk
// @id              uniques-heatmap@xificurk
// @name            Unique visits/captures heatmap
// @category        Layer
// @version         0.2.1.20210207.174711
// @namespace       https://github.com/xificurk/iitc-plugins
// @updateURL       https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/xificurk/uniques-heatmap.meta.js
// @downloadURL     https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/xificurk/uniques-heatmap.user.js
// @description     Display heatmap of all portals that the player did NOT visit/capture.
// @issueTracker    https://github.com/xificurk/iitc-plugins/issues
// @homepageURL     https://github.com/xificurk/iitc-plugins
// @preview         https://raw.githubusercontent.com/xificurk/iitc-plugins/master/images/uniques-heatmap-explorer.png
// @include         https://intel.ingress.com/*
// @include         http://intel.ingress.com/*
// @include         https://*.ingress.com/intel*
// @include         http://*.ingress.com/intel*
// @include         https://*.ingress.com/mission/*
// @include         http://*.ingress.com/mission/*
// @match           https://intel.ingress.com/*
// @match           http://intel.ingress.com/*
// @match           https://*.ingress.com/intel*
// @match           http://*.ingress.com/intel*
// @match           https://*.ingress.com/mission/*
// @match           http://*.ingress.com/mission/*
// @grant           none
// ==/UserScript==



function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'xificurk';
plugin_info.dateTimeVersion = '20210207.174711';
plugin_info.pluginId = 'uniques-heatmap';
//END PLUGIN AUTHORS NOTE


//PLUGIN START ////////////////////////////////////////////////////////


//use own namespace for plugin
window.plugin.uniquesHeatmap = function() {};

window.plugin.uniquesHeatmap.original_highlighter = window._no_highlighter;

window.plugin.uniquesHeatmap.HEAT_RADIUS = 60;
window.plugin.uniquesHeatmap.HEAT_BLUR = 90;
window.plugin.uniquesHeatmap.HEAT_MAX_ZOOM = 17;


window.plugin.uniquesHeatmap.hidePortalsHightlighter = {
  highlight: function(data) {
    data.portal.setStyle({
      opacity: 0,
      fillOpacity: 0
    });
  }
}


window.plugin.uniquesHeatmap.updateHeatmap = function(layer) {

  // as this is called every time layers are toggled, there's no point in doing it when the layer is off
  if(!map.hasLayer(layer)) {
    if(window._current_highlighter === 'Hide portals' && !map.hasLayer(window.plugin.uniquesHeatmap.explorerHeatLayer) && !map.hasLayer(window.plugin.uniquesHeatmap.pioneerHeatLayer)) {
      $('#portal_highlight_select').val(window.plugin.uniquesHeatmap.original_highlighter).trigger('change');
    }
    return;
  }

  if(window._current_highlighter !== 'Hide portals') {
    window.plugin.uniquesHeatmap.original_highlighter = window._current_highlighter;
    $('#portal_highlight_select').val('Hide portals').trigger('change');
  }

  var points = [];
  for(var guid in window.portals) {
    var p = window.portals[guid];
    var portalData = p.options.ent[2]
    var uniqueInfo = null;

    if (portalData[18]) {
      uniqueInfo = {
        captured: ((portalData[18] & 0b10) !== 0),
        visited: ((portalData[18] & 0b11) !== 0)
      };
    }

    if(p._map && (!uniqueInfo || !uniqueInfo.visited || (layer === window.plugin.uniquesHeatmap.pioneerHeatLayer && !uniqueInfo.captured))) {
      points.push(p.getLatLng());
    }
  }

  layer.setLatLngs(points);

}


// as calculating heatmap can take some time when there's lots of portals shown, we'll do it on
// a short timer. this way it doesn't get repeated so much
window.plugin.uniquesHeatmap.delayedUpdateHeatmap = function(layer, wait) {
  if(window.plugin.uniquesHeatmap.timer === undefined) {
    window.plugin.uniquesHeatmap.timer = setTimeout(function() {
      window.plugin.uniquesHeatmap.timer = undefined;
      window.plugin.uniquesHeatmap.updateHeatmap(window.plugin.uniquesHeatmap.pioneerHeatLayer);
      window.plugin.uniquesHeatmap.updateHeatmap(window.plugin.uniquesHeatmap.explorerHeatLayer);
    }, wait * 1000);
  }
}


var setup = function() {
  // Load leaflet-heat.js
  // Note: It seems that on mobile the plugin is loaded before leaflet code, so we need to load leaflet-heat.js here in setup.
  /*
 (c) 2014, Vladimir Agafonkin
 simpleheat, a tiny JavaScript library for drawing heatmaps with Canvas
 https://github.com/mourner/simpleheat
*/
!function(){"use strict";function t(i){return this instanceof t?(this._canvas=i="string"==typeof i?document.getElementById(i):i,this._ctx=i.getContext("2d"),this._width=i.width,this._height=i.height,this._max=1,void this.clear()):new t(i)}t.prototype={defaultRadius:25,defaultGradient:{.4:"blue",.6:"cyan",.7:"lime",.8:"yellow",1:"red"},data:function(t,i){return this._data=t,this},max:function(t){return this._max=t,this},add:function(t){return this._data.push(t),this},clear:function(){return this._data=[],this},radius:function(t,i){i=i||15;var a=this._circle=document.createElement("canvas"),s=a.getContext("2d"),e=this._r=t+i;return a.width=a.height=2*e,s.shadowOffsetX=s.shadowOffsetY=200,s.shadowBlur=i,s.shadowColor="black",s.beginPath(),s.arc(e-200,e-200,t,0,2*Math.PI,!0),s.closePath(),s.fill(),this},gradient:function(t){var i=document.createElement("canvas"),a=i.getContext("2d"),s=a.createLinearGradient(0,0,0,256);i.width=1,i.height=256;for(var e in t)s.addColorStop(e,t[e]);return a.fillStyle=s,a.fillRect(0,0,1,256),this._grad=a.getImageData(0,0,1,256).data,this},draw:function(t){this._circle||this.radius(this.defaultRadius),this._grad||this.gradient(this.defaultGradient);var i=this._ctx;i.clearRect(0,0,this._width,this._height);for(var a,s=0,e=this._data.length;e>s;s++)a=this._data[s],i.globalAlpha=Math.max(a[2]/this._max,t||.05),i.drawImage(this._circle,a[0]-this._r,a[1]-this._r);var n=i.getImageData(0,0,this._width,this._height);return this._colorize(n.data,this._grad),i.putImageData(n,0,0),this},_colorize:function(t,i){for(var a,s=3,e=t.length;e>s;s+=4)a=4*t[s],a&&(t[s-3]=i[a],t[s-2]=i[a+1],t[s-1]=i[a+2])}},window.simpleheat=t}(),/*
 (c) 2014, Vladimir Agafonkin
 Leaflet.heat, a tiny and fast heatmap plugin for Leaflet.
 https://github.com/Leaflet/Leaflet.heat
*/
L.HeatLayer=(L.Layer?L.Layer:L.Class).extend({initialize:function(t,i){this._latlngs=t,L.setOptions(this,i)},setLatLngs:function(t){return this._latlngs=t,this.redraw()},addLatLng:function(t){return this._latlngs.push(t),this.redraw()},setOptions:function(t){return L.setOptions(this,t),this._heat&&this._updateOptions(),this.redraw()},redraw:function(){return!this._heat||this._frame||this._map._animating||(this._frame=L.Util.requestAnimFrame(this._redraw,this)),this},onAdd:function(t){this._map=t,this._canvas||this._initCanvas(),t._panes.overlayPane.appendChild(this._canvas),t.on("moveend",this._reset,this),t.options.zoomAnimation&&L.Browser.any3d&&t.on("zoomanim",this._animateZoom,this),this._reset()},onRemove:function(t){t.getPanes().overlayPane.removeChild(this._canvas),t.off("moveend",this._reset,this),t.options.zoomAnimation&&t.off("zoomanim",this._animateZoom,this)},addTo:function(t){return t.addLayer(this),this},_initCanvas:function(){var t=this._canvas=L.DomUtil.create("canvas","leaflet-heatmap-layer leaflet-layer"),i=L.DomUtil.testProp(["transformOrigin","WebkitTransformOrigin","msTransformOrigin"]);t.style[i]="50% 50%";var a=this._map.getSize();t.width=a.x,t.height=a.y;var s=this._map.options.zoomAnimation&&L.Browser.any3d;L.DomUtil.addClass(t,"leaflet-zoom-"+(s?"animated":"hide")),this._heat=simpleheat(t),this._updateOptions()},_updateOptions:function(){this._heat.radius(this.options.radius||this._heat.defaultRadius,this.options.blur),this.options.gradient&&this._heat.gradient(this.options.gradient),this.options.max&&this._heat.max(this.options.max)},_reset:function(){var t=this._map.containerPointToLayerPoint([0,0]);L.DomUtil.setPosition(this._canvas,t);var i=this._map.getSize();this._heat._width!==i.x&&(this._canvas.width=this._heat._width=i.x),this._heat._height!==i.y&&(this._canvas.height=this._heat._height=i.y),this._redraw()},_redraw:function(){var t,i,a,s,e,n,h,o,r,d=[],_=this._heat._r,l=this._map.getSize(),m=new L.Bounds(L.point([-_,-_]),l.add([_,_])),c=void 0===this.options.max?1:this.options.max,u=void 0===this.options.maxZoom?this._map.getMaxZoom():this.options.maxZoom,f=1/Math.pow(2,Math.max(0,Math.min(u-this._map.getZoom(),12))),g=4,p=[],v=this._map._getMapPanePos(),w=v.x%g,y=v.y%g;for(t=0,i=this._latlngs.length;i>t;t++)if(a=this._map.latLngToContainerPoint(this._latlngs[t]),m.contains(a)){e=Math.floor((a.x-w)/g)+2,n=Math.floor((a.y-y)/g)+2;var x=void 0!==this._latlngs[t].alt?this._latlngs[t].alt:void 0!==this._latlngs[t][2]?+this._latlngs[t][2]:1;r=x*f,p[n]=p[n]||[],s=p[n][e],s?(s[0]=(s[0]*s[2]+a.x*r)/(s[2]+r),s[1]=(s[1]*s[2]+a.y*r)/(s[2]+r),s[2]+=r):p[n][e]=[a.x,a.y,r]}for(t=0,i=p.length;i>t;t++)if(p[t])for(h=0,o=p[t].length;o>h;h++)s=p[t][h],s&&d.push([Math.round(s[0]),Math.round(s[1]),Math.min(s[2],c)]);this._heat.data(d).draw(this.options.minOpacity),this._frame=null},_animateZoom:function(t){var i=this._map.getZoomScale(t.zoom),a=this._map._getCenterOffset(t.center)._multiplyBy(-i).subtract(this._map._getMapPanePos());L.DomUtil.setTransform?L.DomUtil.setTransform(this._canvas,a,i):this._canvas.style[L.DomUtil.TRANSFORM]=L.DomUtil.getTranslateString(a)+" scale("+i+")"}}),L.heatLayer=function(t, i){return new L.HeatLayer(t,i)};

  // Fix Heatmap layer z-index
  $("<style>").prop("type", "text/css").html('canvas.leaflet-heatmap-layer {z-index: 1;}').appendTo("head");

  window.addPortalHighlighter('Hide portals', window.plugin.uniquesHeatmap.hidePortalsHightlighter);

  // Pioneer heatmap
  window.plugin.uniquesHeatmap.pioneerHeatLayer = L.heatLayer([], {
    radius: window.plugin.uniquesHeatmap.HEAT_RADIUS,
    blur: window.plugin.uniquesHeatmap.HEAT_BLUR,
    maxZoom: window.plugin.uniquesHeatmap.HEAT_MAX_ZOOM
  });
  window.addLayerGroup('Pioneer heatmap', window.plugin.uniquesHeatmap.pioneerHeatLayer, false);

  // Explorer heatmap
  window.plugin.uniquesHeatmap.explorerHeatLayer = L.heatLayer([], {
    radius: window.plugin.uniquesHeatmap.HEAT_RADIUS,
    blur: window.plugin.uniquesHeatmap.HEAT_BLUR,
    maxZoom: window.plugin.uniquesHeatmap.HEAT_MAX_ZOOM
  });
  window.addLayerGroup('Explorer heatmap', window.plugin.uniquesHeatmap.explorerHeatLayer, false);

  // Update hooks
  window.addHook('requestFinished', function() {
    window.plugin.uniquesHeatmap.delayedUpdateHeatmap(3.0);
  });
  window.addHook('mapDataRefreshEnd', function() {
    window.plugin.uniquesHeatmap.delayedUpdateHeatmap(0.5);
  });
  window.map.on('overlayadd overlayremove', function() {
    window.plugin.uniquesHeatmap.delayedUpdateHeatmap(1.0);
  });

}

//PLUGIN END //////////////////////////////////////////////////////////


setup.info = plugin_info; //add the script info data to the function as a property
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);


