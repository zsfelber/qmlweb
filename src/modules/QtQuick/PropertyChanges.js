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
    this.$engine.initMeta(this, meta, PropertyChanges);

    this.$actions = [];
  }

  $setCustomData(propname, value) {
    const propertyChange = { value };
    setupGetter(propertyChange, "target", ()=>this.target);
    setupGetter(propertyChange, "property", ()=>this.target.$properties[propname]);
    this.$actions.push(propertyChange);
  }
});
