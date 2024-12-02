// ==UserScript==
// @author         @Chyld314 @DanielOndiordna
// @name           IMATTC
// @version        1.12.4.20230113.110500
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/imattc.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/imattc.user.js
// @description    Ingress Mission Authoring Tool Total Conversion, adding categories for missions, show banner preview, export json, download images, and more.
// @id             imattc@DanielOnDiordna
// @category       Mission Creator
// @match          http://missions.ingress.com/
// @match          http://missions.ingress.com/edit*
// @match          https://missions.ingress.com/
// @match          https://missions.ingress.com/edit*
// @match          https://missions.ingress.com/about
// @grant          none
// ==/UserScript==


// removed from the Tampermonkey headers:
// @require      https://code.jquery.com/ui/1.10.4/jquery-ui.min.js

var imattcversion = "1.12.4.20230113.110500";
var changelog = `
Changelog:

version 1.12.4.20230113.110500
- hide the not-working submit button displayed with the checkboxes buttons (not implemented yet)

version 1.12.3.20230108.203000
- fixed Preview Images rows when using browser zoom

version 1.12.2.20220808.203900
- fixed category selector for new missions to remember category title instead of index
- hide the create new mission button when processing checked missions (it still flashes in view)
- added button counter for move button, disable when 0 checkboxes are checked
- fixed enabling checkbox buttons when using the Toggle all checkboxes button

version 1.12.1.20220807.224600
- added checkbox button to discard drafts of published missions
- added button counters when selecting missions with checkboxes, buttons disable when 0 checkboxes are checked

version 1.12.0.20220710.000300
- changed preview image formatting to match Prime spacing, reduced image download size (=s136)

version 1.11.5.20220613.235700
- checkboxes can now also be selected by clicking on the mission image, title and icon
- downloaded JSON filenames will now get the category name as a prefix text, and the timestamp at the end
- downloaded image filenames will now get the category name as a prefix text
- fixed the timestamp formatting
- imported category data (file or clipboard) is now checked for valid formatting first
- added a warning to reload and sign in again if the page shows a certain welcome message after some time of inactivity
- plugin source code indentation applied

version 1.11.4.20220610.193900
- moved the category selector at the preview screen for new missions next to the submit button instead of above

version 1.11.3.20220609.234400
- moved Category buttons into a Category drop down menu
- added Category menu options to import/export category data as a file
- added Category menu options to delete all category data
- fixed scroll location when using buttons to move a category up or down
- added a mission menu item Download Image for every single mission

version 1.11.2.20220608.183700
- fixed download json for Android Kiwi browser with Tampermonkey and iOS Safari with Userscripts extension

version 1.11.1.20220607.215600
- fixed the search button icon in edit mission screen by overriding the bootstrap .input-group-btn font-size
- fixed the mission preview showing as transparant
- increased font size for massive delete/unpublish/withdraw notification text
- added a cancel button while executing a massive delete/unpublish/withdraw
- removed footer with about link at the editor screens
- set and store the selected category when submitting a mission

version 1.11.0.20220606.235700
- increased plugin initialization speed, removed timers, replaced with page observer
- added powered by message at the login screen
- added about IMATTC message at the about screen and an about link at the footer of the missions screen
- added an Download JSON button for all missions in a category, compatible with UMM json files
- added an Download Images button to mass download separate files for each mission image in a category
- added a default mission type radio button for new missions
- added checkbox actions for massive delete/unpublish/withdraw actions
- changed mission preview map to 100% width
- swapped the Move up and Move down button positions, better for smaller screens
- replaced some jquery functions with non jquery methods to prevent console log errors at the log on screen

version 1.10.0.20220519.220900:
- added a Submit mission menu item for missions with Draft status

version 1.9.0.20220221.161700:
- created a modified version from source https://github.com/andyjennings314/IMATTC/blob/master/IMATTC.user.js (version 1.8.1)
- moved localstorage actions to functions
- added username to storage to support multiple user logins in same browser profile
- changed border size to 100% width and missions to 16.6% width (100/6) to fit 6 missions per row
- changed menu link "Add to Category" to "Move to Category"
- changed menu link "Remove from Category" to "Move to Unsorted Missions"
- fixed unsortedCollapse restore status, default to false
- fixed userscript headers to work under IITC-CE the Button extension
- removed header require jquery-ui.min.js
- fixed preview image title category name
- added checkboxes for massive move actions
- added store settings action when changing sort direction within a category
- changed mission width to 1/6 of the screen, to fit 6 in a row
- fixed minimum mission width for smaller screens (mobile)
- added display of mission counts per category
- added category move up/down buttons
- added button to sort categories by titles (inverts sort direction when pressed again)
`;

var about = `Version ${imattcversion}

Ingress Mission Authoring Tool Total Conversion (IMATTC).

This userscript does the following modifications (and more):
1. Show missions in categories. Drag drop missions into categories.
2. Preview Images as a banner in rows of 6 missions.
3. Preview Route for all missions in a category.

Additions by DanielOndiordna (and more):
1. Display missions in rows of maximum 6 missions.
2. Download JSON, compatible with Ultimate Mission Maker (UMM) plugin
3. Download Images as separate files
4. Use checkboxes to select and move missions into a category
5. Use checkboxes to mass Delete or Unpublish missions
6. Rename a category, move categories up and down.
7. Support multiple users with personal category storage
8. Adjust width of missions to fill the screen
9. Select a default mission type (auto select) for new missions
10. Option to skip the mission type selection screen
11. Fixed the delete missions from category process
12. Rename a category
13. Show category totals

Source (version 1.8.1): https://github.com/andyjennings314/IMATTC/blob/master/IMATTC.user.js
Forks: https://github.com/andyjennings314/IMATTC/network/members
Github fork by DanielOndiordna: https://github.com/DanielOndiordna/IMATTC
Latest updates by DanielOndiordna: https://softspot.nl/ingress/#iitc-plugin-imattc.user.js
`;

(function() {
    // added to load the Jquery UI for Tampermonkey, Greasemonkey and the IITC-CE the Button extension:
    if (!document.head.querySelector('script[src="https://code.jquery.com/ui/1.10.4/jquery-ui.min.js"]')) {
        let insertJqUI = document.createElement('script');
        insertJqUI.setAttribute("type", "text/javascript");
        insertJqUI.setAttribute("src", "https://code.jquery.com/ui/1.10.4/jquery-ui.min.js");
        document.head.appendChild(insertJqUI);
    }

    if (typeof window.$ != 'function') { // inject jquery only if missing
        let insertJq = document.createElement('script');
        insertJq.setAttribute("type", "text/javascript");
        insertJq.setAttribute("src", "https://code.jquery.com/jquery-1.12.4.min.js");
        insertJq.onload = function() {
            window.$ = (window.jQuery || unsafeWindow.jQuery);
            init();
        }
        document.head.appendChild(insertJq);
    } else {
        init();
    }
})();

(function() {
    'use strict';
    //Latest version of Bootstrap, and correct version of jQuery
    //   $("link[href='vendor/bootstrap/css/bootstrap.css']").attr("href", "https://stackpath.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css");
    // non jquery method:
    let oldbootstraplink = document.head.querySelector('link[href="vendor/bootstrap/css/bootstrap.css"]');
    if (oldbootstraplink) {
        oldbootstraplink.setAttribute("href", "https://stackpath.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css");
    }

    //$('body').append('<script src="https://code.jquery.com/ui/1.10.4/jquery-ui.min.js"></script>');

    // Modify time conversion variables to ones with actual granularity
    if (typeof TimeConversionConstants != 'undefined') {
        TimeConversionConstants.MINUTE_GRANULARITY_MINUTES = 1;
        TimeConversionConstants.HOUR_GRANULARITY_MINUTES = 15;
        TimeConversionConstants.DAY_GRANULARITY_HOURS = 12;
    }

    //Build CSS rules
    let newCssRules = "" // "<style>"
    + ".navbar-my-missions {cursor: pointer;}"
    + ".list > .bordered-panel {padding: 15px;}"
    + ".list .missions-list,.missions-list .panel-body .row {display: flex;flex-wrap: wrap;}"
    + ".list .create-mission-button {margin: 0 5px;float: none!important;display: inline-block;}"
    + ".missions-list, .name-view .bordered-panel, .type-view .bordered-panel {opacity: 0; transition: opacity 0.5s}"
    + ".missions-list.ready, .name-view .bordered-panel.ready, .type-view .bordered-panel.ready {opacity:1}"
    + ".missions-list .mission {border-width: 2px;  margin: 10px 0 0; position: relative; padding: 5px; display: block;}"
    + ".list .mission .action-button {width: 100%; min-width: initial; max-width: initial;}"
    + ".mission-header-container {display: flex; align-items: stretch;}"
    + ".mission-header-container div:nth-of-type(1){padding-right: 5px; width: 60px}"
    + ".mission-header-container div:nth-of-type(2){width: calc(100% - 85px)}" // old value: 115px
    + ".mission-header-container div:nth-of-type(3){padding-left: 5px; width: 25px}" // old value: 45px
    + ".button, button {background-image: none;}"
    + ".mission .name.glyphicon {font-size: 20px;}" // old value: 40px
    + ".mission .name:not(.glyphicon) {text-align: center; display: block;}"
    + ".mission table {margin: 5px 0 10px;}"
    + ".missions-list .panel-default { border-color: #5afbea; background-color: black; border-radius: 0;}"
    + ".missions-list .panel-default>.panel-heading {color: #5afbea; background: #1f4549; border-radius: 0;}"
    + ".missions-list .panel-default>.panel-heading a:hover {color: #5afbea;}"
    + ".missions-list .panel-default>.panel-heading+.panel-collapse>.panel-body {border-top-color: black; padding-top: 0;}"
    + ".missions-list .panel-heading a:after {  font-family: 'Glyphicons Halflings';  content: '\\e114';  float: right;  color: 5afbea;  position: relative;  left: 10px; }"
    + ".missions-list .panel-heading h4.collapsed a:after {content: '\\e080'; }"
    + ".ui-state-highlight { border: 2px solid #5afbea; background: #1f4549; margin-top: 10px;display: block;padding: 0 15px; min-height: 100px;}"
    + ".modal {color: black;}"
    + ".banner-preview .modal-body {background-color: #222;}"
    + ".banner-preview .row {display: flex; flex-direction: row-reverse; flex-wrap:wrap-reverse!important}"
//  + ".banner-preview img {border-radius: 50%;border: 3px solid goldenrod;}"
    + ".banner-preview .col-xs-2 {padding-bottom: 8px;}"
    + `
    .editor .footer-buttons {
        position: absolute;
        bottom: 10px;
        right: 20px;
    }
    `;


    newCssRules += ".mission-list-item-published {background-image: none; background: #001a00; border-color: darkgreen;color: lightgreen;}"
        + ".list .mission .mission-title-published {color: lightgreen;}"
        + ".mission-list-item-published .table-bordered * {border-color: lightgreen;}"
        + ".mission-list-item-published .button {color: lightgreen; border-color: lightgreen; background-color: #004d00;}"
        + ".mission-list-item-published .button:hover {background-color: #003300;}"
        + ".mission-list-item-published .button .caret {border-bottom-color: lightgreen;}";

    newCssRules += ".mission-list-item-draft {background-image: none; background-color: #170703; border-color: #a42e12;color: #f7ba5f;}"
        + ".list .mission .mission-title-draft {color: #f7ba5f;}"
        + ".mission-list-item-draft .table-bordered * {border-color: #f7ba5f;}"
        + ".mission-list-item-draft .button {color: #f7ba5f; border-color: #f7ba5f; background-color: #8a280f;}"
        + ".mission-list-item-draft .button:hover {background-color: #73210d;}"
        + ".mission-list-item-draft .button .caret {border-bottom-color: #f7ba5f;}";

    newCssRules += ".mission-list-item-draft_of_published_mission {background-image: none; background-color: #1a1a00; border-color: olive;color: greenyellow;}"
        + ".list .mission .mission-title-draft_of_published_mission {color: greenyellow;}"
        + ".mission-list-item-draft_of_published_mission .table-bordered * {border-color: greenyellow;}"
        + ".mission-list-item-draft_of_published_mission .button {color: greenyellow; border-color: greenyellow; background-color: #666600;}"
        + ".mission-list-item-draft_of_published_mission .button:hover {background-color: #4d4d00;}"
        + ".mission-list-item-draft_of_published_mission .button .caret {border-bottom-color: greenyellow;}";

    newCssRules += ".mission-list-item-submitted {background-image: none; background-color: #181201; border-color: darkgoldenrod;color: gold;}"
        + ".list .mission .mission-title-submitted {color: gold;}"
        + ".mission-list-item-submitted .table-bordered * {border-color: gold;}"
        + ".mission-list-item-submitted .button {color: gold; border-color: gold; background-color: #916a08;}"
        + ".mission-list-item-submitted .button:hover {background-color: #785807;}"
        + ".mission-list-item-submitted .button .caret {border-bottom-color: gold;}";

    newCssRules += ".mission-list-item-disabled {background-image: none; background-color: #0d0d0d; border-color: #6b6b6b; color: red;}"
        + ".list .mission .mission-title-disabled {color: red;}"
        + ".mission-list-item-disabled .table-bordered * {border-color: red;}"
        + ".mission-list-item-disabled .button {color: red; border-color: red; background-color: #595959;}"
        + ".mission-list-item-disabled .button:hover {background-color: #4d4d4d;}"
        + ".mission-list-item-disabled .button .caret {border-bottom-color: red;}";

    newCssRules += ".mission-list-item-submitted_and_published {background-image: none; background-color: #0f1405; border-color: olivedrab;color: springgreen;}"
        + ".list .mission .mission-title-submitted_and_published {color: springgreen;}"
        + ".mission-list-item-submitted_and_published .table-bordered * {border-color: springgreen;}"
        + ".mission-list-item-submitted_and_published .button {color: springgreen; border-color: springgreen; background-color: #5c7a1f;}"
        + ".mission-list-item-submitted_and_published .button:hover {background-color: #4d6619;}"
        + ".mission-list-item-submitted_and_published .button .caret {border-bottom-color: springgreen;}";

    // to fit 6 missions on 1 line, each mission needs 1/6 of the screen width:
    // on small screens missions are flattend, so it needs a minimum width of 300px:
    // by lowering the padding (15 down to 1 on both sides), it fits more of the mission on the screen:
    newCssRules += ".col-md-3 { width: 16.6%; min-width: 300px; padding-right: 1px; padding-left: 1px }"
        + ".container { width: 100%; }";

    newCssRules += ".dropup {position: relative;}"
        + ".dropup .dropdown-menu {top: initial; bottom: 30px; left: 0; right: 0; text-align: center;}"
        + ".dropdown-menu > li > a {cursor: pointer;}"
        + ".editor .view {width: initial;height: initial;text-align: center;margin: 0;}"
        + ".editor .type-view, .editor .name-view  {width: 100%;}"
        + ".pagination>li>a {background: #0b0c0d;border-color: #5afbea;color: #5afbea; font-size: 18px;}"
        + ".pagination>li>a:hover {background: #2b2c2d;border-color: #5afbea;color: #5afbea;}"
        + ".pagination>li>a[disabled] {color: #ACAFAF;}"
        + ".pagination>li>a[disabled]:hover {cursor: default; background: #0b0c0d;border-color: #5afbea;color: #ACAFAF;}"
        + ".pagination>.active>a, .pagination>.active>a:hover {background-color: #5afbea;border-color: #5afbea;color: #0b0c0d;}"
        + ".type-view .btn.focus, .type-view .btn:focus, .type-view .btn:hover {color: unset;}"
        + ".type-view .btn.active.focus, .type-view .btn.active:focus, .type-view .btn.active:hover {color: #ebbc4a;}"
        + ".type-view .bordered-panel p {font-size: 20px;}"
        + ".stopthat {color: red; font-weight: bold;}"
        + "input.form-control, textarea.form-control {border: 1px solid #5afbea; background: none; border-radius: 0; color: white;}"
        + ".upload-logo .input-row .upload-label {display: block;padding: 0 0 10px;}"
        + ".upload-logo .input-row {display: block;}"
        + ".upload-logo .input-row .upload-logo-cell, .upload-logo .input-row .clear-logo-button {display: inline-block;padding: 0; max-width: 50%;}"
        + ".editor .waypoints-view .waypoints .waypoint.unselected {background-color: #000;}"
        + ".editor .waypoints-view .waypoints .waypoint .number {cursor: move;}"
        + ".preview-mission .body-panel .panel-container .map {height: unset;}"
        + ".preview-mission .body-panel .panel-container .category-dropdown {margin-top: 20px;}"
        + ".preview-mission .mission-header {margin: 0; width: 65%; float: left;)}"
        + ".preview-mission .mission-stats, .preview-mission .mission-description {max-width: 35%;float: right; display: inline-block;}"
        + "#previewMissionModel .loading-screen { top: 0; right: 0; position: relative; height: 40px;}"
        + "#previewMissionModel .loading.spin { position: fixed; left: 50%; top: 80px; }";
    //    + "</style>";
    //  $("head").append(newCssRules);

    // non jquery method:
    let newCssRulesstylesheet = document.head.appendChild(document.createElement('style'));
    newCssRulesstylesheet.innerHTML = newCssRules;
})();

function init() {
    const w = typeof unsafeWindow === 'undefined' ? window : unsafeWindow;

    function addaboutpagemessage() {
        let aboutul = document.querySelector('#about-page #container ul');
        if (!aboutul) return false;
        let abouthtml = about.replace(/(http[^\n ]+)/g,"<a href='$1' target='_blank'>$1</a>").replace(/\n/g,"<br>\n");
        if (document.querySelector('.aboutimattc')) return true; // already defined
        let li = document.createElement('li');
        li.className = 'aboutimattc';
        li.innerHTML = `IMATTC<br>
        ${abouthtml}`;
        let changelogbutton = li.appendChild(document.createElement('button'));
        changelogbutton.textContent = 'Changelog';
        changelogbutton.addEventListener('click',function(e) {
            alert(changelog);
        },false);
        aboutul.prepend(li);
    }
    function addpoweredbymessage(appendtoelement) {
        if (!appendtoelement) return false;
        if (document.querySelector('.poweredbyimattc')) return true; // already defined
        let div = appendtoelement.appendChild(document.createElement('div'));
        div.className = 'poweredbyimattc';
        div.style.color = "#489299";
        div.style.fontStyle = "italic";
        div.innerText = `Powered by IMATTC version ${imattcversion}`;
        return true;
    }
    function addfooter() {
        let footer = document.getElementById('footer');
        if (footer) return;
        footer = document.body.appendChild(document.createElement('div'));
        footer.id = "footer";
        footer.innerHTML = '<a href="/about" target="_blank">About</a>';
    }
    function removefooter() {
        let footer = document.getElementById('footer');
        if (!footer) return;
        footer.remove();
    }

    let currentpage = '';
    function detectPageChanged() {
        if (document.querySelector('#about-page') && currentpage != 'about') {
            currentpage = 'about';
            addaboutpagemessage();
            return currentpage;
        }
        if (document.querySelector('.landing-page') && currentpage != 'landing') {
            currentpage = 'landing';
            addpoweredbymessage(document.querySelector('.landing-page'));
            return currentpage;
        }
        if (document.querySelector('.container .editor') && currentpage != 'editor') {
            currentpage = 'editor';
            // console.log('editor-page');
            setupAngular();
            removefooter();
            return currentpage;
        }
        if (document.querySelector('.container .missions-list') && currentpage != 'missions') {
            currentpage = 'missions';
            // console.log('missions-page');
            setupAngular();
            addfooter();
            return currentpage;
        }
        return '';
    }

    // console.log('setup observer');
    let bodyobserver;
    function bodymutationcallback(mutations) {
        if (detectPageChanged()) {
            //console.log('page changed',currentpage);
        }
    }
    bodyobserver = new MutationObserver(bodymutationcallback);
    bodyobserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    detectPageChanged();

    let angularrunning = false;
    function setupAngular() {
        if (angularrunning) return;
        angularrunning = true;
        // console.log('find angular');
        let trycnt = 0;
        const initWatcher = setInterval(() => {
            if (w.angular) {
                trycnt++;
                let err = false;
                try {
                    initAngular();
                } catch (error) {
                    clearInterval(initWatcher);
                    err = error;
                    console.log('FAILED: initAngular',error);
                }
                if (!err) {
                    try {
                        clearInterval(initWatcher);
                        pageChange();
                    } catch (error) {
                        err = error;
                        console.log('FAILED: pageChange',error);
                    }
                    if (!err) console.log('initAngular ready, tries:',trycnt);
                }
            }
        }, 1000);
    }

    function initAngular() {
        const el = w.document.querySelector("*[ng-app]");
        w.$app = w.angular.element(el);
        w.$injector = w.$app.injector();
        w.$rootScope = w.$app.scope();
        w.$filter = w.$app.injector().get('$filter');
        w.$compile = w.$app.injector().get('$compile');
        w.$location = w.$app.injector().get('$location');
        w.$timeout = w.$app.injector().get('$timeout');
        w.$q = w.$app.injector().get('$q');
        w.$http = w.$app.injector().get('$http');
        w.WireUtil = w.$app.injector().get('WireUtil');
        w.Api = w.$app.injector().get('Api');

        w.$rootScope.$on('$routeChangeStart', function(next, last) {
            setTimeout(() => {
                pageChange()
            }, 500);
        });

        w.$scope = element => w.angular.element(element).scope();
    }

    function pageChange() {
        var loadingElement = $('div.loading-screen');
        var loadingScope = w.$scope(loadingElement);
        if (!loadingScope.hasPendingRequests()) {
            whenItsLoaded();
        } else {
            setTimeout(() => {
                pageChange();
            }, 250);
        }
    }

    function clickButton2CheckedMissionsList(missionScope,lastonefailed) {
        let resultsdiv = document.querySelector('.clickButton2results');
        let cancelbutton = document.querySelector('.cancel-clickbutton2-button');

        function restoreContainer(keepresultsdiv = false) {
            if (!keepresultsdiv && resultsdiv) resultsdiv.remove();
            if (cancelbutton) cancelbutton.remove();
            if (document.querySelector('.container.ng-scope')) {
                document.querySelector('.container.ng-scope').style.display = "unset"; // show everything
            }
            if (document.querySelector('.create-mission-button')) {
                document.querySelector('.create-mission-button').style.display = 'unset'; // show the Create New Mission button
            }
        }

        try {
            if (localStorage.getItem('clickbutton2missionguids') == null || typeof localStorage.getItem('clickbutton2missionguids') != 'string' || localStorage.getItem('clickbutton2missionguids') == '') {
                // nothing defined (anymore)
                restoreContainer();
                return false;
            }
            let missionguids = JSON.parse(localStorage.getItem('clickbutton2missionguids'));
            if (!(missionguids instanceof Array) || missionguids.length <= 0) {
                // empty list (last one handled)
                localStorage.removeItem('clickbutton2missionguids');
                restoreContainer();
                if (lastonefailed) setTimeout(whenItsLoaded);
                return false;
            }

            if (!resultsdiv) {
                resultsdiv = document.createElement('div');
                resultsdiv.className = 'clickButton2results';
                if (document.querySelector('.navbar')) {
                    document.querySelector('.navbar').after(resultsdiv);
                }
                cancelbutton = document.createElement('button');
                cancelbutton.className = "cancel-clickbutton2-button";
                cancelbutton.style.marginLeft = '20px';
                cancelbutton.textContent = "Cancel";
                cancelbutton.addEventListener('click',function(e) {
                    console.log("Canceled checked missions, keep:",localStorage.getItem('clickbutton2missionguids'));
                    localStorage.setItem('clickbutton2missionguids',JSON.stringify([]));
                    if (document.querySelector('.container.ng-scope')) {
                        document.querySelector('.container.ng-scope').style.display = "unset"; // show everything
                    }
                },false);
                resultsdiv.after(cancelbutton);
            }
            if (document.querySelector('.container.ng-scope')) {
                document.querySelector('.container.ng-scope').style.display = "none"; // hide everything
            }
            if (document.querySelector('.yellow create-mission-button')) {
                document.querySelector('.yellow create-mission-button').style.display = "none"; // hide create button
            }

            let total = missionguids.length;
            let missionguid = missionguids.shift();
            localStorage.setItem('clickbutton2missionguids',JSON.stringify(missionguids));
            resultsdiv.innerText = 'Checked ' + total + ' mission' + (total == 1?'':'s') + '...';

            let checkedmissions = missionScope.missions.filter((el)=>{return el.mission_guid == missionguid;}); // expect 1 result
            if (checkedmissions.length != 1) {
                console.log("FAILED: mission guid not found, skipped",missionguid);
                resultsdiv.innerText += ' mission guid not found, skipped';
                setTimeout(function() {
                    clickButton2CheckedMissionsList(missionScope,true);
                },1000);
                return true;
            }
            let buttontitle = missionScope.missionListStates[checkedmissions[0].state].BUTTON2.title;
            resultsdiv.innerText = buttontitle + ' ' + total + ' mission' + (total == 1?'':'s') + '...';
            missionScope.button2Clicked(checkedmissions[0]);
            return true;
        } catch(e) {
            console.log("FAILED: alter missions failed, cancel all");
            resultsdiv.innerText = 'FAILED: alter missions failed, cancel all';
            restoreContainer(true);
            localStorage.removeItem('clickbutton2missionguids');
            return false;
        }
    };

    function whenItsLoaded() {
        var missionScope = w.$scope($('div.list'));

        if (missionScope) {
            if (clickButton2CheckedMissionsList(missionScope)) return; // skip setup if clicked
            missionListSetup(missionScope);
        } else {
            var editScope = w.$scope($('div.editor'));
            if (editScope) {
                missionEditSetup(editScope);
            } else {
                var previewScope = w.$scope($('div.preview-mission'));
                if (previewScope){
                    missionPreviewSetup(previewScope);
                }
            }
        }
    }

    function missionPreviewSetup(previewScope) {
        //$('body').css('margin-top','0');
    };

    function storeCategoryContent(categoryContent) {
        let activeuser = $('.navbar-login a').first().text().trim(); // expect username here
        try {
            w.localStorage.setItem('allCategories_' + activeuser, JSON.stringify(categoryContent));
        } catch(error) {
            console.log(error);
            alert(error.toString());
        }
    }
    function restoreCategoryContent() {
        if (w.localStorage.getItem('allCategories')) { // convert old single storage to new storage per user
            let categoryContentJSON = JSON.parse(w.localStorage.getItem('allCategories')) || [];
            storeCategoryContent(categoryContentJSON);
            w.localStorage.removeItem('allCategories');
            return categoryContentJSON;
        }
        let activeuser = $('.navbar-login a').first().text().trim(); // expect username here
        return JSON.parse(w.localStorage.getItem('allCategories_' + activeuser)) || [];
    }
    function removeCategoryContent() {
        let activeuser = $('.navbar-login a').first().text().trim(); // expect username here
        w.localStorage.removeItem('allCategories_' + activeuser);
    }

    function missionEditSetup(editScope) {
        var editStep = editScope.mission.ui.view;

        //overwrite submitMission function to inject categorisation
        editScope.submitMission = function() {
            var b = WireUtil.convertMissionLocalToWire(editScope.mission)
            , d = angular.copy(b);
            d.submit = true;
            editScope.saving = true;
            editScope.savingFailed = false;
            editScope.saved = false;
            w.$http.post(w.Api.SAVE_MISSION, d).success(function(d) {
                editScope.saving = false;
                editScope.saved = true;
                editScope.savedWireMission = b;
                //if a category is selected, push the mission to that category
                if (parseInt(editScope.selectedCategoryID) >= 0) {
                    editScope.categoryContent[editScope.selectedCategoryID].missions.push(editScope.savedWireMission.mission_guid);
                    editScope.categoryContent[editScope.selectedCategoryID].collapse = false;
                    editScope.selectedCategoryID = -1;
                    storeCategoryContent(editScope.categoryContent);
                }
                w.$location.url("/")
            }).error(function(b) {
                editScope.saving = false;
                editScope.savingFailed = true
            })
        }

        editScope.isBreadcrumbDisabled = function(step){
            var validGoTo = false;
            switch (step) {
                case editScope.EditorScreenViews.TYPE:
                case editScope.EditorScreenViews.NAME:
                    validGoTo = editScope.isTypeValid();
                    break;
                case editScope.EditorScreenViews.WAYPOINTS:
                    validGoTo = editScope.isTypeValid() && !editScope.detailsErrors.hasErrors;
                    break;
                case editScope.EditorScreenViews.PREVIEW:
                    validGoTo = editScope.isTypeValid() && !editScope.detailsErrors.hasErrors && !editScope.waypointErrors.hasErrors
            }
            return !validGoTo;
        }

        //Replace breadcrumb with something a bit clearer
        $(".view").empty();
        var newBreadcrumb = "<ul class='pagination'>"
        + "<li" + (editScope.IsViewActive(editScope.EditorScreenViews.TYPE) ? " class='active'" : "")
        + "><a role='button' ng-disabled='isBreadcrumbDisabled(EditorScreenViews.TYPE)' ng-click='bulletSetView(EditorScreenViews.TYPE)'>Mission Type</a></li>"
        + "<li" + (editScope.IsViewActive(editScope.EditorScreenViews.NAME) ? " class='active'" : "")
        + "><a role='button' ng-disabled='isBreadcrumbDisabled(EditorScreenViews.NAME)' ng-click='bulletSetView(EditorScreenViews.NAME)'>Mission Details</a></li>"
        + "<li" + (editScope.IsViewActive(editScope.EditorScreenViews.WAYPOINTS) ? " class='active'" : "")
        + "><a role='button' ng-disabled='isBreadcrumbDisabled(EditorScreenViews.WAYPOINTS)' ng-click='bulletSetView(EditorScreenViews.WAYPOINTS)'>Waypoints</a></li>"
        + "<li" + (editScope.IsViewActive(editScope.EditorScreenViews.PREVIEW) ? " class='active'" : "")
        + "><a role='button' ng-disabled='isBreadcrumbDisabled(EditorScreenViews.PREVIEW)' ng-click='bulletSetView(EditorScreenViews.PREVIEW)'>Preview</a></li>"
        + "</ul>";
        var compiledBread = $compile(newBreadcrumb)(editScope);
        $(".view").append(compiledBread);

        //view specific fixes
        var editCode, editTarget, compiledContent;
        switch (editStep){
            case editScope.EditorScreenViews.TYPE:
                editTarget = $(".type-view .bordered-panel");
                //Overhauled UI on Mission Type page, including more editorialising on non-linear missions in banners
                $(".type-view .bordered-panel").empty().addClass('ready');
                editCode = "<div class='btn-group btn-group-justified'>"
                    + "<div class='btn-group'><button class='btn btn-lg' ng-click='mission.definition._sequential = true; mission.definition._hidden = false' ng-class='{active: mission.definition._sequential && !mission.definition._hidden}'><i class='glyphicon glyphicon-arrow-right'></i>&nbsp;&nbsp;SEQUENTIAL</button></div>"
                    + "<div class='btn-group'><button class='btn btn-lg' ng-click='mission.definition._sequential = true; mission.definition._hidden = true' ng-class='{active: mission.definition._sequential && mission.definition._hidden}'><i class='glyphicon glyphicon-eye-close'></i>&nbsp;&nbsp;HIDDEN SEQUENTIAL</button></div>"
                    + "<div class='btn-group'><button class='btn btn-lg' ng-click='mission.definition._sequential = false; mission.definition._hidden = false' ng-class='{active: mission.definition._sequential === false}'><i class='glyphicon glyphicon-random'></i>&nbsp;&nbsp;ANY ORDER</button></div>"
                    + "</div><br />"
                    + "<p ng-show='mission.definition._sequential && !mission.definition._hidden'>Agents visit portals and field trip markers in a set order.<br/><br/>Best suited to missions in a banner series, or one-offs with a pre-determined route.</p>"
                    + "<p ng-show='mission.definition._sequential && mission.definition._hidden'>Agents visit portals and field trip markers in a set order, but the location of every waypoint beyond the first is hidden, meaning players rely on clues in the waypoint text.<br/><br/>Good for more puzzle-based missions, but please ensure you provide adequate clues for agents to find all the waypoints.</p>"
                    + "<p ng-show='!mission.definition._sequential'>Agents visit portals and field trip markers in any order. Excellent for one-off missions where a specific route isn't required, but terrible for missions in banner serieses.<br /><br /><span class='stopthat'>It is strongly advised that if you are making missions for a banner, you set them as Sequential missions - your rating on IngressMosaik will thank you! </span></p>";
                break;
            case editScope.EditorScreenViews.NAME:
                editTarget = $(".name-view .bordered-panel");
                //Overhauled UI on Mission Name/Image pages
                $(".name-view .bordered-panel").empty().addClass('ready');
                editCode = "<div class='row'><div class='col-sm-8 form-horizontal'><div class='form-group'>"
                    + "<label for='missionName' class='col-sm-2 control-label'>Mission Name</label>"
                    + "<div class='col-sm-10'><input type='text' id='missionName' ng-model='mission.definition.name' class='form-control' placeholder='Add mission name' ng-class='{\"invalid\": !mission.definition.name}' maxlength='" + editScope.MissionRules.MAX_MISSION_NAME_LENGTH + "'>"
                    + "</div></div><div class='form-group'>"
                    + "<label for='missionDesc' class='col-sm-2 control-label'>Mission Description</label>"
                    + "<div class='col-sm-10'><textarea id='missionDesc' class='form-control' rows='4' ng-model='mission.definition.description' placeholder='Add mission description' ng-class='{\"invalid\": !mission.definition.description}' maxlength='" + editScope.MissionRules.MAX_MISSION_DESCRIPTION_LENGTH + "'></textarea>"
                    + "</div></div></div><div class='col-sm-4'"
                    + "<div mission-logo-upload max-size='{{LogoParams.MAX_SIZE_BYTES}}' success='logoUploadSuccess' error='logoUploadFailure' pre-post='ensureMissionHasGuid' accept='image/*' type-restriction='image/(gif|jpeg|jpg|png)' mission='mission'></div>"
                    + "</div></div>";
                break;
            case editScope.EditorScreenViews.WAYPOINTS:
                //Adding drag-and-drop mission reordering
                //First, watch whether the user can see the list of waypoints
                editScope.$watch('shouldShowWaypointList()', function() {
                    //if so, wait half a second and apply the JQueryUI sortable parameter to the list thereof
                    if (editScope.shouldShowWaypointList()){
                        setTimeout(() => {
                            //checks start position on start, end position on end, and sends them to the native change position function
                            $('#waypoints').sortable({
                                handle: '.number',
                                axis: 'y',
                                start: function(event, ui) {
                                    var start_pos = ui.item.index();
                                    ui.item.data('start_pos', start_pos);
                                },
                                update: function (event, ui) {
                                    var start_pos = ui.item.data('start_pos');
                                    var end_pos = ui.item.index();
                                    editScope.$apply(function(){
                                        editScope.changeWaypointPosition(start_pos, end_pos);
                                    });
                                    editScope.mission.definition.waypoints.forEach(function(waypoint){
                                        editScope.setSelectedWaypoint(waypoint);
                                    });
                                    editScope.setSelectedWaypoint(editScope.mission.definition.waypoints[end_pos]);
                                }
                            });
                        }, 500);
                    }
                });
                break;
            case editScope.EditorScreenViews.PREVIEW:
                //If there are user generated categories, add a dropdown to add the new mission to one
                editScope.categoryContent = restoreCategoryContent();
                if (editScope.categoryContent.length > 0 && editScope.mission.mission_guid){
                    var showCategory = true;
                    editScope.categoryContent.forEach(function(category){
                        for (var i = 0; i < category.missions.length; i++){
                            if (category.missions[i] == editScope.mission.mission_guid){
                                showCategory = false;
                                break;

                            }
                        }
                    })
                    if (showCategory){
                        editScope.selectedCategoryID = -1;
                        editTarget = $(".preview-buttons");
                        if (!document.querySelector('.category-dropdown')) { // draw only once
                            editCode = "<div class='category-dropdown pull-right' style='display: inline-block; margin-right: 20px;'>"
                                + "<select class='form-control' ng-model='selectedCategoryID' style='display: none;'>"
                                + "<option value='-1'>OPTIONAL: Select a category to add this mission to</option>";
                            for (var i = 0; i < editScope.categoryContent.length; i++) {
                                editCode += "<option value='" + i + "'>" + editScope.categoryContent[i].name + "</option>";
                            }
                            editCode += "</select></div>";
                        }
                    }
                }
                break;
        }
        if (editCode){
            compiledContent = $compile(editCode)(editScope);
            editTarget.append(compiledContent);
        }

        //Runs pageChange() function when changing between Edit states
        editScope.setView = function(b) {
            editScope.pendingSave && (w.$timeout.cancel(editScope.pendingSave), editScope.pendingSave = null);
            editScope.save(b);
            setTimeout(() => {
                pageChange();
            }, 500);
        }

    }

    function missionListSetup(missionScope) {

        missionScope.getFullMissionData = function(missions){
            var dfd = w.$q.defer();
            var missionPromises = [];
            angular.forEach(missions, function(mission) {
                if (mission.missionListState != "DRAFT" && mission.missionListState != "SUBMITTED"){
                    var mId = mission.mission_guid;
                    missionPromises.push($http.post(window.origin + "/api/author/getMissionForProfile", {mission_guid: mId}));
                } else {
                    var mId = mission.draft_mission_id || mission.submitted_mission_id;
                    missionPromises.push($http.post(window.origin + "/api/author/getMission", {mission_id: mId}));
                }
            });
            w.$q.all(missionPromises).then(function(results) {
                var missionData = [];
                for (var i = 0; i < results.length; i++){
                    if (results[i] !== undefined){
                        var f = WireUtil.convertMissionWireToLocal(results[i].data.mission, results[i].data.pois);
                        missionData.push(f.definition);
                    } else {missionData.push(null)}
                }
                dfd.resolve(missionData);
            },
                                           function(data, status) {
                console.error('error: ', status, data);
            }
                                          )
            return dfd.promise;
        }

        missionScope.categoryContent = [];
        missionScope.categorisedMissions = [];
        missionScope.uncategorisedMissions = [];
        missionScope.uncategorisedSort = 'initial';
        missionScope.missions = w.$filter("orderBy")(missionScope.missions, 'definition.name');
        missionScope.loadingPreview = false;
        missionScope.unsortedCollapse = {collapse: JSON.parse(w.localStorage.getItem('unsortedCollapse') || false)};

        //handling for legacy data format
        if (!!w.localStorage.getItem('categoryNames')){
            let oldegoriesLength = parseInt(w.localStorage.getItem('categoriesLength')) || 0,
                categoryNames = w.localStorage.getItem('categoryNames') ? w.localStorage.getItem('categoryNames').split(',') : [],
                thisCategory;
            //create categories in new format
            for (var i= 0; i < oldegoriesLength; i++){
                thisCategory = {
                    id: i,
                    name: categoryNames[i],
                    missions: w.localStorage.getItem('categoryContent' + i) ? w.localStorage.getItem('categoryContent' + i).split(',') : [],
                    collapse: true,
                    sortCriteria: 'initial'
                };
                missionScope.categoryContent.push(thisCategory);
                w.localStorage.removeItem('categoryContent' + i);
            }
            storeCategoryContent(missionScope.categoryContent);

            //now tidy up the legacy data
            w.localStorage.removeItem('categoryNames');
            w.localStorage.removeItem('categoriesLength');
        }

        //get data for all categories
        missionScope.categoryContent = restoreCategoryContent();
        missionScope.selectedCategoryMissionId = null;

        //Add position in initial array
        for (var i = 0; i < missionScope.missions.length; i++) {
            missionScope.missions[i].position = i;
        }

        //function to calculate distances between two sets of coordinates taken from geodatasource.com
        missionScope.distance = function(lat1, lon1, lat2, lon2, unit) {
            if ((lat1 == lat2) && (lon1 == lon2)) {
                return 0;
            }
            else {
                var radlat1 = Math.PI * lat1/180;
                var radlat2 = Math.PI * lat2/180;
                var theta = lon1-lon2;
                var radtheta = Math.PI * theta/180;
                var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
                if (dist > 1) {
                    dist = 1;
                }
                dist = Math.acos(dist);
                dist = dist * 180/Math.PI;
                dist = dist * 60 * 1.1515;
                if (unit=="K") { dist = dist * 1.609344 }
                if (unit=="N") { dist = dist * 0.8684 }
                return dist;
            }
        }

        function addRemovableEventListener(element, event, callback) {
            const wrapper = e => {
                callback(e, () => element.removeEventListener(event, wrapper) );
            }
            element.addEventListener(event, wrapper);
        }

        missionScope.submitMission = function(mission) {
            let lastpageclicked = false;
            let submitclicked = false;
            addRemovableEventListener(document.body, 'DOMNodeInserted', (e, closeListener) => {
                let lastpage = document.querySelector('.pagination li:last-child');
                if (lastpage && lastpage.innerText == 'Preview') {
                    if (!lastpage.classList.contains('active')) {
                        if (!lastpageclicked) {
                            lastpageclicked = true;
                            setTimeout(function() { lastpage.querySelector('a').click(); }); // wait until click event is assigned
                        }
                    } else {
                        let nextbutton = document.querySelector('.preview-buttons button:last-child');
                        if (nextbutton) {
                            if (!submitclicked) {
                                submitclicked = true;
                                setTimeout(function() { nextbutton.click(); });
                                closeListener();
                            }
                        }
                    }
                }
            });

            missionScope.button1Clicked(mission);
        }

        missionScope.previewMission = function(guid) {
            $('#previewMissionModel .modal-body .notloading').empty();
            missionScope.loadingPreview = true;
            var mission = w.$filter('filter')(missionScope.missions, {mission_guid: guid})[0];
            if (mission){
                missionScope.getFullMissionData([mission]).then(function(data){
                    mission.definition = data[0];
                    //calculate approx. mission length
                    var distance = 0;
                    for (var i = 1; i < mission.definition.waypoints.length; i++){
                        distance += missionScope.distance(
                            mission.definition.waypoints[i-1]._poi.location.latitude,
                            mission.definition.waypoints[i-1]._poi.location.longitude,
                            mission.definition.waypoints[i]._poi.location.latitude,
                            mission.definition.waypoints[i]._poi.location.longitude,
                            "K")
                    }

                    missionScope.loadingPreview = false;
                    w.$injector.invoke(function($compile) {
                        var modalContent = "<div preview-mission mission='missions["+mission.position+"]' mission-preview-state='\""+MissionPreviewStates.PROFILE+"\"'></div>";
                        var compiledContent = $compile(modalContent)(missionScope);
                        // Put the output of the compilation in to the page using jQuery
                        $('#previewMissionModel .modal-body .notloading').append(compiledContent);
                        if (distance < 1){
                            distance = (Math.floor(distance * 100000) / 100) + "m";
                        } else {
                            distance = (Math.floor(distance * 100) / 100) + "km";
                        }
                        setTimeout(function(){$('.mission-stats-row').append('<div class="mission-stats-item"><span class="stats-value">'+distance+'</span></div>');}, 10);
                    })
                })
            }
        }

        missionScope.previewBanner = function(category) {
            $('#previewMissionModel .modal-body .notloading').empty();
            missionScope.loadingPreview = true;
            missionScope.getFullMissionData(missionScope.categorisedMissions[category]).then(function(data){
                missionScope.banner = {
                    definition: {
                        name: missionScope.categoryContent[category].name,
                        author_nickname: data[0].author_nickname,
                        description: data[0].description,
                        _sequential: data[0]._sequential,
                        logo_url: data[0].logo_url,
                        waypoints: []
                    },
                    stats: {
                        num_completed: missionScope.categorisedMissions[category][data.length -1].stats ? missionScope.categorisedMissions[category][data.length -1].stats.num_completed : 0,
                        rating: 0,
                        median_completion_time: 0
                    },
                };
                for (var i = 0; i < missionScope.categorisedMissions[category].length; i++){
                    missionScope.banner.stats.rating += missionScope.categorisedMissions[category][i].stats ? missionScope.categorisedMissions[category][i].stats.rating : 0;
                    missionScope.banner.stats.median_completion_time += missionScope.categorisedMissions[category][i].stats ? missionScope.categorisedMissions[category][i].stats.median_completion_time : 0;
                    data[i].waypoints.forEach(function(wp){
                        missionScope.banner.definition.waypoints.push(wp)
                    })
                }
                missionScope.banner.stats.rating = Math.round(missionScope.banner.stats.rating / data.length);
                //calculate approx. banner length
                var distance = 0;
                for (var j = 1; j < missionScope.banner.definition.waypoints.length; j++){
                    distance += missionScope.distance(
                        missionScope.banner.definition.waypoints[j-1]._poi.location.latitude,
                        missionScope.banner.definition.waypoints[j-1]._poi.location.longitude,
                        missionScope.banner.definition.waypoints[j]._poi.location.latitude,
                        missionScope.banner.definition.waypoints[j]._poi.location.longitude,
                        "K")
                }

                missionScope.loadingPreview = false;
                w.$injector.invoke(function($compile) {
                    var modalContent = "<div preview-mission mission='banner' mission-preview-state='\""+MissionPreviewStates.PROFILE+"\"'></div>";
                    var compiledContent = $compile(modalContent)(missionScope);
                    // Put the output of the compilation in to the page using jQuery
                    $('#previewMissionModel .modal-body .notloading').append(compiledContent);
                    if (distance < 1){
                        distance = (Math.floor(distance * 100000) / 100) + "m";
                    } else {
                        distance = (Math.floor(distance * 100) / 100) + "km";
                    }
                    setTimeout(function(){$('.mission-stats-row').append('<div class="mission-stats-item"><span class="stats-value">'+distance+'</span></div>');}, 10);
                })
            })
        }

        missionScope.selectACategory = function(mission) {
            missionScope.selectedCategoryMissionId = mission.mission_guid;
            $('#addCateModel .modal-title').text('Move \"' + mission.definition.name + '\" to...');
        }

        missionScope.addToCategory = function() {
            $(".modal-backdrop.fade").remove();
            $("body").removeClass("modal-open");
            var categoryID = missionScope.selectedCategoryID;
            if (missionScope.selectedCategoryMissionId == 'checkboxedmissions') {

                $(".dropup :checked").each(function() {
                    let button = this.parentElement.innerHTML;
                    let removematches = button.match(/removeFromCategory\((\d+), missions\[(\d+)\]\)/);
                    let selectmatches = button.match(/selectACategory\(missions\[(\d+)\]\)/);
                    if (removematches) {
                        if (categoryID != removematches[1]) {
                            let category = removematches[1];
                            let id = removematches[2];
                            let mission = missionScope.categorisedMissions[category].filter(function(mission) { if (mission.position == id) return mission; })[0];
                            missionScope.selectedCategoryMissionId = mission.mission_guid;

                            for (let i = 0; i < missionScope.categoryContent[category].missions.length; i++) {
                                if (missionScope.categoryContent[category].missions[i] == mission.mission_guid) {
                                    missionScope.categoryContent[category].missions.splice(i, 1);
                                }
                            }

                            if (categoryID != 'unsorted') {
                                missionScope.categoryContent[categoryID].missions.push(missionScope.selectedCategoryMissionId);
                            }
                        }
                    } else if (selectmatches) {
                        if (categoryID != 'unsorted') {
                            let mission = missionScope.uncategorisedMissions.filter(function(mission) { if (mission.position == selectmatches[1]) return mission; })[0];
                            missionScope.selectedCategoryMissionId = mission.mission_guid;
                            missionScope.categoryContent[categoryID].missions.push(missionScope.selectedCategoryMissionId);
                        }
                    }
                });
            } else if (categoryID != 'unsorted') {
                missionScope.categoryContent[categoryID].missions.push(missionScope.selectedCategoryMissionId);
            }
            if (categoryID == 'unsorted') {
                if (missionScope.unsortedCollapse.collapse) missionScope.toggleCollapse(missionScope.unsortedCollapse, true);
            } else {
                missionScope.categoryContent[categoryID].collapse = false;
            }
            missionScope.selectedCategoryMissionId = null;
            missionScope.selectedCategoryID = null;
            storeCategoryContent(missionScope.categoryContent);
            generateAllMissions();
        }

        missionScope.sortCategoryTitles = function() {
            missionScope.categoryContent.sort(function(a,b) {
                a = a.name + '  ' + a.missions.length;
                b = b.name + '  ' + b.missions.length;
                if (a == b) return 0;
                return (a > b ? 1 : -1);
            });
            let changed = false;
            for (let id = 0; id < missionScope.categoryContent.length; id++) { // renumber
                if (missionScope.categoryContent[id].id != id) {
                    missionScope.categoryContent[id].id = id;
                    changed = true;
                }
            }
            if (!changed) { // nothing changed, sort inverted
                missionScope.categoryContent.sort(function(b,a) {
                    a = a.name + ' ' + a.missions.length;
                    b = b.name + ' ' + b.missions.length;
                    if (a == b) return 0;
                    return (a > b ? 1 : -1);
                });
                for (let id = 0; id < missionScope.categoryContent.length; id++) { // renumber
                    missionScope.categoryContent[id].id = id;
                }
            }
            storeCategoryContent(missionScope.categoryContent);
            generateAllMissions();
        };
        missionScope.toggleCheckboxes = function(hide = false) {
            if (hide || $(".checkboxesDisplayed").length) {
                $(".togglecheckboxbutton").text('Show checkboxes');
                $(".checkboxesDisplayed").remove();
                $(".checkboxedmissionsbutton").hide();

                for (let missionelement of document.querySelectorAll('.missionbox .mission .mission-header-container')) {
                    missionelement.style.cursor = 'unset';
                    missionelement.removeEventListener('click', missionelement.clickevent, false);
                    delete(missionelement.clickevent);
                }
            } else {
                missionScope.updateCheckedMissionsCounts();

                $(".dropup").css({display:"flex"});
                $(".dropup").prepend('<input type="checkbox" class="checkboxesDisplayed">');
                $(".checkboxesDisplayed").on('click', function(event){
                    missionScope.updateCheckedMissionsCounts();
                });
                $(".checkboxedmissionsbutton").show();
                $(".togglecheckboxbutton").text('Hide checkboxes');

                for (let missionelement of document.querySelectorAll('.missionbox .mission .mission-header-container')) {
                    missionelement.style.cursor = 'pointer';
                    // add the event as a function to each mission, so the event can be removed when it needs to be disabled
                    missionelement.clickevent = function(e) {
                        e.stopPropagation();
                        missionelement.parentElement.querySelector('.checkboxesDisplayed').checked = !missionelement.parentElement.querySelector('.checkboxesDisplayed').checked;
                        missionScope.updateCheckedMissionsCounts();
                    }
                    missionelement.addEventListener('click', missionelement.clickevent, false);
                }

            }
        };
        missionScope.toggleCategoryCheckboxes = function(id) {
            let checkboxes = document.getElementById(id).querySelectorAll('input[type=checkbox].checkboxesDisplayed');
            for (let checkbox of checkboxes) {
                checkbox.checked = !checkbox.checked;
            }
            missionScope.updateCheckedMissionsCounts();
        };
        missionScope.moveCheckedMissions = function() {
            missionScope.selectACategory({mission_guid:'checkboxedmissions',definition:{name:$(".dropup :checked").length + ' Checked Missions'}});
        };
        missionScope.updateCheckedMissionsCounts = function() {
            for (let missionListState in missionScope.missionListStates) {
                let checkboxbuttoncount = document.querySelector('.' + missionListState);
                if (checkboxbuttoncount) {
                    let buttontitle = missionScope.missionListStates[missionListState].BUTTON2.title;
                    let missionguids = [...document.querySelectorAll('.dropup .checkboxesDisplayed:checked')].filter((el)=>{return el.parentElement.querySelector('a[ng-click^=button2Clicked]').innerText == buttontitle;}).map((el)=>{return parseInt(el.parentElement.querySelector('a[ng-click^=button2Clicked]').getAttribute('ng-click').match(/missions\[(\d+)\]/)[1]);}).map((num)=>{return missionScope.missions[num].mission_guid});
                    checkboxbuttoncount.innerText = (missionguids.length > 0 ? ' ' + missionguids.length : "");
                    checkboxbuttoncount.parentElement.disabled = (missionguids.length == 0);
                }
            }
            let checkboxmovebuttoncount = document.querySelector('.MOVECOUNT');
            if (checkboxmovebuttoncount) {
                let checkedcount = $(".dropup :checked").length;
                checkboxmovebuttoncount.innerText = (checkedcount > 0 ? ' ' + checkedcount : "");
                checkboxmovebuttoncount.parentElement.disabled = (checkedcount == 0);
            }
        };
        missionScope.submitCheckedMissions = function() {
        };
        missionScope.clickButton2CheckedMissions = function(missionListState) {
            let buttontitle = missionScope.missionListStates[missionListState].BUTTON2.title;
            let missionguids = [...document.querySelectorAll('.dropup .checkboxesDisplayed:checked')].filter((el)=>{return el.parentElement.querySelector('a[ng-click^=button2Clicked]').innerText == buttontitle;}).map((el)=>{return parseInt(el.parentElement.querySelector('a[ng-click^=button2Clicked]').getAttribute('ng-click').match(/missions\[(\d+)\]/)[1]);}).map((num)=>{return missionScope.missions[num].mission_guid});
            if (missionguids.length == 0) {
                alert('No ' + missionListState.toLowerCase() + ' missions selected to ' + buttontitle);
                return;
            }
            let confirmed = prompt(missionListState.toLowerCase() + ' missions selected: ' + missionguids.length + '\n\nAre you sure you want to ' + buttontitle + ' these missions?\nType YES to confirm:');
            if (confirmed !== 'YES') {
                return;
            }
            localStorage.setItem('clickbutton2missionguids',JSON.stringify(missionguids));
            clickButton2CheckedMissionsList(missionScope);
        };
        missionScope.removeFromCategory = function(category, mission) {
            for (var i = 0; i < missionScope.categoryContent[category].missions.length; i++) {
                if (missionScope.categoryContent[category].missions[i] == mission.mission_guid) {
                    // console.log('removeFromCategory',category, mission,missionScope.categoryContent);
                    missionScope.categoryContent[category].missions.splice(i, 1);
                }
            }
            storeCategoryContent(missionScope.categoryContent);
            generateAllMissions();
        };

        missionScope.createCategory = function() {
            var categoryName = prompt("Please enter a name for your new category", "New category name");
            if (categoryName == null || categoryName == "") {
                //no result
            } else {
                //create category elements
                var newCategory = {
                    id: missionScope.categoryContent.length,
                    name: categoryName,
                    missions: [],
                    collapse: false,
                    sortCriteria: 'initial'
                };
                missionScope.categoryContent.push(newCategory);
                storeCategoryContent(missionScope.categoryContent);
                generateAllMissions();
            }
        }

        missionScope.nukeCategories = function() {
            let confirmed = prompt('Are you sure you want to delete ALL categories?\nAll missions will be moved to Unsorted Missions.\n\nType YES to confirm:');
            if (confirmed !== 'YES') {
                return;
            }
            missionScope.categoryContent = [];
            removeCategoryContent();
            generateAllMissions();
        }

        missionScope.downloadMissionsImages = function(prefixname,missions) {
            missionScope.getFullMissionData(missions).then(function(missions){
                let imagelist = [];
                for (let missioncnt in missions) {
                    let mission = missions[missioncnt];
                    imagelist.push({url:mission.logo_url,filename:prefixname + mission.name.replace(/([^\x20-~]+)|([\\/:?"<>|]+)/g,'_')});
                }

                function downloadimages() {
                    if (imagelist.length == 0) return;
                    let img = imagelist.shift();
                    let imgobject = fetch(img.url).then(imgobject => imgobject.blob()).then(imgdata => {
                        let typematches = imgdata.type.match(/^image\/(.+)$/);
                        if (!typematches) {
                            console.log('Not a valid image to download',img,imgdata);
                        } else {
                            let imgurl = URL.createObjectURL(imgdata);
                            let a = document.createElement('a');
                            a.target = '_blank';
                            a.href = imgurl;
                            a.download = img.filename + '.' + typematches[1];
                            a.click();
                            setTimeout(downloadimages,100);
                        }
                    });
                }

                downloadimages();
            });
        };

        missionScope.downloadMissionImage = function(category,missionguid) {
            let missions = missionScope.missions.filter((el)=>{return el.mission_guid == missionguid;});
            missionScope.downloadMissionsImages((category === false ? '' : missionScope.categoryContent[category].name.replace(/([^\x20-~]+)|([\\/:?"<>|]+)/g,'_') + '-' ),missions);
        };

        missionScope.exportCategoryImages = function(category) {
            missionScope.downloadMissionsImages(missionScope.categoryContent[category].name.replace(/([^\x20-~]+)|([\\/:?"<>|]+)/g,'_') + '-',missionScope.categorisedMissions[category]);
        };

        missionScope.downloadJSONFile = function(jsondata,filename) {
            let isSmartphone = navigator.userAgent.match(/Android.*Mobile/) || navigator.userAgent.match(/iPhone|iPad|iPod/i);
            if (typeof android !== 'undefined' && android?.saveFile) {
                android.saveFile(filename, "application/json", jsondata);
            } else {
                let a = document.createElement('a');
                a.href = "data:application/json;charset=utf-8," + encodeURIComponent(jsondata);
                a.target = '_blank';
                a.download = filename;
                a.click();
            }
            /*
          else if (navigator?.clipboard?.writeText) {
              navigator.clipboard.writeText(jsondata).then(function() {
                  prompt('JSON data copied to your clipboard - paste and save this to a notepad file named:',filename)
              }, function() {
                  alert('Copy to clipboard went wrong')
              });
          } else {
              alert('Save to file is not supported');
          }
          */
        };

        missionScope.createTimestampString = function() {
            function leadingzero(value) {
                return ('0' + value).slice(-2);
            }
            let now = new Date();
            return now.getFullYear() + leadingzero(now.getMonth() + 1) + leadingzero(now.getDate()) + '_' + leadingzero(now.getHours()) + leadingzero(now.getMinutes()) + leadingzero(now.getSeconds());
        }

        missionScope.exportJSON = function(category) {
            missionScope.getFullMissionData(missionScope.categorisedMissions[category]).then(function(missions){
                console.log(missions);
                let bannerdata = {
                    missionSetName: missionScope.categoryContent[category].name,
                    missionSetDescription: missions[0].description,
                    currentMission: 0,
                    plannedBannerLength: missions.length,
                    titleFormat: "T NN-M",
                    fileFormatVersion: 2,
                    missions: []
                };
                for (let missioncnt in missions) {
                    let mission = missions[missioncnt];
                    let missiondata = {
                        missionTitle: mission.name,
                        missionDescription: mission.description,
                        portals: []
                    }
                    for (let waypointcnt in mission.waypoints) {
                        let waypoint = mission.waypoints[waypointcnt];
                        let portaldata = {
                            description: "", // not important for UMM (waypoint._poi.description)
                            guid: waypoint.poi_guid,
                            imageUrl: waypoint._poi.imageUrl,
                            isOrnamented: waypoint._poi.isOrnamented,
                            isStartPoint: waypoint._poi.isStartPoint,
                            location: {
                                latitude: waypoint._poi.location.latitude,
                                longitude: waypoint._poi.location.longitude
                            },
                            title: waypoint._poi.title,
                            type: waypoint.poi_type,
                            objective: {
                                type: waypoint.objective.type,
                                passphrase_params: {
                                    question: waypoint.objective.passphrase_params.question,
                                    _single_passphrase: waypoint.objective.passphrase_params._single_passphrase
                                }
                            }
                        };
                        portaldata.custom_description = waypoint.custom_description || null;
                        if (waypoint.custom_description && waypoint._show_custom_description) portaldata._show_custom_description = true; // only add if defined
                        missiondata.portals.push(portaldata);
                    }
                    bannerdata.missions.push(missiondata);
                }

                // console.log(bannerdata);
                let jsondata = JSON.stringify(bannerdata);
                let filename = missionScope.categoryContent[category].name.replace(/([^\x20-~]+)|([\\/:?"<>|]+)/g,'_') + '_' + missionScope.createTimestampString() + '-mission-data.json';
                missionScope.downloadJSONFile(jsondata,filename);
            });
        }

        missionScope.deleteCategory = function(category) {
            if (confirm("Are you sure you want to delete the " + missionScope.categoryContent[category].name + " category? Any missions you've placed in this category will be retured to Unsorted missions.")) {
                //nuke localStorage category
                missionScope.categoryContent.splice(category, 1);
                storeCategoryContent(missionScope.categoryContent);
                generateAllMissions();
            }
        }

        missionScope.renameCategory = function(category) {
            let newcategoryname = prompt("Rename category:",missionScope.categoryContent[category].name);
            if (!newcategoryname || missionScope.categoryContent[category].name == newcategoryname) return;
            missionScope.categoryContent[category].name = newcategoryname;
            storeCategoryContent(missionScope.categoryContent);
            generateAllMissions();
        }

        missionScope.moveCategory = function(category,direction) {
            if (category + direction < 0 || category + direction >= missionScope.categoryContent.length) return;

            // swap items
            let item = missionScope.categoryContent[category];
            missionScope.categoryContent.splice(category, 1); // remove
            missionScope.categoryContent.splice(category + direction, 0, item); // insert
            for (let id = 0; id < missionScope.categoryContent.length; id++) { // renumber
                missionScope.categoryContent[id].id = id;
            }
            storeCategoryContent(missionScope.categoryContent);

            // swap panels to prepare scroll location
            let panels = document.querySelector('.panel-group').querySelectorAll('.panel');
            if (direction > 0) { // move down +1
                document.querySelector('.panel-group').insertBefore(panels[category + direction],panels[category]);
            } else { // move up -1
                document.querySelector('.panel-group').insertBefore(panels[category],panels[category - direction]);
            }
            category += direction;

            // scroll to top of moved panel, before generateAllMissions refreshes the list
            let yOffset = -document.querySelector('.navbar').getBoundingClientRect().height;
            let y = document.querySelector('.panel-group').querySelectorAll('.panel')[category].getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({top: y});

            generateAllMissions();
        }

        missionScope.sortCategory = function(category){
            if (category == 'all'){
                missionScope.missions = w.$filter("orderBy")(missionScope.missions, missionScope.sortCriteria[0] == 'initial' ? 'position' : missionScope.sortCriteria[0]);
            } else if (category == 'unsorted'){
                missionScope.uncategorisedSort = missionScope.sortCriteria[missionScope.categoryContent.length];
            } else {
                missionScope.categoryContent[category].sortCriteria = missionScope.sortCriteria[category];
            }
            storeCategoryContent(missionScope.categoryContent);
            generateAllMissions();
        }

        missionScope.toggleCollapse = function(collapse, unsorted){
            collapse.collapse = !collapse.collapse;
            unsorted ? w.localStorage.setItem('unsortedCollapse', collapse.collapse)
            : storeCategoryContent(missionScope.categoryContent);
        }

        missionScope.dragMissions = function(start_pos, start_cat, end_pos, end_cat) {
            //first, parse category IDs and get categories
            var startCategory, endCategory, startCatID, endCatID, thismission;

            startCatID = isNaN(parseInt(start_cat.split('category')[1])) ? start_cat.split('category')[1] : parseInt(start_cat.split('category')[1]);
            endCatID = isNaN(parseInt(end_cat.split('category')[1])) ? end_cat.split('category')[1] : parseInt(end_cat.split('category')[1]);

            startCategory = startCatID == 'unsorted' ? missionScope.uncategorisedMissions : missionScope.categoryContent[startCatID];
            endCategory = endCatID == 'unsorted' ? missionScope.uncategorisedMissions : missionScope.categoryContent[endCatID];
            thismission = angular.copy(startCatID == 'unsorted' ? startCategory[start_pos-1].mission_guid : missionScope.categorisedMissions[startCatID][start_pos-1].mission_guid)

            //then remove start mission
            if (startCatID != 'unsorted'){
                for (var i=0; i < startCategory.missions.length; i++){
                    if (startCategory.missions[i] == thismission){
                        startCategory.missions.splice(i,1);
                        break;
                    }
                }
            }

            //then place end mission
            //unsortedMissions category has no sort criteria, so if end target is category, handle dropping mission in category
            if (endCategory.sortCriteria){
                if (endCategory.sortCriteria == 'initial'){
                    //if category is in Initial sorting, respect that sorting
                    endCategory.missions.splice(end_pos-1, 0, thismission);
                } else {
                    //if category is not in Inital sorting, dump mission at the end and set it to initial
                    endCategory.missions.push(thismission);
                    endCategory.sortCriteria = "initial";
                }
            }

            //then regenerate everything
            storeCategoryContent(missionScope.categoryContent);
            generateAllMissions();
        }

        var generateSort = function (category){
            var criteria = [
                {name: "Manually sorted", value: "initial"},
                {name: "Title (ascending)", value: "definition.name"},
                {name: "Title (descending)", value: "-definition.name"},
                {name: "Creation order", value: "created_ms"},
                {name: "Mission state", value: "missionListState"}
            ];
            missionScope.sortCriteria.push("");
            var sortContent = "<select style='width: unset; display: inline-block; margin: 5px 0;' class='form-control' ng-model='sortCriteria["; // old value: width: 50%
            //object literal switch for sort parameter
            let parameterLiteral = {
                "all" : "0",
                "unsorted" : missionScope.categoryContent.length,
                "default" : category,
            }
            sortContent += parameterLiteral[category] || parameterLiteral["default"];

            sortContent += "]' ng-change='sortCategory("+(Number.isInteger(category)? category : "\""+category+"\"")+")' >";
            sortContent += "<option value=''>Sort missions...</option>";
            for (var i = 0; i < criteria.length; i++) {
                sortContent += "<option value='" + criteria[i].value + "'>" + criteria[i].name + "</option>";
            }
            sortContent += "</select>";
            return sortContent;
        }

        var generateMission = function(mission, id, selectedCategory) {
            let missionState = mission.missionListState.toLowerCase();
            let newMissionCode = "<div class='missionbox col-xs-12 col-sm-6 col-md-3'><div class='mission mission-list-item-" + missionState + "'>"
            + "<div class='mission-header-container'><div>"
            + "<img class='mission-image' src='" + (mission.definition.logo_url ? mission.definition.logo_url + "=s60-c" : "/images/button_logo.png") + "'>"
            + "</div><div>"
            + "<span class='name mission-title-" + missionState + "'>" + mission.definition.name + "</span>"
            + "</div><div>"
            + "<i class='name mission-title-" + missionState + " glyphicon glyphicon-";

            //object literal switch for which icon to show
            let iconLiteral = {
                "draft" : "wrench' title='Unpublished draft mission'",
                "draft_of_published_mission" : "wrench' title='Published mission with unpublished edits'",
                "published" : "ok' title='Published mission'",
                "submitted" : "time' title='Unpublished mission under review'",
                "submitted_and_published" : "time' title='Published mission, changes under review'",
            };
            newMissionCode +=iconLiteral[missionState];

            newMissionCode += "></i>"
                + "</div></div>"
                + "<span class='name mission-time-" + missionState + "'>" + missionScope.getInfoTime(mission) + "</span>"
                + "<table class='table table-bordered'";
            !mission.stats && (newMissionCode += " style='width: 20%;' ");
            newMissionCode += "><tr><td>";

            //object literal switch for mission type
            let mtypeLiteral = {
                "SEQUENTIAL" : "<i class='glyphicon glyphicon-arrow-right' title='Sequential waypoints'></i>",
                "HIDDEN_SEQUENTIAL" : "<i class='glyphicon glyphicon-eye-close' title='Hidden sequential waypoints'></i>",
                "NON_SEQUENTIAL" : "<i class='glyphicon glyphicon-random' title='Non-linear waypoints (should not be used if the mission is part of a banner)'></i>",
            };
            newMissionCode += mtypeLiteral[mission.definition.mission_type];

            newMissionCode += "</td>";
            mission.stats && (
                newMissionCode += "<td><i class='glyphicon glyphicon-time'></i> " + missionScope.getMissionTimeString(mission) + "</td>"
                + "<td><i class='glyphicon glyphicon-thumbs-up'></i> " + missionScope.getMissionRatingString(mission) + "</td>"
                + "<td><i class='glyphicon glyphicon-user'></i> " + mission.stats.num_completed + "</td>"
            )
            newMissionCode += "</tr></table>"
                + "<div class='dropup'><button class='button action-button dropdown-toggle' type='button' id='dropdownMenu" + id + "' data-toggle='dropdown' aria-haspopup='true' aria-expanded='true'>Perform Mission Action</button>"
                + "<ul class='dropdown-menu' aria-labelledby='dropdownMenu" + id + "'>";
            missionScope.getButton1Title(mission) && (newMissionCode += "<li><a role='button' ng-click='button1Clicked(missions[" + id + "])'>" + missionScope.getButton1Title(mission) + "</a></li>");
            missionScope.getButton2Title(mission) && (newMissionCode += "<li><a role='button' ng-click='button2Clicked(missions[" + id + "])'>" + missionScope.getButton2Title(mission) + "</a></li>");
            if (missionState == "draft") {
                newMissionCode += '<li><a role="button" ng-click="submitMission(missions[' + id + '])">Submit mission</a></li>';
            }
            newMissionCode += "<li role='separator' class='divider'></li>";
            newMissionCode += "<li><a role='button' ng-click='downloadMissionImage(" + (selectedCategory === false ? "false" : selectedCategory) + ",\"" + mission.mission_guid + "\")'>Download Image</a></li>";
            //if mission is live, link to mission in Ingress intel and MAT preview thing
            if (missionState != "draft" && missionState != "submitted") {
                newMissionCode += "<li><a role='button' ng-click='previewMission(\"" + mission.mission_guid + "\")' data-toggle='modal' data-target='#previewMissionModel'>Preview Mission</a></li>";
                newMissionCode += "<li><a role='button' href='https://intel.ingress.com/mission/" + mission.mission_guid + "' target='_blank'>Open Mission In Intel</a></li>";
            }
            if (selectedCategory === false) {
                //adding unsorted mission to category
                newMissionCode += "<li><a role='button' ng-click='selectACategory(missions[" + id + "])' data-toggle='modal' data-target='#addCateModel'>Move To Category...</a></li>";
            } else {
                //removing a mission from a category
                newMissionCode += "<li><a role='button' ng-click='removeFromCategory(" + selectedCategory + ", missions[" + id + "])'>Move To Unsorted Missions</a></li>";
            }
            newMissionCode += "</ul></div>"
            newMissionCode += "</div></div>";
            return newMissionCode;
        }

        var generateAllMissions = function() {
            // skip if not getting any missions, check if session is logged off!
            if (document.querySelector('.welcome-panel')) {
                // something is wrong, this should not be here when drawing missions
                console.log("WARNING: something is wrong, welcome-panel visible, this should not be here when loading missions");
                return;
            }

            missionScope.toggleCheckboxes(true);
            let scrollPosition = w.pageYOffset;
            $(".missions-list").empty();
            missionScope.categoryContent.length == 0 && ($(".missions-list").addClass("row"));
            missionScope.sortCriteria = [];

            w.$injector.invoke(function($compile) {
                var missionContent = "";
                if (missionScope.categoryContent.length > 0) {
                    //if there are user-defined categories, first sort the categorised/uncategorised missions
                    missionScope.categorisedMissions = [];
                    missionScope.uncategorisedMissions = angular.copy(missionScope.missions);

                    // cleanup removed missions from categoryContent
                    let existingmissionguids = missionScope.uncategorisedMissions.map((el)=>{return el.mission_guid;});
                    let removedmissionscount = 0;
                    missionScope.categoryContent.forEach((category)=>{
                        // filter out missing guids
                        let removedmissions = category.missions.filter((guid)=>{return existingmissionguids.indexOf(guid) == -1;});
                        category.missions = category.missions.filter((guid)=>{return existingmissionguids.indexOf(guid) > -1;});
                        if (removedmissions.length) {
                            removedmissionscount += removedmissions.length;
                            console.log("clean up removed missions",removedmissions);
                        }
                    });
                    if (removedmissionscount > 0) storeCategoryContent(missionScope.categoryContent);

                    //loop through each category of GUIDs, and add actual missions to scope
                    missionScope.categoryContent.forEach(function(category) {
                        var catobj = [];
                        category.missions.forEach(function(guid) {
                            //TODO: Do this with filters, not loops
                            for (var i = 0; i < missionScope.uncategorisedMissions.length ; i++) {
                                //once the right mission is found, add position, push it to the holding array and remove from uncategorised
                                if (missionScope.uncategorisedMissions[i].mission_guid == guid) {
                                    catobj.push(missionScope.uncategorisedMissions[i]);
                                    missionScope.uncategorisedMissions.splice(i, 1);
                                    break;
                                }
                            }
                        })
                        missionScope.categorisedMissions.push(catobj);
                    })

                    //then get the categories sorted
                    missionScope.categoryContent.forEach(function(category) {
                        category.sortCriteria != 'initial' && (missionScope.categorisedMissions[category.id] = w.$filter("orderBy")(missionScope.categorisedMissions[category.id], category.sortCriteria));
                    })
                    missionScope.uncategorisedSort != 'initial' && (missionScope.uncategorisedMissions = w.$filter("orderBy")(missionScope.uncategorisedMissions, missionScope.uncategorisedSort));

                    //once all the categorisation is done, create the HTML for the categories!
                    missionContent += "<div class='panel-group' id='accordion' role='tablist' aria-multiselectable='true' style='width: 100%'>";
                    for (var i = 0; i < missionScope.categoryContent.length; i++) {
                        missionContent += "<div class='panel panel-default'><div class='panel-heading' role='tab'>"
                            + "<h4 class='panel-title' ng-class='{\"collapsed\" : categoryContent[" + i + "].collapse}'>"
                            + "<a ng-click='toggleCollapse(categoryContent[" + i + "], false)' role='button' data-toggle='collapse'>" + missionScope.categoryContent[i].name + "</a>";

                        let categoryScope = {missions:[]};
                        for (let j = 0; j < missionScope.categoryContent[i].missions.length; j++) {
                            let mission = w.$filter('filter')(missionScope.missions,{mission_guid:missionScope.categoryContent[i].missions[j]});
                            if (mission.length == 1) categoryScope.missions.push(mission[0]);
                        }
                        let draftMissions = w.$filter('filter')(categoryScope.missions, {missionListState: "DRAFT"}, true).length;
                        let dopMissions = w.$filter('filter')(categoryScope.missions, {missionListState: "DRAFT_OF_PUBLISHED_MISSION"}, true).length;
                        let submittedMissions = w.$filter('filter')(categoryScope.missions, {missionListState: "SUBMITTED"}, true).length;
                        let sapMissions = w.$filter('filter')(categoryScope.missions, {missionListState: "SUBMITTED_AND_PUBLISHED"}, true).length;
                        let publishedMissions = w.$filter('filter')(categoryScope.missions, {missionListState: "PUBLISHED"}, true).length;
                        let categoryMissions = categoryScope.missions.length;
                        missionContent += "<span class='label'>"+categoryMissions+" mission" + (categoryMissions == 1?"":"s") + "</span> ";
                        draftMissions > 0 && (missionContent += "<span class='label mission-list-item-draft'>"+draftMissions+" unpublished draft" + (draftMissions == 1?"":"s") + "</span> ");
                        submittedMissions > 0 && (missionContent += "<span class='label mission-list-item-submitted'>"+submittedMissions+" under review</span> ");
                        dopMissions > 0 && (missionContent += "<span class='label mission-list-item-draft_of_published_mission'>"+dopMissions+" being amended</span> ");
                        sapMissions > 0 && (missionContent += "<span class='label mission-list-item-submitted_and_published'>"+sapMissions+" change" + (sapMissions == 1?"":"s") + " under review</span> ");
                        publishedMissions > 0 && (missionContent += "<span class='label mission-list-item-published'>"+publishedMissions+" published</span>");

                        missionContent += "<button class='yellow checkboxedmissionsbutton' style='display: none' ng-click='toggleCategoryCheckboxes(\"category" + i + "\")'>Toggle all checkboxes</button>"

                        missionContent += "</h4></div><div class='panel-collapse collapse' ng-class='{\"in\" : !categoryContent[" + i + "].collapse}' role='tabpanel'><div class='panel-body'>"
                            + "<div id='category"+ i +"' class='row'><div class='col-xs-12 categoryFunctions'>"
                            + generateSort(i)
                            + "<button class='btn btn-default'style='float: right!important;margin: 5px;' ng-click='moveCategory(" + i + ",-1)'" + (i - 1 < 0?" disabled":"") + ">Move up</button>"
                            + "<button class='btn btn-default'style='float: right!important;margin: 5px;' ng-click='moveCategory(" + i + ",1)'" + (i + 1 >= missionScope.categoryContent.length?" disabled":"") + ">Move down</button>"
                            + "<button class='btn btn-default'style='float: right!important;margin: 5px;' ng-click='renameCategory(" + i + ")'>Rename Category</button>"
                            + "<button class='btn btn-default'style='float: right!important;margin: 5px;' ng-click='deleteCategory(" + i + ")'>Delete Category</button>"; // old value: margin: 5px 0;
                        if (!missionScope.categoryContent[i].missions || missionScope.categoryContent[i].missions.length == 0) {
                            //no missions so far!
                            missionContent += "</div><div class='col-xs-12'>No missions added to the category yet</div>";
                        } else {
                            missionContent += "<button class='btn btn-default'style='float: right!important;margin: 5px;' ng-click='exportCategoryImages(" + i + ")'>Download Images</button>"
                            missionContent += "<button class='btn btn-default'style='float: right!important;margin: 5px;' ng-click='exportJSON(" + i + ")'>Download JSON</button>"
                            missionContent += "<button class='btn btn-default'style='float: right!important;margin: 5px;' data-toggle='modal' data-target='#previewBanner" + i + "'>Preview Images</button>"
                                + "<button class='btn btn-default'style='float: right!important;margin: 5px;' ng-click='previewBanner(" + i + ")' data-toggle='modal' data-target='#previewMissionModel'>Preview Route</button></div>";
                            var bannerModal = "<div class='modal fade' id='previewBanner" + i + "' tabindex='-1' role='dialog'><div class='modal-dialog modal-lg' role='document'><div class='modal-content banner-preview'><div class='modal-header'><button type='button' class='close' data-dismiss='modal' aria-label='Close'><span aria-hidden='true'>&times;</span></button><h4 class='modal-title'>Preview \"" + missionScope.categoryContent[i].name + "\"</h4></div><div class='modal-body' id='bannerpreview'>";
/*
                            bannerModal += "<div class='row'>";
                            for (var j = 0; j < missionScope.categoryContent[i].missions.length; j++) {
                                var mission = missionScope.categorisedMissions[i][j];
                                if (mission == undefined){
                                    missionScope.categoryContent[i].missions.splice(j,1);
                                    j--;
                                    console.log('generateAllMissions storeCategoryContent remove undefined mission',missionScope.categoryContent);
                                    storeCategoryContent(missionScope.categoryContent);
                                } else {
                                    missionContent += generateMission(mission, mission.position, i);
                                    bannerModal += "<div class='col-xs-2' style='padding-left: 4px; padding-right: 4px'><img class='img-responsive' style='border-width: 2px;' src='" + (mission.definition.logo_url ? mission.definition.logo_url + "=s136" : "/images/button_logo.png") + "' /></div>";
                                }
                            }
                            bannerModal += "</div>";
*/
                            for (let cnt = 0; cnt < missionScope.categoryContent[i].missions.length; cnt++) {
                                let mission = missionScope.categorisedMissions[i][cnt]; // not reversed
                                missionContent += generateMission(mission, mission.position, i);
                            }

                            /* a new circle mask resized to 1/4 128x128 with 4px spacing: 136x136 */
                            let smallmask = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIgAAACICAYAAAA8uqNSAAAAK3RFWHRDcmVhdGlvbiBUaW1lAG1hIDI3IGp1biAyMDIyIDE3OjA3OjAxICswMTAwKONaSQAAAAd0SU1FB+YGGw8LL0fo1K4AAAAJcEhZcwAACxIAAAsSAdLdfvwAAAAEZ0FNQQAAsY8L/GEFAAANLUlEQVR42u2dT2zb1h3H36MUF/EW2wVSpEABxx1QIEDXLc2fnhxMp1xSoD7t4BSzDrn40qq35NKpuTS3CTs0lwKTh8aHXeYCzSUnFfEpaVJv7SHAgMI2UGBFA1SyVwd1ZL69L8kn0RRJSRTJR8q/DxCTshWbT/zy9+/9yMcZY4IRRACG7gMgsg0JhAiFBEKEUtR9AGkwe3KCzZ+ZktsX2PRkgb0xO9n52SX5/TD+vf0za+0dWPvbT3+R//bl6zZbf7LLvtne0z20xOFsDIPU+TMnLEFACNifmUzuOrj/ZMcRy8/WVolpXBgLgVw5N9MRRJBFEEw05WbDGXZDfd/gB/J7vBn0u01hlFy/5az8MiP/zXHG5/zeD4sDywKx3H38U+4Fk0uBwE1cOfeiJQhsT0vX4UaKYVN+bcjTv8mZ2SwYRuPXf3rwrziPYe+zN08/PyiWhOBz8m9J0YgSZ8ZZ93ua0hVBJBAMtnBPeSNXAkEssTj/Elu+fKrHbdii4PWJ4vP65Ltfb+k4PvGP89M7z4wFIUTFKxZwZ/1HdvveD7mKXXIhEMQR1xde6XEfUhQNzln9WKHd0CWKICCW3WesZAq+IMVSdv9sSwa7t9a+Z6vrT3UfZl8yLRA/YcBSSFFUp46ba/yPj1q6j3FQdlbOvyPjGWlZeEl9Lw9CyaRAAoTRMLhZm1p69Lnu4xuF//39rd+3TbPitipZFkqmBIKg8+PFWR9hiOrU0ldf6j6+OEGQu98uVL1CubG6JQPa5gi/OV4yIRBkJcuXXz4UfI6rMLz4CQXBLCxKFrIe7QKB1bjz3mudVFUwc8PgrDLuwvBiC6VYkzHKAl4jRb6xuq3d7WgTCKwG3MlVmbYqpNWozZQffqD1E9FMa+XikhAMQkFBzqrUQii6UmMtAoE4vrh+hv1u9lfWa7iTiWK7nLVUVRdIkVt7hnQ7vILXsCZv33qiRSSpCwTZyeFYg1Vnyg8+Sn3kOcBJjevKmiA2gTVJs3yfqkA+ufZqx6WgnlE0+ELcJfBxw7Ema6p+grkeWJO0RJKKQHpdilmfnhSVPBW6dNOqX3ifMaOG/TRdTuIC8Yk3jnwgGhV3AJuWSBIViDeFZVyUp5ceriQ6ojHHrsSKhhJJ0qlwYgKBOGA5EIyiF0PGGyWKN+LBjkt4Q80YL3/6XWIiSaQn9bA4zA0SR7wgdpMxXEleeGt4ffvab9ji/Mlk/haL2YIg5rh/87eWW4E4MBAKRpOjWb/wN1Wmn//w29hjklgtiApIbXHArRhlEkeyIBvEhYh9fPbuhuw4iNWC3L/5eidbKRjsLLmVdHBqJRvok0Xgeklakrgm+mKzICiCKXEgWyFxpAesNIqOsNqI+5A5wprHQSwCQfncVSGtUSqbPrggDW6WsY8LFSKJg5EFYvdynLL2USGlIpg+rG47ab2xj6YrdOaNykgCUUGpU+vYRMCk+0M66sB6q/QXVmTUoHUkgaCfQ8Ud8IGUsWSD6UmzjAtWxSOjEFkgUGY37mBVCkqzAy5Uw3E1KDmoECAKkQQC16KUiWYf6ufIHmjZxIWL/VuLpyO7mkgCQYOxmoBDJ5juD4PwBxeufcehHQ5EYWiBQIndrEXUqE0w28jU10ockNVEma8ZWiBQopqEo5Q2+yD1xYWMfZy7YQtoQwkEebW6qQm3JugePDEYMqupqiorwoNhGEogqJgCBKZH7b6VPGOXH7hlRRAeDGNFBhbIYeshqroHTQzH9ORBLYoVGVggZD3yTVQrMpBAyHqMB1GsyEACIesxHkSxIn0Fgsc+da2HWdM9SGI0YEWwhRXB89360Vcgi6474fL+8BbCtiJoy8D+IIWzUIG4ez3w2CfdgyPiYaJ4UMV2kJ6RUIHABKmbrPFMMN0DI+IB0yOq0bmfFQkViJoBtJ4mSL0eY4ZhXfD9Znn7WhCAR03qHg4RL3ieLLZo+EIiEkSgQPB4azWlj+eQ6h4QES+2m7FbAcJqIoECmXdSW/wSmtIfV/C4chYaqAYKpOubeF33MIhkMJzQoXM/k997gn6gimPKVxHjh92WaLuZICviKxD1ZnIvRwHlZvyXUQkQyNSh/0yML5zba+cMZUG68YexqXsARLJwx8UE1UNCXQwW49E9ACJZDG5Y5xgVcz+R9AgERRNVXsdKTboHQCQLbnhzlmsbTCCu+keT7pY7MjTwxS8O8bEgnfXfNnQfNZEW3DrXs561/0CPQOJ68AiRP/zOfY9AXBXUhu4DJtLB4GYDW7+KKi3NToRCAiFC6RFIt0H5gILUI8KJ4yLwXIdYEE5FsiNCWLcguRgiFBIIEQoJhAiFBEKEQgIhQgkRiJjRfXBEOmAxgKCf9QgEC/kCUxTO6j5wIh12n/HAc00uhgiFBEKE0iOQ7pJWoqT74Ih0MIVRwhaLNnvpEUiay34T2cLv3PcIZPvpL2qXgtQjg7DOtevcd+gRyLqTxWDhXiziq/vQiVQo4cv6k92eH/hYkH1rbXhwYJol3UdOJAuMAIwB9v2WVPXNYpSSBDOoWDbmmMK0zjGMwsAC6b7RnNM9ACJZBONz2AYtyBxgQXacPV7SPQAiWYSwyxl+8QcIdTFYqHfvszdP6x4EkSS2EegahcMEVlLVnMx++1hZ9xCIZNhZufAHGAHsD2VBgKuiWtY9ECIZTMHK2PpVUBWBAnHVQ8jNjC3KvewGviNQIHcfN9mWU1l7flAs6R4KES+46JV7uX3vv4HvC53Nvfv4J2srHFNEjA8qtoR7QXE0iFCBqDhEKq0U1nVE5BFzAV+D6h+KvhZEld13nhkLuodExIPtXgxrgm51/Wnoe0MFgunf2/d+sPalm6nqHhgRD/vtQhVblDLCAlTQt6Nsdf1Ha4uAZmfl/Du6B0eMBkIFaT3K2O9nPUBfgSCA6TYyG7RWbs5p7RWsc4jQQSUhYQzUk3pr7Xtri2AV1TfdgySiYScawhIIQodBugcHEgj8VNeK8KrugRLRgPVA7wesR1jtw83AXe1kRfJNFOsBBhYIWZF8E8V6gKHuiyErkk+iWg8wlEAOWxFGa+jmhNaeUY1iPcDQd9bdWN22UiRU4pr1i3/RPXgiHNSupDgs64FzN+x9T0MLBLV7VV3FH6ZWgGxjCsOy9LD8gxTGvES6NxdmSrUC7LeLdd0fAuFPs/7Wn9WUPqxHFCIJBGbq6l//Y+0jYMWB6P4wiMPY7YT2/Nn11a2+s7ZBRL67H3/wTmeehlXpLrzsgKzFFPZilLD0KiSIwkiPf4DZUv2MbVOsUc9INpBZSx2uBcmEsvRRGUkgcDVv33riZDV8rrXHKfXVTGvl4pI8F1bvDsQR1bUoRn6AjLtnBNPIlPrqw2rHcFzLIL0egxDLE4ZQYe3GI7wCFWv8nI4kiAFlSlvHPtz+qK5FIeNLJuI6yPs3X++sOVIw2Fla0iwdEPvJuGNDxR2XPvw2tBF5GGJ9RhniEVfQ2qDMJnlscfCGEgfOQVziALEKRAWtSK1Q+2+bZp0ym2RBYqAakPHZjxqUeon9KYeqiKbma6BusiTxgwtPJgT/VP2ly59+F7s4QKwxiBusfffF9TPWGrxYYrVo8BLFJPHQdSu25YA4osyzDEJiz0mFmt3u5sBkG5TdjA6ssQxIN63ZdGmlkxQHSMyCKLDUJiyJym6kNanNlB9+kOTfHFdwgQnBaqq3I4mYw0viAgG9IjHr05OiErYUFnGYVv3C+9LgW5XqtMQBUhGI4pNrr7Kr8y9Z+9KSbMq4ZIHiknCcGscadx7VgDICxJHWA49TFQi4vvAKW758ygpemf3HqzPlBx+leQx5AaVzVEfVYypRrY7SFTYKqQsE+MQljYliuzz57tdbaR9LFnGsRlW1CqbpUrxoEQiASD5enO24HOuDoQD2UCCK15h0g9XQIQ6gTSAK1EvuvPcaO33yBes1YhODm5WppUef6zyutEFv7367WFNT9bAaEEaSKewgaBcIgDVZvvyyJzYRDYOL6tTSV1/qPr4ksYVRqKqKKECsgRnyOOdUopIJgShgTeB21PLwjI2vUPyEgaLijdUt6/lwWSFTAlHMnzlhZTu9QjFreXc9qIS2TbPiFQYshm534kcmBaIIEMom56w6ddxcy1OhzUlZK9z1ePMsC0ORaYEo/ITCmG1VpFjqxwrtRtZSZKSqu89YyRR8wW0tQB6EociFQBSzJyfYokyL3cGsApZFDqc+UXxe1yUWiAIP+xNCVNRMqxsEn+jf1ZWyRiFXAlEg67ly7kUrqMVWpcgKWyyiwRhmPc1mwTAacZf0EWTiAcNC8Dl7EWpR8opCPeYJgsA2C1nJsORSIF6unJuRbmjKEozXDSnQkyI3G86wG+r7Bj+Q3+OBaYNaEdL5LRAAClhz6pZGL5grgSDQUQ5R5H2RyLEQiBfELEow2Pe6ozhRtxd8I4WBbd4F4WUsBeIFsQsEMytdEdwThKMIsjgKWAR10rEqJNxES7oOWxT5iSWiciQEQkSHlmYnQiGBEKGQQIhQ/g9ZjWt6BcNukAAAAABJRU5ErkJggg==";
                            let bannerelements = [];
                            for (let cnt = missionScope.categoryContent[i].missions.length - 1; cnt >= 0; cnt--) { // reverse the list
                                let mission = missionScope.categorisedMissions[i][cnt];
                                bannerelements.push(`<img src="${(mission.definition.logo_url ? mission.definition.logo_url + "=s128" : "/images/button_logo.png")}" style="width: 128px; height: 128px; margin: 4px;">`);
                                if (cnt % 6 == 0 && cnt > 0) bannerelements.push("<br>\n");
                            }
                            bannerelements = bannerelements.join('');
                            bannerModal += `
<div style="width: 818px; transform: scale(1); outline: 1px solid #5afbea; margin: 0 auto;">
<div style="position: absolute; top: 0; left: 0; height: 100%; width: 100%; pointer-events: none; background: url(${smallmask}) left top; background-size: 136px;"></div>
<div style="background-color: black; display: inline-block; line-height: 0;">${bannerelements}</div>
</div>`;

                            bannerModal += "</div></div></div></div>";
                            missionContent += bannerModal;
                        }
                        missionContent += "</div></div></div></div>";
                    }
                    //add unsorted missions if there are any
                    missionContent += "<div class='panel panel-default'><div class='panel-heading' role='tab' id='header-unsorted'>"
                        + "<h4 class='panel-title' ng-class='{\"collapsed\" : unsortedCollapse.collapse}'>"
                        + "<a ng-click='toggleCollapse(unsortedCollapse, true)' role='button' data-toggle='collapse'>Unsorted Missions</a>";

                    let unsortedScope = missionScope.uncategorisedMissions;
                    let draftMissions = w.$filter('filter')(unsortedScope, {missionListState: "DRAFT"}, true).length;
                    let dopMissions = w.$filter('filter')(unsortedScope, {missionListState: "DRAFT_OF_PUBLISHED_MISSION"}, true).length;
                    let submittedMissions = w.$filter('filter')(unsortedScope, {missionListState: "SUBMITTED"}, true).length;
                    let sapMissions = w.$filter('filter')(unsortedScope, {missionListState: "SUBMITTED_AND_PUBLISHED"}, true).length;
                    let publishedMissions = w.$filter('filter')(unsortedScope, {missionListState: "PUBLISHED"}, true).length;
                    let unsortedMissions = unsortedScope.length;
                    missionContent += "<span class='label'>"+unsortedMissions+" mission" + (unsortedMissions == 1?"":"s") + "</span> ";
                    draftMissions > 0 && (missionContent += "<span class='label mission-list-item-draft'>"+draftMissions+" unpublished draft" + (draftMissions == 1?"":"s") + "</span> ");
                    submittedMissions > 0 && (missionContent += "<span class='label mission-list-item-submitted'>"+submittedMissions+" under review</span> ");
                    dopMissions > 0 && (missionContent += "<span class='label mission-list-item-draft_of_published_mission'>"+dopMissions+" being amended</span> ");
                    sapMissions > 0 && (missionContent += "<span class='label mission-list-item-submitted_and_published'>"+sapMissions+" change" + (sapMissions == 1?"":"s") + " under review</span> ");
                    publishedMissions > 0 && (missionContent += "<span class='label mission-list-item-published'>"+publishedMissions+" published</span>");

                    missionContent += "<button class='yellow checkboxedmissionsbutton' style='display: none' ng-click='toggleCategoryCheckboxes(\"categoryunsorted\")'>Toggle all checkboxes</button>"

                    missionContent += "</h4>"
                        + "</div><div class='panel-collapse collapse' ng-class='{\"in\" : !unsortedCollapse.collapse}' role='tabpanel'><div class='panel-body'>"
                        + "<div id='categoryunsorted' class='row'><div class='col-xs-12 categoryFunctions'>"
                        + generateSort('unsorted')
                        + "</div>";
                    for (let i = 0; i < missionScope.uncategorisedMissions.length; i++) {
                        missionContent += generateMission(missionScope.uncategorisedMissions[i], missionScope.uncategorisedMissions[i].position, false);
                    }
                    missionContent += "</div></div></div></div></div>";
                } else {
                    //if no user-defined categories, just loop through the missions
                    missionContent += "<div class='col-xs-12'>"
                        + generateSort('all')
                        + "</div>";
                    for (let i = 0; i < missionScope.missions.length; i++) {
                        let mission = missionScope.missions[i];
                        missionContent += generateMission(mission, i, false);
                    }
                }
                //modal for moving missions to categories
                missionContent += "<div class='modal fade' id='addCateModel' tabindex='-1' role='dialog'><div class='modal-dialog' role='document'><div class='modal-content'><div class='modal-header'><button type='button' class='close' data-dismiss='modal' aria-label='Close'><span aria-hidden='true'>&times;</span></button><h4 class='modal-title'>{{missionTitle}}</h4></div><div class='modal-body'>"
                    + "<select class='form-control' ng-model='selectedCategoryID' ng-change='addToCategory()' >";
                for (let i = 0; i < missionScope.categoryContent.length; i++) {
                    missionContent += "<option value='" + i + "' data-dismiss='modal'>" + missionScope.categoryContent[i].name + "</option>";
                }
                missionContent += "<option value='unsorted' data-dismiss='modal'>Unsorted Missions</option>";
                missionContent += "</select></div></div></div></div>";

                //modal for previewing missions
                missionContent += "<div class='modal fade' id='previewMissionModel' tabindex='-1' role='dialog'><div class='modal-dialog modal-lg' role='document'><div class='modal-content'><div class='modal-header'><button type='button' class='close' data-dismiss='modal' aria-label='Close'><span aria-hidden='true'>&times;</span></button><h4 class='modal-title'>Preview Mission</h4></div><div class='modal-body' style='background:#151515'>"
                    + "<div class='loading-screen' ng-show='loadingPreview'><div class='loading spin'></div></div><div class='notloading'></div>"
                    + "</div></div></div></div>";

                // Pass our fragment content to $compile, and call the function that $compile returns with the scope.
                var compiledContent = $compile(missionContent)(missionScope);
                // Put the output of the compilation in to the page using jQuery
                $('.missions-list').append(compiledContent);
                setTimeout(() => {
                    w.scrollTo(0, scrollPosition);
                }, 250);

                //now enable drag-drop for the missions!
                if (missionScope.categoryContent.length > 0) {
                    $('.row[id^=category]').sortable({
                        items: "div.missionbox",
                        connectWith: ".row[id^=category]",
                        tolerance: "pointer",
                        placeholder: "ui-state-highlight col-xs-12 col-sm-6 col-md-3",
                        start: function(event, ui) {
                            var start_pos = ui.item.index();
                            ui.item.data('start_pos', start_pos);
                            ui.item.data('start_cat', ui.item[0].parentElement.id);
                        },
                        update: function (event, ui) {
                            var start_pos = ui.item.data('start_pos'),
                                start_cat = ui.item.data('start_cat'),
                                end_pos = ui.item.index(),
                                end_cat = ui.item[0].parentElement.id;
                            !ui.sender && missionScope.dragMissions(start_pos, start_cat, end_pos, end_cat);
                        }
                    });
                }
            });
        }

        missionScope.exportData = function() {
            navigator.clipboard.writeText(JSON.stringify(missionScope.categoryContent)).then(function() {
                alert('Category data copied to your clipboard - please paste this in the Import Data box in the browser you want to export this to')
            }, function() {
                alert('Something went wrong')
            });
        };

        missionScope.exportDataFile = function() {
            let jsondata = JSON.stringify(missionScope.categoryContent);
            let filename = 'imattc-category-data.json';
            missionScope.downloadJSONFile(jsondata,filename);
        };

        function parseData(data) {
            if (data == null || data == "") return; // don't do anything
            //try to parse data, then turn it into object
            try {
                let parseddata = JSON.parse(data);
                if (!(parseddata instanceof Array)) return; // json must be an [] array
                let validdata = [];
                for (let cat of parseddata) {
                    if (cat instanceof Object && !(cat instanceof Array)) {
                        let validcat = {id:-1,name:'',missions:[],collapse:false,sortCriteria:'initial'};
                        for (let el in cat) {
                            if (typeof cat[el] == typeof validcat[el]) {
                                validcat[el] = cat[el];
                            }
                        }
                        if (validcat.id >= 0) validdata.push(validcat);
                    }
                }

                missionScope.categoryContent = validdata;
                storeCategoryContent(missionScope.categoryContent);
                generateAllMissions();
            } catch (e){
                alert('Importing data failed!!');
                console.log('Parsing JSON data failed',data);
            }
        }

        missionScope.importData = function() {
            let dataInput = prompt("Please paste in the text you got from the Data Export on your other device");
            parseData(dataInput);
        }

        missionScope.importDataFile = function() {
            function loadjson(event) {
                let data = event.target.result;
                parseData(data);
            }
            function loadfile(element) {
                if (!element.files.length) return;
                let reader = new FileReader();
                reader.onload = loadjson;
                reader.readAsText(element.files[0]);
            }
            let fileinput = document.createElement('input');
            fileinput.type = 'file';
            fileinput.accept = 'application/json,text/plain';
            fileinput.addEventListener('change',function(e) {
                e.preventDefault();
                loadfile(this);
            },false);
            fileinput.click();
        };

        if (document.querySelector('.welcome-panel')) {
            // something is wrong, this should not be here when drawing missions
            if (document.querySelector('.design-message')) document.querySelector('.design-message').innerText = "You need to reload the page and Sign in again.";
            if (document.querySelector('.create-new')) document.querySelector('.create-new').remove();
            addpoweredbymessage(document.querySelector('.welcome-panel'));
        } else {
            //compiling the buttons
            w.$injector.invoke(function($compile) {
                var buttonContent = "<div class='bordered-panel'>";

                //button for adding categories
                //    buttonContent += "<button ng-click='createCategory()' class='yellow create-mission-button'>Create New Category</button>"
                //      + "<button ng-click='exportData()' class='yellow create-mission-button'>Export Category Data</button>"
                //      + "<button ng-click='importData()' class='yellow create-mission-button'>Import Category Data</button>";
                //buttonContent += "<button ng-click='nukeCategories()' class='yellow create-mission-button'>NUKE EVERYTHING</button>";
                //    buttonContent += "<button ng-click='sortCategoryTitles()' class='yellow create-mission-button'>Sort Category titles</button>";

                buttonContent += "<div class='dropdown' style='display: inline-block'><button class='button yellow action-button dropdown-toggle' type='button' id='categorydropdown' data-toggle='dropdown' aria-haspopup='true' aria-expanded='true' style='margin: 0 5px;'>Category...</button>"
                    + "<ul class='dropdown-menu' aria-labelledby='categorydropdown' style='width: 220px; text-align: center;'>"
                    + "<li><a role='button' ng-click='createCategory()'>Add...</a></li>"
                    + "<li><a role='button' ng-click='exportData()'>Export data (clipboard)</a></li>"
                    + "<li><a role='button' ng-click='importData()'>Import data (paste)</a></li>"
                    + "<li><a role='button' ng-click='exportDataFile()'>Export data (file)</a></li>"
                    + "<li><a role='button' ng-click='importDataFile()'>Import data (file)</a></li>"
                    + "<li><a role='button' ng-click='sortCategoryTitles()'>Sort titles</a></li>"
                    + "<li><a role='button' ng-click='nukeCategories()'>Remove ALL categories...</a></li>"
                    + "</ul></div>"

                buttonContent += "<button ng-click='toggleCheckboxes()' class='yellow togglecheckboxbutton' style='margin: 0 0 0 5px;'>Show Checkboxes</button>";
                buttonContent += "<button ng-click='moveCheckedMissions()' data-toggle='modal' data-target='#addCateModel' class='checkboxedmissionsbutton' style='display: none'>Move<span class=\"MOVECOUNT\"></span>...</button>";
                for (let id in missionScope.missionListStates) {
                    buttonContent += "<button ng-click='clickButton2CheckedMissions(\"" + id + "\")' data-toggle='modal' class='checkboxedmissionsbutton' style='display: none' title='" + missionScope.missionListStates[id].BUTTON2.description + "'>" + missionScope.missionListStates[id].BUTTON2.title + "<span class=\"" + id + "\"></span>...</button>";
                }
                // buttonContent += "<button ng-click='submitCheckedMissions()' data-toggle='modal' class='checkboxedmissionsbutton' style='display: none' title='Submit mission'>Submit<span class=\"SUBMIT\"></span>...</button>";

                //tally up available missions, and missions in draft states
                var draftMissions = w.$filter('filter')(missionScope.missions, {missionListState: "DRAFT"}, true).length;
                var dopMissions = w.$filter('filter')(missionScope.missions, {missionListState: "DRAFT_OF_PUBLISHED_MISSION"}, true).length;
                var submittedMissions = w.$filter('filter')(missionScope.missions, {missionListState: "SUBMITTED"}, true).length;
                var sapMissions = w.$filter('filter')(missionScope.missions, {missionListState: "SUBMITTED_AND_PUBLISHED"}, true).length;
                var publishedMissions = w.$filter('filter')(missionScope.missions, {missionListState: "PUBLISHED"}, true).length;
                var remainder = (w.$rootScope.user.mission_limit || 180) - (dopMissions + submittedMissions + sapMissions + publishedMissions);
                buttonContent += "<h4 style='line-height: 2;'>";
                remainder > 0 && (buttonContent += "<span class='label'>"+remainder+" mission" + (remainder == 1?"":"s") + " remaining</span> ");
                draftMissions > 0 && (buttonContent += "<span class='label mission-list-item-draft'>"+draftMissions+" unpublished draft" + (draftMissions == 1?"":"s") + "</span> ");
                submittedMissions > 0 && (buttonContent += "<span class='label mission-list-item-submitted'>"+submittedMissions+" under review</span> ");
                dopMissions > 0 && (buttonContent += "<span class='label mission-list-item-draft_of_published_mission'>"+dopMissions+" being amended</span> ");
                sapMissions > 0 && (buttonContent += "<span class='label mission-list-item-submitted_and_published'>"+sapMissions+" change" + (sapMissions == 1?"":"s") + " under review</span> ");
                publishedMissions > 0 && (buttonContent += "<span class='label mission-list-item-published'>"+publishedMissions+" published</span>");
                buttonContent += "</h4>"
                buttonContent += "</div>";
                // Pass our fragment content to $compile, and call the function that $compile returns with the scope.
                var compiledContent = $compile(buttonContent)(missionScope);
                // Put the output of the compilation in to the page using jQuery
                $('.list').prepend(compiledContent);
            });
            $('.list .bordered-panel').prepend($('.list div:not(.bordered-panel) button.yellow.create-mission-button'));
        }
        //initiating the missions
        $(".missions-list").removeClass("row").addClass('ready');
        generateAllMissions();
    }
}

(function() {
    console.log('IMATTC plugin loaded'); // for debug purposes

    let storagesettingsname = 'settings';
    let settings = {
        defaultmissiontype: 0,
        autoskipmissiontype: false,
        defaultselectedcategorytitle: ''
    }
    function restoresettings() {
        // read stored data in a very safe way:
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
            if (typeof localStorage.getItem(storagesettingsname) != 'string' || localStorage.getItem(storagesettingsname) == '') {
                return;
            }
            let storedsettings = JSON.parse(localStorage.getItem(storagesettingsname));
            parseSettings(storedsettings,settings);
        } catch(e) {
            return false;
        }
    }
    function storesettings() {
        try {
            return localStorage.setItem(storagesettingsname, JSON.stringify(settings));
        } catch(error) {
            alert(error.toString());
        }
    };

    restoresettings();
    storesettings();

    // wait for a new mission at the mission type view, show radio buttons and select the default type
    let addedradiobuttons = false;
    let setcategoryselector = false;
    function bodymutationcallback(mutations) {
        let buttongrp = document.querySelector('.btn-group.btn-group-justified');
        if (buttongrp && buttongrp.querySelector('.btn-group .btn')) {
            if (!addedradiobuttons) {
                let radiobuttonsdiv = document.createElement('div');
                radiobuttonsdiv.style.display = 'table';
                radiobuttonsdiv.style.width = '100%';
                buttongrp.after(radiobuttonsdiv);
                addedradiobuttons = true;
                let buttondivs = buttongrp.querySelectorAll('.btn-group');
                let cnt = 0;
                for (let buttondiv of buttondivs) {
                    let labeldiv = radiobuttonsdiv.appendChild(document.createElement('div'));
                    labeldiv.style.display = 'table-cell';
                    labeldiv.style.textAlign = 'center';
                    let label = labeldiv.appendChild(document.createElement('label'));
                    label.style.cursor = 'pointer';
                    let radio = label.appendChild(document.createElement('input'));
                    radio.style.marginRight = '5px';
                    radio.style.cursor = 'pointer';
                    radio.type = 'radio';
                    radio.name = 'defaultmissiontype';
                    radio.value = cnt;
                    radio.checked = settings.defaultmissiontype == cnt;
                    label.appendChild(document.createTextNode('default for new missions'));
                    radio.addEventListener('change',function(e) {
                        settings.defaultmissiontype = parseInt(this.value);
                        storesettings();
                    },false);
                    cnt++;
                }
                let footerbutton = document.querySelector('.footer-buttons');
                if (footerbutton) {
                    footerbutton.style.textAlign = 'right';
                    let label = footerbutton.appendChild(document.createElement('label'));
                    label.style.display = 'block';
                    label.style.cursor = 'pointer';
                    let checkbox = label.appendChild(document.createElement('input'));
                    checkbox.style.marginRight = '5px';
                    checkbox.style.cursor = 'pointer';
                    checkbox.type = 'checkbox';
                    checkbox.checked = settings.autoskipmissiontype;
                    label.appendChild(document.createTextNode('Skip mission type for new missions'));
                    checkbox.addEventListener('change',function(e) {
                        settings.autoskipmissiontype = this.checked;
                        storesettings();
                    },false);
                }
            }

            // nothing selected: mission.definition._hidden false, mission.definition._sequential null
            // any order: mission.definition._hidden false, mission.definition._sequential false
            // hidden sequential: mission.definition._hidden true, mission.definition._sequential true
            // sequential: mission.definition._hidden false, mission.definition._sequential true
            setTimeout(function() {
                let scope = window.$scope($('div.editor'));
                if (!scope.mission || scope.mission.definition._sequential !== null) return; // apply only at a new mission

                let buttons = buttongrp.querySelectorAll('.btn-group .btn');
                if (buttons.length > settings.defaultmissiontype) {
                    buttons[settings.defaultmissiontype].click();
                    // wait until scope is changed

                    setTimeout(function() { // the active button is assigned a moment later
                        let nextbutton = document.querySelector('.footer-buttons button');
                        if (nextbutton && settings.autoskipmissiontype) {
                            let editscope = window.$scope($('div.editor'));
                            nextbutton.click();
                        }
                    });
                }
            });
        } else if (!buttongrp && addedradiobuttons) {
            addedradiobuttons = false;
        }

        // set and store the selected category when submitting a mission
        let categoryselector = document.querySelector('.category-dropdown select');
        if (categoryselector && !setcategoryselector) {
            let selectedcategoryoption = [...categoryselector.options].find((el)=>{return el.text == settings.defaultselectedcategorytitle});
            let defaultselectedcategoryid = (selectedcategoryoption != undefined ? parseInt(selectedcategoryoption.value) : -1);
            setcategoryselector = true;
            categoryselector.value = defaultselectedcategoryid;
            let editScope = window.$scope($('div.editor'));
            editScope.selectedCategoryID = defaultselectedcategoryid;
            categoryselector.addEventListener('change',function(e) {
                settings.defaultselectedcategorytitle = (this.value >= 0 ? this.options[this.selectedIndex].text : "");
                storesettings();
            },false);
            categoryselector.style.display = 'unset';
        } else if (!categoryselector && setcategoryselector) {
            setcategoryselector = false;
        }
    }
    let bodyobserver = new MutationObserver(bodymutationcallback);
    bodyobserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    let stylesheetchanges = document.body.appendChild(document.createElement('style'));
    stylesheetchanges.innerHTML = `
    .editor .preview-view {
        max-width: unset;
    }
    .preview-view .preview-mission .body-panel .panel-container .waypoints {
        min-height: unset;
    }
    .preview-view .preview-mission .body-panel .panel-container .map {
        position: absolute;
        left: 0;
        right: 450px;
        top: 0;
        bottom: 0px;
    }
    .preview-view .preview-mission .body-panel .panel-container .waypoints {
        position: absolute;
        width: 420px;
        right: 0;
        top: 0;
        bottom: 0px;
    }
    .preview-view .preview-mission .angular-google-map-container {
        width: 100%;
        height: 100%;
    }
    .preview-view .preview-mission .body-panel .panel-container .category-dropdown {
        bottom: 0px;
        right: 0px;
        position: absolute;
    }
    .input-group-btn {
        font-size: unset;
    }
    .clickButton2results {
        margin-left: 20px;
        font-size: larger;
    }
    .landing-page {
        width: unset;
        max-width: 650px;
    }
    .checkboxesDisplayed {
        cursor: pointer;
    }
    /*
    .missions-list.ready {
        height: calc(100vh - 242px);
        overflow: scroll;
    }
    */
    `;
})();
