class QMatrix4x4 extends QObject {
  constructor(...data) {
    super();
    if (data.length !== 16) throw new Error("Invalid arguments");
    this.$data = data;
  }
  toString() {
    return super.$toString(...this.$data);
  }
}
