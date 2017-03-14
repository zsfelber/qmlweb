QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "AnimatedImage",
  versions: /.*/,
  baseClass: "Image"
}, class AnimatedImage extends QImage {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, AnimatedImage);
  }
});
