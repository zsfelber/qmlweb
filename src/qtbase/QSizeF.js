class QSizeF extends QObject {
  constructor(width, height) {
    super();
    if (arguments.length !== 2) throw new Error("Invalid arguments");
    createProperty('real', this, 'width', { initialValue: width });
    createProperty('real', this, 'height', { initialValue: height });
  }
  toString() {
    return super.$toString(this.width, this.height);
  }
}
