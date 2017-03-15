QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "Scale",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  properties: {
    target: "QtObject",
    xScale: "real",
    yScale: "real"
  }
}, class Scale extends QtObject {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, Scale);
    this.target = this.$parent;

    const engine = this.$engine;
    const createProperty = engine.createProperty;
    this.origin = new QmlWeb.QObject(this, {attached:true, info:"origin"});
    engine.createProperty("real", this.origin, "x");
    engine.createProperty("real", this.origin, "y");

    this.xScaleChanged.connect(this.$parent, this.$parent.$updateTransform);
    this.yScaleChanged.connect(this.$parent, this.$parent.$updateTransform);
    this.origin.xChanged.connect(this, this.$updateOrigin);
    this.origin.yChanged.connect(this, this.$updateOrigin);

    /* QML default origin is top-left, while CSS default origin is centre, so
     * $updateOrigin must be called to set the initial transformOrigin. */
    this.$updateOrigin();
  }
  getTargetStyle() {
    return this.target.css;
  }
  $updateOrigin() {
    const css = this.getTargetStyle();
    QmlWeb.setStyle(css, "transformOrigin", `${this.origin.x}px ${this.origin.y}px`);
    QmlWeb.setStyle(css, "webkitTransformOrigin", `${this.origin.x}px ${this.origin.y}px`);
  }
});
