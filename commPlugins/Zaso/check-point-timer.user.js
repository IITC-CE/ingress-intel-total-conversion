// ==UserScript==
// @author         Zaso
// @name           Check Point Timer
// @category       Info
// @version        0.1.2.20200216.174028
// @description    Add to the sidebar a countdown timer to next checkpoint.
// @id             check-point-timer@Zaso
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/check-point-timer.user.js
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/check-point-timer.meta.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'ZasoItems';
plugin_info.dateTimeVersion = '2020-02-16-174028';
plugin_info.pluginId = 'check-point-timer';
//END PLUGIN AUTHORS NOTE

// PLUGIN START ////////////////////////////////////////////////////////
// History
// 0.1.2 Headers changed. Ready for IITC-CE
// 0.1.1 Original sript


	// use own namespace for plugin
	window.plugin.cpTimer = function(){};

	window.plugin.cpTimer.timer = {};
	window.plugin.cpTimer.dom = {};
	window.plugin.cpTimer.timers = {}

	window.plugin.cpTimer.ui = {};
	window.plugin.cpTimer.util = {};
	window.plugin.cpTimer.action = {};

	window.plugin.cpTimer.secCP = (60*60)*5;
	window.plugin.cpTimer.secSept = ((60*60)*5)*(7*5);
	window.plugin.cpTimer.nextCP = 0;

	//------------------------------------------------------------------

	window.plugin.cpTimer.getNow = function(){
        var arr = [4,6,20];
        var arr = [0,0,0];
        var plus = ((60*60*arr[0])+(60*arr[1])+(arr[2]))*1000;
        return new Date().getTime()+plus;
    }

	window.plugin.cpTimer.getSeptDateTs = function(){
		var now = window.plugin.cpTimer.getNow();
		var septStart = Math.floor(now / (window.plugin.cpTimer.secSept*1000))*(window.plugin.cpTimer.secSept*1000);
		var septEnd = septStart+window.plugin.cpTimer.secSept*1000;

		return [septStart, septEnd];
	}
	window.plugin.cpTimer.ui.appendSeptDateHTML = function(){
		var sept = window.plugin.cpTimer.getSeptDateTs();
		var septStart = unixTimeToString(sept[0],true).slice(0, -3);
		var septEnd = unixTimeToString(sept[1],true).slice(0, -3);
//        var cpList = window.plugin.cpTimer.util.getCPlistTooltip();
        var cpList = '';

		var html = '';
		html += '<div class="sept help" title="'+cpList+'">';
//            html += '<div title="Cycle start">'+septStart+'</div>';
//            html += '<div title="Cycle End">'+septEnd+'</div>';
            html += '<div>'+septStart+'</div>';
            html += '<div>'+septEnd+'</div>';
		html += '</div>';

		$('#cp-timer').append(html);

//        window.plugin.cpTimer.util.updateCPlistTooltip();
	}

	window.plugin.cpTimer.util.getTimerData = function(id){
		return window.plugin.cpTimer.timers[id];
	}
	window.plugin.cpTimer.util.getDom = function(id){
		return window.plugin.cpTimer.dom[id];
	}

	window.plugin.cpTimer.util.getPreviousNextCP = function(){
		var now = window.plugin.cpTimer.getNow();
		var start = Math.floor(now / (window.plugin.cpTimer.secCP*1000))*(window.plugin.cpTimer.secCP*1000);
		var end = start+window.plugin.cpTimer.secCP*1000;

        s = unixTimeToString(start,true).slice(0, -3);
        e = unixTimeToString(end,true).slice(0, -3);

        return  [[start, s],[end, e]];
    }
	window.plugin.cpTimer.util.getPreviousCP = function(){
        return window.plugin.cpTimer.util.getPreviousNextCP()[0];
    }
	window.plugin.cpTimer.util.getNextCP = function(){
        return window.plugin.cpTimer.util.getPreviousNextCP()[1];
    }

	window.plugin.cpTimer.util.getCPlist = function(){
        var startend = window.plugin.cpTimer.getSeptDateTs();
        var start = startend[0];
        var end = startend[1];

        var list = [];
        var t = start;

        while(t<end){
            t = t+(window.plugin.cpTimer.secCP*1000);
            f = unixTimeToString(t,true).slice(0, -3);
            list.push([t, f]);
        }

        return list;
    }
	window.plugin.cpTimer.util.getCPlistTooltip = function(){
        var list = window.plugin.cpTimer.util.getCPlist();
        var nextCP = window.plugin.cpTimer.util.getNextCP();

        var html = '';
        var isPast = true;
        var quote = '&quot;';
        var quote = '"';

        html += '<ol class='+quote+'cp_list'+quote+'>';
        for(i in list){
            var cp_date = list[i][1].split(' ');
            var ymd = '<span class='+quote+'cp_ymd'+quote+'>'+cp_date[0]+'</span>';
            var hms = '<span class='+quote+'cp_hms'+quote+'>'+cp_date[1]+'</span>';
            var html_date = ymd+' '+hms;

            if(nextCP[1] == list[i][1]){
                html += '<li class='+quote+'cp_list_item cp_next'+quote+'>'+html_date+'</li>';
                isPast = false;
            }else{
                if(isPast === true){
                    html += '<li class='+quote+'cp_list_item cp_past'+quote+'>'+html_date+'</li>';
                }else{
                    html += '<li class='+quote+'cp_list_item cp_future'+quote+'>'+html_date+'</li>';
                }
            }
        }
        html += '</ol>';

        return '<div class='+quote+'cp_tooltip'+quote+'>'+html+'</div>';
    }
	window.plugin.cpTimer.util.updateCPlistTooltip = function(){
        var newList = window.plugin.cpTimer.util.getCPlistTooltip();
        $('#cp-timer .sept').attr('title', newList);
    }

	window.plugin.cpTimer.timers = {
		'cp':{
			id: 'cp',
			label: 'Next CP',
			start: window.plugin.cpTimer.getSeptDateTs()[0],
			duration: window.plugin.cpTimer.secCP
		},
	};

	//------------------------------------------------------------------

	window.plugin.cpTimer.startTimer = function(id){
		window.plugin.cpTimer.timer[id] = setInterval(function(){
			window.plugin.cpTimer.updateTimer(id)
		},1000);
	}
	window.plugin.cpTimer.stopTimer = function(id){
		clearTimeout(window.plugin.cpTimer.timer[id]);
	}
	window.plugin.cpTimer.updateTimer = function(id){
		var t = window.plugin.cpTimer.util.getTimerData(id);
		var domElem = window.plugin.cpTimer.util.getDom(id);

		var start = t.start,
			duration = t.duration,
			diff,
			hours,
			minutes,
			seconds;

        var now = window.plugin.cpTimer.getNow();

		// get the number of seconds that have elapsed since 
		// startTimer() was called
		delta = ((now - start) / 1000);
		while(delta > duration){
			delta -= duration;
		}
		diff = duration - delta;

		// does the same job as parseInt truncates the float
		hours = (diff / 3600) | 0;
		minutes = ((diff % 3600) / 60) | 0;
		seconds = (diff % 60) | 0;

		hours = hours < 10 ? "0" + hours : hours;
		minutes = minutes < 10 ? "0" + minutes : minutes;
		seconds = seconds < 10 ? "0" + seconds : seconds;

		// videostamp
		domElem.children('.timer').html(hours + ":" + minutes + ":" + seconds);

/*
		if (diff <= 0){
			// add one second so that the count down starts at the full duration
			// example 05:00 not 04:59
			start = Date.now() + 1000;
		}
*/
		// we don't want to wait a full second before the timer starts

        if(now > window.plugin.cpTimer.nextCP){
            window.plugin.cpTimer.nextCP = window.plugin.cpTimer.util.getNextCP()[0];
            window.plugin.cpTimer.util.updateCPlistTooltip();
        }
	}

	window.plugin.cpTimer.ui.getContainerHTML = function(){
		return '<div id="cp-timer"></div>';
	}
	window.plugin.cpTimer.ui.getTimerHTML = function(id){
		var t = window.plugin.cpTimer.util.getTimerData(id);
		var clickAction = 'onclick="window.plugin.cpTimer.action.click(\''+id+'\');return false;"';
		var title = 'title="Click to stop/play the timer"';

//		var clickAction = '';
//		var title = '';

		var html = '';
		html += '<div class="timerBox">';
			html += '<span class="label">'+t.label+'</span>';
			html += '<a class="timer" '+clickAction+' '+title+'>00:00:00</a>';
		html += '</div>';
		return html;
	}
	window.plugin.cpTimer.ui.appendTimer = function(id){
		var dom = window.plugin.cpTimer.ui.getTimerHTML(id);
		var d = $(dom).appendTo('#cp-timer');
		window.plugin.cpTimer.dom[id] = d;
	}

	window.plugin.cpTimer.action.setAllTimers = function(){
		for(id in window.plugin.cpTimer.timers){
			window.plugin.cpTimer.action.setTimer(id);
		}
	};
	window.plugin.cpTimer.action.setTimer = function(id){
		window.plugin.cpTimer.ui.appendTimer(id);
		window.plugin.cpTimer.startTimer(id);
	};
	window.plugin.cpTimer.action.click = function(id){
		var domElem = window.plugin.cpTimer.util.getDom(id);

		if(domElem.hasClass('stopped')){
			window.plugin.cpTimer.startTimer(id);
			domElem.removeClass('stopped');
		}else{
			window.plugin.cpTimer.stopTimer(id);
			domElem.addClass('stopped');
		}
	}

	window.plugin.cpTimer.action.destroyTimer = function(id){
		window.plugin.cpTimer.stopTimer(id);
		window.plugin.cpTimer.util.getDom(id).remove();
		delete window.plugin.cpTimer.dom[id];
	}

	//------------------------------------------------------------------
	// Append the stylesheet
	//------------------------------------------------------------------
	window.plugin.cpTimer.setupCSS = function(){
		$('<style>').prop('type', 'text/css').html(''
			+'#cp-timer{color:#ffce00;padding:3px 10px 0;}'
			+'#cp-timer a.timer{background:rgba(0,0,0,.3);padding:2px 7px 0px;border:1px solid #FFCE00;display:inline-block;cursor:pointer;font-size:18px;color:#FFCE00;margin-left:5px;}'
			+'#cp-timer > div{width:58%;display:inline-block;}'
			+'#cp-timer .cp{position:relative;top:-6px;}'
			+'#cp-timer .sept{width:42%;text-align:right;}'
			+'#cp-timer .help{cursor:help;}'

			+'#cp-timer .timerBox{position:relative;top:-6px;}'
			+'#cp-timer .timerBox.stopped a.timer{border-color:#aaa;color:#aaa;}'
			+'#cp-timer .timerBox a.timer:hover{ text-decoration:none; }'

			+'.ui-tooltip .cp_tooltip .cp_list{text-align:center;list-style:none;padding:0;margin:0;}'
			+'.ui-tooltip .cp_tooltip .cp_list_item{}'
			+'.ui-tooltip .cp_tooltip .cp_list_item.cp_next{font-size:15px;padding:4px 1px 2px;}'
			+'.ui-tooltip .cp_tooltip .cp_list_item.cp_past{opacity:.6}'
			+'.ui-tooltip .cp_tooltip .cp_list_item .cp_ymd{color:#eee;}'
			+'.ui-tooltip .cp_tooltip .cp_list_item .cp_hms{color:#ffce00;}'
		).appendTo('head');
	}

	//******************************************************************

	var setup = function(){
		window.plugin.cpTimer.setupCSS();
		$('#sidebar').append(window.plugin.cpTimer.ui.getContainerHTML());
		window.plugin.cpTimer.action.setAllTimers();
		window.plugin.cpTimer.ui.appendSeptDateHTML();
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

