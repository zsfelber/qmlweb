QmlWeb.registerQmlType({
  module: "QtQml.Models",
  name: "ObjectModel",
  versions: /^2\./,
  baseClass: "QtQuick.Item",
  properties: {
    count: {type:"alias", path:["children", "length"], overrideType:"int", readOnly:true}
  },
}, class ObjectModel extends Item {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta);
  }
  get(index) {
    return this.children[index];
  }
});
