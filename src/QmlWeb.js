var widow;
if (typeof window === 'undefined') {
  console.log("window object doesn't exist : server context")
  widow = { addEventListener:function(){} };
} else {
  console.log("window object exists : client context")
  widow = window;
}


const QmlWeb = {};

global.QmlWeb = QmlWeb;

if (typeof module === 'undefined') {
  console.log("module object doesn't exist : not an npm/gulp context")
} else {
  console.log("module object exists : npm/gulp context")
  module.exports = QmlWeb;
}
