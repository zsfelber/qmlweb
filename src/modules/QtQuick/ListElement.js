
class ListElement extends QtObject {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, ListElement);

    const engine = this.$engine;
    const createProperty = engine.createProperty;
    if (meta.parentmeta) {
      for (const i in meta.parentmeta) {
        if (i[0] !== "$") {
          engine.createProperty("variant", this, i);
        }
      }
    }
    this.$engine.applyProperties(meta.parentmeta, this);
  }
}

QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "ListElement",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  constructor:ListElement
});

