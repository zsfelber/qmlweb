QmlWeb.registerQmlType({
  module: "QtGraphicalEffects",
  name: "FastBlur",
  versions: /.*/,
  baseClass: "Filter",
  properties: {
    radius: "real"
  }
}, class FastBlur extends Filter {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, FastBlur);

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
