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
    QmlWeb.callSuper(this, meta);

    if (typeof widow.localStorage === "undefined") {
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

      const a = this.$aliases[attrName];
      if (a) {
        emitter = this.$context[a.val.objectName];
        signalName = `${a.val.propertyName}Changed`;
      } else if (!this.$properties[attrName]) {
        return;
      }


      emitter[signalName].connect(this, () => {
        localStorage.setItem(this.$getKey(attrName), this[attrName]);
      });
    });
  }
});
