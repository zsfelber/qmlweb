class Rotation extends QtObject {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, Rotation);

    this.targetChanged.connect(this, this.$onTargetChanged);
    this.target = this.$parent;

  }
  getTargetStyle() {
    return this.target.css;
  }
  $onTargetChanged(newVal, oldVal) {
    if (oldVal) {
      this.angleChanged.disconnect(oldVal, oldVal.$updateTransform);
    }

    const engine = this.$engine;

    this.angleChanged.connect(this.target, this.target.$updateTransform);

    this.target.$updateTransform();
  }
  $updateOrigin() {
    const css = this.getTargetStyle();
    QmlWeb.setStyle(css, "transformOrigin", `${this.origin.x}px ${this.origin.y}px`);
    QmlWeb.setStyle(css, "WebkitTransformOrigin", `${this.origin.x}px ${this.origin.y}px`);
  }
}



class RotationOrigin {
  constructor(parent, engine) {
    try {
      engine.pushengine();

      this.parent = parent;
      this.$engine = engine;
      this.$base = this;
      this.$leaf = this;
      this.$properties = {};
      this.$engine.initMeta(this, {}, RotationOrigin);

      const item = parent.$base;
      this.xChanged.connect(item, item.$updateOrigin);
      this.yChanged.connect(item, item.$updateOrigin);

      QObject.attach(parent, this);
    } finally {
      engine.popengine();
    }
  }

  static getAttachedObject() {
    if (!this.hasOwnProperty("$rotationOrigin")) {
      if (this.__proto__.origin)
        this.$rotationOrigin = setupValue(this, "$rotationOrigin", QObject.createChild(this.__proto__.origin));
      else
        this.$rotationOrigin = new RotationOrigin(this, this.$engine);
    }
    return this.$rotationOrigin;
  }

  toString() {
    return "RotationOrigin:"+this.parent;
  }
}

class RotationAxis {
  constructor(parent, engine) {
    try {
      engine.pushengine();

      this.parent = parent;
      this.$engine = engine;
      this.$base = this;
      this.$leaf = this;
      this.$properties = {};
      this.$engine.initMeta(this, {}, RotationAxis);

      const titem = parent.target.$base;
      this.xChanged.connect(titem, titem.$updateTransform);
      this.yChanged.connect(titem, titem.$updateTransform);
      this.zChanged.connect(titem, titem.$updateTransform);

      QObject.attach(parent, this);
    } finally {
      engine.popengine();
    }
  }

  static getAttachedObject() {
    if (!this.hasOwnProperty("$rotationAxis")) {
      if (this.__proto__.axis)
        this.$rotationAxis = setupValue(this, "$rotationAxis", QObject.createChild(this.__proto__.axis));
      else
        this.$rotationAxis = new RotationAxis(this, this.$engine);
    }
    return this.$rotationAxis;
  }

  toString() {
    return "RotationAxis:"+this.parent;
  }
}


QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "Rotation",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  properties: {
    target: {type:"QtObject", initialValue:null},
    angle: { type:"real", initialValue: 0}
  },
  constructor: Rotation
});

QmlWeb.registerQmlType({
  global: true,
  module: "QtQuick.Rotation",
  name: "origin",
  versions: /.*/,
  $owner: Rotation,
  signals: {
  },
  properties: {
    x: { type:"real", initialValue: 0},
    y: { type:"real", initialValue: 0}
  },
  constructor: RotationOrigin
});


QmlWeb.registerQmlType({
  global: true,
  module: "QtQuick.Rotation",
  name: "axis",
  versions: /.*/,
  $owner: Rotation,
  signals: {
  },
  properties: {
    x: { type:"real", initialValue: 0},
    y: { type:"real", initialValue: 0},
    z: { type:"real", initialValue: 1 }
  },
  constructor: RotationAxis
});
