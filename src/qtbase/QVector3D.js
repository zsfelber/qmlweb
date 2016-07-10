class QVector3D extends QObject {
  constructor(x, y, z) {
    super();
    if (arguments.length !== 3) throw new Error("Invalid arguments");
    createProperty("real", this, "x", { initialValue: x });
    createProperty("real", this, "y", { initialValue: y });
    createProperty("real", this, "z", { initialValue: z });
  }
  toString() {
    return super.$toString(this.x, this.y, this.z);
  }
}
