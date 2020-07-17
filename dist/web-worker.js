/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./SSEStream.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./SSEStream.js":
/*!**********************!*\
  !*** ./SSEStream.js ***!
  \**********************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var ramda_src_trim__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ramda/src/trim */ "./node_modules/ramda/src/trim.js");
/* harmony import */ var ramda_src_trim__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(ramda_src_trim__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var ramda_src_keys__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ramda/src/keys */ "./node_modules/ramda/src/keys.js");
/* harmony import */ var ramda_src_keys__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(ramda_src_keys__WEBPACK_IMPORTED_MODULE_1__);


var abort;

function SSEStream(headers, url, errorHandler) {
  var chunk = '';
  var progress = 0;
  var xhr;

  var parseData = function parseData(data) {
    if (!data || data.length === 0) {
      return null;
    }

    var e = {
      'id': null,
      'retry': null,
      'data': '',
      'event': 'message'
    };
    data.split(/\n|\r\n|\r/).forEach(function (line) {
      line = ramda_src_trim__WEBPACK_IMPORTED_MODULE_0___default()(line);
      var index = line.indexOf(':');

      if (index <= 0) {
        return;
      }

      var field = line.substring(0, index);

      if (!(field in e)) {
        return;
      }

      var value = ramda_src_trim__WEBPACK_IMPORTED_MODULE_0___default()(line.substring(index + 1));

      if (field === 'data') {
        e[field] += value;
      } else {
        e[field] = value;
      }
    });
    return e;
  };

  var onProgress = function onProgress() {
    if (xhr.status !== 200) {
      postMessage("Not connected, status code: ".concat(xhr.status));
      return;
    }

    var data = xhr.responseText.substring(progress);
    progress += data.length;
    data.split(/(\r\n|\r|\n){2}/g).forEach(function (part) {
      if (ramda_src_trim__WEBPACK_IMPORTED_MODULE_0___default()(part).length === 0) {
        var message = parseData(ramda_src_trim__WEBPACK_IMPORTED_MODULE_0___default()(chunk));

        if (message) {
          postMessage(['message', message]);
        }

        chunk = '';
      } else {
        chunk += part;
      }
    });
  };

  var onLoad = function onLoad() {
    postMessage(['loaded']);
    chunk = '';
  };

  abort = function abort() {
    if (xhr.readyState !== 2) {
      xhr.abort();
    }
  };

  xhr = new XMLHttpRequest();
  xhr.addEventListener('progress', onProgress);
  xhr.addEventListener('load', onLoad);
  xhr.addEventListener('error', errorHandler);
  xhr.addEventListener('abort', function () {
    postMessage(['aborted']);
  });
  xhr.open('GET', url, true);
  ramda_src_keys__WEBPACK_IMPORTED_MODULE_1___default()(headers).forEach(function (h) {
    return xhr.setRequestHeader(h, headers[h]);
  });
  xhr.send();
}

var startSSE = function startSSE(headers, url, retries, retryTimeout) {
  if (retries > 0) {
    postMessage(['connecting']);
    SSEStream(headers, url, function () {
      postMessage(['re-connecting', "Retries left: ".concat(retries)]);
      setTimeout(function () {
        return startSSE(headers, url, retries - 1);
      }, retryTimeout);
    });
  } else {
    postMessage(['error', 'Can\'t connect']);
  }
};

self.onmessage = function (e) {
  var headers = e.data[1] || {};
  var retries = e.data[3] || 3;
  var retryTimeout = e.data[4] * 1000 || 0;
  console.log(headers, retries, retryTimeout);

  switch (e.data[0]) {
    case 'connect':
      startSSE(headers, e.data[2], retries, retryTimeout);
      break;

    case 'disconnect':
      abort();
      break;
  }
};

/***/ }),

/***/ "./node_modules/ramda/src/internal/_curry1.js":
/*!****************************************************!*\
  !*** ./node_modules/ramda/src/internal/_curry1.js ***!
  \****************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var _isPlaceholder =
/*#__PURE__*/
__webpack_require__(/*! ./_isPlaceholder */ "./node_modules/ramda/src/internal/_isPlaceholder.js");
/**
 * Optimized internal one-arity curry function.
 *
 * @private
 * @category Function
 * @param {Function} fn The function to curry.
 * @return {Function} The curried function.
 */


function _curry1(fn) {
  return function f1(a) {
    if (arguments.length === 0 || _isPlaceholder(a)) {
      return f1;
    } else {
      return fn.apply(this, arguments);
    }
  };
}

module.exports = _curry1;

/***/ }),

/***/ "./node_modules/ramda/src/internal/_has.js":
/*!*************************************************!*\
  !*** ./node_modules/ramda/src/internal/_has.js ***!
  \*************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

function _has(prop, obj) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = _has;

/***/ }),

/***/ "./node_modules/ramda/src/internal/_isArguments.js":
/*!*********************************************************!*\
  !*** ./node_modules/ramda/src/internal/_isArguments.js ***!
  \*********************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var _has =
/*#__PURE__*/
__webpack_require__(/*! ./_has */ "./node_modules/ramda/src/internal/_has.js");

var toString = Object.prototype.toString;

var _isArguments =
/*#__PURE__*/
function () {
  return toString.call(arguments) === '[object Arguments]' ? function _isArguments(x) {
    return toString.call(x) === '[object Arguments]';
  } : function _isArguments(x) {
    return _has('callee', x);
  };
}();

module.exports = _isArguments;

/***/ }),

/***/ "./node_modules/ramda/src/internal/_isPlaceholder.js":
/*!***********************************************************!*\
  !*** ./node_modules/ramda/src/internal/_isPlaceholder.js ***!
  \***********************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

function _isPlaceholder(a) {
  return a != null && typeof a === 'object' && a['@@functional/placeholder'] === true;
}

module.exports = _isPlaceholder;

/***/ }),

/***/ "./node_modules/ramda/src/keys.js":
/*!****************************************!*\
  !*** ./node_modules/ramda/src/keys.js ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var _curry1 =
/*#__PURE__*/
__webpack_require__(/*! ./internal/_curry1 */ "./node_modules/ramda/src/internal/_curry1.js");

var _has =
/*#__PURE__*/
__webpack_require__(/*! ./internal/_has */ "./node_modules/ramda/src/internal/_has.js");

var _isArguments =
/*#__PURE__*/
__webpack_require__(/*! ./internal/_isArguments */ "./node_modules/ramda/src/internal/_isArguments.js"); // cover IE < 9 keys issues


var hasEnumBug = !
/*#__PURE__*/
{
  toString: null
}.propertyIsEnumerable('toString');
var nonEnumerableProps = ['constructor', 'valueOf', 'isPrototypeOf', 'toString', 'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString']; // Safari bug

var hasArgsEnumBug =
/*#__PURE__*/
function () {
  'use strict';

  return arguments.propertyIsEnumerable('length');
}();

var contains = function contains(list, item) {
  var idx = 0;

  while (idx < list.length) {
    if (list[idx] === item) {
      return true;
    }

    idx += 1;
  }

  return false;
};
/**
 * Returns a list containing the names of all the enumerable own properties of
 * the supplied object.
 * Note that the order of the output array is not guaranteed to be consistent
 * across different JS platforms.
 *
 * @func
 * @memberOf R
 * @since v0.1.0
 * @category Object
 * @sig {k: v} -> [k]
 * @param {Object} obj The object to extract properties from
 * @return {Array} An array of the object's own properties.
 * @see R.keysIn, R.values
 * @example
 *
 *      R.keys({a: 1, b: 2, c: 3}); //=> ['a', 'b', 'c']
 */


var keys = typeof Object.keys === 'function' && !hasArgsEnumBug ?
/*#__PURE__*/
_curry1(function keys(obj) {
  return Object(obj) !== obj ? [] : Object.keys(obj);
}) :
/*#__PURE__*/
_curry1(function keys(obj) {
  if (Object(obj) !== obj) {
    return [];
  }

  var prop, nIdx;
  var ks = [];

  var checkArgsLength = hasArgsEnumBug && _isArguments(obj);

  for (prop in obj) {
    if (_has(prop, obj) && (!checkArgsLength || prop !== 'length')) {
      ks[ks.length] = prop;
    }
  }

  if (hasEnumBug) {
    nIdx = nonEnumerableProps.length - 1;

    while (nIdx >= 0) {
      prop = nonEnumerableProps[nIdx];

      if (_has(prop, obj) && !contains(ks, prop)) {
        ks[ks.length] = prop;
      }

      nIdx -= 1;
    }
  }

  return ks;
});
module.exports = keys;

/***/ }),

/***/ "./node_modules/ramda/src/trim.js":
/*!****************************************!*\
  !*** ./node_modules/ramda/src/trim.js ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var _curry1 =
/*#__PURE__*/
__webpack_require__(/*! ./internal/_curry1 */ "./node_modules/ramda/src/internal/_curry1.js");

var ws = '\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003' + '\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028' + '\u2029\uFEFF';
var zeroWidth = '\u200b';
var hasProtoTrim = typeof String.prototype.trim === 'function';
/**
 * Removes (strips) whitespace from both ends of the string.
 *
 * @func
 * @memberOf R
 * @since v0.6.0
 * @category String
 * @sig String -> String
 * @param {String} str The string to trim.
 * @return {String} Trimmed version of `str`.
 * @example
 *
 *      R.trim('   xyz  '); //=> 'xyz'
 *      R.map(R.trim, R.split(',', 'x, y, z')); //=> ['x', 'y', 'z']
 */

var trim = !hasProtoTrim ||
/*#__PURE__*/
ws.trim() || !
/*#__PURE__*/
zeroWidth.trim() ?
/*#__PURE__*/
_curry1(function trim(str) {
  var beginRx = new RegExp('^[' + ws + '][' + ws + ']*');
  var endRx = new RegExp('[' + ws + '][' + ws + ']*$');
  return str.replace(beginRx, '').replace(endRx, '');
}) :
/*#__PURE__*/
_curry1(function trim(str) {
  return str.trim();
});
module.exports = trim;

/***/ })

/******/ });
//# sourceMappingURL=web-worker.js.map