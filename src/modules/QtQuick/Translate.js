QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "Translate",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  properties: {
    x: "real",
    y: "real"
  }
}, class Translate extends QtObject {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, Translate);

    this.xChanged.connect(this.$parent, this.$parent.$updateTransform);
    this.yChanged.connect(this.$parent, this.$parent.$updateTransform);
  }
});
