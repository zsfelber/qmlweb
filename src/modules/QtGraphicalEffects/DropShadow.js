QmlWeb.registerQmlType({
  module: "QtGraphicalEffects",
  name: "DropShadow",
  versions: /.*/,
  baseClass: "Filter",
   properties: {
      radius: "real",
      color: { type: "color", initialValue: "white" },
      horizontalOffset: "int",
      verticalOffset: "int"
   }
}, class DropShadow extends Filter {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, DropShadow);

   this.radiusChanged.connect(this, this.$update);
   this.colorChanged.connect(this, this.$update);
   this.horizontalOffsetChanged.connect(this, this.$update);
   this.verticalOffsetChanged.connect(this, this.$update);
  }
  $updateFilterObject() {
    this.$filterObject = {
      transformType: "filter",
      operation: "drop-shadow",
      parameters: `${this.horizontalOffset}px ${this.verticalOffset}px ${this.radius}px ${this.radius}px ${this.color}`
    };
  }
});
