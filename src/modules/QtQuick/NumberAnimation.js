
class NumberAnimation extends PropertyAnimation {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, NumberAnimation);

    this.$elapsed = 0;
    this.$startTime = 0;
    this.$at = 0;
    this.$loop = 0;

    this.tick = this.$ticker;
    this.runningChanged.connect(this, this.$onRunningChanged);
  }
  $startLoop() {
    for (const i in this.$actions) {
      const action = this.$actions[i];
      action.from = action.from !== undefined ?
                      action.from :
                      action.property.get();
    }
    this.$elapsed = 0;
    this.$startTime = Date.now();
    this.$at = 0;
  }
  $ticker() {
    if (!this.running && this.$loop !== -1 || this.paused) {
      // $loop === -1 is a marker to just finish this run
      return;
    }
    if (this.$at === 0 && this.$loop === 0 && !this.$actions.length) {
      this.$redoActions();
    }

    this.$elapsed = Date.now() - this.$startTime;
    this.$at = this.$elapsed / this.duration;
    if (this.$at >= 1) {
      this.complete();
      return;
    }
    for (const i in this.$actions) {
      const action = this.$actions[i];
      const value = this.easing.$construct(
                      this.easing.$add( action.from ,
                                        this.easing.$multiply(  this.easing.$subtract(action.to, action.from),
                                                                this.easing.$valueForProgress(this.$at)   )   )  );
      action.property.set(value, QmlWeb.QMLPropertyFlags.ReasonAnimation);
    }
  }
  $onRunningChanged(newVal) {
    if (newVal) {
      this.$startLoop();
      this.paused = false;
      QmlWeb.engine.$addTicker(this);
    } else if (this.alwaysRunToEnd && this.$at < 1) {
      this.$loop = -1; // -1 is used as a marker to stop
    } else {
      this.$loop = 0;
      this.$actions = [];
      QmlWeb.engine.$removeTicker(this);
    }
  }
  complete() {
    for (const i in this.$actions) {
      const action = this.$actions[i];
      action.property.set(action.to, QmlWeb.QMLPropertyFlags.ReasonAnimation);
    }
    this.$loop++;
    if (this.$loop === this.loops) {
      this.running = false;
    } else if (!this.running) {
      this.$actions = [];
    } else {
      this.$startLoop(this);
    }
    QmlWeb.engine.$removeTicker(this);
  }
}

QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "NumberAnimation",
  versions: /.*/,
  baseClass: "PropertyAnimation",
  properties: {
    fps: {type:"int", initialValue:60}
  },
  constructor:NumberAnimation
});
