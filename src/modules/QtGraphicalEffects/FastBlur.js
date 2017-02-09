QmlWeb.registerQmlType({
  module: "QtGraphicalEffects",
  name: "FastBlur",
  versions: /.*/,
  baseClass: "Filter",
  properties: {
    radius: "real"
  }
}, class {
  constructor(meta) {
    QmlWeb.superAndInitMeta(this, meta);

     this.radiusChanged.connect(this, this.$update);
  }
  $updateFilterObject() {
    this.$filterObject = {
      transformType: "filter",
       operation: "blur",
       parameters: `${this.radius}px`
    };
  }
});
