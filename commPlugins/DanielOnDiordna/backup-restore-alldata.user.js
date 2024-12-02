// ==UserScript==
// @author         DanielOnDiordna
// @name           Backup/restore all data
// @category       Misc
// @version        1.0.1.20221019.225200
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/backup-restore-alldata.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/backup-restore-alldata.user.js
// @description    [danielondiordna-1.0.1.20221019.225200] With this plugin you can backup all your localstorage data, so you can save it to a text file, and you can also restore all data. This can be usefull to transfer your settings to another device, or to make a backup before reinstalling IITC. You can also view or delete stored data.
// @id             backup-restore-alldata@DanielOnDiordna
// @namespace      https://softspot.nl/ingress/
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.backuprestorealldata = function() {};
    var self = window.plugin.backuprestorealldata;
    self.id = 'backuprestorealldata';
    self.title = 'Backup/restore all data';
    self.version = '1.0.1.20221019.225200';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 1.0.1.20221019.225200
- version upgrade due to a change in the wrapper, added changelog

version 1.0.0.20220113.120500
- reversed changelog to show latest first
- major release version 1.0.0
- added an about menu
- added menu buttons
- show total storage bytes
- added show details of local storage
- added a selective backup/delete function
- save/load file for probably all platforms

version 0.0.3.20210724.002500
- prevent double plugin setup on hook iitcLoaded

version 0.0.3.20210421.190200
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin

version 0.0.3.20210121.224300
- version number fix

version 0.0.2.20210117.190200
- updated plugin wrapper and userscript header formatting to match IITC-CE coding

version 0.0.1.20191209.145200
- first release
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.savefile = function(selection) {
        let d = new Date();
        let t = d.getFullYear() + '-' + ('0' + d.getDate()).slice(-2) + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '_' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
        let filename = 'IITC-backupdata-' + t + '.json';
        let data = self.backupdata(selection);

        if (typeof window.saveFile == 'function') { // iitc-ce method
            window.saveFile(data, filename, "application/json"); // text/plain
        } else if (!window.isSmartphone()) { // pc method
            let a = document.createElement('a');
            a.href = "data:text/json;charset=utf-8," + encodeURIComponent(data);
            a.download = filename;
            a.click();
        } else if (typeof android !== 'undefined' && android && android.saveFile) { // iitc-me method
            android.saveFile(filename, "application/json", data);
        }
    };

    self.backup = function(selection) {
        var html = '<div class="' + self.id + '-formatting">' +
            'Select all data and copy/paste it to a notepad file:<br />' +
            '<textarea readonly class="' + self.id + '-backup">Be patient, this will take some time, depending on the amount of data</textarea>' +
            (typeof window.saveFile == 'function' || !window.isSmartphone() || (typeof android !== 'undefined' && android && android.saveFile) ? '<a href="#" class="' + self.id + '-savefilebutton">Save file</a>' : '') +
            '</div>';

        window.dialog({
            html: html,
            width: 600,
            id: self.pluginname + '-dialog',
            dialogClass: 'ui-dialog-' + self.title,
            title: self.title + ' - backup' + (selection && selection.length > 0?' selection (' + selection.length + ')':'')
        }).dialog('option', 'buttons', {
            '< Main menu': function() { self.menu(); },
            'Show details': function() { self.showdetails(selection); },
            'Close': function() { $(this).dialog('close'); },
        });

        setTimeout(function() {
            $('.' + self.id + '-backup').val(self.backupdata(selection))
            $('.' + self.id + '-savefilebutton').bind('click', function (evt) {
                console.log('savefile');
                self.savefile(selection);
            });
        },100);
    };

    self.show = function(key) {
        let keyid = key.replace(/\W/g,'');
        var html = '<div class="' + self.id + '-formatting ' + self.id + keyid + '-show">' +
            key + ' (' + localStorage.getItem(key).length + ' bytes):<br />' +
            '<textarea readonly></textarea>' +
            '</div>';

        window.dialog({
            html: html,
            width: 600,
            id: self.pluginname + keyid + '-dialog',
            dialogClass: 'ui-dialog-' + self.title,
            title: self.title + ' - Show'
        }).dialog('option', 'buttons', {
            'Close': function() { $(this).dialog('close'); }
        });

        setTimeout(function() { $('.' + self.id + keyid + '-show textarea').val(localStorage.getItem(key)) },100);
    };

    self.showdetails = function(selection) {
        let total = 0;
        let rows = [];
        Object.keys(localStorage).sort().forEach(function(key) {
            total += key.length;
            total += localStorage.getItem(key).length;
            rows.push('<tr><td><label><input type="checkbox" name="' + key + '"' + (selection && selection.indexOf(key) > -1?' checked':'') + '> ' + key + '</label></td><td align="right">' + localStorage.getItem(key).length + '</td><td><input type="button" value="Show" onclick="' + self.namespace + 'show(\'' + key + '\')"></td><td><input type="button" value="Delete" onclick="if (confirm(\'' + key + '\\n\\nAre you sure you want to delete this value?\')) { localStorage.removeItem(\'' + key + '\'); $(this).closest(\'tr\').remove(); }"></td></tr>');
        });
        let details = '<table>' + rows.join('') + '</table>';

        var html = '<div class="' + self.id + '-formatting ' + self.id + '-backupselection">' +
            'There is a total storage of: ' + total + ' bytes<br />\n' +
            details +
            '</div>';

        window.dialog({
            html: html,
            width: 600,
            id: self.pluginname + '-dialog',
            dialogClass: 'ui-dialog-' + self.title,
            title: self.title + ' - backup'
        }).dialog('option', 'buttons', {
            '< Main menu': function() { self.menu(); },
            'Backup selected': function() {
                let selected = [];
                $(".backuprestorealldata-backupselection :checked").each(function(index,el) {
                    selected.push(el.name);
                });
                if (selected.length == 0) {
                    alert('Nothing selected');
                } else {
                    self.backup(selected);
                }
            },
            'Close': function() { $(this).dialog('close'); },
        });
    };

    self.backupdata = function(selection) {
        let data = {};
        Object.keys(localStorage).sort().forEach(function(key) {
            if ((!selection || selection.length == 0) || (selection && selection.indexOf(key) > -1)) {
                data[key] = localStorage.getItem(key);
            }
        });
        return JSON.stringify(data);
    };

    self.restore = function() {
        var html = '<div class="' + self.id + '-formatting">' +
            'Paste your backup data to restore:<br />\n' +
            '<textarea class="' + self.id + '-restore"></textarea>\n' +
            'Import file: <input type="file" id="' + self.id + '-file" onchange="' + self.namespace + 'importfile(this)"></input><br />' +
            '<a href="#" onclick="' + self.namespace + 'restoredata($(\'.' + self.id + '-restore\').val()); return false;">Restore all</a>\n' +
            'This will overwrite stored data with the same variable names.<br />\n' +
            'And please be patient, this will take some time, depending on the amount of data.' +
            '</div>';

        window.dialog({
            html: html,
            width: 600,
            id: self.pluginname + '-dialog',
            dialogClass: 'ui-dialog-' + self.title,
            title: self.title + ' - restore'
        }).dialog('option', 'buttons', {
            '< Main menu': function() { self.menu(); },
            'Show details': function() { self.showdetails(); },
            'Close': function() { $(this).dialog('close'); }
        });
    };

    self.restoredata = function(jsondata) {
        let data = {};
        try {
            data = JSON.parse(jsondata);
        } catch(err) {
            alert("Data restore failure: " + err);
            return;
        }

        for (let key in data) {
            localStorage.setItem(key,data[key]);
        }
        alert('Data restore success. Items restored: ' + Object.keys(data).length);
    };

    self.importfile = function(obj) {
        let filesobj = obj.files;
        if (filesobj.length !== 1) {
            console.log('no file selected');
            return;
        }

        if (filesobj[0].type != 'application/json') {
            alert('no json file selected');
            return;
        }

        var readerobj = new FileReader();
        readerobj.onload = function (e) {
            $('.' + self.id + '-restore').val(e.target.result);
        };
        readerobj.readAsText(filesobj[0]);
    };

    self.about = function() {
        let html = '<div>' +
            self.title + '<br />' +
            '<br />' +
            'IITC and plugins store settings in your local storage memory, like cookies.<br />' +
            'This storage is limited to 5MB (per app per browser).<br />' +
            '<br />' +
            'There are several reasons for using this plugin:<br />' +
            '- If you move to a new phone or browser, you want to keep your settings.<br />' +
            '- If you remove plugins, you want to clean up traces of stored settings.<br />' +
            '- If storage is full, IITC will not function anymore, so you need to clean up old or corrupt settings.<br />' +
            '- You want to start fresh with a plugin, without old settings.<br />' +
            '<br />' +
            'With this plugin you get control over the stored data.<br />' +
            '<span style="font-style: italic; font-size: smaller">' + self.title + ' version ' + self.version + ' by ' + self.author + '</span>' +
            '</div>';

        window.dialog({
            html: html,
            id: self.pluginname + '-dialog',
            dialogClass: 'ui-dialog-' + self.title,
            width: 'auto',
            title: self.title + ' - About'
        }).dialog('option', 'buttons', {
            '< Main menu': function() { self.menu(); },
            'Changelog': function() { alert(self.changelog); },
            'Close': function() { $(this).dialog('close'); }
        });
    };

    self.menu = function() {
        let total = 0;
        Object.keys(localStorage).sort().forEach(function(key){
            total += key.length;
            total += localStorage.getItem(key).length;
        });

        var html = '<div class="' + self.id + '-formatting">' +
            'There is a total storage of: ' + total + ' bytes<br />\n' +
            'These functions take a long time to process, so be patient:\n' +
            '<a href="#" onclick="' + self.namespace + 'showdetails(); return false;">Show details...</a>\n' +
            '<a href="#" onclick="' + self.namespace + 'backup(); return false;">Backup all data...</a>\n' +
            '<a href="#" onclick="' + self.namespace + 'restore(); return false;">Restore...</a>\n' +
            '<span style="font-style: italic; font-size: smaller">version ' + self.version + ' by ' + self.author + '</span>' +
            '</div>';

        window.dialog({
            html: html,
            id: self.pluginname + '-dialog',
            dialogClass: 'ui-dialog-' + self.title,
            title: self.title
        }).dialog('option', 'buttons', {
            'About': function() { self.about(); },
            'Close': function() { $(this).dialog('close'); }
        });
    };

    self.setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        $('#toolbox').append('<a onclick="' + self.namespace + 'menu(); return false;" href="#">' + self.title + '</a>');

        $('head').append(
            '<style>' +
            '.' + self.id + '-formatting > a { display:block; color:#ffce00; border:1px solid #ffce00; padding:3px 0; margin:10px auto; width:80%; text-align:center; background:rgba(8,48,78,.9); }' +
            '.' + self.id + '-formatting > textarea { width:96%; height:250px; resize:vertical; }' +
            '</style>');
        console.log('IITC plugin loaded: ' + self.title + ' version ' + self.version);
    };

    var setup = function() {
        (window.iitcLoaded?self.setup():window.addHook('iitcLoaded',self.setup));
    };

    // Added to support About IITC details and changelog:
    plugin_info.script.version = plugin_info.script.version.replace(/\.\d{8}\.\d{6}$/,'');
    plugin_info.buildName = 'softspot.nl';
    plugin_info.dateTimeVersion = self.version.replace(/^.*(\d{4})(\d{2})(\d{2})\.(\d{6})/,'$1-$2-$3-$4');
    plugin_info.pluginId = self.id;
    let changelog = [{version:'This is a <a href="https://softspot.nl/ingress/" target="_blank">softspot.nl</a> plugin by ' + self.author,changes:[]},...self.changelog.replace(/^.*?version /s,'').split(/\nversion /).map((v)=>{v=v.split(/\n/).map((l)=>{return l.replace(/^- /,'')}).filter((l)=>{return l != "";}); return {version:v.shift(),changes:v}})];

    setup.info = plugin_info; //add the script info data to the function as a property
    if (typeof changelog !== 'undefined') setup.info.changelog = changelog;
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
