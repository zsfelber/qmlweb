describe("QtQuick.Behavior", function() {
  setupDivElement();
  var load = prefixedQmlLoader("QtQuick/qml/Behavior");

  beforeEach(function(done) {
    done();
  });
  var defcleanup1 = {};
  it("Basic", function(done) {
    var qml = load("Basic", this.div);
    expect(qml.gotX).toBe(false);
    expect(qml.gotY).toBe(false);

    var called = false;
    setTimeout(function() {
      called = true;
      expect(qml.gotX).toBe(true);
      expect(qml.gotY).toBe(false);
      console.log("Finished : BehaviorBasic");
      cleanup(defcleanup1.list);
      defcleanup1.engine.stop();
      done();
    }, 500);
    expect(called).toBe(false);

  }, defcleanup1);

});
