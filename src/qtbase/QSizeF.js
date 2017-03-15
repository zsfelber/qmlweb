class QSizeF extends QmlWeb.QObject {
  constructor(width, height) {
    super();
    const engine = this.$engine;
    const createProperty = engine.createProperty;
    engine.createProperty("real", this, "width", { initialValue: width });
    engine.createProperty("real", this, "height", { initialValue: height });
  }
}

QmlWeb.QSizeF = QSizeF;
