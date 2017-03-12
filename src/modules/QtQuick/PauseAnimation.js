QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "PauseAnimation",
  versions: /.*/,
  baseClass: "Animation",
  properties: {
    duration: { type: "int", initialValue: 250 }
  }
}, class PauseAnimation extends Animation {
   constructor(meta) {
     super(meta);
     QmlWeb.initMeta(this, meta, PauseAnimation);

     this.runningChanged.connect(this, this.$onRunningChanged);
   }
   static $ticker() {
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
         this.$intervalId = setInterval(PauseAnimation.$ticker.bind(this), this.duration);
       else
         setTimeout(PauseAnimation.$ticker.bind(this), this.duration);

       this.activate();
     } else {
       this.$loop = 0;
       if (this.$intervalId) {
         clearInterval(this.$intervalId);
         delete this.$intervalId;
       }
     }
   }

   activate() {
     this.paused = false;
     this.parent.paused = true;
   }

   complete() {
     this.$loop++;
     this.parent.paused = false;
     if (this.$loop === this.loops) {
       this.running = false;
     } else {
       setTimeout(this.activate.bind(this), 0);
     }
   }
});
