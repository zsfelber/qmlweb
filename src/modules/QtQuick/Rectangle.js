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

class Rectangle extends Item {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, Rectangle);

    this.$borderActive = false;

    const bg = this.impl = document.createElement("div");
    bg.className = "qmlrectangle";
    this.dom.appendChild(bg);

    this.colorChanged.connect(this, this.$onColorChanged);
    this.radiusChanged.connect(this, this.$onRadiusChanged);
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


class RectBorder {
  constructor(parent, engine) {
    try {
      engine.pushengine();

      this.parent = parent;
      this.$engine = engine;
      this.$base = this;
      this.$leaf = this;
      this.$properties = {};
      this.$engine.initMeta(this, {}, RectBorder);

      const item = parent.$base;
      this.colorChanged.connect(parent, item.border$onColorChanged);
      this.widthChanged.connect(parent, item.border$onWidthChanged);

      QObject.attach(parent, this);
    } finally {
      engine.popengine();
    }
  }

  static getAttachedObject() {
    if (!this.hasOwnProperty("$rectBorder")) {
      if (this !== this.$base)
        this.$rectBorder = QObject.createAttachmentChild(this.__proto__.border, this);
      else
        this.$rectBorder = new RectBorder(this, this.$engine);
    }
    return this.$rectBorder;
  }

  toString() {
    return "rectBorder:"+this.parent;
  }
}

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


QmlWeb.registerQmlType({
  global: true,
  module: "QtQuick.Rectangle",
  name: "border",
  versions: /.*/,
  $owner: Rectangle,
  signals: {
  },
  properties: {
    color: { type: "color", initialValue:"black"},
    width: { type: "int", initialValue:1}
  },
  constructor: RectBorder
});
