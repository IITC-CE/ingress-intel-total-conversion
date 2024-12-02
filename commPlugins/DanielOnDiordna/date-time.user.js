// ==UserScript==
// @author         DanielOnDiordna
// @id             date-time@DanielOnDiordna
// @name           Date and time
// @category       Controls
// @version        2.2.1.20230824.100900
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/date-time.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/date-time.user.js
// @description    [danielondiordna-2.2.1.20230824.100900] Show date and time on the map, configurable time formatting, select a manual timezone, or automated timezones with your free GeoNames account.
// @namespace      https://softspot.nl/ingress/
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.dateTime = function() {};
    var self = window.plugin.dateTime;
    self.id = 'dateTime';
    self.title = 'Date and time';
    self.version = '2.2.1.20230824.100900';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 2.2.1.20230824.100900
- fixed the update of the checkpoint details title by adding a delay of 1 second
- added a cycle interval timer to keep updating the popup title with the checkpoint details

version 2.2.0.20220227.233000
- dialog split up into separate menu pages
- added an about menu
- added checkbox to display/hide backgroundcolor
- added checkbox to display/hide border
- added option to select a position and an x,y offset on the map
- added option to display cycle checkpoint time as tooltip

version 2.1.0.20220226.213200
- added font family selector
- added font size selector, default 15px
- added font (+border) color selector
- added background color selector
- added text replace option, for example to replace / by -
- adjusted the locales list names to better fit into the selectbox
- removed pawelki as author (as he said: I do not claim any rights to this proof of concept)

version 2.0.0.20220223.003400
- added a changelog
- added a dialog
- added show/hide methods to L.DateTimeControl
- added a 'layer' to toggle show/hide the date time display
- added default settings to store and restore
- added locales list source https://www.w3schools.com/jsref/jsref_tolocalestring.asp
- select time formatting (24 hour, locale, short/medium/long/full date and time formatting)
- added GeoNames account instructions https://www.geonames.org/
- add a GeoNames account to auto fetch the timezone when map is moved

version 1.0.0.20220221.095000
- fixed userscript headers to make it work on IITC-CE the Button extension
- added different color for player team ENLIGHTENED or RESISTANCE

version 0.1
- source https://jsfiddle.net/atLxqj6s/ by author pawelki
- add L.DateTimeControl in color #00F34B displaying an UTC timestamp
`;

    self.settingsStorageName = 'plugin-datetime-settings';
    self.settings = {};
    self.settings.display = 'utc'; // string[unix|iso|utc|local|manual|auto]
    self.settings.geonameskey = ''; // string
    self.settings.manualtimezone = 'UTC'; // string
    self.settings.autotimezone = 'UTC'; // string
    self.settings.locale = 'en-US'; // string[locales]
    self.settings.hour24 = true; // boolean
    self.settings.datestyle = ''; // string[|short|medium|long|full]
    self.settings.timestyle = ''; // string[|short|medium|long|full]
    self.settings.fontfamily = ''; // string[fontfamilies]
    self.settings.fontsize = '15px'; // string
    self.settings.color = ({ENLIGHTENED:'#03fe03',RESISTANCE:'#00c5ff'})[window.PLAYER?.team] || '#ffa500'; // string, default to current player team, or orange if team name is not defined
    self.settings.backgroundcolor = '#000000'; // string
    self.settings.displaybackground = true; // boolean
    self.settings.displayborder = true; // boolean
    self.settings.replace = ''; // string
    self.settings.replacewith = ''; // string
    self.settings.replace2 = ''; // string
    self.settings.replacewith2 = ''; // string
    self.settings.controlposition = 'topleft'; // string[topleft|topright|bottomleft|bottomright]
    self.settings.offsetposition = {topleft:{x:0,y:0},topright:{x:0,y:0},bottomleft:{x:0,y:0},bottomright:{x:0,y:0}};
    self.settings.displaytooltipcycle = true; // boolean

    const colors = { // source: https://www.w3.org/TR/css-color-3/#svg-color
        ENLIGHTENED:'#03fe03',
        RESISTANCE:'#00c5ff',
        aliceblue: '#f0f8ff',
        antiquewhite: '#faebd7',
        aqua: '#00ffff',
        aquamarine: '#7fffd4',
        azure: '#f0ffff',
        beige: '#f5f5dc',
        bisque: '#ffe4c4',
        black: '#000000',
        blanchedalmond: '#ffebcd',
        blue: '#0000ff',
        blueviolet: '#8a2be2',
        brown: '#a52a2a',
        burlywood: '#deb887',
        cadetblue: '#5f9ea0',
        chartreuse: '#7fff00',
        chocolate: '#d2691e',
        coral: '#ff7f50',
        cornflowerblue: '#6495ed',
        cornsilk: '#fff8dc',
        crimson: '#dc143c',
        cyan: '#00ffff',
        darkblue: '#00008b',
        darkcyan: '#008b8b',
        darkgoldenrod: '#b8860b',
        darkgray: '#a9a9a9',
        darkgreen: '#006400',
        darkgrey: '#a9a9a9',
        darkkhaki: '#bdb76b',
        darkmagenta: '#8b008b',
        darkolivegreen: '#556b2f',
        darkorange: '#ff8c00',
        darkorchid: '#9932cc',
        darkred: '#8b0000',
        darksalmon: '#e9967a',
        darkseagreen: '#8fbc8f',
        darkslateblue: '#483d8b',
        darkslategray: '#2f4f4f',
        darkslategrey: '#2f4f4f',
        darkturquoise: '#00ced1',
        darkviolet: '#9400d3',
        deeppink: '#ff1493',
        deepskyblue: '#00bfff',
        dimgray: '#696969',
        dimgrey: '#696969',
        dodgerblue: '#1e90ff',
        firebrick: '#b22222',
        floralwhite: '#fffaf0',
        forestgreen: '#228b22',
        fuchsia: '#ff00ff',
        gainsboro: '#dcdcdc',
        ghostwhite: '#f8f8ff',
        gold: '#ffd700',
        goldenrod: '#daa520',
        gray: '#808080',
        green: '#008000',
        greenyellow: '#adff2f',
        grey: '#808080',
        honeydew: '#f0fff0',
        hotpink: '#ff69b4',
        indianred: '#cd5c5c',
        indigo: '#4b0082',
        ivory: '#fffff0',
        khaki: '#f0e68c',
        lavender: '#e6e6fa',
        lavenderblush: '#fff0f5',
        lawngreen: '#7cfc00',
        lemonchiffon: '#fffacd',
        lightblue: '#add8e6',
        lightcoral: '#f08080',
        lightcyan: '#e0ffff',
        lightgoldenrodyellow: '#fafad2',
        lightgray: '#d3d3d3',
        lightgreen: '#90ee90',
        lightgrey: '#d3d3d3',
        lightpink: '#ffb6c1',
        lightsalmon: '#ffa07a',
        lightseagreen: '#20b2aa',
        lightskyblue: '#87cefa',
        lightslategray: '#778899',
        lightslategrey: '#778899',
        lightsteelblue: '#b0c4de',
        lightyellow: '#ffffe0',
        lime: '#00ff00',
        limegreen: '#32cd32',
        linen: '#faf0e6',
        magenta: '#ff00ff',
        maroon: '#800000',
        mediumaquamarine: '#66cdaa',
        mediumblue: '#0000cd',
        mediumorchid: '#ba55d3',
        mediumpurple: '#9370db',
        mediumseagreen: '#3cb371',
        mediumslateblue: '#7b68ee',
        mediumspringgreen: '#00fa9a',
        mediumturquoise: '#48d1cc',
        mediumvioletred: '#c71585',
        midnightblue: '#191970',
        mintcream: '#f5fffa',
        mistyrose: '#ffe4e1',
        moccasin: '#ffe4b5',
        navajowhite: '#ffdead',
        navy: '#000080',
        oldlace: '#fdf5e6',
        olive: '#808000',
        olivedrab: '#6b8e23',
        orange: '#ffa500',
        orangered: '#ff4500',
        orchid: '#da70d6',
        palegoldenrod: '#eee8aa',
        palegreen: '#98fb98',
        paleturquoise: '#afeeee',
        palevioletred: '#db7093',
        papayawhip: '#ffefd5',
        peachpuff: '#ffdab9',
        peru: '#cd853f',
        pink: '#ffc0cb',
        plum: '#dda0dd',
        powderblue: '#b0e0e6',
        purple: '#800080',
        red: '#ff0000',
        rosybrown: '#bc8f8f',
        royalblue: '#4169e1',
        saddlebrown: '#8b4513',
        salmon: '#fa8072',
        sandybrown: '#f4a460',
        seagreen: '#2e8b57',
        seashell: '#fff5ee',
        sienna: '#a0522d',
        silver: '#c0c0c0',
        skyblue: '#87ceeb',
        slateblue: '#6a5acd',
        slategray: '#708090',
        slategrey: '#708090',
        snow: '#fffafa',
        springgreen: '#00ff7f',
        steelblue: '#4682b4',
        tan: '#d2b48c',
        teal: '#008080',
        thistle: '#d8bfd8',
        tomato: '#ff6347',
        turquoise: '#40e0d0',
        violet: '#ee82ee',
        wheat: '#f5deb3',
        white: '#ffffff',
        whitesmoke: '#f5f5f5',
        yellow: '#ffff00',
        yellowgreen: '#9acd32'
    };

    const locales = { // source: https://www.w3schools.com/jsref/jsref_tolocalestring.asp
        'ar-SA':'Arabic (Saudi Arabia)',
        'bn-BD':'Bangla (Bangladesh)',
        'bn-IN':'Bangla (India)',
        'cs-CZ':'Czech (Czech Republic)',
        'da-DK':'Danish (Denmark)',
        'de-AT':'Austrian German',
        'de-CH':'"Swiss" German',
        'de-DE':'Standard German (Germany)',
        'el-GR':'Modern Greek',
        'en-AU':'Australian English',
        'en-CA':'Canadian English',
        'en-GB':'British English',
        'en-IE':'Irish English',
        'en-IN':'Indian English',
        'en-NZ':'New Zealand English',
        'en-US':'US English',
        'en-ZA':'English (South Africa)',
        'es-AR':'Argentine Spanish',
        'es-CL':'Chilean Spanish',
        'es-CO':'Colombian Spanish',
        'es-ES':'Castilian Spanish (Central-Northern Spain)',
        'es-MX':'Mexican Spanish',
        'es-US':'American Spanish',
        'fi-FI':'Finnish (Finland)',
        'fr-BE':'Belgian French',
        'fr-CA':'Canadian French',
        'fr-CH':'"Swiss" French',
        'fr-FR':'Standard French (France)',
        'he-IL':'Hebrew (Israel)',
        'hi-IN':'Hindi (India)',
        'hu-HU':'Hungarian (Hungary)',
        'id-ID':'Indonesian (Indonesia)',
        'it-CH':'"Swiss" Italian',
        'it-IT':'Standard Italian (as spoken in Italy)',
        'ja-JP':'Japanese (Japan)',
        'ko-KR':'Korean (Republic of Korea)',
        'nl-BE':'Belgian Dutch',
        'nl-NL':'Standard Dutch (The Netherlands)',
        'no-NO':'Norwegian (Norway)',
        'pl-PL':'Polish (Poland)',
        'pt-BR':'Brazilian Portuguese',
        'pt-PT':'European Portuguese (Portugal)',
        'ro-RO':'Romanian (Romania)',
        'ru-RU':'Russian (Russian Federation)',
        'sk-SK':'Slovak (Slovakia)',
        'sv-SE':'Swedish (Sweden)',
        'ta-IN':'Indian Tamil',
        'ta-LK':'Sri Lankan Tamil',
        'th-TH':'Thai (Thailand)',
        'tr-TR':'Turkish (Turkey)',
        'zh-CN':'Mainland China, simplified characters',
        'zh-HK':'Hong Kong, traditional characters',
        'zh-TW':'Taiwan, traditional characters'
    };

    const fontfamilies = [
        '', // default
        'Arial',
        'Verdana',
        'Helvetica',
        'Tahoma',
        'Trebuchet MS',
        'Times New Roman',
        'Georgia',
        'Garamond',
        'Brush Script MT',
        'Monospace',
        'Courier New',
        'Lucida Console',
        'Monaco',
        'Cursive Brush Script MT',
        'Lucida Handwriting',
        'Fantasy Copperplate',
        'Papyrus'
    ];

    const datestyles = ['','short','medium','long','full'];
    const timestyles = ['','short','medium','long','full'];
    const controlpositions = { // The position of the control (one of the map corners). Possible values are
        'topleft':'Top left', // desktop default
  		'topright':'Top Right', // system default
        'bottomleft':'Bottom Left',
        'bottomright':'Bottom Right' // mobile default
    };

    self.restoresettings = function() {
        // read json settings in a very safe way:
        try {
            if (self.settingsStorageName in localStorage) {
                let data = localStorage.getItem(self.settingsStorageName);
                if (data) {
                    let storedsettings = JSON.parse(data);
                    if (typeof storedsettings == 'object' && !(storedsettings instanceof Array)) {
                        for (const item in self.settings) {
                            if (item in storedsettings) {
                                switch (item) {
                                    case 'display':
                                        if (storedsettings[item]?.match(/^(unix|iso|utc|local|manual|auto)$/)) {
                                            self.settings[item] = storedsettings[item];
                                        }
                                        break;
                                    case 'timestyles':
                                        if (timestyles.indexOf(storedsettings[item]) != -1) {
                                            self.settings[item] = storedsettings[item];
                                        }
                                        break;
                                    case 'datestyle':
                                        if (datestyles.indexOf(storedsettings[item]) != -1) {
                                            self.settings[item] = storedsettings[item];
                                        }
                                        break;
                                    case 'locale':
                                        if (locales.hasOwnProperty(storedsettings[item])) {
                                            self.settings[item] = storedsettings[item];
                                        }
                                        break;
                                    case 'fontfamily':
                                        if (fontfamilies.indexOf(storedsettings[item]) != -1) {
                                            self.settings[item] = storedsettings[item];
                                        }
                                        break;
                                    case 'controlposition':
                                        if (controlpositions.hasOwnProperty(storedsettings[item])) {
                                            self.settings[item] = storedsettings[item];
                                        }
                                        break;
                                    case 'offsetposition':
                                        for (const position of Object.keys(controlpositions)) {
                                            if (storedsettings.hasOwnProperty(position)) {
                                                if (self.settings[item][position].hasOwnProperty('x') && typeof self.settings[item][position].x == typeof storedsettings[position].x) {
                                                    self.settings[item][position].x = storedsettings[position].x;
                                                }
                                                if (self.settings[item][position].hasOwnProperty('y') && typeof self.settings[item][position].y == typeof storedsettings[position].y) {
                                                    self.settings[item][position].y = storedsettings[position].y;
                                                }
                                            }
                                        }
                                    default:
                                        if (typeof self.settings[item] == typeof storedsettings[item]) {
                                            self.settings[item] = storedsettings[item];
                                        }
                                }
                            }
                        }
                    }
                }
            }
        } catch(error) {
            alert(error.toString());
        }
    };
    self.storesettings = function() {
        try {
            return localStorage.setItem(self.settingsStorageName, JSON.stringify(self.settings));
        } catch(error) {
            alert(error.toString());
        }
    };

    self.getTime = function(display,timestamp) {
        display = display || self.settings.display;
        let options = {};
        if (self.settings.datestyle) options.dateStyle = self.settings.datestyle;
        if (self.settings.timestyle) options.timeStyle = self.settings.timestyle;
        options.hourCycle = (self.settings.hour24?'h23':'h11');

        timestamp = timestamp || new Date().getTime();
        let time = '';
        try {
            switch (display) {
                case 'unix':
                    time = new Date(timestamp).getTime().toString();
                    break;
                case 'iso':
                    time = new Date(timestamp).toISOString();
                    break;
                case 'local':
                    time = new Date(timestamp).toLocaleString(self.settings.locale, options);
                    break;
                case 'manual':
                    options.timeZone = self.settings.manualtimezone;
                    time = new Date(timestamp).toLocaleString(self.settings.locale, options);
                    break;
                case 'auto':
                    options.timeZone = self.settings.autotimezone;
                    time = new Date(timestamp).toLocaleString(self.settings.locale, options);
                    break;
                case 'utc':
                default:
                    time = new Date(timestamp).toUTCString();
                    break;
            }
            time = time.replace(/\u00a0/g, " "); // replace nbsp (0xA0) characters in a. m. / p. m. values with regular spaces
            if (self.settings.replace) time = time.replaceAll(self.settings.replace,self.settings.replacewith);
            if (self.settings.replace2) time = time.replaceAll(self.settings.replace2,self.settings.replacewith2);
        } catch(error) {
            time = error.toString();
        }
        return time;
    };

    self.getScoreCycleTimes = function(now) {
        // integrated some code from IITC plugin: Scoring cycle / checkpoint times v0.1.0
        // source: https://iitc.app/build/release/plugins/score-cycle-times.user.js

        let CHECKPOINT = 5*60*60; //5 hours per checkpoint
        let CYCLE = 7*25*60*60; //7 25 hour 'days' per cycle

        // checkpoint and cycle start times are based on a simple modulus of the timestamp
        // no special epoch (other than the unix timestamp/javascript's 1970-01-01 00:00 UTC) is required

        // when regional scoreboards were introduced, the first cycle would have started at 2014-01-15 10:00 UTC - but it was
        // a few checkpoints in when scores were first added

        now = now || new Date().getTime();

        let cycleStart = Math.floor(now / (CYCLE*1000)) * (CYCLE*1000);
        let cycleEnd = cycleStart + CYCLE*1000;

        let checkpointStart = Math.floor(now / (CHECKPOINT*1000)) * (CHECKPOINT*1000);
        let checkpointEnd = checkpointStart + CHECKPOINT*1000;


        let formatRow = function(label,time) {
            var timeStr = self.getTime(self.settings.display,time);
            // timeStr = timeStr.replace(/:00$/,'').replace(/:00 /,'');
            return timeStr + ' ' + label;
        };

        return formatRow('Cycle start', cycleStart) + "\n" +
            formatRow('Previous checkpoint', checkpointStart) + "\n" +
            formatRow('Next checkpoint', checkpointEnd) + "\n" +
            formatRow('Cycle end', cycleEnd);
    };
    self.getNextScoreCycleTime = function(now) {
        now = now || new Date().getTime();
        let CHECKPOINT = 5*60*60; //5 hours per checkpoint
        let CYCLE = 7*25*60*60; //7 25 hour 'days' per cycle
        let checkpointStart = Math.floor(now / (CHECKPOINT*1000)) * (CHECKPOINT*1000);
        let checkpointEnd = checkpointStart + CHECKPOINT*1000;
        return checkpointEnd - now;
    };

    self.getGeonamesURL = function(location) {
        if (!(location instanceof window.L.LatLng)) location = undefined;
        location = location || window.map.getCenter();
        return "https://secure.geonames.org/timezoneJSON?lat=" + location.lat + "&lng=" + location.lng + "&username=" + self.settings.geonameskey;
    };

    self.getTimeZoneLatLng = function(location,callback,callbackerror) {
        if (!self.settings.geonameskey) {
            if (typeof callbackerror == 'function') callbackerror('enter username first');
            return;
        }

        if (!(location instanceof window.L.LatLng)) location = undefined;
        location = location || window.map.getCenter();

        let url = self.getGeonamesURL(location);

        $.ajax({
            type: 'GET',
            contentType: "application/json; charset=utf-8",
            crossDomain: true,
            dataType: "jsonp",
            url: url
        }).done(res => {
            // console.log("geonames returned:", res);
            if (res.timezoneId) {
                if (typeof callback == 'function') callback(res.timezoneId);
            } else {
                if (typeof callbackerror == 'function') callbackerror('timezoneid missing');
            }
        }).fail((xhr, status, error) => {
            console.warn("geonames failed:", xhr, status, error);
            if (typeof callbackerror == 'function') {
                callbackerror('failed');
            }
        });
    };

    self.menu = function(menu) {
        menu = menu || 'Main';

        let container = document.createElement('div');
        container.style.userSelect = 'none';

        let menupage = '';
        let buttons = {};
        switch (menu) {
            case 'About':
                menupage = `
        <div>
        Date Time plugin<br>
        <br>
        The initial request for making this plugin, was to display a timestamp on IITC, while making screengrabs to create a timelaps.<br>
        A first proof of concept to display a timestamp was made by user pawelki, by creating a Leaflet DateTimeControl.<br>
        <br>
        The next step was to get the timezone for the current map location. IITC is already using the Google Maps map API, so the first idea was to use the Google Maps Timezone API as well. Google Maps timezone API is not a free service.<br>
        GeoNames is a free alternative, but you must first register a personal account, and then simply enter your username into the dialog.<br>
        <br>
        There are several ways to display a date and time, so several options were implemented to choose from.<br>
        And there are always dashes which should be replaced by dots or spaces, so some text replace options were added as well.<br>
        And ofcourse the timestamp display, like color, font and fontsize, and control position can all be changed with formatting settings.<br>
        <div>
        `;
                buttons = {
                    'Changelog': function() { alert(self.changelog); },
                    '< Main menu': function() { self.menu('Main'); }
                };
                break;
            case 'Formatting':
                menupage = `
        <div>
        <table>
        <tr><td>Font:</td><td><select name="datetime-fontfamily-list"></select></td></tr>
        <tr><td>Size:</td><td><select name="datetime-fontsize-list"></select></td></tr>
        <tr><td>Text/border color:</td><td><select name="datetime-color-list"></select></td></tr>
        <tr><td>Background:</td><td><select name="datetime-backgroundcolor-list"></select></td></tr>
        <tr><td colspan="2"><label><input type="checkbox" name="datetime-background-checkbox">Display background</label></td></tr>
        <tr><td colspan="2"><label><input type="checkbox" name="datetime-border-checkbox">Display border</label></td></tr>
        <tr><td>Position:</td><td><select name="datetime-controlposition-list"></select></td></tr>
        <tr><td>Offset x:</td><td><input name="datetime-offsetpositionx-input" style="width:6em" autocomplete="off"></td></tr>
        <tr><td>Offset y:</td><td><input name="datetime-offsetpositiony-input" style="width:6em" autocomplete="off"></td></tr>
        <tr><td colspan="2"><label><input type="checkbox" name="datetime-displaytooltipcycle-checkbox">Display cycle/checkpoint times as tooltip</label></td></tr>
        </table>
        <div>
        `;
                buttons = {
                    '< Main menu': function() { self.menu('Main'); }
                };
                break;
            case 'GeoNames':
                menupage = `
        <div>
        Map center timezone time requires a registered account at this website:<br>
        <ol>
        <li>Register for free at <a href="https://www.geonames.org/login" target="_blank">GeoNames</a></li>
        <li>Confirm the activation link in your e-mail (check spam folder!)</li>
        <li>Login at <a href="https://www.geonames.org/login" target="_blank">GeoNames</a></li>
        <li>Open this GeoNames link (and login again if needed):<br>
        <a href="https://www.geonames.org/enablefreewebservice" target="_blank">Enable your account to use the free webservice</a></li>
        <li>Your GeoNames username: <input type="text" name="datetime-geonames-key-input"></li>
        <li><a href="#" name="datetime-display-test-webservice" target="_blank">Test webservice link</a> (check for warnings)</li>
        <li><button name="datetime-geonames-test-button">Get map center timezone</button></li>
        </ol>
        <div>
        `;
                buttons = {
                    '< Main menu': function() { self.menu('Main'); }
                };
                break;
            case 'Main':
            default:
                menupage = `
        <div>
        <label><input type="radio" name="datetime-display-radio" value="unix"> UNIX Time: <span name="datetime-unix-text"></span></label><br>
        <label><input type="radio" name="datetime-display-radio" value="iso"> ISO Time: <span name="datetime-iso-text"></span></label><br>
        <label><input type="radio" name="datetime-display-radio" value="utc"> UTC Time: <span name="datetime-utc-text"></span></label><br>
        <label><input type="radio" name="datetime-display-radio" value="local"> LocalTime: <span name="datetime-local-text"></span></label><br>
        <label><input type="radio" name="datetime-display-radio" value="manual"> Manual timezone time: <span name="datetime-manual-text"></span></label>
        <div style="margin-left: 24px">Edit Timezone: <input type="text" name="datetime-manual-timezone-input"></div>
        <label><input type="radio" name="datetime-display-radio" value="auto"> Map center timezone time: <span name="datetime-auto-text"></span></label>
        <div style="margin-left: 24px">Your GeoNames username: <span name="datetime-geonames-key-text"></span><br>
        Map center Timezone: <span name="datetime-auto-timezone-text" style="user-select: all"></span></div>
        <br>
        Localtime formatting:<br>
        <label><input type="checkbox" name="datetime-hour24-checkbox"> 24 hour clock</label><br>
        <select name="datetime-locale-list"></select><br>
        Date: <select name="datetime-datestyle-list"></select> Time: <select name="datetime-timestyle-list"></select><br>
        <br>
        Replace text: <input type="text" name="datetime-replace-input" style="width:3em"> with <input type="text" name="datetime-replacewith-input" style="width:3em"><br>
        Replace text: <input type="text" name="datetime-replace2-input" style="width:3em"> with <input type="text" name="datetime-replacewith2-input" style="width:3em"><br>
        </div>
        `;
                buttons = {
                    'Formatting': function() { self.menu('Formatting'); },
                    'GeoNames': function() { self.menu('GeoNames'); },
                    'About': function() { self.menu('About'); }
                };
        }

        container.innerHTML = `<input type="hidden" autofocus>
        ${menupage}
        <div style="margin-top: 14px; font-style: italic; font-size: smaller;">${self.title} version ${self.version} by ${self.author}</div>
        `;

        let timerid = 0;

        window.dialog({
            html: container,
            id: 'DateTime',
            title: 'Date Time - ' + menu,
            width: 'auto',
            closeCallback: function() {
                clearInterval(timerid);
            }
        }).dialog('option', 'buttons', { ...buttons,
            'Close': function() { $(this).dialog('close'); }
        });

        function updateDialog() {
            let timestamp = new Date().getTime();
            $("span[name=datetime-unix-text]").text(self.getTime('unix',timestamp));
            $("span[name=datetime-iso-text]").text(self.getTime('iso',timestamp));
            $("span[name=datetime-utc-text]").text(self.getTime('utc',timestamp));
            $("span[name=datetime-local-text]").text(self.getTime('local',timestamp));
            $("span[name=datetime-manual-text]").text(self.getTime('manual',timestamp));
            $("span[name=datetime-auto-text]").text(self.getTime('auto',timestamp));
        }

        function updateDateTimeStylesDefault() {
            $("select[name=datetime-datestyle-list] option[value='']").text(self.settings.timestyle ? 'none' : 'default');
            $("select[name=datetime-timestyle-list] option[value='']").text(self.settings.datestyle ? 'none' : 'default');
        }

        for (const fontfamily of fontfamilies) {
            $("select[name=datetime-fontfamily-list]").append($('<option>', {
                value: fontfamily,
                text: fontfamily || 'default',
                selected: fontfamily == self.settings.fontfamily
            }).css('font-family',fontfamily));
        }
        $("select[name=datetime-fontfamily-list]").on('change', function (evt) {
            self.settings.fontfamily = this.value;
            self.storesettings();
            self.control.fontFamily(self.settings.fontfamily);
        });

        for (let size = 20; size >= 6; size--) {
            $("select[name=datetime-fontsize-list]").append($('<option>', {
                value: size + 'px',
                text: size + 'px' + (size + 'px' == '15px'?' (default)':''),
                selected: size + 'px' == self.settings.fontsize
            }).css('font-size',size));
        }
        $("select[name=datetime-fontsize-list]").on('change', function (evt) {
            self.settings.fontsize = this.value;
            self.storesettings();
            self.control.fontSize(self.settings.fontsize);
        });

        $("select[name=datetime-color-list]").css('background-color',self.settings.backgroundcolor).css('border-color',self.settings.color).css('border-width','3px');
        $("select[name=datetime-color-list]").css('color',self.settings.color);
        for (const [name, color] of Object.entries(colors)) {
            $("select[name=datetime-color-list]").append($('<option>', {
                value: color,
                text: name,
                selected: color == self.settings.color
            }).css('color',color));
        }
        $("select[name=datetime-color-list]").on('change', function (evt) {
            this.style.color = this.value;
            this.style.borderColor = this.value;
            self.settings.color = this.value;
            self.storesettings();
            self.control.color(self.settings.color);
            $("select[name=datetime-backgroundcolor-list]").css('color',self.settings.color).css('border-color',self.settings.color);
        });

        $("select[name=datetime-backgroundcolor-list]").css('background-color',self.settings.backgroundcolor).css('border-color',self.settings.color).css('border-width','3px');
        $("select[name=datetime-backgroundcolor-list]").css('color',self.settings.color);
        for (const [name, color] of Object.entries(colors)) {
            $("select[name=datetime-backgroundcolor-list]").append($('<option>', {
                value: color,
                text: name,
                selected: color == self.settings.backgroundcolor
            }).css('background-color',color));
        }
        $("select[name=datetime-backgroundcolor-list]").on('change', function (evt) {
            this.style.backgroundColor = this.value;
            self.settings.backgroundcolor = this.value;
            self.storesettings();
            self.control.backgroundColor(self.settings.backgroundcolor);
            $("select[name=datetime-color-list]").css('background-color',self.settings.backgroundcolor);
        });

        $("input[name=datetime-background-checkbox]").prop('checked',self.settings.displaybackground);
        $('input[name=datetime-background-checkbox]').on('change', function (evt) {
            self.settings.displaybackground = this.checked;
            self.storesettings();
            self.control.displayBackground(self.settings.displaybackground);
        });
        $("input[name=datetime-border-checkbox]").prop('checked',self.settings.displayborder);
        $('input[name=datetime-border-checkbox]').on('change', function (evt) {
            self.settings.displayborder = this.checked;
            self.storesettings();
            self.control.displayBorder(self.settings.displayborder);
        });
        $("input[name=datetime-displaytooltipcycle-checkbox]").prop('checked',self.settings.displaytooltipcycle);
        $('input[name=datetime-displaytooltipcycle-checkbox]').on('change', function (evt) {
            self.settings.displaytooltipcycle = this.checked;
            self.storesettings();
            self.control.setTitle(self.settings.displaytooltipcycle ? self.getScoreCycleTimes() : '');
        });

        for (const [key, value] of Object.entries(locales)) {
            $("select[name=datetime-locale-list]").append($('<option>', {
                value: key,
                text: key + ': ' + value,
                selected: key == self.settings.locale
            }));
        }
        $("select[name=datetime-locale-list]").on('change', function (evt) {
            self.settings.locale = this.value;
            self.storesettings();
            updateDialog();
            self.control.setTitle(self.settings.displaytooltipcycle ? self.getScoreCycleTimes() : '');
        });

        for (const [key, value] of Object.entries(controlpositions)) {
            $("select[name=datetime-controlposition-list]").append($('<option>', {
                value: key,
                text: value,
                selected: key == self.settings.controlposition
            }));
        }
        $("select[name=datetime-controlposition-list]").on('change', function (evt) {
            self.settings.controlposition = this.value;
            self.storesettings();
            $("input[name=datetime-offsetpositionx-input]").val(self.settings.offsetposition[self.settings.controlposition].x);
            $("input[name=datetime-offsetpositiony-input]").val(self.settings.offsetposition[self.settings.controlposition].y);
            self.control.setPosition(self.settings.controlposition);
            self.control.moveToEdge();
            console.log("controlposition",this.value,self.settings.offsetposition[self.settings.controlposition]);
            self.control.setOffset(self.settings.offsetposition[self.settings.controlposition].x,self.settings.offsetposition[self.settings.controlposition].y);
        });

        $("input[name=datetime-offsetpositionx-input]").val(self.settings.offsetposition[self.settings.controlposition].x);
        $("input[name=datetime-offsetpositionx-input]").on('input', function(evt) {
            if (isNaN(parseInt(this.value))) return;
            self.settings.offsetposition[self.settings.controlposition].x = parseInt(this.value);
            self.storesettings();
            self.control.setOffset(self.settings.offsetposition[self.settings.controlposition].x,self.settings.offsetposition[self.settings.controlposition].y);
        });
        $("input[name=datetime-offsetpositiony-input]").val(self.settings.offsetposition[self.settings.controlposition].y);
        $("input[name=datetime-offsetpositiony-input]").on('input', function(evt) {
            if (isNaN(parseInt(this.value))) return;
            self.settings.offsetposition[self.settings.controlposition].y = parseInt(this.value);
            self.storesettings();
            self.control.setOffset(self.settings.offsetposition[self.settings.controlposition].x,self.settings.offsetposition[self.settings.controlposition].y);
        });

        for (const value of datestyles) {
            $("select[name=datetime-datestyle-list]").append($('<option>', {
                value: value,
                text: value || 'default',
                selected: value == self.settings.datestyle
            }));
        }
        $("select[name=datetime-datestyle-list]").on('change', function (evt) {
            self.settings.datestyle = this.value;
            self.storesettings();
            updateDialog();
            updateDateTimeStylesDefault();
            self.control.update();
            self.control.setTitle(self.settings.displaytooltipcycle ? self.getScoreCycleTimes() : '');
        });

        for (const value of timestyles) {
            $("select[name=datetime-timestyle-list]").append($('<option>', {
                value: value,
                text: value || 'default',
                selected: value == self.settings.timestyle
            }));
        }
        $("select[name=datetime-timestyle-list]").on('change', function (evt) {
            self.settings.timestyle = this.value;
            self.storesettings();
            updateDialog();
            updateDateTimeStylesDefault();
            self.control.update();
            self.control.setTitle(self.settings.displaytooltipcycle ? self.getScoreCycleTimes() : '');
        });
        updateDateTimeStylesDefault();

        $("input[name=datetime-replace-input]").val(self.settings.replace);
        $("input[name=datetime-replace-input]").on('input', function(evt) {
            self.settings.replace = this.value;
            self.storesettings();
            updateDialog();
            self.control.setTitle(self.settings.displaytooltipcycle ? self.getScoreCycleTimes() : '');
        });
        $("input[name=datetime-replacewith-input]").val(self.settings.replacewith);
        $("input[name=datetime-replacewith-input]").on('input', function(evt) {
            self.settings.replacewith = this.value;
            self.storesettings();
            updateDialog();
            self.control.setTitle(self.settings.displaytooltipcycle ? self.getScoreCycleTimes() : '');
        });

        $("input[name=datetime-replace2-input]").val(self.settings.replace2);
        $("input[name=datetime-replace2-input]").on('input', function(evt) {
            self.settings.replace2 = this.value;
            self.storesettings();
            updateDialog();
            self.control.setTitle(self.settings.displaytooltipcycle ? self.getScoreCycleTimes() : '');
        });
        $("input[name=datetime-replacewith2-input]").val(self.settings.replacewith2);
        $("input[name=datetime-replacewith2-input]").on('input', function(evt) {
            self.settings.replacewith2 = this.value;
            self.storesettings();
            updateDialog();
            self.control.setTitle(self.settings.displaytooltipcycle ? self.getScoreCycleTimes() : '');
        });

        $("input[name=datetime-hour24-checkbox]").prop('checked',self.settings.hour24);
        $('input[name=datetime-hour24-checkbox]').on('change', function (evt) {
            self.settings.hour24 = this.checked;
            self.storesettings();
            updateDialog();
            self.control.update();
            self.control.setTitle(self.settings.displaytooltipcycle ? self.getScoreCycleTimes() : '');
        });

        $("input[name=datetime-display-radio][value='" + self.settings.display + "']").prop('checked',true);
        $('input[name=datetime-display-radio]').on('click', function (evt) {
            self.settings.display = this.value;
            self.storesettings();
            self.control.update();
            self.control.setTitle(self.settings.displaytooltipcycle ? self.getScoreCycleTimes() : '');
            if (this.value == 'auto' && !self.settings.geonameskey) {
                self.menu('GeoNames');
            } else if (this.value == 'auto') {
                self.getTimeZoneLatLng(window.map.getCenter(),function(timezone) {
                    self.settings.autotimezone = timezone;
                    self.storesettings();
                    $("span[name=datetime-auto-timezone-text]").text(timezone);
                });
            }
        });

        $("input[name=datetime-manual-timezone-input]").val(self.settings.manualtimezone);
        $("input[name=datetime-manual-timezone-input]").on('input', function(evt) {
            self.settings.manualtimezone = this.value;
            self.storesettings();
            updateDialog();
            self.control.setTitle(self.settings.displaytooltipcycle ? self.getScoreCycleTimes() : '');
        });

        $("span[name=datetime-auto-timezone-text]").text(self.settings.autotimezone);
        $("span[name=datetime-auto-timezone-text]").css('cursor','text');

        $('input[name=datetime-geonames-key-input]').on('input', function (evt) {
            self.settings.geonameskey = this.value.toLowerCase();
            self.storesettings();

            let center = window.map.getCenter();
            $('a[name=datetime-display-test-webservice]').prop('href',self.getGeonamesURL(center));
        });

        $("input[name=datetime-geonames-key-input]").val(self.settings.geonameskey);
        $("span[name=datetime-geonames-key-text]").text(self.settings.geonameskey || '(not set)');
        $("span[name=datetime-geonames-key-text]").css('cursor','pointer');
        $("span[name=datetime-geonames-key-text]").on('click', function (evt) {
            self.menu('GeoNames');
        });

        let center = window.map.getCenter();
        $('a[name=datetime-display-test-webservice]').prop('href',self.getGeonamesURL(center));

        $('button[name=datetime-geonames-test-button]').on('click', function (evt) {
            self.getTimeZoneLatLng(window.map.getCenter(),function(timezone) {
                self.settings.autotimezone = timezone;
                self.storesettings();
                $("span[name=datetime-auto-text]").text(self.getTime('auto'));
                $("span[name=datetime-auto-timezone-text]").text(timezone);
                alert("Timezone: " + timezone);
            },function(error) {
                alert("Timezone failed: " + error);
            });
        });

        updateDialog();
        timerid = setInterval(updateDialog,1000);
    };

    var setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        if (window.isSmartphone()) self.settings.controlposition = 'bottomright'; // default for mobile users
        self.restoresettings();

        // leaflet date time control
        window.L.DateTimeControl = window.L.Control.extend({
            interval: 1000, // 1 second
            options: {
                position: 'topleft'
            },
            initialize: function(options) {
                window.L.setOptions(this,options);
            },
            onAdd: function (map) {
                this._map = map;

                let container = window.L.DomUtil.create('div', 'leaflet-date-time');
                let dateTimeText = window.L.DomUtil.create('p', '', container);

                this._container = container;
                this._dateTimeText = dateTimeText;
                $(dateTimeText).css('cursor','pointer');
                let control = this;
                $(dateTimeText).on('click', function (evt) {
                    self.menu();
                });

                let t = this;
                t.update(); // update displayed time now
                setInterval(function () {
                    t.update();
                }, this.interval); // keep updating displayed time every 1 second

                if (this.options.color) this.color(this.options.color);
                if (this.options.fontFamily) this.fontFamily(this.options.fontFamily);
                if (this.options.fontSize) this.fontSize(this.options.fontSize);
                if (this.options.backgroundColor) this.backgroundColor(this.options.backgroundColor);
                if (typeof this.options.displayBackground == 'boolean') this.displayBackground(this.options.displayBackground);
                if (typeof this.options.displayBorder == 'boolean') this.displayBorder(this.options.displayBorder);
                this.setOffset();

                return container;
            },
            fontSize: function(size) {
                this._dateTimeText.style.fontSize = size;
                this.options.fontSize = size;
            },
            fontFamily: function(fontFamily) {
                this._dateTimeText.style.fontFamily = fontFamily;
                this.options.fontFamily = fontFamily;
            },
            color: function(color) {
                this._container.style.borderColor = color;
                this._dateTimeText.style.color = color;
                this.options.color = color;
            },
            backgroundColor: function(color) {
                this._container.style.backgroundColor = color;
                this.options.backgroundColor = color;
            },
            displayBackground: function(display) {
                this._container.style.backgroundColor = (display ? this.options.backgroundColor : 'unset');
            },
            displayBorder: function(display) {
                this._container.style.border = (display ? "3px solid " + this.options.color : 'unset');
            },
            update: function () {
                this._dateTimeText.innerText = self.getTime();
            },
            show: function() {
                $(this._container).show();
            },
            hide: function() {
                $(this._container).hide();
            },
            moveToEdge: function(control) {
                control = control || this;
                let $el = $(control.getContainer());
                let $corner = $el.parent();
                let pos = control.getPosition();
                if (pos.indexOf('top') !== -1) {
                    $corner.prepend($el);
                } else if (pos.indexOf('bottom') !== -1 && window.isSmartphone()) {
                    $corner.append($el);
                    $corner.find('.leaflet-control-attribution').appendTo($corner); // make sure that attribution control is on very bottom
                }
                control.setTitle(control.options.title);
            },
            setOffset: function(x,y) {
                if (typeof x != 'number') x = this.options.offsetx;
                if (typeof y != 'number') y = this.options.offsety;
                if (!isNaN(parseInt(x))) {
                    this.options.offsetx = x;
                    this._container.style.left = x + 'px';
                }
                if (!isNaN(parseInt(y))) {
                    this.options.offsety = y;
                    this._container.style.top = y + 'px';
                }
            },
            setTitle: function(title) {
                this.options.title = title;
                this._dateTimeText.title = title;
            }
        });

        window.L.dateTime = function(options) {
            return new window.L.DateTimeControl(options);
        };

        $('<style>').prop('type', 'text/css')
            .html('.leaflet-date-time {display:inline-block;background:#000000;padding:0px 5px 0px 5px;border:3px solid #00FF00;opacity:0.8} .leaflet-date-time p {font-size:15px;color:#00FF00;margin:0;font-weight:bold}')
            .appendTo('head');

        let options = {};
        options.fontSize = self.settings.fontsize;
        options.fontFamily = self.settings.fontfamily;
        options.color = self.settings.color;
        options.backgroundColor = self.settings.backgroundcolor;
        options.displayBackground = self.settings.displaybackground;
        options.displayBorder = self.settings.displayborder;
        options.position = self.settings.controlposition;
        options.offsetx = self.settings.offsetposition[self.settings.controlposition].x;
        options.offsety = self.settings.offsetposition[self.settings.controlposition].y;
        self.control = window.L.dateTime(options).addTo(window.map);
        self.control.setTitle(self.settings.displaytooltipcycle ? self.getScoreCycleTimes() : '');

        setTimeout(function() {
            self.control.setTitle(self.settings.displaytooltipcycle ? self.getScoreCycleTimes() : '');
            setInterval(function() {
                self.control.setTitle(self.settings.displaytooltipcycle ? self.getScoreCycleTimes() : '');
            }, 5*60*60*1000);
        }, self.getNextScoreCycleTime() + 1000); // refresh the title 1 second after the new cycle starts, then keep refreshing at a fixed cycle interval of 5 hours

        // wait for other controls to initialize (then move to the edge)
        setTimeout(function() { self.control.moveToEdge(self.control); });

        let toggle = new window.L.LayerGroup();
        window.addLayerGroup('Date Time', toggle, true);
        if (window.isLayerGroupDisplayed('Date Time') === false) self.control.hide();
        window.map.on('layeradd', function (obj) {
            if (obj.layer === toggle) {
                self.control.show();
            }
        });
        window.map.on('layerremove', function (obj) {
            if (obj.layer === toggle) {
               self.control.hide();
            }
        });

        window.map.on('moveend', function() {
            let center = window.map.getCenter();
            if (self.settings.display == 'auto') {
                self.getTimeZoneLatLng(center,function(timezone) {
                    self.settings.autotimezone = timezone;
                    self.storesettings();
                    $("span[name=datetime-auto-text]").text(self.getTime('auto'));
                    $("span[name=datetime-auto-timezone-text]").text(timezone);
                    self.control.setTitle(self.settings.displaytooltipcycle ? self.getScoreCycleTimes() : '');
                });
            }
            $('a[name=datetime-display-test-webservice]').prop('href',self.getGeonamesURL(center));
        });

        let toolboxlink = document.getElementById('toolbox').appendChild(document.createElement('a'));
        toolboxlink.textContent = 'Date Time';
        toolboxlink.addEventListener('click', function(e) {
            e.preventDefault();
            self.menu();
        }, false);

        console.log('IITC plugin loaded: ' + self.title + ' version ' + self.version);
    };

    setup.priority = 'low';
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
