// ==UserScript==
// @author         Zaso
// @name           Chat Message Length
// @category       Tweaks
// @version        0.1.3.20200216.174028
// @description    Counts the chat message characters.
// @id             chat-message-length@Zaso
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/chat-message-length.user.js
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/chat-message-length.meta.js
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
plugin_info.pluginId = 'chat-message-length';
//END PLUGIN AUTHORS NOTE

// PLUGIN START ////////////////////////////////////////////////////////
// History
// 0.1.3 Headers changed. Ready for IITC-CE
// 0.1.2 Original sript


	// use own namespace for plugin
	window.plugin.chatMsgLen = function(){};
	window.plugin.chatMsgLen.maxChar = 256;
	window.plugin.chatMsgLen.chatLen = 0;

	window.plugin.chatMsgLen.getChatLen = function(){
		return window.plugin.chatMsgLen.chatLen;
	}
	window.plugin.chatMsgLen.saveChatLen = function(){
		window.plugin.chatMsgLen.chatLen = $('#chattext').val().length;
	}

	window.plugin.chatMsgLen.checkLimit = function(){
		var l = window.plugin.chatMsgLen.getChatLen();
		var m = window.plugin.chatMsgLen.maxChar;
		if(l > m){
			$('#chattext-count').addClass('red');
			return 0;
		}else{
			$('#chattext-count').removeClass('red');
			return 1;
		}
	}

	window.plugin.chatMsgLen.updateCount = function(){
		window.plugin.chatMsgLen.saveChatLen();
		var l = window.plugin.chatMsgLen.getChatLen();
		var m = window.plugin.chatMsgLen.maxChar;
		$('#chattext-count').text(m-l);
		window.plugin.chatMsgLen.checkLimit();
	}

	window.plugin.chatMsgLen.setupCSS = function(){
		$("<style>").prop("type", "text/css").html(''
//			+'#chatinput #chattext{width:94%;}'
			+'#chatinput.chatMsgLen td.chatMsgLen{display:flex;flex-direction:row;}'
			+'#chatinput.chatMsgLen #chattext{flex:1;}'
			+'#chatinput.chatMsgLen #chattext-count{color:#aaa;display:inline;padding:0 3px 0 7px;margin:0;line-height:23px;}'
			+'#chatinput.chatMsgLen #chattext-count.red{color:#f66;}'
		).appendTo("head");
	};

	window.plugin.chatMsgLen.appendCounter = function(){
        $('#chatinput').addClass('chatMsgLen');
        $('#chattext').parent('td').addClass('chatMsgLen');

        if($('#chattext-count').length < 1){
            window.plugin.chatMsgLen.appendContent = '<p id="chattext-count" class="chatMsgLen"></p>';
            $('#chattext').after(window.plugin.chatMsgLen.appendContent);
        }
    }

	window.plugin.chatMsgLen.initBind = function(){
		$('#chattext').bind('input propertychange', function(){
			window.plugin.chatMsgLen.updateCount();
		});
		//Used 'focus' to update the counter when a player nickname is clicked
		$('#chattext').bind('focus', function(){
			window.plugin.chatMsgLen.updateCount();
		});
    }

	var setup =  function(){
		window.plugin.chatMsgLen.setupCSS();
        window.plugin.chatMsgLen.appendCounter();
        window.plugin.chatMsgLen.initBind();
		window.plugin.chatMsgLen.updateCount();
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

