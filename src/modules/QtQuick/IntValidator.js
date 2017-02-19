QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "IntValidator",
  versions: /.*/,
  baseClass: "Item",
  properties: {
    bottom: { type: "int", initialValue: -2147483647 },
    top: { type: "int", initialValue: 2147483647 }
  }
}, class IntValidator extends Item {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, IntValidator);
  }
  validate(string) {
    const regExp = /^(-|\+)?\s*[0-9]+$/;
    let acceptable = regExp.test(string.trim());

    if (acceptable) {
      const value = parseInt(string, 10);
      acceptable = this.bottom <= value && this.top >= value;
    }
    return acceptable;
  }
});
