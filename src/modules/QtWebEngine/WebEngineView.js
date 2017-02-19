QmlWeb.registerQmlType({
  module: "QtWebEngine",
  name: "WebEngineView",
  versions: /^5\./,
  baseClass: "QtWebView.WebView", // It's easier this way
  properties: {
    // TODO
  },
  signals: {
    // TODO
  }
}, class {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta);

    // TODO: implement more features on top of WebView
  }
});
