QmlWeb.registerQmlType({
  module: "QtNfc",
  name: "NearField",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  properties: {
    filter: "list",
    messageRecords: "list",
    orderMatch: "bool",
    polling: "bool"
  },
  signals: {
    tagFound: [],
    tagRemoved: []
  }
}, class NearField extends QtObject {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, NearField);

    // TODO: implementation based on Web NFC API
  }
});
