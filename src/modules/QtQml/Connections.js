QmlWeb.registerQmlType({
  module: "QtQml",
  name: "Connections",
  versions: /.*/,
  baseClass: "QtObject",
  properties: {
    target: "QtObject",
    ignoreUnknownSignals: "bool"
  }
}, class Connections extends QtObject {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, Connections);
    this.target = this.$parent;
    this.$connections = {};

    this.targetChanged.connect(this, this.$onTargetChanged);
    this.Component.completed.connect(this, this.Component$onCompleted);
  }
  $onTargetChanged() {
    this.$reconnectTarget();
  }
  Component$onCompleted() {
    this.$reconnectTarget();
  }
  $reconnectTarget() {
    for (const i in this.$connections) {
      const c = this.$connections[i];
      if (c._currentConnection) {
        c._currentConnection.disconnect();
      }
      if (this.target) {
        c._currentConnection = QmlWeb.connectSignal.call(this, this.target, i, c.value);
      }
    }
  }
  $setCustomSlot(propName, value) {
    this.$connections[propName] = { value };
  }
});
