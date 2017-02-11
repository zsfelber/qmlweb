const QmlWeb = {};


function isEmpty(obj) {
  for (var x in obj) { if (obj.hasOwnProperty(x))  return false; }
  return true;
};

QmlWeb.isEmpty = isEmpty;
global.QmlWeb = QmlWeb;

if (typeof window === 'undefined') {
  console.log("QmlWeb : window object doesn't exist : server context")
  window = { addEventListener:function(){} };
} else {
  console.log("QmlWeb : window object exists : client context")
}

var UglifyJS;
if (typeof require !== 'undefined') {
  UglifyJS = require("uglify-js");
  if (UglifyJS) {
    console.log("QmlWeb : UglifyJS was found")
  } else {
    console.log("QmlWeb : UglifyJS was not found")
  }
} else {
  console.log("QmlWeb : require/UglifyJS was not found")
}

if (typeof module === 'undefined') {
  console.log("QmlWeb : module object doesn't exist : not an npm/gulp context")
} else {
  console.log("QmlWeb : module object exists : npm/gulp context")
  module.exports = QmlWeb;
}
