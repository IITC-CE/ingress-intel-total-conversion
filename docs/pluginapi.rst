The Plugin API
==============

IITC has a plugin API that can be used by other userscripts to register as
plugins. It also imports `jQuery UI <https://jqueryui.com/>`_ to serve as a
widget toolkit, however the widgets are styled to match IITC's look.

Plugin lifecycle
----------------

Most plugins follow this plan:

1. Create a wrapper function
2. Add some extra variables to make the plugin known to IITC. Create some globals
   if they are not set yet.
3. Put actual plugin code inside the wrapper function, with a setup function inside
4. Append the setup function to the :data:`window.bootPlugins` list
5. Stringify the wrapper function and inject it into the page context as an IIFE

With first-party plugins, enforcement of this plan is done by using special
build-time syntax (yes, IITC is using a custom build/macro system).

Writing plugins
---------------

IITC plugins are themselves userscripts. This means that the simplest possible
plugin that follows this pattern would look like this:

.. code-block:: javascript

  // ==UserScript==
  // @id hello-iitc
  // @name IITC Plugin: Hello World
  // @category Misc
  // @version 0.0.1
  // @namespace https://tempuri.org/iitc/hello
  // @description Hello, World plugin for IITC
  // @include http://www.ingress.com/intel*
  // @match http://www.ingress.com/intel*
  // @include https://www.ingress.com/intel*
  // @match https://www.ingress.com/intel*
  // @grant none
  // ==/UserScript==

  // Wrapper function that will be stringified and injected
  // into the document. Because of this, normal closure rules
  // do not apply here.
  function wrapper(plugin_info) {
    // Make sure that window.plugin exists. IITC defines it as a no-op function,
    // and other plugins assume the same.
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    // Name of the IITC build for first-party plugins
    plugin_info.buildName = 'hello';

    // Datetime-derived version of the plugin
    plugin_info.dateTimeVersion = '20150829103500';

    // ID/name of the plugin
    plugin_info.pluginId = 'hello';

    // The entry point for this plugin.
    function setup() {
      alert('Hello, IITC!');
    }

    // Add an info property for IITC's plugin system
    setup.info = plugin_info;

    // Make sure window.bootPlugins exists and is an array
    if (!window.bootPlugins) window.bootPlugins = [];
    // Add our startup hook
    window.bootPlugins.push(setup);
    // If IITC has already booted, immediately run the 'setup' function
    if (window.iitcLoaded && typeof setup === 'function') setup();
  }

  // Create a script element to hold our content script
  var script = document.createElement('script');
  var info = {};

  // GM_info is defined by the assorted monkey-themed browser extensions
  // and holds information parsed from the script header.
  if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
    info.script = {
      version: GM_info.script.version,
      name: GM_info.script.name,
      description: GM_info.script.description
    };
  }

  // Create a text node and our IIFE inside of it
  var textContent = document.createTextNode('('+ wrapper +')('+ JSON.stringify(info) +')');
  // Add some content to the script element
  script.appendChild(textContent);
  // Finally, inject it... wherever.
  (document.body || document.head || document.documentElement).appendChild(script);

If all goes well, after you install the userscript and refresh intel,
you should see the following:

.. image:: _static/alertdemo.png

Since IITC uses jQuery UI, and jQuery UI in turn patches ``alert()``, no
browser alert is expected.
