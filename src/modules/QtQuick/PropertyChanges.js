QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "PropertyChanges",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  properties: {
    target: "QtObject",
    explicit: "bool",
    restoreEntryValues: { type: "bool", initialValue: true }
  }
}, class PropertyChanges extends QtObject {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta);

    this.$actions = [];
  }
  $setCustomData(property, value) {
    this.$actions.push({ property, value });
  }
});
