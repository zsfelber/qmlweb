var borderImage0Style = {
  OBorderImageSlice: "0 0 0 0 fill",
  OBorderImageWidth: "0px 0px 0px 0px",
  OBorderImageRepeat: "stretch stretch",
  WebkitBorderImageSlice: "0 0 0 0 fill",
  WebkitBorderImageWidth: "0px 0px 0px 0px",
  WebkitBorderImageRepeat: "stretch stretch",
  borderImageSlice: "0 0 0 0 fill",
  borderImageWidth: "0px 0px 0px 0px",
  borderImageRepeat: "stretch stretch"
};

QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "BorderImage",
  versions: /.*/,
  baseClass: "Item",
  enums: {
    BorderImage: {
      Stretch: "stretch", Repeat: "repeat", Round: "round",
      Null: 1, Ready: 2, Loading: 3, Error: 4
    }
  },
  properties: {
    source: { type: "url", initialValue: null},
    smooth: { type: "bool", initialValue: true },
    // BorderImage.Stretch
    horizontalTileMode: { type: "enum", initialValue: "stretch" },
    // BorderImage.Stretch
    verticalTileMode: { type: "enum", initialValue: "stretch" },
    progress: "real",
    status: { type: "enum", initialValue: 1 } // BorderImage.Null
  }
}, class BorderImage extends Item {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, BorderImage);

    const engine = this.$engine;
    const createProperty = engine.createProperty;
    this.border = new QmlWeb.QObject(this, {attached:true, info:"border"});
    engine.createProperty("int", this.border, "left", {initialValue:0});
    engine.createProperty("int", this.border, "right", {initialValue:0});
    engine.createProperty("int", this.border, "top", {initialValue:0});
    engine.createProperty("int", this.border, "bottom", {initialValue:0});

    const bg = this.impl = document.createElement("div");
    bg.className = "qmlborderimg";
    this.icss = QmlWeb.createStyle(bg.style);
    this.dom.appendChild(bg);

    const that = this;
    this.$img = new Image();
    this.$img.addEventListener("load", () => {
      that.progress = 1;
      that.status = that.BorderImage.Ready;
    });
    this.$img.addEventListener("error", () => {
      that.status = that.BorderImage.Error;
    });

    this.sourceChanged.connect(this, this.$onSourceChanged);
    this.border.leftChanged.connect(this, this.$updateBorder);
    this.border.rightChanged.connect(this, this.$updateBorder);
    this.border.topChanged.connect(this, this.$updateBorder);
    this.border.bottomChanged.connect(this, this.$updateBorder);
    this.horizontalTileModeChanged.connect(this, this.$updateBorder);
    this.verticalTileModeChanged.connect(this, this.$updateBorder);
    this.smoothChanged.connect(this, this.$onSmoothChanged);
  }
  $onSourceChanged(source) {
    this.progress = 0;
    this.status = this.BorderImage.Loading;
    //const style = this.impl.style;
    const imageURL = this.$engine.$resolveImageURL(source);
    QmlWeb.setStyle(this.icss, "OBorderImageSource", `url(${imageURL})`, borderImage0Style);
    QmlWeb.setStyle(this.icss, "borderImageSource", `url(${imageURL})`, borderImage0Style);
    this.$img.src = imageURL;
    if (this.$img.complete) {
      this.progress = 1;
      this.status = this.BorderImage.Ready;
    }
  }
  $updateBorder() {
    //const style = this.impl.style;
    const { right, left, top, bottom } = this.border;
    const slice = `${top} ${right} ${bottom} ${left} fill`;
    const width = `${top}px ${right}px ${bottom}px ${left}px`;
    const repeat = `${this.horizontalTileMode} ${this.verticalTileMode}`;
    QmlWeb.setStyle(this.icss, "OBorderImageSlice", slice, borderImage0Style);
    QmlWeb.setStyle(this.icss, "OBorderImageRepeat", repeat, borderImage0Style);
    QmlWeb.setStyle(this.icss, "OBorderImageWidth", width, borderImage0Style);
    QmlWeb.setStyle(this.icss, "WebkitBorderImageSlice", slice, borderImage0Style);
    QmlWeb.setStyle(this.icss, "WebkitBorderImageRepeat", repeat, borderImage0Style);
    QmlWeb.setStyle(this.icss, "WebkitBorderImageWidth", width, borderImage0Style);
    QmlWeb.setStyle(this.icss, "borderImageSlice", slice, borderImage0Style);
    QmlWeb.setStyle(this.icss, "borderImageRepeat", repeat, borderImage0Style);
    QmlWeb.setStyle(this.icss, "borderImageWidth", width, borderImage0Style);
  }
  $onSmoothChanged(val) {
    //const style = this.impl.style;
    if (val) {
      QmlWeb.setCssClass(this.impl, "smooth", "qmlsmooth");
    } else {
      QmlWeb.setCssClass(this.impl, "smooth", "qmluglyimg");
    }
  }
});
