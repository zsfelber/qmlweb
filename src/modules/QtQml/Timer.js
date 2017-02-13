QmlWeb.registerQmlType({
  module: "QtQml",
  name: "Timer",
  versions: /.*/,
  baseClass: "QtObject",
  properties: {
    interval: { type: "int", initialValue: 1000 },
    //parent: { type: "QtObject", readOnly: true },
    parent: { type: "alias", path:["container"], overrideType: "QtObject", readOnly: true },
    repeat: "bool",
    running: "bool",
    triggeredOnStart: "bool"
  },
  signals: {
    triggered: []
  }
}, class {
  constructor(meta) {
    QmlWeb.superAndInitMeta(this, meta);

    this.$properties.container.set(this.$parent, QmlWeb.QMLPropertyFlags.ReasonInit);

    /* This ensures that if the user toggles the "running" property manually,
     * the timer will trigger. */
    this.runningChanged.connect(this, this.$onRunningChanged);

    QmlWeb.engine.$registerStart(() => {
      if (this.running) {
        this.restart();
      }
    });

    QmlWeb.engine.$registerStop(() => this.stop());
  }
  start() {
    this.running = true;
  }
  stop() {
    this.running = false;
  }
  restart() {
    this.stop();
    this.start();
  }
  $ticker() { //(now)
    if (!this.running) return;
    this.$trigger();
  }
  $onRunningChanged() {
    if (this.running) {
      if (this.triggeredOnStart) {
        this.$trigger();
      }
      if (this.repeat)
        this.$intervalId = setInterval(this.$trigger.bind(this), this.interval);
      else
        setTimeout(this.$trigger.bind(this), this.interval);
    } else {
      if (this.$intervalId) {
        clearInterval(this.$intervalId);
        delete this.$intervalId;
      }
    }
  }
  static $trigger() {
    if (!this.repeat) {
      // We set the value directly in order to be able to emit the
      // runningChanged signal after triggered, like Qt does it.
      this.$properties.running.value = false;
    }

    // Trigger this.
    this.triggered();

    if (!this.repeat) {
      // Emit changed signal manually after setting the value manually above.
      this.runningChanged();
    }
  }
});
