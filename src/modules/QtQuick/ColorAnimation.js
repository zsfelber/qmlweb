QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "ColorAnimation",
  versions: /.*/,
  baseClass: "NumberAnimation",
  properties: {
    from: "color",
    to: "color",
  }
}, class {
  constructor(meta) {
    QmlWeb.callSuper(this, meta);

    this.easing.$add = function(a,b) {
      return a+b;
    };
    this.easing.$subtract = function(a,b) {
      return a-b;
    };
    this.easing.$multiply = function(a,b) {
      return a*b;
    };
  }
});
