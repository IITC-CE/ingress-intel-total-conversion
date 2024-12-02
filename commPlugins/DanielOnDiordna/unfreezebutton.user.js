// ==UserScript==
// @author         DanielOnDiordna
// @name           Unfreeze button
// @category       Tweak
// @version        0.0.3.20210724.002500
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/unfreezebutton.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/DanielOnDiordna/unfreezebutton.user.js
// @description    [danielondiordna-0.0.3.20210724.002500] Display an Unfreeze button, to use in case of IITC app hang after using zoom on mobile devices.
// @id             unfreezebutton@DanielOnDiordna
// @namespace      https://softspot.nl/ingress/
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // use own namespace for plugin
    window.plugin.unfreezebutton = function() {};
    var self = window.plugin.unfreezebutton;
    self.id = 'unfreezebutton';
    self.title = 'Unfreeze button';
    self.version = '0.0.3.20210724.002500';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:

version 0.0.1.20171106.135600
- first release

version 0.0.2.20210117.224800
- updated plugin wrapper and userscript header formatting to match IITC-CE coding

version 0.0.3.20210121.223900
- version number fix

version 0.0.3.20210421.190200
- minor fix for IITC CE where runHooks iitcLoaded is executed before addHook is defined in this plugin

version 0.0.3.20210724.002500
- prevent double plugin setup on hook iitcLoaded
`;
    self.namespace = 'window.plugin.' + self.id + '.';
    self.pluginname = 'plugin-' + self.id;

    self.icon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAAB3RJTUUH4QMeCBY43CNkCgAAAAlwSFlzAAALEwAACxMBAJqcGAAAAARnQU1BAACxjwv8YQUAAAXuSURBVHjalVdZjxRVFD619L7Q3bP0NAwzLDIGkLgRYxSMkcTIG6+++MjvUF8wJr74E3w3MWQ0MUSjAQTREEGaQGQYZsbp6XV6767u2jzfraqe7mHA4iSVyty+93xn+c53ayRiKxZXsulU7lNZUc/blpkhHyb52cRmu2/2XbL1wWW1W/hMml5qUblczhm6vma/oN3YqNu/rtbs7d7whc7pw35++epyWk6lkpcUVV3wmQBphiXeTc2gSk8ny7ZHa35MDYRPZJOLX8sSyRf8Hqr3dbqyUhVvRXKKLfP7+nqd8uWOb/DpdOIjWQ0Ekn4PbLQ0Gpo2/VVskyI7wOtNjRqc/Qa/ddNf5uFgMKSSbUsk7U0VlNGwbAoqsvj71GycDAZebfTJxaXH9R7FAgq9dyhNAXff7nNPmy3Je4F5DpcfVuheaaeEEgf4ei5Bh1MR3uesRVQHNMrgnm1zK3D2GreA+TR6xm0CGKW6slKj1Xqf5mIhMnlzuTucOOCBT0cD4u+zi5OgMJwBzGw0SK2BSb88qdO/rcGzgf+p9agzNOn2Vov+KDRpLh6irm7ymvGUY2QFe1DtPpVNuTOkkCqTxon89Lgm9oJ83j7UWR0/8PJ0jPsk0cNqj6o9fQIoHlRFG7baA7q12RyV+gn32+t/kMFQNQDZbiKwhX1hOjETF9UaVc622IW7YFiWABzyYRwCW2HxoEIJBq70hoI0ISYNSo29eG+2nTKmw6rItNhx2hNgBh6bilIqHHB8hJw8S5VCZyJjpjfd2GiMsgFz03yorumiBQjv+EyMDjG51jnT5sCgt+b3cf80ul/p8j4n0BQH0NctGnACWIed3p8cAcMmgDGbcApxmI0HOZsgqbz223qDtjoDUb41BsxwMNiLfQNWLRCny4F5dmYhzaMkicDQJvR8NhacJOl4qZ9lj7Z7dIdF481ckspcbogFZlfn1qA60YBMJ7mHd0ptMbvnjkw9158o9WA4pP+zONfFMAzSdJ3eyMYoytPjSWQ6EqAz8474tfpDUbEh+9zN9HHT+Xe12+2Qd8mBdYqiiEMWZ4M31gotnQaDAfW1AP34oClYK/rIZW51dbqc74qJUC2DCo02HU+pIlDBE1kWD/zhgfV6vckeY8PNzZYQ/iz3ZIafGLO03HUI8jerGJj7wZEMVbh3aw2N3mfVyjOB7o4p3ID9K4pKNWZ9udunEu9952CKxrs8AWxx5qWOozoFd0TCEAL32pPc0qKKGCsoG/ZihNBziA3s58fbYiTHi41RnI+pOyJSq1Vtr9T8lUB9vgTA0PuVzmiOkeUUM7zEzG7zb2B0hgNo8phhvmtcerB4hveAXKuuqGCOl7gF+xMhCuICtk0BXK0Vd+YYvTQ4BOg0LgjLDQfxHc1EaT9H+8pMlJpDS9y/FVfDAXqCZ3spE3EuA/az1uyLqujsBCREwGB9KiSTaZrCqTwOvMZjgtEB6CLLXI4jhc2wOoEYIExcsemsO6cwgB5Lh8VvcCoxIuYf0nsqGxdZQ+FuF1vkjS1TdgcYjo+yAxDqzEJKlAi6nGCpCyk7c46s4kGnp7AcXyQeWz0/EAt8MOD58KUpOpAM0avZBFnmjshM3E42//Auz+RUWBHfVJC47C7H/H1GvzPzPXm8ymXvWdLoAkBgAEZFNMMUGZ+ei1OGyzw+2xPk2j1aeGDeTHqguAQgpWA23tB0cS/LzoUPLUAg47M7bpVqqfOsb5NRT0eg7OxuqStAs6zjSVfwl/j2QUmvrTUwFmINvca5vUBHiVnWc7RtVyAAwfX22lyCTPcKAwFR2pOzMe6bL1dk6JotVyuVhp/NKGFQsujc4YwgluECI4C3mRcHE0FnVHzYo0f5gXzj5vUfLMvfAYCbhi6yhygspsJMHtZhd5T8mNZr0DfffndXyWZzf9bKmx8fmM/FI5G4r8POyAT4gzBAquSvvLCt9Tx98dWXpeV7nU8EnS9evLigad1L6XTkvCIrKY/m+Cz2+8+ZqIgo/Z6VstvtRjW/Uvy+0At9vn7ryup/w5W17u+vmOsAAAAASUVORK5CYII=';
    self.visible = false;

    self.unfreeze = function() {
        if (window.smartphone) {
            window.smartphone.mapButton.click();
        }
        map.panBy(new L.Point(0,1));
    };

    self.show = function() {
        if (self.visible) return;
        $('#updatestatus').prepend('<a class="unfreezebutton" onclick="' + self.namespace + 'unfreeze(); return false;" style="float:right;margin:-66px 0px 0px 0px;" title="Unfreeze IITC"><span style="display:inline-block;background-image:url(\'' + self.icon + '\');background-position:left top;background-repeat:no-repeat;width:30px;height:30px;float:left;margin:3px 1px 0 4px;"></span></a>');
        self.visible = true;
    };

    self.hide = function() {
        if (!self.visible) return;
        $('.unfreezebutton').remove();
        self.visible = false;
    };

    self.checkstatus = function() {
        if (window.mapDataRequest.status.short !== 'done') return;
        switch (window.mapDataRequest.getStatus().short) {
            case 'done': self.hide(); break;
            case 'paused': self.show(); break;
        }
    };

    self.setup = function() {
        if ('pluginloaded' in self) {
            console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
            return;
        } else {
            self.pluginloaded = true;
        }

        if (window.useAndroidPanes()) {
            android.addPane("plugin-unfreezebutton", "Unfreeze IITC", "ic_action_discard");
            addHook("paneChanged", function(pane) { if (pane === "plugin-unfreezebutton") self.unfreeze(); });
        }
        self.show();
        window.addHook('mapDataRefreshEnd',function() { window.setTimeout(self.hide); }); // use a timeout to make sure the window status is set
        console.log('IITC plugin loaded: ' + self.title + ' version ' + self.version);
    };

    var setup = function() {
        if (window.isSmartphone()) {
            (window.iitcLoaded?self.setup():window.addHook('iitcLoaded',self.setup));
        }
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

