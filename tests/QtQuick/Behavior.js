describe("QtQuick.Behavior", function() {
  setupDivElement();
  var load = prefixedQmlLoader("QtQuick/qml/Behavior");

  it("Basic", function(done) {
    var qml = load("Basic", this.div, null, done);
    expect(qml.gotX).toBe(false);
    expect(qml.gotY).toBe(false);

    var called = false;
    setTimeout(function() {
        called = true;
        expect(qml.gotX).toBe(true);
        expect(qml.gotY).toBe(false);
        done();
    }, 500);
    expect(called).toBe(false);
    failTimeout(2000, done);

  });

});
