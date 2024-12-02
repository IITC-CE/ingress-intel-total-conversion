// ==UserScript==
// @author         blsmit5728
// @id             direct-link@blsmit5728
// @name           Direct Link
// @version        1.0.0
// @namespace      https://github.com
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/blsmit5728/direct-link.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/blsmit5728/direct-link.user.js
// @description    Direct Link
// @runAt          document-start
// @category       Misc
// @match          *://*.ingress.com/intel*
// @match          *://*.ingress.com/mission/*
// @match          *://mission-author-dot-betaspike.appspot.com/*
// @match          *://intel.ingress.com/*
// @match          *://opr.ingress.com/*
// @grant          none
// ==/UserScript==

/*jshint esversion: 6, loopfunc: true*/
(function (version) {
    'use strict';
// TG Links
    var dirLinks = (function () {
        var normalText = 'Direct Link';
        var clickedText = 'Direct Copied';
        var delay = 1000;

        var copyDirLink = function (guid) {
            var textArea = document.createElement('textarea');
            let portalDetails = portalDetail.get(guid);
            let p_latE6 = portalDetails.latE6;
            let p_lngE6 = portalDetails.lngE6;
            textArea.value = 'https://link.ingress.com/?link=https%3A%2F%2Fintel.ingress.com%2Fportal%2F' + guid + '&apn=com.nianticproject.ingress&isi=576505181&ibi=com.google.ingress&ifl=https%3A%2F%2Fapps.apple.com%2Fapp%2Fingress%2Fid576505181&ofl=https%3A%2F%2Fintel.ingress.com%2Fintel%3Fpll%3D' + p_latE6 / 1E6 + '%2C' + p_lngE6 / 1E6
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                $('#copydirectlinnk-link').html(clickedText);
                setTimeout(function () {
                    $('#copydirectlinnk-link').html(normalText);
                }, delay);
            } catch (err) {
                console.log('Direct Link was unable to copy');
            }
            document.body.removeChild(textArea);
        };
        var addDirLink = function (data) {
            $('.linkdetails').append(
                $('<aside>').append(
                    $('<div>').append(
                        $('<a>').attr({
                            id: 'copydirectlinnk-link',
                            title: 'Copy a Direct link to the clipboard'
                        }).text(normalText).click(function () {
                            copyDirLink(window.selectedPortal);
                        })
                    )
                )
            );
        };

        var setup = function () {
            addHook('portalDetailsUpdated', addDirLink);
        };
        setup.info = {script: {name: 'PortalMapBot Crowd Sourced Portal Finder', version: version}};
        if (!window.bootPlugins) window.bootPlugins = [];
        window.bootPlugins.push(setup);
        // if IITC has already booted, immediately run the 'setup' function
        if (window.iitcLoaded && typeof setup === 'function') setup();
    });

    if (/^https?:\/\/(www\.|intel\.)?ingress\.com\//i.test(window.location.href)) {
        // We're in Intel, setup TG Links IITC Plugin
        dirLinks();
    }
})(GM_info.script.version);
