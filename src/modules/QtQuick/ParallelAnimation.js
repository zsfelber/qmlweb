QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "ParallelAnimation",
  versions: /.*/,
  baseClass: "Animation",
  enums: {
    Animation: { Infinite: Math.Infinite }
  },
  properties: {
    animations: "list"
  },
  defaultProperty: "animations"
}, class ParallelAnimation extends Animation {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, ParallelAnimation);

    this.$runningAnimations = 0;

    this.animationsChanged.connect(this, this.$onAnimationsChanged);

    const engine = this.$engine;
    engine.$registerStart(this, () => {
      if (!this.running) return;
      self.running = false; // toggled back by start();
      self.start();
    });
    engine.$registerStop(this, () => this.stop());
  }
  $onAnimationsChanged() {
    const flags = QmlWeb.QMLSignalFlags.UniqueConnection;
    for (let i = 0; i < this.animations.length; i++) {
      const animation = this.animations[i];
      animation.runningChanged.connect(this, this.$animationFinished, flags);
    }
  }
  $animationFinished(newVal) {
    this.$runningAnimations += newVal ? 1 : -1;
    if (this.$runningAnimations === 0) {
      this.running = false;
    }
  }
  start() {
    if (this.running) return;
    this.running = true;
    for (let i = 0; i < this.animations.length; i++) {
      this.animations[i].start();
    }
  }
  stop() {
    if (!this.running) return;
    for (let i = 0; i < this.animations.length; i++) {
      this.animations[i].stop();
    }
    this.running = false;
  }
  complete() {
    this.stop();
  }
});
