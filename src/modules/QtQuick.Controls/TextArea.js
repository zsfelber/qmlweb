QmlWeb.registerQmlType({
  module: "QtQuick.Controls",
  name: "TextArea",
  versions: /.*/,
  baseClass: "QtQuick.TextEdit"
}, class TextArea extends TextEdit {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta);
    const textarea = this.impl;

    QmlWeb.setStyle(this.tacss, "padding", "5px", defaultTextareaStyle);
    QmlWeb.setStyle(this.tacss, "borderWidth", "1px", defaultTextareaStyle);
    QmlWeb.setStyle(this.tacss, "backgroundColor", "#fff", defaultTextareaStyle);
  }
});
