QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "ColorAnimation",
  versions: /.*/,
  baseClass: "NumberAnimation",
  properties: {
    from: "color",
    to: "color",
  }
}, class ColorAnimation extends NumberAnimation {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, ColorAnimation);

    this.easing.$add = QmlWeb.QColor.$add;
    this.easing.$subtract = QmlWeb.QColor.$subtract;
    this.easing.$multiply = QmlWeb.QColor.$multiply;
    this.easing.$construct = QmlWeb.QColor.$construct;
  }
});
