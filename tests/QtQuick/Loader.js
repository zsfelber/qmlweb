describe("QtQuick.Loader", function() {
  setupDivElement();
  const load = prefixedQmlLoader("QtQuick/qml/Loader");

  it("SourceImmediate", function() {
    const qml = load("SourceImmediate", this.div);
    expect(qml.item.value).toBe(42);
  });
  it("SourceComponentImmediate", function() {
    const qml = load("SourceComponentImmediate", this.div);
    expect(qml.item.value).toBe(42);
  });
  it("SourceDelayed", function(done) {
    const qml = load("SourceDelayed", this.div, null, done);
    qml.yield = function() {
      expect(qml.item.value).toBe(42);
      done();
    };
    qml.start();
    failTimeout(2000, done);
  });
  it("SourceComponentDelayed", function(done) {
    const qml = load("SourceComponentDelayed", this.div, null, done);
    qml.yield = function() {
      expect(qml.item.value).toBe(42);
      done();
    };
    qml.start();
    failTimeout(2000, done);
  });
  it("set source to an empty string", function() {
    const qml = load("EmptySource", this.div);
    expect(qml.sourceComponent).toBe(null);
  });
});
