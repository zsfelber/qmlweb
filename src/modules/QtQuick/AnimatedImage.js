QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "AnimatedImage",
  versions: /.*/,
  baseClass: "Image"
}, class AnimatedImage extends Image {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta);
  }
});
