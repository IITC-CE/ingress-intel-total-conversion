// ==UserScript==
// @author         Zaso
// @name           Fake Message Location
// @category       Misc
// @version        0.1.1.20200216.174029
// @description    Set a location. The COMM messages you send will have the setted location.
// @id             fake-message-location@Zaso
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/fake-message-location.user.js
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/fake-message-location.meta.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'ZasoItems';
plugin_info.dateTimeVersion = '2020-02-16-174029';
plugin_info.pluginId = 'fake-message-location';
//END PLUGIN AUTHORS NOTE



// PLUGIN START ////////////////////////////////////////////////////////
// History
// 0.1.1 Headers changed. Ready for IITC-CE
// 0.1.0 Original sript


	window.plugin.fakeMsgLoc = {};

    window.plugin.fakeMsgLoc.storage = {};
    window.plugin.fakeMsgLoc.obj = {};
    window.plugin.fakeMsgLoc.data = {};
    window.plugin.fakeMsgLoc.getHTML = {};
    window.plugin.fakeMsgLoc.dialog = {};
    window.plugin.fakeMsgLoc.action = {};
    window.plugin.fakeMsgLoc.ui = {};
    window.plugin.fakeMsgLoc.override = {};

    // *****************************************************************

    //-----------------------------------
    // OBJECT
    //-----------------------------------
    window.plugin.fakeMsgLoc.obj.getMainObjDefault = function(){
        return {location: null, enabled: false};
    }
	window.plugin.fakeMsgLoc.obj.main = window.plugin.fakeMsgLoc.obj.getMainObjDefault();

    //-----------------------------------
    // STORAGE
    //-----------------------------------
	window.plugin.fakeMsgLoc.storage.NAME = 'plugin-fake-message-location';
	window.plugin.fakeMsgLoc.storage.save = function(){
		window.localStorage[window.plugin.fakeMsgLoc.storage.NAME] = JSON.stringify(window.plugin.fakeMsgLoc.obj.main);
	}
	window.plugin.fakeMsgLoc.storage.load = function(){
		window.plugin.fakeMsgLoc.obj.main = JSON.parse(window.localStorage[window.plugin.fakeMsgLoc.storage.NAME]);
	}
	window.plugin.fakeMsgLoc.storage.reset = function(){
        window.plugin.fakeMsgLoc.data.setMainObj(window.plugin.fakeMsgLoc.obj.getMainObjDefault());
        window.plugin.fakeMsgLoc.storage.save();
	}
	window.plugin.fakeMsgLoc.storage.delete = function(){
       delete window.localStorage[window.plugin.fakeMsgLoc.storage.NAME];
	}
	window.plugin.fakeMsgLoc.storage.check = function(){
		if(!window.localStorage[window.plugin.fakeMsgLoc.storage.NAME]){
            window.plugin.fakeMsgLoc.storage.reset();
		}
        window.plugin.fakeMsgLoc.storage.load();
	}

    //-----------------------------------
    // DATA
    //-----------------------------------
    window.plugin.fakeMsgLoc.data.setMainObj = function(obj){
        window.plugin.fakeMsgLoc.obj.main = obj;
    }
    window.plugin.fakeMsgLoc.data.getMainObj = function(){
        return window.plugin.fakeMsgLoc.obj.main;
    }

    window.plugin.fakeMsgLoc.data.setFakeLoc = function(loc){
        var newLoc = null;
        if(loc instanceof L.LatLng){
            newLoc = loc;
        }
        window.plugin.fakeMsgLoc.obj.main.location = loc;
    }
    window.plugin.fakeMsgLoc.data.getFakeLoc = function(){
        try{
            var main = window.plugin.fakeMsgLoc.data.getMainObj();
            var loc = L.latLng(main.location.lat, main.location.lng);
            return loc;
        }catch(e){
            return false;
        }
    }

    window.plugin.fakeMsgLoc.data.isEnabledFake = function(){
        var main = window.plugin.fakeMsgLoc.data.getMainObj();
        if(main.enabled === true){ return true; }
        return false;
    }
    window.plugin.fakeMsgLoc.data.setFakeStatus = function(bool){
        var bool = (bool === true)? true : false;
        window.plugin.fakeMsgLoc.obj.main.enabled = bool;
    }
    window.plugin.fakeMsgLoc.data.toggleFakeStatus = function(){
        var isEnabledFake = window.plugin.fakeMsgLoc.data.isEnabledFake();
        window.plugin.fakeMsgLoc.data.setFakeStatus(!isEnabledFake);

        return window.plugin.fakeMsgLoc.data.isEnabledFake();
    }

    window.plugin.fakeMsgLoc.data.getCurrLoc = function(){
        return window.map.getCenter();
    }
    window.plugin.fakeMsgLoc.data.getLocForMsg = function(){
        var isEnabledFake = window.plugin.fakeMsgLoc.data.isEnabledFake();
        var currLoc = window.plugin.fakeMsgLoc.data.getCurrLoc();
        var fakeLoc = window.plugin.fakeMsgLoc.data.getFakeLoc();

        if(isEnabledFake){
            if(fakeLoc !== false){
                return fakeLoc;
            }
        }

        return currLoc;
    }
    window.plugin.fakeMsgLoc.data.getFakePermalink = function(){
        var url = 'https://intel.ingress.com/';
        var loc = window.plugin.fakeMsgLoc.data.getFakeLoc();

        if(loc === false){ return false; }

        var lat = Math.round(loc.lat*1E6)/1E6;
        var lng = Math.round(loc.lng*1E6)/1E6;

        var qry = 'll='+lat+','+lng+'&z='+map.getZoom();
        var perma = url+'?'+qry;

        return perma;
    }

    //-----------------------------------
    // HTML
    //-----------------------------------
    window.plugin.fakeMsgLoc.getHTML.toolbox = function(){
        var html = '';
        var fa = (window.plugin.faIcon)? '<i class="fa fa-commenting"></i>' : '';

        html += '<a onclick="window.plugin.fakeMsgLoc.dialog.openSettings();">'+fa+'Fake Msg Loc</a>';

        return html;
    }

    window.plugin.fakeMsgLoc.getHTML.settings = function(){
        var isEnabledFake = window.plugin.fakeMsgLoc.data.isEnabledFake();
        var checkStatus = (isEnabledFake)? ' checked ' : '';
        var html = '';

        html += '';
        html += '<div class="fakeMsgLoc settings">';
            html += '<div>';
                html += '<label class="checkbox">';
                    html += '<input type="checkbox" onclick="window.plugin.fakeMsgLoc.action.fakeLocToggleStatus();" name="enableFakeMsgLoc" '+checkStatus+' />';
                    html += 'Enable fake messages location';
                html += '</label>';
            html += '<a class="btn" onclick="window.plugin.fakeMsgLoc.action.saveCurrLoc();return false;">Save Curr Location</a>';

            html += '<hr/>';

            html += '<a class="btn" onclick="window.plugin.fakeMsgLoc.action.moveToFakeLoc();return false;">Move to Fake Msg Location</a>';
            html += '<a class="btn" onclick="window.plugin.fakeMsgLoc.action.copyFakePerma();return false;">Copy Fake Permalink</a>';
            html += '</div>';
        html += '</div>';

        return html;
    }

    //-----------------------------------
    // ACTION
    //-----------------------------------
    window.plugin.fakeMsgLoc.action.saveCurrLoc = function(){
        try{
            var loc = window.plugin.fakeMsgLoc.data.getCurrLoc();
            window.plugin.fakeMsgLoc.data.setFakeLoc(loc);
            window.plugin.fakeMsgLoc.storage.save();

            window.plugin.fakeMsgLoc.dialog.openMessage('Fake Message Location saved.')
        }catch(e){
            window.plugin.fakeMsgLoc.dialog.openMessage('Fake Message Location not saved.')
        }
    }

    window.plugin.fakeMsgLoc.action.moveToFakeLoc = function(){
        var loc = window.plugin.fakeMsgLoc.data.getFakeLoc();
        if(loc instanceof L.LatLng){
            window.map.setView(loc);
        }else{
            window.plugin.fakeMsgLoc.dialog.openFakeMsgLocError();
        }
    }

    window.plugin.fakeMsgLoc.action.fakeLocToggleStatus = function(){
        var isEnabled = window.plugin.fakeMsgLoc.data.toggleFakeStatus();
        var fakeLoc =  window.plugin.fakeMsgLoc.data.getFakeLoc();

        window.plugin.fakeMsgLoc.storage.save();
        window.plugin.fakeMsgLoc.ui.setChattextClass();

        if(isEnabled && fakeLoc === false){
            window.plugin.fakeMsgLoc.dialog.openFakeMsgLocError();
        }
    }

    window.plugin.fakeMsgLoc.action.copyInClipBoard = function(text){
        $('body').append('<textarea id="quickCopy-textarea">'+text+'</textarea>');
        var elem = $('#quickCopy-textarea');

        elem.select();
        document.execCommand('copy');
        elem.remove();

        var notifyStyle= 'display:none;width:200px;height:20px;height:auto;position:absolute;left:50%;margin-left:-100px;top:20px;z-index:10000;background-color: #383838;color: #F0F0F0;font-family: Calibri;font-size: 20px;padding:10px;text-align:center;border-radius: 2px;box-shadow: 0px 0px 24px -1px rgba(56, 56, 56, 1);}';
        var notifyDOM= '<div class="quickCopy_notify" style="'+notifyStyle+'">Text Copied</div>';

        $('body').append(notifyDOM);
        $('.quickCopy_notify')
            .fadeIn(200)
            .delay(1000)
            .fadeOut(200, function(){
                $('.quickCopy_notify').remove();
            });
    }

    window.plugin.fakeMsgLoc.action.copyFakePerma = function(){
        var fakePerma = window.plugin.fakeMsgLoc.data.getFakePermalink();
        if(fakePerma){
            window.plugin.fakeMsgLoc.action.copyInClipBoard(fakePerma);
        }else{
            window.plugin.fakeMsgLoc.dialog.openFakeMsgLocError();
        }
    }

    //-----------------------------------
    // DIALOG
    //-----------------------------------
    window.plugin.fakeMsgLoc.dialog.openSettings = function(){
        var html = window.plugin.fakeMsgLoc.getHTML.settings();

        dialog({
            title: 'Fake Message Location',
            html: html,
            width: 270,
            dialogClass: 'ui-dialog-fakeMsgLoc fakeMsgLoc settings'
        });
    }

    window.plugin.fakeMsgLoc.dialog.openMessage = function(text){
        var html = text;

        dialog({
            title: 'Fake Message Location - Alert',
            html: html,
            width: 270,
            dialogClass: 'ui-dialog-fakeMsgLoc fakeMsgLoc message'
        });
    }

    window.plugin.fakeMsgLoc.dialog.openFakeMsgLocError = function(){
        var txt = 'A corretc Fake Message Location is not setted.'
        window.plugin.fakeMsgLoc.dialog.openMessage(txt);
    }

	window.plugin.fakeMsgLoc.dialog.promptAreYouSure = function(title){
        var promptAction = confirm(title, '');
        if(promptAction){ return true; }
        return false;
    }

    //-----------------------------------
    // UI
    //-----------------------------------
	window.plugin.fakeMsgLoc.ui.setupCSS = function(){
		$('<style>').prop('type', 'text/css').html(''
			+'.fakeMsgLoc.settings{ text-align:center; }'
			+'.fakeMsgLoc .btn{ display:block;width:80%;margin:10px auto 0px;border:1px solid #ffce00;text-align:center;padding:3px 0 3px; }'
			+'.fakeMsgLoc label.checkbox, .fakeMsgLoc label.checkbox input[type="checkbox"]{ cursor:pointer; }'
			+'.fakeMsgLoc hr{ border:none; border-top:1px solid #20A8B1; }; }'
		).appendTo('head');
	}

	window.plugin.fakeMsgLoc.ui.eventFocusChattext = function(){
        var chatinput = $('#chatinput input#chattext');
        chatinput.focus(function(){
            window.plugin.fakeMsgLoc.ui.setChattextClass();
        });
    }

	window.plugin.fakeMsgLoc.ui.setChattextClass = function(){
        var chatinput = $('#chatinput input#chattext');
        var red = 'rgba(70,21,21,0.7)';
        var none = 'transparent';
        var color = none;

        var isEnabledFake = window.plugin.fakeMsgLoc.data.isEnabledFake();
        if(isEnabledFake){
            color = red;
        }

        chatinput.css('background', color);
    }

	window.plugin.fakeMsgLoc.ui.appendToolbox = function(){
        var html = window.plugin.fakeMsgLoc.getHTML.toolbox();
        $('#toolbox').append(html);
    }

    //-----------------------------------
    // OVERRIDE
    //-----------------------------------
	window.plugin.fakeMsgLoc.override.chat__postMsg = function(){
        window.chat.postMsg = function(){
            var c = chat.getActive();
            if(c == 'alerts')
                return alert("Jarvis: A strange game. The only winning move is not to play. How about a nice game of chess?\n(You can't chat to the 'alerts' channel!)");

            var msg = $.trim($('#chatinput input').val());
            if(!msg || msg === '') return;

            if(c === 'debug') {
                var result;
                try {
                    result = eval(msg);
                } catch(e) {
                    if(e.stack) console.error(e.stack);
                    throw e; // to trigger native error message
                }
                if(result !== undefined)
                    console.log(result.toString());
                return result;
            }


            //***********************************************
            // EDIT
            //***********************************************
            //var latlng = map.getCenter();
            var latlng = window.plugin.fakeMsgLoc.data.getLocForMsg();
            //***********************************************

            var data = {
                        message: msg,
                        latE6: Math.round(latlng.lat*1E6),
                        lngE6: Math.round(latlng.lng*1E6),
                        tab: c
                    };

            var errMsg = 'Your message could not be delivered. You can copy&' + 'paste it here and try again if you want:\n\n' + msg;

            window.postAjax(
                    'sendPlext',
                    data,
                    function(response){
                        if(response.error) alert(errMsg);
                        startRefreshTimeout(0.1*1000); //only chat uses the refresh timer stuff, so a perfect way of forcing an early refresh after a send message
                    },
                    function(){
                        alert(errMsg);
                    }
            );
            $('#chatinput input').val('');
        }
	}

	var setup = function(){
		window.plugin.fakeMsgLoc.ui.setupCSS();

        window.plugin.fakeMsgLoc.storage.check();

        window.plugin.fakeMsgLoc.override.chat__postMsg();

        window.plugin.fakeMsgLoc.ui.appendToolbox();

        window.plugin.fakeMsgLoc.ui.setChattextClass();
        window.plugin.fakeMsgLoc.ui.eventFocusChattext();
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

