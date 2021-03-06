QmlWeb.registerQmlType({
  module: "Qt.labs.settings",
  name: "Settings",
  versions: /.*/,
  baseClass: "QtQuick.Item",
  properties: {
    category: "string"
  }
}, class Settings extends Item {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, Settings);

    if (typeof window.localStorage === "undefined") {
      console.warn("Settings.  window.localStorage is undefined.");
      return;
    }

    this.Component.completed.connect(this, this.Component$onCompleted);
  }
  Component$onCompleted() {
    this.$loadProperties();
    this.$initializeProperties();
  }
  $getKey(attrName) {
    return `${this.category}/${attrName}`;
  }
  $loadProperties() {
    this.$attributes.forEach(attrName => {
      const prop = this.$leaf.$properties[attrName];
      if (!prop) return;

      const key = this.$getKey(attrName);
      const storedval = localStorage.getItem(key);
      if (storedval !== undefined && storedval !== null) {
        prop.set(storedval);
      }
    }, this);
  }
  $initializeProperties() {
    this.$attributes.forEach(attrName => {

      let emitter = this;

      // NOTE aliases are now regular properties (so Changed works)
      const prop = this.$leaf.$properties[attrName];
      /*if (prop && prop.type==="alias") {
        emitter = this.$context[prop.value.objectName];
        signalName = `${prop.value.propertyName}Changed`;
      } else */if (!prop) {
        return;
      }

      prop.changed.connect(this, () => {
        localStorage.setItem(this.$getKey(attrName), prop.value);
      });
    }, this);
  }
});
