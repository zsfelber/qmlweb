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
    source: "url",
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
    QmlWeb.initMeta(this, meta);

    const createProperty = QmlWeb.createProperty;
    this.border = new QmlWeb.QObject(this, {attached:true, info:"border"});
    createProperty("int", this.border, "left");
    createProperty("int", this.border, "right");
    createProperty("int", this.border, "top");
    createProperty("int", this.border, "bottom");

    const bg = this.impl = document.createElement("div");
    bg.className = "qmlborderimg";
    this.icss = QmlWeb.createStyle(bg.style);
    this.dom.appendChild(bg);

    this.$img = new Image();
    this.$img.addEventListener("load", () => {
      this.progress = 1;
      this.status = this.BorderImage.Ready;
    });
    this.$img.addEventListener("error", () => {
      this.status = this.BorderImage.Error;
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
    const imageURL = QmlWeb.$resolveImageURL(source);
    QmlWeb.setStyle(this.icss, "OBorderImageSource", `url("${imageURL}")`);
    QmlWeb.setStyle(this.icss, "borderImageSource", `url("${imageURL}")`);
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
    QmlWeb.setStyle(this.icss, "OBorderImageSlice", slice);
    QmlWeb.setStyle(this.icss, "OBorderImageRepeat", repeat);
    QmlWeb.setStyle(this.icss, "OBorderImageWidth", width);
    QmlWeb.setStyle(this.icss, "borderImageSlice", slice);
    QmlWeb.setStyle(this.icss, "borderImageRepeat", repeat);
    QmlWeb.setStyle(this.icss, "borderImageWidth", width);
  }
  $onSmoothChanged(val) {
    //const style = this.impl.style;
    if (val) {
      QmlWeb.setStyle(this.icss, "imageRendering", "auto");
    } else {
      QmlWeb.setStyle(this.icss, "imageRendering", "-webkit-optimize-contrast");
      QmlWeb.setStyle(this.icss, "imageRendering", "-moz-crisp-edges");
      QmlWeb.setStyle(this.icss, "imageRendering", "crisp-edges");
      QmlWeb.setStyle(this.icss, "imageRendering", "pixelated");
    }
  }
});
