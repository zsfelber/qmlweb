QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "Rectangle",
  versions: /.*/,
  baseClass: "Item",
  properties: {
    color: { type: "color", initialValue: "white" },
    radius: "real"
  }
}, class {
  constructor(meta) {
    QmlWeb.superAndInitMeta(this, meta);

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
    const css = this.getStyle();
    QmlWeb.setStyle(css, "backgroundColor", new QmlWeb.QColor(newVal));
  }
  border$onColorChanged(newVal) {
    const css = this.getStyle();
    this.$borderActive = true;
    QmlWeb.setStyle(css, "borderColor", new QmlWeb.QColor(newVal));
    this.$updateBorder();
  }
  border$onWidthChanged() {
    this.$borderActive = true;
    this.$updateBorder();
  }
  $onRadiusChanged(newVal) {
    const css = this.getStyle();
    QmlWeb.setStyle(css, "borderRadius", `${newVal}px`);
  }
  $updateBorder() {
    const border = this.$borderActive ? Math.max(0, this.border.width) : 0;
    const css = this.getStyle();
    if (border * 2 > this.width || border * 2 > this.height) {
      // Border is covering the whole background
      QmlWeb.setStyle(css, "borderWidth", "0px");
      QmlWeb.setStyle(css, "borderTopWidth", `${this.height}px`);
    } else {
      QmlWeb.setStyle(css, "borderWidth", `${border}px`);
    }
  }
});
