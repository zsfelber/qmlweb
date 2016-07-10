class QPointF extends QObject {
  constructor(x, y) {
    super();
    if (arguments.length !== 2) throw new Error("Invalid arguments");
    createProperty("real", this, "x", { initialValue: x });
    createProperty("real", this, "y", { initialValue: y });
  }
  toString() {
    return super.$toString(this.x, this.y);
  }
}
