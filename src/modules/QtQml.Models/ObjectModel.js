QmlWeb.registerQmlType({
  module: "QtQml.Models",
  name: "ObjectModel",
  versions: /^2\./,
  baseClass: "QtQuick.Item",
  properties: {
    count: {type:"alias", path:["children", "length"], overrideType:"int", readOnly:true}
  },
}, class {
  constructor(meta) {
    QmlWeb.superAndInitMeta(this, meta);
  }
  get(index) {
    return this.children[index];
  }
});
