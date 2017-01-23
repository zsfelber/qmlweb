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

    this.easing.$add = QmlWeb.QColor.$add;
    this.easing.$subtract = QmlWeb.QColor.$subtract;
    this.easing.$multiply = QmlWeb.QColor.$multiply;
    this.easing.$construct = QmlWeb.QColor.$construct;
  }
});
