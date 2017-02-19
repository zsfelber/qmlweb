QmlWeb.registerQmlType({
  module: "QtQml.Models",
  name: "ListElement",
  versions: /^2\./,
  baseClass: "QtQuick.ListElement"
}, class MListElement extends ListElement {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta);
  }
});
