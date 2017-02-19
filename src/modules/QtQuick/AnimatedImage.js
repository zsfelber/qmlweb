QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "AnimatedImage",
  versions: /.*/,
  baseClass: "Image"
}, class AnimatedImage extends QImage {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, AnimatedImage);
  }
});
