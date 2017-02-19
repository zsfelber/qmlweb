// TODO : dummy
QmlWeb.registerQmlType({
  module: "QtQuick.Controls",
  name: "TableView",
  versions: /.*/,
  baseClass: "QtQuick.Rectangle",
  properties: {
  },
  signals: {
  }
}, class TableView extends Rectangle {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta);

  }

});
