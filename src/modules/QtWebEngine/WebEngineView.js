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
}, class WebEngineView extends WebView {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, WebEngineView);

    // TODO: implement more features on top of WebView
  }
});
