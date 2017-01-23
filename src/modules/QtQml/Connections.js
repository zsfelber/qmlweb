QmlWeb.registerQmlType({
  module: "QtQml",
  name: "Connections",
  versions: /.*/,
  baseClass: "QtObject",
  properties: {
    target: "QtObject",
    ignoreUnknownSignals: "bool"
  }
}, class {
  constructor(meta) {
    QmlWeb.callSuper(this, meta);
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
        c._currentConnection = QmlWeb.connectSignal(this.target, i, c.value,
          c.namespaceObject);
      }
    }
  }
  $setCustomSlot(propName, value, namespaceObject) {
    this.$connections[propName] = { value, namespaceObject };
  }
});
