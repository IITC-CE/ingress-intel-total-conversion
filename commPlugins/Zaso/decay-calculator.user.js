// ==UserScript==
// @author         Zaso
// @name           Decay Calculator
// @category       Info
// @version        0.0.3.20200723.162738
// @description    Estimate the portal decaying.
// @id             decay-calculator@Zaso
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/decay-calculator.user.js
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/decay-calculator.meta.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'ZasoItems';
plugin_info.dateTimeVersion = '2020-07-23-162738';
plugin_info.pluginId = 'decay-calculator';
//END PLUGIN AUTHORS NOTE



// PLUGIN START ////////////////////////////////////////////////////////
// History
// 0.0.4 moving some constants
// 0.0.3 Headers changed. Ready for IITC-CE
// 0.0.2 Original sript


  // use own namespace for plugin
  window.plugin.decayCalculator = function() {};
  window.plugin.decayCalculator.decayRate = 15; // percent of resonator's capacity per day

  window.plugin.decayCalculator.generateArrayEnergy = function(data){
    var d = data.portalDetails;

    var l,v,max,perc,perc2;
    var list = [];

    for(var i=0;i<8;i++){
      var reso = d.resonators[i];
      if(reso){
        l = parseInt(reso.level);
        v = parseInt(reso.energy);
        max = RESO_NRG[l];
        perc = Math.round((v/max * 100));
        perc2 = v/max * 100;
      } else {
        l = 0;
        v = 0;
        max = 0;
        perc = 0;
        perc2 = 0;
      }

      list.push(perc);
    }
    return list.sort();
  }
  window.plugin.decayCalculator.generateArrayDays = function(risArray){
    list = [];

    for(i in risArray){
      var gg = window.plugin.decayCalculator.risDecay(risArray[i]);
      list.push(gg);
    }
    return list.sort();
  }

  window.plugin.decayCalculator.risMin = function(risArray){
    var min = 0;
    for(i in risArray){
      min = Math.min(min, risArray[i]);
    }
    return(min);
  }
  window.plugin.decayCalculator.risMax = function(risArray){
    var max = 0;
    for(i in risArray){
      max = Math.max(max, risArray[i]);
    }
    return(max);
  }

  window.plugin.decayCalculator.risDecay = function(ris){
    return Math.ceil(ris/window.plugin.decayCalculator.decayRate);
  }

  window.plugin.decayCalculator.portalNeut = function(risArray){
    var max = window.plugin.decayCalculator.risMax(risArray);
    var gg = window.plugin.decayCalculator.risDecay(max);

    return(gg);
  }
  window.plugin.decayCalculator.linkNeut = function(risArray){
    arrDays = window.plugin.decayCalculator.generateArrayDays(risArray);
    var gg = window.plugin.decayCalculator.risDecay(risArray[5]);
    return gg;
  }

  //---------------------------------------------------------------------------------------

  window.plugin.decayCalculator.appendDetails = function(data){
    window.plugin.decayCalculator.appendDetails2(data);
  }

  window.plugin.decayCalculator.appendDetails2 = function(data){
    risArray = window.plugin.decayCalculator.generateArrayEnergy(data);

    fd = window.plugin.decayCalculator.risDecay(risArray[0]);
    ld = window.plugin.decayCalculator.linkNeut(risArray);
    pd = window.plugin.decayCalculator.portalNeut(risArray);

    var html = '';
    html += '<div>Incomplete in<br/>max <b>'+fd+'</b> day(s)</div>';
    html += '<div>Links expires in<br/>max <b>'+ld+'</b> day(s)</div>';
    html += '<div>Neutral in<br/>max <b>'+pd+'</b> day(s)</div>';

    $('#portaldetails .linkdetails').before('<div class="decayCalculator">'+html+'</div>');
  }

  //---------------------------------------------------------------------------------------
  // Append the stylesheet
  //---------------------------------------------------------------------------------------
  window.plugin.decayCalculator.setupCSS = function(){
    $('<style>').prop('type', 'text/css').html(''
      +'.decayCalculator{text-align:center;padding:2px 0 3px;border:1px solid #20A8B1;border-width:1px 0;}'
      +'.decayCalculator div{display:inline-block;width:33%;color:lightgrey;}'
      +'.decayCalculator div b{color:#ffce00;}'
    ).appendTo('head');
  }

  var setup = function() {
    window.plugin.decayCalculator.setupCSS();

    window.addHook('portalDetailsUpdated', window.plugin.decayCalculator.appendDetails);
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

