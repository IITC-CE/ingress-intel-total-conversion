// ==UserScript==
// @author          MaxEtMoritz
// @name            Glympse
// @category        Layer
// @version         0.0.1
// @namespace       https://github.com/MaxEtMoritz/iitc-glympse
// @downloadURL     https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/MaxEtMoritz/glympsemap.user.js
// @updateURL       https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/MaxEtMoritz/glympsemap.meta.js
// @description     View a Glympse tag directly on the Intel map.
// @icon            data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeBAMAAADJHrORAAAAKlBMVEUA9DhAebw5b7Y5b7Y5b7Y5b7ZYhsH///+fudzi6vRIpdttlclPwO45b7bf8WGPAAAAAXRSTlMAQObYZgAAANhJREFUGNNlkTsOwjAMhqvcgE48lsYDonAqunECE7Ex0KxlqSommFDVhW5cocqhsJ20hfIPkb78fiR2FLEUACTRIPDqUQVOfrG/gFGDrWcx7H0A89I5V3eeCbdOJAlk68ZzzAFK7Lqmu0fgpiNHB6YkRth2d+lIzrPijuEFALvySIe19uJ5g8Q5klrhFE8AJfN19Kd8qKoSz74eYkaV1j5fcWxBvEAT3pejaakrpwmniIayuVzC/9VSHE0mA6KAuXAxzudNeOsHyt9Y2dewgem8p/v429f3Pj/UdGXDkoFlRwAAAABJRU5ErkJggg==
// @icon64          data:image/png;base64,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
// @preview         https://github.com/MaxEtMoritz/iitc-glympse/blob/master/images/Screenshot%202022-08-12%20163456.png
// @issueTracker    https://github.com/MaxEtMoritz/iitc-glympse/issues
// @homepageURL     https://github.com/MaxEtMoritz/iitc-glympse
// @id              glympsemap@MaxEtMoritz
// @match           *://intel.ingress.com/*
// @grant           none
// ==/UserScript==
