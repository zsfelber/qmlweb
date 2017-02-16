const QmlWeb = {};


function isEmpty(obj) {
  for (var x in obj) { if (obj.hasOwnProperty(x))  return false; }
  return true;
};

function isEmptyThis() {
  for (var x in this) { if (this.hasOwnProperty(x))  return false; }
  return true;
};

Object.defineProperty(
  Object.prototype,
  "isEmpty",
  {
    value : isEmptyThis,
    enumerable : false
  }
);

String.prototype.startsWith = function (str) {
  return this.length >= str.length && this.substring(0, str.length)===str;
};

String.prototype.endsWith = function (str) {
  return this.length >= str.length && this.substring(this.length-str.length)===str;
};


QmlWeb.debug = function() {
  if (!QmlWeb.engine || QmlWeb.engine.logging & QmlWeb.QMLEngineLogging.Debug) {
    console.debug(arguments);
  }
}

QmlWeb.info = function() {
  if (!QmlWeb.engine || QmlWeb.engine.logging & QmlWeb.QMLEngineLogging.Info) {
    console.info(arguments);
  }
}

QmlWeb.log = function() {
  if (!QmlWeb.engine || QmlWeb.engine.logging & QmlWeb.QMLEngineLogging.Debug) {
    console.log(arguments);
  }
}

QmlWeb.warn = function() {
  if (!QmlWeb.engine || QmlWeb.engine.logging & QmlWeb.QMLEngineLogging.Warning) {
    console.warn(arguments);
  }
}

QmlWeb.error = function() {
  if (!QmlWeb.engine || QmlWeb.engine.logging & QmlWeb.QMLEngineLogging.Error) {
    console.error(arguments);
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
