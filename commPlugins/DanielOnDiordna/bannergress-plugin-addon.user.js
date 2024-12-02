// ==UserScript==
// @author         DanielOnDiordna
// @name           Bannergress: Add-on
// @version        4.2.1.20220926.214200
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/bannergress-plugin-addon.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/bannergress-plugin-addon.user.js
// @description    [danielondiordna-4.2.1.20220926.214200] Add a lot of extra non-standard functionality. Read the About info for all details. Filters for Done and To-Do banners, on the Map and Browse page (Sign in required). Filter Offline or Online banners from the Browse list. !!! Be aware that using these Plugin Filters will transfer very large amounts of Bannergress data !!!
// @category       Addon
// @id             bannergress-plugin-addon@DanielOnDiordna
// @runAt          document-end
// @namespace      https://softspot.nl/ingress/
// @homepageURL    https://softspot.nl/ingress/plugins/documentation/bannergress-plugin-addon.user.js.html
// @match          https://bannergress.com/*
// @grant          none
// ==/UserScript==


(function() {
    'use strict';

    let title = 'Bannergress: Add-on';
    let version = '4.2.1.20220926.214200';
    let author = 'DanielOnDiordna';
    let authorwebsite = 'https://softspot.nl/ingress/';
    let about = `${title}
plugin version ${version} (by ${author})
${authorwebsite}

Bannergress is a great website, but sometimes there are user requests that cannot yet be implemented by the designers.
With this plugin the website will get some of that extra functionality, and you can decide for yourself if you want to use this.

If filters are used, the banner list items will still be downloaded in the background and will be hidden when loaded!
!!! Be aware that using these Plugin Filters will transfer very large amounts of Bannergress data !!!

The plugin was designed and tested to work with:
- Windows Google Chrome with Tampermonkey extension
- Android Kiwi Browser app with Tampermonkey extension
- iOS 15 Safari with userscripts extension

Menubuttons:
- New My Lists icon button, direct access to the user pages (to-do, done, hidden)
- New Banner icon button, direct access to the last visited banner
- Buttons now return to the last used user page, browse page and map location

Home:
- Show the Sign in button, if not signed in yet
- Show a clear My Lists Preview title, if signed in
- Show information about the My Lists button, if signed in
- Always auto click sign in, if not signed in

My Lists:
- Added a new My Lists button for easy access
- Added filters: Offline, Partially offline, Online (not markerd as offline), Show offline banners required
- Added a toggle button to show/hide the Banner Offline warning overlay

Browse/Search/Agent:
- Added filters: Done, To-Do, Other (not marked as Done or To-Do), Sign in required
- Added filters: Offline, Partially offline, Online (not markerd as offline), Show offline banners required
- Added filter: Number of missions (choose min and max missions)
- Added filter: Distance of all missions (choose min and max km)
- Added an ALL button to clear all filters, mission count and distance settings

Search:
- Added a link to show banners for agent using the search text

Map:
- Added filters: Done, To-Do, Other (not marked as Done or To-Do), Sign in required
- Markers on the map are also hidden if a filter is used
- Numbers on markers are striked through if a filter is used

Banner list items:
- Added a toggle button to show/hide the Banner offline overlay

Banner details:
- Added a new Banner button for easy access
- Added a message at the top "NO passphrase actions", or a bright yellow message "Passphrase actions:"
- Added a toggle button to show/hide the Banner Offline warning overlay
- Restore last opened tab
- Restore last expanded missions
- Always show top-menu with search and sign in button
- Added Google Maps directions link (origin your location) for each mission (grouped in 10 portals)
- Added Google Maps waypoints only link (origin first portal) for each mission (grouped in 10 portals)
- Added distance details in meteres and a sum of all expanded missions

Mobile friendly checkbox:
- Make everything more compact, very practical for mobile users
- Make bottom menu buttons a lot smaller
- Shrink map controls buttons
- Sort buttons are wrapped around
- Also usable for for desktop users
`;

    let changelog = `
Changelog:

version 4.2.1.20220926.214200
- ignore new-banner and preview-banner pages

version 4.2.0.20220913.204400
- added exact mission distance in meters for every expanded mission
- added individual missions length (sum) in meters
- added number of expanded missions and their total length (sum) in meters
- added a calculated distance between missions

version 4.1.3.20220907.231700
- fixed distance filter a bit more

version 4.1.2.20220907.215300
- fixed the passphrase warning to support any browser language
- fixed mission total detection to support any browser language
- fixed distance filter to support comma and dot decimals to support any browser language

version 4.1.1.20220512.161200
- fixed distance filter for missions distances in meters and not km

version 4.1.0.20220512.150500
- added a filter limitation, to prevent to many bannegress server requests, using fade instead of hide
- added information about how many banners are loaded, found, filtered and faded

version 4.0.0.20220510.232100
- added a full page of plugin information
- added preferences to enable/disable parts of the plugin
- compatible with Bannergress 2.3
- added animated checkboxes like Bannergress
- changed all timer based functions with content change event listeners
- added a filter checkbox for Other, besides Done and To-Do
- changed Offline and Partially Offline checkboxes color back to red
- added separate filter storage settings for map, browse and my lists checkboxes
- synced checkboxes below and beside the map (only visible when resizing the window) to do: make this smarter
- added My Lists menu icon for quick access to user lists
- added Banner menu icon for quick access to last visited banner
- added store and restore Banner details last tab and expanded missions
- added yellow passphrase warning in banner details view
- added a text line-through numbers on the map markers if a part of the markers are hidden
- added logic to keep always at least 1 checkbox enabled (done/todo/other and offline/partially/online)
- added mobile friendly formatting and a checkbox to enable this
- modified Browse page layout to always keep results left aligned
- modified main buttons to remember last page for My Lists, Browse and Map
- added a browse filter for amount of missions in a banner (6, 12, 18 etc)
- added a browse filter for distance of missions in a banner (km)
- added a toggle checkbox to show/hide the Banner Offline overlay
- added Google Maps directions link (origin your location) for each mission (a link for every 10 portals)
- added Google Maps waypoints only link (origin first portal) for each mission (a link for every 10 portals)
- added auto sign in option
- added My Banners menu item if signed in to quickly search for your banners
- added option to remember last search text
- added link to banners for agent in search results
- bannergress offline filter checkbox disables/enables the plugin checkboxes for offline/online filters

version 3.0.0.20220328.232000
- reversed the function of the checkboxes from Hide to Show
- added a separate Partially offline filter checkbox
- added a message on the home page to inform you to sign in
- functional fix: hiding offline banners now also hide Done/To-Do banners
- bugfix: filters were not applied right away when clicking on countries and cities

version 2.0.0.20220326.210800
- added add-on checkboxes to Browse page
- added a little info button with plugin info
- added browse checkbox to hide banners marked as Done
- added browse checkbox to hide banners marked as To-Do
- added browse checkbox to hide banners marked as (partially) offline (banners with red warning)
- added browse checkbox to hide banners marked as Online (except done, to-do and banners with red warnings)
- added cursor pointers to checkbox labels
- added matching color frames around the checkbox labels
- detect if signed in/logged out to enable/disable the to-do and done checkboxes
- also compatible with the Kiwi Browser/Tampermonkey for Android mobile users

version 1.0.1.20220326.082500
- bugfix: handling restore settings, when there is nothing stored, now works

version 1.0.0.20220325.233500
- first release, based on a plugin from j00rtje
- added add-on checkboxes to Map page
- added map checkbox to hide banners marked as Done
- added map checkbox to hide banners marked as To-Do
- added styles logic to hide map markers
- added styles logic to hide banners from the list of banners in this area
- used timers to detect map banners to apply and restore styles
- settings are stored and restored from localStorage
`;

    let localstoragesettings = 'plugin-bannergress-addon-settings';
    let settings = {};

    settings.mylists = {
        offline: true,
        partially: true,
        online: true,
        missionscountmin: 0,
        missionscountmax: -1, // any
        missionsdistancemin: 0,
        missionsdistancemax: -1 // any
    }

    settings.browse = {
        done: true,
        todo: true,
        other: true,
        offline: true,
        partially: true,
        online: true,
        missionscountmin: 0,
        missionscountmax: -1, // any
        missionsdistancemin: 0,
        missionsdistancemax: -1 // any
    }

    settings.map = {
        done: true,
        todo: true,
        other: true
    }

    settings.search = {
        done: true,
        todo: true,
        other: true,
        offline: true,
        partially: true,
        online: true,
        missionscountmin: 0,
        missionscountmax: -1, // any
        missionsdistancemin: 0,
        missionsdistancemax: -1 // any
    }

    settings.agent = {
        done: true,
        todo: true,
        other: true,
        offline: true,
        partially: true,
        online: true,
        missionscountmin: 0,
        missionscountmax: -1, // any
        missionsdistancemin: 0,
        missionsdistancemax: -1 // any
    }

    settings.mobilefriendly = false;
    settings.lasturluser = '/user/banners/todo';
    settings.lasturlbrowse = '/browse';
    settings.lasturlmap = '/map';
    settings.lasturlbanner = '/banner';
    settings.bannerlasttab = '';
    settings.bannerurl = '';
    settings.bannerexpandlist = '';
    settings.enablelastbrowsmapurls = true;
    settings.enablefilters = true;
    settings.enablemainmenubuttons = true;
    settings.enablemapslinks = false;
    settings.autosignin = false;
    settings.mybannersmenu = true;
    settings.agentname = '';
    settings.enablesearchtext = false;
    settings.lastsearchtext = 'example';

    let bannerlistpages = {
        '.user-banner-list-page':'mylists',
        '.places-banners':'browse',
        '.map-overview':{filter:'map',name:'mapdesktop'},
        '.banner-accordion':{filter:'map',name:'mapmobile'},
        '.search-content':'search',
        '.agent-page':'agent'
    };

    let stylesheetchanges = document.body.appendChild(document.createElement('style'));
    let hideotherstylesheet = document.body.appendChild(document.createElement('style'));
    let hidedonestylesheet = document.body.appendChild(document.createElement('style'));
    let hidetodostylesheet = document.body.appendChild(document.createElement('style'));
    let hidedonetodostylesheet = document.body.appendChild(document.createElement('style'));
    let hideallstylesheet = document.body.appendChild(document.createElement('style'));

    let hidelimit = 200;
    let addonfilters = {};

    let offlinechecked = undefined;

    let missiondata = undefined;

    const infoicon = '<?xml version="1.0"?><svg fill="#ffffff" xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 30 30" width="20px" height="20px">    <path d="M15,3C8.373,3,3,8.373,3,15c0,6.627,5.373,12,12,12s12-5.373,12-12C27,8.373,21.627,3,15,3z M16,21h-2v-7h2V21z M15,11.5 c-0.828,0-1.5-0.672-1.5-1.5s0.672-1.5,1.5-1.5s1.5,0.672,1.5,1.5S15.828,11.5,15,11.5z"/></svg>';
    const mylistsicon = `<?xml version="1.0" encoding="iso-8859-1"?><svg fill="none" width="24" height="24" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 55.835 55.835" xml:space="preserve" class="icon">
<g>
	<path d="M55.288,39.943c-0.398-4.089-3.45-7.052-7.271-7.052c-2.396,0-4.407,1.448-5.684,3.212
		c-1.276-1.764-3.288-3.213-5.684-3.213c-3.819,0-6.871,2.963-7.27,7.051c-0.042,0.269-0.145,1.222,0.225,2.711
		c0.545,2.196,1.8,4.19,3.631,5.77l8.335,7.133c0.222,0.187,0.492,0.28,0.763,0.28c0.273,0,0.546-0.096,0.769-0.285l8.331-7.13
		c1.829-1.576,3.084-3.57,3.63-5.768C55.433,41.164,55.33,40.212,55.288,39.943z M53.122,42.17c-0.445,1.794-1.48,3.431-2.991,4.732
		l-7.797,6.673l-7.794-6.671c-1.514-1.304-2.549-2.941-2.993-4.734c-0.302-1.214-0.193-1.897-0.194-1.897l0.017-0.106
		c0.244-2.621,2.137-5.275,5.281-5.275c2.189,0,3.974,1.811,4.77,3.605l0.914,2.061l0.914-2.061c0.796-1.794,2.579-3.604,4.77-3.604
		c3.146,0,5.038,2.654,5.296,5.367C53.315,40.266,53.426,40.95,53.122,42.17z"/>
	<path d="M27.501,12c-0.553,0-1,0.447-1,1s0.447,1,1,1h18c0.553,0,1-0.447,1-1s-0.447-1-1-1H27.501z"/>
	<path d="M46.501,27c0-0.553-0.447-1-1-1h-18c-0.553,0-1,0.447-1,1s0.447,1,1,1h18C46.054,28,46.501,27.553,46.501,27z"/>
	<path d="M21.08,7.241c-0.418-0.359-1.05-0.312-1.409,0.108l-6.248,7.288l-3.822-2.866c-0.44-0.33-1.068-0.243-1.399,0.2
		c-0.332,0.441-0.242,1.068,0.2,1.399l4.571,3.429c0.179,0.135,0.39,0.2,0.599,0.2c0.283,0,0.563-0.119,0.76-0.35l6.857-8
		C21.549,8.231,21.5,7.601,21.08,7.241z"/>
	<path d="M21.08,21.241c-0.418-0.359-1.05-0.312-1.409,0.108l-6.248,7.288l-3.822-2.866c-0.44-0.33-1.068-0.243-1.399,0.2
		c-0.332,0.441-0.242,1.068,0.2,1.399l4.571,3.429c0.179,0.135,0.39,0.2,0.599,0.2c0.283,0,0.563-0.119,0.76-0.35l6.857-8
		C21.549,22.231,21.5,21.601,21.08,21.241z"/>
	<path d="M19.671,36.35l-6.248,7.287l-3.822-2.866c-0.44-0.331-1.068-0.243-1.399,0.2c-0.332,0.441-0.242,1.068,0.2,1.399
		l4.571,3.429c0.179,0.135,0.39,0.2,0.599,0.2c0.283,0,0.563-0.119,0.76-0.35l6.857-7.999c0.36-0.419,0.312-1.05-0.108-1.409
		C20.662,35.882,20.03,35.93,19.671,36.35z"/>
	<path d="M25.501,52H12.677C7.066,52,2.501,47.436,2.501,41.824V12.176C2.501,6.564,7.066,2,12.677,2h29.648
		c5.611,0,10.176,4.564,10.176,10.176V30c0,0.553,0.447,1,1,1s1-0.447,1-1V12.176C54.501,5.462,49.039,0,42.325,0H12.677
		C5.963,0,0.501,5.462,0.501,12.176v29.648C0.501,48.538,5.963,54,12.677,54h12.824c0.553,0,1-0.447,1-1S26.054,52,25.501,52z"/>
</g>
</svg>`;
    const bannericon = `<?xml version="1.0" encoding="iso-8859-1"?><svg fill="none" width="24" height="24" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 485 485" style="enable-background:new 0 0 485 485;" xml:space="preserve" class="icon">
<g>
	<path d="M425.661,339.076H259.036c-15.418,0-27.962-12.544-27.962-27.962s12.544-27.962,27.962-27.962h137.167
		c6.192,17.459,22.865,30,42.42,30c24.813,0,45-20.187,45-45c0-19.555-12.541-36.228-30-42.42V0h-152.96v131.256h122.96v94.476
		c-12.764,4.527-22.893,14.656-27.42,27.42H259.036c-31.96,0-57.962,26.001-57.962,57.962s26.002,57.962,57.962,57.962h166.625
		c15.418,0,27.962,12.543,27.962,27.962S441.079,425,425.661,425H146.096c-6.192-17.459-22.865-30-42.42-30
		c-24.813,0-45.001,20.187-45.001,45s20.188,45,45.001,45c19.555,0,36.228-12.542,42.42-30h279.565
		c31.96,0,57.962-26.001,57.962-57.962S457.621,339.076,425.661,339.076z M330.663,101.256V30h92.96v71.256H330.663z
		 M438.623,253.152c8.271,0,15,6.729,15,15s-6.729,15-15,15s-15-6.729-15-15S430.352,253.152,438.623,253.152z M103.676,455
		c-8.271,0-15.001-6.729-15.001-15s6.729-15,15.001-15s15,6.729,15,15S111.947,455,103.676,455z"/>
	<path d="M138.676,189.498c0-19.299-15.701-35-35.001-35c-19.299,0-35,15.701-35,35s15.701,35,35,35
		C122.975,224.498,138.676,208.797,138.676,189.498z"/>
	<path d="M183.941,252.86c14.414-18.226,22.032-40.137,22.032-63.363c0-56.407-45.891-102.298-102.299-102.298
		C47.268,87.2,1.377,133.09,1.377,189.498c0,23.227,7.619,45.137,22.059,63.396l80.239,100.883L183.941,252.86z M31.377,189.498
		c0-39.865,32.433-72.298,72.298-72.298s72.299,32.433,72.299,72.298c0,16.403-5.382,31.879-15.537,44.721l-56.762,71.364
		L46.94,234.251C36.759,221.377,31.377,205.901,31.377,189.498z"/>
</g>
</svg>`;

    function createAnimatedCheckBox(initialchecked,clickcallback) {
        let divarea = document.createElement('div');
        divarea.className = "bg-switch";
        divarea.style.display = 'inline-block';
        divarea.style.marginBottom = '2px';
        let buttonarea = divarea.appendChild(document.createElement('button'));
        buttonarea.className = "ant-switch";
        buttonarea.setAttribute('role',"switch");
        let handlearea = buttonarea.appendChild(document.createElement('div'));
        handlearea.className = "ant-switch-handle";
        let innerarea = buttonarea.appendChild(document.createElement('span'));
        innerarea.className = "ant-switch-inner";

        if (initialchecked) {
            divarea.classList.add("bg-switch-selected");
            buttonarea.classList.add("ant-switch-checked");
            buttonarea.setAttribute('aria-checked',"true");
            buttonarea.setAttribute('ant-click-animating',"false");
        } else {
            buttonarea.setAttribute('aria-checked',"false");
        }

        divarea.checked = initialchecked;
        divarea.setChecked = function(checked = true) {
            divarea.checked = checked;
            if (checked) {
                divarea.classList.add("bg-switch-selected");
                buttonarea.classList.add("ant-switch-checked");
                buttonarea.setAttribute('aria-checked',"true");
                buttonarea.setAttribute('ant-click-animating',"false");
            } else {
                divarea.setUnchecked();
            }
        };
        divarea.setUnchecked = function() {
            divarea.checked = false;
            divarea.classList.remove("bg-switch-selected");
            buttonarea.classList.remove("ant-switch-checked");
            buttonarea.setAttribute('aria-checked',"false");
        };

        divarea.disabled = false;
        divarea.setDisabled = function(disabled = true) {
            divarea.disabled = disabled;
            if (disabled) {
            } else {
            }
        };

        buttonarea.addEventListener('click',function(e) {
            if (divarea.disabled) return;
            let checked = JSON.parse(buttonarea.getAttribute('aria-checked'));
            checked = !checked; // change the checked state
            divarea.setChecked(checked);
            if (typeof clickcallback == "function") clickcallback(checked);
        },false);
        return divarea;
    }

    function setupAbout() {
        if (document.querySelector('.ant-layout.main .add-on-about-area')) return;

        let aboutdivarea = document.createElement('div');
        aboutdivarea.className = 'add-on-about-area';
        aboutdivarea.style.display = 'none';
        aboutdivarea.style.margin = '20px';
        aboutdivarea.style.overflowY = 'scroll';

        let abouttextarea = aboutdivarea.appendChild(document.createElement('div'));
        abouttextarea.className = 'add-on-about-area-about';
        abouttextarea.innerText = about;

        abouttextarea.innerHTML = abouttextarea.innerHTML.replace(/(New My Lists icon button)/,mylistsicon + ' $1');
        abouttextarea.innerHTML = abouttextarea.innerHTML.replace(/(New Banner icon button)/,bannericon + ' $1');

        [...abouttextarea.querySelectorAll('svg')].map((el)=>{el.style.fill = '#eaeaea';});

        abouttextarea.innerHTML = abouttextarea.innerHTML.replace(new RegExp(`(${title})<br>`,"g"),'<h2 style="cursor:pointer;"><span role="button">❮ $1 ' + infoicon + '</span></h2>');
        abouttextarea.innerHTML = abouttextarea.innerHTML.replace(new RegExp(`(plugin version([^<>]+))<br>`,"g"),'<span style="font-size: smaller;">$1</span><br>');
        abouttextarea.innerHTML = abouttextarea.innerHTML.replace(new RegExp(`(${authorwebsite})<br>`,"g"),'<a href="$1" target="_blank">$1</a><br>');
        abouttextarea.innerHTML = abouttextarea.innerHTML.replace(/(Google Chrome)/,'<a href="https://www.google.com/chrome/" target="_blank">$1</a>');
        abouttextarea.innerHTML = abouttextarea.innerHTML.replace(/(Kiwi Browser app)/,'<a href="https://play.google.com/store/apps/details?id=com.kiwibrowser.browser" target="_blank">$1</a>');
        abouttextarea.innerHTML = abouttextarea.innerHTML.replaceAll(/(Tampermonkey extension)/g,'<a href="https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo" target="_blank">$1</a>');
        abouttextarea.innerHTML = abouttextarea.innerHTML.replace(/(userscripts extension)/,'<a href="https://apps.apple.com/app/userscripts/id1463298887" target="_blank">$1</a>');
        abouttextarea.innerHTML = abouttextarea.innerHTML.replaceAll(/<br><br>([^<>:]+:)<br>/g,'<h3>$1</h3>');

        abouttextarea.innerHTML = abouttextarea.innerHTML.replace(/(if you want to use this.)<br><br>/,'$1<div class="bannergress-add-on-preferences"></div>');

        let settingsarea = aboutdivarea.querySelector('.bannergress-add-on-preferences');
        if (settingsarea) {
            settingsarea.appendChild(document.createElement('h3')).innerText = 'Plugin preferences:';

            let mobilefriendlybuttonarea = settingsarea.appendChild(document.createElement('label'));
            mobilefriendlybuttonarea.className = 'bannergress-add-on-checkbox-mobilefriendly bannergress-add-on-checkboxarea';
            mobilefriendlybuttonarea.appendChild(createAnimatedCheckBox(settings.mobilefriendly,function(checked) {
                settings.mobilefriendly = checked;
                storesettings();
                applyMobileFriendlyStyleChanges();
                syncOtherCheckboxes(document.querySelectorAll('.bannergress-add-on-checkbox-mobilefriendly'),mobilefriendlybuttonarea);
            }));
            mobilefriendlybuttonarea.appendChild(document.createElement('span')).innerText = 'Apply mobile friendly styles';
            settingsarea.appendChild(document.createElement('br'));

            let filtersbuttonarea = settingsarea.appendChild(document.createElement('label'));
            filtersbuttonarea.className = 'bannergress-add-on-checkboxarea';
            filtersbuttonarea.appendChild(createAnimatedCheckBox(settings.enablefilters,function(checked) {
                settings.enablefilters = checked;
                storesettings();

                updateMapStyles();
                if (settings.enablefilters) {
                    for (let page in bannerlistpages) {
                        let filter;
                        let name;
                        if (typeof bannerlistpages[page] == 'object' && !(bannerlistpages[page] instanceof Array)) {
                            filter = bannerlistpages[page].filter;
                            name = bannerlistpages[page].name;
                        } else if (typeof bannerlistpages[page] == 'string') {
                            filter = bannerlistpages[page];
                            name = filter;
                        }
                        if (document.querySelector(`${page} .filter-and-sort`) && filter in settings) {
                            addFilter(settings[filter],name,`${page} .filter-and-sort`);
                        }
                        if (document.querySelector(`${page} .banner-list`) && filter in settings) {
                            applyBannerListFilters(settings[filter]);
                        }
                    }
                } else {
                    let hiddenelements = document.querySelectorAll('.bannergress-add-on-hideelement');
                    for (let element of hiddenelements) {
                        element.classList.remove('bannergress-add-on-hideelement');
                    }
                    for (let filter in addonfilters) {
                        removeFilter(filter);
                    }
                }
            }));
            filtersbuttonarea.appendChild(document.createElement('span')).innerText = 'Show filters for My Lists, Browse, Map, Search and Agent lists';
            settingsarea.appendChild(document.createElement('br'));

            let lasturlsbuttonarea = settingsarea.appendChild(document.createElement('label'));
            lasturlsbuttonarea.className = 'bannergress-add-on-checkboxarea';
            lasturlsbuttonarea.appendChild(createAnimatedCheckBox(settings.enablelastbrowsmapurls,function(checked) {
                settings.enablelastbrowsmapurls = checked;
                storesettings();
                if (settings.enablelastbrowsmapurls) {
                    let topmainmenu = document.querySelector('.top-menu .menu-main');
                    if (topmainmenu) {
                        replaceBrowseButton(topmainmenu,'top');
                        replaceMapButton(topmainmenu,'top');
                    }
                    let bottommainmenu = document.querySelector('.bottom-menu .menu-main');
                    if (bottommainmenu) {
                        replaceBrowseButton(bottommainmenu,'bottom');
                        replaceMapButton(bottommainmenu,'bottom');
                    }
                } else {
                    // to do: restore buttons!
                    restoreBrowseMapButtons();
                }
            }));
            lasturlsbuttonarea.appendChild(document.createElement('span')).innerText = 'Remember last used Browse/Map locations for the Browse/Map buttons';
            settingsarea.appendChild(document.createElement('br'));

            let searchtextbuttonarea = settingsarea.appendChild(document.createElement('label'));
            searchtextbuttonarea.className = 'bannergress-add-on-checkboxarea';
            searchtextbuttonarea.appendChild(createAnimatedCheckBox(settings.enablesearchtext,function(checked) {
                settings.enablesearchtext = checked;
                storesettings();
                for (let searchinput of document.querySelectorAll('.search-input')) {
                   searchinput.value = (settings.enablesearchtext ? settings.lastsearchtext : '');
                }
            }));
            searchtextbuttonarea.appendChild(document.createElement('span')).innerText = 'Remember last search text';
            settingsarea.appendChild(document.createElement('br'));

            let mainmenubuttonsarea = settingsarea.appendChild(document.createElement('label'));
            mainmenubuttonsarea.className = 'bannergress-add-on-checkboxarea';
            mainmenubuttonsarea.appendChild(createAnimatedCheckBox(settings.enablemainmenubuttons,function(checked) {
                settings.enablemainmenubuttons = checked;
                storesettings();
                if (settings.enablemainmenubuttons) {
                    addTopMainMenuButtons();
                    addBottomMainMenuButtons();
                } else {
                    removeMainMenuButtons();
                }
            }));
            mainmenubuttonsarea.appendChild(document.createElement('span')).innerText = 'Add "My Lists" and "Banner" buttons in the main menu';
            settingsarea.appendChild(document.createElement('br'));

            let mapsbuttonarea = settingsarea.appendChild(document.createElement('label'));
            mapsbuttonarea.className = 'bannergress-add-on-checkboxarea';
            mapsbuttonarea.appendChild(createAnimatedCheckBox(settings.enablemapslinks,function(checked) {
                settings.enablemapslinks = checked;
                storesettings();
                if (settings.enablemapslinks) {
                    let missioncards = [...document.querySelectorAll('.mission-card')].filter((el)=>{return el.querySelector('.mission-info');});
                    for (let missioncard of missioncards) {
                        createMissionsMapLink(missioncard);
                    }
                } else {
                    let maplinks = document.querySelectorAll('.bannergress-add-on-map-link');
                    for (let maplink of maplinks) {
                        maplink.remove();
                    }
                }
            }));
            mapsbuttonarea.appendChild(document.createElement('span')).innerText = 'Create Google Maps links inside Banner details Missions';
            settingsarea.appendChild(document.createElement('br'));

            let autosigninbuttonarea = settingsarea.appendChild(document.createElement('label'));
            autosigninbuttonarea.className = 'bannergress-add-on-checkboxarea';
            autosigninbuttonarea.appendChild(createAnimatedCheckBox(settings.autosignin,function(checked) {
                settings.autosignin = checked;
                storesettings();
                if (settings.autosignin && !signedIn()) {
                   document.querySelector('.sign-in-button').click();
                }
            }));
            autosigninbuttonarea.appendChild(document.createElement('span')).innerText = 'Always automatically Sign In, if not signed in anymore';
            settingsarea.appendChild(document.createElement('br'));

            let mybannersbuttonarea = settingsarea.appendChild(document.createElement('label'));
            mybannersbuttonarea.className = 'bannergress-add-on-checkboxarea';
            mybannersbuttonarea.appendChild(createAnimatedCheckBox(settings.mybannersmenu,function(checked) {
                settings.mybannersmenu = checked;
                if (settings.mybannersmenu) {
                    addMyBannersMenuitem();
                } else {
                    removeMyBannersMenuitem();
                }
                storesettings();
            }));
            mybannersbuttonarea.appendChild(document.createElement('span')).innerText = 'Add "My Banners" menu item if signed in, use this agentname: ';
            let inputname = mybannersbuttonarea.appendChild(document.createElement('input'));
            inputname.setAttribute('placeholder',"my banners agent name");
            inputname.name = 'bannergress-input-agentname';
            inputname.style.padding = '5px 5px 5px 10px';
            inputname.style.backgroundColor = '#404040';
            inputname.style.borderRadius = '4px 0 0 4px';
            inputname.style.border = 'none';

            inputname.type = 'text';
            inputname.value = settings.agentname;
            mybannersbuttonarea.addEventListener('click',function(e) {
                if (e.target == inputname) {
                    e.stopPropagation();
                }
            },false);
            inputname.addEventListener('blur',function(e) {
                settings.agentname = this.value.trim();
                storesettings();
            },false);
        }

        let changelogarea = aboutdivarea.appendChild(document.createElement('div'));
        changelogarea.className = 'add-on-about-area-changelog';
        changelogarea.innerText = changelog;
        changelogarea.style.display = 'none';

        let changelogbutton = aboutdivarea.appendChild(document.createElement('button'));
        changelogbutton.name = 'add-on-about-area-changelog-button';
        changelogbutton.innerText = 'Changelog';
        changelogbutton.style.color = 'black';
        changelogbutton.style.cursor = 'pointer';
        changelogbutton.addEventListener('click', function(e) {
            e.preventDefault();
            changelogbutton.style.display = 'none';
            changelogarea.style.display = 'block';
            changelogarea.scrollIntoView();
        },false);

        let closebutton = aboutdivarea.appendChild(document.createElement('button'));
        closebutton.innerText = 'Close';
        closebutton.style.color = 'black';
        closebutton.style.cursor = 'pointer';
        closebutton.addEventListener('click', function(e) {
            e.preventDefault();
            hideAbout();
        },false);

        abouttextarea.querySelector('span[role=button]').addEventListener('click',function(e) {
            closebutton.click();
        },false);

        document.querySelector('.ant-layout.main').appendChild(aboutdivarea);
    }

    function hideAbout() {
        if (!document.querySelector('.ant-layout.main .add-on-about-area')) return;
        if (document.querySelector('.ant-layout.main .add-on-about-area').style.display == 'none') return;

        document.querySelector('.add-on-about-area-about').scrollIntoView();
        document.querySelector('.add-on-about-area-changelog').style.display = 'none';
        document.querySelector('button[name=add-on-about-area-changelog-button]').style.display = 'unset';

        document.querySelector('.ant-layout.main .add-on-about-area').style.display = 'none';
        document.querySelector('.ant-layout.main>.container').style.display = 'unset';
    }

    function showAbout() {
        if (document.querySelector('.mobile-search-button-container.active')) document.querySelector('.mobile-search-button').click(); // hide search
        setupAbout();
        document.querySelector('.ant-layout.main>.container').style.display = 'none';
        document.querySelector('.ant-layout.main .add-on-about-area').style.display = 'unset';
    }

    function toggleAbout() {
        if (!document.querySelector('.ant-layout.main .add-on-about-area') || document.querySelector('.ant-layout.main .add-on-about-area').style.display == 'none') {
            showAbout();
        } else {
            hideAbout();
        }
    }

    function restoresettings() {
        function isObject(element) {
            return (typeof element == 'object' && element instanceof Object && !(element instanceof Array));
        }

        function parseSettings(source,target) {
            if (!isObject(source) || !isObject(target)) return;

            for (const key in target) {
                if (key in source) {
                    if (isObject(target[key])) {
                        parseSettings(source[key],target[key]);
                    } else if (typeof source[key] == typeof target[key]) { // only accept settings from default settings template of same type
                        target[key] = source[key];
                    }
                }
            }
        }

        try {
            if (typeof localStorage.getItem(localstoragesettings) != 'string' || localStorage.getItem(localstoragesettings) == '') {
                setTimeout(function() { showAbout(); },1000);
                return;
            }
            let storedsettings = JSON.parse(localStorage.getItem(localstoragesettings));
            parseSettings(storedsettings,settings);
            if (!isObject(storedsettings) || !('bannerlasttab' in storedsettings)) setTimeout(function() { showAbout(); },1000); // show about if a new item is added
        } catch(e) {
            return false;
        }
    }

    function storesettings() {
        localStorage.setItem(localstoragesettings,JSON.stringify(settings));
    }

    function applyStyleOverride() {
        let overridestylesheet = document.body.appendChild(document.createElement('style'));
        overridestylesheet.innerHTML = `
        .browser .places-list { flex: unset; }
        .top-menu>div .search-bar { margin-right: 5px; }
        .menu-main>a { padding: 5px 2px; min-width: 50px; }
        `;
    }

    function applyAddonStyles() {
        let addstylesheet = document.body.appendChild(document.createElement('style'));
        addstylesheet.innerHTML = `
        .bannergress-add-on-messagearea { margin-left: 4px; font-size: 0.8em; }
        /*.bannergress-add-on-filtered { border: 1px dashed red; }*/
        .bannergress-add-on-filtered a { filter: brightness(0.3); transition: filter .3s; }
        .bannergress-add-on-filtered a:hover { filter: brightness(1.0); }
        .bannergress-add-on-hideelement { display:none !important; }
        .bannergress-add-on-filter-select {
            background-color: #1b1b1b;
            border-radius: 5px;
            margin: 0 2px;
            padding: 2px 5px 1px 0px;
            font-size: smaller;
        }
        .bannergress-add-on-checkboxarea {
            user-select: none;
            cursor: pointer;
        }
        .bannergress-add-on-checkboxarea span {
            margin-left: 5px;
            margin-top: 4px;
            margin-bottom: 4px;
        }
        .bannergress-add-on-checkboxarea input[type=checkbox] {
            cursor: pointer;
            margin: 0 5px;
        }
        .bannergress-add-on-missiondetails {
            margin: 0 5px;
        }
        `;
    }

    function applyMobileFriendlyStyleChanges() {
        if (settings.mobilefriendly) {
            stylesheetchanges.innerHTML = `
            .order-button { display:unset; }
            .banner-list-type-navigation .active { font-size: 22px; }
            .banner-list-type-navigation .inactive { font-size: 19px; }
            .banner-list-type-navigation .banner-list-type { line-height: 23px; margin-right: 12px; }
            .banner-list-type-navigation { margin-bottom: unset; }
            .order-chooser>div>h4 { display:inline; }
            .user-banner-list-content,.search-content,.agent-content { margin: 1em; }
            .bottom-menu, .top-menu { padding: 0px 10px; }
            .bottom-menu .menu-main .icon { width: 15px; height: 15px; }
            .bottom-menu>.menu-main>a { font-size: x-small; padding: 2px; }
            .banner-accordion { height: 30px; }
            .banner-accordion .banner-accordion-expander { line-height: 30px; }
            .banner-accordion .filter-and-sort { margin: 0 10px 0px; }
            .filter-and-sort { margin-bottom: 3px; grid-row-gap: 0px; row-gap: 0px; }
            .filter-and-sort button { height: 24px; line-height: 19px; }
            .order-chooser>div { margin-bottom: 3px; grid-row-gap: 0px; row-gap: 0px; }
            .order-button.selected .order-button-inner { padding: 0px 9px; white-space: nowrap; }
            .places-banners { padding-top: 0px; }
            .places-banners>h1,.search-content>h1,.agent-content>h1 { font-size: 22px; margin: 0px; line-height: 1; }
            .ant-divider-horizontal { margin: 10px 0; }
            .search-content .ant-row,.agent-content .ant-row { display: unset; }
            .home .user-banner-list-preview { margin-top: 0px; }
            .announcement-and-recent-banners { margin-top: 5px; }
            .leaflet-touch .leaflet-control-layers-toggle { width: 28px; height: 28px; }
            .leaflet-touch .leaflet-bar a { width: 26px; height: 26px; }
            .leaflet-touch .leaflet-bar a { width: 26px; height: 26px; }
            .place-accordion-page .place-accordion-title { padding: 0 5px; }
            .recent-banners-title { margin: 0; }
            .recent-banners-title>h1 { font-size: 22px; line-height: 1; }
            .seeFullList { margin-top: 0; }
            /*h1, h2, h3, h4, h5, h6 { margin-bottom: 0; }*/
            /*.banner-info-with-map-container .banner-info-with-map .banner-info { margin-top: 0 !important; margin-bottom: 0 !important; }*/
            .mt-1 { margin: 0; }
            .mission-card { padding: 5px; }
            .banner-info-mobile-switch { padding-bottom: 0; }
            .banner-info-mobile-switch .mobile-switch-title-row { padding: 0; }
            .banner-info-mobile-switch button { line-height: 1em; }
            @media only screen and (max-width: 880px) { .banner-info-overview .banner-info-container { width: 100%; } }
            .banner-info-overview .banner-info-container .ant-tabs { margin-top: 0; }
            .map-overview .map-banners { padding-top: 0; }
            `;
        } else {
            stylesheetchanges.innerHTML = '';
        }
    }

    function clearMapStyles() {
        hideotherstylesheet.innerHTML = '';
        hidedonestylesheet.innerHTML = '';
        hidetodostylesheet.innerHTML = '';
        hidedonetodostylesheet.innerHTML = '';
        hideallstylesheet.innerHTML = '';
    }

    function updateMapStyles() {
        clearMapStyles();
        if (!settings.enablefilters) return;
        if (!signedIn()) return;

        // option for transparancy, instead of hiding completely (does not work for linear-gradient)
/*
    var sheet = document.body.appendChild(document.createElement('style'));
    sheet.innerHTML = '';
    sheet.innerHTML += '.marker-pin-medium-false.marker-pin-done{background-image: none !important; background-color: rgba(0, 0, 0, 0.2) !important; border: 2px solid rgba(0,0,0,.3) !important;}';
    sheet.innerHTML += '.marker-pin-medium-false.marker-pin-all {background-image: none !important; background-color: #ffe381 !important;}';
    sheet.innerHTML += '.marker-pin-medium-false.marker-pin-normal-done {background-image: none !important; background-color: #6832da !important;}';
    sheet.innerHTML += '.marker-pin-medium-false.marker-pin-done-todo {background-image: none !important; background-color: #ffe381 !important;}';
*/

        if (!settings.map.todo) {
            hidetodostylesheet.innerHTML += '.marker-pin-medium-false.marker-pin-todo {display:none !important;}'; // hide yellow
        }
        if (!settings.map.done) {
            hidedonestylesheet.innerHTML += '.marker-pin-medium-false.marker-pin-done {display:none !important;}'; // hide green
        }
        if (!settings.map.other) {
            hideotherstylesheet.innerHTML += '.marker-pin-medium-false:not(.marker-pin-done,.marker-pin-normal-done,.marker-pin-done-todo,.marker-pin-todo,.marker-pin-normal-todo,.marker-pin-all) {display:none !important;}'; // hide purple
        }

        if (!settings.map.done && !settings.map.other) {
            hidedonestylesheet.innerHTML += '.marker-pin-medium-false.marker-pin-normal-done {display:none !important; }'; // hide purple/green
        } else if (!settings.map.done && settings.map.other) {
            hidedonestylesheet.innerHTML += '.marker-pin-medium-false.marker-pin-normal-done {background-image: none !important; background-color: #6832DA !important; text-decoration: line-through;}'; // hide green, only show purple
        } else if (settings.map.done && !settings.map.other) {
            hidedonestylesheet.innerHTML += '.marker-pin-medium-false.marker-pin-normal-done {background-image: none !important; background-color: #70C03F !important; text-decoration: line-through;}'; // hide purple, only show green
        }
        if (!settings.map.todo && !settings.map.other) {
            hidetodostylesheet.innerHTML += '.marker-pin-medium-false.marker-pin-normal-todo {display:none !important; }'; // hide purple/yellow
        } else if (!settings.map.todo && settings.map.other) {
            hidetodostylesheet.innerHTML += '.marker-pin-medium-false.marker-pin-normal-todo {background-image: none !important; background-color: #6832DA !important; text-decoration: line-through;}'; // hide yellow, only show purple
        } else if (settings.map.todo && !settings.map.other) {
            hidetodostylesheet.innerHTML += '.marker-pin-medium-false.marker-pin-normal-todo {background-image: none !important; background-color: #FFE381 !important; text-decoration: line-through;}'; // hide purple, only show yellow
        }

        if (!settings.map.done && !settings.map.todo && !settings.map.other) {
            hideallstylesheet.innerHTML += '.marker-pin-medium-false.marker-pin-all {display:none !important;}'; // hide purple/green/yellow
        } else if (!settings.map.done && !settings.map.todo && settings.map.other) {
            hideallstylesheet.innerHTML += '.marker-pin-medium-false.marker-pin-all {background-image: none !important; background-color: #6832DA !important; text-decoration: line-through;}'; // hide green/yellow, only show purple
        } else if (!settings.map.done && settings.map.todo && !settings.map.other) {
            hideallstylesheet.innerHTML += '.marker-pin-medium-false.marker-pin-all {background-image: none !important; background-color: #FFE381 !important; text-decoration: line-through;}'; // hide purple/green, only show yellow
        } else if (!settings.map.done && settings.map.todo && settings.map.other) {
            hideallstylesheet.innerHTML += '.marker-pin-medium-false.marker-pin-all {background-image: none !important; background-image: linear-gradient(-45deg, #6832DA 50%, #FFE381 50%) !important; text-decoration: line-through;}'; // hide green, only show purple/yellow
        } else if (settings.map.done && !settings.map.todo && !settings.map.other) {
            hideallstylesheet.innerHTML += '.marker-pin-medium-false.marker-pin-all {background-image: none !important; background-color: #70C03F !important; text-decoration: line-through;}'; // hide purple/yellow, only show green
        } else if (settings.map.done && !settings.map.todo && settings.map.other) {
            hideallstylesheet.innerHTML += '.marker-pin-medium-false.marker-pin-all {background-image: none !important; background-image: linear-gradient(-45deg, #6832DA 50%, #70C03F 50%) !important; text-decoration: line-through;}'; // hide yellow, only show purple/green
        } else if (settings.map.done && settings.map.todo && !settings.map.other) {
            hideallstylesheet.innerHTML += '.marker-pin-medium-false.marker-pin-all {background-image: none !important; background-image: linear-gradient(-45deg, #70C03F 50%, #FFE381 50%) !important; text-decoration: line-through;}'; // hide purple, only show green/yellow
        } else if (settings.map.done && settings.map.todo && settings.map.other) { // default
        }

        if (!settings.map.done && !settings.map.todo) {
            hidedonetodostylesheet.innerHTML += '.marker-pin-medium-false.marker-pin-done-todo {display:none !important; text-decoration: line-through;}'; // hide green/yellow
        } else if (!settings.map.done && settings.map.todo) {
            hidedonetodostylesheet.innerHTML += '.marker-pin-medium-false.marker-pin-done-todo {background-image: none !important; background-color: #FFE381 !important; text-decoration: line-through;}'; // hide green, only show yellow
        } else if (settings.map.done && !settings.map.todo) {
            hidedonetodostylesheet.innerHTML += '.marker-pin-medium-false.marker-pin-done-todo {background-image: none !important; background-color: #70C03F !important; text-decoration: line-through;}'; // hide yellow, only show green
        }
    }

    function createLabelCheckbox(labeltext = '',title = '',labelclasses = '',checkboxname = '',checked = true,disabled = false,bordercolor = 'red',changecallback) {
        let labelarea = document.createElement('label');
        if (typeof labelclasses == 'string' && labelclasses != '') labelarea.className = labelclasses;
        labelarea.style.userSelect = 'none';
        labelarea.style.cursor = (!disabled?'pointer':'not-allowed');
        labelarea.style.borderRadius = '5px';
        labelarea.style.border = '1px solid ' + bordercolor;
        labelarea.style.margin = '0 2px';
        labelarea.style.padding = '2px 5px 1px 0px';
        labelarea.style.whiteSpace = 'nowrap';
        if (title) labelarea.title = title;

        let checkbox = labelarea.appendChild(document.createElement('input'));
        checkbox.type = 'checkbox';
        checkbox.checked = checked;
        checkbox.style.cursor = (!disabled?'pointer':'not-allowed');
        checkbox.style.margin = '0 5px';
        if (checkboxname) checkbox.name = checkboxname;
        checkbox.disabled = disabled;

        labelarea.appendChild(document.createTextNode(labeltext));

        if (typeof changecallback == 'function') {
            checkbox.addEventListener('change', function(e) {
                changecallback(e,this.checked,this.parentElement);
            },false);
        }

        return labelarea;
    }

    function addToggleOfflineOverlayButton(item) {
        if (!item.querySelector('.offline-overlay')) return;
        if (item.querySelector('.bannergress-add-on-show-offline-warning')) return;

        // add a toggle button
        let toggleareadiv = document.createElement('div');
        let togglearea = toggleareadiv.appendChild(document.createElement('label'));
        togglearea.className = 'bannergress-add-on-show-offline-warning banner-info-item';
        togglearea.style.whiteSpace = 'nowrap';
        togglearea.style.userSelect = 'none';
        togglearea.style.cursor = 'pointer';
        let togglecheckbox = togglearea.appendChild(document.createElement('input'));
        togglecheckbox.style.margin = '0 5px';
        togglecheckbox.type = 'checkbox';
        togglecheckbox.checked = true;
        togglearea.appendChild(document.createTextNode('offline overlay'));
        togglecheckbox.addEventListener('change', function(e) {
            e.preventDefault();
            item.querySelector('.offline-overlay').style.display = (!this.checked?'none':'flex');
            e.stopPropagation();
        },false);

        if (item.querySelector('a .warning')) {
            // checkbox will be placed inside element a, so this needs a workaround:
            item.querySelector('a').addEventListener('click', function(e) {
                if (e.target == togglearea || e.target == togglecheckbox) { // || e.target == item.querySelector('.banner-card-picture-inner img')) {
                    e.stopPropagation();
                }
            },false);
        }
        if (item.querySelector('div[role=button] .warning')) {
            // checkbox will be placed inside element div button, so this needs a workaround:
            item.querySelector('div[role=button]').addEventListener('click', function(e) {
                if (e.target == togglearea || e.target == togglecheckbox) {
                    e.stopPropagation();
                }
            },false);
        }

        item.querySelector('.warning').appendChild(toggleareadiv);
    }

    function applyBannerListFilters(refsettings) {
        if (!settings.enablefilters) return;

        function convertDistanceToFloat(text) {
            let distance = -1;
            if (text.match(/,\d$/)) { // 1 decimal
                distance = parseFloat(text.replace(/\./g,'').replace(',','.'));
            } else if (text.match(/\.\d$/)) { // 1 decimal
                distance = parseFloat(text.replace(/\,/g,''));
            } else if (text.match(/,\d\d\d/)) { // 1000 seperator
                distance = parseFloat(text.replace(/\,/g,''));
            } else if (text.match(/\.\d\d\d/)) { // 1000 seperator
                distance = parseFloat(text.replace(/\./g,''));
            } else {
                distance = parseFloat(text);
            }
            return distance;
        }

        let bannerlists = document.querySelectorAll('.banner-list'); // mylists and browse have 1 list, map view has possibly 2 lists, left on desktop (>880px), bottom on mobile (<880px), both are created if screen is resized
        for (let bannerlist of bannerlists) {
            let items = bannerlist.querySelectorAll('.banner-list-entry');
            for (let item of items) {
                let done = item.querySelector('.list-style-done') != null;
                let todo = item.querySelector('.list-style-todo') != null;
                let offline = item.querySelector('.offline-overlay') != null;
                let partiallyoffline = !offline && item.querySelector('.warning') != null;
                let online = !offline && !partiallyoffline;
                let bannerinfoitemtexts = [...item.querySelectorAll('.banner-info-item')].map((el)=>{return el.innerText;}).join("\t");
                let missions = (bannerinfoitemtexts.match(/^(\d+)/) ? parseInt((bannerinfoitemtexts.match(/^(\d+)/))[1]) : -1); // Missions
                let distance = (bannerinfoitemtexts.match(/ ([\d\.,]+) km/) ? convertDistanceToFloat((bannerinfoitemtexts.match(/ ([\d\.,]+) km/))[1]) : (bannerinfoitemtexts.match(/ ([\d\.,]+) m/) ? convertDistanceToFloat((bannerinfoitemtexts.match(/ ([\d\.,]+) m/))[1]) / 1000 : -1));

                let hide = false;
                if ('missionscountmin' in refsettings && 'missionscountmax' in refsettings && missions >= 0) {
                    if (missions < refsettings.missionscountmin || (refsettings.missionscountmax != -1 && missions > refsettings.missionscountmax)) {
                        hide = true;
                    }
                }
                if ('missionsdistancemin' in refsettings && 'missionsdistancemax' in refsettings && distance >= 0) {
                    if (distance < refsettings.missionsdistancemin || (refsettings.missionsdistancemax != -1 && distance > refsettings.missionsdistancemax)) {
                        hide = true;
                    }
                }
                if ('done' in refsettings && done && !refsettings.done) {
                    hide = true;
                }
                if ('todo' in refsettings && todo && !refsettings.todo) {
                    hide = true;
                }
                if ('other' in refsettings && !done && !todo && !refsettings.other) {
                    hide = true;
                }
                if ('offline' in refsettings && offline && !refsettings.offline) {
                    hide = true;
                }
                if (offline) {
                    addToggleOfflineOverlayButton(item);
                }
                if ('partially' in refsettings && partiallyoffline && !refsettings.partially) {
                    hide = true;
                }
                if ('online' in refsettings && offlinechecked === true && online && !refsettings.online) {
                    hide = true;
                }

                if (hide) {
                    item.classList.add('bannergress-add-on-filtered');
                } else {
                    item.classList.remove('bannergress-add-on-filtered');
                }
            }

            let hidecount = 0;
            for (let item of items) {
                if (item.classList.contains('bannergress-add-on-filtered') && hidecount < hidelimit) {
                    hidecount++;
                    item.classList.add('bannergress-add-on-hideelement');
                } else {
                    item.classList.remove('bannergress-add-on-hideelement');
                }
            }
            let filtereditemcount = bannerlist.querySelectorAll('.bannergress-add-on-filtered').length;
            let hiddenitemcount = bannerlist.querySelectorAll('.bannergress-add-on-hideelement').length;
            let messageareas = document.querySelectorAll('.bannergress-add-on-messagearea');
            for (let messagearea of messageareas) {
                messagearea.innerText = `Loaded ${items.length}/Found ${items.length - filtereditemcount}/Filtered ${hiddenitemcount}` + (filtereditemcount>hidelimit?` (max)/Faded ${filtereditemcount - hiddenitemcount}`:'');
            }
        }
    }

    function createFilter(refsettings,classbasename) {
        let flexarea = document.createElement('div');
        flexarea.className = `bannergress-add-on-filterarea-${classbasename}`;
        flexarea.style.display = 'flex';
        flexarea.style.flexWrap = 'wrap';

        function handleCheckboxChanged() {
            storesettings();
            applyBannerListFilters(refsettings);
            updateMapStyles();
            if (typeof flexarea.disableLastCheckboxDoneTodoOther == 'function') flexarea.disableLastCheckboxDoneTodoOther();
            if (typeof flexarea.disableLastCheckboxOfflineOnline == 'function') flexarea.disableLastCheckboxOfflineOnline();
        }

        let mylistsbuttonsarea;
        let showdonecheckbox;
        let showtodocheckbox;
        let showothercheckbox;
        if ('todo' in refsettings && 'done' in refsettings && 'other' in refsettings) {
            mylistsbuttonsarea = flexarea.appendChild(document.createElement('div'));
            mylistsbuttonsarea.className = `bannergress-add-on-filter-${classbasename}-mylists`;

            let showdonearea = mylistsbuttonsarea.appendChild(createLabelCheckbox('Done',(signedIn()?'':'Sign in first'),`bannergress-add-on-filter-${classbasename}-done`,classbasename + 'showdone',refsettings.done,!signedIn(),'#70c03f',function(e,checked,thislabelelement) { // green
                refsettings.done = checked;
                handleCheckboxChanged();
            }));

            let showtodoarea = mylistsbuttonsarea.appendChild(createLabelCheckbox('To-Do',(signedIn()?'':'Sign in first'),`bannergress-add-on-filter-${classbasename}-todo`,classbasename + 'showtodo',refsettings.todo,!signedIn(),'#ffe381',function(e,checked,thislabelelement) { // yellow
                refsettings.todo = checked;
                handleCheckboxChanged();
            }));

            let showotherarea = mylistsbuttonsarea.appendChild(createLabelCheckbox('other',(signedIn()?'':'Sign in first'),`bannergress-add-on-filter-${classbasename}-other`,classbasename + 'showother',refsettings.other,!signedIn(),'#6832da',function(e,checked,thislabelelement) { // purple
                refsettings.other = checked;
                handleCheckboxChanged();
            }));

            showdonecheckbox = showdonearea.querySelector('input[type=checkbox]');
            showtodocheckbox = showtodoarea.querySelector('input[type=checkbox]');
            showothercheckbox = showotherarea.querySelector('input[type=checkbox]');
            flexarea.disableLastCheckboxDoneTodoOther = function() {
                if (!signedIn()) return;
                showdonecheckbox.disabled = refsettings.done && !refsettings.todo && !refsettings.other;
                showdonecheckbox.style.cursor = (showdonecheckbox.disabled ? 'not-allowed' : 'pointer');
                showdonearea.style.cursor = showdonecheckbox.style.cursor;
                showtodocheckbox.disabled = !refsettings.done && refsettings.todo && !refsettings.other;
                showtodocheckbox.style.cursor = (showtodocheckbox.disabled ? 'not-allowed' : 'pointer');
                showtodoarea.style.cursor = showtodocheckbox.style.cursor;
                showothercheckbox.disabled = !refsettings.done && !refsettings.todo && refsettings.other;
                showothercheckbox.style.cursor = (showothercheckbox.disabled ? 'not-allowed' : 'pointer');
                showotherarea.style.cursor = showothercheckbox.style.cursor;
                syncOtherCheckboxes(document.querySelectorAll('[class^=bannergress-add-on-filter-] [class$=-done]'),showdonearea,refsettings.done);
                syncOtherCheckboxes(document.querySelectorAll('[class^=bannergress-add-on-filter-] [class$=-todo]'),showtodoarea,refsettings.todo);
                syncOtherCheckboxes(document.querySelectorAll('[class^=bannergress-add-on-filter-] [class$=-other]'),showotherarea,refsettings.other);
            };

            flexarea.disableLastCheckboxDoneTodoOther();
        }

        let offlinebuttonsarea;
        let showofflinecheckbox;
        let showpartiallycheckbox;
        let showonlinecheckbox;
        if ('offline' in refsettings && 'partially' in refsettings && 'online' in refsettings) {
            offlinebuttonsarea = flexarea.appendChild(document.createElement('div'));
            offlinebuttonsarea.className = `bannergress-add-on-filter-${classbasename}-offlinebuttons`;

            let showofflinearea = offlinebuttonsarea.appendChild(createLabelCheckbox('Offline','',`bannergress-add-on-filter-${classbasename}-offline`,classbasename + 'showoffline',refsettings.offline,false,'#ef5555',function(e,checked,thislabelelement) { // dark red
                refsettings.offline = checked;
                handleCheckboxChanged();
            }));
            let showpartiallyofflinearea = offlinebuttonsarea.appendChild(createLabelCheckbox('Partially','Partially Offline',`bannergress-add-on-filter-${classbasename}-partially`,classbasename + 'showpartially',refsettings.partially,false,'#ef5555',function(e,checked,thislabelelement) { // dark red
                refsettings.partially = checked;
                handleCheckboxChanged();
            }));
            let showonlinearea = offlinebuttonsarea.appendChild(createLabelCheckbox('Online','',`bannergress-add-on-filter-${classbasename}-online`,classbasename + 'showonline',refsettings.online,false,'#ffffff',function(e,checked,thislabelelement) { // white
                refsettings.online = checked;
                handleCheckboxChanged();
            }));

            showofflinecheckbox = showofflinearea.querySelector('input[type=checkbox]');
            showpartiallycheckbox = showpartiallyofflinearea.querySelector('input[type=checkbox]');
            showonlinecheckbox = showonlinearea.querySelector('input[type=checkbox]');

            flexarea.disableLastCheckboxOfflineOnline = function() {
                if (offlinechecked !== true) return;
                showofflinecheckbox.disabled = refsettings.offline && !refsettings.partially && !refsettings.online;
                showofflinecheckbox.style.cursor = (showofflinecheckbox.disabled ? 'not-allowed' : 'pointer');
                showofflinearea.style.cursor = showofflinecheckbox.style.cursor;
                showpartiallycheckbox.disabled = !refsettings.offline && refsettings.partially && !refsettings.online;
                showpartiallycheckbox.style.cursor = (showpartiallycheckbox.disabled ? 'not-allowed' : 'pointer');
                showpartiallyofflinearea.style.cursor = showpartiallycheckbox.style.cursor;
                showonlinecheckbox.disabled = !refsettings.offline && !refsettings.partially && refsettings.online;
                showonlinecheckbox.style.cursor = (showonlinecheckbox.disabled ? 'not-allowed' : 'pointer');
                showonlinearea.style.cursor = showonlinecheckbox.style.cursor;
            };
            flexarea.disableLastCheckboxOfflineOnline();
        }

        let missioncountminselect;
        let missioncountmaxselect;
        let missiondistanceminselect;
        let missiondistancemaxselect;
        if ('missionscountmin' in refsettings && 'missionscountmax' in refsettings && 'missionsdistancemin' in refsettings && 'missionsdistancemax' in refsettings) {
            let missioncountformarea = flexarea.appendChild(document.createElement('div'));

            missioncountminselect = missioncountformarea.appendChild(document.createElement('select'));
            missioncountminselect.className = 'bannergress-add-on-filter-select';
            for (const range of [0,2,3,4,5,6,12,18,24,30,60,90,150,300,600,900,1200]) {
                let option = missioncountminselect.appendChild(document.createElement('option'));
                option.value = range;
                option.text = range;
                option.selected = (option.value == refsettings.missionscountmin);
            }
            if (parseInt(missioncountminselect.value) != refsettings.missionscountmin) {
                refsettings.missionscountmin = 0;
                storesettings();
            }
            missioncountformarea.appendChild(document.createTextNode('to'));
            missioncountmaxselect = missioncountformarea.appendChild(document.createElement('select'));
            missioncountmaxselect.className = 'bannergress-add-on-filter-select';
            for (const range of [-1,2,3,4,5,6,12,18,24,30,60,90,150,300,600,900,1200,-1]) {
                let option = missioncountmaxselect.appendChild(document.createElement('option'));
                option.value = range;
                option.text = (range == -1 ? 'any missions' : range);
                option.selected = (option.value == refsettings.missionscountmax);
            }
            if (parseInt(missioncountminselect.value) != refsettings.missionscountmax) {
                refsettings.missionscountmax = -1;
                storesettings();
            }

            let missiondistanceformarea = flexarea.appendChild(document.createElement('div'));

            missiondistanceminselect = missiondistanceformarea.appendChild(document.createElement('select'));
            missiondistanceminselect.className = 'bannergress-add-on-filter-select';
            for (const range of [0,1,2,3,4,5,6,7,8,9,10,15,20,40,60,80,100,300,500,700,900,1100]) {
                let option = missiondistanceminselect.appendChild(document.createElement('option'));
                option.value = range;
                option.text = range + ' km';
                option.selected = (option.value == refsettings.missionsdistancemin);
            }
            if (parseFloat(missiondistanceminselect.value) != refsettings.missionsdistancemin) {
                refsettings.missionsdistancemin = 0;
                storesettings();
            }
            missiondistanceformarea.appendChild(document.createTextNode('to'));
            missiondistancemaxselect = missiondistanceformarea.appendChild(document.createElement('select'));
            missiondistancemaxselect.className = 'bannergress-add-on-filter-select';
            for (const range of [-1,1,2,3,4,5,6,7,8,9,10,15,20,40,60,80,100,300,500,700,900,1100,-1]) {
                let option = missiondistancemaxselect.appendChild(document.createElement('option'));
                option.value = range;
                option.text = (range == -1 ? 'any distance' : range + ' km');
                option.selected = (option.value == refsettings.missionsdistancemax);
            }
            if (parseFloat(missiondistancemaxselect.value) != refsettings.missionsdistancemax) {
                refsettings.missionsdistancemax = -1;
                storesettings();
            }

            missioncountminselect.addEventListener('change', function(e) {
                e.preventDefault();
                refsettings.missionscountmin = parseInt(this.value);
                if (refsettings.missionscountmax != -1 && refsettings.missionscountmax < refsettings.missionscountmin) {
                    refsettings.missionscountmax = refsettings.missionscountmin;
                    missioncountmaxselect.value = refsettings.missionscountmax;
                }
                handleCheckboxChanged();
            },false);
            missioncountmaxselect.addEventListener('change', function(e) {
                e.preventDefault();
                refsettings.missionscountmax = parseInt(this.value);
                if (refsettings.missionscountmax != -1 && refsettings.missionscountmin > refsettings.missionscountmax) {
                    refsettings.missionscountmin = refsettings.missionscountmax;
                    missioncountminselect.value = refsettings.missionscountmin;
                }
                handleCheckboxChanged();
            },false);
            missiondistanceminselect.addEventListener('change', function(e) {
                e.preventDefault();
                refsettings.missionsdistancemin = parseFloat(this.value);
                if (refsettings.missionsdistancemax != -1 && refsettings.missionsdistancemax < refsettings.missionsdistancemin) {
                    refsettings.missionsdistancemax = refsettings.missionsdistancemin;
                    missiondistancemaxselect.value = refsettings.missionsdistancemax;
                }
                handleCheckboxChanged();
            },false);
            missiondistancemaxselect.addEventListener('change', function(e) {
                e.preventDefault();
                refsettings.missionsdistancemax = parseFloat(this.value);
                if (refsettings.missionsdistancemax != -1 && refsettings.missionsdistancemin > refsettings.missionsdistancemax) {
                    refsettings.missionsdistancemin = refsettings.missionsdistancemax;
                    missiondistanceminselect.value = refsettings.missionsdistancemin;
                }
                handleCheckboxChanged();
            },false);
        }

        let clearformarea = flexarea.appendChild(document.createElement('div'));
        let clearformbutton = clearformarea.appendChild(document.createElement('button'));
        clearformbutton.className = 'order-button';
        clearformbutton.style.lineHeight = '12px';
        let clearformbuttoninner = clearformbutton.appendChild(document.createElement('div'));
        clearformbuttoninner.className = 'order-button-inner';
        clearformbuttoninner.innerText = 'ALL';

        clearformbuttoninner.addEventListener('click', function(e) {
            if ('todo' in refsettings && 'done' in refsettings && 'other' in refsettings) {
                refsettings.done = true;
                refsettings.todo = true;
                refsettings.other = true;
                showdonecheckbox.checked = refsettings.done;
                showtodocheckbox.checked = refsettings.todo;
                showothercheckbox.checked = refsettings.other;
                flexarea.disableLastCheckboxDoneTodoOther();
            }

            if ('offline' in refsettings && 'partially' in refsettings && 'online' in refsettings) {
                refsettings.offline = true;
                refsettings.partially = true;
                refsettings.online = true;
                showofflinecheckbox.checked = refsettings.offline;
                showpartiallycheckbox.checked = refsettings.partially;
                showonlinecheckbox.checked = refsettings.online;
                flexarea.disableLastCheckboxOfflineOnline();
            }

            if ('missionscountmin' in refsettings && 'missionscountmax' in refsettings && 'missionsdistancemin' in refsettings && 'missionsdistancemax' in refsettings) {
                refsettings.missionscountmin = 0;
                refsettings.missionscountmax = -1; // any
                refsettings.missionsdistancemin = 0;
                refsettings.missionsdistancemax = -1; // any
                missioncountminselect.value = refsettings.missionscountmin;
                missioncountmaxselect.value = refsettings.missionscountmax;
                missiondistanceminselect.value = refsettings.missionsdistancemin;
                missiondistancemaxselect.value = refsettings.missionsdistancemax;
            }

            handleCheckboxChanged();
        },false);

        let messagearea = flexarea.appendChild(document.createElement('div'));
        messagearea.className = 'bannergress-add-on-messagearea';

        return flexarea;
    }

    function DOMinsertAfter(referenceNode, newNode) {
        if (!referenceNode || !referenceNode.parentNode || !newNode) {
            console.log('DEBUG DOMinsertAfter error',referenceNode,referenceNode?.parentNode,referenceNode?.nextSibling,newNode);
        }
        referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
    }

    let queryfoundlist = {};
    function monitorquerySelectorUntilFound(query,callbackfound,callbacklost) {
        if (!(query in queryfoundlist)) {
            queryfoundlist[query] = false;
        } else {
            console.log('query already exists',query);
        }
        document.body.addEventListener("DOMNodeInserted", function() {
            let element = document.querySelector(query);
            if (element) {
                if (!queryfoundlist[query]) {
                    queryfoundlist[query] = true;
                    if (typeof callbackfound == 'function') callbackfound(element);
                }
            } else if (queryfoundlist[query]) {
                queryfoundlist[query] = false;
                if (typeof callbacklost == 'function') callbacklost();
            }
        });
    }

    function removeFilter(filter) {
        if (addonfilters[filter]) {
            addonfilters[filter].remove();
            delete(addonfilters[filter]);
        }

        let element = document.querySelector(`.bannergress-add-on-filterarea-${filter}`);
        if (element) element.remove();
    }
    function addFilter(refsettings,filter,element) {
        if (!settings.enablefilters) {
            removeFilter(filter);
            return;
        }
        if (document.querySelector(`.bannergress-add-on-filterarea-${filter}`)) return; // already exists
        if (typeof element == 'string' && element != '') element = document.querySelector(element);
        if (typeof element != 'object' || !element) return;
        addonfilters[filter] = createFilter(refsettings,filter);
        DOMinsertAfter(element,addonfilters[filter]);
        applyBannerListFilters(refsettings);
    }

    function setupFilters() {
        for (let page in bannerlistpages) {
            let filter;
            let name;
            if (typeof bannerlistpages[page] == 'object' && !(bannerlistpages[page] instanceof Array)) {
                filter = bannerlistpages[page].filter;
                name = bannerlistpages[page].name;
            } else if (typeof bannerlistpages[page] == 'string') {
                filter = bannerlistpages[page];
                name = filter;
            }

            if (filter in settings) {
                monitorquerySelectorUntilFound(`${page} .filter-and-sort`,function(element) {
                    addFilter(settings[filter],name,element);
                });
                monitorquerySelectorUntilFound(`${page} .banner-list`,function(element) {
                    applyBannerListFilters(settings[filter]);
                    element.addEventListener("DOMNodeInserted", function() {
                        applyBannerListFilters(settings[filter]);
                    }, false);
                });
            }
        }
    }

    function setupMapOverviewStyles() {
        monitorquerySelectorUntilFound('.map-overview',function(element) {
            updateMapStyles();
        });
    }

    function syncOtherCheckboxes(list,sourceelement) {
        // sync checkbox status to other of the same checkboxes on the page:
        if (list.length <= 1) return;
        let sourcechecked;
        let sourcedisabled;
        if (sourceelement.querySelector('input[type=checkbox]')) {
            sourcechecked = sourceelement.querySelector('input[type=checkbox]').checked;
            sourcedisabled = sourceelement.querySelector('input[type=checkbox]').disabled;
        } else if (sourceelement.querySelector('.bg-switch')) {
            sourcechecked = sourceelement.querySelector('.bg-switch').checked;
            sourcedisabled = sourceelement.querySelector('.bg-switch').disabled;
        } else {
            return;
        }
        for (let item of list) {
            if (item != sourceelement) {
                let checkboxelement = item.querySelector('input[type=checkbox]');
                if (checkboxelement) {
                    checkboxelement.checked = sourcechecked;
                    checkboxelement.disabled = sourcedisabled;
                    item.style.cursor = (sourcedisabled ? 'not-allowed' : 'pointer');
                    checkboxelement.style.cursor = (sourcedisabled ? 'not-allowed' : 'pointer');
                }
                let switchelement = item.querySelector('.bg-switch');
                if (switchelement) {
                    switchelement.setChecked(sourcechecked);
                    switchelement.setDisabled(sourcedisabled);
                }
            }
        }
    }

    function createMobileFriendlyCheckbox() {
        let checkboxarea = document.createElement('label');
        checkboxarea.className = 'bannergress-add-on-checkbox-mobilefriendly';
        checkboxarea.style.cursor = 'pointer';
        checkboxarea.style.whiteSpace = 'nowrap';
        checkboxarea.style.fontSize = 'small';
        let checkbox = checkboxarea.appendChild(document.createElement('input'));
        checkbox.type = 'checkbox';
        checkbox.checked = settings.mobilefriendly;
        checkboxarea.appendChild(document.createTextNode(' Mobile friendly'));
        checkbox.addEventListener('change', function(e) {
            //e.preventDefault();
            e.stopPropagation();
            settings.mobilefriendly = this.checked;
            storesettings();
            applyMobileFriendlyStyleChanges();

            syncOtherCheckboxes(document.querySelectorAll('.bannergress-add-on-checkbox-mobilefriendly'),checkboxarea);
        },false);
        return checkboxarea;
    }

    function setupMobileFriendlyCheckbox() {
        applyMobileFriendlyStyleChanges();

        monitorquerySelectorUntilFound('a.brand-menu',function(element) {
            let logo = element.querySelector('div.brand-logo');
            logo.innerHTML = ''; // remove the &nbsp;

            let divarea = logo.appendChild(document.createElement('div'));
            divarea.style.display = 'flex';

            let checkboxarea = divarea.appendChild(createMobileFriendlyCheckbox(true));
            checkboxarea.style.paddingLeft = '55px';
            checkboxarea.style.paddingTop = '38px';

            let infoarea = divarea.appendChild(document.createElement('div'));
            infoarea.style.paddingLeft = '5px';
            infoarea.style.paddingTop = '37px';
            infoarea.title = 'Bannergress Add-on Information';
            let infobutton = infoarea.appendChild(document.createElement('a'));
            infobutton.innerHTML = infoicon;
            infobutton.style.cursor = 'help';

            infobutton.addEventListener('click', function(e) {
                e.preventDefault();
                toggleAbout();
            },false);

            // checkbox will be placed inside nested inside element a, so this needs a workaround:
            element.addEventListener('click', function(e) {
                if (e.target == checkboxarea || e.target == checkboxarea.querySelector('input[type=checkbox]')) {
                    e.preventDefault();
                    checkboxarea.querySelector('input[type=checkbox]').checked = !checkboxarea.querySelector('input[type=checkbox]').checked;
                    checkboxarea.querySelector('input[type=checkbox]').dispatchEvent(new CustomEvent('change'));
                } else if (e.target == infobutton) {
                    e.preventDefault();
                }
            },false);
            // clicking the checkbox itself does a weird change and change back, use this workaround:
            checkboxarea.querySelector('input[type=checkbox]').addEventListener('click', function(e) {
                let statewhenclicked = this.checked;
                let _this = this;
                setTimeout(function() { // timeout makes sure this is executed after the initial change event
                    if (statewhenclicked != _this.checked) {
                        _this.checked = statewhenclicked;
                        _this.dispatchEvent(new CustomEvent('change'));
                    }
                });
            });

        });
    }

    function setupHomepageMonitor() {
        monitorquerySelectorUntilFound('.announcement-and-recent-banners .recent-banners .banner-list',function(element) {
            let addonmessage = document.createElement('div');
            addonmessage.className = 'bannergress-add-on-info';
            let infotext = addonmessage.appendChild(document.createElement('div'));

            if (!document.querySelector('.user-banner-list-preview')) {
                infotext.appendChild(document.createTextNode('You must sign in first to enable banner to-do, done, hidden filters'));

                let signinbutton = addonmessage.appendChild(document.createElement('button'));
                signinbutton.className = 'sign-in-button';
                signinbutton.innerText = 'Sign In';

                signinbutton.addEventListener('click', function(e) {
                    e.preventDefault();
                    document.querySelector('.sign-in-button').click();
                },false);

                let mobilefriendlycheckboxarea = addonmessage.appendChild(createMobileFriendlyCheckbox());
                mobilefriendlycheckboxarea.style.marginLeft = '12px';
            } else {
                infotext.appendChild(document.createTextNode('Click on My Lists, to show all your to-do, done, hidden banners.'));
                let previewtext = addonmessage.appendChild(document.createElement('div'));
                previewtext.innerHTML = "<h2>My Lists Preview:</h2>";
            }

            DOMinsertAfter(document.querySelector('.announcement-and-recent-banners .issues-list'),addonmessage);
        });
    }

    function createMapWaypointsLink(waypoints,originfirstwaypoint = false) {
        let link = "https://www.google.com/maps/dir/?api=1"; // maps.google.com did not work on android
        if ((navigator.platform.indexOf("iPhone") != -1) ||
            (navigator.platform.indexOf("iPad") != -1) ||
            (navigator.platform.indexOf("iPod") != -1)) {
            link = link.replace('http:','maps:'); /* if we're on iOS, open in Apple Maps */
        }
        let latlngwaypoints = [];
        for (let latlng of waypoints) {
            latlngwaypoints.push(latlng);
        }
        if (latlngwaypoints.length > 0) {
            link += '&destination=' + latlngwaypoints.pop(); // only=first=last
        }
        if (originfirstwaypoint && latlngwaypoints.length > 0) {
            link += '&origin=' + latlngwaypoints.shift();
        }
        if (latlngwaypoints.length > 0) {
            link += '&waypoints=' + latlngwaypoints.slice(0,9).join('|').replaceAll(',','%2C').replaceAll('|','%7C');
        }
        return link;
    };

    function createMissionsMapLink(element) {
        if (!settings.enablemapslinks) return;

        if (element.querySelector('.bannergress-add-on-map-link'))return;
        if (!element.querySelector('.mission-info')) return;
        let missioninfo = element.querySelector('.mission-info');
        if (!missioninfo) return;

        let waypoints = [];
        let portals = element.querySelectorAll('.step-card-title a');
        for (let portal of portals) {
            let destionationmatch = portal.href.match(/(destination|q)=([\d.]+,[\d.]+)/); // desktop: https://www.google.com/maps/dir/?api=1&destination=lat,lng, mobile: geo:lat,lng?q=lat,lng
            if (destionationmatch) {
                waypoints.push(destionationmatch[2]);
            }
        }
        if (!waypoints.length) return;

        let slicecnt = 0;
        let maxwaypoints = 10;
        while (slicecnt < waypoints.length) {
            let maplinkarea = document.createElement('div');
            maplinkarea.className = 'bannergress-add-on-map-link';
            let maplinksubarea = maplinkarea.appendChild(document.createElement('div'));
            let maplink = maplinksubarea.appendChild(document.createElement('a'));
            maplink.target = '_blank';
            maplink.href = createMapWaypointsLink(waypoints.slice(slicecnt,slicecnt + maxwaypoints));
            maplink.innerText = 'Google Maps directions' + (waypoints.length > maxwaypoints ? ` (${slicecnt+1}-${(slicecnt+maxwaypoints<waypoints.length?slicecnt+maxwaypoints:waypoints.length)} portals)` : '');
            missioninfo.appendChild(maplinkarea);

            let maplinkarea2 = document.createElement('div');
            maplinkarea2.className = 'bannergress-add-on-map-link';
            let maplinksubarea2 = maplinkarea2.appendChild(document.createElement('div'));
            let maplink2 = maplinksubarea2.appendChild(document.createElement('a'));
            maplink2.target = '_blank';
            maplink2.href = createMapWaypointsLink(waypoints.slice(slicecnt,slicecnt + maxwaypoints),true);
            maplink2.innerText = 'Google Maps waypoints only' + (waypoints.length > maxwaypoints ? ` (${slicecnt+1}-${(slicecnt+maxwaypoints<waypoints.length?slicecnt+maxwaypoints:waypoints.length)} portals)` : '');
            missioninfo.appendChild(maplinkarea2);

            slicecnt += maxwaypoints - 1;
        }
    }

    function updateMissionDetails() {
        if (!missiondata) return;
        // update details:
        let expandedmissionslength = document.querySelector('.bannergress-add-on-expandedmissionslength');
        if (expandedmissionslength) {
            let expandedmissionslengthsum = [...document.querySelectorAll('.mission-card')].map((missioncard,index)=>{return (missioncard.querySelector('.mission-info') ? missiondata.missions[index].lengthMeters : 0);}).reduce((lengthMetersSum, lengthMeters) => lengthMetersSum + lengthMeters, 0);
            expandedmissionslength.innerText = expandedmissionslengthsum;
        }
        // show actual mission lengths
        [...document.querySelectorAll('.mission-card')].map((missioncard,index)=>{let firstinfo = missioncard.querySelector('.mission-info-logo-and-text'); let actuallength = missioncard.querySelector('.bannergress-add-on-actuallength'); if (firstinfo && !actuallength) { actuallength = document.createElement('div'); actuallength.className = 'mission-info-logo-and-text'; actuallength.classList.add('bannergress-add-on-actuallength'); actuallength.innerText = '(' + missiondata.missions[index].lengthMeters + ' m)'; firstinfo.parentNode.insertBefore(actuallength, firstinfo.nextSibling); } });
        let expandedmissionstotal = document.querySelector('.bannergress-add-on-expandedmissionstotal');
        if (expandedmissionstotal) {
            expandedmissionstotal.innerText = [...document.querySelectorAll('.mission-card')].filter((missioncard)=>{return missioncard.querySelector('.mission-info');}).length;
        }
    }

    function setupBannerMonitor() {
        monitorquerySelectorUntilFound('.banner-info-card',function(element) {
            // mission info can have different objectives with different positions, and can be in different languages
            // there is no class defined for the different objectives
            // To overcome this problem, we will call the API to get the mission data, and find the passphrase data in there

            if (document.location.pathname.match(/^\/(new|preview)-banner$/)) return; // ignore new-banner and preview-banner pages

            let apiurl = window.location.href.replace(/^.*\//,"https://api.bannergress.com/bnrs/");
            let xhr = new XMLHttpRequest();
            xhr.open('GET',apiurl);
            xhr.onload = function() {
                let passphrasewarning = document.createElement('div');
                let missionlength = document.createElement('div');
                missionlength.className = 'banner-info-item';
                let expandedmissionslength = document.createElement('div');
                expandedmissionslength.className = 'banner-info-item';
                let distancebetweenmissions = document.createElement('div');
                distancebetweenmissions.className = 'banner-info-item';
                let missioncardlength = document.createElement('div');
                missioncardlength.className = 'bannergress-add-on-missiondetails';
                missioncardlength.classList.add('bannergress-add-on-missioncardlength');
                if (xhr.status != 200) {
                    console.warn(`Error ${xhr.status}: ${xhr.statusText}`,xhr);
                    passphrasewarning.innerText = 'passphrase details NOT found';
                    passphrasewarning.style.backgroundColor = 'red';
                    passphrasewarning.style.color = 'black';
                } else { // show the result
                    missiondata = JSON.parse(xhr.response);
                    let objectivecount = {};
                    for (let objectives of Object.values(missiondata.missions).map((mission)=>{return mission.steps.map((step)=>{return (step.objective || "hidden");})})) {
                        objectives.forEach(objective => {
                            objectivecount[objective] = (objectivecount[objective] || 0) + 1;
                        });
                    }
                    let lengthMetersSum = Object.values(missiondata.missions).map((mission)=>{return mission.lengthMeters;}).reduce((lengthMetersSum, lengthMeters) => lengthMetersSum + lengthMeters, 0);
                    missionlength.innerHTML = 'Individual missions length (sum): <span class="bannergress-add-on-missiondetails bannergress-add-on-missionslength">' + lengthMetersSum + '</span> m';

                    let expandedMissionsLengthSum = 0;
                    expandedmissionslength.innerHTML = '<span class="bannergress-add-on-missiondetails bannergress-add-on-expandedmissionstotal">0</span> Expanded missions. Length (sum): <span class="bannergress-add-on-missiondetails bannergress-add-on-expandedmissionslength">' + expandedMissionsLengthSum + '</span> m';

                    let distancebetweenmissionsdiff = missiondata.lengthMeters - lengthMetersSum;
                    distancebetweenmissions.innerHTML = 'Calculated distance between missions: ' + distancebetweenmissionsdiff + ' m';

                    missioncardlength.innerText = '(' + missiondata.lengthMeters + ' m)';

                    console.log(missiondata);
                    //console.log(objectivecount);
                    let passphraseactions = objectivecount.enterPassphrase || 0;
                    if (passphraseactions > 0) {
                        passphrasewarning.innerText = 'Passphrase actions: ' + passphraseactions;
                        passphrasewarning.style.backgroundColor = 'yellow';
                        passphrasewarning.style.color = 'black';
                    } else {
                        passphrasewarning.className = 'banner-info-item';
                        passphrasewarning.innerText = 'NO passphrase actions';
                    }
                    console.log(passphrasewarning.innerText);
                }
                DOMinsertAfter(document.querySelector('.banner-card-picture-container'),passphrasewarning);
                DOMinsertAfter(passphrasewarning,missionlength);
                DOMinsertAfter(missionlength,expandedmissionslength);
                DOMinsertAfter(expandedmissionslength,distancebetweenmissions);
                distancebetweenmissions.nextSibling.appendChild(missioncardlength);
            };
            xhr.send();

            // always show to top-menu:
            document.querySelector('.top-menu').classList.remove('hide-on-mobile');

            addToggleOfflineOverlayButton(document.querySelector('.banner-card'));
        });
        monitorquerySelectorUntilFound('.mobile-switch-switch-button.active',function(element) {
            // return to last selected tab
            let tabbuttons = document.querySelectorAll('.mobile-switch-switch-button');
            let tabnames = [...tabbuttons].map((el)=>{return el.innerText;});
            let activetab = document.querySelector('.mobile-switch-switch-button.active');
            let activetabname = activetab.innerText;
            let lasttabnumber = tabnames.indexOf(settings.bannerlasttab);

            setTimeout(function() { // wait until buttons have their click events set up
                if (settings.bannerurl == document.location.pathname && settings.bannerexpandlist.match(/1/) && settings.bannerlasttab != 'Missions') {
                    tabbuttons[tabnames.indexOf('Missions')].click();
                }

                if (lasttabnumber != -1 && settings.bannerlasttab != activetabname) {
                    // activate tab
                    tabbuttons[lasttabnumber].click();
                }
            });

            // record tab clicks to store last used tab:
            [...tabbuttons].map((el)=>{
                el.addEventListener('click',function(e) {
                    settings.bannerlasttab = this.innerText;
                    storesettings();
                },false);
            });
        });
        monitorquerySelectorUntilFound('.mission-card',function(element) {
            let missions = document.querySelectorAll('.mission-card');
            if (settings.bannerurl == document.location.pathname && settings.bannerexpandlist.match(/1/)) { // only restore for same banner
                // restore expand state
                setTimeout(function() { // wait until buttons have their click events set up
                    let expandallbutton = document.querySelector('.ant-btn.bg-button.bg-button-default');
                    if (!settings.bannerexpandlist.match(/0/) && expandallbutton) {
                        expandallbutton.click();
                        [...document.querySelectorAll('.mission-card')].map((el)=>{createMissionsMapLink(el);});
                    } else {
                        let expandlist = JSON.parse(settings.bannerexpandlist);
                        for (let cnt = 0; cnt < expandlist.length; cnt++) {
                            if (expandlist[cnt]) {
                                missions[cnt].querySelector('.mission-header').click();
                                createMissionsMapLink(missions[cnt]);
                            }
                        }
                    }
                    updateMissionDetails();
                });
            }

            // record expand clicks to store last expand state:
            [...missions].map((el)=>{
                el.querySelector('.mission-header').addEventListener('click',function(e) {
                    setTimeout(function() { // place in a timeout, to execute after handling the default expand action
                        // store expand state
                        let expandlist = [...document.querySelectorAll('.mission-card')].map((el)=>{return (el.querySelector('.mission-info') ? 1 : 0);});
                        settings.bannerurl = document.location.pathname;
                        settings.bannerexpandlist = JSON.stringify(expandlist);
                        storesettings();
                        createMissionsMapLink(el);
                        updateMissionDetails();
                    });
                },false);
            });
        });
        monitorquerySelectorUntilFound('.ant-btn.bg-button.bg-button-default',function(element) {
            element.addEventListener('click',function(e) {
                setTimeout(function() { // place in a timeout, to execute after handling the default expand action
                    // store expand state
                    let expandlist = [...document.querySelectorAll('.mission-card')].map((el)=>{return (el.querySelector('.mission-info') ? 1 : 0);});
                    settings.bannerurl = document.location.pathname;
                    settings.bannerexpandlist = JSON.stringify(expandlist);
                    storesettings();
                    [...document.querySelectorAll('.mission-card')].map((el)=>{createMissionsMapLink(el);});
                    updateMissionDetails();
                });
            },false);
        });
    }

    function removeMainMenuButtons() {
        let buttons = document.querySelectorAll('a[name=my-lists-button],a[name=last-banner-button]');
        for (let button of buttons) {
            button.remove();
        }
    }
    function addMainMenuButtons(mainmenu) {
        if (!mainmenu) return;
        if (mainmenu.querySelectorAll('a[name=my-lists-button],a[name=last-banner-button]').length) return; // already exists
        if (!document.querySelector('.menu-main')) return; // there is no menu main

        let mylistbutton = document.createElement('a');
        mylistbutton.name = 'my-lists-button';
        mylistbutton.setAttribute('href',settings.lasturluser);
        mylistbutton.style.whiteSpace = 'nowrap';
        mylistbutton.innerHTML = mylistsicon + 'My Lists\n';
        if (document.location.pathname.match(/^\/user/)) {
            mylistbutton.className = 'active';
        }
        DOMinsertAfter(mainmenu.firstChild,mylistbutton);

        let lastbannerbutton = document.createElement('a');
        lastbannerbutton.name = 'last-banner-button';
        lastbannerbutton.setAttribute('href',settings.lasturlbanner);
        lastbannerbutton.style.whiteSpace = 'nowrap';
        lastbannerbutton.innerHTML = bannericon + 'Banner\n';
        if (document.location.pathname.match(/^\/banner/)) {
            lastbannerbutton.className = 'active';
        }

        let mapButton = [...mainmenu.querySelectorAll('a')].filter((el)=>{return el.href.match(/\/map/); });
        if (mapButton.length) {
            DOMinsertAfter(mapButton[0],lastbannerbutton);
        }
    }
    function addTopMainMenuButtons() {
        let mainmenu = document.querySelector('.top-menu .menu-main');
        if (mainmenu) addMainMenuButtons(mainmenu);
    }
    function addBottomMainMenuButtons() {
        let mainmenu = document.querySelector('.bottom-menu .menu-main');
        if (mainmenu) addMainMenuButtons(mainmenu);
    }
    let backupmainmenubuttons = {};
    function replaceBrowseButton(mainmenu,menulocation) { // menulocation = top or bottom
        if (!mainmenu) return;
        let browsebutton = [...mainmenu.querySelectorAll('a')].filter((el)=>{return el.href.replace(document.location.origin,'').match(/^\/browse/)});
        if (!browsebutton.length) return;
        browsebutton = browsebutton[0];
        if (browsebutton.name == 'browse-button-' + menulocation) return; // already replaced

        backupmainmenubuttons['browse-button-' + menulocation] = browsebutton;
        let newbutton = browsebutton.cloneNode(true); // remove all event listeners
        newbutton.name = 'browse-button-' + menulocation;
        if (newbutton.classList.contains('active')) {
            settings.lasturlbrowse = document.location.href.replace(document.location.origin,'');
            storesettings();
        }
        newbutton.href = settings.lasturlbrowse;
        browsebutton.replaceWith(newbutton);
    }
    function replaceMapButton(mainmenu,menulocation) { // menulocation = top or bottom
        if (!mainmenu) return;
        let mapbutton = [...mainmenu.querySelectorAll('a')].filter((el)=>{return el.href.replace(document.location.origin,'').match(/^\/map/)});
        if (!mapbutton.length) return;
        mapbutton = mapbutton[0];
        if (mapbutton.name == 'map-button-' + menulocation) return; // already replaced

        backupmainmenubuttons['map-button-' + menulocation] = mapbutton;
        let newbutton = mapbutton.cloneNode(true); // remove all event listeners
        newbutton.name = 'map-button-' + menulocation;
        if (newbutton.classList.contains('active')) {
            settings.lasturlmap = document.location.href.replace(document.location.origin,'');
            storesettings();
        }
        newbutton.href = settings.lasturlmap;
        mapbutton.replaceWith(newbutton);
    }
    function restoreBrowseMapButtons() {
        for (let buttonname in backupmainmenubuttons) {
            let foundbutton = document.querySelector(`a[name=${buttonname}]`);
            if (foundbutton) {
                foundbutton.replaceWith(backupmainmenubuttons[buttonname]);
            }
        }
    }
    function monitorMainMenu() {
        // add a new 'My Lists' and 'Banner' icon
        // replace Browse and Map buttons
        monitorquerySelectorUntilFound('.top-menu .menu-main',function(element) {
            let menumainbuttons = element.querySelectorAll('a');
            for (let button of menumainbuttons) {
                button.addEventListener('click',function(e) {
                    hideAbout();
                },false);
            }

            let searchbutton = document.querySelector('button.search-input-button');
            if (searchbutton) {
                searchbutton.addEventListener('click',function(e) {
                    hideAbout();
                },false);
            }
            let mobilesearchbutton = document.querySelector('button.mobile-search-button');
            if (mobilesearchbutton) {
                mobilesearchbutton.addEventListener('click',function(e) {
                    hideAbout();
                },false);
            }

            if (settings.enablemainmenubuttons) {
                addMainMenuButtons(element);
            }

            if (settings.enablelastbrowsmapurls) {
                replaceBrowseButton(element,'top');
                replaceMapButton(element,'top');
            }
        });
        monitorquerySelectorUntilFound('.bottom-menu .menu-main',function(element) {
            let menumainbuttons = element.querySelectorAll('a');
            for (let button of menumainbuttons) {
                button.addEventListener('click',function(e) {
                    hideAbout();
                },false);
            }

            if (settings.enablemainmenubuttons) {
                addMainMenuButtons(element);
            }

            if (settings.enablelastbrowsmapurls) {
                replaceBrowseButton(element,'bottom');
                replaceMapButton(element,'bottom');
            }
        });
    }
    function monitorAccount() {
        monitorquerySelectorUntilFound('.agent-name span',function(element) {
            let agentname = element.innerText.trim();
            if (agentname && !settings.agentname) {
                settings.agentname = agentname;
                if (document.querySelector('input[name=bannergress-input-agentname]')) document.querySelector('input[name=bannergress-input-agentname]').value = settings.agentname;
                storesettings();
            }
        });
    }

    function signedIn() {
        return document.querySelector('.menu-user') != null;
    }

    function removeMyBannersMenuitem() {
        let element = document.querySelector('.addon-mybanners-menu-item');
        if (!element) return;
        element.remove();
    }
    function addMyBannersMenuitem(element) {
        if (!settings.mybannersmenu) return;
        if (!element) element = document.querySelector('[role=menuitem]');
        if (!element) return;
        let mybannersmenuitem = document.createElement('li');
        mybannersmenuitem.className = 'ant-dropdown-menu-item ant-dropdown-menu-item-only-child addon-mybanners-menu-item';
        mybannersmenuitem.setAttribute('role','menuitem');
        mybannersmenuitem.textContent = 'My Banners';
        mybannersmenuitem.addEventListener('click',function(e) {
            e.preventDefault();
            if (!settings.agentname) {
                let newinput = prompt('Use this agentname:',settings.agentname);
                if (typeof newinput == 'string') newinput = newinput.trim();
                if (!newinput) return;
                settings.agentname = newinput;
                if (document.querySelector('input[name=bannergress-input-agentname]')) document.querySelector('input[name=bannergress-input-agentname]').value = settings.agentname;
                storesettings();
            }
            location.href = '/agent/' + settings.agentname;
        },false);
        DOMinsertAfter(element,mybannersmenuitem);
    }

    function setupSearchMonitor() {
        monitorquerySelectorUntilFound('.search-input',function(element) {
            element.addEventListener('blur',function(e) { // first search input from menu-main
                settings.lastsearchtext = this.value;
                storesettings();
                if (document.querySelector('.mobile-search-bar .search-input')) document.querySelector('.mobile-search-bar .search-input').value = settings.lastsearchtext; // sync to mobile search input (not always available)
                let agentlink = document.querySelector('.bannergress-add-on-map-searchagentlink');
                if (agentlink) {
                    agentlink.innerText = settings.lastsearchtext;
                    agentlink.href = '/agent/' + encodeURIComponent(encodeURIComponent(settings.lastsearchtext));
                }
            });
            if (settings.enablesearchtext) {
                for (let searchinput of document.querySelectorAll('.search-input')) {
                    searchinput.value = settings.lastsearchtext;
                }
            }
        });
        monitorquerySelectorUntilFound('.mobile-search-bar .search-input',function(element) {
            element.addEventListener('blur',function(e) { // mobile search input
                settings.lastsearchtext = this.value;
                storesettings();
                document.querySelector('.search-input').value = settings.lastsearchtext; // sync to menu-main search input (always available)
                let agentlink = document.querySelector('.bannergress-add-on-map-searchagentlink');
                if (agentlink) {
                    agentlink.innerText = settings.lastsearchtext;
                    agentlink.href = '/agent/' + encodeURIComponent(encodeURIComponent(settings.lastsearchtext));
                }
            });
            if (settings.enablesearchtext) {
                for (let searchinput of document.querySelectorAll('.search-input')) {
                    searchinput.value = settings.lastsearchtext;
                }
            }
        });
        monitorquerySelectorUntilFound('.search-content h1',function(element) {
            let agentlinkarea = document.createElement('div');
            agentlinkarea.textContent = 'View banners for agent ';
            let agentlink = agentlinkarea.appendChild(document.createElement('a'));
            agentlink.className = 'bannergress-add-on-map-searchagentlink';
            agentlink.innerText = settings.lastsearchtext;
            agentlink.href = '/agent/' + encodeURIComponent(encodeURIComponent(settings.lastsearchtext));
            DOMinsertAfter(element,agentlinkarea);
        });
    }

    function monitorSignedin() {
        function enableCheckboxes(area,listofnames) {
            for (let name of listofnames) {
                if (area.querySelector(`input[name=${name}]`)) {
                    area.querySelector(`input[name=${name}]`).disabled = false;
                    area.querySelector(`input[name=${name}]`).style.cursor = 'pointer';
                    area.querySelector(`input[name=${name}]`).parentElement.style.cursor = 'pointer';
                    area.querySelector(`input[name=${name}]`).parentElement.title = '';
                } else {
                    console.log('input not found',name,area,area.outerHTML);
                }
            }
        }

        function disableCheckboxes(area,listofnames) {
            for (let name of listofnames) {
                if (area.querySelector(`input[name=${name}]`)) {
                    area.querySelector(`input[name=${name}]`).disabled = true;
                    area.querySelector(`input[name=${name}]`).style.cursor = 'not-allowed';
                    area.querySelector(`input[name=${name}]`).parentElement.style.cursor = 'not-allowed';
                    area.querySelector(`input[name=${name}]`).parentElement.title = 'Sign in first';
                }
            }
        }

        monitorquerySelectorUntilFound('.menu-user',function() {
            for (let filterarea in addonfilters) {
                enableCheckboxes(addonfilters[filterarea],[`${filterarea}showdone`,`${filterarea}showtodo`,`${filterarea}showother`]);
                addonfilters[filterarea].disableLastCheckboxDoneTodoOther();
            }
            if ('mapdesktop' in addonfilters || 'mapmobile' in addonfilters) {
                updateMapStyles();
            }
        },function() {
            for (let filterarea in addonfilters) {
                disableCheckboxes(addonfilters[filterarea],[`${filterarea}showdone`,`${filterarea}showtodo`,`${filterarea}showother`]);
            }
            if ('mapdesktop' in addonfilters || 'mapmobile' in addonfilters) {
                clearMapStyles();
            }
        });

        // auto sign in:
        monitorquerySelectorUntilFound('.sign-in-button',function(element) {
            // wait until sign-in-button appears
            // the button is replaced with an actual sign-in button, or a signed in profile image with a user menu
            element.addEventListener("DOMNodeRemoved", function() {
                setTimeout(function() { // wait a moment, until button replace is finished
                    if (document.querySelector('.sign-in-button') && !document.querySelector('.menu-user') && settings.autosignin) document.querySelector('.sign-in-button').click();
                });
            });
        });

        monitorquerySelectorUntilFound('[role=menuitem]',function(element) {
            addMyBannersMenuitem(element);

            let menuitems = document.querySelectorAll('[role=menuitem]');
            for (let menuitem of menuitems) {
                menuitem.addEventListener('click',function(e) {
                    hideAbout();
                },false);
            }

            let logoutmenulist = [...menuitems].filter((el)=>{return el.innerText == 'Logout'});
            if (logoutmenulist.length == 1) {
                logoutmenulist[0].addEventListener('click',function(e) {
                    settings.autosignin = false;
                    storesettings();
                },false);
            }
        });
    }

    function setActiveButton() {
        // since the buttons are replaced by new eventless buttons, the active one must be set/reset from here:
        let buttons = document.querySelectorAll('.menu-main a'); // this will get the top-menu and bottom-menu buttons
        for (let button of buttons) {
            let buttonmatches = button.href.replace(document.location.origin,'').match(/^\/(user|browse|map|banner)/);
            if (buttonmatches) {
                if (document.location.pathname.match(new RegExp(`^/${buttonmatches[1]}`))) { // path matches, make button active
                    if (!button.classList.contains('active')) button.classList.add('active');
                } else { // make button not active
                    if (button.classList.contains('active')) button.classList.remove('active');
                }
            }
        }
    }

    function storeLastUsedURL() {
        let url = document.location.href.replace(document.location.origin,'');
        let urlmatches = url.match(/^\/(user|browse|map|banner)/);
        if (!urlmatches || settings[`lasturl${urlmatches[1]}`] == url) return; // nothing changed

        settings[`lasturl${urlmatches[1]}`] = url; // lasturluser lasturlbrowse lasturlmap lasturlbanner
        storesettings();

        // replace buttons url:
        if (url.match(/^\/(browse|map)/) && !settings.enablelastbrowsmapurls) return;
        let buttons = [...document.querySelectorAll('.menu-main a')].filter((el)=>{return el.href.replace(document.location.origin,'').match(new RegExp(`^/${urlmatches[1]}`)); });
        for (let button of buttons) {
            button.href = url;
        }
    }

    function enableOfflineCheckboxes(offlinechecked) {
        let checkboxes = document.querySelectorAll('[class$=-offlinebuttons] input[type=checkbox]');
        for (let checkbox of checkboxes) {
            checkbox.disabled = !offlinechecked;
            if (offlinechecked) {
                checkbox.style.cursor = 'pointer';
                checkbox.parentElement.style.cursor = 'pointer';
                checkbox.parentElement.title = (checkbox.parentElement.innerText == 'Partially'?'Partially Offline':'');
            } else {
                checkbox.style.cursor = 'not-allowed';
                checkbox.parentElement.style.cursor = 'not-allowed';
                checkbox.parentElement.title = 'Enable Show offline banners first';
            }
        }
        if (document.querySelector('.user-banner-list-page')) {
            applyBannerListFilters(settings.mylists);
            if (addonfilters.mylists && typeof addonfilters.mylists.disableLastCheckboxOfflineOnline == 'function') addonfilters.mylists.disableLastCheckboxOfflineOnline();
        }
        if (document.querySelector('.places-banners')) {
            applyBannerListFilters(settings.browse);
            if (addonfilters.browse && typeof addonfilters.browse.disableLastCheckboxOfflineOnline == 'function') addonfilters.browse.disableLastCheckboxOfflineOnline();
        }
    }

    function getFilterSortOptions() {
        if (document.querySelector('.filter-and-sort>button') && !document.querySelector('.filter-and-sort-modal') && typeof offlinechecked == 'boolean') {
            offlinechecked = undefined;
        }

        // get the offline filter status (need to open/close the dialog once):
        let filterbutton = document.querySelector('.filter-and-sort>button');
        if (filterbutton && offlinechecked == undefined) {
            offlinechecked = 'buttonfound';
            setTimeout(function() { // run after a timeout (wait until page is ready)
                filterbutton.click();
                let backbutton = document.querySelector('.filter-and-sort-modal .back-button');
                if (backbutton && offlinechecked == 'buttonfound') {
                    backbutton.click();
                    let showofflinebannersline = document.querySelector('.filter-and-sort-modal .filter-and-sort-switch-row');
                    if (showofflinebannersline) {
                        let showofflinebannerscheckbox = showofflinebannersline.querySelector('button');
                        if (showofflinebannerscheckbox) {
                            offlinechecked = JSON.parse(showofflinebannerscheckbox.getAttribute('aria-checked'));
                            enableOfflineCheckboxes(offlinechecked);
                            showofflinebannerscheckbox.addEventListener('click',function(e) {
                                setTimeout(function() { // place in a timeout, to run after the other events for this checkbox
                                    offlinechecked = JSON.parse(showofflinebannerscheckbox.getAttribute('aria-checked'));
                                    enableOfflineCheckboxes(offlinechecked);
                                });
                            },false);
                        }
                    }
                }
            });
        }
    }

    function setupBodyListener() {
        document.body.addEventListener("DOMNodeInserted", function() {
            if (document.querySelector('section.ant-layout.main>div.container')) {
                setActiveButton();
                storeLastUsedURL();
            }

            getFilterSortOptions();
        });
    }

    function setup() {
        applyStyleOverride();
        applyAddonStyles();

        restoresettings();
        storesettings();

        monitorMainMenu();
        monitorAccount();

        setupMapOverviewStyles();

        setupFilters();

        setupMobileFriendlyCheckbox();

        setupHomepageMonitor();

        setupBannerMonitor();
        monitorSignedin();
        setupSearchMonitor();

        setupBodyListener();
    }

    setup();
})();
