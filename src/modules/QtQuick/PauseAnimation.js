QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "PauseAnimation",
  versions: /.*/,
  baseClass: "Animation",
  properties: {
    duration: { type: "int", initialValue: 250 }
  }
}, class {
   constructor(meta) {
     QmlWeb.callSuper(this, meta);

     QmlWeb.engine.$addTicker((...args) => this.$ticker(...args));
     this.runningChanged.connect(this, this.$onRunningChanged);
   }
   $ticker(now, elapsed) {
     if (!this.running && this.$loop !== -1 || this.paused) {
       // $loop === -1 is a marker to just finish this run
       return;
     }
     if (this.$at === 0 && this.$loop === 0 && !this.$actions.length) {
       this.$redoActions();
     }
     this.$at += elapsed / this.duration;
     if (this.$at >= 1) {
       this.complete();
       return;
     }
     for (const i in this.$actions) {
       const action = this.$actions[i];
       const value = action.from + (action.to - action.from) *
                     this.easing.$valueForProgress(this.$at);
       const property = action.target.$properties[action.property];
       property.set(value, QmlWeb.QMLProperty.ReasonAnimation);
     }
   }
   $onRunningChanged(newVal) {
     if (newVal) {
       this.$startLoop();
       this.paused = false;
     } else if (this.alwaysRunToEnd && this.$at < 1) {
       this.$loop = -1; // -1 is used as a marker to stop
     } else {
       this.$loop = 0;
       this.$actions = [];
     }
   }
});
