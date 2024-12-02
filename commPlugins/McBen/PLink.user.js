// ==UserScript==
// @author         McBen
// @name           PLink
// @id             PLink@McBen
// @category       Portal Info
// @version        1.1
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @description    Enhance Portal Links
// @icon64         data:image/png;base64,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
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/McBen/PLink.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/McBen/PLink.user.js
// @include        https://intel.ingress.com/*
// ==/UserScript==

function wrapper(SCRIPT_INFO) {
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 465:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Z": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(645);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_getUrl_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(667);
/* harmony import */ var _node_modules_css_loader_dist_runtime_getUrl_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_getUrl_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _copy_png__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(15);
/* harmony import */ var _upload_png__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(843);
// Imports




var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_0___default()(function(i){return i[1]});
var ___CSS_LOADER_URL_REPLACEMENT_0___ = _node_modules_css_loader_dist_runtime_getUrl_js__WEBPACK_IMPORTED_MODULE_1___default()(_copy_png__WEBPACK_IMPORTED_MODULE_2__/* ["default"] */ .Z);
var ___CSS_LOADER_URL_REPLACEMENT_1___ = _node_modules_css_loader_dist_runtime_getUrl_js__WEBPACK_IMPORTED_MODULE_1___default()(_upload_png__WEBPACK_IMPORTED_MODULE_3__/* ["default"] */ .Z);
// Module
___CSS_LOADER_EXPORT___.push([module.id, ".portalweblinks .title{font-size:medium;font-weight:700}.portalweblinks .alink span{display:inline-block;vertical-align:super;width:30%}.portalweblinks .alink a{background:#565555;border:1px solid #000;display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:50%}.portalweblinks .alink button{background-color:#e3e3e3;background-image:url(" + ___CSS_LOADER_URL_REPLACEMENT_0___ + ");background-position:50%;background-repeat:no-repeat;background-size:16px 15px;border:2px solid #000;border-radius:3px;display:inline-block;height:22px;margin-left:2em;min-width:0;width:20px}.portalweblinks #qrcode{margin-top:1em}.portalweblinks #qrcode canvas{margin-left:10%;width:70%}#portaldetails .upload{background-image:url(" + ___CSS_LOADER_URL_REPLACEMENT_1___ + ");border-radius:3px;display:block;height:22px;position:absolute;right:1.2em;top:0;width:20px;z-index:1}.toast-popup{background-color:rgba(80,80,80,.8);border-radius:8px;box-shadow:2px 2px 10px #555;color:#fff;display:none;font-size:12px;font-weight:600;padding:6px 12px;position:fixed;top:80%;z-index:500000}", ""]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ 645:
/***/ ((module) => {



/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/
// css base code, injected by the css-loader
// eslint-disable-next-line func-names
module.exports = function (cssWithMappingToString) {
  var list = []; // return the list of modules as css string

  list.toString = function toString() {
    return this.map(function (item) {
      var content = cssWithMappingToString(item);

      if (item[2]) {
        return "@media ".concat(item[2], " {").concat(content, "}");
      }

      return content;
    }).join("");
  }; // import a list of modules into the list
  // eslint-disable-next-line func-names


  list.i = function (modules, mediaQuery, dedupe) {
    if (typeof modules === "string") {
      // eslint-disable-next-line no-param-reassign
      modules = [[null, modules, ""]];
    }

    var alreadyImportedModules = {};

    if (dedupe) {
      for (var i = 0; i < this.length; i++) {
        // eslint-disable-next-line prefer-destructuring
        var id = this[i][0];

        if (id != null) {
          alreadyImportedModules[id] = true;
        }
      }
    }

    for (var _i = 0; _i < modules.length; _i++) {
      var item = [].concat(modules[_i]);

      if (dedupe && alreadyImportedModules[item[0]]) {
        // eslint-disable-next-line no-continue
        continue;
      }

      if (mediaQuery) {
        if (!item[2]) {
          item[2] = mediaQuery;
        } else {
          item[2] = "".concat(mediaQuery, " and ").concat(item[2]);
        }
      }

      list.push(item);
    }
  };

  return list;
};

/***/ }),

/***/ 667:
/***/ ((module) => {



module.exports = function (url, options) {
  if (!options) {
    // eslint-disable-next-line no-param-reassign
    options = {};
  } // eslint-disable-next-line no-underscore-dangle, no-param-reassign


  url = url && url.__esModule ? url.default : url;

  if (typeof url !== "string") {
    return url;
  } // If url is already wrapped in quotes, remove them


  if (/^['"].*['"]$/.test(url)) {
    // eslint-disable-next-line no-param-reassign
    url = url.slice(1, -1);
  }

  if (options.hash) {
    // eslint-disable-next-line no-param-reassign
    url += options.hash;
  } // Should url be wrapped?
  // See https://drafts.csswg.org/css-values-3/#urls


  if (/["'() \t\n]/.test(url) || options.needQuotes) {
    return "\"".concat(url.replace(/"/g, '\\"').replace(/\n/g, "\\n"), "\"");
  }

  return url;
};

/***/ }),

/***/ 577:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(379);
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(795);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(569);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(565);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(216);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(589);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_ruleSet_1_rules_1_use_1_node_modules_postcss_loader_dist_cjs_js_ruleSet_1_rules_1_use_2_styles_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(465);

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());

      options.insert = _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
    
options.domAPI = (_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_ruleSet_1_rules_1_use_1_node_modules_postcss_loader_dist_cjs_js_ruleSet_1_rules_1_use_2_styles_css__WEBPACK_IMPORTED_MODULE_6__/* ["default"] */ .Z, options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_ruleSet_1_rules_1_use_1_node_modules_postcss_loader_dist_cjs_js_ruleSet_1_rules_1_use_2_styles_css__WEBPACK_IMPORTED_MODULE_6__/* ["default"] */ .Z && _node_modules_css_loader_dist_cjs_js_ruleSet_1_rules_1_use_1_node_modules_postcss_loader_dist_cjs_js_ruleSet_1_rules_1_use_2_styles_css__WEBPACK_IMPORTED_MODULE_6__/* ["default"].locals */ .Z.locals ? _node_modules_css_loader_dist_cjs_js_ruleSet_1_rules_1_use_1_node_modules_postcss_loader_dist_cjs_js_ruleSet_1_rules_1_use_2_styles_css__WEBPACK_IMPORTED_MODULE_6__/* ["default"].locals */ .Z.locals : undefined);


/***/ }),

/***/ 379:
/***/ ((module) => {



var stylesInDOM = [];

function getIndexByIdentifier(identifier) {
  var result = -1;

  for (var i = 0; i < stylesInDOM.length; i++) {
    if (stylesInDOM[i].identifier === identifier) {
      result = i;
      break;
    }
  }

  return result;
}

function modulesToDom(list, options) {
  var idCountMap = {};
  var identifiers = [];

  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var id = options.base ? item[0] + options.base : item[0];
    var count = idCountMap[id] || 0;
    var identifier = "".concat(id, " ").concat(count);
    idCountMap[id] = count + 1;
    var indexByIdentifier = getIndexByIdentifier(identifier);
    var obj = {
      css: item[1],
      media: item[2],
      sourceMap: item[3],
      supports: item[4],
      layer: item[5]
    };

    if (indexByIdentifier !== -1) {
      stylesInDOM[indexByIdentifier].references++;
      stylesInDOM[indexByIdentifier].updater(obj);
    } else {
      var updater = addElementStyle(obj, options);
      options.byIndex = i;
      stylesInDOM.splice(i, 0, {
        identifier: identifier,
        updater: updater,
        references: 1
      });
    }

    identifiers.push(identifier);
  }

  return identifiers;
}

function addElementStyle(obj, options) {
  var api = options.domAPI(options);
  api.update(obj);

  var updater = function updater(newObj) {
    if (newObj) {
      if (newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap && newObj.supports === obj.supports && newObj.layer === obj.layer) {
        return;
      }

      api.update(obj = newObj);
    } else {
      api.remove();
    }
  };

  return updater;
}

module.exports = function (list, options) {
  options = options || {};
  list = list || [];
  var lastIdentifiers = modulesToDom(list, options);
  return function update(newList) {
    newList = newList || [];

    for (var i = 0; i < lastIdentifiers.length; i++) {
      var identifier = lastIdentifiers[i];
      var index = getIndexByIdentifier(identifier);
      stylesInDOM[index].references--;
    }

    var newLastIdentifiers = modulesToDom(newList, options);

    for (var _i = 0; _i < lastIdentifiers.length; _i++) {
      var _identifier = lastIdentifiers[_i];

      var _index = getIndexByIdentifier(_identifier);

      if (stylesInDOM[_index].references === 0) {
        stylesInDOM[_index].updater();

        stylesInDOM.splice(_index, 1);
      }
    }

    lastIdentifiers = newLastIdentifiers;
  };
};

/***/ }),

/***/ 569:
/***/ ((module) => {



var memo = {};
/* istanbul ignore next  */

function getTarget(target) {
  if (typeof memo[target] === "undefined") {
    var styleTarget = document.querySelector(target); // Special case to return head of iframe instead of iframe itself

    if (window.HTMLIFrameElement && styleTarget instanceof window.HTMLIFrameElement) {
      try {
        // This will throw an exception if access to iframe is blocked
        // due to cross-origin restrictions
        styleTarget = styleTarget.contentDocument.head;
      } catch (e) {
        // istanbul ignore next
        styleTarget = null;
      }
    }

    memo[target] = styleTarget;
  }

  return memo[target];
}
/* istanbul ignore next  */


function insertBySelector(insert, style) {
  var target = getTarget(insert);

  if (!target) {
    throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");
  }

  target.appendChild(style);
}

module.exports = insertBySelector;

/***/ }),

/***/ 216:
/***/ ((module) => {



/* istanbul ignore next  */
function insertStyleElement(options) {
  var element = document.createElement("style");
  options.setAttributes(element, options.attributes);
  options.insert(element, options.options);
  return element;
}

module.exports = insertStyleElement;

/***/ }),

/***/ 565:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



/* istanbul ignore next  */
function setAttributesWithoutAttributes(styleElement) {
  var nonce =  true ? __webpack_require__.nc : 0;

  if (nonce) {
    styleElement.setAttribute("nonce", nonce);
  }
}

module.exports = setAttributesWithoutAttributes;

/***/ }),

/***/ 795:
/***/ ((module) => {



/* istanbul ignore next  */
function apply(styleElement, options, obj) {
  var css = "";

  if (obj.supports) {
    css += "@supports (".concat(obj.supports, ") {");
  }

  if (obj.media) {
    css += "@media ".concat(obj.media, " {");
  }

  var needLayer = typeof obj.layer !== "undefined";

  if (needLayer) {
    css += "@layer".concat(obj.layer.length > 0 ? " ".concat(obj.layer) : "", " {");
  }

  css += obj.css;

  if (needLayer) {
    css += "}";
  }

  if (obj.media) {
    css += "}";
  }

  if (obj.supports) {
    css += "}";
  }

  var sourceMap = obj.sourceMap;

  if (sourceMap && typeof btoa !== "undefined") {
    css += "\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))), " */");
  } // For old IE

  /* istanbul ignore if  */


  options.styleTagTransform(css, styleElement, options.options);
}

function removeStyleElement(styleElement) {
  // istanbul ignore if
  if (styleElement.parentNode === null) {
    return false;
  }

  styleElement.parentNode.removeChild(styleElement);
}
/* istanbul ignore next  */


function domAPI(options) {
  var styleElement = options.insertStyleElement(options);
  return {
    update: function update(obj) {
      apply(styleElement, options, obj);
    },
    remove: function remove() {
      removeStyleElement(styleElement);
    }
  };
}

module.exports = domAPI;

/***/ }),

/***/ 589:
/***/ ((module) => {



/* istanbul ignore next  */
function styleTagTransform(css, styleElement) {
  if (styleElement.styleSheet) {
    styleElement.styleSheet.cssText = css;
  } else {
    while (styleElement.firstChild) {
      styleElement.removeChild(styleElement.firstChild);
    }

    styleElement.appendChild(document.createTextNode(css));
  }
}

module.exports = styleTagTransform;

/***/ }),

/***/ 15:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Z": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAMAAADXqc3KAAAAA3NCSVQICAjb4U/gAAAACXBIWXMAAAGVAAABlQEMTY6IAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAIdQTFRF////AAAAAAAAJCQkICAgGhoaFRUVIiIiHh4eGxsbHR0aHh4bHh4aHR0aHh4bHR0aHBwaHBwcHh4cHR0bHh4cHR0bHR0cHR0bHR0aHR0cHR0bHR0aHh4bHR0bHR0bHR0bHR0bHh4bHR0bHR0bHR0bHR0aHR0bHR0bHh4bHR0bHR0bHR0bHR0bLp25kgAAACx0Uk5TAAECBwgKDA8ROEZMTU9Va2xtb3qAgrCxuLm6wc/Q0dPW2OHj5efo7vL09v7JDJKpAAAAjUlEQVQoU+2SxxqCMBAGAwZQbBRBozTp5X//51Mju1y4eHdO2Zl8ySER4ourJhBlaAnCGXp1Iwp4szalj5P8sNFjnWltRw2fgsf+bdJWhwBJTFy7ccshrwy+Sxxw5tCmixc7XP7hh2BU+Vp4xgmCtQA0ka3XWW0u4Qhf0uih4H+g+sHhTVZY8pNPd3e2L4UOGlHcmEWkAAAAAElFTkSuQmCC");

/***/ }),

/***/ 843:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Z": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ("data:image/png;base64,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bG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiCiAgICB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iCiAgICB4bWxuczpHSU1QPSJodHRwOi8vd3d3LmdpbXAub3JnL3htcC8iCiAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIKICAgIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIKICAgeG1wTU06RG9jdW1lbnRJRD0iZ2ltcDpkb2NpZDpnaW1wOmZhZGZiYzBmLTFkNjItNDJmYS05M2Y0LTY2ZmZlMzlmMTcwYyIKICAgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDozNWE5ODRkNS02YjMyLTRjZjUtYTU0Yy1hYmMxOTJlODRlOWUiCiAgIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDozZWU5MWQwYS04ZWMxLTQ3ZjctYmUyMi1jMDBjYzNjY2YzM2IiCiAgIGRjOkZvcm1hdD0iaW1hZ2UvcG5nIgogICBHSU1QOkFQST0iMi4wIgogICBHSU1QOlBsYXRmb3JtPSJMaW51eCIKICAgR0lNUDpUaW1lU3RhbXA9IjE2NDc0NDM5NTUwNDI3NjQiCiAgIEdJTVA6VmVyc2lvbj0iMi4xMC4yNCIKICAgdGlmZjpPcmllbnRhdGlvbj0iMSIKICAgeG1wOkNyZWF0b3JUb29sPSJHSU1QIDIuMTAiPgogICA8eG1wTU06SGlzdG9yeT4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGkKICAgICAgc3RFdnQ6YWN0aW9uPSJzYXZlZCIKICAgICAgc3RFdnQ6Y2hhbmdlZD0iLyIKICAgICAgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpmMDMyZDFlNi01NWNjLTRhNTctODUyNS1lZTYxZmJmMzY5YWEiCiAgICAgIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkdpbXAgMi4xMCAoTGludXgpIgogICAgICBzdEV2dDp3aGVuPSIyMDIyLTAzLTE2VDE2OjE5OjE1KzAxOjAwIi8+CiAgICA8L3JkZjpTZXE+CiAgIDwveG1wTU06SGlzdG9yeT4KICA8L3JkZjpEZXNjcmlwdGlvbj4KIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAKPD94cGFja2V0IGVuZD0idyI/Pn+O/dQAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAAHdElNRQfmAxAPEw/hfGROAAAPZUlEQVR42u1b35NUVZLOzPPj3ltVXV00dKPGLqzjhOEa6kzPoogozobsjLvum+8b8y/ov+ObEUb4MLETi9sCAtPAOs4oKiAIgmILCmrTIN3VVffHOSdzH0510Q0N3UA3ysycqLhxo6Lq3vudzJMnvy/z4sVLE/C3MQj+Zsbfof4d6j099F2/I847FwAA5HlfECCD0D0AlcUrpZRSiCgiIYTgRUSsTUSkqqpPPjk+Pj7e7Xafeuqp0dFfjKxfKxIAQGstIt1uF1GazVZZltde+o7xrzBUa62IOOfKshQRa1JjDJFqt9sAdPbs2YMH3n1rx9jk5OTX585XVfXM1icHBupa6zzPrbXNZtP7qtPpaK1/6lZ1VVBKaWUp1cyMSCLADNamx4+d2LFjx969fzx16osQYHz8QLfbJYLRXz2xceNGIsfMCEopIxxWw4dX2oGZAVAp0toQUQhSVZWrynPnzr3zzt4//OF/vv76uyRRWkO73fnTn/6sDZVlOdgcGhoaKoqi3Z4loiRJmPmnDjVJUmYoiq73eb1eT5PazPTs2bNfv/HGG++99+cLF74DAVcFEUCEzmy5f/xdYdTaPvvssyMjI8zgvQfARaLXTwwqes/WpNYyQkhsFoKcOvX53r37du9+59sL34NglqV5ngMAIiFC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");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {

// UNUSED EXPORTS: main

;// CONCATENATED MODULE: ./node_modules/iitcpluginkit/dist/Plugin.js
/*
*   Usage example:

    import * as Plugin from "../plugin";

    class myPlugin implements Plugin.Class {
        init() {
            console.log("Hello World!");
        }
    }

    Plugin.Register(new myPlugin(), "myPlugin");
*/
/// <reference path="./types/index.d.ts" />
function Register(plugin, name) {
    const setup = () => {
        window.plugin[name] = plugin;
        window.plugin[name].init();
    };
    setup.info = SCRIPT_INFO;
    if (!window.bootPlugins) {
        window.bootPlugins = [];
    }
    window.bootPlugins.push(setup);
    if (window.iitcLoaded) {
        setup();
    }
}

;// CONCATENATED MODULE: ./src/WebLinks.ts
const WebLink = {
    intel: (portal) => {
        const ll = portal.getLatLng();
        return generateLink("https://intel.ingress.com/", { pll: `${ll.lat},${ll.lng}` });
    },
    scanner: (portal) => {
        const ll = portal.getLatLng();
        return generateLink("https://link.ingress.com/", {
            link: `https://intel.ingress.com/portal/${portal.options.guid}`,
            apn: "com.nianticproject.ingress",
            isi: 576505181,
            ibi: "com.google.ingress",
            ifl: "https://apps.apple.com/app/ingress/id576505181",
            ofl: `https://intel.ingress.com/intel?pll=${ll.lat},${ll.lng}`
        });
    },
    google: (portal) => {
        const name = portal.options.data.title;
        const ll = portal.getLatLng();
        const llstr = `${ll.lat},${ll.lng}`;
        return generateLink("https://maps.google.com/maps", {
            ll: llstr, q: `${llstr} (${name})`
        });
    },
    osm: (portal) => {
        const ll = portal.getLatLng();
        return generateLink("https://www.openstreetmap.org/", { mlat: ll.lat, mlon: ll.lng, zoom: 16 }); // TODO use MapZoom?
    },
    bing: (portal) => {
        const ll = portal.getLatLng();
        const name = portal.options.data.title;
        return generateLink("https://www.bing.com/maps/", {
            v: 2,
            cp: `${ll.lat}~${ll.lng}`,
            lvl: 16,
            sp: `Point.${ll.lat}_${ll.lng}_${name}___`
        });
    }
};
const generateLink = (url, urlParameter = {}) => {
    // eslint-disable-next-line unicorn/no-array-callback-reference
    const encodedParameters = Object.entries(urlParameter).map(kv => kv.map(encodeURIComponent).join("=")).join("&");
    return encodedParameters ? url + "?" + encodedParameters : url;
};

;// CONCATENATED MODULE: ./src/Main.ts


class PLink {
    init() {
        // eslint-disable-next-line unicorn/prefer-module
        __webpack_require__(577);
        window.addHook("portalDetailsUpdated", () => this.replaceButton());
        window.addHook("portalDetailsLoaded", () => this.replaceButton());
    }
    replaceButton() {
        const linkDetails = $("#portaldetails .linkdetails");
        if (typeof android !== "undefined") {
            if (selectedPortal) {
                const portal = window.portals[selectedPortal];
                if (portal) {
                    const link = $("<a>", {
                        text: "Scanner",
                        href: WebLink.scanner(portal)
                    });
                    link.on("taphold", () => this.copyScannerLink());
                    linkDetails.append($("<aside>").append($("<div>").append(link)));
                }
            }
        }
        else {
            linkDetails.children().hide();
            linkDetails.append($("<a>", { text: "Share", click: () => this.showLinks(), target: "blank" }));
        }
    }
    copyScannerLink() {
        if (!selectedPortal)
            return;
        const portal = window.portals[selectedPortal];
        if (!portal)
            return;
        androidCopy(WebLink.scanner(portal));
        this.toast("copied to clipboard");
    }
    showLinks() {
        if (!selectedPortal) {
            this.toast("no portal selected");
            return;
        }
        const portal = window.portals[selectedPortal];
        if (!portal) {
            this.toast("no portal data");
            return;
        }
        const ll = portal.getLatLng();
        const html = $("<div>", { class: "portalweblinks" }).append($("<p>").append($("<span>", { text: "Portal", class: "title" }), this.createLink("Intel", WebLink.intel(portal)), this.createLink("Ingress", WebLink.scanner(portal)), this.createLink("Location", `${ll.lat}, ${ll.lng}`, "").on("click", () => this.copy(`${ll.lat}, ${ll.lng}`))), $("<p>").append($("<span>", { text: "Map", class: "title" }), this.createLink("Google Maps", WebLink.google(portal)), this.createLink("OSM", WebLink.osm(portal)), this.createLink("Bing Maps", WebLink.bing(portal)), $("<div>", { id: "qrcode" })));
        const mdia = window.dialog({
            id: "portallink",
            title: portal.options.data.title,
            html,
            position: { my: "right-30 top+20", at: "left top", of: "#sidebar" }
        });
        $("#qrcode", mdia).qrcode({ text: `GEO:${ll.lat},${ll.lng}` });
    }
    createLink(name, link, realLink) {
        const sLink = link.replace(/^https:\/\//i, "");
        return $("<div>", { class: "alink" }).append($("<span>", { text: name }), $("<a>", { href: realLink || link, text: sLink, target: "blank" }), $("<button>", { title: "copy", click: () => this.copy(link) }));
    }
    async copy(text) {
        this.toast("copied to clipboard");
        $("#dialog-portallink").dialog("close");
        return navigator.clipboard.writeText(text);
    }
    toast(text, duration = 1500) {
        const margin = 100;
        const message = $("<div>", { class: "toast-popup", text });
        $("body").append(message);
        message.css("width", "auto");
        const windowWidth = window.innerWidth;
        let toastWidth = message.innerWidth() + margin;
        if (toastWidth >= windowWidth) {
            toastWidth = windowWidth - margin;
            $(self).css("width", toastWidth);
        }
        else {
            toastWidth = message.innerWidth();
        }
        const left = (windowWidth - toastWidth) / 2;
        const leftInPercentage = left * 100 / windowWidth;
        message.css("left", `${leftInPercentage}%`);
        message.fadeIn(400);
        setTimeout(() => {
            message.fadeOut(600);
            setTimeout(() => message.remove(), 600);
        }, duration);
    }
}
/**
 * use "main" to access you main class from everywhere
 * (same as window.plugin.PLink)
 */
const main = new PLink();
Register(main, "PLink");

})();

/******/ })()
;
};
(function () {
  const info = {};
  if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) 
    info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
  if (typeof unsafeWindow != 'undefined' || typeof GM_info == 'undefined' || GM_info.scriptHandler != 'Tampermonkey') {    
    const script = document.createElement('script');
    script.appendChild(document.createTextNode( '('+ wrapper +')('+JSON.stringify(info)+');'));
    document.head.appendChild(script);} 
  else wrapper(info);
})();