QmlWeb.registerQmlType({
  module: "Qt.labs.settings",
  name: "Settings",
  versions: /.*/,
  baseClass: "QtQuick.Item",
  properties: {
    category: "string"
  }
}, class {
  constructor(meta) {
    QmlWeb.superAndInitMeta(this, meta);

    if (typeof window.localStorage === "undefined") {
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
      if (!this.$properties[attrName]) return;

      const key = this.$getKey(attrName);
      this[attrName] = localStorage.getItem(key);
    });
  }
  $initializeProperties() {
    this.$attributes.forEach(attrName => {

      let emitter = this;
      let signalName = `${attrName}Changed`;

      // NOTE aliases are now regular properties (so Changed works)
      const prop = this.$properties[attrName];
      /*if (prop && prop.type==="alias") {
        emitter = this.$context[prop.value.objectName];
        signalName = `${prop.value.propertyName}Changed`;
      } else */if (!prop) {
        return;
      }


      emitter[signalName].connect(this, () => {
        localStorage.setItem(this.$getKey(attrName), this[attrName]);
      });
    });
  }
});
