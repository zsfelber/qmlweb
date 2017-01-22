QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "PauseAnimation",
  versions: /.*/,
  baseClass: "Animation",
  properties: {
    duration: { type: "int", initialValue: 250 },
    interval: {type:"alias", path:["duration"], overrideType:"int" }
  }
}, class {
   constructor(meta) {
     QmlWeb.callSuper(this, meta);

     this.tick = $ticker;
     this.runningChanged.connect(this, this.$onRunningChanged);
   }
   $ticker() {
     if (!this.running) return;

   }
   $onRunningChanged(newVal) {
     if (newVal) {
       QmlWeb.engine.$addTicker(this.$tick);
       this.paused = false;
     } else if (this.alwaysRunToEnd && this.$at < 1) {
       this.$loop = -1; // -1 is used as a marker to stop
     } else {
       this.$loop = 0;
     }
   }
});
