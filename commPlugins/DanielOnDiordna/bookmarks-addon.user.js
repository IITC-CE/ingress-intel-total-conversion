// ==UserScript==
// @author         DanielOnDiordna
// @name           Bookmarks add-on
// @category       Addon
// @version        2.1.0.20240227.204800
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/bookmarks-addon.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/bookmarks-addon.user.js
// @description    [danielondiordna-2.1.0.20240227.204800] Bookmark plugin add-on, to replace the default yellow marker by a color marker (color change requires colorpicker or drawtools), and show bookmark names (layer), including optional scaling. Modified export file with timestamp in text/plain format. Also an option for bookmarks export to kml file format (for google maps). Add/remove bookmarks with filters for level, faction, captured, visited and resonator counts. Integrated Spectrum Colorpicker 1.8.1
// @id             bookmarks-addon@DanielOnDiordna
// @namespace      https://softspot.nl/ingress/
// @depends        bookmarks@ZasoGD
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.bookmarksAddon = function() {};
    var self = window.plugin.bookmarksAddon;
    self.id = 'bookmarksAddon';
    self.title = 'Bookmarks add-on';
    self.version = '2.1.0.20240227.204800';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 2.1.0.20240227.204800
- fixed the Bookmarks Opt menu items injection (using MutationObserver) to be compatible with Bookmarks plugin version 0.4.4

version 2.0.1.20231011.001300
- fixed the captured filter where visited was mixed up with captured
- added more details to the plugin description

version 2.0.0.20231011.000200
- reformatted javascript code ES6 backticks
- redesigned the add/remove bookmarks dialog
- fixed the dialog id to hide the main dialog when selecting other submenus
- modified kml export file with http urls to https urls
- added KML file usage instructions with a link to My Google Maps
- added filters for visited and captured for auto add bookmarks
- added folder name for auto add bookmarks
- added more confirm dialogs

version 1.0.0.20230726.000800
- first major release with lots of changes
- reversed the changelog order to show last changes at the top
- added window. in front of all global object references
- added export to csv file with decimal sign and separator selectors
- removed colon (:) from timestamp between hours minutes used in filenames
- added support for Machina portals
- fixed drawing bookmarks for unclaimed portals
- removed fast functions from previous version
- added a super fast drawbookmarks function

version 0.0.9.20211025.221800
- test version to increase portal creation speed
- created a fastAddPortalBookmark function
- created a fastSwitchStarPortal function

version 0.0.8.20210802.234100
- added KML file export button

version 0.0.7.20210724.002500
- prevent double plugin setup on hook iitcLoaded

version 0.0.7.20210421.190200
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin

version 0.0.7.20210218.232400
- moved code to setup functions with comments for better understanding the code
- change bookmark color without removing/adding the portal
- fixed dragging portals in the listbox for older versions of IITC
- added an about menu and changelog display option

version 0.0.6.20210121.224700
- version number fix

version 0.0.5.20210119.230400
- integrated Spectrum Colorpicker 1.8.1 plugin code, no need anymore for the separate plugin

version 0.0.4.20211701.233600
- fixed the export file timestamp for IITC-CE
- updated plugin wrapper and userscript header formatting to match IITC-CE coding

version 0.0.3.20200502.005000
- added zoom scaling, replacing the option for smaller portals

version 0.0.2.20191223.152300
- changed Export bookmarks file format from application/json to text/plain
- added a timestamp to the Export bookmarks filename suggestion

version 0.0.1.20191003.225300
- added KML export function

version 0.0.1.20181030.213900
- intel URL changed from www.ingress.com to *.ingress.com

version 0.0.1.20180405.092300
- earlier version
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.localstoragesettings = 'plugin-' + self.id + '-settings';
    self.defaultcolor = '#fee70d'; // yellow/orange

    self.settings = {};
    self.settings.color = self.defaultcolor;
    self.settings.portallevel = [true,true,true,true,true,true,true,true,true];
    self.settings.resonators = '<=8';
    self.settings.enl = true;
    self.settings.res = true;
    self.settings.mac = true;
    self.settings.visited = "any";
    self.settings.captured = "any";
    self.settings.addcolor = self.defaultcolor;
    self.settings.replace = true;
    self.settings.smaller = false;
    self.settings.override = false;
    self.settings.csvseparator = "\t";
    self.settings.csvdecimal = ".";
    self.settings.autofolder = "auto add";

    self.labelLayerGroup = undefined;
    self.labeltimer = undefined;
    self.labelLayers = {};
    self.portalName_WIDTH = 80;
    self.portalName_HEIGHT = 35;

    self.restoresettings = function() {
        if (typeof localStorage[self.localstoragesettings] === 'string' && localStorage[self.localstoragesettings] !== '') {
            try {
                let settings = JSON.parse(localStorage[self.localstoragesettings]);
                if (typeof settings === 'object' && settings instanceof Object && !(settings instanceof Array)) {
                    for (const i in settings) {
                        if (typeof settings[i] === typeof self.settings[i]) self.settings[i] = settings[i];
                    }
                }
            } catch(e) {
                return false;
            }
        }
    };
    self.storesettings = function() {
        localStorage[self.localstoragesettings] = JSON.stringify(self.settings);
    };

    self.portalonvisiblelayer = function(portal) {
        if (!portal || !portal.options || !portal.options.data) return false;

        if (portal.options.data.team === 'E' && !window.overlayStatus['Enlightened']) return false;
        if (portal.options.data.team === 'R' && !window.overlayStatus['Resistance']) return false;
        if (portal.options.data.team === 'M' && !(window.overlayStatus['__MACHINA__'] || window.overlayStatus['U̶͚̓̍N̴̖̈K̠͔̍͑̂͜N̞̥͋̀̉Ȯ̶̹͕̀W̶̢͚͑̚͝Ṉ̨̟̒̅'])) return false;
        if (portal.options.data.team === 'N' && !window.overlayStatus['Unclaimed/Placeholder Portals']) return false;
        if (portal.options.data.team !== 'N' && !window.overlayStatus['Level ' + portal.options.data.level + ' Portals']) return false;

        return true;
    };

    self.includeportal = function(portal) {
        if (!portal || !portal.options || !portal.options.data) return false;

        // console.log('includeportal',portal.options.data.title,portal.options.data.team,self.settings.portallevel[0],portal.options.data.level,portal.options.data.history);

        // Faction:
        if (portal.options.data.team === 'E' && !self.settings.enl) return false;
        if (portal.options.data.team === 'R' && !self.settings.res) return false;
        if (portal.options.data.team === 'M' && !self.settings.mac) return false;
        if (portal.options.data.team === 'N' && !self.settings.portallevel[0]) return false;

        if (portal.options.data.team !== 'N') {
            // Level:
            if (!self.settings.portallevel[portal.options.data.level]) return false;
            // Resonators:
            if (self.settings.resonators === '<8' && !(portal.options.data.resCount < 8)) return false;
            if (self.settings.resonators === '8' && !(portal.options.data.resCount === 8)) return false;
            if (self.settings.resonators === '<=8' && !(portal.options.data.resCount <= 8)) return false;
        }

        // History:
        if ('history' in portal.options.data && 'visited' in portal.options.data.history) {
            if (self.settings.visited == "visited" && !portal.options.data.history.visited) return false;
            if (self.settings.visited == "not-visited" && portal.options.data.history.visited) return false;
        }
        if ('history' in portal.options.data && 'captured' in portal.options.data.history) {
            if (self.settings.captured == "captured" && !portal.options.data.history.captured) return false;
            if (self.settings.captured == "not-captured" && portal.options.data.history.captured) return false;
        }

        return true;
    };

    self.getmatchingportals = function() {
        let visiblebounds = window.map.getBounds();
        //let color_backup = self.settings.color;
        //self.settings.color = self.settings.addcolor;
        //let addcnt = 0;
        //let replacecnt = 0;
        //let cnt = 0;
        let bookmarkslist = {}; // {<guid>:{folder:<string>,latlng:<window.L.LatLng>,label:<string>,color:<string>}};
        for (const guid in window.portals) {
            let portal = window.portals[guid];
            let latlng = portal.getLatLng();
            if (visiblebounds.contains(latlng)) {
                //cnt++;
                //console.log(cnt,portal.options.data.title,guid);
                if (self.portalonvisiblelayer(portal) && self.includeportal(portal)) {
                    bookmarkslist[guid] = {folder:self.settings.autofolder || "Other",latlng:latlng,label:portal.options.data.title,color:self.settings.addcolor};
/*
                    let bkmrkData = window.plugin.bookmarks.findByGuid(guid);
                    let label = portal.options.data.title;
                    if (!bkmrkData) {
                        // add new bookmark:
                        self.fastAddPortalBookmark(guid,latlng.lat + ',' + latlng.lng,label);
                        addcnt++;
                    } else if (window.plugin.bookmarks.bkmrksObj.portals[bkmrkData.id_folder].bkmrk[bkmrkData.id_bookmark].color != self.settings.addcolor) {
                        if (self.settings.replace) {
                            // change bookmark color
                            document.getElementById('fill_' + guid).style.fill = self.settings.addcolor;
                            window.plugin.bookmarks.bkmrksObj.portals[bkmrkData.id_folder].bkmrk[bkmrkData.id_bookmark].color = self.settings.addcolor;
                            window.plugin.bookmarks.saveStorage();
                        }
                        replacecnt++;
                    }
*/
                }
            }
        }
        return bookmarkslist;
    };

    self.addmatchingbookmarks = function(bookmarkslist) {
        let result = self.drawbookmarks(bookmarkslist,self.settings.replace); // {added:addcnt,changed:changecnt,skipped:skipcnt}

        //if (addcnt > 0 || replacecnt > 0) window.plugin.bookmarks.updateStarPortal();
        //self.settings.color = color_backup;
        alert('Added bookmarks: ' + result.added + (self.settings.replace?'\nReplaced bookmarks:' + result.changed:'\n(skipped: ' + result.skipped + ')'));
    };

    self.countbookmarks = function(bounds,outofbounds) {
        if (typeof outofbounds != "boolean") outofbounds = false;
        let removecnt = 0;
        for (const folderid in window.plugin.bookmarks.bkmrksObj.portals) {
            if (!bounds) {
                removecnt += Object.keys(window.plugin.bookmarks.bkmrksObj.portals[folderid].bkmrk).length;
            } else {
                for (const ID in window.plugin.bookmarks.bkmrksObj.portals[folderid].bkmrk) {
                    let bookmark = window.plugin.bookmarks.bkmrksObj.portals[folderid].bkmrk[ID];
                    let guid = bookmark.guid;
                    let bookmarkpos = window.L.latLng(bookmark.latlng.split(","));
                    if (!outofbounds && bounds.contains(bookmarkpos) || outofbounds && !bounds.contains(bookmarkpos)) {
                        // remove existing bookmark:
                        removecnt++;
                    }
                }
            }
        }
        return removecnt;
    };

    self.clearbookmarks = function(bounds,outofbounds) {
        // leave maps alone
        // only clear all portals including folders
        // optionally limit to portals within given bounds, or outofbounds (boolean) - this will keep all folders
        if (typeof outofbounds != "boolean") outofbounds = false;
        let removecnt = 0;
        for (const folderid in window.plugin.bookmarks.bkmrksObj.portals) {
            if (!bounds) {
                removecnt += Object.keys(window.plugin.bookmarks.bkmrksObj.portals[folderid].bkmrk).length;
            } else {
                for (const ID in window.plugin.bookmarks.bkmrksObj.portals[folderid].bkmrk) {
                    let bookmark = window.plugin.bookmarks.bkmrksObj.portals[folderid].bkmrk[ID];
                    let guid = bookmark.guid;
                    let bookmarkpos = window.L.latLng(bookmark.latlng.split(","));
                    if (!outofbounds && bounds.contains(bookmarkpos) || outofbounds && !bounds.contains(bookmarkpos)) {
                        // remove existing bookmark:
                        delete window.plugin.bookmarks.bkmrksObj.portals[folderid].bkmrk[ID];
                        removecnt++;
                    }
                }
                if (folderid != 'idOthers' && removecnt > 0 && Object.keys(window.plugin.bookmarks.bkmrksObj.portals[folderid].bkmrk).length == 0) {
                    // remove empty portals folder
                    delete window.plugin.bookmarks.bkmrksObj.portals[folderid];
                }
            }
        }
        if (!bounds) {
            window.plugin.bookmarks.bkmrksObj.portals = {idOthers:{label:"Others",state:1,bkmrk:{}}};
        }

        window.plugin.bookmarks.saveStorage();
        window.plugin.bookmarks.refreshBkmrks();
        window.runHooks('pluginBkmrksEdit', {"target": "all", "action": "reset"});
        return removecnt;
    };
    self.drawbookmarks = function(bookmarkslist,replaceexisting) { // {<guid>:{folder:<string>,latlng:<window.L.LatLng>,label:<string>,color:<string>}};
        // super fast: draw bookmarks instantly by replacing all bookmarks data, without slow hooks and console calls
        replaceexisting = replaceexisting || false;
        function saveAndRefreshBookmarks() {
            window.plugin.bookmarks.saveStorage();
            window.plugin.bookmarks.refreshBkmrks();
            window.runHooks('pluginBkmrksEdit', {"target": "all", "action": "import"});
        }
        function createBookmarkData(guid,latlng,label,color) {
            if (typeof latlng == 'object') {
                latlng = latlng.lat+','+latlng.lng;
            }
            let bookmark = {"guid":guid,"latlng":latlng,"label":label};
            if (window.plugin.bookmarksAddon) {
                bookmark.color = color;
            }
            return bookmark;
        }
        function getBookmarksFolderID(bookmarksfolder) {
            if (!bookmarksfolder) bookmarksfolder = "Others"; // default
            let folderid = undefined;
            for (const ID in window.plugin.bookmarks.bkmrksObj.portals) {
                if (window.plugin.bookmarks.bkmrksObj.portals[ID].label == bookmarksfolder) {
                    folderid = ID;
                    break;
                }
            }
            return folderid;
        }
        function createNewBookmarksFolder(bookmarksfolder) {
            if (!bookmarksfolder) bookmarksfolder = "Others"; // default
            let folderid = getBookmarksFolderID(bookmarksfolder);
            if (!folderid) {
                folderid = window.plugin.bookmarks.generateID();

                window.plugin.bookmarks.bkmrksObj.portals[folderid] = {"label":bookmarksfolder,"state":1,"bkmrk":{}};
                window.plugin.bookmarks.saveStorage();
                window.plugin.bookmarks.refreshBkmrks();
                window.runHooks('pluginBkmrksEdit', {"target": 'folder', "action": "add", "id": folderid});
            }
            return folderid;
        }

        let changecnt = 0,addcnt = 0,skipcnt = 0;
        for (let guid in bookmarkslist) {
            let bookmark = bookmarkslist[guid];
            let bookmarkFolderID = createNewBookmarksFolder(bookmark.folder);

            let newbookmarkdata = createBookmarkData(guid,bookmark.latlng,bookmark.label,bookmark.color);
            let bkmrkData = window.plugin.bookmarks.findByGuid(guid);
            if (bkmrkData) {
                if (bookmarkFolderID == bkmrkData.id_folder &&
                    newbookmarkdata.latlng == window.plugin.bookmarks.bkmrksObj.portals[bkmrkData.id_folder].bkmrk[bkmrkData.id_bookmark].latlng &&
                    newbookmarkdata.label == window.plugin.bookmarks.bkmrksObj.portals[bkmrkData.id_folder].bkmrk[bkmrkData.id_bookmark].label &&
                    newbookmarkdata.color == window.plugin.bookmarks.bkmrksObj.portals[bkmrkData.id_folder].bkmrk[bkmrkData.id_bookmark].color) {
                    // same data, skip
                    skipcnt++;
                    continue;
                }
                if (!replaceexisting) {
                    skipcnt++;
                    continue;
                }
                // remove (to replace) existing bookmark:
                delete window.plugin.bookmarks.bkmrksObj.portals[bkmrkData.id_folder].bkmrk[bkmrkData.id_bookmark];
                changecnt++;
            } else {
                addcnt++;
            }

            // add new bookmark:
            let ID = window.plugin.bookmarks.generateID();
            window.plugin.bookmarks.bkmrksObj.portals[bookmarkFolderID].bkmrk[ID] = newbookmarkdata;
        }

        saveAndRefreshBookmarks();

        //console.log('Bookmarks added: ' + addcnt + ' changed: ' + changecnt + ' unchanged: ' + skipcnt);
        return {added:addcnt,changed:changecnt,skipped:skipcnt};
    };

    self.removebookmarks = function(includedportals) {
        let visiblebounds = window.map.getBounds();
        let removecnt = 0;
        for (const folderid in window.plugin.bookmarks.bkmrksObj.portals) {
            for (const ID in window.plugin.bookmarks.bkmrksObj.portals[folderid].bkmrk) {
                let bookmark = window.plugin.bookmarks.bkmrksObj.portals[folderid].bkmrk[ID];
                let guid = bookmark.guid;
                let portal = window.portals[guid];
                let bookmarkpos = window.L.latLng(bookmark.latlng.split(","));
                if (visiblebounds.contains(bookmarkpos) && (!includedportals || includedportals && self.includeportal(portal))) {
                    // remove existing bookmark:
                    // self.fastSwitchStarPortal(guid);
                    delete window.plugin.bookmarks.bkmrksObj.portals[folderid].bkmrk[ID];
                    removecnt++;
                }
            }
            if (folderid != 'idOthers' && removecnt > 0 && Object.keys(window.plugin.bookmarks.bkmrksObj.portals[folderid].bkmrk).length == 0) {
                // remove empty portals folder
                delete window.plugin.bookmarks.bkmrksObj.portals[folderid];
            }
        }

//        window.plugin.bookmarks.updateStarPortal();
        window.plugin.bookmarks.saveStorage();
        window.plugin.bookmarks.refreshBkmrks();
        window.runHooks('pluginBkmrksEdit', {"target": "all", "action": "reset"});

        alert('Removed bookmarks: ' + removecnt);
    };

    self.bookmarks2kml = function() {
        let bookmarkdata = JSON.parse(localStorage[window.plugin.bookmarks.KEY_STORAGE]);

        let kmlstyles = {};

        let kmlfolders = '';
        for (const folderid in bookmarkdata.portals) {
            if (Object.keys(bookmarkdata.portals[folderid].bkmrk).length === 0) {
                continue;
            }
            let foldername = bookmarkdata.portals[folderid].label;
            kmlfolders += `
    <Folder>
      <name>${foldername}</name>`;
            for (const bookmarkid in bookmarkdata.portals[folderid].bkmrk) {
                let color = self.defaultcolor;
                if (bookmarkdata.portals[folderid].bkmrk[bookmarkid].color) {
                    color = bookmarkdata.portals[folderid].bkmrk[bookmarkid].color;
                }

                let capscolor = color.replace(/^#/i,"").toUpperCase();
                if (!kmlstyles[color]) {
                    let kmlcolor = color.replace(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i,"ff$3$2$1");
                    // convert rrggbb > aabbggrr, where aa=alpha (00 to ff); bb=blue (00 to ff); gg=green (00 to ff); rr=red (00 to ff)
                    // e65100 > ff0051e6
                    kmlstyles[color] = `
    <Style id="icon-1899-${capscolor}-nodesc-normal">
      <IconStyle>
        <color>${kmlcolor}</color>
        <scale>1</scale>
        <Icon>
          <href>https://www.gstatic.com/mapspro/images/stock/503-wht-blank_maps.png</href>
        </Icon>
        <hotSpot x="32" xunits="pixels" y="64" yunits="insetPixels"/>
      </IconStyle>
      <LabelStyle>
        <scale>0</scale>
      </LabelStyle>
      <BalloonStyle>
        <text><![CDATA[<h3>$[name]</h3>]]></text>
      </BalloonStyle>
    </Style>
    <Style id="icon-1899-${capscolor}-nodesc-highlight">
      <IconStyle>
        <color>${kmlcolor}</color>
        <scale>1</scale>
        <Icon>
          <href>https://www.gstatic.com/mapspro/images/stock/503-wht-blank_maps.png</href>
        </Icon>
        <hotSpot x="32" xunits="pixels" y="64" yunits="insetPixels"/>
      </IconStyle>
      <LabelStyle>
        <scale>1</scale>
      </LabelStyle>
      <BalloonStyle>
        <text><![CDATA[<h3>$[name]</h3>]]></text>
      </BalloonStyle>
    </Style>
    <StyleMap id="icon-1899-${capscolor}-nodesc">
      <Pair>
        <key>normal</key>
        <styleUrl>#icon-1899-${capscolor}-nodesc-normal</styleUrl>
      </Pair>
      <Pair>
        <key>highlight</key>
        <styleUrl>#icon-1899-${capscolor}-nodesc-highlight</styleUrl>
      </Pair>
    </StyleMap>`;
                }
                let guid = bookmarkdata.portals[folderid].bkmrk[bookmarkid].guid;
                let bookmarkname = bookmarkdata.portals[folderid].bkmrk[bookmarkid].label;
                if (bookmarkname.match(/[^a-zA-Z0-9 \-,.]/)) {
                    bookmarkname = `<![CDATA[${bookmarkname}]]>`;
                }
                let kmllatlng = bookmarkdata.portals[folderid].bkmrk[bookmarkid].latlng.replace(/^([^,]+),([^,]+)$/,"$2,$1");
                bookmarkdata.portals[folderid].bkmrk[bookmarkid].latlng
                let lat = bookmarkdata.portals[folderid].bkmrk[bookmarkid].latlng.match(/^([^,]+),/)[1];
                let lng = bookmarkdata.portals[folderid].bkmrk[bookmarkid].latlng.match(/,([^,]+)$/)[1];
                let permalinkUrl = location.href.match(/^([^/]+\/\/[^/]+)\//)[1] + `/intel?ll=${lat},${lng}&z=17&pll=${lat},${lng}`;
                kmlfolders += `
      <Placemark>
        <name>${bookmarkname}</name>
        <description><![CDATA[${permalinkUrl}]]></description>
        <styleUrl>#icon-1899-${capscolor}-nodesc</styleUrl>
        <Point>
          <coordinates>
            ${kmllatlng},0
          </coordinates>
        </Point>
      </Placemark>`;
            }
            kmlfolders += `
    </Folder>`;
        }

        let kml =
`<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="https://www.opengis.net/kml/2.2">
  <Document>
    <name>Portals</name>
    <description/>${Object.values(kmlstyles).join('')}${kmlfolders}
  </Document>
</kml>`;
        // console.log(kml);
        return kml;
    };

    self.bookmarks2csv = function(separator,decimal) {
        separator = separator || "\t";
        let csv = [];
        csv.push(['label','guid','lat','lng','color','folder'].join(separator));
        for (const folderid in window.plugin.bookmarks.bkmrksObj.portals) {
            let foldername = window.plugin.bookmarks.bkmrksObj.portals[folderid].label;
            for (const ID in window.plugin.bookmarks.bkmrksObj.portals[folderid].bkmrk) {
                let bookmark = window.plugin.bookmarks.bkmrksObj.portals[folderid].bkmrk[ID];
                let bookmarkpos = window.L.latLng(bookmark.latlng.split(","));
                let bookmarkname = bookmark.label;
                if (bookmarkname.indexOf(separator) >= 0) {
                    bookmarkname = bookmarkname.replaceAll('"','""');
                    bookmarkname = '"' + bookmarkname + '"';
                }
                let lat = bookmarkpos.lat.toString().replaceAll('.',decimal);
                if (decimal == separator) lat = '"' + lat + '"';
                let lng = bookmarkpos.lng.toString().replaceAll('.',decimal);
                if (decimal == separator) lng = '"' + lng + '"';
                csv.push([bookmarkname,bookmark.guid,lat,lng,bookmark.color || "#000000",foldername].join(separator));
            }
        }
        return csv.join("\n");
    };

    self.savekml = function() {
        // TO FIX: saved file in Drive cannot be opened in maps
        if (typeof android !== 'undefined' && android && android.saveFile) {
            android.saveFile("IITC-bookmarks.kml", "application/vnd.google-earth.kml+xml", self.bookmarks2kml());
        }
    };

    self.exportkml = function() {
        let container = document.createElement('div');
        container.innerHTML = `
<p><a href="#" onclick="$('.ui-dialog-bkmrksSet-copy textarea').select(); return false;">Select all</a> and press CTRL+C to copy it.</p>
<textarea readonly></textarea>
<p>Save the KML to a file, <a href="https://www.google.com/maps/d?hl=nl&amp;authuser=0&amp;action=open" target="_blank">Open My Google Maps</a>, make a Map and import the KML file</p>
`;
        container.querySelector('textarea').value = self.bookmarks2kml(); // .replace(/</,'&lt;').replace(/>/,'&gt;')

        window.dialog({
            html: container,
            id: 'plugin-bookmarks-options',
            dialogClass: 'ui-dialog-bkmrksSet-copy',
            title: 'Bookmarks - KML Export'
        }).dialog('option', 'buttons', {
            '< Main menu': function() { window.plugin.bookmarks.manualOpt(); },
            'Save file': function() { window.saveFile(kmldata,'IITC-bookmarks-' + self.timestamp() + '.kml','application/vnd.google-earth.kml+xml'); },
            'Close': function() { $(this).dialog('close'); },
        });
    };

    self.exportcsv = function() {
        let container = document.createElement('div');
        container.innerHTML = `
<p><a href="#">Select all</a> and press CTRL+C to copy it.</p>
<p>Decimal sign: <select class="csvdecimal"><option value=".">45.1345</option><option value=",">45,1345</option></select>
Separator: <select class="csvseparator"><option value="\t">tab</option><option value=";">;</option><option value=",">,</option></select></p>
<textarea readonly></textarea>
`;
        container.querySelector('a').addEventListener('click',function(e) {
            e.preventDefault();
            container.querySelector('textarea').select();
        },false);
        let decimalselect = container.querySelector('select.csvdecimal');
        decimalselect.value = self.settings.csvdecimal;
        decimalselect.addEventListener('change',function(e) {
            self.settings.csvdecimal = decimalselect.value;
            self.storesettings();
            container.querySelector('textarea').value = self.bookmarks2csv(self.settings.csvseparator,self.settings.csvdecimal);
        },false);
        let separatorselect = container.querySelector('select.csvseparator');
        separatorselect.value = self.settings.csvseparator;
        separatorselect.addEventListener('change',function(e) {
            self.settings.csvseparator = separatorselect.value;
            self.storesettings();
            container.querySelector('textarea').value = self.bookmarks2csv(self.settings.csvseparator,self.settings.csvdecimal);
        },false);
        container.querySelector('textarea').value = self.bookmarks2csv(self.settings.csvseparator,self.settings.csvdecimal);

        window.dialog({
            html: container,
            id: 'plugin-bookmarks-options',
            dialogClass: 'ui-dialog-bkmrksSet-copy',
            title: 'Bookmarks - CSV Export'
        }).dialog('option', 'buttons', {
            '< Main menu': function() { window.plugin.bookmarks.manualOpt(); },
            'Save file': function() { window.saveFile(container.querySelector('textarea').value,'IITC-bookmarks-' + self.timestamp() + '.csv','text/plain'); },
            'Close': function() { $(this).dialog('close'); },
        });
    };

    self.about = function() {
        let container = document.createElement('div');
        container.innerHTML = `
Bookmarks add-on<br>
<br>
This add-on will add extra functionality to the stock plugin Bookmarks:<br>
With colored bookmarks enabled the original bookmark image is replaced by an svg vector icon.<br>
<br>
With add/remove bookmarks you can quickly draw bookmarks on portals by level, faction, visited, captured or amount of resonators.<br>
Bookmarked portals can be exported to KML file format, which can be imported in <a href="https://www.google.com/maps/d?hl=nl&amp;authuser=0&amp;action=open" target="_blank">My Google Maps</a>.<br>
Bookmarked portals can also be exported to CSV file format.<br>
When a portal with a bookmark is selected, the color can be changed from the menu.<br>
<br>
And also added an overlay layer for Bookmarked portal names.<br>
<span style="font-style: italic; font-size: smaller">${self.title} version ${self.version} by ${self.author}</span>
`;

        window.dialog({
            html: container,
            id: 'plugin-bookmarks-options',
            dialogClass: 'ui-dialog-bkmrksSet',
            width: 'auto',
            title: self.title + ' - About'
        }).dialog('option', 'buttons', {
            '< Main menu': function() { window.plugin.bookmarks.manualOpt(); },
            'Changelog': function() { alert(self.changelog); },
            'Close': function() { $(this).dialog('close'); },
        });
    };

    self.menu = function() {
        let container = document.createElement('div');
        container.innerHTML = `
<div>
Only portals on visible layers will be used!<br>
Include portals that match these options:<br>
Level (<a href="#" name="selectlevels">select all</a>):<br>
<span name="levels"><label><input type="checkbox" name="level1">1</label>
<label><input type="checkbox" name="level2">2</label>
<label><input type="checkbox" name="level3">3</label>
<label><input type="checkbox" name="level4">4</label>
<label><input type="checkbox" name="level5">5</label>
<label><input type="checkbox" name="level6">6</label>
<label><input type="checkbox" name="level7">7</label>
<label><input type="checkbox" name="level8">8</label></span><br>
Faction:<br>
<label><input type="checkbox" name="unclaimed">Unclaimed</label>
<label title="Enlightened"><input type="checkbox" name="enlightened">ENL</label>
<label title="Resistance"><input type="checkbox" name="resistance">RES</label>
<label title="Machina"><input type="checkbox" name="machina">MAC</label><br>
History:<br>
<label><input type="radio" name="visited" value="any">Any</label> <label><input type="radio" name="visited" value="visited">Visited</label> <label><input type="radio" name="visited" value="not-visited">Not-Visited</label><br>
<label><input type="radio" name="captured" value="any">Any</label> <label><input type="radio" name="captured" value="captured">Captured</label> <label><input type="radio" name="captured" value="not-captured">Not-Captured</label><br>
Resonators:<br>
<select name="resonators">
<option value="8">8 resonators</option>
<option value="&lt;8">less then 8 resonators</option>
<option value="&lt;=8">any resonators</option>
</select><br>
<input type="text" name="addsbookmarkscolor"></input> Color for new bookmarks<br>
Add to folder: <input type="text" name="autofolder"><br>
<label><input type="checkbox" name="replaceexisting">replace existing bookmarks</label><br>
</div>
<div id="bkmrksSetbox">
<a href="#" name="addbookmarks">Add bookmarks...</a>
<a href="#" name="removematching">Remove matching bookmarks...</a>
<a href="#" name="clearvisible">Clear all visible bookmarks...</a>
<a href="#" name="clearinvisible">Clear all invisible bookmarks...</a>
<a href="#" name="clearallbookmarks">Clear all bookmarks + folders...</a>
<a href="#" name="clearall">Reset bookmarks + maps...</a>
<span style="font-style: italic; font-size: smaller">version ${self.version} by ${self.author}</span>
</div>
`;

        let unclaimedcheckbox = container.querySelector('input[type=checkbox][name=unclaimed]');
        let enlightenedcheckbox = container.querySelector('input[type=checkbox][name=enlightened]');
        let resistancecheckbox = container.querySelector('input[type=checkbox][name=resistance]');
        let machinacheckbox = container.querySelector('input[type=checkbox][name=machina]');
        let resonatorsselect = container.querySelector('select[name=resonators]');
        let replaceexistingcheckbox = container.querySelector('input[type=checkbox][name=replaceexisting]');
        let addbookmarksbutton = container.querySelector('a[name=addbookmarks]');
        let removematchingbutton = container.querySelector('a[name=removematching]');
        let clearvisiblebutton = container.querySelector('a[name=clearvisible]');
        let clearinvisiblebutton = container.querySelector('a[name=clearinvisible]');
        let clearallbookmarksbutton = container.querySelector('a[name=clearallbookmarks]');
        let clearallbutton = container.querySelector('a[name=clearall]');

        let selectlevelslbutton = container.querySelector('a[name=selectlevels]');
        selectlevelslbutton.addEventListener('click',function(e) {
            e.preventDefault();
            for (let lvl = 1; lvl <= 8; lvl++) {
                let levelcheckbox = container.querySelector(`input[type=checkbox][name=level${lvl}]`);
                levelcheckbox.checked = true;
                self.settings.portallevel[lvl] = true
            }
            self.storesettings();
        },false);

        for (let lvl = 1; lvl <= 8; lvl++) {
            let levelcheckbox = container.querySelector(`input[type=checkbox][name=level${lvl}]`);
            levelcheckbox.checked = self.settings.portallevel[lvl];
            levelcheckbox.addEventListener('click',function(e) {
                self.settings.portallevel[lvl] = this.checked;
                self.storesettings();
            },false);
        }
        function disablelevelcheckboxes(disable = true) {
            let levelcheckboxes = container.querySelectorAll(`span[name=levels] input[type=checkbox]`);
            for (let levelcheckbox of levelcheckboxes) {
                levelcheckbox.disabled = disable;
            }
        }

        // if only unclaimed is selected, then resonator filter and level filters cannot be used
        function updateform() {
            resonatorsselect.disabled = (self.settings.portallevel[0] && !self.settings.enl && !self.settings.res && !self.settings.mac);
            disablelevelcheckboxes(self.settings.portallevel[0] && !self.settings.enl && !self.settings.res && !self.settings.mac);
            if (!self.settings.portallevel[0] && !self.settings.enl && !self.settings.res && !self.settings.mac) {
                addbookmarksbutton.classList.add('disabled');
                removematchingbutton.classList.add('disabled');
            } else {
                addbookmarksbutton.classList.remove('disabled');
                removematchingbutton.classList.remove('disabled');
            }
        }
        updateform();

        unclaimedcheckbox.checked = self.settings.portallevel[0];
        unclaimedcheckbox.addEventListener('click',function(e) {
            self.settings.portallevel[0] = this.checked;
            self.storesettings();
            updateform();
        },false);
        enlightenedcheckbox.checked = self.settings.enl;
        enlightenedcheckbox.addEventListener('click',function(e) {
            self.settings.enl = this.checked;
            self.storesettings();
            updateform();
        },false);
        resistancecheckbox.checked = self.settings.res;
        resistancecheckbox.addEventListener('click',function(e) {
            self.settings.res = this.checked;
            self.storesettings();
            updateform();
        },false);
        machinacheckbox.checked = self.settings.mac;
        machinacheckbox.addEventListener('click',function(e) {
            self.settings.mac = this.checked;
            self.storesettings();
            updateform();
        },false);

        resonatorsselect.value = self.settings.resonators;
        resonatorsselect.addEventListener('change',function(e) {
            self.settings.resonators = this.value;
            self.storesettings();
        },false);

        replaceexistingcheckbox.checked = self.settings.replace;
        replaceexistingcheckbox.addEventListener('click',function(e) {
            self.settings.replace = this.checked;
            self.storesettings();
        },false);

        let autofolderinput = container.querySelector('input[type=text][name=autofolder]');
        autofolderinput.value = self.settings.autofolder;
        autofolderinput.addEventListener('change',function(e) {
            self.settings.autofolder = autofolderinput.value;
            self.storesettings();
        },false);

        let visited_radios = container.querySelectorAll('input[type=radio][name=visited]');
        for (let radio of visited_radios) {
            if (radio.value == self.settings.visited) {
                radio.checked = true;
            }
            radio.addEventListener('change',function(e) {
                self.settings.visited = radio.value;
                self.storesettings();
                // if radio not-visited is selected, then check Not-Captured
                if (radio.value == "not-visited") {
                     let radionotcaptured = container.querySelector('input[type=radio][name=captured][value=not-captured]');
                    radionotcaptured.checked = true;
                    self.settings.captured = radionotcaptured.value;
                    self.storesettings();
                }
            },false);
        }
        let captured_radios = container.querySelectorAll('input[type=radio][name=captured]');
        for (let radio of captured_radios) {
            if (radio.value == self.settings.captured) {
                radio.checked = true;
            }
            radio.addEventListener('change',function(e) {
                e.preventDefault();
                self.settings.captured = radio.value;
                self.storesettings();
                // if radio captured is selected, then check visited
                if (radio.value == "captured") {
                    let radiovisited = container.querySelector('input[type=radio][name=visited][value=visited]');
                    radiovisited.checked = true;
                    self.settings.visited = radiovisited.value;
                    self.storesettings();
                }
            },false);
        }

        addbookmarksbutton.addEventListener('click',function(e) {
            e.preventDefault();
            if (!self.settings.portallevel[0] && !self.settings.enl && !self.settings.res && !self.settings.mac) return;
            let bookmarkslist = self.getmatchingportals();
            if (Object.keys(bookmarkslist).length == 0) {
                alert('There are no portals found that match the filters. Nothing to add.');
                return;
            }
            if (confirm('Portals matching the filters: ' + Object.keys(bookmarkslist).length + '\n\nDo you want to add bookmarks?')) {
                self.addmatchingbookmarks(bookmarkslist);
            }
        },false);
        removematchingbutton.addEventListener('click',function(e) {
            e.preventDefault();
            if (!self.settings.portallevel[0] && !self.settings.enl && !self.settings.res && !self.settings.mac) return;
            let bookmarkslist = self.getmatchingportals();
            if (Object.keys(bookmarkslist).length == 0) {
                alert('There are no portals found that match the filters. Nothing to remove.');
                return;
            }
            if (confirm('Portals matching the filters: ' + Object.keys(bookmarkslist).length + '\n\nDo you want to remove all matching bookmarks?')) self.removebookmarks(true);
        },false);
        clearvisiblebutton.addEventListener('click',function(e) {
            e.preventDefault();
            if (confirm('Visible bookmarks: ' + self.countbookmarks(window.map.getBounds()) + '\n\nClear all visible bookmarks?')) {
                let removecnt = self.clearbookmarks(window.map.getBounds());
                alert('Removed bookmarks: ' + removecnt);
            }
        },false);
        clearinvisiblebutton.addEventListener('click',function(e) {
            e.preventDefault();
            if (confirm('Invisible bookmarks: ' + self.countbookmarks(window.map.getBounds(),true) + '\n\nClear all invisible bookmarks?')) {
                let removecnt = self.clearbookmarks(window.map.getBounds(),true);
                alert('Removed bookmarks: ' + removecnt);
            }
        },false);
        clearallbookmarksbutton.addEventListener('click',function(e) {
            e.preventDefault();
            if (confirm('All bookmarks: ' + self.countbookmarks() + '\n\nClear all bookmarks + folders?')) {
                let removecnt = self.clearbookmarks();
                alert('Removed bookmarks: ' + removecnt);
            }
        },false);
        clearallbutton.addEventListener('click',function(e) {
            e.preventDefault();
            window.plugin.bookmarks.optReset();
        },false);

        // need to initialise the 'spectrum' color picker
        let addsbookmarkscolorpicker = container.querySelector('input[name=addsbookmarkscolor]');
        $(addsbookmarkscolorpicker).spectrum({
            flat: false,
            showInput: true,
            showButtons: true,
            showPalette: true,
            showSelectionPalette: true,
            allowEmpty: false,
            palette: [
                ['#004000','#008000','#00C000'],
                ['#00FF00','#80FF80','#C0FFC0'],
                ['#000040','#000080','#0000C0'],
                ['#4040FF','#8080FF','#C0C0FF'],
                ['#6A3400','#964A00','#C05F00'],
                ['#E27000','#FF8309','#FFC287',self.defaultcolor],
                ['#a24ac3','#514ac3','#4aa8c3','#51c34a'],
                ['#c1c34a','#c38a4a','#c34a4a','#c34a6f'],
                ['#000000','#666666','#bbbbbb','#ffffff']
            ],
            change: function(color) {
                self.settings.addcolor = color.toHexString();
                self.storesettings();
            },
            color: self.settings.addcolor,
        });

        window.dialog({
            html: container,
            id: 'plugin-bookmarks-options',
            dialogClass: 'ui-dialog-bkmrksSet',
            title: 'Bookmarks Add/Remove'
        }).dialog('option', 'buttons', {
            '< Main menu': function() { window.plugin.bookmarks.manualOpt(); },
            'About': function() { self.about(); },
            'Ok': function() { $(this).dialog('close'); },
        });
    };

    self.iconoverride = function(override) {
        //console.log('override='+override);
        if (!override) { // restore
            if (self.addStar_backup) {
                try {
                    eval('window.plugin.bookmarks.addStar = ' + self.addStar_backup);
                } catch(e) {
                    console.log('IITC plugin ERROR: ' + self.title + ' version ' + self.version + ' - eval addStar restore error: '+e.message + '\n' + self.addStar_backup);
                }
            }
        } else {
            if (!self.addStar_backup) self.addStar_backup = window.plugin.bookmarks.addStar.toString();
            let addStar_override = self.addStar_backup;
            addStar_override = addStar_override.replace(
                ') {',
                ') {\n' +
                '    let scale = 80.0; // percent\n' +
                '    //if (' + self.namespace + 'settings.smaller) scale = 40.0;\n' +
                '    let width = ' + self.namespace + 'zoomscale(25 * scale/100.0);\n' +
                '    let height = ' + self.namespace + 'zoomscale(45 * scale/100.0);');
            addStar_override = addStar_override.replace(
                /icon: L\.icon\(\{[\s\S]+?\}\)/,
                'icon: L.divIcon({\n' +
                '        iconSize: new L.Point(width, height),\n' +
                '        iconAnchor: new L.Point(parseInt(width / 2), height),\n' +
                '        html: \'<?xml version="1.0" encoding="UTF-8"?>\\n<svg xmlns="https://www.w3.org/2000/svg"\\n  version="1.1" baseProfile="full"\\n	width="\' + width + \'px" height="\' + height + \'px" viewBox="0 0 25 40">\\n  <path\\n     style="fill:\'+ ' + self.namespace + 'settings.color + \';fill-opacity:1;fill-rule:evenodd;stroke:#000000;stroke-width:0.66890079;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"\\n     d="M 12.232156,0.49368461 C 5.396431,0.47991897 -1.319899,5.9784347 0.94239879,17.061937 2.5900981,25.134382 12.395973,39.250702 12.395973,39.250702 c 0,0 10.512096,-14.052494 11.844349,-22.249666 C 26.02274,6.0340612 19.067882,0.50745032 12.232156,0.49368461 Z m 0.151872,5.57403579 2.271263,4.3560176 4.996434,0.677924 -3.711491,3.373589 0.858334,4.670138 -4.566412,-2.270962 -4.4640274,2.20846 0.8890515,-4.777517 -3.6176371,-3.304677 5.115885,-0.681128 2.2286,-4.2518446 z"\\n     id="fill_\' + guid + \'"\\n     inkscape:connector-curvature="0" />\\n  <path\\n     style="fill:none;fill-rule:evenodd;stroke:#ffffff;stroke-width:0.42335492;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"\\n     d="m 12.414483,38.336374 c 0,0 -10.0723803,-14.823222 -11.1062713,-21.383227 -3.562278,-22.6025346 26.2353973,-20.1021377 22.3976503,0.08692 -1.635339,8.602948 -11.291379,21.296304 -11.291379,21.296304 z"\\n     inkscape:connector-curvature="0"\\n     sodipodi:nodetypes="cssc" />\\n</svg>\',\n' +
                '        className: \'leaflet-iitc-custom-icon\',\n' +
                '        // L.divIcon does not use the option color, but we store it here to\n' +
                '        // be able to simply retrieve the color for serializing markers\n' +
                '        color: ' + self.namespace + 'settings.color\n' +
                '      })');
            try {
                eval('window.plugin.bookmarks.addStar = ' + addStar_override);
            } catch(e) {
                console.log('IITC plugin ERROR: ' + self.title + ' version ' + self.version + ' - eval addStar override error: '+e.message + '\n' + addStar_override);
            }
        }
    };

    self.updatemenucolor = function() {
        if (window.selectedPortal === null) return;
        if (!window.plugin.bookmarks.starLayers[window.selectedPortal]) return;

        let bookmarkcolor = window.plugin.bookmarks.starLayers[window.selectedPortal].options.icon.options.color;
        if (typeof bookmarkcolor === 'string') {
            self.settings.color = bookmarkcolor;
            $('#' + self.id + '_color').spectrum('set',bookmarkcolor);
        }
    };

    self.updateBookmarkLabels = function() {
        // as this is called every time layers are toggled, there's no point in doing it when the layer is off
        if (!window.map.hasLayer(self.labelLayerGroup)) {
            return;
        }

        let visiblebounds = window.map.getBounds();
        let bookmarkedPortalPoints = {};
        for (const guid in window.plugin.bookmarks.starLayers) { // only for bookmarked portal
            let latlng = window.plugin.bookmarks.starLayers[guid].getLatLng();
            if (visiblebounds.contains(latlng)) {
                let point = window.map.project(latlng);
                bookmarkedPortalPoints[guid] = point;
            }
        }

        // for efficient testing of intersection, group portals into buckets based on the label size
        let buckets = {};
        for (const guid in bookmarkedPortalPoints) {
            let point = bookmarkedPortalPoints[guid];

            let bucketId = window.L.point([Math.floor(point.x/(self.portalName_WIDTH*2)),Math.floor(point.y/self.portalName_HEIGHT)]);
            // the guid is added to four buckets. this way, when testing for overlap we don't need to test
            // all 8 buckets surrounding the one around the particular portal, only the bucket it is in itself
            let bucketIds = [bucketId, bucketId.add([1,0]), bucketId.add([0,1]), bucketId.add([1,1])];
            for (const i in bucketIds) {
                let b = bucketIds[i].toString();
                if (!buckets[b]) buckets[b] = {};
                buckets[b][guid] = true;
            }
        }

        let coveredPortals = {};
        for (const bucket in buckets) {
            let bucketGuids = buckets[bucket];
            for (const guid in bucketGuids) {
                let point = bookmarkedPortalPoints[guid];
                // the bounds used for testing are twice as wide as the portal name marker. this is so that there's no left/right
                // overlap between two different portals text
                let largeBounds = window.L.bounds (
                    point.subtract([self.portalName_WIDTH,0]),
                    point.add([self.portalName_WIDTH,self.portalName_HEIGHT])
                );

                for (const otherGuid in bucketGuids) {
                    if (guid != otherGuid) {
                        let otherPoint = bookmarkedPortalPoints[otherGuid];

                        if (largeBounds.contains(otherPoint)) {
                            // another portal is within the rectangle for this one's name - so no name for this one
                            coveredPortals[guid] = true;
                            break;
                        }
                    }
                }
            }
        }

        for (const guid in coveredPortals) {
            //delete bookmarkedPortalPoints[guid];
        }

        // remove any not wanted
        for (const guid in self.labelLayers) {
            if (!(guid in bookmarkedPortalPoints)) {
                self.removeBookmarkLabel(guid);
            }
        }

        // and add those we do
        for (const guid in bookmarkedPortalPoints) {
            self.addBookmarkLabel(guid);
        }
    };

    self.addBookmarkLabel = function(guid) {
        self.removeBookmarkLabel(guid);
        if (!window.plugin.bookmarks.starLayers[guid]) return;
        let latLng = window.plugin.bookmarks.starLayers[guid].getLatLng();
        let portalName = window.plugin.bookmarks.starLayers[guid].options.title;
        let label = window.L.marker(
            latLng, {
            icon: window.L.divIcon({
                className: 'plugin-bookmarks-addon-names',
                iconAnchor: [self.portalName_WIDTH/2,0],
                iconSize: [self.portalName_WIDTH,self.portalName_HEIGHT],
                html: portalName
            }),
            guid: guid,
        });
        self.labelLayers[guid] = label;
        label.addTo(self.labelLayerGroup);
    };

    self.removeBookmarkLabel = function(guid) {
        let previousLayer = self.labelLayers[guid];
        if (previousLayer) {
            self.labelLayerGroup.removeLayer(previousLayer);
            delete(self.labelLayers[guid]);
        }
    };

    self.clearAllPortalLabels = function() {
        for (const guid in self.labelLayers) {
            self.removeBookmarkLabel(guid);
        }
    };

    // as calculating portal marker visibility can take some time when there's lots of portals shown, we'll do it on
    // a short timer. this way it doesn't get repeated so much
    self.delayedUpdatePortalLabels = function(waitseconds) {
        if (self.labeltimer === undefined) {
            self.labeltimer = window.setTimeout(function() {
                self.labeltimer = undefined;
                self.updateBookmarkLabels();
            }, waitseconds * 1000);
        }
    };

    self.zoomscale = function(val) {
        // default bookmark size: 15 x 40
        // max zoom = 21, show larger bookmark, resize x2: 30 x 80
        // min zoom = 3, show smaller bookmarks, resize x0.25: 3.75 x 10
        // formula: val = val * (2-0.25)/(21-3)*(zoom-3)+0.25
        if (!self.settings.smaller) return val;

        let zoom = window.map.getZoom();
        if (window.L.Browser.mobile)
            return val * ((2-0.25)/(21-3)*(zoom-3)+0.25);
        else
            return val * ((2-0.25)/(21-3)*(zoom-3)+0.25);
    };

    self.setupColorpickerSpectrum = function() {
        // source: https://github.com/bgrins/spectrum
        // minified with https://www.minifier.org/

        // Spectrum Colorpicker v1.8.1
        // https://github.com/bgrins/spectrum
        // Author: Brian Grinstead
        // License: MIT

		(function(factory){"use strict";if(typeof define==='function'&&define.amd){define(['jquery'],factory)}else if(typeof exports=="object"&&typeof module=="object"){module.exports=factory(require('jquery'))}else{factory(jQuery)}})(function($,undefined){"use strict";var defaultOpts={beforeShow:noop,move:noop,change:noop,show:noop,hide:noop,color:!1,flat:!1,showInput:!1,allowEmpty:!1,showButtons:!0,clickoutFiresChange:!0,showInitial:!1,showPalette:!1,showPaletteOnly:!1,hideAfterPaletteSelect:!1,togglePaletteOnly:!1,showSelectionPalette:!0,localStorageKey:!1,appendTo:"body",maxSelectionSize:7,cancelText:"cancel",chooseText:"choose",togglePaletteMoreText:"more",togglePaletteLessText:"less",clearText:"Clear Color Selection",noColorSelectedText:"No Color Selected",preferredFormat:!1,className:"",containerClassName:"",replacerClassName:"",showAlpha:!1,theme:"sp-light",palette:[["#ffffff","#000000","#ff0000","#ff8000","#ffff00","#008000","#0000ff","#4b0082","#9400d3"]],selectionPalette:[],disabled:!1,offset:null},spectrums=[],IE=!!/msie/i.exec(window.navigator.userAgent),rgbaSupport=(function(){function contains(str,substr){return!!~(''+str).indexOf(substr)}
		var elem=document.createElement('div');var style=elem.style;style.cssText='background-color:rgba(0,0,0,.5)';return contains(style.backgroundColor,'rgba')||contains(style.backgroundColor,'hsla')})(),replaceInput=["<div class='sp-replacer'>","<div class='sp-preview'><div class='sp-preview-inner'></div></div>","<div class='sp-dd'>&#9660;</div>","</div>"].join(''),markup=(function(){var gradientFix="";if(IE){for(var i=1;i<=6;i++){gradientFix+="<div class='sp-"+i+"'></div>"}}
		return["<div class='sp-container sp-hidden'>","<div class='sp-palette-container'>","<div class='sp-palette sp-thumb sp-cf'></div>","<div class='sp-palette-button-container sp-cf'>","<button type='button' class='sp-palette-toggle'></button>","</div>","</div>","<div class='sp-picker-container'>","<div class='sp-top sp-cf'>","<div class='sp-fill'></div>","<div class='sp-top-inner'>","<div class='sp-color'>","<div class='sp-sat'>","<div class='sp-val'>","<div class='sp-dragger'></div>","</div>","</div>","</div>","<div class='sp-clear sp-clear-display'>","</div>","<div class='sp-hue'>","<div class='sp-slider'></div>",gradientFix,"</div>","</div>","<div class='sp-alpha'><div class='sp-alpha-inner'><div class='sp-alpha-handle'></div></div></div>","</div>","<div class='sp-input-container sp-cf'>","<input class='sp-input' type='text' spellcheck='false'  />","</div>","<div class='sp-initial sp-thumb sp-cf'></div>","<div class='sp-button-container sp-cf'>","<a class='sp-cancel' href='#'></a>","<button type='button' class='sp-choose'></button>","</div>","</div>","</div>"].join("")})();function paletteTemplate(p,color,className,opts){var html=[];for(var i=0;i<p.length;i++){var current=p[i];if(current){var tiny=tinycolor(current);var c=tiny.toHsl().l<0.5?"sp-thumb-el sp-thumb-dark":"sp-thumb-el sp-thumb-light";c+=(tinycolor.equals(color,current))?" sp-thumb-active":"";var formattedString=tiny.toString(opts.preferredFormat||"rgb");var swatchStyle=rgbaSupport?("background-color:"+tiny.toRgbString()):"filter:"+tiny.toFilter();html.push('<span title="'+formattedString+'" data-color="'+tiny.toRgbString()+'" class="'+c+'"><span class="sp-thumb-inner" style="'+swatchStyle+';"></span></span>')}else{var cls='sp-clear-display';html.push($('<div />').append($('<span data-color="" style="background-color:transparent;" class="'+cls+'"></span>').attr('title',opts.noColorSelectedText)).html())}}
		return"<div class='sp-cf "+className+"'>"+html.join('')+"</div>"}
		function hideAll(){for(var i=0;i<spectrums.length;i++){if(spectrums[i]){spectrums[i].hide()}}}
		function instanceOptions(o,callbackContext){var opts=$.extend({},defaultOpts,o);opts.callbacks={'move':bind(opts.move,callbackContext),'change':bind(opts.change,callbackContext),'show':bind(opts.show,callbackContext),'hide':bind(opts.hide,callbackContext),'beforeShow':bind(opts.beforeShow,callbackContext)};return opts}
		function spectrum(element,o){var opts=instanceOptions(o,element),flat=opts.flat,showSelectionPalette=opts.showSelectionPalette,localStorageKey=opts.localStorageKey,theme=opts.theme,callbacks=opts.callbacks,resize=throttle(reflow,10),visible=!1,isDragging=!1,dragWidth=0,dragHeight=0,dragHelperHeight=0,slideHeight=0,slideWidth=0,alphaWidth=0,alphaSlideHelperWidth=0,slideHelperHeight=0,currentHue=0,currentSaturation=0,currentValue=0,currentAlpha=1,palette=[],paletteArray=[],paletteLookup={},selectionPalette=opts.selectionPalette.slice(0),maxSelectionSize=opts.maxSelectionSize,draggingClass="sp-dragging",shiftMovementDirection=null;var doc=element.ownerDocument,body=doc.body,boundElement=$(element),disabled=!1,container=$(markup,doc).addClass(theme),pickerContainer=container.find(".sp-picker-container"),dragger=container.find(".sp-color"),dragHelper=container.find(".sp-dragger"),slider=container.find(".sp-hue"),slideHelper=container.find(".sp-slider"),alphaSliderInner=container.find(".sp-alpha-inner"),alphaSlider=container.find(".sp-alpha"),alphaSlideHelper=container.find(".sp-alpha-handle"),textInput=container.find(".sp-input"),paletteContainer=container.find(".sp-palette"),initialColorContainer=container.find(".sp-initial"),cancelButton=container.find(".sp-cancel"),clearButton=container.find(".sp-clear"),chooseButton=container.find(".sp-choose"),toggleButton=container.find(".sp-palette-toggle"),isInput=boundElement.is("input"),isInputTypeColor=isInput&&boundElement.attr("type")==="color"&&inputTypeColorSupport(),shouldReplace=isInput&&!flat,replacer=(shouldReplace)?$(replaceInput).addClass(theme).addClass(opts.className).addClass(opts.replacerClassName):$([]),offsetElement=(shouldReplace)?replacer:boundElement,previewElement=replacer.find(".sp-preview-inner"),initialColor=opts.color||(isInput&&boundElement.val()),colorOnShow=!1,currentPreferredFormat=opts.preferredFormat,clickoutFiresChange=!opts.showButtons||opts.clickoutFiresChange,isEmpty=!initialColor,allowEmpty=opts.allowEmpty&&!isInputTypeColor;function applyOptions(){if(opts.showPaletteOnly){opts.showPalette=!0}
		toggleButton.text(opts.showPaletteOnly?opts.togglePaletteMoreText:opts.togglePaletteLessText);if(opts.palette){palette=opts.palette.slice(0);paletteArray=Array.isArray(palette[0])?palette:[palette];paletteLookup={};for(var i=0;i<paletteArray.length;i++){for(var j=0;j<paletteArray[i].length;j++){var rgb=tinycolor(paletteArray[i][j]).toRgbString();paletteLookup[rgb]=!0}}}
		container.toggleClass("sp-flat",flat);container.toggleClass("sp-input-disabled",!opts.showInput);container.toggleClass("sp-alpha-enabled",opts.showAlpha);container.toggleClass("sp-clear-enabled",allowEmpty);container.toggleClass("sp-buttons-disabled",!opts.showButtons);container.toggleClass("sp-palette-buttons-disabled",!opts.togglePaletteOnly);container.toggleClass("sp-palette-disabled",!opts.showPalette);container.toggleClass("sp-palette-only",opts.showPaletteOnly);container.toggleClass("sp-initial-disabled",!opts.showInitial);container.addClass(opts.className).addClass(opts.containerClassName);reflow()}
		function initialize(){if(IE){container.find("*:not(input)").attr("unselectable","on")}
		applyOptions();if(shouldReplace){boundElement.after(replacer).hide()}
		if(!allowEmpty){clearButton.hide()}
		if(flat){boundElement.after(container).hide()}else{var appendTo=opts.appendTo==="parent"?boundElement.parent():$(opts.appendTo);if(appendTo.length!==1){appendTo=$("body")}
		appendTo.append(container)}
		updateSelectionPaletteFromStorage();offsetElement.on("click.spectrum touchstart.spectrum",function(e){if(!disabled){toggle()}
		e.stopPropagation();if(!$(e.target).is("input")){e.preventDefault()}});if(boundElement.is(":disabled")||(opts.disabled===!0)){disable()}
		container.on("click",stopPropagation);textInput.on("change",setFromTextInput);textInput.on("paste",function(){setTimeout(setFromTextInput,1)});textInput.on("keydown",function(e){if(e.keyCode==13){setFromTextInput()}});cancelButton.text(opts.cancelText);cancelButton.on("click.spectrum",function(e){e.stopPropagation();e.preventDefault();revert();hide()});clearButton.attr("title",opts.clearText);clearButton.on("click.spectrum",function(e){e.stopPropagation();e.preventDefault();isEmpty=!0;move();if(flat){updateOriginalInput(!0)}});chooseButton.text(opts.chooseText);chooseButton.on("click.spectrum",function(e){e.stopPropagation();e.preventDefault();if(IE&&textInput.is(":focus")){textInput.trigger('change')}
		if(isValid()){updateOriginalInput(!0);hide()}});toggleButton.text(opts.showPaletteOnly?opts.togglePaletteMoreText:opts.togglePaletteLessText);toggleButton.on("click.spectrum",function(e){e.stopPropagation();e.preventDefault();opts.showPaletteOnly=!opts.showPaletteOnly;if(!opts.showPaletteOnly&&!flat){container.css('left','-='+(pickerContainer.outerWidth(!0)+5))}
		applyOptions()});draggable(alphaSlider,function(dragX,dragY,e){currentAlpha=(dragX/alphaWidth);isEmpty=!1;if(e.shiftKey){currentAlpha=Math.round(currentAlpha*10)/10}
		move()},dragStart,dragStop);draggable(slider,function(dragX,dragY){currentHue=parseFloat(dragY/slideHeight);isEmpty=!1;if(!opts.showAlpha){currentAlpha=1}
		move()},dragStart,dragStop);draggable(dragger,function(dragX,dragY,e){if(!e.shiftKey){shiftMovementDirection=null}else if(!shiftMovementDirection){var oldDragX=currentSaturation*dragWidth;var oldDragY=dragHeight-(currentValue*dragHeight);var furtherFromX=Math.abs(dragX-oldDragX)>Math.abs(dragY-oldDragY);shiftMovementDirection=furtherFromX?"x":"y"}
		var setSaturation=!shiftMovementDirection||shiftMovementDirection==="x";var setValue=!shiftMovementDirection||shiftMovementDirection==="y";if(setSaturation){currentSaturation=parseFloat(dragX/dragWidth)}
		if(setValue){currentValue=parseFloat((dragHeight-dragY)/dragHeight)}
		isEmpty=!1;if(!opts.showAlpha){currentAlpha=1}
		move()},dragStart,dragStop);if(!!initialColor){set(initialColor);updateUI();currentPreferredFormat=opts.preferredFormat||tinycolor(initialColor).format;addColorToSelectionPalette(initialColor)}else{updateUI()}
		if(flat){show()}
		function paletteElementClick(e){if(e.data&&e.data.ignore){set($(e.target).closest(".sp-thumb-el").data("color"));move()}else{set($(e.target).closest(".sp-thumb-el").data("color"));move();if(opts.hideAfterPaletteSelect){updateOriginalInput(!0);hide()}else{updateOriginalInput()}}
		return!1}
		var paletteEvent=IE?"mousedown.spectrum":"click.spectrum touchstart.spectrum";paletteContainer.on(paletteEvent,".sp-thumb-el",paletteElementClick);initialColorContainer.on(paletteEvent,".sp-thumb-el:nth-child(1)",{ignore:!0},paletteElementClick)}
		function updateSelectionPaletteFromStorage(){if(localStorageKey&&window.localStorage){try{var oldPalette=window.localStorage[localStorageKey].split(",#");if(oldPalette.length>1){delete window.localStorage[localStorageKey];$.each(oldPalette,function(i,c){addColorToSelectionPalette(c)})}}catch(e){}
		try{selectionPalette=window.localStorage[localStorageKey].split(";")}catch(e){}}}
		function addColorToSelectionPalette(color){if(showSelectionPalette){var rgb=tinycolor(color).toRgbString();if(!paletteLookup[rgb]&&$.inArray(rgb,selectionPalette)===-1){selectionPalette.push(rgb);while(selectionPalette.length>maxSelectionSize){selectionPalette.shift()}}
		if(localStorageKey&&window.localStorage){try{window.localStorage[localStorageKey]=selectionPalette.join(";")}catch(e){}}}}
		function getUniqueSelectionPalette(){var unique=[];if(opts.showPalette){for(var i=0;i<selectionPalette.length;i++){var rgb=tinycolor(selectionPalette[i]).toRgbString();if(!paletteLookup[rgb]){unique.push(selectionPalette[i])}}}
		return unique.reverse().slice(0,opts.maxSelectionSize)}
		function drawPalette(){var currentColor=get();var html=$.map(paletteArray,function(palette,i){return paletteTemplate(palette,currentColor,"sp-palette-row sp-palette-row-"+i,opts)});updateSelectionPaletteFromStorage();if(selectionPalette){html.push(paletteTemplate(getUniqueSelectionPalette(),currentColor,"sp-palette-row sp-palette-row-selection",opts))}
		paletteContainer.html(html.join(""))}
		function drawInitial(){if(opts.showInitial){var initial=colorOnShow;var current=get();initialColorContainer.html(paletteTemplate([initial,current],current,"sp-palette-row-initial",opts))}}
		function dragStart(){if(dragHeight<=0||dragWidth<=0||slideHeight<=0){reflow()}
		isDragging=!0;container.addClass(draggingClass);shiftMovementDirection=null;boundElement.trigger('dragstart.spectrum',[get()])}
		function dragStop(){isDragging=!1;container.removeClass(draggingClass);boundElement.trigger('dragstop.spectrum',[get()])}
		function setFromTextInput(){var value=textInput.val();if((value===null||value==="")&&allowEmpty){set(null);move();updateOriginalInput()}else{var tiny=tinycolor(value);if(tiny.isValid()){set(tiny);move();updateOriginalInput()}else{textInput.addClass("sp-validation-error")}}}
		function toggle(){if(visible){hide()}else{show()}}
		function show(){var event=$.Event('beforeShow.spectrum');if(visible){reflow();return}
		boundElement.trigger(event,[get()]);if(callbacks.beforeShow(get())===!1||event.isDefaultPrevented()){return}
		hideAll();visible=!0;$(doc).on("keydown.spectrum",onkeydown);$(doc).on("click.spectrum",clickout);$(window).on("resize.spectrum",resize);replacer.addClass("sp-active");container.removeClass("sp-hidden");reflow();updateUI();colorOnShow=get();drawInitial();callbacks.show(colorOnShow);boundElement.trigger('show.spectrum',[colorOnShow])}
		function onkeydown(e){if(e.keyCode===27){hide()}}
		function clickout(e){if(e.button==2){return}
		if(isDragging){return}
		if(clickoutFiresChange){updateOriginalInput(!0)}else{revert()}
		hide()}
		function hide(){if(!visible||flat){return}
		visible=!1;$(doc).off("keydown.spectrum",onkeydown);$(doc).off("click.spectrum",clickout);$(window).off("resize.spectrum",resize);replacer.removeClass("sp-active");container.addClass("sp-hidden");callbacks.hide(get());boundElement.trigger('hide.spectrum',[get()])}
		function revert(){set(colorOnShow,!0);updateOriginalInput(!0)}
		function set(color,ignoreFormatChange){if(tinycolor.equals(color,get())){updateUI();return}
		var newColor,newHsv;if(!color&&allowEmpty){isEmpty=!0}else{isEmpty=!1;newColor=tinycolor(color);newHsv=newColor.toHsv();currentHue=(newHsv.h%360)/360;currentSaturation=newHsv.s;currentValue=newHsv.v;currentAlpha=newHsv.a}
		updateUI();if(newColor&&newColor.isValid()&&!ignoreFormatChange){currentPreferredFormat=opts.preferredFormat||newColor.getFormat()}}
		function get(opts){opts=opts||{};if(allowEmpty&&isEmpty){return null}
		return tinycolor.fromRatio({h:currentHue,s:currentSaturation,v:currentValue,a:Math.round(currentAlpha*1000)/1000},{format:opts.format||currentPreferredFormat})}
		function isValid(){return!textInput.hasClass("sp-validation-error")}
		function move(){updateUI();callbacks.move(get());boundElement.trigger('move.spectrum',[get()])}
		function updateUI(){textInput.removeClass("sp-validation-error");updateHelperLocations();var flatColor=tinycolor.fromRatio({h:currentHue,s:1,v:1});dragger.css("background-color",flatColor.toHexString());var format=currentPreferredFormat;if(currentAlpha<1&&!(currentAlpha===0&&format==="name")){if(format==="hex"||format==="hex3"||format==="hex6"||format==="name"){format="rgb"}}
		var realColor=get({format:format}),displayColor='';previewElement.removeClass("sp-clear-display");previewElement.css('background-color','transparent');if(!realColor&&allowEmpty){previewElement.addClass("sp-clear-display")}else{var realHex=realColor.toHexString(),realRgb=realColor.toRgbString();if(rgbaSupport||realColor.alpha===1){previewElement.css("background-color",realRgb)}else{previewElement.css("background-color","transparent");previewElement.css("filter",realColor.toFilter())}
		if(opts.showAlpha){var rgb=realColor.toRgb();rgb.a=0;var realAlpha=tinycolor(rgb).toRgbString();var gradient="linear-gradient(left, "+realAlpha+", "+realHex+")";if(IE){alphaSliderInner.css("filter",tinycolor(realAlpha).toFilter({gradientType:1},realHex))}else{alphaSliderInner.css("background","-webkit-"+gradient);alphaSliderInner.css("background","-moz-"+gradient);alphaSliderInner.css("background","-ms-"+gradient);alphaSliderInner.css("background","linear-gradient(to right, "+realAlpha+", "+realHex+")")}}
		displayColor=realColor.toString(format)}
		if(opts.showInput){textInput.val(displayColor)}
		if(opts.showPalette){drawPalette()}
		drawInitial()}
		function updateHelperLocations(){var s=currentSaturation;var v=currentValue;if(allowEmpty&&isEmpty){alphaSlideHelper.hide();slideHelper.hide();dragHelper.hide()}else{alphaSlideHelper.show();slideHelper.show();dragHelper.show();var dragX=s*dragWidth;var dragY=dragHeight-(v*dragHeight);dragX=Math.max(-dragHelperHeight,Math.min(dragWidth-dragHelperHeight,dragX-dragHelperHeight));dragY=Math.max(-dragHelperHeight,Math.min(dragHeight-dragHelperHeight,dragY-dragHelperHeight));dragHelper.css({"top":dragY+"px","left":dragX+"px"});var alphaX=currentAlpha*alphaWidth;alphaSlideHelper.css({"left":(alphaX-(alphaSlideHelperWidth/2))+"px"});var slideY=(currentHue)*slideHeight;slideHelper.css({"top":(slideY-slideHelperHeight)+"px"})}}
		function updateOriginalInput(fireCallback){var color=get(),displayColor='',hasChanged=!tinycolor.equals(color,colorOnShow);if(color){displayColor=color.toString(currentPreferredFormat);addColorToSelectionPalette(color)}
		if(isInput){boundElement.val(displayColor)}
		if(fireCallback&&hasChanged){callbacks.change(color);boundElement.trigger('change',[color])}}
		function reflow(){if(!visible){return}
		dragWidth=dragger.width();dragHeight=dragger.height();dragHelperHeight=dragHelper.height();slideWidth=slider.width();slideHeight=slider.height();slideHelperHeight=slideHelper.height();alphaWidth=alphaSlider.width();alphaSlideHelperWidth=alphaSlideHelper.width();if(!flat){container.css("position","absolute");if(opts.offset){container.offset(opts.offset)}else{container.offset(getOffset(container,offsetElement))}}
		updateHelperLocations();if(opts.showPalette){drawPalette()}
		boundElement.trigger('reflow.spectrum')}
		function destroy(){boundElement.show();offsetElement.off("click.spectrum touchstart.spectrum");container.remove();replacer.remove();spectrums[spect.id]=null}
		function option(optionName,optionValue){if(optionName===undefined){return $.extend({},opts)}
		if(optionValue===undefined){return opts[optionName]}
		opts[optionName]=optionValue;if(optionName==="preferredFormat"){currentPreferredFormat=opts.preferredFormat}
		applyOptions()}
		function enable(){disabled=!1;boundElement.attr("disabled",!1);offsetElement.removeClass("sp-disabled")}
		function disable(){hide();disabled=!0;boundElement.attr("disabled",!0);offsetElement.addClass("sp-disabled")}
		function setOffset(coord){opts.offset=coord;reflow()}
		initialize();var spect={show:show,hide:hide,toggle:toggle,reflow:reflow,option:option,enable:enable,disable:disable,offset:setOffset,set:function(c){set(c);updateOriginalInput()},get:get,destroy:destroy,container:container};spect.id=spectrums.push(spect)-1;return spect}
		function getOffset(picker,input){var extraY=0;var dpWidth=picker.outerWidth();var dpHeight=picker.outerHeight();var inputHeight=input.outerHeight();var doc=picker[0].ownerDocument;var docElem=doc.documentElement;var viewWidth=docElem.clientWidth+$(doc).scrollLeft();var viewHeight=docElem.clientHeight+$(doc).scrollTop();var offset=input.offset();var offsetLeft=offset.left;var offsetTop=offset.top;offsetTop+=inputHeight;offsetLeft-=Math.min(offsetLeft,(offsetLeft+dpWidth>viewWidth&&viewWidth>dpWidth)?Math.abs(offsetLeft+dpWidth-viewWidth):0);offsetTop-=Math.min(offsetTop,((offsetTop+dpHeight>viewHeight&&viewHeight>dpHeight)?Math.abs(dpHeight+inputHeight-extraY):extraY));return{top:offsetTop,bottom:offset.bottom,left:offsetLeft,right:offset.right,width:offset.width,height:offset.height}}
		function noop(){}
		function stopPropagation(e){e.stopPropagation()}
		function bind(func,obj){var slice=Array.prototype.slice;var args=slice.call(arguments,2);return function(){return func.apply(obj,args.concat(slice.call(arguments)))}}
		function draggable(element,onmove,onstart,onstop){onmove=onmove||function(){};onstart=onstart||function(){};onstop=onstop||function(){};var doc=document;var dragging=!1;var offset={};var maxHeight=0;var maxWidth=0;var hasTouch=('ontouchstart' in window);var duringDragEvents={};duringDragEvents.selectstart=prevent;duringDragEvents.dragstart=prevent;duringDragEvents["touchmove mousemove"]=move;duringDragEvents["touchend mouseup"]=stop;function prevent(e){if(e.stopPropagation){e.stopPropagation()}
		if(e.preventDefault){e.preventDefault()}
		e.returnValue=!1}
		function move(e){if(dragging){if(IE&&doc.documentMode<9&&!e.button){return stop()}
		var t0=e.originalEvent&&e.originalEvent.touches&&e.originalEvent.touches[0];var pageX=t0&&t0.pageX||e.pageX;var pageY=t0&&t0.pageY||e.pageY;var dragX=Math.max(0,Math.min(pageX-offset.left,maxWidth));var dragY=Math.max(0,Math.min(pageY-offset.top,maxHeight));if(hasTouch){prevent(e)}
		onmove.apply(element,[dragX,dragY,e])}}
		function start(e){var rightclick=(e.which)?(e.which==3):(e.button==2);if(!rightclick&&!dragging){if(onstart.apply(element,arguments)!==!1){dragging=!0;maxHeight=$(element).height();maxWidth=$(element).width();offset=$(element).offset();$(doc).on(duringDragEvents);$(doc.body).addClass("sp-dragging");move(e);prevent(e)}}}
		function stop(){if(dragging){$(doc).off(duringDragEvents);$(doc.body).removeClass("sp-dragging");setTimeout(function(){onstop.apply(element,arguments)},0)}
		dragging=!1}
		$(element).on("touchstart mousedown",start)}
		function throttle(func,wait,debounce){var timeout;return function(){var context=this,args=arguments;var throttler=function(){timeout=null;func.apply(context,args)};if(debounce)clearTimeout(timeout);if(debounce||!timeout)timeout=setTimeout(throttler,wait)}}
		function inputTypeColorSupport(){return $.fn.spectrum.inputTypeColorSupport()}
		var dataID="spectrum.id";$.fn.spectrum=function(opts,extra){if(typeof opts=="string"){var returnValue=this;var args=Array.prototype.slice.call(arguments,1);this.each(function(){var spect=spectrums[$(this).data(dataID)];if(spect){var method=spect[opts];if(!method){throw new Error("Spectrum: no such method: '"+opts+"'")}
		if(opts=="get"){returnValue=spect.get()}else if(opts=="container"){returnValue=spect.container}else if(opts=="option"){returnValue=spect.option.apply(spect,args)}else if(opts=="destroy"){spect.destroy();$(this).removeData(dataID)}else{method.apply(spect,args)}}});return returnValue}
		return this.spectrum("destroy").each(function(){var options=$.extend({},$(this).data(),opts);var spect=spectrum(this,options);$(this).data(dataID,spect.id)})};$.fn.spectrum.load=!0;$.fn.spectrum.loadOpts={};$.fn.spectrum.draggable=draggable;$.fn.spectrum.defaults=defaultOpts;$.fn.spectrum.inputTypeColorSupport=function inputTypeColorSupport(){if(typeof inputTypeColorSupport._cachedResult==="undefined"){var colorInput=$("<input type='color'/>")[0];inputTypeColorSupport._cachedResult=colorInput.type==="color"&&colorInput.value!==""}
		return inputTypeColorSupport._cachedResult};$.spectrum={};$.spectrum.localization={};$.spectrum.palettes={};$.fn.spectrum.processNativeColorInputs=function(){var colorInputs=$("input[type=color]");if(colorInputs.length&&!inputTypeColorSupport()){colorInputs.spectrum({preferredFormat:"hex6"})}};(function(){var trimLeft=/^[\s,#]+/,trimRight=/\s+$/,tinyCounter=0,math=Math,mathRound=math.round,mathMin=math.min,mathMax=math.max,mathRandom=math.random;var tinycolor=function(color,opts){color=(color)?color:'';opts=opts||{};if(color instanceof tinycolor){return color}
		if(!(this instanceof tinycolor)){return new tinycolor(color,opts)}
		var rgb=inputToRGB(color);this._originalInput=color;this._r=rgb.r;this._g=rgb.g;this._b=rgb.b;this._a=rgb.a;this._roundA=mathRound(1000*this._a)/1000;this._format=opts.format||rgb.format;this._gradientType=opts.gradientType;if(this._r<1){this._r=mathRound(this._r)}
		if(this._g<1){this._g=mathRound(this._g)}
		if(this._b<1){this._b=mathRound(this._b)}
		this._ok=rgb.ok;this._tc_id=tinyCounter++};tinycolor.prototype={isDark:function(){return this.getBrightness()<128},isLight:function(){return!this.isDark()},isValid:function(){return this._ok},getOriginalInput:function(){return this._originalInput},getFormat:function(){return this._format},getAlpha:function(){return this._a},getBrightness:function(){var rgb=this.toRgb();return(rgb.r*299+rgb.g*587+rgb.b*114)/1000},setAlpha:function(value){this._a=boundAlpha(value);this._roundA=mathRound(1000*this._a)/1000;return this},toHsv:function(){var hsv=rgbToHsv(this._r,this._g,this._b);return{h:hsv.h*360,s:hsv.s,v:hsv.v,a:this._a}},toHsvString:function(){var hsv=rgbToHsv(this._r,this._g,this._b);var h=mathRound(hsv.h*360),s=mathRound(hsv.s*100),v=mathRound(hsv.v*100);return(this._a==1)?"hsv("+h+", "+s+"%, "+v+"%)":"hsva("+h+", "+s+"%, "+v+"%, "+this._roundA+")"},toHsl:function(){var hsl=rgbToHsl(this._r,this._g,this._b);return{h:hsl.h*360,s:hsl.s,l:hsl.l,a:this._a}},toHslString:function(){var hsl=rgbToHsl(this._r,this._g,this._b);var h=mathRound(hsl.h*360),s=mathRound(hsl.s*100),l=mathRound(hsl.l*100);return(this._a==1)?"hsl("+h+", "+s+"%, "+l+"%)":"hsla("+h+", "+s+"%, "+l+"%, "+this._roundA+")"},toHex:function(allow3Char){return rgbToHex(this._r,this._g,this._b,allow3Char)},toHexString:function(allow3Char){return'#'+this.toHex(allow3Char)},toHex8:function(){return rgbaToHex(this._r,this._g,this._b,this._a)},toHex8String:function(){return'#'+this.toHex8()},toRgb:function(){return{r:mathRound(this._r),g:mathRound(this._g),b:mathRound(this._b),a:this._a}},toRgbString:function(){return(this._a==1)?"rgb("+mathRound(this._r)+", "+mathRound(this._g)+", "+mathRound(this._b)+")":"rgba("+mathRound(this._r)+", "+mathRound(this._g)+", "+mathRound(this._b)+", "+this._roundA+")"},toPercentageRgb:function(){return{r:mathRound(bound01(this._r,255)*100)+"%",g:mathRound(bound01(this._g,255)*100)+"%",b:mathRound(bound01(this._b,255)*100)+"%",a:this._a}},toPercentageRgbString:function(){return(this._a==1)?"rgb("+mathRound(bound01(this._r,255)*100)+"%, "+mathRound(bound01(this._g,255)*100)+"%, "+mathRound(bound01(this._b,255)*100)+"%)":"rgba("+mathRound(bound01(this._r,255)*100)+"%, "+mathRound(bound01(this._g,255)*100)+"%, "+mathRound(bound01(this._b,255)*100)+"%, "+this._roundA+")"},toName:function(){if(this._a===0){return"transparent"}
		if(this._a<1){return!1}
		return hexNames[rgbToHex(this._r,this._g,this._b,!0)]||!1},toFilter:function(secondColor){var hex8String='#'+rgbaToHex(this._r,this._g,this._b,this._a);var secondHex8String=hex8String;var gradientType=this._gradientType?"GradientType = 1, ":"";if(secondColor){var s=tinycolor(secondColor);secondHex8String=s.toHex8String()}
		return"progid:DXImageTransform.Microsoft.gradient("+gradientType+"startColorstr="+hex8String+",endColorstr="+secondHex8String+")"},toString:function(format){var formatSet=!!format;format=format||this._format;var formattedString=!1;var hasAlpha=this._a<1&&this._a>=0;var needsAlphaFormat=!formatSet&&hasAlpha&&(format==="hex"||format==="hex6"||format==="hex3"||format==="name");if(needsAlphaFormat){if(format==="name"&&this._a===0){return this.toName()}
		return this.toRgbString()}
		if(format==="rgb"){formattedString=this.toRgbString()}
		if(format==="prgb"){formattedString=this.toPercentageRgbString()}
		if(format==="hex"||format==="hex6"){formattedString=this.toHexString()}
		if(format==="hex3"){formattedString=this.toHexString(!0)}
		if(format==="hex8"){formattedString=this.toHex8String()}
		if(format==="name"){formattedString=this.toName()}
		if(format==="hsl"){formattedString=this.toHslString()}
		if(format==="hsv"){formattedString=this.toHsvString()}
		return formattedString||this.toHexString()},_applyModification:function(fn,args){var color=fn.apply(null,[this].concat([].slice.call(args)));this._r=color._r;this._g=color._g;this._b=color._b;this.setAlpha(color._a);return this},lighten:function(){return this._applyModification(lighten,arguments)},brighten:function(){return this._applyModification(brighten,arguments)},darken:function(){return this._applyModification(darken,arguments)},desaturate:function(){return this._applyModification(desaturate,arguments)},saturate:function(){return this._applyModification(saturate,arguments)},greyscale:function(){return this._applyModification(greyscale,arguments)},spin:function(){return this._applyModification(spin,arguments)},_applyCombination:function(fn,args){return fn.apply(null,[this].concat([].slice.call(args)))},analogous:function(){return this._applyCombination(analogous,arguments)},complement:function(){return this._applyCombination(complement,arguments)},monochromatic:function(){return this._applyCombination(monochromatic,arguments)},splitcomplement:function(){return this._applyCombination(splitcomplement,arguments)},triad:function(){return this._applyCombination(triad,arguments)},tetrad:function(){return this._applyCombination(tetrad,arguments)}};tinycolor.fromRatio=function(color,opts){if(typeof color=="object"){var newColor={};for(var i in color){if(color.hasOwnProperty(i)){if(i==="a"){newColor[i]=color[i]}else{newColor[i]=convertToPercentage(color[i])}}}
		color=newColor}
		return tinycolor(color,opts)};function inputToRGB(color){var rgb={r:0,g:0,b:0};var a=1;var ok=!1;var format=!1;if(typeof color=="string"){color=stringInputToObject(color)}
		if(typeof color=="object"){if(color.hasOwnProperty("r")&&color.hasOwnProperty("g")&&color.hasOwnProperty("b")){rgb=rgbToRgb(color.r,color.g,color.b);ok=!0;format=String(color.r).substr(-1)==="%"?"prgb":"rgb"}else if(color.hasOwnProperty("h")&&color.hasOwnProperty("s")&&color.hasOwnProperty("v")){color.s=convertToPercentage(color.s);color.v=convertToPercentage(color.v);rgb=hsvToRgb(color.h,color.s,color.v);ok=!0;format="hsv"}else if(color.hasOwnProperty("h")&&color.hasOwnProperty("s")&&color.hasOwnProperty("l")){color.s=convertToPercentage(color.s);color.l=convertToPercentage(color.l);rgb=hslToRgb(color.h,color.s,color.l);ok=!0;format="hsl"}
		if(color.hasOwnProperty("a")){a=color.a}}
		a=boundAlpha(a);return{ok:ok,format:color.format||format,r:mathMin(255,mathMax(rgb.r,0)),g:mathMin(255,mathMax(rgb.g,0)),b:mathMin(255,mathMax(rgb.b,0)),a:a}}
		function rgbToRgb(r,g,b){return{r:bound01(r,255)*255,g:bound01(g,255)*255,b:bound01(b,255)*255}}
		function rgbToHsl(r,g,b){r=bound01(r,255);g=bound01(g,255);b=bound01(b,255);var max=mathMax(r,g,b),min=mathMin(r,g,b);var h,s,l=(max+min)/2;if(max==min){h=s=0}else{var d=max-min;s=l>0.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break}
		h/=6}
		return{h:h,s:s,l:l}}
		function hslToRgb(h,s,l){var r,g,b;h=bound01(h,360);s=bound01(s,100);l=bound01(l,100);function hue2rgb(p,q,t){if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p}
		if(s===0){r=g=b=l}else{var q=l<0.5?l*(1+s):l+s-l*s;var p=2*l-q;r=hue2rgb(p,q,h+1/3);g=hue2rgb(p,q,h);b=hue2rgb(p,q,h-1/3)}
		return{r:r*255,g:g*255,b:b*255}}
		function rgbToHsv(r,g,b){r=bound01(r,255);g=bound01(g,255);b=bound01(b,255);var max=mathMax(r,g,b),min=mathMin(r,g,b);var h,s,v=max;var d=max-min;s=max===0?0:d/max;if(max==min){h=0}else{switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break}
		h/=6}
		return{h:h,s:s,v:v}}
		function hsvToRgb(h,s,v){h=bound01(h,360)*6;s=bound01(s,100);v=bound01(v,100);var i=math.floor(h),f=h-i,p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s),mod=i%6,r=[v,q,p,p,t,v][mod],g=[t,v,v,q,p,p][mod],b=[p,p,t,v,v,q][mod];return{r:r*255,g:g*255,b:b*255}}
		function rgbToHex(r,g,b,allow3Char){var hex=[pad2(mathRound(r).toString(16)),pad2(mathRound(g).toString(16)),pad2(mathRound(b).toString(16))];if(allow3Char&&hex[0].charAt(0)==hex[0].charAt(1)&&hex[1].charAt(0)==hex[1].charAt(1)&&hex[2].charAt(0)==hex[2].charAt(1)){return hex[0].charAt(0)+hex[1].charAt(0)+hex[2].charAt(0)}
		return hex.join("")}
		function rgbaToHex(r,g,b,a){var hex=[pad2(convertDecimalToHex(a)),pad2(mathRound(r).toString(16)),pad2(mathRound(g).toString(16)),pad2(mathRound(b).toString(16))];return hex.join("")}
		tinycolor.equals=function(color1,color2){if(!color1||!color2){return!1}
		return tinycolor(color1).toRgbString()==tinycolor(color2).toRgbString()};tinycolor.random=function(){return tinycolor.fromRatio({r:mathRandom(),g:mathRandom(),b:mathRandom()})};function desaturate(color,amount){amount=(amount===0)?0:(amount||10);var hsl=tinycolor(color).toHsl();hsl.s-=amount/100;hsl.s=clamp01(hsl.s);return tinycolor(hsl)}
		function saturate(color,amount){amount=(amount===0)?0:(amount||10);var hsl=tinycolor(color).toHsl();hsl.s+=amount/100;hsl.s=clamp01(hsl.s);return tinycolor(hsl)}
		function greyscale(color){return tinycolor(color).desaturate(100)}
		function lighten(color,amount){amount=(amount===0)?0:(amount||10);var hsl=tinycolor(color).toHsl();hsl.l+=amount/100;hsl.l=clamp01(hsl.l);return tinycolor(hsl)}
		function brighten(color,amount){amount=(amount===0)?0:(amount||10);var rgb=tinycolor(color).toRgb();rgb.r=mathMax(0,mathMin(255,rgb.r-mathRound(255*-(amount/100))));rgb.g=mathMax(0,mathMin(255,rgb.g-mathRound(255*-(amount/100))));rgb.b=mathMax(0,mathMin(255,rgb.b-mathRound(255*-(amount/100))));return tinycolor(rgb)}
		function darken(color,amount){amount=(amount===0)?0:(amount||10);var hsl=tinycolor(color).toHsl();hsl.l-=amount/100;hsl.l=clamp01(hsl.l);return tinycolor(hsl)}
		function spin(color,amount){var hsl=tinycolor(color).toHsl();var hue=(mathRound(hsl.h)+amount)%360;hsl.h=hue<0?360+hue:hue;return tinycolor(hsl)}
		function complement(color){var hsl=tinycolor(color).toHsl();hsl.h=(hsl.h+180)%360;return tinycolor(hsl)}
		function triad(color){var hsl=tinycolor(color).toHsl();var h=hsl.h;return[tinycolor(color),tinycolor({h:(h+120)%360,s:hsl.s,l:hsl.l}),tinycolor({h:(h+240)%360,s:hsl.s,l:hsl.l})]}
		function tetrad(color){var hsl=tinycolor(color).toHsl();var h=hsl.h;return[tinycolor(color),tinycolor({h:(h+90)%360,s:hsl.s,l:hsl.l}),tinycolor({h:(h+180)%360,s:hsl.s,l:hsl.l}),tinycolor({h:(h+270)%360,s:hsl.s,l:hsl.l})]}
		function splitcomplement(color){var hsl=tinycolor(color).toHsl();var h=hsl.h;return[tinycolor(color),tinycolor({h:(h+72)%360,s:hsl.s,l:hsl.l}),tinycolor({h:(h+216)%360,s:hsl.s,l:hsl.l})]}
		function analogous(color,results,slices){results=results||6;slices=slices||30;var hsl=tinycolor(color).toHsl();var part=360/slices;var ret=[tinycolor(color)];for(hsl.h=((hsl.h-(part*results>>1))+720)%360;--results;){hsl.h=(hsl.h+part)%360;ret.push(tinycolor(hsl))}
		return ret}
		function monochromatic(color,results){results=results||6;var hsv=tinycolor(color).toHsv();var h=hsv.h,s=hsv.s,v=hsv.v;var ret=[];var modification=1/results;while(results--){ret.push(tinycolor({h:h,s:s,v:v}));v=(v+modification)%1}
		return ret}
		tinycolor.mix=function(color1,color2,amount){amount=(amount===0)?0:(amount||50);var rgb1=tinycolor(color1).toRgb();var rgb2=tinycolor(color2).toRgb();var p=amount/100;var w=p*2-1;var a=rgb2.a-rgb1.a;var w1;if(w*a==-1){w1=w}else{w1=(w+a)/(1+w*a)}
		w1=(w1+1)/2;var w2=1-w1;var rgba={r:rgb2.r*w1+rgb1.r*w2,g:rgb2.g*w1+rgb1.g*w2,b:rgb2.b*w1+rgb1.b*w2,a:rgb2.a*p+rgb1.a*(1-p)};return tinycolor(rgba)};tinycolor.readability=function(color1,color2){var c1=tinycolor(color1);var c2=tinycolor(color2);var rgb1=c1.toRgb();var rgb2=c2.toRgb();var brightnessA=c1.getBrightness();var brightnessB=c2.getBrightness();var colorDiff=(Math.max(rgb1.r,rgb2.r)-Math.min(rgb1.r,rgb2.r)+Math.max(rgb1.g,rgb2.g)-Math.min(rgb1.g,rgb2.g)+Math.max(rgb1.b,rgb2.b)-Math.min(rgb1.b,rgb2.b));return{brightness:Math.abs(brightnessA-brightnessB),color:colorDiff}};tinycolor.isReadable=function(color1,color2){var readability=tinycolor.readability(color1,color2);return readability.brightness>125&&readability.color>500};tinycolor.mostReadable=function(baseColor,colorList){var bestColor=null;var bestScore=0;var bestIsReadable=!1;for(var i=0;i<colorList.length;i++){var readability=tinycolor.readability(baseColor,colorList[i]);var readable=readability.brightness>125&&readability.color>500;var score=3*(readability.brightness/125)+(readability.color/500);if((readable&&!bestIsReadable)||(readable&&bestIsReadable&&score>bestScore)||((!readable)&&(!bestIsReadable)&&score>bestScore)){bestIsReadable=readable;bestScore=score;bestColor=tinycolor(colorList[i])}}
		return bestColor};var names=tinycolor.names={aliceblue:"f0f8ff",antiquewhite:"faebd7",aqua:"0ff",aquamarine:"7fffd4",azure:"f0ffff",beige:"f5f5dc",bisque:"ffe4c4",black:"000",blanchedalmond:"ffebcd",blue:"00f",blueviolet:"8a2be2",brown:"a52a2a",burlywood:"deb887",burntsienna:"ea7e5d",cadetblue:"5f9ea0",chartreuse:"7fff00",chocolate:"d2691e",coral:"ff7f50",cornflowerblue:"6495ed",cornsilk:"fff8dc",crimson:"dc143c",cyan:"0ff",darkblue:"00008b",darkcyan:"008b8b",darkgoldenrod:"b8860b",darkgray:"a9a9a9",darkgreen:"006400",darkgrey:"a9a9a9",darkkhaki:"bdb76b",darkmagenta:"8b008b",darkolivegreen:"556b2f",darkorange:"ff8c00",darkorchid:"9932cc",darkred:"8b0000",darksalmon:"e9967a",darkseagreen:"8fbc8f",darkslateblue:"483d8b",darkslategray:"2f4f4f",darkslategrey:"2f4f4f",darkturquoise:"00ced1",darkviolet:"9400d3",deeppink:"ff1493",deepskyblue:"00bfff",dimgray:"696969",dimgrey:"696969",dodgerblue:"1e90ff",firebrick:"b22222",floralwhite:"fffaf0",forestgreen:"228b22",fuchsia:"f0f",gainsboro:"dcdcdc",ghostwhite:"f8f8ff",gold:"ffd700",goldenrod:"daa520",gray:"808080",green:"008000",greenyellow:"adff2f",grey:"808080",honeydew:"f0fff0",hotpink:"ff69b4",indianred:"cd5c5c",indigo:"4b0082",ivory:"fffff0",khaki:"f0e68c",lavender:"e6e6fa",lavenderblush:"fff0f5",lawngreen:"7cfc00",lemonchiffon:"fffacd",lightblue:"add8e6",lightcoral:"f08080",lightcyan:"e0ffff",lightgoldenrodyellow:"fafad2",lightgray:"d3d3d3",lightgreen:"90ee90",lightgrey:"d3d3d3",lightpink:"ffb6c1",lightsalmon:"ffa07a",lightseagreen:"20b2aa",lightskyblue:"87cefa",lightslategray:"789",lightslategrey:"789",lightsteelblue:"b0c4de",lightyellow:"ffffe0",lime:"0f0",limegreen:"32cd32",linen:"faf0e6",magenta:"f0f",maroon:"800000",mediumaquamarine:"66cdaa",mediumblue:"0000cd",mediumorchid:"ba55d3",mediumpurple:"9370db",mediumseagreen:"3cb371",mediumslateblue:"7b68ee",mediumspringgreen:"00fa9a",mediumturquoise:"48d1cc",mediumvioletred:"c71585",midnightblue:"191970",mintcream:"f5fffa",mistyrose:"ffe4e1",moccasin:"ffe4b5",navajowhite:"ffdead",navy:"000080",oldlace:"fdf5e6",olive:"808000",olivedrab:"6b8e23",orange:"ffa500",orangered:"ff4500",orchid:"da70d6",palegoldenrod:"eee8aa",palegreen:"98fb98",paleturquoise:"afeeee",palevioletred:"db7093",papayawhip:"ffefd5",peachpuff:"ffdab9",peru:"cd853f",pink:"ffc0cb",plum:"dda0dd",powderblue:"b0e0e6",purple:"800080",rebeccapurple:"663399",red:"f00",rosybrown:"bc8f8f",royalblue:"4169e1",saddlebrown:"8b4513",salmon:"fa8072",sandybrown:"f4a460",seagreen:"2e8b57",seashell:"fff5ee",sienna:"a0522d",silver:"c0c0c0",skyblue:"87ceeb",slateblue:"6a5acd",slategray:"708090",slategrey:"708090",snow:"fffafa",springgreen:"00ff7f",steelblue:"4682b4",tan:"d2b48c",teal:"008080",thistle:"d8bfd8",tomato:"ff6347",turquoise:"40e0d0",violet:"ee82ee",wheat:"f5deb3",white:"fff",whitesmoke:"f5f5f5",yellow:"ff0",yellowgreen:"9acd32"};var hexNames=tinycolor.hexNames=flip(names);function flip(o){var flipped={};for(var i in o){if(o.hasOwnProperty(i)){flipped[o[i]]=i}}
		return flipped}
		function boundAlpha(a){a=parseFloat(a);if(isNaN(a)||a<0||a>1){a=1}
		return a}
		function bound01(n,max){if(isOnePointZero(n)){n="100%"}
		var processPercent=isPercentage(n);n=mathMin(max,mathMax(0,parseFloat(n)));if(processPercent){n=parseInt(n*max,10)/100}
		if((math.abs(n-max)<0.000001)){return 1}
		return(n%max)/parseFloat(max)}
		function clamp01(val){return mathMin(1,mathMax(0,val))}
		function parseIntFromHex(val){return parseInt(val,16)}
		function isOnePointZero(n){return typeof n=="string"&&n.indexOf('.')!=-1&&parseFloat(n)===1}
		function isPercentage(n){return typeof n==="string"&&n.indexOf('%')!=-1}
		function pad2(c){return c.length==1?'0'+c:''+c}
		function convertToPercentage(n){if(n<=1){n=(n*100)+"%"}
		return n}
		function convertDecimalToHex(d){return Math.round(parseFloat(d)*255).toString(16)}
		function convertHexToDecimal(h){return(parseIntFromHex(h)/255)}
		var matchers=(function(){var CSS_INTEGER="[-\\+]?\\d+%?";var CSS_NUMBER="[-\\+]?\\d*\\.\\d+%?";var CSS_UNIT="(?:"+CSS_NUMBER+")|(?:"+CSS_INTEGER+")";var PERMISSIVE_MATCH3="[\\s|\\(]+("+CSS_UNIT+")[,|\\s]+("+CSS_UNIT+")[,|\\s]+("+CSS_UNIT+")\\s*\\)?";var PERMISSIVE_MATCH4="[\\s|\\(]+("+CSS_UNIT+")[,|\\s]+("+CSS_UNIT+")[,|\\s]+("+CSS_UNIT+")[,|\\s]+("+CSS_UNIT+")\\s*\\)?";return{rgb:new RegExp("rgb"+PERMISSIVE_MATCH3),rgba:new RegExp("rgba"+PERMISSIVE_MATCH4),hsl:new RegExp("hsl"+PERMISSIVE_MATCH3),hsla:new RegExp("hsla"+PERMISSIVE_MATCH4),hsv:new RegExp("hsv"+PERMISSIVE_MATCH3),hsva:new RegExp("hsva"+PERMISSIVE_MATCH4),hex3:/^([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,hex6:/^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,hex8:/^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/}})();function stringInputToObject(color){color=color.replace(trimLeft,'').replace(trimRight,'').toLowerCase();var named=!1;if(names[color]){color=names[color];named=!0}else if(color=='transparent'){return{r:0,g:0,b:0,a:0,format:"name"}}
		var match;if((match=matchers.rgb.exec(color))){return{r:match[1],g:match[2],b:match[3]}}
		if((match=matchers.rgba.exec(color))){return{r:match[1],g:match[2],b:match[3],a:match[4]}}
		if((match=matchers.hsl.exec(color))){return{h:match[1],s:match[2],l:match[3]}}
		if((match=matchers.hsla.exec(color))){return{h:match[1],s:match[2],l:match[3],a:match[4]}}
		if((match=matchers.hsv.exec(color))){return{h:match[1],s:match[2],v:match[3]}}
		if((match=matchers.hsva.exec(color))){return{h:match[1],s:match[2],v:match[3],a:match[4]}}
		if((match=matchers.hex8.exec(color))){return{a:convertHexToDecimal(match[1]),r:parseIntFromHex(match[2]),g:parseIntFromHex(match[3]),b:parseIntFromHex(match[4]),format:named?"name":"hex8"}}
		if((match=matchers.hex6.exec(color))){return{r:parseIntFromHex(match[1]),g:parseIntFromHex(match[2]),b:parseIntFromHex(match[3]),format:named?"name":"hex"}}
		if((match=matchers.hex3.exec(color))){return{r:parseIntFromHex(match[1]+''+match[1]),g:parseIntFromHex(match[2]+''+match[2]),b:parseIntFromHex(match[3]+''+match[3]),format:named?"name":"hex"}}
		return!1}
		window.tinycolor=tinycolor})();$(function(){if($.fn.spectrum.load){$.fn.spectrum.processNativeColorInputs()}})});

        $('head').append('<style>.sp-container{position:absolute;top:0;left:0;display:inline-block;*display:inline;*zoom:1;z-index:9999994;overflow:hidden}.sp-container.sp-flat{position:relative}.sp-container,.sp-container *{-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box}.sp-top{position:relative;width:100%;display:inline-block}.sp-top-inner{position:absolute;top:0;left:0;bottom:0;right:0}.sp-color{position:absolute;top:0;left:0;bottom:0;right:20%}.sp-hue{position:absolute;top:0;right:0;bottom:0;left:84%;height:100%}.sp-clear-enabled .sp-hue{top:33px;height:77.5%}.sp-fill{padding-top:80%}.sp-sat,.sp-val{position:absolute;top:0;left:0;right:0;bottom:0}.sp-alpha-enabled .sp-top{margin-bottom:18px}.sp-alpha-enabled .sp-alpha{display:block}.sp-alpha-handle{position:absolute;top:-4px;bottom:-4px;width:6px;left:50%;cursor:pointer;border:1px solid #000;background:#fff;opacity:.8}.sp-alpha{display:none;position:absolute;bottom:-14px;right:0;left:0;height:8px}.sp-alpha-inner{border:solid 1px #333}.sp-clear{display:none}.sp-clear.sp-clear-display{background-position:center}.sp-clear-enabled .sp-clear{display:block;position:absolute;top:0;right:0;bottom:0;left:84%;height:28px}.sp-container,.sp-replacer,.sp-preview,.sp-dragger,.sp-slider,.sp-alpha,.sp-clear,.sp-alpha-handle,.sp-container.sp-dragging .sp-input,.sp-container button{-webkit-user-select:none;-moz-user-select:-moz-none;-o-user-select:none;user-select:none}.sp-container.sp-input-disabled .sp-input-container{display:none}.sp-container.sp-buttons-disabled .sp-button-container{display:none}.sp-container.sp-palette-buttons-disabled .sp-palette-button-container{display:none}.sp-palette-only .sp-picker-container{display:none}.sp-palette-disabled .sp-palette-container{display:none}.sp-initial-disabled .sp-initial{display:none}.sp-sat{background-image:-webkit-gradient(linear,0 0,100% 0,from(#FFF),to(rgba(204,154,129,0)));background-image:-webkit-linear-gradient(left,#FFF,rgba(204,154,129,0));background-image:-moz-linear-gradient(left,#fff,rgba(204,154,129,0));background-image:-o-linear-gradient(left,#fff,rgba(204,154,129,0));background-image:-ms-linear-gradient(left,#fff,rgba(204,154,129,0));background-image:linear-gradient(to right,#fff,rgba(204,154,129,0));-ms-filter:"progid:DXImageTransform.Microsoft.gradient(GradientType = 1, startColorstr=#FFFFFFFF, endColorstr=#00CC9A81)";filter:progid:DXImageTransform.Microsoft.gradient(GradientType=1,startColorstr=\'#FFFFFFFF\',endColorstr=\'#00CC9A81\')}.sp-val{background-image:-webkit-gradient(linear,0 100%,0 0,from(#000000),to(rgba(204,154,129,0)));background-image:-webkit-linear-gradient(bottom,#000000,rgba(204,154,129,0));background-image:-moz-linear-gradient(bottom,#000,rgba(204,154,129,0));background-image:-o-linear-gradient(bottom,#000,rgba(204,154,129,0));background-image:-ms-linear-gradient(bottom,#000,rgba(204,154,129,0));background-image:linear-gradient(to top,#000,rgba(204,154,129,0));-ms-filter:"progid:DXImageTransform.Microsoft.gradient(startColorstr=#00CC9A81, endColorstr=#FF000000)";filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#00CC9A81\',endColorstr=\'#FF000000\')}.sp-hue{background:-moz-linear-gradient(top,#ff0000 0%,#ffff00 17%,#00ff00 33%,#00ffff 50%,#0000ff 67%,#ff00ff 83%,#ff0000 100%);background:-ms-linear-gradient(top,#ff0000 0%,#ffff00 17%,#00ff00 33%,#00ffff 50%,#0000ff 67%,#ff00ff 83%,#ff0000 100%);background:-o-linear-gradient(top,#ff0000 0%,#ffff00 17%,#00ff00 33%,#00ffff 50%,#0000ff 67%,#ff00ff 83%,#ff0000 100%);background:-webkit-gradient(linear,left top,left bottom,from(#ff0000),color-stop(.17,#ffff00),color-stop(.33,#00ff00),color-stop(.5,#00ffff),color-stop(.67,#0000ff),color-stop(.83,#ff00ff),to(#ff0000));background:-webkit-linear-gradient(top,#ff0000 0%,#ffff00 17%,#00ff00 33%,#00ffff 50%,#0000ff 67%,#ff00ff 83%,#ff0000 100%);background:linear-gradient(to bottom,#ff0000 0%,#ffff00 17%,#00ff00 33%,#00ffff 50%,#0000ff 67%,#ff00ff 83%,#ff0000 100%)}.sp-1{height:17%;filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#ff0000\',endColorstr=\'#ffff00\')}.sp-2{height:16%;filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#ffff00\',endColorstr=\'#00ff00\')}.sp-3{height:17%;filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#00ff00\',endColorstr=\'#00ffff\')}.sp-4{height:17%;filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#00ffff\',endColorstr=\'#0000ff\')}.sp-5{height:16%;filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#0000ff\',endColorstr=\'#ff00ff\')}.sp-6{height:17%;filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=\'#ff00ff\',endColorstr=\'#ff0000\')}.sp-hidden{display:none!important}.sp-cf:before,.sp-cf:after{content:"";display:table}.sp-cf:after{clear:both}.sp-cf{*zoom:1}@media (max-device-width:480px){.sp-color{right:40%}.sp-hue{left:63%}.sp-fill{padding-top:60%}}.sp-dragger{border-radius:5px;height:5px;width:5px;border:1px solid #fff;background:#000;cursor:pointer;position:absolute;top:0;left:0}.sp-slider{position:absolute;top:0;cursor:pointer;height:3px;left:-1px;right:-1px;border:1px solid #000;background:#fff;opacity:.8}.sp-container{border-radius:0;background-color:#ECECEC;border:solid 1px #f0c49B;padding:0}.sp-container,.sp-container button,.sp-container input,.sp-color,.sp-hue,.sp-clear{font:normal 12px "Lucida Grande","Lucida Sans Unicode","Lucida Sans",Geneva,Verdana,sans-serif;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;-ms-box-sizing:border-box;box-sizing:border-box}.sp-top{margin-bottom:3px}.sp-color,.sp-hue,.sp-clear{border:solid 1px #666}.sp-input-container{float:right;width:100px;margin-bottom:4px}.sp-initial-disabled .sp-input-container{width:100%}.sp-input{font-size:12px!important;border:1px inset;padding:4px 5px;margin:0;width:100%;background:transparent;border-radius:3px;color:#222}.sp-input:focus{border:1px solid orange}.sp-input.sp-validation-error{border:1px solid red;background:#fdd}.sp-picker-container,.sp-palette-container{float:left;position:relative;padding:10px;padding-bottom:300px;margin-bottom:-290px}.sp-picker-container{width:172px;border-left:solid 1px #fff}.sp-palette-container{border-right:solid 1px #ccc}.sp-palette-only .sp-palette-container{border:0}.sp-palette .sp-thumb-el{display:block;position:relative;float:left;width:24px;height:15px;margin:3px;cursor:pointer;border:solid 2px transparent}.sp-palette .sp-thumb-el:hover,.sp-palette .sp-thumb-el.sp-thumb-active{border-color:orange}.sp-thumb-el{position:relative}.sp-initial{float:left;border:solid 1px #333}.sp-initial span{width:30px;height:25px;border:none;display:block;float:left;margin:0}.sp-initial .sp-clear-display{background-position:center}.sp-palette-button-container,.sp-button-container{float:right}.sp-replacer{margin:0;overflow:hidden;cursor:pointer;padding:4px;display:inline-block;*zoom:1;*display:inline;border:solid 1px #91765d;background:#eee;color:#333;vertical-align:middle}.sp-replacer:hover,.sp-replacer.sp-active{border-color:#F0C49B;color:#111}.sp-replacer.sp-disabled{cursor:default;border-color:silver;color:silver}.sp-dd{padding:2px 0;height:16px;line-height:16px;float:left;font-size:10px}.sp-preview{position:relative;width:25px;height:20px;border:solid 1px #222;margin-right:5px;float:left;z-index:0}.sp-palette{*width:220px;max-width:220px}.sp-palette .sp-thumb-el{width:16px;height:16px;margin:2px 1px;border:solid 1px #d0d0d0}.sp-container{padding-bottom:0}.sp-container button{background-color:#eee;background-image:-webkit-linear-gradient(top,#eeeeee,#cccccc);background-image:-moz-linear-gradient(top,#eeeeee,#cccccc);background-image:-ms-linear-gradient(top,#eeeeee,#cccccc);background-image:-o-linear-gradient(top,#eeeeee,#cccccc);background-image:linear-gradient(to bottom,#eeeeee,#cccccc);border:1px solid #ccc;border-bottom:1px solid #bbb;border-radius:3px;color:#333;font-size:14px;line-height:1;padding:5px 4px;text-align:center;text-shadow:0 1px 0 #eee;vertical-align:middle}.sp-container button:hover{background-color:#ddd;background-image:-webkit-linear-gradient(top,#dddddd,#bbbbbb);background-image:-moz-linear-gradient(top,#dddddd,#bbbbbb);background-image:-ms-linear-gradient(top,#dddddd,#bbbbbb);background-image:-o-linear-gradient(top,#dddddd,#bbbbbb);background-image:linear-gradient(to bottom,#dddddd,#bbbbbb);border:1px solid #bbb;border-bottom:1px solid #999;cursor:pointer;text-shadow:0 1px 0 #ddd}.sp-container button:active{border:1px solid #aaa;border-bottom:1px solid #888;-webkit-box-shadow:inset 0 0 5px 2px #aaaaaa,0 1px 0 0 #eee;-moz-box-shadow:inset 0 0 5px 2px #aaaaaa,0 1px 0 0 #eee;-ms-box-shadow:inset 0 0 5px 2px #aaaaaa,0 1px 0 0 #eee;-o-box-shadow:inset 0 0 5px 2px #aaaaaa,0 1px 0 0 #eee;box-shadow:inset 0 0 5px 2px #aaaaaa,0 1px 0 0 #eee}.sp-cancel{font-size:11px;color:#d93f3f!important;margin:0;padding:2px;margin-right:5px;vertical-align:middle;text-decoration:none}.sp-cancel:hover{color:#d93f3f!important;text-decoration:underline}.sp-palette span:hover,.sp-palette span.sp-thumb-active{border-color:#000}.sp-preview,.sp-alpha,.sp-thumb-el{position:relative;background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAGUlEQVQYV2M4gwH+YwCGIasIUwhT25BVBADtzYNYrHvv4gAAAABJRU5ErkJggg==)}.sp-preview-inner,.sp-alpha-inner,.sp-thumb-inner{display:block;position:absolute;top:0;left:0;bottom:0;right:0}.sp-palette .sp-thumb-inner{background-position:50% 50%;background-repeat:no-repeat}.sp-palette .sp-thumb-light.sp-thumb-active .sp-thumb-inner{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAIVJREFUeNpiYBhsgJFMffxAXABlN5JruT4Q3wfi/0DsT64h8UD8HmpIPCWG/KemIfOJCUB+Aoacx6EGBZyHBqI+WsDCwuQ9mhxeg2A210Ntfo8klk9sOMijaURm7yc1UP2RNCMbKE9ODK1HM6iegYLkfx8pligC9lCD7KmRof0ZhjQACDAAceovrtpVBRkAAAAASUVORK5CYII=)}.sp-palette .sp-thumb-dark.sp-thumb-active .sp-thumb-inner{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjEwMPRyoQAAAMdJREFUOE+tkgsNwzAMRMugEAahEAahEAZhEAqlEAZhEAohEAYh81X2dIm8fKpEspLGvudPOsUYpxE2BIJCroJmEW9qJ+MKaBFhEMNabSy9oIcIPwrB+afvAUFoK4H0tMaQ3XtlrggDhOVVMuT4E5MMG0FBbCEYzjYT7OxLEvIHQLY2zWwQ3D+9luyOQTfKDiFD3iUIfPk8VqrKjgAiSfGFPecrg6HN6m/iBcwiDAo7WiBeawa+Kwh7tZoSCGLMqwlSAzVDhoK+6vH4G0P5wdkAAAAASUVORK5CYII=)}.sp-clear-display{background-repeat:no-repeat;background-position:center;background-image:url(data:image/gif;base64,R0lGODlhFAAUAPcAAAAAAJmZmZ2dnZ6enqKioqOjo6SkpKWlpaampqenp6ioqKmpqaqqqqurq/Hx8fLy8vT09PX19ff39/j4+Pn5+fr6+vv7+wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAEAAP8ALAAAAAAUABQAAAihAP9FoPCvoMGDBy08+EdhQAIJCCMybCDAAYUEARBAlFiQQoMABQhKUJBxY0SPICEYHBnggEmDKAuoPMjS5cGYMxHW3IiT478JJA8M/CjTZ0GgLRekNGpwAsYABHIypcAgQMsITDtWJYBR6NSqMico9cqR6tKfY7GeBCuVwlipDNmefAtTrkSzB1RaIAoXodsABiZAEFB06gIBWC1mLVgBa0AAOw==)}</style>');
    }; // end setupColorpickerSpectrum

    self.setupBookmarkDragFix = function() {
        // fix a bug in older IITC version (dragging portals in list gives an error):
        let jquerySortableScriptString = window.plugin.bookmarks.jquerySortableScript.toString();
        if (jquerySortableScriptString.match(/\$\('#'\+ui\.item\.context\.id\)/)) {
            jquerySortableScriptString = jquerySortableScriptString.replace(/\$\('#'\+ui\.item\.context\.id\)/g,'ui.item');
            eval('window.plugin.bookmarks.jquerySortableScript = ' + jquerySortableScriptString + ';');
            window.plugin.bookmarks.jquerySortableScript();
        }
    };

    self.setupScaleableBookmarks = function() {
        let addStar_string = window.plugin.bookmarks.addStar.toString();
        addStar_string = addStar_string.replace('[15,40]','[' + self.namespace + 'zoomscale(15),' + self.namespace + 'zoomscale(40)]');
        addStar_string = addStar_string.replace('[30,40]','[' + self.namespace + 'zoomscale(30),' + self.namespace + 'zoomscale(40)]');
        eval('window.plugin.bookmarks.addStar = ' + addStar_string);
    };

    self.bookmarkmenuColorpicker = function() {
        if (window.selectedPortal !== null && window.plugin.bookmarks.starLayers[window.selectedPortal]) {
            let bookmarkcolor = window.plugin.bookmarks.starLayers[window.selectedPortal].options.icon.options.color;
            if (typeof bookmarkcolor == 'string') {
                self.settings.color = bookmarkcolor;
            }
        }

        $(`#${self.id}_color[style*="display: none;"]`).next().remove();
        $(`#${self.id}_color`).spectrum({
            flat: false,
            showInput: true,
            showButtons: true,
            showPalette: true,
            showSelectionPalette: true,
            allowEmpty: false,
            palette: [
                ['#004000','#008000','#00C000'],
                ['#00FF00','#80FF80','#C0FFC0'],
                ['#000040','#000080','#0000C0'],
                ['#4040FF','#8080FF','#C0C0FF'],
                ['#6A3400','#964A00','#C05F00'],
                ['#E27000','#FF8309','#FFC287',self.defaultcolor],
                ['#a24ac3','#514ac3','#4aa8c3','#51c34a'],
                ['#c1c34a','#c38a4a','#c34a4a','#c34a6f'],
                ['#000000','#666666','#bbbbbb','#ffffff']
            ],
            change: function(color) {
                self.settings.color = color.toHexString();
                self.storesettings();
                if (window.selectedPortal !== null) {
                    let guid = window.selectedPortal;
                    let bkmrkData = window.plugin.bookmarks.findByGuid(guid);
                    if (bkmrkData) {
                        // change bookmark color
                        document.getElementById('fill_' + guid).style.fill = self.settings.color;
                        window.plugin.bookmarks.bkmrksObj.portals[bkmrkData.id_folder].bkmrk[bkmrkData.id_bookmark].color = self.settings.color;
                        window.plugin.bookmarks.saveStorage();
                    }
                }
            },
            color: self.settings.color,
        });
    };

    self.setupBookmarkMenu = function() {
        let container = document.createElement('div');
        container.innerHTML = `
<input type="text" name="color" id="${self.id}_color"></input> Current/new bookmarks color<br>
<label><input type="checkbox" name="overridechecked">Show colored bookmarks</label><br>
<label><input type="checkbox" name="smallerchecked">Scale bookmarks</label><br>
<a href="#" name="addremove">Add/Remove bookmarks...</a>
<a href="#" name="exportkml">Export KML file...</a>
<a href="#" name="exportcsv">Export CSV file...</a>
`;
        let overridechecked = container.querySelector('input[name=overridechecked]');
        overridechecked.addEventListener('click',function(e) {
            self.settings.override = this.checked;
            self.storesettings();
            self.iconoverride(this.checked);
            window.plugin.bookmarks.resetAllStars();
        },false);
        let smallerchecked = container.querySelector('input[name=smallerchecked]');
        smallerchecked.addEventListener('click',function(e) {
            self.settings.smaller = this.checked;
            self.storesettings();
            window.plugin.bookmarks.resetAllStars();
        },false);
        container.querySelector('a[name=addremove]').addEventListener('click',function(e) {
            e.preventDefault();
            self.menu();
        },false);
        container.querySelector('a[name=exportkml]').addEventListener('click',function(e) {
            e.preventDefault();
            self.exportkml();
        },false);
        container.querySelector('a[name=exportcsv]').addEventListener('click',function(e) {
            e.preventDefault();
            self.exportcsv();
        },false);

        let config = {
            subtree: true,
            childList: true,
        }
        const observer = new MutationObserver(() => {
            let bookmarksdialog = document.body.querySelector('#bkmrksSetbox');
            if (!bookmarksdialog) return;
            if (bookmarksdialog.classList.contains(self.id)) return;
            // pause monitoring
            observer.disconnect();
            // edit content
            bookmarksdialog.classList.add(self.id);
            overridechecked.checked = self.settings.override;
            smallerchecked.checked = self.settings.smaller;
            bookmarksdialog.prepend(container);
            self.bookmarkmenuColorpicker();
            // activate monitoring
            observer.observe(document.documentElement || document.body,config);
        });
        // activate monitoring
        observer.observe(document.documentElement || document.body,config);
    };

    self.setupColoredBookmarks = function() {
        let addPortalBookmarkString = window.plugin.bookmarks.addPortalBookmark.toString();
        addPortalBookmarkString = addPortalBookmarkString.replace('var ID','var color = ' + self.namespace + 'settings.color;\n    var ID');
        addPortalBookmarkString = addPortalBookmarkString.replace('label}','label,"color":color}');
        eval('window.plugin.bookmarks.addPortalBookmark = ' + addPortalBookmarkString + ';');

        let addAllStarsString = window.plugin.bookmarks.addAllStars.toString();
        addAllStarsString = addAllStarsString.replace('.label;','.label;\n        ' + self.namespace + 'settings.color = (list[idFolders][\'bkmrk\'][idBkmrks].color?list[idFolders][\'bkmrk\'][idBkmrks].color:' + self.namespace + 'defaultcolor);');
        eval('window.plugin.bookmarks.addAllStars = ' + addAllStarsString + ';');
    };

    /*
    self.setupFastAddPortalBookmark = function() {
        // copy a bookmark function, modify some lines, and use it inside this plugin
        // increase speed by disabling runhooks and console.log for every bookmark:
        let addPortalBookmark_override = window.plugin.bookmarks.addPortalBookmark.toString();
        addPortalBookmark_override = addPortalBookmark_override.replace('window.runHooks','//window.runHooks');
        addPortalBookmark_override = addPortalBookmark_override.replace('console.log','//console.log');
        eval(self.namespace + 'fastAddPortalBookmark = ' + addPortalBookmark_override + ';');
    };

    self.setupFastSwitchStarPortal = function() {
        // increase speed by disabling console.log line:
        let switchStarPortal_override = window.plugin.bookmarks.switchStarPortal.toString();
        switchStarPortal_override = switchStarPortal_override.replace('console.log','//console.log');
        eval(self.namespace + 'fastSwitchStarPortal = ' + switchStarPortal_override + ';');
    };
*/

    self.setupEditStar = function() {
        // remove the hook, modify the function, add the hook again:
        window.removeHook('pluginBkmrksEdit', window.plugin.bookmarks.editStar);
        let editStar_override = window.plugin.bookmarks.editStar.toString();
        editStar_override = editStar_override.replace(/(var latlng = )(.*?);/s,'let bkmrk = window.plugin.bookmarks.findByGuid(guid);\n        if (!window.portals[guid] && !bkmrk) return;\n        $1(bkmrk?window.L.latLng(window.plugin.bookmarks.bkmrksObj.portals[bkmrk.id_folder].bkmrk[bkmrk.id_bookmark].latlng.split(",")):$2);');
        editStar_override = editStar_override.replace(/(var lbl = )(.*?);/s,'$1(bkmrk?window.plugin.bookmarks.bkmrksObj.portals[bkmrk.id_folder].bkmrk[bkmrk.id_bookmark].label:$2);');
        eval('window.plugin.bookmarks.editStar = ' + editStar_override + ';');
        window.addHook('pluginBkmrksEdit', window.plugin.bookmarks.editStar);
    };

    self.timestamp = function() {
        function leadingzero(value) {
            return ('0' + value).slice(-2);
        }
        let d = new Date();
        return d.getFullYear() + '-' + leadingzero(d.getDate()) + '-' + leadingzero(d.getMonth()) + '_' + leadingzero(d.getHours()) + '' + leadingzero(d.getMinutes());
    };

    self.setupSaveFilename = function() {
        let optExportString = window.plugin.bookmarks.optExport.toString();
        // IITC:
        // if(typeof android !== 'undefined' && android && android.saveFile) {
        //      android.saveFile("IITC-bookmarks.json", "application/json", localStorage[window.plugin.bookmarks.KEY_STORAGE]);
        //    }
        optExportString = optExportString.replace('application/json','text/plain');
        optExportString = optExportString.replace('"IITC-bookmarks.json"','"IITC-bookmarks - " + ' + self.namespace + 'timestamp() + ".json"');

        // IITC-CE:
        // var data = localStorage[window.plugin.bookmarks.KEY_STORAGE];
        // window.saveFile(data, 'IITC-bookmarks.json', 'application/json');
        optExportString = optExportString.replace("'IITC-bookmarks.json'","'IITC-bookmarks - ' + " + self.namespace + "timestamp() + '.json'"); // in IITC-CE double quotes have been replaced by single quotes
        eval('window.plugin.bookmarks.optExport = ' + optExportString + ';');
    };

    self.setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        if (!window.plugin.bookmarks) {
            console.log('IITC plugin requires bookmarks plugin: ' + self.title + ' version ' + self.version);
			return; // this add-on requires the bookmarks plugin
		}

        self.setupColorpickerSpectrum();
        self.setupBookmarkDragFix();
        self.setupBookmarkMenu();
        self.setupScaleableBookmarks();
        self.setupColoredBookmarks();
        //self.setupFastAddPortalBookmark();
        //self.setupFastSwitchStarPortal();
        self.setupEditStar();
        self.setupSaveFilename();

        self.restoresettings();
        self.iconoverride(self.settings.override);

        window.plugin.bookmarks.resetAllStars();

        window.addHook('portalDetailLoaded', self.updatemenucolor);

        let stylesheet = document.head.appendChild(document.createElement('style'));
        stylesheet.innerHTML = `
.plugin-bookmarks-addon-names {
    color: #FFFFBB;
    font-size:11px;line-height: 12px;
    text-align: center;
    padding: 2px; /* padding needed so shadow doesn't clip */
    overflow: hidden;
    /* could try this if one-line names are used */
    /* white-space: nowrap; text-overflow: ellipsis; */
    text-shadow: 1px 1px #000,1px -1px #000,-1px 1px #000,-1px -1px #000, 0 0 5px #000;
    pointer-events: none;
}`;

        self.labelLayerGroup = new window.L.LayerGroup();
        window.addLayerGroup('Bookmarked portal names', self.labelLayerGroup, true);

        window.addHook('requestFinished', function() { setTimeout(function(){self.delayedUpdatePortalLabels(3.0);},1); });
        window.addHook('mapDataRefreshEnd', function() { self.delayedUpdatePortalLabels(0.5); });
        window.map.on('overlayadd overlayremove', function() { setTimeout(function(){self.delayedUpdatePortalLabels(1.0);},1); });
        window.map.on('zoomend', self.clearAllPortalLabels );
        window.map.on('zoomend', window.plugin.bookmarks.resetAllStars );
        window.addHook('pluginBkmrksEdit', function() { setTimeout(function(){self.delayedUpdatePortalLabels(0.5);},1); } );

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
