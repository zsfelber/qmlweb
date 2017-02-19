
class ListElement extends QtObject {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, ListElement);

    const createProperty = QmlWeb.createProperty;
    for (const i in meta) {
      if (i[0] !== "$") {
        createProperty("variant", this, i);
      }
    }
    QmlWeb.applyProperties(meta, this);
  }
}

QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "ListElement",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  constructor:ListElement
});

