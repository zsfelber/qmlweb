QmlWeb.registerQmlType({
  module: "QtQuick.Controls",
  name: "ApplicationWindow",
  versions: /^1\./,
  baseClass: "QtQuick.Window.Window",
  properties: {
    //contentItem: "ContentItem", // TODO
    menuBar: "MenuBar",
    statusBar: "Item",
    style: "Component",
    toolBar: "Item"
  }
}, class ApplicationWindow extends Window {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta);

    // TODO
  }
});
