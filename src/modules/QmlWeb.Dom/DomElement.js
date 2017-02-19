QmlWeb.registerQmlType({
  module: "QmlWeb.Dom",
  name: "DomElement",
  versions: /.*/,
  baseClass: "QtQuick.Item",
  properties: {
    tagName: { type: "string", initialValue: "div" }
  }
}, class DomElement extends Item {
  constructor(meta) {
    meta.tagName = meta.tagName;
    super(meta);
    QmlWeb.initMeta(this, meta);

    // TODO: support properties, styles, perhaps changing the tagName
  }
});
