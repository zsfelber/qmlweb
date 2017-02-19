// TODO : dummy
QmlWeb.registerQmlType({
  module: "QtQuick.Controls",
  name: "ToolBar",
  versions: /.*/,
  baseClass: "QtQuick.Rectangle",
  properties: {
  },
  signals: {
  }
}, class ToolBar extends Rectangle {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, ToolBar);

  }

});
