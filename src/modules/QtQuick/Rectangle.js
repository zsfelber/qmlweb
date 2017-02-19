var defaultRectStyle = QmlWeb.helpers.mergeObjects(QmlWeb.defaultItemStyle, {
   pointerEvents: "none",
   position: "absolute",
   left: "0px",
   right: "0px",
   top: "0px",
   bottom: "0px",
   width: "100%",
   height: "100%",
   borderWidth: "0px",
   borderStyle: "solid",
   borderColor: "black",
   backgroundColor: "white"
});

QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "Rectangle",
  versions: /.*/,
  baseClass: "Item",
  properties: {
    color: { type: "color", initialValue: "white" },
    radius: "real"
  },
  constructor:Rectangle
});
class Rectangle extends Item {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, Rectangle);

    const createProperty = QmlWeb.createProperty;
    this.border = new QmlWeb.QObject(this, {attached:true, info:"border"});
    createProperty("color", this.border, "color", { initialValue: "black" });
    createProperty("int", this.border, "width", { initialValue: 1 });
    this.$borderActive = false;

    const bg = this.impl = document.createElement("div");
    bg.className = "qmlrectangle";
    this.dom.appendChild(bg);

    this.colorChanged.connect(this, this.$onColorChanged);
    this.radiusChanged.connect(this, this.$onRadiusChanged);
    this.border.colorChanged.connect(this, this.border$onColorChanged);
    this.border.widthChanged.connect(this, this.border$onWidthChanged);
    this.widthChanged.connect(this, this.$updateBorder);
    this.heightChanged.connect(this, this.$updateBorder);
  }
  $onColorChanged(newVal) {
    const css = this.getImplStyle();
    QmlWeb.setStyle(css, "backgroundColor", new QmlWeb.QColor(newVal), defaultRectStyle);
  }
  border$onColorChanged(newVal) {
    const css = this.getImplStyle();
    this.$borderActive = true;
    QmlWeb.setStyle(css, "borderColor", new QmlWeb.QColor(newVal), defaultRectStyle);
    this.$updateBorder();
  }
  border$onWidthChanged() {
    this.$borderActive = true;
    this.$updateBorder();
  }
  $onRadiusChanged(newVal) {
    const css = this.getImplStyle();
    QmlWeb.setStyle(css, "borderRadius", `${newVal}px`, defaultRectStyle);
  }
  $updateBorder() {
    const border = this.$borderActive ? Math.max(0, this.border.width) : 0;
    const css = this.getImplStyle();
    if (border * 2 > this.width || border * 2 > this.height) {
      // Border is covering the whole background
      QmlWeb.setStyle(css, "borderWidth", "0px", defaultRectStyle);
      QmlWeb.setStyle(css, "borderTopWidth", `${this.height}px`, defaultRectStyle);
    } else {
      QmlWeb.setStyle(css, "borderWidth", `${border}px`, defaultRectStyle);
    }
  }
}
