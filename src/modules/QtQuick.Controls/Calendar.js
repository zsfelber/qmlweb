// TODO : dummy
QmlWeb.registerQmlType({
  module: "QtQuick.Controls",
  name: "Calendar",
  versions: /.*/,
  baseClass: "QtQuick.Item",
  properties: {
  },
  signals: {
  }
}, class Calendar extends Item {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, Calendar);

  }

});
