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
    this.$engine.initMeta(this, meta, ToolBar);

  }

});
