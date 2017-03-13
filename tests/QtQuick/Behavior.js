describe("QtQuick.Behavior", function() {
  setupDivElement();
  var load = prefixedQmlLoader("QtQuick/qml/Behavior");

  it("Basic", function(done) {
    var qml = load("Basic", this.div, null, done);
    expect(qml.gotX).toBe(false);
    expect(qml.gotY).toBe(false);

    var called = false;
    setTimeout(function() {
      const oe = QmlWeb.engine;
      try {
        QmlWeb.engine = done.engine;

        called = true;
        expect(qml.gotX).toBe(true);
        expect(qml.gotY).toBe(false);
        done();
      } finally {
        QmlWeb.engine = oe;
      }
    }, 500);
    expect(called).toBe(false);
    failTimeout(2000, done);

  });

});
