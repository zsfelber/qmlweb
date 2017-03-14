class QSizeF extends QmlWeb.QObject {
  constructor(width, height) {
    super();
    const engine = this.$engine;
    const createProperty = engine.createProperty;
    createProperty("real", this, "width", { initialValue: width });
    createProperty("real", this, "height", { initialValue: height });
  }
}

QmlWeb.QSizeF = QSizeF;
