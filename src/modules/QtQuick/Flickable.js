// TODO : dummy
QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "Flickable",
  versions: /.*/,
  baseClass: "Item",
  properties: {
  },
  signals: {
  }
}, class Flickable extends Item {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, Flickable);

  }

});
