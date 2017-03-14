QmlWeb.registerQmlType({
  module: "QtMultimedia",
  name: "VideoOutput",
  versions: /^5\./,
  baseClass: "QtQuick.Item",
  enums: {
    VideoOutput: { PreserveAspectFit: 0, PreserveAspectCrop: 1, Stretch: 2 }
  },
  properties: {
    autoOrientation: "bool",
    contentRect: "rect",
    fillMode: "enum", // VideoOutput.PreserveAspectFit
    filters: "list",
    orientation: "int",
    source: "variant",
    sourceRect: "rect"
  }
}, class VideoOutput extends Item {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, VideoOutput);

    // TODO: impl
  }
});
