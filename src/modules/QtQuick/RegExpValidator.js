QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "RegExpValidator",
  versions: /.*/,
  baseClass: "Item",
  properties: {
    regExp: "var"
  }
}, class RegExpValidator extends Item {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, RegExpValidator);
  }
  validate(string) {
    if (!this.regExp) return true;
    return this.regExp.test(string);
  }
});
