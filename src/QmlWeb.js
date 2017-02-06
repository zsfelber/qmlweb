if (typeof window === 'undefined') {
  console.log("window object doesn't exist : server context")
  window = { addEventListener:function(){} };
} else {
  console.log("window object exists : client context")
}

var UglifyJS;
if (typeof require !== 'undefined') {
  UglifyJS = require("uglify-js");
  if (UglifyJS) {
    console.log("UglifyJS was found")
  } else {
    console.log("UglifyJS was not found")
  }
} else {
  console.log("require/UglifyJS was not found")
}


const QmlWeb = {};

global.QmlWeb = QmlWeb;

if (typeof module === 'undefined') {
  console.log("module object doesn't exist : not an npm/gulp context")
} else {
  console.log("module object exists : npm/gulp context")
  module.exports = QmlWeb;
}
