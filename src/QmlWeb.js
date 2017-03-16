const QmlWeb = {};


function isEmpty(obj) {
  for (var x in obj) { if (obj.hasOwnProperty(x))  return false; }
  return true;
};

function isEmptyThis() {
  for (var x in this) { if (this.hasOwnProperty(x))  return false; }
  return true;
};

function peekThis() {
  return this.length ? this[this.length-1] : undefined;
};

Object.defineProperty(
  Object.prototype,
  "isEmpty",
  {
    value : isEmptyThis,
    enumerable : false
  }
);

Object.defineProperty(
  Array.prototype,
  "peek",
  {
    value : peekThis,
    enumerable : false
  }
);

function startsWith(str) {
  return this.length >= str.length && this.substring(0, str.length)===str;
};

function endsWith(str) {
  return this.length >= str.length && this.substring(this.length-str.length)===str;
};

Object.defineProperty(
  String.prototype,
  "startsWith",
  {
    value : startsWith,
    enumerable : false
  }
);

Object.defineProperty(
  String.prototype,
  "endsWith",
  {
    value : endsWith,
    enumerable : false
  }
);


QmlWeb.debug = function(...args) {
  const engine = getEngine0();
  if (!engine || engine.logging & QmlWeb.QMLEngineLogging.Debug) {
    console.debug(...args);
  }
}

QmlWeb.info = function(...args) {
  const engine = getEngine0();
  if (!engine || engine.logging & QmlWeb.QMLEngineLogging.Info) {
    console.info(...args);
  }
}

QmlWeb.log = function(...args) {
  const engine = getEngine0();
  if (!engine || engine.logging & QmlWeb.QMLEngineLogging.Debug) {
    console.log(...args);
  }
}

QmlWeb.warn = function(...args) {
  const engine = getEngine0();
  if (!engine || engine.logging & QmlWeb.QMLEngineLogging.Warning) {
    console.warn(...args);
  }
}

QmlWeb.error = function(...args) {
  const engine = getEngine0();
  if (!engine || engine.logging & QmlWeb.QMLEngineLogging.Error) {
    console.error(...args);
  }
}


QmlWeb.isEmpty = isEmpty;
global.QmlWeb = QmlWeb;

if (typeof window === 'undefined') {
  QmlWeb.log("QmlWeb : window object doesn't exist : server context")
  window = { addEventListener:function(){} };
} else {
  QmlWeb.log("QmlWeb : window object exists : client context")
}

var UglifyJS;
if (typeof require !== 'undefined') {
  UglifyJS = require("uglify-js");
  if (UglifyJS) {
    QmlWeb.log("QmlWeb : UglifyJS was found")
  } else {
    QmlWeb.log("QmlWeb : UglifyJS was not found")
  }
} else {
  QmlWeb.log("QmlWeb : require/UglifyJS was not found")
}

if (typeof module === 'undefined') {
  QmlWeb.log("QmlWeb : module object doesn't exist : not an npm/gulp context")
} else {
  QmlWeb.log("QmlWeb : module object exists : npm/gulp context")
  module.exports = QmlWeb;
}
