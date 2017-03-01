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
}, class Timer extends QtObject {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, Timer);

    this.$properties.container.set(this.$parent, QmlWeb.QMLPropertyFlags.ReasonInit, this);

    /* This ensures that if the user toggles the "running" property manually,
     * the timer will trigger. */
    this.runningChanged.connect(this, this.$onRunningChanged);

    QmlWeb.engine.$registerStart(this, () => {
      if (this.running) {
        this.restart();
      }
    });

    QmlWeb.engine.$registerStop(this, () => this.stop());
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
  $trigger() {
    if (!this.repeat) {
      // We set the value directly in order to be able to emit the
      // runningChanged signal after triggered, like Qt does it.
      this.$properties.running.value = false;
    }

    try {
      // Trigger this.
      this.triggered();
    } finally {
      if (!this.repeat) {
        // Emit changed signal manually after setting the value manually above.
        this.runningChanged();
      }
    }
  }
});
