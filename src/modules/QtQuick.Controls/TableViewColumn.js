// TODO : dummy
QmlWeb.registerQmlType({
  module: "QtQuick.Controls",
  name: "TableViewColumn",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  properties: {
  },
  signals: {
  }
}, class TableViewColumn extends QtObject {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, TableViewColumns);

  }

});
