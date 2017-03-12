QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "Transition",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  properties: {
    animations: "list",
    from: { type: "string", initialValue: "*" },
    to: { type: "string", initialValue: "*" },
    reversible: "bool"
  },
  defaultProperty: "animations"
}, class Transition extends QtObject {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, Transition);

    this.$item = this.$parent;
  }
  $start(actions) {
    for (let i = 0; i < this.animations.length; i++) {
      const animation = this.animations[i];
      animation.$actions = [];
      const { $targets, $props, $actions } = animation;
      for (const j in actions) {
        const action = actions[j];
        if (!$targets[action.target.$objectId] || !$props[action.property.name]) {
          $actions.push(action);
        }
      }
      animation.start();
    }
  }
  $stop() {
    for (let i = 0; i < this.animations.length; i++) {
      this.animations[i].stop();
    }
  }
});
