// TODO : dummy
QmlWeb.registerQmlType({
  module: "QtQuick.Controls",
  name: "SpinBox",
  versions: /.*/,
  baseClass: "QtQuick.Item",
  properties: {
  },
  signals: {
  }
}, class SpinBox extends Item {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, SpinBox);

  }

});
