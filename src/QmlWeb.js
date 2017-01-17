var vindov, mojule;
if (typeof window === 'undefined') {
  console.log("window object doesn't exist : server context")
  vindov = { addEventListener:function(){} };
} else {
  console.log("window object exists : client context")
  vindov = window;
}
if (typeof module === 'undefined') {
  console.log("module object doesn't exist : not an npm/gulp context")
  mojule = {};
} else {
  console.log("module object exists : npm/gulp context")
  mojule = module;
}


const QmlWeb = {};

global.QmlWeb = QmlWeb;

mojule.exports = QmlWeb;
