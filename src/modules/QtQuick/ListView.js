QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "ListView",
  versions: /.*/,
  baseClass: "Repeater",
  properties: {
    orientation: "enum",
    spacing: "real",
    currentIndex: "int"
  }
}, class ListView extends Repeater {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, ListView);
    this.modelChanged.connect(this, this.$styleChanged);
    this.delegateChanged.connect(this, this.$styleChanged);
    this.orientationChanged.connect(this, this.$styleChanged);
    this.spacingChanged.connect(this, this.$styleChanged);
    this._childrenInserted.connect(this, this.$applyStyleOnItem);
  }
  repeaterContainer() {
    return this;
  }
  $applyStyleOnItem($item) {
    const Qt = QmlWeb.Qt;
    QmlWeb.setStyle($item.css, "position", "initial");
    if (this.orientation === Qt.Horizontal) {
      QmlWeb.setStyle($item.css, "display", "inline-block");
      if ($item !== this.$items[0]) {
        QmlWeb.setStyle($item.css, "margin-left", `${this.spacing}px`);
      }
    } else {
      QmlWeb.setStyle($item.css, "display", "block");
      if ($item !== this.$items[0]) {
        QmlWeb.setStyle($item.css, "margin-top", `${this.spacing}px`);
      }
    }
  }
  $styleChanged() {
    for (let i = 0; i < this.$items.length; ++i) {
      this.$applyStyleOnItem(this.$items[i]);
    }
  }
});
