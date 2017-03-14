
class ListElement extends QtObject {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, ListElement);

    const engine = this.engine;
    const createProperty = engine.createProperty;
    if (meta.parentmeta) {
      for (const i in meta.parentmeta) {
        if (i[0] !== "$") {
          createProperty("variant", this, i);
        }
      }
    }
    QmlWeb.applyProperties(meta.parentmeta, this);
  }
}

QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "ListElement",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  constructor:ListElement
});

