// ==UserScript==
// @author         DanielOnDiordna
// @name           Load more COMMS history
// @category       Tweak
// @version        0.0.3.20210724.002500
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/loadmorecommshistory.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/loadmorecommshistory.user.js
// @description    [danielondiordna-0.0.3.20210724.002500] Load more COMMS history without scrolling back, usefull for other plugins
// @id             loadmorecommshistory@DanielOnDiordna
// @namespace      https://softspot.nl/ingress/
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.loadmorecommshistory = function() {};
    var self = window.plugin.loadmorecommshistory;
    self.id = 'loadmorecommshistory';
    self.title = 'Load more COMMS history';
    self.version = '0.0.3.20210724.002500';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 0.0.1.20161223.164800
- earlier version

version 0.0.1.20183010.211600
- intel URL changed from www.ingress.com to *.ingress.com

version 0.0.1.20181122.221700
- code converted to variable self
- added player selector to filter all chat panes for the selected player

version 0.0.1.20181127.144600
- added full timestamp selector

version 0.0.2.20210127.220500
- updated plugin wrapper and userscript header formatting to match IITC-CE coding

version 0.0.2.20210421.190200
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin

version 0.0.3.20210511.232500
- fix to function without playerTracker plugin
- moved load more tab/button next to all

version 0.0.3.20210724.002500
- prevent double plugin setup on hook iitcLoaded
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.enabled = false;
    self.mapposid = '';
    self.oldestchat = 0;
    self.timeout = 10000;
    self.timeoutid = 0;
    self.backup_onRefreshFunctions = [];
    self.laststatus = 'status';
    self.selectedplayer = '';
    self.filterselectedplayer = false;
    self.showfulltimestamp = false;

    self.getmapposid = function() {
        var pos = map.getCenter();
        pos = [pos.lat*1E6,pos.lng*1E6];
        return JSON.stringify([pos,map.getZoom()]);
    };

    self.showstatus = function(text) {
        $('#' + self.id + 'status').html(text);
        self.laststatus = text;
        self.updateplayerlist();
    };

    self.loadstop = function(message) {
        self.enabled = false;
        clearTimeout(self.timeoutid);
        self.timeoutid = 0;
        // restore
        if (self.backup_onRefreshFunctions) {
            window.requests._onRefreshFunctions = self.backup_onRefreshFunctions;
            self.backup_onRefreshFunctions = [];
        }
        // $('#chatcontrols a:last').text('load more');
        $('#chatcontrols > a:contains("stop loading")').text('load more');
        self.showstatus('oldest: ' + self.datestring(self.oldestchat) + '<br />\n' + message);
    };

    self.loadmoretimeout = function() {
        //console.log('COMMS - loadmore TIMEOUT');
        self.loadstop('stopped (timeout)');
    };

    self.datestring = function(timestamp) {
        var d = new Date(timestamp);
        return d.getDate() + '-' + (d.getMonth() + 1).toString().slice(-2) + '-' + d.getFullYear() + ' ' + d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2);
    };

    self.loadmore = function(data) {
        var oldest = (new Date()).getTime();
        $.each(data.result, function(ind, json) {
            oldest = Math.min(json[1],oldest);
        });

        var morecommsavailable = (oldest < self.oldestchat);
        self.oldestchat = oldest;
        self.showstatus('oldest: ' + self.datestring(self.oldestchat));

        if (!morecommsavailable) {
            // no more history available
            if (self.enabled) {
                //console.log('COMMS - loadmore DONE');
                self.loadstop('');
            }
            return;
        }

        if (!self.enabled) return;

        clearTimeout(self.timeoutid);
        self.timeoutid = 0;
        var mapmoved = (self.mapposid !== self.getmapposid());
        if (mapmoved) {
            // map moved, stop loading more
            //console.log('COMMS - loadmore STOPPED (map moved)');
            self.loadstop('stopped (map moved)');
            return;
        }
        //console.log('COMMS - loadmore...');
        self.showstatus('oldest: ' + self.datestring(self.oldestchat) + '<br />\nloading more...');
        setTimeout(function() { self.timeoutid = setTimeout(self.loadmoretimeout,self.timeout); window.chat.requestPublic(true); },200);
    };

    self.converttimestamp = function (htmltimestring) {
        var matches = htmltimestring.match(/ ([0-9]+:[0-9]+)(:[0-9]+).*?(\.[0-9]+)/);
        if (self.showfulltimestamp) {
            htmltimestring = htmltimestring.replace(/(>)[0-9:\.]+(<\/time>)/,'$1' + matches[1] + matches[2] + matches[3] + '$2');
        } else {
            htmltimestring = htmltimestring.replace(/(>)[0-9:\.]+(<\/time>)/,'$1' + matches[1] + '$2');
        }
        return htmltimestring;
    };

    self.convertchattimestamps = function () {
        for (var d1 in window.chat._public.data) {
            window.chat._public.data[d1][2] = self.converttimestamp(window.chat._public.data[d1][2]);
        }
        for (var d2 in window.chat._alerts.data) {
            window.chat._alerts.data[d2][2] = self.converttimestamp(window.chat._alerts.data[d2][2]);
        }
        for (var d3 in window.chat._faction.data) {
            window.chat._faction.data[d3][2] = self.converttimestamp(window.chat._faction.data[d3][2]);
        }
        self.updatechat();
    };

    self.updatechat = function() {
        var tab = chat.getActive();
        switch(tab) {
            case 'faction':
                chat.renderFaction(false);
                break;
            case 'all':
                chat.renderPublic(false);
                break;
            case 'alerts':
                chat.renderAlerts(false);
                break;
            case 'public':
                chat.renderPublicChat(false);
                break;
        }
        $('#chat td:first-child').width((self.showfulltimestamp?'75':'44'));
    }

    self.loadnow = function() {
        if (self.enabled) return;

        self.showstatus('oldest: ' + self.datestring(self.oldestchat) + '<br />\nstart loading more...');
        self.enabled = true;
        self.backup_onRefreshFunctions = window.requests._onRefreshFunctions; // prevent other chat requests until done
        window.requests._onRefreshFunctions = [];
        self.mapposid = self.getmapposid();
        self.oldestchat = (new Date()).getTime();
        //console.log('COMMS - loadnow');
        //$('#chatcontrols a:last').text('stop loading');
        $('#chatcontrols > a:contains("load more")').text('stop loading');
        setTimeout(function() { self.timeoutid = setTimeout(self.loadmoretimeout,self.timeout); window.chat.requestPublic(true); },200);
    };

    self.playerselectlist = function(selectedname) {
        if (!window.plugin.playerTracker) return '(playerTracker plugin not installed)';
        if (!window.plugin.playerTracker.stored || window.plugin.playerTracker.stored.length === 0) return 'no playerTracker history found';

        var list = [];
        var players = Object.keys(window.plugin.playerTracker.stored).sort(function(a,b) { return (a.toLowerCase() < b.toLowerCase()?-1:(a.toLowerCase() > b.toLowerCase()?1:0)); });
        if (players.length === 0) {
            self.selectedplayer = '';
            return '<span id="' + self.id + '_selectplayer">[no player data found]</span>';
        }

        if (!selectedname) selectedname = self.selectedplayer;
        if (!selectedname) selectedname = players[0];
        var selectednamefound = false;
        for (var index in players) {
            var plrname = players[index];
            list.push('<option' + (window.plugin.playerTrackerAddon?' style="color: ' + window.plugin.playerTracker.stored[plrname].color + '"':'') + ' value="' + plrname + '"' + (plrname === selectedname?' selected':'')+ '>' + plrname + ' ' + window.plugin.playerTracker.stored[plrname].team + '</option>');
            if (plrname === selectedname) selectednamefound = true;
        }
        self.selectedplayer = (selectednamefound?selectedname:'');

        return '<select id="' + self.id + '_selectplayer"' + (window.plugin.playerTrackerAddon?' style="color:' + window.plugin.playerTracker.stored[selectedname].color + '"':'') + ' onchange="' + self.namespace + 'selectedplayer = this.value; ' + self.namespace + 'updatechat();' + (window.plugin.playerTrackerAddon?' this.style.color=window.plugin.playerTracker.stored[this.value].color;':'') + '">' + list.join('\n') + '</select>';
    };

    self.updateplayerlist = function() {
        if (!window.plugin.playerTracker) return;
        var newlist = self.playerselectlist($('#' + self.id + '_selectplayer option:selected').val());
        if (newlist !== $('#' + self.id + '_selectplayer').html()) $('#' + self.id + '_selectplayer').replaceWith(newlist);
    };

    self.menu = function() {
        var html = '<div class="' + self.id + 'menu">' +
            '<a href="#" onclick="' + self.namespace + 'loadnow(); return false;">Start loading more COMMS history</a>' +
            '<span id="' + self.id + 'status">' + self.laststatus + '</span><br />' +
            '<a href="#" onclick="' + self.namespace + 'loadstop(\'stopped\'); return false;">Stop loading more</a>' +
            (!window.plugin.playerTracker ? '' : self.playerselectlist() + '<br />' +
            '<input type="checkbox" id="' + self.id + 'selectedplayer" name="' + self.id + 'selectedplayer" onclick="' + self.namespace + 'filterselectedplayer = this.checked; ' + self.namespace + 'updatechat();"' + (self.filterselectedplayer?' checked':'') + '></input><label for="' + self.id + 'selectedplayer">Filter COMMS for selected player</label><br />') +
            '<input type="checkbox" id="' + self.id + 'fulltimestamp" name="' + self.id + 'fulltimestamp" onclick="' + self.namespace + 'showfulltimestamp = this.checked; ' + self.namespace + 'convertchattimestamps();"' + (self.showfulltimestamp?' checked':'') + '></input><label for="' + self.id + 'fulltimestamp">Show full timestamps</label><br />' +
            '<span style="font-style: italic; font-size: smaller">version ' + self.version + ' by ' + self.author + '</span>' +
            '</div>';

        dialog({
            html: html,
            id: 'plugin-' + self.id + '-menu',
            dialogClass: 'ui-dialog-' + self.id + 'menu',
            title: self.title
        });
    };

    self.onPaneChanged = function(pane) {
        if (pane === 'plugin-' + self.id) {
            $('#chatpublic').show();
        } else {
            $('#chatpublic').hide();
        }
    };

    self.setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        window.addHook('publicChatDataAvailable',self.loadmore);

        // create a new chatpane for all public chat without portal activity:
        // add a side pane menu
        if (window.useAndroidPanes()) {
            android.addPane('plugin-' + self.id, "Public", "ic_action_group");
            addHook("paneChanged", self.onPaneChanged);
        }
        $('#chatcontrols').append('<a accesskey="4" title="[4]" class>public</a>');
        //$('#chatcontrols a:last').click(window.chat.chooser);
        $('#chatcontrols a:contains("public")').click(window.chat.chooser);
        $('#chat').append('<div id="chatpublic"></div>');

        window.chat.renderPublicChat = function(oldMsgsWereAdded) {
            var elm = $('#chatpublic');
            // extract and display public chat
            var vals = $.map(window.chat._public.data, function(v, k) { return [v]; });
            vals = vals.sort(function(a, b) { return a[0]-b[0]; });

            // render to string with date separators inserted
            var msgs = '';
            var prevTime = null;
            $.each(vals, function(ind, msg) {
                var nextTime = new Date(msg[0]).toLocaleDateString();
                if(prevTime && prevTime !== nextTime)
                    msgs += window.chat.renderDivider(nextTime);
                if (msg[2].indexOf('[public]') >= 0)
                    msgs += msg[2];
                prevTime = nextTime;
            });
            var scrollBefore = scrollBottom(elm);
            elm.html('<table>' + msgs + '</table>');
            chat.keepScrollPosition(elm, scrollBefore, false);
        };

        // rewrite existing function from IITC core to add renderPublicChat call:
        window.chat.renderPublic = function(oldMsgsWereAdded) {
            chat.renderData(chat._public.data, 'chatall', oldMsgsWereAdded);
            window.chat.renderPublicChat(oldMsgsWereAdded);
        };

        // rewrite existing function from IITC core to add public chat:
        var request_override = window.chat.request.toString();
        eval('window.chat.request = ' + request_override);
        var choosetab_override = window.chat.chooseTab.toString();
        choosetab_override = choosetab_override.replace(/\+ tt/,'+ tab'); // bug fix
        choosetab_override = choosetab_override.replace(/tab != 'alerts'/,'tab != \'alerts\' && tab != \'public\'');
        choosetab_override = choosetab_override.replace(/default/,'case \'public\':\n      input.css(\'cssText\', \'color: #f66 !important\');\n      mark.css(\'cssText\', \'color: #f66 !important\');\n      mark.text(\'broadcast:\');\n\n      chat.renderPublicChat(false);\n      break;\ndefault');
        eval('window.chat.chooseTab = ' + choosetab_override);

        var show_override = window.show.toString();
        show_override = show_override.replace(/case 'alerts':/,'case \'alerts\':\n    case \'public\':');
        eval('window.show = ' + show_override);

        var renderData_override = window.chat.renderData.toString();
        renderData_override = renderData_override.replace(/(msg\) \{)/,'$1\n    if (' + self.namespace + 'filterselectedplayer && msg[3] !== ' + self.namespace + 'selectedplayer) return;');
        renderData_override = renderData_override.replace(/(  chat\.keepScrollPosition)/,'  $(\'#chat td:first-child\').width((' + self.namespace + 'showfulltimestamp?\'75\':\'44\'));\n$1');
        eval('window.chat.renderData = ' + renderData_override);

        // rewrite existing function from IITC core to add optional full timestamp display:
        var renderMsg_override = window.chat.renderMsg.toString();
        renderMsg_override = renderMsg_override.replace(/(  tb =)/,'  ta = (' + self.namespace + 'showfulltimestamp?tb.slice(11,23):ta);\n$1');
        eval('window.chat.renderMsg = ' + renderMsg_override);

        // add a chat tab that only functions as a toggle button (load more/stop loading)
        /*
        $('#chatcontrols').append('<a accesskey="5" title="[5]" class>load more</a>');
        $('#chatcontrols a:last').click(function() { if (self.enabled) { self.loadstop('stopped'); } else { self.loadnow(); } });
        */
        $('#chatcontrols > a:contains("all")').after('<a>load more</a>');
        $('#chatcontrols > a:contains("load more")').click(function() { if (self.enabled) { self.loadstop('stopped'); } else { window.chat.chooseTab('all'); self.loadnow(); } });

        //add options menu
        $('#toolbox').append('<a onclick="' + self.namespace + 'menu();return false;" href="#">' + self.title + '</a>');

        $('head').append(
            '<style>' +
            '.' + self.id + 'menu > a { display:block; color:#ffce00; border:1px solid #ffce00; padding:3px 0; margin:10px auto; width:80%; text-align:center; background:rgba(8,48,78,.9); }'+
            '</style>');

        console.log('IITC plugin loaded: ' + self.title + ' version ' + self.version);
    };

    var setup = function() {
        (window.iitcLoaded?self.setup():window.addHook('iitcLoaded',self.setup));
    };

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
