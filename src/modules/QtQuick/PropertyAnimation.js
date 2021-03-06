class PropertyAnimation extends Animation {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, PropertyAnimation);

    const engine = this.$engine;
    const createProperty = engine.createProperty;
    this.easing = new QmlWeb.QObject(this, {attached:true, info:"easing"});
    engine.createProperty("enum", this.easing, "type",
      { initialValue: this.Easing.Linear });
    engine.createProperty("real", this.easing, "amplitude", { initialValue: 1 });
    engine.createProperty("real", this.easing, "overshoot", { initialValue: 1.70158 });
    engine.createProperty("real", this.easing, "period", { initialValue: 0.3 });

    this.easing.$valueForProgress = function(t) {
      return QmlWeb.$ease(
        this.type, this.period, this.amplitude, this.overshoot, t
      );
    };
    this.easing.$add = function(a,b) {
      return a+b;
    };
    this.easing.$subtract = function(a,b) {
      return a-b;
    };
    this.easing.$multiply = function(a,b) {
      return a*b;
    };
    this.easing.$construct = function(a) {
      return a;
    }

    this.$props = [];
    this.$targets = [];
    this.$actions = [];

    this.targetChanged.connect(this, this.$redoTargets);
    this.targetsChanged.connect(this, this.$redoTargets);
    this.propertyChanged.connect(this, this.$redoProperties);
    this.propertiesChanged.connect(this, this.$redoProperties);

    if (this.$on) {
      this.property = meta.$on;
      this.target = this.$parent;
    }
  }

  $redoActions() {
    this.$actions = [];
    for (const tid in this.$targets) {
      const t = this.$targets[tid];
      for (const p in this.$props) {
        this.$actions.push({
          property: t.$properties[p],
          target: t,
          from: this.from,
          to: this.to
        });
      }
    }
  }
  $redoProperties() {
    var props = this.properties?this.properties.split(","):[];
    this.$props = {};

    // Merge properties and property
    if (this.property) {
      props.push(this.property);
    }

    // Remove whitespaces
    for (const i in props) {
      const matches = props[i].match(/\w+/);
      if (matches) {
        this.$props[matches[0]] = 1;
      }
    }
  }

  $redoTargets() {
    var targets = this.targets.slice();
    this.$targets = {};

    if (this.target) {
      targets.push(this.target);
    }

    for (const tid in targets) {
      const t = targets[tid];
      if (!t.$objectId) {
        console.error("Bad PropertyAnimation target("+tid+") : "+t+"  Not a qml object.");
        continue;
      }

      this.$targets[t.$objectId] = t;
    }
  }
}

QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "PropertyAnimation",
  versions: /.*/,
  baseClass: "Animation",
  properties: {
    duration: { type: "int", initialValue: 250 },
    from: "real",
    to: "real",
    properties: { type: "string", initialValue: null},
    property: { type: "string", initialValue: null},
    target: { type: "QtObject", initialValue: null},
    targets: { type: "list", initialValue: null},
  },
  constructor:PropertyAnimation
});
