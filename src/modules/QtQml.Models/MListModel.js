QmlWeb.registerQmlType({
  module: "QtQml.Models",
  name: "ListModel",
  versions: /^2\./,
  baseClass: "QtQuick.ListModel",
  defaultProperty: "$items"
}, class MListModel extends ListModel {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, MListModel);
  }
});
