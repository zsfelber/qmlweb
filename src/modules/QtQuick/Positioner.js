
class Positioner extends Item {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, Positioner);

    this.childrenChanged.connect(this, this.$onChildrenChanged);
    this.spacingChanged.connect(this, this.layoutChildren);
  }
  $onChildrenChanged() {
    const flags = QmlWeb.QMLSignalFlags.UniqueConnection;
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      child.widthChanged.connect(this, this.layoutChildren, flags);
      child.heightChanged.connect(this, this.layoutChildren, flags);
      child.visibleChanged.connect(this, this.layoutChildren, flags);
    }
    this.layoutChildren();
  }
}

QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "Positioner",
  versions: /.*/,
  baseClass: "Item",
  properties: {
    spacing: "int"
  },
  constructor:Positioner
});
