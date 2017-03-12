
class Animation extends QtObject {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, Animation);
    this.$on = meta.$on;
    this.Component.completed.connect(this, this.Component$onCompleted);
  }
  Component$onCompleted() {
    if (this.$on) {
      this.start();
    }
  }
  restart() {
    this.stop();
    this.start();
  }
  start() {
    this.running = true;
  }
  stop() {
    this.running = false;
  }
  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
  }
  complete() {
    // To be overridden
    QmlWeb.log("Unbound method for", this);
  }
}

QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "Animation",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  enums: {
    Animation: { Infinite: -1 },
    Easing: QmlWeb.Easing
  },
  properties: {
    alwaysRunToEnd: "bool",
    loops: { type: "int", initialValue: 1 },
    paused: { type: "bool", initialValue: false},
    running: { type: "bool", initialValue: false}
  },
  constructor:Animation
});
