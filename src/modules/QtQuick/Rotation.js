QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "Rotation",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  properties: {
    target: "QtObject",
    angle: "real"
  }
}, class Rotation extends QtObject {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, Rotation);
    this.target = this.$parent;

    const createProperty = QmlWeb.createProperty;

    this.axis = new QmlWeb.QObject(this, {attached:true, info:"axis"});
    createProperty("real", this.axis, "x");
    createProperty("real", this.axis, "y");
    createProperty("real", this.axis, "z", { initialValue: 1 });

    this.origin = new QmlWeb.QObject(this, {attached:true, info:"rotation"});
    createProperty("real", this.origin, "x");
    createProperty("real", this.origin, "y");

    this.angleChanged.connect(this.$parent, this.$parent.$updateTransform);
    this.axis.xChanged.connect(this.$parent, this.$parent.$updateTransform);
    this.axis.yChanged.connect(this.$parent, this.$parent.$updateTransform);
    this.axis.zChanged.connect(this.$parent, this.$parent.$updateTransform);
    this.origin.xChanged.connect(this, this.$updateOrigin);
    this.origin.yChanged.connect(this, this.$updateOrigin);
    this.$parent.$updateTransform();
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
