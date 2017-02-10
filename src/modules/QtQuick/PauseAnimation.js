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
     QmlWeb.superAndInitMeta(this, meta);

     this.runningChanged.connect(this, this.$onRunningChanged);
   }
   static $ticker() {
     if (!this.running && this.$loop !== -1 || this.paused) {
       // $loop === -1 is a marker to just finish this run
       return;
     }
     if (this.parent instanceof A) {
       this.parent.paused = false;
     }
     this.complete();
   }
   $onRunningChanged(newVal) {
     if (newVal) {
       const A = QmlWeb.getConstructor("QtQuick", "2.0", "Animation");
       if (this.loops)
         this.$intervalId = setInterval(this.$ticker.bind(this), this.duration);
       else
         setTimeout(this.$ticker.bind(this), this.duration);
       if (this.parent instanceof A) {
         this.parent.paused = true;
       }

       this.paused = false;
     } else {
       this.$loop = 0;
       if (this.$intervalId) {
         clearInterval(this.$intervalId);
         delete this.$intervalId;
       }
     }
   }
   complete() {
     this.$loop++;
     if (this.$loop === this.loops) {
       this.running = false;
     }
   }
});
