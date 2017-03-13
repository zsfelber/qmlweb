describe("QtQuick.Behavior", function() {
  setupDivElement();
  var load = prefixedQmlLoader("QtQuick/qml/Behavior");

  var defcleanup1 = {};
  it("Basic", function(done) {
    var qml = load("Basic", this.div);
    expect(qml.gotX).toBe(false);
    expect(qml.gotY).toBe(false);
    setTimeout(function() {
      expect(qml.gotX).toBe(true);
      expect(qml.gotY).toBe(false);
      if (done) done();
      console.log("Finished : BehaviorBasic");
      cleanup(defcleanup1.list);
      defcleanup1.engine.stop();
    }, 200);

  }, defcleanup1);
});
