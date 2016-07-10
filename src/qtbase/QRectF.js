class QRectF extends QObject {
  constructor(x, y, width, height) {
    super();
    if (arguments.length !== 4) throw new Error("Invalid arguments");
    createProperty("real", this, "x", { initialValue: x });
    createProperty("real", this, "y", { initialValue: y });
    createProperty("real", this, "width", { initialValue: width });
    createProperty("real", this, "height", { initialValue: height });
  }
  toString() {
    return super.$toString(this.x, this.y, this.width, this.height);
  }
}
