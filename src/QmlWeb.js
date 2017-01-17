var vindov;
if (typeof window === 'undefined') {
  console.log("window object doesn't exist : server context")
  vindov = { addEventListener:function(){} };
} else {
  console.log("window object exists : client context")
  vindov = window;
}

const QmlWeb = {};

global.QmlWeb = QmlWeb;

module.exports = QmlWeb;
