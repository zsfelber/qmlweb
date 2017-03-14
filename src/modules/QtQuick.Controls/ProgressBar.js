// TODO : dummy
QmlWeb.registerQmlType({
  module: "QtQuick.Controls",
  name: "ProgressBar",
  versions: /.*/,
  baseClass: "QtQuick.Rectangle",
  properties: {
  },
  signals: {
  }
}, class ProgressBar extends Rectangle {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, ProgressBar);

  }

});
