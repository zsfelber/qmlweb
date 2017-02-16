QmlWeb.registerQmlType({
  module: "QtQml.Models",
  name: "ListModel",
  versions: /^2\./,
  baseClass: "QtQuick.ListModel",
  defaultProperty: "$items"
}, class {
  constructor(meta) {
    QmlWeb.superAndInitMeta(this, meta);
  }
});
