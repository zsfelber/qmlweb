// TODO : dummy
QmlWeb.registerQmlType({
  module: "QtQuick.Dialogs",
  name: "FileDialog",
  versions: /.*/,
  baseClass: "QtQuick.Item",
  properties: {
  },
  signals: {
  }
}, class FileDialog extends Item {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta);

  }

});
