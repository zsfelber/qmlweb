class QVector4D extends QObject {
  constructor(x, y, z, w) {
    super();
    if (arguments.length !== 4) throw new Error("Invalid arguments");
    createProperty("real", this, "x", { initialValue: x });
    createProperty("real", this, "y", { initialValue: y });
    createProperty("real", this, "z", { initialValue: z });
    createProperty("real", this, "w", { initialValue: w });
  }
  toString() {
    return super.$toString(this.x, this.y, this.z, this.w);
  }
}
