QmlWeb.registerQmlType({
  module: "QtQuick.Controls",
  name: "TextArea",
  versions: /.*/,
  baseClass: "QtQuick.TextEdit"
}, class {
  constructor(meta) {
    QmlWeb.superAndInitMeta(this, meta);
    const textarea = this.impl;

    QmlWeb.setStyle(this.tacss, "padding", "5px");
    QmlWeb.setStyle(this.tacss, "borderWidth", "1px");
    QmlWeb.setStyle(this.tacss, "backgroundColor", "#fff");
  }
});
