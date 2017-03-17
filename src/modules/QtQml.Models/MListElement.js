QmlWeb.registerQmlType({
  module: "QtQml.Models",
  name: "ListElement",
  versions: /^2\./,
  baseClass: "QtQuick.ListElement"
}, class MListElement extends ListElement {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, MListElement);
  }
});
