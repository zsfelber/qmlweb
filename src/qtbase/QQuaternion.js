class QQuaternion extends QObject {
  constructor(scalar, x, y, z) {
    super();
    if (arguments.length !== 4) throw new Error("Invalid arguments");
    createProperty("real", this, "scalar", { initialValue: scalar });
    createProperty("real", this, "x", { initialValue: x });
    createProperty("real", this, "y", { initialValue: y });
    createProperty("real", this, "z", { initialValue: z });
  }
  toString() {
    return super.$toString(this.scalar, this.x, this.y, this.z);
  }
}
