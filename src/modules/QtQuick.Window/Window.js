
class Window extends Item {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, Window);

    this.colorChanged.connect(this, this.$onColorChanged);
  }
  $onColorChanged(newVal) {
    QmlWeb.setStyle(this.css, "backgroundColor", newVal);
  }
}

QmlWeb.registerQmlType({
  module: "QtQuick.Window",
  name: "Window",
  versions: /^2\./,
  baseClass: "QtQuick.Item",
  properties: {
    active: "bool",
    activeFocusItem: "Item",
    color: { type: "color", initialValue: "#ffffff" },
    //contentItem: "Item", // TODO
    contentOrientation: "enum",
    flags: "int",
    maximumHeight: "int",
    maximumWidth: "int",
    minimumHeight: "int",
    minimumWidth: "int",
    modality: "enum",
    title: "string",
    visibility: "enum"
  },
  signals: {
    closing: [{ type: "CloseEvent", name: "close" }]
  },
  constructor:Window
});
