QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "Behavior",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  properties: {
    animation: { type: "Animation", initialValue: null },
    enabled: { type: "bool", initialValue: true }
  },
  defaultProperty: "animation"
}, class Behavior extends QtObject {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, Behavior);
    this.$on = meta.$on;

    this.animationChanged.connect(this, this.$onAnimationChanged);
    this.enabledChanged.connect(this, this.$onEnabledChanged);
  }
  $onAnimationChanged(newVal) {
    if (newVal) {
      newVal.target = this.$parent;
      newVal.property = this.$on;
    }
    this.$parent.$properties[this.$on].animation = newVal;
  }
  $onEnabledChanged(newVal) {
    this.$parent.$properties[this.$on].animation = newVal
      ? this.animation
      : null;
  }
});
