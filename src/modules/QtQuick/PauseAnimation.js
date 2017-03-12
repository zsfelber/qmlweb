QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "PauseAnimation",
  versions: /.*/,
  baseClass: "Animation",
  properties: {
    duration: { type: "int", initialValue: 250 },
    interval: { type: "alias", path:["duration"] }
  }
}, class PauseAnimation extends Animation {
   constructor(meta) {
     super(meta);
     QmlWeb.initMeta(this, meta, PauseAnimation);

     this.runningChanged.connect(this, this.$onRunningChanged);
     this.tick = this.$ticker.bind(this);
     this.activate = this.$activate.bind(this);
   }
   $ticker() {
     if (!this.running && this.$loop !== -1 || this.paused) {
       // $loop === -1 is a marker to just finish this run
       return;
     }
     this.complete();
   }
   $onRunningChanged(newVal) {
     if (newVal) {
       const A = QmlWeb.getConstructor("QtQuick", "2.0", "Animation");
       if (this.loops)
         engine.$addTicker(this);
       else
         setTimeout(this.tick, this.duration);

       this.$activate();
     } else {
       this.$loop = 0;
       if (this.$intervalId) {
         engine.$removeTicker(this);
       }
     }
   }

   $activate() {
     this.paused = false;
     this.parent.paused = true;
   }

   complete() {
     this.$loop++;
     this.parent.paused = false;
     if (this.$loop === this.loops) {
       this.running = false;
     } else {
       setTimeout(this.activate, 0);
     }
   }
});
