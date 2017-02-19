QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "ListElement",
  versions: /.*/,
  baseClass: "QtQml.QtObject"
}, class ListElement extends QtObject {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta);

    const createProperty = QmlWeb.createProperty;
    for (const i in meta) {
      if (i[0] !== "$") {
        createProperty("variant", this, i);
      }
    }
    QmlWeb.applyProperties(meta, this);
  }
});
