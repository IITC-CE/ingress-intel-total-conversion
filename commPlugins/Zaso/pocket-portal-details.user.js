// ==UserScript==
// @author         Zaso
// @name           Pocket Portal Details
// @category       Portal Info
// @version        0.0.6.20200723.154151
// @description    Append a pocket box containing some restricted details of the selected portal.
// @id             pocket-portal-details@Zaso
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/pocket-portal-details.user.js
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/pocket-portal-details.meta.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'ZasoItems';
plugin_info.dateTimeVersion = '2020-07-23-154151';
plugin_info.pluginId = 'pocket-portal-details';
//END PLUGIN AUTHORS NOTE



// PLUGIN START ////////////////////////////////////////////////////////
// History
// 0.0.6 fixing Aegis and escapeHTML (by Loskir)
// 0.0.5 Headers changed. Ready for IITC-CE
// 0.0.4 Original sript


// use own namespace for plugin
  window.plugin.pocketPortalDetails = function(){};

  window.plugin.pocketPortalDetails.obj = {};
  window.plugin.pocketPortalDetails.data = {};
  window.plugin.pocketPortalDetails.storage = {};
  window.plugin.pocketPortalDetails.util = {};

  window.plugin.pocketPortalDetails.obj = {status:true, position:'bottom-right'};

  // -----------------------------------------------------------------

  window.plugin.pocketPortalDetails.storage.NAME = 'plugin-pocketPortalDetails';
  window.plugin.pocketPortalDetails.storage.save = function(){
    window.localStorage[window.plugin.pocketPortalDetails.storage.NAME] = JSON.stringify(window.plugin.pocketPortalDetails.obj);
  }
  window.plugin.pocketPortalDetails.storage.load = function(){
    window.plugin.pocketPortalDetails.obj = JSON.parse(window.localStorage[window.plugin.pocketPortalDetails.storage.NAME]);
  }
  window.plugin.pocketPortalDetails.storage.check = function(){
    if(!window.localStorage[window.plugin.pocketPortalDetails.storage.NAME]){
      window.plugin.pocketPortalDetails.storage.save();
    }else{
      window.plugin.pocketPortalDetails.storage.load();
        }
  }

  // -----------------------------------------------------------------

  window.plugin.pocketPortalDetails.util.getPortalColorTeam = function(data){
    var d = data.portalDetails;

    var colorTeam;
    switch(window.TEAM_TO_CSS[window.getTeam(d)]){
      case('enl'): colorTeam = window.COLORS[2]; break;
      case('res'): colorTeam = window.COLORS[1]; break;
      default: colorTeam = '#888'; break;
    }

    return colorTeam;
  };
   window.plugin.pocketPortalDetails.util.escapeHTML = function(text){
      return text
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/&/g, '&amp;')
  };
  window.plugin.pocketPortalDetails.util.getPortalColorLevel = function(data){
    var lvl = window.plugin.pocketPortalDetails.util.getPortalLevel(data);

    var colorLevel = '';
    if(lvl !== 0){
      colorLevel = ' style="background-color:'+window.COLORS_LVL[lvl]+';"';
    }
    return colorLevel;
  }
  window.plugin.pocketPortalDetails.util.getPortalLevel = function(data){
    return Math.floor(getPortalLevel(data.portalDetails));
  }
  window.plugin.pocketPortalDetails.util.getPortalLevelFloat = function(data){
    return getPortalLevel(data.portalDetails);
  }
  window.plugin.pocketPortalDetails.util.getPortalEnergyPerc = function(data){
    var d = data.portalDetails;

    var percentage = 0;
    var totalEnergy = getTotalPortalEnergy(d);
    if(getTotalPortalEnergy(d) > 0){
      percentage = Math.floor((getCurrentPortalEnergy(d)/getTotalPortalEnergy(d) * 100));
    }
    return percentage+'%';
  }
  window.plugin.pocketPortalDetails.util.getPortalFaction = function(data){
    var d = data.portalDetails;
    return window.TEAM_TO_CSS[window.getTeam(d)];
  }
  window.plugin.pocketPortalDetails.util.getPortalOwner = function(data){
    var d = data.portalDetails;
    var owner = '-';

    if(d.owner){
      owner = d.owner;
    }

    return owner;
  }
  window.plugin.pocketPortalDetails.util.getPortalTitle = function(data){
    var d = data.portalDetails;
    var title = '';

    if(d.title){
      title = d.title;
    }

    return title;
  }

  window.plugin.pocketPortalDetails.util.generateHTMLTableTips = function(obj){
    var titleTips = '';
    var html = '';

    for(key in obj){
      html += '<tr><td><span style=\'color:#fff;\'>'+key+'</span></td><td>'+obj[key]+'</td></tr>';
    }

    if(html !== ''){
      titleTips = '<table class=\'ppdTable\'><tbody>'+html+'</tbody></table>';
    }

    return titleTips;
  }

  // -----------------------------------------------------------------
  // GET HTML DATA
  // -----------------------------------------------------------------
  window.plugin.pocketPortalDetails.getHTMLMods = function(data){
    var d = data.portalDetails;

    var html = '';
    for(var i in d.mods){
      var modRarity = '';
      var modName = '';
      var modColor = '#888';
      var modShortName = '';

      if(d.mods[i] !== null){
        modRarity = d.mods[i].rarity;
        modName = d.mods[i].name;
        modColor = window.COLORS_MOD[modRarity];
        modShortName = '-';
      }

      switch(modName){
        case 'Portal Shield': modShortName = 'S'; break;
        case 'Aegis Shield': modShortName = 'AS'; break;

        case 'Heat Sink': modShortName = 'HS'; break;
        case 'Multi-hack': modShortName = 'MH'; break;

        case 'Link Amp': modShortName = 'LA'; break;
        case 'SoftBank Ultra Link': modShortName = 'SB'; break;

        case 'Force Amp': modShortName = 'FA'; break;
        case 'Turret': modShortName = 'T'; break;
      }

      var modHTML = '<div class="mod" style="border:1px solid '+modColor+';color:'+modColor+'">'+modShortName+'</div>';

      html += modHTML;
    }

    return '<div class="modDetails">'+html+'<div style="clear:both;"></div></div>';
  }

  window.plugin.pocketPortalDetails.getHTMLInfo = function(data){
    var d = data.portalDetails;
    var html = '';

    var linksGuid = getPortalLinks(selectedPortal);
    var linkCount = linksGuid.in.length + linksGuid.out.length;
    var fieldCount = getPortalFieldsCount(selectedPortal);
    var range = getPortalRange(d);
    var isLink = range.isLinkable ? '&#x2713;' : '&#x2717;'
    var mitig = window.getMitigationText(d, linkCount);

    var hack = window.getHackDetailsText(d);

    var apGain = getAttackApGainText(d,fieldCount, linkCount);
    apGain[1] = apGain[1].replace(/tt/g,'span');

    html += '<span title="'+mitig[2]+'">Shielding: <span>'+mitig[1]+'</span></span>';
    html += '<span title="'+hack[2]+'">Hacks: <span>'+hack[1]+'</span></span>';
    html += '<span title="in + out / field">Links/Fields: <span>'+linksGuid.in.length+'+'+linksGuid.out.length+'/'+fieldCount+'</span></span>';
    html += '<span title="'+apGain[2]+'">AP Gain: <span>'+apGain[1]+'</span></span>';
    html += '<span title="km + isLinkable">Range: <span>'+(parseInt(range.range*0.10)/100)+'km '+isLink+'</span></span>';

    return html;
  }

  window.plugin.pocketPortalDetails.getHTMLResonators = function(data){
    var d = data.portalDetails;
    var html = '';
    var l,v,max,perc;
    var colorTeam = window.plugin.pocketPortalDetails.util.getPortalColorTeam(data);

    html += '<div class="resonatorDetails">';

    for(var i=0;i<8;i++){
      var reso = d.resonators[i];
      var colorRes = colorTeam;
      if(reso){
        l = parseInt(reso.level);
        lvl = 'L'+l;
        v = parseInt(reso.energy);
        o = reso.owner;
        max = window.RESO_NRG[l];
        perc = Math.round((v/max * 100))+'%';
      } else {
        colorRes = '#888';
        o = ' - ';
        l = 0;
        lvl = '';
        v = 0;
        max = 0;
        perc = '';
      }
      var titleTag = '';


      var resoDet = '<span>'+lvl+'</span>';
      if(window.plugin.resoEnergyPctInPortalDetail){
        resoDet = '<span class="left">'+lvl+'</span><span class="right">'+perc+'</span>';
      }

      html += '<div class="resonator '+window.TEAM_TO_CSS[window.getTeam(d)]+'" style="border:1px solid '+colorRes+';" '+titleTag+'>';
        html += '<div class="filllevel" style="border-top-color:'+window.COLORS_LVL[l]+';width:'+perc+';"></div>';
        html += '<div class="text">'+resoDet+'</div>';
      html += '</div>'
    }

    html += '<div style="clear:both;"></div>';
    html += '</div>';

    return html;
  }

  window.plugin.pocketPortalDetails.getHTMLDetails = function(data){
    var d = data.portalDetails;

    var lvl = window.plugin.pocketPortalDetails.util.getPortalLevel(data);
    var lvlFloat = window.plugin.pocketPortalDetails.util.getPortalLevelFloat(data);

    var colorLevel = window.plugin.pocketPortalDetails.util.getPortalColorLevel(data);
    var owner = window.plugin.pocketPortalDetails.util.getPortalOwner(data);
    var title = window.plugin.pocketPortalDetails.util.getPortalTitle(data);
    var colorTeam = window.plugin.pocketPortalDetails.util.getPortalColorTeam(data);
    var factionClass = window.plugin.pocketPortalDetails.util.getPortalFaction(data);
    var cl = ' onclick="window.plugin.pocketPortalDetails.toggleBoxStatus(); return false;"';

    var linksGuid = getPortalLinks(selectedPortal);
    var linkCount = linksGuid.in.length + linksGuid.out.length;
    var fieldCount = getPortalFieldsCount(selectedPortal);
    var range = getPortalRange(d);
    var mitig = window.getMitigationText(d, linkCount);

//        var img = 'style="background-image:url(\''+d.image+'\')"';
//        $('.pocketPortalDetails').css('background-image', 'url(\''+d.image+'\')');

    // --------------------------
    // HTML TOOLTIP
    // --------------------------
    var tableObjPortal = {
      'Title': window.plugin.pocketPortalDetails.util.escapeHTML(title),
      'Owner': '<span style=\'color:'+colorTeam+'\'>'+owner+'</span>',
      'Level': '<span style=\'padding:0 2px;color:#fff;background-color:'+window.COLORS_LVL[lvl]+'\'>L'+lvl+'</span> ('+lvlFloat+')'
    };
    var tableObjResonators = {};
    for(var i in d.resonators){
      var rColorLVL = window.COLORS_LVL[d.resonators[i].level];
      var rLVL = d.resonators[i].level;
      var rStyle = 'background-color:'+rColorLVL+';padding:0 2px;color:#fff;';
      var cPlayer = 'color:'+colorTeam;
      var rOwner = d.resonators[i].owner;

      var maxNrg = window.RESO_NRG[rLVL];
      var fillGrade = d.resonators[i].energy/maxNrg*100;
      var rNrgPerc = Math.round(fillGrade);

      var key = '<span data-ppd=\''+i+'\' style=\'color:rgb(255,'+parseInt(2.55*rNrgPerc)+','+parseInt(2.55*rNrgPerc)+') !important;\'><b>'+rNrgPerc+'%</b></span>';
      tableObjResonators[key] = '<span style=\''+rStyle+'\'>L'+rLVL+'</span> <span style=\''+cPlayer+'\'>'+rOwner+'</span>';
    }
    var tableObjMods = {};
    for(var i in d.mods){
      if(d.mods[i] !== null){
        var mStyle = 'color:'+window.COLORS_MOD[d.mods[i].rarity]+';';
        var mName = d.mods[i].name;
        var mOwner = d.mods[i].owner;

        var key = '<span data-ppd=\''+i+'\' style=\''+mStyle+'\'>'+mName+'</span>';
        tableObjMods[key] = '<span style=\'color:'+colorTeam+'\'>'+mOwner+'</span>';
      }
    }

    var titleTips = window.plugin.pocketPortalDetails.util.generateHTMLTableTips(tableObjPortal);
    titleTips += window.plugin.pocketPortalDetails.util.generateHTMLTableTips(tableObjResonators);
    titleTips += window.plugin.pocketPortalDetails.util.generateHTMLTableTips(tableObjMods);

    // --------------------------
    // HTML CONTAINER
    // --------------------------
    var t = '';
    if(0 == 0){
    t += '<div title="'+titleTips+'">';
      t += '<div class="header">';
        t += '<span class="portalHeader" '+cl+'>';
//          t += '<span class="imgpreview" '+img+'></span> ';
          t += '<span class="portalLevel"'+colorLevel+'>L'+lvl+'</span> ';
          t += '<span class="portalTitle '+factionClass+'">'+title+'</span>';
        t += '</span>';
        t += '<span class="moveButton" title="Move box" onclick="window.plugin.pocketPortalDetails.toggleBoxPosition();return false;">&lrarr;</span>';
        t += '<span class="closeButton" title="Deselect Portal" onclick="renderPortalDetails(null);">X</span>';
        t += '<div style="clear:both;"></div>';
      t += '</div>';

      t += '<div class="content" '+cl+'>';
        t += '<div class="column left">'+window.plugin.pocketPortalDetails.getHTMLResonators(data)+'</div>';
        t += '<div class="column right">'+window.plugin.pocketPortalDetails.getHTMLMods(data)+'</div>';
        t += '<div class="column large infoData">';
          t += '<span>Links: <i>'+linksGuid.in.length+' in / '+linksGuid.out.length+' out</i></span> &bull; ';
          t += '<span>Fields: <i>'+fieldCount+'</i></span> &bull; ';
          t += '<span>Mitig: <i>'+mitig[1]+'</i></span>';
        t += '</div>';
      t += '</div>';
    t += '</div>';
    }

    return t;
  }

  // -----------------------------------------------------------------

    window.plugin.pocketPortalDetails.data.setBoxPosition = function(number_position){
        switch(number_position){
            case 1: pos = 'top-center'; break;
            default: pos = 'bottom-right'; break;
        }
        window.plugin.pocketPortalDetails.obj['position'] = pos;
        window.plugin.pocketPortalDetails.storage.save();
    }
    window.plugin.pocketPortalDetails.data.setBoxStatus = function(boolean){
        window.plugin.pocketPortalDetails.obj['status'] = boolean;
        window.plugin.pocketPortalDetails.storage.save();
    }

  // -----------------------------------------------------------------

  window.plugin.pocketPortalDetails.appendDetails = function(data){
    var html = window.plugin.pocketPortalDetails.getHTMLDetails(data);
    $('.pocketPortalDetails').html(html);

    window.plugin.pocketPortalDetails.sidebarIsVisible();
  }

  window.plugin.pocketPortalDetails.sidebarIsVisible = function(){
    var sidebar = $('#scrollwrapper');
    if(sidebar.is(':visible')){
      $('.pocketPortalDetails').hide();
    }else{
      $('.pocketPortalDetails').show();
    }
  }

  window.plugin.pocketPortalDetails.toggleBoxPosition = function(){
    var box = $('.pocketPortalDetails');
    var isBottomRight = $('#updatestatus .pocketPortalDetails');
    var boxHTML = box.detach();

    if(isBottomRight.length){
      $('body').append(boxHTML);
            var pos = 1;
    }else{
      $('#updatestatus').prepend(boxHTML);
            var pos = 0;
    }

        window.plugin.pocketPortalDetails.data.setBoxPosition(pos);
  }
    window.plugin.pocketPortalDetails.toggleBoxStatus = function(){
        var status = true;
        var elem = $('.pocketPortalDetails');

        elem.toggleClass('close');

        if(elem.hasClass('close')){
            status = false;
        }

        window.plugin.pocketPortalDetails.data.setBoxStatus(status);
    }

  window.plugin.pocketPortalDetails.boot = function(){
        var opt = window.plugin.pocketPortalDetails.obj;

        if(opt.status === false){
            window.plugin.pocketPortalDetails.toggleBoxStatus();
        }
        if(opt.position === 'top-center'){
            window.plugin.pocketPortalDetails.toggleBoxPosition();
        }
    }

  // -----------------------------------------------------------------
  // CSS
  // -----------------------------------------------------------------
  window.plugin.pocketPortalDetails.setupCSS = function(){
    $('<style>').prop('type', 'text/css').html(''
      +'.pocketPortalDetails{font-size:13px;cursor:pointer;}'
      +'.pocketPortalDetails .header{font-size:14px;padding:0px 0 1px;color:#FFCE00;}'

      +'.pocketPortalDetails .header .portalHeader{float:left;width:87%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}'
          +'.pocketPortalDetails .header .imgpreview{background-size:cover;height:20px;width:20px; }'

          +'.pocketPortalDetails .header .portalLevel{padding:0 4px;color:#fff;text-shadow:0 0 2px #222,0 0 7px #222;}'
          +'.pocketPortalDetails .header .portalEnergy{padding:0 4px;}'
          +'.pocketPortalDetails .header .portalTitle{}'
          +'.pocketPortalDetails .header .closeButton, .pocketPortalDetails .header .moveButton{float:right;cursor:pointer;width:7%;text-align:center;}'
          +'.pocketPortalDetails .header .moveButton{width:4%;height:15px;color:#fff;}'

      +'.pocketPortalDetails .content .column.left{width:76%;float:left;}'
      +'.pocketPortalDetails .content .column.right{width:24%;padding-top:2px;float:left;}'
          +'.pocketPortalDetails .content .resonatorDetails .resonator,'
          +'.pocketPortalDetails .content .modDetails .mod'
          +'{margin-bottom:5px;line-height:13px;margin-right:3%;padding:1px;width:22%;'
          +'height:17px;text-align:center;box-sizing:border-box;'
          +'border-width:1px;border-style:solid;float:left;}'

          +'.pocketPortalDetails .content .resonatorDetails{padding:3px 0 2px;}'
          +'.pocketPortalDetails .content .resonatorDetails .resonator{width:22%;margin:2px 1.5%;background:rgba(0,0,0,.6);}'
          +'.pocketPortalDetails .content .resonatorDetails .resonator .filllevel{border-top-width:13px;border-top-style:solid;}'
          +'.pocketPortalDetails .content .resonatorDetails .resonator .text{font-size:12px;position:relative;top:-12px;color:#fff;color:rgba(255,255,255,.9);text-shadow:0 0 7px #222,0 0 7px #222;padding:0 1px;}'
          +'.pocketPortalDetails .content .resonatorDetails .resonator .text span{width:35%;text-align:left;display:inline-block;}'
          +'.pocketPortalDetails .content .resonatorDetails .resonator .text .right{width:65%;text-align:right;}'

          +'.pocketPortalDetails .content .modDetails .mod{width:42%;margin:2px 4%;background:rgba(0,0,0,.6);}'

          +'.pocketPortalDetails .content .infoData{padding:0 3px;color:#aaa;position:relative;top:-1px;clear:both;}'
          +'.pocketPortalDetails .content .infoData span i{color:#ffce00;}'


      +'#updatestatus .pocketPortalDetails.close .header,'
      +'#updatestatus .pocketPortalDetails .content{border-bottom:1px solid #20A8B1;margin-bottom:4px;}'

      +'.pocketPortalDetails.close .content{display:none;}'
      +'.pocketPortalDetails.close .header{margin-bottom:3px;}'

      +'body > .pocketPortalDetails{width:292px;left:-146px;position:absolute;top:0;margin-left:50%;z-index:1000;}'
      +'body > .pocketPortalDetails{background:rgba(8,48,78,.9);border:1px solid #20A8B1;border-top-width:0;}'

      +'body > .pocketPortalDetails .header{padding:4px 4px 0;}'

    ).appendTo('head');
  }

  //******************************************************************

  var setup = function(){
    if(!window.isSmartphone()){
      window.plugin.pocketPortalDetails.setupCSS();

      $('#updatestatus').prepend('<div class="pocketPortalDetails"></div>');
            window.plugin.pocketPortalDetails.storage.check();

      window.addHook('portalDetailsUpdated', window.plugin.pocketPortalDetails.appendDetails);
      window.addHook('portalSelected', function(data){
        if(data.selectedPortalGuid === null){
          $('.pocketPortalDetails').addClass('deselected').html('');
        }
      });

            window.plugin.pocketPortalDetails.boot();

      $('#sidebartoggle').on('click', function(){
        window.plugin.pocketPortalDetails.sidebarIsVisible();
      });
    }
  }

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

