// TODO : dummy
QmlWeb.registerQmlType({
  module: "QtQuick.Controls",
  name: "ToolButton",
  versions: /.*/,
  baseClass: "Button",
  properties: {
  },
  signals: {
  }
}, class ToolButton extends Button {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, ToolButton);

  }

});
