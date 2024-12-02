// ==UserScript==
// @author         DanielOnDiordna
// @name           Favorite portal details
// @category       Info
// @version        0.1.6.20210724.002500
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/favorite-portal-details.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/favorite-portal-details.user.js
// @description    [danielondiordna-0.1.6.20210724.002500] Quickly show a list of details for your favorite list of portals.
// @id             favorite-portal-details@DanielOnDiordna
// @namespace      https://softspot.nl/ingress/
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.favoriteportaldetails = function() {};
    var self = window.plugin.favoriteportaldetails;
    self.id = 'favoriteportaldetails';
    self.title = 'Favorite portal details';
    self.version = '0.1.6.20210724.002500';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 0.1.1.20180911.233100
- earlier version

version 0.1.1.20181030.221200
- bug fix: localstoragesettings was not defined

version 0.1.2.20190117.143900
- minor code fix: assign needs empty array

version 0.1.3.20190406.225100
- bug fix: resonators and mods object converted to array for sort purposes
- support for empty mods
- underline resos and mods also if the active player is not the owner
- sort resos by level and then by owner name

version 0.1.4.20190530.122000
- closedialog fix for smartphone

version 0.1.5.20210123.230400
- updated plugin wrapper and userscript header formatting to match IITC-CE coding
- store portal titles for later use
- fixed width of dialog

version 0.1.6.20210328.235400
- fixed portal guid format checker

version 0.1.6.20210421.190200
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin

version 0.1.6.20210724.002500
- prevent double plugin setup on hook iitcLoaded
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.panename = 'plugin-' + self.id;
    self.localstoragesettings = self.panename + '-settings';
    self.dialogobject = null;
    self.onPortalSelectedPending = false;
    self.settings = {
        refreshonstart: true
    };
    self.favoriteslist = [];
    self.favorites = {};
    self.favorite = {
        title: '',
        team: '?',
        level: '?',
        resonators: [],
        mods: [],
        health: '?',
        owner: '?',
        timestamp: 0,
        lat: 0.0,
        lng: 0.0
    };
    self.storagename = self.panename + '-favorites';
    //    self.selector = '<form style="display: inline" name="' + self.id + 'form"><input type="checkbox" name="' + self.id + 'selector" onclick="' + self.namespace + 'toggleselection(this.checked);" title="Add to your list of favorite portal details" disabled/></form>';
    self.selector = '<a class="' + self.id + 'Selector" onclick="' + self.namespace + 'toggleselection(); return false;" title="Add to your list of favorite portal details"><span></span></a>';
    self.requestlist = {};
    self.requestrunning = false;
    self.requestguid = null;
    self.requesttimerid = 0;
    self.ownercolor = 'black';
    self.refreshonload_runonce = true;
    self.shortnames = {
        ''                     :' ',
        'Heat Sink'            :'H',
        'Portal Shield'        :'S',
        'Link Amp'             :'L',
        'Turret'               :'T',
        'Multi-hack'           :'M',
        'Aegis Shield'         :'A',
        'Force Amp'            :'F',
        'SoftBank Ultra Link'  :'U',
        'Ito En Transmuter (+)':'I+',
        'Ito En Transmuter (-)':'I-'
    };
    self.shortrarities = {
        ''         :' ',
        'COMMON'   :'c',
        'RARE'     :'r',
        'VERY_RARE':'v'
    };

    self.restoresettings = function() {
        if (typeof localStorage[self.localstoragesettings] === 'string') {
            var settings = JSON.parse(localStorage[self.localstoragesettings]);
            if (typeof settings === 'object' && settings instanceof Object) {
                if (typeof settings.refreshonstart === 'boolean') self.settings.refreshonstart = settings.refreshonstart;
            }
        }
    };
    self.storesettings = function() {
        localStorage[self.localstoragesettings] = JSON.stringify(self.settings);
    };

    self.restorefavorites = function() {
        if (typeof localStorage[self.storagename] === 'string') {
            var favoriteslist = JSON.parse(localStorage[self.storagename]); // array of separator names and guid=>portal name (or guid only)
            self.favoriteslist = []; // array of separator names and guids
            self.favorites = {}; // hash of guid=>{portal details}
            for (var cnt = 0; cnt < favoriteslist.length; cnt++) {
                if (typeof favoriteslist[cnt] === 'string' && favoriteslist[cnt].match(/^[0-9a-f]{32}\.[0-9a-f]{2}$/)) { // old file format: in case it's only a guid, convert to new formatting
                    let guid = favoriteslist[cnt];
                    let favorite = {};
                    favorite[guid] = guid; // use guid as portal name
                    favoriteslist[cnt] = favorite;
                }
                if (typeof favoriteslist[cnt] === 'object' && favoriteslist[cnt] instanceof Object) {
                    let guid = Object.keys(favoriteslist[cnt])[0];
                    self.favorites[guid] = Object.assign({}, self.favorite); // copy empty favoritee object without reference
                    self.favorites[guid].title = favoriteslist[cnt][guid];
                    self.favoriteslist.push(guid);
                } else if (typeof favoriteslist[cnt] === 'string') { // separator name
                    self.favoriteslist.push(favoriteslist[cnt]);
                }
            }
        }
    };
    self.storefavorites = function() {
        let storedata = []; // array of separator names and guid=>portal name
        for (let cnt = 0; cnt < self.favoriteslist.length; cnt++) {
            if (self.favoriteslist[cnt].match(/^[0-9a-f]{32}\.[0-9a-f]{2}$/)) { // guid
                let guid = self.favoriteslist[cnt];
                let favorite = {};
                favorite[guid] = self.favorites[guid].title;
                storedata.push(favorite);
            } else { // separator name
                storedata.push(self.favoriteslist[cnt]);
            }
        }
        localStorage[self.storagename] = JSON.stringify(storedata);
    };

    self.requesttimeout = function() {
        self.requestrunning = false;
        self.requestlist = {};
        self.updateselector();
    };

    self.requestnext = function() {
        if (Object.keys(self.requestlist).length === 0) {
            self.requestrunning = false;
            return;
        }
        var guid = Object.keys(self.requestlist)[0];
        self.requestguid = guid;

        window.setTimeout(function() {
            self.requesttimerid = window.setTimeout(self.requesttimeout,10000); // 10 seconds
            window.portalDetail.request(self.requestguid);
        },1000); // keep a second between request
    };

    self.requestall = function() {
        if (self.requestrunning) return;
        if (Object.keys(window.portals).length === 0) return;
        self.requestrunning = true;

        for (var guid in self.favorites) {
            self.requestlist[guid] = true;
        }
        self.requestnext();
    };

    self.focusportal = function(guid) {
        if (Object.keys(window.portals).length === 0) return; // cancel while no portals loaded yet; prevents an error inside the IITC core
        if (window.selectedPortal === guid && self.favorites[guid]) {
            map.setView([self.favorites[guid].lat,self.favorites[guid].lng]);
        }
        if (window.portals[guid]) {
            window.renderPortalDetails(guid);
        } else {
            self.requestguid = guid;
            window.portalDetail.request(guid);
        }
    };

    self.closedialog = function() {
        if (self.dialogobject) {
            self.dialogobject.dialog('close');
            self.dialogobject = null;
        }
    };

    self.getdatetimestring = function(date1) {
        if (!(date1 instanceof Date)) {
            if (date1) {
                date1 = new Date(date1);
            } else {
                date1 = new Date();
            }
        }
        return [date1.getFullYear(),date1.getMonth()+1,date1.getDate()].join('/') + ' ' + [date1.getHours(),('0' + date1.getMinutes()).slice(-2),('0' + date1.getSeconds()).slice(-2)].join(':');
    };

    self.resonatorshtml = function(resonators,portalowner) {
        var highlightowner = window.PLAYER.nickname;
        var resolist = [];
        resonators = resonators.sort(
            function(a,b) {
                if (a.level < b.level) return 1;
                if (a.level > b.level) return -1;
                let o1 = a.owner.toLowerCase();
                let o2 = b.owner.toLowerCase();
                if (o1 > o2) return 1;
                if (o1 < o2) return -1;
                return 0;
            }); // sort by resonator level and then by owner
        for (var cnt = 0; cnt < 8; cnt++) {
            var lvl = '-';
            if (cnt < resonators.length && resonators[cnt]) { // {owner, level, energy}
                var resonatorowner = resonators[cnt].owner;
                lvl = resonators[cnt].level;
                if (resonatorowner === highlightowner) {
                    lvl = '<span style="color:' + self.ownercolor + '">' + lvl + '</span>'; // highlight reso's of current player
                }
                if (resonatorowner !== portalowner) {
                    lvl = '<u>' + lvl + '</u>'; // underline reso's of other people then the portal owner
                }
                lvl = '<span title="' + resonatorowner + '">' + lvl + '</span>';
            }
            resolist.push(lvl);
        }
        return resolist.join('');
    };

    self.modshtml = function(mods,portalowner) {
        var highlightowner = window.PLAYER.nickname;
        var modslist = [];
        for (var cnt = 0; cnt < mods.length; cnt++) { // {owner, name, rarity, stats: {…}}
            var mod;
            if (!mods[cnt]) {
                mod = '';
            } else {
                mod = self.shortnames[mods[cnt].name];
                if (mod === 'H' || mod === 'S' || mod === 'M') mod = self.shortrarities[mods[cnt].rarity] + mod;
                var modowner = mods[cnt].owner;
                if (modowner === highlightowner) {
                    mod = '<span style="color:' + self.ownercolor + '">' + mod + '</span>'; // highlight mods of current player
                }
                if (modowner !== portalowner) {
                    mod = '<u>' + mod + '</u>'; // underline mods of other people then the portal owner
                }
                mod = '<span title="' + modowner + '">' + mod + '</span>';
            }
            modslist.push(mod);
        }
        return modslist.join(' ');
    };

    self.favoriteshtml = function() {
        var highlightowner = window.PLAYER.nickname;
        var rows = [];
        var headers = [];
        headers.push('T');
        headers.push('Title');
        headers.push('Health');
        headers.push('Lvl');
        headers.push('Resonators');
        headers.push('Mods');
        headers.push('Owner');
        headers.push('Checked');
        rows.push('<tr><th>' + headers.join('</th><th style="padding-left: 5px">') + '</th></tr>');
        for (var cnt = 0; cnt < self.favoriteslist.length; cnt++) {
            var guid = self.favoriteslist[cnt];
            if (self.favorites[guid]) {
                if (!self.favorites[guid].title && window.portals[guid]) {
                    var portaldata = window.portals[guid].options.data;
                    self.favorites[guid].title = (portaldata.title?portaldata.title:'');
                    self.favorites[guid].team = portaldata.team;
                    self.favorites[guid].level = (portaldata.level >= 0?(portaldata.team === 'N'?0:portaldata.level):'');
                }
            }

            if (self.favorites[guid]) {
                var columns = [];
                columns.push(self.favorites[guid].team);
                columns.push('<a href="#" onclick="' + self.namespace + 'focusportal(\'' + guid + '\')">' + (self.favorites[guid].title?self.favorites[guid].title:guid) + '</a>');
                columns.push((self.favorites[guid].team === 'N'?'-':self.favorites[guid].health + '%'));
                columns.push('<span style="background-color:' + window.COLORS_LVL[self.favorites[guid].level] + (self.favorites[guid].level === 1?'; color: black':'') + '">L' + self.favorites[guid].level + '</span>');
                columns.push(self.resonatorshtml(self.favorites[guid].resonators,self.favorites[guid].owner));
                columns.push(self.modshtml(self.favorites[guid].mods,self.favorites[guid].owner));
                columns.push('<span style="' + (highlightowner === self.favorites[guid].owner?'color: ' + self.ownercolor:'') + '">' + self.favorites[guid].owner + '</span>');
                columns.push((self.requestlist[guid]?'updating...':(self.favorites[guid].timestamp == 0?'never':self.getdatetimestring(self.favorites[guid].timestamp))));
                rows.push('<tr style="background-color:' + (self.favorites[guid].team === 'E'?'#017f01':(self.favorites[guid].team === 'R'?'#005684':'')) + '"><td nowrap>' + columns.join('</td><td nowrap>') + '</td></tr>');
            } else {
                rows.push('<tr><td style="font-weight: bold;" colspan="' + headers.length + '">' + self.favoriteslist[cnt] + '</td></tr>');
            }
        }

        return '<table cellpadding="0" cellspacing="0">' + rows.join("\n") + '</table>';
    };

    self.orderup = function(cnt) {
        if (cnt === 0) return;
        var cntvalue = self.favoriteslist[cnt];
        self.favoriteslist[cnt] = self.favoriteslist[cnt - 1];
        self.favoriteslist[cnt - 1] = cntvalue;
        self.storefavorites();
        self.updateselector();
    };

    self.orderdown = function(cnt) {
        if (cnt === self.favoriteslist.length - 1) return;
        var cntvalue = self.favoriteslist[cnt];
        self.favoriteslist[cnt] = self.favoriteslist[cnt + 1];
        self.favoriteslist[cnt + 1] = cntvalue;
        self.storefavorites();
        self.updateselector();
    };

    self.removefavorite = function(cnt) {
        var guid = self.favoriteslist[cnt];
        if (self.favorites[guid]) delete(self.favorites[guid]);
        self.favoriteslist.splice(cnt,1);
        self.storefavorites();
        self.updateselector();
    };

    self.addtitle = function() {
        var newtitle = prompt('Enter a new separator label:');
        if (newtitle === null || newtitle === '') return;
        self.favoriteslist.push(newtitle);
        self.storefavorites();
        self.updateselector();
    };

    self.edittitle = function(cnt) {
        var newtitle = prompt('Edit separator label:',self.favoriteslist[cnt]);
        if (newtitle === null || newtitle === '') return;
        self.favoriteslist[cnt] = newtitle;
        self.storefavorites();
        self.updateselector();
    };

    self.ordermenuhtml = function() {
        var rows = [];
        for (var cnt = 0; cnt < self.favoriteslist.length; cnt++) {
            var guid = self.favoriteslist[cnt];
            var columns = [];
            var title = (self.favorites[guid]?(self.favorites[guid].title?self.favorites[guid].title:guid):self.favoriteslist[cnt]);
            columns.push('<a href="#" onclick="if (confirm(\'' + title + '\\nRemove from favorite list?\')) ' + self.namespace + 'removefavorite(' + cnt + '); return false;">X</a>');
            columns.push('<a href="#" onclick="' + self.namespace + 'orderup(' + cnt + '); return false;"><img border="0" width="10" height="10" src="data:image/gif;base64,R0lGODlhCgAKAIcAAAAAAAICAgcHBwgICAoKCgsLCw0NDQ4ODhUVFSAgIC0tLT4+PklJSVdXV2lpaXx8fIyMjJCQkJ6enrCwsMDAwNDQ0NjY2OTk5Ozs7PT09Pj4+Pz8/P///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAMAABwALAAAAAAKAAoAAAhCADkIHEiQYIUIBQcuOJAhIYUDAx4kVAAAQAEMBCcYqCjAwcANCSpWHHBBoAQCIgEMaMBBA4KUFQtYgBAAJoAADAICADs=" /></a>');
            columns.push('<a href="#" onclick="' + self.namespace + 'orderdown(' + cnt + '); return false;"><img border="0" width="10" height="10" src="data:image/gif;base64,R0lGODlhCgAKAIcAAAAAAAICAgMDAwgICAkJCQsLCxQUFB0dHScnJzQ0NHx8fH5+foCAgKCgoLCwsMDAwPDw8Pj4+Pz8/P///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAMAABMALAAAAAAKAAoAAAg9ABsEGECwoIAFEg4AWMiwAIQJDQwwBEBAwYSLCCY6vDjBgUSKFjlOyAhgo8gHBiqK5JjA5MoHDFaKjCAyIAA7" /></a>');
            if (self.favorites[guid]) {
                columns.push(title);
            } else {
                columns.push('<span style="font-weight: bold;"><a href="#" onclick="' + self.namespace + 'edittitle(' + cnt + '); return false;">' + title + '</a></span>');
            }
            rows.push('<tr><td nowrap>' + columns.join('</td><td nowrap>') + '</td></tr>');
        }
        return '<table>' + rows.join("\n") + '</table>';
    };

    self.aboutmenu = function() {
        var html = '<div class="' + self.id + 'menu">' +
            '<div class="' + self.id + 'menubuttons">' +
            '<a href="#" onclick="' + self.namespace + 'menu(); return false;">&lt; Main menu</a><br />\n' +
            '</div>' +
            'Add your favorite portals to a list.<br />\n' +
            '<br />\n' +
            'Step 1: Select a portal and show the details pane.<br />\n' +
            'Step 2: Click on the portal icon in front of the portal title:<br />\n' +
            '<a class="' + self.id + 'Selector" onclick="return false;" title="Add to your list of favorite portal details"><span></span></a> It will change into your team color when selected.<br />\n' +
            '<br />\n' +
            'Step 3: Open the ' + self.title + ' menu.<br />\n' +
            '<br />\n' +
            'Now you can easily see all details about this portal: resonators and mods (<span style="color:' + self.ownercolor + '">' + self.ownercolor + '</span> are placed by you, <u>underlined</u> are placed by someone else then the portal owner, others are placed by the portal owner).<br />\n' +
            '<br />\n' +
            'Step 4: Change order, remove favorites or add separator labels from the Change order menu.<br />\n' +
            '<br />\n' +
            'Portal details are automatically updated when Intel is reloaded, or refreshed by clicking the "Check all" button, and also updated when a portal is selected.<br />\n' +
            'Click on a title to focus the portal. Click again to move the map to the selected portal.<br />\n' +
            '<span style="font-style: italic; font-size: smaller">version ' + self.version + ' by ' + self.author + '</span>' +
            '</div>';

        if (window.useAndroidPanes()) {
            self.closedialog(); // close, if any
            $('#' + self.id + 'menu').remove();
            $('<div id="' + self.id + 'menu" class="mobile">').append(html).appendTo(document.body);
        } else {
            self.dialogobject = window.dialog({
                html: $('<div id="' + self.id + 'menu">').append(html),
                id: 'plugin-' + self.id + '-dialog',
                title: self.title + ' About',
                width: 400
            });
        }
    };

    self.ordermenu = function() {
        var html = '<div class="' + self.id + 'menu">' +
            '<div class="' + self.id + 'menubuttons">' +
            '<a href="#" onclick="' + self.namespace + 'menu(); return false;">&lt; Main menu</a> <a href="#" onclick="' + self.namespace + 'addtitle(); return false;">Add separator label</a>' +
            '</div>' +
            '<div id="' + self.id + 'orderlist">' + self.ordermenuhtml() + '</div>' +
            '</div>';

        if (window.useAndroidPanes()) {
            self.closedialog(); // close, if any
            $('#' + self.id + 'menu').remove();
            $('<div id="' + self.id + 'menu" class="mobile">').append(html).appendTo(document.body);
        } else {
            self.dialogobject = window.dialog({
                html: $('<div id="' + self.id + 'menu">').append(html),
                id: 'plugin-' + self.id + '-dialog',
                title: self.title + ' Change Order'
            });
        }
    };

    self.menu = function() {
        var html = '<div class="' + self.id + 'menu">' +
            '<div class="' + self.id + 'menubuttons">' +
            '<a href="#" onclick="' + self.namespace + 'requestall(); return false;">Check all</a> <a href="#" onclick="' + self.namespace + 'ordermenu(); return false;">Change order</a> <a href="#" onclick="' + self.namespace + 'aboutmenu(); return false;">About</a>' +
            '<input type="checkbox" onclick="' + self.namespace + 'settings.refreshonstart = this.checked; ' + self.namespace + 'storesettings();" id="refreshonstarttoggle"' + (self.settings.refreshonstart?' checked':'') + '><label for="refreshonstarttoggle">Check all on IITC start</label>' +
            '</div>' +
            '<div id="' + self.id + 'list">' + self.favoriteshtml() + '</div>' +
            '</div>';

        if (window.useAndroidPanes()) {
            self.closedialog(); // close, if any
            $('#' + self.id + 'menu').remove();
            $('<div id="' + self.id + 'menu" class="mobile">').append(html).appendTo(document.body);
        } else {
            self.dialogobject = window.dialog({
                html: $('<div id="' + self.id + 'menu">').append(html),
                id: 'plugin-' + self.id + '-dialog',
                dialogClass: 'ui-dialog-' + self.id + '-menu',
                title: self.title,
                width: 700
            });
        }
    };

    self.toggleselection = function(guid) {
        if (!guid) guid = window.selectedPortal;
        if (!guid) return;
        var portaldata = {};
        if (window.portals[guid]) portaldata = window.portals[window.selectedPortal].options.data;
        if (!self.favorites[guid]) {
            self.favorites[guid] = Object.assign({}, self.favorite); // copy object without reference
            self.favorites[guid].title = portaldata.title;
            self.favorites[guid].team = portaldata.team;
            self.favorites[guid].level = (portaldata.team === 'N'?0:portaldata.level);
            self.favoriteslist.push(guid);

            self.requestlist[guid] = true; // force request portal details
            self.requestnext();
        } else {
            delete(self.favorites[guid]);
            var index = -1;
            for (var cnt = 0; cnt < self.favoriteslist.length && index === -1; cnt++) {
                if (guid === self.favoriteslist[cnt]) {
                    index = cnt;
                }
            }
            if (index !== -1) self.favoriteslist.splice(index,1);
        }
        self.storefavorites();
        self.updateselector();
    };

    self.updateselector = function() {
        var guid = window.selectedPortal;
        $('.' + self.id + 'Selector').removeClass('favorite');
        if (guid && self.favorites[guid]) {
            $('.' + self.id + 'Selector').addClass('favorite');
            //document.forms[self.id + 'form'][self.id + 'selector'].disabled = false;
            //document.forms[self.id + 'form'][self.id + 'selector'].checked = (self.favorites[guid] !== undefined);
            //} else {
            //document.forms[self.id + 'form'][self.id + 'selector'].disabled = true;
            //document.forms[self.id + 'form'][self.id + 'selector'].checked = false;
        }
        if ($('#' + self.id + 'list').length > 0) $('#' + self.id + 'list').html(self.favoriteshtml());
        if ($('#' + self.id + 'orderlist').length > 0) $('#' + self.id + 'orderlist').html(self.ordermenuhtml());
    };

    self.onPortalDetailLoaded = function(data) {
        if (!(data instanceof Object)) return;
        if (!data.details || !data.details.title || !data.guid) {
            // console.log('FAVORITE PORTAL DETAILS onPortalDetailLoaded failed',data);
            return;
        }

        var guid = data.guid;
        if (guid in self.favorites) {
            if (self.favorites[guid].title != data.details.title) {
                self.favorites[guid].title = data.details.title;
                self.storefavorites();
            }
            self.favorites[guid].team = data.details.team;
            self.favorites[guid].level = (data.details.team === 'N'?0:data.details.level);
            self.favorites[guid].resonators = [];
            for (let cnt = 0; cnt < 8; cnt++) {
                if (data.details.resonators[cnt] && data.details.resonators[cnt].owner) {
                    self.favorites[guid].resonators[cnt] = Object.assign({},data.details.resonators[cnt]);
                } else {
                    self.favorites[guid].resonators[cnt] = {owner:'',level:'',energy:''};
                }
            }
            self.favorites[guid].mods = [];
            for (let cnt = 0; cnt < 4; cnt++) {
                if (data.details.mods[cnt]) {
                    self.favorites[guid].mods[cnt] = Object.assign({},data.details.mods[cnt]);
                } else {
                    self.favorites[guid].mods[cnt] = {owner:'',name:'',rarity:''};
                }
            }
            self.favorites[guid].owner = data.details.owner;
            self.favorites[guid].health = data.details.health;
            self.favorites[guid].timestamp = new Date();
            self.favorites[guid].lat = data.details.latE6 / 1E6;
            self.favorites[guid].lng = data.details.lngE6 / 1E6;
        }
        if (guid === self.requestguid) {
            window.clearTimeout(self.requesttimerid);
            self.requesttimerid = 0;
            delete(self.requestlist[self.requestguid]);
            self.updateselector();
            window.setTimeout(self.requestnext,0);
        }
    };

    self.onPortalSelected = function() {
        //$('input[name=' + self.id + 'selector]').attr('checked',false);
        //$('input[name=' + self.id + 'selector]').attr('disabled',true);
        //document.forms[self.id + 'form'][self.id + 'selector'].disabled = true;
        //document.forms[self.id + 'form'][self.id + 'selector'].checked = false;
        if (self.onPortalSelectedPending) return;
        $('.' + self.id + 'Selector').remove();
        if (!window.selectedPortal) return;
        self.onPortalSelectedPending = true;
        window.setTimeout(function() { // the sidebar is constructed after firing the hook
            self.onPortalSelectedPending = false;
            $('.' + self.id + 'Selector').remove(); // just in case
            $('#portaldetails > h3.title').before(self.selector);
            self.updateselector();
        },0);
    };

    self.onPaneChanged = function(pane) {
        if (pane === self.panename)
            self.menu();
        else
            $('#' + self.id + 'menu').remove();
    };

    self.refreshonload = function() {
        if (!self.refreshonload_runonce) return;
        if (Object.keys(window.portals).length > 0 && self.settings.refreshonstart) {
            self.requestall();
        }
        self.refreshonload_runonce = false;
    };

    self.setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        self.restoresettings();
        self.restorefavorites();
        self.storefavorites();

        if (window.useAndroidPanes()) {
            android.addPane(self.panename, self.title, 'ic_action_view_as_list');
            addHook("paneChanged",self.onPaneChanged);
        }
        $('#toolbox').append('<a onclick="if (window.useAndroidPanes()) window.show(\'' + self.panename + '\');' + self.namespace + 'menu(); return false;" href="#">' + self.title + '</a>');

        $('<style>').prop('type', 'text/css').html('.' + self.id + 'Selector span {\n	background-image:url(data:image/png;base64,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);\n	display:inline-block;\n	float:left;\n	margin:3px 1px 0 4px;\n	width:15px;\n	height:15px;\n	overflow:hidden;\n	background-repeat:no-repeat;\n	background-position:left top;\n}\n.' + self.id + 'Selector span {\n	background-position:left top;\n}\n.' + self.id + 'Selector.favorite span {\n	background-position:' + (PLAYER.team == 'RESISTANCE'?'right top':'left bottom') + ';\n}').appendTo('head');
        $('<style>').prop('type', 'text/css').html('.' + self.id + 'menubuttons > a { color:#ffce00; border:1px solid #ffce00; padding:0 3px; margin:10px auto; background:rgba(8,48,78,.9); }').appendTo('head');
        $('<style>').prop('type', 'text/css').html('#' + self.id + 'menu.mobile { background: transparent; border: 0 none !important; height: 100% !important; width: 100% !important; left: 0 !important; top: 0 !important; position: absolute; overflow: auto; }').appendTo('head');
        $('<style>').prop('type', 'text/css').html('.ui-dialog-' + self.id + '-menu { max-width: 700px }').appendTo('head');;

        window.addHook('portalSelected', self.onPortalSelected);
        window.addHook('portalDetailLoaded', function(data) { self.onPortalDetailLoaded(data); });
        window.addHook('mapDataRefreshEnd',function() { window.setTimeout(self.updateselector); }); // use a timeout to make sure the window status is set
        if (self.settings.refreshonstart) {
            window.addHook('mapDataRefreshEnd',self.refreshonload); // runonce
        }
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
