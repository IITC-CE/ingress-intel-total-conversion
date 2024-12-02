// ==UserScript==
// @author         azrael-42
// @id             dronehelper@azrael-42
// @name           Drone Helper
// @category       Misc
// @version        0.5.3.2
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/azrael-42/dronehelper.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/azrael-42/dronehelper.user.js
// @homepageURL    https://github.com/azrael-42/IITC-Drone-Helper/
// @description    Display area drone can "see" from currently selected portal. Manually record if drone has visited portals
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==

/*global $:false */
/*global portals:false */
/*global map:false */
/*global L:false */

"use strict";

function wrapper(plugin_info) {
// this is based on https://github.com/jonatkins/s2-geometry-javascript
// Renamed/Namespaced inside the plugin as I have added some extra functions, and left in window scope it may be overwritten

  /* Some explanatory notes from the original
  // S2 Geometry functions

  // the S2 geometry is based on projecting the earth sphere onto a cube, with some scaling of face coordinates to
  // keep things close to approximate equal area for adjacent cells
  // to convert a lat,lng into a cell id:
  // - convert lat,lng to x,y,z
  // - convert x,y,z into face,u,v
  // - u,v scaled to s,t with quadratic formula
  // - s,t converted to integer i,j offsets
  // - i,j converted to a position along a Hubbert space-filling curve
  // - combine face,position to get the cell id

  //NOTE: compared to the google S2 geometry library, we vary from their code in the following ways
  // - cell IDs: they combine face and the hilbert curve position into a single 64 bit number. this gives efficient space
  //             and speed. javascript doesn't have appropriate data types, and speed is not cricical, so we use
  //             as [face,[bitpair,bitpair,...]] instead
  // - i,j: they always use 30 bits, adjusting as needed. we use 0 to (1<<level)-1 instead
  //        (so GetSizeIJ for a cell is always 1)
   */

  window.dh_S2 = class {
    static LatLngToXYZ = function(latLng) {
      let d2r = Math.PI/180.0;

      let phi = latLng.lat * d2r;
      let theta = latLng.lng * d2r;

      let cosphi = Math.cos(phi);

      return [Math.cos(theta)*cosphi, Math.sin(theta)*cosphi, Math.sin(phi)];
    };

    static XYZToLatLng = function(xyz) {
      let r2d = 180.0 / Math.PI;

      let lat = Math.atan2(xyz[2], Math.sqrt(xyz[0] * xyz[0] + xyz[1] * xyz[1]));
      let lng = Math.atan2(xyz[1], xyz[0]);

      return L.latLng(lat*r2d, lng*r2d);
    };

    static largestAbsComponent = function(xyz) {
      let temp = [Math.abs(xyz[0]), Math.abs(xyz[1]), Math.abs(xyz[2])];

      if (temp[0] > temp[1]) {
        if (temp[0] > temp[2]) {
          return 0;
        } else {
          return 2;
        }
      } else {
        if (temp[1] > temp[2]) {
          return 1;
        } else {
          return 2;
        }
      }

    };

    static faceXYZToUV = function(face,xyz) {
      let u, v;

      switch (face) {
        case 0: u =  xyz[1]/xyz[0]; v =  xyz[2]/xyz[0]; break;
        case 1: u = -xyz[0]/xyz[1]; v =  xyz[2]/xyz[1]; break;
        case 2: u = -xyz[0]/xyz[2]; v = -xyz[1]/xyz[2]; break;
        case 3: u =  xyz[2]/xyz[0]; v =  xyz[1]/xyz[0]; break;
        case 4: u =  xyz[2]/xyz[1]; v = -xyz[0]/xyz[1]; break;
        case 5: u = -xyz[1]/xyz[2]; v = -xyz[0]/xyz[2]; break;
        default: throw {error: 'Invalid face'}; break;
      }

      return [u,v];
    }

    static XYZToFaceUV = function(xyz) {
      let face = dh_S2.largestAbsComponent(xyz);

      if (xyz[face] < 0) {
        face += 3;
      }

      let uv = dh_S2.faceXYZToUV (face,xyz);

      return [face, uv];
    };

    static FaceUVToXYZ = function(face,uv) {
      let u = uv[0];
      let v = uv[1];

      switch (face) {
        case 0: return [ 1, u, v];
        case 1: return [-u, 1, v];
        case 2: return [-u,-v, 1];
        case 3: return [-1,-v,-u];
        case 4: return [ v,-1,-u];
        case 5: return [ v, u,-1];
        default: throw {error: 'Invalid face'};
      }
    };

    static STToUV = function(st) {
      let singleSTtoUV = function (st) {
        if (st >= 0.5) {
          return (1 / 3.0) * (4 * st * st - 1);
        } else {
          return (1 / 3.0) * (1 - (4 * (1 - st) * (1 - st)));
        }
      };

      return [singleSTtoUV(st[0]), singleSTtoUV(st[1])];
    };

    static UVToST = function(uv) {
      let singleUVtoST = function (uv) {
        if (uv >= 0) {
          return 0.5 * Math.sqrt(1 + 3 * uv);
        } else {
          return 1 - 0.5 * Math.sqrt(1 - 3 * uv);
        }
      };

      return [singleUVtoST(uv[0]), singleUVtoST(uv[1])];
    };

    static STToIJ = function(st,order) {
      let maxSize = (1 << order);

      let singleSTtoIJ = function (st) {
        let ij = Math.floor(st * maxSize);
        return Math.max(0, Math.min(maxSize - 1, ij));
      };

      return [singleSTtoIJ(st[0]), singleSTtoIJ(st[1])];
    };

    static IJToST = function(ij,order,offsets) {
      let maxSize = (1 << order);

      return [
        (ij[0]+offsets[0])/maxSize,
        (ij[1]+offsets[1])/maxSize
      ];
    }

// hilbert space-filling curve
// based on http://blog.notdot.net/2009/11/Damn-Cool-Algorithms-Spatial-indexing-with-Quadtrees-and-Hilbert-Curves
// note: rather then calculating the final integer hilbert position, we just return the list of quads
// this ensures no precision issues whth large orders (S3 cell IDs use up to 30), and is more
// convenient for pulling out the individual bits as needed later
    static pointToHilbertQuadList = function(x,y,order) {
      let hilbertMap = {
        'a': [[0, 'd'], [1, 'a'], [3, 'b'], [2, 'a']],
        'b': [[2, 'b'], [1, 'b'], [3, 'a'], [0, 'c']],
        'c': [[2, 'c'], [3, 'd'], [1, 'c'], [0, 'b']],
        'd': [[0, 'a'], [3, 'c'], [1, 'd'], [2, 'd']]
      };

      let currentSquare='a';
      let positions = [];

      for (let i=order-1; i>=0; i--) {

        let mask = 1<<i;

        let quad_x = x&mask ? 1 : 0;
        let quad_y = y&mask ? 1 : 0;

        let t = hilbertMap[currentSquare][quad_x*2+quad_y];

        positions.push(t[0]);

        currentSquare = t[1];
      }

      return positions;
    };

    // S2Cell class

  }

  window.dh_S2.S2Cell = class {
//static method to construct
    static FromLatLng = function(latLng,level) {

      let xyz = dh_S2.LatLngToXYZ(latLng);

      let faceuv = dh_S2.XYZToFaceUV(xyz);
      let st = dh_S2.UVToST(faceuv[1]);

      let ij = dh_S2.STToIJ(st,level);

      return dh_S2.S2Cell.FromFaceIJ (faceuv[0], ij, level);
    };

    static FromFaceIJ = function(face,ij,level) {
      let cell = new dh_S2.S2Cell();
      cell.face = face;
      cell.ij = ij;
      cell.level = level;

      return cell;
    };

    static FromString = function(s2CellString) {
      let regexp = /F(\d)ij\[(\d+),(\d+)\]@(\d+)/;
      let result = regexp.exec(s2CellString);
      let face = parseInt(result[1]);
      let ij = [parseInt(result[2]),parseInt(result[3])];
      let level = parseInt(result[4])

      return dh_S2.S2Cell.FromFaceIJ(face, ij, level);
    }

    toString = function() {
      return 'F'+this.face+'ij['+this.ij[0]+','+this.ij[1]+']@'+this.level;
    };

    getLatLng = function() {
      let st = dh_S2.IJToST(this.ij,this.level, [0.5,0.5]);
      let uv = dh_S2.STToUV(st);
      let xyz = dh_S2.FaceUVToXYZ(this.face, uv);

      return dh_S2.XYZToLatLng(xyz);
    };

    getCornerLatLngs = function() {
      let result = [];
      let offsets = [
        [ 0.0, 0.0 ],
        [ 0.0, 1.0 ],
        [ 1.0, 1.0 ],
        [ 1.0, 0.0 ]
      ];

      for (let i=0; i<4; i++) {
        let st = dh_S2.IJToST(this.ij, this.level, offsets[i]);
        let uv = dh_S2.STToUV(st);
        let xyz = dh_S2.FaceUVToXYZ(this.face, uv);

        result.push ( dh_S2.XYZToLatLng(xyz) );
      }
      return result;
    };

    getFaceAndQuads = function() {
      let quads = dh_S2.pointToHilbertQuadList(this.ij[0], this.ij[1], this.level);

      return [this.face,quads];
    };

    getNeighbors = function() {

      let fromFaceIJWrap = function(face,ij,level) {
        let maxSize = (1<<level);
        if (ij[0]>=0 && ij[1]>=0 && ij[0]<maxSize && ij[1]<maxSize) {
          // no wrapping out of bounds
          return dh_S2.S2Cell.FromFaceIJ(face,ij,level);
        } else {
          // the new i,j are out of range.
          // with the assumption that they're only a little past the borders we can just take the points as
          // just beyond the cube face, project to XYZ, then re-create FaceUV from the XYZ vector

          let st = dh_S2.IJToST(ij,level,[0.5,0.5]);
          let uv = dh_S2.STToUV(st);
          let xyz = dh_S2.FaceUVToXYZ(face,uv);
          let faceuv = dh_S2.XYZToFaceUV(xyz);
          face = faceuv[0];
          uv = faceuv[1];
          st = dh_S2.UVToST(uv);
          ij = dh_S2.STToIJ(st,level);
          return dh_S2.S2Cell.FromFaceIJ (face, ij, level);
        }
      };

      let face = this.face;
      let i = this.ij[0];
      let j = this.ij[1];
      let level = this.level;


      return [
        fromFaceIJWrap(face, [i-1,j], level),
        fromFaceIJWrap(face, [i,j-1], level),
        fromFaceIJWrap(face, [i+1,j], level),
        fromFaceIJWrap(face, [i,j+1], level)
      ];

    };

    equals = function(cell) {
      return this.face === cell.face && this.ij[0] === cell.ij[0] && this.ij[1] === cell.ij[1] && this.level === cell.level;
    }
  }


// ensure plugin framework is there, even if iitc is not yet loaded
  if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN START ////////////////////////////////////////////////////////

  console.log('drone-helper');

  var LZString=function(){function o(o,r){if(!t[o]){t[o]={};for(var n=0;n<o.length;n++)t[o][o.charAt(n)]=n}return t[o][r]}var r=String.fromCharCode,n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",t={},i={compressToBase64:function(o){if(null==o)return"";var r=i._compress(o,6,function(o){return n.charAt(o)});switch(r.length%4){default:case 0:return r;case 1:return r+"===";case 2:return r+"==";case 3:return r+"="}},decompressFromBase64:function(r){return null==r?"":""==r?null:i._decompress(r.length,32,function(e){return o(n,r.charAt(e))})},compressToUTF16:function(o){return null==o?"":i._compress(o,15,function(o){return r(o+32)})+" "},decompressFromUTF16:function(o){return null==o?"":""==o?null:i._decompress(o.length,16384,function(r){return o.charCodeAt(r)-32})},compressToUint8Array:function(o){for(var r=i.compress(o),n=new Uint8Array(2*r.length),e=0,t=r.length;t>e;e++){var s=r.charCodeAt(e);n[2*e]=s>>>8,n[2*e+1]=s%256}return n},decompressFromUint8Array:function(o){if(null===o||void 0===o)return i.decompress(o);for(var n=new Array(o.length/2),e=0,t=n.length;t>e;e++)n[e]=256*o[2*e]+o[2*e+1];var s=[];return n.forEach(function(o){s.push(r(o))}),i.decompress(s.join(""))},compressToEncodedURIComponent:function(o){return null==o?"":i._compress(o,6,function(o){return e.charAt(o)})},decompressFromEncodedURIComponent:function(r){return null==r?"":""==r?null:(r=r.replace(/ /g,"+"),i._decompress(r.length,32,function(n){return o(e,r.charAt(n))}))},compress:function(o){return i._compress(o,16,function(o){return r(o)})},_compress:function(o,r,n){if(null==o)return"";var e,t,i,s={},p={},u="",c="",a="",l=2,f=3,h=2,d=[],m=0,v=0;for(i=0;i<o.length;i+=1)if(u=o.charAt(i),Object.prototype.hasOwnProperty.call(s,u)||(s[u]=f++,p[u]=!0),c=a+u,Object.prototype.hasOwnProperty.call(s,c))a=c;else{if(Object.prototype.hasOwnProperty.call(p,a)){if(a.charCodeAt(0)<256){for(e=0;h>e;e++)m<<=1,v==r-1?(v=0,d.push(n(m)),m=0):v++;for(t=a.charCodeAt(0),e=0;8>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;h>e;e++)m=m<<1|t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=a.charCodeAt(0),e=0;16>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}l--,0==l&&(l=Math.pow(2,h),h++),delete p[a]}else for(t=s[a],e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;l--,0==l&&(l=Math.pow(2,h),h++),s[c]=f++,a=String(u)}if(""!==a){if(Object.prototype.hasOwnProperty.call(p,a)){if(a.charCodeAt(0)<256){for(e=0;h>e;e++)m<<=1,v==r-1?(v=0,d.push(n(m)),m=0):v++;for(t=a.charCodeAt(0),e=0;8>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;h>e;e++)m=m<<1|t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=a.charCodeAt(0),e=0;16>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}l--,0==l&&(l=Math.pow(2,h),h++),delete p[a]}else for(t=s[a],e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;l--,0==l&&(l=Math.pow(2,h),h++)}for(t=2,e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;for(;;){if(m<<=1,v==r-1){d.push(n(m));break}v++}return d.join("")},decompress:function(o){return null==o?"":""==o?null:i._decompress(o.length,32768,function(r){return o.charCodeAt(r)})},_decompress:function(o,n,e){var t,i,s,p,u,c,a,l,f=[],h=4,d=4,m=3,v="",w=[],A={val:e(0),position:n,index:1};for(i=0;3>i;i+=1)f[i]=i;for(p=0,c=Math.pow(2,2),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;switch(t=p){case 0:for(p=0,c=Math.pow(2,8),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;l=r(p);break;case 1:for(p=0,c=Math.pow(2,16),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;l=r(p);break;case 2:return""}for(f[3]=l,s=l,w.push(l);;){if(A.index>o)return"";for(p=0,c=Math.pow(2,m),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;switch(l=p){case 0:for(p=0,c=Math.pow(2,8),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;f[d++]=r(p),l=d-1,h--;break;case 1:for(p=0,c=Math.pow(2,16),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;f[d++]=r(p),l=d-1,h--;break;case 2:return w.join("")}if(0==h&&(h=Math.pow(2,m),m++),f[l])v=f[l];else{if(l!==d)return null;v=s+s.charAt(0)}w.push(v),f[d++]=s+v.charAt(0),h--,s=v,0==h&&(h=Math.pow(2,m),m++)}}};return i}();"function"==typeof define&&define.amd?define(function(){return LZString}):"undefined"!=typeof module&&null!=module&&(module.exports=LZString);

  window.plugin.droneHelper = function() {}
  const self = window.plugin.droneHelper;
  const dh_view = window.plugin.dh_view;
  const dh_visits = window.plugin.dh_visits;
  const dh_route = window.plugin.dh_route;
  const dh_coverage = window.plugin.dh_coverage;

  self.DEBUG = false;
  /**********************************************************************************************************************/
  /** DIMENSIONS etc ****************************************************************************************************/
  /**********************************************************************************************************************/
  self.VISIBLE_RADIUS = 500;
  self.COVERAGE_S2_SIZE = 16;
  self.TRAVEL_WITH_KEY = 1250;

  self.plotReachable = false;

  self.cellStatus = {}; // expected to be 'visible', 'reachable', 'outside'
  self.portalsReachable = {}; // guids - true if used to extend, false if not been visible/reachable yet
  self.portalsToCheck = {};

  self.currentLocation = null;

  self.cellColouring = {
    visible:{stroke:false, fillColor: '#00ffff', fillOpacity: 0.5, interactive: false},
    reachable:{stroke:false, fillColor: '#00ffff', fillOpacity: 0.2, interactive: false},
    outside:{stroke:false, fillColor: '#00ffff', fillOpacity: 0, interactive: false}
  };

  /*
  syncType - 'merge' - requires timestamp, to be held as <key>.t
   */

  window.plugin.dh_sync = class {
    constructor(plugin, pluginName, fieldName, syncType, compress, callback) {
      this.haveChanges = false;
      this.enableSync = false;
      this.SYNC_DELAY = 5000;
      this.pluginName = pluginName;
      this.fieldName = fieldName;
      this.compress = compress;
      this.syncType = syncType;
      this.plugin = plugin;
      this.callback = callback;
      this.localStorageKey = pluginName + '[' + fieldName + ']';

      if (syncType != null) window.addHook('iitcLoaded', this.registerSyncHandler.bind(this));
    }

    //Call after IITC and all plugins loaded
    registerSyncHandler() {
      if(!window.plugin.sync) return;
      window.plugin.sync.registerMapForSync(this.pluginName, this.fieldName, this.syncCallback.bind(this), this.syncInitialised.bind(this));
    }

    // e is null, included for backwards compatibility; either called with no parameters, or fullUpdate is true
    syncCallback(pluginName, fieldName, e, fullUpdate) {
      if (fieldName === this.fieldName) {
        if (this.syncType === 'merge') this.mergeSyncData();
        else this.saveLocal();

        if (this.callback !== null) this.callback();
      }
    }

    mergeSyncData() {
      let newData = this.plugin[this.fieldName];
      this.loadLocal();
      let originalData = this.plugin[this.fieldName];

      // if the portal id is in the sync data, and timestamp is not older than our current data, keep sync data
      for (const id in originalData) {
        if (newData[id] && newData[id].timestamp && !newData[id].t) {
          newData[id].t = newData[id].timestamp;
          delete newData[id].timestamp;
        }
        if (originalData[id].timestamp && !originalData[id].t) {
          originalData[id].t = originalData[id].timestamp;
          delete originalData[id].timestamp;
        }
        if (newData[id] && newData[id].t >= originalData[id].t) {
          originalData[id] = newData[id];
          delete newData[id];
        } else {
          this.haveChanges = true;
        }
      }
      for (const id in newData) {
        originalData[id] = newData[id];
      }
      this.saveLocal();
    }

    // called by sync as signal it is ready to sync, also after every time it checks files for updates
    syncInitialised(pluginName,fieldName) {
      if(fieldName === this.fieldName) {
        this.enableSync = true;
        if(this.haveChanges) {
          this.delaySync();
        }
      }
    }

    delaySync() {
      this.haveChanges = true;
      if(this.syncType === null || !this.enableSync) return;
      clearTimeout(this.delaySync.timer);
      this.delaySync.timer = setTimeout(() => {
        this.delaySync.timer = null;
        this.syncNow();
      }, this.SYNC_DELAY);
    }

    syncNow() {
      if(!this.enableSync) return;
      plugin.sync.updateMap(this.pluginName, this.fieldName, Object.keys(this.plugin[this.fieldName]));
      this.haveChanges = false;
    }

    saveLocal() {
      let value = JSON.stringify(this.plugin[this.fieldName]);
      localStorage[this.localStorageKey] = this.compress ? LZString.compress(value) : value;
    }

    loadLocal() {
      if(localStorage[this.localStorageKey] !== undefined) {
        //storageSettings.key = null;
        // if (this.compress)
        this.plugin[this.fieldName] = JSON.parse(LZString.decompress(localStorage[this.localStorageKey]));
        if (this.plugin[this.fieldName] === null)
          this.plugin[this.fieldName] = JSON.parse(localStorage[this.localStorageKey])
        //if (this.callback !== null) this.callback();
      }
    }

    save() {
      this.saveLocal();
      if (this.syncType !== null) this.delaySync();
    }

    load() {
      this.loadLocal();
    }
  }/**********************************************************************************************************************/
  /** UTILITY FUNCTIONS - used by more than one associate plug-in *******************************************************/
  /**********************************************************************************************************************/
// record keys....
// gets data from:
// Live Inventory (uses inventory information made available to C.O.R.E subscribers): https://github.com/EisFrei/IngressLiveInventory/
// Keys plug-in (uses key counts obtained from user input) - one of standard plug-ins, https://iitc.app/

  window.plugin.dh_utility = {
    portalsWithKeys: {},
    keysPluginTimeout: 400,
    liveInventoryTimeout: 400,

    addNewLayerToIITC: function(label, name) {
      let layer = new L.FeatureGroup();

      window.addLayerGroup(label, layer, true)

      map.on('layeradd', (obj) => {
        if(obj.layer === layer) {
          delete window.plugin[name].disabled;
        }
      });
      map.on('layerremove', (obj) => {
        if(obj.layer === layer) {
          window.plugin[name].disabled = true;
        }
      });

      // ensure 'disabled' flag is initialised
      if (!map.hasLayer(layer)) {
        window.plugin[name].disabled = true;
      }

      return layer;

    },

    uuidv4: function() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },

    isPortalVisible: function(droneLocn, portalLocn) {
      const dist = this.haversineDistance(droneLocn, portalLocn, window.plugin.dh_distance.earthRadius)
      // any portal inside the defining circle will be visible
      if (dist < window.plugin.dh_view.visibilityParams.radius) return true;
      // using dimensions on https://s2geometry.io/resources/s2cell_statistics.html, it looks pretty safe to say no L16 cell will be as large as 200x200, so any portal beyond the 500m circle and the diagonal of a 200mx200m quad will not be visible
      if (dist > Math.sqrt(200*200*2)+window.plugin.dh_view.visibilityParams.radius) return false;

      let visibleCells = this.findCellsCoveringCircle(droneLocn, window.plugin.dh_view.visibilityParams.radius, 16, 'visible');
      let portalCell = dh_S2.S2Cell.FromLatLng(portalLocn, 16);
      return this.cellInArray(portalCell, visibleCells);
    },

    findCellsCoveringCircle: function(centre, radius, cellLevel, type) {
      let emptyCells = [];
      let includedCells = [];
      let cell = dh_S2.S2Cell.FromLatLng(centre, cellLevel);
      let queuedCells = [cell];

      while (queuedCells.length > 0) {
        let nextCell = queuedCells.pop();
        if (this.cellInArray(nextCell,emptyCells)) continue;
        if (this.cellInArray(nextCell,includedCells)) continue;
        nextCell.visible = this.cellContainsCircle(nextCell, centre, radius, type);
        if (nextCell.visible || type !== 'visible')
          includedCells.push(nextCell);
        else
          emptyCells.push(nextCell);
        if (nextCell.visible) {
          let neighbours = nextCell.getNeighbors();
          queuedCells = queuedCells.concat(neighbours);
        }
      }

      return includedCells;
    },

    cellInArray: function(cell, array) {
      for (let i = 0; i < array.length; i++) {
        if (cell.equals(array[i])) return true;
      }
      return false;
    },

    cellContainsCircle: function (cell, centre, radius, type) {
      let corners = cell.getCornerLatLngs();
      // if a corner is in the circle, we know some part of this cell is in the circle
      this.sortByDistance(centre,corners);
      if (this.pointInCircle(corners[0], centre, radius, cell)) return true;
      return this.lineSegmentInsideCircle(centre, radius, corners[0], corners[1], cell);
    },

    sortByDistance: function(comparison, latlngArray) {
      latlngArray.sort((l1,l2) => {
        let d1 = (comparison.lat - l1.lat) * (comparison.lat - l1.lat) + (comparison.lng - l1.lng) * (comparison.lng - l1.lng); //  this.haversineDistance(comparison,l1);//comparison.distanceTo(l1);
        let d2 = (comparison.lat - l2.lat) * (comparison.lat - l2.lat) + (comparison.lng - l2.lng) * (comparison.lng - l2.lng); //  this.haversineDistance(comparison,l2);//comparison.distanceTo(l2);
        if (d1 < d2) return -1;
        if (d1 > d2) return 1;
        return 0;
      })
    },

    pointInCircle: function (point, centre, radius, cell) {
      let d = this.viewDistance(centre, point);//centre.distanceTo([point.lat, point.lng])
      cell.distance = d;
      return (d < radius)
    },

    lineSegmentInsideCircle: function(centre, radius, l1, l2, cell) {
      let c = map.project(centre);
      let p1 = map.project(l1);
      let p2 = map.project(l2);
      let p = L.LineUtil.closestPointOnSegment(c,p1,p2);

      let l = map.unproject(p);

      return this.pointInCircle(l, centre, radius, cell);
    },

// I don't use this method, but at some point want to compare results
    lineSegmentInsideCircle_quartered: function(centre, radius, l1, l2) {
      let half = L.latLng([(l1.lat + l2.lat)/2, (l1.lng + l2.lng)/2]);
      let q1 = L.latLng([(half.lat + l1.lat)/2, (half.lng + l1.lng)/2]);
      let q2 = L.latLng([(half.lat + l2.lat)/2, (half.lng + l2.lng)/2]);

      let x = this.pointInCircle(half, centre, radius);
      let y = this.pointInCircle(l1, centre, radius);
      let z = this.pointInCircle(l2, centre, radius);

      return this.pointInCircle(half, centre, radius) || this.pointInCircle(q1, centre, radius) || this.pointInCircle(q2, centre, radius);
    },

    viewDistance: function(latlng1, latlng2) {
      return this.mercatorDistance(latlng1,latlng2);
    },

// allow changing of radius to match observations of drone journey viewDistance - these appear to be based on polar radius
    haversineDistance: function(latlng1, latlng2, R) {
      if (R === null || R === undefined || R === L.CRS.Earth.R)
        return map.distance(latlng1,latlng2);
      else
        return map.distance(latlng1,latlng2) * R / L.CRS.Earth.R;
    },

// viewDistance based on a point obtained using mercator projection, corrected for latitude using average latitude of both latlngs
    mercatorDistance: function(latlng1, latlng2) {
      let a = L.Projection.SphericalMercator.project(latlng1);
      let b = L.Projection.SphericalMercator.project(latlng2);

      let d = a.distanceTo(b); // cartesian viewDistance between 2 points

      // correction for latitude
      d = d*Math.cos((latlng1.lat+latlng2.lat)/2*Math.PI/180);

      // get rid of excessive decimal places
      // d = Math.round(d * 1000)/1000; // fails at 51.510065,-0.228333
      d = Math.ceil(d * 1000)/1000;

      return d;
    },

    updateKeyOwnership: function() {
      if (self.haveKeysPlugin)
        this.addKeysPluginInfo()
      if (self.haveLiveInventoryPlugin)
        console.log("liveInventory " + this.addLiveInventoryPluginInfo())
    },

    addKeysPluginInfo: function() {
      console.log('trying to change key info')
      let keysChanged = false;
      if (!plugin.keys.keys) {
        this.keysPluginTimeout += 100
        setTimeout(this.addKeysPluginInfo, this.keysPluginTimeout)
      } else {
        this.keysPluginTimeout = 400
        for (const guid in plugin.keys.keys) {
          if (plugin.keys.keys[guid] > 0) {
            if (this.portalsWithKeys[guid]) {
              if (!this.portalsWithKeys[guid].keysPlugin) {
                this.portalsWithKeys[guid].keysPlugin = true
                keysChanged = true;
              }
            } else {
              this.portalsWithKeys[guid] = {keysPlugin: true}
              keysChanged = true;
            }
          }
        }
        for (const guid in this.portalsWithKeys) {
          if (guid == '7aaa86c7f0304c7b8dd2208496084576.16')
            z = 0
          if (this.portalsWithKeys[guid].keysPlugin && !plugin.keys.keys[guid]) {
            this.portalsWithKeys[guid].keysPlugin = false;
            keysChanged = true
          }
        }
        if (keysChanged)
          runHooks('dh_keysChanged', '')
      }
    },

    addLiveInventoryPluginInfo: function() {
      let keysChanged = false;
      if (!plugin.LiveInventory.keyCount) {
        this.liveInventoryTimeout += 100
        setTimeout(window.plugin.dh_utility.addLiveInventoryPluginInfo.bind(this), this.liveInventoryTimeout)
      } else {
        this.liveInventoryTimeout = 400
        const keyCount = plugin.LiveInventory.keyCount;
        keyCount.forEach(portal => {
          if (this.setPortalHasKey(portal.portalCoupler.portalGuid, 'liveInventory'))
            keysChanged = true;
        })
        if (keysChanged)
          runHooks('dh_keysChanged', '')
      }
    },

    getPortalHasKey: function(guid, infoSource) {
      if (this.portalsWithKeys[guid])
        return !!this.portalsWithKeys[guid][infoSource]
      else
        return false
    },

    setPortalHasKey: function(guid, infoSource) {
      if (this.portalsWithKeys[guid]) {
        if (!this.portalsWithKeys[guid][infoSource]) {
          this.portalsWithKeys[guid][infoSource] = true
          return true;
        }
      } else {
        this.portalsWithKeys[guid] = {}
        this.portalsWithKeys[guid][infoSource] = true
        return true;
      }
      return false
    }

  }



  window.plugin.dh_view = {

    circles:{
      outerKey: {radius:1250, color: '#ff0000'}
    },
    cells: {size: 16, drawOptions: {stroke:false, fillColor: '#999999', fillOpacity: 0.4, interactive: false}}, //'#0EC1BB'

    visibilityParams: {radius: 500, cellSize: 16, type: 'cover', distance: 'mercatorDistance', description: 'Standard drone view, L16 cell, 500m circle'},

    settings: {visibilityOption: 'standard'},

    visibilityOptions: {
      standard: {radius: 500, description:'500m circle - standard visibility calculation, works for most devices'},
      lowSpec: {radius:300, description:'300m circle - smaller view area, used for some old/low spec devices'}
    },

    setup: function() {

      this.layer = window.plugin.dh_utility.addNewLayerToIITC('Drone View', 'dh_view')
      window.addHook('portalSelected', this.onPortalSelected.bind(this));

      this.settingsStorageHandler = new window.plugin.dh_sync(this, 'dh_view', 'settings', null, false, null);
      this.settingsStorageHandler.load();

      if (this.visibilityOptions[this.settings.visibilityOption] && this.visibilityOptions[this.settings.visibilityOption].radius)
        this.visibilityParams.radius =  this.visibilityOptions[this.settings.visibilityOption].radius
      else
        this.visibilityOptions[this.settings.visibilityOption].radius= this.visibilityParams.radius;

      this.addViewOptionsToDialog();
      window.runHooks('droneViewSettingsChanged');

    },

    addViewOptionsToDialog() {
      let html = '<div><h4>Drone View Options - reachable portals</h4>';


      for (const type in this.visibilityOptions) {
        html += '<input type="radio" id="dh_vis_' + type + '" name="visRadius" value="' + type + '" onchange="window.plugin.dh_view.changeVisType(this.name, this.value)"';
        if (this.visibilityOptions[type].radius === this.visibilityParams.radius)
          html += ' checked'
        html += '><label for = "dh_vis_' + type + '">' + this.visibilityOptions[type].description + '</label><br>';
      }
      html += '</div>';

      $('#dialog-dh-options').append(html);
    },

    changeVisType(name, value) {
      if (name === 'visRadius') {
        this.visibilityParams.radius = this.visibilityOptions[value].radius;
        this.settings.visibilityOption = value;
      }
      this.settingsStorageHandler.save();
      this.drawDroneView();
      window.runHooks('droneViewSettingsChanged');

    },

    onPortalSelected: function (guid) {
      if (guid === undefined) return;

      let id = guid.selectedPortalGuid;

      let p = portals[id];
      let coords = p.getLatLng();

      this.drawDroneView(coords);
    },

    drawDroneView: function(coords) {
      coords = coords || self.currentLocation || (portals[window.selectedPortal] && portals[window.selectedPortal].getLatLng());
//    coords = coords || self.currentLocation || portals[window.selectedPortal]?.getLatLng();
      if (!coords) { console.log('coords false'); return}
      this.layer.clearLayers();

      // any circles required, e.g. key markers
      for (let circle in this.circles) {
        L.circle(coords, {radius: this.circles[circle].radius, fill: false, color: this.circles[circle].color, interactive: false}).addTo(this.layer);
      }

      // circle to be used for constructing cells controlling visibility
      L.circle(coords, {radius: this.visibilityParams.radius, fill: false, color: '#0EC1BB', interactive: false}).addTo(this.layer);

      let cells = window.plugin.dh_utility.findCellsCoveringCircle(coords, this.visibilityParams.radius, this.visibilityParams.cellSize, this.visibilityParams.type);

      cells.forEach(cell => {
        if (cell.visible) {
          let corners = cell.getCornerLatLngs();
          L.polygon(corners, this.cells.drawOptions).addTo(this.layer);
        }
      })

      let visible = this.findVisiblePortals(cells);
      let oneWay = this.findOneWayJumps(coords,visible);

      this.highlightPortals(visible,oneWay);

      window.plugin.dh_route.layer.bringToFront();
      window.Render.prototype.bringPortalsToFront(); // See IITC code

    },

    highlightPortals(visible,oneWay) {
      const scale = portalMarkerScale();
      //	 portal level		 0	1  2  3  4	5  6  7  8
      const LEVEL_TO_WEIGHT = [2, 2, 2, 2, 2, 3, 3, 4, 4];
      const LEVEL_TO_RADIUS = [7, 7, 7, 7, 8, 8, 9,10,11];
      let styles = {
        oneway: {radius:1,fill:true,color:'#ffffff',weight:1,interactive:false,clickable:false},
        twoway: {}
      }

      for (let guid in visible) {
        let portal = window.portals[guid];
        if (oneWay[guid]) {
          const level = Math.floor(portal["options"]["level"]||0);
          const lvlWeight = LEVEL_TO_WEIGHT[level] * Math.sqrt(scale) + 1;
          const lvlRadius = LEVEL_TO_RADIUS[level] * scale + 3;
          this.layer.addLayer(L.circleMarker(portal._latlng, { radius: lvlRadius, fill: true, color: "red", weight: lvlWeight, interactive: false, clickable: false }));
        } else {
          const level = Math.floor(portal["options"]["level"]||0);
          const lvlWeight = LEVEL_TO_WEIGHT[level] * Math.sqrt(scale) + 1;
          const lvlRadius = LEVEL_TO_RADIUS[level] * scale + 3;
          this.layer.addLayer(L.circleMarker(portal._latlng, { radius: lvlRadius, fill: true, color: "limegreen", weight: lvlWeight, interactive: false, clickable: false }));
        }

      }
    },

    findVisiblePortals(cells) {
      let reachablePortals = {};
      for (guid in window.portals) {
        let testCell = new dh_S2.S2Cell.FromLatLng(window.portals[guid]._latlng, this.visibilityParams.cellSize);
        for (let cell of cells) {
          if (cell.equals(testCell) && cell.visible) {
            reachablePortals[guid] = true;
          }
        }
      }
      return reachablePortals;
    },

    findOneWayJumps(coords,portals) {
      let startCell = new dh_S2.S2Cell.FromLatLng(coords, this.visibilityParams.cellSize);
      let oneWay = {...portals};

      for (guid in portals) {
        if (window.plugin.dh_utility.viewDistance(coords,window.portals[guid]._latlng) < this.visibilityParams.radius) {
          delete oneWay[guid];
          continue;
        }
        if (window.plugin.dh_utility.cellContainsCircle(startCell, window.portals[guid]._latlng, this.visibilityParams.radius, this.visibilityParams.type)) {
          delete oneWay[guid];
        }
      }
      return oneWay;
    }
  };






  window.plugin.dh_visits = {
    lastPortalUri: {uri:''},
    droneVisited: {},

    disabledMessage: null,
    contentHTML: null,

    isHighlightActive: false,

    setup: function() {
      this.visitStorageHandler = new window.plugin.dh_sync(this, 'dh_visits', 'droneVisited', 'merge', true, () => {
        if (window.selectedPortal) {
          this.updateCheckedAndHighlight(window.selectedPortal);
        }
        // and also update all highlights, if needed
        if (this.isHighlightActive) {
          resetHighlightedPortals();
        }
      });
      this.portalUriStorageHandler = new window.plugin.dh_sync(this, 'dh_visits', 'lastPortalUri', 'replace', false, () => {
        this.displayLastPortalLink();
      });

      window.addHook('portalDetailsUpdated', this.onPortalDetailsUpdated.bind(this));
      window.addPortalHighlighter('Drone Visits', window.plugin.dh_visits.highlighter);
      window.addHook('portalSelected', this.onPortalSelected.bind(this));

      this.visitStorageHandler.loadLocal();
      this.portalUriStorageHandler.loadLocal();

      this.contentHTML = '<div id="droneHelper-container" style="color:lightgray">'
        + '<label><input type="checkbox" id="droneVisit" class="droneVisit" onclick="window.plugin.dh_visits.updatePortalVisited($(this).prop(\'checked\'))">Drone Visited</label>'
        + 'Total: <span class="droneTotal"></span>'
        + '</div>';
      this.disabledMessage = '<div id="droneHelper-container" class="help" title="Your browser does not support localStorage">Recording of Drone Visits Disabled</div>';

      $('#dh-toolbox').append('<span style="padding:5px;white-space: nowrap"><a id="lastDroneVisit" href="">Last Drone Visit</a></span> ');
      this.displayLastPortalLink();

      if (window.plugin.droneHelper.isSmart) {
        const status = document.getElementById('updatestatus');
        const dStatus = document.createElement('div');
        dStatus.className = 'DroneStatus';
        status.insertBefore(dStatus, status.firstElementChild);
      }
    },

    onPortalSelected() {
      if (window.plugin.droneHelper.isSmart) {
        document.querySelector('.DroneStatus').innerHTML = this.contentHTML;
      }
    },

    updatePortalVisited(portalVisited, guid) {
      if(guid === undefined) guid = window.selectedPortal;

      if (this.droneVisited[guid] === undefined) this.droneVisited[guid] = {}

      if(portalVisited === this.droneVisited[guid].visited) return;

      this.droneVisited[guid].visited = portalVisited;
      this.droneVisited[guid].t = Date.now();

      this.updateCheckedAndHighlight(guid);
      if (portalVisited) {
        this.lastPortalUri.uri = window.makePermalink(portals[guid]._latlng);
        this.displayLastPortalLink();
      }
      this.sync(guid);
    },

    sync(guid) {
      this.visitStorageHandler.save();
      this.portalUriStorageHandler.save();
    },

    displayLastPortalLink() {
      $('#lastDroneVisit').attr('href', this.lastPortalUri.uri);
    },

    onPortalDetailsUpdated() {
      if(typeof(Storage) === "undefined") {
        $('#dh-visitcount').html(this.disabledMessage);
        return;
      }

      let guid = window.selectedPortal,
        details = portalDetail.get(guid);

      $('#dh-visitcount').html(this.contentHTML);
      //$('#portaldetails > .imgpreview').after(this.contentHTML);
      this.updateCheckedAndHighlight(guid);
    },

    updateCheckedAndHighlight(guid) {
      if (guid === window.selectedPortal) {
        let droneVisited = false;
        if (this.droneVisited[guid] !== undefined) {
          droneVisited = this.droneVisited[guid].visited || false;
        }

        $('.droneVisit').prop('checked', droneVisited);
        $('.droneTotal').text(this.numberVisited());
      }

      if (this.isHighlightActive) {
        if (portals[guid]) {
          window.setMarkerStyle (portals[guid], guid === selectedPortal);
        }
      }
    },

    numberVisited() {
      let count = 0;
      for (const [key,value] of Object.entries(this.droneVisited)) {
        count+= value.visited ? 1 : 0;
      }
      return count;
    },

    highlighter: {
      styles: {visited: {fillColor: 'black', fillOpacity: 0.7},
        unvisited: {fillColor: 'white', fillOpacity: 0.7}},

      highlight: function(data) {
        let guid = data.portal.options.ent[0];
        let droneVisit = window.plugin.dh_visits.droneVisited[guid] ? window.plugin.dh_visits.droneVisited[guid].visited : false;

        let style;

        if (droneVisit) {
          style = this.styles.visited;
        } else {
          style = this.styles.unvisited;
        }

        data.portal.setStyle(style);
      },

      setSelected: function(active) {
        window.plugin.dh_visits.isHighlightActive = active;
      }
    }

  }


  window.plugin.dh_route = {
    currentRoute: {route:[]},
    savedRoutes: {},

    settings: { colourJumps: true, useLiveInventoryKeys: true, useKeysPluginKeys: true,
      keyboardShortcuts: { addPortal: 'd', showRoute: 'r' },
    },

    jumpColours: {tooLong: '#ff0000', needsKey: '#ff9900', usesOwnedKey: '#CDEF0D', normalJump: '#008306'},


    setup() {
      this.currentRouteStorageHandler = new window.plugin.dh_sync(this, 'dh_route', 'currentRoute', 'replace', true, () => {
        $('#drone-jump-list').html(this.jumpListHtml());
        this.drawRoute();
      });
      this.savedRoutesStorageHandler = new window.plugin.dh_sync(this, 'dh_route', 'savedRoutes', null, true, null);
      this.settingsStorageHandler = new window.plugin.dh_sync(this, 'dh_route', 'settings', null, false, null);

      this.layer = window.plugin.dh_utility.addNewLayerToIITC('Drone Route', 'dh_route');
      window.addHook('portalDetailsUpdated', this.onPortalDetailsUpdated.bind(this));
      window.addHook('dh_keysChanged', this.drawRoute.bind(this));

      this.addKeyboardShortcuts();
      this.currentRouteStorageHandler.loadLocal();
      this.savedRoutesStorageHandler.loadLocal();
      this.settingsStorageHandler.loadLocal();
      this.drawRoute();
      this.addRouteOptionsToDialog();
      this.addRouteViewLink();

    },

    addRouteOptionsToDialog() {
      let html = '<h4 style="margin-bottom:0;">Drone Route Options</h4>' +
        '<div><label><input type="checkbox" name="colourJumps" '+(this.settings.colourJumps ? 'checked' : '')+' onchange="window.plugin.dh_route.toggleSettings(this.name)" />Colour route - within range/needs key/need more hops</label></div>'
      if (self.haveLiveInventoryPlugin)
        html += '<div><label><input type="checkbox" name="useLiveInventoryKeys" '+(this.settings.useLiveInventoryKeys ? 'checked' : '')+' onchange="window.plugin.dh_route.toggleSettings(this.name)" />Change colour if LiveInventory shows a required key is owned</label></div>'
      if (self.haveKeysPlugin)
        html += '<div><label><input type="checkbox" name="useKeysPluginKeys" '+(this.settings.useKeysPluginKeys ? 'checked' : '')+' onchange="window.plugin.dh_route.toggleSettings(this.name)" />Change Colour if Key Plug-in shows a key is owned</label></div>'
      html += '<div>Keyboard shortcuts<br>' +
        '<div><label><input name="addPortal" value="'+this.settings.keyboardShortcuts['addPortal']+'" size="1" maxlength="1" onchange="window.plugin.dh_route.updateKeyboardShortcut(this.name, this.value)" />Add portal to current route</label></div>' +
        '<div><label><input name="showRoute" value="'+this.settings.keyboardShortcuts['showRoute']+'" size="1" maxlength="1" onchange="window.plugin.dh_route.updateKeyboardShortcut(this.name, this.value)" />Show routes</label></div>' +
        '</div>';

      $('#dialog-dh-options').append(html);
    },

    addRouteViewLink() {
      $('#dh-toolbox').append('<span style="padding:5px;white-space: nowrap"><a id="dh-route-show" onclick="window.plugin.dh_route.showJumpList()">Show Routes</a></span>');
    },

    updateKeyboardShortcut(name, value) {
      this.settings.keyboardShortcuts[name] = value;
      this.settingsStorageHandler.save();
    },

    toggleSettings(name) {
      this.settings[name] = !this.settings[name];
      this.settingsStorageHandler.save();
      if (name === 'colourJumps') this.currentRouteChanged();
      if (name === 'useLiveInventoryKeys') this.currentRouteChanged();
      if (name === 'useKeysPluginKeys') this.currentRouteChanged();

    },

    addKeyboardShortcuts() {
      //document.addEventListener,map.addEventListener,this.layer.addEventListener

      map.on('keyup', (e) => {
        if (e.originalEvent.key === this.settings.keyboardShortcuts.addPortal) { this.addToRoute(window.selectedPortal); }
        if (e.originalEvent.key === this.settings.keyboardShortcuts.showRoute) { this.showJumpList(); }
      }, false);
    },

    onPortalDetailsUpdated() {
      if (this.disabled) return;
      let guid = window.selectedPortal;
      let html = '<span class="routeAdd" style="padding:5px;white-space: nowrap"><a onclick="window.plugin.dh_route.addToRoute(\''+guid+'\')">Add to route</a></span>';

      $('#dh-portal-info .routeAdd').remove();
      $('#dh-portal-info').append(html);
    },

    addToRoute(guid) {
      if (this.disabled) return;
      if(guid === undefined) guid = window.selectedPortal;
      if(guid === undefined) return;

      let nextPortal = {guid:guid, _latlng: portals[guid]._latlng, label: portals[guid].options.data.title};
      this.currentRoute.route.push(nextPortal);
      this.currentRouteChanged();
    },

    drawRoute() {
      this.layer.clearLayers();
      if (this.currentRoute.route.length > 0) {
        L.marker(this.currentRoute.route[0]._latlng, {
          icon: L.divIcon.coloredSvg('#888'), draggable: false, title: 'Route start'
        }).addTo(this.layer);
      }
      if (this.currentRoute.route.length > 1) {
        L.marker(this.currentRoute.route[this.currentRoute.route.length - 1]._latlng, {
          icon: L.divIcon.coloredSvg('#888'), draggable: false, title: 'Route end'
        }).addTo(this.layer);
      }
      for(let i = 1; i < this.currentRoute.route.length; i++) {
        this.drawJump(this.currentRoute.route[i-1],this.currentRoute.route[i]);
      }
    },

    drawJump(startPortal, endPortal) {
      let coords = [startPortal._latlng, endPortal._latlng];
      let colour = "#888";
      if (this.settings.colourJumps) {
        if (window.plugin.dh_utility.haversineDistance(startPortal._latlng, endPortal._latlng, window.plugin.dh_distance.earthRadius) > 1250)
          colour = this.jumpColours.tooLong;
        else if (window.plugin.dh_utility.isPortalVisible(startPortal._latlng, endPortal._latlng))
          colour = this.jumpColours.normalJump;
        else if ((this.settings.useLiveInventoryKeys && window.plugin.dh_utility.getPortalHasKey(endPortal.guid, 'liveInventory')) || (this.settings.useKeysPluginKeys && window.plugin.dh_utility.getPortalHasKey(endPortal.guid, 'keysPlugin'))) {
          colour = this.jumpColours.usesOwnedKey;
        } else {
          colour = this.jumpColours.needsKey;
        }
      }

      L.polyline(coords, {color: colour, weight:3, opacity:1, dashArray:[20,6,15,6,10,6,5,6], clickable: false}).addTo(this.layer);
    },

    showJumpList() {

      let html = '<div>';
      html += '<table><thead><tr><th>Portal Name</th></tr></thead><tbody id="drone-jump-list">';

      html +='</tbody></table>';
      html += '<div class="jump-count">Total jumps: ' + Math.max(0,(this.currentRoute.route.length - 1)) + '</div>';

      //html += '<button type="button" onclick="window.plugin.dh_route.loadRoute()">Load Route</button>'
      html += '<button type="button" onclick="window.plugin.dh_route.saveRoute()">Save Route</button>'
      html += '<button type="button" onclick="window.plugin.dh_route.manageRoutes()">Manage Routes</button>'
      html += '<button type="button" onclick="window.plugin.dh_route.clearRoute()">Clear Route</button>'
      html += '</div>';

      dialog({
        id:'drone-jump-box',
        html: html,
        title: 'Drone Jumps',
        position: {my: "left top", at: "left+10% top"}
        /*buttons: {
          'Clear Route': function() {
            window.plugin.dh_route.clearRoute();
          }
        }*/
      })

      $('#drone-jump-list').sortable({
        axis:'y',
        update: this.changePortalOrder.bind(this)
      });

      // add jump list after making dialog as soooo much faster!!!
      $('#drone-jump-list').html(this.jumpListHtml());

    },

    jumpListHtml() {
      let html = '';
      if (this.currentRoute.route.length === 0) {
        html += '<tr><td colspan="2">No portals in route</td></tr>';
        return html;
      }
      for (let i=0;i<this.currentRoute.route.length;i++)
      {
        let portal = this.currentRoute.route[i];
        if (!this.currentRoute.route[i].label)
          this.currentRoute.route[i].label = portals[portal.guid] ? portals[portal.guid].options.data.title : null;

        let portalName =this.currentRoute.route[i].label ? this.currentRoute.route[i].label : '&lt;portal not loaded&gt;';

        let portalLink = '<a href="?pll='+portal._latlng['lat']+','+portal._latlng['lng'] + '">'+portalName+'</a>';
        portalLink = '<a onclick="window.zoomToAndShowPortal(\'' + portal.guid +'\', ['+portal._latlng['lat']+','+portal._latlng['lng']+'])">'+portalName+'</a>';

        html +='<tr id="drone-jump-'+ i +'"><td style="cursor:grab;">'+portalLink+'</td>';
        //html +='<td><span class="ui-sortable-handle" style="cursor:move;">=</span></td>';
        html +='<td><a onclick="window.plugin.dh_route.deletePortal('+i+');return false;">X</a></td></tr>';
      }
      return html;
    },

    deletePortal(routeStep) {
      this.currentRoute.route.splice(routeStep,1);
      this.currentRouteChanged();
    },

    clearRoute() {
      let confirmClear = confirm('Current route will be deleted across all synced devices. Are you sure?');
      if (confirmClear) {
        this.currentRoute.route = [];
        this.currentRouteChanged();
      }

    },

    clearSavedRoutes() {
      let confirmClear = confirm('This deletes all your saved routes. Are you sure?');
      if (confirmClear) {
        this.savedRoutes = {};
        this.routesChanged();
      }

    },

    saveRoute() {
      let routeName = prompt('Name for this route:', new Date().toLocaleString());
      let routeId = window.plugin.dh_utility.uuidv4();
      this.savedRoutes[routeId] = {name: routeName, route:this.currentRoute.route};
      this.routesChanged();
    },

    loadRoute(id) {
      let confirmLoad = confirm('Current route will be replaced. Are you sure?');
      if (confirmLoad) {
        this.currentRoute.route = this.savedRoutes[id].route;
        this.currentRouteChanged();
      }
    },

    manageRoutes() {
      let html = '<div><table><thead><tr><th>Route Name</th></tr></thead><tbody id="drone-route-list">';
      html += this.routeListHtml();
      html += '</tbody></table>';
      html += '<button type="button" onclick="window.plugin.dh_route.loadJSON()">Import JSON</button>'
      html += '<button type="button" onclick="window.plugin.dh_route.clearSavedRoutes()">Clear Saved Routes</button>'
      html += '</div>';

      dialog({
        id:'drone-route-box',
        html: html,
        title: 'Drone Routes',
        /*buttons: {
          'Clear Saved Routes': function() {
            window.plugin.dh_route.clearSavedRoutes();
          }
        }*/
      })
    },

    routeListHtml() {
      let html = '';
      for (const id of Object.keys(this.savedRoutes)) {
        html +='<tr><td><a onclick="window.plugin.dh_route.loadRoute(\''+id+'\');return false;">'+this.savedRoutes[id].name+'</a></td>';
        html +='<td><a onclick="window.plugin.dh_route.saveJSON(\''+id+'\');return false;">Export JSON</a></td></tr>';
        html +='<td><a onclick="window.plugin.dh_route.deleteRoute(\''+id+'\');return false;">X</a></td></tr>';
      }

      return html;
    },

    deleteRoute(id) {
      const confirmDelete = confirm('Delete route '+ this.savedRoutes[id].name +' - are you sure?');
      if (confirmDelete) {
        delete this.savedRoutes[id];
        this.routesChanged();
      }
    },

    saveJSON(id) {
      const routeName = this.savedRoutes[id].name + '.json';
      const json = JSON.stringify({"id": id,name: this.savedRoutes[id].name, route: this.savedRoutes[id].route });
      if (typeof window.saveFile != 'undefined') {
        window.saveFile(json, routeName, 'application/json');
      } else {
        alert('cannot export route - browser compatibility issue');
      }
    },

    loadJSON() {
      if (typeof L.FileListLoader != 'undefined') {
        L.FileListLoader.loadFiles({accept: 'application/json'})
          .on('load', e => {
            let route,guid;
            const data = JSON.parse(e.reader.result);
            if ('id' in data && 'name' in data && 'route' in data) {
              let valid = true;
              guid = data.id
              route = {name: data.name, route:[]};
              for (const id of Object.keys(data.route)) {
                if ('guid' in data.route[id] && '_latlng' in data.route[id] && 'lat' in data.route[id]._latlng && 'lng' in data.route[id]._latlng) {
                  route.route[id] = data.route[id];
                } else valid = false;
              }
              if (!valid) return alert("Invalid route import");
            }

            this.savedRoutes[window.plugin.dh_utility.uuidv4()] = route;
            this.routesChanged();

          });
      }
    },

    // context for 'this' is provided by jQuery
    changePortalOrder(e, ui) {
      let newOrder = [];
      $('#drone-jump-list tr').each(function() {
        let id = $(this).attr('id').split('-')[2];
        newOrder.push(window.plugin.dh_route.currentRoute.route[id]);
      })
      window.plugin.dh_route.currentRoute.route = newOrder;
      window.plugin.dh_route.currentRouteChanged();
    },

    currentRouteChanged() {
      $('#drone-jump-list').html(this.jumpListHtml());
      $('.jump-count').text('Total jumps: ' + Math.max(0,(this.currentRoute.route.length - 1)));
      this.drawRoute();
      this.currentRouteStorageHandler.save();
    },

    routesChanged() {
      $('#drone-route-list').html(this.routeListHtml());
      this.savedRoutesStorageHandler.save();
    },

  }
  window.plugin.dh_coverage = {
    default_cellColouring: {
      visible:{stroke:false, fillColor: '#00ffff', fillOpacity: 0.5, interactive: false},
      reachable:{stroke:false, fillColor: '#ff0000', fillOpacity: 0.3, interactive: false},
      visited:{stroke:false, fillColor: '#0ec18d', fillOpacity: 0.2, interactive: false},
      outside:{stroke:false, fillColor: '#00ffff', fillOpacity: 0, interactive: false}
    },


    settings: {
      extendByKeysPlugin: true,
      extendByLiveInventoryPlugin: true,
      assumeKeys: false,
      cellColouring: {
        visible:{stroke:false, fillColor: '#00ffff', fillOpacity: 0.5, interactive: false, labelText:'Cells where all portals are visible in drone view'},
        reachable:{stroke:false, fillColor: '#ff0000', fillOpacity: 0.3, interactive: false, labelText:'Cells where all portals can be reached with multiple drone moves'},
        visited:{stroke:false, fillColor: '#0ec18d', fillOpacity: 0.2, interactive: false, labelText:'Cells that can be reached and all portals have been visited'},
        outside:{stroke:false, fillColor: '#00ffff', fillOpacity: 0, interactive: false}
      },

    },

    plotReachable: false,

    setup: function() {
      this.layer = window.plugin.dh_utility.addNewLayerToIITC('Drone Coverage', 'dh_coverage');
      map.on('layeradd', (obj) => {
        if(obj.layer === this.layer) {
          $('.leaflet-control-droneHelper').show();
        }
      });
      map.on('layerremove', (obj) => {
        if(obj.layer === this.layer) {
          $('.leaflet-control-droneHelper').hide();
        }
      });

      window.addHook('mapDataRefreshEnd', this.mapDataRefreshEnd.bind(this));
      window.addHook('pluginKeysUpdateKey', this.keyUpdate.bind(this));
      window.addHook('pluginKeysRefreshAll', this.refreshAllKeys.bind(this));

      this.settingsStorageHandler = new window.plugin.dh_sync(this, 'dh_coverage', 'settings', null, false, null);

      this.settingsStorageHandler.load();

      this.addCoverageOptionsToDialog();
      this.addLeafletControl();

      if (!self.haveKeysPlugin) this.settings.extendByKeysPlugin = false;
      if (!self.haveLiveInventoryPlugin) this.settings.extendByLiveInventoryPlugin = false;
      this.assumeKeys = false;
    },

    addCoverageOptionsToDialog() {
      let html = '<div><h4 style="margin-bottom:0;">Drone Coverage Options</h4>';
      if (self.haveLiveInventoryPlugin)
        html += '<div><label><input type="checkbox" name="extendByLiveInventoryPlugin" '+(this.settings.extendByLiveInventoryPlugin ? 'checked' : '')+' onchange="window.plugin.dh_coverage.toggleSettings(this.name)" />Use LiveInventory key info to extend coverage</label></div>';
      if (self.haveKeysPlugin)
        html += '<div><label><input type="checkbox" name="extendByKeysPlugin" '+(this.settings.extendByKeysPlugin ? 'checked' : '')+' onchange="window.plugin.dh_coverage.toggleSettings(this.name)" />Use Key Plug-in info to extend coverage</label></div>';
      html += '<div><label><input type="checkbox" name="assumeKeys" '+(this.settings.assumeKeys ? 'checked' : '')+' onchange="window.plugin.dh_coverage.toggleSettings(this.name)" />Assume keys are available to extend coverage. WARNING! runs slowly</label></div>';
      for (const cellType in this.settings.cellColouring) {
        if (cellType !== 'outside')
          html += '<div><label><input type="color" name="coverage-'+ cellType +'" value="'+this.settings.cellColouring[cellType].fillColor+'" onchange="window.plugin.dh_coverage.updateColour(this.name, this.value)" />'+ this.settings.cellColouring[cellType].labelText +'</label></div>';
      }
      html += '</div>';
      $('#dialog-dh-options').append(html);
    },

    updateColour (name, colour) {
      this.settings.cellColouring[name.split('-')[1]].fillColor = colour;
      this.settingsStorageHandler.save();
      this.drawReachable();
    },

    updateSettings(name, value) {
      this[name] = value;
      this.settingsStorageHandler.save();
    },

    toggleSettings(name) {
      this.settings[name] = !this.settings[name];
      if (this.plotReachable) {
        if (name === 'extendByKeysPlugin' || name === 'extendByLiveInventoryPlugin' || name === 'assumeKeys') {
          if (!this.settings[name] && confirm('Restart coverage without keys (select OK) or leave any jumps relying on keys in the coverage?')) {
            this.startCoverage(this.currentLocation);
          } else {
            if (this.settings[name]) {
              this.updateReachable(portals);
              this.keyCheck();
              this.drawReachable();
            }
          }
        }
      }
      this.settingsStorageHandler.save();
    },

    addLeafletControl: function() {
      $('<style>').prop('type', 'text/css').html(`
    .leaflet-control-droneHelper a {
      background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACy0lEQVQ4TyWTy2ucBRTFf+d+kzTNSDA1TlU0BIyKD2iJpSlqyKRUTMUHUhUEF65FQVzaLgLif6A0KxeVrhTd2G6cQKEJVRe+aKrWZ4sh6GiqadrpZGbukS/Z3/u79557jibqT4wXRTxb9Ji2qCLWnG5Q7Pzoy4VP1gBNTR2+pd3nQ6ReRBoO+6rxD1kpjmtyZvZVQnvco4n0n5xDgjG7eH+jNrg0urGhf264jng+rJahSXonirtMLmry4OwHwDLpESJ24fwNYszm116l8y5A0e17DbFbog3aTeYKUgtzQJMHD58mfQLrcQXTNhdRnkvHrsqOfLsEZCfecs9/KmIaeTSThShYcjKn/TNPzsveKOkJjwnfZPOVxHXIExkRkbxSgoB9ti4TWg6SdNyv/dOzzyEdEaxaDptaiH04mpbPB+o33gOS8d+CL0A3oxy29LEerj89UtHmo6K4O6HITIrgDdAA1rJKKDwEXBFasP19uYrgjyw2G8JWfWameq1SrYVzIHE1UseBccGnZbHhKZmLLnSUTa9YldZQf2ut0WhcVQmr1+vVbqVa6zgH3NOg5HngAeFLEBiPCn8D8SaF1nvQrnYH/zpz5sNrWyf0qfMIxHgpC46W5GNADdHBBFAxXA70nuTsmX6hH4u+7rltEUNHZFYd3lAygPTMtuj6qWwG3wdsgho4V1HcjnPIis9KJ86buF6OQb7HyQ7DLxKR0skiyy92X5aUhnsFl8AroA7owS0jZXIy5BdAezFfCz5PqVb0995ZX4fqgI6GuZLSIVmjyGcTnQr72LaVzQXgTuC2TJ0vCt+RWfzeq7S3rNyXldcx44YbRuPgCyjWsKe2w4T2Cpo9qxXKwTIo9LQVplubzWgXg/VMv4RZA22gLLYz4Z91oD471hMTgUak8uWQqdX+rpYWF0/9Ozc3p9Nnvx0W7Ql1PeZAthWiKfu7/wFXEGoSMPuwVgAAAABJRU5ErkJggg==);
    }
    .leaflet-control-droneHelper-tooltip {
      background-color: rgba(255, 255, 255, 0.6);
      display: none;
      height: 24px;
      left: 30px;
      line-height: 24px;
      margin-left: 15px;
      margin-top: -12px;
      padding: 0 10px;
      position: absolute;
      top: 50%;
      white-space: nowrap;
      width: auto;
    }
    .leaflet-control-droneHelper a.active .leaflet-control-droneHelper-tooltip {
      display: block;
    }
    .leaflet-control-droneHelper-tooltip:before {
      border-color: transparent rgba(255, 255, 255, 0.6);
      border-style: solid;
      border-width: 12px 12px 12px 0;
      content: "";
      display: block;
      height: 0;
      left: -12px;
      position: absolute;
      width: 0;
    }
  `).appendTo('head');
      let parent = $(".leaflet-top.leaflet-left", window.map.getContainer());

      let button = document.createElement("a");
      button.className = "leaflet-bar-part";
      button.addEventListener("click", this.onBtnClick.bind(this), false);
      button.title = 'Choose drone start location';

      let tooltip = document.createElement("div");
      tooltip.className = "leaflet-control-droneHelper-tooltip";
      button.appendChild(tooltip);

      let container = document.createElement("div");
      container.className = "leaflet-control-droneHelper leaflet-bar leaflet-control";
      container.appendChild(button);
      parent.append(container);

      this.button = button;
      this.tooltip = tooltip;
      this.container = container;

      if (!this.layer._map) $('.leaflet-control-droneHelper').hide();
    },

    mapDataRefreshEnd: function() {
      const t0 = performance.now();
      if (!this.plotReachable) {
        return;
      }

      this.portalsWithKeys = {};
      this.updateReachable(portals);
      this.keyCheck();
      this.drawReachable();
      const t1 = performance.now();
      console.log('coverage update:',Object.entries(portals).length,' ', t1-t0);
    },

    onBtnClick: function() {
      if (this.button.classList.contains("active")) {
        //map.off("click", self.selectStartPoint);
        this.button.classList.remove("active");
        map.removeLayer(this.currentLocationMarker);
        this.layer.clearLayers();
        this.currentLocation = null;
        this.plotReachable = false;
        return;
      }
      //map.on("click", self.selectStartPoint);
      this.button.classList.add("active");
      setTimeout( () => {
        this.tooltip.textContent = "Drag marker to start point, click marker to start";
      }, 10);
      if (window.selectedPortal) {
        this.currentLocation = portals[window.selectedPortal].getLatLng();
      } else {
        this.currentLocation = map.getCenter();
      }
      this.currentLocationMarker = L.marker(this.currentLocation, {
        icon: L.divIcon.coloredSvg('#0ff'), draggable: true, title: 'Drag to change drone start point'
      });
      this.currentLocationMarker.on('drag', (e) => {
        this.plotReachable = false;
        this.currentLocation = this.currentLocationMarker.getLatLng();
        localStorage['plugin-droneHelper-currentLocation'] = JSON.stringify(this.currentLocation);
      })
      this.currentLocationMarker.on('mouseup', (e) => {
        this.plotReachable = true;
        this.currentLocation = this.currentLocationMarker.getLatLng();
        localStorage['plugin-droneHelper-currentLocation'] = JSON.stringify(this.currentLocation);//{lat:window.plugin.distanceToPortal.currentLoc.lat, lng:window.plugin.distanceToPortal.currentLoc.lng});
        this.startCoverage(this.currentLocation);
      })
      map.addLayer(this.currentLocationMarker);
    },

    startCoverage: function(coords) {
      let visParams = window.plugin.dh_view.visibilityParams;

      this.cellStatus = {}; // expected to be 'visible', 'reachable', 'outside'
      this.portalsWithKeys = {}; // guids - true if key plugin say we have a key for the portal

      let cells = window.plugin.dh_utility.findCellsCoveringCircle(coords, visParams.radius, visParams.cellSize, visParams.type);

      cells.forEach(cell => {
        let corners = cell.getCornerLatLngs();
        L.polygon(corners, this.settings.cellColouring['visible']).addTo(this.layer);
        if (cell.visible) {
          this.addNewCell(cell.toString(), 'visible');
        }
      })
      window.Render.prototype.bringPortalsToFront(); // See IITC code

      this.updateReachable(portals);
      this.keyCheck();
      this.drawReachable(coords);

    },

    addPortalToCell(cellString, guid, _latlng) {
      // cell is undefined - make it ready
      if (this.cellStatus[cellString] === undefined)
        this.addNewCell(cellString, 'outside');

      this.cellStatus[cellString].portals[guid] = {_latlng:_latlng};
    },

    addNewCell(cellString, status) {
      this.cellStatus[cellString] = {coverage: status, portals: {}};
    },

    updateReachable: function(portalList) {
      let {cellSize, radius, type} = window.plugin.dh_view.visibilityParams;

      for (const [key, value] of Object.entries(portalList)) {

        let cellString = dh_S2.S2Cell.FromLatLng(value._latlng, 16).toString();

        this.addPortalToCell(cellString,key,value._latlng);

        if (this.cellStatus[cellString].coverage === 'outside') {
          // if we have access to key data, add a portal we have keys for to the list
          if ((this.settings.extendByLiveInventoryPlugin && window.plugin.dh_utility.getPortalHasKey(key,'liveInventory')) || (this.settings.extendByKeysPlugin && window.plugin.dh_utility.getPortalHasKey(key,'keysPlugin')) || this.settings.assumeKeys) {
            this.portalsWithKeys[key] = value;
          }
          continue;
        }

        if (self.DEBUG) self.compareCoverage(value._latlng)

        let newCells = window.plugin.dh_utility.findCellsCoveringCircle(value._latlng, radius, cellSize, type);
        newCells.forEach(cell => {
          if (cell.visible) {
            let cellString = cell.toString();
            if (this.cellStatus[cellString] === undefined) {
              this.addNewCell(cellString, 'reachable');
            }
            if (this.cellStatus[cellString].coverage === 'outside') {
              this.cellStatus[cellString].coverage = 'reachable';
              this.updateReachable(this.cellStatus[cellString].portals);
            }
          }
        })
      }
    },

    keyCheck() {
      if (!(this.settings.extendByKeysPlugin || this.settings.extendByLiveInventoryPlugin || this.settings.assumeKeys)) return;

      const visParams = window.plugin.dh_view.visibilityParams;
      let changed = true;
      while (changed) {
        changed = false
        for (const guid in this.portalsWithKeys) {
          let currentCell = this.cellIdentifierFromLatLng(this.portalsWithKeys[guid]._latlng, visParams.cellSize);
          if (this.cellStatus[currentCell].coverage === 'visible' || this.cellStatus[currentCell].coverage === 'reachable') delete this.portalsWithKeys[guid];
          if (this.cellStatus[currentCell].coverage === 'outside' && this.portalCanBeReachedByKeyJump(this.portalsWithKeys[guid]._latlng)) {
            this.cellStatus[currentCell].coverage = 'reachable';
            this.updateReachable(this.cellStatus[currentCell].portals);
            changed = true;
          }
        }
      }
    },

    portalCanBeReachedByKeyJump(portalLatLng) {
      let currentCell = this.cellIdentifierFromLatLng(portalLatLng, 16);
      if (this.cellStatus[currentCell].coverage !== 'outside') return false;

      // this will be any cells that could contain portals a key viewDistance jump away - we could get a few extra portals, but there shouldn't be too many
      let keyReachableCells = window.plugin.dh_utility.findCellsCoveringCircle(portalLatLng, 1250, 16, 'cover');
      for (const cell of keyReachableCells) {
        // ignore any cells not tagged as visible, as these are neighbours beyond the 1250m
        if (!cell.visible) continue;

        let testCell = cell.toString();

        // if the cell is unknown so far, or known to be outside, there is no benefit to being able to jump from it
        if (!this.cellStatus[testCell] || this.cellStatus[testCell].coverage === 'outside') continue;

        for (const [guid,portal] of Object.entries(this.cellStatus[testCell].portals)) {
          const dist = window.plugin.dh_utility.haversineDistance(portalLatLng, portal._latlng);
          if (dist < 1250) { //if (portalLatLng.distanceTo(portal._latlng) < 1250) {
            this.cellStatus[currentCell].coverage = 'reachable';
            return true;
          }
        }
      }
      return false;
    },

    cellIdentifierFromLatLng: function(latlng, level) {
      return dh_S2.S2Cell.FromLatLng(latlng, level).toString()
    },

    drawReachable: function(coords) {
      coords = coords || this.currentLocation || portals[window.selectedPortal].getLatLng();
      this.layer.clearLayers();

      // coverage circle
      L.circle(coords, {radius: window.plugin.dh_view.visibilityParams.radius, fill: false, color: "#0000ff", clickable: false}).addTo(this.layer);
      //self.addDroneCircle(coords);
      // key circle
      L.circle(coords, {radius: self.TRAVEL_WITH_KEY, fill: false, color: "#ff0000", clickable: false}).addTo(this.layer);

      for (const [key,value] of Object.entries(this.cellStatus)) {
        if (this.cellStatus === 'outside')
          continue;
        let cell = dh_S2.S2Cell.FromString(key);
        let corners = cell.getCornerLatLngs();
        if (value.coverage === 'reachable' && this.portalsAllVisited(value.portals))
          L.polygon(corners, this.settings.cellColouring['visited']).addTo(this.layer);
        else
          L.polygon(corners, this.settings.cellColouring[value.coverage]).addTo(this.layer);
      }
      window.plugin.dh_route.layer.bringToFront();
      window.Render.prototype.bringPortalsToFront(); // See IITC code

    },

    portalsAllVisited: function(portals) {
      for (const guid in portals) {
        if (!window.plugin.dh_visits.droneVisited[guid] || !window.plugin.dh_visits.droneVisited[guid].visited)
          return false;
      }
      return true;
    },

    keyUpdate: function(data) {
      if (!this.plotReachable || !this.settings.extendByKeysPlugin) return;
      if (data.count === 0 && confirm('Portal now has no keys. This may cause problems for Drone Coverage - click OK to start new coverage calculation, cancel to ignore key count change')) {
        this.startCoverage(this.currentLocation);
        return;
      }
      this.updateReachable({[data.guid]: portals[data.guid]});
      this.keyCheck();
      this.drawReachable();
    },

    refreshAllKeys: function() {
      if (!this.plotReachable || !this.settings.extendByKeysPlugin) return;
      if (!confirm('Key plug-in data has changed. This may cause problems for Drone Coverage - click OK to start new coverage calculation, cancel to ignore key count change')) {
        return;
      }
      this.startCoverage(this.currentLocation);
    }
  }
  window.plugin.dh_distance = {
    startPortal: null,
    earthRadius: 6367000,

    setup() {
      window.addHook('portalDetailsUpdated', this.onPortalDetailsUpdated.bind(this));

      this.startPortalStorageHandler = new window.plugin.dh_sync(this, 'dh_distance', 'startPortal', 'replace', false, () => {
        if (this.startPortal !== {} && window.selectedPortal) {
          window.renderPortalDetails (window.selectedPortal);
        }
      });
      this.startPortalStorageHandler.loadLocal();

      map.on('keyup', (e) => {
        if (e.originalEvent.key === 's') { this.setStartPortal(window.selectedPortal) }
      }, false);

    },

    onPortalDetailsUpdated() {
      let guid = window.selectedPortal;
      let html = '<span class="droneStart" style="padding:5px"><a onclick="window.plugin.dh_distance.setStartPortal(\''+guid+'\')">Set Drone Start</a></span>';

      $('#dh-portal-info .droneStart').remove();
      $('#dh-portal-info').append(html);

      if (this.startPortal == null || this.startPortal === {}) return;

      // use a value of Earth's polar radius, as this is consistent with all observations in scanner made so far
      let haversine = window.plugin.dh_utility.haversineDistance(this.startPortal._latlng, portals[guid]._latlng, this.earthRadius);

      if (haversine > 2000)
        haversine = Math.floor(haversine/1000);
      else if (haversine < 1200 || haversine >= 1300)
        haversine = Math.floor(haversine/100)/10;
      else if (haversine < 1240 || haversine >= 1260)
        haversine = Math.floor(haversine/10)/100;
      else haversine = Math.floor(haversine)/1000;

      html = '<div style="padding:5px;white-space:nowrap; text-overflow:ellipsis;color:lightgray">' +
        '<span style="color:lightgray">' + haversine + 'km</span>' +
        ' from <a href="'+this.startPortal.uri+'">'+this.startPortal.title+'</a></div>';

      if(window.plugin.droneviewexport === undefined)  $('#dh-distance').html(html);


    },

    setStartPortal(guid) {
      this.startPortal = {_latlng: portals[guid]._latlng, title: portals[guid].options.data.title, uri: window.makePermalink(portals[guid]._latlng)};
      this.startPortalStorageHandler.save();
      this.onPortalDetailsUpdated();
      changePortalHighlights(window._current_highlighter);;
    },

  }
  /**********************************************************************************************************************/
  /** SET-UP ************************************************************************************************************/
  /**********************************************************************************************************************/
  self.setupCSS = function() {
    $("<style>")
      .prop("type", "text/css")
      .html("#droneHelper-container {\n  display: block;\n  text-align: center;\n  margin: 6px 3px 1px 3px;\n  padding: 0 4px;\n}\n#droneHelper-container label {\n  margin: 0 0.5em;\n}\n#droneHelper-container input {\n  vertical-align: middle;\n}\n\n.portal-list-droneHelper input[type=\'checkbox\'] {\n  padding: 0;\n  height: auto;\n  margin-top: -5px;\n  margin-bottom: -5px;\n}\n")
      .appendTo("head");
  }

  self.createOptionsDialog = function() {
    let html = ' ';
    self.dho = dialog({
      id:'dh-options',
      html: html,
      title: 'Drone Helper Options',
      beforeClose: () => {
        $('[aria-describedby="dialog-dh-options"]').hide();
        return false;
      }
    })
    $('[aria-describedby="dialog-dh-options"]').hide();
  }

  var setup = function() {
    self.isSmart = window.isSmartphone();
    self.createOptionsDialog();

    const dhControlHtml = '<div id="dh-controls" style=""><div id="dh-visitcount"></div><div id="dh-distance"></div><div id="dh-portal-info"></div><div id="dh-toolbox"></div></div>';
    $('#portaldetails').after(dhControlHtml);
    $('#dh-toolbox').append('<span style="padding:5px;;white-space: nowrap"><a id="dh-options" onclick="$(\'[aria-describedby=&quot;dialog-dh-options&quot;]\').show();">DroneHelper Opt</a></span> ');
    //$('#dh-controls>a').css({padding: "5px",marginTop: "3px",marginBottom: "3px"});

    self.haveKeysPlugin = !!plugin.keys
    self.haveLiveInventoryPlugin = !!plugin.LiveInventory

    window.plugin.dh_utility.updateKeyOwnership()

    window.addHook('pluginKeysUpdateKey', window.plugin.dh_utility.addKeysPluginInfo);
    window.addHook('pluginKeysRefreshAll', window.plugin.dh_utility.addKeysPluginInfo);


    window.plugin.dh_visits.setup();
    window.plugin.dh_view.setup();
    window.plugin.dh_route.setup();
    window.plugin.dh_coverage.setup();
    window.plugin.dh_distance.setup();

    self.setupCSS();


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
