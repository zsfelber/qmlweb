class Filter extends Item {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, Filter);

    this.$previousSource = null;
    this.$filterObject = undefined;

  }
  $update() {
    this.$updateEffect(this.source);
  }
  $updateEffect(source) {
    QmlWeb.log("updating effect");
    if (this.$previousSource) {
      const index = this.$previousSource.transform.indexOf(this.$filterObject);
      this.$previousSource.transform.splice(index, 1);
      this.$previousSource.$updateTransform();
    }
    if (source && source.transform) {
      this.$leaf.$updateFilterObject();
      QmlWeb.log("updating effect:", this.$filterObject, source);
      source.transform.push(this.$filterObject);
      source.$updateTransform();
      this.$previousSource = source;
    } else {
      this.$previousSource = null;
    }
  }
}

QmlWeb.registerQmlType({
  module: "QtGraphicalEffects",
  name: "Filter",
  versions: /.*/,
  baseClass: "QtQuick.Item",
  properties: {
     // null to remove "Uninitialized" state
     source: { type: "var", initialValue: null }
  },
  constructor:Filter
});

