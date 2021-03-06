
class QImage extends Item {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, QImage);

    const engine = this.$engine;
    const createProperty = engine.createProperty;

    this.sourceSize = new QmlWeb.QObject(this, {attached:true, info:"sourceSize"});
    engine.createProperty("int", this.sourceSize, "width");
    engine.createProperty("int", this.sourceSize, "height");

    const bg = this.impl = document.createElement("div");
    bg.className = "qmlimg";
    this.icss = QmlWeb.createStyle(bg.style);
    this.dom.appendChild(bg);

    const that = this;
    this.$img = new Image();
    this.$img.addEventListener("load", () => {
      const w = that.$img.naturalWidth;
      const h = that.$img.naturalHeight;
      that.sourceSize.width = w;
      that.sourceSize.height = h;
      that.implicitWidth = w;
      that.implicitHeight = h;
      that.progress = 1;
      that.status = that.Image.Ready;
    });
    this.$img.addEventListener("error", () => {
      that.status = that.Image.Error;
    });

    this.sourceChanged.connect(this, this.$onSourceChanged);
    this.mirrorChanged.connect(this, this.$onMirrorChanged);
    this.fillModeChanged.connect(this, this.$onFillModeChanged);
    this.smoothChanged.connect(this, this.$onSmoothChanged);
  }
  $updateFillMode(val = this.fillMode) {
    //const style = this.impl.style;
    switch (val) {
      default:
      case this.Image.Stretch:
        QmlWeb.setCssClass(this.impl, "fillMode", "qmlstretch");
        break;
      case this.Image.Tile:
        QmlWeb.setCssClass(this.impl, "fillMode", "qmltile");
        break;
      case this.Image.PreserveAspectFit:
        QmlWeb.setCssClass(this.impl, "fillMode", "qmlpreserveaspectfit");
        break;
      case this.Image.PreserveAspectCrop:
        QmlWeb.setCssClass(this.impl, "fillMode", "qmlpreserveaspectcrop");
        break;
      case this.Image.TileVertically:
        QmlWeb.setCssClass(this.impl, "fillMode", "qmltilevertically");
        break;
      case this.Image.TileHorizontally:
        QmlWeb.setCssClass(this.impl, "fillMode", "qmltilehorizontally");
        break;
    }
  }
  $onSourceChanged(source) {
    this.progress = 0;
    this.status = this.Image.Loading;
    const imageURL = this.$engine.$resolveImageURL(source);
    QmlWeb.setStyle(this.icss, "backgroundImage", `url(${imageURL})`);
    this.$img.src = imageURL;
    if (this.$img.complete) {
      this.progress = 1;
      this.status = this.Image.Ready;
    }
    this.$updateFillMode();
  }
  $onMirrorChanged(val) {
    const transformRule = "scale(-1,1)";
    if (!val) {
      const index = this.transform.indexOf(transformRule);
      if (index >= 0) {
        this.transform.splice(index, 1);
      }
    } else {
      this.transform.push(transformRule);
    }
    console.log(this+".transform:"+JSON.stringify(this.transform));
    this.$updateTransform();
  }
  $onFillModeChanged(val) {
    this.$updateFillMode(val);
  }
  $onSmoothChanged(val) {
    //const style = this.impl.style;
    if (val) {
      QmlWeb.setCssClass(this.impl, "smooth", "qmlsmooth");
    } else {
      QmlWeb.setCssClass(this.impl, "smooth", "qmluglyimg");
    }
  }
}

QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "Image",
  versions: /.*/,
  baseClass: "Item",
  enums: {
    Image: {
      Stretch: 1, PreserveAspectFit: 2, PreserveAspectCrop: 3,
      Tile: 4, TileVertically: 5, TileHorizontally: 6,

      Null: 1, Ready: 2, Loading: 3, Error: 4
    }
  },
  properties: {
    asynchronous: { type: "bool", initialValue: true },
    cache: { type: "bool", initialValue: true },
    smooth: { type: "bool", initialValue: true },
    fillMode: { type: "enum", initialValue: 1 }, // Image.Stretch
    mirror: { type: "bool", initialValue: false},
    progress: "real",
    source: { type: "url", initialValue: null},
    status: { type: "enum", initialValue: 1 } // Image.Null
  },
  constructor:QImage
});
