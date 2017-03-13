QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "SequentialAnimation",
  versions: /.*/,
  baseClass: "Animation",
  properties: {
    animations: "list"
  },
  defaultProperty: "animations"
}, class SequentialAnimation extends Animation {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, SequentialAnimation);

    this.animationsChanged.connect(this, this.$onAnimatonsChanged);

    const engine = this.$engine;
    engine.$registerStart(this, () => {
      if (!this.running) return;
      this.running = false; // toggled back by start();
      this.start();
    });
    engine.$registerStop(this, () => self.stop());
  }

  $onAnimatonsChanged() {
    const flags = QmlWeb.Signal.UniqueConnection;
    for (let i = 0; i < this.animations.length; i++) {
      const animation = this.animations[i];
      animation.runningChanged.connect(this, this.$nextAnimation, flags);
    }
  }
  $nextAnimation(proceed) {
    if (this.running && !proceed) {
      this.$curIndex++;
      if (this.$curIndex < this.animations.length) {
        const anim = this.animations[this.$curIndex];
        QmlWeb.log("nextAnimation", this, this.$curIndex, anim);
        anim.start();
      } else {
        this.$passedLoops++;
        if (this.$passedLoops >= this.loops) {
          this.complete();
        } else {
          this.$curIndex = -1;
          this.$nextAnimation();
        }
      }
    }
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.$curIndex = -1;
    this.$passedLoops = 0;
    this.$nextAnimation();
  }
  stop() {
    if (!this.running) return;
    this.running = false;
    if (this.$curIndex < this.animations.length) {
      this.animations[this.$curIndex].stop();
    }
  }
  complete() {
    if (!this.running) return;
    if (this.$curIndex < this.animations.length) {
      // Stop current animation
      this.animations[this.$curIndex].stop();
    }
    this.running = false;
  }
});
