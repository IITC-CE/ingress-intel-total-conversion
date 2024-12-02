// ==UserScript==
// @author         Zaso
// @name           Link Prolongation
// @category       Layers
// @version        0.1.2
// @description    Create link prolongations.
// @id             link-prolongation@Zaso
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/link-prolongation.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/link-prolongation.user.js
// @recommends     draw-tools@breunigs|draw-tools-plus@zaso|bookmarks@ZasoGD|font-awesome@zaso
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'ZasoItems';
plugin_info.dateTimeVersion = '2022-12-18-193146';
plugin_info.pluginId = 'link-prolongation';
//END PLUGIN AUTHORS NOTE



// PLUGIN START ////////////////////////////////////////////////////////
// history
// 0.1.2 setup changed, code-style
// 0.1.1 headers changed. Ready for IITC-CE
// 0.1.0 Original script
/* exported setup --eslint */
/* global L, dialog, map */

// use own namespace for plugin
window.plugin.linkProlongation = function(){};

window.plugin.linkProlongation.storage = {};
window.plugin.linkProlongation.data = {};
window.plugin.linkProlongation.obj = {};
window.plugin.linkProlongation.dialog = {};
window.plugin.linkProlongation.ui = {};
window.plugin.linkProlongation.action = {};
window.plugin.linkProlongation.layer = {};
window.plugin.linkProlongation.bookmarks = {};

window.plugin.linkProlongation.obj.status = { dist:1, drawType:5, drawColor:{enabled:0, value:'#f66'}};
window.plugin.linkProlongation.obj.points = {};
window.plugin.linkProlongation.obj.supp = {};

// -----------------------------------
// STORAGE
// -----------------------------------
window.plugin.linkProlongation.storage.NAME = 'plugin-linkProlongation';
window.plugin.linkProlongation.storage.save = function(){
  window.localStorage[window.plugin.linkProlongation.storage.NAME] = JSON.stringify(window.plugin.linkProlongation.obj.status);
};

window.plugin.linkProlongation.storage.load = function(){
  window.plugin.linkProlongation.obj.status = JSON.parse(window.localStorage[window.plugin.linkProlongation.storage.NAME]);
};

window.plugin.linkProlongation.storage.check = function(){
  if (!window.localStorage[window.plugin.linkProlongation.storage.NAME]){
    window.plugin.linkProlongation.storage.save();
  }
  window.plugin.linkProlongation.storage.load();
};

// -----------------------------------
// DATA
// -----------------------------------
window.plugin.linkProlongation.data.setDist = function(number){
  var v = parseInt(number);
  if (Number.isInteger(v) === false){
    window.plugin.linkProlongation.dialog.openBoxMessage('<i class="fa fa-exclamation-triangle"></i> Error: Insert a number!');
  } else if (v < 1){
    window.plugin.linkProlongation.dialog.openBoxMessage('<i class="fa fa-exclamation-triangle"></i> Not Saved. Use a number equal or greater than 1!');
  } else if (v > 7000){
    window.plugin.linkProlongation.dialog.openBoxMessage('<i class="fa fa-exclamation-triangle"></i> Not Saved. Use a smallest number!');
  } else {
    var newDist = Math.round(number);
    var abs = Math.abs(number - newDist);
    if (abs !== 0 && abs !== 1){
      window.plugin.linkProlongation.dialog.openBoxMessage('<i class="fa fa-exclamation-triangle"></i> The distance saved has been rounded to '+newDist);
    }

    window.plugin.linkProlongation.obj.status.dist = newDist;
    window.plugin.linkProlongation.storage.save();

    $('.linkProlongationDialog input.dist').val(newDist);
    return window.plugin.linkProlongation.data.getDist();
  }
  return false;
};

window.plugin.linkProlongation.data.getDist = function(){
  return window.plugin.linkProlongation.obj.status.dist;
};

window.plugin.linkProlongation.data.setDrawType = function(number){
  number = isNaN( parseInt(number))? 5 : parseInt(number);
  window.plugin.linkProlongation.obj.status.drawType = number;
};

window.plugin.linkProlongation.data.getDrawType = function(){
  return window.plugin.linkProlongation.obj.status.drawType;
};

window.plugin.linkProlongation.data.setDrawColorStatus = function(status){
  window.plugin.linkProlongation.obj.status.drawColor.enabled = status;
};
window.plugin.linkProlongation.data.setDrawColorValue = function(color){
  window.plugin.linkProlongation.obj.status.drawColor.value = color;
};

window.plugin.linkProlongation.data.getDrawColor = function(){
  return window.plugin.linkProlongation.obj.status.drawColor;
};

window.plugin.linkProlongation.data.setPoint = function(number, LatLng){
  // is coord array
  console.log(LatLng);

  try {
    if (Array.isArray(LatLng) === true && LatLng.length === 2){
      var lat = parseFloat(LatLng[0].replace(',', '.'));
      var lng = parseFloat(LatLng[1].replace(',', '.'));
      var ll = new L.LatLng(lat, lng);
      window.plugin.linkProlongation.obj.points['p'+number] = ll;
    }
    // is coord obj
    else if (typeof LatLng === 'object' && LatLng.lat !== undefined && LatLng.lng !== undefined){
      window.plugin.linkProlongation.obj.points['p'+number] = LatLng;
    }
  } catch (e) {
    window.plugin.linkProlongation.dialog.openBoxMessage('<i class="fa fa-exclamation-triangle"></i> Point not saved!');
    return false;
  }
  window.plugin.linkProlongation.storage.save();
  return window.plugin.linkProlongation.obj.points['p'+number];
};

window.plugin.linkProlongation.data.setPoint_1 = function(LatLng){
  window.plugin.linkProlongation.data.setPoint(1, LatLng);
};

window.plugin.linkProlongation.data.setPoint_2 = function(LatLng){
  window.plugin.linkProlongation.data.setPoint(2, LatLng);
};

window.plugin.linkProlongation.data.setPoints = function(LatLng1, LatLng2){
  window.plugin.linkProlongation.data.setPoint_1(LatLng1);
  window.plugin.linkProlongation.data.setPoint_2(LatLng2);
};

window.plugin.linkProlongation.data.getPoints = function(){
  return window.plugin.linkProlongation.obj.points;
};

window.plugin.linkProlongation.data.getCurrPortal = function(){
  var guid = window.selectedPortal;
  if (guid === null){
    window.plugin.linkProlongation.dialog.openBoxMessage('<i class="fa fa-exclamation-triangle"></i> Select a portal.');
  } else {
    var p = window.portals[guid];
    var ll = p.getLatLng();
    return ll;
  }
  return false;
};

window.plugin.linkProlongation.data.setP1fromPortal = function(){
  var latLng = window.plugin.linkProlongation.data.getCurrPortal();
  if (latLng !== false){
    window.plugin.linkProlongation.data.setPoint_1(latLng);
    window.plugin.linkProlongation.ui.updateInput();
  }
};

window.plugin.linkProlongation.data.setP2fromPortal = function(){
  var latLng = window.plugin.linkProlongation.data.getCurrPortal();
  if (latLng !== false){
    window.plugin.linkProlongation.data.setPoint_2(latLng);
    window.plugin.linkProlongation.ui.updateInput();
  }
};

window.plugin.linkProlongation.data.invertPoint = function(){
  var pp = window.plugin.linkProlongation.data.getPoints();
  var p1 = pp.p1;
  var p2 = pp.p2;

  window.plugin.linkProlongation.data.setPoints(p2, p1);

  window.plugin.linkProlongation.ui.updateInput();
};

window.plugin.linkProlongation.data.calcP3 = function(p1, p2, dist){
  if (p1 === undefined || p2 === undefined){
    window.plugin.linkProlongation.dialog.openBoxMessage('<i class="fa fa-exclamation-triangle"></i> Error. Select two portals.');
    return false;
  }
  if (p1.equals(p2) === true){
    window.plugin.linkProlongation.dialog.openBoxMessage('<i class="fa fa-exclamation-triangle"></i> Error. Insert two different portals LatLng.');
    return false;
  }

  var vinInv = window.plugin.linkProlongation.thirdParty.vincenty_inverse(p1, p2);
  var newDist = vinInv.distance+dist;
  var initBear = vinInv.initialBearing;
  var finalBear = vinInv.finalBearing;

  var vinDir1 = window.plugin.linkProlongation.thirdParty.vincenty_direct(p1, initBear, newDist, true);

  var p3 = new L.LatLng(vinDir1.lat, vinDir1.lng);

  return p3;
};

window.plugin.linkProlongation.data.getP1_P2_P3_P0 = function(){
  var point = window.plugin.linkProlongation.data.getPoints();
  var dist = window.plugin.linkProlongation.data.getDist()*1000;
  // delete window.plugin.linkProlongation.obj.points['p3'];

  try {
    var p1 = point.p1;
    var p2 = point.p2;

    if (p1.equals(p2) === true){
      window.plugin.linkProlongation.dialog.openBoxMessage('<i class="fa fa-exclamation-triangle"></i> Error. Insert two different portals LatLng.');
      return false;
    }

    var p0 = window.plugin.linkProlongation.data.calcP3(p2, p1, dist);
    var p3 = window.plugin.linkProlongation.data.calcP3(p1, p2, dist);
    // window.plugin.linkProlongation.obj.points['p3'] = p3;
    return {p1:p1, p2:p2, p3:p3, p0:p0};
  } catch (error) {
    window.plugin.linkProlongation.dialog.openBoxMessage('<i class="fa fa-exclamation-triangle"></i> Error.');
    return false;
  }
};

// -----------------------------------
// ACTION
// -----------------------------------
window.plugin.linkProlongation.action.setDrawType = function(number){
  window.plugin.linkProlongation.data.setDrawType(number);
  window.plugin.linkProlongation.storage.save();
};

window.plugin.linkProlongation.action.setDrawColorStatus = function(status){
  window.plugin.linkProlongation.data.setDrawColorStatus(status);
  window.plugin.linkProlongation.storage.save();
};

window.plugin.linkProlongation.action.setDrawColorValue = function(color){
  window.plugin.linkProlongation.data.setDrawColorValue(color);
  window.plugin.linkProlongation.storage.save();
};

window.plugin.linkProlongation.action.drawFavoriteType = function(){
  if (window.plugin.drawToolsPlus === undefined){
    window.plugin.linkProlongation.dialog.openBoxMessage(
      '<i class="fa fa-exclamation-triangle"></i> <i>Draw Tools</i> and <i>Draw Tools Plus</i> plugins needed to draw.'
    );
    return false;
  }
  window.plugin.linkProlongation.layer.drawFavoriteType();
  window.plugin.linkProlongation.layer.clearPreview();
};

window.plugin.linkProlongation.action.drawPreview = function(){
  window.plugin.linkProlongation.layer.clearPreview();
  window.plugin.linkProlongation.layer.drawPreview();
};

// -----------------------------------
// LAYER
// -----------------------------------
window.plugin.linkProlongation.layer.drawFavoriteType = function(){
  if (window.plugin.drawToolsPlus === undefined){
    window.plugin.linkProlongation.dialog.openBoxMessage(
      '<i class="fa fa-exclamation-triangle"></i> <i>Draw Tools</i> and <i>Draw Tools Plus</i> plugins needed to draw.'
    );
    return false;
  }

  var pp = window.plugin.linkProlongation.data.getP1_P2_P3_P0();
  if (pp === false) { return false; }

  var drawType = window.plugin.linkProlongation.data.getDrawType();

  var drawColor = window.plugin.linkProlongation.data.getDrawColor();

  var color = undefined;
  if (drawColor.enabled){
    color = drawColor.value;
  }

  switch (drawType){
    case 1:
      window.plugin.drawToolsPlus.drawPolyline([pp.p0, pp.p1], color);
      break;
    case 2:
      window.plugin.drawToolsPlus.drawPolyline([pp.p1, pp.p2], color);
      break;
    case 3:
      window.plugin.drawToolsPlus.drawPolyline([pp.p2, pp.p3], color);
      break;
    case 4:
      window.plugin.drawToolsPlus.drawPolyline([pp.p0, pp.p2], color);
      break;
    case 5:
      window.plugin.drawToolsPlus.drawPolyline([pp.p1, pp.p3], color);
      break;
    // -------------------------------
    case 6:
      window.plugin.drawToolsPlus.drawPolyline([pp.p0, pp.p1, pp.p2]);
      break;
    case 7:
      window.plugin.drawToolsPlus.drawPolyline([pp.p1, pp.p2, pp.p3]);
      break;
    case 8:
      window.plugin.drawToolsPlus.drawPolyline([pp.p0, pp.p1, pp.p2, pp.p3]);
      break;
    // -------------------------------
    case 9:
      window.plugin.drawToolsPlus.drawPolyline([pp.p0, pp.p1], color);
      window.plugin.drawToolsPlus.drawPolyline([pp.p2, pp.p3], color);
      break;
    case 10:
      window.plugin.drawToolsPlus.drawPolyline([pp.p0, pp.p1], color);
      window.plugin.drawToolsPlus.drawPolyline([pp.p2, pp.p3]);
      break;
    case 11:
      window.plugin.drawToolsPlus.drawPolyline([pp.p1, pp.p2]);
      window.plugin.drawToolsPlus.drawPolyline([pp.p2, pp.p3], color);
      break;
    case 12:
      window.plugin.drawToolsPlus.drawPolyline([pp.p0, pp.p1], color);
      window.plugin.drawToolsPlus.drawPolyline([pp.p1, pp.p2]);
      window.plugin.drawToolsPlus.drawPolyline([pp.p2, pp.p3], color);
      break;
    default:
      break;
  }
};

window.plugin.linkProlongation.layer.clearPreview = function(){
  window.plugin.linkProlongation.layer.layerGroup.clearLayers();
};

window.plugin.linkProlongation.layer.drawPreview = function(){
  var pp = window.plugin.linkProlongation.data.getP1_P2_P3_P0();
  if (pp === false){ return false; }

  var drawColor = window.plugin.linkProlongation.data.getDrawColor();

  var opt = {
    color: drawColor.value,
    weight: 3
  };

  window.plugin.linkProlongation.layer.layerGroup.addLayer(new L.geodesicPolyline([pp.p1,pp.p2], opt));
  opt.dashArray = [7,10,2,10];
  window.plugin.linkProlongation.layer.layerGroup.addLayer(new L.geodesicPolyline([pp.p0,pp.p1], opt));
  window.plugin.linkProlongation.layer.layerGroup.addLayer(new L.geodesicPolyline([pp.p2,pp.p3], opt));
};

// -----------------------------------
// BOOKMARKS
// -----------------------------------
window.plugin.linkProlongation.dialog.openBookmarkChooser = function(point_number){
  if (!window.plugin.linkProlongation.dialog.noBookmarksPlugin()){ return false; }
  if (parseInt(point_number) !== 1 && parseInt(point_number) !== 2){ return false; }

  var html = window.plugin.linkProlongation.bookmarks.getHTMLPortalsList();

  dialog ({
    html: '<div class="linkProlongationDialog linkProlongation bookmarks">'+html+'</div>',
    dialogClass: 'ui-dialog-linkProlongation bookmarks noFirst',
    title: 'linkProlongation - Bookmarks',
    buttons: {
      'SELECT & CLOSE': function(){
        var ll = window.plugin.linkProlongation.obj.supp;
        window.plugin.linkProlongation.data.setPoint(point_number, ll);
        window.plugin.linkProlongation.obj.supp = {};
        window.plugin.linkProlongation.ui.updateInput();
        $(this).dialog('close');
      },
      'SELECT': function(){
        var ll = window.plugin.linkProlongation.obj.supp;
        window.plugin.linkProlongation.data.setPoint(point_number, ll);
        window.plugin.linkProlongation.obj.supp = {};
        window.plugin.linkProlongation.ui.updateInput();
      },
    }
  });
};

window.plugin.linkProlongation.bookmarks.clickOnListItem = function(elem){
  var bk = $(elem);
  var list = bk.parent().parent().parent().find('.bkmrk.selected');
  list.each(function(){ $(this).removeClass('selected'); });
  bk.toggleClass('selected');

  var idBkmrk = bk.prop('id');
  var idFolder = bk.parent().parent().prop('id');

  var bkmrk = window.plugin.bookmarks.bkmrksObj.portals[idFolder].bkmrk[idBkmrk];

  var latlng = bkmrk.latlng;
  var ll = latlng.split(',');
  ll = new L.latLng(ll[0], ll[1]);

  window.plugin.linkProlongation.obj.supp = ll;

  return ll;
};

window.plugin.linkProlongation.bookmarks.getHTMLPortalsList = function(){
  if (!window.plugin.linkProlongation.dialog.noBookmarksPlugin()){ return false; }

  //  var portalsList = JSON.parse(window.plugin.bookmarks.KEY_STORAGE);
  var portalsList = window.plugin.bookmarks.bkmrksObj;
  var element = '';
  var elementTemp = '';
  var elemGenericFolder = '';

  // For each folder
  var list = portalsList.portals;
  for (var idFolders in list) {
    var folders = list[idFolders];

    // Create a label and a anchor for the sortable
    var folderLabel = '<a class="folderLabel" onclick="$(this).siblings(\'div\').toggle();return false;">'+folders['label']+'</a>';

    // Create a folder
    elementTemp = '<div class="bookmarkFolder" id="'+idFolders+'">'+folderLabel+'<div>';

    // For each bookmark
    var fold = folders['bkmrk'];
    for (var idBkmrk in fold) {
      var bkmrk = fold[idBkmrk];
      var label = bkmrk['label'];
      var latlng = bkmrk['latlng'];

      // Create the bookmark
      elementTemp += '<a class="bkmrk" id="'+idBkmrk;
      elementTemp += '" onclick="window.plugin.linkProlongation.bookmarks.clickOnListItem(this);return false" data-latlng="['+latlng+']">'+label+'</a>';
    }
    elementTemp += '</div></div>';

    if (idFolders !== window.plugin.bookmarks.KEY_OTHER_BKMRK) {
      element += elementTemp;
    } else {
      elemGenericFolder += elementTemp;
    }
  }
  element += elemGenericFolder;

  // Append all folders and bookmarks
  var r = ''
    + '<div id="bkmrksAutoDrawer">'
    + '<p style="margin-bottom:9px;color:#f66;text-align:center;">You must select 1 portal!</p>'
//  + '<div onclick="window.plugin.bookmarks.autoDrawOnSelect();return false;">'
    + element
//  + '</div>'
    + '</div>';

  return r;
};

window.plugin.linkProlongation.dialog.noBookmarksPlugin = function(){
  if (window.plugin.bookmarks === undefined){
    window.plugin.linkProlongation.dialog.openBoxMessage(
      '<i class="fa fa-exclamation-triangle"></i> <i>Bookmarks for Maps and Portals</i> plugin needed for this features.'
    );
    return false;
  }
  return true;
};

// -----------------------------------
// DIALOG
// -----------------------------------
window.plugin.linkProlongation.dialog.getHtmlMainBox = function(){
  var html = '';
  var dist = window.plugin.linkProlongation.data.getDist();
  var points = window.plugin.linkProlongation.data.getPoints();

  html += '';

//  html += '<div class="row portals">';
  html += '<div class="row portal p1">';
//  html += '<div class="col col-6 portal p1">';
  html += '<label>P1: </label>';
//  html += '<label>Portal 1 (P1)</label>';
  html += '<button class="p1 getCurr" onclick="window.plugin.linkProlongation.data.setP1fromPortal();return false;"';
  html +=   'title="Get LatLng from selected portal"><i class="fa fa-mouse-pointer"></i></button>';
  html += '<button class="p1 getBkmrk" onclick="window.plugin.linkProlongation.dialog.openBookmarkChooser(1);return false;"';
  html +=   ' title="Get LatLng from a your portal bookmarked"><i class="fa fa-bookmark"></i></button>';
  html += '<span class="p1 coord latlng">';
  html += '<input class="p1 lat" type="text" step="0.01" min="-85" max="+85" placeholder="lat" tabindex="1" value="'+points.p1.lat+'" />';
  html += '<span>,</span>';
  html += '<input class="p1 lng" type="text" step="0.01" min="-180" max="+180" placeholder="lng" tabindex="2" value="'+points.p1.lng+'" />';
  html += '</span>';
  html += '<button class="p1 save" onclick="window.plugin.linkProlongation.data.setPoint_1([$(this).prev(\'.latlng\').children(\'input\').eq(0).val(),';
  html +=   ' $(this).prev(\'.latlng\').children(\'input\').eq(1).val()]);return false;" title="Save"><i class="fa fa-save"></i></button>';
  html += '</div>';

  html += '<div class="row portal p2">';
//  html += '<div class="col col-6 portal p2">';
  html += '<label>P2: </label>';
//  html += '<label>Portal 2 (P2)</label>';
  html += '<button class="p2 getCurr" onclick="window.plugin.linkProlongation.data.setP2fromPortal();return false;" ';
  html +=   'title="Get LatLng from selected portal"><i class="fa fa-mouse-pointer"></i></button>';
  html += '<button class="p2 getBkmrk" onclick="window.plugin.linkProlongation.dialog.openBookmarkChooser(2);return false;" ';
  html +=   'title="Get LatLng from a your portal bookmarked"><i class="fa fa-bookmark"></i></button>';
  html += '<span class="p2 coord latlng">';
  html += '<input class="p2 lat" type="text" step="0.01" min="-85" max="+85" placeholder="lat" tabindex="3" value="'+points.p2.lat+'" />';
  html += '<span>,</span>';
  html += '<input class="p2 lng" type="text" step="0.01" min="-180" max="+180" placeholder="lng" tabindex="4" value="'+points.p2.lng+'" />';
  html += '</span>';
  html += '<button class="p2 save" onclick="window.plugin.linkProlongation.data.setPoint_2([$(this).prev(\'.latlng\').children(\'input\').eq(0).val(),';
  html +=   '$(this).prev(\'.latlng\').children(\'input\').eq(1).val()]);return false;" title="Save"><i class="fa fa-save"></i></button>';
  html += '</div>';
//  html += '<div class="clearfix"></div>';
//  html += '</div>';

  return html;
};

window.plugin.linkProlongation.dialog.openMainBox = function(){
  var html = window.plugin.linkProlongation.dialog.getHtmlMainBox();

  if ($('.ui-dialog-linkProlongation.linkProlongation.main').length > 0){ return false; }

  dialog ({
    title: 'Link Prolongation',
    html: '<div class="linkProlongationDialog linkProlongation main">'+html+'</div>',
    width: 300,
    dialogClass: 'ui-dialog-linkProlongation linkProlongation main noFirst',
    buttons:{
      'Settings': function(){
        window.plugin.linkProlongation.dialog.openSettingsBox();
      },
      'PREVIEW': function(){
        window.plugin.linkProlongation.action.drawPreview();
      },
      'DRAW': function(){
        window.plugin.linkProlongation.action.drawFavoriteType();
      },
    }
  });
};

window.plugin.linkProlongation.dialog.getHtmlSettingsBox = function(){
  var html = '';

  //
  var currDrawType = window.plugin.linkProlongation.data.getDrawType();
  var currDrawColor = window.plugin.linkProlongation.data.getDrawColor();
  var dist = window.plugin.linkProlongation.data.getDist();
  var e1 = 'a';
  var p1 = 'A';
  var p2 = 'B';
  var e2 = 'b';

  function getHtmlLabel(arr, val){
    var txt = '';

    var check = (currDrawType === val)? 'checked' : '';

    txt += '<label class="row">';
    txt += '<input type="radio" name="lp_howDraw" value="'+val+'" onchange="window.plugin.linkProlongation.action.setDrawType(\''+val+'\');" '+check+'/> ';
    for (var i in arr){
      txt += (i > 0)? '<span class="and">+</span>' : '';
      txt += '<span class="overline">'+arr[i]+'</span>';
    }
    txt += '</label>';

    return txt;
  }

  // Legends
  if (1 === 1){
    html += '<div style="background:rgba(0,0,0,.3);padding:10px 20px;margin-bottom:7px;">';
    html += '<table>';
    html += '<tr>';
    html += '<td>'+e1+'</td>';
    html += '<td>'+p1+' (P1)</td>';
    html += '<td>'+p2+' (P2)</td>';
    html += '<td>'+e2+'</td>';
    html += '</tr>';
    html += '<tr><td></td><td></td><td></td><td></td></tr>';
    html += '<tr><td>dist</td><td></td><td></td><td>dist</td></tr>';
    html += '</table>';
    html += '</div>';
  }

  // Set Dist
  if (1 === 1){
    html += '<div class="row" style="text-align:center;margin-bottom:0px;">';
    html += '<label>Distance (dist): </label>';
    html += '<input class="dist number" type="number" step="1" min="1" max="7000" value="'+dist+'" />';
    html += '<button class="dist save" onclick="window.plugin.linkProlongation.data.setDist($(this).prev(\'input\').val());return false;';
    html +=   '" title="Save"><i class="fa fa-save"></i></button>';
    html += '</div>';
    html += '<hr class="clearfix" />';
  }

  // Draw types
  if (1 === 1){
    html += '<div class="row">';
    html += '<h3>Draw types</h3>';
    html += '<div class="col col-4">';
    // html += '<span style="color:#ffce00;">Single polyline:</span>';
    html += getHtmlLabel([e1+p1], 1);
    html += getHtmlLabel([p1+p2], 2);
    html += getHtmlLabel([p2+e2], 3);
    html += getHtmlLabel([e1+p2], 4);
    html += getHtmlLabel([p1+e2], 5);
    html += '</div>';

    html += '<div class="col col-4">';
    // html += '<span style="color:#ffce00;">Polyline chain:</span>';
    html += getHtmlLabel([e1+p1+p2], 6);
    html += getHtmlLabel([p1+p2+e2], 7);
    html += getHtmlLabel([e1+p1+p2+e2], 8);
    html += '</div>';

    html += '<div class="col col-4">';
    //  html += '<span style="color:#ffce00;">Polylines:</span>';
    html += getHtmlLabel([e1+p1, p2+e2], 9);
    html += getHtmlLabel([e1+p1, p1+p2], 10);
    html += getHtmlLabel([p1+p2, p2+e2], 11);
    html += getHtmlLabel([e1+p1, p1+p2, p2+e2], 12);
    html += '</div>';

    html += '<div class="clearfix"></div>';
    html += '</div>';
  }

  // html += '<hr class="clearfix" />';

  // Custom color
  if (1 === 1){
    html += '<div class="row">';
    html += '<h3>Custom Draw Color</h3>';
    html += '<label>';
    html += '<input onchange="window.plugin.linkProlongation.action.setDrawColorStatus($(this).prop(\'checked\'));" type="checkbox" ';
    html += ((currDrawColor.enabled)? 'checked': '')+'/>';
    html += ' Use a custom color to draw';
    html += '</label>';
    html += ' <input onchange="window.plugin.linkProlongation.action.setDrawColorValue($(this).val());" type="color" value="'+currDrawColor.value+'" />';
    html += '<small class="row">NB: for the latest 4 <i>draw types</i> the custom draw color will be applicated only for ';
    html +=   '<span class="overline">aA</span> and <span class="overline">Bb</span>.</small>';
    html += '</div>';
  }

  return html;
};

window.plugin.linkProlongation.dialog.openSettingsBox = function(){
  var html = window.plugin.linkProlongation.dialog.getHtmlSettingsBox();

  if ($('.ui-dialog-linkProlongation.linkProlongation.settings').length > 0){ return false; }

  dialog ({
    title: 'Link Prolongation - Settings',
    html: '<div class="linkProlongationDialog linkProlongation settings">'+html+'</div>',
    width: 310,
    dialogClass: 'ui-dialog-linkProlongation linkProlongation settings'
  });
};

window.plugin.linkProlongation.dialog.openBoxMessage = function(html){
  dialog ({
    title: 'Link Prolongation - Message',
    html: '<div class="linkProlongation box message">'+html+'</div>',
    dialogClass: 'ui-dialog-linkProlongation linkProlongation message'
  });
};

// -----------------------------------
// THIRD PARTY CODE
// -----------------------------------
window.plugin.linkProlongation.thirdParty = function(){
// From Leaflet.Geodesic (https://github.com/henrythasler/Leaflet.Geodesic/)

  /* *Extend Number object with method to convert numeric degrees to radians */
  if (typeof Number.prototype.toRadians === 'undefined'){
    Number.prototype.toRadians = function(){ return this * Math.PI / 180; };
  }
  /** Extend Number object with method to convert radians to numeric (signed) degrees */
  if (typeof Number.prototype.toDegrees === 'undefined'){
    Number.prototype.toDegrees = function(){ return this * 180 / Math.PI; };
  }

  // Vincenty inverse calculation and Vincenty direct calculation are based on the work of Chris Veness (https://github.com/chrisveness/geodesy)
  window.plugin.linkProlongation.thirdParty.vincenty_direct = function(p1, initialBearing, distance, wrap){
    var vincenty_ellipsoid = { a: 6367000, b: 6367000, f: 0 }; // Sphere
    var φ1 = p1.lat.toRadians(), λ1 = p1.lng.toRadians();
    var α1 = initialBearing.toRadians();
    var s = distance;

    var a = vincenty_ellipsoid.a, b = vincenty_ellipsoid.b, f = vincenty_ellipsoid.f;

    var sinα1 = Math.sin(α1);
    var cosα1 = Math.cos(α1);

    var tanU1 = (1-f) * Math.tan(φ1), cosU1 = 1 / Math.sqrt((1 + tanU1*tanU1)), sinU1 = tanU1 * cosU1;
    var σ1 = Math.atan2(tanU1, cosα1);
    var sinα = cosU1 * sinα1;
    var cosSqα = 1 - sinα*sinα;
    var uSq = cosSqα * (a*a - b*b) / (b*b);
    var A = 1 + uSq/16384*(4096+uSq*(-768+uSq*(320-175*uSq)));
    var B = uSq/1024 * (256+uSq*(-128+uSq*(74-47*uSq)));

    var σ = s / (b*A), σʹ, iterations = 0;
    do {
      var cos2σM = Math.cos(2*σ1 + σ);
      var sinσ = Math.sin(σ);
      var cosσ = Math.cos(σ);
      var Δσ = B*sinσ*(cos2σM+B/4*(cosσ*(-1+2*cos2σM*cos2σM)- B/6*cos2σM*(-3+4*sinσ*sinσ)*(-3+4*cos2σM*cos2σM)));
      σʹ = σ;
      σ = s / (b*A) + Δσ;
    } while (Math.abs(σ-σʹ) > 1e-12 && ++iterations);

    var x = sinU1*sinσ - cosU1*cosσ*cosα1;
    var φ2 = Math.atan2(sinU1*cosσ + cosU1*sinσ*cosα1, (1-f)*Math.sqrt(sinα*sinα + x*x));
    var λ = Math.atan2(sinσ*sinα1, cosU1*cosσ - sinU1*sinσ*cosα1);
    var C = f/16*cosSqα*(4+f*(4-3*cosSqα));
    var L = λ - (1-C) * f * sinα * (σ + C*sinσ*(cos2σM+C*cosσ*(-1+2*cos2σM*cos2σM)));

    var λ2;
    if (wrap) {
      λ2 = (λ1+L+3*Math.PI)%(2*Math.PI) - Math.PI; // normalise to -180...+180
    } else {
      λ2 = (λ1+L); // do not normalize
    }
    var revAz = Math.atan2(sinα, -x);

    return {lat: φ2.toDegrees(), lng: λ2.toDegrees(), finalBearing: revAz.toDegrees() };
  };

  window.plugin.linkProlongation.thirdParty.vincenty_inverse = function(p1, p2){
    var vincenty_ellipsoid = { a: 6367000, b: 6367000, f: 0 }; // Sphere
    var φ1 = p1.lat.toRadians(), λ1 = p1.lng.toRadians();
    var φ2 = p2.lat.toRadians(), λ2 = p2.lng.toRadians();

    var a = vincenty_ellipsoid.a, b = vincenty_ellipsoid.b, f = vincenty_ellipsoid.f;

    var L = λ2 - λ1;
    var tanU1 = (1-f) * Math.tan(φ1), cosU1 = 1 / Math.sqrt((1 + tanU1*tanU1)), sinU1 = tanU1 * cosU1;
    var tanU2 = (1-f) * Math.tan(φ2), cosU2 = 1 / Math.sqrt((1 + tanU2*tanU2)), sinU2 = tanU2 * cosU2;

    var λ = L, λʹ, iterations = 0;
    do {
      var sinλ = Math.sin(λ), cosλ = Math.cos(λ);
      var sinSqσ = (cosU2*sinλ) * (cosU2*sinλ) + (cosU1*sinU2-sinU1*cosU2*cosλ) * (cosU1*sinU2-sinU1*cosU2*cosλ);
      var sinσ = Math.sqrt(sinSqσ);
      if (sinσ===0) return 0;  // co-incident points
      var cosσ = sinU1*sinU2 + cosU1*cosU2*cosλ;
      var σ = Math.atan2(sinσ, cosσ);
      var sinα = cosU1 * cosU2 * sinλ / sinσ;
      var cosSqα = 1 - sinα*sinα;
      var cos2σM = cosσ - 2*sinU1*sinU2/cosSqα;
      if (isNaN(cos2σM)) cos2σM = 0;  // equatorial line: cosSqα=0 (§6)
      var C = f/16*cosSqα*(4+f*(4-3*cosSqα));
      λʹ = λ;
      λ = L + (1-C) * f * sinα * (σ + C*sinσ*(cos2σM+C*cosσ*(-1+2*cos2σM*cos2σM)));
    } while (Math.abs(λ-λʹ) > 1e-12 && ++iterations<100);
    if (iterations>=100) {
      console.log('Formula failed to converge. Altering target position.');
      return this._vincenty_inverse(p1, {lat: p2.lat, lng:p2.lng-0.01});
    //  throw new Error('Formula failed to converge');
    }

    var uSq = cosSqα * (a*a - b*b) / (b*b);
    var A = 1 + uSq/16384*(4096+uSq*(-768+uSq*(320-175*uSq)));
    var B = uSq/1024 * (256+uSq*(-128+uSq*(74-47*uSq)));
    var Δσ = B*sinσ*(cos2σM+B/4*(cosσ*(-1+2*cos2σM*cos2σM)- B/6*cos2σM*(-3+4*sinσ*sinσ)*(-3+4*cos2σM*cos2σM)));

    var s = b*A*(σ-Δσ);

    var fwdAz = Math.atan2(cosU2*sinλ,  cosU1*sinU2-sinU1*cosU2*cosλ);
    var revAz = Math.atan2(cosU1*sinλ, -sinU1*cosU2+cosU1*sinU2*cosλ);

    s = Number(s.toFixed(3)); // round to 1mm precision
    return { distance: s, initialBearing: fwdAz.toDegrees(), finalBearing: revAz.toDegrees() };
  };

// Thanks to TheSned
// (https://github.com/TheSned/ingress-intel-total-conversion/blob/e23ea7bafb4610911b9a8772700e40b2e0836873/plugins/extend-poly-lines.user.js#L38)
// vincenty_ellipsoid = { a: 6378137, b: 6356752.3142, f: 1/298.257223563 }; // WGS-84
// vincenty_ellipsoid = { a: 6367000, b: 6367000, f: 0 }; // Sphere
};

// -----------------------------------
// UI
// -----------------------------------
window.plugin.linkProlongation.ui.appendToToolbox = function(){
  var fa = (window.plugin.faIcon === undefined)? '' : '<i class="fa fa-expand"></i>';
  var text = fa+'Link Prolongation';
  $('#toolbox').append('<a onclick="window.plugin.linkProlongation.dialog.openMainBox();return false;">'+text+'</a>');
};

window.plugin.linkProlongation.ui.updateInput = function(){
  var dist = window.plugin.linkProlongation.data.getDist();
  var pp = window.plugin.linkProlongation.data.getPoints();

  $('.linkProlongationDialog input.p1.lat').val(pp.p1.lat);
  $('.linkProlongationDialog input.p1.lng').val(pp.p1.lng);
  $('.linkProlongationDialog input.p2.lat').val(pp.p2.lat);
  $('.linkProlongationDialog input.p2.lng').val(pp.p2.lng);
  $('.linkProlongationDialog input.dist.number').val(dist);
};

window.plugin.linkProlongation.ui.setupCSS = function(){
  $('<style>').prop('type', 'text/css').html(''
    +'.linkProlongation .row{ display:block; }'
    +'.linkProlongation input{ width:auto;margin:0 2px;border:1px solid #20A8B1;position:relative; }'
    +'.linkProlongation .linkProlongation button{ margin:0 2px;padding:3px 3px 4px;cursor:pointer;min-width:30px; }'
    +'.linkProlongation button:hover{ text-decoration:underline;background:#000; }'
    +'.linkProlongation button.save{}'
    +'.linkProlongation button.getCurr{}'
    +'.linkProlongation .pointer{ cursor:pointer; }'
    +'.linkProlongation .text-center{ text-align:center; }'
    +'.linkProlongation .text-left{ text-align:left; }'
    +'.linkProlongation .text-right{ text-align:right; }'
    +'.linkProlongation .overline{ text-decoration:overline; }'
    +'.linkProlongation .help, .linkProlongation .help *{ cursor:help !important; }'
    +'.linkProlongation hr{border-color:#20a8b1;}'
    +'.linkProlongation .col.col-6{ width:50%;float:left; }'
    +'.linkProlongation .col.col-4{ width:33.333%;float:left; }'
    +'.linkProlongation .clearfix, .linkProlongation .clearfix:before, .linkProlongation .clearfix:after{ clear:both; }'
    +'.linkProlongation h3{color:#ffce00;text-align:center;font-size:14px;}'
    +'.linkProlongation small{color:#bbb;}'

    +'.linkProlongation .portal .latlng{ display:inline-block;background:rgba(0,0,0,.3);border:1px solid #20a8b1;height:24px;margin:0 2px; }'
    +'.linkProlongation .portal .latlng input{ width:70px;background:none;border:none;margin:0;text-align:center;color:#ddd; }'
/*
    +'.linkProlongation .portal.col.col-6 .latlng{ display:inline-block;height:auto;margin:7px 3px; }'
    +'.linkProlongation .portal.col.col-6 .latlng span{ display:none; }'
    +'.linkProlongation .portal.col.col-6 .latlng input{ padding:3px 0 2px;height:auto;width:100%; }'
    +'.linkProlongation.main .row{ margin:0 auto; }'
*/

    +'.ui-dialog-linkProlongation .ui-dialog-buttonpane .ui-dialog-buttonset button{ margin:0 3px; cursor:pointer; padding:2px 4px; }'
    +'.ui-dialog-linkProlongation.noFirst .ui-dialog-buttonpane .ui-dialog-buttonset button:first-child{ display:none; }'

    +'.linkProlongation.main .row{ padding:4px 0;text-align:center;}'
    +'.linkProlongation.settings .row{ padding:2px 0 1px; }'

    +'.linkProlongation.settings label, .linkProlongation.settings label input{ cursor:pointer; }'
    +'.linkProlongation.settings label .and{ color:#f66; }'

    +'.linkProlongation.settings label input[type="radio"],.linkProlongation.settings label input[type="checkbox"]{ text-align:left;top:2px; }'
    +'.linkProlongation.settings input[type="number"]{width:55px;}'
    +'.linkProlongation.settings input[type="color"]{width:30px;padding:0;height:15px;outline:none;background:none;border-color:#ffce00;top:-2px;}'

    +'.linkProlongation.settings table{ width:100%;border-collapse:collapse;text-align:center; }'
    +'.linkProlongation.settings table td{ padding:0; }'

    +'.linkProlongation.settings table tr:nth-child(1) td:nth-child(1),'
    +'.linkProlongation.settings table tr:nth-child(1) td:nth-child(2){ text-align:left; }'
    +'.linkProlongation.settings table tr:nth-child(1) td:nth-child(3),'
    +'.linkProlongation.settings table tr:nth-child(1) td:nth-child(4){ text-align:right; }'

    +'.linkProlongation.settings table tr:nth-child(1) td{position:relative;padding-bottom:5px; }'
    +'.linkProlongation.settings table tr:nth-child(1) td:nth-child(1){ left:-03px; }'
    +'.linkProlongation.settings table tr:nth-child(1) td:nth-child(4){ left:+04px; }'
    +'.linkProlongation.settings table tr:nth-child(1) td:nth-child(2){ left:-18px; }'
    +'.linkProlongation.settings table tr:nth-child(1) td:nth-child(3){ left:+19px; }'

    +'.linkProlongation.settings table tr:nth-child(2) td{ border:0px solid #fff; border-bottom-width:1px;height:10px; }'
    +'.linkProlongation.settings table tr:nth-child(2) td:nth-child(1),'
    +'.linkProlongation.settings table tr:nth-child(2) td:nth-child(4)'
    +'{ border-width:0 1px 1px 1px;border-bottom-style:dashed;width:27%; }'
/*
    +'.ui-dialog-linkProlongation.main .ui-dialog-buttonpane .ui-dialog-buttonset button:nth-child(2){border:none;color:#fff;background:none;cursor:default;}'
    +'.ui-dialog-linkProlongation .ui-dialog-buttonpane .ui-dialog-buttonset button:nth-child(2):focus,'
    +'.ui-dialog-linkProlongation .ui-dialog-buttonpane .ui-dialog-buttonset button:nth-child(2):hover{text-decoration:none;outline:none;}'
*/
  ).appendTo('head');
};

// -----------------------------------

var setup = function(){
  window.plugin.linkProlongation.obj.points = {p1:new L.LatLng(0,0), p2:new L.LatLng(0,0)};
  window.plugin.linkProlongation.thirdParty();
  window.plugin.linkProlongation.ui.setupCSS();
  window.plugin.linkProlongation.storage.check();

  window.plugin.linkProlongation.layer.layerGroup = new L.LayerGroup();
  window.plugin.linkProlongation.layer.layerGroup.addTo(map);

  window.plugin.linkProlongation.ui.appendToToolbox();
};

// PLUGIN END //////////////////////////////////////////////////////////


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

