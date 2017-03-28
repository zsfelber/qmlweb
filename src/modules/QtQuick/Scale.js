class Scale extends QtObject {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, Scale);

    this.targetChanged.connect(this, this.$onTargetChanged);
    this.target = this.$parent;
  }
  getTargetStyle() {
    return this.target.css;
  }
  $onTargetChanged(newVal, oldVal) {
    if (oldVal) {
      this.xScaleChanged.disconnect(oldVal, oldVal.$updateTransform);
      this.yScaleChanged.disconnect(oldVal, oldVal.$updateTransform);
    }

    const engine = this.$engine;

    this.xScaleChanged.connect(this.target, this.target.$updateTransform);
    this.yScaleChanged.connect(this.target, this.target.$updateTransform);

    /* QML default origin is top-left, while CSS default origin is centre, so
    * $updateOrigin must be called to set the initial transformOrigin. */
    this.$updateOrigin();
  }
  $updateOrigin() {
    const css = this.getTargetStyle();
    QmlWeb.setStyle(css, "transformOrigin", `${this.origin.x}px ${this.origin.y}px`);
    QmlWeb.setStyle(css, "WebkitTransformOrigin", `${this.origin.x}px ${this.origin.y}px`);
  }
}

class ScaleOrigin {
  constructor(parent, engine) {
    try {
      engine.pushengine();

      this.parent = parent;
      this.$engine = engine;
      this.$base = this;
      this.$leaf = this;
      this.$properties = {};
      this.$engine.initMeta(this, {}, ScaleOrigin);

      const item = parent.$base;
      this.xChanged.connect(item, item.$updateOrigin);
      this.yChanged.connect(item, item.$updateOrigin);

      QObject.attach(parent, this);
    } finally {
      engine.popengine();
    }
  }

  static getAttachedObject() {
    if (!this.hasOwnProperty("$scaleOrigin")) {
      if (this !== this.$base)
        this.$scaleOrigin = QObject.createAttachmentChild(this.__proto__.origin, this);
      else
        this.$scaleOrigin = new ScaleOrigin(this, this.$engine);
    }
    return this.$scaleOrigin;
  }

  toString() {
    return "scaleOrigin:"+this.parent;
  }
}

QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "Scale",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  properties: {
    target: {type:"QtObject", initialValue:null},
    xScale: { type:"real", initialValue: 1},
    yScale: { type:"real", initialValue: 1}
  },
  constructor: Scale
});

QmlWeb.registerQmlType({
  global: true,
  module: "QtQuick.Scale",
  name: "origin",
  versions: /.*/,
  $owner: Scale,
  signals: {
  },
  properties: {
    x: { type:"real", initialValue: 0},
    y: { type:"real", initialValue: 0}
  },
  constructor: ScaleOrigin
});
